// Enhanced Metric Trends Hook Tests
// Testing trend analysis, comparisons, forecasts, and error handling

import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMetricTrends } from '../useMetricTrends';
import { BusinessMetricsService } from '../../../services/executive/businessMetricsService';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Mock services
jest.mock('../../../services/executive/businessMetricsService');
jest.mock('../../../utils/validationMonitor');
jest.mock('../../role-based/useUserRole', () => ({
  useUserRole: jest.fn()
}));
jest.mock('../../../utils/queryKeyFactory', () => ({
  executiveAnalyticsKeys: {
    metricTrends: jest.fn((role, options) => ['executive', 'metricTrends', role, options]),
    businessMetrics: jest.fn((role) => ['executive', 'businessMetrics', role]),
    predictiveAnalytics: jest.fn((role) => ['executive', 'predictiveAnalytics', role])
  }
}));

// Import the mock after it's been set up
import { useUserRole } from '../../role-based/useUserRole';

describe('useMetricTrends Enhanced Tests', () => {
  let queryClient: QueryClient;

  const mockTrendsData = {
    values: [
      { date: '2025-01-01', value: 100000 },
      { date: '2025-01-02', value: 105000 },
      { date: '2025-01-03', value: 110000 },
      { date: '2025-01-04', value: 108000 }
    ],
    averageValue: 105750,
    trend: 'increasing',
    changeRate: 0.08,
    metadata: {
      period: '4d',
      granularity: 'daily'
    }
  };

  const mockComparisonData = {
    current: mockTrendsData,
    comparison: {
      ...mockTrendsData,
      averageValue: 98000,
      trend: 'stable'
    },
    percentageChange: 7.91
  };

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { 
          retry: false, 
          gcTime: 0,
          staleTime: 0
        }
      }
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useUserRole as jest.Mock).mockReturnValue({
      role: 'executive',
      hasPermission: jest.fn().mockResolvedValue(true)
    });
    (BusinessMetricsService as any).calculateTrends = jest.fn().mockResolvedValue(mockTrendsData);
    (ValidationMonitor as any).recordPatternSuccess = jest.fn();
    (ValidationMonitor as any).recordValidationError = jest.fn();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('Core Functionality Tests', () => {
    it('should fetch metric trends successfully', async () => {
      const { result } = renderHook(() => useMetricTrends(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeDefined();
      expect(result.current.trends).toBeDefined();
      expect(result.current.data.averageValue).toBe(105750);
      expect(result.current.data.trend).toBe('increasing');
    });

    it('should handle metric type options', async () => {
      const options = { metricType: 'sales' };
      
      renderHook(() => useMetricTrends(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(BusinessMetricsService.calculateTrends).toHaveBeenCalledWith({
          metric_type: 'sales',
          time_range: '30d',
          granularity: 'daily'
        });
      });
    });

    it('should handle custom time range and granularity', async () => {
      const options = { 
        timeRange: '7d',
        granularity: 'hourly' as const
      };
      
      renderHook(() => useMetricTrends(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(BusinessMetricsService.calculateTrends).toHaveBeenCalledWith({
          metric_type: 'revenue',
          time_range: '7d',
          granularity: 'hourly'
        });
      });
    });

    it('should handle all granularity options', async () => {
      const granularities = ['hourly', 'daily', 'weekly', 'monthly'] as const;
      
      for (const granularity of granularities) {
        const { result } = renderHook(() => useMetricTrends({ granularity }), {
          wrapper: createWrapper()
        });

        await waitFor(() => {
          expect(BusinessMetricsService.calculateTrends).toHaveBeenCalledWith(
            expect.objectContaining({ granularity })
          );
        });
      }
    });
  });

  describe('Comparison Analysis Tests', () => {
    it('should fetch comparison data when requested', async () => {
      (BusinessMetricsService as any).calculateTrends
        .mockResolvedValueOnce(mockTrendsData)
        .mockResolvedValueOnce({ ...mockTrendsData, averageValue: 98000 });

      const options = { comparisonPeriod: '30d' };
      const { result } = renderHook(() => useMetricTrends(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(BusinessMetricsService.calculateTrends).toHaveBeenCalledTimes(2);
      expect(result.current.data.current).toBeDefined();
      expect(result.current.data.comparison).toBeDefined();
      expect(result.current.percentageChange).toBeDefined();
    });

    it('should calculate percentage change correctly', async () => {
      (BusinessMetricsService as any).calculateTrends
        .mockResolvedValueOnce(mockTrendsData) // current: 105750
        .mockResolvedValueOnce({ ...mockTrendsData, averageValue: 100000 }); // comparison: 100000

      const options = { comparisonPeriod: '30d' };
      const { result } = renderHook(() => useMetricTrends(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // (105750 - 100000) / 100000 * 100 = 5.75%
      expect(result.current.percentageChange).toBeCloseTo(5.75, 1);
    });

    it('should handle comparison periods correctly', async () => {
      (BusinessMetricsService as any).calculateTrends
        .mockResolvedValueOnce(mockTrendsData)
        .mockResolvedValueOnce(mockTrendsData);

      const options = { comparisonPeriod: '90d' };
      renderHook(() => useMetricTrends(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        const calls = (BusinessMetricsService.calculateTrends as jest.Mock).mock.calls;
        expect(calls[1][0]).toEqual({
          metric_type: 'revenue',
          time_range: '90d',
          granularity: 'daily'
        });
      });
    });
  });

  describe('Forecast Integration Tests', () => {
    it('should include forecasts when requested', async () => {
      const options = { includeForecasts: true };
      const { result } = renderHook(() => useMetricTrends(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data.forecasts).toBeDefined();
      expect(result.current.data.forecasts.nextPeriod).toBeDefined();
      expect(result.current.data.forecasts.confidence).toBeDefined();
    });

    it('should calculate forecast based on average value', async () => {
      const options = { includeForecasts: true };
      const { result } = renderHook(() => useMetricTrends(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Should be 10% higher than average (105750 * 1.1 = 116325)
      expect(result.current.data.forecasts.nextPeriod).toBeCloseTo(116325, 0);
      expect(result.current.data.forecasts.confidence).toBe(0.85);
    });

    it('should not include forecasts when not requested', async () => {
      const options = { includeForecasts: false };
      const { result } = renderHook(() => useMetricTrends(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data.forecasts).toBeUndefined();
    });
  });

  describe('UI Transform Tests', () => {
    it('should provide trends data in UI-ready format', async () => {
      const { result } = renderHook(() => useMetricTrends(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const trends = result.current.trends;
      expect(trends.values).toBeDefined();
      expect(Array.isArray(trends.values)).toBe(true);
      expect(trends.averageValue).toBeDefined();
      expect(trends.trend).toBeDefined();
      expect(['increasing', 'decreasing', 'stable']).toContain(trends.trend);
    });

    it('should provide metadata for UI display', async () => {
      const { result } = renderHook(() => useMetricTrends(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data.metadata).toBeDefined();
      expect(result.current.data.metadata.period).toBeDefined();
      expect(result.current.data.metadata.granularity).toBeDefined();
    });

    it('should provide comparison data with percentage change', async () => {
      (BusinessMetricsService as any).calculateTrends
        .mockResolvedValueOnce(mockTrendsData)
        .mockResolvedValueOnce({ ...mockTrendsData, averageValue: 100000 });

      const options = { comparisonPeriod: '30d' };
      const { result } = renderHook(() => useMetricTrends(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.percentageChange).toBeDefined();
      expect(typeof result.current.percentageChange).toBe('number');
    });
  });

  describe('Permission Tests', () => {
    it('should check permissions before fetching', async () => {
      const hasPermissionMock = jest.fn().mockResolvedValue(true);
      (useUserRole as jest.Mock).mockReturnValue({
        role: 'manager',
        hasPermission: hasPermissionMock
      });

      renderHook(() => useMetricTrends(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(hasPermissionMock).toHaveBeenCalledWith('business_metrics_read');
      });
    });

    it('should throw error when lacking permissions', async () => {
      const hasPermissionMock = jest.fn().mockResolvedValue(false);
      (useUserRole as jest.Mock).mockReturnValue({
        role: 'viewer',
        hasPermission: hasPermissionMock
      });

      const { result } = renderHook(() => useMetricTrends(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error?.message).toContain('Insufficient permissions');
    });

    it('should allow executive role without checking permission', async () => {
      const hasPermissionMock = jest.fn().mockResolvedValue(false);
      (useUserRole as jest.Mock).mockReturnValue({
        role: 'executive',
        hasPermission: hasPermissionMock
      });

      const { result } = renderHook(() => useMetricTrends(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeDefined();
    });

    it('should allow admin role without checking permission', async () => {
      const hasPermissionMock = jest.fn().mockResolvedValue(false);
      (useUserRole as jest.Mock).mockReturnValue({
        role: 'admin',
        hasPermission: hasPermissionMock
      });

      const { result } = renderHook(() => useMetricTrends(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeDefined();
    });
  });

  describe('Error Handling Tests', () => {
    it('should provide fallback data on error', async () => {
      // Mock the hasPermission to return immediately
      const mockHasPermission = jest.fn().mockResolvedValue(true);
      (useUserRole as jest.Mock).mockReturnValue({
        role: 'executive',
        hasPermission: mockHasPermission
      });
      
      const calculateTrendsMock = jest.fn()
        .mockRejectedValue(new Error('Service unavailable'));
      (BusinessMetricsService as any).calculateTrends = calculateTrendsMock;

      const { result } = renderHook(() => useMetricTrends(), {
        wrapper: createWrapper()
      });

      // Wait for the query to finish (either success or error)
      await waitFor(() => {
        // First ensure the mock was called, then check the state
        return calculateTrendsMock.mock.calls.length > 0;
      }, { timeout: 3000 });

      // Wait a bit more for the error to propagate
      await waitFor(() => {
        return result.current.isError === true || result.current.isSuccess === true;
      }, { timeout: 3000 });

      // Now check if it's in error state
      expect(result.current.isError).toBe(true);

      expect(result.current.fallbackData).toBeDefined();
      expect(result.current.fallbackData.values).toEqual([]);
      expect(result.current.fallbackData.averageValue).toBe(0);
      expect(result.current.fallbackData.trend).toBe('stable');
      expect(result.current.fallbackData.message).toBe('Trend data temporarily unavailable');
      expect(result.current.fallbackData.isFallback).toBe(true);
    });

    it('should not retry on permission errors', async () => {
      (BusinessMetricsService as any).calculateTrends = jest.fn()
        .mockRejectedValue(new Error('Insufficient permissions'));

      renderHook(() => useMetricTrends(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        // Should only try once for permission errors
        expect(BusinessMetricsService.calculateTrends).toHaveBeenCalledTimes(1);
      });
    });

    it('should retry on network errors', async () => {
      // Mock the hasPermission to return immediately
      const mockHasPermission = jest.fn().mockResolvedValue(true);
      (useUserRole as jest.Mock).mockReturnValue({
        role: 'executive',
        hasPermission: mockHasPermission
      });
      
      let callCount = 0;
      (BusinessMetricsService as any).calculateTrends = jest.fn()
        .mockImplementation(() => {
          callCount++;
          if (callCount <= 2) {
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve(mockTrendsData);
        });

      // Create custom wrapper with retry enabled
      const customQueryClient = new QueryClient({
        defaultOptions: {
          queries: { 
            retry: 2,  // Enable retry for this test
            retryDelay: 0,  // No delay for testing
            gcTime: 0 
          }
        }
      });

      const { result } = renderHook(() => useMetricTrends(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={customQueryClient}>
            {children}
          </QueryClientProvider>
        )
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000
      });

      // Should retry up to 2 times on network error
      expect(callCount).toBe(3);
    });

    it('should handle comparison fetch errors gracefully', async () => {
      // Mock the hasPermission to return immediately
      const mockHasPermission = jest.fn().mockResolvedValue(true);
      (useUserRole as jest.Mock).mockReturnValue({
        role: 'executive',
        hasPermission: mockHasPermission
      });
      
      const calculateTrendsMock = jest.fn()
        .mockResolvedValueOnce(mockTrendsData)
        .mockRejectedValueOnce(new Error('Comparison data unavailable'));
      (BusinessMetricsService as any).calculateTrends = calculateTrendsMock;

      const options = { comparisonPeriod: '30d' };
      const { result } = renderHook(() => useMetricTrends(options), {
        wrapper: createWrapper()
      });

      // Wait for the mock to be called twice (main and comparison)
      await waitFor(() => {
        return calculateTrendsMock.mock.calls.length >= 2;
      }, { timeout: 3000 });

      // Wait for the query to finish (either success or error)
      await waitFor(() => {
        // Check for either error or success state
        return result.current.isError === true || result.current.isSuccess === true;
      }, { timeout: 3000 });

      // Now check if it's in error state  
      expect(result.current.isError).toBe(true);

      expect(result.current.error?.message).toBe('Comparison data unavailable');
    });
  });

  describe('Cache Strategy Tests', () => {
    it('should use appropriate stale time for trends', async () => {
      // Create a single wrapper to share the same QueryClient
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useMetricTrends(), {
        wrapper
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Initial call
      expect(BusinessMetricsService.calculateTrends).toHaveBeenCalledTimes(1);

      // Should use cache for subsequent calls within stale time
      const { result: result2 } = renderHook(() => useMetricTrends(), {
        wrapper
      });

      await waitFor(() => expect(result2.current.isSuccess).toBe(true));

      // Should still be 1 call due to caching
      expect(BusinessMetricsService.calculateTrends).toHaveBeenCalledTimes(1);
    });

    it('should not auto-refetch on mount or focus', async () => {
      const { result } = renderHook(() => useMetricTrends(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Simulate window focus
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });

      // Should not refetch
      expect(BusinessMetricsService.calculateTrends).toHaveBeenCalledTimes(1);
    });
  });

  describe('Query Invalidation Tests', () => {
    it('should provide smart invalidation helper', async () => {
      const wrapper = createWrapper();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      
      const { result } = renderHook(() => useMetricTrends(), {
        wrapper
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      await act(async () => {
        await result.current.invalidateRelatedTrends();
      });

      // Should invalidate multiple related queries
      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(2);
    });

    it('should include predictive analytics in invalidation when forecasts enabled', async () => {
      const wrapper = createWrapper();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      
      const { result } = renderHook(() => useMetricTrends({ includeForecasts: true }), {
        wrapper
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      await act(async () => {
        await result.current.invalidateRelatedTrends();
      });

      // Should invalidate 3 queries including predictive analytics
      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle invalidation with custom metric types', async () => {
      const wrapper = createWrapper();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      
      const { result } = renderHook(() => useMetricTrends(), {
        wrapper
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      await act(async () => {
        await result.current.invalidateRelatedTrends(['sales', 'marketing']);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });
  });

  describe('Query Key Tests', () => {
    it('should generate unique query keys for different options', async () => {
      const { result: result1 } = renderHook(
        () => useMetricTrends({ metricType: 'sales' }),
        { wrapper: createWrapper() }
      );

      const { result: result2 } = renderHook(
        () => useMetricTrends({ metricType: 'revenue' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
        expect(result2.current.isSuccess).toBe(true);
      });

      expect(result1.current.queryKey).not.toEqual(result2.current.queryKey);
    });

    it('should include role and options in query key', async () => {
      (useUserRole as jest.Mock).mockReturnValue({
        role: 'manager',
        hasPermission: jest.fn().mockResolvedValue(true)
      });

      const { result } = renderHook(() => useMetricTrends({ timeRange: '7d' }), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.queryKey).toEqual([
        'executive', 'metricTrends', 'manager', { timeRange: '7d' }
      ]);
    });
  });
});