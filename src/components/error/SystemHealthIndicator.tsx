import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Animated
} from 'react-native';
import { useGlobalErrorHandler } from '../../hooks/error/useGlobalErrorHandler';

interface SystemHealthIndicatorProps {
  compact?: boolean;
  showDetails?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function SystemHealthIndicator({
  compact = false,
  showDetails = true,
  position = 'top-right'
}: SystemHealthIndicatorProps) {
  const [showModal, setShowModal] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  const {
    systemHealth,
    errorRate,
    lastErrorTime,
    recentErrors,
    getHealthColor,
    getHealthMessage,
    getErrorSummary,
    clearErrors
  } = useGlobalErrorHandler();

  const healthColor = getHealthColor();
  const healthMessage = getHealthMessage();
  const errorSummary = getErrorSummary();

  // Pulse animation for non-healthy states
  React.useEffect(() => {
    if (systemHealth !== 'healthy') {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          })
        ]).start(() => {
          if (systemHealth !== 'healthy') {
            pulse();
          }
        });
      };
      pulse();
    } else {
      pulseAnim.setValue(1);
    }
  }, [systemHealth, pulseAnim]);

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60 * 1000) return 'just now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
    return date.toLocaleDateString();
  };

  const getPositionStyle = () => {
    const base = { position: 'absolute' as const, zIndex: 1000 };

    switch (position) {
      case 'top-left':
        return { ...base, top: 20, left: 20 };
      case 'top-right':
        return { ...base, top: 20, right: 20 };
      case 'bottom-left':
        return { ...base, bottom: 20, left: 20 };
      case 'bottom-right':
        return { ...base, bottom: 20, right: 20 };
      default:
        return { ...base, top: 20, right: 20 };
    }
  };

  if (compact) {
    return (
      <Animated.View style={[getPositionStyle(), { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity
          style={[styles.compactIndicator, { backgroundColor: healthColor }]}
          onPress={() => showDetails && setShowModal(true)}
        />
      </Animated.View>
    );
  }

  return (
    <>
      <Animated.View style={[getPositionStyle(), { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity
          style={[styles.indicator, { borderColor: healthColor }]}
          onPress={() => showDetails && setShowModal(true)}
        >
          <View style={[styles.statusDot, { backgroundColor: healthColor }]} />
          <Text style={styles.statusText}>{systemHealth}</Text>
          {errorRate > 0 && (
            <Text style={styles.errorRate}>{errorRate}/hr</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {showDetails && (
        <Modal
          visible={showModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>System Health</Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Current Status */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Current Status</Text>
                <View style={styles.statusCard}>
                  <View style={styles.statusCardHeader}>
                    <View style={[styles.statusDotLarge, { backgroundColor: healthColor }]} />
                    <Text style={[styles.statusTextLarge, { color: healthColor }]}>
                      {systemHealth.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.statusMessage}>{healthMessage}</Text>

                  <View style={styles.metricsRow}>
                    <View style={styles.metric}>
                      <Text style={styles.metricValue}>{errorRate}</Text>
                      <Text style={styles.metricLabel}>errors/hour</Text>
                    </View>
                    <View style={styles.metric}>
                      <Text style={styles.metricValue}>{errorSummary.total}</Text>
                      <Text style={styles.metricLabel}>recent errors</Text>
                    </View>
                    <View style={styles.metric}>
                      <Text style={styles.metricValue}>
                        {lastErrorTime ? formatTimestamp(lastErrorTime) : 'none'}
                      </Text>
                      <Text style={styles.metricLabel}>last error</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Error Summary */}
              {errorSummary.total > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Error Summary</Text>

                  <View style={styles.summaryGrid}>
                    <Text style={styles.summarySubtitle}>By Category</Text>
                    {Object.entries(errorSummary.byCategory).map(([category, count]) => (
                      <View key={category} style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{category}</Text>
                        <Text style={styles.summaryValue}>{count}</Text>
                      </View>
                    ))}

                    <Text style={[styles.summarySubtitle, { marginTop: 16 }]}>By Severity</Text>
                    {Object.entries(errorSummary.bySeverity).map(([severity, count]) => (
                      <View key={severity} style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{severity}</Text>
                        <Text style={[
                          styles.summaryValue,
                          severity === 'critical' && styles.criticalText,
                          severity === 'high' && styles.highText
                        ]}>
                          {count}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Recent Errors */}
              {recentErrors.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recent Errors</Text>
                  {recentErrors.slice(0, 5).map((error, index) => (
                    <View key={error.id} style={styles.errorCard}>
                      <View style={styles.errorCardHeader}>
                        <Text style={styles.errorCode}>{error.code}</Text>
                        <View style={[
                          styles.severityBadge,
                          { backgroundColor: error.severity === 'critical' ? '#dc3545' :
                                            error.severity === 'high' ? '#fd7e14' :
                                            error.severity === 'medium' ? '#ffc107' : '#28a745' }
                        ]}>
                          <Text style={styles.severityText}>{error.severity}</Text>
                        </View>
                        <Text style={styles.errorTime}>
                          {formatTimestamp(error.context.timestamp)}
                        </Text>
                      </View>
                      <Text style={styles.errorMessage} numberOfLines={2}>
                        {error.message}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Actions */}
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    clearErrors();
                    setShowModal(false);
                  }}
                >
                  <Text style={styles.clearButtonText}>Clear Error History</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  compactIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    textTransform: 'capitalize'
  },
  errorRate: {
    fontSize: 10,
    color: '#6c757d',
    marginLeft: 6
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529'
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
  modalContent: {
    flex: 1,
    padding: 20
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12
  },
  statusCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16
  },
  statusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  statusDotLarge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8
  },
  statusTextLarge: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  statusMessage: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  metric: {
    alignItems: 'center'
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529'
  },
  metricLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2
  },
  summaryGrid: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16
  },
  summarySubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6c757d',
    textTransform: 'capitalize'
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529'
  },
  criticalText: {
    color: '#dc3545'
  },
  highText: {
    color: '#fd7e14'
  },
  errorCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545'
  },
  errorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  errorCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    fontFamily: 'monospace',
    flex: 1
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginHorizontal: 8
  },
  severityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff'
  },
  errorTime: {
    fontSize: 12,
    color: '#6c757d'
  },
  errorMessage: {
    fontSize: 13,
    color: '#495057'
  },
  clearButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center'
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});