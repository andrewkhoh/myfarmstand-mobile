/**
 * Performance Monitoring Service
 * Phase 5: Production Readiness - Performance tracking and optimization
 * 
 * Provides comprehensive performance monitoring across all system components
 * Following established architectural patterns from docs/architectural-patterns-and-best-practices.md
 */

import { supabase } from '../config/supabase';
import { z } from 'zod';

// Performance metric schema
const PerformanceMetricSchema = z.object({
  metricCategory: z.enum(['query_performance', 'api_response', 'memory_usage', 'cache_efficiency']),
  metricName: z.string().min(1).max(255),
  metricValue: z.number().positive(),
  metricUnit: z.enum(['milliseconds', 'bytes', 'percentage', 'count']),
  serviceName: z.string().min(1).max(100),
  userRoleContext: z.string().optional(),
  requestContext: z.record(z.any()).optional(),
});

const PerformanceQuerySchema = z.object({
  category: z.string().optional(),
  service: z.string().optional(),
  timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h'),
  userRole: z.string().optional(),
});

type PerformanceMetric = z.infer<typeof PerformanceMetricSchema>;
type PerformanceQuery = z.infer<typeof PerformanceQuerySchema>;

// Performance thresholds for alerting
const PERFORMANCE_THRESHOLDS = {
  query_performance: {
    warning: 200, // ms
    critical: 500, // ms
  },
  api_response: {
    warning: 300, // ms
    critical: 1000, // ms
  },
  memory_usage: {
    warning: 80, // percentage
    critical: 95, // percentage
  },
  cache_efficiency: {
    warning: 85, // percentage (minimum acceptable)
    critical: 75, // percentage (critical threshold)
  },
};

class PerformanceMonitoringService {
  
