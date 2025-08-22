// Phase 4.3: Cross-Role Analytics Hook Implementation (GREEN Phase)
// Following established React Query patterns

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BusinessMetricsService } from '../../services/executive/businessMetricsService';
import { BusinessIntelligenceService } from '../../services/executive/businessIntelligenceService';
import { useUserRole } from '../role-based/useUserRole';

interface UseCrossRoleAnalyticsOptions {
  roles?: string[];
  correlationType?: 'performance' | 'efficiency' | 'all';
  includeHistorical?: boolean;
  timeRange?: string;
}

export function useCrossRoleAnalytics(options: UseCrossRoleAnalyticsOptions = {}) {
  const { role, hasPermission } = useUserRole();
  const queryClient = useQueryClient();

  const queryKey = ['executive', 'crossRoleAnalytics', options];

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
    enabled: !!role
  });

  // Helper to refresh correlations
  const refreshCorrelations = async () => {
    await queryClient.invalidateQueries({ queryKey });
    return refetch();
  };

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