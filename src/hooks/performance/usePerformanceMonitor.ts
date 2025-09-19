import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef } from 'react';
import {
  performanceMonitorService,
  PerformanceReport,
  PerformanceMetric,
  BundleAnalysis
} from '../../services/performance/performanceMonitorService';
import { useCurrentUser } from '../useAuth';

export interface PerformanceConfig {
  enableComponentTracking: boolean;
  enableNetworkTracking: boolean;
  enableMemoryTracking: boolean;
  enableScreenTracking: boolean;
  reportingInterval: number; // minutes
}

export function usePerformanceMonitor(config?: Partial<PerformanceConfig>) {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const defaultConfig: PerformanceConfig = {
    enableComponentTracking: true,
    enableNetworkTracking: true,
    enableMemoryTracking: true,
    enableScreenTracking: true,
    reportingInterval: 60 // 1 hour
  };

  const finalConfig = { ...defaultConfig, ...config };

  // Performance report query
  const performanceReportQuery = useQuery({
    queryKey: ['performance-report', user?.id],
    queryFn: async () => {
      const end = new Date();
      const start = new Date(end.getTime() - finalConfig.reportingInterval * 60 * 1000);
      return await performanceMonitorService.generatePerformanceReport({ start, end });
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: finalConfig.reportingInterval * 60 * 1000, // Auto-refresh based on config
  });

  // Bundle analysis query
  const bundleAnalysisQuery = useQuery({
    queryKey: ['bundle-analysis'],
    queryFn: async () => {
      return await performanceMonitorService.analyzeBundleSize();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
  });

  // Optimization suggestions query
  const optimizationQuery = useQuery({
    queryKey: ['optimization-suggestions'],
    queryFn: async () => {
      return await performanceMonitorService.getOptimizationSuggestions();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
  });

  // Record metric mutation
  const recordMetricMutation = useMutation({
    mutationFn: async ({
      name,
      value,
      unit,
      source,
      metadata
    }: {
      name: string;
      value: number;
      unit?: string;
      source?: string;
      metadata?: Record<string, any>;
    }) => {
      await performanceMonitorService.recordMetric(name, value, unit, source, metadata);
    },
    onSuccess: () => {
      // Invalidate related queries after significant metrics
      queryClient.invalidateQueries({ queryKey: ['performance-report'] });
    }
  });

  // Helper functions for recording specific metrics
  const recordScreenTransition = useCallback(
    async (fromScreen: string, toScreen: string, duration: number) => {
      if (!finalConfig.enableScreenTracking) return;

      await performanceMonitorService.recordScreenTransition(fromScreen, toScreen, duration);

      // Invalidate queries if transition was slow
      if (duration > 1000) {
        queryClient.invalidateQueries({ queryKey: ['optimization-suggestions'] });
      }
    },
    [finalConfig.enableScreenTracking, queryClient]
  );

  const recordComponentRender = useCallback(
    async (componentName: string, renderTime: number, props?: any) => {
      if (!finalConfig.enableComponentTracking) return;

      await performanceMonitorService.recordComponentRender(componentName, renderTime, props);

      // Invalidate suggestions if render was slow
      if (renderTime > 16) {
        queryClient.invalidateQueries({ queryKey: ['optimization-suggestions'] });
      }
    },
    [finalConfig.enableComponentTracking, queryClient]
  );

  const recordNetworkRequest = useCallback(
    async (url: string, method: string, status: number, duration: number, size?: number) => {
      if (!finalConfig.enableNetworkTracking) return;

      await performanceMonitorService.recordNetworkRequest(url, method, status, duration, size);
    },
    [finalConfig.enableNetworkTracking]
  );

  const recordCustomMetric = useCallback(
    async (name: string, value: number, unit = 'ms', metadata?: Record<string, any>) => {
      await recordMetricMutation.mutateAsync({
        name,
        value,
        unit,
        source: 'custom',
        metadata
      });
    },
    [recordMetricMutation]
  );

  // Performance summary calculations
  const performanceSummary = useCallback(() => {
    const report = performanceReportQuery.data;
    if (!report) return null;

    const score = calculatePerformanceScore(report);
    const status = getPerformanceStatus(score);

    return {
      score,
      status,
      criticalIssues: report.issues.filter(i => i.severity === 'critical').length,
      recommendations: report.recommendations.length,
      lastUpdated: report.generatedAt
    };
  }, [performanceReportQuery.data]);

  // Real-time monitoring state
  const [isMonitoring, setIsMonitoring] = useState(false);

  const startMonitoring = useCallback(async () => {
    await performanceMonitorService.startMonitoring();
    setIsMonitoring(true);
  }, []);

  const stopMonitoring = useCallback(async () => {
    await performanceMonitorService.stopMonitoring();
    setIsMonitoring(false);
  }, []);

  // Auto-start monitoring when hook is used
  useEffect(() => {
    startMonitoring();
    return () => {
      stopMonitoring();
    };
  }, [startMonitoring, stopMonitoring]);

  return {
    // Data
    performanceReport: performanceReportQuery.data,
    bundleAnalysis: bundleAnalysisQuery.data,
    optimizationSuggestions: optimizationQuery.data || [],
    performanceSummary: performanceSummary(),

    // Loading states
    isLoadingReport: performanceReportQuery.isLoading,
    isLoadingBundle: bundleAnalysisQuery.isLoading,
    isLoadingOptimizations: optimizationQuery.isLoading,
    isRecordingMetric: recordMetricMutation.isPending,

    // Error states
    reportError: performanceReportQuery.error,
    bundleError: bundleAnalysisQuery.error,
    optimizationError: optimizationQuery.error,

    // Actions
    recordScreenTransition,
    recordComponentRender,
    recordNetworkRequest,
    recordCustomMetric,
    startMonitoring,
    stopMonitoring,

    // State
    isMonitoring,
    config: finalConfig,

    // Utilities
    refreshReport: performanceReportQuery.refetch,
    refreshBundle: bundleAnalysisQuery.refetch,
    refreshOptimizations: optimizationQuery.refetch,

    // Performance helpers
    getPerformanceGrade: () => {
      const summary = performanceSummary();
      if (!summary) return 'N/A';

      if (summary.score >= 90) return 'A';
      if (summary.score >= 80) return 'B';
      if (summary.score >= 70) return 'C';
      if (summary.score >= 60) return 'D';
      return 'F';
    },

    getHealthColor: () => {
      const summary = performanceSummary();
      if (!summary) return '#6c757d';

      switch (summary.status) {
        case 'excellent': return '#28a745';
        case 'good': return '#20c997';
        case 'fair': return '#ffc107';
        case 'poor': return '#fd7e14';
        case 'critical': return '#dc3545';
        default: return '#6c757d';
      }
    }
  };
}

// Hook for component performance tracking
export function useComponentPerformance(componentName: string) {
  const { recordComponentRender } = usePerformanceMonitor();
  const renderStartTime = useRef<number>();

  const startRender = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRender = useCallback(
    (props?: any) => {
      if (renderStartTime.current) {
        const renderTime = performance.now() - renderStartTime.current;
        recordComponentRender(componentName, renderTime, props);
        renderStartTime.current = undefined;
      }
    },
    [componentName, recordComponentRender]
  );

  // Auto-start timing on mount
  useEffect(() => {
    startRender();
    return endRender;
  }, [startRender, endRender]);

  return {
    startRender,
    endRender
  };
}

// Hook for network request performance tracking
export function useNetworkPerformance() {
  const { recordNetworkRequest } = usePerformanceMonitor();

  const trackRequest = useCallback(
    (url: string, method: string = 'GET') => {
      const startTime = performance.now();

      return {
        complete: (status: number, size?: number) => {
          const duration = performance.now() - startTime;
          recordNetworkRequest(url, method, status, duration, size);
        }
      };
    },
    [recordNetworkRequest]
  );

  return {
    trackRequest
  };
}

// Hook for screen transition performance tracking
export function useScreenPerformance() {
  const { recordScreenTransition } = usePerformanceMonitor();
  const [currentScreen, setCurrentScreen] = useState<string>('');
  const transitionStartTime = useRef<number>();

  const startTransition = useCallback((fromScreen: string, toScreen: string) => {
    setCurrentScreen(toScreen);
    transitionStartTime.current = performance.now();
  }, []);

  const endTransition = useCallback(
    (toScreen?: string) => {
      if (transitionStartTime.current && currentScreen) {
        const duration = performance.now() - transitionStartTime.current;
        recordScreenTransition(currentScreen, toScreen || 'unknown', duration);
        transitionStartTime.current = undefined;
      }
    },
    [currentScreen, recordScreenTransition]
  );

  return {
    startTransition,
    endTransition,
    currentScreen
  };
}

// Helper functions
function calculatePerformanceScore(report: PerformanceReport): number {
  let score = 100;

  // Deduct points for slow load times
  if (report.metrics.loadTime.average > 1000) {
    score -= Math.min(30, (report.metrics.loadTime.average - 1000) / 100);
  }

  // Deduct points for memory issues
  if (report.metrics.memory.leaks > 0) {
    score -= report.metrics.memory.leaks * 10;
  }

  // Deduct points for network failures
  const failureRate = report.metrics.network.failures / Math.max(report.metrics.network.requests, 1);
  score -= failureRate * 20;

  // Deduct points for critical issues
  const criticalIssues = report.issues.filter(i => i.severity === 'critical').length;
  score -= criticalIssues * 15;

  // Deduct points for high severity issues
  const highIssues = report.issues.filter(i => i.severity === 'high').length;
  score -= highIssues * 10;

  return Math.max(0, Math.round(score));
}

function getPerformanceStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  if (score >= 40) return 'poor';
  return 'critical';
}