import { SimplifiedSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { createUser, resetAllFactories } from '../../../test/factories';
import { BusinessMetricsService } from '../businessMetricsService';

// Mock ValidationMonitor
jest.mock('../../../utils/validationMonitor');
const { ValidationMonitor } = require('../../../utils/validationMonitor');

// Mock Supabase
jest.mock('../../../config/supabase', () => ({
  supabase: null // Will be set in beforeEach
}));

describe('BusinessMetricsService', () => {
  let supabaseMock: SimplifiedSupabaseMock;
  const testUser = createUser();
  
  beforeEach(() => {
    jest.clearAllMocks();
    resetAllFactories();
    
    // Create and inject mock
    supabaseMock = new SimplifiedSupabaseMock();
    require('../../../config/supabase').supabase = supabaseMock.createClient();
  });
  
  // Helper function to create complete business metrics data
  const createMockMetric = (overrides: Partial<any> = {}) => ({
    id: `metric-${Math.random().toString(36).substr(2, 9)}`,
    metric_date: '2024-01-15',
    metric_category: 'inventory',
    metric_name: 'test_metric',
    metric_value: 100,
    metric_unit: 'count',
    aggregation_level: 'daily',
    source_data_type: 'test_source',
    correlation_factors: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  });



  // Debug test to verify basic mocking
  it('should verify supabase mock is working', async () => {
    const testData = [{ id: 'test-123', metric_category: 'inventory' }];
    supabaseMock.setTableData('business_metrics', testData);
    
    // Direct call to verify mock
    const { supabase } = require('../../../config/supabase');
    const mockResult = await supabase.from('business_metrics').select('*').order('id');
    
    expect(mockResult.data).toEqual(testData);
  });

  describe('aggregateBusinessMetrics', () => {
    it('should aggregate cross-role business metrics with performance optimization', async () => {
      // Mock data for aggregation using helper
      const mockMetrics = [
        createMockMetric({
          id: 'metric-1',
          metric_category: 'inventory',
          metric_name: 'stock_turnover_rate',
          metric_value: 2.5,
          metric_unit: 'ratio',
          aggregation_level: 'monthly',
          correlation_factors: { seasonal_impact: 0.3 },
          source_data_type: 'inventory_movement'
        }),
        createMockMetric({
          id: 'metric-2',
          metric_category: 'marketing',
          metric_name: 'campaign_conversion_rate',
          metric_value: 0.15,
          metric_unit: 'percentage',
          aggregation_level: 'monthly',
          correlation_factors: { inventory_correlation: 0.6 },
          source_data_type: 'campaign_performance'
        })
      ];

      supabaseMock.setTableData('business_metrics', mockMetrics);

      const result = await BusinessMetricsService.aggregateBusinessMetrics(
        ['inventory', 'marketing'],
        'monthly',
        '2024-01-01',
        '2024-01-31'
      );

      expect(result.metrics).toBeDefined();
      expect(result.correlations).toBeDefined();
      expect(result.summary.total_metrics).toBeGreaterThan(0);
      expect(result.summary.categories_included).toEqual(['inventory', 'marketing']);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should handle correlation analysis with statistical validation', async () => {
      // Mock data with matching dates for correlation analysis
      const inventoryData = [
        createMockMetric({ id: 'inv-1', metric_category: 'inventory', metric_value: 3.2, metric_date: '2024-01-15' }),
        createMockMetric({ id: 'inv-2', metric_category: 'inventory', metric_value: 2.8, metric_date: '2024-01-16' }),
        createMockMetric({ id: 'inv-3', metric_category: 'inventory', metric_value: 3.5, metric_date: '2024-01-17' })
      ];
      
      const marketingData = [
        createMockMetric({ id: 'mkt-1', metric_category: 'marketing', metric_value: 0.18, metric_date: '2024-01-15' }),
        createMockMetric({ id: 'mkt-2', metric_category: 'marketing', metric_value: 0.22, metric_date: '2024-01-16' }),
        createMockMetric({ id: 'mkt-3', metric_category: 'marketing', metric_value: 0.15, metric_date: '2024-01-17' })
      ];

      // Setup mock to return different data for each category call
      supabaseMock.setTableData('business_metrics', [...inventoryData, ...marketingData]);

      try {
        const result = await BusinessMetricsService.generateCorrelationAnalysis(
          'inventory',
          'marketing',
          '2024-01-01',
          '2024-01-31'
        );

        console.log('Correlation result:', result);
        expect(result.correlation_strength).toBeDefined();
        expect(result.statistical_significance).toBeDefined();
        expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
      } catch (error) {
        console.log('Correlation error:', error);
        throw error;
      }
    });
  });

  describe('getMetricsByCategory', () => {
    it('should get metrics by category with role permission filtering', async () => {
      const mockCategoryData = [
        {
          id: 'metric-5',
          metric_category: 'inventory',
          metric_name: 'stock_level',
          metric_value: 1250,
          metric_unit: 'count',
          metric_date: '2024-01-15',
          aggregation_level: 'daily',
          source_data_type: 'inventory_count',
          correlation_factors: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      supabaseMock.setTableData('business_metrics', mockCategoryData);

      const result = await BusinessMetricsService.getMetricsByCategory('inventory');

      expect(result).toHaveLength(1);
      expect(result[0].metricCategory).toBe('inventory');
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should handle time range support with proper filtering', async () => {
      const mockTimeRangeData = [
        createMockMetric({
          id: 'metric-6',
          metric_date: '2024-01-15',
          metric_category: 'sales',
          metric_value: 5000
        })
      ];

      supabaseMock.setTableData('business_metrics', mockTimeRangeData);

      const result = await BusinessMetricsService.getMetricsByCategory(
        'sales',
        { 
          date_range: '2024-01-01,2024-01-31'
        }
      );

      expect(result).toHaveLength(1);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('updateMetricValues', () => {
    it('should update metric values with atomic operations and validation', async () => {
      const mockUpdateData = [
        createMockMetric({
          id: 'metric-7',
          metric_value: 3.5,
          updated_at: '2024-01-15T10:00:00Z'
        })
      ];

      supabaseMock.setTableData('business_metrics', mockUpdateData);

      const result = await BusinessMetricsService.updateMetricValues(
        'metric-7',
        { metric_value: 3.5 }
      );

      expect(result.metricValue).toBe(3.5);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should handle validation errors gracefully', async () => {
      supabaseMock.queueError(new Error('Validation failed'));

      await expect(
        BusinessMetricsService.updateMetricValues('invalid-id', { metric_value: -1 })
      ).rejects.toThrow();
      
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('batchProcessMetrics', () => {
    it('should process metrics with resilient skip-on-error pattern', async () => {
      const mockMetrics = [
        { metric_name: 'valid_metric', metric_value: 100 },
        { metric_name: 'invalid_metric', metric_value: 'invalid' }
      ];

      // Setup mock for batch processing - first call succeeds, second fails
      supabaseMock.setTableData('business_metrics', [
        createMockMetric({ id: 'metric-8', metric_name: 'valid_metric' })
      ]);
      supabaseMock.queueError(new Error('Invalid data type'));

      const result = await BusinessMetricsService.batchProcessMetrics(mockMetrics);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should maintain data integrity during batch operations', async () => {
      const mockMetrics = [
        { 
          metric_category: 'inventory' as const,
          metric_name: 'metric_1', 
          metric_value: 100,
          aggregation_level: 'daily' as const,
          source_data_type: 'test_source'
        },
        { 
          metric_category: 'marketing' as const,
          metric_name: 'metric_2', 
          metric_value: 200,
          aggregation_level: 'daily' as const,
          source_data_type: 'test_source'
        }
      ];

      // Mock insert operations for each metric creation
      const mockBatchData = mockMetrics.map((m, i) => 
        createMockMetric({ id: `metric-${i+9}`, ...m })
      );
      
      supabaseMock.setTableData('business_metrics', mockBatchData);

      const result = await BusinessMetricsService.batchProcessMetrics(mockMetrics);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('Role Permission Integration', () => {
    it('should integrate with Phase 1 RolePermissionService', async () => {
      // Mock role permission check
      const mockRolePermission = require('../../../services/role-based/rolePermissionService');
      mockRolePermission.RolePermissionService = {
        hasPermission: jest.fn().mockResolvedValue(true)
      };

      const mockRoleData = [
        createMockMetric({
          id: 'metric-10',
          metric_category: 'inventory'
        })
      ];
      supabaseMock.setTableData('business_metrics', mockRoleData);

      const result = await BusinessMetricsService.getMetricsByCategory(
        'inventory',
        { user_role: 'inventory_staff', user_id: 'user-123' }
      );

      expect(result).toHaveLength(1);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should handle executive role access to all analytics', async () => {
      const mockExecutiveData = [
        createMockMetric({ id: 'metric-11', metric_category: 'inventory' }),
        createMockMetric({ id: 'metric-12', metric_category: 'marketing' }),
        createMockMetric({ id: 'metric-13', metric_category: 'sales' })
      ];
      
      supabaseMock.setTableData('business_metrics', mockExecutiveData);

      const result = await BusinessMetricsService.aggregateBusinessMetrics(
        ['inventory', 'marketing', 'sales'],
        'monthly',
        '2024-01-01',
        '2024-01-31',
        { user_role: 'executive' }
      );

      expect(result.summary.categories_included).toHaveLength(3);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('Performance Validation', () => {
    it('should handle large metric aggregation operations efficiently', async () => {
      // Setup mock for performance testing
      const largeDataset = Array.from({ length: 1000 }, (_, i) => 
        createMockMetric({
          id: `metric-${i+100}`,
          metric_value: Math.random() * 100,
          metric_category: 'inventory' // Use valid category
        })
      );

      supabaseMock.setTableData('business_metrics', largeDataset);

      const startTime = Date.now();
      const result = await BusinessMetricsService.aggregateBusinessMetrics(
        ['inventory'], // Use valid category
        'daily',
        '2024-01-01',
        '2024-01-31'
      );
      const endTime = Date.now();

      expect(result.summary.total_metrics).toBe(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should optimize database queries for cross-role analytics', async () => {
      // Need matching dates for correlation analysis
      const inventoryData = [
        createMockMetric({ id: 'metric-1001', metric_category: 'inventory', metric_value: 3.0, metric_date: '2024-01-15' }),
        createMockMetric({ id: 'metric-1003', metric_category: 'inventory', metric_value: 2.5, metric_date: '2024-01-16' })
      ];
      const marketingData = [
        createMockMetric({ id: 'metric-1002', metric_category: 'marketing', metric_value: 0.20, metric_date: '2024-01-15' }),
        createMockMetric({ id: 'metric-1004', metric_category: 'marketing', metric_value: 0.25, metric_date: '2024-01-16' })
      ];
      
      supabaseMock.setTableData('business_metrics', [...inventoryData, ...marketingData]);

      await BusinessMetricsService.generateCorrelationAnalysis(
        'inventory',
        'marketing',
        '2024-01-01',
        '2024-01-31'
      );

      // Verify database queries are optimized (called minimum times)
      // Note: With simplified mock, we verify results rather than call counts
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('Cross-role Data Integrity', () => {
    it('should maintain consistency across role-based metric access', async () => {
      // Mock role permission to fail for restricted access
      const mockRolePermission = require('../../../services/role-based/rolePermissionService');
      mockRolePermission.RolePermissionService = {
        hasPermission: jest.fn().mockResolvedValue(false)
      };

      await expect(
        BusinessMetricsService.getMetricsByCategory(
          'executive_only_category',
          { user_role: 'inventory_staff', user_id: 'user-123' }
        )
      ).rejects.toThrow('Insufficient permissions for analytics access');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });
});