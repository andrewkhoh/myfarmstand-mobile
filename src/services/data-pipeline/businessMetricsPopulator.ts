/**
 * Business Metrics Data Pipeline
 * Populates business_metrics table with aggregated order data
 * Following @docs/architectural-patterns-and-best-practices.md
 */

import { supabase } from '../../config/supabase';
import { ValidationMonitor } from '../../utils/validationMonitor';

export interface BusinessMetricRecord {
  metric_date: string;
  metric_category: 'sales' | 'orders' | 'customers' | 'inventory' | 'operations';
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  aggregation_level: 'daily' | 'weekly' | 'monthly';
  source_data_type: 'orders' | 'inventory' | 'users' | 'calculated';
  correlation_factors?: any;
}

export class BusinessMetricsPopulator {
  /**
   * Main method to populate business_metrics table with order-derived data
   */
  static async populateFromOrders(options: {
    startDate?: string;
    endDate?: string;
    force?: boolean;
  } = {}): Promise<{ success: boolean; metricsCreated: number; errors: string[] }> {
    const startTime = Date.now();
    const errors: string[] = [];
    let metricsCreated = 0;

    try {
      const { startDate, endDate, force = false } = options;
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = endDate || new Date().toISOString().split('T')[0];

      console.log(`🔄 Starting business metrics population from ${start} to ${end}`);

      // Check if we need to clear existing data
      if (force) {
        await this.clearExistingMetrics(start, end);
      }

      // Generate daily order metrics
      const dailyMetrics = await this.generateDailyOrderMetrics(start, end);
      metricsCreated += dailyMetrics.length;

      // Generate weekly aggregates
      const weeklyMetrics = await this.generateWeeklyOrderMetrics(start, end);
      metricsCreated += weeklyMetrics.length;

      // Generate monthly aggregates
      const monthlyMetrics = await this.generateMonthlyOrderMetrics(start, end);
      metricsCreated += monthlyMetrics.length;

      // Insert all metrics
      const allMetrics = [...dailyMetrics, ...weeklyMetrics, ...monthlyMetrics];

      if (allMetrics.length > 0) {
        const { error: insertError } = await supabase
          .from('business_metrics')
          .insert(allMetrics);

        if (insertError) {
          errors.push(`Failed to insert metrics: ${insertError.message}`);
        }
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'BusinessMetricsPopulator',
        pattern: 'transformation_schema',
        operation: 'populateFromOrders',
        performanceMs: Date.now() - startTime
      });

      console.log(`✅ Successfully created ${metricsCreated} business metrics`);

      return {
        success: errors.length === 0,
        metricsCreated,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      ValidationMonitor.recordValidationError({
        context: 'BusinessMetricsPopulator.populateFromOrders',
        errorCode: 'METRICS_POPULATION_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage
      });

      return {
        success: false,
        metricsCreated,
        errors
      };
    }
  }

