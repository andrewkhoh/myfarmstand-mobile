import React from 'react';
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
import { useInsightGeneration } from '@/hooks/executive/useInsightGeneration';
import { useMetricTrends } from '@/hooks/executive/useMetricTrends';

const { width: screenWidth } = Dimensions.get('window');

interface CustomerMetricProps {
  label: string;
  value: number | string;
  change?: number;
  icon?: string;
  accessibilityLabel?: string;
}

const CustomerMetric: React.FC<CustomerMetricProps> = ({
  label,
  value,
  change,
  icon,
  accessibilityLabel
}) => {
  const changeColor = change && change >= 0 ? '#4CAF50' : '#F44336';
  const changeIcon = change && change >= 0 ? '↑' : '↓';

  return (
    <View style={styles.customerMetric} accessibilityLabel={accessibilityLabel}>
      <View style={styles.metricHeader}>
        {icon && <Text style={styles.metricIcon}>{icon}</Text>}
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      {change !== undefined && (
        <Text style={[styles.metricChange, { color: changeColor }]}>
          {changeIcon} {Math.abs(change).toFixed(1)}%
        </Text>
      )}
    </View>
  );
};

interface SegmentItemProps {
  segment: {
    name: string;
    size: number;
    value: number;
    growth: number;
    description?: string;
  };
}

const SegmentItem: React.FC<SegmentItemProps> = ({ segment }) => {
  const growthColor = segment.growth >= 0 ? '#4CAF50' : '#F44336';
  
  return (
    <View style={styles.segmentItem}>
      <View style={styles.segmentHeader}>
        <Text style={styles.segmentName}>{segment.name}</Text>
        <Text style={styles.segmentSize}>{segment.size} customers</Text>
      </View>
      <View style={styles.segmentMetrics}>
        <Text style={styles.segmentValue}>${segment.value.toLocaleString()}</Text>
        <Text style={[styles.segmentGrowth, { color: growthColor }]}>
          {segment.growth >= 0 ? '+' : ''}{segment.growth.toFixed(1)}%
        </Text>
      </View>
      {segment.description && (
        <Text style={styles.segmentDescription}>{segment.description}</Text>
      )}
    </View>
  );
};

