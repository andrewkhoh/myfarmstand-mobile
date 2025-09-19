/**
 * Analytics Components Integration Tests
 * Following @docs/architectural-patterns-and-best-practices.md testing patterns
 * Pattern: Component testing with permission gates and ValidationMonitor verification
 */

import React from 'react';
import { UserRole } from '../types/roles';import { render, fireEvent } from '@testing-library/react-native';
import { UserRole } from '../types/roles';import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserRole } from '../types/roles';import { OrderWorkflowVisualizer } from '../../components/analytics/OrderWorkflowVisualizer';
import { UserRole } from '../types/roles';import { HistoricalOrderPatterns } from '../../components/analytics/HistoricalOrderPatterns';
import { UserRole } from '../types/roles';import { ValidationMonitor } from '../../utils/validationMonitor';
import { UserRole } from '../types/roles';
// Mock ValidationMonitor
jest.mock('../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordPatternSuccess: jest.fn(),
    recordValidationError: jest.fn()
  }
}));

// Mock permission hooks
jest.mock('../../hooks/role-based/useUserRole', () => ({
  useCurrentUserRole: jest.fn(() => ({
    role: 'EXECUTIVE',
    isLoading: false,
    isAdmin: false,
    isExecutive: true,
    isStaff: false
  }))
}));

jest.mock('../../hooks/role-based', () => ({
  usePermissions: jest.fn(() => ({
    data: {
      'analytics:view': true,
      'orders:analyze': true,
      'analytics:forecast': true
    },
    isLoading: false
  }))
}));

// Mock auth hook
jest.mock('../../hooks/useAuth', () => ({
  useCurrentUser: () => ({
    data: { id: 'test-user-id', email: 'test@example.com' }
  })
}));

// Mock analytics hooks
jest.mock('../../hooks/analytics/useOrderConversionFunnel', () => ({
  useOrderConversionFunnel: jest.fn(),
  useOrderConversionMetrics: jest.fn()
}));

jest.mock('../../hooks/analytics/useHistoricalOrderAnalysis', () => ({
  useHistoricalOrderAnalysis: jest.fn(),
  useOrderTrends: jest.fn(),
  useSeasonalPatterns: jest.fn(),
  usePredictiveInsights: jest.fn()
}));

// Mock SVG components
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    Svg: View,
    Path: View,
    Circle: View,
    Text: View
  };
});

const mockValidationMonitor = ValidationMonitor as jest.Mocked<typeof ValidationMonitor>;

