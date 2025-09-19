/**
 * RoleIndicator Component
 * Displays user's current role with styling
 * Following docs/architectural-patterns-and-best-practices.md
 */

import React, { useMemo } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useUserRole } from '../../hooks/role-based/useUserRole';
import { Text } from '../Text';
import { UserRole } from '../../types';

interface RoleIndicatorProps {
  /** Size variant of the indicator */
  size?: 'small' | 'medium' | 'large';
  /** Display style variant */
  variant?: 'badge' | 'chip' | 'minimal';
  /** Show role icon */
  showIcon?: boolean;
  /** Show role title (default: true) */
  showTitle?: boolean;
  /** Custom style override */
  style?: ViewStyle;
  /** Custom text style override */
  textStyle?: ViewStyle;
  /** Test ID for automation */
  testID?: string;
}

interface RoleConfig {
  title: string;
  icon: string;
  color: string;
  backgroundColor: string;
  textColor: string;
}

const roleConfigs: Record<UserRole, RoleConfig> = {
  customer: {
    title: 'Customer',
    icon: '🛍️',
    color: '#4CAF50',
    backgroundColor: '#E8F5E8',
    textColor: '#2E7D32',
  },
  farmer: {
    title: 'Farmer',
    icon: '🌾',
    color: '#8BC34A',
    backgroundColor: '#F1F8E9',
    textColor: '#558B2F',
  },
  vendor: {
    title: 'Vendor',
    icon: '🏪',
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
    textColor: '#F57C00',
  },
  admin: {
    title: 'Admin',
    icon: '⚙️',
    color: '#2196F3',
    backgroundColor: '#E3F2FD',
    textColor: '#1976D2',
  },
  staff: {
    title: 'Staff',
    icon: '👨‍💼',
    color: '#9C27B0',
    backgroundColor: '#F3E5F5',
    textColor: '#7B1FA2',
  },
  manager: {
    title: 'Manager',
    icon: '👔',
    color: '#795548',
    backgroundColor: '#EFEBE9',
    textColor: '#5D4037',
  },
};

export const RoleIndicator: React.FC<RoleIndicatorProps> = ({
  size = 'medium',
  variant = 'badge',
  showIcon = true,
  showTitle = true,
  style,
  textStyle,
  testID = 'role-indicator'
}) => {
  const { data: userRole, isLoading } = useUserRole();

  // Memoized styling based on size and variant
  const containerStyle = useMemo(() => {
    const sizeStyles = {
      small: styles.containerSmall,
      medium: styles.containerMedium,
      large: styles.containerLarge,
    };

    const variantStyles = {
      badge: styles.badgeVariant,
      chip: styles.chipVariant,
      minimal: styles.minimalVariant,
    };

    return [
      styles.container,
      sizeStyles[size],
      variantStyles[variant],
      style,
    ];
  }, [size, variant, style]);

  const textStyles = useMemo(() => {
    const sizeStyles = {
      small: styles.textSmall,
      medium: styles.textMedium,
      large: styles.textLarge,
    };

    return [
      styles.text,
      sizeStyles[size],
      textStyle,
    ];
  }, [size, textStyle]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[containerStyle, styles.loadingContainer]} testID={`${testID}-loading`}>
        <Text style={[textStyles, styles.loadingText]}>Loading...</Text>
      </View>
    );
  }

  // No role available
  if (!userRole?.role) {
    return (
      <View style={[containerStyle, styles.errorContainer]} testID={`${testID}-error`}>
        <Text style={[textStyles, styles.errorText]}>No Role</Text>
      </View>
    );
  }

  const roleConfig = roleConfigs[userRole.role];
  
  if (!roleConfig) {
    return (
      <View style={[containerStyle, styles.errorContainer]} testID={`${testID}-unknown`}>
        <Text style={[textStyles, styles.errorText]}>Unknown</Text>
      </View>
    );
  }

  // Apply role-specific styling
  const roleSpecificStyle = {
    backgroundColor: variant === 'minimal' ? 'transparent' : roleConfig.backgroundColor,
    borderColor: roleConfig.color,
    borderWidth: variant === 'minimal' ? 1 : 0,
  };

  const roleSpecificTextStyle = {
    color: roleConfig.textColor,
  };

  return (
    <View 
      style={[containerStyle, roleSpecificStyle]} 
      testID={testID}
    >
      {showIcon && (
        <Text 
          style={[textStyles, { marginRight: showTitle ? 6 : 0 }]}
          testID={`${testID}-icon`}
        >
          {roleConfig.icon}
        </Text>
      )}
      {showTitle && (
        <Text 
          style={[textStyles, roleSpecificTextStyle]}
          testID={`${testID}-title`}
        >
          {roleConfig.title}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  // Size variants
  containerSmall: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
  },
  containerMedium: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  containerLarge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  // Variant styles
  badgeVariant: {
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chipVariant: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  minimalVariant: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 12,
  },
  textLarge: {
    fontSize: 14,
  },
  // State styles
  loadingContainer: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
    borderWidth: 1,
  },
  loadingText: {
    color: '#666',
    fontStyle: 'italic',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
  },
  errorText: {
    color: '#d32f2f',
  },
});