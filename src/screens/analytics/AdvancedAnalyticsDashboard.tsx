import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { useAdvancedAnalytics, useQuickMetrics } from '../../hooks/analytics/useAdvancedAnalytics';
import { RealtimeStatusIndicator } from '../../components/common/RealtimeStatusIndicator';
import { PermissionGate } from '../../components/role-based/PermissionGate';
import { DateRangePicker } from '../../components/common/DateRangePicker';
import { BarChart } from '../../components/executive/charts/BarChart';

interface MetricCardProps {
  title: string;
  value: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  impact?: 'high' | 'medium' | 'low';
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend, impact, description }) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'increasing': return '#4CAF50';
      case 'decreasing': return '#F44336';
      case 'stable': return '#2196F3';
      default: return '#666';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'increasing': return '↗️';
      case 'decreasing': return '↘️';
      case 'stable': return '→';
      default: return '';
    }
  };

  const getImpactColor = () => {
    switch (impact) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#666';
    }
  };

  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricTitle}>{title}</Text>
        {impact && (
          <View style={[styles.impactBadge, { backgroundColor: getImpactColor() }]}>
            <Text style={styles.impactText}>{impact.toUpperCase()}</Text>
          </View>
        )}
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <View style={styles.metricFooter}>
        <Text style={[styles.trendText, { color: getTrendColor() }]}>
          {getTrendIcon()} {trend}
        </Text>
      </View>
      {description && (
        <Text style={styles.metricDescription}>{description}</Text>
      )}
    </View>
  );
};

