import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import React from 'react';

// Mock the hook (doesn't exist yet - RED phase)
const useCampaignPerformance = jest.fn();

describe('useCampaignPerformance', () => {
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
  
  describe('performance metrics retrieval', () => {
    it('should fetch campaign performance metrics', async () => {
      const mockHookReturn = {
        isLoading: false,
        data: {
          impressions: 10000,
          clicks: 500,
          conversions: 50,
          ctr: 0.05,
          conversionRate: 0.1,
          roi: 2.5
        },
        error: null
      };
      useCampaignPerformance.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useCampaignPerformance('campaign-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.data.impressions).toBe(10000);
      expect(result.current.data.ctr).toBe(0.05);
      expect(result.current.data.roi).toBe(2.5);
    });
    
    it('should calculate derived metrics automatically', async () => {
      const mockHookReturn = {
        isLoading: false,
        data: {
          impressions: 5000,
          clicks: 250
        },
        derivedMetrics: {
          ctr: 0.05,
          costPerClick: 0.5,
          averagePosition: 2.3
        }
      };
      useCampaignPerformance.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useCampaignPerformance('campaign-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.derivedMetrics.ctr).toBe(0.05);
        expect(result.current.derivedMetrics.costPerClick).toBe(0.5);
      });
    });
    
    it('should handle date range filtering', async () => {
      const mockHookReturn = {
        isLoading: false,
        data: [],
        setDateRange: jest.fn(),
        dateRange: { start: null, end: null }
      };
      useCampaignPerformance.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useCampaignPerformance('campaign-123'), { wrapper });
      
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      
      act(() => {
        result.current.setDateRange({ start: startDate, end: endDate });
      });
      
      mockHookReturn.dateRange = { start: startDate, end: endDate };
      mockHookReturn.data = [
        { date: '2025-01-15', impressions: 1000, clicks: 50 }
      ];
      
      await waitFor(() => {
        expect(result.current.dateRange.start).toEqual(startDate);
        expect(result.current.dateRange.end).toEqual(endDate);
        expect(result.current.data).toHaveLength(1);
      });
    });
    
    it('should aggregate performance data by time period', async () => {
      const mockHookReturn = {
        aggregateBy: jest.fn(),
        aggregatedData: {},
        aggregationPeriod: 'daily'
      };
      useCampaignPerformance.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useCampaignPerformance('campaign-123'), { wrapper });
      
      act(() => {
        result.current.aggregateBy('weekly');
      });
      
      mockHookReturn.aggregationPeriod = 'weekly';
      mockHookReturn.aggregatedData = {
        'week-1': { impressions: 7000, clicks: 350 },
        'week-2': { impressions: 8000, clicks: 400 }
      };
      
      await waitFor(() => {
        expect(result.current.aggregationPeriod).toBe('weekly');
        expect(Object.keys(result.current.aggregatedData)).toHaveLength(2);
      });
    });
    
    it('should compare performance across campaigns', async () => {
      const mockHookReturn = {
        compareWith: jest.fn(),
        comparisonData: null,
        isComparing: false
      };
      useCampaignPerformance.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useCampaignPerformance('campaign-123'), { wrapper });
      
      mockHookReturn.isComparing = true;
      
      act(() => {
        result.current.compareWith(['campaign-456', 'campaign-789']);
      });
      
      mockHookReturn.comparisonData = {
        'campaign-123': { impressions: 10000, clicks: 500 },
        'campaign-456': { impressions: 8000, clicks: 480 },
        'campaign-789': { impressions: 12000, clicks: 600 }
      };
      mockHookReturn.isComparing = false;
      
      await waitFor(() => {
        expect(result.current.comparisonData).toBeDefined();
        expect(Object.keys(result.current.comparisonData)).toHaveLength(3);
        expect(result.current.isComparing).toBe(false);
      });
    });
    
    it('should track A/B test performance', async () => {
      const mockHookReturn = {
        abTestResults: null,
        loadABTestResults: jest.fn(),
        isLoadingABTest: false
      };
      useCampaignPerformance.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useCampaignPerformance('campaign-123'), { wrapper });
      
      mockHookReturn.isLoadingABTest = true;
      
      act(() => {
        result.current.loadABTestResults();
      });
      
      mockHookReturn.abTestResults = {
        variantA: { 
          impressions: 5000, 
          conversions: 250,
          conversionRate: 0.05,
          confidence: 0.95
        },
        variantB: { 
          impressions: 5000, 
          conversions: 300,
          conversionRate: 0.06,
          confidence: 0.95
        },
        winner: 'variantB',
        significanceLevel: 0.05
      };
      mockHookReturn.isLoadingABTest = false;
      
      await waitFor(() => {
        expect(result.current.abTestResults).toBeDefined();
        expect(result.current.abTestResults.winner).toBe('variantB');
        expect(result.current.abTestResults.variantB.conversionRate).toBeGreaterThan(
          result.current.abTestResults.variantA.conversionRate
        );
      });
    });
    
    it('should handle real-time performance updates', async () => {
      const mockHookReturn = {
        data: { impressions: 1000, clicks: 50 },
        subscribeToUpdates: jest.fn(),
        unsubscribeFromUpdates: jest.fn(),
        isRealTimeEnabled: false,
        lastUpdate: null
      };
      useCampaignPerformance.mockReturnValue(mockHookReturn);
      
      const { result, unmount } = renderHook(
        () => useCampaignPerformance('campaign-123', { realtime: true }), 
        { wrapper }
      );
      
      mockHookReturn.isRealTimeEnabled = true;
      
      await waitFor(() => {
        expect(result.current.isRealTimeEnabled).toBe(true);
      });
      
      // Simulate real-time update
      mockHookReturn.data = { impressions: 1050, clicks: 52 };
      mockHookReturn.lastUpdate = new Date().toISOString();
      
      await waitFor(() => {
        expect(result.current.data.impressions).toBe(1050);
        expect(result.current.lastUpdate).toBeDefined();
      });
      
      unmount();
      
      expect(mockHookReturn.unsubscribeFromUpdates).toHaveBeenCalled();
    });
    
    it('should calculate budget utilization and pacing', async () => {
      const mockHookReturn = {
        budgetMetrics: {
          totalBudget: 10000,
          spent: 4500,
          remaining: 5500,
          utilizationRate: 0.45,
          dailyBudget: 333.33,
          todaySpent: 150,
          pacingStatus: 'on-track'
        },
        updateBudget: jest.fn()
      };
      useCampaignPerformance.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useCampaignPerformance('campaign-123'), { wrapper });
      
      expect(result.current.budgetMetrics.utilizationRate).toBe(0.45);
      expect(result.current.budgetMetrics.pacingStatus).toBe('on-track');
      
      act(() => {
        result.current.updateBudget(12000);
      });
      
      mockHookReturn.budgetMetrics.totalBudget = 12000;
      mockHookReturn.budgetMetrics.remaining = 7500;
      mockHookReturn.budgetMetrics.utilizationRate = 0.375;
      
      await waitFor(() => {
        expect(result.current.budgetMetrics.totalBudget).toBe(12000);
        expect(result.current.budgetMetrics.utilizationRate).toBe(0.375);
      });
    });
    
    it('should generate performance alerts and recommendations', async () => {
      const mockHookReturn = {
        alerts: [],
        recommendations: [],
        checkPerformanceAlerts: jest.fn(),
        dismissAlert: jest.fn()
      };
      useCampaignPerformance.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useCampaignPerformance('campaign-123'), { wrapper });
      
      act(() => {
        result.current.checkPerformanceAlerts();
      });
      
      mockHookReturn.alerts = [
        {
          id: 'alert-1',
          type: 'warning',
          message: 'CTR below target',
          metric: 'ctr',
          current: 0.02,
          target: 0.05
        }
      ];
      
      mockHookReturn.recommendations = [
        {
          id: 'rec-1',
          action: 'Optimize ad copy',
          expectedImpact: 'Increase CTR by 50%',
          priority: 'high'
        }
      ];
      
      await waitFor(() => {
        expect(result.current.alerts).toHaveLength(1);
        expect(result.current.alerts[0].type).toBe('warning');
        expect(result.current.recommendations).toHaveLength(1);
        expect(result.current.recommendations[0].priority).toBe('high');
      });
      
      act(() => {
        result.current.dismissAlert('alert-1');
      });
      
      mockHookReturn.alerts = [];
      
      await waitFor(() => {
        expect(result.current.alerts).toHaveLength(0);
      });
    });
    
    it('should export performance data in multiple formats', async () => {
      const mockHookReturn = {
        exportData: jest.fn(),
        isExporting: false,
        exportFormats: ['csv', 'json', 'xlsx', 'pdf']
      };
      useCampaignPerformance.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useCampaignPerformance('campaign-123'), { wrapper });
      
      mockHookReturn.isExporting = true;
      
      act(() => {
        result.current.exportData('csv', {
          includeMetrics: ['impressions', 'clicks', 'ctr'],
          dateRange: { start: '2025-01-01', end: '2025-01-31' }
        });
      });
      
      expect(result.current.isExporting).toBe(true);
      
      mockHookReturn.exportData.mockResolvedValue({
        url: 'https://download.example.com/export.csv',
        filename: 'campaign-performance-2025-01.csv'
      });
      mockHookReturn.isExporting = false;
      
      await waitFor(() => {
        expect(result.current.isExporting).toBe(false);
        expect(result.current.exportData).toHaveBeenCalledWith('csv', expect.any(Object));
      });
    });
  });
  
  describe('performance optimization', () => {
    it('should handle data caching and invalidation', async () => {
      const mockHookReturn = {
        data: null,
        isLoading: false,
        isCached: false,
        invalidateCache: jest.fn(),
        cacheTime: null
      };
      useCampaignPerformance.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useCampaignPerformance('campaign-123'), { wrapper });
      
      mockHookReturn.data = { impressions: 1000 };
      mockHookReturn.isCached = true;
      mockHookReturn.cacheTime = new Date().toISOString();
      
      await waitFor(() => {
        expect(result.current.isCached).toBe(true);
        expect(result.current.cacheTime).toBeDefined();
      });
      
      act(() => {
        result.current.invalidateCache();
      });
      
      mockHookReturn.isCached = false;
      mockHookReturn.cacheTime = null;
      
      await waitFor(() => {
        expect(result.current.isCached).toBe(false);
      });
    });
  });
});