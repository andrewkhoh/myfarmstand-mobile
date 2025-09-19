import { supabase } from '../../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  source: string;
  metadata?: Record<string, any>;
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  enabled: boolean;
}

export interface PerformanceReport {
  id: string;
  timeframe: {
    start: Date;
    end: Date;
  };
  metrics: {
    loadTime: {
      average: number;
      p95: number;
      p99: number;
    };
    memory: {
      average: number;
      peak: number;
      leaks: number;
    };
    network: {
      requests: number;
      failures: number;
      averageResponseTime: number;
    };
    battery: {
      usage: number;
      efficiency: number;
    };
    fps: {
      average: number;
      drops: number;
      stability: number;
    };
  };
  recommendations: string[];
  issues: PerformanceIssue[];
  generatedAt: Date;
}

export interface PerformanceIssue {
  id: string;
  type: 'memory_leak' | 'slow_render' | 'network_timeout' | 'battery_drain' | 'fps_drop';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: string;
  firstSeen: Date;
  lastSeen: Date;
  occurrences: number;
  impact: {
    userExperience: number; // 0-10 scale
    performance: number;    // 0-10 scale
    stability: number;      // 0-10 scale
  };
  suggestions: string[];
}

export interface BundleAnalysis {
  totalSize: number;
  chunks: Array<{
    name: string;
    size: number;
    modules: number;
  }>;
  duplicates: Array<{
    module: string;
    size: number;
    locations: string[];
  }>;
  unusedCode: Array<{
    file: string;
    size: number;
    percentage: number;
  }>;
  recommendations: string[];
}

class PerformanceMonitorService {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private thresholds: PerformanceThreshold[] = [];
  private isMonitoring = false;
  private observers: {
    memoryObserver?: PerformanceObserver;
    navigationObserver?: PerformanceObserver;
    paintObserver?: PerformanceObserver;
  } = {};

  constructor() {
    this.initializeDefaultThresholds();
    this.startMonitoring();
  }

  // Core monitoring functionality
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Initialize performance observers
    this.initializePerformanceObservers();

    // Start periodic metric collection
    this.startPeriodicCollection();

    // Monitor React Native specific metrics
    this.startReactNativeMonitoring();

    console.log('Performance monitoring started');
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    // Clean up observers
    Object.values(this.observers).forEach(observer => {
      observer?.disconnect();
    });

