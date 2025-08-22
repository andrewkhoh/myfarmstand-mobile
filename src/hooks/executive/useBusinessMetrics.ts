// Phase 4.3: Business Metrics Hook Implementation (GREEN Phase)
// Following established React Query patterns

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BusinessMetricsService } from '../../services/executive/businessMetricsService';
import { useUserRole } from '../role-based/useUserRole';
import { queryKeyFactory } from '../../utils/queryKeyFactory';

interface UseBusinessMetricsOptions {
  categories?: string[];
  userRole?: string;
  dateRange?: string;
  includeAllMetrics?: boolean;
  includeInventoryMetrics?: boolean;
  includeMarketingMetrics?: boolean;
  aggregationType?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  sortByPerformance?: boolean;
  realTimeEnabled?: boolean;
}

export function useBusinessMetrics(options: UseBusinessMetricsOptions = {}) {
  const { role, hasPermission } = useUserRole();
  const queryClient = useQueryClient();
  const userRole = options.userRole || role;

  // Use centralized query key factory
  const queryKey = ['executive', 'businessMetrics', options];

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
      const canAccess = await hasPermission('business_metrics_read');
      if (!canAccess && userRole !== 'executive' && userRole !== 'admin') {
        throw new Error('Insufficient permissions for business metrics access');
      }

      // Use aggregateBusinessMetrics when categories and date range are provided
      if (options.categories && options.categories.length > 0 && options.dateRange) {
        const dates = options.dateRange.split(',');
        return BusinessMetricsService.aggregateBusinessMetrics(
          options.categories as any,
          options.aggregationType || 'daily',
          dates[0],
          dates[1] || dates[0],
          { user_role: userRole }
        );
      }

      // Aggregate all metrics if requested
      if (options.includeAllMetrics) {
        const [inventoryMetrics, marketingMetrics] = await Promise.all([
          BusinessMetricsService.aggregateInventoryMetrics({
            date_range: options.dateRange,
            granularity: options.aggregationType
          }),
          BusinessMetricsService.aggregateMarketingMetrics({
            date_range: options.dateRange,
            aggregation_type: options.aggregationType
          })
        ]);

        return {
          crossRoleMetrics: {
            inventory: inventoryMetrics,
            marketing: marketingMetrics
          },
          aggregatedData: {
            totalRevenue: inventoryMetrics.totalRevenue + marketingMetrics.totalRevenue,
            inventoryTurnover: inventoryMetrics.inventoryTurnover,
            marketingROI: marketingMetrics.roi
          },
          timestamp: new Date().toISOString()
        };
      }

      // Get specific metrics based on options
      if (options.includeInventoryMetrics) {
        return BusinessMetricsService.aggregateInventoryMetrics({
          date_range: options.dateRange,
          granularity: options.aggregationType
        });
      }

      if (options.includeMarketingMetrics) {
        return BusinessMetricsService.aggregateMarketingMetrics({
          date_range: options.dateRange,
          aggregation_type: options.aggregationType
        });
      }

      // Default: get cross-role metrics or aggregateBusinessMetrics
      if (options.realTimeEnabled && !options.categories) {
        // For real-time updates without specific categories, return basic metrics
        return BusinessMetricsService.aggregateBusinessMetrics(
          ['revenue', 'inventory'] as any,
          'daily',
          new Date().toISOString().split('T')[0],
          new Date().toISOString().split('T')[0],
          { user_role: userRole }
        );
      }

      return BusinessMetricsService.getCrossRoleMetrics({
        categories: options.categories,
        user_role: userRole
      });
    },
    enabled: !!userRole,
    refetchInterval: options.realTimeEnabled ? 5000 : false
  });

  // Mutation for updating metric thresholds
  const updateThresholdMutation = useMutation({
    mutationFn: async ({ metricId, threshold }: { metricId: string; threshold: number }) => {
      return BusinessMetricsService.updateMetricThreshold(metricId, threshold);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executive', 'businessMetrics'] });
    }
  });

  // Mutation for batch updating metrics
  const batchUpdateMutation = useMutation({
    mutationFn: async (updates: Array<{ metricId: string; value: any }>) => {
      return Promise.all(
        updates.map(update => 
          BusinessMetricsService.updateMetricThreshold(update.metricId, update.value)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executive', 'businessMetrics'] });
    }
  });

  // Helper to invalidate related metrics
  const invalidateRelatedMetrics = async (categories: string[]) => {
    await queryClient.invalidateQueries({
      queryKey: ['executive', 'businessMetrics'],
      predicate: (query) => {
        const key = query.queryKey as any[];
        return categories.some(cat => 
          JSON.stringify(key).includes(cat)
        );
      }
    });
  };

  // Prefetch related data
  const prefetchRelatedData = async () => {
    await queryClient.prefetchQuery({
      queryKey: ['executive', 'businessMetrics', 'prefetch'],
      queryFn: () => BusinessMetricsService.getCrossRoleMetrics({})
    });
  };

  // Check if using cache
  const isFromCache = queryClient.getQueryState(queryKey)?.dataUpdateCount > 0;
  const isStale = queryClient.getQueryState(queryKey)?.isInvalidated || false;

  return {
    data,
    metrics: data,
    isLoading,
    isSuccess,
    isError,
    error: error as Error | undefined,
    errorCode: error ? 'METRICS_LOAD_FAILED' : undefined,
    refetch,
    queryKey,
    updateThreshold: updateThresholdMutation.mutate,
    batchUpdateMetrics: batchUpdateMutation.mutate,
    invalidateRelatedMetrics,
    lastUpdatedAt: data?.timestamp || new Date().toISOString(),
    isFromCache,
    isStale,
    isPrefetching: false,
    prefetchRelatedData
  };
}