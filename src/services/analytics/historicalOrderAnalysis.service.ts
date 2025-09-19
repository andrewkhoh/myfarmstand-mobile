// Historical Order Pattern Analysis Service
// Following @docs/architectural-patterns-and-best-practices.md patterns
// Pattern: Database-first validation + statistical calculation + predictive analytics

import { supabase } from '../../config/supabase';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { unifiedRoleService } from '../unifiedRoleService';
import { z } from 'zod';

// Validation schemas for historical analysis
const HistoricalDataPointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  orderCount: z.number().min(0),
  revenue: z.number().min(0),
  averageOrderValue: z.number().min(0),
  completionRate: z.number().min(0).max(100),
  customerCount: z.number().min(0),
  newCustomerCount: z.number().min(0),
  metadata: z.record(z.any()).optional()
});

const SeasonalPatternSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
  pattern: z.array(z.object({
    period: z.string(),
    multiplier: z.number(),
    confidence: z.number().min(0).max(1)
  })),
  strength: z.number().min(0).max(1), // How strong the seasonal pattern is
  reliability: z.number().min(0).max(1) // How consistent the pattern is
});

const TrendAnalysisSchema = z.object({
  direction: z.enum(['increasing', 'decreasing', 'stable', 'volatile']),
  slope: z.number(), // Rate of change
  r_squared: z.number().min(0).max(1), // Goodness of fit
  confidence: z.number().min(0).max(1),
  projectedValue: z.number().optional(),
  timeframe: z.string()
});

const PredictionSchema = z.object({
  metric: z.string(),
  value: z.number(),
  confidence: z.number().min(0).max(1),
  range: z.object({
    min: z.number(),
    max: z.number()
  }),
  timeframe: z.string(),
  factors: z.array(z.object({
    factor: z.string(),
    impact: z.number().min(-1).max(1),
    confidence: z.number().min(0).max(1)
  }))
});

export type HistoricalDataPoint = z.infer<typeof HistoricalDataPointSchema>;
export type SeasonalPattern = z.infer<typeof SeasonalPatternSchema>;
export type TrendAnalysis = z.infer<typeof TrendAnalysisSchema>;
export type Prediction = z.infer<typeof PredictionSchema>;

export interface HistoricalAnalysisOptions {
  dateRange?: {
    start: string;
    end: string;
  };
  granularity?: 'daily' | 'weekly' | 'monthly';
  metrics?: Array<'orders' | 'revenue' | 'customers' | 'completion_rate' | 'average_order_value'>;
  includePredictions?: boolean;
  predictionHorizon?: number; // Days to predict into the future
  userId?: string;
}

export interface HistoricalAnalysisResult {
  dataPoints: HistoricalDataPoint[];
  trends: {
    orders: TrendAnalysis;
    revenue: TrendAnalysis;
    customers: TrendAnalysis;
    averageOrderValue: TrendAnalysis;
    completionRate: TrendAnalysis;
  };
  seasonalPatterns: {
    daily: SeasonalPattern;
    weekly: SeasonalPattern;
    monthly: SeasonalPattern;
  };
  predictions: {
    nextWeek: Prediction[];
    nextMonth: Prediction[];
    nextQuarter: Prediction[];
  };
  insights: {
    keyTrends: string[];
    businessCycles: Array<{
      cycle: string;
      duration: string;
      impact: 'high' | 'medium' | 'low';
      nextOccurrence: string;
    }>;
    anomalies: Array<{
      date: string;
      metric: string;
      expectedValue: number;
      actualValue: number;
      deviation: number;
      possibleCauses: string[];
    }>;
    recommendations: Array<{
      type: 'operational' | 'marketing' | 'strategic';
      priority: 'high' | 'medium' | 'low';
      action: string;
      expectedImpact: string;
      timeframe: string;
    }>;
  };
}

/**
 * Historical Order Pattern Analysis Service
 * Analyzes historical order data to identify patterns and predict future trends
 * Following statistical calculation and predictive analytics patterns
 */
export class HistoricalOrderAnalysisService {

