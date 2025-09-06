import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InventoryOverview } from '../InventoryOverview';

// Mock the hooks
jest.mock('@/hooks/executive/useCrossRoleAnalytics');
jest.mock('@/hooks/executive/useMetricTrends');

import { useCrossRoleAnalytics } from '@/hooks/executive/useCrossRoleAnalytics';
import { useMetricTrends } from '@/hooks/executive/useMetricTrends';

describe('InventoryOverview', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
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

  it('should render without crashing', () => {
    (useCrossRoleAnalytics as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false
    });

    (useMetricTrends as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false
    });

    const { getByTestId } = renderWithProvider(<InventoryOverview />);
    expect(getByTestId('inventory-overview')).toBeTruthy();
  });

  it('should show loading indicator', () => {
    (useCrossRoleAnalytics as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true
    });

    (useMetricTrends as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false
    });

    const { getByTestId } = renderWithProvider(<InventoryOverview />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('should display inventory metrics', () => {
    const mockData = {
      inventory: {
        totalItems: 500,
        lowStock: 25,
        outOfStock: 5,
        turnoverRate: 4.5
      },
      alerts: [],
      categories: []
    };

    (useCrossRoleAnalytics as jest.Mock).mockReturnValue({
      data: mockData,
      isLoading: false
    });

    (useMetricTrends as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false
    });

    const { getByText } = renderWithProvider(<InventoryOverview />);
    expect(getByText('500')).toBeTruthy();
    expect(getByText('25')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
    expect(getByText('4.5x')).toBeTruthy();
  });

  it('should handle no alerts gracefully', () => {
    (useCrossRoleAnalytics as jest.Mock).mockReturnValue({
      data: { inventory: {}, alerts: [] },
      isLoading: false
    });

    (useMetricTrends as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false
    });

    const { getByTestId } = renderWithProvider(<InventoryOverview />);
    expect(getByTestId('no-alerts')).toBeTruthy();
  });

  it('should display error message on failure', () => {
    (useCrossRoleAnalytics as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: { message: 'Failed to load data' }
    });

    (useMetricTrends as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false
    });

    const { getByText } = renderWithProvider(<InventoryOverview />);
    expect(getByText('Failed to load data')).toBeTruthy();
  });

  it('should provide retry functionality', () => {
    const mockRefetch = jest.fn();
    (useCrossRoleAnalytics as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: { message: 'Error' },
      refetch: mockRefetch
    });

    (useMetricTrends as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false
    });

    const { getByText } = renderWithProvider(<InventoryOverview />);
    const retryButton = getByText('Retry');
    fireEvent.press(retryButton);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('should have accessibility labels', () => {
    const mockData = {
      inventory: {
        totalItems: 500,
        lowStock: 25,
        outOfStock: 5,
        turnoverRate: 4.5
      }
    };

    (useCrossRoleAnalytics as jest.Mock).mockReturnValue({
      data: mockData,
      isLoading: false
    });

    (useMetricTrends as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false
    });

    const { getByLabelText } = renderWithProvider(<InventoryOverview />);
    expect(getByLabelText('Total inventory items')).toBeTruthy();
    expect(getByLabelText('Low stock items')).toBeTruthy();
    expect(getByLabelText('Out of stock items')).toBeTruthy();
  });
});