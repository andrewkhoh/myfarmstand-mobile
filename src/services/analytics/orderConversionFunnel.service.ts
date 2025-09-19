// Order Lifecycle Conversion Funnel Service
// Following @docs/architectural-patterns-and-best-practices.md patterns
// Pattern: Database-first validation + resilient processing + monitoring

import { supabase } from '../../config/supabase';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { unifiedRoleService } from '../unifiedRoleService';
import { z } from 'zod';

// Validation schemas for funnel data
const OrderLifecycleStageSchema = z.object({
  stage: z.enum(['created', 'payment_processing', 'confirmed', 'preparing', 'ready', 'picked_up', 'completed', 'cancelled']),
  timestamp: z.string().datetime(),
  duration: z.number().optional(), // milliseconds to reach this stage
  metadata: z.record(z.any()).optional()
});

const OrderFunnelDataSchema = z.object({
  orderId: z.string(),
  customerId: z.string().nullable(),
  customerEmail: z.string(),
  orderValue: z.number(),
  createdAt: z.string().datetime(),
  currentStage: z.string(),
  lifecycle: z.array(OrderLifecycleStageSchema),
  conversionMetrics: z.object({
    timeToCompletion: z.number().nullable(), // total time in milliseconds
    stageCompletionTimes: z.record(z.number()),
    dropoffStage: z.string().nullable(),
    isCompleted: z.boolean(),
    isCancelled: z.boolean()
  })
});

export type OrderLifecycleStage = z.infer<typeof OrderLifecycleStageSchema>;
export type OrderFunnelData = z.infer<typeof OrderFunnelDataSchema>;

export interface ConversionFunnelMetrics {
  totalOrders: number;
  completionRate: number;
  averageTimeToCompletion: number; // in hours
  stageConversionRates: Record<string, {
    entered: number;
    completed: number;
    conversionRate: number;
    averageTime: number; // in minutes
    dropoffCount: number;
  }>;
  bottlenecks: Array<{
    stage: string;
    dropoffRate: number;
    averageStuckTime: number;
    recommendations: string[];
  }>;
  customerSegmentAnalysis: Record<string, {
    totalOrders: number;
    completionRate: number;
    averageOrderValue: number;
    averageTimeToCompletion: number;
  }>;
}

export interface ConversionFunnelOptions {
  dateRange?: {
    start: string;
    end: string;
  };
  customerSegment?: 'new' | 'returning' | 'premium' | 'all';
  orderValueRange?: {
    min: number;
    max: number;
  };
  includeDropoffs?: boolean;
  userId?: string;
}

/**
 * Order Conversion Funnel Service
 * Analyzes complete customer journey from order creation to completion
 * Following resilient processing and monitoring patterns
 */
export class OrderConversionFunnelService {

