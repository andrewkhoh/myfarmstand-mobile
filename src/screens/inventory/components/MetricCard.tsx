import React from 'react';
import { View, StyleSheet } from 'react-native';

interface MetricCardProps {
  testID?: string;
  title: string;
  value: number | string;
  variant?: 'default' | 'warning' | 'success' | 'danger';
}

export function MetricCard({ testID, title, value, variant = 'default' }: MetricCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return styles.warning;
      case 'success':
        return styles.success;
      case 'danger':
        return styles.danger;
      default:
        return styles.default;
    }
  };

  return (
    <View testID={testID} style={[styles.container, getVariantStyles()]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    margin: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    minWidth: 150,
  },
  title: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  default: {
    backgroundColor: '#f5f5f5',
  },
  warning: {
    backgroundColor: '#fff3cd',
  },
  success: {
    backgroundColor: '#d4edda',
  },
  danger: {
    backgroundColor: '#f8d7da',
  },
});