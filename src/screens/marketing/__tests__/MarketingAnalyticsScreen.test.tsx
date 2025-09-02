import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Share } from 'react-native';

// Mock the screen (doesn't exist yet - RED phase)
const MarketingAnalyticsScreen = jest.fn(() => null);
jest.mock('../MarketingAnalyticsScreen', () => ({
  default: jest.fn(() => null)
}));

// Mock analytics hooks
jest.mock('@/hooks/marketing/useMarketingAnalytics', () => ({
  useMarketingAnalytics: jest.fn(() => ({
    metrics: {
      revenue: { current: 45000, previous: 38000, change: 18.4 },
      conversions: { current: 450, previous: 380, change: 18.4 },
      traffic: { current: 12500, previous: 10000, change: 25 },
      engagement: { current: 3.5, previous: 3.2, change: 9.4 },
      roi: { current: 320, previous: 280, change: 14.3 }
    },
    chartData: {
      revenue: [
        { date: '2025-01-01', value: 1500 },
        { date: '2025-01-02', value: 1800 },
        { date: '2025-01-03', value: 2200 },
        { date: '2025-01-04', value: 1900 },
        { date: '2025-01-05', value: 2500 }
      ],
      conversions: [
        { date: '2025-01-01', value: 45 },
        { date: '2025-01-02', value: 52 },
        { date: '2025-01-03', value: 48 },
        { date: '2025-01-04', value: 61 },
        { date: '2025-01-05', value: 58 }
      ]
    },
    campaigns: [
      { id: '1', name: 'Summer Sale', roi: 450, conversions: 125 },
      { id: '2', name: 'Flash Deal', roi: 320, conversions: 89 },
      { id: '3', name: 'Welcome Series', roi: 280, conversions: 156 }
    ],
    dateRange: { start: '2025-01-01', end: '2025-01-31' },
    setDateRange: jest.fn(),
    isLoading: false,
    refetch: jest.fn()
  }))
}));

jest.mock('@/hooks/marketing/useExportData', () => ({
  useExportData: jest.fn(() => ({
    exportToCSV: jest.fn(),
    exportToPDF: jest.fn(),
    sendEmail: jest.fn(),
    isExporting: false
  }))
}));

// Mock Share API
jest.spyOn(Share, 'share');

const mockNavigate = jest.fn();

