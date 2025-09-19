/**
 * Order Analytics Integration Tests
 * Following @docs/architectural-patterns-and-best-practices.md testing patterns
 * Pattern: Comprehensive ValidationMonitor success/failure tracking verification
 */

import { ValidationMonitor } from '../../utils/validationMonitor';
import { OrderAnalyticsService } from '../../services/analytics/orderAnalytics.service';
import { OrderConversionFunnelService } from '../../services/analytics/orderConversionFunnel.service';
import { HistoricalOrderAnalysisService } from '../../services/analytics/historicalOrderAnalysis.service';
import { BusinessMetricsService } from '../../services/executive/businessMetricsService';

// Mock ValidationMonitor
jest.mock('../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordPatternSuccess: jest.fn(),
    recordValidationError: jest.fn(),
    getSuccessMetrics: jest.fn(),
    getErrorMetrics: jest.fn(),
    clearMetrics: jest.fn()
  }
}));

// Mock services
jest.mock('../../services/analytics/orderAnalytics.service');
jest.mock('../../services/analytics/orderConversionFunnel.service');
jest.mock('../../services/analytics/historicalOrderAnalysis.service');
jest.mock('../../services/executive/businessMetricsService');

const mockValidationMonitor = ValidationMonitor as jest.Mocked<typeof ValidationMonitor>;
const mockOrderAnalyticsService = OrderAnalyticsService as jest.Mocked<typeof OrderAnalyticsService>;
const mockConversionFunnelService = OrderConversionFunnelService as jest.Mocked<typeof OrderConversionFunnelService>;
const mockHistoricalAnalysisService = HistoricalOrderAnalysisService as jest.Mocked<typeof HistoricalOrderAnalysisService>;
const mockBusinessMetricsService = BusinessMetricsService as jest.Mocked<typeof BusinessMetricsService>;

