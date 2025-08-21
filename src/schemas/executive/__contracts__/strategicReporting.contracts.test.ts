import { describe, it, expect } from '@jest/globals';
import type { MockDatabase } from './database-mock.types';
import { 
  StrategicReportingDatabaseSchema, 
  StrategicReportingTransformSchema,
  CreateStrategicReportingSchema,
  UpdateStrategicReportingSchema,
  type StrategicReportingDatabaseContract,
  type StrategicReportingTransform
} from '../strategicReporting.schemas';
import type { z } from 'zod';

// Phase 1 Integration: Role-based permissions validation
import { ROLE_PERMISSIONS } from '../../role-based/rolePermission.schemas';

// CRITICAL: Compile-time contract enforcement (Pattern from architectural doc)
// This MUST compile - if it doesn't, schema transformation is incomplete
type StrategicReportingContract = z.infer<typeof StrategicReportingTransformSchema> extends StrategicReportingTransform 
  ? StrategicReportingTransform extends z.infer<typeof StrategicReportingTransformSchema> 
    ? true 
    : false 
  : false;

describe('Strategic Reporting Schema Contracts - Phase 4', () => {
  // Contract Test 0: Compile-time contract enforcement (CRITICAL PATTERN)
  it('must pass compile-time contract validation', () => {
    // This test validates that the contract type compiled successfully
    const contractIsValid: StrategicReportingContract = true;
    expect(contractIsValid).toBe(true);
    
    // If this test compiles, the schema-interface alignment is enforced at compile time
    // If the schema transformation doesn't match the interface exactly, TypeScript compilation will fail
  });

  // Contract Test 1: Database interface alignment (MANDATORY)
  it('must align with generated database types', () => {
    type DatabaseStrategicReports = MockDatabase['public']['Tables']['strategic_reports']['Row'];
    
    // This function MUST compile - if it doesn't, schema is wrong
    const contractValidator = (row: DatabaseStrategicReports): StrategicReportingDatabaseContract => {
      return {
        id: row.id,                                       // ✅ Compile fails if missing
        report_name: row.report_name,                     // ✅ Compile fails if missing  
        report_type: row.report_type,                     // ✅ Compile fails if missing
        report_frequency: row.report_frequency,           // ✅ Compile fails if missing
        report_config: row.report_config,                 // ✅ JSONB NOT NULL
        last_generated_at: row.last_generated_at,         // ✅ Nullable timestamp
        next_generation_at: row.next_generation_at,       // ✅ Nullable timestamp
        is_automated: row.is_automated,                   // ✅ Nullable boolean
        created_by: row.created_by,                       // ✅ Nullable UUID reference
        created_at: row.created_at,                       // ✅ Nullable timestamp
        updated_at: row.updated_at                        // ✅ Nullable timestamp
      };
    };
    
    expect(contractValidator).toBeDefined();
  });

  // Contract Test 2: Transformation completeness validation (MANDATORY)
  it('must transform all database fields to interface fields', () => {
    const databaseData: StrategicReportingDatabaseContract = {
      id: 'report-123',
      report_name: 'Executive Monthly Dashboard',
      report_type: 'performance',
      report_frequency: 'monthly',
      report_config: {
        charts: ['revenue_trend', 'inventory_health', 'marketing_performance'],
        metrics: ['roi', 'turnover', 'conversion'],
        filters: { date_range: 'last_30_days' }
      },
      last_generated_at: '2024-01-01T00:00:00Z',
      next_generation_at: '2024-02-01T00:00:00Z',
      is_automated: true,
      created_by: 'user-456',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const transformed = StrategicReportingTransformSchema.parse(databaseData);
    
    // Verify EVERY interface field is populated (camelCase conversion)
    expect(transformed.id).toBe('report-123');
    expect(transformed.reportName).toBe('Executive Monthly Dashboard');  // Snake → camel
    expect(transformed.reportType).toBe('performance');                  // Snake → camel
    expect(transformed.reportFrequency).toBe('monthly');                 // Snake → camel
    expect(transformed.reportConfig).toBeDefined();                      // Snake → camel
    expect(transformed.lastGeneratedAt).toBeDefined();                   // Snake → camel
    expect(transformed.nextGenerationAt).toBeDefined();                  // Snake → camel
    expect(transformed.isAutomated).toBe(true);                          // Snake → camel
    expect(transformed.createdBy).toBe('user-456');                      // Snake → camel
    expect(transformed.createdAt).toBeDefined();                         // Snake → camel
    expect(transformed.updatedAt).toBeDefined();                         // Snake → camel
    
    // Verify types are correct
    expect(typeof transformed.isAutomated).toBe('boolean');
    expect(typeof transformed.reportConfig).toBe('object');
    expect(Array.isArray(transformed.reportConfig.charts)).toBe(true);
  });

  // Contract Test 3: Report configuration JSONB validation
  it('must validate report configuration JSONB with structure enforcement', () => {
    const complexReportConfig: StrategicReportingDatabaseContract = {
      id: 'report-456',
      report_name: 'Quarterly Business Forecast',
      report_type: 'forecast',
      report_frequency: 'quarterly',
      report_config: {
        models: ['demand_forecast', 'revenue_projection'],
        confidence_levels: [0.8, 0.9, 0.95],
        scenarios: ['conservative', 'optimistic', 'pessimistic'],
        data_sources: {
          inventory: {
            tables: ['inventory_items', 'stock_movements'],
            date_range: 'last_12_months',
            filters: { is_active: true }
          },
          marketing: {
            tables: ['campaign_performance', 'content_analytics'],
            date_range: 'last_6_months',
            filters: { campaign_status: 'completed' }
          },
          sales: {
            tables: ['orders', 'order_items'],
            date_range: 'last_24_months',
            filters: { status: 'completed' }
          }
        },
        output_format: {
          charts: ['forecast_trend', 'confidence_bands', 'scenario_comparison'],
          tables: ['monthly_projections', 'key_metrics'],
          export_formats: ['pdf', 'excel', 'json'],
          email_distribution: ['exec@company.com', 'admin@company.com']
        },
        scheduling: {
          timezone: 'America/New_York',
          generation_day: 'last_friday',
          notification_settings: {
            on_completion: true,
            on_failure: true,
            include_preview: true
          }
        }
      },
      last_generated_at: '2023-10-01T00:00:00Z',
      next_generation_at: '2024-01-01T00:00:00Z',
      is_automated: true,
      created_by: 'exec-user-789',
      created_at: '2023-09-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const transformed = StrategicReportingTransformSchema.parse(complexReportConfig);
    
    expect(transformed.reportConfig.models).toHaveLength(2);
    expect(transformed.reportConfig.confidence_levels).toEqual([0.8, 0.9, 0.95]);
    expect(transformed.reportConfig.data_sources.inventory).toBeDefined();
    expect(transformed.reportConfig.data_sources.marketing).toBeDefined();
    expect(transformed.reportConfig.data_sources.sales).toBeDefined();
    expect(transformed.reportConfig.output_format.export_formats).toContain('pdf');
    expect(transformed.reportConfig.scheduling.timezone).toBe('America/New_York');
  });

  // Contract Test 4: Report frequency and automation constraint validation
  it('must enforce report frequency and automation constraints', () => {
    const validFrequencies: Array<StrategicReportingDatabaseContract['report_frequency']> = 
      ['daily', 'weekly', 'monthly', 'quarterly', 'on_demand'];
    
    validFrequencies.forEach(frequency => {
      const reportData: StrategicReportingDatabaseContract = {
        id: `report-${frequency}`,
        report_name: `${frequency} report test`,
        report_type: 'performance',
        report_frequency: frequency,
        report_config: {
          basic_config: true,
          frequency_specific: frequency
        },
        last_generated_at: null,
        next_generation_at: null,
        is_automated: frequency !== 'on_demand', // on_demand should not be automated
        created_by: 'test-user',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      expect(() => StrategicReportingDatabaseSchema.parse(reportData)).not.toThrow();
    });
  });

  // Contract Test 5: Report generation scheduling validation
  it('must validate report generation scheduling and timing', () => {
    const scheduledReport: StrategicReportingDatabaseContract = {
      id: 'report-scheduled',
      report_name: 'Weekly Performance Report',
      report_type: 'performance',
      report_frequency: 'weekly',
      report_config: {
        metrics: ['weekly_sales', 'inventory_turnover', 'marketing_roi'],
        schedule: {
          day_of_week: 'monday',
          time: '09:00',
          timezone: 'UTC'
        },
        automation: {
          enabled: true,
          retry_on_failure: true,
          max_retries: 3,
          notification_emails: ['manager@company.com']
        }
      },
      last_generated_at: '2024-01-08T09:00:00Z',
      next_generation_at: '2024-01-15T09:00:00Z',
      is_automated: true,
      created_by: 'scheduler-system',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-08T09:05:00Z'
    };

    const transformed = StrategicReportingTransformSchema.parse(scheduledReport);
    
    expect(transformed.isAutomated).toBe(true);
    expect(transformed.lastGeneratedAt).toBeDefined();
    expect(transformed.nextGenerationAt).toBeDefined();
    expect(transformed.reportConfig.schedule).toBeDefined();
    expect(transformed.reportConfig.automation.enabled).toBe(true);
  });

  // Contract Test 6: Cross-role report access control validation
  it('must support cross-role report access control patterns', () => {
    const execOnlyReport: StrategicReportingDatabaseContract = {
      id: 'report-exec-only',
      report_name: 'Executive Strategic Analysis',
      report_type: 'strategic',
      report_frequency: 'quarterly',
      report_config: {
        access_control: {
          required_roles: ['executive', 'admin'],
          restricted_sections: ['financial_projections', 'strategic_initiatives'],
          classification: 'confidential'
        },
        data_sensitivity: 'high',
        content_sections: [
          'business_overview',
          'financial_performance',
          'strategic_initiatives',
          'risk_assessment',
          'market_analysis'
        ]
      },
      last_generated_at: null,
      next_generation_at: '2024-04-01T00:00:00Z',
      is_automated: false,
      created_by: 'ceo-user',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const staffAccessibleReport: StrategicReportingDatabaseContract = {
      id: 'report-staff-accessible',
      report_name: 'Daily Operations Summary',
      report_type: 'performance',
      report_frequency: 'daily',
      report_config: {
        access_control: {
          required_roles: ['inventory_staff', 'marketing_staff', 'admin', 'executive'],
          public_sections: ['daily_metrics', 'operational_status'],
          classification: 'internal'
        },
        data_sensitivity: 'medium',
        content_sections: [
          'inventory_status',
          'marketing_metrics',
          'operational_alerts'
        ]
      },
      last_generated_at: '2024-01-15T06:00:00Z',
      next_generation_at: '2024-01-16T06:00:00Z',
      is_automated: true,
      created_by: 'system-automation',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T06:05:00Z'
    };

    const execTransformed = StrategicReportingTransformSchema.parse(execOnlyReport);
    const staffTransformed = StrategicReportingTransformSchema.parse(staffAccessibleReport);
    
    expect(execTransformed.reportConfig.access_control.required_roles).toContain('executive');
    expect(execTransformed.reportConfig.classification).toBe('confidential');
    expect(staffTransformed.reportConfig.access_control.required_roles).toContain('inventory_staff');
    expect(staffTransformed.reportConfig.classification).toBe('internal');
  });

  // Contract Test 7: Report type constraint validation
  it('must enforce report type constraints', () => {
    const validReportTypes: Array<StrategicReportingDatabaseContract['report_type']> = 
      ['performance', 'forecast', 'correlation', 'strategic'];
    
    validReportTypes.forEach(reportType => {
      const reportData: StrategicReportingDatabaseContract = {
        id: `report-type-${reportType}`,
        report_name: `${reportType} report test`,
        report_type: reportType,
        report_frequency: 'monthly',
        report_config: {
          type_specific_config: reportType,
          charts: [`${reportType}_chart`],
          metrics: [`${reportType}_metric`]
        },
        last_generated_at: null,
        next_generation_at: null,
        is_automated: false,
        created_by: 'test-user',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      expect(() => StrategicReportingDatabaseSchema.parse(reportData)).not.toThrow();
    });
  });

  // Contract Test 8: Multi-format export integration
  it('must support multi-format export integration with performance optimization', () => {
    const multiFormatReport: StrategicReportingDatabaseContract = {
      id: 'report-multi-format',
      report_name: 'Comprehensive Business Report',
      report_type: 'correlation',
      report_frequency: 'monthly',
      report_config: {
        export_formats: {
          pdf: {
            enabled: true,
            template: 'executive_template',
            page_orientation: 'landscape',
            include_charts: true,
            watermark: 'CONFIDENTIAL'
          },
          excel: {
            enabled: true,
            include_raw_data: true,
            pivot_tables: ['monthly_summary', 'trend_analysis'],
            charts: ['trend_chart', 'correlation_matrix']
          },
          json: {
            enabled: true,
            pretty_print: false,
            include_metadata: true,
            compression: 'gzip'
          },
          csv: {
            enabled: true,
            delimiter: ',',
            include_headers: true,
            separate_files_per_dataset: true
          }
        },
        performance_optimization: {
          cache_duration_hours: 24,
          parallel_processing: true,
          chunk_size: 1000,
          memory_limit_mb: 512
        }
      },
      last_generated_at: '2024-01-01T00:00:00Z',
      next_generation_at: '2024-02-01T00:00:00Z',
      is_automated: true,
      created_by: 'report-service',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const transformed = StrategicReportingTransformSchema.parse(multiFormatReport);
    
    expect(transformed.reportConfig.export_formats.pdf.enabled).toBe(true);
    expect(transformed.reportConfig.export_formats.excel.pivot_tables).toHaveLength(2);
    expect(transformed.reportConfig.export_formats.json.compression).toBe('gzip');
    expect(transformed.reportConfig.performance_optimization.parallel_processing).toBe(true);
  });

  // Contract Test 9: Report integration with metrics and intelligence services
  it('must integrate with metrics and intelligence services for comprehensive reporting', () => {
    const integratedReport: StrategicReportingDatabaseContract = {
      id: 'report-integrated',
      report_name: 'Cross-System Analytics Report',
      report_type: 'correlation',
      report_frequency: 'weekly',
      report_config: {
        data_integration: {
          business_metrics: {
            categories: ['inventory', 'marketing', 'sales'],
            aggregation_levels: ['daily', 'weekly'],
            correlation_analysis: true
          },
          business_insights: {
            insight_types: ['correlation', 'trend', 'anomaly'],
            impact_levels: ['medium', 'high', 'critical'],
            include_recommendations: true
          },
          predictive_forecasts: {
            forecast_types: ['demand', 'revenue'],
            confidence_threshold: 0.8,
            include_confidence_intervals: true
          }
        },
        report_sections: {
          executive_summary: {
            include_kpis: true,
            highlight_anomalies: true,
            action_items: true
          },
          detailed_analysis: {
            correlation_matrices: true,
            trend_analysis: true,
            forecast_projections: true
          },
          recommendations: {
            automated_insights: true,
            strategic_suggestions: true,
            implementation_priorities: true
          }
        }
      },
      last_generated_at: '2024-01-08T00:00:00Z',
      next_generation_at: '2024-01-15T00:00:00Z',
      is_automated: true,
      created_by: 'analytics-engine',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-08T00:05:00Z'
    };

    const transformed = StrategicReportingTransformSchema.parse(integratedReport);
    
    expect(transformed.reportConfig.data_integration.business_metrics).toBeDefined();
    expect(transformed.reportConfig.data_integration.business_insights).toBeDefined();
    expect(transformed.reportConfig.data_integration.predictive_forecasts).toBeDefined();
    expect(transformed.reportConfig.report_sections.executive_summary.include_kpis).toBe(true);
  });

  // Contract Test 10: Create schema validation
  it('must validate create schema with required report fields', () => {
    const createData: z.infer<typeof CreateStrategicReportingSchema> = {
      report_name: 'New Strategic Report',
      report_type: 'performance',
      report_frequency: 'monthly',
      report_config: {
        charts: ['revenue', 'growth'],
        metrics: ['roi', 'efficiency'],
        automated: true
      }
    };

    const validated = CreateStrategicReportingSchema.parse(createData);
    expect(validated.report_name).toBe('New Strategic Report');
    expect(validated.report_type).toBe('performance');
    expect(validated.report_config.automated).toBe(true);
  });
});