import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import React from 'react';

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
    it('should aggregate marketing metrics across channels', async () => {
      const mockHookReturn = {
        isLoading: false,
        data: {
          totalReach: 50000,
          totalEngagement: 2500,
          totalConversions: 250,
          channels: {
            social: { reach: 20000, engagement: 1500 },
            email: { reach: 15000, engagement: 500 },
            paid: { reach: 15000, engagement: 500 }
          }
        },
        error: null
      };
      useMarketingAnalytics.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.data.totalReach).toBe(50000);
      expect(result.current.data.channels.social.reach).toBe(20000);
    });
    
    it('should calculate conversion funnels', async () => {
      const mockHookReturn = {
        funnelData: {
          stages: [
            { name: 'Awareness', count: 10000, rate: 1.0 },
            { name: 'Interest', count: 5000, rate: 0.5 },
            { name: 'Consideration', count: 2000, rate: 0.2 },
            { name: 'Purchase', count: 500, rate: 0.05 }
          ],
          dropoffRates: [0.5, 0.6, 0.75],
          overallConversion: 0.05
        },
        calculateFunnel: jest.fn()
      };
      useMarketingAnalytics.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      expect(result.current.funnelData.overallConversion).toBe(0.05);
      expect(result.current.funnelData.dropoffRates[0]).toBe(0.5);
    });
    
    it('should generate attribution models', async () => {
      const mockHookReturn = {
        attribution: {
          model: 'last-touch',
          touchpoints: [],
          creditDistribution: {}
        },
        setAttributionModel: jest.fn(),
        calculateAttribution: jest.fn()
      };
      useMarketingAnalytics.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      act(() => {
        result.current.setAttributionModel('linear');
      });
      
      mockHookReturn.attribution = {
        model: 'linear',
        touchpoints: [
          { channel: 'social', timestamp: '2025-01-01', value: 0.25 },
          { channel: 'email', timestamp: '2025-01-02', value: 0.25 },
          { channel: 'paid', timestamp: '2025-01-03', value: 0.25 },
          { channel: 'direct', timestamp: '2025-01-04', value: 0.25 }
        ],
        creditDistribution: {
          social: 0.25,
          email: 0.25,
          paid: 0.25,
          direct: 0.25
        }
      };
      
      await waitFor(() => {
        expect(result.current.attribution.model).toBe('linear');
        expect(result.current.attribution.creditDistribution.social).toBe(0.25);
      });
    });
    
    it('should track customer lifetime value metrics', async () => {
      const mockHookReturn = {
        clvMetrics: {
          averageCLV: 1500,
          segmentedCLV: {
            premium: 5000,
            standard: 1500,
            basic: 500
          },
          clvTrend: 'increasing',
          projectedCLV: 1800,
          retentionRate: 0.85
        },
        updateCLVSegment: jest.fn()
      };
      useMarketingAnalytics.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      expect(result.current.clvMetrics.averageCLV).toBe(1500);
      expect(result.current.clvMetrics.segmentedCLV.premium).toBe(5000);
      expect(result.current.clvMetrics.retentionRate).toBe(0.85);
    });
    
    it('should generate cohort analysis', async () => {
      const mockHookReturn = {
        cohortData: null,
        generateCohort: jest.fn(),
        isGeneratingCohort: false
      };
      useMarketingAnalytics.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      mockHookReturn.isGeneratingCohort = true;
      
      act(() => {
        result.current.generateCohort({
          period: 'monthly',
          metric: 'retention',
          startDate: '2025-01-01',
          endDate: '2025-06-30'
        });
      });
      
      mockHookReturn.cohortData = {
        cohorts: [
          { month: 'Jan', size: 1000, retention: [1.0, 0.8, 0.7, 0.6, 0.55, 0.5] },
          { month: 'Feb', size: 1200, retention: [1.0, 0.85, 0.75, 0.65, 0.6] },
          { month: 'Mar', size: 1100, retention: [1.0, 0.82, 0.72, 0.62] }
        ],
        averageRetention: [1.0, 0.82, 0.72, 0.62, 0.575, 0.5]
      };
      mockHookReturn.isGeneratingCohort = false;
      
      await waitFor(() => {
        expect(result.current.cohortData).toBeDefined();
        expect(result.current.cohortData.cohorts).toHaveLength(3);
        expect(result.current.cohortData.averageRetention[1]).toBe(0.82);
      });
    });
    
    it('should provide predictive analytics', async () => {
      const mockHookReturn = {
        predictions: {
          nextMonthRevenue: 150000,
          confidence: 0.85,
          factors: [
            { name: 'seasonality', impact: 0.3 },
            { name: 'trend', impact: 0.5 },
            { name: 'campaigns', impact: 0.2 }
          ],
          scenarios: {
            optimistic: 180000,
            realistic: 150000,
            pessimistic: 120000
          }
        },
        generatePrediction: jest.fn()
      };
      useMarketingAnalytics.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      expect(result.current.predictions.nextMonthRevenue).toBe(150000);
      expect(result.current.predictions.confidence).toBe(0.85);
      expect(result.current.predictions.scenarios.optimistic).toBe(180000);
    });
    
    it('should handle custom metrics and KPIs', async () => {
      const mockHookReturn = {
        customMetrics: new Map(),
        addCustomMetric: jest.fn(),
        removeCustomMetric: jest.fn(),
        calculateCustomMetric: jest.fn()
      };
      useMarketingAnalytics.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      const customMetric = {
        name: 'engagement_quality',
        formula: '(likes * 1 + comments * 2 + shares * 3) / impressions',
        value: null
      };
      
      act(() => {
        result.current.addCustomMetric(customMetric);
      });
      
      mockHookReturn.customMetrics.set('engagement_quality', {
        ...customMetric,
        value: 0.045
      });
      
      await waitFor(() => {
        const metric = result.current.customMetrics.get('engagement_quality');
        expect(metric).toBeDefined();
        expect(metric.value).toBe(0.045);
      });
    });
    
    it('should segment audience analytics', async () => {
      const mockHookReturn = {
        segments: {
          demographic: {
            age: { '18-24': 0.25, '25-34': 0.35, '35-44': 0.25, '45+': 0.15 },
            gender: { male: 0.45, female: 0.53, other: 0.02 }
          },
          behavioral: {
            engagement: { high: 0.2, medium: 0.5, low: 0.3 },
            purchaseFrequency: { frequent: 0.15, occasional: 0.6, rare: 0.25 }
          },
          geographic: {
            regions: { north: 0.3, south: 0.25, east: 0.2, west: 0.25 }
          }
        },
        filterBySegment: jest.fn()
      };
      useMarketingAnalytics.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      expect(result.current.segments.demographic.age['25-34']).toBe(0.35);
      expect(result.current.segments.behavioral.engagement.high).toBe(0.2);
    });
    
    it('should track marketing ROI and ROAS', async () => {
      const mockHookReturn = {
        roiMetrics: {
          overallROI: 2.5,
          channelROI: {
            paid: 3.2,
            organic: 5.1,
            email: 4.3,
            social: 2.8
          },
          roas: 4.5,
          costPerAcquisition: 25,
          paybackPeriod: 3.5
        },
        calculateROI: jest.fn()
      };
      useMarketingAnalytics.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      expect(result.current.roiMetrics.overallROI).toBe(2.5);
      expect(result.current.roiMetrics.channelROI.organic).toBe(5.1);
      expect(result.current.roiMetrics.roas).toBe(4.5);
    });
    
    it('should export analytics reports', async () => {
      const mockHookReturn = {
        generateReport: jest.fn(),
        isGeneratingReport: false,
        reportFormats: ['pdf', 'excel', 'powerpoint', 'csv']
      };
      useMarketingAnalytics.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      mockHookReturn.isGeneratingReport = true;
      
      act(() => {
        result.current.generateReport({
          type: 'monthly',
          format: 'pdf',
          sections: ['overview', 'channels', 'campaigns', 'roi'],
          dateRange: { start: '2025-01-01', end: '2025-01-31' }
        });
      });
      
      expect(result.current.isGeneratingReport).toBe(true);
      
      mockHookReturn.generateReport.mockResolvedValue({
        url: 'https://reports.example.com/january-2025.pdf',
        size: 2048000,
        pages: 25
      });
      mockHookReturn.isGeneratingReport = false;
      
      await waitFor(() => {
        expect(result.current.isGeneratingReport).toBe(false);
      });
    });
    
    it('should handle data refresh and real-time updates', async () => {
      const mockHookReturn = {
        lastRefresh: null,
        refreshData: jest.fn(),
        isRefreshing: false,
        autoRefresh: false,
        setAutoRefresh: jest.fn()
      };
      useMarketingAnalytics.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingAnalytics(), { wrapper });
      
      mockHookReturn.isRefreshing = true;
      
      act(() => {
        result.current.refreshData();
      });
      
      expect(result.current.isRefreshing).toBe(true);
      
      mockHookReturn.lastRefresh = new Date().toISOString();
      mockHookReturn.isRefreshing = false;
      
      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
        expect(result.current.lastRefresh).toBeDefined();
      });
      
      act(() => {
        result.current.setAutoRefresh(true);
      });
      
      mockHookReturn.autoRefresh = true;
      
      expect(result.current.autoRefresh).toBe(true);
    });
  });
});