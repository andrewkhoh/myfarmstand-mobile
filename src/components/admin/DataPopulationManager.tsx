/**
 * Data Population Manager Component
 * Admin interface for managing business_metrics data pipeline
 * Following @docs/architectural-patterns-and-best-practices.md
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { PermissionCheck } from '../role-based/PermissionGate';
import { useDataPopulation } from '../../hooks/admin/useDataPopulation';
import { UserRole } from '../../types/roles';
// Simple date formatter helper
const formatTimeAgo = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
};

interface StatusCardProps {
  title: string;
  value: string | number;
  color: string;
  subtitle?: string;
  testID?: string;
}

const StatusCard: React.FC<StatusCardProps> = ({ title, value, color, subtitle, testID }) => (
  <View style={[styles.statusCard, { borderLeftColor: color }]} testID={testID}>
    <Text style={styles.statusCardTitle}>{title}</Text>
    <Text style={[styles.statusCardValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.statusCardSubtitle}>{subtitle}</Text>}
  </View>
);

interface ActionButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  testID?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  testID
}) => (
  <TouchableOpacity
    style={[
      styles.actionButton,
      variant === 'primary' ? styles.actionButtonPrimary :
      variant === 'secondary' ? styles.actionButtonSecondary :
      variant === 'danger' ? styles.actionButtonDanger : styles.actionButtonPrimary,
      disabled && styles.actionButtonDisabled
    ]}
    onPress={onPress}
    disabled={disabled || loading}
    testID={testID}
  >
    {loading ? (
      <ActivityIndicator size="small" color="white" />
    ) : (
      <Text style={[styles.actionButtonText, disabled && styles.actionButtonTextDisabled]}>
        {title}
      </Text>
    )}
  </TouchableOpacity>
);

export const DataPopulationManager: React.FC = () => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [initDaysBack] = useState(90);

  const {
    populationStatus,
    integrityReport,
    isLoadingStatus,
    isLoadingIntegrity,
    isInitializing,
    isRunningIncremental,
    isAutoFixing,
    initializeBusinessMetrics,
    runIncrementalPopulation,
    autoFixDataIssues,
    refreshStatus,
    refreshIntegrity,
    hasRecentData,
    needsInitialization,
    hasDataIssues,
    getDataHealthScore,
    getStatusColor,
    getStatusMessage,
    lastInitializeResult,
    lastIncrementalResult,
    lastAutoFixResult
  } = useDataPopulation();

  const handleInitialize = (force = false) => {
    Alert.alert(
      'Initialize Business Metrics',
      `This will populate the business_metrics table with ${initDaysBack} days of order data.${force ? ' Existing data will be overwritten.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: force ? 'Force Initialize' : 'Initialize',
          style: force ? 'destructive' : 'default',
          onPress: () => initializeBusinessMetrics({ daysBack: initDaysBack, force })
        }
      ]
    );
  };

  const handleIncrementalUpdate = () => {
    Alert.alert(
      'Run Incremental Update',
      'This will update business metrics with recent order data (last 3 days).',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update', onPress: () => runIncrementalPopulation() }
      ]
    );
  };

  const handleAutoFix = () => {
    Alert.alert(
      'Auto-Fix Data Issues',
      'This will automatically attempt to fix detected data issues.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Fix Issues', onPress: () => autoFixDataIssues() }
      ]
    );
  };

  if (isLoadingStatus) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading data population status...</Text>
      </View>
    );
  }

  return (
    <PermissionCheck
      permissions={['system:manage']}
      roles={[UserRole.ADMIN]}
      fallback={() => (
        <View style={styles.noAccessContainer}>
          <Text style={styles.noAccessText}>
            Data Population Manager requires Admin permissions
          </Text>
        </View>
      )}
      testID="data-population-permission-gate"
    >
      <ScrollView style={styles.container} testID="data-population-manager">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Data Population Manager</Text>
          <Text style={styles.subtitle}>
            Manage business_metrics table population from order data
          </Text>
        </View>

        {/* Status Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Status</Text>

          <View style={styles.statusGrid}>
            <StatusCard
              title="Data Health"
              value={`${getDataHealthScore()}%`}
              color={getStatusColor()}
              subtitle={getStatusMessage()}
              testID="health-score-card"
            />

            <StatusCard
              title="Total Metrics"
              value={populationStatus?.totalMetrics?.toLocaleString() || '0'}
              color="#3b82f6"
              subtitle="Records in database"
              testID="total-metrics-card"
            />

            <StatusCard
              title="Last Update"
              value={
                formatTimeAgo(populationStatus?.lastSuccess)
              }
              color={hasRecentData() ? '#10b981' : '#f59e0b'}
              subtitle="Data freshness"
              testID="last-update-card"
            />

            <StatusCard
              title="Pipeline Status"
              value={populationStatus?.isRunning ? 'Running' : 'Idle'}
              color={populationStatus?.isRunning ? '#f59e0b' : '#6b7280'}
              subtitle="Current operation"
              testID="pipeline-status-card"
            />
          </View>
        </View>

        {/* Data Integrity Report */}
        {integrityReport && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Integrity Report</Text>

            <View style={[
              styles.integrityCard,
              { borderColor: integrityReport.isValid ? '#10b981' : '#ef4444' }
            ]}>
              <View style={styles.integrityHeader}>
                <Text style={[
                  styles.integrityStatus,
                  { color: integrityReport.isValid ? '#10b981' : '#ef4444' }
                ]}>
                  {integrityReport.isValid ? '✅ Data Valid' : '⚠️ Issues Detected'}
                </Text>

                {!isLoadingIntegrity && (
                  <TouchableOpacity onPress={() => refreshIntegrity()} style={styles.refreshButton}>
                    <Text style={styles.refreshButtonText}>Refresh</Text>
                  </TouchableOpacity>
                )}
              </View>

              {integrityReport.issues.length > 0 && (
                <View style={styles.issuesSection}>
                  <Text style={styles.issuesTitle}>Issues:</Text>
                  {integrityReport.issues.map((issue, index) => (
                    <Text key={index} style={styles.issueText}>• {issue}</Text>
                  ))}
                </View>
              )}

              {integrityReport.recommendations.length > 0 && (
                <View style={styles.recommendationsSection}>
                  <Text style={styles.recommendationsTitle}>Recommendations:</Text>
                  {integrityReport.recommendations.map((rec, index) => (
                    <Text key={index} style={styles.recommendationText}>• {rec}</Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.actionsGrid}>
            {needsInitialization() ? (
              <ActionButton
                title="Initialize Data"
                onPress={() => handleInitialize(false)}
                loading={isInitializing}
                variant="primary"
                testID="initialize-button"
              />
            ) : (
              <ActionButton
                title="Update Recent Data"
                onPress={handleIncrementalUpdate}
                loading={isRunningIncremental}
                variant="primary"
                testID="incremental-button"
              />
            )}

            {hasDataIssues() && (
              <ActionButton
                title="Auto-Fix Issues"
                onPress={handleAutoFix}
                loading={isAutoFixing}
                variant="secondary"
                testID="autofix-button"
              />
            )}

            <ActionButton
              title="Refresh Status"
              onPress={() => {
                refreshStatus();
                refreshIntegrity();
              }}
              variant="secondary"
              testID="refresh-button"
            />
          </View>
        </View>

        {/* Advanced Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced(!showAdvanced)}
            testID="advanced-toggle"
          >
            <Text style={styles.advancedToggleText}>
              {showAdvanced ? '▼' : '▶'} Advanced Actions
            </Text>
          </TouchableOpacity>

          {showAdvanced && (
            <View style={styles.advancedSection}>
              <Text style={styles.advancedWarning}>
                ⚠️ Advanced actions can affect system performance
              </Text>

              <ActionButton
                title="Force Re-initialize (90 days)"
                onPress={() => handleInitialize(true)}
                loading={isInitializing}
                variant="danger"
                testID="force-init-button"
              />

              <View style={styles.spacer} />

              <Text style={styles.infoText}>
                Force re-initialization will overwrite all existing business metrics
                data and rebuild from order data.
              </Text>
            </View>
          )}
        </View>

        {/* Recent Results */}
        {(lastInitializeResult || lastIncrementalResult || lastAutoFixResult) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Operations</Text>

            {lastInitializeResult && (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>Latest Initialization</Text>
                <Text style={[
                  styles.resultStatus,
                  { color: lastInitializeResult.success ? '#10b981' : '#ef4444' }
                ]}>
                  {lastInitializeResult.success ? '✅ Success' : '❌ Failed'}
                </Text>
                <Text style={styles.resultMessage}>{lastInitializeResult.message}</Text>
                {lastInitializeResult.metrics && (
                  <Text style={styles.resultMetrics}>
                    Created {lastInitializeResult.metrics} metrics
                  </Text>
                )}
              </View>
            )}

            {lastIncrementalResult && (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>Latest Incremental Update</Text>
                <Text style={[
                  styles.resultStatus,
                  { color: lastIncrementalResult.success ? '#10b981' : '#ef4444' }
                ]}>
                  {lastIncrementalResult.success ? '✅ Success' : '❌ Failed'}
                </Text>
                <Text style={styles.resultMessage}>{lastIncrementalResult.message}</Text>
              </View>
            )}

            {lastAutoFixResult && (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>Latest Auto-Fix</Text>
                <Text style={[
                  styles.resultStatus,
                  { color: lastAutoFixResult.success ? '#10b981' : '#ef4444' }
                ]}>
                  {lastAutoFixResult.success ? '✅ Success' : '❌ Failed'}
                </Text>
                {lastAutoFixResult.fixes.length > 0 && (
                  <View>
                    <Text style={styles.resultLabel}>Fixes Applied:</Text>
                    {lastAutoFixResult.fixes.map((fix: string, index: number) => (
                      <Text key={index} style={styles.resultItem}>• {fix}</Text>
                    ))}
                  </View>
                )}
                {lastAutoFixResult.errors.length > 0 && (
                  <View>
                    <Text style={styles.resultLabel}>Errors:</Text>
                    {lastAutoFixResult.errors.map((error: string, index: number) => (
                      <Text key={index} style={styles.resultError}>• {error}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </PermissionCheck>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noAccessText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusCardTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statusCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusCardSubtitle: {
    fontSize: 11,
    color: '#9ca3af',
  },
  integrityCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  integrityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  integrityStatus: {
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  refreshButtonText: {
    fontSize: 12,
    color: '#374151',
  },
  issuesSection: {
    marginTop: 12,
  },
  issuesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 4,
  },
  issueText: {
    fontSize: 13,
    color: '#7f1d1d',
    marginBottom: 2,
  },
  recommendationsSection: {
    marginTop: 12,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 13,
    color: '#1e40af',
    marginBottom: 2,
  },
  actionsGrid: {
    gap: 12,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  actionButtonSecondary: {
    backgroundColor: '#6b7280',
  },
  actionButtonDanger: {
    backgroundColor: '#ef4444',
  },
  actionButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  actionButtonTextDisabled: {
    color: '#9ca3af',
  },
  advancedToggle: {
    paddingVertical: 8,
  },
  advancedToggleText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  advancedSection: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  advancedWarning: {
    fontSize: 14,
    color: '#dc2626',
    marginBottom: 12,
    fontWeight: '500',
  },
  spacer: {
    height: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  resultCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  resultStatus: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  resultMessage: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  resultMetrics: {
    fontSize: 11,
    color: '#6b7280',
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginTop: 4,
    marginBottom: 2,
  },
  resultItem: {
    fontSize: 11,
    color: '#10b981',
    marginLeft: 8,
  },
  resultError: {
    fontSize: 11,
    color: '#ef4444',
    marginLeft: 8,
  },
});