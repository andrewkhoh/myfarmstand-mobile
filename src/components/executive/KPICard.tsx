import React, { useMemo } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import { TrendIndicator } from './TrendIndicator';

export interface KPICardProps {
  title: string;
  value: number;
  format?: 'currency' | 'percent' | 'number';
  trend?: {
    direction: 'up' | 'down' | 'stable';
    value: number;
  };
  comparison?: {
    value: number;
    label: string;
  };
  color?: string;
  testID?: string;
}

export const KPICard = React.memo<KPICardProps>(({
  title,
  value,
  format = 'number',
  trend,
  comparison,
  color = '#4f46e5',
  testID = 'kpi-card'
}) => {
  const formattedValue = useMemo(() => {
    switch (format) {
      case 'currency': return formatCurrency(value);
      case 'percent': return formatPercent(value);
      default: return value.toLocaleString();
    }
  }, [value, format]);

  const trendColor = useMemo(() => {
    if (!trend) return undefined;
    return trend.direction === 'up' ? '#10b981' : 
           trend.direction === 'down' ? '#ef4444' : '#6b7280';
  }, [trend]);

  const accessibilityLabel = useMemo(() => {
    let label = `${title} KPI: ${formattedValue}`;
    if (trend) {
      label += `, trending ${trend.direction} by ${formatPercent(trend.value)}`;
    }
    if (comparison) {
      label += `, ${comparison.value > 0 ? '+' : ''}${comparison.value} versus ${comparison.label}`;
    }
    return label;
  }, [title, formattedValue, trend, comparison]);

  React.useEffect(() => {
    AccessibilityInfo.announceForAccessibility(accessibilityLabel);
  }, [accessibilityLabel]);

  return (
    <View 
      style={[styles.card, { borderLeftColor: color }]} 
      testID={testID}
      accessibilityRole="summary"
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      <Text style={styles.value}>{formattedValue}</Text>
      {trend && (
        <View style={styles.trendContainer}>
          <TrendIndicator direction={trend.direction} color={trendColor} />
          <Text style={[styles.trendValue, { color: trendColor }]}>
            {formatPercent(trend.value)}
          </Text>
        </View>
      )}
      {comparison && (
        <Text style={styles.comparison}>
          {comparison.value > 0 ? '+' : ''}{comparison.value} vs {comparison.label}
        </Text>
      )}
    </View>
  );
});

KPICard.displayName = 'KPICard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4
  },
  title: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  trendValue: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600'
  },
  comparison: {
    marginTop: 8,
    fontSize: 12,
    color: '#9ca3af'
  }
});