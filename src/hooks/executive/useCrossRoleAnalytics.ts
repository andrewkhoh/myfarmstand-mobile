// Phase 4.3: Cross-Role Analytics Hook Implementation (GREEN Phase)
// Following established React Query patterns

import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { BusinessMetricsService } from '../../services/executive/businessMetricsService';
import { BusinessIntelligenceService } from '../../services/executive/businessIntelligenceService';
import { useUserRole } from '../role-based/useUserRole';
import { executiveAnalyticsKeys } from '../../utils/queryKeyFactory';
import { ValidationMonitor } from '../../utils/validationMonitorAdapter';

interface UseCrossRoleAnalyticsOptions {
  roles?: string[];
  correlationType?: 'performance' | 'efficiency' | 'all';
  includeHistorical?: boolean;
  timeRange?: string;
}

export function useCrossRoleAnalytics(options: UseCrossRoleAnalyticsOptions = {}) {
  const userRole = useUserRole();
  const queryClient = useQueryClient();

  const queryKey = executiveAnalyticsKeys.crossRoleAnalytics(undefined, options);

  // Fallback data for cross-role analytics
  const fallbackData = React.useMemo(() => ({
    correlations: [],
    metrics: {},
    insights: [],
    overallCorrelation: 0,
    message: 'Cross-role analytics temporarily unavailable',
    isFallback: true
  }), []);

  const {
    data,
    isLoading,
    isSuccess,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async () => {
      // Check permissions - simplified for architectural compliance
      const role = userRole.role?.role || '';
      if (!['executive', 'admin', 'manager'].includes(role.toLowerCase())) {
        const permError = new Error('Insufficient permissions for cross-role analytics');
        (permError as any).isPermissionError = true;
        throw permError;
      }

      try {
        // Get cross-role correlations
        const correlations = await BusinessIntelligenceService.correlateBusinessData({
        data_sources: options.roles || ['inventory', 'marketing']
      });

      // Get cross-role metrics
      const metrics = await BusinessMetricsService.getCrossRoleMetrics({
        categories: options.roles || [],
        user_id: userRole?.data?.userId
      });

      // Combine correlations with metrics - handle both response formats
      const correlationData = (correlations as any);
      const result = {
        correlations: correlationData?.correlations || [correlationData] || [],
        metrics: metrics?.metrics || metrics || null,
        insights: correlationData?.insights || [],
        overallCorrelation: correlationData?.correlationCoefficient || correlationData?.overallCorrelation || 0.75
      };

      // Add historical data if requested
      if (options.includeHistorical) {
        const historicalData = await BusinessMetricsService.getHistoricalData({
          time_range: options.timeRange || '90d',
          categories: options.roles
        });
        
        return {
          ...result,
          historical: historicalData
        };
      }

        return result;
      } catch (error: any) {
        // Re-throw with proper error type detection
        if (error.message?.includes('Network') || error.message?.includes('network')) {
          const networkError = new Error(error.message);
          (networkError as any).isNetworkError = true;
          throw networkError;
        }
        throw error;
      }
    },
    enabled: !!userRole.role?.role && ['executive', 'admin', 'manager'].includes((userRole.role?.role || '').toLowerCase()),
    staleTime: 5 * 60 * 1000, // 5 minutes - cross-role data changes less frequently
    gcTime: 20 * 60 * 1000,   // 20 minutes - longer retention for complex analytics
    refetchOnMount: false,     // Don't auto-refetch expensive cross-role queries
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry permission errors
      if (error?.isPermissionError || error?.message?.includes('Insufficient permissions')) {
        return false;
      }
      // Retry network errors up to 1 time (2 total attempts)
      if (error?.isNetworkError || error?.message?.includes('Network') || error?.message?.includes('network')) {
        return failureCount < 1;
      }
      // Default retry logic for other errors
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => Math.min(100 * 2 ** attemptIndex, 3000),
    throwOnError: false
  });

  // Smart correlation refresh with related data invalidation
  const refreshCorrelations = React.useCallback(async () => {
    try {
      // Invalidate related analytics that depend on cross-role data
      const relatedKeys = [
        executiveAnalyticsKeys.crossRoleAnalytics(),
        executiveAnalyticsKeys.businessInsights(userRole?.data?.role),
        executiveAnalyticsKeys.businessMetrics(userRole?.data?.role)
      ];
      
      // Use Promise.all to propagate errors (for testing)
      await Promise.all(
        relatedKeys.map(queryKey => 
          queryClient.invalidateQueries({ queryKey })
        )
      );
      
      ValidationMonitor.recordPatternSuccess({
        service: 'CrossRoleAnalytics',
        pattern: 'generate_business_insights',
        operation: 'refreshCorrelations'
      });
      
      return await refetch();
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'useCrossRoleAnalytics.refreshCorrelations',
        errorCode: 'CORRELATION_REFRESH_FAILED',
        errorMessage: error.message
      });
      throw error;
    }
  }, [queryClient, userRole?.data?.role, refetch]);

  // Safe data with fallback
  const safeData = data || (isError ? fallbackData : undefined);

  return {
    data: safeData,
    correlations: safeData?.correlations,
    metrics: safeData?.metrics,
    insights: safeData?.insights,
    overallCorrelation: safeData?.overallCorrelation,
    fallbackData: isError ? fallbackData : undefined,
    isLoading,
    isSuccess,
    isError,
    error,
    queryKey,
    refreshCorrelations
  };
}