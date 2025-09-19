import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useCallback } from 'react';
import {
  advancedAnalyticsService,
  AnalyticsTimeframe,
  AdvancedReport,
  CrossFeatureMetrics,
  Insight
} from '../../services/analytics/advancedAnalyticsService';
import { useCurrentUser } from '../useAuth';
import { usePermissions } from '../role-based/useUnifiedRole';
import { useUnifiedRealtime } from '../useUnifiedRealtime';
import { crossRoleAnalyticsKeys } from '../../utils/queryKeyFactory';

export interface AnalyticsFilters {
  timeframe: AnalyticsTimeframe;
  reportType: 'executive' | 'operational' | 'marketing' | 'inventory';
  includeForecasting: boolean;
  minimumInsightImpact: 'high' | 'medium' | 'low';
}

export function useAdvancedAnalytics() {
  const { data: user } = useCurrentUser();
  const { hasPermission } = usePermissions();
  const { refreshAll } = useUnifiedRealtime();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<AnalyticsFilters>({
    timeframe: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date(),
      granularity: 'day'
    },
    reportType: 'executive',
    includeForecasting: true,
    minimumInsightImpact: 'medium'
  });

  // Permission checks for different analytics levels
  const canViewExecutiveAnalytics = hasPermission('executive.analytics.view');
  const canViewAdvancedMetrics = hasPermission('analytics.advanced.view');
  const canGenerateReports = hasPermission('analytics.reports.generate');
  const canViewForecast = hasPermission('analytics.forecasting.view');

  // Cross-feature metrics query
  const crossFeatureMetricsQuery = useQuery({
    queryKey: crossRoleAnalyticsKeys.correlationsWithDateRange(['all'], JSON.stringify(filters.timeframe), user?.id),
    queryFn: async (): Promise<CrossFeatureMetrics> => {
      if (!user?.id) throw new Error('Authentication required');

      return await advancedAnalyticsService.generateCrossFeatureMetrics(
        filters.timeframe,
        user.id
      );
    },
    enabled: !!user?.id && canViewAdvancedMetrics,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes
  });

  // Advanced report generation
  const reportQuery = useQuery({
    queryKey: crossRoleAnalyticsKeys.dashboardWithFilters(filters, user?.id),
    queryFn: async (): Promise<AdvancedReport> => {
      if (!user?.id) throw new Error('Authentication required');

      return await advancedAnalyticsService.generateAdvancedReport(
        filters.timeframe,
        user.id,
        filters.reportType
      );
    },
    enabled: !!user?.id && canGenerateReports,
    staleTime: 15 * 60 * 1000, // 15 minutes for reports
    refetchOnWindowFocus: false,
  });

  // Real-time insights query (for high-priority alerts)
  const insightsQuery = useQuery({
    queryKey: crossRoleAnalyticsKeys.summaryWithScope(filters.minimumInsightImpact, user?.id),
    queryFn: async (): Promise<Insight[]> => {
      if (!reportQuery.data) return [];

      return reportQuery.data.insights.filter(
        insight => {
          const impactOrder = { low: 0, medium: 1, high: 2 };
          return impactOrder[insight.impact] >= impactOrder[filters.minimumInsightImpact];
        }
      );
    },
    enabled: !!reportQuery.data && canViewAdvancedMetrics,
    staleTime: 2 * 60 * 1000, // 2 minutes for insights
    refetchInterval: 5 * 60 * 1000, // Check for new insights every 5 minutes
  });

  // Manual report generation mutation
  const generateReportMutation = useMutation({
    mutationFn: async (customFilters?: Partial<AnalyticsFilters>) => {
      if (!user?.id) throw new Error('Authentication required');

      const reportFilters = { ...filters, ...customFilters };

      return await advancedAnalyticsService.generateAdvancedReport(
        reportFilters.timeframe,
        user.id,
        reportFilters.reportType
      );
    },
    onSuccess: (report) => {
      // Update cache with new report
      queryClient.setQueryData(crossRoleAnalyticsKeys.dashboardWithFilters(filters, user?.id), report);

      // Trigger real-time data refresh to ensure latest data
      refreshAll();
    },
    onError: (error) => {
      console.error('Report generation failed:', error);
    }
  });

  // Computed values and helpers
  const metrics = useMemo(() => crossFeatureMetricsQuery.data, [crossFeatureMetricsQuery.data]);
  const report = useMemo(() => reportQuery.data, [reportQuery.data]);
  const insights = useMemo(() => insightsQuery.data || [], [insightsQuery.data]);

  // Key performance indicators
  const kpis = useMemo(() => {
    if (!metrics) return null;

    return {
      totalRevenue: metrics.sales.totalRevenue,
      inventoryHealth: 1 - (metrics.inventory.stockOuts / Math.max(metrics.inventory.totalValue, 1)),
      marketingEfficiency: metrics.marketing.conversionRate,
      systemHealth: metrics.operations.systemHealth,
      overallScore: (
        (metrics.sales.totalRevenue > 10000 ? 1 : metrics.sales.totalRevenue / 10000) +
        (1 - (metrics.inventory.stockOuts / Math.max(metrics.inventory.totalValue, 1))) +
        metrics.marketing.conversionRate * 10 +
        metrics.operations.systemHealth
      ) / 4
    };
  }, [metrics]);

  // Critical alerts (high-impact insights)
  const criticalAlerts = useMemo(() => {
    return insights.filter(insight =>
      insight.impact === 'high' &&
      (insight.type === 'warning' || insight.type === 'opportunity')
    );
  }, [insights]);

  // Trend summary
  const trendSummary = useMemo(() => {
    if (!report?.trends) return null;

    const increasing = report.trends.filter(t => t.trend === 'increasing').length;
    const decreasing = report.trends.filter(t => t.trend === 'decreasing').length;
    const stable = report.trends.filter(t => t.trend === 'stable').length;

    return {
      increasing,
      decreasing,
      stable,
      total: report.trends.length,
      overallTrend: increasing > decreasing ? 'positive' : decreasing > increasing ? 'negative' : 'neutral'
    };
  }, [report?.trends]);

  // Filter update helpers
  const updateTimeframe = useCallback((timeframe: AnalyticsTimeframe) => {
    setFilters(prev => ({ ...prev, timeframe }));
  }, []);

  const updateReportType = useCallback((reportType: AnalyticsFilters['reportType']) => {
    setFilters(prev => ({ ...prev, reportType }));
  }, []);

  const updateInsightLevel = useCallback((level: AnalyticsFilters['minimumInsightImpact']) => {
    setFilters(prev => ({ ...prev, minimumInsightImpact: level }));
  }, []);

  // Refresh all analytics data
  const refreshAnalytics = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: crossRoleAnalyticsKeys.all(user?.id) }),
      refreshAll()
    ]);
  }, [queryClient, refreshAll]);

  // Export data functionality
  const exportReport = useCallback(async (format: 'json' | 'csv' = 'json') => {
    if (!report) return null;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      return URL.createObjectURL(blob);
    }

    // CSV export for metrics
    if (format === 'csv' && metrics) {
      const csvData = [
        ['Metric', 'Value', 'Category'],
        ['Total Revenue', metrics.sales.totalRevenue.toString(), 'Sales'],
        ['Order Count', metrics.sales.orderCount.toString(), 'Sales'],
        ['Inventory Value', metrics.inventory.totalValue.toString(), 'Inventory'],
        ['Stock Outs', metrics.inventory.stockOuts.toString(), 'Inventory'],
        ['Active Campaigns', metrics.marketing.campaignsActive.toString(), 'Marketing'],
        ['Conversion Rate', metrics.marketing.conversionRate.toString(), 'Marketing'],
        ['System Health', metrics.operations.systemHealth.toString(), 'Operations'],
        ['Error Rate', metrics.operations.errorRate.toString(), 'Operations']
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      return URL.createObjectURL(blob);
    }

    return null;
  }, [report, metrics]);

  return {
    // Data
    metrics,
    report,
    insights,
    kpis,
    criticalAlerts,
    trendSummary,

    // Loading states
    isLoadingMetrics: crossFeatureMetricsQuery.isLoading,
    isLoadingReport: reportQuery.isLoading,
    isLoadingInsights: insightsQuery.isLoading,
    isGeneratingReport: generateReportMutation.isPending,

    // Error states
    metricsError: crossFeatureMetricsQuery.error,
    reportError: reportQuery.error,
    insightsError: insightsQuery.error,

    // Permissions
    canViewExecutiveAnalytics,
    canViewAdvancedMetrics,
    canGenerateReports,
    canViewForecast,

    // Actions
    generateReport: generateReportMutation.mutate,
    generateReportAsync: generateReportMutation.mutateAsync,
    refreshAnalytics,
    exportReport,

    // Filters
    filters,
    updateTimeframe,
    updateReportType,
    updateInsightLevel,

    // Helpers
    refetch: crossFeatureMetricsQuery.refetch,
    refetchReport: reportQuery.refetch,
  };
}

