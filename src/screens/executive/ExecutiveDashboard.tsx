import React from 'react';
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
import { useBusinessMetrics } from '@/hooks/executive/useBusinessMetrics';
import { useBusinessInsights } from '@/hooks/executive/useBusinessInsights';

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

export const ExecutiveDashboard: React.FC = () => {
  const { 
    metrics, 
    isLoading: metricsLoading, 
    isError: metricsError,
    error: metricsErrorData,
    refetch: refetchMetrics
  } = useBusinessMetrics();
  
  const { 
    data: insights, 
    isLoading: insightsLoading,
    isError: insightsError,
    error: insightsErrorData
  } = useBusinessInsights();

  const isLoading = metricsLoading || insightsLoading;
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetchMetrics();
    setRefreshing(false);
  }, [refetchMetrics]);

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
          <Text style={styles.headerTitle}>Executive Dashboard</Text>
          <Text style={styles.headerSubtitle}>Real-time Business Metrics</Text>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiSection}>
          {metrics && (
            <>
              <MetricCard
                title="Revenue"
                value={formatCurrency(metrics.revenue.total)}
                growth={metrics.revenue.growth}
                trend={metrics.revenue.trend}
                accessibilityLabel="Revenue metric"
              />
              <MetricCard
                title="Orders"
                value={metrics.orders.total.toString()}
                growth={metrics.orders.growth}
                trend={metrics.orders.trend}
                accessibilityLabel="Orders metric"
              />
              <MetricCard
                title="Customers"
                value={metrics.customers.total.toString()}
                growth={metrics.customers.growth}
                trend={metrics.customers.trend}
                accessibilityLabel="Customers metric"
              />
            </>
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
});