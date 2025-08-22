// Phase 4.3: Business Metrics Hook Tests (RED Phase)
// Following established React Query testing patterns from useCart, useAuth, etc.

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBusinessMetrics } from '../useBusinessMetrics';
import { useMetricTrends } from '../useMetricTrends';
import { useCrossRoleAnalytics } from '../useCrossRoleAnalytics';
import { BusinessMetricsService } from '../../../services/executive/businessMetricsService';

// Mock the service
jest.mock('../../../services/executive/businessMetricsService');

// Mock the user role hook
jest.mock('../../../hooks/role-based/useUserRole', () => ({
  useUserRole: jest.fn(() => ({
    role: 'executive',
    hasPermission: jest.fn().mockResolvedValue(true)
  }))
}));

describe('useBusinessMetrics Hook - Phase 4.3', () => {
  let queryClient: QueryClient;

  // Create wrapper with QueryClient
  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
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
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('useBusinessMetrics', () => {
    it('should fetch business metrics with role-based filtering', async () => {
      const mockMetrics = {
        metrics: [
          { id: 'metric-1', category: 'inventory', value: 1250 },
          { id: 'metric-2', category: 'marketing', value: 0.85 }
        ],
        correlations: { 'inventory-marketing': 0.75 },
        summary: {
          total_metrics: 2,
          categories_included: ['inventory', 'marketing']
        }
      };

      (BusinessMetricsService.aggregateBusinessMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      const { result } = renderHook(
        () => useBusinessMetrics({
          categories: ['inventory', 'marketing'],
          aggregationLevel: 'monthly',
          dateRange: '2024-01-01,2024-01-31'
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMetrics);
      expect(BusinessMetricsService.aggregateBusinessMetrics).toHaveBeenCalledWith(
        ['inventory', 'marketing'],
        'monthly',
        '2024-01-01',
        '2024-01-31',
        expect.any(Object)
      );
    });

    it('should handle real-time updates for metrics data', async () => {
      const mockInitialMetrics = {
        metrics: [{ id: 'metric-1', value: 100 }],
        summary: { total_metrics: 1 }
      };

      const mockUpdatedMetrics = {
        metrics: [{ id: 'metric-1', value: 150 }],
        summary: { total_metrics: 1 }
      };

      (BusinessMetricsService.aggregateBusinessMetrics as jest.Mock)
        .mockResolvedValueOnce(mockInitialMetrics)
        .mockResolvedValueOnce(mockUpdatedMetrics);

      const { result, rerender } = renderHook(
        () => useBusinessMetrics({ realTimeEnabled: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockInitialMetrics);
      });

      // Simulate real-time update
      queryClient.invalidateQueries({ queryKey: ['businessMetrics'] });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockUpdatedMetrics);
      });

      expect(BusinessMetricsService.aggregateBusinessMetrics).toHaveBeenCalledTimes(2);
    });

    it('should apply role-based access control for metrics', async () => {
      const { result } = renderHook(
        () => useBusinessMetrics({
          categories: ['executive_only'],
          requiresPermission: 'analytics_read'
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      expect(BusinessMetricsService.aggregateBusinessMetrics).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ user_role: 'executive' })
      );
    });

    it('should handle error states gracefully', async () => {
      const mockError = new Error('Failed to fetch metrics');
      (BusinessMetricsService.aggregateBusinessMetrics as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(
        () => useBusinessMetrics({}),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should support pagination for large metric datasets', async () => {
      const mockPaginatedData = {
        metrics: Array.from({ length: 10 }, (_, i) => ({ id: `metric-${i}`, value: i * 100 })),
        totalCount: 100,
        pageInfo: { hasNextPage: true, endCursor: 'cursor-10' }
      };

      (BusinessMetricsService.aggregateBusinessMetrics as jest.Mock).mockResolvedValue(mockPaginatedData);

      const { result } = renderHook(
        () => useBusinessMetrics({
          pagination: { limit: 10, offset: 0 }
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockPaginatedData);
      });

      expect(result.current.hasNextPage).toBe(true);
      expect(result.current.fetchNextPage).toBeDefined();
    });
  });

  describe('useMetricTrends', () => {
    it('should fetch metric trends with time series data', async () => {
      const mockTrendData = {
        trends: [
          { date: '2024-01-01', value: 100, trend: 'increasing' },
          { date: '2024-01-02', value: 110, trend: 'increasing' },
          { date: '2024-01-03', value: 105, trend: 'stable' }
        ],
        analysis: {
          overallTrend: 'increasing',
          volatility: 'low',
          forecastAccuracy: 0.85
        }
      };

      (BusinessMetricsService.getMetricTrends as jest.Mock).mockResolvedValue(mockTrendData);

      const { result } = renderHook(
        () => useMetricTrends({
          metricName: 'inventory_turnover',
          period: '7d',
          includeForecasting: true
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTrendData);
      expect(result.current.data?.analysis.overallTrend).toBe('increasing');
    });

    it('should support trend comparison across multiple metrics', async () => {
      const mockComparisonData = {
        comparison: {
          metric1: { trend: 'increasing', average: 100 },
          metric2: { trend: 'decreasing', average: 80 },
          correlation: 0.65
        }
      };

      (BusinessMetricsService.compareMetricTrends as jest.Mock).mockResolvedValue(mockComparisonData);

      const { result } = renderHook(
        () => useMetricTrends({
          compareMetrics: ['inventory_turnover', 'marketing_roi'],
          period: '30d'
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockComparisonData);
      });

      expect(result.current.data?.comparison.correlation).toBe(0.65);
    });

    it('should handle trend anomaly detection', async () => {
      const mockAnomalyData = {
        trends: [{ date: '2024-01-15', value: 500, anomaly: true }],
        anomaliesDetected: 1,
        alertThreshold: 'exceeded'
      };

      (BusinessMetricsService.getMetricTrends as jest.Mock).mockResolvedValue(mockAnomalyData);

      const { result } = renderHook(
        () => useMetricTrends({
          metricName: 'sales_volume',
          detectAnomalies: true,
          anomalyThreshold: 3.0
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data?.anomaliesDetected).toBe(1);
      });

      expect(result.current.shouldAlert).toBe(true);
    });
  });

  describe('useCrossRoleAnalytics', () => {
    it('should aggregate cross-role analytics data', async () => {
      const mockCrossRoleData = {
        inventoryMetrics: { turnover: 2.5, stockLevel: 1250 },
        marketingMetrics: { roi: 3.2, conversionRate: 0.15 },
        correlations: {
          'inventory-marketing': 0.75,
          'marketing-sales': 0.82
        },
        insights: ['Strong correlation between inventory and marketing performance']
      };

      (BusinessMetricsService.generateCorrelationAnalysis as jest.Mock).mockResolvedValue(mockCrossRoleData);

      const { result } = renderHook(
        () => useCrossRoleAnalytics({
          includedRoles: ['inventory', 'marketing'],
          correlationAnalysis: true
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCrossRoleData);
      expect(result.current.data?.correlations['inventory-marketing']).toBe(0.75);
    });

    it('should provide role-specific analytics views', async () => {
      const mockRoleSpecificData = {
        inventoryMetrics: { available: true, data: { turnover: 2.5 } },
        marketingMetrics: { available: false, reason: 'insufficient_permissions' },
        executiveMetrics: { available: true, data: { overview: 'all_metrics' } }
      };

      (BusinessMetricsService.getRoleSpecificAnalytics as jest.Mock).mockResolvedValue(mockRoleSpecificData);

      const { result } = renderHook(
        () => useCrossRoleAnalytics({
          userRole: 'inventory_staff',
          filterByPermissions: true
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data?.inventoryMetrics.available).toBe(true);
        expect(result.current.data?.marketingMetrics.available).toBe(false);
      });
    });

    it('should support real-time correlation updates', async () => {
      const mockInitialCorrelation = { correlation: 0.70 };
      const mockUpdatedCorrelation = { correlation: 0.78 };

      (BusinessMetricsService.generateCorrelationAnalysis as jest.Mock)
        .mockResolvedValueOnce(mockInitialCorrelation)
        .mockResolvedValueOnce(mockUpdatedCorrelation);

      const { result } = renderHook(
        () => useCrossRoleAnalytics({
          realTimeCorrelation: true,
          updateInterval: 5000
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data?.correlation).toBe(0.70);
      });

      // Simulate interval update
      queryClient.invalidateQueries({ queryKey: ['crossRoleAnalytics'] });

      await waitFor(() => {
        expect(result.current.data?.correlation).toBe(0.78);
      });
    });
  });

  describe('useUpdateMetrics mutation', () => {
    it('should update metrics with optimistic updates', async () => {
      const mockUpdatedMetric = { id: 'metric-1', value: 200 };
      (BusinessMetricsService.updateMetricValues as jest.Mock).mockResolvedValue(mockUpdatedMetric);

      const { result } = renderHook(
        () => useBusinessMetrics({}),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.updateMetric).toBeDefined();
      });

      const updateResult = await result.current.updateMetric({
        metricId: 'metric-1',
        updates: { metric_value: 200 }
      });

      expect(updateResult).toEqual(mockUpdatedMetric);
      expect(BusinessMetricsService.updateMetricValues).toHaveBeenCalledWith(
        'metric-1',
        { metric_value: 200 }
      );
    });

    it('should handle update failures with rollback', async () => {
      const mockError = new Error('Update failed');
      (BusinessMetricsService.updateMetricValues as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(
        () => useBusinessMetrics({}),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.updateMetric).toBeDefined();
      });

      await expect(result.current.updateMetric({
        metricId: 'metric-1',
        updates: { metric_value: -100 }
      })).rejects.toThrow('Update failed');

      // Verify optimistic update was rolled back
      expect(result.current.data).not.toContainEqual(
        expect.objectContaining({ metric_value: -100 })
      );
    });
  });

  describe('Query Key Factory Integration', () => {
    it('should use centralized query key factory for metrics', async () => {
      const { result } = renderHook(
        () => useBusinessMetrics({}),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.queryKey).toEqual(['executive', 'businessMetrics']);
      });
    });

    it('should extend query keys with filters and parameters', async () => {
      const { result } = renderHook(
        () => useBusinessMetrics({
          categories: ['inventory'],
          dateRange: '2024-01-01,2024-01-31'
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.queryKey).toEqual([
          'executive',
          'businessMetrics',
          { categories: ['inventory'], dateRange: '2024-01-01,2024-01-31' }
        ]);
      });
    });
  });

  describe('Cache Management', () => {
    it('should implement smart cache invalidation for metrics', async () => {
      const { result } = renderHook(
        () => useBusinessMetrics({}),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.invalidateMetrics).toBeDefined();
      });

      await result.current.invalidateMetrics(['inventory', 'marketing']);

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['executive', 'businessMetrics'],
        exact: false
      });
    });

    it('should support selective cache updates', async () => {
      const { result } = renderHook(
        () => useBusinessMetrics({}),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.updateCache).toBeDefined();
      });

      result.current.updateCache('metric-1', { value: 300 });

      const cachedData = queryClient.getQueryData(['executive', 'businessMetrics']);
      expect(cachedData).toContainEqual(
        expect.objectContaining({ id: 'metric-1', value: 300 })
      );
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should implement exponential backoff for failed requests', async () => {
      let attemptCount = 0;
      (BusinessMetricsService.aggregateBusinessMetrics as jest.Mock).mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ metrics: [] });
      });

      const { result } = renderHook(
        () => useBusinessMetrics({ retryEnabled: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      }, { timeout: 5000 });

      expect(attemptCount).toBe(3);
    });

    it('should provide user-friendly error messages', async () => {
      (BusinessMetricsService.aggregateBusinessMetrics as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const { result } = renderHook(
        () => useBusinessMetrics({}),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.errorMessage).toBe('Unable to load business metrics. Please try again.');
      expect(result.current.errorCode).toBe('METRICS_LOAD_FAILED');
    });
  });

  describe('Performance Optimization', () => {
    it('should debounce rapid metric updates', async () => {
      const { result } = renderHook(
        () => useBusinessMetrics({ debounceMs: 500 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.updateMetric).toBeDefined();
      });

      // Rapid updates
      result.current.updateMetric({ metricId: '1', updates: { value: 100 } });
      result.current.updateMetric({ metricId: '1', updates: { value: 200 } });
      result.current.updateMetric({ metricId: '1', updates: { value: 300 } });

      await waitFor(() => {
        expect(BusinessMetricsService.updateMetricValues).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });

      expect(BusinessMetricsService.updateMetricValues).toHaveBeenCalledWith('1', { value: 300 });
    });

    it('should use stale-while-revalidate strategy', async () => {
      const mockStaleData = { metrics: [{ id: '1', value: 100 }] };
      const mockFreshData = { metrics: [{ id: '1', value: 150 }] };

      (BusinessMetricsService.aggregateBusinessMetrics as jest.Mock)
        .mockResolvedValueOnce(mockStaleData)
        .mockResolvedValueOnce(mockFreshData);

      const { result } = renderHook(
        () => useBusinessMetrics({ staleTime: 60000 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockStaleData);
        expect(result.current.isStale).toBe(false);
      });

      // After stale time
      await waitFor(() => {
        expect(result.current.data).toEqual(mockFreshData);
      });
    });
  });
});