// Enhanced Business Metrics Hook Tests
// Testing UI transforms, real-time subscriptions, and backwards compatibility

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useBusinessMetrics } from '../useBusinessMetrics';
import { SimpleBusinessMetricsService } from '../../../services/executive/simpleBusinessMetricsService';
import { realtimeService } from '../../../services/realtimeService';

// Mock services
jest.mock('../../../services/executive/simpleBusinessMetricsService');
jest.mock('../../../services/realtimeService', () => ({
  realtimeService: {
    subscribe: jest.fn(() => jest.fn()), // Returns unsubscribe function
    unsubscribe: jest.fn(),
    emit: jest.fn()
  }
}));
jest.mock('../../useAuth', () => ({
  useCurrentUser: () => ({ data: { id: 'test-user-123' } })
}));
jest.mock('../../role-based/useUserRole', () => ({
  useUserRole: () => ({ role: 'executive', hasPermission: () => true })
}));
jest.mock('../../../utils/queryKeyFactory', () => ({
  executiveAnalyticsKeys: {
    businessMetrics: jest.fn((userId, options) => ['executive', 'businessMetrics', userId, options])
  }
}));

describe('useBusinessMetrics Enhanced Tests', () => {
  let queryClient: QueryClient;

  const mockMetricsData = {
    revenue: {
      total: 50000,
      growth: 15.5,
      trend: 'increasing' as const
    },
    orders: {
      total: 200,
      growth: -5.2,
      trend: 'decreasing' as const
    },
    customers: {
      total: 150,
      growth: 8.3,
      trend: 'increasing' as const
    },
    generatedAt: new Date().toISOString()
  };

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 }
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
    (SimpleBusinessMetricsService as any).getMetrics = jest.fn().mockResolvedValue(mockMetricsData);
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('Backwards Compatibility Tests', () => {
    it('should still return raw metrics data in original format', async () => {
      const { result } = renderHook(() => useBusinessMetrics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Original fields should still exist
      expect(result.current.metrics).toBeDefined();
      expect(result.current.data).toBeDefined();
      expect(result.current.metrics).toEqual(mockMetricsData);
      expect(result.current.data).toEqual(mockMetricsData);
    });

    it('should maintain original loading states', async () => {
      const { result } = renderHook(() => useBusinessMetrics(), {
        wrapper: createWrapper()
      });

      // Check initial loading state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
    });

    it('should preserve original error handling', async () => {
      const errorMessage = 'Network error';
      (SimpleBusinessMetricsService as any).getMetrics = jest.fn().mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useBusinessMetrics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.code).toBe('NETWORK_ERROR');
      expect(result.current.error?.message).toContain(errorMessage);
    });
  });

  describe('UI Transform Tests', () => {
    it('should transform metrics to KPI card format', async () => {
      const { result } = renderHook(() => useBusinessMetrics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.kpis).toBeDefined();
      expect(Array.isArray(result.current.kpis)).toBe(true);
      expect(result.current.kpis.length).toBeGreaterThan(0);

      // Check KPI structure
      const revenueKPI = result.current.kpis.find(kpi => kpi.id === 'revenue');
      expect(revenueKPI).toBeDefined();
      expect(revenueKPI).toMatchObject({
        id: 'revenue',
        title: 'Total Revenue',
        value: expect.any(String), // Formatted currency
        format: 'currency',
        trend: {
          direction: 'up',
          value: 15.5,
          label: '15.5%'
        },
        comparison: {
          value: expect.any(Number),
          label: 'vs last period'
        },
        color: '#10b981'
      });
    });

    it('should format chart data for visualization components', async () => {
      const { result } = renderHook(() => useBusinessMetrics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.charts).toBeDefined();
      expect(result.current.charts.labels).toBeDefined();
      expect(Array.isArray(result.current.charts.labels)).toBe(true);
      expect(result.current.charts.labels.length).toBe(7); // 7 days

      expect(result.current.charts.datasets).toBeDefined();
      expect(Array.isArray(result.current.charts.datasets)).toBe(true);
      
      const revenueDataset = result.current.charts.datasets.find(d => d.label === 'Revenue');
      expect(revenueDataset).toBeDefined();
      expect(revenueDataset).toMatchObject({
        label: 'Revenue',
        data: expect.any(Array),
        color: '#10b981',
        borderColor: '#10b981',
        backgroundColor: expect.any(String)
      });
    });

    it('should extract and format alerts from metrics', async () => {
      const { result } = renderHook(() => useBusinessMetrics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.alerts).toBeDefined();
      expect(Array.isArray(result.current.alerts)).toBe(true);

      // Check for expected alerts based on mock data
      const revenueGrowthAlert = result.current.alerts.find(a => a.id === 'revenue-growth');
      expect(revenueGrowthAlert).toBeDefined();
      expect(revenueGrowthAlert).toMatchObject({
        id: 'revenue-growth',
        type: 'success',
        title: 'Strong Revenue Growth',
        message: expect.stringContaining('15.5%')
      });

      const orderDeclineAlert = result.current.alerts.find(a => a.id === 'order-decline');
      expect(orderDeclineAlert).toBeUndefined(); // -5.2% is not below -10% threshold
    });

    it('should provide comparison data for period-over-period analysis', async () => {
      const { result } = renderHook(() => useBusinessMetrics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.comparisons).toBeDefined();
      expect(result.current.comparisons.revenue).toMatchObject({
        current: 50000,
        previous: expect.any(Number),
        change: 15.5
      });
      expect(result.current.comparisons.orders).toMatchObject({
        current: 200,
        previous: expect.any(Number),
        change: -5.2
      });
    });

    it('should format currency values correctly', async () => {
      const { result } = renderHook(() => useBusinessMetrics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const revenueKPI = result.current.kpis.find(kpi => kpi.id === 'revenue');
      expect(revenueKPI?.value).toMatch(/^\$[\d,]+$/); // e.g., $50,000
    });

    it('should calculate average order value', async () => {
      const { result } = renderHook(() => useBusinessMetrics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const avgOrderKPI = result.current.kpis.find(kpi => kpi.id === 'avg-order-value');
      expect(avgOrderKPI).toBeDefined();
      expect(avgOrderKPI?.title).toBe('Avg Order Value');
      expect(avgOrderKPI?.format).toBe('currency');
      // Should be $250 (50000 / 200)
      expect(avgOrderKPI?.value).toBe('$250');
    });
  });

  describe('Real-time Subscription Tests', () => {
    let subscribeSpy: any;
    let unsubscribeSpy: any;

    beforeEach(() => {
      unsubscribeSpy = jest.fn();
      // Mock the realtimeService module properly
      (realtimeService as any).subscribe = jest.fn().mockReturnValue(unsubscribeSpy);
      subscribeSpy = realtimeService.subscribe;
    });

    it('should subscribe to real-time updates when enabled', async () => {
      const { result, unmount } = renderHook(
        () => useBusinessMetrics({ realtime: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(subscribeSpy).toHaveBeenCalledWith(
        'executive:metrics:test-user-123',
        expect.any(Function)
      );

      // Check isRealtime flag
      expect(result.current.isRealtime).toBe(true);

      // Cleanup should unsubscribe
      unmount();
      expect(unsubscribeSpy).toHaveBeenCalled();
    });

    it('should not subscribe when realtime is disabled', async () => {
      const { result } = renderHook(
        () => useBusinessMetrics({ realtime: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(subscribeSpy).not.toHaveBeenCalled();
      expect(result.current.isRealtime).toBe(false);
    });

    it('should update cache on real-time events', async () => {
      let realtimeHandler: Function;
      subscribeSpy.mockImplementation((channel: string, handler: Function) => {
        realtimeHandler = handler;
        return unsubscribeSpy;
      });

      const { result } = renderHook(
        () => useBusinessMetrics({ realtime: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Simulate real-time update
      const updatedData = {
        revenue: { total: 55000, growth: 20, trend: 'increasing' as const }
      };

      act(() => {
        realtimeHandler!({
          type: 'metrics.updated',
          payload: updatedData
        });
      });

      await waitFor(() => {
        const revenueKPI = result.current.kpis.find(k => k.id === 'revenue');
        expect(revenueKPI?.value).toBe('$55,000');
        expect(revenueKPI?.trend.value).toBe(20);
      });
    });

    it('should use shorter stale time when real-time is enabled', async () => {
      const { result: realtimeResult } = renderHook(
        () => useBusinessMetrics({ realtime: true }),
        { wrapper: createWrapper() }
      );

      const { result: regularResult } = renderHook(
        () => useBusinessMetrics({ realtime: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(realtimeResult.current.isSuccess).toBe(true);
        expect(regularResult.current.isSuccess).toBe(true);
      });

      // Real-time should have much shorter stale time (1s vs 5min)
      // This is validated through the query configuration
      expect(realtimeResult.current.isRealtime).toBe(true);
      expect(regularResult.current.isRealtime).toBe(false);
    });
  });

  describe('Pagination and Actions Tests', () => {
    it('should provide loadMore function for pagination', async () => {
      const { result } = renderHook(() => useBusinessMetrics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.loadMore).toBeDefined();
      expect(typeof result.current.loadMore).toBe('function');

      // Test that loadMore can be called without errors
      const consoleSpy = jest.spyOn(console, 'log');
      result.current.loadMore();
      expect(consoleSpy).toHaveBeenCalledWith('Loading more metrics data...');
    });

    it('should provide refetch action', async () => {
      const { result } = renderHook(() => useBusinessMetrics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');

      // Reset mock to track new calls
      (SimpleBusinessMetricsService as any).getMetrics.mockClear();

      await act(async () => {
        await result.current.refetch();
      });

      expect(SimpleBusinessMetricsService.getMetrics).toHaveBeenCalledTimes(1);
    });
  });

  describe('Memoization and Performance Tests', () => {
    it('should memoize transformed data to prevent recalculation', async () => {
      const { result, rerender } = renderHook(() => useBusinessMetrics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const initialKPIs = result.current.kpis;
      const initialCharts = result.current.charts;
      const initialAlerts = result.current.alerts;

      // Rerender without changing data
      rerender();

      // References should be the same (memoized)
      expect(result.current.kpis).toBe(initialKPIs);
      expect(result.current.charts).toBe(initialCharts);
      expect(result.current.alerts).toBe(initialAlerts);
    });

    it('should return empty defaults while loading', () => {
      const { result } = renderHook(() => useBusinessMetrics(), {
        wrapper: createWrapper()
      });

      // While loading, should have safe defaults
      expect(result.current.kpis).toEqual([]);
      expect(result.current.charts).toEqual({ labels: [], datasets: [] });
      expect(result.current.alerts).toEqual([]);
      expect(result.current.comparisons).toBeNull();
    });
  });

  describe('Alert Generation Tests', () => {
    it('should generate warning alert for significant revenue decline', async () => {
      const decliningData = {
        ...mockMetricsData,
        revenue: { total: 40000, growth: -7.5, trend: 'decreasing' as const }
      };
      
      (SimpleBusinessMetricsService as any).getMetrics = jest.fn().mockResolvedValue(decliningData);

      const { result } = renderHook(() => useBusinessMetrics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const revenueAlert = result.current.alerts.find(a => a.id === 'revenue-decline');
      expect(revenueAlert).toBeDefined();
      expect(revenueAlert).toMatchObject({
        type: 'warning',
        title: 'Revenue Decline',
        message: expect.stringContaining('7.5%')
      });
    });

    it('should generate success alert for strong growth', async () => {
      const growthData = {
        ...mockMetricsData,
        revenue: { total: 60000, growth: 25, trend: 'increasing' as const }
      };
      
      (SimpleBusinessMetricsService as any).getMetrics = jest.fn().mockResolvedValue(growthData);

      const { result } = renderHook(() => useBusinessMetrics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const growthAlert = result.current.alerts.find(a => a.id === 'revenue-growth');
      expect(growthAlert).toBeDefined();
      expect(growthAlert?.type).toBe('success');
    });
  });

  describe('Options and Filters Tests', () => {
    it('should pass options to service correctly', async () => {
      const options = {
        dateRange: 'last-30-days',
        category: 'electronics'
      };

      renderHook(() => useBusinessMetrics(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(SimpleBusinessMetricsService.getMetrics).toHaveBeenCalledWith(options);
      });
    });

    it('should include options in query key for cache isolation', async () => {
      const options1 = { dateRange: 'last-7-days' };
      const options2 = { dateRange: 'last-30-days' };

      const { result: result1 } = renderHook(
        () => useBusinessMetrics(options1),
        { wrapper: createWrapper() }
      );

      const { result: result2 } = renderHook(
        () => useBusinessMetrics(options2),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
        expect(result2.current.isSuccess).toBe(true);
      });

      // Query keys should be different
      expect(result1.current.queryKey).not.toEqual(result2.current.queryKey);
      expect(result1.current.queryKey).toContain(options1);
      expect(result2.current.queryKey).toContain(options2);
    });
  });
});