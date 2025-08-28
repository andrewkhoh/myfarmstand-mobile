/**
 * PermissionBadge Component
 * Visual indicator for permission status
 * Following docs/architectural-patterns-and-best-practices.md
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useUserRole } from '../../hooks/role-based/useUserRole';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { Text } from '../Text';
import { UserRole } from '../../types';

interface PermissionBadgeProps {
  /** Single permission to check */
  permission?: string;
  /** Multiple permissions to check */
  permissions?: string[];
  /** Logic for multiple permissions */
  permissionLogic?: 'AND' | 'OR';
  /** Visual variant */
  variant?: 'minimal' | 'detailed' | 'icon-only';
  /** Show permission label */
  showLabel?: boolean;
  /** Hide when permission is granted */
  hideWhenGranted?: boolean;
  /** Hide when permission is denied */
  hideWhenDenied?: boolean;
  /** Hide during loading */
  hideWhenLoading?: boolean;
  /** Custom granted style */
  grantedStyle?: ViewStyle;
  /** Custom denied style */
  deniedStyle?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
  /** Test ID */
  testID?: string;
}

export const PermissionBadge: React.FC<PermissionBadgeProps> = ({
  permission,
  permissions = [],
  permissionLogic = 'AND',
  variant = 'minimal',
  showLabel = false,
  hideWhenGranted = false,
  hideWhenDenied = false,
  hideWhenLoading = false,
  grantedStyle,
  deniedStyle,
  textStyle,
  testID = 'permission-badge',
}) => {
  const { data: userRole, isLoading } = useUserRole();

  // Combine single and multiple permissions
  const allPermissions = useMemo(() => {
    const perms = [...permissions];
    if (permission) {
      perms.push(permission);
    }
    return perms;
  }, [permission, permissions]);

  // Check permissions
  const hasPermission = useMemo(() => {
    if (!userRole) {
      return false;
    }

    // Admin has all permissions
    if (userRole.role === 'admin') {
      return true;
    }

    if (allPermissions.length === 0) {
      return true; // No permissions required
    }

    return checkPermissions(userRole.role, allPermissions, permissionLogic);
  }, [userRole, allPermissions, permissionLogic]);

  // Record monitoring events
  React.useEffect(() => {
    if (!isLoading && allPermissions.length > 0) {
      if (hasPermission) {
        ValidationMonitor.recordPatternSuccess({
          service: 'PermissionBadge',
          pattern: 'permission_check',
          operation: 'badgeGranted',
        });
      } else {
        ValidationMonitor.recordValidationError({
          context: 'PermissionBadge.permissionCheck',
          errorMessage: `Permission denied: ${allPermissions.join(', ')}`,
          errorCode: 'BADGE_PERMISSION_DENIED',
        });
      }
    }
  }, [isLoading, hasPermission, allPermissions]);

  // Determine visibility
  if (isLoading && hideWhenLoading) {
    return null;
  }

  if (!isLoading) {
    if (hasPermission && hideWhenGranted) {
      return null;
    }
    if (!hasPermission && hideWhenDenied) {
      return null;
    }
  }

  // Determine content based on state and variant
  const getContent = () => {
    if (isLoading) {
      return {
        icon: '...',
        label: 'Checking',
        description: 'Verifying permissions...',
      };
    }

    if (hasPermission) {
      return {
        icon: '✓',
        label: showLabel ? (permission || permissions.join(', ')) : '',
        description: 'Access Granted',
      };
    }

    return {
      icon: '✗',
      label: showLabel ? (permission || permissions.join(', ')) : '',
      description: 'Access Denied',
    };
  };

  const content = getContent();

  // Determine styles
  const badgeStyles = useMemo(() => {
    const baseStyles = [styles.badge];
    
    if (isLoading) {
      baseStyles.push(styles.loadingBadge);
    } else if (hasPermission) {
      baseStyles.push(styles.grantedBadge, grantedStyle);
    } else {
      baseStyles.push(styles.deniedBadge, deniedStyle);
    }

    if (variant === 'minimal') {
      baseStyles.push(styles.minimalBadge);
    } else if (variant === 'detailed') {
      baseStyles.push(styles.detailedBadge);
    } else if (variant === 'icon-only') {
      baseStyles.push(styles.iconOnlyBadge);
    }

    return baseStyles;
  }, [isLoading, hasPermission, variant, grantedStyle, deniedStyle]);

  const badgeTextStyles = useMemo(() => {
    const baseStyles = [styles.text];
    
    if (isLoading) {
      baseStyles.push(styles.loadingText);
    } else if (hasPermission) {
      baseStyles.push(styles.grantedText);
    } else {
      baseStyles.push(styles.deniedText);
    }

    baseStyles.push(textStyle);

    return baseStyles;
  }, [isLoading, hasPermission, textStyle]);

  // Determine test ID
  const currentTestID = useMemo(() => {
    if (isLoading) return `${testID}-loading`;
    if (hasPermission) return `${testID}-granted`;
    return `${testID}-denied`;
  }, [testID, isLoading, hasPermission]);

  return (
    <View style={badgeStyles} testID={currentTestID}>
      {(variant === 'icon-only' || variant === 'minimal') && (
        <Text style={[badgeTextStyles, styles.icon]}>{content.icon}</Text>
      )}
      
      {variant === 'minimal' && content.label && (
        <Text style={badgeTextStyles}>{content.label}</Text>
      )}

      {variant === 'detailed' && (
        <>
          <Text style={[badgeTextStyles, styles.detailedIcon]}>{content.icon}</Text>
          <View style={styles.detailedContent}>
            <Text style={[badgeTextStyles, styles.detailedTitle]}>
              {content.description}
            </Text>
            {content.label && (
              <Text style={[badgeTextStyles, styles.detailedLabel]}>
                {content.label}
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  );
};

// Helper function to check permissions
function checkPermissions(
  userRole: UserRole,
  permissions: string[],
  logic: 'AND' | 'OR'
): boolean {
  // Permission mapping based on role
  const rolePermissions: Record<UserRole, string[]> = {
    customer: ['view:products', 'view:orders', 'checkout'],
    farmer: ['view:products', 'edit:products', 'view:orders', 'manage:inventory'],
    vendor: ['view:products', 'edit:products', 'view:orders', 'manage:inventory'],
    staff: [
      'view:products',
      'edit:products',
      'view:orders',
      'manage:inventory',
      'manage:orders',
    ],
    admin: [], // Admin has all permissions (handled separately)
  };

  const userPermissions = rolePermissions[userRole] || [];

  if (logic === 'AND') {
    return permissions.every((p) => userPermissions.includes(p));
  } else {
    return permissions.some((p) => userPermissions.includes(p));
  }
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  minimalBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  detailedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  iconOnlyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 16,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grantedBadge: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  deniedBadge: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    borderWidth: 1,
  },
  loadingBadge: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  grantedText: {
    color: '#2E7D32',
  },
  deniedText: {
    color: '#C62828',
  },
  loadingText: {
    color: '#757575',
  },
  icon: {
    fontSize: 14,
    marginRight: 4,
  },
  detailedIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  detailedContent: {
    flex: 1,
  },
  detailedTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailedLabel: {
    fontSize: 11,
    marginTop: 2,
    opacity: 0.8,
  },
});