  /**
   * Generate daily order metrics
   */
  private static async generateDailyOrderMetrics(startDate: string, endDate: string): Promise<BusinessMetricRecord[]> {
    const metrics: BusinessMetricRecord[] = [];

    // Query daily order aggregates
    const { data: dailyOrders, error } = await supabase
      .from('orders')
      .select(`
        created_at,
        total_amount,
        status,
        user_id,
        pickup_time
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate + ' 23:59:59');

    if (error) {
      throw new Error(`Failed to query orders: ${error.message}`);
    }

    if (!dailyOrders || dailyOrders.length === 0) {
      console.log(`⚠️ No orders found between ${startDate} and ${endDate}`);
      return metrics;
    }

    // Group orders by date
    const ordersByDate = new Map<string, any[]>();
    dailyOrders.forEach(order => {
      const date = order.created_at.split('T')[0];
      if (!ordersByDate.has(date)) {
        ordersByDate.set(date, []);
      }
      ordersByDate.get(date)!.push(order);
    });

    // Generate metrics for each date
    for (const [date, orders] of Array.from(ordersByDate.entries())) {
      // Total orders
      metrics.push({
        metric_date: date,
        metric_category: 'orders',
        metric_name: 'total_orders',
        metric_value: orders.length,
        metric_unit: 'count',
        aggregation_level: 'daily',
        source_data_type: 'orders',
        correlation_factors: { order_count: orders.length }
      });

      // Total revenue
      const totalRevenue = orders.reduce((sum, order) => {
        const amount = typeof order.total_amount === 'number' ? order.total_amount : 0;
        return sum + amount;
      }, 0);
      metrics.push({
        metric_date: date,
        metric_category: 'sales',
        metric_name: 'total_revenue',
        metric_value: totalRevenue,
        metric_unit: 'currency',
        aggregation_level: 'daily',
        source_data_type: 'orders',
        correlation_factors: { order_count: orders.length, avg_order_value: totalRevenue / orders.length }
      });

      // Average order value
      if (orders.length > 0) {
        metrics.push({
          metric_date: date,
          metric_category: 'sales',
          metric_name: 'average_order_value',
          metric_value: totalRevenue / orders.length,
          metric_unit: 'currency',
          aggregation_level: 'daily',
          source_data_type: 'calculated',
          correlation_factors: { total_revenue: totalRevenue, order_count: orders.length }
        });
      }

      // Unique customers
      const uniqueCustomers = new Set(orders.map(o => o.user_id).filter(Boolean)).size;
      metrics.push({
        metric_date: date,
        metric_category: 'customers',
        metric_name: 'unique_customers',
        metric_value: uniqueCustomers,
        metric_unit: 'count',
        aggregation_level: 'daily',
        source_data_type: 'orders',
        correlation_factors: { order_count: orders.length, customer_order_ratio: orders.length / uniqueCustomers }
      });

      // Order status breakdown
      const statusBreakdown = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(statusBreakdown).forEach(([status, count]) => {
        const countValue = typeof count === 'number' ? count : 0;
        metrics.push({
          metric_date: date,
          metric_category: 'operations',
          metric_name: `orders_${status}`,
          metric_value: countValue,
          metric_unit: 'count',
          aggregation_level: 'daily',
          source_data_type: 'orders',
          correlation_factors: { total_orders: orders.length, status_percentage: (countValue / orders.length) * 100 }
        });
      });

      // Pickup scheduling metrics
      const ordersWithPickup = orders.filter(o => o.pickup_time);
      if (ordersWithPickup.length > 0) {
        metrics.push({
          metric_date: date,
          metric_category: 'operations',
          metric_name: 'orders_with_pickup',
          metric_value: ordersWithPickup.length,
          metric_unit: 'count',
          aggregation_level: 'daily',
          source_data_type: 'orders',
          correlation_factors: {
            total_orders: orders.length,
            pickup_percentage: (ordersWithPickup.length / orders.length) * 100
          }
        });
      }
    }

    console.log(`📊 Generated ${metrics.length} daily metrics for ${ordersByDate.size} days`);
    return metrics;
  }

  /**
   * Generate weekly order metrics
   */
  private static async generateWeeklyOrderMetrics(startDate: string, endDate: string): Promise<BusinessMetricRecord[]> {
    const metrics: BusinessMetricRecord[] = [];

    // Get weekly aggregates
    const { data: weeklyData, error } = await supabase
      .rpc('get_weekly_order_metrics', {
        start_date: startDate,
        end_date: endDate
      });

    if (error && !error.message.includes('function "get_weekly_order_metrics" does not exist')) {
      throw new Error(`Failed to get weekly metrics: ${error.message}`);
    }

    // If the function doesn't exist, calculate manually
    if (!weeklyData || error?.message.includes('does not exist')) {
      return this.calculateWeeklyMetricsManually(startDate, endDate);
    }

    // Process weekly data into metrics
    weeklyData.forEach((week: any) => {
      const weekStart = week.week_start;

      metrics.push(
        {
          metric_date: weekStart,
          metric_category: 'orders',
          metric_name: 'weekly_total_orders',
          metric_value: week.total_orders,
          metric_unit: 'count',
          aggregation_level: 'weekly',
          source_data_type: 'orders',
          correlation_factors: { week_end: week.week_end }
        },
        {
          metric_date: weekStart,
          metric_category: 'sales',
          metric_name: 'weekly_total_revenue',
          metric_value: week.total_revenue,
          metric_unit: 'currency',
          aggregation_level: 'weekly',
          source_data_type: 'orders',
          correlation_factors: {
            week_end: week.week_end,
            avg_daily_revenue: week.total_revenue / 7
          }
        }
      );
    });

    console.log(`📈 Generated ${metrics.length} weekly metrics`);
    return metrics;
  }

  /**
   * Generate monthly order metrics
   */
  private static async generateMonthlyOrderMetrics(startDate: string, endDate: string): Promise<BusinessMetricRecord[]> {
    const metrics: BusinessMetricRecord[] = [];

    // Calculate monthly aggregates manually
    const { data: monthlyOrders, error } = await supabase
      .from('orders')
      .select(`
        created_at,
        total_amount,
        status,
        user_id
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate + ' 23:59:59');

    if (error) {
      throw new Error(`Failed to query monthly orders: ${error.message}`);
    }

    if (!monthlyOrders || monthlyOrders.length === 0) {
      return metrics;
    }

    // Group by month
    const ordersByMonth = new Map<string, any[]>();
    monthlyOrders.forEach(order => {
      const month = order.created_at.substring(0, 7) + '-01'; // YYYY-MM-01
      if (!ordersByMonth.has(month)) {
        ordersByMonth.set(month, []);
      }
      ordersByMonth.get(month)!.push(order);
    });

    // Generate monthly metrics
    for (const [month, orders] of Array.from(ordersByMonth.entries())) {
      const totalRevenue = orders.reduce((sum, order) => {
        const amount = typeof order.total_amount === 'number' ? order.total_amount : 0;
        return sum + amount;
      }, 0);
      const uniqueCustomers = new Set(orders.map(o => o.user_id).filter(Boolean)).size;

      metrics.push(
        {
          metric_date: month,
          metric_category: 'orders',
          metric_name: 'monthly_total_orders',
          metric_value: orders.length,
          metric_unit: 'count',
          aggregation_level: 'monthly',
          source_data_type: 'orders',
          correlation_factors: {
            days_in_month: new Date(parseInt(month.substring(0, 4)), parseInt(month.substring(5, 7)) - 1, 0).getDate(),
            avg_daily_orders: orders.length / 30
          }
        },
        {
          metric_date: month,
          metric_category: 'sales',
          metric_name: 'monthly_total_revenue',
          metric_value: totalRevenue,
          metric_unit: 'currency',
          aggregation_level: 'monthly',
          source_data_type: 'orders',
          correlation_factors: {
            avg_monthly_revenue: totalRevenue,
            customer_count: uniqueCustomers
          }
        },
        {
          metric_date: month,
          metric_category: 'customers',
          metric_name: 'monthly_unique_customers',
          metric_value: uniqueCustomers,
          metric_unit: 'count',
          aggregation_level: 'monthly',
          source_data_type: 'orders',
          correlation_factors: {
            order_count: orders.length,
            avg_orders_per_customer: orders.length / uniqueCustomers
          }
        }
      );
    }

    console.log(`📅 Generated ${metrics.length} monthly metrics`);
    return metrics;
  }

