import React from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export interface TrendIndicatorProps {
  direction: 'up' | 'down' | 'stable';
  color?: string;
  size?: number;
  testID?: string;
}

export const TrendIndicator = React.memo<TrendIndicatorProps>(({
  direction,
  color,
  size = 16,
  testID = 'trend-indicator'
}) => {
  const iconName = direction === 'up' ? 'trending-up' : 
                   direction === 'down' ? 'trending-down' : 
                   'trending-flat';
  
  const defaultColor = direction === 'up' ? '#10b981' :
                      direction === 'down' ? '#ef4444' :
                      '#6b7280';

  return (
    <View testID={testID} style={styles.container}>
      <Icon 
        name={iconName} 
        size={size} 
        color={color || defaultColor}
        testID={`trend-${direction}`}
      />
    </View>
  );
});

TrendIndicator.displayName = 'TrendIndicator';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center'
  }
});