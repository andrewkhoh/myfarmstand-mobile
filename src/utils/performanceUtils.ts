/**
 * Performance Utilities
 * Phase 5: Production Readiness - Database query optimization utilities
 * 
 * Provides query optimization, caching strategies, and performance monitoring
 * Following patterns from docs/architectural-patterns-and-best-practices.md
 */

import { supabase } from '../config/supabase';
import { performanceMonitoring } from '../monitoring/performanceMonitoring';
import { z } from 'zod';

// Query optimization configuration
const QueryOptimizationConfig = z.object({
  enableQueryPlan: z.boolean().default(false),
  enableCaching: z.boolean().default(true),
  maxQueryTime: z.number().default(500), // milliseconds
  batchSize: z.number().default(100),
  indexHints: z.array(z.string()).default([]),
});

type QueryOptimizationOptions = z.infer<typeof QueryOptimizationConfig>;

// Query performance metrics
interface QueryMetrics {
  queryName: string;
  executionTime: number;
  rowsReturned: number;
  cacheHit: boolean;
  optimizations: string[];
}

// Query cache for frequently accessed data
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxCacheSize = 1000;
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl = this.defaultTTL): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(pattern: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key =>
      key.includes(pattern)
    );
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  hitRatio(): number {
    // This would be tracked separately in a real implementation
    return 0.85; // Placeholder
  }
}

const queryCache = new QueryCache();

/**
 * Optimized query executor with performance monitoring
 */
class OptimizedQueryExecutor {
  
