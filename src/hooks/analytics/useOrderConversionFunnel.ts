// Order Conversion Funnel Hook
// Following @docs/architectural-patterns-and-best-practices.md hook-centric patterns
// Pattern: React Query + Service Layer Integration + Error Handling

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useCurrentUser } from '../useAuth';
import {
  OrderConversionFunnelService,
  ConversionFunnelOptions,
  OrderFunnelData,
  ConversionFunnelMetrics
} from '../../services/analytics';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { conversionFunnelKeys } from '../../utils/queryKeyFactory';

export interface UseOrderConversionFunnelResult {
  orders: OrderFunnelData[];
  metrics: ConversionFunnelMetrics;
  insights: {
    criticalBottlenecks: string[];
    optimizationOpportunities: Array<{
      stage: string;
      impact: 'high' | 'medium' | 'low';
      recommendation: string;
      estimatedImprovement: string;
    }>;
    customerBehaviorPatterns: string[];
  };
}

export interface UseOrderConversionFunnelOptions extends ConversionFunnelOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Hook for order conversion funnel analysis
 * Provides comprehensive lifecycle analysis with error handling and caching
 */
export function useOrderConversionFunnel(
  options: UseOrderConversionFunnelOptions = {}
): UseQueryResult<UseOrderConversionFunnelResult, Error> & {
  // Additional convenience properties
  completionRate: number;
  totalOrders: number;
  averageTimeToCompletion: number;
  hasBottlenecks: boolean;
  topBottleneck: string | null;
} {
  const { data: user } = useCurrentUser();
  const {
    enabled = true,
    refetchInterval,
    ...funnelOptions
  } = options;

  const queryResult = useQuery({
    queryKey: conversionFunnelKeys.analysisWithFilters(funnelOptions, user?.id),
    queryFn: async (): Promise<UseOrderConversionFunnelResult> => {
      try {
        const startTime = Date.now();

        const result = await OrderConversionFunnelService.analyzeConversionFunnel({
          ...funnelOptions,
          userId: user?.id
        });

        ValidationMonitor.recordPatternSuccess({
          service: 'useOrderConversionFunnel',
          pattern: 'direct_supabase_query',
          operation: 'analyzeConversionFunnel',
          performanceMs: Date.now() - startTime
        });

        return result;

      } catch (error) {
        ValidationMonitor.recordValidationError({
          context: 'useOrderConversionFunnel.queryFn',
          errorCode: 'CONVERSION_FUNNEL_QUERY_FAILED',
          validationPattern: 'direct_supabase_query',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    },
    enabled: enabled && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval,
    retry: (failureCount, error) => {
      // Retry up to 2 times for non-permission errors
      if (error.message.includes('Insufficient permissions')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Extract convenience properties
  const completionRate = queryResult?.data?.metrics?.completionRate || 0;
  const totalOrders = queryResult?.data?.metrics?.totalOrders || 0;
  const averageTimeToCompletion = queryResult?.data?.metrics?.averageTimeToCompletion || 0;
  const hasBottlenecks = (queryResult?.data?.metrics?.bottlenecks?.length || 0) > 0;
  const topBottleneck = queryResult?.data?.metrics?.bottlenecks?.[0]?.stage || null;

  return {
    ...queryResult,
    completionRate,
    totalOrders,
    averageTimeToCompletion,
    hasBottlenecks,
    topBottleneck
  };
}

/**
 * Hook for conversion funnel metrics only (lighter weight)
 * Useful for dashboard widgets that only need summary metrics
 */
export function useOrderConversionMetrics(
  options: UseOrderConversionFunnelOptions = {}
): UseQueryResult<ConversionFunnelMetrics, Error> & {
  completionRate: number;
  totalOrders: number;
  criticalBottleneckCount: number;
} {
  const { data: user } = useCurrentUser();
  const {
    enabled = true,
    refetchInterval,
    ...funnelOptions
  } = options;

  const queryResult = useQuery({
    queryKey: conversionFunnelKeys.conversion('metrics', user?.id),
    queryFn: async (): Promise<ConversionFunnelMetrics> => {
      try {
        const result = await OrderConversionFunnelService.analyzeConversionFunnel({
          ...funnelOptions,
          userId: user?.id
        });

        return result.metrics;

      } catch (error) {
        ValidationMonitor.recordValidationError({
          context: 'useOrderConversionMetrics.queryFn',
          errorCode: 'CONVERSION_METRICS_QUERY_FAILED',
          validationPattern: 'direct_supabase_query',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    },
    enabled: enabled && !!user?.id,
    staleTime: 3 * 60 * 1000, // 3 minutes (more frequent for metrics)
    gcTime: 8 * 60 * 1000, // 8 minutes
    refetchInterval,
    retry: 2,
  });

  const completionRate = queryResult?.data?.completionRate || 0;
  const totalOrders = queryResult?.data?.totalOrders || 0;
  const criticalBottleneckCount = queryResult?.data?.bottlenecks?.filter(b => b.dropoffRate > 25).length || 0;

  return {
    ...queryResult,
    completionRate,
    totalOrders,
    criticalBottleneckCount
  };
}

/**
 * Hook for specific customer segment funnel analysis
 * Optimized for segment-specific insights
 */
export function useCustomerSegmentFunnel(
  segment: 'new' | 'returning' | 'premium',
  options: Omit<UseOrderConversionFunnelOptions, 'customerSegment'> = {}
): UseQueryResult<UseOrderConversionFunnelResult, Error> & {
  segmentCompletionRate: number;
  segmentAverageOrderValue: number;
  comparisonWithAll: {
    completionRateDiff: number;
    avgOrderValueDiff: number;
  } | null;
} {
  const segmentResult = useOrderConversionFunnel({
    ...options,
    customerSegment: segment
  });

  const allCustomersResult = useOrderConversionFunnel({
    ...options,
    customerSegment: 'all'
  });

  const segmentCompletionRate = segmentResult?.data?.metrics?.completionRate || 0;
  const segmentAverageOrderValue = segmentResult?.data?.metrics?.customerSegmentAnalysis?.[segment]?.averageOrderValue || 0;

  const comparisonWithAll = allCustomersResult.data ? {
    completionRateDiff: segmentCompletionRate - allCustomersResult.data.metrics.completionRate,
    avgOrderValueDiff: segmentAverageOrderValue - (
      Object.values(allCustomersResult.data.metrics.customerSegmentAnalysis)
        .reduce((sum: number, seg: any) => sum + seg.averageOrderValue, 0) /
      Object.keys(allCustomersResult.data.metrics.customerSegmentAnalysis).length
    )
  } : null;

  return {
    ...segmentResult,
    segmentCompletionRate,
    segmentAverageOrderValue,
    comparisonWithAll
  };
}

/**
 * Hook for funnel stage analysis
 * Provides detailed stage-by-stage conversion data
 */
export function useFunnelStageAnalysis(
  options: UseOrderConversionFunnelOptions = {}
): UseQueryResult<ConversionFunnelMetrics['stageConversionRates'], Error> & {
  worstPerformingStage: string | null;
  bestPerformingStage: string | null;
  stageCount: number;
} {
  const { data: user } = useCurrentUser();
  const {
    enabled = true,
    refetchInterval,
    ...funnelOptions
  } = options;

  const queryResult = useQuery({
    queryKey: conversionFunnelKeys.stage('analysis', user?.id),
    queryFn: async () => {
      const result = await OrderConversionFunnelService.analyzeConversionFunnel({
        ...funnelOptions,
        userId: user?.id
      });

      return result.metrics.stageConversionRates;
    },
    enabled: enabled && !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval,
  });

  const stages = queryResult.data ? Object.entries(queryResult.data) : [];
  const worstPerformingStage = stages.length > 0
    ? stages.reduce((worst, [stage, data]) =>
        data.conversionRate < queryResult.data![worst]?.conversionRate ? stage : worst,
        stages[0][0]
      )
    : null;

  const bestPerformingStage = stages.length > 0
    ? stages.reduce((best, [stage, data]) =>
        data.conversionRate > queryResult.data![best]?.conversionRate ? stage : best,
        stages[0][0]
      )
    : null;

  return {
    ...queryResult,
    worstPerformingStage,
    bestPerformingStage,
    stageCount: stages.length
  };
}