  /**
   * Analyze order lifecycle conversion funnel
   * Main entry point for funnel analysis
   */
  static async analyzeConversionFunnel(
    options: ConversionFunnelOptions = {}
  ): Promise<{
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
  }> {
    try {
      const startTime = Date.now();

      // Permission check
      if (options.userId) {
        const hasPermission = await unifiedRoleService.hasPermission(
          options.userId,
          'orders:analyze'
        );

        if (!hasPermission) {
          throw new Error('Insufficient permissions for order funnel analysis');
        }
      }

      // Set default date range if not provided
      const dateRange = options.dateRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      };

      // Fetch order data with resilient processing
      const orders = await this.fetchOrderFunnelData(dateRange, options);

      // Calculate funnel metrics
      const metrics = this.calculateFunnelMetrics(orders);

      // Generate insights and recommendations
      const insights = this.generateFunnelInsights(orders, metrics);

      ValidationMonitor.recordPatternSuccess({
        service: 'OrderConversionFunnelService',
        pattern: 'resilient_processing',
        operation: 'analyzeConversionFunnel',
        performanceMs: Date.now() - startTime
      });

      return {
        orders,
        metrics,
        insights
      };

    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'OrderConversionFunnelService.analyzeConversionFunnel',
        errorCode: 'FUNNEL_ANALYSIS_FAILED',
        validationPattern: 'resilient_processing',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Fetch and process order funnel data with resilient error handling
   * Following skip-on-error pattern for individual order processing
   */
  private static async fetchOrderFunnelData(
    dateRange: { start: string; end: string },
    options: ConversionFunnelOptions
  ): Promise<OrderFunnelData[]> {
    // Build query with conditional filters
    let query = supabase
      .from('orders')
      .select(`
        id,
        created_at,
        updated_at,
        customer_email,
        customer_name,
        user_id,
        total_amount,
        status,
        payment_status,
        pickup_date,
        pickup_time,
        order_items (
          id,
          product_id,
          quantity,
          total_price
        ),
        pickup_reschedule_log (
          id,
          created_at,
          request_status,
          reason
        )
      `)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)
      .order('created_at', { ascending: false });

    // Apply order value filter if specified
    if (options.orderValueRange) {
      query = query
        .gte('total_amount', options.orderValueRange.min)
        .lte('total_amount', options.orderValueRange.max);
    }

    const { data: rawOrders, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch order data: ${error.message}`);
    }

    const processedOrders: OrderFunnelData[] = [];
    let successCount = 0;
    let skipCount = 0;

    // Process each order with resilient error handling
    for (const rawOrder of rawOrders || []) {
      try {
        // Determine customer segment if filtering is required
        if (options.customerSegment && options.customerSegment !== 'all') {
          const customerSegment = await this.determineCustomerSegment(rawOrder);
          if (customerSegment !== options.customerSegment) {
            continue; // Skip orders that don't match segment filter
          }
        }

        // Build order lifecycle stages
        const lifecycle = await this.buildOrderLifecycle(rawOrder);

        // Calculate conversion metrics
        const conversionMetrics = this.calculateOrderConversionMetrics(lifecycle, rawOrder);

        // Validate and create order funnel data
        const orderFunnelData: OrderFunnelData = {
          orderId: rawOrder.id,
          customerId: rawOrder.user_id,
          customerEmail: rawOrder.customer_email,
          orderValue: rawOrder.total_amount || 0,
          createdAt: rawOrder.created_at,
          currentStage: rawOrder.status || 'unknown',
          lifecycle,
          conversionMetrics
        };

        // Validate with schema
        const validatedOrder = OrderFunnelDataSchema.parse(orderFunnelData);
        processedOrders.push(validatedOrder);
        successCount++;

      } catch (error) {
        ValidationMonitor.recordValidationError({
          context: 'OrderConversionFunnelService.fetchOrderFunnelData',
          errorCode: 'ORDER_PROCESSING_FAILED',
          validationPattern: 'resilient_processing',
          errorMessage: `Failed to process order ${rawOrder.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        skipCount++;
        // Continue processing other orders (skip-on-error pattern)
      }
    }

    ValidationMonitor.recordPatternSuccess({
      service: 'OrderConversionFunnelService',
      pattern: 'resilient_processing',
      operation: 'fetchOrderFunnelData',
      description: `Processed ${successCount} orders, skipped ${skipCount} due to errors`
    });

    return processedOrders;
  }

