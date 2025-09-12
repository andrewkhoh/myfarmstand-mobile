/**
 * Task 2.4.5: Cache Performance Monitoring
 * Track cache hit/miss rates, invalidation patterns, and performance metrics
 */

import { ValidationMonitor } from '../../utils/validationMonitor';

interface CacheMetrics {
  hits: number;
  misses: number;
  invalidations: number;
  optimisticUpdates: number;
  realtimeUpdates: number;
  crossEntityUpdates: number;
  batchOperations: number;
  warmingOperations: number;
}

interface CachePerformanceData {
  operation: string;
  duration: number;
  cacheImpact: 'hit' | 'miss' | 'invalidation' | 'optimistic' | 'realtime';
  entityCount: number;
  success: boolean;
  error?: string;
}

/**
 * Advanced cache performance monitoring for inventory operations
 */
export class CachePerformanceMonitor {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    invalidations: 0,
    optimisticUpdates: 0,
    realtimeUpdates: 0,
    crossEntityUpdates: 0,
    batchOperations: 0,
    warmingOperations: 0
  };

  private performanceData: CachePerformanceData[] = [];
  private readonly maxDataPoints = 1000; // Limit memory usage

  /**
   * Record cache hit event
   */
  recordCacheHit(operation: string, duration: number, entityCount: number = 1): void {
    this.metrics.hits++;
    this.addPerformanceData({
      operation,
      duration,
      cacheImpact: 'hit',
      entityCount,
      success: true
    });

    ValidationMonitor.recordPatternSuccess({
      service: 'CachePerformanceMonitor', 
      pattern: 'direct_supabase_query', 
      operation
    });
  }

  /**
   * Record cache miss event
   */
  recordCacheMiss(operation: string, duration: number, entityCount: number = 1): void {
    this.metrics.misses++;
    this.addPerformanceData({
      operation,
      duration,
      cacheImpact: 'miss',
      entityCount,
      success: true
    });

    // Cache misses aren't failures, but worth tracking performance
    ValidationMonitor.recordPatternSuccess({
      service: 'CachePerformanceMonitor', 
      pattern: 'direct_supabase_query', 
      operation: `cache_miss_${operation}`
    });
  }

  /**
   * Record cache invalidation event
   */
  recordInvalidation(operation: string, duration: number, entityCount: number): void {
    this.metrics.invalidations++;
    this.addPerformanceData({
      operation,
      duration,
      cacheImpact: 'invalidation',
      entityCount,
      success: true
    });

    ValidationMonitor.recordPatternSuccess({
      service: 'CachePerformanceMonitor', 
      pattern: 'direct_supabase_query', 
      operation: `cache_invalidation_${operation}`
    });
  }

  /**
   * Record optimistic update event
   */
  recordOptimisticUpdate(operation: string, duration: number, entityCount: number): void {
    this.metrics.optimisticUpdates++;
    this.addPerformanceData({
      operation,
      duration,
      cacheImpact: 'optimistic',
      entityCount,
      success: true
    });

    ValidationMonitor.recordPatternSuccess({
      service: 'CachePerformanceMonitor', 
      pattern: 'direct_supabase_query', 
      operation: `optimistic_update_${operation}`
    });
  }

  /**
   * Record real-time update event
   */
  recordRealtimeUpdate(operation: string, duration: number, entityCount: number): void {
    this.metrics.realtimeUpdates++;
    this.addPerformanceData({
      operation,
      duration,
      cacheImpact: 'realtime',
      entityCount,
      success: true
    });

    ValidationMonitor.recordPatternSuccess({
      service: 'CachePerformanceMonitor', 
      pattern: 'direct_supabase_query', 
      operation: `realtime_update_${operation}`
    });
  }

  /**
   * Record cross-entity cache update
   */
  recordCrossEntityUpdate(operation: string, duration: number, entityCount: number): void {
    this.metrics.crossEntityUpdates++;
    this.addPerformanceData({
      operation,
      duration,
      cacheImpact: 'invalidation',
      entityCount,
      success: true
    });

    ValidationMonitor.recordPatternSuccess({
      service: 'CachePerformanceMonitor', 
      pattern: 'direct_supabase_query', 
      operation: `cross_entity_update_${operation}`
    });
  }

  /**
   * Record batch operation
   */
  recordBatchOperation(operation: string, duration: number, entityCount: number): void {
    this.metrics.batchOperations++;
    this.addPerformanceData({
      operation,
      duration,
      cacheImpact: 'invalidation',
      entityCount,
      success: true
    });

    ValidationMonitor.recordPatternSuccess({
      service: 'CachePerformanceMonitor', 
      pattern: 'direct_supabase_query', 
      operation: `batch_operation_${operation}`
    });
  }

  /**
   * Record cache warming operation
   */
  recordCacheWarming(operation: string, duration: number, entityCount: number): void {
    this.metrics.warmingOperations++;
    this.addPerformanceData({
      operation,
      duration,
      cacheImpact: 'hit',
      entityCount,
      success: true
    });

    ValidationMonitor.recordPatternSuccess({
      service: 'CachePerformanceMonitor', 
      pattern: 'direct_supabase_query', 
      operation: `cache_warming_${operation}`
    });
  }

  /**
   * Record cache operation failure
   */
  recordCacheError(operation: string, duration: number, error: string): void {
    this.addPerformanceData({
      operation,
      duration,
      cacheImpact: 'miss',
      entityCount: 0,
      success: false,
      error
    });

    ValidationMonitor.recordValidationError({
      category: 'cache_error',
      field: operation,
      value: error,
      expected: 'successful_cache_operation',
      severity: 'medium'
    });
  }

  /**
   * Get comprehensive cache performance metrics
   */
  getMetrics(): CacheMetrics & {
    hitRate: number;
    totalOperations: number;
    averageResponseTime: number;
    optimisticUpdateRate: number;
    crossEntityImpactRate: number;
  } {
    const totalCacheOps = this.metrics.hits + this.metrics.misses;
    const totalOps = totalCacheOps + this.metrics.invalidations + 
                     this.metrics.optimisticUpdates + this.metrics.realtimeUpdates;

    const successfulOps = this.performanceData.filter(d => d.success);
    const averageResponseTime = successfulOps.length > 0 
      ? successfulOps.reduce((sum, d) => sum + d.duration, 0) / successfulOps.length
      : 0;

    return {
      ...this.metrics,
      hitRate: totalCacheOps > 0 ? this.metrics.hits / totalCacheOps : 0,
      totalOperations: totalOps,
      averageResponseTime,
      optimisticUpdateRate: totalOps > 0 ? this.metrics.optimisticUpdates / totalOps : 0,
      crossEntityImpactRate: totalOps > 0 ? this.metrics.crossEntityUpdates / totalOps : 0
    };
  }

  /**
   * Get performance analysis and recommendations
   */
  getPerformanceAnalysis(): {
    status: 'excellent' | 'good' | 'fair' | 'poor';
    recommendations: string[];
    highlights: string[];
  } {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];
    const highlights: string[] = [];
    
    // Analyze cache hit rate
    if (metrics.hitRate >= 0.8) {
      highlights.push(`Excellent cache hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`);
    } else if (metrics.hitRate >= 0.6) {
      highlights.push(`Good cache hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`);
    } else {
      recommendations.push('Consider improving cache warming strategies to increase hit rate');
    }

    // Analyze response times
    if (metrics.averageResponseTime <= 50) {
      highlights.push(`Fast average response time: ${metrics.averageResponseTime.toFixed(1)}ms`);
    } else if (metrics.averageResponseTime <= 200) {
      highlights.push(`Acceptable response time: ${metrics.averageResponseTime.toFixed(1)}ms`);
    } else {
      recommendations.push('Response times are high, consider optimizing cache strategies');
    }

    // Analyze optimistic update usage
    if (metrics.optimisticUpdateRate >= 0.3) {
      highlights.push(`Good optimistic update usage: ${(metrics.optimisticUpdateRate * 100).toFixed(1)}%`);
    } else {
      recommendations.push('Consider increasing optimistic updates for better UX');
    }

    // Analyze cross-entity coordination
    if (metrics.crossEntityImpactRate <= 0.1) {
      highlights.push('Efficient cross-entity cache coordination');
    } else {
      recommendations.push('High cross-entity invalidation rate may impact performance');
    }

    // Determine overall status
    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (metrics.hitRate >= 0.8 && metrics.averageResponseTime <= 100) {
      status = 'excellent';
    } else if (metrics.hitRate >= 0.6 && metrics.averageResponseTime <= 200) {
      status = 'good';
    } else if (metrics.hitRate >= 0.4 && metrics.averageResponseTime <= 500) {
      status = 'fair';
    } else {
      status = 'poor';
    }

    return { status, recommendations, highlights };
  }

  /**
   * Export performance data for analysis
   */
  exportPerformanceData(): {
    metrics: ReturnType<typeof this.getMetrics>;
    analysis: ReturnType<typeof this.getPerformanceAnalysis>;
    recentOperations: CachePerformanceData[];
  } {
    return {
      metrics: this.getMetrics(),
      analysis: this.getPerformanceAnalysis(),
      recentOperations: this.performanceData.slice(-50) // Last 50 operations
    };
  }

  /**
   * Reset metrics (for testing or periodic reset)
   */
  reset(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      optimisticUpdates: 0,
      realtimeUpdates: 0,
      crossEntityUpdates: 0,
      batchOperations: 0,
      warmingOperations: 0
    };
    this.performanceData = [];
  }

  private addPerformanceData(data: CachePerformanceData): void {
    this.performanceData.push({
      ...data,
      // Add timestamp for time-based analysis
      timestamp: Date.now()
    } as any);

    // Limit memory usage by keeping only recent data
    if (this.performanceData.length > this.maxDataPoints) {
      this.performanceData = this.performanceData.slice(-this.maxDataPoints);
    }
  }
}

