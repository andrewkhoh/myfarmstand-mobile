import { supabase } from '../../config/supabase';
import { QueryClient } from '@tanstack/react-query';
import { marketingKeys } from '../../utils/queryKeyFactory';
import { ValidationMonitor } from '../../utils/validationMonitor';
import type { RealtimeChannel } from '@supabase/supabase-js';

export class MarketingRealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private queryClient: QueryClient | null = null;

  /**
   * Initialize the realtime service with a query client
   */
  initialize(queryClient: QueryClient): void {
    this.queryClient = queryClient;
  }

  /**
   * Subscribe to campaign updates
   */
  subscribeToCampaigns(filters?: { status?: string }): () => void {
    if (!this.queryClient) {
      console.warn('MarketingRealtimeService: QueryClient not initialized');
      return () => {};
    }

    const channelName = `campaigns-${filters?.status || 'all'}`;

    // Cleanup existing channel if any
    this.unsubscribeFromChannel(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketing_campaigns',
          filter: filters?.status ? `campaign_status=eq.${filters.status}` : undefined,
        },
        (payload) => {
          console.log('Campaign update received:', payload);

          // Invalidate relevant queries
          this.queryClient?.invalidateQueries({
            queryKey: marketingKeys.campaign.all(),
          });

          if (filters?.status === 'active') {
            this.queryClient?.invalidateQueries({
              queryKey: marketingKeys.campaign.active(),
            });
          }

          ValidationMonitor.recordPatternSuccess({
            service: 'MarketingRealtimeService',
            pattern: 'direct_supabase_query',
            operation: 'campaign_update',
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to campaign updates: ${channelName}`);
        }
      });

    this.channels.set(channelName, channel);

    // Return cleanup function
    return () => this.unsubscribeFromChannel(channelName);
  }

  /**
   * Subscribe to content workflow updates
   */
  subscribeToContentWorkflow(workflowState?: string): () => void {
    if (!this.queryClient) {
      console.warn('MarketingRealtimeService: QueryClient not initialized');
      return () => {};
    }

    const channelName = `content-workflow-${workflowState || 'all'}`;

    // Cleanup existing channel if any
    this.unsubscribeFromChannel(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_content',
          filter: workflowState ? `workflow_state=eq.${workflowState}` : undefined,
        },
        (payload) => {
          console.log('Content workflow update received:', payload);

          // Invalidate content queries
          this.queryClient?.invalidateQueries({
            queryKey: marketingKeys.content.all(),
          });

          if (workflowState === 'review') {
            this.queryClient?.invalidateQueries({
              queryKey: marketingKeys.content.pending(),
            });
          }

          // Show notification for review items
          if (payload.new && (payload.new as any).workflow_state === 'review') {
            this.notifyContentReview(payload.new as any);
          }

          ValidationMonitor.recordPatternSuccess({
            service: 'MarketingRealtimeService',
            pattern: 'direct_supabase_query',
            operation: 'content_workflow_update',
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to content workflow updates: ${channelName}`);
        }
      });

    this.channels.set(channelName, channel);

    // Return cleanup function
    return () => this.unsubscribeFromChannel(channelName);
  }

  /**
   * Subscribe to bundle updates
   */
  subscribeToBundles(isActive?: boolean): () => void {
    if (!this.queryClient) {
      console.warn('MarketingRealtimeService: QueryClient not initialized');
      return () => {};
    }

    const channelName = `bundles-${isActive !== undefined ? isActive : 'all'}`;

    // Cleanup existing channel if any
    this.unsubscribeFromChannel(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_bundles',
          filter: isActive !== undefined ? `is_active=eq.${isActive}` : undefined,
        },
        (payload) => {
          console.log('Bundle update received:', payload);

          // Invalidate bundle queries
          this.queryClient?.invalidateQueries({
            queryKey: ['marketing', 'bundles'],
          });

          ValidationMonitor.recordPatternSuccess({
            service: 'MarketingRealtimeService',
            pattern: 'direct_supabase_query',
            operation: 'bundle_update',
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to bundle updates: ${channelName}`);
        }
      });

    this.channels.set(channelName, channel);

    // Return cleanup function
    return () => this.unsubscribeFromChannel(channelName);
  }

  /**
   * Subscribe to marketing analytics updates
   */
  subscribeToAnalytics(): () => void {
    if (!this.queryClient) {
      console.warn('MarketingRealtimeService: QueryClient not initialized');
      return () => {};
    }

    const channelName = 'marketing-analytics';

    // Cleanup existing channel if any
    this.unsubscribeFromChannel(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketing_analytics',
        },
        (payload) => {
          console.log('Analytics update received:', payload);

          // Invalidate analytics queries
          this.queryClient?.invalidateQueries({
            queryKey: marketingKeys.analytics.all(),
          });

          this.queryClient?.invalidateQueries({
            queryKey: marketingKeys.analytics.dashboard(),
          });

          ValidationMonitor.recordPatternSuccess({
            service: 'MarketingRealtimeService',
            pattern: 'direct_supabase_query',
            operation: 'analytics_update',
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to marketing analytics updates');
        }
      });

    this.channels.set(channelName, channel);

    // Return cleanup function
    return () => this.unsubscribeFromChannel(channelName);
  }

  /**
   * Subscribe to all marketing updates at once
   */
  subscribeToAll(): () => void {
    const unsubscribeFns = [
      this.subscribeToCampaigns(),
      this.subscribeToContentWorkflow(),
      this.subscribeToBundles(),
      this.subscribeToAnalytics(),
    ];

    // Return combined cleanup function
    return () => {
      unsubscribeFns.forEach(fn => fn());
    };
  }

  /**
   * Unsubscribe from a specific channel
   */
  private unsubscribeFromChannel(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(channelName);
      console.log(`Unsubscribed from channel: ${channelName}`);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    this.channels.forEach((channel, name) => {
      channel.unsubscribe();
      console.log(`Unsubscribed from channel: ${name}`);
    });
    this.channels.clear();
  }

  /**
   * Notify about content needing review
   */
  private notifyContentReview(content: any): void {
    // This could trigger a notification system
    console.log(`New content pending review: ${content.title || content.id}`);

    // You could dispatch a custom event here for the UI to handle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('marketing:content-review', {
          detail: { content },
        })
      );
    }
  }
}

// Export singleton instance
export const marketingRealtimeService = new MarketingRealtimeService();