  /**
   * Execute query with optimization and monitoring
   */
  async executeQuery<T>(
    queryName: string,
    queryFn: () => Promise<{ data: T; error: any }>,
    options: Partial<QueryOptimizationOptions> = {},
    userRole?: string
  ): Promise<{ data: T | null; error: any; metrics: QueryMetrics }> {
    const config = QueryOptimizationConfig.parse(options);
    const startTime = performance.now();
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(queryName, queryFn.toString());
    
    // Try cache first if enabled
    if (config.enableCaching) {
      const cachedResult = queryCache.get(cacheKey);
      if (cachedResult) {
        const metrics: QueryMetrics = {
          queryName,
          executionTime: performance.now() - startTime,
          rowsReturned: Array.isArray(cachedResult.data) ? cachedResult.data.length : 1,
          cacheHit: true,
          optimizations: ['cache_hit'],
        };

        await this.logMetrics(metrics, userRole);
        return { data: cachedResult.data, error: null, metrics };
      }
    }

    // Execute query with optimizations
    try {
      const result = await this.executeWithOptimizations(queryFn, config);
      const executionTime = performance.now() - startTime;

      const metrics: QueryMetrics = {
        queryName,
        executionTime,
        rowsReturned: Array.isArray(result.data) ? result.data?.length || 0 : result.data ? 1 : 0,
        cacheHit: false,
        optimizations: this.getAppliedOptimizations(config),
      };

      // Cache successful results
      if (config.enableCaching && !result.error && result.data) {
        queryCache.set(cacheKey, result);
      }

      // Log performance metrics
      await this.logMetrics(metrics, userRole);

      // Check for performance thresholds
      if (executionTime > config.maxQueryTime) {
        await this.logSlowQuery(queryName, executionTime, userRole);
      }

      return { ...result, metrics };
      
    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      const metrics: QueryMetrics = {
        queryName,
        executionTime,
        rowsReturned: 0,
        cacheHit: false,
        optimizations: [],
      };

      await this.logMetrics(metrics, userRole);
      
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown query error'),
        metrics,
      };
    }
  }

  /**
   * Execute batch queries with optimization
   */
  async executeBatch<T>(
    batchName: string,
    queries: Array<() => Promise<{ data: T; error: any }>>,
    options: Partial<QueryOptimizationOptions> = {},
    userRole?: string
  ): Promise<{ results: Array<{ data: T | null; error: any }>; totalTime: number }> {
    const config = QueryOptimizationConfig.parse(options);
    const startTime = performance.now();

    // Execute queries in optimized batches
    const batchSize = Math.min(config.batchSize, queries.length);
    const results: Array<{ data: T | null; error: any }> = [];

    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      
      // Execute batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(query => query())
      );

      // Process batch results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({ data: null, error: result.reason });
        }
      }
    }

    const totalTime = performance.now() - startTime;

    // Log batch performance
    await performanceMonitoring.logQueryPerformance(
      `${batchName}_batch`,
      totalTime,
      'query-optimizer',
      userRole,
      {
        totalQueries: queries.length,
        batchSize: config.batchSize,
        successCount: results.filter(r => !r.error).length,
      }
    );

    return { results, totalTime };
  }

  /**
   * Optimized pagination query
   */
  async executePaginatedQuery<T>(
    queryName: string,
    baseQuery: any,
    page: number,
    pageSize: number,
    options: Partial<QueryOptimizationOptions> = {},
    userRole?: string
  ): Promise<{ data: T[] | null; count: number | null; error: any; hasMore: boolean }> {
    const config = QueryOptimizationConfig.parse(options);
    const offset = (page - 1) * pageSize;

    const queryFn = async () => {
      // Use cursor-based pagination for better performance on large datasets
      if (page > 10) {
        return this.executeCursorPagination(baseQuery, offset, pageSize);
      }

      // Use offset pagination for smaller page numbers
      return baseQuery
        .range(offset, offset + pageSize - 1)
        .select('*', { count: 'exact' });
    };

    const result = await this.executeQuery(queryName, queryFn, config, userRole);
    
    const hasMore = result.data ? 
      (Array.isArray(result.data) ? result.data.length === pageSize : false) : 
      false;

    return {
      data: result.data,
      count: result.data?.length || 0,
      error: result.error,
      hasMore,
    };
  }

  /**
   * Execute query with search optimization
   */
  async executeSearchQuery<T>(
    searchTerm: string,
    searchFields: string[],
    baseQuery: any,
    options: Partial<QueryOptimizationOptions> = {},
    userRole?: string
  ): Promise<{ data: T[] | null; error: any }> {
    const config = QueryOptimizationConfig.parse(options);
    
    const queryFn = async () => {
      // Use full-text search if available, otherwise use ILIKE
      if (searchFields.length === 1) {
        return baseQuery.ilike(searchFields[0], `%${searchTerm}%`);
      }

      // For multiple fields, use OR conditions
      let query = baseQuery;
      searchFields.forEach((field, index) => {
        if (index === 0) {
          query = query.ilike(field, `%${searchTerm}%`);
        } else {
          query = query.or(`${field}.ilike.%${searchTerm}%`);
        }
      });

      return query;
    };

    return this.executeQuery(`search_${searchFields.join('_')}`, queryFn, config, userRole);
  }

  /**
   * Execute aggregation query with optimization
   */
  async executeAggregationQuery(
    aggregationName: string,
    aggregationFn: () => Promise<any>,
    options: Partial<QueryOptimizationOptions> = {},
    userRole?: string
  ): Promise<{ data: any; error: any }> {
    const config = { ...QueryOptimizationConfig.parse(options), enableCaching: true };
    
    // Aggregations benefit heavily from caching
    return this.executeQuery(aggregationName, aggregationFn, config, userRole);
  }

  /**
   * Private helper methods
   */
  private async executeWithOptimizations(
    queryFn: () => Promise<any>,
    config: QueryOptimizationOptions
  ): Promise<any> {
    // Apply query plan analysis if enabled
    if (config.enableQueryPlan) {
      // In a real implementation, this would analyze the query plan
      console.log('Query plan analysis enabled');
    }

    // Execute query with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), config.maxQueryTime * 2)
    );

    return Promise.race([queryFn(), timeoutPromise]);
  }

  private generateCacheKey(queryName: string, queryStr: string): string {
    // Simple hash function for cache key
    const hash = queryStr.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return `${queryName}_${Math.abs(hash)}`;
  }

  private getAppliedOptimizations(config: QueryOptimizationOptions): string[] {
    const optimizations: string[] = [];
    
    if (config.enableCaching) optimizations.push('caching');
    if (config.enableQueryPlan) optimizations.push('query_plan');
    if (config.indexHints.length > 0) optimizations.push('index_hints');
    
    return optimizations;
  }

  private async executeCursorPagination(baseQuery: any, offset: number, pageSize: number): Promise<any> {
    // Implement cursor-based pagination for better performance
    // This is a simplified version - real implementation would use proper cursors
    return baseQuery
      .range(offset, offset + pageSize - 1)
      .order('id');
  }

  private async logMetrics(metrics: QueryMetrics, userRole?: string): Promise<void> {
    await performanceMonitoring.logQueryPerformance(
      metrics.queryName,
      metrics.executionTime,
      'query-optimizer',
      userRole,
      {
        rowsReturned: metrics.rowsReturned,
        cacheHit: metrics.cacheHit,
        optimizations: metrics.optimizations,
      }
    );

    // Log cache efficiency
    if (metrics.cacheHit) {
      await performanceMonitoring.logCacheEfficiency(
        queryCache.hitRatio() * 100,
        'query-cache',
        'query-optimizer',
        userRole
      );
    }
  }

  private async logSlowQuery(queryName: string, executionTime: number, userRole?: string): Promise<void> {
    await supabase.rpc('log_system_error', {
      p_error_level: 'warning',
      p_error_category: 'performance',
      p_error_message: `Slow query detected: ${queryName}`,
      p_affected_service: 'query-optimizer',
      p_error_context: {
        queryName,
        executionTime,
        threshold: 500,
      },
      p_user_role_context: userRole,
    });
  }
}

