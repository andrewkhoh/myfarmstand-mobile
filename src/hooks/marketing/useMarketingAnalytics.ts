import { useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { analyticsService } from '../../services/marketing/analytics.service';
import { campaignService } from '../../services/marketing/campaign.service';
import { marketingKeys } from '../../utils/queryKeyFactory';
import type { MarketingAnalytics, Campaign, ProductContent } from '../../types/marketing';

export function useMarketingAnalytics(options?: {
  includeHistorical?: boolean;
  dateRange?: { start: Date; end: Date };
  refreshInterval?: number;
}) {
  const { 
    includeHistorical = false, 
    dateRange, 
    refreshInterval = 60000 // Default 1 minute
  } = options || {};
  
  // Main analytics query
  const analyticsQuery = useQuery({
    queryKey: marketingKeys.analytics.dashboard(),
    queryFn: () => analyticsService.getMarketingAnalytics(),
    staleTime: 30000,
    refetchInterval: refreshInterval,
  });
  
  // Active campaigns query
  const campaignsQuery = useQuery({
    queryKey: marketingKeys.campaign.active(),
    queryFn: () => campaignService.getActiveCampaigns(),
    staleTime: 30000,
  });
  
  // Pending content query
  const pendingContentQuery = useQuery({
    queryKey: marketingKeys.content.pending(),
    queryFn: () => analyticsService.getPendingContent(),
    staleTime: 30000,
  });
  
  // Calculate derived metrics
  const aggregatedMetrics = useMemo(() => {
    if (!analyticsQuery.data) return null;
    
    const { revenue, engagement, topPerformingCampaigns } = analyticsQuery.data;
    
    // Calculate ROI
    const totalSpent = topPerformingCampaigns.reduce((sum, c) => sum + c.spent, 0);
    const averageRoi = totalSpent > 0 ? (revenue / totalSpent) : 0;
    
    // Calculate engagement rate
    const engagementRate = engagement.totalImpressions > 0
      ? (engagement.totalClicks / engagement.totalImpressions) * 100
      : 0;
    
    // Content velocity (published per month)
    const contentVelocity = analyticsQuery.data.publishedContent / 30; // Simplified
    
    return {
      totalRevenue: revenue,
      averageRoi,
      engagementRate,
      contentVelocity,
      conversionValue: revenue / (engagement.totalClicks || 1),
    };
  }, [analyticsQuery.data]);
  
  // Performance trends calculation
  const performanceTrends = useMemo(() => {
    if (!campaignsQuery.data || campaignsQuery.data.length === 0) {
      return {
        impressionsTrend: 0,
        clicksTrend: 0,
        conversionsTrend: 0,
      };
    }
    
    // Calculate trends (simplified - in real app would compare with previous period)
    const currentPeriodMetrics = campaignsQuery.data.reduce((acc, campaign) => ({
      impressions: acc.impressions + campaign.impressions,
      clicks: acc.clicks + campaign.clicks,
      conversions: acc.conversions + campaign.conversions,
    }), { impressions: 0, clicks: 0, conversions: 0 });
    
    // Mock previous period (50% of current for demo)
    const previousPeriodMetrics = {
      impressions: currentPeriodMetrics.impressions * 0.5,
      clicks: currentPeriodMetrics.clicks * 0.5,
      conversions: currentPeriodMetrics.conversions * 0.5,
    };
    
    return {
      impressionsTrend: ((currentPeriodMetrics.impressions - previousPeriodMetrics.impressions) / 
                         previousPeriodMetrics.impressions) * 100,
      clicksTrend: ((currentPeriodMetrics.clicks - previousPeriodMetrics.clicks) / 
                    previousPeriodMetrics.clicks) * 100,
      conversionsTrend: ((currentPeriodMetrics.conversions - previousPeriodMetrics.conversions) / 
                         previousPeriodMetrics.conversions) * 100,
    };
  }, [campaignsQuery.data]);
  
  // Content performance aggregation
  const contentMetrics = useMemo(() => {
    if (!analyticsQuery?.data?.contentPerformance) {
      // Return default values when no data
      return {
        totalViews: 0,
        averageEngagement: 0,
        topContent: undefined,
      };
    }
    
    const totalViews = analyticsQuery.data.contentPerformance.reduce(
      (sum, content) => sum + content.views, 0
    );
    
    const averageEngagement = analyticsQuery.data.contentPerformance.length > 0
      ? analyticsQuery.data.contentPerformance.reduce(
          (sum, content) => sum + content.engagement, 0
        ) / analyticsQuery.data.contentPerformance.length
      : 0;
    
    return {
      totalViews,
      averageEngagement,
      topContent: analyticsQuery.data.contentPerformance[0],
    };
  }, [analyticsQuery.data]);
  
  // Refresh all data
  const refetchAll = async () => {
    await Promise.all([
      analyticsQuery.refetch(),
      campaignsQuery.refetch(),
      pendingContentQuery.refetch(),
    ]);
  };
  
  return {
    // Raw data
    analytics: analyticsQuery.data,
    activeCampaigns: campaignsQuery.data,
    pendingContent: pendingContentQuery.data,
    
    // Loading states
    isLoading: analyticsQuery.isLoading || campaignsQuery.isLoading || pendingContentQuery.isLoading,
    isAnalyticsLoading: analyticsQuery.isLoading,
    isCampaignsLoading: campaignsQuery.isLoading,
    isPendingContentLoading: pendingContentQuery.isLoading,
    
    // Errors
    error: analyticsQuery.error || campaignsQuery.error || pendingContentQuery.error,
    
    // Aggregated metrics
    aggregatedMetrics,
    performanceTrends,
    contentMetrics,
    
    // Stats
    stats: {
      activeCampaigns: campaignsQuery?.data?.length ?? 0,
      pendingContent: pendingContentQuery?.data?.length ?? 0,
      totalRevenue: analyticsQuery?.data?.revenue ?? 0,
      publishedContent: analyticsQuery?.data?.publishedContent ?? 0,
    },
    
    // Actions
    refetchAll,
    refetchAnalytics: analyticsQuery.refetch,
    refetchCampaigns: campaignsQuery.refetch,
    refetchPendingContent: pendingContentQuery.refetch,
  };
}