  /**
   * Calculate weekly metrics manually when RPC function doesn't exist
   */
  private static async calculateWeeklyMetricsManually(startDate: string, endDate: string): Promise<BusinessMetricRecord[]> {
    // This is a fallback implementation
    const metrics: BusinessMetricRecord[] = [];

    // For now, return empty array - could implement manual weekly calculation here
    console.log('⚠️ Weekly RPC function not available, skipping weekly metrics');

    return metrics;
  }

  /**
   * Clear existing metrics for date range
   */
  private static async clearExistingMetrics(startDate: string, endDate: string): Promise<void> {
    const { error } = await supabase
      .from('business_metrics')
      .delete()
      .gte('metric_date', startDate)
      .lte('metric_date', endDate);

    if (error) {
      throw new Error(`Failed to clear existing metrics: ${error.message}`);
    }

    console.log(`🗑️ Cleared existing metrics from ${startDate} to ${endDate}`);
  }

  /**
   * Run periodic population (can be called from cron job)
   */
  static async runPeriodicPopulation(): Promise<void> {
    try {
      console.log('🔄 Starting periodic business metrics population...');

      // Populate last 7 days
      const result = await this.populateFromOrders({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        force: true // Overwrite existing metrics
      });

      if (result.success) {
        console.log(`✅ Periodic population completed: ${result.metricsCreated} metrics created`);
      } else {
        console.error('❌ Periodic population failed:', result.errors);
      }

    } catch (error) {
      console.error('❌ Periodic population error:', error);

      ValidationMonitor.recordValidationError({
        context: 'BusinessMetricsPopulator.runPeriodicPopulation',
        errorCode: 'PERIODIC_POPULATION_FAILED',
        validationPattern: 'batch_process_metrics',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}