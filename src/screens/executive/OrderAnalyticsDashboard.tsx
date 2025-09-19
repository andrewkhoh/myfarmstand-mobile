/**
 * Order Analytics Dashboard Screen
 * Following @docs/architectural-patterns-and-best-practices.md
 * Pattern: Permission-gated executive screen with analytics visualization integration
 */

import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions
} from 'react-native';
import { PermissionCheck } from '../../components/role-based/PermissionGate';
import { OrderWorkflowVisualizer, HistoricalOrderPatterns } from '../../components/analytics';
import { useBusinessMetrics } from '../../hooks/executive/useBusinessMetrics';
import { useOrderConversionMetrics } from '../../hooks/analytics/useOrderConversionFunnel';
import { useOrderTrends } from '../../hooks/analytics/useHistoricalOrderAnalysis';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { formatCompactNumber, formatPercent } from '../../utils/formatters';

type ViewMode = 'overview' | 'workflow' | 'historical';

interface QuickStatsCardProps {
  title: string;
  value: string;
  subtitle: string;
  color: string;
  testID?: string;
}

const QuickStatsCard: React.FC<QuickStatsCardProps> = ({
  title,
  value,
  subtitle,
  color,
  testID
}) => (
  <View style={[styles.statsCard, { borderLeftColor: color }]} testID={testID}>
    <Text style={styles.statsTitle}>{title}</Text>
    <Text style={styles.statsValue}>{value}</Text>
    <Text style={styles.statsSubtitle}>{subtitle}</Text>
  </View>
);

