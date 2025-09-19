import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

// Placeholder chart components until Victory Native is properly configured
const VictoryPie = (props: any) => (
  <View style={{ backgroundColor: '#f5f5f5', borderRadius: 8, padding: 16, height: 200, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Pie Chart Placeholder</Text>
  </View>
);
const VictoryContainer = (props: any) => <View {...props} />;
const VictoryLegend = (props: any) => null;
const VictoryLabel = (props: any) => null;
import { formatPercent } from '../../../utils/formatters';

export interface CustomerSegmentChartProps {
  data: Array<{
    segment: string;
    count: number;
    color?: string;
  }>;
  width?: number;
  height?: number;
  title?: string;
  showLegend?: boolean;
}

export const CustomerSegmentChart: React.FC<CustomerSegmentChartProps> = ({
  data,
  width = Dimensions.get('window').width - 32,
  height = 300,
  title = 'Customer Segments',
  showLegend = true
}) => {
  const { chartData, legendData, total } = useMemo(() => {
    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    const total = data.reduce((sum, item) => sum + item.count, 0);

    const chartData = data.map((item, index) => ({
      x: item.segment,
      y: item.count,
      label: `${formatPercent(item.count / total)}`,
      fill: item.color || colors[index % colors.length]
    }));

    const legendData = data.map((item, index) => ({
      name: `${item.segment} (${item.count})`,
      symbol: { fill: item.color || colors[index % colors.length] }
    }));

    return { chartData, legendData, total };
  }, [data]);

  if (data.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No segment data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width }]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartContainer}>
        <VictoryPie
          data={chartData}
          width={width * 0.6}
          height={height * 0.7}
          innerRadius={60}
          padAngle={2}
          labelRadius={({ innerRadius = 0 }) => innerRadius + 40 }
          labelComponent={
            <VictoryLabel
              style={{ fontSize: 12, fill: "white", fontWeight: "600" }}
            />
          }
          containerComponent={<VictoryContainer />}
          style={{
            data: {
              fill: ({ datum }: { datum: any }) => datum.fill
            }
          }}
        />
        {showLegend && (
          <VictoryLegend
            x={width * 0.65}
            y={50}
            orientation="vertical"
            gutter={20}
            style={{
              labels: { fontSize: 12, fill: "#4b5563" }
            }}
            data={legendData}
          />
        )}
      </View>
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total Customers</Text>
        <Text style={styles.totalValue}>{total.toLocaleString()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  totalContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
});