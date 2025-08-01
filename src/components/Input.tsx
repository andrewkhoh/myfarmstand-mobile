import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../utils/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  variant?: 'default' | 'outlined';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  variant = 'outlined',
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const inputStyles = [
    styles.base,
    styles[variant],
    isFocused && styles.focused,
    error && styles.error,
    style,
  ];

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={inputStyles}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholderTextColor={colors.text.tertiary}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  
  base: {
    fontSize: typography.fontSizes.base,
    color: colors.text.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: 44,
  },
  
  default: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  
  outlined: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  
  focused: {
    borderColor: colors.primary[600],
    borderWidth: 2,
  },
  
  error: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  
  errorText: {
    fontSize: typography.fontSizes.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
