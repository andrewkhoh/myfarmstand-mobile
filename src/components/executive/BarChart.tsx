import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { formatCompactNumber } from '../../utils/formatters';

export interface BarData {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartProps {
  data: BarData[];
  width?: number;
  height?: number;
  barColor?: string;
  showValues?: boolean;
  title?: string;
  horizontal?: boolean;
  testID?: string;
}

export const BarChart = React.memo<BarChartProps>(({
  data,
  width = Dimensions.get('window').width - 32,
  height = 200,
  barColor = '#4f46e5',
  showValues = true,
  title,
  horizontal = false,
  testID = 'bar-chart'
}) => {
  const chartData = useMemo(() => {
    if (data.length === 0) return { bars: [] };

    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxValue = Math.max(...data.map(d => d.value));

    if (horizontal) {
      const barHeight = chartHeight / data.length;
      const bars = data.map((item, index) => ({
        x: padding,
        y: padding + index * barHeight,
        width: (item.value / maxValue) * chartWidth,
        height: barHeight * 0.8,
        value: item.value,
        label: item.label,
        color: item.color || barColor
      }));
      return { bars };
    } else {
      const barWidth = chartWidth / data.length;
      const bars = data.map((item, index) => ({
        x: padding + index * barWidth + barWidth * 0.1,
        y: padding + chartHeight - (item.value / maxValue) * chartHeight,
        width: barWidth * 0.8,
        height: (item.value / maxValue) * chartHeight,
        value: item.value,
        label: item.label,
        color: item.color || barColor
      }));
      return { bars };
    }
  }, [data, width, height, barColor, horizontal]);

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
        {chartData.bars.map((bar, index) => (
          <React.Fragment key={`bar-${index}`}>
            <Rect
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              fill={bar.color}
              testID={`${testID}-bar-${index}`}
            />
            {showValues && (
              <SvgText
                x={horizontal ? bar.x + bar.width + 5 : bar.x + bar.width / 2}
                y={horizontal ? bar.y + bar.height / 2 : bar.y - 5}
                fontSize={10}
                fill="#6b7280"
                textAnchor={horizontal ? 'start' : 'middle'}
                alignmentBaseline="middle"
              >
                {formatCompactNumber(bar.value)}
              </SvgText>
            )}
          </React.Fragment>
        ))}
      </Svg>
      <View style={styles.labels}>
        {data.map((item, index) => (
          <Text key={`label-${index}`} style={styles.label}>
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
});

BarChart.displayName = 'BarChart';

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
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8
  },
  label: {
    fontSize: 10,
    color: '#6b7280'
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14
  }
});