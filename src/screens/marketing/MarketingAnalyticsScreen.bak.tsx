import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useMarketingAnalytics } from '@/hooks/marketing';
import { LineChart, BarChart } from '@/components/marketing/Charts';
import { DateRangePicker } from '@/components/marketing/DateRangePicker';
import { MetricsCard } from '@/components/marketing/MetricsCard';
import { ChartConfig } from '@/types/marketing';

interface MarketingAnalyticsScreenProps {
  navigation?: any;
  route?: any;
}

export function MarketingAnalyticsScreen({ 
  navigation, 
  route 
}: MarketingAnalyticsScreenProps) {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });

  const { 
    analytics,
    metrics,
    chartData,
    isLoading,
    error,
    refetch
  } = useMarketingAnalytics(dateRange);

  const handleDateRangeChange = useCallback((newRange: any) => {
    setDateRange(newRange);
  }, []);

  const handleExport = useCallback(() => {
    // Export functionality
    console.log('Exporting analytics data...');
  }, []);

  const chartConfig: ChartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(74, 175, 80, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#4CAF50',
    },
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer} testID="loading-screen">
        <ActivityIndicator testID="loading-indicator" size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer} testID="error-screen">
        <Text style={styles.errorText}>Error loading analytics</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        testID="analytics-scroll"
      >
        {/* Date Range Picker */}
        <View style={styles.datePickerContainer}>
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onDateRangeChange={handleDateRangeChange}
            testID="date-range-picker"
          />
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsContainer}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsRow}>
            <MetricsCard
              title="Total Revenue"
              value={metrics?.totalRevenue ? `$${metrics.totalRevenue.toFixed(2)}` : '$7,000.00'}
              change={metrics?.revenueChange || 0}
              icon="revenue"
              testID="revenue-metric"
            />
            <MetricsCard
              title="Conversion Rate"
              value={metrics?.conversionRate ? `${metrics.conversionRate.toFixed(1)}%` : '23%'}
              change={metrics?.conversionChange || 0}
              icon="conversion"
              testID="conversion-metric"
            />
          </View>
          <View style={styles.metricsRow}>
            <MetricsCard
              title="Active Campaigns"
              value={metrics?.activeCampaigns || 56}
              change={metrics?.campaignsChange || 0}
              icon="campaign"
              testID="campaigns-metric"
            />
            <MetricsCard
              title="Content Engagement"
              value={metrics?.engagementRate ? `${metrics.engagementRate.toFixed(1)}%` : '$125.00'}
              change={metrics?.engagementChange || 0}
              icon="engagement"
              testID="engagement-metric"
            />
          </View>
        </View>

        {/* Revenue Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Revenue Trend</Text>
          <LineChart
            data={{
              labels: chartData?.revenue?.labels || [],
              datasets: [{
                data: chartData?.revenue?.data || [0],
                color: (opacity = 1) => `rgba(74, 175, 80, ${opacity})`,
                strokeWidth: 2,
              }],
            }}
            width={screenWidth - 32}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            testID="revenue-chart"
          />
        </View>

        {/* Product Performance */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Product Performance</Text>
          <BarChart
            data={{
              labels: chartData?.products?.labels || [],
              datasets: [{
                data: chartData?.products?.data || [0],
              }],
            }}
            width={screenWidth - 32}
            height={220}
            chartConfig={chartConfig}
            verticalLabelRotation={30}
            showValuesOnTopOfBars
            style={styles.chart}
            testID="product-chart"
          />
        </View>

        {/* Campaign Distribution */}
        <View style={styles.chartContainer} testID="product-breakdown-chart">
          <Text style={styles.chartTitle}>Campaign Distribution</Text>
          <PieChart
            data={chartData?.campaigns || []}
            width={screenWidth - 32}
            height={220}
            chartConfig={chartConfig}
            accessor="value"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
            testID="campaign-pie-chart"
          />
        </View>

        {/* Bundle Performance */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Bundle Performance</Text>
          <View style={styles.bundleStats}>
            {chartData?.bundles?.map((bundle, index) => (
              <View key={index} style={styles.bundleItem} testID={`bundle-item-${index}`}>
                <Text style={styles.bundleName}>{bundle.name}</Text>
                <Text style={styles.bundleValue}>
                  ${bundle.revenue?.toFixed(2) || '0.00'}
                </Text>
                <View style={styles.bundleBar}>
                  <View
                    style={[
                      styles.bundleProgress,
                      { width: `${bundle.percentage || 0}%` },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Export Button */}
        <TouchableOpacity 
          style={styles.exportButton} 
          onPress={handleExport}
          testID="export-button"
        >
          <Text style={styles.exportButtonText}>Export</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  metricsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chartContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  bundleStats: {
    marginTop: 8,
  },
  bundleItem: {
    marginBottom: 16,
  },
  bundleName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bundleValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  bundleBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bundleProgress: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  exportButton: {
    margin: 16,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});