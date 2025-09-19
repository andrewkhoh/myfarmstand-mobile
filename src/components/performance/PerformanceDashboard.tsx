import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { usePerformanceMonitor } from '../../hooks/performance/usePerformanceMonitor';
import { PerformanceIssue, PerformanceReport } from '../../services/performance/performanceMonitorService';

interface PerformanceDashboardProps {
  visible: boolean;
  onClose: () => void;
}

export function PerformanceDashboard({ visible, onClose }: PerformanceDashboardProps) {
  const {
    performanceReport,
    bundleAnalysis,
    optimizationSuggestions,
    performanceSummary,
    isLoadingReport,
    isLoadingBundle,
    getPerformanceGrade,
    getHealthColor,
    refreshReport,
    refreshBundle
  } = usePerformanceMonitor();

  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'issues' | 'bundle' | 'suggestions'>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshReport(), refreshBundle()]);
    } finally {
      setRefreshing(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Performance Dashboard</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
              disabled={refreshing}
            >
              <Text style={styles.refreshButtonText}>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Performance Summary */}
        {performanceSummary && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.gradeContainer}>
                <Text style={[styles.grade, { color: getHealthColor() }]}>
                  {getPerformanceGrade()}
                </Text>
                <Text style={styles.gradeLabel}>Performance Grade</Text>
              </View>
              <View style={styles.summaryStats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{performanceSummary.score}</Text>
                  <Text style={styles.statLabel}>Score</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: performanceSummary.criticalIssues > 0 ? '#dc3545' : '#28a745' }]}>
                    {performanceSummary.criticalIssues}
                  </Text>
                  <Text style={styles.statLabel}>Critical Issues</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{performanceSummary.recommendations}</Text>
                  <Text style={styles.statLabel}>Recommendations</Text>
                </View>
              </View>
            </View>
            <Text style={styles.summaryStatus}>
              System Status: <Text style={[styles.statusText, { color: getHealthColor() }]}>
                {performanceSummary.status.toUpperCase()}
              </Text>
            </Text>
          </View>
        )}

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'metrics', label: 'Metrics' },
            { key: 'issues', label: 'Issues' },
            { key: 'bundle', label: 'Bundle' },
            { key: 'suggestions', label: 'Tips' }
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isLoadingReport ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007bff" />
              <Text style={styles.loadingText}>Loading performance data...</Text>
            </View>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewTab report={performanceReport} formatDuration={formatDuration} />
              )}
              {activeTab === 'metrics' && (
                <MetricsTab report={performanceReport} formatDuration={formatDuration} formatBytes={formatBytes} />
              )}
              {activeTab === 'issues' && (
                <IssuesTab report={performanceReport} />
              )}
              {activeTab === 'bundle' && (
                <BundleTab bundleAnalysis={bundleAnalysis} formatBytes={formatBytes} isLoading={isLoadingBundle} />
              )}
              {activeTab === 'suggestions' && (
                <SuggestionsTab suggestions={optimizationSuggestions} />
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

interface OverviewTabProps {
  report?: PerformanceReport;
  formatDuration: (ms: number) => string;
}

function OverviewTab({ report, formatDuration }: OverviewTabProps) {
  if (!report) return <Text style={styles.noDataText}>No performance data available</Text>;

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Performance Overview</Text>

      <View style={styles.overviewGrid}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewCardTitle}>Load Performance</Text>
          <Text style={styles.overviewCardValue}>
            {formatDuration(report.metrics.loadTime.average)}
          </Text>
          <Text style={styles.overviewCardLabel}>Average Load Time</Text>
        </View>

        <View style={styles.overviewCard}>
          <Text style={styles.overviewCardTitle}>Memory Usage</Text>
          <Text style={styles.overviewCardValue}>
            {(report.metrics.memory.average / (1024 * 1024)).toFixed(1)}MB
          </Text>
          <Text style={styles.overviewCardLabel}>Average Memory</Text>
        </View>

        <View style={styles.overviewCard}>
          <Text style={styles.overviewCardTitle}>Network</Text>
          <Text style={styles.overviewCardValue}>
            {((report.metrics.network.requests - report.metrics.network.failures) / Math.max(report.metrics.network.requests, 1) * 100).toFixed(1)}%
          </Text>
          <Text style={styles.overviewCardLabel}>Success Rate</Text>
        </View>

        <View style={styles.overviewCard}>
          <Text style={styles.overviewCardTitle}>Frame Rate</Text>
          <Text style={styles.overviewCardValue}>
            {report.metrics.fps.average.toFixed(0)} FPS
          </Text>
          <Text style={styles.overviewCardLabel}>Average FPS</Text>
        </View>
      </View>

      {report.issues.length > 0 && (
        <View style={styles.issuesPreview}>
          <Text style={styles.sectionTitle}>Recent Issues</Text>
          {report.issues.slice(0, 3).map(issue => (
            <View key={issue.id} style={styles.issuePreviewCard}>
              <View style={styles.issuePreviewHeader}>
                <Text style={[styles.issueType, { color: getSeverityColor(issue.severity) }]}>
                  {issue.type.replace('_', ' ').toUpperCase()}
                </Text>
                <Text style={styles.issueSeverity}>{issue.severity}</Text>
              </View>
              <Text style={styles.issueDescription} numberOfLines={2}>
                {issue.description}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

interface MetricsTabProps {
  report?: PerformanceReport;
  formatDuration: (ms: number) => string;
  formatBytes: (bytes: number) => string;
}

function MetricsTab({ report, formatDuration, formatBytes }: MetricsTabProps) {
  if (!report) return <Text style={styles.noDataText}>No metrics data available</Text>;

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Detailed Metrics</Text>

      {/* Load Time Metrics */}
      <View style={styles.metricSection}>
        <Text style={styles.metricSectionTitle}>Load Time Performance</Text>
        <View style={styles.metricGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Average</Text>
            <Text style={styles.metricValue}>{formatDuration(report.metrics.loadTime.average)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>95th Percentile</Text>
            <Text style={styles.metricValue}>{formatDuration(report.metrics.loadTime.p95)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>99th Percentile</Text>
            <Text style={styles.metricValue}>{formatDuration(report.metrics.loadTime.p99)}</Text>
          </View>
        </View>
      </View>

      {/* Memory Metrics */}
      <View style={styles.metricSection}>
        <Text style={styles.metricSectionTitle}>Memory Performance</Text>
        <View style={styles.metricGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Average Usage</Text>
            <Text style={styles.metricValue}>{formatBytes(report.metrics.memory.average)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Peak Usage</Text>
            <Text style={styles.metricValue}>{formatBytes(report.metrics.memory.peak)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Memory Leaks</Text>
            <Text style={[styles.metricValue, { color: report.metrics.memory.leaks > 0 ? '#dc3545' : '#28a745' }]}>
              {report.metrics.memory.leaks}
            </Text>
          </View>
        </View>
      </View>

      {/* Network Metrics */}
      <View style={styles.metricSection}>
        <Text style={styles.metricSectionTitle}>Network Performance</Text>
        <View style={styles.metricGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Total Requests</Text>
            <Text style={styles.metricValue}>{report.metrics.network.requests}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Failed Requests</Text>
            <Text style={[styles.metricValue, { color: report.metrics.network.failures > 0 ? '#dc3545' : '#28a745' }]}>
              {report.metrics.network.failures}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Avg Response Time</Text>
            <Text style={styles.metricValue}>{formatDuration(report.metrics.network.averageResponseTime)}</Text>
          </View>
        </View>
      </View>

      {/* Battery Metrics */}
      <View style={styles.metricSection}>
        <Text style={styles.metricSectionTitle}>Battery Impact</Text>
        <View style={styles.metricGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Usage</Text>
            <Text style={styles.metricValue}>{report.metrics.battery.usage.toFixed(1)}%</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Efficiency</Text>
            <Text style={styles.metricValue}>{report.metrics.battery.efficiency.toFixed(1)}%</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

interface IssuesTabProps {
  report?: PerformanceReport;
}

function IssuesTab({ report }: IssuesTabProps) {
  if (!report?.issues.length) {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.noDataText}>No performance issues detected! 🎉</Text>
      </View>
    );
  }

  const issuesByType = report.issues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || []).concat(issue);
    return acc;
  }, {} as Record<string, PerformanceIssue[]>);

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Performance Issues ({report.issues.length})</Text>

      {Object.entries(issuesByType).map(([type, issues]) => (
        <View key={type} style={styles.issueTypeSection}>
          <Text style={styles.issueTypeTitle}>
            {type.replace('_', ' ').toUpperCase()} ({issues.length})
          </Text>

          {issues.map(issue => (
            <View key={issue.id} style={styles.issueCard}>
              <View style={styles.issueHeader}>
                <Text style={[styles.issueSeverityBadge, { backgroundColor: getSeverityColor(issue.severity) }]}>
                  {issue.severity.toUpperCase()}
                </Text>
                <Text style={styles.issueLocation}>{issue.location}</Text>
              </View>

              <Text style={styles.issueDescription}>{issue.description}</Text>

              <View style={styles.issueImpact}>
                <Text style={styles.impactLabel}>Impact:</Text>
                <Text style={styles.impactValue}>
                  UX: {issue.impact.userExperience}/10,
                  Perf: {issue.impact.performance}/10,
                  Stability: {issue.impact.stability}/10
                </Text>
              </View>

              <View style={styles.issueOccurrences}>
                <Text style={styles.occurrencesText}>
                  {issue.occurrences} occurrence(s) • Last seen: {issue.lastSeen.toLocaleString()}
                </Text>
              </View>

              {issue.suggestions.length > 0 && (
                <View style={styles.issueSuggestions}>
                  <Text style={styles.suggestionsTitle}>Suggestions:</Text>
                  {issue.suggestions.map((suggestion, index) => (
                    <Text key={index} style={styles.suggestionItem}>
                      • {suggestion}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

interface BundleTabProps {
  bundleAnalysis?: any;
  formatBytes: (bytes: number) => string;
  isLoading: boolean;
}

function BundleTab({ bundleAnalysis, formatBytes, isLoading }: BundleTabProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Analyzing bundle...</Text>
      </View>
    );
  }

  if (!bundleAnalysis) return <Text style={styles.noDataText}>No bundle analysis available</Text>;

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Bundle Analysis</Text>

      {/* Total Size */}
      <View style={styles.bundleOverview}>
        <Text style={styles.bundleTotalSize}>
          Total Bundle Size: {formatBytes(bundleAnalysis.totalSize)}
        </Text>
      </View>

      {/* Chunks */}
      <View style={styles.bundleSection}>
        <Text style={styles.bundleSectionTitle}>Chunks</Text>
        {bundleAnalysis.chunks.map((chunk: any, index: number) => (
          <View key={index} style={styles.chunkItem}>
            <View style={styles.chunkHeader}>
              <Text style={styles.chunkName}>{chunk.name}</Text>
              <Text style={styles.chunkSize}>{formatBytes(chunk.size)}</Text>
            </View>
            <Text style={styles.chunkModules}>{chunk.modules} modules</Text>
          </View>
        ))}
      </View>

      {/* Duplicates */}
      {bundleAnalysis.duplicates.length > 0 && (
        <View style={styles.bundleSection}>
          <Text style={styles.bundleSectionTitle}>Duplicate Code</Text>
          {bundleAnalysis.duplicates.map((duplicate: any, index: number) => (
            <View key={index} style={styles.duplicateItem}>
              <Text style={styles.duplicateModule}>{duplicate.module}</Text>
              <Text style={styles.duplicateSize}>{formatBytes(duplicate.size)}</Text>
              <Text style={styles.duplicateLocations}>
                Found in: {duplicate.locations.join(', ')}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Recommendations */}
      <View style={styles.bundleSection}>
        <Text style={styles.bundleSectionTitle}>Recommendations</Text>
        {bundleAnalysis.recommendations.map((rec: string, index: number) => (
          <Text key={index} style={styles.bundleRecommendation}>
            • {rec}
          </Text>
        ))}
      </View>
    </View>
  );
}

interface SuggestionsTabProps {
  suggestions: string[];
}

function SuggestionsTab({ suggestions }: SuggestionsTabProps) {
  if (!suggestions.length) {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.noDataText}>No optimization suggestions at this time! 🚀</Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Optimization Suggestions</Text>

      {suggestions.map((suggestion, index) => (
        <View key={index} style={styles.suggestionCard}>
          <Text style={styles.suggestionText}>• {suggestion}</Text>
        </View>
      ))}
    </View>
  );
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#dc3545';
    case 'high': return '#fd7e14';
    case 'medium': return '#ffc107';
    case 'low': return '#28a745';
    default: return '#6c757d';
  }
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529'
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  refreshButton: {
    backgroundColor: '#007bff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6c757d'
  },
  summaryCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  gradeContainer: {
    alignItems: 'center'
  },
  grade: {
    fontSize: 48,
    fontWeight: 'bold'
  },
  gradeLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600'
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 20
  },
  stat: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529'
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center'
  },
  summaryStatus: {
    fontSize: 16,
    color: '#495057'
  },
  statusText: {
    fontWeight: 'bold'
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    marginHorizontal: 20,
    borderRadius: 8,
    padding: 4
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  tabText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600'
  },
  activeTabText: {
    color: '#007bff'
  },
  content: {
    flex: 1,
    padding: 20
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d'
  },
  noDataText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    padding: 40
  },
  tabContent: {
    flex: 1
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24
  },
  overviewCard: {
    width: (width - 52) / 2, // Account for padding and gap
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  overviewCardTitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8
  },
  overviewCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4
  },
  overviewCardLabel: {
    fontSize: 12,
    color: '#6c757d'
  },
  issuesPreview: {
    marginTop: 8
  },
  issuePreviewCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  issuePreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  issueType: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  issueSeverity: {
    fontSize: 12,
    color: '#6c757d',
    textTransform: 'capitalize'
  },
  issueDescription: {
    fontSize: 14,
    color: '#495057'
  },
  metricSection: {
    marginBottom: 24
  },
  metricSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  metricItem: {
    flex: 1,
    minWidth: (width - 64) / 3,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  metricLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
    textAlign: 'center'
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529'
  },
  issueTypeSection: {
    marginBottom: 24
  },
  issueTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12
  },
  issueCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545'
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  issueSeverityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff'
  },
  issueLocation: {
    fontSize: 12,
    color: '#6c757d',
    fontFamily: 'monospace'
  },
  issueImpact: {
    flexDirection: 'row',
    marginTop: 8
  },
  impactLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
    marginRight: 8
  },
  impactValue: {
    fontSize: 12,
    color: '#495057'
  },
  issueOccurrences: {
    marginTop: 8
  },
  occurrencesText: {
    fontSize: 11,
    color: '#6c757d'
  },
  issueSuggestions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef'
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 6
  },
  suggestionItem: {
    fontSize: 12,
    color: '#495057',
    lineHeight: 16,
    marginBottom: 2
  },
  bundleOverview: {
    backgroundColor: '#e7f3ff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center'
  },
  bundleTotalSize: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066cc'
  },
  bundleSection: {
    marginBottom: 24
  },
  bundleSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12
  },
  chunkItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  chunkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  chunkName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529'
  },
  chunkSize: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600'
  },
  chunkModules: {
    fontSize: 12,
    color: '#6c757d'
  },
  duplicateItem: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107'
  },
  duplicateModule: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4
  },
  duplicateSize: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 4
  },
  duplicateLocations: {
    fontSize: 11,
    color: '#6c520d'
  },
  bundleRecommendation: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    marginBottom: 8
  },
  suggestionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745'
  },
  suggestionText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20
  }
});