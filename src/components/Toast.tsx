import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  visible,
  onHide,
  duration = 3000,
}) => {
  const translateY = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.spring(translateY, {
      toValue: 100,
      useNativeDriver: true,
    }).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        styles[type],
        { transform: [{ translateY }] },
      ]}
    >
      <Text style={[styles.text, styles[`${type}Text`]]}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100, // Position at bottom instead of top
    left: spacing.md,
    right: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    zIndex: 9999, // Increased z-index
    ...shadows.md,
    elevation: 10, // For Android shadow
  },
  
  text: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.medium,
    textAlign: 'center',
  },
  
  // Types
  success: {
    backgroundColor: colors.success,
  },
  error: {
    backgroundColor: colors.error,
  },
  warning: {
    backgroundColor: colors.warning,
  },
  info: {
    backgroundColor: colors.info,
  },
  
  // Text colors
  successText: {
    color: colors.text.inverse,
  },
  errorText: {
    color: colors.text.inverse,
  },
  warningText: {
    color: colors.text.inverse,
  },
  infoText: {
    color: colors.text.inverse,
  },
});
