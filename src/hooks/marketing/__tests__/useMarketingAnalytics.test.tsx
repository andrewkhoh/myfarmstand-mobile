import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMarketingAnalytics } from '../useMarketingAnalytics';
import { analyticsService, campaignService } from '@/services/marketing';

// Mock the services
jest.mock('@/services/marketing');

describe('useMarketingAnalytics', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (analyticsService.getMarketingAnalytics as jest.Mock).mockResolvedValue({
      revenue: 125000,
      totalCampaigns: 15,
      activeCampaigns: 3,
      totalContent: 150,
      publishedContent: 85,
      engagement: {
        totalImpressions: 1500000,
        totalClicks: 30000,
        averageCtr: 2.0,
      },
      topPerformingCampaigns: [
        {
          id: 'campaign-1',
          name: 'Summer Sale 2024',
          status: 'active',
          budget: 10000,
          spent: 4500,
          impressions: 150000,
          clicks: 3000,
          conversions: 150,
          roi: 2.5,
        },
      ],
      contentPerformance: [
        {
          contentId: 'content-1',
          title: 'Summer Collection Guide',
          views: 15000,
          engagement: 85.5,
        },
        {
          contentId: 'content-2',
          title: 'Winter Fashion Trends',
          views: 12000,
          engagement: 78.2,
        },
      ],
    });
    
    (campaignService.getActiveCampaigns as jest.Mock).mockResolvedValue([
      {
        id: 'campaign-1',
        name: 'Summer Sale 2024',
        status: 'active',
        budget: 10000,
        spent: 4500,
        impressions: 150000,
        clicks: 3000,
        conversions: 150,
        roi: 2.5,
      },
      {
        id: 'campaign-2',
        name: 'Back to School',
        status: 'active',
        budget: 8000,
        spent: 3200,
        impressions: 120000,
        clicks: 2400,
        conversions: 120,
        roi: 2.2,
      },
    ]);
    
    (analyticsService.getPendingContent as jest.Mock).mockResolvedValue([
      {
        id: 'pending-1',
        title: 'New Product Announcement',
        workflowState: 'review',
      },
      {
        id: 'pending-2',
        title: 'Holiday Campaign Content',
        workflowState: 'draft',
      },
    ]);
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  describe('data fetching', () => {
    it('should fetch all analytics data', async () => {
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      expect(result.current.isLoading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.analytics).toBeDefined();
        expect(result.current.activeCampaigns).toBeDefined();
        expect(result.current.pendingContent).toBeDefined();
      });
      
      expect(result.current.analytics?.revenue).toBeDefined();
      expect(result.current.activeCampaigns?.length).toBeGreaterThan(0);
      expect(result.current.pendingContent?.length).toBeGreaterThan(0);
    });
    
    it('should handle partial loading states', async () => {
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      expect(result.current.isAnalyticsLoading).toBe(true);
      expect(result.current.isCampaignsLoading).toBe(true);
      expect(result.current.isPendingContentLoading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.isAnalyticsLoading).toBe(false);
      expect(result.current.isCampaignsLoading).toBe(false);
      expect(result.current.isPendingContentLoading).toBe(false);
    });
    
    it('should aggregate error states', async () => {
      jest.spyOn(analyticsService, 'getMarketingAnalytics')
        .mockRejectedValueOnce(new Error('Analytics error'));
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.error).toBeDefined();
      expect((result.current.error as Error)?.message).toBe('Analytics error');
    });
    
    it('should support custom refresh intervals', async () => {
      jest.useFakeTimers();
      const analyticsSpy = jest.spyOn(analyticsService, 'getMarketingAnalytics');
      
      const { result } = renderHook(
        () => useMarketingAnalytics({ refreshInterval: 5000 }),
        { wrapper }
      );
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(analyticsSpy).toHaveBeenCalledTimes(1);
      
      // Advance time to trigger refetch
      act(() => {
        jest.runOnlyPendingTimers();
        jest.advanceTimersByTime(5000);
      });
      
      await waitFor(() => {
        expect(analyticsSpy).toHaveBeenCalledTimes(2);
      }, { timeout: 10000 });
      
      jest.useRealTimers();
    });
  });
  
  describe('aggregated metrics', () => {
    it('should calculate aggregated metrics correctly', async () => {
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.analytics).toBeDefined();
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.aggregatedMetrics).toBeDefined();
      expect(result.current.aggregatedMetrics?.totalRevenue).toBe(125000);
      expect(result.current.aggregatedMetrics?.averageRoi).toBeGreaterThan(0);
      expect(result.current.aggregatedMetrics?.engagementRate).toBeGreaterThan(0);
      expect(result.current.aggregatedMetrics?.contentVelocity).toBeGreaterThan(0);
      expect(result.current.aggregatedMetrics?.conversionValue).toBeGreaterThan(0);
    });
    
    it('should calculate ROI correctly', async () => {
      jest.spyOn(analyticsService, 'getMarketingAnalytics').mockResolvedValue({
        revenue: 100000,
        totalCampaigns: 10,
        activeCampaigns: 5,
        totalContent: 100,
        publishedContent: 50,
        engagement: {
          totalImpressions: 1000000,
          totalClicks: 20000,
          averageCtr: 2.0,
        },
        topPerformingCampaigns: [
          {
            id: '1',
            name: 'Campaign 1',
            status: 'active',
            startDate: new Date(),
            endDate: new Date(),
            budget: 10000,
            spent: 5000,
            impressions: 100000,
            clicks: 2000,
            conversions: 100,
            roi: 2.0,
          },
        ],
        contentPerformance: [],
      });
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.analytics).toBeDefined();
      });
      
      // ROI = revenue / spent = 100000 / 5000 = 20
      expect(result.current.aggregatedMetrics).toBeDefined();
      expect(result.current.aggregatedMetrics?.averageRoi).toBe(20);
    });
    
    it('should handle zero values in calculations', async () => {
      jest.spyOn(analyticsService, 'getMarketingAnalytics').mockResolvedValue({
        revenue: 0,
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalContent: 0,
        publishedContent: 0,
        engagement: {
          totalImpressions: 0,
          totalClicks: 0,
          averageCtr: 0,
        },
        topPerformingCampaigns: [],
        contentPerformance: [],
      });
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.aggregatedMetrics).toBeDefined();
      expect(result.current.aggregatedMetrics?.averageRoi).toBe(0);
      expect(result.current.aggregatedMetrics?.engagementRate).toBe(0);
      expect(result.current.aggregatedMetrics?.conversionValue).toBe(0);
    });
  });
  
  describe('performance trends', () => {
    it('should calculate performance trends', async () => {
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.activeCampaigns).toBeDefined();
      });
      
      expect(result.current.performanceTrends).toBeDefined();
      expect(result.current.performanceTrends?.impressionsTrend).toBe(100);
      expect(result.current.performanceTrends?.clicksTrend).toBe(100);
      expect(result.current.performanceTrends?.conversionsTrend).toBe(100);
    });
    
    it('should handle empty campaigns data', async () => {
      jest.spyOn(campaignService, 'getActiveCampaigns').mockResolvedValue([]);
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.performanceTrends).toBeDefined();
      });
      
      expect(result.current.performanceTrends?.impressionsTrend).toBe(0);
      expect(result.current.performanceTrends?.clicksTrend).toBe(0);
      expect(result.current.performanceTrends?.conversionsTrend).toBe(0);
    });
  });
  
  describe('content metrics', () => {
    it('should aggregate content performance metrics', async () => {
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.analytics).toBeDefined();
      });
      
      expect(result.current.contentMetrics).toBeDefined();
      expect(result.current.contentMetrics?.totalViews).toBe(27000); // 15000 + 12000
      expect(result.current.contentMetrics?.averageEngagement).toBeCloseTo(81.85, 1); // (85.5 + 78.2) / 2
      expect(result.current.contentMetrics?.topContent).toBeDefined();
      expect(result.current.contentMetrics?.topContent?.title).toBe('Summer Collection Guide');
    });
    
    it('should handle empty content performance data', async () => {
      jest.spyOn(analyticsService, 'getMarketingAnalytics').mockResolvedValue({
        revenue: 0,
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalContent: 0,
        publishedContent: 0,
        engagement: {
          totalImpressions: 0,
          totalClicks: 0,
          averageCtr: 0,
        },
        topPerformingCampaigns: [],
        contentPerformance: [],
      });
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.contentMetrics).toBeDefined();
      });
      
      expect(result.current.contentMetrics?.totalViews).toBe(0);
      expect(result.current.contentMetrics?.averageEngagement).toBe(0);
      expect(result.current.contentMetrics?.topContent).toBeUndefined();
    });
  });
  
  describe('stats summary', () => {
    it('should provide summary statistics', async () => {
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.analytics).toBeDefined();
      });
      
      expect(result.current.stats).toBeDefined();
      expect(result.current.stats.activeCampaigns).toBe(2);
      expect(result.current.stats.pendingContent).toBe(2);
      expect(result.current.stats.totalRevenue).toBe(125000);
      expect(result.current.stats.publishedContent).toBe(85);
    });
    
    it('should handle null data gracefully', async () => {
      jest.spyOn(analyticsService, 'getMarketingAnalytics').mockRejectedValue(new Error('Failed'));
      jest.spyOn(campaignService, 'getActiveCampaigns').mockRejectedValue(new Error('Failed'));
      jest.spyOn(analyticsService, 'getPendingContent').mockRejectedValue(new Error('Failed'));
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
      
      expect(result.current.stats.activeCampaigns).toBe(0);
      expect(result.current.stats.pendingContent).toBe(0);
      expect(result.current.stats.totalRevenue).toBe(0);
      expect(result.current.stats.publishedContent).toBe(0);
    });
  });
  
  describe('refetch actions', () => {
    it('should refetch all data', async () => {
      const analyticsSpy = jest.spyOn(analyticsService, 'getMarketingAnalytics');
      const campaignsSpy = jest.spyOn(campaignService, 'getActiveCampaigns');
      const pendingSpy = jest.spyOn(analyticsService, 'getPendingContent');
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(analyticsSpy).toHaveBeenCalledTimes(1);
      expect(campaignsSpy).toHaveBeenCalledTimes(1);
      expect(pendingSpy).toHaveBeenCalledTimes(1);
      
      await act(async () => {
        await result.current.refetchAll();
      });
      
      expect(analyticsSpy).toHaveBeenCalledTimes(2);
      expect(campaignsSpy).toHaveBeenCalledTimes(2);
      expect(pendingSpy).toHaveBeenCalledTimes(2);
    });
    
    it('should refetch individual queries', async () => {
      const analyticsSpy = jest.spyOn(analyticsService, 'getMarketingAnalytics');
      const campaignsSpy = jest.spyOn(campaignService, 'getActiveCampaigns');
      const pendingSpy = jest.spyOn(analyticsService, 'getPendingContent');
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.refetchAnalytics();
      });
      
      expect(analyticsSpy).toHaveBeenCalledTimes(2);
      expect(campaignsSpy).toHaveBeenCalledTimes(1); // Only called once by the initial hook
      expect(pendingSpy).toHaveBeenCalledTimes(1);
      
      await act(async () => {
        await result.current.refetchCampaigns();
      });
      
      expect(campaignsSpy).toHaveBeenCalledTimes(2); // 1 from initial + 1 from refetchCampaigns
      
      await act(async () => {
        await result.current.refetchPendingContent();
      });
      
      expect(pendingSpy).toHaveBeenCalledTimes(2);
    });
  });
});