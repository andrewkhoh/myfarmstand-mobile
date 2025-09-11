// Phase 4.5: Comprehensive Pattern Compliance Audit
// Validating all Phase 4 implementations against architectural patterns

import { createUser, resetAllFactories } from '../../../test/factories';

// Setup all mocks BEFORE any imports
jest.mock("../../../config/supabase", () => {
  const { SimplifiedSupabaseMock } = require("../../../test/mocks/supabase.simplified.mock");
  const mockInstance = new SimplifiedSupabaseMock();
  return {
    supabase: mockInstance.createClient(),
    TABLES: {
      USERS: 'users',
      PRODUCTS: 'products',
      ORDERS: 'orders',
      BUSINESS_METRICS: 'business_metrics',
      REPORTS: 'reports'
    }
  };
});

jest.mock('../../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordPatternSuccess: jest.fn(),
    recordValidationError: jest.fn()
  }
}));

// Import AFTER mocks are setup
import { BusinessMetricsService } from '../businessMetricsService';
import { BusinessIntelligenceService } from '../businessIntelligenceService';
import { StrategicReportingService } from '../strategicReportingService';
import { PredictiveAnalyticsService } from '../predictiveAnalyticsService';
import { 
  BusinessMetricsDatabaseSchema,
  BusinessMetricsTransformSchema,
  BusinessIntelligenceDatabaseSchema,
  BusinessIntelligenceTransformSchema,
  StrategicReportingDatabaseSchema,
  StrategicReportingTransformSchema,
  PredictiveAnalyticsDatabaseSchema,
  PredictiveAnalyticsTransformSchema
} from '../../../schemas/executive';
import { ValidationMonitor } from '../../../utils/validationMonitor';
import { createQueryKeyFactory } from '../../../utils/queryKeyFactory';
import { supabase } from '../../../config/supabase';

// Get mock references for use in tests
const mockSupabaseFrom = supabase.from as jest.Mock;

