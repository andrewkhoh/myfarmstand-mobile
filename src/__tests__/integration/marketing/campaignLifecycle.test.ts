import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import CampaignManagementScreen from '@/screens/marketing/CampaignManagementScreen';
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  renderApp,
  createMockWorkflowData,
  validateWorkflowState,
  TestContext,
} from '@/test/integration-utils';

describe('Campaign Lifecycle Workflow', () => {
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

  describe('Complete Campaign Lifecycle', () => {
    it('should create, schedule, activate, monitor, and complete campaign end-to-end', async () => {
      const { getByText, getByTestId, queryByText } = renderApp(
        <CampaignManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      // Step 1: Create new campaign
      fireEvent.press(getByText('Create Campaign'));
      
      expect(getByTestId('campaign-wizard')).toBeTruthy();
      expect(getByText('Step 1: Basic Information')).toBeTruthy();

      // Fill basic information
      fireEvent.changeText(getByTestId('campaign-name-input'), 'Summer Sale 2024');
      fireEvent.changeText(getByTestId('campaign-description-input'), 
        'Exclusive summer collection with up to 50% off on selected items');
      
      fireEvent.press(getByTestId('campaign-type-select'));
      fireEvent.press(getByText('Promotional'));
      
      fireEvent.press(getByTestId('campaign-objective-select'));
      fireEvent.press(getByText('Increase Sales'));
      
      fireEvent.press(getByText('Next'));

      // Step 2: Set schedule and duration
      expect(getByText('Step 2: Schedule & Duration')).toBeTruthy();
      
      // Set start date (tomorrow)
      fireEvent.press(getByTestId('start-date-picker'));
      fireEvent.press(getByText('Tomorrow'));
      fireEvent.press(getByTestId('start-time-picker'));
      fireEvent.press(getByText('09:00 AM'));
      
      // Set end date (7 days from start)
      fireEvent.press(getByTestId('end-date-picker'));
      fireEvent.press(getByText('Next Week'));
      fireEvent.press(getByTestId('end-time-picker'));
      fireEvent.press(getByText('11:59 PM'));
      
      // Set timezone
      fireEvent.press(getByTestId('timezone-select'));
      fireEvent.press(getByText('PST (UTC-8)'));
      
      // Recurring settings
      fireEvent.press(getByTestId('recurring-toggle'));
      fireEvent.press(getByTestId('recurring-pattern-select'));
      fireEvent.press(getByText('Weekly'));
      
      fireEvent.press(getByText('Next'));

      // Step 3: Target audience configuration
      expect(getByText('Step 3: Target Audience')).toBeTruthy();
      
      // Select segments
      fireEvent.press(getByTestId('segment-multiselect'));
      fireEvent.press(getByTestId('segment-new-customers'));
      fireEvent.press(getByTestId('segment-loyal-customers'));
      fireEvent.press(getByTestId('segment-high-value'));
      fireEvent.press(getByText('Done'));
      
      // Geographic targeting
      fireEvent.press(getByTestId('geo-targeting-toggle'));
      fireEvent.press(getByTestId('country-select'));
      fireEvent.press(getByText('United States'));
      fireEvent.press(getByText('Canada'));
      fireEvent.press(getByText('Done'));
      
      // Age range
      fireEvent.changeText(getByTestId('age-min-input'), '18');
      fireEvent.changeText(getByTestId('age-max-input'), '65');
      
      // Estimated reach
      await waitFor(() => {
        expect(getByText('Estimated Reach: 45,000 users')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Next'));

      // Step 4: Content selection
      expect(getByText('Step 4: Campaign Content')).toBeTruthy();
      
      // Add existing content
      fireEvent.press(getByText('Add Existing Content'));
      
      await waitFor(() => {
        expect(getByTestId('content-selector-modal')).toBeTruthy();
      });
      
      // Search and select content
      fireEvent.changeText(getByTestId('content-search-input'), 'summer');
      
      await waitFor(() => {
        expect(getByText('Summer Collection 2024')).toBeTruthy();
        expect(getByText('Beach Essentials')).toBeTruthy();
      });
      
      fireEvent.press(getByTestId('content-checkbox-1'));
      fireEvent.press(getByTestId('content-checkbox-2'));
      fireEvent.press(getByTestId('content-checkbox-3'));
      
      fireEvent.press(getByText('Add Selected (3)'));
      
      // Reorder content
      fireEvent.press(getByTestId('content-item-2'));
      fireEvent.press(getByTestId('move-up-button'));
      
      // Set content schedule
      fireEvent.press(getByTestId('content-schedule-1'));
      fireEvent.press(getByTestId('schedule-type-select'));
      fireEvent.press(getByText('Staggered Release'));
      
      fireEvent.press(getByText('Next'));

      // Step 5: Bundle integration
      expect(getByText('Step 5: Product Bundles')).toBeTruthy();
      
      fireEvent.press(getByText('Add Bundle'));
      
      await waitFor(() => {
        expect(getByTestId('bundle-selector-modal')).toBeTruthy();
      });
      
      fireEvent.press(getByTestId('bundle-checkbox-1'));
      fireEvent.press(getByTestId('bundle-checkbox-2'));
      fireEvent.press(getByText('Add Selected (2)'));
      
      // Configure bundle visibility
      fireEvent.press(getByTestId('bundle-settings-1'));
      fireEvent.press(getByTestId('featured-toggle'));
      fireEvent.changeText(getByTestId('bundle-discount-input'), '20');
      
      fireEvent.press(getByText('Next'));

      // Step 6: Budget and bidding
      expect(getByText('Step 6: Budget & Bidding')).toBeTruthy();
      
      fireEvent.changeText(getByTestId('total-budget-input'), '10000');
      
      fireEvent.press(getByTestId('budget-type-select'));
      fireEvent.press(getByText('Daily Budget'));
      
      fireEvent.changeText(getByTestId('daily-budget-input'), '1500');
      
      // Bidding strategy
      fireEvent.press(getByTestId('bidding-strategy-select'));
      fireEvent.press(getByText('Maximize Conversions'));
      
      fireEvent.changeText(getByTestId('target-cpa-input'), '25');
      
      // Budget alerts
      fireEvent.press(getByTestId('budget-alert-toggle'));
      fireEvent.changeText(getByTestId('alert-threshold-input'), '80');
      
      fireEvent.press(getByText('Next'));

      // Step 7: Review and confirm
      expect(getByText('Step 7: Review & Launch')).toBeTruthy();
      
      // Review summary
      expect(getByText('Campaign: Summer Sale 2024')).toBeTruthy();
      expect(getByText('Duration: 7 days')).toBeTruthy();
      expect(getByText('Budget: $10,000')).toBeTruthy();
      expect(getByText('Target Reach: 45,000')).toBeTruthy();
      expect(getByText('Content Items: 3')).toBeTruthy();
      expect(getByText('Bundles: 2')).toBeTruthy();
      
      // Save as draft first
      fireEvent.press(getByText('Save as Draft'));
      
      await waitFor(() => {
        expect(getByText('Campaign saved as draft')).toBeTruthy();
        expect(testContext.mockServices.campaignService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Summer Sale 2024',
            status: 'draft',
            budget: 10000,
          })
        );
      });

      // Step 8: Schedule campaign
      fireEvent.press(getByText('Schedule Campaign'));
      
      expect(getByTestId('schedule-confirmation-modal')).toBeTruthy();
      expect(getByText('Campaign will start tomorrow at 09:00 AM PST')).toBeTruthy();
      
      fireEvent.press(getByText('Confirm Schedule'));
      
      await waitFor(() => {
        expect(getByText('Status: Scheduled')).toBeTruthy();
        expect(testContext.mockServices.campaignService.schedule).toHaveBeenCalled();
        expect(getByText('Campaign scheduled successfully')).toBeTruthy();
      });

      // Step 9: Monitor scheduled campaign
      expect(getByTestId('countdown-timer')).toBeTruthy();
      expect(getByText(/Time until launch:/)).toBeTruthy();
      
      // Pre-launch checklist
      expect(getByText('Pre-Launch Checklist')).toBeTruthy();
      expect(getByTestId('checklist-content-ready')).toBeTruthy();
      expect(getByTestId('checklist-budget-allocated')).toBeTruthy();
      expect(getByTestId('checklist-targeting-configured')).toBeTruthy();
      
      // Step 10: Activate campaign (simulate time passed)
      fireEvent.press(getByTestId('dev-tools'));
      fireEvent.press(getByText('Simulate Time: +1 day'));
      
      await waitFor(() => {
        expect(getByText('Campaign is now live!')).toBeTruthy();
        expect(getByText('Status: Active')).toBeTruthy();
        expect(testContext.mockServices.campaignService.activate).toHaveBeenCalled();
      });

      // Step 11: Monitor active campaign
      expect(getByTestId('campaign-dashboard')).toBeTruthy();
      
      // Real-time metrics
      await waitFor(() => {
        expect(getByText('Live Metrics')).toBeTruthy();
        expect(getByTestId('metric-impressions')).toBeTruthy();
        expect(getByTestId('metric-clicks')).toBeTruthy();
        expect(getByTestId('metric-conversions')).toBeTruthy();
        expect(getByTestId('metric-revenue')).toBeTruthy();
      });

      // Performance indicators
      expect(getByTestId('performance-chart')).toBeTruthy();
      expect(getByTestId('conversion-funnel')).toBeTruthy();
      expect(getByTestId('audience-engagement')).toBeTruthy();
      
      // Budget consumption
      expect(getByText('Budget Used: $2,345 / $10,000')).toBeTruthy();
      expect(getByTestId('budget-progress-bar')).toBeTruthy();
      
      // Step 12: Make mid-campaign adjustments
      fireEvent.press(getByText('Optimize Campaign'));
      
      expect(getByText('Optimization Suggestions')).toBeTruthy();
      expect(getByText('Increase budget for high-performing segments')).toBeTruthy();
      expect(getByText('Pause underperforming content')).toBeTruthy();
      
      // Apply optimization
      fireEvent.press(getByText('Apply Suggested Optimizations'));
      
      await waitFor(() => {
        expect(getByText('Optimizations applied')).toBeTruthy();
        expect(testContext.mockServices.campaignService.update).toHaveBeenCalled();
      });

      // Step 13: Complete campaign
      fireEvent.press(getByTestId('dev-tools'));
      fireEvent.press(getByText('Simulate Time: +7 days'));
      
      await waitFor(() => {
        expect(getByText('Campaign Completed')).toBeTruthy();
        expect(getByText('Status: Completed')).toBeTruthy();
        expect(testContext.mockServices.campaignService.complete).toHaveBeenCalled();
      });

      // Step 14: View final report
      fireEvent.press(getByText('View Campaign Report'));
      
      await waitFor(() => {
        expect(getByTestId('campaign-report')).toBeTruthy();
        expect(getByText('Campaign Performance Summary')).toBeTruthy();
        expect(getByText('Total Impressions: 125,000')).toBeTruthy();
        expect(getByText('Total Clicks: 8,750')).toBeTruthy();
        expect(getByText('Conversions: 450')).toBeTruthy();
        expect(getByText('Revenue Generated: $45,000')).toBeTruthy();
        expect(getByText('ROI: 350%')).toBeTruthy();
      });
    });

    it('should handle campaign pause and resume operations', async () => {
      const { getByText, getByTestId } = renderApp(
        <CampaignManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      // Load active campaign
      testContext.mockServices.campaignService.getById.mockResolvedValueOnce({
        ...mockData.campaign,
        status: 'active',
      });

      fireEvent.press(getByText('View Campaign'));
      
      await waitFor(() => {
        expect(getByText('Status: Active')).toBeTruthy();
      });

      // Pause campaign
      fireEvent.press(getByText('Pause Campaign'));
      
      expect(getByText('Pause Campaign?')).toBeTruthy();
      expect(getByText('This will temporarily stop all campaign activities')).toBeTruthy();
      
      fireEvent.changeText(getByTestId('pause-reason-input'), 'Budget review required');
      fireEvent.press(getByText('Confirm Pause'));
      
      await waitFor(() => {
        expect(getByText('Status: Paused')).toBeTruthy();
        expect(testContext.mockServices.campaignService.pause).toHaveBeenCalled();
        expect(getByText('Campaign paused')).toBeTruthy();
      });

      // Show pause indicator
      expect(getByTestId('pause-indicator')).toBeTruthy();
      expect(getByText('Paused: Budget review required')).toBeTruthy();
      
      // Resume campaign
      fireEvent.press(getByText('Resume Campaign'));
      
      expect(getByText('Resume Campaign?')).toBeTruthy();
      fireEvent.press(getByText('Resume Now'));
      
      await waitFor(() => {
        expect(getByText('Status: Active')).toBeTruthy();
        expect(testContext.mockServices.campaignService.activate).toHaveBeenCalled();
        expect(getByText('Campaign resumed')).toBeTruthy();
      });
    });

    it('should validate campaign dates and prevent conflicts', async () => {
      const { getByText, getByTestId } = renderApp(
        <CampaignManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Create Campaign'));
      
      // Try to set end date before start date
      fireEvent.press(getByTestId('start-date-picker'));
      fireEvent.press(getByText('Next Week'));
      
      fireEvent.press(getByTestId('end-date-picker'));
      fireEvent.press(getByText('Tomorrow'));
      
      expect(getByText('End date must be after start date')).toBeTruthy();
      
      // Check for campaign conflicts
      testContext.mockServices.campaignService.list.mockResolvedValueOnce([
        {
          id: 'existing-1',
          name: 'Existing Campaign',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 604800000).toISOString(),
        },
      ]);

      fireEvent.press(getByTestId('check-conflicts-button'));
      
      await waitFor(() => {
        expect(getByText('Campaign Conflict Detected')).toBeTruthy();
        expect(getByText('Overlaps with: Existing Campaign')).toBeTruthy();
      });
    });
  });

  describe('Campaign Templates and Cloning', () => {
    it('should create campaign from template', async () => {
      const { getByText, getByTestId } = renderApp(
        <CampaignManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Create Campaign'));
      fireEvent.press(getByText('Use Template'));
      
      await waitFor(() => {
        expect(getByTestId('template-selector')).toBeTruthy();
      });

      // Template categories
      expect(getByText('Seasonal')).toBeTruthy();
      expect(getByText('Product Launch')).toBeTruthy();
      expect(getByText('Flash Sale')).toBeTruthy();
      expect(getByText('Brand Awareness')).toBeTruthy();
      
      // Select template
      fireEvent.press(getByText('Seasonal'));
      fireEvent.press(getByTestId('template-summer-sale'));
      
      expect(getByText('Summer Sale Template')).toBeTruthy();
      expect(getByText('Duration: 14 days')).toBeTruthy();
      expect(getByText('Typical ROI: 280%')).toBeTruthy();
      
      fireEvent.press(getByText('Use This Template'));
      
      await waitFor(() => {
        // Template values pre-filled
        expect(getByTestId('campaign-name-input').props.value).toContain('Summer Sale');
        expect(getByTestId('campaign-type-select').props.value).toBe('Promotional');
        expect(getByTestId('total-budget-input').props.value).toBe('5000');
      });

      // Customize template values
      fireEvent.changeText(getByTestId('campaign-name-input'), 'Summer Sale 2024 - Custom');
      fireEvent.press(getByText('Create Campaign'));
      
      await waitFor(() => {
        expect(testContext.mockServices.campaignService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Summer Sale 2024 - Custom',
            templateId: 'template-summer-sale',
          })
        );
      });
    });

    it('should clone existing campaign', async () => {
      const { getByText, getByTestId } = renderApp(
        <CampaignManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      // Load existing campaign
      testContext.mockServices.campaignService.getById.mockResolvedValueOnce({
        ...mockData.campaign,
        name: 'Original Campaign',
        status: 'completed',
      });

      fireEvent.press(getByText('View Campaign'));
      fireEvent.press(getByText('Clone Campaign'));
      
      expect(getByTestId('clone-modal')).toBeTruthy();
      expect(getByText('Clone: Original Campaign')).toBeTruthy();
      
      // Clone options
      expect(getByTestId('clone-content-checkbox')).toBeTruthy();
      expect(getByTestId('clone-targeting-checkbox')).toBeTruthy();
      expect(getByTestId('clone-budget-checkbox')).toBeTruthy();
      expect(getByTestId('clone-schedule-checkbox')).toBeTruthy();
      
      // Uncheck schedule (will set new dates)
      fireEvent.press(getByTestId('clone-schedule-checkbox'));
      
      fireEvent.changeText(getByTestId('cloned-name-input'), 'Original Campaign - Copy');
      fireEvent.press(getByText('Create Clone'));
      
      await waitFor(() => {
        expect(testContext.mockServices.campaignService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Original Campaign - Copy',
            clonedFrom: expect.any(String),
            status: 'draft',
          })
        );
        expect(getByText('Campaign cloned successfully')).toBeTruthy();
      });
    });
  });

  describe('Campaign Collaboration and Approval', () => {
    it('should handle multi-user campaign collaboration', async () => {
      const { getByText, getByTestId } = renderApp(
        <CampaignManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Create Campaign'));
      fireEvent.changeText(getByTestId('campaign-name-input'), 'Collaborative Campaign');
      
      // Add collaborators
      fireEvent.press(getByText('Add Collaborators'));
      
      fireEvent.changeText(getByTestId('collaborator-email-input'), 'designer@company.com');
      fireEvent.press(getByTestId('collaborator-role-select'));
      fireEvent.press(getByText('Content Creator'));
      fireEvent.press(getByText('Add'));
      
      fireEvent.changeText(getByTestId('collaborator-email-input'), 'manager@company.com');
      fireEvent.press(getByTestId('collaborator-role-select'));
      fireEvent.press(getByText('Approver'));
      fireEvent.press(getByText('Add'));
      
      expect(getByText('designer@company.com (Content Creator)')).toBeTruthy();
      expect(getByText('manager@company.com (Approver)')).toBeTruthy();
      
      // Set permissions
      fireEvent.press(getByTestId('permissions-designer'));
      fireEvent.press(getByTestId('permission-edit-content'));
      fireEvent.press(getByTestId('permission-view-analytics'));
      fireEvent.press(getByText('Save Permissions'));
      
      fireEvent.press(getByText('Save Campaign'));
      
      await waitFor(() => {
        expect(testContext.mockServices.campaignService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            collaborators: expect.arrayContaining([
              expect.objectContaining({
                email: 'designer@company.com',
                role: 'Content Creator',
              }),
              expect.objectContaining({
                email: 'manager@company.com',
                role: 'Approver',
              }),
            ]),
          })
        );
      });

      // Show collaboration activity
      fireEvent.press(getByText('Activity Log'));
      
      await waitFor(() => {
        expect(getByText('Campaign created by user1')).toBeTruthy();
        expect(getByText('Collaborators added')).toBeTruthy();
      });
    });

    it('should enforce approval workflow for campaign launch', async () => {
      const { getByText, getByTestId } = renderApp(
        <CampaignManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      // Create campaign requiring approval
      fireEvent.press(getByText('Create Campaign'));
      fireEvent.changeText(getByTestId('campaign-name-input'), 'High Budget Campaign');
      fireEvent.changeText(getByTestId('total-budget-input'), '50000');
      
      fireEvent.press(getByText('Save Campaign'));
      
      await waitFor(() => {
        expect(getByText('Approval Required')).toBeTruthy();
        expect(getByText('Campaigns over $25,000 require approval')).toBeTruthy();
      });

      // Request approval
      fireEvent.press(getByText('Request Approval'));
      
      fireEvent.changeText(getByTestId('approval-notes-input'), 
        'Q3 major campaign for new product line launch');
      fireEvent.press(getByTestId('approver-select'));
      fireEvent.press(getByText('Marketing Director'));
      
      fireEvent.press(getByText('Send for Approval'));
      
      await waitFor(() => {
        expect(getByText('Status: Pending Approval')).toBeTruthy();
        expect(testContext.mockServices.notificationService.show).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'approval_requested',
          })
        );
      });

      // Simulate approval
      fireEvent.press(getByTestId('dev-tools'));
      fireEvent.press(getByText('Simulate: Approve Campaign'));
      
      await waitFor(() => {
        expect(getByText('Campaign Approved')).toBeTruthy();
        expect(getByText('Approved by: Marketing Director')).toBeTruthy();
        expect(getByText('You can now schedule or launch the campaign')).toBeTruthy();
      });
    });
  });

  describe('Campaign Analytics and Reporting', () => {
    it('should track and display real-time campaign metrics', async () => {
      const { getByText, getByTestId } = renderApp(
        <CampaignManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      // Load active campaign with metrics
      testContext.mockServices.campaignService.getById.mockResolvedValueOnce({
        ...mockData.campaign,
        status: 'active',
        metrics: {
          impressions: 50000,
          clicks: 3500,
          conversions: 175,
          revenue: 17500,
        },
      });

      fireEvent.press(getByText('View Campaign'));
      
      await waitFor(() => {
        expect(getByTestId('metrics-dashboard')).toBeTruthy();
      });

      // Metric cards
      expect(getByText('50,000')).toBeTruthy();
      expect(getByText('Impressions')).toBeTruthy();
      
      expect(getByText('3,500')).toBeTruthy();
      expect(getByText('Clicks')).toBeTruthy();
      expect(getByText('CTR: 7%')).toBeTruthy();
      
      expect(getByText('175')).toBeTruthy();
      expect(getByText('Conversions')).toBeTruthy();
      expect(getByText('CVR: 5%')).toBeTruthy();
      
      expect(getByText('$17,500')).toBeTruthy();
      expect(getByText('Revenue')).toBeTruthy();
      expect(getByText('ROAS: 1.75')).toBeTruthy();

      // Time range selector
      fireEvent.press(getByTestId('time-range-select'));
      fireEvent.press(getByText('Last 24 Hours'));
      
      await waitFor(() => {
        expect(testContext.mockServices.campaignService.getMetrics).toHaveBeenCalledWith(
          expect.objectContaining({
            timeRange: '24h',
          })
        );
      });

      // Breakdown views
      fireEvent.press(getByText('View Breakdown'));
      
      expect(getByText('By Content')).toBeTruthy();
      expect(getByText('By Audience')).toBeTruthy();
      expect(getByText('By Channel')).toBeTruthy();
      expect(getByText('By Device')).toBeTruthy();
      
      fireEvent.press(getByText('By Audience'));
      
      await waitFor(() => {
        expect(getByTestId('audience-breakdown-chart')).toBeTruthy();
        expect(getByText('New Customers: 45%')).toBeTruthy();
        expect(getByText('Loyal Customers: 35%')).toBeTruthy();
        expect(getByText('High Value: 20%')).toBeTruthy();
      });
    });

    it('should generate and export campaign reports', async () => {
      const { getByText, getByTestId } = renderApp(
        <CampaignManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('View Campaign'));
      fireEvent.press(getByText('Generate Report'));
      
      expect(getByTestId('report-options-modal')).toBeTruthy();
      
      // Report type
      fireEvent.press(getByTestId('report-type-select'));
      fireEvent.press(getByText('Executive Summary'));
      
      // Date range
      fireEvent.press(getByTestId('report-date-range'));
      fireEvent.press(getByText('Full Campaign Period'));
      
      // Include options
      fireEvent.press(getByTestId('include-metrics-checkbox'));
      fireEvent.press(getByTestId('include-audience-checkbox'));
      fireEvent.press(getByTestId('include-content-checkbox'));
      fireEvent.press(getByTestId('include-recommendations-checkbox'));
      
      // Format
      fireEvent.press(getByTestId('report-format-select'));
      fireEvent.press(getByText('PDF'));
      
      fireEvent.press(getByText('Generate Report'));
      
      // Show generation progress
      await waitFor(() => {
        expect(getByText('Generating report...')).toBeTruthy();
        expect(getByTestId('report-progress-bar')).toBeTruthy();
      });

      await waitFor(() => {
        expect(getByText('Report Ready')).toBeTruthy();
        expect(getByText('Download Report')).toBeTruthy();
        expect(getByText('Email Report')).toBeTruthy();
        expect(getByText('Schedule Regular Reports')).toBeTruthy();
      });

      // Download report
      fireEvent.press(getByText('Download Report'));
      
      await waitFor(() => {
        expect(testContext.mockServices.analyticsService.exportData).toHaveBeenCalled();
        expect(getByText('Report downloaded')).toBeTruthy();
      });
    });

    it('should provide AI-powered campaign insights', async () => {
      const { getByText, getByTestId } = renderApp(
        <CampaignManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('View Campaign'));
      fireEvent.press(getByText('AI Insights'));
      
      await waitFor(() => {
        expect(getByTestId('ai-insights-panel')).toBeTruthy();
      });

      // Performance insights
      expect(getByText('Performance Analysis')).toBeTruthy();
      expect(getByText('Campaign is performing 23% above benchmark')).toBeTruthy();
      expect(getByText('Best performing segment: New Customers')).toBeTruthy();
      expect(getByText('Optimal time: 2-4 PM PST')).toBeTruthy();
      
      // Predictions
      expect(getByText('Predictions')).toBeTruthy();
      expect(getByText('Expected conversions by end: 450-500')).toBeTruthy();
      expect(getByText('Projected ROI: 380-420%')).toBeTruthy();
      
      // Recommendations
      expect(getByText('Recommendations')).toBeTruthy();
      expect(getByText('Increase budget allocation to mobile users (+15%)')).toBeTruthy();
      expect(getByText('Pause Content Item #3 (low engagement)')).toBeTruthy();
      expect(getByText('Extend campaign by 3 days for maximum impact')).toBeTruthy();
      
      // Apply recommendations
      fireEvent.press(getByTestId('apply-recommendation-1'));
      
      await waitFor(() => {
        expect(getByText('Recommendation applied')).toBeTruthy();
        expect(testContext.mockServices.campaignService.update).toHaveBeenCalled();
      });
    });
  });

  describe('Campaign Budget Management', () => {
    it('should track budget consumption and send alerts', async () => {
      const { getByText, getByTestId } = renderApp(
        <CampaignManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      // Campaign with 80% budget consumed
      testContext.mockServices.campaignService.getById.mockResolvedValueOnce({
        ...mockData.campaign,
        status: 'active',
        budget: 10000,
        spent: 8000,
      });

      fireEvent.press(getByText('View Campaign'));
      
      await waitFor(() => {
        expect(getByTestId('budget-alert')).toBeTruthy();
        expect(getByText('Budget Alert: 80% consumed')).toBeTruthy();
        expect(getByText('$2,000 remaining')).toBeTruthy();
      });

      // Budget pacing
      expect(getByTestId('budget-pacing-chart')).toBeTruthy();
      expect(getByText('Current Pace: Accelerated')).toBeTruthy();
      expect(getByText('Projected to exhaust in 1.5 days')).toBeTruthy();
      
      // Budget actions
      expect(getByText('Increase Budget')).toBeTruthy();
      expect(getByText('Adjust Pacing')).toBeTruthy();
      expect(getByText('Set Hard Cap')).toBeTruthy();
      
      // Increase budget
      fireEvent.press(getByText('Increase Budget'));
      
      fireEvent.changeText(getByTestId('additional-budget-input'), '5000');
      fireEvent.changeText(getByTestId('budget-reason-input'), 'Strong performance metrics');
      
      fireEvent.press(getByText('Request Budget Increase'));
      
      await waitFor(() => {
        expect(getByText('Budget increase requested')).toBeTruthy();
        expect(testContext.mockServices.notificationService.show).toHaveBeenCalled();
      });
    });

    it('should implement budget pacing controls', async () => {
      const { getByText, getByTestId } = renderApp(
        <CampaignManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Create Campaign'));
      fireEvent.changeText(getByTestId('total-budget-input'), '10000');
      
      // Pacing options
      fireEvent.press(getByText('Budget Pacing'));
      
      expect(getByText('Even Distribution')).toBeTruthy();
      expect(getByText('Front-loaded')).toBeTruthy();
      expect(getByText('Back-loaded')).toBeTruthy();
      expect(getByText('Custom Curve')).toBeTruthy();
      
      // Select custom curve
      fireEvent.press(getByText('Custom Curve'));
      
      expect(getByTestId('pacing-curve-editor')).toBeTruthy();
      
      // Adjust curve points
      fireEvent.press(getByTestId('curve-point-day-1'));
      fireEvent.changeText(getByTestId('allocation-input'), '20');
      
      fireEvent.press(getByTestId('curve-point-day-3'));
      fireEvent.changeText(getByTestId('allocation-input'), '15');
      
      // Preview pacing
      fireEvent.press(getByText('Preview Pacing'));
      
      await waitFor(() => {
        expect(getByTestId('pacing-preview-chart')).toBeTruthy();
        expect(getByText('Day 1: $2,000')).toBeTruthy();
        expect(getByText('Day 3: $1,500')).toBeTruthy();
      });
    });
  });

  describe('Campaign Content and Bundle Integration', () => {
    it('should integrate content items with campaign lifecycle', async () => {
      const { getByText, getByTestId } = renderApp(
        <CampaignManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('View Campaign'));
      fireEvent.press(getByText('Manage Content'));
      
      // Content performance within campaign
      await waitFor(() => {
        expect(getByTestId('content-performance-grid')).toBeTruthy();
      });

      // Content items with metrics
      expect(getByText('Summer Hero Banner')).toBeTruthy();
      expect(getByText('Views: 25,000')).toBeTruthy();
      expect(getByText('CTR: 8.5%')).toBeTruthy();
      
      expect(getByText('Product Carousel')).toBeTruthy();
      expect(getByText('Views: 20,000')).toBeTruthy();
      expect(getByText('CTR: 6.2%')).toBeTruthy();
      
      // Content A/B testing
      fireEvent.press(getByText('A/B Test Content'));
      
      fireEvent.press(getByTestId('content-select-a'));
      fireEvent.press(getByText('Summer Hero Banner'));
      
      fireEvent.press(getByTestId('content-select-b'));
      fireEvent.press(getByText('Alternative Hero')).toBeTruthy();
      
      fireEvent.changeText(getByTestId('test-split-input'), '50');
      fireEvent.press(getByText('Start A/B Test'));
      
      await waitFor(() => {
        expect(getByText('A/B test started')).toBeTruthy();
        expect(testContext.mockServices.campaignService.update).toHaveBeenCalledWith(
          expect.objectContaining({
            abTests: expect.arrayContaining([
              expect.objectContaining({
                type: 'content',
                variants: expect.any(Array),
              }),
            ]),
          })
        );
      });
    });

    it('should manage bundle promotions within campaigns', async () => {
      const { getByText, getByTestId } = renderApp(
        <CampaignManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('View Campaign'));
      fireEvent.press(getByText('Manage Bundles'));
      
      // Bundle performance
      await waitFor(() => {
        expect(getByTestId('bundle-performance-list')).toBeTruthy();
      });

      expect(getByText('Summer Starter Pack')).toBeTruthy();
      expect(getByText('Units Sold: 145')).toBeTruthy();
      expect(getByText('Revenue: $14,500')).toBeTruthy();
      
      // Adjust bundle pricing
      fireEvent.press(getByTestId('bundle-settings-1'));
      fireEvent.press(getByText('Adjust Campaign Price'));
      
      fireEvent.changeText(getByTestId('campaign-discount-input'), '25');
      fireEvent.press(getByText('Apply Discount'));
      
      await waitFor(() => {
        expect(getByText('Bundle discount updated')).toBeTruthy();
        expect(testContext.mockServices.bundleService.setPricing).toHaveBeenCalled();
      });

      // Bundle inventory alerts
      expect(getByTestId('inventory-alert')).toBeTruthy();
      expect(getByText('Low Stock: Premium Bundle (12 units)')).toBeTruthy();
      
      // Auto-pause when out of stock
      fireEvent.press(getByTestId('auto-pause-settings'));
      fireEvent.press(getByTestId('auto-pause-toggle'));
      
      expect(getByText('Bundle will be hidden when stock < 5')).toBeTruthy();
    });
  });

  describe('Campaign Error Recovery and Rollback', () => {
    it('should handle campaign activation failures', async () => {
      const { getByText, getByTestId } = renderApp(
        <CampaignManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      // Setup activation failure
      testContext.mockServices.campaignService.activate.mockRejectedValueOnce({
        error: 'ACTIVATION_FAILED',
        reason: 'Content not approved',
      });

      fireEvent.press(getByText('View Campaign'));
      fireEvent.press(getByText('Activate Campaign'));
      
      await waitFor(() => {
        expect(getByText('Activation Failed')).toBeTruthy();
        expect(getByText('Content not approved')).toBeTruthy();
      });

      // Show resolution steps
      expect(getByText('Resolution Steps:')).toBeTruthy();
      expect(getByText('1. Review content approval status')).toBeTruthy();
      expect(getByText('2. Complete approval workflow')).toBeTruthy();
      expect(getByText('3. Retry activation')).toBeTruthy();
      
      // Quick actions
      expect(getByText('View Pending Approvals')).toBeTruthy();
      expect(getByText('Contact Approver')).toBeTruthy();
      expect(getByText('Switch to Draft')).toBeTruthy();
    });

    it('should support campaign rollback after issues', async () => {
      const { getByText, getByTestId } = renderApp(
        <CampaignManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      // Active campaign with issues
      testContext.mockServices.campaignService.getById.mockResolvedValueOnce({
        ...mockData.campaign,
        status: 'active',
        hasIssues: true,
      });

      fireEvent.press(getByText('View Campaign'));
      
      expect(getByTestId('campaign-issues-alert')).toBeTruthy();
      expect(getByText('Campaign Issues Detected')).toBeTruthy();
      
      fireEvent.press(getByText('View Issues'));
      
      expect(getByText('High bounce rate detected')).toBeTruthy();
      expect(getByText('Budget overspend risk')).toBeTruthy();
      
      // Rollback option
      fireEvent.press(getByText('Rollback Campaign'));
      
      expect(getByText('Rollback to previous version?')).toBeTruthy();
      expect(getByText('This will revert all changes made in the last 24 hours')).toBeTruthy();
      
      fireEvent.press(getByText('Confirm Rollback'));
      
      await waitFor(() => {
        expect(getByText('Campaign rolled back successfully')).toBeTruthy();
        expect(testContext.mockServices.campaignService.update).toHaveBeenCalledWith(
          expect.objectContaining({
            rollback: true,
            rollbackVersion: expect.any(String),
          })
        );
      });
    });
  });
});