/**
 * Singleton performance monitor instance
 */
let performanceMonitorInstance: CachePerformanceMonitor | null = null;

export const getCachePerformanceMonitor = (): CachePerformanceMonitor => {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new CachePerformanceMonitor();
  }
  return performanceMonitorInstance;
};

/**
 * Performance timing decorator for cache operations
 */
export const withCachePerformanceMonitoring = <T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>,
  entityCount: number = 1
) => {
  return async (...args: T): Promise<R> => {
    const monitor = getCachePerformanceMonitor();
    const startTime = performance.now();
    
    try {
      const result = await fn(...args);
      const duration = performance.now() - startTime;
      
      // Determine cache impact based on operation name
      if (operation.includes('hit') || operation.includes('get')) {
        monitor.recordCacheHit(operation, duration, entityCount);
      } else if (operation.includes('invalidate')) {
        monitor.recordInvalidation(operation, duration, entityCount);
      } else if (operation.includes('optimistic')) {
        monitor.recordOptimisticUpdate(operation, duration, entityCount);
      } else if (operation.includes('realtime')) {
        monitor.recordRealtimeUpdate(operation, duration, entityCount);
      } else {
        monitor.recordCacheMiss(operation, duration, entityCount);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      monitor.recordCacheError(operation, duration, error instanceof Error ? error.message : String(error));
      throw error;
    }
  };
};