describe('MarketingAnalyticsScreen', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { 
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });
  
  const renderScreen = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <MarketingAnalyticsScreen {...props} />
        </NavigationContainer>
      </QueryClientProvider>
    );
  };
  
  describe('Metrics Dashboard', () => {
    it('should display key metrics cards', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('metric-card-revenue')).toBeTruthy();
        expect(getByTestId('metric-card-conversions')).toBeTruthy();
        expect(getByTestId('metric-card-traffic')).toBeTruthy();
        expect(getByTestId('metric-card-engagement')).toBeTruthy();
        expect(getByTestId('metric-card-roi')).toBeTruthy();
      });
    });
    
    it('should show metric values', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('metric-value-revenue')).toHaveTextContent('$45,000');
        expect(getByTestId('metric-value-conversions')).toHaveTextContent('450');
        expect(getByTestId('metric-value-traffic')).toHaveTextContent('12,500');
        expect(getByTestId('metric-value-engagement')).toHaveTextContent('3.5%');
        expect(getByTestId('metric-value-roi')).toHaveTextContent('320%');
      });
    });
    
    it('should display percentage changes', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('metric-change-revenue')).toHaveTextContent('+18.4%');
        expect(getByTestId('metric-change-conversions')).toHaveTextContent('+18.4%');
        expect(getByTestId('metric-change-traffic')).toHaveTextContent('+25%');
      });
    });
    
    it('should show trend indicators', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('trend-up-revenue')).toBeTruthy();
        expect(getByTestId('trend-up-conversions')).toBeTruthy();
        expect(getByTestId('trend-up-traffic')).toBeTruthy();
      });
    });
    
    it('should navigate to detailed metric view', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('metric-card-revenue'));
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('MetricDetails', {
        metric: 'revenue'
      });
    });
  });
  
  describe('Charts and Visualizations', () => {
    it('should render revenue chart', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('revenue-chart')).toBeTruthy();
      });
    });
    
    it('should render conversion chart', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('conversion-chart')).toBeTruthy();
      });
    });
    
    it('should switch between chart types', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('chart-type-selector'));
        fireEvent.press(getByText('Bar Chart'));
      });
      
      expect(getByTestId('revenue-bar-chart')).toBeTruthy();
    });
    
    it('should toggle chart visibility', async () => {
      const { getByTestId, queryByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('toggle-conversion-chart'));
      });
      
      expect(queryByTestId('conversion-chart')).toBeNull();
    });
    
    it('should show data points on chart tap', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const chart = getByTestId('revenue-chart');
        fireEvent.press(chart, { locationX: 100, locationY: 50 });
      });
      
      expect(getByTestId('chart-tooltip')).toBeTruthy();
      expect(getByTestId('tooltip-value')).toHaveTextContent('$1,800');
      expect(getByTestId('tooltip-date')).toHaveTextContent('Jan 2, 2025');
    });
    
    it('should zoom in/out on charts', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const chart = getByTestId('revenue-chart');
        fireEvent(chart, 'onPinch', { scale: 2 });
      });
      
      expect(getByTestId('zoom-level')).toHaveTextContent('200%');
    });
  });
  
  describe('Date Range Selection', () => {
    it('should display date range selector', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('date-range-selector')).toBeTruthy();
        expect(getByText('Jan 1 - Jan 31, 2025')).toBeTruthy();
      });
    });
    
    it('should show preset date ranges', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('date-range-selector'));
      });
      
      expect(getByText('Last 7 days')).toBeTruthy();
      expect(getByText('Last 30 days')).toBeTruthy();
      expect(getByText('Last Quarter')).toBeTruthy();
      expect(getByText('Year to Date')).toBeTruthy();
      expect(getByText('Custom Range')).toBeTruthy();
    });
    
    it('should select preset range', async () => {
      const { getByTestId, getByText } = renderScreen();
      const { setDateRange } = require('@/hooks/marketing/useMarketingAnalytics').useMarketingAnalytics();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('date-range-selector'));
        fireEvent.press(getByText('Last 7 days'));
      });
      
      expect(setDateRange).toHaveBeenCalledWith(expect.objectContaining({
        preset: 'last7days'
      }));
    });
    
    it('should open custom date picker', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('date-range-selector'));
        fireEvent.press(getByText('Custom Range'));
      });
      
      expect(getByTestId('custom-date-modal')).toBeTruthy();
      expect(getByTestId('start-date-picker')).toBeTruthy();
      expect(getByTestId('end-date-picker')).toBeTruthy();
    });
    
    it('should apply custom date range', async () => {
      const { getByTestId, getByText } = renderScreen();
      const { setDateRange } = require('@/hooks/marketing/useMarketingAnalytics').useMarketingAnalytics();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('date-range-selector'));
        fireEvent.press(getByText('Custom Range'));
        
        const startPicker = getByTestId('start-date-picker');
        fireEvent(startPicker, 'onDateChange', new Date('2025-01-15'));
        
        const endPicker = getByTestId('end-date-picker');
        fireEvent(endPicker, 'onDateChange', new Date('2025-01-31'));
        
        fireEvent.press(getByTestId('apply-date-range'));
      });
      
      expect(setDateRange).toHaveBeenCalledWith({
        start: '2025-01-15',
        end: '2025-01-31'
      });
    });
  });
  
  describe('Campaign Performance', () => {
    it('should display campaign performance table', async () => {
      const { getByTestId, getAllByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('campaign-performance-table')).toBeTruthy();
        const rows = getAllByTestId(/campaign-row-/);
        expect(rows).toHaveLength(3);
      });
    });
    
    it('should show campaign metrics', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('campaign-name-1')).toHaveTextContent('Summer Sale');
        expect(getByTestId('campaign-roi-1')).toHaveTextContent('450%');
        expect(getByTestId('campaign-conversions-1')).toHaveTextContent('125');
      });
    });
    
    it('should sort campaigns by metric', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('sort-by-roi'));
      });
      
      const firstRow = getByTestId('campaign-row-0');
      expect(firstRow).toHaveTextContent('Summer Sale');
    });
    
    it('should filter campaigns', async () => {
      const { getByTestId, getAllByTestId } = renderScreen();
      
      await waitFor(() => {
        const searchInput = getByTestId('campaign-search');
        fireEvent.changeText(searchInput, 'Summer');
      });
      
      const rows = getAllByTestId(/campaign-row-/);
      expect(rows).toHaveLength(1);
    });
    
    it('should navigate to campaign details', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('campaign-row-1'));
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('CampaignAnalytics', {
        campaignId: '1'
      });
    });
  });
  
  describe('Export and Sharing', () => {
    it('should show export options', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('export-button'));
      });
      
      expect(getByTestId('export-modal')).toBeTruthy();
    });
    
    it('should export to CSV', async () => {
      const { getByTestId, getByText } = renderScreen();
      const { exportToCSV } = require('@/hooks/marketing/useExportData').useExportData();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('export-button'));
        fireEvent.press(getByText('Export as CSV'));
      });
      
      expect(exportToCSV).toHaveBeenCalledWith(expect.any(Object));
    });
    
    it('should export to PDF', async () => {
      const { getByTestId, getByText } = renderScreen();
      const { exportToPDF } = require('@/hooks/marketing/useExportData').useExportData();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('export-button'));
        fireEvent.press(getByText('Export as PDF'));
      });
      
      expect(exportToPDF).toHaveBeenCalledWith(expect.any(Object));
    });
    
    it('should send report via email', async () => {
      const { getByTestId, getByText } = renderScreen();
      const { sendEmail } = require('@/hooks/marketing/useExportData').useExportData();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('export-button'));
        fireEvent.press(getByText('Send via Email'));
        
        const emailInput = getByTestId('email-input');
        fireEvent.changeText(emailInput, 'team@company.com');
        fireEvent.press(getByTestId('send-email-button'));
      });
      
      expect(sendEmail).toHaveBeenCalledWith('team@company.com', expect.any(Object));
    });
    
    it('should share analytics snapshot', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('share-button'));
      });
      
      expect(Share.share).toHaveBeenCalledWith({
        message: expect.stringContaining('Marketing Analytics'),
        title: 'Analytics Report'
      });
    });
  });
  
  describe('Filters and Segments', () => {
    it('should display filter options', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('filter-button'));
      });
      
      expect(getByTestId('filter-panel')).toBeTruthy();
    });
    
    it('should filter by channel', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('filter-button'));
        fireEvent.press(getByText('Email'));
        fireEvent.press(getByText('Social'));
      });
      
      expect(getByTestId('active-filters')).toHaveTextContent('Email, Social');
    });
    
    it('should filter by product category', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('filter-button'));
        fireEvent.press(getByTestId('category-filter'));
        fireEvent.press(getByText('Electronics'));
      });
      
      expect(getByTestId('active-filters')).toHaveTextContent('Electronics');
    });
    
    it('should clear all filters', async () => {
      const { getByTestId, getByText, queryByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('filter-button'));
        fireEvent.press(getByText('Email'));
        fireEvent.press(getByTestId('clear-filters'));
      });
      
      expect(queryByTestId('active-filters')).toBeNull();
    });
  });
  
  describe('Pull to Refresh', () => {
    it('should handle pull to refresh', async () => {
      const { getByTestId } = renderScreen();
      const { refetch } = require('@/hooks/marketing/useMarketingAnalytics').useMarketingAnalytics();
      
      await waitFor(() => {
        const scrollView = getByTestId('analytics-scroll-view');
        fireEvent(scrollView, 'refresh');
      });
      
      expect(refetch).toHaveBeenCalled();
    });
  });
  
  describe('Loading and Error States', () => {
    it('should show loading state', async () => {
      require('@/hooks/marketing/useMarketingAnalytics').useMarketingAnalytics.mockReturnValue({
        isLoading: true,
        metrics: {},
        chartData: {},
        campaigns: []
      });
      
      const { getByTestId } = renderScreen();
      
      expect(getByTestId('analytics-loading')).toBeTruthy();
      expect(getByTestId('skeleton-charts')).toBeTruthy();
    });
    
    it('should display error message', async () => {
      require('@/hooks/marketing/useMarketingAnalytics').useMarketingAnalytics.mockReturnValue({
        isError: true,
        error: new Error('Failed to load analytics'),
        metrics: {},
        chartData: {},
        campaigns: []
      });
      
      const { getByText } = renderScreen();
      
      expect(getByText('Failed to load analytics')).toBeTruthy();
    });
    
    it('should show retry button on error', async () => {
      require('@/hooks/marketing/useMarketingAnalytics').useMarketingAnalytics.mockReturnValue({
        isError: true,
        error: new Error('Network error'),
        refetch: jest.fn(),
        metrics: {},
        chartData: {},
        campaigns: []
      });
      
      const { getByText } = renderScreen();
      const retryButton = getByText('Retry');
      
      fireEvent.press(retryButton);
      
      expect(require('@/hooks/marketing/useMarketingAnalytics').useMarketingAnalytics().refetch).toHaveBeenCalled();
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper accessibility labels', async () => {
      const { getByLabelText } = renderScreen();
      
      await waitFor(() => {
        expect(getByLabelText('Marketing Analytics Dashboard')).toBeTruthy();
        expect(getByLabelText('Revenue Chart')).toBeTruthy();
        expect(getByLabelText('Conversion Chart')).toBeTruthy();
        expect(getByLabelText('Campaign Performance Table')).toBeTruthy();
      });
    });
    
    it('should announce metric changes', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const announcement = getByTestId('screen-reader-announcement');
        expect(announcement).toHaveTextContent('Revenue increased by 18.4%');
      });
    });
    
    it('should have accessible chart descriptions', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const chart = getByTestId('revenue-chart');
        expect(chart.props.accessibilityLabel).toBe('Revenue trend chart showing daily values');
        expect(chart.props.accessibilityHint).toBe('Double tap to view detailed data');
      });
    });
  });
});