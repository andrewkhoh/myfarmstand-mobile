/**
 * AccessControlButton Component
 * Enhanced permission-aware button with loading states and visual feedback
 * Following docs/architectural-patterns-and-best-practices.md
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  View,
  Alert,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useUserRole } from '../../hooks/role-based/useUserRole';
import { useNavigationPermissions } from '../../hooks/role-based/useNavigationPermissions';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { Text } from '../Text';
import { UserRole } from '../../types';

interface AccessControlButtonProps {
  /** Button title */
  title: string;
  /** onPress handler */
  onPress: () => void | Promise<void>;
  /** Required roles for access */
  roles?: UserRole[];
  /** Required permissions for access */
  permissions?: string[];
  /** Logic for multiple permissions (AND/OR) */
  permissionLogic?: 'AND' | 'OR';
  /** Screen navigation permission */
  screen?: string;
  /** Custom permission denied handler */
  onPermissionDenied?: (info: { reason: string }) => void;
  /** Show permission message on denial */
  showPermissionMessage?: boolean;
  /** Custom permission message */
  permissionMessage?: string;
  /** Hide button when access denied */
  hideWhenDenied?: boolean;
  /** Show denied state visually */
  showDeniedState?: boolean;
  /** Show lock icon when denied */
  showLockIcon?: boolean;
  /** Show tooltip with requirements */
  showTooltip?: boolean;
  /** Custom icon */
  icon?: string;
  /** External loading state */
  loading?: boolean;
  /** Loading text */
  loadingText?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Button style */
  style?: ViewStyle;
  /** Text style */
  textStyle?: TextStyle;
  /** Denied state style */
  deniedStyle?: ViewStyle;
  /** Test ID */
  testID?: string;
  /** Accessibility label */
  accessibilityLabel?: string;
}

