import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMarketingDashboard } from '../useMarketingDashboard';
import { analyticsService, campaignService } from '@/services/marketing';

// Mock the services
jest.mock('@/services/marketing');

describe('useMarketingDashboard', () => {
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
          spent: 4500,  // Important for ROI calculation
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
        name: 'Product Launch',
        status: 'active',
        budget: 25000,
        spent: 8000,
        impressions: 250000,
        clicks: 5000,
        conversions: 300,
        roi: 3.2,
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
    
    (campaignService.getPerformance as jest.Mock).mockResolvedValue({
      campaignId: 'campaign-1',
      metrics: {
        impressions: 150000,
        clicks: 3000,
        conversions: 150,
        ctr: 2.0,
        conversionRate: 5.0,
        cpc: 1.5,
        cpa: 30,
      },
    });
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  describe('dashboard data aggregation', () => {
    it('should aggregate all dashboard data', async () => {
      const { result } = renderHook(() => useMarketingDashboard(), { wrapper });
      
      expect(result.current.isLoading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.stats).toBeDefined();
      expect(result.current.stats.activeCampaigns).toBeGreaterThan(0);
      expect(result.current.stats.pendingContent).toBeGreaterThan(0);
      expect(result.current.stats.totalRevenue).toBeGreaterThan(0);
    });
    
    it('should include performance trends', async () => {
      const { result } = renderHook(() => useMarketingDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.performanceTrends).toBeDefined();
      });
      
      expect(result.current.performanceTrends?.impressionsTrend).toBeDefined();
      expect(result.current.performanceTrends?.clicksTrend).toBeDefined();
      expect(result.current.performanceTrends?.conversionsTrend).toBeDefined();
    });
    
    it('should fetch top campaign performance', async () => {
      const { result } = renderHook(() => useMarketingDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.topCampaignPerformance).toBeDefined();
      });
      
      expect(result.current.topCampaignPerformance?.campaignId).toBe('campaign-1');
    });
    
    it('should provide lists of campaigns and content', async () => {
      const { result } = renderHook(() => useMarketingDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.activeCampaigns).toBeDefined();
        expect(result.current.pendingContent).toBeDefined();
      });
      
      expect(result.current.activeCampaigns?.length).toBeGreaterThan(0);
      expect(result.current.pendingContent?.length).toBeGreaterThan(0);
    });
    
    it('should calculate engagement metrics', async () => {
      const { result } = renderHook(() => useMarketingDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.stats.engagementRate).toBeGreaterThan(0);
      expect(result.current.stats.averageRoi).toBeGreaterThan(0);
    });
    
    it('should handle empty data gracefully', async () => {
      (campaignService.getActiveCampaigns as jest.Mock).mockResolvedValue([]);
      (analyticsService.getPendingContent as jest.Mock).mockResolvedValue([]);
      (analyticsService.getMarketingAnalytics as jest.Mock).mockResolvedValue({
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
      
      const { result } = renderHook(() => useMarketingDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.stats.activeCampaigns).toBe(0);
      expect(result.current.stats.pendingContent).toBe(0);
      expect(result.current.topCampaignPerformance).toBeUndefined();
    });
    
    it('should refetch all dashboard data', async () => {
      const { result } = renderHook(() => useMarketingDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(analyticsService.getMarketingAnalytics).toHaveBeenCalledTimes(1);
      expect(campaignService.getActiveCampaigns).toHaveBeenCalledTimes(1);
      
      await result.current.refetchAll();
      
      expect(analyticsService.getMarketingAnalytics).toHaveBeenCalledTimes(2);
      expect(campaignService.getActiveCampaigns).toHaveBeenCalledTimes(2);
    });
    
    it('should expose top performing campaigns', async () => {
      const { result } = renderHook(() => useMarketingDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.topPerformingCampaigns).toBeDefined();
      });
      
      expect(result.current.topPerformingCampaigns?.length).toBeGreaterThan(0);
      expect(result.current.topPerformingCampaigns?.[0].name).toBe('Summer Sale 2024');
    });
    
    it('should expose content performance data', async () => {
      const { result } = renderHook(() => useMarketingDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.contentPerformance).toBeDefined();
      });
      
      expect(result.current.contentPerformance?.length).toBeGreaterThan(0);
      expect(result.current.contentPerformance?.[0].title).toBe('Summer Collection Guide');
    });
    
    it('should calculate published content stats', async () => {
      const { result } = renderHook(() => useMarketingDashboard(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.stats.publishedContent).toBe(85);
    });
  });
});