import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing } from '../utils/theme';
import { Text } from './Text';

interface LoadingProps {
  size?: 'small' | 'large';
  message?: string;
  overlay?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'large',
  message,
  overlay = false,
}) => {
  const containerStyle = overlay ? styles.overlay : styles.container;

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={colors.primary[600]} />
      {Boolean(message) && (
        <Text variant="body" color="secondary" style={styles.message}>
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  message: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
