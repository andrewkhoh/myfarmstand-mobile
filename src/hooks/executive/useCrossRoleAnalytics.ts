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
        throw new Error('Insufficient permissions for cross-role analytics');
      }

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
    },
    enabled: !!role,
    staleTime: 5 * 60 * 1000, // 5 minutes - cross-role data changes less frequently
    gcTime: 20 * 60 * 1000,   // 20 minutes - longer retention for complex analytics
    refetchOnMount: false,     // Don't auto-refetch expensive cross-role queries
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry permission errors
      if (error.message.includes('Insufficient permissions')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
      
      await Promise.allSettled(
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

  return {
    data,
    correlations: data?.correlations,
    metrics: data?.metrics,
    insights: data?.insights,
    overallCorrelation: data?.overallCorrelation,
    isLoading,
    isSuccess,
    isError,
    error,
    queryKey,
    refreshCorrelations
  };
}