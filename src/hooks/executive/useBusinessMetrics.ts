/**
 * Phase 4.3: Business Metrics Hooks Implementation
 * Following established patterns from inventory/role-based hooks
 * Pattern: React Query integration with proper cache configuration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BusinessMetricsService } from '../../services/executive/businessMetricsService';
import { businessMetricsKeys, executiveAnalyticsKeys } from '../../utils/queryKeyFactory';
import type { 
  BusinessMetricsTransform, 
  CreateBusinessMetricsContract,
  UpdateBusinessMetricsContract 
} from '../../schemas/executive';
import { useUserRole } from '../role-based/useUserRole';

/**
 * Get business metrics by category with role-based filtering
 */
export function useBusinessMetricsByCategory(
  category: string, 
  filters?: {
    date_range?: string;
    aggregation_level?: string;
  }
) {
  const { data: userRole } = useUserRole();

  return useQuery({
    queryKey: businessMetricsKeys.categoryWithFilters(category, filters || {}, userRole?.role_name),
    queryFn: () => BusinessMetricsService.getMetricsByCategory(
      category as any,
      { ...filters, user_role: userRole?.role_name }
    ),
    enabled: !!userRole && !!category,
    staleTime: 1000 * 60 * 5, // 5 minutes for analytics data
    gcTime: 1000 * 60 * 20,   // 20 minutes for analytics cache
    retry: (failureCount, error) => {
      // Don't retry on permission errors
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as any).message;
        if (message?.includes('Insufficient permissions') || message?.includes('only access')) {
          return false;
        }
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Aggregate cross-role business metrics with performance optimization
 */
export function useBusinessMetricsAggregation(
  categories: string[],
  aggregationLevel: string,
  startDate: string,
  endDate: string,
  enabled: boolean = true
) {
  const { data: userRole } = useUserRole();

  return useQuery({
    queryKey: businessMetricsKeys.aggregation(
      categories, 
      aggregationLevel, 
      `${startDate}-${endDate}`,
      userRole?.role_name
    ),
    queryFn: () => BusinessMetricsService.aggregateBusinessMetrics(
      categories as any,
      aggregationLevel as any,
      startDate,
      endDate,
      { user_role: userRole?.role_name }
    ),
    enabled: enabled && !!userRole && categories.length > 0 && !!aggregationLevel,
    staleTime: 1000 * 60 * 10, // 10 minutes for aggregated data
    gcTime: 1000 * 60 * 30,    // 30 minutes for complex analytics
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as any).message;
        if (message?.includes('permissions') || message?.includes('access')) {
          return false;
        }
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 60000), // Longer delays for complex queries
  });
}

/**
 * Get metric trends with time series analysis
 */
export function useMetricTrends(
  category: string,
  metricName: string,
  startDate: string,
  endDate: string,
  enabled: boolean = true
) {
  const { data: userRole } = useUserRole();

  return useQuery({
    queryKey: businessMetricsKeys.trends(
      category,
      metricName,
      `${startDate}-${endDate}`,
      userRole?.role_name
    ),
    queryFn: () => BusinessMetricsService.getMetricTrends(
      category,
      metricName,
      startDate,
      endDate
    ),
    enabled: enabled && !!userRole && !!category && !!metricName,
    staleTime: 1000 * 60 * 15, // 15 minutes for trend analysis
    gcTime: 1000 * 60 * 45,    // 45 minutes for statistical data
    retry: 1, // Trend analysis is compute-intensive, limit retries
    retryDelay: 5000, // 5 second delay for statistical calculations
  });
}

/**
 * Cross-role correlation analysis hook
 */
export function useCrossRoleCorrelation(
  category1: string,
  category2: string,
  startDate: string,
  endDate: string,
  enabled: boolean = true
) {
  const { data: userRole } = useUserRole();

  return useQuery({
    queryKey: businessMetricsKeys.correlation(
      category1,
      category2,
      `${startDate}-${endDate}`,
      userRole?.role_name
    ),
    queryFn: () => BusinessMetricsService.generateCorrelationAnalysis(
      category1,
      category2,
      startDate,
      endDate
    ),
    enabled: enabled && !!userRole && !!category1 && !!category2 && 
             (userRole.role_name === 'executive' || userRole.role_name === 'admin'),
    staleTime: 1000 * 60 * 20, // 20 minutes for correlation data
    gcTime: 1000 * 60 * 60,    // 1 hour for statistical analysis
    retry: 1,
    retryDelay: 3000,
  });
}

/**
 * Executive dashboard aggregated data
 */
export function useExecutiveDashboard() {
  const { data: userRole } = useUserRole();

  return useQuery({
    queryKey: executiveAnalyticsKeys.dashboard(userRole?.role_name),
    queryFn: async () => {
      // Aggregate data from multiple sources for executive dashboard
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      const endDate = new Date().toISOString().slice(0, 10);
      
      const [metrics, correlations] = await Promise.all([
        BusinessMetricsService.aggregateBusinessMetrics(
          ['inventory', 'marketing', 'sales', 'operational', 'strategic'],
          'monthly',
          currentMonth,
          endDate,
          { user_role: userRole?.role_name }
        ),
        BusinessMetricsService.generateCorrelationAnalysis(
          'inventory',
          'marketing',
          currentMonth,
          endDate
        )
      ]);

      return {
        metrics: metrics.metrics,
        summary: metrics.summary,
        correlations: {
          inventory_marketing: correlations
        },
        last_updated: new Date().toISOString()
      };
    },
    enabled: !!userRole && (userRole.role_name === 'executive' || userRole.role_name === 'admin'),
    staleTime: 1000 * 60 * 5,  // 5 minutes for dashboard data
    gcTime: 1000 * 60 * 15,    // 15 minutes for dashboard cache
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(3000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Update business metric mutation with optimistic updates
 */
export function useUpdateBusinessMetric() {
  const queryClient = useQueryClient();
  const { data: userRole } = useUserRole();

  return useMutation({
    mutationFn: ({ metricId, updates }: {
      metricId: string;
      updates: UpdateBusinessMetricsContract;
    }) => BusinessMetricsService.updateMetricValues(metricId, updates),
    
    onMutate: async ({ metricId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: businessMetricsKeys.all(userRole?.role_name) 
      });

      // Snapshot previous value
      const previousMetrics = queryClient.getQueriesData({
        queryKey: businessMetricsKeys.all(userRole?.role_name)
      });

      // Optimistically update cache
      queryClient.setQueriesData(
        { queryKey: businessMetricsKeys.all(userRole?.role_name) },
        (old: BusinessMetricsTransform[] | undefined) => {
          if (!old) return old;
          return old.map(metric => 
            metric.id === metricId 
              ? { ...metric, ...updates, updatedAt: new Date().toISOString() }
              : metric
          );
        }
      );

      return { previousMetrics };
    },

    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousMetrics) {
        context.previousMetrics.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ 
        queryKey: businessMetricsKeys.all(userRole?.role_name) 
      });
      queryClient.invalidateQueries({ 
        queryKey: executiveAnalyticsKeys.dashboard(userRole?.role_name) 
      });
    }
  });
}

/**
 * Create business metric mutation
 */
export function useCreateBusinessMetric() {
  const queryClient = useQueryClient();
  const { data: userRole } = useUserRole();

  return useMutation({
    mutationFn: (metricData: CreateBusinessMetricsContract) => 
      BusinessMetricsService.createMetric(metricData),
    
    onSuccess: (newMetric) => {
      // Add to cache optimistically
      queryClient.setQueriesData(
        { queryKey: businessMetricsKeys.category(newMetric.metricCategory, userRole?.role_name) },
        (old: BusinessMetricsTransform[] | undefined) => {
          if (!old) return [newMetric];
          return [newMetric, ...old];
        }
      );

      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: businessMetricsKeys.all(userRole?.role_name) 
      });
      queryClient.invalidateQueries({ 
        queryKey: executiveAnalyticsKeys.dashboard(userRole?.role_name) 
      });
    },

    onError: (error) => {
      console.error('Failed to create business metric:', error);
    }
  });
}

/**
 * Batch process metrics mutation
 */
export function useBatchProcessMetrics() {
  const queryClient = useQueryClient();
  const { data: userRole } = useUserRole();

  return useMutation({
    mutationFn: (metricsData: CreateBusinessMetricsContract[]) =>
      BusinessMetricsService.batchProcessMetrics(metricsData),
    
    onSuccess: (result) => {
      // Invalidate all metrics queries after batch operation
      queryClient.invalidateQueries({ 
        queryKey: businessMetricsKeys.all(userRole?.role_name) 
      });
      
      // Invalidate dashboard and aggregation queries
      queryClient.invalidateQueries({ 
        queryKey: executiveAnalyticsKeys.dashboard(userRole?.role_name) 
      });

      console.log(`Batch processing completed: ${result.successful} successful, ${result.failed} failed`);
    },

    onError: (error) => {
      console.error('Batch processing failed:', error);
    }
  });
}