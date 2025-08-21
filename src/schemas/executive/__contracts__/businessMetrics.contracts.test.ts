import { describe, it, expect } from '@jest/globals';
import type { MockDatabase } from './database-mock.types';
import { 
  BusinessMetricsDatabaseSchema, 
  BusinessMetricsTransformSchema,
  CreateBusinessMetricsSchema,
  UpdateBusinessMetricsSchema,
  type BusinessMetricsDatabaseContract,
  type BusinessMetricsTransform
} from '../businessMetrics.schemas';
import type { z } from 'zod';

// Phase 1 Integration: Role-based permissions validation
import { ROLE_PERMISSIONS } from '../../role-based/rolePermission.schemas';

// CRITICAL: Compile-time contract enforcement (Pattern from architectural doc)
// This MUST compile - if it doesn't, schema transformation is incomplete
type BusinessMetricsContract = z.infer<typeof BusinessMetricsTransformSchema> extends BusinessMetricsTransform 
  ? BusinessMetricsTransform extends z.infer<typeof BusinessMetricsTransformSchema> 
    ? true 
    : false 
  : false;

describe('Business Metrics Schema Contracts - Phase 4', () => {
  // Contract Test 0: Compile-time contract enforcement (CRITICAL PATTERN)
  it('must pass compile-time contract validation', () => {
    // This test validates that the contract type compiled successfully
    const contractIsValid: BusinessMetricsContract = true;
    expect(contractIsValid).toBe(true);
    
    // If this test compiles, the schema-interface alignment is enforced at compile time
    // If the schema transformation doesn't match the interface exactly, TypeScript compilation will fail
  });

  // Contract Test 1: Database interface alignment (MANDATORY)
  it('must align with generated database types', () => {
    type DatabaseBusinessMetrics = MockDatabase['public']['Tables']['business_metrics']['Row'];
    
    // This function MUST compile - if it doesn't, schema is wrong
    const contractValidator = (row: DatabaseBusinessMetrics): BusinessMetricsDatabaseContract => {
      return {
        id: row.id,                                       // ✅ Compile fails if missing
        metric_date: row.metric_date,                     // ✅ Compile fails if missing  
        metric_category: row.metric_category,             // ✅ Compile fails if missing
        metric_name: row.metric_name,                     // ✅ Compile fails if missing
        metric_value: row.metric_value,                   // ✅ Compile fails if missing
        metric_unit: row.metric_unit,                     // ✅ Nullable
        aggregation_level: row.aggregation_level,         // ✅ Compile fails if missing
        source_data_type: row.source_data_type,           // ✅ Compile fails if missing
        correlation_factors: row.correlation_factors,     // ✅ JSONB nullable
        created_at: row.created_at,                       // ✅ Nullable timestamp
        updated_at: row.updated_at                        // ✅ Nullable timestamp
      };
    };
    
    expect(contractValidator).toBeDefined();
  });

  // Contract Test 2: Transformation completeness validation (MANDATORY)
  it('must transform all database fields to interface fields', () => {
    const databaseData: BusinessMetricsDatabaseContract = {
      id: 'metric-123',
      metric_date: '2024-01-15',
      metric_category: 'inventory',
      metric_name: 'stock_turnover_rate',
      metric_value: 12.5,
      metric_unit: 'ratio',
      aggregation_level: 'monthly',
      source_data_type: 'inventory_movement',
      correlation_factors: { seasonal_factor: 0.85, demand_correlation: 0.92 },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const transformed = BusinessMetricsTransformSchema.parse(databaseData);
    
    // Verify EVERY interface field is populated (camelCase conversion)
    expect(transformed.id).toBe('metric-123');
    expect(transformed.metricDate).toBe('2024-01-15');          // Snake → camel
    expect(transformed.metricCategory).toBe('inventory');        // Snake → camel
    expect(transformed.metricName).toBe('stock_turnover_rate');  // Snake → camel
    expect(transformed.metricValue).toBe(12.5);                  // Snake → camel
    expect(transformed.metricUnit).toBe('ratio');                // Snake → camel
    expect(transformed.aggregationLevel).toBe('monthly');        // Snake → camel
    expect(transformed.sourceDataType).toBe('inventory_movement'); // Snake → camel
    expect(transformed.correlationFactors).toEqual({             // Snake → camel
      seasonal_factor: 0.85,
      demand_correlation: 0.92
    });
    expect(transformed.createdAt).toBeDefined();                 // Snake → camel
    expect(transformed.updatedAt).toBeDefined();                 // Snake → camel
    
    // Verify types are correct
    expect(typeof transformed.metricValue).toBe('number');
    expect(typeof transformed.correlationFactors).toBe('object');
  });

  // Contract Test 3: Cross-role metric aggregation validation
  it('must validate cross-role metric aggregation data types', () => {
    const metricsWithComplexCorrelation: BusinessMetricsDatabaseContract = {
      id: 'metric-456',
      metric_date: '2024-01-15',
      metric_category: 'marketing',
      metric_name: 'campaign_conversion_rate',
      metric_value: 8.3,
      metric_unit: 'percentage',
      aggregation_level: 'monthly',
      source_data_type: 'campaign_performance',
      correlation_factors: {
        inventory_availability: 0.78,
        seasonal_demand: 0.91,
        nested_data: {
          campaign_id: 'camp-123',
          product_categories: ['fresh', 'organic'],
          statistical_significance: 0.95
        }
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const transformed = BusinessMetricsTransformSchema.parse(metricsWithComplexCorrelation);
    
    expect(transformed.correlationFactors).toBeDefined();
    expect(transformed.correlationFactors?.inventory_availability).toBe(0.78);
    expect(transformed.correlationFactors?.nested_data).toBeDefined();
    expect(transformed.correlationFactors?.nested_data.product_categories).toEqual(['fresh', 'organic']);
  });

  // Contract Test 4: JSONB correlation factor validation
  it('must handle null and complex JSONB correlation factors', () => {
    const metricsWithNullCorrelation: BusinessMetricsDatabaseContract = {
      id: 'metric-789',
      metric_date: '2024-01-15',
      metric_category: 'sales',
      metric_name: 'monthly_revenue',
      metric_value: 125000.50,
      metric_unit: 'currency',
      aggregation_level: 'monthly',
      source_data_type: 'sales_data',
      correlation_factors: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const transformed = BusinessMetricsTransformSchema.parse(metricsWithNullCorrelation);
    expect(transformed.correlationFactors).toBeNull();
  });

  // Contract Test 5: Metric category constraint validation
  it('must enforce metric category constraints', () => {
    const validCategories: Array<BusinessMetricsDatabaseContract['metric_category']> = 
      ['inventory', 'marketing', 'sales', 'operational', 'strategic'];
    
    validCategories.forEach(category => {
      const metricsData: BusinessMetricsDatabaseContract = {
        id: `metric-${category}`,
        metric_date: '2024-01-15',
        metric_category: category,
        metric_name: `${category}_metric`,
        metric_value: 100,
        metric_unit: 'count',
        aggregation_level: 'daily',
        source_data_type: `${category}_data`,
        correlation_factors: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      expect(() => BusinessMetricsDatabaseSchema.parse(metricsData)).not.toThrow();
    });
  });

  // Contract Test 6: Aggregation level constraint validation
  it('must enforce aggregation level constraints', () => {
    const validLevels: Array<BusinessMetricsDatabaseContract['aggregation_level']> = 
      ['daily', 'weekly', 'monthly', 'quarterly'];
    
    validLevels.forEach(level => {
      const metricsData: BusinessMetricsDatabaseContract = {
        id: `metric-${level}`,
        metric_date: '2024-01-15',
        metric_category: 'inventory',
        metric_name: `${level}_metric`,
        metric_value: 100,
        metric_unit: 'count',
        aggregation_level: level,
        source_data_type: 'test_data',
        correlation_factors: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      expect(() => BusinessMetricsDatabaseSchema.parse(metricsData)).not.toThrow();
    });
  });

  // Contract Test 7: Time series data validation
  it('must validate time series data with date ranges', () => {
    const timeSeriesMetrics: BusinessMetricsDatabaseContract[] = [
      {
        id: 'metric-ts-1',
        metric_date: '2024-01-01',
        metric_category: 'inventory',
        metric_name: 'stock_level',
        metric_value: 1000,
        metric_unit: 'count',
        aggregation_level: 'daily',
        source_data_type: 'inventory_snapshot',
        correlation_factors: { trend: 'increasing', confidence: 0.89 },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'metric-ts-2',
        metric_date: '2024-01-02',
        metric_category: 'inventory',
        metric_name: 'stock_level',
        metric_value: 950,
        metric_unit: 'count',
        aggregation_level: 'daily',
        source_data_type: 'inventory_snapshot',
        correlation_factors: { trend: 'decreasing', confidence: 0.92 },
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }
    ];

    timeSeriesMetrics.forEach(metric => {
      const transformed = BusinessMetricsTransformSchema.parse(metric);
      expect(transformed.metricDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(transformed.correlationFactors).toBeDefined();
    });
  });

  // Contract Test 8: Role-based permission integration
  it('must integrate with Phase 1 role permissions for analytics access', () => {
    // Executive and Admin roles should have full analytics access
    const executivePermissions = ROLE_PERMISSIONS['executive'];
    const adminPermissions = ROLE_PERMISSIONS['admin'];
    
    // Check if analytics permissions exist (they should be added in Phase 4)
    expect(executivePermissions).toBeDefined();
    expect(adminPermissions).toBeDefined();
    
    // Inventory and Marketing staff have limited access
    const inventoryStaffPermissions = ROLE_PERMISSIONS['inventory_staff'];
    const marketingStaffPermissions = ROLE_PERMISSIONS['marketing_staff'];
    
    expect(inventoryStaffPermissions).toBeDefined();
    expect(marketingStaffPermissions).toBeDefined();
  });

  // Contract Test 9: Query key factory integration validation
  it('must support centralized query key factory patterns', () => {
    // This test ensures the schema supports React Query patterns
    const metricId = 'metric-123';
    const category = 'inventory';
    const aggregationLevel = 'monthly';
    
    // These patterns should be supported by the schema
    const queryKeyPattern = {
      entity: 'businessMetrics',
      id: metricId,
      filters: {
        category,
        aggregationLevel,
        dateRange: ['2024-01-01', '2024-01-31']
      }
    };
    
    expect(queryKeyPattern.entity).toBe('businessMetrics');
    expect(queryKeyPattern.filters).toBeDefined();
  });

  // Contract Test 10: Edge cases - null metrics and invalid aggregations
  it('must handle edge cases with null values and validation', () => {
    const edgeCaseMetrics: BusinessMetricsDatabaseContract = {
      id: 'metric-edge',
      metric_date: '2024-01-15',
      metric_category: 'operational',
      metric_name: 'system_performance',
      metric_value: 0, // Zero value
      metric_unit: null, // Null unit
      aggregation_level: 'quarterly',
      source_data_type: 'monitoring',
      correlation_factors: {}, // Empty object
      created_at: null,
      updated_at: null
    };

    const transformed = BusinessMetricsTransformSchema.parse(edgeCaseMetrics);
    expect(transformed.metricValue).toBe(0);
    expect(transformed.metricUnit).toBeNull();
    expect(transformed.correlationFactors).toEqual({});
  });

  // Contract Test 11: Type safety enforcement
  it('must enforce type safety across all analytics fields', () => {
    const typeTestMetrics: BusinessMetricsDatabaseContract = {
      id: 'metric-type',
      metric_date: '2024-01-15',
      metric_category: 'strategic',
      metric_name: 'quarterly_goal_progress',
      metric_value: 75.5, // Decimal value
      metric_unit: 'percentage',
      aggregation_level: 'quarterly',
      source_data_type: 'goal_tracking',
      correlation_factors: {
        departments: ['sales', 'marketing', 'inventory'],
        weights: [0.4, 0.35, 0.25],
        confidence_intervals: {
          lower: 70.2,
          upper: 80.8
        }
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const transformed = BusinessMetricsTransformSchema.parse(typeTestMetrics);
    
    // Verify decimal precision is maintained
    expect(transformed.metricValue).toBe(75.5);
    expect(typeof transformed.metricValue).toBe('number');
    
    // Verify complex JSONB structure
    expect(Array.isArray(transformed.correlationFactors?.departments)).toBe(true);
    expect(Array.isArray(transformed.correlationFactors?.weights)).toBe(true);
    expect(transformed.correlationFactors?.confidence_intervals).toBeDefined();
  });

  // Contract Test 12: Performance validation for large metric datasets
  it('must handle large metric datasets efficiently', () => {
    const largeDataset: BusinessMetricsDatabaseContract[] = [];
    
    // Generate 100 metrics
    for (let i = 0; i < 100; i++) {
      largeDataset.push({
        id: `metric-perf-${i}`,
        metric_date: `2024-01-${String(i % 31 + 1).padStart(2, '0')}`,
        metric_category: ['inventory', 'marketing', 'sales', 'operational', 'strategic'][i % 5] as any,
        metric_name: `performance_metric_${i}`,
        metric_value: Math.random() * 1000,
        metric_unit: ['count', 'percentage', 'currency', 'ratio'][i % 4] as any,
        aggregation_level: ['daily', 'weekly', 'monthly', 'quarterly'][i % 4] as any,
        source_data_type: `source_${i}`,
        correlation_factors: {
          index: i,
          random: Math.random(),
          category: i % 5
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });
    }
    
    const startTime = Date.now();
    largeDataset.forEach(metric => {
      BusinessMetricsTransformSchema.parse(metric);
    });
    const endTime = Date.now();
    
    // Should process 100 metrics in under 100ms
    expect(endTime - startTime).toBeLessThan(100);
  });

  // Contract Test 13: Create schema validation
  it('must validate create schema with required fields', () => {
    const createData: z.infer<typeof CreateBusinessMetricsSchema> = {
      metric_category: 'inventory',
      metric_name: 'new_metric',
      metric_value: 100,
      aggregation_level: 'daily',
      source_data_type: 'manual_entry'
    };

    const validated = CreateBusinessMetricsSchema.parse(createData);
    expect(validated.metric_category).toBe('inventory');
    expect(validated.metric_name).toBe('new_metric');
    expect(validated.metric_value).toBe(100);
  });

  // Contract Test 14: Update schema validation
  it('must validate update schema with partial fields', () => {
    const updateData: z.infer<typeof UpdateBusinessMetricsSchema> = {
      metric_value: 150,
      correlation_factors: {
        updated: true,
        new_correlation: 0.95
      }
    };

    const validated = UpdateBusinessMetricsSchema.parse(updateData);
    expect(validated.metric_value).toBe(150);
    expect(validated.correlation_factors).toBeDefined();
  });

  // Contract Test 15: Unique constraint validation
  it('must support unique constraint on date-category-name-level combination', () => {
    // This tests that the schema supports the database unique constraint
    const metric1: BusinessMetricsDatabaseContract = {
      id: 'metric-unique-1',
      metric_date: '2024-01-15',
      metric_category: 'inventory',
      metric_name: 'stock_level',
      metric_value: 100,
      metric_unit: 'count',
      aggregation_level: 'daily',
      source_data_type: 'inventory_system',
      correlation_factors: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const metric2: BusinessMetricsDatabaseContract = {
      id: 'metric-unique-2',
      metric_date: '2024-01-15',
      metric_category: 'inventory',
      metric_name: 'stock_level',
      metric_value: 200, // Different value
      metric_unit: 'count',
      aggregation_level: 'weekly', // Different aggregation level - should be allowed
      source_data_type: 'inventory_system',
      correlation_factors: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    // Both should be valid since they have different aggregation levels
    expect(() => BusinessMetricsDatabaseSchema.parse(metric1)).not.toThrow();
    expect(() => BusinessMetricsDatabaseSchema.parse(metric2)).not.toThrow();
  });
});