interface InsightCardProps {
  insight: {
    type: 'opportunity' | 'warning' | 'achievement' | 'recommendation';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
  };
  onAction?: () => void;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight, onAction }) => {
  const getTypeColor = () => {
    switch (insight.type) {
      case 'opportunity': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'achievement': return '#2196F3';
      case 'recommendation': return '#9C27B0';
      default: return '#666';
    }
  };

  const getTypeIcon = () => {
    switch (insight.type) {
      case 'opportunity': return '💡';
      case 'warning': return '⚠️';
      case 'achievement': return '🎉';
      case 'recommendation': return '💭';
      default: return '';
    }
  };

  return (
    <View style={[styles.insightCard, { borderLeftColor: getTypeColor() }]}>
      <View style={styles.insightHeader}>
        <Text style={styles.insightIcon}>{getTypeIcon()}</Text>
        <Text style={styles.insightTitle}>{insight.title}</Text>
        <View style={[styles.impactBadge, { backgroundColor: getTypeColor() }]}>
          <Text style={styles.impactText}>{insight.impact}</Text>
        </View>
      </View>
      <Text style={styles.insightDescription}>{insight.description}</Text>
      {insight.actionable && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionButtonText}>Take Action</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const AdvancedAnalyticsDashboard: React.FC = () => {
  const {
    metrics,
    report,
    kpis,
    trendSummary,
    isLoadingMetrics,
    isLoadingReport,
    canViewAdvancedMetrics,
    canGenerateReports,
    generateReport,
    refreshAnalytics,
    filters,
    updateTimeframe,
    updateReportType,
    exportReport
  } = useAdvancedAnalytics();

  const { criticalAlerts, newAlertsDetected, alertCount } = useRealtimeInsights();
  const { quickStats, overallHealth } = useQuickMetrics();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'insights' | 'reports'>('overview');

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAnalytics();
    setRefreshing(false);
  }, [refreshAnalytics]);

  const handleGenerateReport = useCallback(() => {
    Alert.alert(
      'Generate Report',
      'Generate a new analytics report with current data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: () => generateReport()
        }
      ]
    );
  }, [generateReport]);

  const handleExportData = useCallback(async () => {
    try {
      const url = await exportReport('json');
      if (url) {
        Alert.alert('Export Ready', 'Analytics data exported successfully');
        // In a real app, you'd handle the download/share
      }
    } catch (error) {
      Alert.alert('Export Failed', 'Unable to export analytics data');
    }
  }, [exportReport]);

  const handleInsightAction = useCallback((insight: any) => {
    // Implement insight-specific actions
    Alert.alert(
      'Action Required',
      `Take action for: ${insight.title}`,
      [
        { text: 'Dismiss', style: 'cancel' },
        { text: 'View Details', onPress: () => console.log('View details:', insight) }
      ]
    );
  }, []);

  if (!canViewAdvancedMetrics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noPermissionContainer}>
          <Text style={styles.noPermissionText}>
            Advanced analytics require elevated permissions
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Advanced Analytics</Text>
          <Text style={styles.headerSubtitle}>
            Cross-feature insights and forecasting
          </Text>
        </View>
        <View style={styles.headerActions}>
          <RealtimeStatusIndicator size="small" />
          {alertCount > 0 && (
            <View style={[styles.alertBadge, newAlertsDetected && styles.alertBadgeNew]}>
              <Text style={styles.alertBadgeText}>{alertCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {['overview', 'insights', 'reports'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
            onPress={() => setSelectedTab(tab as any)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {selectedTab === 'overview' && (
          <>
            {/* Overall Health Score */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>System Health</Text>
              <View style={styles.healthContainer}>
                <Text style={styles.healthScore}>
                  {(overallHealth * 100).toFixed(0)}%
                </Text>
                <Text style={styles.healthLabel}>Overall Performance</Text>
              </View>
            </View>

            {/* Quick Metrics */}
            {quickStats && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Key Metrics</Text>
                <View style={styles.metricsGrid}>
                  <MetricCard
                    title="Revenue"
                    value={quickStats.revenue.formatted}
                    trend={quickStats.revenue.trend}
                  />
                  <MetricCard
                    title="Orders"
                    value={quickStats.orders.formatted}
                    trend={quickStats.orders.trend}
                  />
                  <MetricCard
                    title="Inventory Health"
                    value={quickStats.inventory.formatted}
                    trend={quickStats.inventory.trend}
                  />
                  <MetricCard
                    title="Performance"
                    value={quickStats.performance.formatted}
                    trend={quickStats.performance.trend}
                  />
                </View>
              </View>
            )}

            {/* Trend Summary */}
            {trendSummary && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trend Analysis</Text>
                <View style={styles.trendContainer}>
                  <View style={styles.trendItem}>
                    <Text style={styles.trendNumber}>{trendSummary.increasing}</Text>
                    <Text style={styles.trendLabel}>Improving</Text>
                  </View>
                  <View style={styles.trendItem}>
                    <Text style={styles.trendNumber}>{trendSummary.stable}</Text>
                    <Text style={styles.trendLabel}>Stable</Text>
                  </View>
                  <View style={styles.trendItem}>
                    <Text style={styles.trendNumber}>{trendSummary.decreasing}</Text>
                    <Text style={styles.trendLabel}>Declining</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {selectedTab === 'insights' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Critical Insights ({criticalAlerts.length})
            </Text>
            {criticalAlerts.length === 0 ? (
              <Text style={styles.noInsightsText}>
                No critical insights at this time
              </Text>
            ) : (
              criticalAlerts.map((insight, index) => (
                <InsightCard
                  key={index}
                  insight={insight}
                  onAction={() => handleInsightAction(insight)}
                />
              ))
            )}
          </View>
        )}

        {selectedTab === 'reports' && (
          <View style={styles.section}>
            <View style={styles.reportHeader}>
              <Text style={styles.sectionTitle}>Analytics Reports</Text>
              <PermissionGate permission="analytics.reports.generate">
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={handleGenerateReport}
                  disabled={isLoadingReport}
                >
                  {isLoadingReport ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.generateButtonText}>Generate</Text>
                  )}
                </TouchableOpacity>
              </PermissionGate>
            </View>

            {report && (
              <View style={styles.reportContainer}>
                <Text style={styles.reportTitle}>{report.title}</Text>
                <Text style={styles.reportDate}>
                  Generated: {report.generatedAt.toLocaleDateString()}
                </Text>
                <Text style={styles.reportDescription}>
                  {report.description}
                </Text>

                <View style={styles.reportActions}>
                  <TouchableOpacity
                    style={styles.exportButton}
                    onPress={handleExportData}
                  >
                    <Text style={styles.exportButtonText}>Export Data</Text>
                  </TouchableOpacity>
                </View>

                {/* Report Recommendations */}
                {report.recommendations.length > 0 && (
                  <View style={styles.recommendationsContainer}>
                    <Text style={styles.recommendationsTitle}>
                      Recommendations
                    </Text>
                    {report.recommendations.map((rec, index) => (
                      <Text key={index} style={styles.recommendationItem}>
                        • {rec}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}
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
  noPermissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noPermissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertBadge: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  alertBadgeNew: {
    backgroundColor: '#F44336',
  },
  alertBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  healthContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  healthScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  healthLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  impactBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  impactText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  metricFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  trendItem: {
    alignItems: 'center',
  },
  trendNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  trendLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  insightCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  insightDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#2196F3',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noInsightsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 32,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  generateButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reportContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  reportDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  reportActions: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  exportButton: {
    backgroundColor: '#FF9800',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  recommendationsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  recommendationItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
});