// Specialized hook for real-time insights monitoring
export function useRealtimeInsights() {
  const { insights, criticalAlerts, refreshAnalytics } = useAdvancedAnalytics();
  const [lastAlertCount, setLastAlertCount] = useState(0);
  const [newAlertsDetected, setNewAlertsDetected] = useState(false);

  // Monitor for new critical alerts
  useMemo(() => {
    if (criticalAlerts.length > lastAlertCount) {
      setNewAlertsDetected(true);
      setLastAlertCount(criticalAlerts.length);

      // Auto-refresh data when new alerts are detected
      setTimeout(() => {
        refreshAnalytics();
        setNewAlertsDetected(false);
      }, 2000);
    }
  }, [criticalAlerts.length, lastAlertCount, refreshAnalytics]);

  return {
    insights,
    criticalAlerts,
    newAlertsDetected,
    hasNewAlerts: criticalAlerts.length > 0,
    alertCount: criticalAlerts.length,
    acknowledgeAlerts: () => setNewAlertsDetected(false)
  };
}

// Quick metrics hook for dashboard widgets
export function useQuickMetrics() {
  const { metrics, kpis, isLoadingMetrics } = useAdvancedAnalytics();

  const quickStats = useMemo(() => {
    if (!metrics || !kpis) return null;

    return {
      revenue: {
        value: metrics.sales.totalRevenue,
        formatted: `$${metrics.sales.totalRevenue.toLocaleString()}`,
        trend: 'increasing' // This would come from trend analysis
      },
      orders: {
        value: metrics.sales.orderCount,
        formatted: metrics.sales.orderCount.toString(),
        trend: 'stable'
      },
      inventory: {
        value: kpis.inventoryHealth * 100,
        formatted: `${(kpis.inventoryHealth * 100).toFixed(1)}%`,
        trend: metrics.inventory.stockOuts > 5 ? 'decreasing' : 'stable'
      },
      performance: {
        value: kpis.overallScore * 100,
        formatted: `${(kpis.overallScore * 100).toFixed(0)}%`,
        trend: kpis.overallScore > 0.8 ? 'increasing' : 'stable'
      }
    };
  }, [metrics, kpis]);

  return {
    quickStats,
    isLoading: isLoadingMetrics,
    overallHealth: kpis?.overallScore || 0
  };
}