  /**
   * Build order lifecycle stages from order data and related logs
   */
  private static async buildOrderLifecycle(order: any): Promise<OrderLifecycleStage[]> {
    const lifecycle: OrderLifecycleStage[] = [];

    // Always start with order creation
    lifecycle.push({
      stage: 'created',
      timestamp: order.created_at,
      duration: 0,
      metadata: {
        orderValue: order.total_amount,
        itemCount: order.order_items?.length || 0
      }
    });

    // Infer stages based on order status and timestamps
    const createdTime = new Date(order.created_at).getTime();

    // Payment processing stage (inferred)
    if (order.payment_status && order.payment_status !== 'pending') {
      lifecycle.push({
        stage: 'payment_processing',
        timestamp: new Date(createdTime + 5 * 60 * 1000).toISOString(), // Estimated 5 min
        duration: 5 * 60 * 1000,
        metadata: {
          paymentStatus: order.payment_status
        }
      });
    }

    // Order confirmation stage
    if (order.status !== 'pending') {
      lifecycle.push({
        stage: 'confirmed',
        timestamp: new Date(createdTime + 10 * 60 * 1000).toISOString(), // Estimated 10 min
        duration: 10 * 60 * 1000,
        metadata: {
          status: order.status
        }
      });
    }

    // Preparing stage
    if (['processing', 'ready', 'completed'].includes(order.status)) {
      lifecycle.push({
        stage: 'preparing',
        timestamp: new Date(createdTime + 30 * 60 * 1000).toISOString(), // Estimated 30 min
        duration: 30 * 60 * 1000,
        metadata: {
          status: order.status
        }
      });
    }

    // Ready for pickup stage
    if (['ready', 'completed'].includes(order.status)) {
      lifecycle.push({
        stage: 'ready',
        timestamp: new Date(createdTime + 60 * 60 * 1000).toISOString(), // Estimated 1 hour
        duration: 60 * 60 * 1000,
        metadata: {
          pickupDate: order.pickup_date,
          pickupTime: order.pickup_time,
          rescheduleCount: order.pickup_reschedule_log?.length || 0
        }
      });
    }

    // Picked up stage (inferred from completed status)
    if (order.status === 'completed') {
      lifecycle.push({
        stage: 'picked_up',
        timestamp: new Date(createdTime + 90 * 60 * 1000).toISOString(), // Estimated 1.5 hours
        duration: 90 * 60 * 1000,
        metadata: {
          finalStatus: 'completed'
        }
      });

      // Completed stage
      lifecycle.push({
        stage: 'completed',
        timestamp: order.updated_at || new Date(createdTime + 95 * 60 * 1000).toISOString(),
        duration: new Date(order.updated_at || createdTime + 95 * 60 * 1000).getTime() - createdTime,
        metadata: {
          totalDuration: new Date(order.updated_at || createdTime + 95 * 60 * 1000).getTime() - createdTime
        }
      });
    }

    // Handle cancellation
    if (order.status === 'cancelled') {
      lifecycle.push({
        stage: 'cancelled',
        timestamp: order.updated_at || new Date().toISOString(),
        duration: new Date(order.updated_at || Date.now()).getTime() - createdTime,
        metadata: {
          reason: 'Order cancelled'
        }
      });
    }

    return lifecycle;
  }

  /**
   * Calculate conversion metrics for a single order
   */
  private static calculateOrderConversionMetrics(
    lifecycle: OrderLifecycleStage[],
    order: any
  ): OrderFunnelData['conversionMetrics'] {
    const isCompleted = lifecycle.some(stage => stage.stage === 'completed');
    const isCancelled = lifecycle.some(stage => stage.stage === 'cancelled');

    const timeToCompletion = isCompleted
      ? lifecycle[lifecycle.length - 1].duration || null
      : null;

    const stageCompletionTimes: Record<string, number> = {};
    lifecycle.forEach(stage => {
      if (stage.duration !== undefined) {
        stageCompletionTimes[stage.stage] = stage.duration;
      }
    });

    const dropoffStage = !isCompleted && !isCancelled
      ? lifecycle[lifecycle.length - 1].stage
      : null;

    return {
      timeToCompletion,
      stageCompletionTimes,
      dropoffStage,
      isCompleted,
      isCancelled
    };
  }

  /**
   * Calculate overall funnel metrics from processed orders
   */
  private static calculateFunnelMetrics(orders: OrderFunnelData[]): ConversionFunnelMetrics {
    if (orders.length === 0) {
      return {
        totalOrders: 0,
        completionRate: 0,
        averageTimeToCompletion: 0,
        stageConversionRates: {},
        bottlenecks: [],
        customerSegmentAnalysis: {}
      };
    }

    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.conversionMetrics.isCompleted);
    const completionRate = (completedOrders.length / totalOrders) * 100;

