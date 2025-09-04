import { useMarketingAnalytics } from './useMarketingAnalytics';
import { useCampaignPerformance } from './useCampaignPerformance';

export function useMarketingDashboard() {
  const {
    analytics,
    activeCampaigns,
    pendingContent,
    stats,
    aggregatedMetrics,
    performanceTrends,
    isLoading,
    refetchAll,
  } = useMarketingAnalytics();
  
  // Get performance for top campaign
  const topCampaignId = activeCampaigns?.[0]?.id;
  const topCampaignPerformance = useCampaignPerformance(
    topCampaignId || 'default',
    { enableRealtime: !!topCampaignId }
  );
  
  return {
    // Summary stats
    stats: {
      activeCampaigns: stats.activeCampaigns,
      pendingContent: stats.pendingContent,
      totalRevenue: stats.totalRevenue,
      publishedContent: stats.publishedContent,
      averageRoi: aggregatedMetrics?.averageRoi ?? 0,
      engagementRate: aggregatedMetrics?.engagementRate ?? 0,
    },
    
    // Performance data
    performanceTrends,
    topCampaignPerformance: topCampaignId ? topCampaignPerformance.performance : undefined,
    
    // Lists
    activeCampaigns,
    pendingContent,
    topPerformingCampaigns: analytics?.topPerformingCampaigns,
    contentPerformance: analytics?.contentPerformance,
    
    // State
    isLoading,
    
    // Actions
    refetchAll,
  };
}