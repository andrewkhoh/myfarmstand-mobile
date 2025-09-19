import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

// Placeholder chart components until Victory Native is properly configured
const VictoryChart = ({ children, ...props }: any) => (
  <View style={{ backgroundColor: '#f5f5f5', borderRadius: 8, padding: 16 }}>
    {children}
  </View>
);
const VictoryBar = (props: any) => null;
const VictoryAxis = (props: any) => null;
const VictoryTheme = { material: {} };
const VictoryLabel = (props: any) => null;
const VictoryTooltip = (props: any) => null;
const VictoryContainer = (props: any) => <View {...props} />;

export interface OrderChartProps {
  data: Array<{
    date: Date | string;
    orders: number;
  }>;
  width?: number;
  height?: number;
  title?: string;
  color?: string;
}

export const OrderChart: React.FC<OrderChartProps> = ({
  data,
  width = Dimensions.get('window').width - 32,
  height = 250,
  title = 'Order Volume',
  color = '#10b981'
}) => {
  const chartData = useMemo(() => {
    return data.map(item => ({
      x: item.date instanceof Date ? item.date : new Date(item.date),
      y: item.orders,
      label: `${item.orders} orders`
    }));
  }, [data]);

  const maxOrders = useMemo(() => {
    return Math.max(...chartData.map(d => d.y));
  }, [chartData]);

  if (data.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No order data available</Text>
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
        padding={{ left: 60, top: 20, right: 20, bottom: 50 }}
        domain={{ y: [0, maxOrders * 1.2] }}
        containerComponent={<VictoryContainer />}
      >
        <VictoryAxis
          dependentAxis
          tickFormat={(t: any) => Math.round(t).toString()}
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
        <VictoryBar
          data={chartData}
          style={{
            data: { fill: color, width: 20 }
          }}
          labelComponent={<VictoryTooltip />}
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