export const AccessControlButton: React.FC<AccessControlButtonProps> = ({
  title,
  onPress,
  roles = [],
  permissions = [],
  permissionLogic = 'AND',
  screen,
  onPermissionDenied,
  showPermissionMessage = true,
  permissionMessage,
  hideWhenDenied = false,
  showDeniedState = false,
  showLockIcon = false,
  showTooltip = false,
  icon,
  loading = false,
  loadingText = 'Loading...',
  disabled = false,
  style,
  textStyle,
  deniedStyle,
  testID = 'access-control-button',
  accessibilityLabel,
}) => {
  const { data: userRole, isLoading: roleLoading } = useUserRole();
  const navPermissions = useNavigationPermissions({
    screens: screen ? [screen] : [],
    enableBatchCheck: false,
  });
  
  const screenAllowed = screen ? navPermissions.isAllowed(screen) : true;
  const screenChecked = screen ? navPermissions.getPermission(screen)?.checked : true;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [denialReason, setDenialReason] = useState<string>('');

  // Check permissions
  const checkAccess = useCallback(() => {
    // No user
    if (!userRole) {
      setAccessDenied(true);
      setDenialReason('User not authenticated');
      return false;
    }

    // Admin override - admins have all permissions
    if (userRole.role === 'admin') {
      setAccessDenied(false);
      return true;
    }

    // Check roles
    if (roles.length > 0 && !roles.includes(userRole.role)) {
      setAccessDenied(true);
      setDenialReason(`Missing role: ${roles.join(' or ')}`);
      return false;
    }

    // Check permissions
    if (permissions.length > 0) {
      const hasPermission = checkPermissions(userRole.role, permissions, permissionLogic);
      if (!hasPermission) {
        setAccessDenied(true);
        setDenialReason(`Missing permission: ${permissions.join(permissionLogic === 'AND' ? ' and ' : ' or ')}`);
        return false;
      }
    }

    // Check screen access
    if (screen && !screenAllowed) {
      setAccessDenied(true);
      setDenialReason(`No access to ${screen}`);
      return false;
    }

    setAccessDenied(false);
    return true;
  }, [userRole, roles, permissions, permissionLogic, screen, screenAllowed]);

  // Update access status
  useEffect(() => {
    if (!roleLoading && (!screen || screenChecked)) {
      checkAccess();
    }
  }, [roleLoading, screenChecked, checkAccess, screen]);

  // Handle press
  const handlePress = useCallback(async () => {
    if (disabled || loading || isProcessing) return;

    const hasAccess = checkAccess();

    if (!hasAccess) {
      // Record denial
      ValidationMonitor.recordValidationError({
        context: 'AccessControlButton.permissionCheck',
        errorMessage: denialReason,
        errorCode: 'ACCESS_DENIED',
      });

      // Handle denial
      if (onPermissionDenied) {
        onPermissionDenied({ reason: denialReason });
      } else if (showPermissionMessage) {
        Alert.alert(
          'Access Denied',
          permissionMessage || denialReason,
          [{ text: 'OK' }]
        );
      }
      return;
    }

    // Record success
    ValidationMonitor.recordPatternSuccess({
      service: 'AccessControlButton',
      pattern: 'permission_check',
      operation: 'accessGranted',
    });

    // Handle async operations
    try {
      setIsProcessing(true);
      await onPress();
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'AccessControlButton.asyncOperation',
        errorMessage: error instanceof Error ? error.message : 'Operation failed',
        errorCode: 'ASYNC_ERROR',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    disabled,
    loading,
    isProcessing,
    checkAccess,
    denialReason,
    onPermissionDenied,
    showPermissionMessage,
    permissionMessage,
    onPress,
  ]);

  // Loading state - calculate before all conditional returns
  const isLoading = roleLoading || (screen && !screenChecked) || loading || isProcessing;

  // Button styles
  const buttonStyles = useMemo(() => {
    const baseStyles = [styles.button];
    
    if (accessDenied && showDeniedState) {
      baseStyles.push(styles.deniedButton, deniedStyle);
    } else {
      baseStyles.push(style);
    }

    if (disabled || isLoading) {
      baseStyles.push(styles.disabledButton);
    }

    return baseStyles;
  }, [accessDenied, showDeniedState, deniedStyle, style, disabled, isLoading]);

  // Text styles
  const buttonTextStyles = useMemo(() => {
    const baseStyles = [styles.text];
    
    if (accessDenied && showDeniedState) {
      baseStyles.push(styles.deniedText);
    } else {
      baseStyles.push(textStyle);
    }

    if (disabled || isLoading) {
      baseStyles.push(styles.disabledText);
    }

    return baseStyles;
  }, [accessDenied, showDeniedState, textStyle, disabled, isLoading]);

  // Determine test ID based on state
  const currentTestID = useMemo(() => {
    if (isLoading) return `${testID}-loading`;
    if (accessDenied) return `${testID}-denied`;
    return testID;
  }, [testID, isLoading, accessDenied]);

  // Determine if button should be hidden (after all hooks)
  if (hideWhenDenied && accessDenied && !roleLoading) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || isLoading || (accessDenied && showDeniedState)}
        style={buttonStyles}
        testID={currentTestID}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityState={{
          disabled: disabled || isLoading || accessDenied,
        }}
      >
        <View style={styles.content}>
          {isLoading ? (
            <>
              <ActivityIndicator size="small" color="#666" style={styles.loader} />
              <Text style={buttonTextStyles}>
                {roleLoading ? 'Checking...' : loadingText}
              </Text>
            </>
          ) : (
            <>
              {showLockIcon && accessDenied && (
                <Text style={styles.lockIcon} testID={`${testID}-lock-icon`}>
                  🔒
                </Text>
              )}
              {icon && !accessDenied && (
                <Text style={styles.icon}>{icon}</Text>
              )}
              <Text style={buttonTextStyles}>{title}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>

      {showTooltip && accessDenied && !isLoading && (
        <View style={styles.tooltip} testID={`${testID}-tooltip`}>
          <Text style={styles.tooltipText}>
            Requires: {denialReason}
          </Text>
        </View>
      )}
    </>
  );
};

// Helper function to check permissions
function checkPermissions(
  userRole: UserRole,
  permissions: string[],
  logic: 'AND' | 'OR'
): boolean {
  // Simple permission mapping based on role
  const rolePermissions: Record<UserRole, string[]> = {
    customer: ['view:products', 'view:orders', 'checkout'],
    farmer: ['view:products', 'edit:products', 'view:orders', 'manage:inventory'],
    vendor: ['view:products', 'edit:products', 'view:orders', 'manage:inventory'],
    staff: ['view:products', 'edit:products', 'view:orders', 'manage:inventory', 'manage:orders'],
    manager: ['view:products', 'edit:products', 'view:orders', 'manage:inventory', 'manage:orders', 'view:analytics', 'manage:staff'],
    admin: [], // Admin has all permissions (handled above)
  };

  const userPermissions = rolePermissions[userRole] || [];

  if (logic === 'AND') {
    return permissions.every((p) => userPermissions.includes(p));
  } else {
    return permissions.some((p) => userPermissions.includes(p));
  }
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  deniedButton: {
    backgroundColor: '#E0E0E0',
    borderWidth: 1,
    borderColor: '#BDBDBD',
  },
  disabledButton: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deniedText: {
    color: '#757575',
  },
  disabledText: {
    color: '#9E9E9E',
  },
  loader: {
    marginRight: 8,
  },
  icon: {
    marginRight: 8,
    fontSize: 18,
  },
  lockIcon: {
    marginRight: 8,
    fontSize: 16,
  },
  tooltip: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#424242',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  tooltipText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
});