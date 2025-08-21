/**
 * System Health Monitoring Service
 * Phase 5: Production Readiness - Cross-service performance integration
 * 
 * Provides system-wide health monitoring, service coordination, and performance optimization
 * Following patterns from docs/architectural-patterns-and-best-practices.md
 */

import { supabase } from '../config/supabase';
import { performanceMonitoring } from './performanceMonitoring';
import { securityAuditing } from './securityAuditing';
import { optimizedQueryExecutor } from '../utils/performanceUtils';
import { z } from 'zod';

// System health metrics schema
const SystemHealthMetricsSchema = z.object({
  timestamp: z.string().datetime(),
  overallHealth: z.number().min(0).max(100),
  services: z.record(z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy', 'offline']),
    responseTime: z.number(),
    errorRate: z.number().min(0).max(1),
    throughput: z.number(),
    lastCheck: z.string().datetime(),
  })),
  performance: z.object({
    averageResponseTime: z.number(),
    queryPerformance: z.number(),
    cacheHitRatio: z.number().min(0).max(1),
    memoryUsage: z.number(),
  }),
  security: z.object({
    violationCount: z.number(),
    auditCompliance: z.number().min(0).max(100),
    lastSecurityScan: z.string().datetime(),
  }),
  recommendations: z.array(z.string()),
});

type SystemHealthMetrics = z.infer<typeof SystemHealthMetricsSchema>;

// Service coordination configuration
const ServiceCoordinationConfig = z.object({
  enableServiceMesh: z.boolean().default(true),
  enableCircuitBreaker: z.boolean().default(true),
  enableLoadBalancing: z.boolean().default(true),
  maxRetries: z.number().default(3),
  timeoutMs: z.number().default(5000),
  bulkOperationThreshold: z.number().default(100),
});

type ServiceCoordinationOptions = z.infer<typeof ServiceCoordinationConfig>;

// Cross-service operation context
interface ServiceOperation {
  operationId: string;
  services: string[];
  startTime: number;
  timeout: number;
  retries: number;
  context: Record<string, any>;
}

class SystemHealthMonitoringService {
  private activeOperations = new Map<string, ServiceOperation>();
  private serviceHealthCache = new Map<string, any>();
  private circuitBreakers = new Map<string, { failures: number; lastFailure: number; isOpen: boolean }>();

