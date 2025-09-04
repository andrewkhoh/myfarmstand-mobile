import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MarketingAnalyticsScreen } from '../MarketingAnalyticsScreen';
import { useMarketingAnalytics } from '@/hooks/marketing';

jest.mock('@/hooks/marketing');

describe('MarketingAnalyticsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render analytics charts', () => {
    (useMarketingAnalytics as jest.Mock).mockReturnValue({
      analytics: {
        revenue: [1000, 1500, 2000, 2500],
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        productBreakdown: [
          { name: 'Product A', value: 40, color: '#FF6384' },
          { name: 'Product B', value: 30, color: '#36A2EB' },
          { name: 'Product C', value: 30, color: '#FFCE56' },
        ],
      },
      dateRange: { start: new Date(), end: new Date() },
      setDateRange: jest.fn(),
      isLoading: false,
    });

    const { getByTestId } = render(<MarketingAnalyticsScreen />);
    
    expect(getByTestId('revenue-chart')).toBeTruthy();
    expect(getByTestId('product-breakdown-chart')).toBeTruthy();
  });

  it('should handle date range selection', () => {
    const mockSetDateRange = jest.fn();
    (useMarketingAnalytics as jest.Mock).mockReturnValue({
      analytics: { revenue: [], labels: [], productBreakdown: [] },
      dateRange: { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
      setDateRange: mockSetDateRange,
      isLoading: false,
    });

    const { getByTestId } = render(<MarketingAnalyticsScreen />);
    
    const dateRangePicker = getByTestId('date-range-picker');
    fireEvent.press(dateRangePicker);
    
    const lastMonthButton = getByTestId('preset-last-month');
    fireEvent.press(lastMonthButton);
    
    expect(mockSetDateRange).toHaveBeenCalled();
  });

  it('should display key metrics', () => {
    (useMarketingAnalytics as jest.Mock).mockReturnValue({
      analytics: {
        revenue: [1000, 1500, 2000, 2500],
        labels: [],
        productBreakdown: [],
        totalRevenue: 7000,
        avgOrderValue: 125,
        conversionRate: 0.23,
        totalOrders: 56,
      },
      dateRange: { start: new Date(), end: new Date() },
      setDateRange: jest.fn(),
      isLoading: false,
    });

    const { getByText } = render(<MarketingAnalyticsScreen />);
    
    expect(getByText('$7,000.00')).toBeTruthy();
    expect(getByText('$125.00')).toBeTruthy();
    expect(getByText('23%')).toBeTruthy();
    expect(getByText('56')).toBeTruthy();
  });

  it('should show loading state', () => {
    (useMarketingAnalytics as jest.Mock).mockReturnValue({
      analytics: null,
      dateRange: { start: new Date(), end: new Date() },
      setDateRange: jest.fn(),
      isLoading: true,
    });

    const { getByTestId } = render(<MarketingAnalyticsScreen />);
    
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('should export analytics data', () => {
    const mockExport = jest.fn();
    (useMarketingAnalytics as jest.Mock).mockReturnValue({
      analytics: { revenue: [1000, 1500], labels: ['W1', 'W2'], productBreakdown: [] },
      dateRange: { start: new Date(), end: new Date() },
      setDateRange: jest.fn(),
      isLoading: false,
      exportAnalytics: mockExport,
    });

    const { getByText } = render(<MarketingAnalyticsScreen />);
    
    const exportButton = getByText('Export');
    fireEvent.press(exportButton);
    
    expect(mockExport).toHaveBeenCalled();
  });

  it('should switch between chart types', () => {
    (useMarketingAnalytics as jest.Mock).mockReturnValue({
      analytics: { revenue: [], labels: [], productBreakdown: [] },
      dateRange: { start: new Date(), end: new Date() },
      setDateRange: jest.fn(),
      isLoading: false,
    });

    const { getByTestId } = render(<MarketingAnalyticsScreen />);
    
    const chartTypeSelector = getByTestId('chart-type-selector');
    fireEvent.press(chartTypeSelector);
    
    const barChartOption = getByTestId('chart-type-bar');
    fireEvent.press(barChartOption);
    
    expect(getByTestId('revenue-bar-chart')).toBeTruthy();
  });

  it('should display campaign performance', () => {
    (useMarketingAnalytics as jest.Mock).mockReturnValue({
      analytics: {
        revenue: [],
        labels: [],
        productBreakdown: [],
        campaignPerformance: [
          { name: 'Summer Sale', roi: 2.5, conversions: 120 },
          { name: 'Back to School', roi: 1.8, conversions: 85 },
        ],
      },
      dateRange: { start: new Date(), end: new Date() },
      setDateRange: jest.fn(),
      isLoading: false,
    });

    const { getByText } = render(<MarketingAnalyticsScreen />);
    
    expect(getByText('Summer Sale')).toBeTruthy();
    expect(getByText('ROI: 2.5x')).toBeTruthy();
    expect(getByText('120 conversions')).toBeTruthy();
  });

  it('should refresh analytics data', async () => {
    const mockRefresh = jest.fn();
    (useMarketingAnalytics as jest.Mock).mockReturnValue({
      analytics: { revenue: [], labels: [], productBreakdown: [] },
      dateRange: { start: new Date(), end: new Date() },
      setDateRange: jest.fn(),
      isLoading: false,
      refreshAnalytics: mockRefresh,
    });

    const { getByTestId } = render(<MarketingAnalyticsScreen />);
    
    const refreshButton = getByTestId('refresh-button');
    fireEvent.press(refreshButton);
    
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('should show comparison view', () => {
    (useMarketingAnalytics as jest.Mock).mockReturnValue({
      analytics: {
        revenue: [],
        labels: [],
        productBreakdown: [],
        comparison: {
          current: { revenue: 5000, orders: 40 },
          previous: { revenue: 4000, orders: 35 },
        },
      },
      dateRange: { start: new Date(), end: new Date() },
      setDateRange: jest.fn(),
      isLoading: false,
    });

    const { getByText } = render(<MarketingAnalyticsScreen />);
    
    expect(getByText('+25%')).toBeTruthy();
    expect(getByText('+14%')).toBeTruthy();
  });

  it('should filter by product category', () => {
    const mockSetFilter = jest.fn();
    (useMarketingAnalytics as jest.Mock).mockReturnValue({
      analytics: { revenue: [], labels: [], productBreakdown: [] },
      dateRange: { start: new Date(), end: new Date() },
      setDateRange: jest.fn(),
      isLoading: false,
      categories: ['Electronics', 'Clothing', 'Food'],
      setProductFilter: mockSetFilter,
    });

    const { getByTestId, getByText } = render(<MarketingAnalyticsScreen />);
    
    const filterDropdown = getByTestId('category-filter');
    fireEvent.press(filterDropdown);
    
    const electronicsOption = getByText('Electronics');
    fireEvent.press(electronicsOption);
    
    expect(mockSetFilter).toHaveBeenCalledWith('Electronics');
  });
});