    console.log('Performance monitoring stopped');
  }

  // Metric recording
  async recordMetric(
    name: string,
    value: number,
    unit: string = 'ms',
    source: string = 'app',
    metadata?: Record<string, any>
  ): Promise<void> {
    const metric: PerformanceMetric = {
      id: `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      value,
      unit,
      timestamp: new Date(),
      source,
      metadata
    };

    // Store in memory
    const metricArray = this.metrics.get(name) || [];
    metricArray.push(metric);

    // Keep only last 100 metrics per type
    if (metricArray.length > 100) {
      metricArray.shift();
    }

    this.metrics.set(name, metricArray);

    // Check thresholds
    await this.checkThresholds(metric);

    // Persist critical metrics
    if (this.isCriticalMetric(name)) {
      await this.persistMetric(metric);
    }
  }

  // Screen transition monitoring
  async recordScreenTransition(fromScreen: string, toScreen: string, duration: number): Promise<void> {
    await this.recordMetric('screen_transition', duration, 'ms', 'navigation', {
      fromScreen,
      toScreen,
      transitionType: 'navigation'
    });

    // Detect slow transitions
    if (duration > 1000) {
      await this.recordIssue({
        type: 'slow_render',
        severity: duration > 2000 ? 'high' : 'medium',
        description: `Slow screen transition from ${fromScreen} to ${toScreen}`,
        location: `${fromScreen} -> ${toScreen}`,
        impact: {
          userExperience: Math.min(10, duration / 200),
          performance: Math.min(10, duration / 150),
          stability: 5
        },
        suggestions: [
          'Consider lazy loading for heavy components',
          'Optimize data loading strategies',
          'Review component render cycles'
        ]
      });
    }
  }

  // Component render monitoring
  async recordComponentRender(componentName: string, renderTime: number, props?: any): Promise<void> {
    await this.recordMetric('component_render', renderTime, 'ms', 'react', {
      componentName,
      propsCount: props ? Object.keys(props).length : 0
    });

    // Detect expensive renders
    if (renderTime > 16) { // More than one frame at 60fps
      await this.recordIssue({
        type: 'slow_render',
        severity: renderTime > 50 ? 'high' : 'medium',
        description: `Slow render detected in ${componentName}`,
        location: componentName,
        impact: {
          userExperience: Math.min(10, renderTime / 10),
          performance: Math.min(10, renderTime / 8),
          stability: 6
        },
        suggestions: [
          'Use React.memo() for expensive components',
          'Optimize useEffect dependencies',
          'Consider component splitting'
        ]
      });
    }
  }

  // Network request monitoring
  async recordNetworkRequest(
    url: string,
    method: string,
    status: number,
    duration: number,
    size?: number
  ): Promise<void> {
    await this.recordMetric('network_request', duration, 'ms', 'network', {
      url,
      method,
      status,
      size,
      success: status >= 200 && status < 400
    });

    // Detect slow or failed requests
    if (duration > 5000 || status >= 400) {
      await this.recordIssue({
        type: 'network_timeout',
        severity: status >= 500 ? 'high' : 'medium',
        description: `${status >= 400 ? 'Failed' : 'Slow'} network request to ${url}`,
        location: url,
        impact: {
          userExperience: status >= 400 ? 8 : Math.min(8, duration / 1000),
          performance: Math.min(10, duration / 500),
          stability: status >= 500 ? 7 : 4
        },
        suggestions: [
          'Implement request timeout handling',
          'Add retry logic for failed requests',
          'Consider request caching strategies'
        ]
      });
    }
  }

  // Memory monitoring
  async recordMemoryUsage(): Promise<void> {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;

      await this.recordMetric('memory_used', memory.usedJSHeapSize, 'bytes', 'browser');
      await this.recordMetric('memory_total', memory.totalJSHeapSize, 'bytes', 'browser');
      await this.recordMetric('memory_limit', memory.jsHeapSizeLimit, 'bytes', 'browser');

      // Check for potential memory leaks
      const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      if (usageRatio > 0.8) {
        await this.recordIssue({
          type: 'memory_leak',
          severity: usageRatio > 0.9 ? 'critical' : 'high',
          description: `High memory usage detected: ${(usageRatio * 100).toFixed(1)}%`,
          location: 'global',
          impact: {
            userExperience: Math.min(10, usageRatio * 12),
            performance: Math.min(10, usageRatio * 10),
            stability: Math.min(10, usageRatio * 8)
          },
          suggestions: [
            'Check for component memory leaks',
            'Review event listener cleanup',
            'Optimize large data structures'
          ]
        });
      }
    }
  }

  // Bundle analysis
  async analyzeBundleSize(): Promise<BundleAnalysis> {
    // This would integrate with Metro bundler or other build tools
    // For now, return mock data structure

    return {
      totalSize: 2.5 * 1024 * 1024, // 2.5MB
      chunks: [
        { name: 'main', size: 1.8 * 1024 * 1024, modules: 245 },
        { name: 'vendor', size: 0.5 * 1024 * 1024, modules: 89 },
        { name: 'assets', size: 0.2 * 1024 * 1024, modules: 34 }
      ],
      duplicates: [
        {
          module: 'lodash',
          size: 50 * 1024,
          locations: ['src/utils', 'node_modules/some-package']
        }
      ],
      unusedCode: [
        {
          file: 'src/unused-component.tsx',
          size: 15 * 1024,
          percentage: 0.6
        }
      ],
      recommendations: [
        'Consider code splitting for vendor libraries',
        'Remove unused dependencies',
        'Implement dynamic imports for large features'
      ]
    };
  }

  // Performance report generation
  async generatePerformanceReport(timeframe: { start: Date; end: Date }): Promise<PerformanceReport> {
    const relevantMetrics = this.getMetricsInTimeframe(timeframe);
    const issues = await this.getIssuesInTimeframe(timeframe);

    // Calculate aggregated metrics
    const loadTimeMetrics = relevantMetrics.get('screen_transition') || [];
    const memoryMetrics = relevantMetrics.get('memory_used') || [];
    const networkMetrics = relevantMetrics.get('network_request') || [];

    const report: PerformanceReport = {
      id: `report-${Date.now()}`,
      timeframe,
      metrics: {
        loadTime: {
          average: this.calculateAverage(loadTimeMetrics.map(m => m.value)),
          p95: this.calculatePercentile(loadTimeMetrics.map(m => m.value), 95),
          p99: this.calculatePercentile(loadTimeMetrics.map(m => m.value), 99)
        },
        memory: {
          average: this.calculateAverage(memoryMetrics.map(m => m.value)),
          peak: Math.max(...memoryMetrics.map(m => m.value), 0),
          leaks: issues.filter(i => i.type === 'memory_leak').length
        },
        network: {
          requests: networkMetrics.length,
          failures: networkMetrics.filter(m => m.metadata?.status >= 400).length,
          averageResponseTime: this.calculateAverage(networkMetrics.map(m => m.value))
        },
        battery: {
          usage: this.estimateBatteryUsage(relevantMetrics),
          efficiency: this.calculateBatteryEfficiency(relevantMetrics)
        },
        fps: {
          average: 58, // Mock data
          drops: issues.filter(i => i.type === 'fps_drop').length,
          stability: 92
        }
      },
      recommendations: this.generateRecommendations(relevantMetrics, issues),
      issues,
      generatedAt: new Date()
    };

    // Store report
    await this.storePerformanceReport(report);

    return report;
  }

  // Optimization suggestions
  async getOptimizationSuggestions(): Promise<string[]> {
    const suggestions: string[] = [];
    const recentMetrics = this.getRecentMetrics(5 * 60 * 1000); // Last 5 minutes

    // Analyze render performance
    const renderMetrics = recentMetrics.get('component_render') || [];
    if (renderMetrics.some(m => m.value > 16)) {
      suggestions.push('Consider optimizing slow-rendering components with React.memo()');
    }

    // Analyze memory usage
    const memoryMetrics = recentMetrics.get('memory_used') || [];
    if (memoryMetrics.some(m => m.value > 100 * 1024 * 1024)) { // > 100MB
      suggestions.push('High memory usage detected - review for potential memory leaks');
    }

    // Analyze network performance
    const networkMetrics = recentMetrics.get('network_request') || [];
    const slowRequests = networkMetrics.filter(m => m.value > 3000);
    if (slowRequests.length > 0) {
      suggestions.push('Implement request caching and optimize slow API calls');
    }

    return suggestions;
  }

  // Private helper methods
  private initializeDefaultThresholds(): void {
    this.thresholds = [
      { metric: 'screen_transition', warning: 500, critical: 1000, enabled: true },
      { metric: 'component_render', warning: 16, critical: 50, enabled: true },
      { metric: 'network_request', warning: 2000, critical: 5000, enabled: true },
      { metric: 'memory_used', warning: 80 * 1024 * 1024, critical: 120 * 1024 * 1024, enabled: true }
    ];
  }

  private initializePerformanceObservers(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      // Navigation timing observer
      try {
        this.observers.navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              this.recordMetric('page_load', entry.duration, 'ms', 'browser');
            }
          }
        });
        this.observers.navigationObserver.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        console.warn('Navigation observer not supported:', error);
      }

      // Paint timing observer
      try {
        this.observers.paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric(entry.name, entry.startTime, 'ms', 'browser');
          }
        });
        this.observers.paintObserver.observe({ entryTypes: ['paint'] });
      } catch (error) {
        console.warn('Paint observer not supported:', error);
      }
    }
  }

  private startPeriodicCollection(): void {
    // Collect memory metrics every 30 seconds
    setInterval(() => {
      if (this.isMonitoring) {
        this.recordMemoryUsage();
      }
    }, 30000);
  }

  private startReactNativeMonitoring(): void {
    // React Native specific monitoring would go here
    // This could include bridge communication monitoring, etc.
  }

  private async checkThresholds(metric: PerformanceMetric): Promise<void> {
    const threshold = this.thresholds.find(t => t.metric === metric.name && t.enabled);
    if (!threshold) return;

    if (metric.value > threshold.critical) {
      await this.recordIssue({
        type: this.getIssueTypeForMetric(metric.name),
        severity: 'critical',
        description: `Critical performance threshold exceeded for ${metric.name}`,
        location: metric.source,
        impact: {
          userExperience: 9,
          performance: 10,
          stability: 8
        },
        suggestions: [`Immediate optimization required for ${metric.name}`]
      });
    } else if (metric.value > threshold.warning) {
      await this.recordIssue({
        type: this.getIssueTypeForMetric(metric.name),
        severity: 'medium',
        description: `Performance warning threshold exceeded for ${metric.name}`,
        location: metric.source,
        impact: {
          userExperience: 6,
          performance: 7,
          stability: 5
        },
        suggestions: [`Consider optimizing ${metric.name}`]
      });
    }
  }

  private getIssueTypeForMetric(metricName: string): PerformanceIssue['type'] {
    if (metricName.includes('render') || metricName.includes('transition')) return 'slow_render';
    if (metricName.includes('memory')) return 'memory_leak';
    if (metricName.includes('network')) return 'network_timeout';
    if (metricName.includes('fps')) return 'fps_drop';
    return 'slow_render';
  }

  private async recordIssue(issueData: Omit<PerformanceIssue, 'id' | 'firstSeen' | 'lastSeen' | 'occurrences'>): Promise<void> {
    const issue: PerformanceIssue = {
      id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      firstSeen: new Date(),
      lastSeen: new Date(),
      occurrences: 1,
      ...issueData
    };

    // Store issue (would be implemented with actual storage)
    console.warn('Performance issue detected:', issue);
  }

  private isCriticalMetric(name: string): boolean {
    return ['screen_transition', 'memory_used', 'network_request'].includes(name);
  }

  private async persistMetric(metric: PerformanceMetric): Promise<void> {
    try {
      // TODO: Create performance_metrics table in database
      // Temporarily disabled to prevent 404 errors
      // await supabase
      //   .from('performance_metrics')
      //   .insert({
      //     id: metric.id,
      //     name: metric.name,
      //     value: metric.value,
      //     unit: metric.unit,
      //     timestamp: metric.timestamp.toISOString(),
      //     source: metric.source,
      //     metadata: metric.metadata
      //   });
    } catch (error) {
      console.error('Failed to persist metric:', error);
    }
  }

  private getMetricsInTimeframe(timeframe: { start: Date; end: Date }): Map<string, PerformanceMetric[]> {
    const result = new Map<string, PerformanceMetric[]>();

    for (const [name, metrics] of this.metrics) {
      const filtered = metrics.filter(
        m => m.timestamp >= timeframe.start && m.timestamp <= timeframe.end
      );
      result.set(name, filtered);
    }

    return result;
  }

  private getRecentMetrics(timeWindowMs: number): Map<string, PerformanceMetric[]> {
    const cutoff = new Date(Date.now() - timeWindowMs);
    return this.getMetricsInTimeframe({ start: cutoff, end: new Date() });
  }

  private async getIssuesInTimeframe(timeframe: { start: Date; end: Date }): Promise<PerformanceIssue[]> {
    // This would query stored issues from database
    return [];
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  private estimateBatteryUsage(metrics: Map<string, PerformanceMetric[]>): number {
    // Simple battery usage estimation based on performance metrics
    let usage = 0;

    const networkRequests = metrics.get('network_request')?.length || 0;
    const renderOperations = metrics.get('component_render')?.length || 0;
    const memoryPeak = Math.max(...(metrics.get('memory_used')?.map(m => m.value) || [0]));

    usage += networkRequests * 0.1; // Network requests
    usage += renderOperations * 0.05; // Render operations
    usage += memoryPeak / (1024 * 1024) * 0.01; // Memory usage

    return Math.min(usage, 100);
  }

  private calculateBatteryEfficiency(metrics: Map<string, PerformanceMetric[]>): number {
    // Calculate efficiency based on work done vs resources consumed
    const totalWork = Array.from(metrics.values()).reduce((sum, metricArray) => sum + metricArray.length, 0);
    const batteryUsage = this.estimateBatteryUsage(metrics);

    if (batteryUsage === 0) return 100;
    return Math.max(0, 100 - (batteryUsage / Math.max(totalWork, 1)) * 100);
  }

  private generateRecommendations(
    metrics: Map<string, PerformanceMetric[]>,
    issues: PerformanceIssue[]
  ): string[] {
    const recommendations: string[] = [];

    // Based on issues
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push('Address critical performance issues immediately');
    }

    // Based on metrics
    const renderMetrics = metrics.get('component_render') || [];
    if (renderMetrics.some(m => m.value > 50)) {
      recommendations.push('Optimize component rendering performance');
    }

    const memoryMetrics = metrics.get('memory_used') || [];
    if (memoryMetrics.some(m => m.value > 100 * 1024 * 1024)) {
      recommendations.push('Implement memory optimization strategies');
    }

    return recommendations;
  }

  private async storePerformanceReport(report: PerformanceReport): Promise<void> {
    try {
      await supabase
        .from('performance_reports')
        .insert({
          id: report.id,
          timeframe: report.timeframe,
          metrics: report.metrics,
          recommendations: report.recommendations,
          issues: report.issues,
          generated_at: report.generatedAt.toISOString()
        });
    } catch (error) {
      console.error('Failed to store performance report:', error);
    }
  }
}

export const performanceMonitorService = new PerformanceMonitorService();