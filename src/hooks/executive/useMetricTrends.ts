// Phase 4.3: Metric Trends Hook Implementation (GREEN Phase)
// Following established React Query patterns

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BusinessMetricsService } from '../../services/executive/businessMetricsService';
import { useUserRole } from '../role-based/useUserRole';

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

  const queryKey = ['executive', 'metricTrends', options];

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
    enabled: !!role
  });

  return {
    data,
    trends: data,
    isLoading,
    isSuccess,
    isError,
    error,
    queryKey,
    percentageChange: data?.percentageChange
  };
}