import React, { useMemo } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

export interface AreaData {
  x: number | Date;
  y: number;
}

export interface AreaChartProps {
  data: AreaData[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  title?: string;
  testID?: string;
}

export const AreaChart = React.memo<AreaChartProps>(({
  data,
  width = Dimensions.get('window').width - 32,
  height = 200,
  color = '#4f46e5',
  fillOpacity = 0.3,
  title,
  testID = 'area-chart'
}) => {
  const chartData = useMemo(() => {
    if (data.length === 0) return { linePath: '', areaPath: '' };

    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const yValues = data.map(d => d.y);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    const rangeY = maxY - minY || 1;

    const points = data.map((d, i) => ({
      x: padding + (i / (data.length - 1 || 1)) * chartWidth,
      y: padding + chartHeight - ((d.y - minY) / rangeY) * chartHeight
    }));

    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    const areaPath = 
      linePath + 
      ` L ${points[points.length - 1].x} ${padding + chartHeight}` +
      ` L ${points[0].x} ${padding + chartHeight} Z`;

    return { linePath, areaPath };
  }, [data, width, height]);

  if (data.length === 0) {
    return (
      <View style={[styles.container, { width, height }]} testID={testID}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width }]} testID={testID}>
      {title && <Text style={styles.title}>{title}</Text>}
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
            <Stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </LinearGradient>
        </Defs>
        <Path
          d={chartData.areaPath}
          fill="url(#gradient)"
          testID={`${testID}-area`}
        />
        <Path
          d={chartData.linePath}
          stroke={color}
          strokeWidth={2}
          fill="none"
          testID={`${testID}-line`}
        />
      </Svg>
    </View>
  );
});

AreaChart.displayName = 'AreaChart';

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
    marginBottom: 12
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14
  }
});