export const OrderAnalyticsDashboard: React.FC = () => {
  const { width } = Dimensions.get('window');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    end: new Date()
  });

  // Fetch order metrics for quick stats
  const {
    data: conversionMetrics,
    isLoading: isConversionLoading,
    refetch: refetchConversion
  } = useOrderConversionMetrics({
    dateRange,
    enabled: true
  });

  // Fetch order trends
  const {
    data: trendsData,
    ordersTrend,
    revenueTrend,
    overallHealth,
    isLoading: isTrendsLoading,
    refetch: refetchTrends
  } = useOrderTrends({
    dateRange,
    enabled: true
  });

  // Fetch business metrics for context
  const {
    isLoading: isBusinessLoading,
    refetch: refetchBusiness
  } = useBusinessMetrics({
    categories: ['sales', 'operations'],
    enabled: true
  });

  // Quick stats data
  const quickStats = useMemo(() => {
    if (!conversionMetrics || !trendsData) return [];

    return [
      {
        title: 'Total Orders',
        value: formatCompactNumber(conversionMetrics.totalOrders || 0),
        subtitle: `${ordersTrend === 'up' ? '↗' : ordersTrend === 'down' ? '↘' : '→'} ${ordersTrend}`,
        color: ordersTrend === 'up' ? '#10b981' : ordersTrend === 'down' ? '#ef4444' : '#6b7280'
      },
      {
        title: 'Completion Rate',
        value: formatPercent(conversionMetrics.completionRate || 0),
        subtitle: `System health: ${overallHealth}`,
        color: conversionMetrics.completionRate > 0.7 ? '#10b981' : '#f59e0b'
      },
      {
        title: 'Bottlenecks',
        value: conversionMetrics.bottlenecks?.length.toString() || '0',
        subtitle: conversionMetrics.bottlenecks?.length > 0 ? 'Need attention' : 'All clear',
        color: conversionMetrics.bottlenecks?.length > 0 ? '#ef4444' : '#10b981'
      },
      {
        title: 'Revenue Trend',
        value: revenueTrend.toUpperCase(),
        subtitle: 'Last 30 days',
        color: revenueTrend === 'up' ? '#10b981' : revenueTrend === 'down' ? '#ef4444' : '#6b7280'
      }
    ];
  }, [conversionMetrics, trendsData, ordersTrend, revenueTrend, overallHealth]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchConversion(),
        refetchTrends(),
        refetchBusiness()
      ]);

      ValidationMonitor.recordPatternSuccess({
        service: 'OrderAnalyticsDashboard',
        pattern: 'analytics_refresh',
        operation: 'refreshAllAnalytics'
      });
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'OrderAnalyticsDashboard.handleRefresh',
        errorCode: 'ANALYTICS_REFRESH_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const isLoading = isConversionLoading || isTrendsLoading || isBusinessLoading;

  const renderTabContent = () => {
    switch (viewMode) {
      case 'overview':
        return (
          <View style={styles.overviewContainer}>
            {/* Quick Stats */}
            <View style={styles.quickStatsSection}>
              <Text style={styles.sectionTitle}>Quick Stats</Text>
              <View style={styles.statsGrid}>
                {quickStats.map((stat, index) => (
                  <QuickStatsCard
                    key={index}
                    title={stat.title}
                    value={stat.value}
                    subtitle={stat.subtitle}
                    color={stat.color}
                    testID={`quick-stat-${index}`}
                  />
                ))}
              </View>
            </View>

            {/* Overview Cards */}
            <View style={styles.overviewCards}>
              <TouchableOpacity
                style={styles.overviewCard}
                onPress={() => setViewMode('workflow')}
                testID="overview-workflow-card"
              >
                <Text style={styles.overviewCardTitle}>📊 Workflow Analysis</Text>
                <Text style={styles.overviewCardDescription}>
                  Detailed conversion funnel and stage-by-stage analytics
                </Text>
                <Text style={styles.overviewCardAction}>View Details →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.overviewCard}
                onPress={() => setViewMode('historical')}
                testID="overview-historical-card"
              >
                <Text style={styles.overviewCardTitle}>📈 Historical Patterns</Text>
                <Text style={styles.overviewCardDescription}>
                  Trends, seasonal patterns, and predictive insights
                </Text>
                <Text style={styles.overviewCardAction}>View Analysis →</Text>
              </TouchableOpacity>
            </View>

            {/* Key Insights */}
            <View style={styles.insightsPreview}>
              <Text style={styles.sectionTitle}>Key Insights</Text>
              <View style={styles.insightCard}>
                <Text style={styles.insightText}>
                  💡 Your order completion rate is{' '}
                  <Text style={{ fontWeight: 'bold' }}>
                    {formatPercent(conversionMetrics?.completionRate || 0)}
                  </Text>
                  {conversionMetrics?.completionRate > 0.8 ?
                    ', which is excellent! Keep up the great work.' :
                    '. Consider analyzing the workflow for optimization opportunities.'
                  }
                </Text>
              </View>

              {conversionMetrics?.bottlenecks?.length > 0 && (
                <View style={styles.insightCard}>
                  <Text style={styles.insightText}>
                    ⚠️ {conversionMetrics.bottlenecks.length} bottleneck(s) detected in your order workflow.
                    The most critical stage needs immediate attention.
                  </Text>
                </View>
              )}
            </View>
          </View>
        );

      case 'workflow':
        return (
          <OrderWorkflowVisualizer
            dateRange={dateRange}
            height={800}
            testID="dashboard-workflow-visualizer"
          />
        );

      case 'historical':
        return (
          <HistoricalOrderPatterns
            dateRange={dateRange}
            predictionHorizon={30}
            height={800}
            testID="dashboard-historical-patterns"
          />
        );

      default:
        return null;
    }
  };

  return (
    <PermissionCheck
      permissions={['analytics:view', 'orders:analyze']}
      roles={['EXECUTIVE', 'ADMIN']}
      fallback={() => (
        <SafeAreaView style={styles.container}>
          <View style={styles.noAccessContainer}>
            <Text style={styles.noAccessTitle}>Order Analytics Dashboard</Text>
            <Text style={styles.noAccessText}>
              This dashboard requires Executive or Admin permissions to access order analytics.
            </Text>
          </View>
        </SafeAreaView>
      )}
      testID="order-analytics-dashboard-permission-gate"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Order Analytics Dashboard</Text>
          <Text style={styles.subtitle}>
            Comprehensive insights into order workflows and patterns
          </Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {[
            { key: 'overview', label: 'Overview', icon: '📋' },
            { key: 'workflow', label: 'Workflow', icon: '📊' },
            { key: 'historical', label: 'Historical', icon: '📈' }
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, viewMode === tab.key && styles.activeTab]}
              onPress={() => setViewMode(tab.key as ViewMode)}
              testID={`tab-${tab.key}`}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[
                styles.tabText,
                viewMode === tab.key && styles.activeTabText
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              testID="refresh-control"
            />
          }
          testID="dashboard-content"
        >
          {isLoading && viewMode === 'overview' ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading analytics...</Text>
            </View>
          ) : (
            renderTabContent()
          )}
        </ScrollView>
      </SafeAreaView>
    </PermissionCheck>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noAccessTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  noAccessText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  overviewContainer: {
    padding: 16,
  },
  quickStatsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statsCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statsSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  overviewCards: {
    gap: 16,
    marginBottom: 24,
  },
  overviewCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  overviewCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  overviewCardDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  overviewCardAction: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  insightsPreview: {
    marginBottom: 24,
  },
  insightCard: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  insightText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
});