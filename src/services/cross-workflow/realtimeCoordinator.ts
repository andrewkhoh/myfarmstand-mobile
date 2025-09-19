import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { ValidationMonitor } from '../../utils/validationMonitorAdapter';
import { queryClient } from '../../config/queryClient';
import { inventoryKeys, executiveAnalyticsKeys } from '../../utils/queryKeyFactory';

export interface RealtimeEvent {
  workflow: 'inventory' | 'marketing' | 'executive' | 'role';
  eventType: 'create' | 'update' | 'delete';
  resource: string;
  resourceId: string;
  data: any;
  timestamp: Date;
}

export interface WorkflowSubscription {
  workflow: string;
  callback: (event: RealtimeEvent) => void;
  filter?: (event: RealtimeEvent) => boolean;
}

export class RealtimeCoordinator {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, WorkflowSubscription[]> = new Map();
  private crossWorkflowHandlers: Map<string, ((event: RealtimeEvent) => void)[]> = new Map();

  constructor(private supabase: SupabaseClient) {
    this.initializeCrossWorkflowHandlers();
  }

  /**
   * Initialize handlers for cross-workflow events
   */
  private initializeCrossWorkflowHandlers() {
    // Inventory → Executive sync
    this.registerCrossWorkflowHandler('inventory-to-executive', async (event) => {
      if (event.workflow === 'inventory' && event.eventType === 'update') {
        // Invalidate executive metrics that depend on inventory
        await queryClient.invalidateQueries({
          queryKey: executiveAnalyticsKeys.metrics()
        });
        await queryClient.invalidateQueries({
          queryKey: executiveAnalyticsKeys.insights()
        });

        // Trigger executive dashboard refresh
        this.emitEvent({
          workflow: 'executive',
          eventType: 'update',
          resource: 'metrics',
          resourceId: 'inventory-dependent',
          data: { source: 'inventory', trigger: event.resourceId },
          timestamp: new Date()
        });

        ValidationMonitor.recordPatternSuccess('realtime-inventory-executive-sync');
      }
    });

    // Marketing → Executive sync
    this.registerCrossWorkflowHandler('marketing-to-executive', async (event) => {
      if (event.workflow === 'marketing' && ['create', 'update'].includes(event.eventType)) {
        // Invalidate executive campaign metrics
        await queryClient.invalidateQueries({
          queryKey: executiveAnalyticsKeys.crossRole()
        });

        // Trigger executive dashboard refresh for campaign metrics
        this.emitEvent({
          workflow: 'executive',
          eventType: 'update',
          resource: 'campaign-metrics',
          resourceId: event.resourceId,
          data: { source: 'marketing', campaignId: event.resourceId },
          timestamp: new Date()
        });

        ValidationMonitor.recordPatternSuccess('realtime-marketing-executive-sync');
      }
    });

    // Inventory → Marketing sync (low stock alerts)
    this.registerCrossWorkflowHandler('inventory-to-marketing', async (event) => {
      if (event.workflow === 'inventory' && event.eventType === 'update') {
        const stockData = event.data;
        if (stockData.currentStock < stockData.minimumStock) {
          // Emit warning to marketing workflow
          this.emitEvent({
            workflow: 'marketing',
            eventType: 'update',
            resource: 'stock-alert',
            resourceId: stockData.productId,
            data: {
              productId: stockData.productId,
              currentStock: stockData.currentStock,
              minimumStock: stockData.minimumStock,
              alert: 'low_stock'
            },
            timestamp: new Date()
          });
        }
      }
    });
  }

