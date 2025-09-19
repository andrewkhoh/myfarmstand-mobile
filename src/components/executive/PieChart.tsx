import React, { useMemo } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { formatPercent } from '../../utils/formatters';

export interface PieData {
  label: string;
  value: number;
  color?: string;
}

export interface PieChartProps {
  data: PieData[];
  size?: number;
  innerRadius?: number;
  showLabels?: boolean;
  showLegend?: boolean;
  title?: string;
  testID?: string;
}

export const PieChart = React.memo<PieChartProps>(({
  data,
  size = Math.min(Dimensions.get('window').width - 64, 200),
  innerRadius = 0,
  showLabels = false,
  showLegend = true,
  title,
  testID = 'pie-chart'
}) => {
  const chartData = useMemo(() => {
    if (data.length === 0) return { slices: [] };

    const total = data.reduce((sum, item) => sum + item.value, 0);
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10;

    const defaultColors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    let currentAngle = -Math.PI / 2;

    const slices = data.map((item, index) => {
      const percentage = item.value / total;
      const angle = percentage * Math.PI * 2;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const x1 = centerX + Math.cos(startAngle) * radius;
      const y1 = centerY + Math.sin(startAngle) * radius;
      const x2 = centerX + Math.cos(endAngle) * radius;
      const y2 = centerY + Math.sin(endAngle) * radius;

      const innerX1 = centerX + Math.cos(startAngle) * innerRadius;
      const innerY1 = centerY + Math.sin(startAngle) * innerRadius;
      const innerX2 = centerX + Math.cos(endAngle) * innerRadius;
      const innerY2 = centerY + Math.sin(endAngle) * innerRadius;

      const largeArcFlag = angle > Math.PI ? 1 : 0;

      const pathData = innerRadius > 0
        ? `M ${innerX1} ${innerY1} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${innerX2} ${innerY2} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerX1} ${innerY1}`
        : `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      const labelAngle = (startAngle + endAngle) / 2;
      const labelRadius = (radius + innerRadius) / 2 || radius * 0.7;
      const labelX = centerX + Math.cos(labelAngle) * labelRadius;
      const labelY = centerY + Math.sin(labelAngle) * labelRadius;

      return {
        path: pathData,
        color: item.color || defaultColors[index % defaultColors.length],
        percentage,
        label: item.label,
        value: item.value,
        labelX,
        labelY
      };
    });

    return { slices };
  }, [data, size, innerRadius]);

  if (data.length === 0) {
    return (
      <View style={styles.container} testID={testID}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.chartContainer}>
        <Svg width={size} height={size}>
          {chartData.slices.map((slice, index) => (
            <Path
              key={`slice-${index}`}
              d={slice.path}
              fill={slice.color}
              testID={`${testID}-slice-${index}`}
            />
          ))}
          {showLabels && chartData.slices.map((slice, index) => (
            <SvgText
              key={`label-${index}`}
              x={slice.labelX}
              y={slice.labelY}
              fontSize={12}
              fill="white"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {formatPercent(slice.percentage * 100)}
            </SvgText>
          ))}
        </Svg>
        {showLegend && (
          <View style={styles.legend}>
            {chartData.slices.map((slice, index) => (
              <View key={`legend-${index}`} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: slice.color }]} />
                <Text style={styles.legendLabel}>{slice.label}</Text>
                <Text style={styles.legendValue}>{formatPercent(slice.percentage * 100)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
});

PieChart.displayName = 'PieChart';

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
  chartContainer: {
    alignItems: 'center'
  },
  legend: {
    marginTop: 16,
    width: '100%'
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 8
  },
  legendLabel: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280'
  },
  legendValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600'
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14
  }
});