/**
 * Analytics Hooks Integration Tests
 * Following @docs/architectural-patterns-and-best-practices.md testing patterns
 * Pattern: Hook testing with ValidationMonitor integration verification
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOrderConversionFunnel, useOrderConversionMetrics } from '../../hooks/analytics/useOrderConversionFunnel';
import { useHistoricalOrderAnalysis, useOrderTrends } from '../../hooks/analytics/useHistoricalOrderAnalysis';
import { ValidationMonitor } from '../../utils/validationMonitor';

// Mock ValidationMonitor
jest.mock('../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordPatternSuccess: jest.fn(),
    recordValidationError: jest.fn()
  }
}));

// Mock auth hook
jest.mock('../../hooks/useAuth', () => ({
  useCurrentUser: () => ({
    data: { id: 'test-user-id', email: 'test@example.com' }
  })
}));

// Mock analytics services
jest.mock('../../services/analytics/orderConversionFunnel.service', () => ({
  OrderConversionFunnelService: {
    analyzeConversionFunnel: jest.fn()
  }
}));

jest.mock('../../services/analytics/historicalOrderAnalysis.service', () => ({
  HistoricalOrderAnalysisService: {
    analyzeHistoricalPatterns: jest.fn()
  }
}));

const mockValidationMonitor = ValidationMonitor as jest.Mocked<typeof ValidationMonitor>;

// Test wrapper component
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Analytics Hooks Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useOrderConversionFunnel Hook', () => {
    it('should record success metrics when funnel analysis completes', async () => {
      // Setup
      const mockFunnelData = {
        orders: [],
        metrics: {
          totalOrders: 100,
          completionRate: 0.75,
          averageTimeToCompletion: 24,
          stageConversionRates: {
            cart_created: { orderCount: 100, conversionRate: 1.0, dropoffRate: 0, averageTimeInStage: 0 },
            checkout_started: { orderCount: 80, conversionRate: 0.8, dropoffRate: 0.2, averageTimeInStage: 2 },
            payment_processed: { orderCount: 75, conversionRate: 0.9375, dropoffRate: 0.0625, averageTimeInStage: 1 },
            order_completed: { orderCount: 75, conversionRate: 1.0, dropoffRate: 0, averageTimeInStage: 1 }
          },
          bottlenecks: [],
          customerSegmentAnalysis: {}
        },
        insights: {
          criticalBottlenecks: [],
          optimizationOpportunities: [],
          customerBehaviorPatterns: []
        }
      };

      const { OrderConversionFunnelService } = require('../../services/analytics/orderConversionFunnel.service');
      OrderConversionFunnelService.analyzeConversionFunnel.mockResolvedValue(mockFunnelData);

      // Execute
      const { result } = renderHook(
        () => useOrderConversionFunnel({
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31')
          }
        }),
        { wrapper: createWrapper() }
      );

      // Wait for query to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify data
      expect(result.current.data).toEqual(mockFunnelData);
      expect(result.current.completionRate).toBe(0.75);
      expect(result.current.totalOrders).toBe(100);

      // Verify ValidationMonitor was called
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'useOrderConversionFunnel',
        pattern: 'direct_supabase_query',
        operation: 'analyzeConversionFunnel',
        performanceMs: expect.any(Number)
      });
    });

    it('should record validation errors when funnel analysis fails', async () => {
      // Setup
      const mockError = new Error('Database connection failed');
      const { OrderConversionFunnelService } = require('../../services/analytics/orderConversionFunnel.service');
      OrderConversionFunnelService.analyzeConversionFunnel.mockRejectedValue(mockError);

      // Execute
      const { result } = renderHook(
        () => useOrderConversionFunnel({
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31')
          }
        }),
        { wrapper: createWrapper() }
      );

      // Wait for query to complete with error
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Verify error state
      expect(result.current.error).toEqual(mockError);

      // Verify ValidationMonitor recorded the error
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'useOrderConversionFunnel.queryFn',
        errorCode: 'CONVERSION_FUNNEL_QUERY_FAILED',
        validationPattern: 'direct_supabase_query',
        errorMessage: 'Database connection failed'
      });
    });

    it('should provide convenience properties for easy access', async () => {
      // Setup
      const mockFunnelData = {
        orders: [],
        metrics: {
          totalOrders: 150,
          completionRate: 0.85,
          averageTimeToCompletion: 18,
          stageConversionRates: {},
          bottlenecks: [
            { stage: 'payment_processing', dropoffRate: 0.15, severity: 'high' }
          ],
          customerSegmentAnalysis: {}
        },
        insights: {
          criticalBottlenecks: ['Payment processing stage needs optimization'],
          optimizationOpportunities: [],
          customerBehaviorPatterns: []
        }
      };

      const { OrderConversionFunnelService } = require('../../services/analytics/orderConversionFunnel.service');
      OrderConversionFunnelService.analyzeConversionFunnel.mockResolvedValue(mockFunnelData);

      // Execute
      const { result } = renderHook(
        () => useOrderConversionFunnel(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify convenience properties
      expect(result.current.completionRate).toBe(0.85);
      expect(result.current.totalOrders).toBe(150);
      expect(result.current.averageTimeToCompletion).toBe(18);
      expect(result.current.hasBottlenecks).toBe(true);
      expect(result.current.topBottleneck).toBe('payment_processing');
    });
  });

  describe('useOrderConversionMetrics Hook', () => {
    it('should record success metrics for lightweight metrics query', async () => {
      // Setup
      const mockMetrics = {
        totalOrders: 200,
        completionRate: 0.80,
        averageTimeToCompletion: 20,
        stageConversionRates: {},
        bottlenecks: [
          { stage: 'checkout', dropoffRate: 0.12, severity: 'medium' },
          { stage: 'payment', dropoffRate: 0.08, severity: 'low' }
        ],
        customerSegmentAnalysis: {}
      };

      const mockFunnelData = { metrics: mockMetrics };
      const { OrderConversionFunnelService } = require('../../services/analytics/orderConversionFunnel.service');
      OrderConversionFunnelService.analyzeConversionFunnel.mockResolvedValue(mockFunnelData);

      // Execute
      const { result } = renderHook(
        () => useOrderConversionMetrics({
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31')
          }
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify metrics data
      expect(result.current.data).toEqual(mockMetrics);
      expect(result.current.completionRate).toBe(0.80);
      expect(result.current.totalOrders).toBe(200);
      expect(result.current.criticalBottleneckCount).toBe(0); // No critical bottlenecks (>25% dropoff)
    });
  });

  describe('useHistoricalOrderAnalysis Hook', () => {
    it('should record success metrics for historical pattern analysis', async () => {
      // Setup
      const mockHistoricalData = {
        historicalData: [
          { date: '2024-01-01', orders: 50, revenue: 2500 },
          { date: '2024-01-02', orders: 55, revenue: 2750 },
          { date: '2024-01-03', orders: 60, revenue: 3000 }
        ],
        trends: {
          orders: { direction: 'increasing', confidence: 0.85, slope: 2.5 },
          revenue: { direction: 'increasing', confidence: 0.90, slope: 125 },
          customers: { direction: 'stable', confidence: 0.70, slope: 0.1 }
        },
        seasonalPatterns: {
          weekly: { strength: 0.6, pattern: [] },
          monthly: { strength: 0.4, pattern: [] },
          daily: { strength: 0.3, pattern: [] }
        },
        predictions: {
          nextWeek: [{ metric: 'orders', value: 420, confidence: 0.8, factors: [] }],
          nextMonth: [{ metric: 'revenue', value: 18500, confidence: 0.75, factors: [] }],
          nextQuarter: []
        },
        insights: {
          keyTrends: ['Orders trending upward with high confidence'],
          anomalies: []
        }
      };

      const { HistoricalOrderAnalysisService } = require('../../services/analytics/historicalOrderAnalysis.service');
      HistoricalOrderAnalysisService.analyzeHistoricalPatterns.mockResolvedValue(mockHistoricalData);

      // Execute
      const { result } = renderHook(
        () => useHistoricalOrderAnalysis({
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31')
          },
          granularity: 'day',
          includePredictions: true
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify data
      expect(result.current.data).toEqual(mockHistoricalData);
      expect(result.current.isGrowing).toBe(true); // Orders and revenue both increasing
      expect(result.current.primaryTrend).toBe('Orders trending increasing');
      expect(result.current.nextWeekPrediction).toBe(420);
      expect(result.current.confidence).toBeGreaterThan(0.8);

      // Verify ValidationMonitor was called
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'useHistoricalOrderAnalysis',
        pattern: 'statistical_calculation',
        operation: 'analyzeHistoricalPatterns',
        performanceMs: expect.any(Number)
      });
    });

    it('should record validation errors for insufficient historical data', async () => {
      // Setup
      const mockError = new Error('Insufficient data for historical analysis');
      const { HistoricalOrderAnalysisService } = require('../../services/analytics/historicalOrderAnalysis.service');
      HistoricalOrderAnalysisService.analyzeHistoricalPatterns.mockRejectedValue(mockError);

      // Execute
      const { result } = renderHook(
        () => useHistoricalOrderAnalysis({
          dateRange: {
            start: new Date('2024-01-30'),
            end: new Date('2024-01-31')
          }
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Verify error recording
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'useHistoricalOrderAnalysis.queryFn',
        errorCode: 'HISTORICAL_ANALYSIS_QUERY_FAILED',
        validationPattern: 'statistical_calculation',
        errorMessage: 'Insufficient data for historical analysis'
      });
    });
  });

  describe('useOrderTrends Hook', () => {
    it('should provide simplified trend information with health indicators', async () => {
      // Setup
      const mockHistoricalData = {
        trends: {
          orders: { direction: 'increasing', confidence: 0.85 },
          revenue: { direction: 'increasing', confidence: 0.90 },
          customers: { direction: 'stable', confidence: 0.70 }
        }
      };

      const { HistoricalOrderAnalysisService } = require('../../services/analytics/historicalOrderAnalysis.service');
      HistoricalOrderAnalysisService.analyzeHistoricalPatterns.mockResolvedValue(mockHistoricalData);

      // Execute
      const { result } = renderHook(
        () => useOrderTrends(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify trend indicators
      expect(result.current.ordersTrend).toBe('up');
      expect(result.current.revenueTrend).toBe('up');
      expect(result.current.overallHealth).toBe('excellent'); // Both orders and revenue increasing
    });

    it('should handle concerning trends appropriately', async () => {
      // Setup
      const mockHistoricalData = {
        trends: {
          orders: { direction: 'decreasing', confidence: 0.80 },
          revenue: { direction: 'stable', confidence: 0.75 }
        }
      };

      const { HistoricalOrderAnalysisService } = require('../../services/analytics/historicalOrderAnalysis.service');
      HistoricalOrderAnalysisService.analyzeHistoricalPatterns.mockResolvedValue(mockHistoricalData);

      // Execute
      const { result } = renderHook(
        () => useOrderTrends(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify concerning trend detection
      expect(result.current.ordersTrend).toBe('down');
      expect(result.current.revenueTrend).toBe('stable');
      expect(result.current.overallHealth).toBe('concerning'); // Orders declining
    });
  });

  describe('Hook Performance and Caching', () => {
    it('should respect stale time configurations for different data types', async () => {
      // Setup
      const mockFunnelData = { orders: [], metrics: { totalOrders: 100 }, insights: {} };
      const { OrderConversionFunnelService } = require('../../services/analytics/orderConversionFunnel.service');
      OrderConversionFunnelService.analyzeConversionFunnel.mockResolvedValue(mockFunnelData);

      // Execute first render
      const { result, rerender } = renderHook(
        () => useOrderConversionFunnel(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Clear mock calls
      OrderConversionFunnelService.analyzeConversionFunnel.mockClear();

      // Execute rerender immediately (should use cache)
      rerender();

      // Verify service wasn't called again (data is cached)
      expect(OrderConversionFunnelService.analyzeConversionFunnel).not.toHaveBeenCalled();
    });

    it('should track performance metrics in ValidationMonitor', async () => {
      // Setup - simulate slow query
      const mockHistoricalData = { historicalData: [], trends: {}, seasonalPatterns: {}, predictions: {}, insights: {} };
      const { HistoricalOrderAnalysisService } = require('../../services/analytics/historicalOrderAnalysis.service');

      HistoricalOrderAnalysisService.analyzeHistoricalPatterns.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockHistoricalData), 1000))
      );

      // Execute
      const { result } = renderHook(
        () => useHistoricalOrderAnalysis(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      }, { timeout: 2000 });

      // Verify performance was tracked
      const performanceCall = mockValidationMonitor.recordPatternSuccess.mock.calls.find(
        call => call[0].service === 'useHistoricalOrderAnalysis'
      );

      expect(performanceCall).toBeDefined();
      expect(performanceCall[0].performanceMs).toBeGreaterThan(900); // Should be around 1000ms
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should not retry on permission errors', async () => {
      // Setup
      const mockError = new Error('Insufficient permissions');
      const { OrderConversionFunnelService } = require('../../services/analytics/orderConversionFunnel.service');
      OrderConversionFunnelService.analyzeConversionFunnel.mockRejectedValue(mockError);

      // Execute
      const { result } = renderHook(
        () => useOrderConversionFunnel(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Verify service was called only once (no retries for permission errors)
      expect(OrderConversionFunnelService.analyzeConversionFunnel).toHaveBeenCalledTimes(1);
    });

    it('should retry on temporary errors with exponential backoff', async () => {
      // Setup
      const mockError = new Error('Temporary database error');
      const { HistoricalOrderAnalysisService } = require('../../services/analytics/historicalOrderAnalysis.service');

      // Fail twice, then succeed
      HistoricalOrderAnalysisService.analyzeHistoricalPatterns
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValue({ historicalData: [], trends: {}, seasonalPatterns: {}, predictions: {}, insights: {} });

      // Execute with custom QueryClient that allows retries
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
            cacheTime: 0,
          },
        },
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () => useHistoricalOrderAnalysis(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      }, { timeout: 10000 });

      // Verify service was called 3 times (original + 2 retries)
      expect(HistoricalOrderAnalysisService.analyzeHistoricalPatterns).toHaveBeenCalledTimes(3);
    });
  });
});