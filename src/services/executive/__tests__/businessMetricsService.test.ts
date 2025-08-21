import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Real Supabase configuration for testing
import { supabase } from '../../../config/supabase';

// Mock ValidationMonitor (following architectural pattern)
jest.mock('../../../utils/validationMonitor');

import { BusinessMetricsService } from '../businessMetricsService';
import { ValidationMonitor } from '../../../utils/validationMonitor';
import type { 
  BusinessMetricsTransform,
  CreateBusinessMetricsContract,
  UpdateBusinessMetricsContract
} from '../../../schemas/executive';

// Real database testing against test tables
describe('BusinessMetricsService - Phase 4.2 (Real Database)', () => {
  
  // Test data cleanup IDs
  const testMetricIds = new Set<string>();
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Track test data for cleanup
    testMetricIds.clear();
  });

  afterEach(async () => {
    // Clean up test data from real database
    try {
      // Delete test business metrics
      if (testMetricIds.size > 0) {
        await supabase
          .from('business_metrics')
          .delete()
          .in('id', Array.from(testMetricIds));
      }
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });

  describe('aggregateBusinessMetrics', () => {
    it('should aggregate cross-role business metrics with performance optimization', async () => {
      // Step 1: Create test metrics across different categories
      const testMetrics = [
        {
          metric_category: 'inventory' as const,
          metric_name: 'stock_turnover_rate',
          metric_value: 12.5,
          metric_unit: 'ratio',
          aggregation_level: 'monthly' as const,
          source_data_type: 'inventory_movement',
          correlation_factors: { seasonal_factor: 0.85 }
        },
        {
          metric_category: 'marketing' as const,
          metric_name: 'campaign_conversion_rate',
          metric_value: 8.3,
          metric_unit: 'percentage',
          aggregation_level: 'monthly' as const,
          source_data_type: 'campaign_performance',
          correlation_factors: { inventory_availability: 0.78 }
        }
      ];

      // Step 2: Call service (this will FAIL initially - RED phase)
      const result = await BusinessMetricsService.aggregateBusinessMetrics(
        ['inventory', 'marketing'],
        'monthly',
        '2024-01-01',
        '2024-01-31'
      );
      
      // Step 3: Verify cross-role aggregation
      expect(result).toBeDefined();
      expect(result.metrics).toHaveLength(2);
      expect(result.correlations).toBeDefined();
      
      // Step 4: Verify ValidationMonitor called
      expect(ValidationMonitor.logSuccess).toHaveBeenCalledWith(
        expect.stringContaining('aggregate_business_metrics'),
        expect.any(Object)
      );
    });

    it('should handle correlation analysis with statistical validation', async () => {
      const result = await BusinessMetricsService.generateCorrelationAnalysis(
        'inventory',
        'marketing',
        '2024-01-01',
        '2024-01-31'
      );
      
      expect(result).toBeDefined();
      expect(result.correlation_strength).toBeGreaterThan(0);
      expect(result.statistical_significance).toBeDefined();
      expect(result.sample_size).toBeGreaterThan(0);
    });
  });

  describe('getMetricsByCategory', () => {
    it('should get metrics by category with role permission filtering', async () => {
      const category = 'inventory';
      const result = await BusinessMetricsService.getMetricsByCategory(
        category,
        { date_range: '2024-01-01,2024-01-31', aggregation_level: 'daily' }
      );
      
      expect(result).toBeDefined();
      expect(result.every(metric => metric.metricCategory === category)).toBe(true);
      
      // Verify transformation (snake_case → camelCase)
      result.forEach(metric => {
        expect(metric.metricDate).toBeDefined();
        expect(metric.metricCategory).toBeDefined();
        expect(metric.metricName).toBeDefined();
        expect(metric.metricValue).toBeDefined();
        expect(metric.aggregationLevel).toBeDefined();
        expect(metric.sourceDataType).toBeDefined();
      });
    });

    it('should handle time range support with proper filtering', async () => {
      const result = await BusinessMetricsService.getMetricsByCategory(
        'sales',
        { 
          date_range: '2024-01-01,2024-01-15',
          aggregation_level: 'weekly'
        }
      );
      
      expect(result).toBeDefined();
      result.forEach(metric => {
        const metricDate = new Date(metric.metricDate);
        expect(metricDate >= new Date('2024-01-01')).toBe(true);
        expect(metricDate <= new Date('2024-01-15')).toBe(true);
      });
    });
  });

  describe('updateMetricValues', () => {
    it('should update metric values with atomic operations and validation', async () => {
      // Step 1: Create test metric
      const createData: CreateBusinessMetricsContract = {
        metric_category: 'operational',
        metric_name: 'test_metric',
        metric_value: 100,
        aggregation_level: 'daily',
        source_data_type: 'test_data'
      };
      
      const created = await BusinessMetricsService.createMetric(createData);
      testMetricIds.add(created.id);
      
      // Step 2: Update metric value
      const updateData: UpdateBusinessMetricsContract = {
        metric_value: 150,
        correlation_factors: { updated: true }
      };
      
      const updated = await BusinessMetricsService.updateMetricValues(created.id, updateData);
      
      // Step 3: Verify atomic update
      expect(updated.metricValue).toBe(150);
      expect(updated.correlationFactors?.updated).toBe(true);
      expect(updated.updatedAt).not.toBe(created.updatedAt);
    });

    it('should handle validation errors gracefully', async () => {
      const invalidUpdate: UpdateBusinessMetricsContract = {
        metric_value: -50 // Invalid negative value
      };
      
      await expect(
        BusinessMetricsService.updateMetricValues('invalid-id', invalidUpdate)
      ).rejects.toThrow();
      
      expect(ValidationMonitor.logFailure).toHaveBeenCalled();
    });
  });

  describe('getMetricTrends', () => {
    it('should analyze metric trends with time series analysis', async () => {
      const result = await BusinessMetricsService.getMetricTrends(
        'inventory',
        'stock_turnover_rate',
        '2023-10-01',
        '2024-01-31'
      );
      
      expect(result).toBeDefined();
      expect(result.trend_direction).toMatch(/^(increasing|decreasing|stable)$/);
      expect(result.trend_strength).toBeGreaterThanOrEqual(0);
      expect(result.trend_strength).toBeLessThanOrEqual(1);
      expect(result.data_points).toBeGreaterThan(0);
      expect(result.statistical_significance).toBeDefined();
    });

    it('should detect pattern anomalies in time series data', async () => {
      const result = await BusinessMetricsService.getMetricTrends(
        'marketing',
        'campaign_conversion_rate',
        '2024-01-01',
        '2024-01-31'
      );
      
      expect(result.anomalies).toBeDefined();
      if (result.anomalies.length > 0) {
        result.anomalies.forEach(anomaly => {
          expect(anomaly.date).toBeDefined();
          expect(anomaly.expected_value).toBeDefined();
          expect(anomaly.actual_value).toBeDefined();
          expect(anomaly.deviation_score).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('batchProcessMetrics', () => {
    it('should process metrics with resilient skip-on-error pattern', async () => {
      const batchData = [
        {
          metric_category: 'sales' as const,
          metric_name: 'valid_metric',
          metric_value: 100,
          aggregation_level: 'daily' as const,
          source_data_type: 'test_data'
        },
        {
          metric_category: 'sales' as const,
          metric_name: 'invalid_metric',
          metric_value: -50, // Invalid negative value
          aggregation_level: 'daily' as const,
          source_data_type: 'test_data'
        },
        {
          metric_category: 'sales' as const,
          metric_name: 'another_valid_metric',
          metric_value: 200,
          aggregation_level: 'daily' as const,
          source_data_type: 'test_data'
        }
      ];
      
      const result = await BusinessMetricsService.batchProcessMetrics(batchData);
      
      // Verify resilient processing (2 successful, 1 skipped)
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.created_metrics).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      
      // Track created metrics for cleanup
      result.created_metrics.forEach(metric => {
        testMetricIds.add(metric.id);
      });
    });

    it('should maintain data integrity during batch operations', async () => {
      const batchData = [
        {
          metric_category: 'strategic' as const,
          metric_name: 'batch_test_1',
          metric_value: 75.5,
          metric_unit: 'percentage',
          aggregation_level: 'quarterly' as const,
          source_data_type: 'goal_tracking'
        },
        {
          metric_category: 'strategic' as const,
          metric_name: 'batch_test_2',
          metric_value: 125000,
          metric_unit: 'currency',
          aggregation_level: 'quarterly' as const,
          source_data_type: 'revenue_tracking'
        }
      ];
      
      const result = await BusinessMetricsService.batchProcessMetrics(batchData);
      
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      
      // Verify all metrics were created with proper transformation
      result.created_metrics.forEach(metric => {
        expect(metric.metricCategory).toBe('strategic');
        expect(metric.aggregationLevel).toBe('quarterly');
        expect(typeof metric.metricValue).toBe('number');
        testMetricIds.add(metric.id);
      });
    });
  });

  describe('Role Permission Integration', () => {
    it('should integrate with Phase 1 RolePermissionService', async () => {
      // This test verifies the service integrates with role permissions
      const mockUserRole = 'inventory_staff';
      
      const result = await BusinessMetricsService.getMetricsByCategory(
        'inventory',
        { user_role: mockUserRole }
      );
      
      // Inventory staff should only see inventory metrics
      expect(result.every(metric => metric.metricCategory === 'inventory')).toBe(true);
    });

    it('should handle executive role access to all analytics', async () => {
      const mockUserRole = 'executive';
      
      const result = await BusinessMetricsService.aggregateBusinessMetrics(
        ['inventory', 'marketing', 'sales', 'operational', 'strategic'],
        'monthly',
        '2024-01-01',
        '2024-01-31',
        { user_role: mockUserRole }
      );
      
      expect(result.metrics.length).toBeGreaterThan(0);
      // Executive should see all metric categories
      const categories = result.metrics.map(m => m.metricCategory);
      expect(new Set(categories).size).toBeGreaterThan(1);
    });
  });

  describe('Performance Validation', () => {
    it('should handle large metric aggregation operations efficiently', async () => {
      const startTime = Date.now();
      
      const result = await BusinessMetricsService.aggregateBusinessMetrics(
        ['inventory', 'marketing', 'sales'],
        'daily',
        '2023-01-01',
        '2024-01-31' // Full year of data
      );
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Should complete within performance threshold (< 2000ms)
      expect(executionTime).toBeLessThan(2000);
      expect(result).toBeDefined();
    });

    it('should optimize database queries for cross-role analytics', async () => {
      const result = await BusinessMetricsService.generateCorrelationAnalysis(
        'inventory',
        'marketing',
        '2024-01-01',
        '2024-01-31'
      );
      
      // Verify efficient correlation calculation
      expect(result.correlation_strength).toBeDefined();
      expect(result.calculation_time_ms).toBeLessThan(1000);
      expect(result.sample_size).toBeGreaterThan(0);
    });
  });

  describe('Cross-role Data Integrity', () => {
    it('should maintain consistency across role-based metric access', async () => {
      // Test that same metric appears consistently across different role views
      const executiveView = await BusinessMetricsService.getMetricsByCategory(
        'inventory',
        { user_role: 'executive' }
      );
      
      const inventoryStaffView = await BusinessMetricsService.getMetricsByCategory(
        'inventory',
        { user_role: 'inventory_staff' }
      );
      
      // Both views should contain same inventory metrics
      expect(executiveView.length).toBeGreaterThanOrEqual(inventoryStaffView.length);
      
      // Verify data consistency
      inventoryStaffView.forEach(staffMetric => {
        const execMetric = executiveView.find(m => m.id === staffMetric.id);
        expect(execMetric).toBeDefined();
        expect(execMetric?.metricValue).toBe(staffMetric.metricValue);
      });
    });
  });
});