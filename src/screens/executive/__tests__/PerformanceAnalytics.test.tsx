import React from 'react';
import { render, waitFor, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PerformanceAnalytics } from '../PerformanceAnalytics';

// Mock the hooks
jest.mock('@/hooks/executive/useMetricTrends');
jest.mock('@/hooks/executive/useCrossRoleAnalytics');
jest.mock('@/hooks/role-based/useUserRole');

import { useMetricTrends } from '@/hooks/executive/useMetricTrends';
import { useCrossRoleAnalytics } from '@/hooks/executive/useCrossRoleAnalytics';
import { useUserRole } from '@/hooks/role-based/useUserRole';

describe('PerformanceAnalytics', () => {
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
      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isSuccess: true
      });

      (useCrossRoleAnalytics as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByTestId } = renderWithProvider(<PerformanceAnalytics />);
      expect(getByTestId('performance-analytics')).toBeTruthy();
    });

    it('should show loading indicator when trends are loading', () => {
      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true
      });

      (useCrossRoleAnalytics as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByTestId } = renderWithProvider(<PerformanceAnalytics />);
      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('should show loading indicator when cross-role data is loading', () => {
      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      (useCrossRoleAnalytics as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true
      });

      const { getByTestId } = renderWithProvider(<PerformanceAnalytics />);
      expect(getByTestId('loading-indicator')).toBeTruthy();
    });
  });

  describe('Metric Trends Integration', () => {
    it('should display performance metrics', () => {
      const mockTrends = {
        metrics: {
          revenue: { current: 75000, previous: 60000, change: 25 },
          orders: { current: 200, previous: 180, change: 11.1 },
          customers: { current: 100, previous: 90, change: 11.1 },
          efficiency: { current: 85, previous: 80, change: 6.25 }
        }
      };

      (useMetricTrends as jest.Mock).mockReturnValue({
        data: mockTrends,
        isLoading: false,
        isSuccess: true
      });

      (useCrossRoleAnalytics as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByText } = renderWithProvider(<PerformanceAnalytics />);
      expect(getByText('$75,000')).toBeTruthy();
      expect(getByText('200')).toBeTruthy();
      expect(getByText('100')).toBeTruthy();
      expect(getByText('85')).toBeTruthy();
    });

    it('should display change percentages', () => {
      const mockTrends = {
        metrics: {
          revenue: { current: 75000, previous: 60000, change: 25 },
          orders: { current: 200, previous: 180, change: 11.1 },
          customers: { current: 100, previous: 90, change: -10 },
          efficiency: { current: 85, previous: 80, change: 6.25 }
        }
      };

      (useMetricTrends as jest.Mock).mockReturnValue({
        data: mockTrends,
        isLoading: false
      });

      (useCrossRoleAnalytics as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByText } = renderWithProvider(<PerformanceAnalytics />);
      expect(getByText('↑ 25.0%')).toBeTruthy();
      expect(getByText('↑ 11.1%')).toBeTruthy();
      expect(getByText('↓ 10.0%')).toBeTruthy();
    });
  });

  describe('Cross-Role Analytics Integration', () => {
    it('should display department performance data', () => {
      const mockCrossRole = {
        departments: [
          { name: 'Sales', performance: 95, target: 100, variance: -5 },
          { name: 'Marketing', performance: 110, target: 100, variance: 10 }
        ]
      };

      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      (useCrossRoleAnalytics as jest.Mock).mockReturnValue({
        data: mockCrossRole,
        isLoading: false
      });

      const { getByText } = renderWithProvider(<PerformanceAnalytics />);
      expect(getByText('Sales')).toBeTruthy();
      expect(getByText('Marketing')).toBeTruthy();
      expect(getByText('95.0%')).toBeTruthy();
      expect(getByText('110.0%')).toBeTruthy();
    });

    it('should handle empty department data gracefully', () => {
      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      (useCrossRoleAnalytics as jest.Mock).mockReturnValue({
        data: { departments: [] },
        isLoading: false
      });

      const { getByTestId } = renderWithProvider(<PerformanceAnalytics />);
      expect(getByTestId('no-department-data')).toBeTruthy();
    });

    it('should display comparison data when available', () => {
      const mockCrossRole = {
        departments: [],
        comparisons: [
          { label: 'Week over Week', value: '+15%' },
          { label: 'Month over Month', value: '+8%' }
        ]
      };

      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      (useCrossRoleAnalytics as jest.Mock).mockReturnValue({
        data: mockCrossRole,
        isLoading: false
      });

      const { getByText } = renderWithProvider(<PerformanceAnalytics />);
      expect(getByText('Week over Week')).toBeTruthy();
      expect(getByText('+15%')).toBeTruthy();
      expect(getByText('Month over Month')).toBeTruthy();
      expect(getByText('+8%')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when trends fail to load', () => {
      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: { message: 'Failed to load trends' }
      });

      (useCrossRoleAnalytics as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByText } = renderWithProvider(<PerformanceAnalytics />);
      expect(getByText('Failed to load trends')).toBeTruthy();
    });

    it('should display error message when cross-role data fails to load', () => {
      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      (useCrossRoleAnalytics as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: { message: 'Failed to load department data' }
      });

      const { getByText } = renderWithProvider(<PerformanceAnalytics />);
      expect(getByText('Failed to load department data')).toBeTruthy();
    });

    it('should provide retry functionality on error', () => {
      const mockRefetch = jest.fn();
      (useMetricTrends as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: { message: 'Failed to load' },
        refetch: mockRefetch
      });

      (useCrossRoleAnalytics as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByText } = renderWithProvider(<PerformanceAnalytics />);
      const retryButton = getByText('Retry');
      fireEvent.press(retryButton);
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const mockTrends = {
        metrics: {
          revenue: { current: 75000, previous: 60000, change: 25 },
          orders: { current: 200, previous: 180, change: 11.1 },
          customers: { current: 100, previous: 90, change: 11.1 },
          efficiency: { current: 85, previous: 80, change: 6.25 }
        }
      };

      (useMetricTrends as jest.Mock).mockReturnValue({
        data: mockTrends,
        isLoading: false
      });

      (useCrossRoleAnalytics as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByLabelText } = renderWithProvider(<PerformanceAnalytics />);
      expect(getByLabelText('Revenue performance metric')).toBeTruthy();
      expect(getByLabelText('Order volume metric')).toBeTruthy();
      expect(getByLabelText('Customer growth metric')).toBeTruthy();
      expect(getByLabelText('Efficiency score metric')).toBeTruthy();
    });
  });
});