import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { marketingKeys } from '@/utils/queryKeys';
import { campaignService, realtimeService } from '@/services/marketing';
import type { CampaignPerformance } from '@/types/marketing';

interface RealtimeUpdate {
  impressions: number;
  clicks: number;
  conversions: number;
  timestamp: Date;
}

export function useCampaignPerformance(
  campaignId: string,
  options?: {
    enableRealtime?: boolean;
    refetchInterval?: number;
  }
) {
  const queryClient = useQueryClient();
  const [realtimeUpdates, setRealtimeUpdates] = useState<RealtimeUpdate[]>([]);
  const enableRealtime = options?.enableRealtime ?? true;
  const refetchInterval = options?.refetchInterval;
  
  // Base query for performance data
  const performanceQuery = useQuery({
    queryKey: marketingKeys.campaign.performance(campaignId),
    queryFn: () => campaignService.getPerformance(campaignId),
    staleTime: 30000,
    refetchInterval: refetchInterval || false,
  });
  
  // Real-time subscription
  useEffect(() => {
    if (!enableRealtime) return;
    
    const channel = `campaign:${campaignId}:metrics`;
    
    const unsubscribe = realtimeService.subscribe(
      channel,
      (update: RealtimeUpdate) => {
        // Add to realtime updates
        setRealtimeUpdates(prev => [...prev.slice(-9), update]);
        
        // Update query cache with new metrics
        queryClient.setQueryData<CampaignPerformance>(
          marketingKeys.campaign.performance(campaignId),
          (old) => {
            if (!old) return old;
            
            return {
              ...old,
              metrics: {
                ...old.metrics,
                impressions: old.metrics.impressions + update.impressions,
                clicks: old.metrics.clicks + update.clicks,
                conversions: old.metrics.conversions + update.conversions,
                ctr: ((old.metrics.clicks + update.clicks) / 
                      (old.metrics.impressions + update.impressions)) * 100,
                conversionRate: ((old.metrics.conversions + update.conversions) / 
                                (old.metrics.clicks + update.clicks)) * 100,
              },
              timeline: [
                ...old.timeline,
                {
                  timestamp: update.timestamp,
                  impressions: update.impressions,
                  clicks: update.clicks,
                  conversions: update.conversions,
                },
              ].slice(-50), // Keep last 50 timeline entries
            };
          }
        );
      }
    );
    
    return () => {
      unsubscribe();
      setRealtimeUpdates([]);
    };
  }, [campaignId, queryClient, enableRealtime]);
  
  const refetch = () => {
    setRealtimeUpdates([]);
    return performanceQuery.refetch();
  };
  
  const clearRealtimeUpdates = () => {
    setRealtimeUpdates([]);
  };
  
  return {
    performance: performanceQuery.data,
    isLoading: performanceQuery.isLoading,
    error: performanceQuery.error,
    refetch,
    realtimeUpdates,
    clearRealtimeUpdates,
    isRealtimeEnabled: enableRealtime,
    metrics: performanceQuery.data?.metrics,
    timeline: performanceQuery.data?.timeline,
  };
}