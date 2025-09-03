import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { MarketingAnalyticsScreen } from '../MarketingAnalyticsScreen';
import { marketingService } from '../../../services/marketing/marketingService';

// Mock the marketing service
jest.mock('../../../services/marketing/marketingService');

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
};

describe('MarketingAnalyticsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (marketingService.getAnalytics as jest.Mock).mockResolvedValue({
      totalCampaigns: 15,
      activeCampaigns: 8,
      totalContent: 125,
      publishedContent: 98,
      overallMetrics: {
        impressions: 2500000,
        clicks: 125000,
        conversions: 6250,
        spend: 25000,
        roi: 350,
      },
      performance: [
        { date: '2024-03-01', impressions: 50000, clicks: 2500, conversions: 125 },
        { date: '2024-03-02', impressions: 55000, clicks: 2750, conversions: 138 },
        { date: '2024-03-03', impressions: 48000, clicks: 2400, conversions: 120 },
      ],
      campaignPerformance: [
        { id: '1', name: 'Spring Sale', impressions: 500000, clicks: 25000, roi: 450 },
        { id: '2', name: 'Summer Launch', impressions: 300000, clicks: 15000, roi: 320 },
      ],
      contentPerformance: [
        { id: '1', title: 'Blog Post 1', views: 15000, engagement: 0.12 },
        { id: '2', title: 'Video Content', views: 25000, engagement: 0.18 },
      ],
    });

    (marketingService.getDetailedAnalytics as jest.Mock).mockResolvedValue({
      hourlyData: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        impressions: Math.floor(Math.random() * 10000),
        clicks: Math.floor(Math.random() * 500),
      })),
      demographicData: {
        age: [
          { range: '18-24', percentage: 25 },
          { range: '25-34', percentage: 35 },
          { range: '35-44', percentage: 22 },
          { range: '45+', percentage: 18 },
        ],
        gender: [
          { type: 'Male', percentage: 45 },
          { type: 'Female', percentage: 52 },
          { type: 'Other', percentage: 3 },
        ],
      },
      geographicData: [
        { location: 'United States', users: 45000 },
        { location: 'United Kingdom', users: 12000 },
        { location: 'Canada', users: 8000 },
      ],
    });
  });

  describe('Rendering', () => {
    it('should render analytics screen', () => {
      const { getByText, getByTestId } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      expect(getByText('Marketing Analytics')).toBeTruthy();
      expect(getByTestId('analytics-screen')).toBeTruthy();
    });

    it('should display key metrics cards', async () => {
      const { getByText } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByText('Total Impressions')).toBeTruthy();
        expect(getByText('2.5M')).toBeTruthy();
        expect(getByText('Total Clicks')).toBeTruthy();
        expect(getByText('125K')).toBeTruthy();
        expect(getByText('Conversions')).toBeTruthy();
        expect(getByText('6,250')).toBeTruthy();
      });
    });

    it('should show ROI percentage', async () => {
      const { getByText, getByTestId } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByText('ROI')).toBeTruthy();
        expect(getByText('350%')).toBeTruthy();
        expect(getByTestId('roi-indicator').props.style).toContainEqual(
          expect.objectContaining({ color: expect.stringContaining('green') })
        );
      });
    });

    it('should display performance chart', async () => {
      const { getByTestId } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('performance-chart')).toBeTruthy();
        expect(getByTestId('chart-line-impressions')).toBeTruthy();
        expect(getByTestId('chart-line-clicks')).toBeTruthy();
      });
    });

    it('should show loading state initially', () => {
      const { getByTestId } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      expect(getByTestId('loading-indicator')).toBeTruthy();
    });
  });

  describe('Date Range Selection', () => {
    it('should display date range selector', async () => {
      const { getByTestId, getByText } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('date-range-selector')).toBeTruthy();
      });
      
      expect(getByText('Last 7 Days')).toBeTruthy();
    });

    it('should change date range', async () => {
      const { getByTestId, getByText } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        fireEvent.press(getByTestId('date-range-selector'));
      });
      
      expect(getByTestId('date-range-modal')).toBeTruthy();
      fireEvent.press(getByText('Last 30 Days'));
      
      await waitFor(() => {
        expect(marketingService.getAnalytics).toHaveBeenCalledWith(
          expect.objectContaining({ dateRange: '30days' })
        );
      });
    });

    it('should allow custom date range', async () => {
      const { getByTestId, getByText } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        fireEvent.press(getByTestId('date-range-selector'));
      });
      
      fireEvent.press(getByText('Custom Range'));
      
      expect(getByTestId('date-picker-start')).toBeTruthy();
      expect(getByTestId('date-picker-end')).toBeTruthy();
    });
  });

  describe('Charts and Visualizations', () => {
    it('should display line chart for trends', async () => {
      const { getByTestId } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('trends-line-chart')).toBeTruthy();
      });
      
      const chart = getByTestId('trends-line-chart');
      expect(chart.props.data).toHaveLength(3); // 3 days of data
    });

    it('should show bar chart for campaign comparison', async () => {
      const { getByTestId } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('campaign-comparison-chart')).toBeTruthy();
      });
      
      const chart = getByTestId('campaign-comparison-chart');
      expect(chart.props.data).toContainEqual(
        expect.objectContaining({ name: 'Spring Sale' })
      );
    });

    it('should display pie chart for demographics', async () => {
      const { getByTestId } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        fireEvent.press(getByTestId('view-demographics'));
      });
      
      expect(getByTestId('demographics-pie-chart')).toBeTruthy();
      expect(getByTestId('age-distribution-chart')).toBeTruthy();
      expect(getByTestId('gender-distribution-chart')).toBeTruthy();
    });

    it('should show geographic heat map', async () => {
      const { getByTestId } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        fireEvent.press(getByTestId('view-geographic'));
      });
      
      expect(getByTestId('geographic-map')).toBeTruthy();
      expect(getByTestId('country-list')).toBeTruthy();
    });
  });

  describe('Metrics Filtering', () => {
    it('should filter by campaign', async () => {
      const { getByTestId, getByText } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        fireEvent.press(getByTestId('filter-button'));
      });
      
      fireEvent.press(getByText('Spring Sale'));
      
      await waitFor(() => {
        expect(marketingService.getAnalytics).toHaveBeenCalledWith(
          expect.objectContaining({ campaignId: '1' })
        );
      });
    });

    it('should filter by metric type', async () => {
      const { getByTestId } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        fireEvent.press(getByTestId('metric-selector'));
      });
      
      fireEvent.press(getByTestId('metric-conversions'));
      
      const chart = getByTestId('performance-chart');
      expect(chart.props.primaryMetric).toBe('conversions');
    });

    it('should compare multiple campaigns', async () => {
      const { getByTestId, getByText } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        fireEvent.press(getByTestId('compare-button'));
      });
      
      fireEvent.press(getByText('Spring Sale'));
      fireEvent.press(getByText('Summer Launch'));
      fireEvent.press(getByTestId('apply-comparison'));
      
      expect(getByTestId('comparison-chart')).toBeTruthy();
    });
  });

  describe('Export Functionality', () => {
    it('should display export options', async () => {
      const { getByTestId, getByText } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        fireEvent.press(getByTestId('export-button'));
      });
      
      expect(getByText('Export as PDF')).toBeTruthy();
      expect(getByText('Export as CSV')).toBeTruthy();
      expect(getByText('Export as Excel')).toBeTruthy();
    });

    it('should export data as CSV', async () => {
      const { getByTestId, getByText } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        fireEvent.press(getByTestId('export-button'));
      });
      
      fireEvent.press(getByText('Export as CSV'));
      
      await waitFor(() => {
        expect(marketingService.exportAnalytics).toHaveBeenCalledWith(
          expect.objectContaining({ format: 'csv' })
        );
      });
    });

    it('should allow scheduling reports', async () => {
      const { getByTestId, getByText } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        fireEvent.press(getByTestId('schedule-report-button'));
      });
      
      expect(getByTestId('schedule-modal')).toBeTruthy();
      expect(getByText('Daily')).toBeTruthy();
      expect(getByText('Weekly')).toBeTruthy();
      expect(getByText('Monthly')).toBeTruthy();
    });
  });

  describe('Performance Insights', () => {
    it('should display AI-powered insights', async () => {
      const { getByTestId, getByText } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('insights-section')).toBeTruthy();
      });
      
      expect(getByText('Key Insights')).toBeTruthy();
      expect(getByText(/Conversion rate increased by/)).toBeTruthy();
    });

    it('should show performance alerts', async () => {
      const { getByTestId, getByText } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('alerts-section')).toBeTruthy();
      });
      
      expect(getByText('⚠️ CTR below average')).toBeTruthy();
      expect(getByText('✅ ROI exceeds target')).toBeTruthy();
    });

    it('should provide recommendations', async () => {
      const { getByTestId, getByText } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        fireEvent.press(getByTestId('view-recommendations'));
      });
      
      expect(getByText('Recommendations')).toBeTruthy();
      expect(getByText(/Increase budget for/)).toBeTruthy();
      expect(getByText(/Optimize content for/)).toBeTruthy();
    });
  });

  describe('Real-time Updates', () => {
    it('should show real-time indicator', async () => {
      const { getByTestId } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('real-time-indicator')).toBeTruthy();
      });
      
      const indicator = getByTestId('real-time-indicator');
      expect(indicator.props.style).toContainEqual(
        expect.objectContaining({ backgroundColor: 'green' })
      );
    });

    it('should auto-refresh data', async () => {
      jest.useFakeTimers();
      
      const { getByTestId } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('auto-refresh-toggle')).toBeTruthy();
      });
      
      fireEvent.press(getByTestId('auto-refresh-toggle'));
      
      jest.advanceTimersByTime(30000); // 30 seconds
      
      expect(marketingService.getAnalytics).toHaveBeenCalledTimes(2);
      
      jest.useRealTimers();
    });
  });

  describe('Drill-down Navigation', () => {
    it('should navigate to campaign details on click', async () => {
      const { getByTestId } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('campaign-row-1')).toBeTruthy();
      });
      
      fireEvent.press(getByTestId('campaign-row-1'));
      
      expect(mockNavigate).toHaveBeenCalledWith('CampaignDetails', {
        campaignId: '1',
        fromAnalytics: true,
      });
    });

    it('should navigate to content details', async () => {
      const { getByTestId } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('content-row-1')).toBeTruthy();
      });
      
      fireEvent.press(getByTestId('content-row-1'));
      
      expect(mockNavigate).toHaveBeenCalledWith('ContentDetails', {
        contentId: '1',
        fromAnalytics: true,
      });
    });
  });

  describe('Custom Metrics', () => {
    it('should allow adding custom metrics', async () => {
      const { getByTestId, getByPlaceholderText } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        fireEvent.press(getByTestId('add-custom-metric'));
      });
      
      expect(getByTestId('custom-metric-modal')).toBeTruthy();
      
      fireEvent.changeText(getByPlaceholderText('Metric Name'), 'Cost per Acquisition');
      fireEvent.changeText(getByPlaceholderText('Formula'), 'spend / conversions');
      
      fireEvent.press(getByTestId('save-custom-metric'));
      
      await waitFor(() => {
        expect(getByTestId('metric-cost-per-acquisition')).toBeTruthy();
      });
    });

    it('should calculate custom metrics', async () => {
      const { getByTestId, getByText } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('custom-metrics-section')).toBeTruthy();
      });
      
      // spend: 25000, conversions: 6250
      expect(getByText('CPA: $4.00')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', async () => {
      const { getByLabelText } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByLabelText('Marketing Analytics Dashboard')).toBeTruthy();
        expect(getByLabelText('Date range selector')).toBeTruthy();
        expect(getByLabelText('Export analytics data')).toBeTruthy();
      });
    });

    it('should announce metric changes', async () => {
      const { getByTestId, getByText } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        fireEvent.press(getByTestId('refresh-button'));
      });
      
      const updateMessage = getByText('Analytics updated');
      expect(updateMessage.props.accessibilityRole).toBe('alert');
      expect(updateMessage.props.accessibilityLiveRegion).toBe('polite');
    });

    it('should support screen reader navigation', () => {
      const { getByTestId } = render(
        <MarketingAnalyticsScreen navigation={mockNavigation} />
      );
      
      const metricsSection = getByTestId('metrics-section');
      expect(metricsSection.props.accessibilityRole).toBe('region');
      expect(metricsSection.props.accessibilityLabel).toBe('Key Performance Metrics');
    });
  });
});