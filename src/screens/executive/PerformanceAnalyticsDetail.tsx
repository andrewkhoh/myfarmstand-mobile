import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { RevenueChart } from '../../components/executive/charts/RevenueChart';
import { OrderChart } from '../../components/executive/charts/OrderChart';
import { DateRangePicker, DateRange } from '../../components/common/DateRangePicker';
import { useBusinessMetrics } from '../../hooks/executive/useBusinessMetrics';
import { usePredictiveAnalytics } from '../../hooks/executive/usePredictiveAnalytics';
import { formatCurrency, formatPercent } from '../../utils/formatters';

interface MetricTrendProps {
  label: string;
  current: number;
  previous: number;
  format?: 'currency' | 'number' | 'percent';
}

const MetricTrend: React.FC<MetricTrendProps> = ({ label, current, previous, format = 'number' }) => {
  const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  const isPositive = change >= 0;

  const formatValue = (value: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percent':
        return formatPercent(value / 100);
      default:
        return value.toLocaleString();
    }
  };

  return (
    <View style={styles.metricTrend}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricValues}>
        <Text style={styles.metricCurrent}>{formatValue(current)}</Text>
        <View style={[styles.changeBadge, isPositive ? styles.positiveChange : styles.negativeChange]}>
          <MaterialIcons name={isPositive ? 'trending-up' : 'trending-down'} size={14} color="white" />
          <Text style={styles.changeText}>{Math.abs(change).toFixed(1)}%</Text>
        </View>
      </View>
      <Text style={styles.metricPrevious}>Previous: {formatValue(previous)}</Text>
    </View>
  );
};

export const PerformanceAnalyticsDetail: React.FC = () => {
  const navigation = useNavigation();
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    label: 'Last 30 Days'
  });
  const [comparisonRange, setComparisonRange] = useState<DateRange | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { metrics, isLoading, refetch } = useBusinessMetrics({ dateRange: dateRange.label });
  const { data: forecast } = usePredictiveAnalytics('revenue', 30);

  // Generate performance data
  const performanceData = useMemo(() => {
    const days = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const data = [];
    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(dateRange.startDate);
      date.setDate(date.getDate() + i);
      data.push({
        date,
        revenue: Math.random() * 5000 + 3000,
        orders: Math.floor(Math.random() * 50 + 30),
        conversion: Math.random() * 0.1 + 0.02
      });
    }
    return data;
  }, [dateRange]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Performance Analytics</Text>
        <TouchableOpacity style={styles.exportButton}>
          <MaterialIcons name="file-download" size={24} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Date Range Selection */}
        <View style={styles.dateSection}>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            showComparison={true}
            onComparisonChange={setComparisonRange}
          />
        </View>

        {/* Key Performance Metrics */}
        <View style={styles.kpiSection}>
          <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <MetricTrend
              label="Total Revenue"
              current={metrics?.revenue.total || 0}
              previous={85000}
              format="currency"
            />
            <MetricTrend
              label="Orders Completed"
              current={metrics?.orders.total || 0}
              previous={280}
              format="number"
            />
            <MetricTrend
              label="Conversion Rate"
              current={3.2}
              previous={2.8}
              format="percent"
            />
            <MetricTrend
              label="Avg Order Value"
              current={metrics?.averageOrderValue?.value || 0}
              previous={295}
              format="currency"
            />
          </ScrollView>
        </View>

        {/* Revenue Performance Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Revenue Performance</Text>
          <RevenueChart
            data={performanceData.map(d => ({ date: d.date, revenue: d.revenue }))}
            showArea={true}
            showTooltip={true}
            height={300}
          />
        </View>

        {/* Order Performance Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Order Trends</Text>
          <OrderChart
            data={performanceData.map(d => ({ date: d.date, orders: d.orders }))}
            height={250}
          />
        </View>

        {/* Predictive Insights */}
        {forecast && (
          <View style={styles.insightsSection}>
            <Text style={styles.sectionTitle}>Predictive Insights</Text>
            <View style={styles.insightCard}>
              <MaterialIcons name="insights" size={24} color="#4f46e5" />
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Revenue Forecast</Text>
                <Text style={styles.insightText}>
                  Expected revenue for next 30 days: {formatCurrency(forecast.projectedValue || 0)}
                </Text>
                <Text style={styles.insightConfidence}>
                  Confidence: {formatPercent(forecast.confidence || 0)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Performance Breakdown */}
        <View style={styles.breakdownSection}>
          <Text style={styles.sectionTitle}>Performance Breakdown</Text>

          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>Best Performing Day</Text>
            <Text style={styles.breakdownValue}>Tuesday</Text>
            <Text style={styles.breakdownDetail}>+18% above average</Text>
          </View>

          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>Peak Hours</Text>
            <Text style={styles.breakdownValue}>11 AM - 2 PM</Text>
            <Text style={styles.breakdownDetail}>45% of daily orders</Text>
          </View>

          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>Customer Retention</Text>
            <Text style={styles.breakdownValue}>68%</Text>
            <Text style={styles.breakdownDetail}>+5% from last period</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  exportButton: {
    padding: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  dateSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  kpiSection: {
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  metricTrend: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  metricValues: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricCurrent: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginRight: 8,
  },
  metricPrevious: {
    fontSize: 11,
    color: '#9ca3af',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  positiveChange: {
    backgroundColor: '#10b981',
  },
  negativeChange: {
    backgroundColor: '#ef4444',
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 2,
  },
  chartSection: {
    paddingVertical: 16,
  },
  insightsSection: {
    padding: 16,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  insightContent: {
    flex: 1,
    marginLeft: 12,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 4,
  },
  insightConfidence: {
    fontSize: 12,
    color: '#6b7280',
  },
  breakdownSection: {
    padding: 16,
    paddingBottom: 32,
  },
  breakdownCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  breakdownTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  breakdownDetail: {
    fontSize: 12,
    color: '#10b981',
  },
});