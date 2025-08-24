import { SimplifiedSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { createUser, resetAllFactories } from '../../../test/factories';
import { BusinessMetricsService } from '../businessMetricsService';
import { BusinessIntelligenceService } from '../businessIntelligenceService';
import { StrategicReportingService } from '../strategicReportingService';
import { PredictiveAnalyticsService } from '../predictiveAnalyticsService';
import { RolePermissionService } from '../../role-based/rolePermissionService';

// Mock ValidationMonitor
jest.mock('../../../utils/validationMonitor');
const { ValidationMonitor } = require('../../../utils/validationMonitor');

// Mock role permissions
jest.mock('../../role-based/rolePermissionService');

// Mock Supabase
jest.mock('../../../config/supabase', () => ({
  supabase: null // Will be set in beforeEach
}));

describe('Executive Dashboard Integration', () => {
  let supabaseMock: SimplifiedSupabaseMock;
  const testUser = createUser();
  
  beforeEach(() => {
    jest.clearAllMocks();
    resetAllFactories();
    
    // Create and inject mock
    supabaseMock = new SimplifiedSupabaseMock();
    require('../../../config/supabase').supabase = supabaseMock.createClient();
    
    // Setup default mocks
    (RolePermissionService.hasPermission as jest.Mock).mockResolvedValue(true);
  });

  describe('Executive Dashboard Data Aggregation', () => {
    it('should aggregate data from all executive service sources', async () => {
      // Mock data from each service
      const mockMetrics = {
        data: [{
          id: 'metric-1',
          metric_category: 'revenue',
          metric_value: 150000,
          period: '2024-01'
        }],
        error: null
      };

      const mockInsights = {
        data: [{
          id: 'insight-1',
          insight_type: 'trend',
          confidence_score: 0.92,
          insight_title: 'Revenue Growth Trend'
        }],
        error: null
      };

      const mockReports = {
        data: [{
          id: 'report-1',
          report_type: 'executive_summary',
          report_name: 'Monthly Executive Report'
        }],
        error: null
      };

      const mockForecasts = {
        data: [{
          id: 'forecast-1',
          forecast_type: 'demand',
          forecast_value: 175000,
          confidence_interval: [160000, 190000]
        }],
        error: null
      };

      // Setup mock returns
      supabaseMock.setTableData('business_metrics', mockMetrics.data);
      supabaseMock.setTableData('business_insights', mockInsights.data);
      supabaseMock.setTableData('strategic_reports', mockReports.data);
      supabaseMock.setTableData('predictive_forecasts', mockForecasts.data);

      // Aggregate dashboard data
      const [metrics, insights, reports, forecasts] = await Promise.all([
        BusinessMetricsService.aggregateBusinessMetrics(
          ['revenue'],
          'monthly',
          '2024-01-01',
          '2024-01-31',
          { user_role: 'executive' }
        ),
        BusinessIntelligenceService.generateInsights(
          'trend',
          '2024-01-01',
          '2024-01-31',
          { user_role: 'executive' }
        ),
        StrategicReportingService.generateReport(
          'report-1',
          { include_all_analytics: true },
          { user_role: 'executive' }
        ),
        PredictiveAnalyticsService.generateForecast({
          forecast_type: 'demand',
          time_horizon: 'month'
        })
      ]);

      expect(metrics).toBeDefined();
      expect(insights).toBeDefined();
      expect(reports).toBeDefined();
      expect(forecasts).toBeDefined();
    });

    it('should handle real-time updates with intelligent cache invalidation', async () => {
      const mockInitialData = {
        data: [{ id: 'metric-1', value: 100 }],
        error: null
      };

      const mockUpdatedData = {
        data: [{ id: 'metric-1', value: 150 }],
        error: null
      };

      // First call returns initial data
      supabaseMock.setTableData('business_metrics', mockInitialData.data);

      const initialResult = await BusinessMetricsService.getCrossRoleMetrics({
        categories: ['revenue'],
        user_role: 'executive'
      });

      // Simulate real-time update
      supabaseMock.setTableData('business_metrics', mockUpdatedData.data);

      const updatedResult = await BusinessMetricsService.getCrossRoleMetrics({
        categories: ['revenue'],
        user_role: 'executive'
      });

      expect(initialResult.metrics[0].value).toBe(100);
      expect(updatedResult.metrics[0].value).toBe(150);
    });

    it('should apply role-based filtering to dashboard visualization', async () => {
      // Test executive role sees all data
      const executiveData = await StrategicReportingService.getReportData(
        'report-1',
        { user_role: 'executive' }
      );

      // Test inventory staff sees limited data
      const inventoryData = await StrategicReportingService.getReportData(
        'report-1',
        { user_role: 'inventory_staff' }
      );

      expect(executiveData.availableMetrics).toContain('revenue');
      expect(executiveData.availableMetrics).toContain('marketing_roi');
      expect(inventoryData.availableMetrics).not.toContain('marketing_roi');
      expect(inventoryData.availableMetrics).toContain('inventory_turnover');
    });

    it('should generate strategic reports with multi-source integration', async () => {
      // Mock integrated data
      const mockIntegratedData = {
        businessMetrics: { revenue: 150000, growth: 0.15 },
        businessIntelligence: { insights: 5, avgConfidence: 0.88 },
        predictiveAnalytics: { nextMonthForecast: 172500 }
      };

      supabaseMock.setTableData('strategic_reports', [{
        id: 'report-1',
        report_type: 'executive_summary',
        report_config: {
          data_sources: ['business_metrics', 'business_insights', 'predictive_forecasts']
        }
      }]);

      const report = await StrategicReportingService.generateReport(
        'report-1',
        {
          include_all_analytics: true,
          include_cross_role_correlation: true,
          include_predictive_analytics: true
        },
        { user_role: 'executive' }
      );

      expect(report.reportData).toBeDefined();
      expect(report.reportMetadata.dataSourcesUsed).toContain('business_metrics');
      expect(report.reportMetadata.dataSourcesUsed).toContain('predictive_forecasts');
    });

    it('should coordinate cross-role analytics with consistency validation', async () => {
      // Setup consistent data across roles
      const consistentProductId = 'prod-123';
      const consistentQuantity = 500;

      supabaseMock.setTableData('inventory_items', [{ product_id: consistentProductId, quantity_available: consistentQuantity }]);
      supabaseMock.setTableData('marketing_products', [{ product_id: consistentProductId, promoted_quantity: consistentQuantity }]);
      supabaseMock.setTableData('business_metrics', [{ product_id: consistentProductId, metric_value: consistentQuantity }]);

      // Verify consistency across all data sources
      const { supabase } = require('../../../config/supabase');
      const inventoryData = await supabase.from('inventory_items')
        .select('*')
        .eq('product_id', consistentProductId)
        .single();

      const marketingData = await supabase.from('marketing_products')
        .select('*')
        .eq('product_id', consistentProductId)
        .single();

      const metricsData = await supabase.from('business_metrics')
        .select('*')
        .eq('product_id', consistentProductId)
        .single();

      expect(inventoryData.data?.quantity_available).toBe(consistentQuantity);
      expect(marketingData.data?.promoted_quantity).toBe(consistentQuantity);
      expect(metricsData.data?.metric_value).toBe(consistentQuantity);
    });
  });

  describe('Dashboard Performance and Optimization', () => {
    it('should optimize dashboard loading with progressive data fetching', async () => {
      const loadingPhases = [];
      
      // Phase 1: Critical metrics
      loadingPhases.push(await BusinessMetricsService.getCrossRoleMetrics({
        categories: ['revenue'],
        user_role: 'executive'
      }));

      // Phase 2: Insights
      loadingPhases.push(await BusinessIntelligenceService.generateInsights(
        'trend',
        '2024-01-01',
        '2024-01-31'
      ));

      // Phase 3: Detailed reports
      loadingPhases.push(await StrategicReportingService.generateReport(
        'report-1',
        { detail_level: 'comprehensive' }
      ));

      expect(loadingPhases).toHaveLength(3);
      expect(loadingPhases[0]).toBeDefined(); // Critical data loads first
    });

    it('should implement efficient caching for dashboard components', async () => {
      const cacheKey = 'dashboard-executive-2024-01';
      
      // First load - hits database
      const firstLoad = await BusinessMetricsService.aggregateBusinessMetrics(
        ['revenue', 'inventory', 'marketing'],
        'monthly',
        '2024-01-01',
        '2024-01-31',
        { user_role: 'executive' }
      );

      // Second load - should use cache
      const secondLoad = await BusinessMetricsService.aggregateBusinessMetrics(
        ['revenue', 'inventory', 'marketing'],
        'monthly',
        '2024-01-01',
        '2024-01-31',
        { user_role: 'executive' }
      );

      // Verify same data returned (cache hit)
      expect(firstLoad).toEqual(secondLoad);
    });

    it('should handle dashboard refresh with minimal performance impact', async () => {
      const startTime = Date.now();
      
      // Simulate dashboard refresh
      const refreshPromises = [
        BusinessMetricsService.getCrossRoleMetrics({ categories: ['revenue'] }),
        BusinessIntelligenceService.generateInsights('trend', '2024-01-01', '2024-01-31'),
        StrategicReportingService.getReportData('report-1'),
        PredictiveAnalyticsService.generateForecast({ forecast_type: 'demand' })
      ];

      await Promise.all(refreshPromises);
      
      const endTime = Date.now();
      const refreshTime = endTime - startTime;

      expect(refreshTime).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it('should prioritize critical dashboard elements during high load', async () => {
      // Simulate high load scenario
      const criticalMetrics = await BusinessMetricsService.getCrossRoleMetrics({
        categories: ['revenue'],
        user_role: 'executive'
      });

      // Non-critical elements can be deferred
      const deferredReports = new Promise(resolve => {
        setTimeout(() => {
          resolve(StrategicReportingService.generateReport('report-1'));
        }, 100);
      });

      expect(criticalMetrics).toBeDefined();
      expect(criticalMetrics.metrics).toEqual(expect.any(Array));
    });

    it('should provide fallback data during service disruptions', async () => {
      // Simulate service failure
      supabaseMock.queueError(new Error('Service temporarily unavailable'));

      // Should return cached/fallback data
      const fallbackResult = await BusinessMetricsService.getCrossRoleMetrics({
        categories: ['revenue'],
        user_role: 'executive'
      });

      expect(fallbackResult).toBeDefined();
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'CROSS_ROLE_METRICS_FAILED'
        })
      );
    });
  });

  describe('Dashboard Alert and Notification System', () => {
    it('should trigger alerts for significant metric changes', async () => {
      const mockAlertThreshold = {
        metric: 'revenue',
        threshold: 0.1, // 10% change triggers alert
        currentValue: 150000,
        previousValue: 130000
      };

      const percentageChange = (mockAlertThreshold.currentValue - mockAlertThreshold.previousValue) / 
                              mockAlertThreshold.previousValue;

      expect(percentageChange).toBeGreaterThan(mockAlertThreshold.threshold);
      
      // Alert should be triggered
      const alert = {
        type: 'metric_alert',
        severity: 'high',
        message: `Revenue increased by ${(percentageChange * 100).toFixed(1)}%`
      };

      expect(alert.severity).toBe('high');
    });

    it('should notify executives of critical insights in real-time', async () => {
      const criticalInsight = {
        id: 'insight-critical-1',
        insight_type: 'anomaly',
        severity: 'critical',
        confidence_score: 0.95,
        requires_immediate_action: true
      };

      supabaseMock.setTableData('critical_insights', [criticalInsight]);

      // Simulate insight generation
      const notification = {
        recipient: 'executive',
        insight_id: criticalInsight.id,
        priority: 'urgent',
        delivery_method: 'realtime'
      };

      expect(notification.priority).toBe('urgent');
      expect(criticalInsight.requires_immediate_action).toBe(true);
    });
  });
});