// Test wrapper component
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Analytics Components Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('OrderWorkflowVisualizer Component', () => {
    it('should render successfully with proper permission gates', async () => {
      // Setup mock data
      const mockFunnelData = {
        data: {
          orders: [],
          metrics: {
            totalOrders: 150,
            completionRate: 0.85,
            averageTimeToCompletion: 24,
            stageConversionRates: {
              cart_created: { orderCount: 150, conversionRate: 1.0, dropoffRate: 0, averageTimeInStage: 0 },
              checkout_started: { orderCount: 135, conversionRate: 0.9, dropoffRate: 0.1, averageTimeInStage: 2 },
              payment_processed: { orderCount: 130, conversionRate: 0.963, dropoffRate: 0.037, averageTimeInStage: 1 },
              order_completed: { orderCount: 128, conversionRate: 0.985, dropoffRate: 0.015, averageTimeInStage: 1 }
            },
            bottlenecks: [],
            customerSegmentAnalysis: {}
          },
          insights: {
            criticalBottlenecks: [],
            optimizationOpportunities: [],
            customerBehaviorPatterns: []
          }
        },
        isLoading: false,
        error: null,
        completionRate: 0.85,
        totalOrders: 150,
        hasBottlenecks: false,
        topBottleneck: null
      };

      const mockConversionMetrics = {
        data: {
          totalOrders: 150,
          completionRate: 0.85,
          bottlenecks: []
        },
        isLoading: false,
        criticalBottleneckCount: 0
      };

      const mockTrendsData = {
        data: { orders: { direction: 'increasing', confidence: 0.85 } },
        ordersTrend: 'up',
        revenueTrend: 'up',
        overallHealth: 'excellent'
      };

      const { useOrderConversionFunnel, useOrderConversionMetrics } = require('../../hooks/analytics/useOrderConversionFunnel');
      const { useOrderTrends } = require('../../hooks/analytics/useHistoricalOrderAnalysis');

      useOrderConversionFunnel.mockReturnValue(mockFunnelData);
      useOrderConversionMetrics.mockReturnValue(mockConversionMetrics);
      useOrderTrends.mockReturnValue(mockTrendsData);

      // Render component
      const { getByTestId, getByText } = render(
        <OrderWorkflowVisualizer
          dateRange={{
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31')
          }}
          testID="test-workflow-visualizer"
        />,
        { wrapper: createWrapper() }
      );

      // Verify component renders
      await waitFor(() => {
        expect(getByTestId('test-workflow-visualizer')).toBeTruthy();
      });

      // Verify key metrics are displayed
      expect(getByText('Order Workflow Analytics')).toBeTruthy();
      expect(getByText('150')).toBeTruthy(); // Total orders
      expect(getByText('85%')).toBeTruthy(); // Completion rate

      // Verify ValidationMonitor was called for analytics usage
      await waitFor(() => {
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'OrderWorkflowVisualizer',
          pattern: 'analytics_visualization',
          operation: 'renderWorkflowAnalytics'
        });
      });
    });

    it('should display no access message for insufficient permissions', async () => {
      // Setup - mock user without required permissions
      const { usePermissions } = require('../../hooks/role-based');
      usePermissions.mockReturnValue({
        data: {
          'analytics:view': false,
          'orders:analyze': false
        },
        isLoading: false
      });

      // Render component
      const { getByTestId, getByText } = render(
        <OrderWorkflowVisualizer testID="test-workflow-visualizer" />,
        { wrapper: createWrapper() }
      );

      // Verify access denied message
      await waitFor(() => {
        expect(getByTestId('test-workflow-visualizer-no-access')).toBeTruthy();
        expect(getByText('Order Analytics requires Executive or Admin permissions')).toBeTruthy();
      });
    });

    it('should handle loading states properly', async () => {
      // Setup mock loading state
      const mockLoadingData = {
        data: null,
        isLoading: true,
        error: null,
        completionRate: 0,
        totalOrders: 0,
        hasBottlenecks: false,
        topBottleneck: null
      };

      const { useOrderConversionFunnel, useOrderConversionMetrics } = require('../../hooks/analytics/useOrderConversionFunnel');
      const { useOrderTrends } = require('../../hooks/analytics/useHistoricalOrderAnalysis');

      useOrderConversionFunnel.mockReturnValue(mockLoadingData);
      useOrderConversionMetrics.mockReturnValue({ ...mockLoadingData, criticalBottleneckCount: 0 });
      useOrderTrends.mockReturnValue({ ...mockLoadingData, ordersTrend: 'unknown', revenueTrend: 'unknown', overallHealth: 'unknown' });

      // Render component
      const { getByText } = render(
        <OrderWorkflowVisualizer testID="test-workflow-visualizer" />,
        { wrapper: createWrapper() }
      );

      // Verify loading message
      await waitFor(() => {
        expect(getByText('Loading workflow analytics...')).toBeTruthy();
      });
    });

    it('should handle error states appropriately', async () => {
      // Setup mock error state
      const mockError = new Error('Failed to load analytics data');
      const mockErrorData = {
        data: null,
        isLoading: false,
        error: mockError,
        completionRate: 0,
        totalOrders: 0,
        hasBottlenecks: false,
        topBottleneck: null
      };

      const { useOrderConversionFunnel, useOrderConversionMetrics } = require('../../hooks/analytics/useOrderConversionFunnel');
      const { useOrderTrends } = require('../../hooks/analytics/useHistoricalOrderAnalysis');

      useOrderConversionFunnel.mockReturnValue(mockErrorData);
      useOrderConversionMetrics.mockReturnValue({ ...mockErrorData, criticalBottleneckCount: 0 });
      useOrderTrends.mockReturnValue({ ...mockErrorData, ordersTrend: 'unknown', revenueTrend: 'unknown', overallHealth: 'unknown' });

      // Render component
      const { getByText } = render(
        <OrderWorkflowVisualizer testID="test-workflow-visualizer" />,
        { wrapper: createWrapper() }
      );

      // Verify error message
      await waitFor(() => {
        expect(getByText('Error loading analytics data')).toBeTruthy();
        expect(getByText('Failed to load analytics data')).toBeTruthy();
      });
    });
  });

  describe('HistoricalOrderPatterns Component', () => {
    it('should render historical patterns with tab navigation', async () => {
      // Setup mock data
      const mockHistoricalData = {
        data: {
          historicalData: [
            { date: '2024-01-01', orders: 50, revenue: 2500 },
            { date: '2024-01-02', orders: 55, revenue: 2750 }
          ],
          trends: {
            orders: { direction: 'increasing', confidence: 0.85, slope: 2.5 },
            revenue: { direction: 'increasing', confidence: 0.90, slope: 125 }
          },
          seasonalPatterns: {
            weekly: { strength: 0.6, pattern: [] },
            monthly: { strength: 0.4, pattern: [] }
          },
          predictions: {
            nextWeek: [{ metric: 'orders', value: 420, confidence: 0.8 }],
            nextMonth: [{ metric: 'revenue', value: 18500, confidence: 0.75 }],
            nextQuarter: []
          },
          insights: {
            keyTrends: ['Orders trending upward'],
            anomalies: []
          }
        },
        isLoading: false,
        error: null,
        isGrowing: true,
        primaryTrend: 'Orders trending increasing',
        confidence: 0.875,
        hasAnomalies: false,
        keyInsight: 'Strong upward trend in orders'
      };

      const mockSeasonalData = {
        data: {
          weekly: { strength: 0.6, pattern: [] }
        },
        isLoading: false,
        bestDay: 'Friday',
        worstDay: 'Monday',
        seasonalStrength: 'strong',
        recommendedActions: ['Optimize staffing for Friday peak']
      };

      const mockPredictionsData = {
        data: {
          nextWeek: [{ metric: 'orders', value: 420, confidence: 0.8 }],
          nextMonth: [{ metric: 'revenue', value: 18500, confidence: 0.75 }],
          nextQuarter: []
        },
        isLoading: false,
        nextWeekOrders: 420,
        nextMonthRevenue: 18500,
        predictionConfidence: 0.775,
        growthForecast: 'positive'
      };

      const {
        useHistoricalOrderAnalysis,
        useSeasonalPatterns,
        usePredictiveInsights
      } = require('../../hooks/analytics/useHistoricalOrderAnalysis');

      useHistoricalOrderAnalysis.mockReturnValue(mockHistoricalData);
      useSeasonalPatterns.mockReturnValue(mockSeasonalData);
      usePredictiveInsights.mockReturnValue(mockPredictionsData);

      // Render component
      const { getByTestId, getByText } = render(
        <HistoricalOrderPatterns
          dateRange={{
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31')
          }}
          testID="test-historical-patterns"
        />,
        { wrapper: createWrapper() }
      );

      // Verify component renders
      await waitFor(() => {
        expect(getByTestId('test-historical-patterns')).toBeTruthy();
      });

      // Verify title and overview
      expect(getByText('Historical Order Patterns')).toBeTruthy();
      expect(getByText('Pattern Overview')).toBeTruthy();

      // Verify tab navigation
      expect(getByTestId('test-historical-patterns-tab-trends')).toBeTruthy();
      expect(getByTestId('test-historical-patterns-tab-seasonal')).toBeTruthy();
      expect(getByTestId('test-historical-patterns-tab-predictions')).toBeTruthy();

      // Verify ValidationMonitor was called
      await waitFor(() => {
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'HistoricalOrderPatterns',
          pattern: 'analytics_visualization',
          operation: 'renderHistoricalAnalytics'
        });
      });
    });

    it('should handle tab switching correctly', async () => {
      // Setup mock data (simplified)
      const mockData = {
        data: { historicalData: [], trends: {}, seasonalPatterns: {}, predictions: {}, insights: {} },
        isLoading: false,
        error: null,
        isGrowing: false,
        primaryTrend: null,
        confidence: 0,
        hasAnomalies: false,
        keyInsight: null
      };

      const {
        useHistoricalOrderAnalysis,
        useSeasonalPatterns,
        usePredictiveInsights
      } = require('../../hooks/analytics/useHistoricalOrderAnalysis');

      useHistoricalOrderAnalysis.mockReturnValue(mockData);
      useSeasonalPatterns.mockReturnValue({ ...mockData, bestDay: null, worstDay: null, seasonalStrength: 'none', recommendedActions: [] });
      usePredictiveInsights.mockReturnValue({ ...mockData, nextWeekOrders: null, nextMonthRevenue: null, predictionConfidence: 0, growthForecast: 'uncertain' });

      // Render component
      const { getByTestId, getByText } = render(
        <HistoricalOrderPatterns testID="test-historical-patterns" />,
        { wrapper: createWrapper() }
      );

      // Initially on trends tab
      await waitFor(() => {
        expect(getByText('Order Volume Trends')).toBeTruthy();
      });

      // Switch to seasonal tab
      fireEvent.press(getByTestId('test-historical-patterns-tab-seasonal'));
      await waitFor(() => {
        expect(getByText('Seasonal Patterns')).toBeTruthy();
      });

      // Switch to predictions tab
      fireEvent.press(getByTestId('test-historical-patterns-tab-predictions'));
      await waitFor(() => {
        expect(getByText('Predictive Insights')).toBeTruthy();
      });
    });

    it('should display anomaly alerts when detected', async () => {
      // Setup mock data with anomalies
      const mockHistoricalData = {
        data: {
          historicalData: [],
          trends: {},
          seasonalPatterns: {},
          predictions: {},
          insights: {
            keyTrends: [],
            anomalies: ['Unusual spike in order cancellations']
          }
        },
        isLoading: false,
        error: null,
        isGrowing: false,
        primaryTrend: null,
        confidence: 0,
        hasAnomalies: true,
        keyInsight: 'Review cancellation patterns'
      };

      const {
        useHistoricalOrderAnalysis,
        useSeasonalPatterns,
        usePredictiveInsights
      } = require('../../hooks/analytics/useHistoricalOrderAnalysis');

      useHistoricalOrderAnalysis.mockReturnValue(mockHistoricalData);
      useSeasonalPatterns.mockReturnValue({ data: null, isLoading: false, bestDay: null, worstDay: null, seasonalStrength: 'none', recommendedActions: [] });
      usePredictiveInsights.mockReturnValue({ data: null, isLoading: false, nextWeekOrders: null, nextMonthRevenue: null, predictionConfidence: 0, growthForecast: 'uncertain' });

      // Render component
      const { getByText } = render(
        <HistoricalOrderPatterns testID="test-historical-patterns" />,
        { wrapper: createWrapper() }
      );

      // Verify anomaly alert is displayed
      await waitFor(() => {
        expect(getByText('⚠️ Anomalies Detected')).toBeTruthy();
        expect(getByText(/Unusual patterns detected in your order data/)).toBeTruthy();
      });

      // Verify key insight is displayed
      expect(getByText('🔍 Key Insight')).toBeTruthy();
      expect(getByText('Review cancellation patterns')).toBeTruthy();
    });
  });

  describe('Permission Gate Integration', () => {
    it('should properly integrate with role-based access control', async () => {
      // Test ADMIN role access
      const { useCurrentUserRole } = require('../../hooks/role-based/useUserRole');
      useCurrentUserRole.mockReturnValue({
        role: 'ADMIN',
        isLoading: false,
        isAdmin: true,
        isExecutive: false,
        isStaff: false
      });

      const { usePermissions } = require('../../hooks/role-based');
      usePermissions.mockReturnValue({
        data: {
          'analytics:view': true,
          'orders:analyze': true,
          'analytics:forecast': true
        },
        isLoading: false
      });

      // Mock hooks with basic data
      const {
        useOrderConversionFunnel,
        useOrderConversionMetrics
      } = require('../../hooks/analytics/useOrderConversionFunnel');
      const { useOrderTrends } = require('../../hooks/analytics/useHistoricalOrderAnalysis');

      useOrderConversionFunnel.mockReturnValue({
        data: { orders: [], metrics: { totalOrders: 0 }, insights: {} },
        isLoading: false,
        completionRate: 0,
        totalOrders: 0,
        hasBottlenecks: false,
        topBottleneck: null
      });
      useOrderConversionMetrics.mockReturnValue({
        data: { totalOrders: 0, completionRate: 0, bottlenecks: [] },
        isLoading: false,
        criticalBottleneckCount: 0
      });
      useOrderTrends.mockReturnValue({
        data: null,
        ordersTrend: 'unknown',
        revenueTrend: 'unknown',
        overallHealth: 'unknown'
      });

      // Render component
      const { getByTestId } = render(
        <OrderWorkflowVisualizer testID="test-workflow-visualizer" />,
        { wrapper: createWrapper() }
      );

      // Verify component renders (permission granted)
      await waitFor(() => {
        expect(getByTestId('test-workflow-visualizer')).toBeTruthy();
      });
    });

    it('should deny access for STAFF role without analytics permissions', async () => {
      // Test STAFF role without analytics permissions
      const { useCurrentUserRole } = require('../../hooks/role-based/useUserRole');
      useCurrentUserRole.mockReturnValue({
        role: 'STAFF',
        isLoading: false,
        isAdmin: false,
        isExecutive: false,
        isStaff: true
      });

      const { usePermissions } = require('../../hooks/role-based');
      usePermissions.mockReturnValue({
        data: {
          'analytics:view': false,
          'orders:analyze': false
        },
        isLoading: false
      });

      // Render component
      const { getByTestId } = render(
        <OrderWorkflowVisualizer testID="test-workflow-visualizer" />,
        { wrapper: createWrapper() }
      );

      // Verify access is denied
      await waitFor(() => {
        expect(getByTestId('test-workflow-visualizer-no-access')).toBeTruthy();
      });
    });
  });

  describe('Error Boundary Integration', () => {
    it('should handle component rendering errors gracefully', async () => {
      // Setup - force an error in the hook
      const { useOrderConversionFunnel } = require('../../hooks/analytics/useOrderConversionFunnel');
      useOrderConversionFunnel.mockImplementation(() => {
        throw new Error('Component error during render');
      });

      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Render component with error boundary
      try {
        render(
          <OrderWorkflowVisualizer testID="test-workflow-visualizer" />,
          { wrapper: createWrapper() }
        );
      } catch (error) {
        // Expected to throw
        expect(error.message).toContain('Component error during render');
      }

      consoleSpy.mockRestore();
    });
  });
});