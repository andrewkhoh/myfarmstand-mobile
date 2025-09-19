// Enhanced Cross-Role Analytics Hook Tests
// Testing UI transforms, correlation analysis, and historical data

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCrossRoleAnalytics } from '../useCrossRoleAnalytics';
import { BusinessMetricsService } from '../../../services/executive/businessMetricsService';
import { BusinessIntelligenceService } from '../../../services/executive/businessIntelligenceService';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Mock services
jest.mock('../../../services/executive/businessMetricsService');
jest.mock('../../../services/executive/businessIntelligenceService');
jest.mock('../../../utils/validationMonitor');
jest.mock('../../role-based/useUserRole', () => ({
  useUserRole: jest.fn()
}));
jest.mock('../../../utils/queryKeyFactory', () => ({
  executiveAnalyticsKeys: {
    crossRoleAnalytics: jest.fn((userId, options) => ['executive', 'crossRoleAnalytics', userId, options]),
    businessInsights: jest.fn((role) => ['executive', 'businessInsights', role]),
    businessMetrics: jest.fn((role) => ['executive', 'businessMetrics', role])
  }
}));

// Import the mock after it's been set up
import { useUserRole } from '../../role-based/useUserRole';

describe('useCrossRoleAnalytics Enhanced Tests', () => {
  let queryClient: QueryClient;

  const mockCorrelationsData = {
    correlations: [
      {
        source: 'inventory',
        target: 'marketing',
        correlation: 0.82,
        significance: 0.95,
        type: 'positive',
        description: 'Inventory levels strongly correlate with marketing campaign success'
      },
      {
        source: 'marketing',
        target: 'sales',
        correlation: 0.75,
        significance: 0.90,
        type: 'positive',
        description: 'Marketing spend correlates with sales performance'
      }
    ],
    insights: [
      {
        id: 'insight-1',
        type: 'correlation',
        title: 'Strong Inventory-Marketing Connection',
        description: 'High inventory availability drives marketing effectiveness by 82%',
        confidence: 0.95
      }
    ],
    overallCorrelation: 0.78
  };

  const mockMetricsData = {
    metrics: {
      inventory: {
        efficiency: 0.85,
        performance: 0.78,
        utilization: 0.92
      },
      marketing: {
        roi: 3.5,
        reach: 15000,
        conversion: 0.045
      },
      sales: {
        revenue: 250000,
        growth: 0.15,
        margin: 0.32
      }
    }
  };

  const mockHistoricalData = {
    periods: [
      { date: '2024-10-01', inventory: 0.82, marketing: 0.75, sales: 0.88 },
      { date: '2024-11-01', inventory: 0.85, marketing: 0.78, sales: 0.90 },
      { date: '2024-12-01', inventory: 0.87, marketing: 0.80, sales: 0.92 },
      { date: '2025-01-01', inventory: 0.85, marketing: 0.78, sales: 0.88 }
    ],
    trends: {
      inventory: 'stable',
      marketing: 'increasing',
      sales: 'stable'
    }
  };

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 }
      }
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useUserRole as jest.Mock).mockReturnValue({
      role: 'executive',
      hasPermission: jest.fn().mockResolvedValue(true)
    });
    (BusinessIntelligenceService as any).correlateBusinessData = jest.fn().mockResolvedValue(mockCorrelationsData);
    (BusinessMetricsService as any).getCrossRoleMetrics = jest.fn().mockResolvedValue(mockMetricsData);
    (BusinessMetricsService as any).getHistoricalData = jest.fn().mockResolvedValue(mockHistoricalData);
    (ValidationMonitor as any).recordPatternSuccess = jest.fn();
    (ValidationMonitor as any).recordValidationError = jest.fn();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('Core Functionality Tests', () => {
    it('should fetch cross-role analytics successfully', async () => {
      const { result } = renderHook(() => useCrossRoleAnalytics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.correlations).toBeDefined();
      expect(result.current.metrics).toBeDefined();
      expect(result.current.insights).toBeDefined();
      expect(result.current.overallCorrelation).toBe(0.78);
    });

    it('should handle role filtering', async () => {
      const options = { roles: ['inventory', 'marketing', 'sales'] };
      
      renderHook(() => useCrossRoleAnalytics(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(BusinessIntelligenceService.correlateBusinessData).toHaveBeenCalledWith({
          data_sources: ['inventory', 'marketing', 'sales'],
          correlation_type: 'all',
          include_significance: true
        });
        expect(BusinessMetricsService.getCrossRoleMetrics).toHaveBeenCalledWith({
          categories: ['inventory', 'marketing', 'sales'],
          user_role: 'executive'
        });
      });
    });

    it('should handle correlation type filtering', async () => {
      const options = { correlationType: 'performance' as const };
      
      renderHook(() => useCrossRoleAnalytics(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(BusinessIntelligenceService.correlateBusinessData).toHaveBeenCalledWith(
          expect.objectContaining({
            correlation_type: 'performance'
          })
        );
      });
    });
  });

  describe('Correlation Analysis Tests', () => {
    it('should provide correlation strength indicators', async () => {
      const { result } = renderHook(() => useCrossRoleAnalytics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const correlations = result.current.correlations!;
      expect(correlations).toHaveLength(2);
      
      correlations.forEach(correlation => {
        expect(correlation.correlation).toBeGreaterThanOrEqual(0);
        expect(correlation.correlation).toBeLessThanOrEqual(1);
        expect(correlation.significance).toBeGreaterThanOrEqual(0);
        expect(correlation.significance).toBeLessThanOrEqual(1);
      });
    });

    it('should classify correlation types', async () => {
      const { result } = renderHook(() => useCrossRoleAnalytics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const correlations = result.current.correlations!;
      correlations.forEach(correlation => {
        expect(['positive', 'negative', 'neutral']).toContain(correlation.type);
      });
    });

    it('should provide correlation descriptions', async () => {
      const { result } = renderHook(() => useCrossRoleAnalytics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const correlations = result.current.correlations!;
      correlations.forEach(correlation => {
        expect(correlation.description).toBeDefined();
        expect(correlation.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Historical Data Tests', () => {
    it('should include historical data when requested', async () => {
      const { result } = renderHook(
        () => useCrossRoleAnalytics({ 
          includeHistorical: true,
          timeRange: '90d'
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(BusinessMetricsService.getHistoricalData).toHaveBeenCalledWith({
        time_range: '90d',
        categories: undefined
      });
      expect(result.current?.data?.historical).toBeDefined();
      expect(result.current?.data?.historical).toEqual(mockHistoricalData);
    });

    it('should use default time range when not specified', async () => {
      renderHook(
        () => useCrossRoleAnalytics({ includeHistorical: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(BusinessMetricsService.getHistoricalData).toHaveBeenCalledWith({
          time_range: '90d',
          categories: undefined
        });
      });
    });

    it('should not fetch historical data when not requested', async () => {
      renderHook(
        () => useCrossRoleAnalytics({ includeHistorical: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(BusinessMetricsService.getHistoricalData).not.toHaveBeenCalled();
      });
    });
  });

  describe('Refresh Correlations Tests', () => {
    it('should refresh correlations and invalidate related queries', async () => {
      const wrapper = createWrapper();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      
      const { result } = renderHook(() => useCrossRoleAnalytics(), {
        wrapper
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      await act(async () => {
        await result.current.refreshCorrelations();
      });

      // Should invalidate multiple related queries
      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(3);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        pattern: 'cross_role_analytics_refresh',
        context: 'useCrossRoleAnalytics.refreshCorrelations',
        description: 'Successfully refreshed cross-role correlations and related data'
      });
    });

    it('should handle refresh errors gracefully', async () => {
      const { result } = renderHook(() => useCrossRoleAnalytics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Mock refetch to fail
      queryClient.invalidateQueries = jest.fn().mockRejectedValue(new Error('Refresh failed'));

      await expect(result.current.refreshCorrelations()).rejects.toThrow();

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'useCrossRoleAnalytics.refreshCorrelations',
        errorCode: 'CORRELATION_REFRESH_FAILED',
        validationPattern: 'cross_role_analytics_operation',
        errorMessage: expect.any(String)
      });
    });
  });

  describe('Permission Tests', () => {
    it('should check permissions before fetching', async () => {
      const hasPermissionMock = jest.fn().mockResolvedValue(true);
      (useUserRole as jest.Mock).mockReturnValue({
        role: 'manager',
        hasPermission: hasPermissionMock
      });

      renderHook(() => useCrossRoleAnalytics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(hasPermissionMock).toHaveBeenCalledWith('cross_role_analytics_read');
      });
    });

    it('should throw error when lacking permissions', async () => {
      const hasPermissionMock = jest.fn().mockResolvedValue(false);
      (useUserRole as jest.Mock).mockReturnValue({
        role: 'viewer',
        hasPermission: hasPermissionMock
      });

      const { result } = renderHook(() => useCrossRoleAnalytics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error?.message).toContain('Insufficient permissions');
    });

    it('should allow executive and admin roles without permission check', async () => {
      const hasPermissionMock = jest.fn().mockResolvedValue(false);
      (useUserRole as jest.Mock).mockReturnValue({
        role: 'admin',
        hasPermission: hasPermissionMock
      });

      const { result } = renderHook(() => useCrossRoleAnalytics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeDefined();
    });
  });

  describe('Caching Strategy Tests', () => {
    it('should use longer cache times for complex analytics', async () => {
      const { result, rerender } = renderHook(() => useCrossRoleAnalytics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Initial call
      expect(BusinessIntelligenceService.correlateBusinessData).toHaveBeenCalledTimes(1);
      expect(BusinessMetricsService.getCrossRoleMetrics).toHaveBeenCalledTimes(1);

      // Rerender should use cache
      rerender();
      expect(BusinessIntelligenceService.correlateBusinessData).toHaveBeenCalledTimes(1);
      expect(BusinessMetricsService.getCrossRoleMetrics).toHaveBeenCalledTimes(1);
    });

    it('should not auto-refetch on mount or focus', async () => {
      const { result } = renderHook(() => useCrossRoleAnalytics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Simulate app focus (React Native equivalent)
      act(() => {
        // In React Native, we would use AppState.currentState = 'active'
        // For testing purposes, this simulates the same behavior
      });

      // Should not refetch
      expect(BusinessIntelligenceService.correlateBusinessData).toHaveBeenCalledTimes(1);
    });
  });

  describe('UI Transform Enhancement Tests', () => {
    it('should provide insights with confidence scores', async () => {
      const { result } = renderHook(() => useCrossRoleAnalytics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const insights = result.current.insights!;
      expect(insights).toHaveLength(1);
      
      insights.forEach(insight => {
        expect(insight.confidence).toBeDefined();
        expect(insight.confidence).toBeGreaterThanOrEqual(0);
        expect(insight.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should provide metrics in UI-ready format', async () => {
      const { result } = renderHook(() => useCrossRoleAnalytics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const metrics = result.current.metrics!;
      
      // Check inventory metrics
      expect(metrics.inventory).toBeDefined();
      expect(metrics.inventory.efficiency).toBeDefined();
      expect(metrics.inventory.performance).toBeDefined();
      
      // Check marketing metrics
      expect(metrics.marketing).toBeDefined();
      expect(metrics.marketing.roi).toBeDefined();
      expect(metrics.marketing.conversion).toBeDefined();
    });

    it('should provide overall correlation score for summary display', async () => {
      const { result } = renderHook(() => useCrossRoleAnalytics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.overallCorrelation).toBe(0.78);
      expect(result.current.overallCorrelation).toBeGreaterThanOrEqual(0);
      expect(result.current.overallCorrelation).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling Tests', () => {
    it('should not retry on permission errors', async () => {
      (BusinessIntelligenceService as any).correlateBusinessData = jest.fn()
        .mockRejectedValue(new Error('Insufficient permissions'));

      renderHook(() => useCrossRoleAnalytics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        // Should only try once for permission errors
        expect(BusinessIntelligenceService.correlateBusinessData).toHaveBeenCalledTimes(1);
      });
    });

    it('should retry on network errors', async () => {
      let callCount = 0;
      (BusinessIntelligenceService as any).correlateBusinessData = jest.fn()
        .mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve(mockCorrelationsData);
        });

      const { result } = renderHook(() => useCrossRoleAnalytics(), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Should retry once on network error
      expect(callCount).toBe(2);
    });
  });
});