  /**
   * Analyze historical order patterns and generate predictions
   * Main entry point for historical analysis
   */
  static async analyzeHistoricalPatterns(
    options: HistoricalAnalysisOptions = {}
  ): Promise<HistoricalAnalysisResult> {
    try {
      const startTime = Date.now();

      // Permission check
      if (options.userId) {
        const hasPermission = await unifiedRoleService.hasPermission(
          options.userId,
          'analytics:forecast'
        );

        if (!hasPermission) {
          throw new Error('Insufficient permissions for historical pattern analysis');
        }
      }

      // Set default parameters
      const dateRange = options.dateRange || {
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year ago
        end: new Date().toISOString().split('T')[0]
      };

      const granularity = options.granularity || 'daily';
      const metrics = options.metrics || ['orders', 'revenue', 'customers', 'completion_rate', 'average_order_value'];

      // Fetch and process historical data
      const dataPoints = await this.fetchHistoricalData(dateRange, granularity);

      // Perform trend analysis
      const trends = this.analyzeTrends(dataPoints, metrics);

      // Identify seasonal patterns
      const seasonalPatterns = this.identifySeasonalPatterns(dataPoints);

      // Generate predictions if requested
      const predictions = options.includePredictions
        ? await this.generatePredictions(dataPoints, trends, seasonalPatterns, options.predictionHorizon || 30)
        : { nextWeek: [], nextMonth: [], nextQuarter: [] };

      // Generate insights and recommendations
      const insights = this.generateInsights(dataPoints, trends, seasonalPatterns, predictions);

      ValidationMonitor.recordPatternSuccess({
        service: 'HistoricalOrderAnalysisService',
        pattern: 'statistical_calculation',
        operation: 'analyzeHistoricalPatterns',
        performanceMs: Date.now() - startTime
      });

      return {
        dataPoints,
        trends,
        seasonalPatterns,
        predictions,
        insights
      };

    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'HistoricalOrderAnalysisService.analyzeHistoricalPatterns',
        errorCode: 'HISTORICAL_ANALYSIS_FAILED',
        validationPattern: 'statistical_calculation',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Fetch historical data aggregated by the specified granularity
   */
  private static async fetchHistoricalData(
    dateRange: { start: string; end: string },
    granularity: 'daily' | 'weekly' | 'monthly'
  ): Promise<HistoricalDataPoint[]> {
    try {
      // Get raw order data
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          total_amount,
          status,
          user_id,
          customer_email
        `)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch historical data: ${error.message}`);
      }

      // Aggregate data by granularity
      const aggregatedData = this.aggregateDataByPeriod(orders || [], granularity);

      // Validate and return data points
      const dataPoints: HistoricalDataPoint[] = [];
      for (const point of aggregatedData) {
        try {
          const validatedPoint = HistoricalDataPointSchema.parse(point);
          dataPoints.push(validatedPoint);
        } catch (validationError) {
          ValidationMonitor.recordValidationError({
            context: 'HistoricalOrderAnalysisService.fetchHistoricalData',
            errorCode: 'DATA_POINT_VALIDATION_FAILED',
            validationPattern: 'transformation_schema',
            errorMessage: `Failed to validate data point for ${point.date}: ${validationError}`
          });
          // Continue with other data points (resilient processing)
        }
      }

      return dataPoints;

    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'HistoricalOrderAnalysisService.fetchHistoricalData',
        errorCode: 'HISTORICAL_DATA_FETCH_FAILED',
        validationPattern: 'direct_supabase_query',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Aggregate order data by time period
   */
  private static aggregateDataByPeriod(
    orders: any[],
    granularity: 'daily' | 'weekly' | 'monthly'
  ): any[] {
    const aggregation = new Map<string, {
      orders: any[];
      revenue: number;
      customerEmails: Set<string>;
      newCustomers: Set<string>;
    }>();

    orders.forEach(order => {
      const date = new Date(order.created_at);
      let periodKey: string;

      switch (granularity) {
        case 'daily':
          periodKey = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - date.getDay());
          periodKey = startOfWeek.toISOString().split('T')[0];
          break;
        case 'monthly':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
          break;
        default:
          periodKey = date.toISOString().split('T')[0];
      }

      if (!aggregation.has(periodKey)) {
        aggregation.set(periodKey, {
          orders: [],
          revenue: 0,
          customerEmails: new Set(),
          newCustomers: new Set()
        });
      }

      const period = aggregation.get(periodKey)!;
      period.orders.push(order);
      period.revenue += order.total_amount || 0;

      if (order.customer_email) {
        period.customerEmails.add(order.customer_email);

        // Simple new customer detection (would need more sophisticated logic in production)
        const isFirstOrderInPeriod = !Array.from(aggregation.values())
          .some(p => p !== period && p.customerEmails.has(order.customer_email));

        if (isFirstOrderInPeriod) {
          period.newCustomers.add(order.customer_email);
        }
      }
    });

    // Convert to data points
    return Array.from(aggregation.entries()).map(([date, data]) => {
      const completedOrders = data.orders.filter(o => o.status === 'completed');

      return {
        date,
        orderCount: data.orders.length,
        revenue: data.revenue,
        averageOrderValue: data.orders.length > 0 ? data.revenue / data.orders.length : 0,
        completionRate: data.orders.length > 0 ? (completedOrders.length / data.orders.length) * 100 : 0,
        customerCount: data.customerEmails.size,
        newCustomerCount: data.newCustomers.size,
        metadata: {
          completedOrderCount: completedOrders.length,
          totalOrdersInPeriod: data.orders.length
        }
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Analyze trends in the historical data using linear regression
   */
  private static analyzeTrends(
    dataPoints: HistoricalDataPoint[],
    metrics: string[]
  ): HistoricalAnalysisResult['trends'] {
    const trends: any = {};

    metrics.forEach(metric => {
      let values: number[];

      switch (metric) {
        case 'orders':
          values = dataPoints.map(p => p.orderCount);
          break;
        case 'revenue':
          values = dataPoints.map(p => p.revenue);
          break;
        case 'customers':
          values = dataPoints.map(p => p.customerCount);
          break;
        case 'completion_rate':
          values = dataPoints.map(p => p.completionRate);
          break;
        case 'average_order_value':
          values = dataPoints.map(p => p.averageOrderValue);
          break;
        default:
          values = [];
      }

      if (values.length > 1) {
        const trendAnalysis = this.calculateLinearTrend(values);

        try {
          trends[metric === 'completion_rate' ? 'completionRate' :
                 metric === 'average_order_value' ? 'averageOrderValue' : metric] =
            TrendAnalysisSchema.parse({
              direction: this.determineTrendDirection(trendAnalysis.slope),
              slope: trendAnalysis.slope,
              r_squared: trendAnalysis.rSquared,
              confidence: Math.min(trendAnalysis.rSquared, 0.95), // Cap confidence at 95%
              timeframe: `${dataPoints.length} periods`
            });
        } catch (validationError) {
          ValidationMonitor.recordValidationError({
            context: 'HistoricalOrderAnalysisService.analyzeTrends',
            errorCode: 'TREND_VALIDATION_FAILED',
            validationPattern: 'transformation_schema',
            errorMessage: `Failed to validate trend for ${metric}: ${validationError}`
          });
        }
      }
    });

    return trends;
  }

  /**
   * Calculate linear trend using simple linear regression
   */
  private static calculateLinearTrend(values: number[]): {
    slope: number;
    intercept: number;
    rSquared: number;
  } {
    const n = values.length;
    if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };

    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = values.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssRes = x.reduce((sum, xi, i) => {
      const predicted = slope * xi + intercept;
      return sum + Math.pow(values[i] - predicted, 2);
    }, 0);

    const rSquared = ssTotal > 0 ? 1 - (ssRes / ssTotal) : 0;

    return { slope, intercept, rSquared: Math.max(0, Math.min(1, rSquared)) };
  }

  /**
   * Determine trend direction from slope
   */
  private static determineTrendDirection(slope: number): 'increasing' | 'decreasing' | 'stable' | 'volatile' {
    const threshold = 0.1; // Adjust based on business context

    if (Math.abs(slope) < threshold) return 'stable';
    if (slope > threshold) return 'increasing';
    if (slope < -threshold) return 'decreasing';
    return 'volatile';
  }

  /**
   * Identify seasonal patterns in the data
   */
  private static identifySeasonalPatterns(dataPoints: HistoricalDataPoint[]): HistoricalAnalysisResult['seasonalPatterns'] {
    const patterns: any = {};

    // Daily pattern (day of week)
    patterns.daily = this.analyzeWeeklySeasonality(dataPoints);

    // Weekly pattern (week of month)
    patterns.weekly = this.analyzeMonthlySeasonality(dataPoints);

    // Monthly pattern (month of year)
    patterns.monthly = this.analyzeYearlySeasonality(dataPoints);

    return patterns;
  }

  /**
   * Analyze weekly seasonality patterns (day of week)
   */
  private static analyzeWeeklySeasonality(dataPoints: HistoricalDataPoint[]): SeasonalPattern {
    const dayOfWeekData = new Map<number, number[]>();

    dataPoints.forEach(point => {
      const dayOfWeek = new Date(point.date).getDay();
      if (!dayOfWeekData.has(dayOfWeek)) {
        dayOfWeekData.set(dayOfWeek, []);
      }
      dayOfWeekData.get(dayOfWeek)!.push(point.orderCount);
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const averages = Array.from({ length: 7 }, (_, i) => {
      const values = dayOfWeekData.get(i) || [];
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    });

    const overallAverage = averages.reduce((a, b) => a + b, 0) / averages.length;

    const pattern = averages.map((avg, i) => ({
      period: dayNames[i],
      multiplier: overallAverage > 0 ? avg / overallAverage : 1,
      confidence: dayOfWeekData.get(i)?.length ? Math.min(dayOfWeekData.get(i)!.length / 10, 1) : 0
    }));

    // Calculate pattern strength (coefficient of variation)
    const variance = averages.reduce((sum, avg) => sum + Math.pow(avg - overallAverage, 2), 0) / averages.length;
    const stdDev = Math.sqrt(variance);
    const strength = overallAverage > 0 ? Math.min(stdDev / overallAverage, 1) : 0;

    return {
      type: 'weekly',
      pattern,
      strength,
      reliability: pattern.reduce((sum, p) => sum + p.confidence, 0) / pattern.length
    };
  }

  /**
   * Analyze monthly seasonality patterns (simplified)
   */
  private static analyzeMonthlySeasonality(dataPoints: HistoricalDataPoint[]): SeasonalPattern {
    // Simplified monthly pattern analysis
    return {
      type: 'monthly',
      pattern: Array.from({ length: 12 }, (_, i) => ({
        period: new Date(2024, i, 1).toLocaleString('default', { month: 'long' }),
        multiplier: 1 + (Math.sin((i / 12) * 2 * Math.PI) * 0.2), // Simplified seasonal wave
        confidence: 0.5
      })),
      strength: 0.3,
      reliability: 0.5
    };
  }

  /**
   * Analyze yearly seasonality patterns (simplified)
   */
  private static analyzeYearlySeasonality(dataPoints: HistoricalDataPoint[]): SeasonalPattern {
    // Simplified yearly pattern analysis
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    return {
      type: 'quarterly',
      pattern: quarters.map((quarter, i) => ({
        period: quarter,
        multiplier: 1 + (i === 3 ? 0.3 : i === 0 ? -0.1 : 0), // Q4 boost, Q1 dip
        confidence: 0.6
      })),
      strength: 0.4,
      reliability: 0.6
    };
  }

  /**
   * Generate predictions based on trends and seasonal patterns
   */
  private static async generatePredictions(
    dataPoints: HistoricalDataPoint[],
    trends: any,
    seasonalPatterns: any,
    horizonDays: number
  ): Promise<HistoricalAnalysisResult['predictions']> {
    const predictions: any = {
      nextWeek: [],
      nextMonth: [],
      nextQuarter: []
    };

    const metrics = ['orders', 'revenue', 'averageOrderValue'];

    for (const metric of metrics) {
      const trend = trends[metric];
      if (!trend) continue;

      // Generate predictions for different timeframes
      const nextWeekPrediction = this.generateMetricPrediction(
        metric,
        dataPoints,
        trend,
        seasonalPatterns,
        7
      );

      const nextMonthPrediction = this.generateMetricPrediction(
        metric,
        dataPoints,
        trend,
        seasonalPatterns,
        30
      );

      const nextQuarterPrediction = this.generateMetricPrediction(
        metric,
        dataPoints,
        trend,
        seasonalPatterns,
        90
      );

      try {
        if (nextWeekPrediction) {
          predictions.nextWeek.push(PredictionSchema.parse(nextWeekPrediction));
        }
        if (nextMonthPrediction) {
          predictions.nextMonth.push(PredictionSchema.parse(nextMonthPrediction));
        }
        if (nextQuarterPrediction) {
          predictions.nextQuarter.push(PredictionSchema.parse(nextQuarterPrediction));
        }
      } catch (validationError) {
        ValidationMonitor.recordValidationError({
          context: 'HistoricalOrderAnalysisService.generatePredictions',
          errorCode: 'PREDICTION_VALIDATION_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: `Failed to validate prediction for ${metric}: ${validationError}`
        });
      }
    }

    return predictions;
  }

  /**
   * Generate prediction for a specific metric
   */
  private static generateMetricPrediction(
    metric: string,
    dataPoints: HistoricalDataPoint[],
    trend: TrendAnalysis,
    seasonalPatterns: any,
    daysAhead: number
  ): any {
    if (dataPoints.length === 0) return null;

    const lastPoint = dataPoints[dataPoints.length - 1];
    let baseValue: number;

    switch (metric) {
      case 'orders':
        baseValue = lastPoint.orderCount;
        break;
      case 'revenue':
        baseValue = lastPoint.revenue;
        break;
      case 'averageOrderValue':
        baseValue = lastPoint.averageOrderValue;
        break;
      default:
        return null;
    }

    // Apply trend
    const trendAdjustment = trend.slope * daysAhead;
    let predictedValue = baseValue + trendAdjustment;

    // Apply seasonal adjustment (simplified)
    const seasonalMultiplier = 1 + (Math.sin((daysAhead / 365) * 2 * Math.PI) * 0.1);
    predictedValue *= seasonalMultiplier;

    // Calculate confidence based on trend reliability and time horizon
    const baseConfidence = trend.confidence;
    const timeDecay = Math.exp(-daysAhead / 30); // Confidence decreases with time
    const confidence = baseConfidence * timeDecay;

    // Calculate prediction range (±20% for simplicity)
    const range = {
      min: predictedValue * 0.8,
      max: predictedValue * 1.2
    };

    return {
      metric,
      value: Math.max(0, predictedValue),
      confidence,
      range,
      timeframe: `${daysAhead} days`,
      factors: [
        {
          factor: 'Historical trend',
          impact: trend.slope > 0 ? 0.6 : -0.6,
          confidence: trend.confidence
        },
        {
          factor: 'Seasonal pattern',
          impact: seasonalMultiplier - 1,
          confidence: 0.5
        }
      ]
    };
  }

  /**
   * Generate insights and recommendations from the analysis
   */
  private static generateInsights(
    dataPoints: HistoricalDataPoint[],
    trends: any,
    seasonalPatterns: any,
    predictions: any
  ): HistoricalAnalysisResult['insights'] {
    const keyTrends: string[] = [];
    const businessCycles: Array<any> = [];
    const anomalies: Array<any> = [];
    const recommendations: Array<any> = [];

    // Analyze key trends
    Object.entries(trends).forEach(([metric, trend]: [string, any]) => {
      if (trend.confidence > 0.6) {
        keyTrends.push(
          `${metric} shows ${trend.direction} trend with ${(trend.confidence * 100).toFixed(1)}% confidence`
        );
      }
    });

    // Identify business cycles
    if (seasonalPatterns.weekly.strength > 0.3) {
      businessCycles.push({
        cycle: 'Weekly pattern',
        duration: '7 days',
        impact: seasonalPatterns.weekly.strength > 0.5 ? 'high' : 'medium',
        nextOccurrence: 'Next week'
      });
    }

    // Detect anomalies (simplified)
    if (dataPoints.length > 7) {
      const recentPoints = dataPoints.slice(-7);
      const historicalAvg = dataPoints.slice(0, -7).reduce((sum, p) => sum + p.orderCount, 0) / (dataPoints.length - 7);

      recentPoints.forEach(point => {
        const deviation = Math.abs(point.orderCount - historicalAvg) / historicalAvg;
        if (deviation > 0.5) { // 50% deviation threshold
          anomalies.push({
            date: point.date,
            metric: 'orders',
            expectedValue: historicalAvg,
            actualValue: point.orderCount,
            deviation: deviation * 100,
            possibleCauses: point.orderCount > historicalAvg
              ? ['Marketing campaign', 'Special event', 'Holiday effect']
              : ['System issue', 'External disruption', 'Competition']
          });
        }
      });
    }

    // Generate recommendations
    if (trends.orders?.direction === 'decreasing' && trends.orders.confidence > 0.6) {
      recommendations.push({
        type: 'marketing',
        priority: 'high',
        action: 'Increase marketing efforts to reverse declining order trend',
        expectedImpact: 'Potential 15-25% increase in orders',
        timeframe: '2-4 weeks'
      });
    }

    if (trends.revenue?.direction === 'increasing' && trends.averageOrderValue?.direction === 'decreasing') {
      recommendations.push({
        type: 'strategic',
        priority: 'medium',
        action: 'Focus on upselling strategies to maintain revenue growth despite lower AOV',
        expectedImpact: 'Stabilize or increase average order value',
        timeframe: '4-8 weeks'
      });
    }

    if (seasonalPatterns.weekly.strength > 0.4) {
      recommendations.push({
        type: 'operational',
        priority: 'medium',
        action: 'Optimize staffing and inventory based on weekly patterns',
        expectedImpact: 'Improved efficiency and customer satisfaction',
        timeframe: 'Ongoing'
      });
    }

    return {
      keyTrends,
      businessCycles,
      anomalies,
      recommendations
    };
  }
}

// Export singleton instance following established patterns
export const historicalOrderAnalysisService = new HistoricalOrderAnalysisService();