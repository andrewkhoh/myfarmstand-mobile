import { SimplifiedSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { createUser, resetAllFactories } from '../../../test/factories';
import { StrategicReportingService } from '../strategicReportingService';

// Mock ValidationMonitor
jest.mock('../../../utils/validationMonitor');
const { ValidationMonitor } = require('../../../utils/validationMonitor');

// Mock Supabase
jest.mock('../../../config/supabase', () => ({
  supabase: null // Will be set in beforeEach
}));

describe('StrategicReportingService', () => {
  let supabaseMock: SimplifiedSupabaseMock;
  const testUser = createUser();
  
  beforeEach(() => {
    jest.clearAllMocks();
    resetAllFactories();
    
    // Create and inject mock
    supabaseMock = new SimplifiedSupabaseMock();
    require('../../../config/supabase').supabase = supabaseMock.createClient();
  });
  
  // Helper function to create complete strategic report data
  const createMockReport = (overrides: Partial<any> = {}) => ({
    id: `report-${Math.random().toString(36).substr(2, 9)}`,
    report_name: 'Test Strategic Report',
    report_type: 'performance',
    report_frequency: 'monthly',
    report_config: {
      metrics: ['revenue', 'inventory_turnover', 'marketing_roi'],
      chart_types: ['line', 'bar', 'pie'],
      filters: { date_range: '30_days', departments: ['all'] },
      access_control: { min_role: 'executive', classification: 'confidential' }
    },
    last_generated_at: '2024-01-15T10:00:00Z',
    next_generation_at: '2024-02-15T10:00:00Z',
    is_automated: true,
    created_by: 'user-executive-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  });

  afterEach(() => {
    jest.clearAllMocks();
  });


  // Debug test to verify basic mocking
  it('should verify supabase mock is working', async () => {
    const testData = [{ id: 'test-123', report_type: 'performance' }];
    supabaseMock.setTableData('strategic_reports', testData);
    
    // Direct call to verify mock
    const { supabase } = require('../../../config/supabase');
    const mockResult = await supabase.from('strategic_reports').select('*').order('id');
    
    expect(mockResult.data).toEqual(testData);
  });

  describe('generateReport', () => {
    it('should generate dynamic report with data aggregation', async () => {
      // Mock report generation data
      const mockReportData = [
        createMockReport({
          id: 'report-1',
          report_type: 'performance',
          report_config: {
            metrics: ['revenue', 'inventory_turnover', 'customer_acquisition'],
            data_sources: ['sales', 'inventory', 'marketing'],
            aggregation_level: 'monthly'
          }
        })
      ];

      supabaseMock.setTableData('strategic_reports', mockReportData);

      const result = await StrategicReportingService.generateReport(
        'report-1',
        {
          date_range: '2024-01-01,2024-01-31',
          include_charts: true,
          export_format: 'pdf'
        }
      );

      expect(result.reportData).toBeDefined();
      expect(result.reportMetadata.reportType).toBe('performance');
      expect(result.generatedAt).toBeDefined();
      expect(result.exportFormat).toBe('pdf');
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should handle complex report generation with multiple data sources', async () => {
      const mockComplexReport = [
        createMockReport({
          id: 'complex-report-1',
          report_type: 'strategic',
          report_config: {
            metrics: ['cross_role_correlation', 'predictive_insights', 'performance_trends'],
            data_sources: ['business_metrics', 'business_insights', 'predictive_forecasts'],
            visualization: {
              dashboard_layout: 'executive',
              chart_types: ['correlation_matrix', 'trend_analysis', 'forecast_visualization']
            }
          }
        })
      ];

      supabaseMock.setTableData('strategic_reports', mockComplexReport);

      const result = await StrategicReportingService.generateReport(
        'complex-report-1',
        {
          include_predictive_analytics: true,
          include_cross_role_correlation: true,
          detail_level: 'comprehensive'
        }
      );

      expect(result.reportData.crossRoleAnalysis).toBeDefined();
      expect(result.reportData.predictiveInsights).toBeDefined();
      expect(result.reportData.performanceTrends).toBeDefined();
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('scheduleReport', () => {
    it('should schedule automated report generation and delivery', async () => {
      const mockScheduledReport = [
        createMockReport({
          id: 'scheduled-1',
          report_frequency: 'weekly',
          is_automated: true,
          next_generation_at: '2024-01-22T09:00:00Z',
          report_config: {
            automation: {
              delivery_method: 'email',
              recipients: ['executive@company.com'],
              notification_settings: { send_summary: true }
            }
          }
        })
      ];

      supabaseMock.setTableData('strategic_reports', mockScheduledReport);

      const result = await StrategicReportingService.scheduleReport(
        'scheduled-1',
        {
          frequency: 'weekly',
          delivery_method: 'email',
          recipients: ['executive@company.com'],
          start_date: '2024-01-15T09:00:00Z'
        }
      );

      expect(result.isAutomated).toBe(true);
      expect(result.nextGenerationAt).toBeDefined();
      expect(result.reportFrequency).toBe('weekly');
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should validate scheduling permissions and configuration', async () => {
      // Set up empty table data to simulate no permission
      supabaseMock.setTableData('strategic_reports', []);
      supabaseMock.queueError(new Error('Insufficient permissions for report scheduling'));

      await expect(
        StrategicReportingService.scheduleReport(
          'restricted-report-1',
          { frequency: 'daily' },
          { user_role: 'inventory_staff' }
        )
      ).rejects.toThrow('Insufficient permissions for report scheduling');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('getReportData', () => {
    it('should get report data with role-based filtering and formatting', async () => {
      const mockReportDataResults = [
        createMockReport({
          id: 'data-report-1',
          report_config: {
            role_filtering: {
              executive: ['all_metrics'],
              admin: ['all_metrics', 'system_metrics'],
              inventory_staff: ['inventory_metrics_only'],
              marketing_staff: ['marketing_metrics_only']
            }
          }
        })
      ];

      supabaseMock.setTableData('strategic_reports', mockReportDataResults);

      const result = await StrategicReportingService.getReportData(
        'data-report-1',
        {
          user_role: 'executive',
          format: 'json',
          include_metadata: true
        }
      );

      expect(result.reportData).toBeDefined();
      expect(result.accessLevel).toBe('executive');
      expect(result.formattedData).toBeDefined();
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should apply role-based data filtering correctly', async () => {
      const mockFilteredData = [
        createMockReport({
          id: 'filtered-report-1',
          report_config: {
            data_filters: {
              inventory_staff: { metrics: ['inventory_only'] },
              marketing_staff: { metrics: ['marketing_only'] }
            }
          }
        })
      ];

      supabaseMock.setTableData('strategic_reports', mockFilteredData);

      const result = await StrategicReportingService.getReportData(
        'filtered-report-1',
        { user_role: 'inventory_staff' }
      );

      expect(result.availableMetrics).toContain('inventory_only');
      expect(result.availableMetrics).not.toContain('marketing_only');
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('exportReportData', () => {
    it('should export report data in multiple formats (PDF, CSV, JSON)', async () => {
      const mockExportableReport = [
        createMockReport({
          id: 'export-report-1',
          report_config: {
            export_options: {
              supported_formats: ['pdf', 'csv', 'json', 'xlsx'],
              include_charts: true,
              include_raw_data: true
            }
          }
        })
      ];

      supabaseMock.setTableData('strategic_reports', mockExportableReport);

      const result = await StrategicReportingService.exportReportData(
        'export-report-1',
        {
          format: 'pdf',
          include_charts: true,
          include_metadata: true,
          compression: 'high'
        }
      );

      expect(result.exportFormat).toBe('pdf');
      expect(result.fileSize).toBeDefined();
      expect(result.downloadUrl).toBeDefined();
      expect(result.includesCharts).toBe(true);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should handle large report export with performance optimization', async () => {
      const mockLargeReport = [
        createMockReport({
          id: 'large-export-1',
          report_config: {
            data_size: 'large',
            optimization: {
              chunked_processing: true,
              compression_level: 'maximum',
              background_processing: true
            }
          }
        })
      ];

      supabaseMock.setTableData('strategic_reports', mockLargeReport);

      const startTime = Date.now();
      const result = await StrategicReportingService.exportReportData(
        'large-export-1',
        { format: 'csv', optimize_for_size: true }
      );
      const endTime = Date.now();

      expect(result.processingTime).toBeLessThan(5000);
      expect(result.compressionRatio).toBeGreaterThan(0.5);
      expect(endTime - startTime).toBeLessThan(3000);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('updateReportConfig', () => {
    it('should update report configuration with validation and versioning', async () => {
      const mockUpdatedConfig = [
        createMockReport({
          id: 'config-update-1',
          report_config: {
            version: '2.0',
            updated_metrics: ['new_metric_1', 'new_metric_2'],
            configuration_history: [
              { version: '1.0', updated_at: '2024-01-01T00:00:00Z' },
              { version: '2.0', updated_at: '2024-01-15T10:00:00Z' }
            ]
          },
          updated_at: '2024-01-15T10:00:00Z'
        })
      ];

      supabaseMock.setTableData('strategic_reports', mockUpdatedConfig);

      const result = await StrategicReportingService.updateReportConfig(
        'config-update-1',
        {
          add_metrics: ['customer_satisfaction', 'operational_efficiency'],
          update_frequency: 'bi_weekly',
          modify_access_control: { min_role: 'admin' }
        }
      );

      expect(result.reportConfig.version).toBe('2.0');
      expect(result.configurationHistory).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should validate configuration updates against schema constraints', async () => {
      supabaseMock.setTableData('strategic_reports', []);
      supabaseMock.queueError(new Error('Invalid report configuration schema'));

      await expect(
        StrategicReportingService.updateReportConfig(
          'invalid-config-1',
          { invalid_field: 'invalid_value' }
        )
      ).rejects.toThrow('Invalid report configuration schema');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('Role-based Access Control for Reports', () => {
    it('should enforce role-based access control for report generation', async () => {
      // Mock role permission check
      const mockRolePermission = require('../../../services/role-based/rolePermissionService');
      mockRolePermission.RolePermissionService = {
        hasPermission: jest.fn().mockResolvedValue(true)
      };

      const mockExecutiveReport = [
        createMockReport({
          id: 'executive-report-1',
          report_config: {
            access_control: { min_role: 'executive', classification: 'confidential' }
          }
        })
      ];

      supabaseMock.setTableData('strategic_reports', mockExecutiveReport);

      const result = await StrategicReportingService.generateReport(
        'executive-report-1',
        {},
        { user_role: 'executive', user_id: 'user-123' }
      );

      expect(result.reportData).toBeDefined();
      expect(mockRolePermission.RolePermissionService.hasPermission).toHaveBeenCalledWith(
        'executive',
        'strategic_reporting_read'
      );
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should restrict report access for insufficient permissions', async () => {
      // Mock role permission to fail
      const mockRolePermission = require('../../../services/role-based/rolePermissionService');
      mockRolePermission.RolePermissionService = {
        hasPermission: jest.fn().mockResolvedValue(false)
      };

      await expect(
        StrategicReportingService.generateReport(
          'restricted-report-1',
          {},
          { user_role: 'inventory_staff', user_id: 'user-123' }
        )
      ).rejects.toThrow('Insufficient permissions for strategic reporting access');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('Performance Validation for Report Generation', () => {
    it('should handle complex report generation within performance targets', async () => {
      const mockPerformanceReport = [
        createMockReport({
          id: 'performance-test-1',
          report_config: {
            complexity: 'high',
            data_sources: ['business_metrics', 'business_insights', 'strategic_reports', 'predictive_forecasts'],
            aggregation_operations: 50,
            chart_generation: 20
          }
        })
      ];

      supabaseMock.setTableData('strategic_reports', mockPerformanceReport);

      const startTime = Date.now();
      const result = await StrategicReportingService.generateReport(
        'performance-test-1',
        { include_all_analytics: true, detail_level: 'maximum' }
      );
      const endTime = Date.now();

      expect(result.reportData).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(result.performanceMetrics.generationTime).toBeLessThan(5000);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('Integration with Executive Analytics Services', () => {
    it('should integrate with business metrics and intelligence services', async () => {
      // Mock integration with other services
      const mockBusinessMetricsService = require('../businessMetricsService');
      const mockBusinessIntelligenceService = require('../businessIntelligenceService');
      
      mockBusinessMetricsService.BusinessMetricsService = {
        aggregateBusinessMetrics: jest.fn().mockResolvedValue({
          metrics: [{ category: 'integrated', value: 1500 }]
        })
      };

      mockBusinessIntelligenceService.BusinessIntelligenceService = {
        generateInsights: jest.fn().mockResolvedValue({
          insights: [{ type: 'correlation', confidence: 0.89 }]
        })
      };

      const mockIntegratedReport = [
        createMockReport({
          id: 'integrated-report-1',
          report_config: {
            integrations: {
              business_metrics: true,
              business_intelligence: true,
              cross_service_correlation: true
            }
          }
        })
      ];

      supabaseMock.setTableData('strategic_reports', mockIntegratedReport);

      const result = await StrategicReportingService.generateReport(
        'integrated-report-1',
        { include_all_analytics: true }
      );

      expect(result.reportData.businessMetrics).toBeDefined();
      expect(result.reportData.businessIntelligence).toBeDefined();
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });
});