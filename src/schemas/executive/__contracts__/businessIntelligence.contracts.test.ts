import { describe, it, expect } from '@jest/globals';
import type { MockDatabase } from './database-mock.types';
import { 
  BusinessIntelligenceDatabaseSchema, 
  BusinessIntelligenceTransformSchema,
  CreateBusinessIntelligenceSchema,
  UpdateBusinessIntelligenceSchema,
  type BusinessIntelligenceDatabaseContract,
  type BusinessIntelligenceTransform
} from '../businessIntelligence.schemas';
import type { z } from 'zod';

// Phase 1 Integration: Role-based permissions validation
import { ROLE_PERMISSIONS } from '../../role-based/rolePermission.schemas';

// CRITICAL: Compile-time contract enforcement (Pattern from architectural doc)
// This MUST compile - if it doesn't, schema transformation is incomplete
type BusinessIntelligenceContract = z.infer<typeof BusinessIntelligenceTransformSchema> extends BusinessIntelligenceTransform 
  ? BusinessIntelligenceTransform extends z.infer<typeof BusinessIntelligenceTransformSchema> 
    ? true 
    : false 
  : false;

describe('Business Intelligence Schema Contracts - Phase 4', () => {
  // Contract Test 0: Compile-time contract enforcement (CRITICAL PATTERN)
  it('must pass compile-time contract validation', () => {
    // This test validates that the contract type compiled successfully
    const contractIsValid: BusinessIntelligenceContract = true;
    expect(contractIsValid).toBe(true);
    
    // If this test compiles, the schema-interface alignment is enforced at compile time
    // If the schema transformation doesn't match the interface exactly, TypeScript compilation will fail
  });

  // Contract Test 1: Database interface alignment (MANDATORY)
  it('must align with generated database types', () => {
    type DatabaseBusinessIntelligence = MockDatabase['public']['Tables']['business_insights']['Row'];
    
    // This function MUST compile - if it doesn't, schema is wrong
    const contractValidator = (row: DatabaseBusinessIntelligence): BusinessIntelligenceDatabaseContract => {
      return {
        id: row.id,                                       // ✅ Compile fails if missing
        insight_type: row.insight_type,                   // ✅ Compile fails if missing  
        insight_title: row.insight_title,                 // ✅ Compile fails if missing
        insight_description: row.insight_description,     // ✅ Compile fails if missing
        confidence_score: row.confidence_score,           // ✅ Nullable decimal
        impact_level: row.impact_level,                   // ✅ Compile fails if missing
        affected_areas: row.affected_areas,               // ✅ TEXT[] array
        supporting_data: row.supporting_data,             // ✅ JSONB nullable
        recommendation_actions: row.recommendation_actions, // ✅ TEXT[] array
        insight_date_range: row.insight_date_range,       // ✅ DATERANGE as string
        generated_by: row.generated_by,                   // ✅ Compile fails if missing
        is_active: row.is_active,                         // ✅ Nullable boolean
        created_at: row.created_at,                       // ✅ Nullable timestamp
        updated_at: row.updated_at                        // ✅ Nullable timestamp
      };
    };
    
    expect(contractValidator).toBeDefined();
  });

  // Contract Test 2: Transformation completeness validation (MANDATORY)
  it('must transform all database fields to interface fields', () => {
    const databaseData: BusinessIntelligenceDatabaseContract = {
      id: 'insight-123',
      insight_type: 'correlation',
      insight_title: 'Strong Inventory-Marketing Correlation',
      insight_description: 'Marketing campaigns show 78% correlation with inventory availability.',
      confidence_score: 0.92,
      impact_level: 'high',
      affected_areas: ['inventory', 'marketing'],
      supporting_data: {
        correlation_strength: 0.78,
        sample_size: 150,
        statistical_significance: 0.95
      },
      recommendation_actions: ['Implement inventory-marketing sync meetings', 'Create campaign-inventory dashboard'],
      insight_date_range: '[2024-01-01,2024-01-31)',
      generated_by: 'system',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const transformed = BusinessIntelligenceTransformSchema.parse(databaseData);
    
    // Verify EVERY interface field is populated (camelCase conversion)
    expect(transformed.id).toBe('insight-123');
    expect(transformed.insightType).toBe('correlation');             // Snake → camel
    expect(transformed.insightTitle).toBe('Strong Inventory-Marketing Correlation'); // Snake → camel
    expect(transformed.insightDescription).toContain('78% correlation'); // Snake → camel
    expect(transformed.confidenceScore).toBe(0.92);                  // Snake → camel
    expect(transformed.impactLevel).toBe('high');                    // Snake → camel
    expect(transformed.affectedAreas).toEqual(['inventory', 'marketing']); // Snake → camel
    expect(transformed.supportingData).toBeDefined();                // Snake → camel
    expect(transformed.recommendationActions).toHaveLength(2);       // Snake → camel
    expect(transformed.insightDateRange).toBe('[2024-01-01,2024-01-31)'); // Snake → camel
    expect(transformed.generatedBy).toBe('system');                  // Snake → camel
    expect(transformed.isActive).toBe(true);                         // Snake → camel
    expect(transformed.createdAt).toBeDefined();                     // Snake → camel
    expect(transformed.updatedAt).toBeDefined();                     // Snake → camel
    
    // Verify types are correct
    expect(typeof transformed.confidenceScore).toBe('number');
    expect(Array.isArray(transformed.affectedAreas)).toBe(true);
    expect(typeof transformed.supportingData).toBe('object');
    expect(Array.isArray(transformed.recommendationActions)).toBe(true);
  });

  // Contract Test 3: Insight generation schema validation with confidence scoring
  it('must validate insight generation with confidence scoring', () => {
    const insightWithHighConfidence: BusinessIntelligenceDatabaseContract = {
      id: 'insight-456',
      insight_type: 'trend',
      insight_title: 'Declining Stock Turnover Rate',
      insight_description: 'Stock turnover rate has decreased by 15% over the last quarter.',
      confidence_score: 0.87,
      impact_level: 'medium',
      affected_areas: ['inventory', 'sales'],
      supporting_data: {
        trend_direction: 'declining',
        rate_change: -0.15,
        confidence_interval: [0.82, 0.92],
        data_points: 90,
        r_squared: 0.84
      },
      recommendation_actions: ['Review demand forecasting models', 'Analyze slow-moving inventory'],
      insight_date_range: '[2023-10-01,2024-01-31)',
      generated_by: 'system',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const transformed = BusinessIntelligenceTransformSchema.parse(insightWithHighConfidence);
    
    expect(transformed.confidenceScore).toBeGreaterThan(0.8);
    expect(transformed.supportingData?.confidence_interval).toBeDefined();
    expect(transformed.supportingData?.r_squared).toBe(0.84);
  });

  // Contract Test 4: Cross-role insight correlation validation
  it('must validate cross-role insight correlation and data structure enforcement', () => {
    const crossRoleInsight: BusinessIntelligenceDatabaseContract = {
      id: 'insight-789',
      insight_type: 'correlation',
      insight_title: 'Marketing Campaign Impact on Inventory Levels',
      insight_description: 'Promotional campaigns correlate with 65% increase in specific product demand.',
      confidence_score: 0.89,
      impact_level: 'high',
      affected_areas: ['marketing', 'inventory', 'sales'],
      supporting_data: {
        correlation_matrix: {
          'marketing_spend': {
            'inventory_movement': 0.72,
            'sales_volume': 0.85,
            'customer_acquisition': 0.78
          }
        },
        campaign_analysis: {
          campaigns_analyzed: 25,
          date_range: '2023-10-01 to 2024-01-31',
          product_categories: ['fresh', 'organic', 'seasonal'],
          statistical_tests: {
            pearson_correlation: 0.72,
            spearman_correlation: 0.68,
            p_value: 0.001
          }
        }
      },
      recommendation_actions: [
        'Coordinate marketing campaigns with inventory planning',
        'Implement real-time inventory alerts for marketing team',
        'Develop predictive stocking based on campaign schedules'
      ],
      insight_date_range: '[2023-10-01,2024-01-31)',
      generated_by: 'system',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const transformed = BusinessIntelligenceTransformSchema.parse(crossRoleInsight);
    
    expect(transformed.affectedAreas).toContain('marketing');
    expect(transformed.affectedAreas).toContain('inventory');
    expect(transformed.affectedAreas).toContain('sales');
    expect(transformed.supportingData?.correlation_matrix).toBeDefined();
    expect(transformed.supportingData?.campaign_analysis).toBeDefined();
    expect(transformed.recommendationActions).toHaveLength(3);
  });

  // Contract Test 5: Recommendation action validation and format consistency
  it('must validate recommendation actions and format consistency', () => {
    const insightWithRecommendations: BusinessIntelligenceDatabaseContract = {
      id: 'insight-recommendations',
      insight_type: 'recommendation',
      insight_title: 'Optimize Inventory Reorder Points',
      insight_description: 'Analysis suggests adjusting reorder points for 15 products.',
      confidence_score: 0.91,
      impact_level: 'high',
      affected_areas: ['inventory'],
      supporting_data: {
        products_analyzed: 150,
        recommended_adjustments: 15,
        potential_savings: 12000,
        implementation_complexity: 'medium'
      },
      recommendation_actions: [
        'Adjust reorder points for high-turnover products',
        'Implement automated reorder triggers',
        'Review supplier lead times quarterly',
        'Monitor stock-out incidents weekly'
      ],
      insight_date_range: '[2024-01-01,2024-01-31)',
      generated_by: 'system',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const transformed = BusinessIntelligenceTransformSchema.parse(insightWithRecommendations);
    
    expect(transformed.recommendationActions).toHaveLength(4);
    expect(transformed.recommendationActions.every(action => typeof action === 'string')).toBe(true);
    expect(transformed.supportingData?.potential_savings).toBe(12000);
  });

  // Contract Test 6: Impact level and confidence score constraint validation
  it('must enforce impact level and confidence score constraints', () => {
    const validImpactLevels: Array<BusinessIntelligenceDatabaseContract['impact_level']> = 
      ['low', 'medium', 'high', 'critical'];
    
    validImpactLevels.forEach(impactLevel => {
      const insightData: BusinessIntelligenceDatabaseContract = {
        id: `insight-${impactLevel}`,
        insight_type: 'anomaly',
        insight_title: `${impactLevel} impact insight`,
        insight_description: `Testing ${impactLevel} impact level validation.`,
        confidence_score: 0.75,
        impact_level: impactLevel,
        affected_areas: ['inventory'],
        supporting_data: { test: true },
        recommendation_actions: ['Test action'],
        insight_date_range: '[2024-01-01,2024-01-31)',
        generated_by: 'system',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      expect(() => BusinessIntelligenceDatabaseSchema.parse(insightData)).not.toThrow();
    });

    // Test confidence score boundaries
    const confidenceScores = [0.00, 0.50, 0.99, 1.00];
    confidenceScores.forEach(score => {
      const insightData: BusinessIntelligenceDatabaseContract = {
        id: `insight-conf-${score}`,
        insight_type: 'trend',
        insight_title: 'Confidence score test',
        insight_description: 'Testing confidence score validation.',
        confidence_score: score,
        impact_level: 'medium',
        affected_areas: ['sales'],
        supporting_data: null,
        recommendation_actions: [],
        insight_date_range: '[2024-01-01,2024-01-31)',
        generated_by: 'system',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      expect(() => BusinessIntelligenceDatabaseSchema.parse(insightData)).not.toThrow();
    });
  });

  // Contract Test 7: Supporting data JSONB structure validation
  it('must validate supporting data JSONB structure and handle complex nested data', () => {
    const complexSupportingData: BusinessIntelligenceDatabaseContract = {
      id: 'insight-complex-data',
      insight_type: 'correlation',
      insight_title: 'Multi-dimensional Business Correlation',
      insight_description: 'Complex analysis across multiple business dimensions.',
      confidence_score: 0.94,
      impact_level: 'critical',
      affected_areas: ['inventory', 'marketing', 'sales', 'operational'],
      supporting_data: {
        analysis_metadata: {
          algorithm: 'multivariate_correlation',
          version: '2.1.0',
          execution_time_ms: 1250,
          data_sources: ['inventory_db', 'marketing_platform', 'sales_crm']
        },
        correlation_results: {
          primary_correlations: [
            { variables: ['inventory_turnover', 'marketing_spend'], correlation: 0.82, p_value: 0.001 },
            { variables: ['sales_volume', 'campaign_reach'], correlation: 0.76, p_value: 0.003 }
          ],
          secondary_correlations: [
            { variables: ['customer_satisfaction', 'inventory_availability'], correlation: 0.69, p_value: 0.012 }
          ]
        },
        statistical_validation: {
          sample_size: 500,
          degrees_of_freedom: 498,
          adjusted_r_squared: 0.89,
          f_statistic: 234.5,
          residual_analysis: {
            normality_test: 'passed',
            heteroscedasticity_test: 'passed',
            durbin_watson: 1.95
          }
        }
      },
      recommendation_actions: [
        'Implement cross-department correlation monitoring',
        'Establish automated alert system for correlation changes',
        'Create executive dashboard for correlation insights'
      ],
      insight_date_range: '[2023-07-01,2024-01-31)',
      generated_by: 'advanced_analytics_engine',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const transformed = BusinessIntelligenceTransformSchema.parse(complexSupportingData);
    
    expect(transformed.supportingData?.analysis_metadata).toBeDefined();
    expect(transformed.supportingData?.correlation_results).toBeDefined();
    expect(transformed.supportingData?.statistical_validation).toBeDefined();
    expect(transformed.supportingData?.correlation_results.primary_correlations).toHaveLength(2);
    expect(transformed.supportingData?.statistical_validation.adjusted_r_squared).toBe(0.89);
  });

  // Contract Test 8: Insight lifecycle management (active/inactive states)
  it('must validate insight lifecycle management and status transitions', () => {
    const activeInsight: BusinessIntelligenceDatabaseContract = {
      id: 'insight-active',
      insight_type: 'trend',
      insight_title: 'Active Trend Analysis',
      insight_description: 'Currently relevant trend insight.',
      confidence_score: 0.85,
      impact_level: 'medium',
      affected_areas: ['sales'],
      supporting_data: { status: 'active', last_validated: '2024-01-15' },
      recommendation_actions: ['Monitor trend continuation'],
      insight_date_range: '[2024-01-01,2024-01-31)',
      generated_by: 'system',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z'
    };

    const inactiveInsight: BusinessIntelligenceDatabaseContract = {
      id: 'insight-inactive',
      insight_type: 'anomaly',
      insight_title: 'Resolved Anomaly',
      insight_description: 'Previously detected anomaly that has been resolved.',
      confidence_score: 0.82,
      impact_level: 'low',
      affected_areas: ['operational'],
      supporting_data: { status: 'resolved', resolution_date: '2024-01-10' },
      recommendation_actions: ['Archive for historical reference'],
      insight_date_range: '[2023-12-01,2023-12-31)',
      generated_by: 'system',
      is_active: false,
      created_at: '2023-12-01T00:00:00Z',
      updated_at: '2024-01-10T00:00:00Z'
    };

    const activeTransformed = BusinessIntelligenceTransformSchema.parse(activeInsight);
    const inactiveTransformed = BusinessIntelligenceTransformSchema.parse(inactiveInsight);
    
    expect(activeTransformed.isActive).toBe(true);
    expect(inactiveTransformed.isActive).toBe(false);
    expect(activeTransformed.supportingData?.status).toBe('active');
    expect(inactiveTransformed.supportingData?.status).toBe('resolved');
  });

  // Contract Test 9: Type safety for all business intelligence fields
  it('must enforce type safety across all business intelligence fields', () => {
    const typeTestInsight: BusinessIntelligenceDatabaseContract = {
      id: 'insight-type-test',
      insight_type: 'recommendation',
      insight_title: 'Type Safety Validation Insight',
      insight_description: 'Testing comprehensive type safety enforcement.',
      confidence_score: 0.95,
      impact_level: 'critical',
      affected_areas: ['strategic'],
      supporting_data: {
        numeric_values: [1.5, 2.7, 3.9],
        boolean_flags: { validated: true, automated: false },
        nested_objects: {
          level1: {
            level2: {
              value: 'deep_nested_string',
              count: 42
            }
          }
        },
        null_value: null,
        empty_array: [],
        empty_object: {}
      },
      recommendation_actions: ['Implement strategic optimization', 'Monitor critical metrics'],
      insight_date_range: '[2024-01-01,2024-01-31)',
      generated_by: 'type_validator',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const transformed = BusinessIntelligenceTransformSchema.parse(typeTestInsight);
    
    // Verify complex type preservation
    expect(Array.isArray(transformed.supportingData?.numeric_values)).toBe(true);
    expect(transformed.supportingData?.boolean_flags.validated).toBe(true);
    expect(transformed.supportingData?.nested_objects.level1.level2.value).toBe('deep_nested_string');
    expect(transformed.supportingData?.null_value).toBeNull();
    expect(Array.isArray(transformed.supportingData?.empty_array)).toBe(true);
    expect(typeof transformed.supportingData?.empty_object).toBe('object');
  });

  // Contract Test 10: Insight type constraint validation
  it('must enforce insight type constraints', () => {
    const validInsightTypes: Array<BusinessIntelligenceDatabaseContract['insight_type']> = 
      ['correlation', 'trend', 'anomaly', 'recommendation'];
    
    validInsightTypes.forEach(insightType => {
      const insightData: BusinessIntelligenceDatabaseContract = {
        id: `insight-${insightType}`,
        insight_type: insightType,
        insight_title: `${insightType} insight test`,
        insight_description: `Testing ${insightType} insight type validation.`,
        confidence_score: 0.80,
        impact_level: 'medium',
        affected_areas: ['inventory'],
        supporting_data: { type: insightType },
        recommendation_actions: [`Action for ${insightType}`],
        insight_date_range: '[2024-01-01,2024-01-31)',
        generated_by: 'system',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      expect(() => BusinessIntelligenceDatabaseSchema.parse(insightData)).not.toThrow();
    });
  });

  // Contract Test 11: Create schema validation
  it('must validate create schema with required insight fields', () => {
    const createData: z.infer<typeof CreateBusinessIntelligenceSchema> = {
      insight_type: 'correlation',
      insight_title: 'New Insight',
      insight_description: 'Testing create schema validation.',
      confidence_score: 0.85,
      impact_level: 'high',
      affected_areas: ['inventory', 'marketing'],
      insight_date_range: '[2024-01-01,2024-01-31)'
    };

    const validated = CreateBusinessIntelligenceSchema.parse(createData);
    expect(validated.insight_type).toBe('correlation');
    expect(validated.insight_title).toBe('New Insight');
    expect(validated.affected_areas).toHaveLength(2);
  });

  // Contract Test 12: Update schema validation
  it('must validate update schema with partial insight fields', () => {
    const updateData: z.infer<typeof UpdateBusinessIntelligenceSchema> = {
      confidence_score: 0.88,
      is_active: false,
      supporting_data: {
        updated: true,
        revision: 2
      }
    };

    const validated = UpdateBusinessIntelligenceSchema.parse(updateData);
    expect(validated.confidence_score).toBe(0.88);
    expect(validated.is_active).toBe(false);
    expect(validated.supporting_data?.updated).toBe(true);
  });
});