  /**
   * Monitor overall system health
   */
  async getSystemHealth(includeDetails = false): Promise<{
    success: boolean;
    health?: SystemHealthMetrics;
    error?: string;
  }> {
    try {
      const timestamp = new Date().toISOString();
      
      // Get service health for all critical services
      const services = await this.getServicesHealth();
      
      // Get performance metrics
      const performance = await this.getPerformanceMetrics();
      
      // Get security status
      const security = await this.getSecurityStatus();
      
      // Calculate overall health score
      const overallHealth = this.calculateOverallHealth(services, performance, security);
      
      // Generate recommendations
      const recommendations = this.generateHealthRecommendations(services, performance, security);
      
      const health: SystemHealthMetrics = {
        timestamp,
        overallHealth,
        services,
        performance,
        security,
        recommendations,
      };

      // Log system health metrics
      await performanceMonitoring.logMetric({
        metricCategory: 'memory_usage',
        metricName: 'system_health_score',
        metricValue: overallHealth,
        metricUnit: 'percentage',
        serviceName: 'system-health',
        requestContext: includeDetails ? { health } : { score: overallHealth },
      });

      return { success: true, health };
      
    } catch (error) {
      console.error('System health monitoring failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Coordinate cross-service operations with performance optimization
   */
  async coordinateOperation<T>(
    operationName: string,
    serviceOperations: Array<{
      service: string;
      operation: () => Promise<T>;
      priority?: 'high' | 'medium' | 'low';
      timeout?: number;
    }>,
    options: Partial<ServiceCoordinationOptions> = {}
  ): Promise<{
    success: boolean;
    results?: T[];
    errors?: any[];
    performance?: {
      totalTime: number;
      serviceTimings: Record<string, number>;
      throughput: number;
    };
  }> {
    const config = ServiceCoordinationConfig.parse(options);
    const operationId = `${operationName}-${Date.now()}`;
    const startTime = performance.now();

    // Register operation
    const operation: ServiceOperation = {
      operationId,
      services: serviceOperations.map(op => op.service),
      startTime,
      timeout: config.timeoutMs,
      retries: config.maxRetries,
      context: { operationName, serviceCount: serviceOperations.length },
    };

    this.activeOperations.set(operationId, operation);

    try {
      // Sort operations by priority
      const sortedOperations = this.sortOperationsByPriority(serviceOperations);
      
      // Execute operations with coordination
      const results = await this.executeCoordinatedOperations(
        sortedOperations,
        config,
        operationId
      );

      const totalTime = performance.now() - startTime;
      const serviceTimings = results.serviceTimings;
      const throughput = serviceOperations.length / (totalTime / 1000);

      // Log coordination performance
      await performanceMonitoring.logMetric({
        metricCategory: 'api_response',
        metricName: 'service_coordination',
        metricValue: totalTime,
        metricUnit: 'milliseconds',
        serviceName: 'system-coordinator',
        requestContext: {
          operationName,
          serviceCount: serviceOperations.length,
          throughput,
        },
      });

      return {
        success: true,
        results: results.data,
        errors: results.errors,
        performance: {
          totalTime,
          serviceTimings,
          throughput,
        },
      };

    } catch (error) {
      console.error(`Operation coordination failed: ${operationName}`, error);
      
      // Log coordination failure
      await this.logCoordinationFailure(operationName, error, operation);
      
      return {
        success: false,
        errors: [error],
      };
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Optimize service-to-service communication patterns
   */
  async optimizeServiceCommunication(
    sourceService: string,
    targetService: string,
    communicationType: 'query' | 'mutation' | 'subscription' | 'batch'
  ): Promise<{
    success: boolean;
    optimizedConfig?: {
      batchSize?: number;
      timeout?: number;
      retryStrategy?: string;
      caching?: boolean;
    };
    error?: string;
  }> {
    try {
      // Get historical performance data for this service pair
      const { data: performanceData } = await supabase
        .from('system_performance_metrics')
        .select('*')
        .eq('service_name', `${sourceService}-${targetService}`)
        .gte('metric_timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('metric_timestamp', { ascending: false });

      // Analyze patterns and generate optimized configuration
      const optimizedConfig = this.analyzeAndOptimizeCommunication(
        performanceData || [],
        communicationType
      );

      // Test the optimized configuration
      const testResult = await this.testOptimizedConfiguration(
        sourceService,
        targetService,
        optimizedConfig
      );

      if (testResult.success) {
        // Apply the optimized configuration
        await this.applyCommunicationOptimization(
          sourceService,
          targetService,
          optimizedConfig
        );
      }

      return {
        success: testResult.success,
        optimizedConfig,
        error: testResult.error,
      };

    } catch (error) {
      console.error('Service communication optimization failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Implement intelligent cache coordination across services
   */
  async coordinateCache(
    operation: 'invalidate' | 'warm' | 'sync',
    cacheKeys: string[],
    services: string[]
  ): Promise<{
    success: boolean;
    results?: Record<string, boolean>;
    error?: string;
  }> {
    try {
      const startTime = performance.now();
      const results: Record<string, boolean> = {};

      // Execute cache operations across all services
      const cachePromises = services.map(async (service) => {
        try {
          const serviceResult = await this.executeCacheOperation(service, operation, cacheKeys);
          results[service] = serviceResult;
          return serviceResult;
        } catch (error) {
          console.error(`Cache operation failed for service ${service}:`, error);
          results[service] = false;
          return false;
        }
      });

      await Promise.allSettled(cachePromises);

      const totalTime = performance.now() - startTime;
      const successCount = Object.values(results).filter(Boolean).length;

      // Log cache coordination performance
      await performanceMonitoring.logCacheEfficiency(
        (successCount / services.length) * 100,
        'cross-service-cache',
        'system-coordinator',
        undefined,
        {
          operation,
          serviceCount: services.length,
          successCount,
          totalTime,
        }
      );

      return {
        success: successCount === services.length,
        results,
      };

    } catch (error) {
      console.error('Cache coordination failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Monitor and optimize real-time update propagation
   */
  async optimizeRealtimeUpdates(
    updateType: string,
    affectedServices: string[],
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<{
    success: boolean;
    propagationTime?: number;
    error?: string;
  }> {
    try {
      const startTime = performance.now();
      
      // Determine optimal propagation strategy based on priority and service load
      const strategy = await this.determineOptimalPropagationStrategy(
        affectedServices,
        priority
      );

      // Execute real-time update propagation
      const propagationResult = await this.executePropagationStrategy(
        updateType,
        affectedServices,
        strategy
      );

      const propagationTime = performance.now() - startTime;

      // Log real-time update performance
      await performanceMonitoring.logMetric({
        metricCategory: 'api_response',
        metricName: 'realtime_propagation',
        metricValue: propagationTime,
        metricUnit: 'milliseconds',
        serviceName: 'realtime-coordinator',
        requestContext: {
          updateType,
          serviceCount: affectedServices.length,
          priority,
          strategy: strategy.type,
        },
      });

      return {
        success: propagationResult.success,
        propagationTime,
        error: propagationResult.error,
      };

    } catch (error) {
      console.error('Real-time update optimization failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Private helper methods
   */

  private async getServicesHealth(): Promise<Record<string, any>> {
    const services = [
      'auth-service',
      'product-service', 
      'order-service',
      'cart-service',
      'inventory-service',
      'analytics-service',
      'notification-service',
      'realtime-service',
    ];

    const healthChecks = await Promise.allSettled(
      services.map(service => this.checkServiceHealth(service))
    );

    const servicesHealth: Record<string, any> = {};
    
    services.forEach((service, index) => {
      const result = healthChecks[index];
      if (result.status === 'fulfilled') {
        servicesHealth[service] = result.value;
      } else {
        servicesHealth[service] = {
          status: 'unhealthy',
          responseTime: -1,
          errorRate: 1,
          throughput: 0,
          lastCheck: new Date().toISOString(),
          error: result.reason,
        };
      }
    });

    return servicesHealth;
  }

  private async checkServiceHealth(service: string): Promise<any> {
    const cacheKey = `health-${service}`;
    const cached = this.serviceHealthCache.get(cacheKey);
    
    // Use cached result if recent (30 seconds)
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.data;
    }

    const startTime = performance.now();
    
    try {
      // Check circuit breaker
      if (this.isCircuitBreakerOpen(service)) {
        return {
          status: 'offline',
          responseTime: -1,
          errorRate: 1,
          throughput: 0,
          lastCheck: new Date().toISOString(),
          circuitBreakerOpen: true,
        };
      }

      // Perform health check (simplified - would call actual health endpoints)
      await this.performHealthCheck(service);
      
      const responseTime = performance.now() - startTime;
      
      // Get error rate from recent metrics
      const errorRate = await this.getServiceErrorRate(service);
      
      // Get throughput from recent metrics  
      const throughput = await this.getServiceThroughput(service);
      
      const health = {
        status: this.determineServiceStatus(responseTime, errorRate, throughput),
        responseTime,
        errorRate,
        throughput,
        lastCheck: new Date().toISOString(),
      };

      // Cache the result
      this.serviceHealthCache.set(cacheKey, {
        data: health,
        timestamp: Date.now(),
      });

      // Reset circuit breaker on success
      this.resetCircuitBreaker(service);

      return health;

    } catch (error) {
      // Record failure for circuit breaker
      this.recordCircuitBreakerFailure(service);
      
      throw error;
    }
  }

  private async getPerformanceMetrics(): Promise<any> {
    const { data: recentMetrics } = await supabase
      .from('system_performance_metrics')
      .select('*')
      .gte('metric_timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('metric_timestamp', { ascending: false });

    if (!recentMetrics || recentMetrics.length === 0) {
      return {
        averageResponseTime: 0,
        queryPerformance: 0,
        cacheHitRatio: 0,
        memoryUsage: 0,
      };
    }

    const queryMetrics = recentMetrics.filter(m => m.metric_category === 'query_performance');
    const apiMetrics = recentMetrics.filter(m => m.metric_category === 'api_response');
    const cacheMetrics = recentMetrics.filter(m => m.metric_category === 'cache_efficiency');
    const memoryMetrics = recentMetrics.filter(m => m.metric_category === 'memory_usage');

    return {
      averageResponseTime: this.calculateAverage(apiMetrics, 'metric_value'),
      queryPerformance: this.calculateAverage(queryMetrics, 'metric_value'),
      cacheHitRatio: this.calculateAverage(cacheMetrics, 'metric_value') / 100,
      memoryUsage: this.calculateAverage(memoryMetrics, 'metric_value'),
    };
  }

  private async getSecurityStatus(): Promise<any> {
    const { data: recentViolations } = await supabase
      .from('system_error_logs')
      .select('*')
      .eq('error_category', 'security')
      .gte('error_timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return {
      violationCount: recentViolations?.length || 0,
      auditCompliance: 95, // This would come from actual audit results
      lastSecurityScan: new Date().toISOString(),
    };
  }

  private calculateOverallHealth(services: any, performance: any, security: any): number {
    // Calculate weighted health score
    const serviceScore = this.calculateServiceScore(services);
    const performanceScore = this.calculatePerformanceScore(performance);
    const securityScore = this.calculateSecurityScore(security);

    // Weighted average: services 40%, performance 40%, security 20%
    return Math.round(serviceScore * 0.4 + performanceScore * 0.4 + securityScore * 0.2);
  }

  private calculateServiceScore(services: Record<string, any>): number {
    const serviceStatuses = Object.values(services);
    const healthyCount = serviceStatuses.filter(s => s.status === 'healthy').length;
    return (healthyCount / serviceStatuses.length) * 100;
  }

  private calculatePerformanceScore(performance: any): number {
    let score = 100;
    
    // Penalize for slow response times
    if (performance.averageResponseTime > 500) score -= 20;
    else if (performance.averageResponseTime > 200) score -= 10;
    
    // Penalize for slow queries
    if (performance.queryPerformance > 300) score -= 20;
    else if (performance.queryPerformance > 150) score -= 10;
    
    // Penalize for low cache hit ratio
    if (performance.cacheHitRatio < 0.7) score -= 15;
    else if (performance.cacheHitRatio < 0.85) score -= 5;
    
    // Penalize for high memory usage
    if (performance.memoryUsage > 80) score -= 15;
    else if (performance.memoryUsage > 60) score -= 5;
    
    return Math.max(0, score);
  }

  private calculateSecurityScore(security: any): number {
    let score = 100;
    
    // Penalize for security violations
    score -= Math.min(security.violationCount * 10, 50);
    
    // Use audit compliance directly
    score = Math.min(score, security.auditCompliance);
    
    return Math.max(0, score);
  }

  private generateHealthRecommendations(services: any, performance: any, security: any): string[] {
    const recommendations: string[] = [];

    // Service recommendations
    const unhealthyServices = Object.entries(services)
      .filter(([_, service]: [string, any]) => service.status !== 'healthy')
      .map(([name, _]) => name);

    if (unhealthyServices.length > 0) {
      recommendations.push(`Investigate unhealthy services: ${unhealthyServices.join(', ')}`);
    }

    // Performance recommendations
    if (performance.averageResponseTime > 500) {
      recommendations.push('Optimize API response times - consider caching and query optimization');
    }

    if (performance.cacheHitRatio < 0.8) {
      recommendations.push('Improve cache efficiency - review cache strategies and TTL settings');
    }

    if (performance.memoryUsage > 70) {
      recommendations.push('Monitor memory usage - consider optimization or scaling');
    }

    // Security recommendations
    if (security.violationCount > 0) {
      recommendations.push('Address security violations and strengthen monitoring');
    }

    if (recommendations.length === 0) {
      recommendations.push('System health is optimal - maintain current monitoring');
    }

    return recommendations;
  }

  private calculateAverage(metrics: any[], field: string): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, metric) => acc + (metric[field] || 0), 0);
    return sum / metrics.length;
  }

  // Circuit breaker implementation
  private isCircuitBreakerOpen(service: string): boolean {
    const breaker = this.circuitBreakers.get(service);
    if (!breaker) return false;
    
    // Reset if enough time has passed
    if (breaker.isOpen && Date.now() - breaker.lastFailure > 60000) {
      breaker.isOpen = false;
      breaker.failures = 0;
    }
    
    return breaker.isOpen;
  }

  private recordCircuitBreakerFailure(service: string): void {
    const breaker = this.circuitBreakers.get(service) || {
      failures: 0,
      lastFailure: 0,
      isOpen: false,
    };
    
    breaker.failures++;
    breaker.lastFailure = Date.now();
    
    // Open circuit breaker after 5 failures
    if (breaker.failures >= 5) {
      breaker.isOpen = true;
    }
    
    this.circuitBreakers.set(service, breaker);
  }

  private resetCircuitBreaker(service: string): void {
    const breaker = this.circuitBreakers.get(service);
    if (breaker) {
      breaker.failures = 0;
      breaker.isOpen = false;
    }
  }

  // Additional helper methods would be implemented here...
  private async performHealthCheck(service: string): Promise<void> {
    // Simplified health check - would make actual HTTP requests to service health endpoints
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  }

  private async getServiceErrorRate(service: string): Promise<number> {
    // Get error rate from metrics - simplified implementation
    return Math.random() * 0.1; // 0-10% error rate
  }

  private async getServiceThroughput(service: string): Promise<number> {
    // Get throughput from metrics - simplified implementation
    return Math.random() * 1000; // 0-1000 requests/second
  }

  private determineServiceStatus(responseTime: number, errorRate: number, throughput: number): string {
    if (errorRate > 0.1 || responseTime > 1000) return 'unhealthy';
    if (errorRate > 0.05 || responseTime > 500) return 'degraded';
    return 'healthy';
  }

  private sortOperationsByPriority(operations: any[]): any[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return operations.sort((a, b) => {
      const aPriority = priorityOrder[a.priority || 'medium'];
      const bPriority = priorityOrder[b.priority || 'medium'];
      return aPriority - bPriority;
    });
  }

  private async executeCoordinatedOperations(operations: any[], config: any, operationId: string): Promise<any> {
    // Simplified coordination implementation
    const results = await Promise.allSettled(
      operations.map(op => op.operation())
    );
    
    return {
      data: results.map(r => r.status === 'fulfilled' ? r.value : null),
      errors: results.filter(r => r.status === 'rejected').map(r => r.reason),
      serviceTimings: operations.reduce((acc, op, index) => {
        acc[op.service] = Math.random() * 1000; // Simplified timing
        return acc;
      }, {}),
    };
  }

  private async logCoordinationFailure(operationName: string, error: any, operation: ServiceOperation): Promise<void> {
    await supabase.rpc('log_system_error', {
      p_error_level: 'error',
      p_error_category: 'integration',
      p_error_message: `Service coordination failed: ${operationName}`,
      p_affected_service: 'system-coordinator',
      p_error_context: {
        operation,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }

  private analyzeAndOptimizeCommunication(performanceData: any[], type: string): any {
    // Analyze historical data and return optimized configuration
    return {
      batchSize: type === 'batch' ? 50 : undefined,
      timeout: 5000,
      retryStrategy: 'exponential',
      caching: type === 'query',
    };
  }

  private async testOptimizedConfiguration(source: string, target: string, config: any): Promise<any> {
    // Test the configuration - simplified implementation
    return { success: true };
  }

  private async applyCommunicationOptimization(source: string, target: string, config: any): Promise<void> {
    // Apply the optimized configuration - would update service configs
  }

  private async executeCacheOperation(service: string, operation: string, keys: string[]): Promise<boolean> {
    // Execute cache operation on specific service - simplified implementation
    return Math.random() > 0.1; // 90% success rate
  }

  private async determineOptimalPropagationStrategy(services: string[], priority: string): Promise<any> {
    return {
      type: priority === 'high' ? 'immediate' : 'batched',
      batchSize: priority === 'low' ? 10 : 1,
    };
  }

  private async executePropagationStrategy(updateType: string, services: string[], strategy: any): Promise<any> {
    // Execute the propagation strategy - simplified implementation
    return { success: true };
  }
}

// Export singleton instance
export const systemHealth = new SystemHealthMonitoringService();

// Export types for use in other modules
export type { SystemHealthMetrics, ServiceCoordinationOptions };
export { SystemHealthMetricsSchema, ServiceCoordinationConfig };