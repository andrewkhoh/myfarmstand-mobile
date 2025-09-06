import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency, formatPercent, formatNumber } from '@/utils/formatters';
import { TrendIndicator } from './TrendIndicator';

export interface KPIComparisonProps {
  title: string;
  current: {
    value: number;
    label: string;
  };
  previous: {
    value: number;
    label: string;
  };
  format?: 'currency' | 'percent' | 'number';
  showTrend?: boolean;
  testID?: string;
}

export const KPIComparison = React.memo<KPIComparisonProps>(({
  title,
  current,
  previous,
  format = 'number',
  showTrend = true,
  testID = 'kpi-comparison'
}) => {
  const formatValue = useMemo(() => {
    switch (format) {
      case 'currency': return formatCurrency;
      case 'percent': return formatPercent;
      default: return formatNumber;
    }
  }, [format]);

  const change = useMemo(() => {
    const diff = current.value - previous.value;
    const percentChange = previous.value !== 0 ? (diff / previous.value) * 100 : 0;
    return { diff, percentChange };
  }, [current.value, previous.value]);

  const trend = useMemo(() => {
    if (change.diff > 0) return 'up';
    if (change.diff < 0) return 'down';
    return 'stable';
  }, [change.diff]);

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.comparisonRow}>
        <View style={styles.valueColumn}>
          <Text style={styles.label}>{current.label}</Text>
          <Text style={styles.currentValue}>{formatValue(current.value)}</Text>
        </View>
        
        <View style={styles.separator} />
        
        <View style={styles.valueColumn}>
          <Text style={styles.label}>{previous.label}</Text>
          <Text style={styles.previousValue}>{formatValue(previous.value)}</Text>
        </View>
      </View>

      {showTrend && (
        <View style={styles.trendRow}>
          <TrendIndicator direction={trend} />
          <Text style={[
            styles.changeText, 
            { color: trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280' }
          ]}>
            {change.diff > 0 ? '+' : ''}{formatValue(change.diff)} ({formatPercent(change.percentChange)})
          </Text>
        </View>
      )}
    </View>
  );
});

KPIComparison.displayName = 'KPIComparison';

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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  valueColumn: {
    flex: 1,
    alignItems: 'center'
  },
  separator: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  currentValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827'
  },
  previousValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280'
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb'
  },
  changeText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600'
  }
});