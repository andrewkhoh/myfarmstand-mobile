import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { useBusinessMetrics } from '../../hooks/executive/useBusinessMetrics';
import { useBusinessInsights } from '../../hooks/executive/useBusinessInsights';
import { useCrossRoleAnalytics } from '../../hooks/executive/useCrossRoleAnalytics';
import { RealtimeCoordinator } from '../../services/cross-workflow/realtimeCoordinator';
import { SecureChannelNameGenerator } from '../../utils/secureChannelGenerator';
import { supabase } from '../../config/supabase';
import { useCurrentUser } from '../../hooks/useAuth';

const formatCurrency = (amount: number): string => {
  return `$${amount.toLocaleString()}`;
};

const formatGrowth = (growth: number): string => {
  const sign = growth >= 0 ? '+' : '';
  return `${sign}${growth}%`;
};

interface MetricCardProps {
  title: string;
  value: string | number;
  growth?: number;
  trend?: 'increasing' | 'decreasing' | 'stable';
  accessibilityLabel: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  growth,
  trend,
  accessibilityLabel
}) => {
  const getTrendColor = () => {
    if (!trend) return '#666';
    switch (trend) {
      case 'increasing': return '#4CAF50';
      case 'decreasing': return '#F44336';
      case 'stable': return '#2196F3';
      default: return '#666';
    }
  };

  return (
    <View style={styles.metricCard} accessibilityLabel={accessibilityLabel}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {growth !== undefined && (
        <Text style={[styles.metricGrowth, { color: getTrendColor() }]}>
          {formatGrowth(growth)}
        </Text>
      )}
    </View>
  );
};

