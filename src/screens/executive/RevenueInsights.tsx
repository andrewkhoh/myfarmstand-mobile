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
import { usePredictiveAnalytics } from '../../hooks/executive/usePredictiveAnalytics';
import { useMetricTrends } from '../../hooks/executive/useMetricTrends';

const { width: screenWidth } = Dimensions.get('window');

const formatCurrency = (amount: number): string => {
  return `$${amount.toLocaleString()}`;
};

const formatPercent = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

interface RevenueMetricProps {
  title: string;
  value: number;
  projected?: number;
  growth?: number;
  period: string;
  accessibilityLabel?: string;
}

const RevenueMetric: React.FC<RevenueMetricProps> = ({
  title,
  value,
  projected,
  growth,
  period,
  accessibilityLabel
}) => {
  const growthColor = growth && growth >= 0 ? '#4CAF50' : '#F44336';

  return (
    <View style={styles.revenueMetric} accessibilityLabel={accessibilityLabel}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{formatCurrency(value)}</Text>
      {projected && (
        <Text style={styles.projectedValue}>
          Projected: {formatCurrency(projected)}
        </Text>
      )}
      {growth !== undefined && (
        <Text style={[styles.growthText, { color: growthColor }]}>
          {formatPercent(growth)}
        </Text>
      )}
      <Text style={styles.periodText}>{period}</Text>
    </View>
  );
};

interface TrendItemProps {
  date: string;
  revenue: number;
  orders: number;
}

const TrendItem: React.FC<TrendItemProps> = ({ date, revenue, orders }) => {
  return (
    <View style={styles.trendItem}>
      <Text style={styles.trendDate}>{date}</Text>
      <View style={styles.trendMetrics}>
        <View style={styles.trendMetricItem}>
          <Text style={styles.trendLabel}>Revenue</Text>
          <Text style={styles.trendValue}>{formatCurrency(revenue)}</Text>
        </View>
        <View style={styles.trendMetricItem}>
          <Text style={styles.trendLabel}>Orders</Text>
          <Text style={styles.trendValue}>{orders}</Text>
        </View>
      </View>
    </View>
  );
};

export const RevenueInsights: React.FC = () => {
  const {
    data: predictions,
    isLoading: predictionsLoading,
    isError: predictionsError,
    error: predictionsErrorData,
    refetch: refetchPredictions
  } = usePredictiveAnalytics();

  const {
    data: trends,
    isLoading: trendsLoading,
    isError: trendsError,
    error: trendsErrorData
  } = useMetricTrends();

  const isLoading = predictionsLoading || trendsLoading;
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetchPredictions();
    setRefreshing(false);
  }, [refetchPredictions]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator 
          size="large" 
          color="#2196F3" 
          testID="loading-indicator" 
        />
        <Text style={styles.loadingText}>Loading revenue insights...</Text>
      </View>
    );
  }

  if (predictionsError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          {predictionsErrorData?.message || 'Failed to load revenue predictions'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => refetchPredictions()}
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
          {trendsErrorData?.message || 'Failed to load revenue trends'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => refetchPredictions()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const revenueData = predictions?.revenue || {
    current: 0,
    projected: 0,
    growth: 0,
    confidence: 0
  };

  const forecastData = {
    weekly: predictions?.forecast?.weekly || { revenue: 0, growth: 0 },
    monthly: predictions?.forecast?.monthly || { revenue: 0, growth: 0, projected: 0 },
    quarterly: predictions?.forecast?.quarterly || { revenue: 0, growth: 0, projected: 0 }
  };

  const trendData = trends?.daily || [];

  return (
    <SafeAreaView style={styles.container} testID="revenue-insights">
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
          <Text style={styles.headerTitle}>Revenue Insights</Text>
          <Text style={styles.headerSubtitle}>Revenue Trends & Projections</Text>
        </View>

        {/* Current Revenue Overview */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>Revenue Overview</Text>
          <View style={styles.overviewCard}>
            <Text style={styles.mainRevenue}>{formatCurrency(revenueData.current)}</Text>
            <Text style={styles.mainLabel}>Current Month Revenue</Text>
            {revenueData.growth !== undefined && (
              <Text 
                style={[
                  styles.mainGrowth, 
                  { color: revenueData.growth >= 0 ? '#4CAF50' : '#F44336' }
                ]}
              >
                {formatPercent(revenueData.growth)} vs Last Month
              </Text>
            )}
            {revenueData.confidence > 0 && (
              <Text style={styles.confidenceText} testID="confidence-score">
                {`Confidence: ${(revenueData.confidence * 100).toFixed(0)}%`}
              </Text>
            )}
          </View>
        </View>

        {/* Revenue Forecasts */}
        <View style={styles.forecastSection}>
          <Text style={styles.sectionTitle}>Revenue Forecasts</Text>
          <View style={styles.forecastContainer}>
            <RevenueMetric
              title="Weekly Forecast"
              value={forecastData.weekly.revenue}
              growth={forecastData.weekly.growth}
              period="Next 7 days"
              accessibilityLabel="Weekly revenue forecast"
            />
            <RevenueMetric
              title="Monthly Forecast"
              value={forecastData.monthly.revenue}
              projected={forecastData.monthly.projected}
              growth={forecastData.monthly.growth}
              period="Next 30 days"
              accessibilityLabel="Monthly revenue forecast"
            />
            <RevenueMetric
              title="Quarterly Forecast"
              value={forecastData.quarterly.revenue}
              projected={forecastData.quarterly.projected}
              growth={forecastData.quarterly.growth}
              period="Next 90 days"
              accessibilityLabel="Quarterly revenue forecast"
            />
          </View>
        </View>

        {/* Revenue Trends */}
        <View style={styles.trendsSection}>
          <Text style={styles.sectionTitle}>Daily Revenue Trends</Text>
          
          {trendData.length > 0 ? (
            <View style={styles.trendsContainer}>
              {trendData.slice(0, 7).map((trend: any, index: number) => (
                <TrendItem
                  key={index}
                  date={trend.date}
                  revenue={trend.revenue}
                  orders={trend.orders}
                />
              ))}
            </View>
          ) : (
            <Text 
              style={styles.noDataText}
              testID="no-trends-data"
            >
              No trend data available
            </Text>
          )}
        </View>

        {/* Revenue Breakdown */}
        {predictions?.breakdown && (
          <View style={styles.breakdownSection}>
            <Text style={styles.sectionTitle}>Revenue Breakdown</Text>
            {predictions.breakdown.map((item: any, index: number) => (
              <View key={index} style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>{item.category}</Text>
                <Text style={styles.breakdownValue}>
                  {formatCurrency(item.amount)}
                </Text>
                <Text style={styles.breakdownPercent}>
                  {item.percentage.toFixed(1)}%
                </Text>
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
    backgroundColor: '#4CAF50',
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
  overviewSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  overviewCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainRevenue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  mainLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  mainGrowth: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  confidenceText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  forecastSection: {
    padding: 15,
  },
  forecastContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  revenueMetric: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    width: '100%',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  projectedValue: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  growthText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  periodText: {
    fontSize: 11,
    color: '#999',
  },
  trendsSection: {
    padding: 15,
  },
  trendsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
  },
  trendItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
  },
  trendDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  trendMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendMetricItem: {
    flex: 1,
  },
  trendLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  trendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  breakdownSection: {
    padding: 15,
  },
  breakdownItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    flex: 2,
    fontSize: 14,
    color: '#333',
  },
  breakdownValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'right',
  },
  breakdownPercent: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
    width: 45,
    textAlign: 'right',
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