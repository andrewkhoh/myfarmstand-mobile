// Phase 4.3: Cross-Role Analytics Hook Implementation (GREEN Phase)
// Following established React Query patterns

import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { BusinessMetricsService } from '../../services/executive/businessMetricsService';
import { BusinessIntelligenceService } from '../../services/executive/businessIntelligenceService';
import { useUserRole } from '../role-based/useUserRole';
import { executiveAnalyticsKeys } from '../../utils/queryKeyFactory';
import { ValidationMonitor } from '../../utils/validationMonitor';

interface UseCrossRoleAnalyticsOptions {
  roles?: string[];
  correlationType?: 'performance' | 'efficiency' | 'all';
  includeHistorical?: boolean;
  timeRange?: string;
}

export function useCrossRoleAnalytics(options: UseCrossRoleAnalyticsOptions = {}) {
  const { role, hasPermission } = useUserRole();
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
      // Check permissions
      const canAccess = await hasPermission('cross_role_analytics_read');
      if (!canAccess && role !== 'executive' && role !== 'admin') {
        const permError = new Error('Insufficient permissions for cross-role analytics');
        (permError as any).isPermissionError = true;
        throw permError;
      }

      try {
        // Get cross-role correlations
        const correlations = await BusinessIntelligenceService.correlateBusinessData({
        data_sources: options.roles || ['inventory', 'marketing'],
        correlation_type: options.correlationType || 'all',
        include_significance: true
      });

      // Get cross-role metrics
      const metrics = await BusinessMetricsService.getCrossRoleMetrics({
        categories: options.roles,
        user_role: role
      });

      // Combine correlations with metrics
      const result = {
        correlations: correlations.correlations,
        metrics: metrics.metrics,
        insights: correlations.insights || [],
        overallCorrelation: correlations.overallCorrelation || 0.75
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
    enabled: !!role,
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
        executiveAnalyticsKeys.businessInsights(role),
        executiveAnalyticsKeys.businessMetrics(role)
      ];
      
      // Use Promise.all to propagate errors (for testing)
      await Promise.all(
        relatedKeys.map(queryKey => 
          queryClient.invalidateQueries({ queryKey })
        )
      );
      
      ValidationMonitor.recordPatternSuccess({
        pattern: 'cross_role_analytics_refresh',
        context: 'useCrossRoleAnalytics.refreshCorrelations',
        description: 'Successfully refreshed cross-role correlations and related data'
      });
      
      return await refetch();
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'useCrossRoleAnalytics.refreshCorrelations',
        errorCode: 'CORRELATION_REFRESH_FAILED',
        validationPattern: 'cross_role_analytics_operation',
        errorMessage: error.message
      });
      throw error;
    }
  }, [queryClient, role, refetch]);

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