// Mock ValidationMonitor before importing service (exact authService pattern)
jest.mock('../../../utils/validationMonitor');

import { BusinessMetricsService } from '../businessMetricsService';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Mock the supabase module at the service level (exact authService pattern)
const mockSupabase = require('../../../config/supabase').supabase;

// Mock-based service testing (following successful pattern)
describe('BusinessMetricsService - Phase 4.2', () => {
  
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

  // Helper function to create complete query chain mocks
  const createQueryChainMock = (data: any[], error: any = null) => {
    const mockMethods = {
      select: jest.fn(),
      in: jest.fn(),
      eq: jest.fn(),
      gte: jest.fn(),
      lte: jest.fn(),
      order: jest.fn(),
      update: jest.fn(),
      insert: jest.fn(),
      single: jest.fn()
    };

    // Chain all methods to return the next method in the chain
    mockMethods.select.mockReturnValue(mockMethods);
    mockMethods.in.mockReturnValue(mockMethods);
    mockMethods.eq.mockReturnValue(mockMethods);
    mockMethods.gte.mockReturnValue(mockMethods);
    mockMethods.lte.mockReturnValue(mockMethods);
    mockMethods.update.mockReturnValue(mockMethods);
    mockMethods.insert.mockReturnValue(mockMethods);
    
    // Terminal methods return the data
    mockMethods.order.mockResolvedValue({ data, error });
    mockMethods.single.mockResolvedValue({ data: data[0] || null, error });
    
    // Also handle direct resolution (in case .order() isn't called)
    Object.assign(mockMethods, { 
      then: (resolve: any) => resolve({ data, error }),
      catch: (reject: any) => error ? reject(error) : Promise.resolve({ data, error })
    });

    return mockMethods;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Debug test to verify basic mocking
  it('should verify supabase mock is working', async () => {
    const testData = [{ id: 'test-123', metric_category: 'inventory' }];
    mockSupabase.from.mockReturnValue(createQueryChainMock(testData));
    
    // Direct call to verify mock
    const mockResult = await mockSupabase.from('business_metrics').select('*').order('id');
    
    expect(mockSupabase.from).toHaveBeenCalledWith('business_metrics');
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

      mockSupabase.from.mockReturnValue(createQueryChainMock(mockMetrics));

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
      mockSupabase.from
        .mockReturnValueOnce(createQueryChainMock(inventoryData))
        .mockReturnValueOnce(createQueryChainMock(marketingData));

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

      mockSupabase.from.mockReturnValue(createQueryChainMock(mockCategoryData));

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

      mockSupabase.from.mockReturnValue(createQueryChainMock(mockTimeRangeData));

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

      mockSupabase.from.mockReturnValue(createQueryChainMock(mockUpdateData));

      const result = await BusinessMetricsService.updateMetricValues(
        'metric-7',
        { metric_value: 3.5 }
      );

      expect(result.metricValue).toBe(3.5);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should handle validation errors gracefully', async () => {
      const mockError = { message: 'Validation failed', code: 'INVALID_VALUE' };
      mockSupabase.from.mockReturnValue(createQueryChainMock([], mockError));

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
      const successMock = createQueryChainMock([
        createMockMetric({ id: 'metric-8', metric_name: 'valid_metric' })
      ]);
      const failMock = createQueryChainMock([], { message: 'Invalid data type' });
      
      mockSupabase.from
        .mockReturnValueOnce(successMock)
        .mockReturnValueOnce(failMock);

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
      
      mockSupabase.from
        .mockReturnValueOnce(createQueryChainMock([mockBatchData[0]]))
        .mockReturnValueOnce(createQueryChainMock([mockBatchData[1]]));

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
      mockSupabase.from.mockReturnValue(createQueryChainMock(mockRoleData));

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
      
      mockSupabase.from.mockReturnValue(createQueryChainMock(mockExecutiveData));

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

      mockSupabase.from.mockReturnValue(createQueryChainMock(largeDataset));

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
      
      mockSupabase.from
        .mockReturnValueOnce(createQueryChainMock(inventoryData))
        .mockReturnValueOnce(createQueryChainMock(marketingData));

      await BusinessMetricsService.generateCorrelationAnalysis(
        'inventory',
        'marketing',
        '2024-01-01',
        '2024-01-31'
      );

      // Verify database queries are optimized (called minimum times)
      expect(mockSupabase.from).toHaveBeenCalledTimes(2); // Once per category
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