  /**
   * Subscribe to inventory changes
   */
  subscribeToInventory(): RealtimeChannel {
    const channel = this.supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items'
        },
        (payload) => this.handleInventoryChange(payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_movements'
        },
        (payload) => this.handleStockMovement(payload)
      );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ValidationMonitor.recordPatternSuccess('realtime-inventory-subscription');
      }
    });

    this.channels.set('inventory', channel);
    return channel;
  }

  /**
   * Subscribe to marketing changes
   */
  subscribeToMarketing(): RealtimeChannel {
    const channel = this.supabase
      .channel('marketing-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketing_campaigns'
        },
        (payload) => this.handleMarketingChange(payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_products'
        },
        (payload) => this.handleCampaignProductChange(payload)
      );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ValidationMonitor.recordPatternSuccess('realtime-marketing-subscription');
      }
    });

    this.channels.set('marketing', channel);
    return channel;
  }

  /**
   * Subscribe to executive metrics updates
   */
  subscribeToExecutive(): RealtimeChannel {
    const channel = this.supabase
      .channel('executive-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_metrics'
        },
        (payload) => this.handleExecutiveMetricChange(payload)
      );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ValidationMonitor.recordPatternSuccess('realtime-executive-subscription');
      }
    });

    this.channels.set('executive', channel);
    return channel;
  }

  /**
   * Handle inventory changes and propagate to other workflows
   */
  private async handleInventoryChange(payload: any) {
    const event: RealtimeEvent = {
      workflow: 'inventory',
      eventType: this.mapPostgresEvent(payload.eventType),
      resource: 'inventory_item',
      resourceId: payload.new?.id || payload.old?.id,
      data: payload.new || payload.old,
      timestamp: new Date()
    };

    // Emit to subscribers
    this.emitEvent(event);

    // Trigger cross-workflow handlers
    await this.triggerCrossWorkflowHandlers(event);

    // Invalidate relevant queries
    await this.invalidateInventoryQueries(event);
  }

  /**
   * Handle stock movements
   */
  private async handleStockMovement(payload: any) {
    const event: RealtimeEvent = {
      workflow: 'inventory',
      eventType: 'update',
      resource: 'stock_movement',
      resourceId: payload.new?.inventory_item_id || payload.old?.inventory_item_id,
      data: payload.new || payload.old,
      timestamp: new Date()
    };

    // Emit to subscribers
    this.emitEvent(event);

    // Trigger cross-workflow handlers
    await this.triggerCrossWorkflowHandlers(event);

    // Invalidate executive metrics immediately
    await queryClient.invalidateQueries({
      queryKey: executiveAnalyticsKeys.metrics()
    });
  }

  /**
   * Handle marketing campaign changes
   */
  private async handleMarketingChange(payload: any) {
    const event: RealtimeEvent = {
      workflow: 'marketing',
      eventType: this.mapPostgresEvent(payload.eventType),
      resource: 'campaign',
      resourceId: payload.new?.id || payload.old?.id,
      data: payload.new || payload.old,
      timestamp: new Date()
    };

    // Emit to subscribers
    this.emitEvent(event);

    // Trigger cross-workflow handlers
    await this.triggerCrossWorkflowHandlers(event);

    // Invalidate marketing queries
    await this.invalidateMarketingQueries(event);
  }

  /**
   * Handle campaign product association changes
   */
  private async handleCampaignProductChange(payload: any) {
    const event: RealtimeEvent = {
      workflow: 'marketing',
      eventType: this.mapPostgresEvent(payload.eventType),
      resource: 'campaign_product',
      resourceId: payload.new?.campaign_id || payload.old?.campaign_id,
      data: payload.new || payload.old,
      timestamp: new Date()
    };

    // Emit to subscribers
    this.emitEvent(event);

    // Check for inventory conflicts
    if (event.eventType === 'create') {
      await this.checkInventoryAvailability(event.data.product_id, event.data.campaign_id);
    }
  }

  /**
   * Handle executive metric changes
   */
  private async handleExecutiveMetricChange(payload: any) {
    const event: RealtimeEvent = {
      workflow: 'executive',
      eventType: this.mapPostgresEvent(payload.eventType),
      resource: 'business_metric',
      resourceId: payload.new?.id || payload.old?.id,
      data: payload.new || payload.old,
      timestamp: new Date()
    };

    // Emit to subscribers
    this.emitEvent(event);

    // Invalidate executive queries
    await queryClient.invalidateQueries({
      queryKey: executiveAnalyticsKeys.all()
    });
  }

  /**
   * Check inventory availability for campaign products
   */
  private async checkInventoryAvailability(productId: string, campaignId: string) {
    try {
      const { data: inventory } = await this.supabase
        .from('inventory_items')
        .select('current_stock, reserved_stock, minimum_stock')
        .eq('product_id', productId)
        .single();

      if (inventory) {
        const available = inventory.current_stock - inventory.reserved_stock;
        if (available < inventory.minimum_stock) {
          // Emit low stock warning
          this.emitEvent({
            workflow: 'marketing',
            eventType: 'update',
            resource: 'inventory_warning',
            resourceId: campaignId,
            data: {
              productId,
              campaignId,
              available,
              minimum: inventory.minimum_stock,
              warning: 'low_stock_for_campaign'
            },
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      ValidationMonitor.recordValidationError('realtime-inventory-check', error);
    }
  }

  /**
   * Invalidate inventory-related queries
   */
  private async invalidateInventoryQueries(event: RealtimeEvent) {
    await queryClient.invalidateQueries({
      queryKey: inventoryKeys.all()
    });

    if (event.resourceId) {
      await queryClient.invalidateQueries({
        queryKey: inventoryKeys.item(event.resourceId)
      });
    }

    // Also invalidate executive queries that depend on inventory
    await queryClient.invalidateQueries({
      queryKey: executiveAnalyticsKeys.metrics()
    });
  }

  /**
   * Invalidate marketing-related queries
   */
  private async invalidateMarketingQueries(event: RealtimeEvent) {
    await queryClient.invalidateQueries({
      queryKey: campaignKeys.all()
    });

    if (event.resourceId) {
      await queryClient.invalidateQueries({
        queryKey: campaignKeys.detail(event.resourceId)
      });
    }

    // Also invalidate executive queries that depend on marketing
    await queryClient.invalidateQueries({
      queryKey: executiveAnalyticsKeys.crossRole()
    });
  }

  /**
   * Register a cross-workflow handler
   */
  registerCrossWorkflowHandler(name: string, handler: (event: RealtimeEvent) => void) {
    const handlers = this.crossWorkflowHandlers.get(name) || [];
    handlers.push(handler);
    this.crossWorkflowHandlers.set(name, handlers);
  }

  /**
   * Trigger all cross-workflow handlers for an event
   */
  private async triggerCrossWorkflowHandlers(event: RealtimeEvent) {
    for (const [, handlers] of this.crossWorkflowHandlers) {
      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (error) {
          ValidationMonitor.recordValidationError('cross-workflow-handler', error);
        }
      }
    }
  }

  /**
   * Subscribe to workflow events
   */
  subscribe(workflow: string, callback: (event: RealtimeEvent) => void, filter?: (event: RealtimeEvent) => boolean) {
    const subscription: WorkflowSubscription = {
      workflow,
      callback,
      filter
    };

    const subscriptions = this.subscriptions.get(workflow) || [];
    subscriptions.push(subscription);
    this.subscriptions.set(workflow, subscriptions);

    return () => {
      const subs = this.subscriptions.get(workflow) || [];
      const index = subs.indexOf(subscription);
      if (index > -1) {
        subs.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event to all subscribers
   */
  private emitEvent(event: RealtimeEvent) {
    const subscriptions = this.subscriptions.get(event.workflow) || [];
    const allSubscriptions = this.subscriptions.get('*') || [];

    [...subscriptions, ...allSubscriptions].forEach(sub => {
      if (!sub.filter || sub.filter(event)) {
        try {
          sub.callback(event);
        } catch (error) {
          ValidationMonitor.recordValidationError('event-emission', error);
        }
      }
    });
  }

  /**
   * Map Postgres event types to our event types
   */
  private mapPostgresEvent(eventType: string): 'create' | 'update' | 'delete' {
    switch (eventType) {
      case 'INSERT':
        return 'create';
      case 'UPDATE':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return 'update';
    }
  }

  /**
   * Start all workflow subscriptions
   */
  startAll() {
    this.subscribeToInventory();
    this.subscribeToMarketing();
    this.subscribeToExecutive();

    ValidationMonitor.recordPatternSuccess('realtime-coordinator-started');
  }

  /**
   * Stop all subscriptions
   */
  stopAll() {
    for (const [name, channel] of this.channels) {
      channel.unsubscribe();
      this.channels.delete(name);
    }

    this.subscriptions.clear();
    ValidationMonitor.recordPatternSuccess('realtime-coordinator-stopped');
  }

  /**
   * Get subscription status
   */
  getStatus(): { [key: string]: string } {
    const status: { [key: string]: string } = {};
    for (const [name, channel] of this.channels) {
      status[name] = channel.state;
    }
    return status;
  }
}

// Export singleton instance
export const createRealtimeCoordinator = (supabase: SupabaseClient) =>
  new RealtimeCoordinator(supabase);