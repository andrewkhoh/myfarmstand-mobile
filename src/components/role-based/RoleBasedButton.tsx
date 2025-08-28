/**
 * RoleBasedButton Component
 * Button that adapts behavior and appearance based on user permissions
 * Following docs/architectural-patterns-and-best-practices.md
 */

import React, { useMemo, useCallback } from 'react';
import { Alert, ViewStyle } from 'react-native';
import { Button } from '../Button';
import { useUserRole } from '../../hooks/role-based/useUserRole';
import { useNavigationPermissions } from '../../hooks/role-based/useNavigationPermissions';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { UserRole } from '../../types';

interface RoleBasedButtonProps {
  /** Button title */
  title: string;
  /** Button press handler - only called if user has permission */
  onPress: () => void;
  /** Required permissions (user must have at least one) */
  permissions?: string[];
  /** Required roles (user must have one of these roles) */
  roles?: UserRole[];
  /** Required screen access permission */
  screen?: string;
  /** Button style when enabled */
  style?: ViewStyle;
  /** Button style when disabled due to permissions */
  disabledStyle?: ViewStyle;
  /** Show permission denial message on press when disabled */
  showPermissionMessage?: boolean;
  /** Custom permission denial message */
  permissionMessage?: string;
  /** Hide button entirely when no permission (default: false - shows disabled) */
  hideWhenDenied?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Disabled state (independent of permissions) */
  disabled?: boolean;
  /** Test ID for automation */
  testID?: string;
}

export const RoleBasedButton: React.FC<RoleBasedButtonProps> = ({
  title,
  onPress,
  permissions = [],
  roles = [],
  screen,
  style,
  disabledStyle,
  showPermissionMessage = true,
  permissionMessage,
  hideWhenDenied = false,
  loading = false,
  disabled = false,
  testID = 'role-based-button'
}) => {
  // Get current user role
  const { data: userRole, isLoading: isUserLoading } = useUserRole();

  // Get screen permissions if screen is specified
  const navPermissions = useNavigationPermissions({
    screens: screen ? [screen] : [],
    enableBatchCheck: false,
    cacheResults: true
  });
  
  const screenPermissionResult = screen ? {
    allowed: navPermissions.isAllowed(screen),
    checked: navPermissions.getPermission(screen)?.checked || false,
    error: navPermissions.getPermission(screen)?.error
  } : { allowed: true, checked: true, error: undefined };

  // Calculate permission status
  const permissionStatus = useMemo(() => {
    // Still loading
    if (isUserLoading || (screen && !screenPermissionResult.checked)) {
      return { 
        hasPermission: false, 
        loading: true, 
        reason: 'Checking permissions...' 
      };
    }

    // No user role
    if (!userRole?.role) {
      return { 
        hasPermission: false, 
        loading: false, 
        reason: 'Please log in to access this feature' 
      };
    }

    let hasPermission = true;
    let denialReason = '';

    // Check role requirements
    if (roles.length > 0) {
      const hasRequiredRole = roles.includes(userRole.role);
      if (!hasRequiredRole) {
        hasPermission = false;
        const roleNames = roles.map(role => getRoleDisplayName(role)).join(' or ');
        denialReason = `This feature requires ${roleNames} access`;
      }
    }

    // Check screen access requirements
    if (screen && hasPermission) {
      if (screenPermissionResult.error) {
        hasPermission = false;
        denialReason = `Navigation error: ${screenPermissionResult.error}`;
      } else if (!screenPermissionResult.allowed) {
        hasPermission = false;
        denialReason = `You don't have access to ${screen}`;
      }
    }

    // Check specific permissions
    if (permissions.length > 0 && hasPermission) {
      const rolePermissions = getRolePermissions(userRole.role);
      const hasRequiredPermission = permissions.some(permission => 
        rolePermissions.includes(permission) || rolePermissions.includes('*')
      );
      
      if (!hasRequiredPermission) {
        hasPermission = false;
        denialReason = `This feature requires ${permissions.join(' or ')} permission`;
      }
    }

    return { 
      hasPermission, 
      loading: false, 
      reason: hasPermission ? undefined : denialReason 
    };
  }, [
    isUserLoading,
    userRole?.role,
    roles,
    screen,
    screenPermissionResult,
    permissions
  ]);

  // Handle button press with permission checking
  const handlePress = useCallback(() => {
    // Don't handle press if button is independently disabled
    if (disabled || loading) {
      return;
    }
    
    if (!permissionStatus.hasPermission) {
      if (showPermissionMessage) {
        const message = permissionMessage || permissionStatus.reason || 'Access denied';
        
        ValidationMonitor.recordValidationError({
          context: 'RoleBasedButton.handlePress',
          errorMessage: message,
          errorCode: 'BUTTON_PERMISSION_DENIED'
        });

        Alert.alert(
          'Permission Required',
          message,
          [{ text: 'OK' }]
        );
      }
      return;
    }

    // Track successful permission check
    ValidationMonitor.recordPatternSuccess({
      service: 'RoleBasedButton' as const,
      pattern: 'permission_check' as const,
      operation: 'buttonAccessGranted' as const
    });

    onPress();
  }, [
    disabled,
    loading,
    permissionStatus.hasPermission,
    permissionStatus.reason,
    showPermissionMessage,
    permissionMessage,
    onPress
  ]);

  // Don't render if hiding when denied
  if (hideWhenDenied && !permissionStatus.hasPermission && !permissionStatus.loading) {
    return null;
  }

  // Calculate final disabled state
  // Only disable if explicitly disabled or loading. Permission denial is handled in onPress
  const isDisabled = disabled || loading || permissionStatus.loading;

  // Calculate button style
  const buttonStyle = useMemo(() => {
    if (isDisabled && disabledStyle) {
      return [style, disabledStyle];
    }
    return style;
  }, [style, disabledStyle, isDisabled]);

  // Calculate button title for loading states
  const buttonTitle = useMemo(() => {
    if (loading) return `${title}...`;
    if (permissionStatus.loading) return 'Checking...';
    return title;
  }, [title, loading, permissionStatus.loading]);

  return (
    <Button
      title={buttonTitle}
      onPress={handlePress}
      disabled={isDisabled}
      loading={loading || permissionStatus.loading}
      style={buttonStyle}
      testID={testID}
    />
  );
};

// Helper function to get display name for roles
const getRoleDisplayName = (role: UserRole): string => {
  const displayNames: Record<UserRole, string> = {
    customer: 'Customer',
    farmer: 'Farmer',
    vendor: 'Vendor',
    admin: 'Administrator',
    staff: 'Staff',
    manager: 'Manager',
  };
  
  return displayNames[role] || role;
};

// Helper function to get role permissions
const getRolePermissions = (role: UserRole): string[] => {
  const rolePermissionMap: Record<UserRole, string[]> = {
    customer: ['view:products', 'manage:cart', 'view:orders', 'manage:profile'],
    farmer: ['view:products', 'manage:products', 'view:orders', 'manage:inventory', 'view:analytics'],
    vendor: ['view:products', 'manage:products', 'view:orders', 'manage:inventory', 'view:analytics'],
    admin: ['*'], // Admin has all permissions
    staff: ['view:products', 'view:orders', 'manage:orders', 'view:inventory'],
    manager: ['view:products', 'manage:products', 'view:orders', 'manage:inventory', 'view:analytics', 'manage:staff', 'manage:orders'],
  };
  
  return rolePermissionMap[role] || [];
};