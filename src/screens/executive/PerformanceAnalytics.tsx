import React, { useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Dimensions
} from 'react-native';
import { useMetricTrends } from '../../hooks/executive/useMetricTrends';
import { useCrossRoleAnalytics } from '../../hooks/executive/useCrossRoleAnalytics';

const { width: screenWidth } = Dimensions.get('window');

const formatCurrency = (amount: number): string => {
  return `$${amount.toLocaleString()}`;
};

const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

interface PerformanceCardProps {
  title: string;
  metrics: {
    current: number;
    previous: number;
    change: number;
  };
  isCurrency?: boolean;
  accessibilityLabel?: string;
}

const PerformanceCard: React.FC<PerformanceCardProps> = ({
  title,
  metrics,
  isCurrency = false,
  accessibilityLabel
}) => {
  const formatValue = (value: number) => 
    isCurrency ? formatCurrency(value) : value.toLocaleString();

  const changeColor = metrics.change >= 0 ? '#4CAF50' : '#F44336';
  const changeIcon = metrics.change >= 0 ? '↑' : '↓';

  return (
    <View style={styles.performanceCard} accessibilityLabel={accessibilityLabel}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.currentValue}>{formatValue(metrics.current)}</Text>
      <View style={styles.changeContainer}>
        <Text style={[styles.changeText, { color: changeColor }]}>
          {changeIcon} {formatPercent(Math.abs(metrics.change))}
        </Text>
        <Text style={styles.previousValue}>
          vs {formatValue(metrics.previous)}
        </Text>
      </View>
    </View>
  );
};

interface DepartmentRowProps {
  department: {
    name: string;
    performance: number;
    target: number;
    variance: number;
  };
}

const DepartmentRow: React.FC<DepartmentRowProps> = ({ department }) => {
  const performanceColor = department.performance >= department.target ? '#4CAF50' : '#FF9800';
  const progressWidth = Math.min((department.performance / department.target) * 100, 100);

  return (
    <View style={styles.departmentRow}>
      <Text style={styles.departmentName}>{department.name}</Text>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progressWidth}%`, backgroundColor: performanceColor }]} />
      </View>
      <Text style={styles.departmentMetric}>{formatPercent(department.performance)}</Text>
    </View>
  );
};

export const PerformanceAnalytics: React.FC = () => {
  const {
    data: trends,
    isLoading: trendsLoading,
    isError: trendsError,
    error: trendsErrorData,
    refetch: refetchTrends
  } = useMetricTrends();

  const {
    data: crossRole,
    isLoading: crossRoleLoading,
    isError: crossRoleError,
    error: crossRoleErrorData
  } = useCrossRoleAnalytics();

  const isLoading = trendsLoading || crossRoleLoading;
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetchTrends();
    setRefreshing(false);
  }, [refetchTrends]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator 
          size="large" 
          color="#2196F3" 
          testID="loading-indicator" 
        />
        <Text style={styles.loadingText}>Loading performance data...</Text>
      </View>
    );
  }

  if (trendsError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          {trendsErrorData?.message || 'Failed to load performance data'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => refetchTrends()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (crossRoleError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          {crossRoleErrorData?.message || 'Failed to load department data'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => refetchTrends()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const performanceMetrics = trends?.metrics || {
    revenue: { current: 0, previous: 0, change: 0 },
    orders: { current: 0, previous: 0, change: 0 },
    customers: { current: 0, previous: 0, change: 0 },
    efficiency: { current: 0, previous: 0, change: 0 }
  };

  const departments = crossRole?.departments || [];

  return (
    <SafeAreaView style={styles.container} testID="performance-analytics">
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
          <Text style={styles.headerTitle}>Performance Analytics</Text>
          <Text style={styles.headerSubtitle}>Department & Product Performance</Text>
        </View>

        {/* Performance Cards */}
        <View style={styles.cardsSection}>
          <PerformanceCard
            title="Revenue Performance"
            metrics={performanceMetrics.revenue}
            isCurrency={true}
            accessibilityLabel="Revenue performance metric"
          />
          <PerformanceCard
            title="Order Volume"
            metrics={performanceMetrics.orders}
            accessibilityLabel="Order volume metric"
          />
          <PerformanceCard
            title="Customer Growth"
            metrics={performanceMetrics.customers}
            accessibilityLabel="Customer growth metric"
          />
          <PerformanceCard
            title="Efficiency Score"
            metrics={performanceMetrics.efficiency}
            accessibilityLabel="Efficiency score metric"
          />
        </View>

        {/* Department Performance */}
        <View style={styles.departmentSection}>
          <Text style={styles.sectionTitle}>Department Performance</Text>
          
          {departments.length > 0 ? (
            <View style={styles.departmentContainer}>
              {departments.map((dept: any, index: number) => (
                <DepartmentRow key={index} department={dept} />
              ))}
            </View>
          ) : (
            <Text 
              style={styles.noDataText}
              testID="no-department-data"
            >
              No department data available
            </Text>
          )}
        </View>

        {/* Comparison View */}
        {crossRole?.comparisons && crossRole.comparisons.length > 0 && (
          <View style={styles.comparisonSection}>
            <Text style={styles.sectionTitle}>Period Comparison</Text>
            {crossRole.comparisons.map((comp: any, index: number) => (
              <View key={index} style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>{comp.label}</Text>
                <Text style={styles.comparisonValue}>{comp.value}</Text>
              </View>
            ))}
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
    backgroundColor: '#1976D2',
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
  cardsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 15,
    marginTop: -15,
  },
  performanceCard: {
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
  cardTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  currentValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  previousValue: {
    fontSize: 11,
    color: '#999',
  },
  departmentSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  departmentContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
  },
  departmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  departmentName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  progressContainer: {
    flex: 2,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  departmentMetric: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 50,
    textAlign: 'right',
  },
  comparisonSection: {
    padding: 15,
  },
  comparisonItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#666',
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
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