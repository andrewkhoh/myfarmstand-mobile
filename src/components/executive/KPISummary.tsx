import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { formatCurrency, formatPercent, formatCompactNumber } from '@/utils/formatters';

export interface KPIMetric {
  label: string;
  value: number;
  format?: 'currency' | 'percent' | 'number' | 'compact';
  trend?: 'up' | 'down' | 'stable';
}

export interface KPISummaryProps {
  title?: string;
  metrics: KPIMetric[];
  horizontal?: boolean;
  compact?: boolean;
  testID?: string;
}

export const KPISummary = React.memo<KPISummaryProps>(({
  title,
  metrics,
  horizontal = false,
  compact = false,
  testID = 'kpi-summary'
}) => {
  const renderMetric = useMemo(() => (metric: KPIMetric, index: number) => {
    let formattedValue: string;
    switch (metric.format) {
      case 'currency':
        formattedValue = formatCurrency(metric.value);
        break;
      case 'percent':
        formattedValue = formatPercent(metric.value);
        break;
      case 'compact':
        formattedValue = formatCompactNumber(metric.value);
        break;
      default:
        formattedValue = metric.value.toLocaleString();
    }

    const trendColor = metric.trend === 'up' ? '#10b981' :
                      metric.trend === 'down' ? '#ef4444' : undefined;

    return (
      <View 
        key={`metric-${index}`} 
        style={[
          styles.metricItem,
          horizontal ? styles.metricItemHorizontal : null,
          compact ? styles.metricItemCompact : null
        ]}
        testID={`${testID}-metric-${index}`}
      >
        <Text style={[styles.metricLabel, compact && styles.metricLabelCompact]}>
          {metric.label}
        </Text>
        <Text style={[
          styles.metricValue,
          compact && styles.metricValueCompact,
          trendColor && { color: trendColor }
        ]}>
          {formattedValue}
        </Text>
      </View>
    );
  }, [testID, horizontal, compact]);

  const content = (
    <View style={[styles.container, compact && styles.containerCompact]} testID={testID}>
      {title && (
        <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      )}
      <View style={[
        styles.metricsContainer,
        horizontal && styles.metricsContainerHorizontal
      ]}>
        {metrics.map(renderMetric)}
      </View>
    </View>
  );

  if (horizontal && !compact) {
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {content}
      </ScrollView>
    );
  }

  return content;
});

KPISummary.displayName = 'KPISummary';

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  containerCompact: {
    padding: 12
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12
  },
  titleCompact: {
    fontSize: 14,
    marginBottom: 8
  },
  metricsContainer: {
    flexDirection: 'column'
  },
  metricsContainerHorizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  metricItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  metricItemHorizontal: {
    borderBottomWidth: 0,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    paddingHorizontal: 16,
    minWidth: 120
  },
  metricItemCompact: {
    paddingVertical: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  metricLabelCompact: {
    marginBottom: 0,
    fontSize: 11
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827'
  },
  metricValueCompact: {
    fontSize: 14
  },
  scrollContent: {
    paddingRight: 16
  }
});