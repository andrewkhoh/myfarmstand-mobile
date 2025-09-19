import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { marketingRealtimeService } from '../../services/marketing/realtime.service';

interface UseMarketingRealtimeOptions {
  campaigns?: boolean | { status?: string };
  content?: boolean | { workflowState?: string };
  bundles?: boolean | { isActive?: boolean };
  analytics?: boolean;
  enabled?: boolean;
}

/**
 * Hook to subscribe to marketing real-time updates
 */
export function useMarketingRealtime(options: UseMarketingRealtimeOptions = {}) {
  const queryClient = useQueryClient();
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    // Initialize the service with query client
    marketingRealtimeService.initialize(queryClient);

    const unsubscribeFns: (() => void)[] = [];

    // Subscribe to campaigns
    if (options.campaigns) {
      const campaignOptions = typeof options.campaigns === 'object' ? options.campaigns : {};
      unsubscribeFns.push(
        marketingRealtimeService.subscribeToCampaigns(campaignOptions)
      );
    }

    // Subscribe to content workflow
    if (options.content) {
      const contentOptions = typeof options.content === 'object' ? options.content : {};
      unsubscribeFns.push(
        marketingRealtimeService.subscribeToContentWorkflow(contentOptions.workflowState)
      );
    }

    // Subscribe to bundles
    if (options.bundles) {
      const bundleOptions = typeof options.bundles === 'object' ? options.bundles : {};
      unsubscribeFns.push(
        marketingRealtimeService.subscribeToBundles(bundleOptions.isActive)
      );
    }

    // Subscribe to analytics
    if (options.analytics) {
      unsubscribeFns.push(
        marketingRealtimeService.subscribeToAnalytics()
      );
    }

    // Cleanup function
    return () => {
      unsubscribeFns.forEach(fn => fn());
    };
  }, [
    enabled,
    queryClient,
    JSON.stringify(options.campaigns),
    JSON.stringify(options.content),
    JSON.stringify(options.bundles),
    options.analytics,
  ]);

  // Return consistent interface matching other realtime hooks
  return {
    isEnabled: enabled,
    isSubscribed: enabled, // For compatibility
  };
}

/**
 * Hook to subscribe to all marketing real-time updates
 */
export function useMarketingRealtimeAll() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Initialize the service with query client
    marketingRealtimeService.initialize(queryClient);

    // Subscribe to all marketing updates
    const unsubscribe = marketingRealtimeService.subscribeToAll();

    // Cleanup function
    return unsubscribe;
  }, [queryClient]);
}