// Historical Order Analysis Hook
// Following @docs/architectural-patterns-and-best-practices.md hook-centric patterns
// Pattern: React Query + Service Layer Integration + Predictive Analytics

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useCurrentUser } from '../useAuth';
import {
  HistoricalOrderAnalysisService,
  HistoricalAnalysisOptions,
  HistoricalAnalysisResult,
  TrendAnalysis,
  Prediction
} from '../../services/analytics/historicalOrderAnalysis.service';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { historicalAnalysisKeys } from '../../utils/queryKeyFactory';

export interface UseHistoricalOrderAnalysisOptions extends HistoricalAnalysisOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Hook for comprehensive historical order analysis
 * Provides trend analysis, seasonal patterns, and predictions
 */
export function useHistoricalOrderAnalysis(
  options: UseHistoricalOrderAnalysisOptions = {}
): UseQueryResult<HistoricalAnalysisResult, Error> & {
  // Convenience properties for easy access
  isGrowing: boolean;
  primaryTrend: string | null;
  strongestPattern: string | null;
  nextWeekPrediction: number | null;
  confidence: number;
  hasAnomalies: boolean;
  keyInsight: string | null;
} {
  const { data: user } = useCurrentUser();
  const {
    enabled = true,
    refetchInterval,
    ...analysisOptions
  } = options;

  const queryResult = useQuery({
    queryKey: historicalAnalysisKeys.patternsWithOptions(analysisOptions, user?.id),
    queryFn: async (): Promise<HistoricalAnalysisResult> => {
      try {
        const startTime = Date.now();

        const result = await HistoricalOrderAnalysisService.analyzeHistoricalPatterns({
          ...analysisOptions,
          userId: user?.id,
          includePredictions: analysisOptions.includePredictions ?? true
        });

        ValidationMonitor.recordPatternSuccess({
          service: 'useHistoricalOrderAnalysis',
          pattern: 'statistical_calculation',
          operation: 'analyzeHistoricalPatterns',
          performanceMs: Date.now() - startTime
        });

        return result;

      } catch (error) {
        ValidationMonitor.recordValidationError({
          context: 'useHistoricalOrderAnalysis.queryFn',
          errorCode: 'HISTORICAL_ANALYSIS_QUERY_FAILED',
          validationPattern: 'statistical_calculation',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    },
    enabled: enabled && !!user?.id,
    staleTime: 30 * 60 * 1000, // 30 minutes (historical data changes slowly)
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchInterval,
    retry: (failureCount, error) => {
      if (error.message.includes('Insufficient permissions')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Extract convenience properties
  const isGrowing = queryResult?.data?.trends.revenue?.direction === 'increasing' ||
                   queryResult?.data?.trends.orders?.direction === 'increasing';

  const primaryTrend = queryResult?.data?.trends ? (() => {
    const trends = queryResult.data.trends;
    if (trends.orders?.confidence > 0.7) return `Orders trending ${trends.orders.direction}`;
    if (trends.revenue?.confidence > 0.7) return `Revenue trending ${trends.revenue.direction}`;
    if (trends.customers?.confidence > 0.7) return `Customer base ${trends.customers.direction}`;
    return null;
  })() : null;

  const strongestPattern = queryResult?.data?.seasonalPatterns ? (() => {
    const patterns = queryResult.data.seasonalPatterns;
    if (patterns.weekly?.strength > 0.5) return 'Strong weekly pattern detected';
    if (patterns.monthly?.strength > 0.4) return 'Monthly seasonal pattern found';
    if (patterns.daily?.strength > 0.3) return 'Daily pattern variation';
    return null;
  })() : null;

  const nextWeekPrediction = queryResult?.data?.predictions.nextWeek.find(p => p.metric === 'orders')?.value || null;

  const confidence = queryResult?.data?.trends ? (() => {
    const trends = Object.values(queryResult.data.trends);
    const confidences = trends.map((t: any) => t.confidence).filter(c => c > 0);
    return confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
  })() : 0;

  const hasAnomalies = (queryResult?.data?.insights.anomalies?.length || 0) > 0;

  const keyInsight = queryResult?.data?.insights.keyTrends?.[0] || null;

  return {
    ...queryResult,
    isGrowing,
    primaryTrend,
    strongestPattern,
    nextWeekPrediction,
    confidence,
    hasAnomalies,
    keyInsight
  };
}

/**
 * Hook for trend analysis only (lightweight)
 * Useful for dashboard widgets that only need trend information
 */
export function useOrderTrends(
  options: UseHistoricalOrderAnalysisOptions = {}
): UseQueryResult<HistoricalAnalysisResult['trends'], Error> & {
  ordersTrend: 'up' | 'down' | 'stable' | 'unknown';
  revenueTrend: 'up' | 'down' | 'stable' | 'unknown';
  overallHealth: 'good' | 'concerning' | 'excellent' | 'unknown';
} {
  const { data: user } = useCurrentUser();
  const {
    enabled = true,
    refetchInterval,
    ...analysisOptions
  } = options;

  const queryResult = useQuery({
    queryKey: historicalAnalysisKeys.trends(user?.id),
    queryFn: async () => {
      const result = await HistoricalOrderAnalysisService.analyzeHistoricalPatterns({
        ...analysisOptions,
        userId: user?.id,
        includePredictions: false // Trends only, no predictions needed
      });

      return result.trends;
    },
    enabled: enabled && !!user?.id,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval,
  });

  const ordersTrend = queryResult?.data?.orders ? (() => {
    const trend = queryResult.data.orders;
    if (trend.confidence < 0.5) return 'unknown';
    switch (trend.direction) {
      case 'increasing': return 'up';
      case 'decreasing': return 'down';
      case 'stable': return 'stable';
      default: return 'unknown';
    }
  })() : 'unknown';

  const revenueTrend = queryResult?.data?.revenue ? (() => {
    const trend = queryResult.data.revenue;
    if (trend.confidence < 0.5) return 'unknown';
    switch (trend.direction) {
      case 'increasing': return 'up';
      case 'decreasing': return 'down';
      case 'stable': return 'stable';
      default: return 'unknown';
    }
  })() : 'unknown';

  const overallHealth = (() => {
    if (!queryResult.data) return 'unknown';

    const ordersIncreasing = ordersTrend === 'up';
    const revenueIncreasing = revenueTrend === 'up';
    const ordersStable = ordersTrend === 'stable';
    const revenueStable = revenueTrend === 'stable';

    if (ordersIncreasing && revenueIncreasing) return 'excellent';
    if ((ordersIncreasing || ordersStable) && (revenueIncreasing || revenueStable)) return 'good';
    if (ordersTrend === 'down' || revenueTrend === 'down') return 'concerning';
    return 'unknown';
  })();

  return {
    ...queryResult,
    ordersTrend,
    revenueTrend,
    overallHealth
  };
}

/**
 * Hook for seasonal pattern analysis
 * Optimized for understanding cyclical business patterns
 */
export function useSeasonalPatterns(
  options: UseHistoricalOrderAnalysisOptions = {}
): UseQueryResult<HistoricalAnalysisResult['seasonalPatterns'], Error> & {
  bestDay: string | null;
  worstDay: string | null;
  seasonalStrength: 'strong' | 'moderate' | 'weak' | 'none';
  recommendedActions: string[];
} {
  const { data: user } = useCurrentUser();
  const {
    enabled = true,
    refetchInterval,
    ...analysisOptions
  } = options;

  const queryResult = useQuery({
    queryKey: historicalAnalysisKeys.seasonal(user?.id),
    queryFn: async () => {
      const result = await HistoricalOrderAnalysisService.analyzeHistoricalPatterns({
        ...analysisOptions,
        userId: user?.id,
        includePredictions: false
      });

      return result.seasonalPatterns;
    },
    enabled: enabled && !!user?.id,
    staleTime: 60 * 60 * 1000, // 1 hour (seasonal patterns change very slowly)
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchInterval,
  });

  const bestDay = queryResult?.data?.weekly ? (() => {
    const weeklyPattern = queryResult.data.weekly.pattern;
    const best = weeklyPattern.reduce((best, current) =>
      current.multiplier > best.multiplier ? current : best,
      weeklyPattern[0]
    );
    return best?.period || null;
  })() : null;

  const worstDay = queryResult?.data?.weekly ? (() => {
    const weeklyPattern = queryResult.data.weekly.pattern;
    const worst = weeklyPattern.reduce((worst, current) =>
      current.multiplier < worst.multiplier ? current : worst,
      weeklyPattern[0]
    );
    return worst?.period || null;
  })() : null;

  const seasonalStrength = queryResult.data ? (() => {
    const maxStrength = Math.max(
      queryResult.data.weekly?.strength || 0,
      queryResult.data.monthly?.strength || 0
    );
    if (maxStrength > 0.6) return 'strong';
    if (maxStrength > 0.3) return 'moderate';
    if (maxStrength > 0.1) return 'weak';
    return 'none';
  })() : 'none';

  const recommendedActions = queryResult.data ? (() => {
    const actions: string[] = [];

    if (queryResult.data.weekly?.strength > 0.4) {
      actions.push('Optimize staffing based on weekly patterns');
      if (bestDay && worstDay) {
        actions.push(`Focus marketing efforts on ${worstDay}, maintain service quality on ${bestDay}`);
      }
    }

    if (queryResult.data.monthly?.strength > 0.3) {
      actions.push('Plan inventory and promotions around monthly cycles');
    }

    if (seasonalStrength === 'strong') {
      actions.push('Implement predictive scheduling based on seasonal patterns');
    }

    return actions;
  })() : [];

  return {
    ...queryResult,
    bestDay,
    worstDay,
    seasonalStrength,
    recommendedActions
  };
}

/**
 * Hook for predictive insights
 * Focuses on future predictions and forecasting
 */
export function usePredictiveInsights(
  predictionHorizon: number = 30,
  options: Omit<UseHistoricalOrderAnalysisOptions, 'predictionHorizon'> = {}
): UseQueryResult<HistoricalAnalysisResult['predictions'], Error> & {
  nextWeekOrders: number | null;
  nextMonthRevenue: number | null;
  predictionConfidence: number;
  growthForecast: 'positive' | 'negative' | 'stable' | 'uncertain';
} {
  const { data: user } = useCurrentUser();
  const {
    enabled = true,
    refetchInterval,
    ...analysisOptions
  } = options;

  const queryResult = useQuery({
    queryKey: historicalAnalysisKeys.predictionsWithHorizon(predictionHorizon, user?.id),
    queryFn: async () => {
      const result = await HistoricalOrderAnalysisService.analyzeHistoricalPatterns({
        ...analysisOptions,
        userId: user?.id,
        includePredictions: true,
        predictionHorizon
      });

      return result.predictions;
    },
    enabled: enabled && !!user?.id,
    staleTime: 20 * 60 * 1000, // 20 minutes
    gcTime: 40 * 60 * 1000, // 40 minutes
    refetchInterval,
  });

  const nextWeekOrders = queryResult?.data?.nextWeek.find(p => p.metric === 'orders')?.value || null;
  const nextMonthRevenue = queryResult?.data?.nextMonth.find(p => p.metric === 'revenue')?.value || null;

  const predictionConfidence = queryResult.data ? (() => {
    const allPredictions = [
      ...queryResult.data.nextWeek,
      ...queryResult.data.nextMonth,
      ...queryResult.data.nextQuarter
    ];
    const confidences = allPredictions.map(p => p.confidence);
    return confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
  })() : 0;

  const growthForecast = queryResult.data ? (() => {
    const nextWeekOrdersPred = queryResult.data.nextWeek.find(p => p.metric === 'orders');
    const nextMonthOrdersPred = queryResult.data.nextMonth.find(p => p.metric === 'orders');

    if (!nextWeekOrdersPred || !nextMonthOrdersPred) return 'uncertain';

    const trendFactor = nextMonthOrdersPred.factors?.find(f => f.factor === 'Historical trend');
    if (!trendFactor) return 'uncertain';

    if (predictionConfidence < 0.5) return 'uncertain';
    if (trendFactor.impact > 0.2) return 'positive';
    if (trendFactor.impact < -0.2) return 'negative';
    return 'stable';
  })() : 'uncertain';

  return {
    ...queryResult,
    nextWeekOrders,
    nextMonthRevenue,
    predictionConfidence,
    growthForecast
  };
}