    // Calculate average time to completion (in hours)
    const averageTimeToCompletion = completedOrders.length > 0
      ? completedOrders.reduce((sum, o) => sum + (o.conversionMetrics.timeToCompletion || 0), 0)
        / completedOrders.length / (1000 * 60 * 60) // Convert ms to hours
      : 0;

    // Calculate stage conversion rates
    const stageStats = new Map<string, {
      entered: number;
      completed: number;
      totalTime: number;
      dropoffs: number;
    }>();

    orders.forEach(order => {
      order.lifecycle.forEach((stage, index) => {
        if (!stageStats.has(stage.stage)) {
          stageStats.set(stage.stage, {
            entered: 0,
            completed: 0,
            totalTime: 0,
            dropoffs: 0
          });
        }

        const stats = stageStats.get(stage.stage)!;
        stats.entered++;

        // Consider stage completed if not the last stage or order is completed
        if (index < order.lifecycle.length - 1 || order.conversionMetrics.isCompleted) {
          stats.completed++;
        } else if (!order.conversionMetrics.isCompleted && !order.conversionMetrics.isCancelled) {
          stats.dropoffs++;
        }

        if (stage.duration) {
          stats.totalTime += stage.duration;
        }
      });
    });

    const stageConversionRates: Record<string, any> = {};
    for (const [stage, stats] of Array.from(stageStats.entries())) {
      stageConversionRates[stage] = {
        entered: stats.entered,
        completed: stats.completed,
        conversionRate: stats.entered > 0 ? (stats.completed / stats.entered) * 100 : 0,
        averageTime: stats.completed > 0 ? (stats.totalTime / stats.completed) / (1000 * 60) : 0, // minutes
        dropoffCount: stats.dropoffs
      };
    }

    // Identify bottlenecks
    const bottlenecks = Array.from(stageStats.entries())
      .map(([stage, stats]) => ({
        stage,
        dropoffRate: stats.entered > 0 ? (stats.dropoffs / stats.entered) * 100 : 0,
        averageStuckTime: stats.dropoffs > 0 ? (stats.totalTime / stats.dropoffs) / (1000 * 60) : 0,
        recommendations: this.generateStageRecommendations(stage, stats)
      }))
      .filter(b => b.dropoffRate > 15) // Only consider stages with >15% dropoff
      .sort((a, b) => b.dropoffRate - a.dropoffRate);

    // Customer segment analysis
    const customerSegmentAnalysis = this.analyzeCustomerSegments(orders);