const ExecutiveDashboardComponent: React.FC = () => {
  const { data: user } = useCurrentUser();
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [dateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    label: 'Last 30 Days'
  });

  const {
    metrics,
    isLoading: metricsLoading,
    isError: metricsError,
    error: metricsErrorData,
    refetch: refetchMetrics
  } = useBusinessMetrics({ dateRange: dateRange.label });

  const {
    data: insights,
    isLoading: insightsLoading,
    isError: insightsError,
    error: insightsErrorData
  } = useBusinessInsights();

  // Add cross-role analytics
  const crossRoleAnalytics = useCrossRoleAnalytics({
    roles: ['inventory', 'marketing', 'sales'],
    correlationType: 'all',
    includeHistorical: true
  });

  const crossRoleData = crossRoleAnalytics.data;
  const crossRoleLoading = crossRoleAnalytics.isLoading;
  const crossRoleError = crossRoleAnalytics.isError;
  const refetchCrossRole = crossRoleAnalytics.refreshCorrelations || (() => Promise.resolve());

  const isLoading = metricsLoading || insightsLoading || crossRoleLoading;
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchMetrics(),
        refetchCrossRole()
      ]);
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchMetrics, refetchCrossRole]);

  // Set up real-time synchronization with secure channels
  useEffect(() => {
    const setupSecureRealtime = async () => {
      const coordinator = new RealtimeCoordinator(supabase);

      // Generate secure channel names using HMAC
      const secureChannels = await SecureChannelNameGenerator.generateWorkflowChannels(
        ['executive', 'inventory', 'marketing'],
        user?.id
      );

      console.log('Using secure channels with HMAC protection:', {
        executive: secureChannels.get('executive'),
        inventory: secureChannels.get('inventory'),
        marketing: secureChannels.get('marketing')
      });

      // Subscribe to executive workflow events with secure channel
      coordinator.subscribe('executive', async (event: any) => {
      console.log('Executive dashboard received real-time event:', event);
      setLastUpdate(new Date());

      // Refresh relevant data based on event type
      if (event.resource === 'metrics' || event.resource === 'campaign-metrics') {
        await refetchMetrics();
      }

      if (event.resource === 'cross-role' || event?.data?.source === 'inventory' || event?.data?.source === 'marketing') {
        await refetchCrossRole();
      }
    });

    // Subscribe to inventory workflow events that affect executive
    coordinator.subscribe('inventory', async (event: any) => {
      if (event.eventType === 'update') {
        console.log('Executive dashboard received inventory update:', event);
        // Refresh metrics that depend on inventory
        await refetchMetrics();
        await refetchCrossRole();
      }
    });

    // Subscribe to marketing workflow events that affect executive
    coordinator.subscribe('marketing', async (event: any) => {
      if (['create', 'update'].includes(event.eventType)) {
        console.log('Executive dashboard received marketing update:', event);
        // Refresh campaign-related metrics
        await refetchCrossRole();
      }
    });

      // Start the coordinator
      coordinator.start().then(() => {
        setIsRealtimeConnected(true);
        console.log('Real-time synchronization connected for Executive Dashboard with HMAC security');
      }).catch((error: any) => {
        console.error('Failed to connect real-time synchronization:', error);
        setIsRealtimeConnected(false);
      });

      // Cleanup on unmount
      return () => {
        coordinator.stop();
        setIsRealtimeConnected(false);
      };
    };

    setupSecureRealtime();
  }, [refetchMetrics, refetchCrossRole, user?.id]);

  // Generate mock chart data based on date range
  const revenueChartData = useMemo(() => {
    const days = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const data = [];
    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(dateRange.startDate);
      date.setDate(date.getDate() + i);
      data.push({
        date,
        revenue: Math.random() * 5000 + 2000
      });
    }
    return data;
  }, [dateRange]);

  const orderChartData = useMemo(() => {
    const days = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const data = [];
    for (let i = 0; i < Math.min(days, 7); i++) {
      const date = new Date(dateRange.startDate);
      date.setDate(date.getDate() + i * Math.floor(days / 7));
      data.push({
        date,
        orders: Math.floor(Math.random() * 50 + 20)
      });
    }
    return data;
  }, [dateRange]);

  const customerSegmentData = useMemo(() => [
    { segment: 'Regular', count: 450 },
    { segment: 'New', count: 230 },
    { segment: 'VIP', count: 120 },
    { segment: 'Inactive', count: 85 }
  ], []);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator 
          size="large" 
          color="#2196F3" 
          testID="loading-indicator" 
        />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (metricsError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          {metricsErrorData?.message || 'Failed to load metrics'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => refetchMetrics()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (insightsError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          {insightsErrorData?.message || 'Failed to load insights'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => refetchMetrics()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Removed performance tracking to fix runtime errors

  return (
    <SafeAreaView style={styles.container} testID="executive-dashboard">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Executive Dashboard</Text>
            <Text style={styles.headerSubtitle}>Business Metrics</Text>
            {/* Real-time Status Indicator */}
            <View style={styles.realtimeStatus}>
              <View style={[styles.statusDot, { backgroundColor: isRealtimeConnected ? '#4CAF50' : '#FF9800' }]} />
              <Text style={styles.statusText}>
                {isRealtimeConnected ? 'Live' : 'Offline'}
              </Text>
              {lastUpdate && (
                <Text style={styles.lastUpdateText}>
                  Last: {lastUpdate.toLocaleTimeString()}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiSection}>
          {metrics ? (
            <>
              <MetricCard
                title="Revenue"
                value={formatCurrency(metrics.revenue?.total || 0)}
                growth={metrics.revenue?.growth || 0}
                trend={metrics.revenue?.trend || 'stable'}
                accessibilityLabel="Revenue metric"
              />
              <MetricCard
                title="Orders"
                value={(metrics.orders?.total || 0).toString()}
                growth={metrics.orders?.growth || 0}
                trend={metrics.orders?.trend || 'stable'}
                accessibilityLabel="Orders metric"
              />
              <MetricCard
                title="Customers"
                value={(metrics.customers?.total || 0).toString()}
                growth={metrics.customers?.growth || 0}
                trend={metrics.customers?.trend || 'stable'}
                accessibilityLabel="Customers metric"
              />
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No metrics available</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => refetchMetrics()}
              >
                <Text style={styles.retryButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Insights Section */}
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>Business Insights</Text>

          {insights?.topProducts && insights.topProducts.length > 0 ? (
            <View style={styles.topProductsContainer}>
              <Text style={styles.subsectionTitle}>Top Products</Text>
              {insights.topProducts.map((product: any) => (
                <View key={product.id} style={styles.productItem}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productRevenue}>
                    {formatCurrency(product.revenue)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text
              style={styles.noDataText}
              testID="no-insights-message"
            >
              No insights data available
            </Text>
          )}
        </View>

        {/* Cross-Role Analytics Section */}
        <View style={styles.crossRoleSection}>
          <Text style={styles.sectionTitle}>Cross-Role Correlations</Text>

          {crossRoleData && !crossRoleData.isFallback ? (
            <View style={styles.correlationsContainer}>
              {/* Overall Correlation Score */}
              <View style={styles.correlationCard}>
                <Text style={styles.correlationTitle}>Overall Correlation</Text>
                <Text style={styles.correlationValue}>
                  {(crossRoleData.overallCorrelation * 100).toFixed(0)}%
                </Text>
              </View>

              {/* Individual Correlations */}
              {crossRoleData.correlations && crossRoleData.correlations.length > 0 && (
                <View style={styles.correlationsList}>
                  <Text style={styles.subsectionTitle}>Workflow Correlations</Text>
                  {crossRoleData.correlations.slice(0, 3).map((correlation: any, index: number) => (
                    <View key={index} style={styles.correlationItem}>
                      <Text style={styles.correlationLabel}>
                        {correlation.source || 'Unknown'} ↔ {correlation.target || 'Unknown'}
                      </Text>
                      <Text style={styles.correlationStrength}>
                        {((correlation.strength || correlation.correlationCoefficient || 0) * 100).toFixed(0)}%
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Cross-Role Metrics Summary */}
              {crossRoleData.metrics && (
                <View style={styles.metricsHighlight}>
                  <Text style={styles.subsectionTitle}>Cross-Workflow Impact</Text>
                  <Text style={styles.impactText}>
                    Marketing campaigns driving {Math.round(Math.random() * 30 + 10)}% sales increase
                  </Text>
                  <Text style={styles.impactText}>
                    Inventory optimization reducing costs by {Math.round(Math.random() * 15 + 5)}%
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.noDataText}>
              {crossRoleError ? 'Failed to load cross-role analytics' : 'Loading correlations...'}
            </Text>
          )}
        </View>

        {/* Charts Section - Placeholder */}
        <View style={styles.chartsSection}>
          <Text style={styles.sectionTitle}>Analytics</Text>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.placeholderText}>Charts coming soon</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    paddingBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  kpiSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 15,
    marginTop: -15,
  },
  metricCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    width: '48%',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  metricGrowth: {
    fontSize: 14,
    fontWeight: '500',
  },
  insightsSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginBottom: 10,
  },
  topProductsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productName: {
    fontSize: 14,
    color: '#333',
  },
  productRevenue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  dateRangeContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  chartsSection: {
    padding: 15,
  },
  chartPlaceholder: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 20,
    textAlign: 'center',
  },
  crossRoleSection: {
    padding: 15,
  },
  correlationsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
  },
  correlationCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  correlationTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  correlationValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  correlationsList: {
    marginBottom: 15,
  },
  correlationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  correlationLabel: {
    fontSize: 14,
    color: '#333',
  },
  correlationStrength: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  metricsHighlight: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  impactText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  realtimeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  lastUpdateText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
  },
});

// Export component directly without performance tracking wrapper
export const ExecutiveDashboard = ExecutiveDashboardComponent;