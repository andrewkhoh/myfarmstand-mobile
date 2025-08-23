// Phase 4.3: Metric Trends Hook Implementation (GREEN Phase)
// Following established React Query patterns

import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { BusinessMetricsService } from '../../services/executive/businessMetricsService';
import { useUserRole } from '../role-based/useUserRole';
import { executiveAnalyticsKeys } from '../../utils/queryKeyFactory';
import { ValidationMonitor } from '../../utils/validationMonitor';

interface UseMetricTrendsOptions {
  metricType?: string;
  timeRange?: string;
  comparisonPeriod?: string;
  granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  includeForecasts?: boolean;
}

export function useMetricTrends(options: UseMetricTrendsOptions = {}) {
  const { role, hasPermission } = useUserRole();
  const queryClient = useQueryClient();

  const queryKey = executiveAnalyticsKeys.metricTrends(role, options);

  const {
    data,
    isLoading,
    isSuccess,
    isError,
    error
  } = useQuery({
    queryKey,
    queryFn: async () => {
      // Check permissions
      const canAccess = await hasPermission('business_metrics_read');
      if (!canAccess && role !== 'executive' && role !== 'admin') {
        throw new Error('Insufficient permissions for metric trends access');
      }

      // Get trend data
      const trends = await BusinessMetricsService.calculateTrends({
        metric_type: options.metricType || 'revenue',
        time_range: options.timeRange || '30d',
        granularity: options.granularity || 'daily'
      });

      // Add comparison if requested
      if (options.comparisonPeriod) {
        const comparisonTrends = await BusinessMetricsService.calculateTrends({
          metric_type: options.metricType || 'revenue',
          time_range: options.comparisonPeriod,
          granularity: options.granularity || 'daily'
        });

        return {
          current: trends,
          comparison: comparisonTrends,
          percentageChange: ((trends.averageValue - comparisonTrends.averageValue) / comparisonTrends.averageValue) * 100
        };
      }

      // Add forecasts if requested
      if (options.includeForecasts) {
        return {
          ...trends,
          forecasts: {
            nextPeriod: trends.averageValue * 1.1, // Simplified forecast
            confidence: 0.85
          }
        };
      }

      return trends;
    },
    enabled: !!role,
    staleTime: 3 * 60 * 1000, // 3 minutes - trends change moderately
    gcTime: 15 * 60 * 1000,   // 15 minutes cache retention
    refetchOnMount: false,     // Trends don't need immediate refresh
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error.message.includes('Insufficient permissions')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    throwOnError: false
  });

  // Fallback data for trends
  const fallbackTrends = React.useMemo(() => ({
    values: [],
    averageValue: 0,
    trend: 'stable',
    message: 'Trend data temporarily unavailable',
    isFallback: true
  }), []);

  // Safe data with fallback
  const safeData = data || (isError ? fallbackTrends : undefined);

  // Smart invalidation helper
  const invalidateRelatedTrends = React.useCallback(async (metricTypes: string[] = []) => {
    const relatedKeys = [
      executiveAnalyticsKeys.metricTrends(role),
      executiveAnalyticsKeys.businessMetrics(role),
    ];
    
    // Add predictive analytics if trend includes forecasting
    if (options.includeForecasts) {
      relatedKeys.push(executiveAnalyticsKeys.predictiveAnalytics(role));
    }
    
    await Promise.allSettled(
      relatedKeys.map(queryKey => 
        queryClient.invalidateQueries({ queryKey })
      )
    );
  }, [queryClient, role, options.includeForecasts]);

  return {
    data: safeData,
    trends: safeData,
    fallbackData: isError ? fallbackTrends : undefined,
    invalidateRelatedTrends,
    isLoading,
    isSuccess,
    isError,
    error,
    queryKey,
    percentageChange: data?.percentageChange
  };
}