import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomerAnalytics } from '../CustomerAnalytics';

// Mock the hooks
jest.mock('@/hooks/executive/useInsightGeneration');
jest.mock('@/hooks/executive/useMetricTrends');

import { useInsightGeneration } from '@/hooks/executive/useInsightGeneration';
import { useMetricTrends } from '@/hooks/executive/useMetricTrends';

describe('CustomerAnalytics', () => {
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
    (useInsightGeneration as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false
    });

    (useMetricTrends as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false
    });

    const { getByTestId } = renderWithProvider(<CustomerAnalytics />);
    expect(getByTestId('customer-analytics')).toBeTruthy();
  });

  it('should show loading indicator', () => {
    (useInsightGeneration as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true
    });

    (useMetricTrends as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false
    });

    const { getByTestId } = renderWithProvider(<CustomerAnalytics />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('should display customer metrics', () => {
    const mockData = {
      customers: {
        total: 1500,
        active: 1200,
        new: 150,
        returning: 85,
        churnRate: 3.5,
        lifetimeValue: 2500,
        satisfactionScore: 4.2
      },
      segments: []
    };

    (useInsightGeneration as jest.Mock).mockReturnValue({
      data: mockData,
      isLoading: false
    });

    (useMetricTrends as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false
    });

    const { getByText } = renderWithProvider(<CustomerAnalytics />);
    expect(getByText('1,500')).toBeTruthy();
    expect(getByText('1,200')).toBeTruthy();
    expect(getByText('150')).toBeTruthy();
    expect(getByText('85%')).toBeTruthy();
  });

  it('should display satisfaction score when available', () => {
    const mockData = {
      customers: {
        total: 1500,
        satisfactionScore: 4.2
      },
      segments: []
    };

    (useInsightGeneration as jest.Mock).mockReturnValue({
      data: mockData,
      isLoading: false
    });

    (useMetricTrends as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false
    });

    const { getByTestId } = renderWithProvider(<CustomerAnalytics />);
    expect(getByTestId('satisfaction-score')).toBeTruthy();
    expect(getByTestId('satisfaction-score').props.children).toBe('4.2');
  });

  it('should handle no segments gracefully', () => {
    (useInsightGeneration as jest.Mock).mockReturnValue({
      data: { customers: {}, segments: [] },
      isLoading: false
    });

    (useMetricTrends as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false
    });

    const { getByTestId } = renderWithProvider(<CustomerAnalytics />);
    expect(getByTestId('no-segments')).toBeTruthy();
  });

  it('should display error message on failure', () => {
    (useInsightGeneration as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: { message: 'Failed to load insights' }
    });

    (useMetricTrends as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false
    });

    const { getByText } = renderWithProvider(<CustomerAnalytics />);
    expect(getByText('Failed to load insights')).toBeTruthy();
  });

  it('should provide retry functionality', () => {
    const mockRefetch = jest.fn();
    (useInsightGeneration as jest.Mock).mockReturnValue({
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

    const { getByText } = renderWithProvider(<CustomerAnalytics />);
    const retryButton = getByText('Retry');
    fireEvent.press(retryButton);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('should have accessibility labels', () => {
    const mockData = {
      customers: {
        total: 1500,
        active: 1200,
        new: 150,
        returning: 85
      }
    };

    (useInsightGeneration as jest.Mock).mockReturnValue({
      data: mockData,
      isLoading: false
    });

    (useMetricTrends as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false
    });

    const { getByLabelText } = renderWithProvider(<CustomerAnalytics />);
    expect(getByLabelText('Total customers metric')).toBeTruthy();
    expect(getByLabelText('Active customers metric')).toBeTruthy();
    expect(getByLabelText('New customers metric')).toBeTruthy();
  });
});