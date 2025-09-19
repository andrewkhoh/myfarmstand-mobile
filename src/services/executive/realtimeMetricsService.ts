import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { QueryClient } from '@tanstack/react-query';
import { executiveAnalyticsKeys } from '../../utils/queryKeyFactory';

export interface MetricsUpdatePayload {
  type: 'order' | 'customer' | 'inventory' | 'insight';
  data: any;
  timestamp: string;
}

export class RealtimeMetricsService {
  private static channels: Map<string, RealtimeChannel> = new Map();
  private static queryClient: QueryClient | null = null;

  /**
   * Initialize the service with a query client
   */
  static initialize(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Subscribe to real-time business metrics updates
   */
  static subscribeToMetrics(userId?: string): RealtimeChannel {
    const channelName = userId ? `metrics-${userId}` : 'metrics-global';

    // Check if channel already exists
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          this.handleOrderChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          this.handleCustomerChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'business_insights'
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          this.handleNewInsight(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items'
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          this.handleInventoryChange(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          ValidationMonitor.recordPatternSuccess({
            pattern: 'realtime_subscription',
            context: 'RealtimeMetricsService.subscribeToMetrics',
            description: `Subscribed to channel: ${channelName}`
          });
        } else if (status === 'CHANNEL_ERROR') {
          ValidationMonitor.recordValidationError({
            context: 'RealtimeMetricsService.subscribeToMetrics',
            errorCode: 'SUBSCRIPTION_ERROR',
            validationPattern: 'realtime_subscription',
            errorMessage: `Failed to subscribe to channel: ${channelName}`
          });
        }
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Handle order changes and invalidate relevant queries
   */
  private static handleOrderChange(payload: RealtimePostgresChangesPayload<any>) {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      // Log the event
      ValidationMonitor.recordPatternSuccess({
        pattern: 'realtime_order_update',
        context: 'RealtimeMetricsService.handleOrderChange',
        description: `Order ${eventType}: ${newRecord?.id || oldRecord?.id}`
      });

      // Invalidate business metrics queries
      if (this.queryClient) {
        this.queryClient.invalidateQueries({
          queryKey: executiveAnalyticsKeys.businessMetrics()
        });

        // If it's a new completed order, also invalidate insights
        if (eventType === 'INSERT' && newRecord?.status === 'completed') {
          this.queryClient.invalidateQueries({
            queryKey: executiveAnalyticsKeys.businessInsights()
          });
        }
      }

      // Broadcast update to UI components
      this.broadcastUpdate({
        type: 'order',
        data: newRecord || oldRecord,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RealtimeMetricsService.handleOrderChange',
        errorCode: 'ORDER_UPDATE_PROCESSING_ERROR',
        validationPattern: 'realtime_update',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle customer changes
   */
  private static handleCustomerChange(payload: RealtimePostgresChangesPayload<any>) {
    try {
      const { eventType, new: newRecord } = payload;

      if (eventType === 'INSERT') {
        // New customer registered
        if (this.queryClient) {
          this.queryClient.invalidateQueries({
            queryKey: executiveAnalyticsKeys.businessMetrics()
          });
        }
      }

      this.broadcastUpdate({
        type: 'customer',
        data: newRecord,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RealtimeMetricsService.handleCustomerChange',
        errorCode: 'CUSTOMER_UPDATE_ERROR',
        validationPattern: 'realtime_update',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle new business insights
   */
  private static handleNewInsight(payload: RealtimePostgresChangesPayload<any>) {
    try {
      const { new: newInsight } = payload;

      // Invalidate insights queries
      if (this.queryClient) {
        this.queryClient.invalidateQueries({
          queryKey: executiveAnalyticsKeys.businessInsights()
        });

        // If it's a high-priority insight, also invalidate predictions
        if (newInsight?.impact_level === 'critical' || newInsight?.impact_level === 'high') {
          this.queryClient.invalidateQueries({
            queryKey: executiveAnalyticsKeys.predictions()
          });
        }
      }

      this.broadcastUpdate({
        type: 'insight',
        data: newInsight,
        timestamp: new Date().toISOString()
      });

      // Log high-impact insights
      if (newInsight?.impact_level === 'critical') {
        ValidationMonitor.recordPatternSuccess({
          pattern: 'critical_insight_received',
          context: 'RealtimeMetricsService.handleNewInsight',
          description: `Critical insight: ${newInsight.title}`
        });
      }
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RealtimeMetricsService.handleNewInsight',
        errorCode: 'INSIGHT_UPDATE_ERROR',
        validationPattern: 'realtime_update',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle inventory changes
   */
  private static handleInventoryChange(payload: RealtimePostgresChangesPayload<any>) {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      // Check for low stock conditions
      if (newRecord && newRecord.current_stock <= newRecord.minimum_stock) {
        // Trigger low stock alert
        this.broadcastUpdate({
          type: 'inventory',
          data: {
            alert: 'low_stock',
            item: newRecord,
            severity: newRecord.current_stock === 0 ? 'critical' : 'warning'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Invalidate inventory metrics
      if (this.queryClient) {
        this.queryClient.invalidateQueries({
          queryKey: ['inventory', 'metrics']
        });
      }
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RealtimeMetricsService.handleInventoryChange',
        errorCode: 'INVENTORY_UPDATE_ERROR',
        validationPattern: 'realtime_update',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Broadcast updates to subscribers
   */
  private static broadcastUpdate(payload: MetricsUpdatePayload) {
    // This could be enhanced to use a pub-sub pattern or event emitter
    // For now, we're relying on React Query's invalidation
    if (window && (window as any).metricsUpdateHandler) {
      (window as any).metricsUpdateHandler(payload);
    }
  }

  /**
   * Subscribe to anomaly detection updates
   */
  static subscribeToAnomalies(
    callback: (anomaly: any) => void
  ): RealtimeChannel {
    const channel = supabase
      .channel('anomalies')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'metrics_anomalies',
          filter: 'deviation_score=gte.3.0'
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          const anomaly = payload.new;
          if (anomaly) {
            callback(anomaly);

            ValidationMonitor.recordPatternSuccess({
              pattern: 'anomaly_detected',
              context: 'RealtimeMetricsService.subscribeToAnomalies',
              description: `Anomaly detected: ${anomaly.metric_name} (score: ${anomaly.deviation_score})`
            });
          }
        }
      )
      .subscribe();

    this.channels.set('anomalies', channel);
    return channel;
  }

  /**
   * Unsubscribe from a specific channel
   */
  static unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(channelName);

      ValidationMonitor.recordPatternSuccess({
        pattern: 'realtime_unsubscribe',
        context: 'RealtimeMetricsService.unsubscribe',
        description: `Unsubscribed from channel: ${channelName}`
      });
    }
  }

  /**
   * Unsubscribe from all channels
   */
  static unsubscribeAll() {
    this.channels.forEach((channel, name) => {
      channel.unsubscribe();
      ValidationMonitor.recordPatternSuccess({
        pattern: 'realtime_unsubscribe',
        context: 'RealtimeMetricsService.unsubscribeAll',
        description: `Unsubscribed from channel: ${name}`
      });
    });
    this.channels.clear();
  }

  /**
   * Get connection status
   */
  static getConnectionStatus(): Map<string, string> {
    const status = new Map<string, string>();
    this.channels.forEach((channel, name) => {
      status.set(name, channel.state);
    });
    return status;
  }
}