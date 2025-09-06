import React from 'react';
import { render, waitFor, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RevenueInsights } from '../RevenueInsights';

// Mock the hooks
jest.mock('@/hooks/executive/usePredictiveAnalytics');
jest.mock('@/hooks/executive/useMetricTrends');
jest.mock('@/hooks/role-based/useUserRole');

import { usePredictiveAnalytics } from '@/hooks/executive/usePredictiveAnalytics';
import { useMetricTrends } from '@/hooks/executive/useMetricTrends';
import { useUserRole } from '@/hooks/role-based/useUserRole';

describe('RevenueInsights', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Mock useUserRole to return executive role
    (useUserRole as jest.Mock).mockReturnValue({
      role: 'executive',
      hasPermission: jest.fn(() => true)
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('Rendering', () => {
    it('should render without crashing', () => {
      (usePredictiveAnalytics as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isSuccess: true
      });

      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByTestId } = renderWithProvider(<RevenueInsights />);
      expect(getByTestId('revenue-insights')).toBeTruthy();
    });

    it('should show loading indicator when predictions are loading', () => {
      (usePredictiveAnalytics as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true
      });

      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByTestId } = renderWithProvider(<RevenueInsights />);
      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('should show loading indicator when trends are loading', () => {
      (usePredictiveAnalytics as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true
      });

      const { getByTestId } = renderWithProvider(<RevenueInsights />);
      expect(getByTestId('loading-indicator')).toBeTruthy();
    });
  });

  describe('Revenue Predictions Integration', () => {
    it('should display current revenue data', () => {
      const mockPredictions = {
        revenue: {
          current: 150000,
          projected: 175000,
          growth: 12.5,
          confidence: 0.85
        },
        forecast: {
          weekly: { revenue: 35000, growth: 10 },
          monthly: { revenue: 165000, growth: 12.5 },
          quarterly: { revenue: 500000, growth: 15 }
        }
      };

      (usePredictiveAnalytics as jest.Mock).mockReturnValue({
        data: mockPredictions,
        isLoading: false,
        isSuccess: true
      });

      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByText } = renderWithProvider(<RevenueInsights />);
      expect(getByText('$150,000')).toBeTruthy();
      expect(getByText('Current Month Revenue')).toBeTruthy();
      expect(getByText('+12.5% vs Last Month')).toBeTruthy();
    });

    it('should display confidence score when available', () => {
      const mockPredictions = {
        revenue: {
          current: 150000,
          confidence: 0.85
        },
        forecast: {}
      };

      (usePredictiveAnalytics as jest.Mock).mockReturnValue({
        data: mockPredictions,
        isLoading: false
      });

      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByTestId } = renderWithProvider(<RevenueInsights />);
      expect(getByTestId('confidence-score')).toBeTruthy();
      expect(getByTestId('confidence-score').props.children).toContain('85%');
    });

    it('should display revenue forecasts', () => {
      const mockPredictions = {
        revenue: { current: 150000 },
        forecast: {
          weekly: { revenue: 35000, growth: 10 },
          monthly: { revenue: 165000, growth: 12.5 },
          quarterly: { revenue: 500000, growth: 15 }
        }
      };

      (usePredictiveAnalytics as jest.Mock).mockReturnValue({
        data: mockPredictions,
        isLoading: false
      });

      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByText } = renderWithProvider(<RevenueInsights />);
      expect(getByText('$35,000')).toBeTruthy();
      expect(getByText('$165,000')).toBeTruthy();
      expect(getByText('$500,000')).toBeTruthy();
    });
  });

  describe('Trends Integration', () => {
    it('should display daily revenue trends', () => {
      const mockTrends = {
        daily: [
          { date: '2024-01-01', revenue: 5000, orders: 50 },
          { date: '2024-01-02', revenue: 5500, orders: 55 }
        ]
      };

      (usePredictiveAnalytics as jest.Mock).mockReturnValue({
        data: { revenue: { current: 0 }, forecast: {} },
        isLoading: false
      });

      (useMetricTrends as jest.Mock).mockReturnValue({
        data: mockTrends,
        isLoading: false
      });

      const { getByText } = renderWithProvider(<RevenueInsights />);
      expect(getByText('2024-01-01')).toBeTruthy();
      expect(getByText('$5,000')).toBeTruthy();
      expect(getByText('50')).toBeTruthy();
    });

    it('should handle empty trends data gracefully', () => {
      (usePredictiveAnalytics as jest.Mock).mockReturnValue({
        data: { revenue: { current: 0 }, forecast: {} },
        isLoading: false
      });

      (useMetricTrends as jest.Mock).mockReturnValue({
        data: { daily: [] },
        isLoading: false
      });

      const { getByTestId } = renderWithProvider(<RevenueInsights />);
      expect(getByTestId('no-trends-data')).toBeTruthy();
    });
  });

  describe('Revenue Breakdown', () => {
    it('should display revenue breakdown when available', () => {
      const mockPredictions = {
        revenue: { current: 150000 },
        forecast: {},
        breakdown: [
          { category: 'Products', amount: 100000, percentage: 66.7 },
          { category: 'Services', amount: 50000, percentage: 33.3 }
        ]
      };

      (usePredictiveAnalytics as jest.Mock).mockReturnValue({
        data: mockPredictions,
        isLoading: false
      });

      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByText } = renderWithProvider(<RevenueInsights />);
      expect(getByText('Products')).toBeTruthy();
      expect(getByText('$100,000')).toBeTruthy();
      expect(getByText('66.7%')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when predictions fail to load', () => {
      (usePredictiveAnalytics as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: { message: 'Failed to load predictions' }
      });

      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByText } = renderWithProvider(<RevenueInsights />);
      expect(getByText('Failed to load predictions')).toBeTruthy();
    });

    it('should display error message when trends fail to load', () => {
      (usePredictiveAnalytics as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: { message: 'Failed to load trends' }
      });

      const { getByText } = renderWithProvider(<RevenueInsights />);
      expect(getByText('Failed to load trends')).toBeTruthy();
    });

    it('should provide retry functionality on error', () => {
      const mockRefetch = jest.fn();
      (usePredictiveAnalytics as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: { message: 'Failed to load' },
        refetch: mockRefetch
      });

      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByText } = renderWithProvider(<RevenueInsights />);
      const retryButton = getByText('Retry');
      fireEvent.press(retryButton);
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const mockPredictions = {
        revenue: { current: 150000 },
        forecast: {
          weekly: { revenue: 35000, growth: 10 },
          monthly: { revenue: 165000, growth: 12.5 },
          quarterly: { revenue: 500000, growth: 15 }
        }
      };

      (usePredictiveAnalytics as jest.Mock).mockReturnValue({
        data: mockPredictions,
        isLoading: false
      });

      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByLabelText } = renderWithProvider(<RevenueInsights />);
      expect(getByLabelText('Weekly revenue forecast')).toBeTruthy();
      expect(getByLabelText('Monthly revenue forecast')).toBeTruthy();
      expect(getByLabelText('Quarterly revenue forecast')).toBeTruthy();
    });
  });
});