  /**
   * Log a performance metric
   * Uses direct Supabase queries with validation pipeline following established patterns
   */
  async logMetric(metric: PerformanceMetric): Promise<{ success: boolean; metricId?: string; error?: string }> {
    try {
      // Single validation pass principle
      const validatedMetric = PerformanceMetricSchema.parse(metric);
      
      // Database-first validation with transformation schema
      const { data, error } = await supabase.rpc('log_performance_metric', {
        p_metric_category: validatedMetric.metricCategory,
        p_metric_name: validatedMetric.metricName,
        p_metric_value: validatedMetric.metricValue,
        p_metric_unit: validatedMetric.metricUnit,
        p_service_name: validatedMetric.serviceName,
        p_user_role_context: validatedMetric.userRoleContext || null,
        p_request_context: validatedMetric.requestContext || null,
      });

      if (error) {
        console.error('Performance metric logging failed:', error);
        return { success: false, error: error.message };
      }

      // Check for performance threshold violations
      await this.checkThresholds(validatedMetric);

      return { success: true, metricId: data };
      
    } catch (error) {
      console.error('Performance metric validation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      };
    }
  }

  /**
   * Log query performance - specialized method for database query monitoring
   */
  async logQueryPerformance(
    queryName: string,
    executionTimeMs: number,
    serviceName: string,
    userRole?: string,
    context?: Record<string, any>
  ): Promise<{ success: boolean; metricId?: string; error?: string }> {
    return this.logMetric({
      metricCategory: 'query_performance',
      metricName: queryName,
      metricValue: executionTimeMs,
      metricUnit: 'milliseconds',
      serviceName,
      userRoleContext: userRole,
      requestContext: context,
    });
  }

  /**
   * Log API response performance
   */
  async logApiResponse(
    endpoint: string,
    responseTimeMs: number,
    serviceName: string,
    userRole?: string,
    context?: Record<string, any>
  ): Promise<{ success: boolean; metricId?: string; error?: string }> {
    return this.logMetric({
      metricCategory: 'api_response',
      metricName: endpoint,
      metricValue: responseTimeMs,
      metricUnit: 'milliseconds',
      serviceName,
      userRoleContext: userRole,
      requestContext: context,
    });
  }

  /**
   * Log memory usage
   */
  async logMemoryUsage(
    memoryUsageMB: number,
    serviceName: string,
    userRole?: string,
    context?: Record<string, any>
  ): Promise<{ success: boolean; metricId?: string; error?: string }> {
    return this.logMetric({
      metricCategory: 'memory_usage',
      metricName: 'heap_usage',
      metricValue: memoryUsageMB,
      metricUnit: 'bytes',
      serviceName,
      userRoleContext: userRole,
      requestContext: context,
    });
  }

  /**
   * Log cache efficiency
   */
  async logCacheEfficiency(
    hitRatePercentage: number,
    cacheName: string,
    serviceName: string,
    userRole?: string,
    context?: Record<string, any>
  ): Promise<{ success: boolean; metricId?: string; error?: string }> {
    return this.logMetric({
      metricCategory: 'cache_efficiency',
      metricName: cacheName,
      metricValue: hitRatePercentage,
      metricUnit: 'percentage',
      serviceName,
      userRoleContext: userRole,
      requestContext: context,
    });
  }

  /**
   * Get performance metrics with filtering
   * User-isolated query keys with proper fallback strategies
   */
  async getMetrics(query: PerformanceQuery): Promise<{ 
    success: boolean; 
    metrics?: any[]; 
    error?: string 
  }> {
    try {
      const validatedQuery = PerformanceQuerySchema.parse(query);
      
      let queryBuilder = supabase
        .from('recent_performance_metrics')
        .select('*');

      // Apply filters based on query parameters
      if (validatedQuery.category) {
        queryBuilder = queryBuilder.eq('metric_category', validatedQuery.category);
      }
      
      if (validatedQuery.service) {
        queryBuilder = queryBuilder.eq('service_name', validatedQuery.service);
      }
      
      if (validatedQuery.userRole) {
        queryBuilder = queryBuilder.eq('user_role_context', validatedQuery.userRole);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Performance metrics query failed:', error);
        return { success: false, error: error.message };
      }

      return { success: true, metrics: data || [] };
      
    } catch (error) {
      console.error('Performance metrics query validation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      };
    }
  }

  /**
   * Get performance summary for dashboard
   */
  async getPerformanceSummary(timeRange: '1h' | '24h' | '7d' = '24h'): Promise<{
    success: boolean;
    summary?: {
      queryPerformance: { average: number; max: number; count: number };
      apiResponse: { average: number; max: number; count: number };
      memoryUsage: { average: number; max: number; count: number };
      cacheEfficiency: { average: number; min: number; count: number };
      alertingMetrics: any[];
    };
    error?: string;
  }> {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      
      // Query performance metrics by category
      const { data: queryPerf } = await supabase
        .from('system_performance_metrics')
        .select('metric_value')
        .eq('metric_category', 'query_performance')
        .gte('metric_timestamp', timeFilter);

      const { data: apiResp } = await supabase
        .from('system_performance_metrics')
        .select('metric_value')
        .eq('metric_category', 'api_response')
        .gte('metric_timestamp', timeFilter);

      const { data: memUsage } = await supabase
        .from('system_performance_metrics')
        .select('metric_value')
        .eq('metric_category', 'memory_usage')
        .gte('metric_timestamp', timeFilter);

      const { data: cacheEff } = await supabase
        .from('system_performance_metrics')
        .select('metric_value')
        .eq('metric_category', 'cache_efficiency')
        .gte('metric_timestamp', timeFilter);

      // Calculate summaries
      const summary = {
        queryPerformance: this.calculateSummary(queryPerf || []),
        apiResponse: this.calculateSummary(apiResp || []),
        memoryUsage: this.calculateSummary(memUsage || []),
        cacheEfficiency: this.calculateSummary(cacheEff || [], 'min'),
        alertingMetrics: await this.getAlertingMetrics(timeRange),
      };

      return { success: true, summary };
      
    } catch (error) {
      console.error('Performance summary query failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check performance thresholds and trigger alerts if needed
   */
  private async checkThresholds(metric: PerformanceMetric): Promise<void> {
    const thresholds = PERFORMANCE_THRESHOLDS[metric.metricCategory];
    if (!thresholds) return;

    let alertLevel: 'warning' | 'critical' | null = null;

    if (metric.metricCategory === 'cache_efficiency') {
      // For cache efficiency, lower values are worse
      if (metric.metricValue <= thresholds.critical) {
        alertLevel = 'critical';
      } else if (metric.metricValue <= thresholds.warning) {
        alertLevel = 'warning';
      }
    } else {
      // For other metrics, higher values are worse
      if (metric.metricValue >= thresholds.critical) {
        alertLevel = 'critical';
      } else if (metric.metricValue >= thresholds.warning) {
        alertLevel = 'warning';
      }
    }

    if (alertLevel) {
      await this.logPerformanceAlert(metric, alertLevel, thresholds);
    }
  }

  /**
   * Log performance alert to error system
   */
  private async logPerformanceAlert(
    metric: PerformanceMetric,
    level: 'warning' | 'critical',
    thresholds: any
  ): Promise<void> {
    try {
      await supabase.rpc('log_system_error', {
        p_error_level: level,
        p_error_category: 'performance',
        p_error_message: `Performance threshold exceeded: ${metric.metricName}`,
        p_affected_service: metric.serviceName,
        p_error_context: {
          metric: metric,
          thresholds: thresholds,
          exceeded_by: metric.metricValue - thresholds[level],
        },
        p_user_role_context: metric.userRoleContext,
      });
    } catch (error) {
      console.error('Failed to log performance alert:', error);
    }
  }

  /**
   * Get alerting metrics that exceed thresholds
   */
  private async getAlertingMetrics(timeRange: string): Promise<any[]> {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      
      const { data } = await supabase
        .from('system_error_logs')
        .select('*')
        .eq('error_category', 'performance')
        .gte('error_timestamp', timeFilter)
        .order('error_timestamp', { ascending: false });

      return data || [];
    } catch (error) {
      console.error('Failed to get alerting metrics:', error);
      return [];
    }
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(data: any[], type: 'max' | 'min' = 'max'): { average: number; max: number; min?: number; count: number } {
    if (data.length === 0) {
      return { average: 0, max: 0, min: 0, count: 0 };
    }

    const values = data.map(item => item.metric_value);
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    return type === 'min' 
      ? { average, max, min, count: data.length }
      : { average, max, count: data.length };
  }

  /**
   * Get time filter for queries
   */
  private getTimeFilter(timeRange: string): string {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
  }

  /**
   * Performance decorator for measuring function execution time
   */
  measurePerformance<T extends (...args: any[]) => any>(
    func: T,
    serviceName: string,
    functionName: string,
    userRole?: string
  ): T {
    return ((...args: any[]) => {
      const startTime = performance.now();
      
      try {
        const result = func(...args);
        
        // Handle both sync and async functions
        if (result instanceof Promise) {
          return result.then(
            (value: any) => {
              const endTime = performance.now();
              this.logQueryPerformance(
                functionName,
                endTime - startTime,
                serviceName,
                userRole,
                { args: args.length }
              );
              return value;
            },
            (error) => {
              const endTime = performance.now();
              this.logQueryPerformance(
                `${functionName}_error`,
                endTime - startTime,
                serviceName,
                userRole,
                { args: args.length, error: error.message }
              );
              throw error;
            }
          );
        } else {
          const endTime = performance.now();
          this.logQueryPerformance(
            functionName,
            endTime - startTime,
            serviceName,
            userRole,
            { args: args.length }
          );
          return result;
        }
      } catch (error) {
        const endTime = performance.now();
        this.logQueryPerformance(
          `${functionName}_error`,
          endTime - startTime,
          serviceName,
          userRole,
          { args: args.length, error: error instanceof Error ? error.message : 'Unknown error' }
        );
        throw error;
      }
    }) as T;
  }

  /**
   * Performance timing utility for manual measurement
   */
  startTiming(label: string): { end: (serviceName: string, userRole?: string, context?: Record<string, any>) => Promise<void> } {
    const startTime = performance.now();
    
    return {
      end: async (serviceName: string, userRole?: string, context?: Record<string, any>) => {
        const endTime = performance.now();
        await this.logQueryPerformance(
          label,
          endTime - startTime,
          serviceName,
          userRole,
          context
        );
      }
    };
  }
}

// Export singleton instance
export const performanceMonitoring = new PerformanceMonitoringService();

// Export types for use in other modules
export type { PerformanceMetric, PerformanceQuery };
export { PerformanceMetricSchema, PerformanceQuerySchema };