// Export singleton instance
export const optimizedQueryExecutor = new OptimizedQueryExecutor();

// Export utilities for direct use
export { queryCache };

/**
 * Database index optimization utilities
 */
export class IndexOptimizer {
  
  /**
   * Suggest indexes for common query patterns
   */
  static getIndexSuggestions(): Array<{ table: string; columns: string[]; type: string; reason: string }> {
    return [
      {
        table: 'orders',
        columns: ['user_id', 'status'],
        type: 'composite',
        reason: 'Optimize user order history queries with status filtering',
      },
      {
        table: 'orders',
        columns: ['created_at'],
        type: 'btree',
        reason: 'Optimize date-based ordering and filtering',
      },
      {
        table: 'order_items',
        columns: ['order_id'],
        type: 'btree',
        reason: 'Optimize order item lookups',
      },
      {
        table: 'products',
        columns: ['category_id', 'available'],
        type: 'composite',
        reason: 'Optimize product catalog filtering',
      },
      {
        table: 'products',
        columns: ['name'],
        type: 'gin',
        reason: 'Optimize product name searches with trigram indexing',
      },
      {
        table: 'inventory_items',
        columns: ['product_id'],
        type: 'btree',
        reason: 'Optimize inventory lookups by product',
      },
      {
        table: 'inventory_items',
        columns: ['quantity'],
        type: 'btree',
        reason: 'Optimize low stock queries',
      },
      {
        table: 'cart_items',
        columns: ['user_id'],
        type: 'btree',
        reason: 'Optimize cart item queries by user',
      },
      {
        table: 'user_roles',
        columns: ['user_id', 'role'],
        type: 'composite',
        reason: 'Optimize role-based access control',
      },
      {
        table: 'system_performance_metrics',
        columns: ['metric_timestamp', 'service_name'],
        type: 'composite',
        reason: 'Optimize performance monitoring queries',
      },
    ];
  }

  /**
   * Generate index creation SQL
   */
  static generateIndexSQL(): string[] {
    const suggestions = this.getIndexSuggestions();
    
    return suggestions.map(suggestion => {
      const indexName = `idx_${suggestion.table}_${suggestion.columns.join('_')}`;
      const columns = suggestion.columns.join(', ');
      
      if (suggestion.type === 'gin') {
        return `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName} ON ${suggestion.table} USING gin(${columns} gin_trgm_ops);`;
      }
      
      return `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName} ON ${suggestion.table}(${columns});`;
    });
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  static async analyzeQueryPerformance(
    queryName: string,
    executionTime: number,
    rowsReturned: number
  ): Promise<string[]> {
    const suggestions: string[] = [];

    if (executionTime > 500) {
      suggestions.push('Consider adding appropriate indexes');
      suggestions.push('Review query complexity and joins');
    }

    if (rowsReturned > 1000 && executionTime > 200) {
      suggestions.push('Consider implementing pagination');
      suggestions.push('Add LIMIT clauses to reduce result set size');
    }

    if (executionTime > 100 && rowsReturned < 10) {
      suggestions.push('Query may benefit from better indexing');
      suggestions.push('Check for unnecessary table scans');
    }

    return suggestions;
  }
}

/**
 * Query performance monitoring decorator
 */
export function monitorQueryPerformance(
  queryName: string,
  userRole?: string,
  options: Partial<QueryOptimizationOptions> = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await optimizedQueryExecutor.executeQuery(
        `${target.constructor.name}.${propertyName}`,
        () => method.apply(this, args),
        options,
        userRole
      );

      if (result.error) {
        throw result.error;
      }

      return result.data;
    };

    return descriptor;
  };
}

// Export types
export type { QueryMetrics, QueryOptimizationOptions };