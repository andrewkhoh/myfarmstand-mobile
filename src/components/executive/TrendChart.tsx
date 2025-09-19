import React, { useMemo } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import { formatCompactNumber } from '../../utils/formatters';

export interface DataPoint {
  x: number | Date;
  y: number;
  label?: string;
}

export interface TrendChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  showPoints?: boolean;
  showLabels?: boolean;
  title?: string;
  testID?: string;
}

export const TrendChart = React.memo<TrendChartProps>(({
  data,
  width = Dimensions.get('window').width - 32,
  height = 200,
  color = '#4f46e5',
  showPoints = true,
  showLabels = false,
  title,
  testID = 'trend-chart'
}) => {
  const chartData = useMemo(() => {
    if (data.length === 0) return { path: '', points: [], labels: [], minY: 0, maxY: 0 };

    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const yValues = data.map(d => d.y);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    const rangeY = maxY - minY || 1;

    const points = data.map((d, i) => ({
      x: padding + (i / (data.length - 1 || 1)) * chartWidth,
      y: padding + chartHeight - ((d.y - minY) / rangeY) * chartHeight,
      value: d.y,
      label: d.label || ''
    }));

    const pathData = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    return { path: pathData, points, labels: [], minY, maxY };
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
        <Path
          d={chartData.path}
          stroke={color}
          strokeWidth={2}
          fill="none"
          testID={`${testID}-line`}
        />
        {showPoints && chartData.points.map((point, index) => (
          <Circle
            key={`point-${index}`}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={color}
            testID={`${testID}-point-${index}`}
          />
        ))}
        {showLabels && (
          <>
            <SvgText x={10} y={15} fontSize={10} fill="#6b7280">
              {formatCompactNumber(chartData.maxY)}
            </SvgText>
            <SvgText x={10} y={height - 5} fontSize={10} fill="#6b7280">
              {formatCompactNumber(chartData.minY)}
            </SvgText>
          </>
        )}
      </Svg>
    </View>
  );
});

TrendChart.displayName = 'TrendChart';

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