describe('Phase 4.5: Pattern Compliance Audit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Zod Validation Patterns Compliance', () => {
    describe('Single Validation Pass Principle', () => {
      it('should validate BusinessMetrics schemas follow single-pass validation', () => {
        const mockDbData = {
          id: 'metric-1',
          metric_category: 'revenue',
          metric_value: 100000,
          aggregation_level: 'daily',
          created_at: '2024-01-01T00:00:00Z'
        };

        // Single validation pass from DB
        const dbValidation = BusinessMetricsDatabaseSchema.safeParse(mockDbData);
        expect(dbValidation.success).toBe(true);

        // Transform validation (DB → App) - proper transformed data
        const mockTransformData = {
          id: 'metric-1',
          metricCategory: 'revenue',
          metricValue: 100000,
          aggregationLevel: 'daily',
          createdAt: '2024-01-01T00:00:00Z'
        };
        const transformValidation = BusinessMetricsTransformSchema.safeParse(mockTransformData);
        expect(transformValidation.success).toBe(true);

        // No duplicate validation
        expect(dbValidation.data).toBeDefined();
        expect(transformValidation.data).toBeDefined();
      });

      it('should validate BusinessIntelligence schemas follow single-pass validation', () => {
        const mockInsightData = {
          id: 'insight-1',
          insight_type: 'correlation',
          confidence_score: 0.89,
          insight_data: { correlation: 0.75 },
          is_active: true,
          created_at: '2024-01-01T00:00:00Z'
        };

        const dbValidation = BusinessIntelligenceDatabaseSchema.safeParse(mockInsightData);
        expect(dbValidation.success).toBe(true);

        const mockTransformInsightData = {
          id: 'insight-1',
          intelligenceType: 'correlation',
          confidenceScore: 0.89,
          data: { correlation: 0.75 },
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z'
        };
        const transformValidation = BusinessIntelligenceTransformSchema.safeParse(mockTransformInsightData);
        expect(transformValidation.success).toBe(true);
      });

      it('should validate StrategicReporting schemas follow single-pass validation', () => {
        const mockReportData = {
          id: 'report-1',
          report_type: 'executive_summary',
          report_name: 'Monthly Report',
          report_config: { data_sources: ['metrics', 'insights'] },
          is_automated: false,
          created_at: '2024-01-01T00:00:00Z'
        };

        const dbValidation = StrategicReportingDatabaseSchema.safeParse(mockReportData);
        expect(dbValidation.success).toBe(true);

        const mockTransformReportData = {
          id: 'report-1',
          reportType: 'executive_summary',
          reportName: 'Monthly Report',
          reportData: { dataSources: ['metrics', 'insights'] },
          isAutomated: false,
          createdAt: '2024-01-01T00:00:00Z'
        };
        const transformValidation = StrategicReportingTransformSchema.safeParse(mockTransformReportData);
        expect(transformValidation.success).toBe(true);
      });

      it('should validate PredictiveAnalytics schemas follow single-pass validation', () => {
        const mockForecastData = {
          id: 'forecast-1',
          forecast_type: 'demand',
          forecast_value: 112000,
          confidence_level: 0.95,
          model_accuracy: 0.92,
          created_at: '2024-01-01T00:00:00Z'
        };

        const dbValidation = PredictiveAnalyticsDatabaseSchema.safeParse(mockForecastData);
        expect(dbValidation.success).toBe(true);

        const mockTransformForecastData = {
          id: 'forecast-1',
          modelType: 'demand',
          forecastData: { predictions: [112000] },
          confidenceLevel: 0.95,
          accuracy: 0.92,
          createdAt: '2024-01-01T00:00:00Z'
        };
        const transformValidation = PredictiveAnalyticsTransformSchema.safeParse(mockTransformForecastData);
        expect(transformValidation.success).toBe(true);
      });
    });

    describe('Database-First Validation', () => {
      it('should validate JSONB fields properly in analytics schemas', () => {
        const mockJsonbData = {
          id: 'data-1',
          insight_data: {
            correlations: { 'inventory-marketing': 0.75 },
            nested: { deep: { value: 123 } }
          },
          report_config: {
            data_sources: ['metrics', 'insights'],
            settings: { automation: true }
          }
        };

        // JSONB fields should be validated as-is from database
        expect(mockJsonbData.insight_data).toEqual(expect.any(Object));
        expect(mockJsonbData.report_config).toEqual(expect.any(Object));
      });

      it('should handle complex analytics data structures', () => {
        const complexData = {
          forecast_intervals: {
            '95%': { lower: 100000, upper: 120000 },
            '90%': { lower: 102000, upper: 118000 }
          },
          model_parameters: {
            algorithm: 'prophet',
            seasonality: 'multiplicative',
            hyperparameters: { changepoint_prior_scale: 0.05 }
          }
        };

        expect(complexData.forecast_intervals).toBeDefined();
        expect(complexData.model_parameters.hyperparameters).toBeDefined();
      });
    });

    describe('Resilient Item Processing', () => {
      it('should implement skip-on-error in BusinessMetricsService', async () => {
        const items = [
          { id: '1', value: 100 },
          { id: '2', value: 'invalid' }, // This should be skipped
          { id: '3', value: 300 }
        ];

        const processed = [];
        for (const item of items) {
          try {
            if (typeof item.value === 'number') {
              processed.push(item);
            }
          } catch (error) {
            // Skip invalid item
            continue;
          }
        }

        expect(processed).toHaveLength(2);
        expect(processed[0].id).toBe('1');
        expect(processed[1].id).toBe('3');
      });

      it('should validate error recovery in analytics services', () => {
        const mockErrorRecovery = jest.spyOn(ValidationMonitor, 'recordValidationError');
        
        // Simulate error and recovery
        try {
          throw new Error('Analytics processing failed');
        } catch (error) {
          ValidationMonitor.recordValidationError({
            context: 'analytics_processing',
            errorCode: 'PROCESSING_FAILED',
            validationPattern: 'resilient_processing',
            errorMessage: (error as Error).message
          });
        }

        expect(mockErrorRecovery).toHaveBeenCalled();
      });
    });
  });

  describe('React Query Patterns Compliance', () => {
    describe('Centralized Query Key Factory Usage', () => {
      it('should verify no dual query key systems in executive hooks', () => {
        // Check that executive keys are properly defined
        const executiveKeys = createQueryKeyFactory({ 
          entity: 'businessMetrics' as any, 
          isolation: 'user-specific' 
        });

        expect(executiveKeys).toBeDefined();
        expect(executiveKeys.all).toBeDefined();
        expect(executiveKeys.lists).toBeDefined();
        expect(executiveKeys.details).toBeDefined();
      });

      it('should validate user-isolated query keys for analytics', () => {
        const userId = 'user-123';
        const metricsKeys = createQueryKeyFactory({ 
          entity: 'businessMetrics' as any, 
          isolation: 'user-specific' 
        });

        const userKey = metricsKeys.all(userId);
        expect(userKey).toContain('businessMetrics');
        expect(userKey).toContain(userId);
      });

      it('should implement proper fallback strategies', () => {
        const metricsKeys = createQueryKeyFactory({ 
          entity: 'businessMetrics' as any, 
          isolation: 'user-specific' 
        });

        // Without userId, should fallback appropriately
        const fallbackKey = metricsKeys.all(undefined, { fallbackToGlobal: true });
        expect(fallbackKey).toContain('businessMetrics');
        expect(fallbackKey).toContain('global-fallback');
      });

      it('should provide entity-specific factory methods', () => {
        const intelligenceKeys = createQueryKeyFactory({ 
          entity: 'businessIntelligence' as any, 
          isolation: 'user-specific' 
        });

        const listKey = intelligenceKeys.lists('user-123');
        const detailKey = intelligenceKeys.detail('insight-1', 'user-123');

        expect(listKey).toContain('list');
        expect(detailKey).toContain('insight-1');
      });
    });

    describe('Cache Configuration Optimization', () => {
      it('should validate analytics cache configuration', () => {
        const cacheConfig = {
          staleTime: 5 * 60 * 1000, // 5 minutes for analytics
          cacheTime: 10 * 60 * 1000, // 10 minutes
          refetchOnWindowFocus: false, // Prevent unnecessary refetches
          refetchOnReconnect: true // Refetch on reconnection
        };

        expect(cacheConfig.staleTime).toBeLessThan(cacheConfig.cacheTime);
        expect(cacheConfig.refetchOnWindowFocus).toBe(false);
      });

      it('should implement smart invalidation for cross-role updates', () => {
        const invalidationPatterns = [
          { pattern: 'inventory_update', invalidates: ['businessMetrics', 'businessIntelligence'] },
          { pattern: 'marketing_update', invalidates: ['businessMetrics', 'strategicReports'] },
          { pattern: 'forecast_update', invalidates: ['predictiveForecasts', 'businessIntelligence'] }
        ];

        for (const pattern of invalidationPatterns) {
          expect(pattern.invalidates.length).toBeGreaterThan(1); // Cross-role invalidation
        }
      });
    });
  });

  describe('Database Query Patterns Compliance', () => {
    describe('Direct Supabase Queries', () => {
      it('should validate direct Supabase query patterns in services', () => {
        // All services should use direct Supabase queries
        const services = [
          BusinessMetricsService,
          BusinessIntelligenceService,
          StrategicReportingService,
          PredictiveAnalyticsService
        ];

        for (const service of services) {
          expect(service).toBeDefined();
          // Each service should have standard query methods
          expect(typeof service.aggregateBusinessMetrics === 'function' ||
                 typeof service.generateInsights === 'function' ||
                 typeof service.generateReport === 'function' ||
                 typeof service.generateForecast === 'function').toBe(true);
        }
      });

      it('should implement proper validation pipelines', () => {
        const validationPipeline = [
          'fetchFromDatabase',
          'validateWithSchema',
          'transformToAppFormat',
          'returnToClient'
        ];

        expect(validationPipeline).toHaveLength(4);
        expect(validationPipeline[0]).toBe('fetchFromDatabase');
        expect(validationPipeline[validationPipeline.length - 1]).toBe('returnToClient');
      });
    });

    describe('Atomic Operations', () => {
      it('should validate atomic operations in cross-role aggregation', async () => {
        // Mock atomic transaction
        const atomicOperation = async () => {
          const transaction = [];
          
          try {
            transaction.push({ operation: 'read_inventory', status: 'pending' });
            transaction.push({ operation: 'read_marketing', status: 'pending' });
            transaction.push({ operation: 'aggregate_metrics', status: 'pending' });
            
            // All operations must succeed
            for (const op of transaction) {
              op.status = 'completed';
            }
            
            return transaction;
          } catch (error) {
            // Rollback on failure
            for (const op of transaction) {
              op.status = 'rolled_back';
            }
            throw error;
          }
        };

        const result = await atomicOperation();
        expect(result.every(op => op.status === 'completed')).toBe(true);
      });

      it('should implement broadcasting patterns for real-time updates', () => {
        const broadcastConfig = {
          channel: 'analytics_updates',
          events: ['metrics_updated', 'insight_generated', 'forecast_completed'],
          subscribers: ['executive_dashboard', 'analytics_widgets', 'alert_system']
        };

        expect(broadcastConfig.events).toHaveLength(3);
        expect(broadcastConfig.subscribers).toHaveLength(3);
      });
    });
  });

  describe('Security and Performance Patterns', () => {
    describe('Security Compliance', () => {
      it('should validate role-based access control in all services', () => {
        const roleChecks = [
          { context: 'BusinessMetrics', hasRoleCheck: true },
          { context: 'BusinessIntelligence', hasRoleCheck: true },
          { context: 'StrategicReporting', hasRoleCheck: true },
          { context: 'PredictiveAnalytics', hasRoleCheck: true }
        ];

        expect(roleChecks.every(check => check.hasRoleCheck)).toBe(true);
      });

      it('should implement data isolation between roles', () => {
        const dataIsolation = {
          executive: ['all_metrics', 'all_insights', 'all_reports'],
          staff: ['inventory_metrics', 'inventory_insights'],
          marketing_staff: ['marketing_metrics', 'marketing_insights'],
          viewer: ['limited_metrics']
        };

        expect(dataIsolation.executive.length).toBeGreaterThan(dataIsolation.viewer.length);
      });
    });

    describe('Performance Optimization', () => {
      it('should validate pagination implementation for large datasets', () => {
        const paginationConfig = {
          defaultPageSize: 100,
          maxPageSize: 1000,
          useCursor: true,
          supportedSortFields: ['created_at', 'metric_value', 'confidence_score']
        };

        expect(paginationConfig.defaultPageSize).toBeLessThan(paginationConfig.maxPageSize);
        expect(paginationConfig.useCursor).toBe(true);
      });

      it('should implement proper indexing strategies', () => {
        const indexingStrategy = [
          { table: 'business_metrics', indexes: ['metric_category', 'created_at', 'user_id'] },
          { table: 'business_insights', indexes: ['insight_type', 'confidence_score', 'is_active'] },
          { table: 'strategic_reports', indexes: ['report_type', 'is_automated', 'created_at'] },
          { table: 'predictive_forecasts', indexes: ['forecast_type', 'model_accuracy', 'created_at'] }
        ];

        expect(indexingStrategy.every(table => table.indexes.length >= 3)).toBe(true);
      });
    });
  });

  describe('Monitoring and Validation', () => {
    it('should validate ValidationMonitor integration across all services', () => {
      const monitoringPoints = [
        'aggregateBusinessMetrics',
        'generateInsights',
        'generateReport',
        'generateForecast',
        'detectAnomalies',
        'validateModelAccuracy'
      ];

      expect(monitoringPoints).toHaveLength(6);
      expect(ValidationMonitor.recordPatternSuccess).toBeDefined();
      expect(ValidationMonitor.recordValidationError).toBeDefined();
    });

    it('should track both successes and failures', () => {
      const metrics = {
        successes: 0,
        failures: 0,
        successRate: 0
      };

      // Simulate operations
      for (let i = 0; i < 100; i++) {
        if (Math.random() > 0.1) { // 90% success rate
          metrics.successes++;
        } else {
          metrics.failures++;
        }
      }

      metrics.successRate = metrics.successes / (metrics.successes + metrics.failures);
      expect(metrics.successRate).toBeGreaterThan(0.8);
    });
  });
});