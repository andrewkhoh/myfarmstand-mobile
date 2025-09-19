import { render, fireEvent, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, jest, afterEach } from '@jest/globals';
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  renderApp,
  createMockWorkflowData,
  validateWorkflowState,
  TestContext,
} from '@/test/integration-utils';
import MarketingAnalyticsScreen from '@/screens/marketing/MarketingAnalyticsScreen';

describe('Marketing Analytics Workflow', () => {
  let testContext: TestContext;
  let mockData: ReturnType<typeof createMockWorkflowData>;

  beforeEach(async () => {
    testContext = await setupIntegrationTest();
    mockData = createMockWorkflowData();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupIntegrationTest(testContext);
  });

  describe('Analytics Dashboard and Reporting', () => {
    it('should collect, aggregate, visualize, and export marketing analytics end-to-end', async () => {
      const { getByText, getByTestId, queryByText } = renderApp(
        <MarketingAnalyticsScreen />,
        { queryClient: testContext.queryClient }
      );

      // Step 1: Data Collection Setup
      expect(getByText('Marketing Analytics')).toBeTruthy();
      
      // Configure data sources
      fireEvent.press(getByText('Configure Data Sources'));
      
      expect(getByTestId('data-sources-modal')).toBeTruthy();
      
      // Enable tracking sources
      fireEvent.press(getByTestId('enable-content-tracking'));
      fireEvent.press(getByTestId('enable-campaign-tracking'));
      fireEvent.press(getByTestId('enable-bundle-tracking'));
      fireEvent.press(getByTestId('enable-user-behavior'));
      fireEvent.press(getByTestId('enable-conversion-tracking'));
      
      // Set collection frequency
      fireEvent.press(getByTestId('collection-frequency-select'));
      fireEvent.press(getByText('Real-time'));
      
      fireEvent.press(getByText('Save Configuration'));
      
      await waitFor(() => {
        expect(getByText('Data sources configured')).toBeTruthy();
        expect(testContext.mockServices.analyticsService.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            event: 'analytics_configured',
            sources: expect.arrayContaining(['content', 'campaign', 'bundle', 'user', 'conversion']),
          })
        );
      });

      // Step 2: View Real-time Dashboard
      fireEvent.press(getByText('Real-time Dashboard'));
      
      await waitFor(() => {
        expect(getByTestId('realtime-metrics-panel')).toBeTruthy();
      });

      // Live metrics
      expect(getByText('Active Users')).toBeTruthy();
      expect(getByTestId('active-users-count')).toBeTruthy();
      expect(getByText('245')).toBeTruthy();
      
      expect(getByText('Current Revenue')).toBeTruthy();
      expect(getByTestId('revenue-ticker')).toBeTruthy();
      expect(getByText('$12,345')).toBeTruthy();
      
      expect(getByText('Conversion Rate')).toBeTruthy();
      expect(getByTestId('conversion-rate-gauge')).toBeTruthy();
      expect(getByText('3.45%')).toBeTruthy();
      
      // Live activity feed
      expect(getByTestId('activity-feed')).toBeTruthy();
      expect(getByText('User viewed Summer Collection')).toBeTruthy();
      expect(getByText('Bundle purchased: Beach Essentials')).toBeTruthy();
      expect(getByText('Campaign clicked: Flash Sale')).toBeTruthy();

      // Step 3: Historical Analysis
      fireEvent.press(getByText('Historical Analysis'));
      
      // Date range selection
      fireEvent.press(getByTestId('date-range-picker'));
      fireEvent.press(getByText('Last 30 Days'));
      
      fireEvent.press(getByText('Apply Date Range'));
      
      await waitFor(() => {
        expect(getByTestId('historical-dashboard')).toBeTruthy();
      });

      // Aggregated metrics
      expect(getByText('Total Revenue: $345,678')).toBeTruthy();
      expect(getByText('Total Orders: 3,456')).toBeTruthy();
      expect(getByText('Avg Order Value: $100')).toBeTruthy();
      expect(getByText('Total Customers: 2,890')).toBeTruthy();
      
      // Trend charts
      expect(getByTestId('revenue-trend-chart')).toBeTruthy();
      expect(getByTestId('orders-trend-chart')).toBeTruthy();
      expect(getByTestId('conversion-trend-chart')).toBeTruthy();
      
      // Period comparison
      fireEvent.press(getByText('Compare Periods'));
      
      fireEvent.press(getByTestId('comparison-period-select'));
      fireEvent.press(getByText('Previous 30 Days'));
      
      await waitFor(() => {
        expect(getByText('Revenue: +23% vs previous period')).toBeTruthy();
        expect(getByText('Orders: +18% vs previous period')).toBeTruthy();
        expect(getByText('Conversion: +0.5% vs previous period')).toBeTruthy();
      });

      // Step 4: Segmentation Analysis
      fireEvent.press(getByText('Segmentation'));
      
      // Customer segments
      fireEvent.press(getByText('Customer Segments'));
      
      await waitFor(() => {
        expect(getByTestId('segment-breakdown')).toBeTruthy();
      });

      expect(getByText('New Customers: 35%')).toBeTruthy();
      expect(getByText('Revenue: $121,000')).toBeTruthy();
      
      expect(getByText('Returning Customers: 45%')).toBeTruthy();
      expect(getByText('Revenue: $155,000')).toBeTruthy();
      
      expect(getByText('VIP Customers: 20%')).toBeTruthy();
      expect(getByText('Revenue: $69,000')).toBeTruthy();
      
      // Geographic breakdown
      fireEvent.press(getByText('Geographic'));
      
      await waitFor(() => {
        expect(getByTestId('geo-heatmap')).toBeTruthy();
      });

      expect(getByText('United States: $234,567')).toBeTruthy();
      expect(getByText('Canada: $67,890')).toBeTruthy();
      expect(getByText('United Kingdom: $43,221')).toBeTruthy();

      // Step 5: Campaign Performance Analysis
      fireEvent.press(getByText('Campaign Performance'));
      
      await waitFor(() => {
        expect(getByTestId('campaign-analytics')).toBeTruthy();
      });

      // Campaign list with metrics
      expect(getByText('Summer Sale 2024')).toBeTruthy();
      expect(getByText('ROI: 385%')).toBeTruthy();
      expect(getByText('Conversions: 456')).toBeTruthy();
      
      expect(getByText('Flash Friday')).toBeTruthy();
      expect(getByText('ROI: 290%')).toBeTruthy();
      expect(getByText('Conversions: 234')).toBeTruthy();
      
      // Drill down into campaign
      fireEvent.press(getByTestId('campaign-row-1'));
      
      await waitFor(() => {
        expect(getByTestId('campaign-detail-analytics')).toBeTruthy();
      });

      expect(getByText('Content Performance')).toBeTruthy();
      expect(getByText('Hero Banner: CTR 8.5%')).toBeTruthy();
      expect(getByText('Product Grid: CTR 6.2%')).toBeTruthy();
      
      expect(getByText('Audience Performance')).toBeTruthy();
      expect(getByText('New Users: CVR 4.5%')).toBeTruthy();
      expect(getByText('Returning: CVR 6.8%')).toBeTruthy();

      // Step 6: Content Analytics
      fireEvent.press(getByText('Back'));
      fireEvent.press(getByText('Content Analytics'));
      
      await waitFor(() => {
        expect(getByTestId('content-performance-grid')).toBeTruthy();
      });

      // Content metrics
      expect(getByText('Top Performing Content')).toBeTruthy();
      expect(getByText('Summer Hero Image')).toBeTruthy();
      expect(getByText('Views: 45,678')).toBeTruthy();
      expect(getByText('Engagement: 12.3%')).toBeTruthy();
      
      // Content engagement heatmap
      expect(getByTestId('engagement-heatmap')).toBeTruthy();
      
      // A/B test results
      fireEvent.press(getByText('A/B Tests'));
      
      await waitFor(() => {
        expect(getByText('Active Tests')).toBeTruthy();
        expect(getByText('Hero Image A vs B')).toBeTruthy();
        expect(getByText('Winner: Variant B (+23% CTR)')).toBeTruthy();
      });

      // Step 7: Bundle Analytics
      fireEvent.press(getByText('Bundle Analytics'));
      
      await waitFor(() => {
        expect(getByTestId('bundle-performance-dashboard')).toBeTruthy();
      });

      expect(getByText('Bundle Performance')).toBeTruthy();
      expect(getByText('Summer Essentials Pack')).toBeTruthy();
      expect(getByText('Units Sold: 234')).toBeTruthy();
      expect(getByText('Revenue: $23,400')).toBeTruthy();
      expect(getByText('Attach Rate: 15%')).toBeTruthy();
      
      // Cross-sell analysis
      fireEvent.press(getByText('Cross-sell Analysis'));
      
      await waitFor(() => {
        expect(getByText('Frequently Bought Together')).toBeTruthy();
        expect(getByText('Sunscreen + Sunglasses: 67%')).toBeTruthy();
        expect(getByText('Beach Towel + Beach Bag: 45%')).toBeTruthy();
      });

      // Step 8: Funnel Analysis
      fireEvent.press(getByText('Conversion Funnel'));
      
      await waitFor(() => {
        expect(getByTestId('funnel-visualization')).toBeTruthy();
      });

      expect(getByText('Landing Page: 10,000 (100%)')).toBeTruthy();
      expect(getByText('Product View: 6,500 (65%)')).toBeTruthy();
      expect(getByText('Add to Cart: 2,600 (26%)')).toBeTruthy();
      expect(getByText('Checkout: 1,300 (13%)')).toBeTruthy();
      expect(getByText('Purchase: 345 (3.45%)')).toBeTruthy();
      
      // Drop-off analysis
      expect(getByText('Biggest Drop-off: Product View → Add to Cart')).toBeTruthy();
      expect(getByText('Loss: 3,900 users (60%)')).toBeTruthy();

      // Step 9: Custom Reports
      fireEvent.press(getByText('Custom Reports'));
      
      // Create custom report
      fireEvent.press(getByText('Create Report'));
      
      fireEvent.changeText(getByTestId('report-name-input'), 'Weekly Marketing Summary');
      
      // Select metrics
      fireEvent.press(getByTestId('metric-revenue'));
      fireEvent.press(getByTestId('metric-conversions'));
      fireEvent.press(getByTestId('metric-campaigns'));
      fireEvent.press(getByTestId('metric-content'));
      
      // Select dimensions
      fireEvent.press(getByTestId('dimension-date'));
      fireEvent.press(getByTestId('dimension-channel'));
      fireEvent.press(getByTestId('dimension-segment'));
      
      // Visualization type
      fireEvent.press(getByTestId('viz-type-select'));
      fireEvent.press(getByText('Combined Chart'));
      
      fireEvent.press(getByText('Generate Report'));
      
      await waitFor(() => {
        expect(getByTestId('custom-report-preview')).toBeTruthy();
        expect(getByText('Weekly Marketing Summary')).toBeTruthy();
      });

      // Step 10: Export and Schedule
      fireEvent.press(getByText('Export & Schedule'));
      
      // Export options
      expect(getByText('Export Format')).toBeTruthy();
      fireEvent.press(getByTestId('export-format-select'));
      fireEvent.press(getByText('Excel'));
      
      // Include options
      fireEvent.press(getByTestId('include-charts'));
      fireEvent.press(getByTestId('include-raw-data'));
      fireEvent.press(getByTestId('include-summary'));
      
      // Export now
      fireEvent.press(getByText('Export Now'));
      
      await waitFor(() => {
        expect(getByText('Preparing export...')).toBeTruthy();
      });

      await waitFor(() => {
        expect(getByText('Export ready')).toBeTruthy();
        expect(getByText('Download')).toBeTruthy();
        expect(testContext.mockServices.analyticsService.exportData).toHaveBeenCalled();
      });

      // Schedule recurring reports
      fireEvent.press(getByText('Schedule Report'));
      
      fireEvent.press(getByTestId('schedule-frequency-select'));
      fireEvent.press(getByText('Weekly'));
      
      fireEvent.press(getByTestId('schedule-day-select'));
      fireEvent.press(getByText('Monday'));
      
      fireEvent.press(getByTestId('schedule-time-select'));
      fireEvent.press(getByText('9:00 AM'));
      
      fireEvent.changeText(getByTestId('recipient-emails-input'), 
        'marketing@company.com, ceo@company.com');
      
      fireEvent.press(getByText('Schedule'));
      
      await waitFor(() => {
        expect(getByText('Report scheduled successfully')).toBeTruthy();
        expect(getByText('Next delivery: Monday 9:00 AM')).toBeTruthy();
      });
    });

    it('should provide predictive analytics and forecasting', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingAnalyticsScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Predictive Analytics'));
      
      await waitFor(() => {
        expect(getByTestId('predictive-dashboard')).toBeTruthy();
      });

      // Revenue forecast
      expect(getByText('Revenue Forecast')).toBeTruthy();
      expect(getByText('Next 7 days: $45,000 - $52,000')).toBeTruthy();
      expect(getByText('Next 30 days: $320,000 - $380,000')).toBeTruthy();
      expect(getByText('Confidence: 85%')).toBeTruthy();
      
      // Trend predictions
      expect(getByTestId('forecast-chart')).toBeTruthy();
      
      // Seasonality analysis
      fireEvent.press(getByText('Seasonality Analysis'));
      
      await waitFor(() => {
        expect(getByText('Peak Periods')).toBeTruthy();
        expect(getByText('Summer: +45% above average')).toBeTruthy();
        expect(getByText('Holiday: +120% above average')).toBeTruthy();
      });

      // Churn prediction
      fireEvent.press(getByText('Churn Prediction'));
      
      await waitFor(() => {
        expect(getByText('At-Risk Customers: 234')).toBeTruthy();
        expect(getByText('Churn Probability > 70%: 45 customers')).toBeTruthy();
        expect(getByText('Recommended Action: Re-engagement campaign')).toBeTruthy();
      });

      // Next best action
      fireEvent.press(getByText('Next Best Actions'));
      
      await waitFor(() => {
        expect(getByText('AI Recommendations')).toBeTruthy();
        expect(getByText('1. Launch flash sale for slow-moving inventory')).toBeTruthy();
        expect(getByText('Expected impact: +$15,000 revenue')).toBeTruthy();
        expect(getByText('2. Increase ad spend on high-converting segments')).toBeTruthy();
        expect(getByText('Expected ROI: 420%')).toBeTruthy();
      });
    });

    it('should handle real-time alerting and anomaly detection', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingAnalyticsScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Alerts & Monitoring'));
      
      // Configure alerts
      fireEvent.press(getByText('Configure Alerts'));
      
      fireEvent.press(getByText('Add Alert'));
      
      fireEvent.changeText(getByTestId('alert-name-input'), 'Conversion Drop Alert');
      
      fireEvent.press(getByTestId('metric-select'));
      fireEvent.press(getByText('Conversion Rate'));
      
      fireEvent.press(getByTestId('condition-select'));
      fireEvent.press(getByText('Falls below'));
      
      fireEvent.changeText(getByTestId('threshold-input'), '2');
      
      fireEvent.press(getByTestId('time-window-select'));
      fireEvent.press(getByText('1 hour'));
      
      fireEvent.press(getByText('Save Alert'));
      
      await waitFor(() => {
        expect(getByText('Alert configured')).toBeTruthy();
      });

      // Simulate anomaly
      testContext.mockServices.analyticsService.getRealTimeData.mockResolvedValueOnce({
        active: 50,
        conversionRate: 1.5,
        anomaly: true,
      });

      // Trigger alert check
      fireEvent.press(getByText('Check Now'));
      
      await waitFor(() => {
        expect(getByTestId('alert-triggered')).toBeTruthy();
        expect(getByText('Alert: Conversion Drop')).toBeTruthy();
        expect(getByText('Current: 1.5% (threshold: 2%)')).toBeTruthy();
      });

      // Anomaly detection
      fireEvent.press(getByText('Anomalies'));
      
      await waitFor(() => {
        expect(getByTestId('anomaly-list')).toBeTruthy();
        expect(getByText('Unusual traffic spike from new region')).toBeTruthy();
        expect(getByText('Abnormal purchase pattern detected')).toBeTruthy();
        expect(getByText('Campaign performance deviation')).toBeTruthy();
      });

      // Investigation tools
      fireEvent.press(getByTestId('anomaly-1'));
      
      await waitFor(() => {
        expect(getByText('Anomaly Investigation')).toBeTruthy();
        expect(getByText('Traffic increased 500% from Brazil')).toBeTruthy();
        expect(getByText('Possible causes: Bot traffic, viral content')).toBeTruthy();
        expect(getByText('Recommended: Enable rate limiting')).toBeTruthy();
      });
    });
  });

  describe('Marketing Attribution and ROI', () => {
    it('should track multi-touch attribution across channels', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingAnalyticsScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Attribution'));
      
      await waitFor(() => {
        expect(getByTestId('attribution-dashboard')).toBeTruthy();
      });

      // Attribution models
      fireEvent.press(getByTestId('attribution-model-select'));
      
      expect(getByText('Last Touch')).toBeTruthy();
      expect(getByText('First Touch')).toBeTruthy();
      expect(getByText('Linear')).toBeTruthy();
      expect(getByText('Time Decay')).toBeTruthy();
      expect(getByText('Data-Driven')).toBeTruthy();
      
      fireEvent.press(getByText('Data-Driven'));
      
      await waitFor(() => {
        expect(getByText('Channel Attribution')).toBeTruthy();
        expect(getByText('Email: 35% ($121,000)')).toBeTruthy();
        expect(getByText('Social: 28% ($96,600)')).toBeTruthy();
        expect(getByText('Search: 22% ($75,900)')).toBeTruthy();
        expect(getByText('Direct: 15% ($51,750)')).toBeTruthy();
      });

      // Customer journey visualization
      fireEvent.press(getByText('Customer Journeys'));
      
      await waitFor(() => {
        expect(getByTestId('journey-visualization')).toBeTruthy();
        expect(getByText('Average touchpoints: 4.2')).toBeTruthy();
        expect(getByText('Average time to conversion: 7 days')).toBeTruthy();
      });

      // Path analysis
      expect(getByText('Top Conversion Paths')).toBeTruthy();
      expect(getByText('1. Email → Social → Search → Purchase (23%)')).toBeTruthy();
      expect(getByText('2. Search → Email → Direct → Purchase (18%)')).toBeTruthy();
      expect(getByText('3. Social → Social → Email → Purchase (15%)')).toBeTruthy();

      // ROI by channel
      fireEvent.press(getByText('Channel ROI'));
      
      await waitFor(() => {
        expect(getByTestId('roi-comparison')).toBeTruthy();
        expect(getByText('Email: 420% ROI')).toBeTruthy();
        expect(getByText('Search: 280% ROI')).toBeTruthy();
        expect(getByText('Social: 195% ROI')).toBeTruthy();
        expect(getByText('Display: 150% ROI')).toBeTruthy();
      });
    });

    it('should calculate customer lifetime value and cohort analysis', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingAnalyticsScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Customer Analytics'));
      
      // Lifetime value
      fireEvent.press(getByText('Lifetime Value'));
      
      await waitFor(() => {
        expect(getByTestId('ltv-dashboard')).toBeTruthy();
      });

      expect(getByText('Average LTV: $450')).toBeTruthy();
      expect(getByText('1-Year LTV: $280')).toBeTruthy();
      expect(getByText('3-Year LTV: $680')).toBeTruthy();
      
      // LTV by segment
      expect(getByText('LTV by Segment')).toBeTruthy();
      expect(getByText('VIP: $1,250')).toBeTruthy();
      expect(getByText('Regular: $380')).toBeTruthy();
      expect(getByText('New: $150')).toBeTruthy();
      
      // Cohort analysis
      fireEvent.press(getByText('Cohort Analysis'));
      
      await waitFor(() => {
        expect(getByTestId('cohort-retention-grid')).toBeTruthy();
      });

      expect(getByText('Jan 2024 Cohort')).toBeTruthy();
      expect(getByText('Month 1: 100%')).toBeTruthy();
      expect(getByText('Month 2: 45%')).toBeTruthy();
      expect(getByText('Month 3: 32%')).toBeTruthy();
      expect(getByText('Month 6: 18%')).toBeTruthy();
      
      // Revenue cohorts
      fireEvent.press(getByText('Revenue Cohorts'));
      
      await waitFor(() => {
        expect(getByTestId('revenue-cohort-chart')).toBeTruthy();
        expect(getByText('Best performing: Q2 2024 cohort')).toBeTruthy();
      });
    });

    it('should provide competitive benchmarking', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingAnalyticsScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Benchmarking'));
      
      await waitFor(() => {
        expect(getByTestId('benchmark-dashboard')).toBeTruthy();
      });

      // Industry benchmarks
      expect(getByText('Industry Comparison')).toBeTruthy();
      expect(getByText('Your Conversion Rate: 3.45%')).toBeTruthy();
      expect(getByText('Industry Average: 2.8%')).toBeTruthy();
      expect(getByText('Performance: +23% above average')).toBeTruthy();
      
      expect(getByText('Your AOV: $100')).toBeTruthy();
      expect(getByText('Industry Average: $85')).toBeTruthy();
      expect(getByText('Performance: +18% above average')).toBeTruthy();
      
      // Percentile rankings
      expect(getByText('Percentile Rankings')).toBeTruthy();
      expect(getByText('Conversion Rate: 75th percentile')).toBeTruthy();
      expect(getByText('Customer Retention: 82nd percentile')).toBeTruthy();
      expect(getByText('Revenue Growth: 68th percentile')).toBeTruthy();
      
      // Improvement opportunities
      fireEvent.press(getByText('Improvement Areas'));
      
      await waitFor(() => {
        expect(getByText('Below Average Metrics')).toBeTruthy();
        expect(getByText('Email Open Rate: -12% below average')).toBeTruthy();
        expect(getByText('Cart Abandonment: +8% above average (worse)')).toBeTruthy();
      });
    });
  });

  describe('Data Quality and Governance', () => {
    it('should validate data quality and completeness', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingAnalyticsScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Data Quality'));
      
      await waitFor(() => {
        expect(getByTestId('data-quality-dashboard')).toBeTruthy();
      });

      // Quality metrics
      expect(getByText('Data Completeness: 94%')).toBeTruthy();
      expect(getByText('Data Accuracy: 98%')).toBeTruthy();
      expect(getByText('Data Freshness: Real-time')).toBeTruthy();
      
      // Missing data
      expect(getByText('Data Issues')).toBeTruthy();
      expect(getByText('Missing email tracking: 6% of users')).toBeTruthy();
      expect(getByText('Incomplete purchase data: 2 orders')).toBeTruthy();
      
      // Data validation
      fireEvent.press(getByText('Run Validation'));
      
      await waitFor(() => {
        expect(getByText('Validation in progress...')).toBeTruthy();
      });

      await waitFor(() => {
        expect(getByText('Validation Complete')).toBeTruthy();
        expect(getByText('Issues Found: 3')).toBeTruthy();
        expect(getByText('1. Duplicate events detected')).toBeTruthy();
        expect(getByText('2. Inconsistent timestamp formats')).toBeTruthy();
        expect(getByText('3. Missing attribution data')).toBeTruthy();
      });

      // Auto-fix options
      fireEvent.press(getByText('Auto-fix Issues'));
      
      await waitFor(() => {
        expect(getByText('Fixed: Duplicate events removed')).toBeTruthy();
        expect(getByText('Fixed: Timestamps normalized')).toBeTruthy();
        expect(getByText('Manual review needed: Attribution data')).toBeTruthy();
      });
    });

    it('should handle data privacy and compliance', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingAnalyticsScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Privacy & Compliance'));
      
      await waitFor(() => {
        expect(getByTestId('privacy-dashboard')).toBeTruthy();
      });

      // Compliance status
      expect(getByText('GDPR Compliant')).toBeTruthy();
      expect(getByText('CCPA Compliant')).toBeTruthy();
      expect(getByText('Cookie Consent: Enabled')).toBeTruthy();
      
      // Data retention
      fireEvent.press(getByText('Data Retention'));
      
      expect(getByText('Current Policy: 24 months')).toBeTruthy();
      expect(getByText('Data to be purged: 1,234 records')).toBeTruthy();
      expect(getByText('Next purge: In 7 days')).toBeTruthy();
      
      // User privacy requests
      fireEvent.press(getByText('Privacy Requests'));
      
      await waitFor(() => {
        expect(getByText('Pending Requests: 3')).toBeTruthy();
        expect(getByText('Data Export: 2 requests')).toBeTruthy();
        expect(getByText('Data Deletion: 1 request')).toBeTruthy();
      });

      // Process request
      fireEvent.press(getByTestId('request-1'));
      
      expect(getByText('Export Request #1')).toBeTruthy();
      expect(getByText('User: user@example.com')).toBeTruthy();
      expect(getByText('Requested: 2 days ago')).toBeTruthy();
      
      fireEvent.press(getByText('Process Request'));
      
      await waitFor(() => {
        expect(getByText('Exporting user data...')).toBeTruthy();
      });

      await waitFor(() => {
        expect(getByText('Export complete')).toBeTruthy();
        expect(getByText('Secure link sent to user')).toBeTruthy();
      });
    });
  });

  describe('Advanced Visualization and Insights', () => {
    it('should provide interactive data exploration', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingAnalyticsScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Data Explorer'));
      
      await waitFor(() => {
        expect(getByTestId('data-explorer-interface')).toBeTruthy();
      });

      // Drag and drop dimensions
      fireEvent.press(getByTestId('dimension-date'));
      fireEvent(getByTestId('x-axis-drop-zone'), 'drop');
      
      fireEvent.press(getByTestId('metric-revenue'));
      fireEvent(getByTestId('y-axis-drop-zone'), 'drop');
      
      // Add filters
      fireEvent.press(getByText('Add Filter'));
      fireEvent.press(getByTestId('filter-field-select'));
      fireEvent.press(getByText('Campaign'));
      fireEvent.press(getByTestId('filter-value-select'));
      fireEvent.press(getByText('Summer Sale'));
      
      // Update visualization
      fireEvent.press(getByText('Update'));
      
      await waitFor(() => {
        expect(getByTestId('explorer-chart')).toBeTruthy();
        expect(getByText('Revenue by Date (Summer Sale)')).toBeTruthy();
      });

      // Drill down
      fireEvent.press(getByTestId('data-point-peak'));
      
      await waitFor(() => {
        expect(getByText('Drill Down Options')).toBeTruthy();
        expect(getByText('View by Hour')).toBeTruthy();
        expect(getByText('View by Product')).toBeTruthy();
        expect(getByText('View by Customer')).toBeTruthy();
      });

      fireEvent.press(getByText('View by Product'));
      
      await waitFor(() => {
        expect(getByTestId('drilldown-chart')).toBeTruthy();
        expect(getByText('Product Revenue Breakdown')).toBeTruthy();
      });
    });

    it('should generate AI-powered insights and recommendations', async () => {
      const { getByText, getByTestId } = renderApp(
        <MarketingAnalyticsScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('AI Insights'));
      
      await waitFor(() => {
        expect(getByTestId('ai-insights-panel')).toBeTruthy();
      });

      // Key insights
      expect(getByText('Key Insights')).toBeTruthy();
      expect(getByText('📈 Revenue increased 45% after email campaign launch')).toBeTruthy();
      expect(getByText('🎯 Mobile conversion rate 2x higher than desktop')).toBeTruthy();
      expect(getByText('⚠️ Cart abandonment spike on weekends')).toBeTruthy();
      
      // Correlation analysis
      fireEvent.press(getByText('Correlations'));
      
      await waitFor(() => {
        expect(getByText('Strong Correlations Found')).toBeTruthy();
        expect(getByText('Email frequency ↔ Purchase rate: 0.78')).toBeTruthy();
        expect(getByText('Page load time ↔ Bounce rate: -0.82')).toBeTruthy();
      });

      // Opportunity identification
      fireEvent.press(getByText('Opportunities'));
      
      await waitFor(() => {
        expect(getByText('Growth Opportunities')).toBeTruthy();
        expect(getByText('1. Untapped segment: Ages 45-54')).toBeTruthy();
        expect(getByText('Potential revenue: $45,000/month')).toBeTruthy();
        expect(getByText('2. Underperforming category: Electronics')).toBeTruthy();
        expect(getByText('Improvement potential: 35% revenue increase')).toBeTruthy();
      });

      // Action recommendations
      fireEvent.press(getByText('Recommended Actions'));
      
      await waitFor(() => {
        expect(getByText('Priority Actions')).toBeTruthy();
        expect(getByText('🔴 High: Fix mobile checkout flow')).toBeTruthy();
        expect(getByText('Impact: +$12,000/month')).toBeTruthy();
        expect(getByText('🟡 Medium: Optimize email send times')).toBeTruthy();
        expect(getByText('Impact: +15% open rate')).toBeTruthy();
      });
    });
  });
});