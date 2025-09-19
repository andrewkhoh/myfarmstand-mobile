import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated
} from 'react-native';
import { usePerformanceMonitor } from '../../hooks/performance/usePerformanceMonitor';
import { PerformanceDashboard } from './PerformanceDashboard';

interface PerformanceIndicatorProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  compact?: boolean;
  showGrade?: boolean;
  style?: any;
}

export function PerformanceIndicator({
  position = 'top-right',
  compact = false,
  showGrade = true,
  style
}: PerformanceIndicatorProps) {
  const {
    performanceSummary,
    getPerformanceGrade,
    getHealthColor,
    isMonitoring
  } = usePerformanceMonitor();

  const [showDashboard, setShowDashboard] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Pulse animation for poor performance
  React.useEffect(() => {
    if (performanceSummary && performanceSummary.status === 'critical') {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true
          })
        ]).start(() => {
          if (performanceSummary.status === 'critical') {
            pulse();
          }
        });
      };
      pulse();
    } else {
      pulseAnim.setValue(1);
    }
  }, [performanceSummary?.status, pulseAnim]);

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

  const getIndicatorText = () => {
    if (!performanceSummary) return isMonitoring ? 'Monitoring...' : 'Inactive';

    if (showGrade) {
      return getPerformanceGrade();
    }

    return performanceSummary.score.toString();
  };

  const getIndicatorColor = () => {
    if (!performanceSummary) return '#6c757d';
    return getHealthColor();
  };

  if (compact) {
    return (
      <>
        <Animated.View style={[getPositionStyle(), { transform: [{ scale: pulseAnim }] }, style]}>
          <TouchableOpacity
            style={[styles.compactIndicator, { backgroundColor: getIndicatorColor() }]}
            onPress={() => setShowDashboard(true)}
          />
        </Animated.View>

        <PerformanceDashboard
          visible={showDashboard}
          onClose={() => setShowDashboard(false)}
        />
      </>
    );
  }

  return (
    <>
      <Animated.View style={[getPositionStyle(), { transform: [{ scale: pulseAnim }] }, style]}>
        <TouchableOpacity
          style={[styles.indicator, { borderColor: getIndicatorColor() }]}
          onPress={() => setShowDashboard(true)}
        >
          <Text style={[styles.indicatorText, { color: getIndicatorColor() }]}>
            {getIndicatorText()}
          </Text>
          {performanceSummary && performanceSummary.criticalIssues > 0 && (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>!</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      <PerformanceDashboard
        visible={showDashboard}
        onClose={() => setShowDashboard(false)}
      />
    </>
  );
}

// Floating performance widget for development
export function FloatingPerformanceWidget() {
  const { performanceSummary, getPerformanceGrade, getHealthColor } = usePerformanceMonitor();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!__DEV__) return null; // Only show in development

  return (
    <View style={styles.floatingWidget}>
      <TouchableOpacity
        style={[styles.widgetHeader, { backgroundColor: getHealthColor() }]}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.widgetHeaderText}>
          Perf: {getPerformanceGrade()}
        </Text>
      </TouchableOpacity>

      {isExpanded && performanceSummary && (
        <View style={styles.widgetContent}>
          <View style={styles.widgetRow}>
            <Text style={styles.widgetLabel}>Score:</Text>
            <Text style={styles.widgetValue}>{performanceSummary.score}</Text>
          </View>
          <View style={styles.widgetRow}>
            <Text style={styles.widgetLabel}>Issues:</Text>
            <Text style={[styles.widgetValue, { color: performanceSummary.criticalIssues > 0 ? '#dc3545' : '#28a745' }]}>
              {performanceSummary.criticalIssues}
            </Text>
          </View>
          <View style={styles.widgetRow}>
            <Text style={styles.widgetLabel}>Status:</Text>
            <Text style={[styles.widgetValue, { color: getHealthColor() }]}>
              {performanceSummary.status}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// Performance status bar for screens
export function PerformanceStatusBar({ style }: { style?: any }) {
  const { performanceSummary, getHealthColor } = usePerformanceMonitor();

  if (!performanceSummary || performanceSummary.status === 'excellent') return null;

  return (
    <View style={[styles.statusBar, { backgroundColor: getHealthColor() }, style]}>
      <Text style={styles.statusBarText}>
        Performance: {performanceSummary.status.toUpperCase()}
        {performanceSummary.criticalIssues > 0 && ` • ${performanceSummary.criticalIssues} critical issues`}
      </Text>
    </View>
  );
}

// Performance warning banner
export function PerformanceWarningBanner() {
  const { performanceSummary } = usePerformanceMonitor();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!performanceSummary || performanceSummary.status !== 'critical' || isDismissed) {
    return null;
  }

  return (
    <View style={styles.warningBanner}>
      <View style={styles.warningContent}>
        <Text style={styles.warningTitle}>Performance Alert</Text>
        <Text style={styles.warningMessage}>
          Critical performance issues detected. App may be slow or unstable.
        </Text>
      </View>
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={() => setIsDismissed(true)}
      >
        <Text style={styles.dismissButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center'
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
  indicatorText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center'
  },
  alertBadge: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6
  },
  alertBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  floatingWidget: {
    position: 'absolute',
    top: 100,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000
  },
  widgetHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  widgetHeaderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  widgetContent: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8
  },
  widgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  widgetLabel: {
    fontSize: 11,
    color: '#6c757d'
  },
  widgetValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#212529'
  },
  statusBar: {
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  statusBarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center'
  },
  warningBanner: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8
  },
  warningContent: {
    flex: 1
  },
  warningTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4
  },
  warningMessage: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9
  },
  dismissButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  dismissButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  }
});