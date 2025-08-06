import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOrderStats } from '../hooks/useOrders';
import { useCurrentUser } from '../hooks/useAuth';
import { getOrderStats } from '../services/orderService';

const MetricsAnalyticsScreen: React.FC = () => {
  const { data: user } = useCurrentUser();
  const { data: stats, isLoading, error, refetch } = useOrderStats();

  // Security check - only allow users with financial access
  const hasFinancialAccess = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    // Refetch stats when screen loads to ensure fresh data
    refetch();
  }, [refetch]);

  // Mock data functionality removed - now using real Supabase data

  // Security barrier - unauthorized access
  if (!hasFinancialAccess) {
    return (
      <View style={styles.unauthorizedContainer}>
        <Ionicons name="shield-outline" size={64} color="#ef4444" />
        <Text style={styles.unauthorizedTitle}>Access Restricted</Text>
        <Text style={styles.unauthorizedMessage}>
          You don't have permission to view financial metrics and analytics.
        </Text>
        <Text style={styles.unauthorizedSubtext}>
          Contact your administrator for access.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Failed to load analytics</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="analytics" size={28} color="#10b981" />
          <Text style={styles.headerTitle}>Metrics & Analytics</Text>
        </View>
        {/* Mock data functionality removed - now using real Supabase data */}
      </View>

      {/* Security Notice */}
      <View style={styles.securityNotice}>
        <Ionicons name="lock-closed" size={16} color="#059669" />
        <Text style={styles.securityText}>
          Confidential financial data - authorized personnel only
        </Text>
      </View>

      {/* Daily Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Today's Performance</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="receipt-outline" size={20} color="#3b82f6" />
              <Text style={styles.metricLabel}>Orders Placed</Text>
            </View>
            <Text style={styles.metricValue}>{stats?.daily.ordersPlaced || 0}</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
              <Text style={styles.metricLabel}>Orders Completed</Text>
            </View>
            <Text style={styles.metricValue}>{stats?.daily.ordersCompleted || 0}</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="cash-outline" size={20} color="#059669" />
              <Text style={styles.metricLabel}>Revenue</Text>
            </View>
            <Text style={styles.metricValue}>
              ${(stats?.daily.revenue || 0).toFixed(2)}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="hourglass-outline" size={20} color="#f59e0b" />
              <Text style={styles.metricLabel}>Pending Today</Text>
            </View>
            <Text style={styles.metricValue}>{stats?.daily.pendingFromToday || 0}</Text>
          </View>
        </View>
      </View>

      {/* Weekly Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 This Week's Performance</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="receipt-outline" size={20} color="#3b82f6" />
              <Text style={styles.metricLabel}>Orders Placed</Text>
            </View>
            <Text style={styles.metricValue}>{stats?.weekly.ordersPlaced || 0}</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
              <Text style={styles.metricLabel}>Orders Completed</Text>
            </View>
            <Text style={styles.metricValue}>{stats?.weekly.ordersCompleted || 0}</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="cash-outline" size={20} color="#059669" />
              <Text style={styles.metricLabel}>Revenue</Text>
            </View>
            <Text style={styles.metricValue}>
              ${(stats?.weekly.revenue || 0).toFixed(2)}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="hourglass-outline" size={20} color="#f59e0b" />
              <Text style={styles.metricLabel}>Pending This Week</Text>
            </View>
            <Text style={styles.metricValue}>{stats?.weekly.pendingFromWeek || 0}</Text>
          </View>
        </View>
      </View>

      {/* Active Workload */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Active Workload</Text>
        <View style={styles.workloadCard}>
          <View style={styles.workloadHeader}>
            <Ionicons name="list-outline" size={24} color="#6366f1" />
            <Text style={styles.workloadTitle}>Total Pending Orders</Text>
          </View>
          <Text style={styles.workloadValue}>{stats?.active.totalPending || 0}</Text>
          <Text style={styles.workloadSubtext}>
            Orders requiring attention (all time periods)
          </Text>
        </View>
      </View>

      {/* Performance Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💡 Performance Insights</Text>
        <View style={styles.insightsCard}>
          <View style={styles.insightRow}>
            <Ionicons name="trending-up" size={16} color="#10b981" />
            <Text style={styles.insightText}>
              Daily completion rate: {stats?.daily.ordersPlaced && stats?.daily.ordersPlaced > 0 
                ? Math.round((stats?.daily.ordersCompleted || 0) / stats.daily.ordersPlaced * 100) 
                : 0}%
            </Text>
          </View>
          <View style={styles.insightRow}>
            <Ionicons name="calculator" size={16} color="#3b82f6" />
            <Text style={styles.insightText}>
              Average order value: ${stats?.daily.ordersCompleted && stats?.daily.ordersCompleted > 0 
                ? ((stats?.daily.revenue || 0) / stats.daily.ordersCompleted).toFixed(2)
                : '0.00'}
            </Text>
          </View>
          <View style={styles.insightRow}>
            <Ionicons name="time" size={16} color="#f59e0b" />
            <Text style={styles.insightText}>
              Weekly growth: {(stats?.weekly.ordersCompleted || 0) > (stats?.daily.ordersCompleted || 0) 
                ? 'Positive trend' 
                : 'Monitor closely'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  addDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addDataText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  securityText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  workloadCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  workloadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  workloadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  workloadValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  workloadSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  insightsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 40,
  },
  unauthorizedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 12,
  },
  unauthorizedMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  unauthorizedSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default MetricsAnalyticsScreen;
