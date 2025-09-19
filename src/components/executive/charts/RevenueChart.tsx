import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

// Placeholder chart components until Victory Native is properly configured
const VictoryChart = ({ children, ...props }: any) => (
  <View style={{ backgroundColor: '#f5f5f5', borderRadius: 8, padding: 16 }}>
    {children}
  </View>
);
const VictoryLine = (props: any) => null;
const VictoryAxis = (props: any) => null;
const VictoryTheme = { material: {} };
const VictoryArea = (props: any) => null;
const VictoryLabel = (props: any) => null;
const VictoryTooltip = (props: any) => null;
const VictoryVoronoiContainer = (props: any) => <View {...props} />;
import { formatCurrency, formatCompactNumber } from '../../../utils/formatters';

export interface RevenueChartProps {
  data: Array<{
    date: Date | string;
    revenue: number;
  }>;
  width?: number;
  height?: number;
  showArea?: boolean;
  showTooltip?: boolean;
  title?: string;
  color?: string;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  width = Dimensions.get('window').width - 32,
  height = 250,
  showArea = true,
  showTooltip = true,
  title = 'Revenue Trend',
  color = '#4f46e5'
}) => {
  const chartData = useMemo(() => {
    return data.map(item => ({
      x: item.date instanceof Date ? item.date : new Date(item.date),
      y: item.revenue,
      label: formatCurrency(item.revenue)
    }));
  }, [data]);

  const maxRevenue = useMemo(() => {
    return Math.max(...chartData.map(d => d.y));
  }, [chartData]);

  const containerComponent = showTooltip
    ? <VictoryVoronoiContainer
        labels={({ datum }: { datum: any }) => `${datum.label}`}
        labelComponent={
          <VictoryTooltip
            cornerRadius={4}
            flyoutStyle={{ fill: "white", stroke: "#e5e7eb", strokeWidth: 1 }}
            style={{ fontSize: 12 }}
          />
        }
      />
    : undefined;

  if (data.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No revenue data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width }]}>
      <Text style={styles.title}>{title}</Text>
      <VictoryChart
        width={width}
        height={height}
        theme={VictoryTheme.material}
        containerComponent={containerComponent}
        padding={{ left: 70, top: 20, right: 20, bottom: 50 }}
        domain={{ y: [0, maxRevenue * 1.1] }}
      >
        <VictoryAxis
          dependentAxis
          tickFormat={(t: any) => formatCompactNumber(t)}
          style={{
            axis: { stroke: "#e5e7eb" },
            ticks: { stroke: "#e5e7eb", size: 5 },
            tickLabels: { fontSize: 10, fill: "#6b7280" },
            grid: { stroke: "#f3f4f6", strokeDasharray: "2,2" }
          }}
        />
        <VictoryAxis
          fixLabelOverlap
          style={{
            axis: { stroke: "#e5e7eb" },
            ticks: { stroke: "#e5e7eb", size: 5 },
            tickLabels: { fontSize: 10, fill: "#6b7280", angle: -45 }
          }}
          tickFormat={(x: any) => {
            const date = new Date(x);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }}
        />
        {showArea && (
          <VictoryArea
            data={chartData}
            style={{
              data: { fill: `${color}20`, stroke: color, strokeWidth: 0 }
            }}
          />
        )}
        <VictoryLine
          data={chartData}
          style={{
            data: { stroke: color, strokeWidth: 2 }
          }}
          interpolation="monotoneX"
        />
      </VictoryChart>
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
});