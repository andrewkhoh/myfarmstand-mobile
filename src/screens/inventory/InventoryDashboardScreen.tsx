/**
 * Inventory Dashboard Screen
 * Comprehensive inventory overview with metrics, alerts, and quick actions
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Modal,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Loading } from '../../components/Loading';

import { 
  useInventoryDashboard, 
  useInventoryAlerts, 
  useInventoryPerformanceMetrics,
  useInventoryRealtimeStatus
} from '../../hooks/inventory/useInventoryDashboard';
import { useUserRole } from '../../hooks/role-based/useUserRole';

type NavigationProp = StackNavigationProp<any>;

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  onPress?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  color = 'primary',
  onPress
}) => {
  const colorStyles = {
    primary: { backgroundColor: '#007AFF', color: '#FFFFFF' },
    success: { backgroundColor: '#34C759', color: '#FFFFFF' },
    warning: { backgroundColor: '#FF9500', color: '#FFFFFF' },
    danger: { backgroundColor: '#FF3B30', color: '#FFFFFF' }
  };

  return (
    <TouchableOpacity 
      style={[styles.metricCard, { backgroundColor: colorStyles[color].backgroundColor }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={[styles.metricTitle, { color: colorStyles[color].color }]}>
        {title}
      </Text>
      <Text style={[styles.metricValue, { color: colorStyles[color].color }]}>
        {value}
      </Text>
      {subtitle && (
        <Text style={[styles.metricSubtitle, { color: colorStyles[color].color }]}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );
};

interface AlertItemProps {
  alert: {
    id: string;
    type: 'low_stock' | 'out_of_stock' | 'threshold_breach';
    productName: string;
    currentStock: number;
    threshold: number;
    severity: 'high' | 'medium' | 'low';
  };
  onPress: () => void;
}

const AlertItem: React.FC<AlertItemProps> = ({ alert, onPress }) => {
  const severityColors = {
    high: '#FF3B30',
    medium: '#FF9500',
    low: '#FFCC00'
  };

  const alertTypeLabels = {
    out_of_stock: 'Out of Stock',
    low_stock: 'Low Stock',
    threshold_breach: 'Critical'
  };

  return (
    <TouchableOpacity style={styles.alertItem} onPress={onPress}>
      <View style={[styles.alertIndicator, { backgroundColor: severityColors[alert.severity] }]} />
      <View style={styles.alertContent}>
        <Text style={styles.alertTitle}>{alert.productName}</Text>
        <Text style={styles.alertDescription}>
          {alertTypeLabels[alert.type]}: {alert.currentStock} / {alert.threshold}
        </Text>
      </View>
      <Text style={[styles.alertSeverity, { color: severityColors[alert.severity] }]}>
        {alert.severity.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
};

export default function InventoryDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { userRole, hasPermission } = useUserRole();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);

  // Hook queries
  const dashboardQuery = useInventoryDashboard();
  const alertsQuery = useInventoryAlerts();
  const performanceQuery = useInventoryPerformanceMetrics();
  const realtimeQuery = useInventoryRealtimeStatus();

  const canManageInventory = hasPermission(['inventory:write', 'inventory:manage']);
  const canViewReports = hasPermission(['inventory:read', 'analytics:view']);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dashboardQuery.refetch(),
        alertsQuery.refetch(),
        performanceQuery.refetch()
      ]);
      realtimeQuery.refreshStatus();
    } finally {
      setRefreshing(false);
    }
  }, [dashboardQuery, alertsQuery, performanceQuery, realtimeQuery]);

  const handleNavigateToStockManagement = useCallback(() => {
    navigation.navigate('StockManagement');
  }, [navigation]);

  const handleNavigateToAlerts = useCallback(() => {
    navigation.navigate('InventoryAlerts');
  }, [navigation]);

  const handleNavigateToBulkOperations = useCallback(() => {
    navigation.navigate('BulkOperations');
  }, [navigation]);

  const handleNavigateToMovementHistory = useCallback(() => {
    navigation.navigate('StockMovementHistory');
  }, [navigation]);

  const handleAlertPress = useCallback((alertId: string) => {
    // Navigate to specific product or stock management with filter
    navigation.navigate('StockManagement', { highlightItem: alertId });
  }, [navigation]);

  if (dashboardQuery.isLoading || performanceQuery.isLoading) {
    return <Loading message="Loading inventory dashboard..." />;
  }

  if (dashboardQuery.error) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load dashboard</Text>
          <Button title="Retry" onPress={() => dashboardQuery.refetch()} />
        </View>
      </Screen>
    );
  }

  const metrics = dashboardQuery.data;
  const alerts = alertsQuery.data || [];
  const performance = performanceQuery.data;
  const realtimeStatus = realtimeQuery.data;

  const highPriorityAlerts = alerts.filter(a => a.severity === 'high');

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header with Real-time Status */}
        <View style={styles.header}>
          <Text style={styles.title}>Inventory Dashboard</Text>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusDot, 
              { backgroundColor: realtimeStatus?.isHealthy ? '#34C759' : '#FF3B30' }
            ]} />
            <Text style={styles.statusText}>
              {realtimeStatus?.isHealthy ? 'Healthy' : 'Needs Attention'}
            </Text>
          </View>
        </View>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Items"
            value={metrics?.totalItems || 0}
            color="primary"
            onPress={canViewReports ? handleNavigateToStockManagement : undefined}
          />
          <MetricCard
            title="Low Stock"
            value={metrics?.lowStockCount || 0}
            subtitle="Items"
            color={metrics && metrics.lowStockCount > 0 ? "warning" : "success"}
            onPress={handleNavigateToAlerts}
          />
          <MetricCard
            title="Out of Stock"
            value={metrics?.outOfStockCount || 0}
            subtitle="Items"
            color={metrics && metrics.outOfStockCount > 0 ? "danger" : "success"}
            onPress={handleNavigateToAlerts}
          />
          <MetricCard
            title="Total Value"
            value={`$${(metrics?.totalValue || 0).toLocaleString()}`}
            subtitle="Inventory"
            color="primary"
          />
        </View>

        {/* Critical Alerts Section */}
        {highPriorityAlerts.length > 0 && (
          <Card style={styles.alertsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Critical Alerts</Text>
              <TouchableOpacity onPress={() => setShowAlertsModal(true)}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {highPriorityAlerts.slice(0, 3).map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onPress={() => handleAlertPress(alert.id)}
              />
            ))}
          </Card>
        )}

        {/* Performance Overview */}
        {performance && (
          <Card style={styles.performanceSection}>
            <Text style={styles.sectionTitle}>Performance Overview</Text>
            <View style={styles.performanceGrid}>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceValue}>{performance.recentUpdates}</Text>
                <Text style={styles.performanceLabel}>Recent Updates</Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceValue}>{performance.staleItems}</Text>
                <Text style={styles.performanceLabel}>Stale Items</Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceValue}>{performance.averageStock}</Text>
                <Text style={styles.performanceLabel}>Avg Stock</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Quick Actions */}
        {canManageInventory && (
          <Card style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionButtons}>
              <Button
                title="Stock Management"
                onPress={handleNavigateToStockManagement}
                style={styles.actionButton}
              />
              <Button
                title="Bulk Operations"
                onPress={handleNavigateToBulkOperations}
                style={styles.actionButton}
              />
              <Button
                title="Movement History"
                onPress={handleNavigateToMovementHistory}
                style={styles.actionButton}
              />
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Alerts Modal */}
      <Modal
        visible={showAlertsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Alerts</Text>
            <TouchableOpacity onPress={() => setShowAlertsModal(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {alertsQuery.isLoading ? (
              <ActivityIndicator style={styles.modalLoading} />
            ) : (
              alerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onPress={() => {
                    setShowAlertsModal(false);
                    handleAlertPress(alert.id);
                  }}
                />
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D1D1F',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 12,
    opacity: 0.8,
  },
  alertsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  viewAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  alertIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1D1D1F',
    marginBottom: 2,
  },
  alertDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  alertSeverity: {
    fontSize: 12,
    fontWeight: '600',
  },
  performanceSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  actionsSection: {
    marginHorizontal: 16,
    marginBottom: 32,
  },
  actionButtons: {
    marginTop: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalLoading: {
    marginTop: 32,
  },
});