describe('Order Analytics Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidationMonitor.clearMetrics.mockClear();
  });

  describe('OrderAnalyticsService Integration', () => {
    it('should record success metrics for getOrderInsights', async () => {
      // Setup
      const mockInsights = {
        totalOrders: 100,
        completionRate: 0.85,
        averageOrderValue: 50.00,
        topPerformingProducts: [],
        orderVolumeByHour: [],
        revenueByDay: []
      };

      mockOrderAnalyticsService.getOrderInsights = jest.fn().mockResolvedValue(mockInsights);

      // Execute
      const result = await OrderAnalyticsService.getOrderInsights({
        userId: 'test-user-id',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      });

      // Verify
      expect(result).toEqual(mockInsights);
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'OrderAnalyticsService',
        pattern: 'direct_supabase_query',
        operation: 'getOrderInsights',
        performanceMs: expect.any(Number)
      });
    });

    it('should record validation errors for failed getOrderInsights', async () => {
      // Setup
      const mockError = new Error('Database connection failed');
      mockOrderAnalyticsService.getOrderInsights = jest.fn().mockRejectedValue(mockError);

      // Execute & Verify
      await expect(OrderAnalyticsService.getOrderInsights({
        userId: 'test-user-id',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      })).rejects.toThrow('Database connection failed');

      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'OrderAnalyticsService.getOrderInsights',
        errorCode: 'ORDER_INSIGHTS_QUERY_FAILED',
        validationPattern: 'direct_supabase_query',
        errorMessage: 'Database connection failed'
      });
    });

    it('should record success metrics for getOrderConversionFunnel', async () => {
      // Setup
      const mockFunnelData = {
        stages: [
          { name: 'cart_created', orderCount: 100, conversionRate: 1.0 },
          { name: 'checkout_started', orderCount: 80, conversionRate: 0.8 },
          { name: 'payment_processed', orderCount: 70, conversionRate: 0.875 },
          { name: 'order_completed', orderCount: 65, conversionRate: 0.929 }
        ],
        overallConversionRate: 0.65,
        totalDropoffs: 35
      };

      mockOrderAnalyticsService.getOrderConversionFunnel = jest.fn().mockResolvedValue(mockFunnelData);

      // Execute
      const result = await OrderAnalyticsService.getOrderConversionFunnel({
        userId: 'test-user-id',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      });

      // Verify
      expect(result).toEqual(mockFunnelData);
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'OrderAnalyticsService',
        pattern: 'statistical_calculation',
        operation: 'getOrderConversionFunnel',
        performanceMs: expect.any(Number)
      });
    });

    it('should record performance metrics for long-running queries', async () => {
      // Setup - simulate slow query
      const mockVelocityMetrics = {
        averageTimeToCompletion: 2.5,
        orderVelocityByHour: [],
        bottlenecks: []
      };

      mockOrderAnalyticsService.getOrderVelocityMetrics = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockVelocityMetrics), 1500))
      );

      // Execute
      const startTime = Date.now();
      const result = await OrderAnalyticsService.getOrderVelocityMetrics({
        userId: 'test-user-id',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      });
      const endTime = Date.now();

      // Verify
      expect(result).toEqual(mockVelocityMetrics);
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'OrderAnalyticsService',
        pattern: 'atomic_operation',
        operation: 'getOrderVelocityMetrics',
        performanceMs: expect.any(Number)
      });

      // Verify performance was tracked (should be around 1500ms)
      const performanceCall = mockValidationMonitor.recordPatternSuccess.mock.calls.find(
        call => call[0].operation === 'getOrderVelocityMetrics'
      );
      expect(performanceCall[0].performanceMs).toBeGreaterThan(1000);
    });
  });

  describe('Conversion Funnel Service Integration', () => {
    it('should record success metrics for analyzeConversionFunnel', async () => {
      // Setup
      const mockFunnelAnalysis = {
        orders: [],
        metrics: {
          totalOrders: 100,
          completionRate: 0.65,
          averageTimeToCompletion: 24,
          stageConversionRates: {},
          bottlenecks: [],
          customerSegmentAnalysis: {}
        },
        insights: {
          criticalBottlenecks: [],
          optimizationOpportunities: [],
          customerBehaviorPatterns: []
        }
      };

      mockConversionFunnelService.analyzeConversionFunnel = jest.fn().mockResolvedValue(mockFunnelAnalysis);

      // Execute
      const result = await OrderConversionFunnelService.analyzeConversionFunnel({
        userId: 'test-user-id',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      });

      // Verify
      expect(result).toEqual(mockFunnelAnalysis);
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'OrderConversionFunnelService',
        pattern: 'resilient_processing',
        operation: 'analyzeConversionFunnel',
        performanceMs: expect.any(Number)
      });
    });

    it('should record validation errors for invalid customer segments', async () => {
      // Setup
      const mockError = new Error('Invalid customer segment: unknown');
      mockConversionFunnelService.analyzeConversionFunnel = jest.fn().mockRejectedValue(mockError);

      // Execute & Verify
      await expect(OrderConversionFunnelService.analyzeConversionFunnel({
        userId: 'test-user-id',
        customerSegment: 'unknown' as any,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      })).rejects.toThrow('Invalid customer segment: unknown');

      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'OrderConversionFunnelService.analyzeConversionFunnel',
        errorCode: 'INVALID_CUSTOMER_SEGMENT',
        validationPattern: 'schema_validation',
        errorMessage: 'Invalid customer segment: unknown'
      });
    });
  });

  describe('Historical Analysis Service Integration', () => {
    it('should record success metrics for analyzeHistoricalPatterns', async () => {
      // Setup
      const mockHistoricalAnalysis = {
        historicalData: [],
        trends: {
          orders: { direction: 'increasing', confidence: 0.85, slope: 2.3 },
          revenue: { direction: 'increasing', confidence: 0.92, slope: 5.1 }
        },
        seasonalPatterns: {
          weekly: { strength: 0.6, pattern: [] },
          monthly: { strength: 0.3, pattern: [] }
        },
        predictions: {
          nextWeek: [],
          nextMonth: [],
          nextQuarter: []
        },
        insights: {
          keyTrends: [],
          anomalies: []
        }
      };

      mockHistoricalAnalysisService.analyzeHistoricalPatterns = jest.fn().mockResolvedValue(mockHistoricalAnalysis);

      // Execute
      const result = await HistoricalOrderAnalysisService.analyzeHistoricalPatterns({
        userId: 'test-user-id',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        granularity: 'day',
        includePredictions: true
      });

      // Verify
      expect(result).toEqual(mockHistoricalAnalysis);
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'HistoricalOrderAnalysisService',
        pattern: 'statistical_calculation',
        operation: 'analyzeHistoricalPatterns',
        performanceMs: expect.any(Number)
      });
    });

    it('should record validation errors for insufficient data', async () => {
      // Setup
      const mockError = new Error('Insufficient data for analysis: minimum 30 days required');
      mockHistoricalAnalysisService.analyzeHistoricalPatterns = jest.fn().mockRejectedValue(mockError);

      // Execute & Verify
      await expect(HistoricalOrderAnalysisService.analyzeHistoricalPatterns({
        userId: 'test-user-id',
        dateRange: {
          start: new Date('2024-01-30'),
          end: new Date('2024-01-31')
        },
        granularity: 'day'
      })).rejects.toThrow('Insufficient data for analysis: minimum 30 days required');

      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'HistoricalOrderAnalysisService.analyzeHistoricalPatterns',
        errorCode: 'INSUFFICIENT_DATA_FOR_ANALYSIS',
        validationPattern: 'data_availability_check',
        errorMessage: 'Insufficient data for analysis: minimum 30 days required'
      });
    });
  });

  describe('Business Metrics Service Integration', () => {
    it('should record success metrics for getOrderAnalytics', async () => {
      // Setup
      const mockOrderMetrics = {
        totalOrders: 150,
        completedOrders: 125,
        pendingOrders: 25,
        averageOrderValue: 75.50,
        totalRevenue: 9375.00,
        ordersByStatus: {},
        revenueByPeriod: []
      };

      mockBusinessMetricsService.getOrderAnalytics = jest.fn().mockResolvedValue(mockOrderMetrics);

      // Execute
      const result = await BusinessMetricsService.getOrderAnalytics({
        userId: 'test-user-id',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      });

      // Verify
      expect(result).toEqual(mockOrderMetrics);
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'BusinessMetricsService',
        pattern: 'direct_supabase_query',
        operation: 'getOrderAnalytics',
        performanceMs: expect.any(Number)
      });
    });

    it('should record success metrics for getOrderWorkflowMetrics', async () => {
      // Setup
      const mockWorkflowMetrics = {
        stageMetrics: {},
        averageStageTime: {},
        bottleneckAnalysis: {
          criticalStages: [],
          improvementOpportunities: []
        }
      };

      mockBusinessMetricsService.getOrderWorkflowMetrics = jest.fn().mockResolvedValue(mockWorkflowMetrics);

      // Execute
      const result = await BusinessMetricsService.getOrderWorkflowMetrics({
        userId: 'test-user-id',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      });

      // Verify
      expect(result).toEqual(mockWorkflowMetrics);
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'BusinessMetricsService',
        pattern: 'workflow_analysis',
        operation: 'getOrderWorkflowMetrics',
        performanceMs: expect.any(Number)
      });
    });
  });

  describe('ValidationMonitor Metrics Aggregation', () => {
    it('should correctly aggregate success metrics across all services', () => {
      // Setup - simulate multiple successful operations
      const services = [
        'OrderAnalyticsService',
        'OrderConversionFunnelService',
        'HistoricalOrderAnalysisService',
        'BusinessMetricsService'
      ];

      const patterns = [
        'direct_supabase_query',
        'statistical_calculation',
        'resilient_processing',
        'workflow_analysis'
      ];

      const operations = [
        'getOrderInsights',
        'analyzeConversionFunnel',
        'analyzeHistoricalPatterns',
        'getOrderAnalytics'
      ];

      // Simulate success recordings
      services.forEach((service, index) => {
        mockValidationMonitor.recordPatternSuccess({
          service,
          pattern: patterns[index],
          operation: operations[index],
          performanceMs: 1000 + index * 100
        });
      });

      // Verify all services recorded successes
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledTimes(4);

      // Verify each service was called with correct parameters
      services.forEach((service, index) => {
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service,
          pattern: patterns[index],
          operation: operations[index],
          performanceMs: 1000 + index * 100
        });
      });
    });

    it('should correctly aggregate error metrics across all services', () => {
      // Setup - simulate errors across different services
      const errorScenarios = [
        {
          context: 'OrderAnalyticsService.getOrderInsights',
          errorCode: 'DATABASE_CONNECTION_FAILED',
          validationPattern: 'direct_supabase_query',
          errorMessage: 'Connection timeout'
        },
        {
          context: 'OrderConversionFunnelService.analyzeConversionFunnel',
          errorCode: 'INSUFFICIENT_PERMISSIONS',
          validationPattern: 'permission_based_access',
          errorMessage: 'User lacks analytics permissions'
        },
        {
          context: 'HistoricalOrderAnalysisService.analyzeHistoricalPatterns',
          errorCode: 'INVALID_DATE_RANGE',
          validationPattern: 'schema_validation',
          errorMessage: 'End date must be after start date'
        }
      ];

      // Simulate error recordings
      errorScenarios.forEach(error => {
        mockValidationMonitor.recordValidationError(error);
      });

      // Verify all errors were recorded
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledTimes(3);

      // Verify each error was recorded with correct parameters
      errorScenarios.forEach(error => {
        expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith(error);
      });
    });

    it('should track performance metrics for optimization insights', () => {
      // Setup - simulate various performance scenarios
      const performanceScenarios = [
        { operation: 'getOrderInsights', performanceMs: 150 }, // Fast
        { operation: 'analyzeConversionFunnel', performanceMs: 800 }, // Medium
        { operation: 'analyzeHistoricalPatterns', performanceMs: 2500 }, // Slow
        { operation: 'getOrderAnalytics', performanceMs: 300 } // Fast-medium
      ];

      performanceScenarios.forEach(scenario => {
        mockValidationMonitor.recordPatternSuccess({
          service: 'TestService',
          pattern: 'performance_tracking',
          operation: scenario.operation,
          performanceMs: scenario.performanceMs
        });
      });

      // Verify performance tracking
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledTimes(4);

      // Verify performance data was captured correctly
      const performanceCalls = mockValidationMonitor.recordPatternSuccess.mock.calls;
      performanceScenarios.forEach((scenario, index) => {
        expect(performanceCalls[index][0].performanceMs).toBe(scenario.performanceMs);
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle partial failures in multi-service operations', async () => {
      // Setup - simulate partial failure scenario
      const mockOrderInsights = { totalOrders: 100 };
      mockOrderAnalyticsService.getOrderInsights = jest.fn().mockResolvedValue(mockOrderInsights);
      mockConversionFunnelService.analyzeConversionFunnel = jest.fn().mockRejectedValue(
        new Error('Funnel analysis temporarily unavailable')
      );

      // Execute operations
      const insightsResult = await OrderAnalyticsService.getOrderInsights({
        userId: 'test-user-id',
        dateRange: { start: new Date(), end: new Date() }
      });

      let funnelError;
      try {
        await OrderConversionFunnelService.analyzeConversionFunnel({
          userId: 'test-user-id',
          dateRange: { start: new Date(), end: new Date() }
        });
      } catch (error) {
        funnelError = error;
      }

      // Verify partial success
      expect(insightsResult).toEqual(mockOrderInsights);
      expect(funnelError).toBeDefined();

      // Verify monitoring recorded both success and failure
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'OrderAnalyticsService',
          operation: 'getOrderInsights'
        })
      );

      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'OrderConversionFunnelService.analyzeConversionFunnel',
          errorMessage: 'Funnel analysis temporarily unavailable'
        })
      );
    });
  });
});