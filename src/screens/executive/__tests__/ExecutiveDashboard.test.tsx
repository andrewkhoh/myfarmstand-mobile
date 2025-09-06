import React from 'react';
import { render, waitFor, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExecutiveDashboard } from '../ExecutiveDashboard';

// Mock the hooks
jest.mock('@/hooks/executive/useBusinessMetrics');
jest.mock('@/hooks/executive/useBusinessInsights');
jest.mock('@/hooks/role-based/useUserRole');

import { useBusinessMetrics } from '@/hooks/executive/useBusinessMetrics';
import { useBusinessInsights } from '@/hooks/executive/useBusinessInsights';
import { useUserRole } from '@/hooks/role-based/useUserRole';

describe('ExecutiveDashboard', () => {
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
      (useBusinessMetrics as jest.Mock).mockReturnValue({
        metrics: null,
        isLoading: false,
        isSuccess: true
      });

      (useBusinessInsights as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByTestId } = renderWithProvider(<ExecutiveDashboard />);
      expect(getByTestId('executive-dashboard')).toBeTruthy();
    });

    it('should show loading indicator when metrics are loading', () => {
      (useBusinessMetrics as jest.Mock).mockReturnValue({
        metrics: null,
        isLoading: true
      });

      (useBusinessInsights as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByTestId } = renderWithProvider(<ExecutiveDashboard />);
      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('should show loading indicator when insights are loading', () => {
      (useBusinessMetrics as jest.Mock).mockReturnValue({
        metrics: null,
        isLoading: false
      });

      (useBusinessInsights as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true
      });

      const { getByTestId } = renderWithProvider(<ExecutiveDashboard />);
      expect(getByTestId('loading-indicator')).toBeTruthy();
    });
  });

  describe('Business Metrics Integration', () => {
    it('should integrate with business metrics hook', () => {
      const mockMetrics = {
        revenue: { total: 50000, growth: 15, trend: 'increasing' },
        orders: { total: 150, growth: 10, trend: 'stable' },
        customers: { total: 75, growth: 5, trend: 'increasing' }
      };

      (useBusinessMetrics as jest.Mock).mockReturnValue({
        metrics: mockMetrics,
        isLoading: false,
        isSuccess: true
      });

      (useBusinessInsights as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByText } = renderWithProvider(<ExecutiveDashboard />);
      expect(getByText('$50,000')).toBeTruthy();
      expect(getByText('150')).toBeTruthy();
      expect(getByText('75')).toBeTruthy();
    });

    it('should display growth percentages', () => {
      const mockMetrics = {
        revenue: { total: 50000, growth: 15, trend: 'increasing' },
        orders: { total: 150, growth: 10, trend: 'stable' },
        customers: { total: 75, growth: -5, trend: 'decreasing' }
      };

      (useBusinessMetrics as jest.Mock).mockReturnValue({
        metrics: mockMetrics,
        isLoading: false
      });

      (useBusinessInsights as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByText } = renderWithProvider(<ExecutiveDashboard />);
      expect(getByText('+15%')).toBeTruthy();
      expect(getByText('+10%')).toBeTruthy();
      expect(getByText('-5%')).toBeTruthy();
    });
  });

  describe('Business Insights Integration', () => {
    it('should integrate with business insights hook', () => {
      const mockInsights = {
        trends: {
          daily: [
            { date: '2024-01-01', revenue: 1000, orders: 10 },
            { date: '2024-01-02', revenue: 1200, orders: 12 }
          ]
        },
        topProducts: [
          { id: '1', name: 'Product A', revenue: 500 },
          { id: '2', name: 'Product B', revenue: 400 }
        ]
      };

      (useBusinessMetrics as jest.Mock).mockReturnValue({
        metrics: null,
        isLoading: false
      });

      (useBusinessInsights as jest.Mock).mockReturnValue({
        data: mockInsights,
        isLoading: false
      });

      const { getByText } = renderWithProvider(<ExecutiveDashboard />);
      expect(getByText('Product A')).toBeTruthy();
      expect(getByText('Product B')).toBeTruthy();
    });

    it('should handle empty insights data gracefully', () => {
      (useBusinessMetrics as jest.Mock).mockReturnValue({
        metrics: null,
        isLoading: false
      });

      (useBusinessInsights as jest.Mock).mockReturnValue({
        data: { trends: null, topProducts: [] },
        isLoading: false
      });

      const { getByTestId } = renderWithProvider(<ExecutiveDashboard />);
      expect(getByTestId('executive-dashboard')).toBeTruthy();
      expect(getByTestId('no-insights-message')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when metrics fail to load', () => {
      (useBusinessMetrics as jest.Mock).mockReturnValue({
        metrics: null,
        isLoading: false,
        isError: true,
        error: { message: 'Failed to load metrics' }
      });

      (useBusinessInsights as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByText } = renderWithProvider(<ExecutiveDashboard />);
      expect(getByText('Failed to load metrics')).toBeTruthy();
    });

    it('should display error message when insights fail to load', () => {
      (useBusinessMetrics as jest.Mock).mockReturnValue({
        metrics: null,
        isLoading: false
      });

      (useBusinessInsights as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: { message: 'Failed to load insights' }
      });

      const { getByText } = renderWithProvider(<ExecutiveDashboard />);
      expect(getByText('Failed to load insights')).toBeTruthy();
    });

    it('should provide retry functionality on error', () => {
      const mockRefetch = jest.fn();
      (useBusinessMetrics as jest.Mock).mockReturnValue({
        metrics: null,
        isLoading: false,
        isError: true,
        error: { message: 'Failed to load' },
        refetch: mockRefetch
      });

      (useBusinessInsights as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByText } = renderWithProvider(<ExecutiveDashboard />);
      const retryButton = getByText('Retry');
      fireEvent.press(retryButton);
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      (useBusinessMetrics as jest.Mock).mockReturnValue({
        metrics: {
          revenue: { total: 50000, growth: 15, trend: 'increasing' },
          orders: { total: 150, growth: 10, trend: 'stable' },
          customers: { total: 75, growth: 5, trend: 'increasing' }
        },
        isLoading: false
      });

      (useBusinessInsights as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false
      });

      const { getByLabelText } = renderWithProvider(<ExecutiveDashboard />);
      expect(getByLabelText('Revenue metric')).toBeTruthy();
      expect(getByLabelText('Orders metric')).toBeTruthy();
      expect(getByLabelText('Customers metric')).toBeTruthy();
    });
  });
});