export const CustomerAnalytics: React.FC = () => {
  const {
    data: insights,
    isLoading: insightsLoading,
    isError: insightsError,
    error: insightsErrorData,
    refetch: refetchInsights
  } = useInsightGeneration();

  const {
    data: trends,
    isLoading: trendsLoading,
    isError: trendsError,
    error: trendsErrorData
  } = useMetricTrends();

  const isLoading = insightsLoading || trendsLoading;
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetchInsights();
    setRefreshing(false);
  }, [refetchInsights]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator 
          size="large" 
          color="#2196F3" 
          testID="loading-indicator" 
        />
        <Text style={styles.loadingText}>Loading customer analytics...</Text>
      </View>
    );
  }

  if (insightsError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          {insightsErrorData?.message || 'Failed to load customer insights'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => refetchInsights()}
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
          {trendsErrorData?.message || 'Failed to load customer trends'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => refetchInsights()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const customerData = {
    total: insights?.customers?.total || 0,
    active: insights?.customers?.active || 0,
    new: insights?.customers?.new || 0,
    returning: insights?.customers?.returning || 0,
    churnRate: insights?.customers?.churnRate || 0,
    lifetimeValue: insights?.customers?.lifetimeValue || 0,
    satisfactionScore: insights?.customers?.satisfactionScore || 0,
    totalChange: insights?.customers?.totalChange,
    activeChange: insights?.customers?.activeChange,
    newChange: insights?.customers?.newChange,
    returningChange: insights?.customers?.returningChange,
    churnChange: insights?.customers?.churnChange,
    ltvChange: insights?.customers?.ltvChange
  };

  const segments = insights?.segments || [];
  const behaviors = insights?.behaviors || [];

  return (
    <SafeAreaView style={styles.container} testID="customer-analytics">
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
          <Text style={styles.headerTitle}>Customer Analytics</Text>
          <Text style={styles.headerSubtitle}>Customer Behavior & Segments</Text>
        </View>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <CustomerMetric
            label="Total Customers"
            value={customerData.total.toLocaleString()}
            change={customerData.totalChange}
            icon="👥"
            accessibilityLabel="Total customers metric"
          />
          <CustomerMetric
            label="Active Customers"
            value={customerData.active.toLocaleString()}
            change={customerData.activeChange}
            icon="✅"
            accessibilityLabel="Active customers metric"
          />
          <CustomerMetric
            label="New Customers"
            value={customerData.new.toLocaleString()}
            change={customerData.newChange}
            icon="🆕"
            accessibilityLabel="New customers metric"
          />
          <CustomerMetric
            label="Returning Rate"
            value={`${customerData.returning}%`}
            change={customerData.returningChange}
            icon="🔄"
            accessibilityLabel="Returning customers metric"
          />
          <CustomerMetric
            label="Churn Rate"
            value={`${customerData.churnRate.toFixed(1)}%`}
            change={customerData.churnChange}
            icon="📉"
            accessibilityLabel="Customer churn rate"
          />
          <CustomerMetric
            label="Avg Lifetime Value"
            value={`$${customerData.lifetimeValue.toLocaleString()}`}
            change={customerData.ltvChange}
            icon="💰"
            accessibilityLabel="Average lifetime value"
          />
        </View>

        {/* Customer Satisfaction */}
        {customerData.satisfactionScore > 0 && (
          <View style={styles.satisfactionSection}>
            <Text style={styles.sectionTitle}>Customer Satisfaction</Text>
            <View style={styles.satisfactionCard}>
              <Text style={styles.satisfactionScore} testID="satisfaction-score">
                {customerData.satisfactionScore.toFixed(1)}
              </Text>
              <Text style={styles.satisfactionLabel}>out of 5.0</Text>
              <View style={styles.satisfactionBar}>
                <View 
                  style={[
                    styles.satisfactionFill,
                    { width: `${(customerData.satisfactionScore / 5) * 100}%` }
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        {/* Customer Segments */}
        <View style={styles.segmentsSection}>
          <Text style={styles.sectionTitle}>Customer Segments</Text>
          
          {segments.length > 0 ? (
            <View style={styles.segmentsContainer}>
              {segments.map((segment: any, index: number) => (
                <SegmentItem key={index} segment={segment} />
              ))}
            </View>
          ) : (
            <Text 
              style={styles.noDataText}
              testID="no-segments"
            >
              No segment data available
            </Text>
          )}
        </View>

        {/* Customer Behaviors */}
        {behaviors.length > 0 && (
          <View style={styles.behaviorsSection}>
            <Text style={styles.sectionTitle}>Key Behaviors</Text>
            <View style={styles.behaviorsContainer}>
              {behaviors.map((behavior: any, index: number) => (
                <View key={index} style={styles.behaviorItem}>
                  <Text style={styles.behaviorLabel}>{behavior.type}</Text>
                  <Text style={styles.behaviorValue}>{behavior.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Trends */}
        {trends?.customers && (
          <View style={styles.trendsSection}>
            <Text style={styles.sectionTitle}>Customer Trends</Text>
            <View style={styles.trendsContainer}>
              <View style={styles.trendCard}>
                <Text style={styles.trendLabel}>Acquisition</Text>
                <Text style={styles.trendValue}>
                  {trends.customers.acquisition > 0 ? '+' : ''}{trends.customers.acquisition}%
                </Text>
              </View>
              <View style={styles.trendCard}>
                <Text style={styles.trendLabel}>Retention</Text>
                <Text style={styles.trendValue}>
                  {trends.customers.retention}%
                </Text>
              </View>
              <View style={styles.trendCard}>
                <Text style={styles.trendLabel}>Engagement</Text>
                <Text style={styles.trendValue}>
                  {trends.customers.engagement}%
                </Text>
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
    backgroundColor: '#9C27B0',
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 15,
    marginTop: -15,
  },
  customerMetric: {
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
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  metricChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  satisfactionSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  satisfactionCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  satisfactionScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#9C27B0',
  },
  satisfactionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  satisfactionBar: {
    width: '100%',
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  satisfactionFill: {
    height: '100%',
    backgroundColor: '#9C27B0',
    borderRadius: 5,
  },
  segmentsSection: {
    padding: 15,
  },
  segmentsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
  },
  segmentItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  segmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  segmentSize: {
    fontSize: 12,
    color: '#666',
  },
  segmentMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  segmentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9C27B0',
  },
  segmentGrowth: {
    fontSize: 14,
    fontWeight: '600',
  },
  segmentDescription: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  behaviorsSection: {
    padding: 15,
  },
  behaviorsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
  },
  behaviorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  behaviorLabel: {
    fontSize: 14,
    color: '#666',
  },
  behaviorValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  trendsSection: {
    padding: 15,
  },
  trendsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  trendLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  trendValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9C27B0',
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