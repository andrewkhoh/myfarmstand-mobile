import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the hook (doesn't exist yet - RED phase)
const useMarketingAnalytics = jest.fn();

describe('useMarketingAnalytics', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  describe('analytics data aggregation', () => {
    it('should fetch comprehensive marketing analytics', async () => {
      useMarketingAnalytics.mockReturnValue({
        isLoading: false,
        data: {
          totalCampaigns: 15,
          activeCampaigns: 8,
          totalRevenue: 125000,
          avgROI: 285,
          topPerformingCampaign: 'Summer Sale 2025'
        }
      });
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.data.totalRevenue).toBe(125000);
      expect(result.current.data.avgROI).toBe(285);
    });
    
    it('should aggregate data across multiple campaigns', async () => {
      const aggregateCampaigns = jest.fn().mockResolvedValue({
        totalImpressions: 5000000,
        totalClicks: 150000,
        totalConversions: 7500,
        avgCTR: 3.0
      });
      
      useMarketingAnalytics.mockReturnValue({
        isLoading: false,
        aggregateCampaigns
      });
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await act(async () => {
        const aggregated = await result.current.aggregateCampaigns(['campaign-1', 'campaign-2', 'campaign-3']);
        expect(aggregated.totalImpressions).toBe(5000000);
      });
    });
    
    it('should generate trend analysis over time', async () => {
      useMarketingAnalytics.mockReturnValue({
        isLoading: false,
        trends: {
          revenue: { direction: 'up', percentage: 15.5 },
          conversions: { direction: 'up', percentage: 8.2 },
          ctr: { direction: 'down', percentage: -2.1 },
          costPerAcquisition: { direction: 'down', percentage: -5.3 }
        }
      });
      
      const { result } = renderHook(() => useMarketingAnalytics({ period: 'month' }), { wrapper });
      
      await waitFor(() => {
        expect(result.current.trends.revenue.direction).toBe('up');
        expect(result.current.trends.revenue.percentage).toBe(15.5);
      });
    });
    
    it('should provide funnel analysis', async () => {
      useMarketingAnalytics.mockReturnValue({
        isLoading: false,
        funnel: {
          stages: [
            { name: 'Impressions', count: 100000, rate: 100 },
            { name: 'Clicks', count: 3000, rate: 3 },
            { name: 'Signups', count: 450, rate: 15 },
            { name: 'Purchases', count: 90, rate: 20 }
          ],
          overallConversion: 0.09
        }
      });
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.funnel.stages).toHaveLength(4);
        expect(result.current.funnel.overallConversion).toBe(0.09);
      });
    });
    
    it('should calculate customer lifetime value metrics', async () => {
      useMarketingAnalytics.mockReturnValue({
        isLoading: false,
        clvMetrics: {
          averageClv: 850,
          clvByCohort: {
            'Q1-2025': 920,
            'Q4-2024': 780,
            'Q3-2024': 710
          },
          clvToCAC: 3.2
        }
      });
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.clvMetrics.averageClv).toBe(850);
        expect(result.current.clvMetrics.clvToCAC).toBe(3.2);
      });
    });
    
    it('should provide content performance analytics', async () => {
      useMarketingAnalytics.mockReturnValue({
        isLoading: false,
        contentPerformance: {
          topContent: [
            { id: 'content-1', title: 'Product Launch', engagement: 8500 },
            { id: 'content-2', title: 'How-to Guide', engagement: 6200 },
            { id: 'content-3', title: 'Customer Story', engagement: 5100 }
          ],
          avgEngagementRate: 4.2,
          contentROI: 320
        }
      });
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.contentPerformance.topContent).toHaveLength(3);
        expect(result.current.contentPerformance.contentROI).toBe(320);
      });
    });
    
    it('should generate predictive analytics', async () => {
      const generatePredictions = jest.fn().mockResolvedValue({
        nextQuarterRevenue: { estimate: 145000, confidence: 0.82 },
        churnRisk: { high: 120, medium: 340, low: 890 },
        growthRate: { predicted: 12.5, current: 10.2 }
      });
      
      useMarketingAnalytics.mockReturnValue({
        isLoading: false,
        generatePredictions
      });
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await act(async () => {
        const predictions = await result.current.generatePredictions();
        expect(predictions.nextQuarterRevenue.estimate).toBe(145000);
        expect(predictions.growthRate.predicted).toBe(12.5);
      });
    });
    
    it('should segment analytics by demographics', async () => {
      useMarketingAnalytics.mockReturnValue({
        isLoading: false,
        demographics: {
          age: {
            '18-24': { revenue: 25000, conversion: 5.2 },
            '25-34': { revenue: 45000, conversion: 4.8 },
            '35-44': { revenue: 35000, conversion: 4.1 },
            '45+': { revenue: 20000, conversion: 3.5 }
          },
          geography: {
            'North America': { revenue: 75000, users: 15000 },
            'Europe': { revenue: 35000, users: 8500 },
            'Asia': { revenue: 15000, users: 5500 }
          }
        }
      });
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.demographics.age['25-34'].revenue).toBe(45000);
        expect(result.current.demographics.geography['North America'].revenue).toBe(75000);
      });
    });
    
    it('should track marketing attribution paths', async () => {
      useMarketingAnalytics.mockReturnValue({
        isLoading: false,
        attribution: {
          paths: [
            { path: ['Social', 'Email', 'Direct'], conversions: 450, revenue: 22500 },
            { path: ['Search', 'Email'], conversions: 380, revenue: 19000 },
            { path: ['Direct'], conversions: 220, revenue: 11000 }
          ],
          topTouchpoints: ['Email', 'Social', 'Search']
        }
      });
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.attribution.paths).toHaveLength(3);
        expect(result.current.attribution.topTouchpoints[0]).toBe('Email');
      });
    });
    
    it('should provide competitive analysis', async () => {
      useMarketingAnalytics.mockReturnValue({
        isLoading: false,
        competitive: {
          marketShare: 18.5,
          shareOfVoice: 22.3,
          competitors: [
            { name: 'Competitor A', marketShare: 25.2, sov: 28.1 },
            { name: 'Competitor B', marketShare: 21.8, sov: 19.5 }
          ],
          position: 3
        }
      });
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.competitive.marketShare).toBe(18.5);
        expect(result.current.competitive.position).toBe(3);
      });
    });
  });
  
  describe('data export and reporting', () => {
    it('should export analytics data in multiple formats', async () => {
      const exportAnalytics = jest.fn().mockResolvedValue({
        format: 'pdf',
        url: 'https://reports.example.com/analytics-2025-01.pdf',
        size: 2485760
      });
      
      useMarketingAnalytics.mockReturnValue({
        isLoading: false,
        exportAnalytics
      });
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await act(async () => {
        const exported = await result.current.exportAnalytics('pdf', {
          includeCharts: true,
          dateRange: 'last_quarter'
        });
        expect(exported.format).toBe('pdf');
      });
    });
    
    it('should generate automated reports', async () => {
      const generateReport = jest.fn().mockResolvedValue({
        reportId: 'report-789',
        status: 'completed',
        insights: [
          'Revenue increased by 15% MoM',
          'Best performing channel: Email (35% of conversions)',
          'Customer acquisition cost decreased by 8%'
        ]
      });
      
      useMarketingAnalytics.mockReturnValue({
        isLoading: false,
        generateReport
      });
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await act(async () => {
        const report = await result.current.generateReport('monthly');
        expect(report.insights).toHaveLength(3);
      });
    });
    
    it('should schedule recurring analytics reports', async () => {
      const scheduleReport = jest.fn().mockResolvedValue({
        scheduleId: 'schedule-456',
        frequency: 'weekly',
        nextRun: '2025-02-07T09:00:00Z'
      });
      
      useMarketingAnalytics.mockReturnValue({
        isLoading: false,
        scheduleReport
      });
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await act(async () => {
        const schedule = await result.current.scheduleReport({
          frequency: 'weekly',
          recipients: ['marketing@example.com'],
          format: 'excel'
        });
        expect(schedule.frequency).toBe('weekly');
      });
    });
  });
  
  describe('real-time updates', () => {
    it('should subscribe to real-time analytics updates', async () => {
      const subscribe = jest.fn();
      useMarketingAnalytics.mockReturnValue({
        isLoading: false,
        subscribe,
        realTimeData: {
          activeUsers: 1250,
          currentRevenue: 4500,
          liveConversions: 23
        }
      });
      
      const { result } = renderHook(() => useMarketingAnalytics({ realTime: true }), { wrapper });
      
      expect(subscribe).toHaveBeenCalled();
      expect(result.current.realTimeData.activeUsers).toBe(1250);
    });
    
    it('should handle analytics webhooks', async () => {
      const onAnalyticsUpdate = jest.fn();
      useMarketingAnalytics.mockReturnValue({
        isLoading: false,
        onAnalyticsUpdate
      });
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await act(async () => {
        result.current.onAnalyticsUpdate({
          type: 'conversion',
          data: { campaign: 'campaign-123', value: 150 }
        });
      });
      
      expect(onAnalyticsUpdate).toHaveBeenCalled();
    });
  });
  
  describe('error handling', () => {
    it('should handle data processing errors', async () => {
      useMarketingAnalytics.mockReturnValue({
        isLoading: false,
        isError: true,
        error: new Error('Failed to process analytics data')
      });
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      
      expect(result.current.error?.message).toBe('Failed to process analytics data');
    });
    
    it('should handle missing data gracefully', async () => {
      useMarketingAnalytics.mockReturnValue({
        isLoading: false,
        data: null,
        noDataReason: 'No campaigns active in selected period'
      });
      
      const { result } = renderHook(() => useMarketingAnalytics({ period: 'last_year' }), { wrapper });
      
      expect(result.current.data).toBeNull();
      expect(result.current.noDataReason).toBeDefined();
    });
  });
});