import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';

const { width: screenWidth } = Dimensions.get('window');

interface MetricData {
  label: string;
  value: number;
  change: number;
  unit?: string;
}

interface ChartData {
  label: string;
  value: number;
}

export default function MarketingAnalyticsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('impressions');

  // Analytics data
  const [metrics, setMetrics] = useState({
    impressions: { value: 125000, change: 12.5, unit: '' },
    clicks: { value: 6250, change: -5.2, unit: '' },
    conversions: { value: 312, change: 8.7, unit: '' },
    revenue: { value: 15620, change: 15.3, unit: '$' },
    ctr: { value: 5.0, change: 0.5, unit: '%' },
    conversionRate: { value: 5.0, change: 0.8, unit: '%' },
    roi: { value: 245, change: 22.5, unit: '%' },
    cpc: { value: 2.5, change: -0.3, unit: '$' },
  });

  const [chartData, setChartData] = useState<ChartData[]>([
    { label: 'Mon', value: 15000 },
    { label: 'Tue', value: 18000 },
    { label: 'Wed', value: 17500 },
    { label: 'Thu', value: 20000 },
    { label: 'Fri', value: 22000 },
    { label: 'Sat', value: 19000 },
    { label: 'Sun', value: 13500 },
  ]);

  const [campaigns, setCampaigns] = useState([
    { id: '1', name: 'Summer Sale', impressions: 45000, clicks: 2250, conversions: 112, revenue: 5600 },
    { id: '2', name: 'Back to School', impressions: 38000, clicks: 1900, conversions: 95, revenue: 4750 },
    { id: '3', name: 'Flash Friday', impressions: 42000, clicks: 2100, conversions: 105, revenue: 5270 },
  ]);

  const [topContent, setTopContent] = useState([
    { id: '1', title: 'Summer Collection Video', views: 12500, engagement: 8.5 },
    { id: '2', title: 'Product Tutorial', views: 9800, engagement: 12.3 },
    { id: '3', title: 'Customer Testimonials', views: 8200, engagement: 15.7 },
  ]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleExport = (format: string) => {
    console.log(`Exporting data as ${format}`);
    // Export logic would go here
  };

  const renderMetricCard = (key: string, label: string) => {
    const metric = metrics[key];
    const isPositive = metric.change > 0;
    
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="{label}"
        key={key}
        testID={`metric-card-${key}`}
        style={[styles.metricCard, selectedMetric === key && styles.selectedMetricCard]}
        onPress={() => setSelectedMetric(key)}
      >
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>
          {metric.unit === '$' ? '$' : ''}{metric.value.toLocaleString()}{metric.unit === '%' ? '%' : ''}
        </Text>
        <View style={styles.metricChange}>
          <Text style={[styles.changeText, isPositive ? styles.positive : styles.negative]}>
            {isPositive ? '↑' : '↓'} {Math.abs(metric.change)}%
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderChart = () => {
    const maxValue = Math.max(...chartData.map(d => d.value));
    
    return (
      <View testID="analytics-chart" style={styles.chart}>
        <View style={styles.chartBars}>
          {chartData.map((data, index) => (
            <View key={index} style={styles.barContainer}>
              <View
                testID={`chart-bar-${index}`}
                style={[
                  styles.bar,
                  { height: (data.value / maxValue) * 150 },
                ]}
              />
              <Text style={styles.barLabel}>{data.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return <LoadingState message="Loading analytics..." />;
  }

  if (error && !refreshing) {
    return <ErrorState error={error} onRetry={() => setError(null)} />;
  }

  return (
    <ScrollView
      testID="marketing-analytics-screen"
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Period Selector */}
      <View testID="period-selector" style={styles.periodSelector}>
        {['24h', '7d', '30d', '90d'].map((period) => (
          <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Button"
            key={period}
            testID={`period-${period}`}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.selectedPeriod,
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text
              style={[
                styles.periodText,
                selectedPeriod === period && styles.selectedPeriodText,
              ]}
            >
              {period === '24h' ? 'Today' : period === '7d' ? 'Week' : period === '30d' ? 'Month' : 'Quarter'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Key Metrics */}
      <View testID="metrics-overview" style={styles.section}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          {renderMetricCard('impressions', 'Impressions')}
          {renderMetricCard('clicks', 'Clicks')}
          {renderMetricCard('conversions', 'Conversions')}
          {renderMetricCard('revenue', 'Revenue')}
          {renderMetricCard('ctr', 'CTR')}
          {renderMetricCard('conversionRate', 'Conv. Rate')}
          {renderMetricCard('roi', 'ROI')}
          {renderMetricCard('cpc', 'CPC')}
        </View>
      </View>

      {/* Performance Chart */}
      <View testID="performance-chart" style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Performance Trend</Text>
          <Text style={styles.chartMetric}>{selectedMetric.toUpperCase()}</Text>
        </View>
        {renderChart()}
      </View>

      {/* Campaign Performance */}
      <View testID="campaign-performance" style={styles.section}>
        <Text style={styles.sectionTitle}>Campaign Performance</Text>
        {campaigns.map((campaign, index) => (
          <View key={campaign.id} testID={`campaign-row-${index}`} style={styles.campaignRow}>
            <Text style={styles.campaignName}>{campaign.name}</Text>
            <View style={styles.campaignMetrics}>
              <View style={styles.miniMetric}>
                <Text style={styles.miniMetricValue}>{campaign.impressions.toLocaleString()}</Text>
                <Text style={styles.miniMetricLabel}>Impressions</Text>
              </View>
              <View style={styles.miniMetric}>
                <Text style={styles.miniMetricValue}>{campaign.clicks.toLocaleString()}</Text>
                <Text style={styles.miniMetricLabel}>Clicks</Text>
              </View>
              <View style={styles.miniMetric}>
                <Text style={styles.miniMetricValue}>{campaign.conversions}</Text>
                <Text style={styles.miniMetricLabel}>Conversions</Text>
              </View>
              <View style={styles.miniMetric}>
                <Text style={styles.miniMetricValue}>${campaign.revenue.toLocaleString()}</Text>
                <Text style={styles.miniMetricLabel}>Revenue</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Top Content */}
      <View testID="top-content" style={styles.section}>
        <Text style={styles.sectionTitle}>Top Performing Content</Text>
        {topContent.map((content, index) => (
          <View key={content.id} testID={`content-row-${index}`} style={styles.contentRow}>
            <View style={styles.contentInfo}>
              <Text style={styles.contentTitle}>{content.title}</Text>
              <View style={styles.contentMetrics}>
                <Text style={styles.contentMetric}>{content.views.toLocaleString()} views</Text>
                <Text style={styles.contentMetric}>{content.engagement}% engagement</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Export Options */}
      <View testID="export-section" style={styles.section}>
        <Text style={styles.sectionTitle}>Export Data</Text>
        <View style={styles.exportButtons}>
          <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Export as PDF"
            testID="export-pdf-button"
            style={styles.exportButton}
            onPress={() => handleExport('pdf')}
          >
            <Text style={styles.exportButtonText}>Export as PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Export as CSV"
            testID="export-csv-button"
            style={styles.exportButton}
            onPress={() => handleExport('csv')}
          >
            <Text style={styles.exportButtonText}>Export as CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Export as Excel"
            testID="export-excel-button"
            style={styles.exportButton}
            onPress={() => handleExport('excel')}
          >
            <Text style={styles.exportButtonText}>Export as Excel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  selectedPeriod: {
    backgroundColor: '#2196F3',
  },
  periodText: {
    fontSize: 14,
    color: '#666',
  },
  selectedPeriodText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chartMetric: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  metricCard: {
    width: (screenWidth - 40) / 2,
    backgroundColor: '#f8f9fa',
    padding: 16,
    margin: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedMetricCard: {
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricChange: {
    flexDirection: 'row',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#f44336',
  },
  chart: {
    height: 200,
    paddingVertical: 16,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 30,
    backgroundColor: '#2196F3',
    borderRadius: 4,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
  },
  campaignRow: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  campaignMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  miniMetric: {
    alignItems: 'center',
  },
  miniMetricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  miniMetricLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  contentMetrics: {
    flexDirection: 'row',
    gap: 16,
  },
  contentMetric: {
    fontSize: 12,
    color: '#666',
  },
  exportButtons: {
    gap: 8,
  },
  exportButton: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});