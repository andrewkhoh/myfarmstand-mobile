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
import { useCrossRoleAnalytics } from '../../hooks/executive/useCrossRoleAnalytics';
import { useMetricTrends } from '../../hooks/executive/useMetricTrends';

interface InventoryMetricProps {
  title: string;
  value: number | string;
  status?: 'good' | 'warning' | 'critical';
  subtitle?: string;
  accessibilityLabel?: string;
}

const InventoryMetric: React.FC<InventoryMetricProps> = ({
  title,
  value,
  status = 'good',
  subtitle,
  accessibilityLabel
}) => {
  const statusColors = {
    good: '#4CAF50',
    warning: '#FF9800',
    critical: '#F44336'
  };

  return (
    <View style={styles.metricCard} accessibilityLabel={accessibilityLabel}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={[styles.metricValue, { color: statusColors[status] }]}>
        {value}
      </Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );
};

interface AlertItemProps {
  alert: {
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    count?: number;
  };
}

const AlertItem: React.FC<AlertItemProps> = ({ alert }) => {
  const severityColors = {
    low: '#2196F3',
    medium: '#FF9800',
    high: '#F44336'
  };

  return (
    <View style={[styles.alertItem, { borderLeftColor: severityColors[alert.severity] }]}>
      <View style={styles.alertContent}>
        <Text style={styles.alertType}>{alert.type}</Text>
        <Text style={styles.alertMessage}>{alert.message}</Text>
      </View>
      {alert.count !== undefined && (
        <Text style={[styles.alertCount, { color: severityColors[alert.severity] }]}>
          {alert.count}
        </Text>
      )}
    </View>
  );
};

export const InventoryOverview: React.FC = () => {
  const {
    data: crossRole,
    isLoading: crossRoleLoading,
    isError: crossRoleError,
    error: crossRoleErrorData,
    refetch: refetchCrossRole
  } = useCrossRoleAnalytics();

  const {
    data: trends,
    isLoading: trendsLoading,
    isError: trendsError,
    error: trendsErrorData
  } = useMetricTrends();

  const isLoading = crossRoleLoading || trendsLoading;
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetchCrossRole();
    setRefreshing(false);
  }, [refetchCrossRole]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator 
          size="large" 
          color="#2196F3" 
          testID="loading-indicator" 
        />
        <Text style={styles.loadingText}>Loading inventory data...</Text>
      </View>
    );
  }

  if (crossRoleError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          {crossRoleErrorData?.message || 'Failed to load inventory data'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => refetchCrossRole()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (trendsError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          {trendsErrorData?.message || 'Failed to load inventory trends'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => refetchCrossRole()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const inventoryData = {
    totalItems: crossRole?.inventory?.totalItems || 0,
    lowStock: crossRole?.inventory?.lowStock || 0,
    outOfStock: crossRole?.inventory?.outOfStock || 0,
    turnoverRate: crossRole?.inventory?.turnoverRate || 0
  };

  const alerts = crossRole?.alerts || [];
  const categories = crossRole?.categories || [];

  return (
    <SafeAreaView style={styles.container} testID="inventory-overview">
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
          <Text style={styles.headerTitle}>Inventory Overview</Text>
          <Text style={styles.headerSubtitle}>Cross-Role Inventory Visibility</Text>
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsSection}>
          <InventoryMetric
            title="Total Items"
            value={inventoryData.totalItems}
            status="good"
            subtitle="In stock"
            accessibilityLabel="Total inventory items"
          />
          <InventoryMetric
            title="Low Stock"
            value={inventoryData.lowStock}
            status="warning"
            subtitle="Items below threshold"
            accessibilityLabel="Low stock items"
          />
          <InventoryMetric
            title="Out of Stock"
            value={inventoryData.outOfStock}
            status="critical"
            subtitle="Requires immediate action"
            accessibilityLabel="Out of stock items"
          />
          <InventoryMetric
            title="Turnover Rate"
            value={`${inventoryData.turnoverRate.toFixed(1)}x`}
            status={inventoryData.turnoverRate > 4 ? 'good' : 'warning'}
            subtitle="Monthly average"
            accessibilityLabel="Inventory turnover rate"
          />
        </View>

        {/* Alerts Section */}
        <View style={styles.alertsSection}>
          <Text style={styles.sectionTitle}>Inventory Alerts</Text>
          
          {alerts.length > 0 ? (
            <View style={styles.alertsContainer}>
              {alerts.map((alert: any, index: number) => (
                <AlertItem key={index} alert={alert} />
              ))}
            </View>
          ) : (
            <Text 
              style={styles.noDataText}
              testID="no-alerts"
            >
              No active alerts
            </Text>
          )}
        </View>

        {/* Category Breakdown */}
        {categories.length > 0 && (
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Category Status</Text>
            <View style={styles.categoriesContainer}>
              {categories.map((category: any, index: number) => (
                <View key={index} style={styles.categoryItem}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryCount}>{category.itemCount} items</Text>
                  </View>
                  <View style={styles.categoryStats}>
                    <Text style={styles.categoryStatItem}>
                      Stock Level: {category.stockLevel}%
                    </Text>
                    <Text style={[
                      styles.categoryStatItem,
                      { color: category.status === 'optimal' ? '#4CAF50' : '#FF9800' }
                    ]}>
                      {category.status.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.stockLevelBar}>
                    <View 
                      style={[
                        styles.stockLevelFill, 
                        { 
                          width: `${category.stockLevel}%`,
                          backgroundColor: category.stockLevel > 50 ? '#4CAF50' : 
                                         category.stockLevel > 25 ? '#FF9800' : '#F44336'
                        }
                      ]} 
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Trends */}
        {trends?.inventory && (
          <View style={styles.trendsSection}>
            <Text style={styles.sectionTitle}>Inventory Trends</Text>
            <View style={styles.trendsContainer}>
              <View style={styles.trendItem}>
                <Text style={styles.trendLabel}>Stock Movement</Text>
                <Text style={styles.trendValue}>
                  {trends.inventory.movement > 0 ? '↑' : '↓'} {Math.abs(trends.inventory.movement)}%
                </Text>
              </View>
              <View style={styles.trendItem}>
                <Text style={styles.trendLabel}>Waste Reduction</Text>
                <Text style={styles.trendValue}>{trends.inventory.wasteReduction}%</Text>
              </View>
              <View style={styles.trendItem}>
                <Text style={styles.trendLabel}>Efficiency</Text>
                <Text style={styles.trendValue}>{trends.inventory.efficiency}%</Text>
              </View>
            </View>
          </View>
        )}
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
    backgroundColor: '#FF9800',
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
  metricsSection: {
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  metricSubtitle: {
    fontSize: 11,
    color: '#999',
  },
  alertsSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  alertsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
  },
  alertItem: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: 14,
    color: '#333',
  },
  alertCount: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  categoriesSection: {
    padding: 15,
  },
  categoriesContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
  },
  categoryItem: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  categoryCount: {
    fontSize: 12,
    color: '#666',
  },
  categoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryStatItem: {
    fontSize: 12,
    color: '#666',
  },
  stockLevelBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  stockLevelFill: {
    height: '100%',
    borderRadius: 3,
  },
  trendsSection: {
    padding: 15,
  },
  trendsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendItem: {
    flex: 1,
    alignItems: 'center',
  },
  trendLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 5,
  },
  trendValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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