    return {
      totalOrders,
      completionRate,
      averageTimeToCompletion,
      stageConversionRates,
      bottlenecks,
      customerSegmentAnalysis
    };
  }

  /**
   * Generate stage-specific recommendations
   */
  private static generateStageRecommendations(stage: string, stats: any): string[] {
    const recommendations: string[] = [];

    switch (stage) {
      case 'payment_processing':
        if (stats.dropoffs > 5) {
          recommendations.push('Review payment gateway reliability');
          recommendations.push('Add multiple payment method options');
        }
        break;
      case 'preparing':
        if (stats.averageTime > 60) { // More than 1 hour
          recommendations.push('Optimize kitchen workflow and capacity');
          recommendations.push('Implement better order batching');
        }
        break;
      case 'ready':
        if (stats.dropoffs > 3) {
          recommendations.push('Improve pickup notification system');
          recommendations.push('Offer more flexible pickup windows');
        }
        break;
      default:
        if (stats.dropoffs > 0) {
          recommendations.push(`Review ${stage} process for optimization opportunities`);
        }
    }

    return recommendations;
  }

  /**
   * Analyze customer segments performance
   */
  private static analyzeCustomerSegments(orders: OrderFunnelData[]): Record<string, any> {
    const segments = ['new', 'returning', 'premium'];
    const analysis: Record<string, any> = {};

    segments.forEach(segment => {
      const segmentOrders = orders.filter(async order => {
        // This is simplified - in reality you'd check customer history
        return true; // Placeholder for actual segment determination
      });

      const completed = segmentOrders.filter(o => o.conversionMetrics.isCompleted);

      analysis[segment] = {
        totalOrders: segmentOrders.length,
        completionRate: segmentOrders.length > 0 ? (completed.length / segmentOrders.length) * 100 : 0,
        averageOrderValue: segmentOrders.length > 0
          ? segmentOrders.reduce((sum, o) => sum + o.orderValue, 0) / segmentOrders.length
          : 0,
        averageTimeToCompletion: completed.length > 0
          ? completed.reduce((sum, o) => sum + (o.conversionMetrics.timeToCompletion || 0), 0)
            / completed.length / (1000 * 60 * 60) // Convert to hours
          : 0
      };
    });

    return analysis;
  }

  /**
   * Determine customer segment based on order history
   */
  private static async determineCustomerSegment(order: any): Promise<'new' | 'returning' | 'premium'> {
    if (!order.user_id) return 'new';

    try {
      const { data: customerOrders } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('user_id', order.user_id)
        .neq('id', order.id);

      if (!customerOrders?.length) return 'new';

      const totalSpent = customerOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      if (totalSpent > 500) return 'premium';
      return 'returning';

    } catch {
      return 'new'; // Default to new on error
    }
  }

  /**
   * Generate actionable insights from funnel analysis
   */
  private static generateFunnelInsights(
    orders: OrderFunnelData[],
    metrics: ConversionFunnelMetrics
  ): {
    criticalBottlenecks: string[];
    optimizationOpportunities: Array<{
      stage: string;
      impact: 'high' | 'medium' | 'low';
      recommendation: string;
      estimatedImprovement: string;
    }>;
    customerBehaviorPatterns: string[];
  } {
    const criticalBottlenecks: string[] = [];
    const optimizationOpportunities: Array<any> = [];
    const customerBehaviorPatterns: string[] = [];

    // Identify critical bottlenecks (>25% dropoff)
    metrics.bottlenecks.forEach(bottleneck => {
      if (bottleneck.dropoffRate > 25) {
        criticalBottlenecks.push(
          `${bottleneck.stage} stage has ${bottleneck.dropoffRate.toFixed(1)}% dropoff rate`
        );
      }
    });

    // Generate optimization opportunities
    if (metrics.completionRate < 80) {
      optimizationOpportunities.push({
        stage: 'overall',
        impact: 'high' as const,
        recommendation: 'Focus on improving overall completion rate through customer journey optimization',
        estimatedImprovement: `Could increase completion rate by ${(85 - metrics.completionRate).toFixed(1)}%`
      });
    }

    if (metrics.averageTimeToCompletion > 2) {
      optimizationOpportunities.push({
        stage: 'preparation',
        impact: 'medium' as const,
        recommendation: 'Reduce preparation time through process optimization',
        estimatedImprovement: 'Could reduce completion time by 30-45 minutes'
      });
    }

    // Analyze customer behavior patterns
    const abandonmentRate = ((orders.length - orders.filter(o => o.conversionMetrics.isCompleted).length) / orders.length) * 100;

    if (abandonmentRate > 20) {
      customerBehaviorPatterns.push(
        `High abandonment rate of ${abandonmentRate.toFixed(1)}% suggests need for better engagement`
      );
    }

    const averageOrderValue = orders.reduce((sum, o) => sum + o.orderValue, 0) / orders.length;
    if (averageOrderValue < 25) {
      customerBehaviorPatterns.push(
        'Low average order value indicates opportunity for upselling and bundling'
      );
    }

    return {
      criticalBottlenecks,
      optimizationOpportunities,
      customerBehaviorPatterns
    };
  }
}

// Export singleton instance following established patterns
export const orderConversionFunnelService = new OrderConversionFunnelService();