import React from 'react';
import { Text as RNText, StyleSheet, TextStyle } from 'react-native';
import { colors, typography } from '../utils/theme';

interface TextProps {
  children: React.ReactNode;
  variant?: 'heading1' | 'heading2' | 'heading3' | 'body' | 'caption' | 'label';
  color?: 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'success' | 'warning' | 'error';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
  style?: TextStyle;
  numberOfLines?: number;
  testID?: string;
}

export const Text: React.FC<TextProps> = ({
  children,
  variant = 'body',
  color = 'primary',
  weight,
  align = 'left',
  style,
  numberOfLines,
  testID,
}) => {
  const textStyles = [
    styles.base,
    styles[variant],
    styles[`color_${color}`],
    weight && styles[`weight_${weight}`],
    { textAlign: align },
    style,
  ];

  return (
    <RNText style={textStyles} numberOfLines={numberOfLines} testID={testID}>
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  base: {
    fontFamily: 'System',
  },
  
  // Variants
  heading1: {
    fontSize: typography.fontSizes['4xl'],
    fontWeight: typography.fontWeights.bold,
    lineHeight: typography.fontSizes['4xl'] * typography.lineHeights.tight,
  },
  heading2: {
    fontSize: typography.fontSizes['3xl'],
    fontWeight: typography.fontWeights.bold,
    lineHeight: typography.fontSizes['3xl'] * typography.lineHeights.tight,
  },
  heading3: {
    fontSize: typography.fontSizes['2xl'],
    fontWeight: typography.fontWeights.semibold,
    lineHeight: typography.fontSizes['2xl'] * typography.lineHeights.tight,
  },
  body: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.normal,
    lineHeight: typography.fontSizes.base * typography.lineHeights.normal,
  },
  caption: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.normal,
    lineHeight: typography.fontSizes.sm * typography.lineHeights.normal,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    lineHeight: typography.fontSizes.sm * typography.lineHeights.normal,
  },
  
  // Colors
  color_primary: {
    color: colors.text.primary,
  },
  color_secondary: {
    color: colors.text.secondary,
  },
  color_tertiary: {
    color: colors.text.tertiary,
  },
  color_inverse: {
    color: colors.text.inverse,
  },
  color_success: {
    color: colors.success,
  },
  color_warning: {
    color: colors.warning,
  },
  color_error: {
    color: colors.error,
  },
  
  // Weights
  weight_normal: {
    fontWeight: typography.fontWeights.normal,
  },
  weight_medium: {
    fontWeight: typography.fontWeights.medium,
  },
  weight_semibold: {
    fontWeight: typography.fontWeights.semibold,
  },
  weight_bold: {
    fontWeight: typography.fontWeights.bold,
  },
});
