/**
 * PermissionCheck Component
 * Conditionally renders children based on user permissions
 * Following docs/architectural-patterns-and-best-practices.md
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useCurrentUserRole, usePermissions } from '../../hooks/role-based';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { UserRole, Permission } from '../../types/roles';
import { Text } from '../Text';

interface PermissionCheckProps {
  /** Required permissions (user must have at least one) */
  permissions?: Permission[];
  /** Required roles (user must have one of these roles) */
  roles?: UserRole[];
  /** Required screen access permission */
  screen?: string;
  /** Fallback component when permission denied */
  fallback?: React.ComponentType<{ reason?: string }> | React.ReactNode;
  /** Show loading state while checking permissions */
  showLoading?: boolean;
  /** Custom loading component */
  loadingComponent?: React.ComponentType;
  /** Invert the permission check (show when NOT permitted) */
  invert?: boolean;
  /** Children to render when permissions are satisfied */
  children: React.ReactNode;
  /** Test ID for automation */
  testID?: string;
}

export const PermissionCheck: React.FC<PermissionCheckProps> = ({
  permissions = [],
  roles = [],
  screen,
  fallback,
  showLoading = true,
  loadingComponent: LoadingComponent,
  invert = false,
  children,
  testID = 'permission-gate'
}) => {
  // Get current user role from unified system
  const { role: userRole, isLoading: isUserLoading, isAdmin, isExecutive, isStaff } = useCurrentUserRole();

  // Get permissions check results using unified system
  const permissionsQuery = usePermissions(permissions);

  // Screen access - simplified for now (can be enhanced later with navigation permissions)
  const screenPermissionResult = screen ? { allowed: true, error: null } : null;

  // Determine permission status
  const permissionStatus = useMemo(() => {
    // Still loading user or permissions
    if (isUserLoading || (permissions.length > 0 && permissionsQuery.isLoading)) {
      return { allowed: false, loading: true, reason: 'Loading permissions...' };
    }

    // No user role available
    if (!userRole) {
      return {
        allowed: false,
        loading: false,
        reason: 'User not authenticated'
      };
    }

    let hasPermission = true;
    let denialReason = '';

    // Check role requirements
    if (roles.length > 0) {
      const hasRequiredRole = roles.includes(userRole);
      if (!hasRequiredRole) {
        hasPermission = false;
        denialReason = `Required role: ${roles.join(' or ')}`;
      }
    }

    // Check screen access requirements
    if (screen && hasPermission && screenPermissionResult) {
      if (screenPermissionResult.error) {
        hasPermission = false;
        denialReason = screenPermissionResult.error;
      } else if (!screenPermissionResult.allowed) {
        hasPermission = false;
        denialReason = `No access to ${screen}`;
      }
    }

    // Check permissions using unified system
    if (permissions.length > 0 && hasPermission) {
      // Admin always has all permissions
      if (isAdmin) {
        // Admin bypass - has all permissions
      } else if (permissionsQuery.data) {
        // Check if user has any of the required permissions
        const hasRequiredPermission = permissions.some(
          permission => permissionsQuery.data[permission] === true
        );

        if (!hasRequiredPermission) {
          hasPermission = false;
          denialReason = `Missing permission: ${permissions.join(' or ')}`;
        }
      } else {
        // No permission data available
        hasPermission = false;
        denialReason = 'Unable to verify permissions';
      }
    }

    // Apply inversion if specified
    const finalAllowed = invert ? !hasPermission : hasPermission;

    // Track permission check for analytics
    if (finalAllowed) {
      ValidationMonitor.recordPatternSuccess({
        service: 'PermissionCheck',
        pattern: 'permission_based_access',
        operation: 'accessGranted'
      });
    } else {
      ValidationMonitor.recordValidationError({
        context: 'PermissionCheck.permissionCheck',
        errorMessage: denialReason,
        errorCode: 'PERMISSION_DENIED'
      });
    }

    return {
      allowed: finalAllowed,
      loading: false,
      reason: finalAllowed ? undefined : denialReason
    };
  }, [
    isUserLoading,
    permissionsQuery.isLoading,
    permissionsQuery.data,
    userRole,
    roles,
    screen,
    screenPermissionResult,
    permissions,
    invert,
    isAdmin
  ]);

  // Show loading state
  if (permissionStatus.loading && showLoading) {
    if (LoadingComponent) {
      return <LoadingComponent />;
    }
    
    return (
      <View style={styles.loadingContainer} testID={`${testID}-loading`}>
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  // Permission denied - show fallback
  if (!permissionStatus.allowed) {
    // Custom fallback component
    if (React.isValidElement(fallback)) {
      return <>{fallback}</>;
    }
    
    // Fallback component with reason
    if (typeof fallback === 'function') {
      const FallbackComponent = fallback as React.ComponentType<{ reason?: string }>;
      return <FallbackComponent reason={permissionStatus.reason} />;
    }
    
    // Default fallback
    if (fallback === undefined) {
      return (
        <View style={styles.deniedContainer} testID={`${testID}-denied`}>
          <Text style={styles.deniedText}>Access Denied</Text>
          {permissionStatus.reason && (
            <Text style={styles.deniedReason}>{permissionStatus.reason}</Text>
          )}
        </View>
      );
    }
    
    // No fallback - render nothing
    return null;
  }

  // Permission granted - render children
  return (
    <View testID={`${testID}-granted`}>
      {children}
    </View>
  );
};

// NOTE: Permission checking is now handled by the centralized RolePermissionService
// through the useUserRole hook. No hardcoded permission mappings needed.

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  deniedContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  deniedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 4,
  },
  deniedReason: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});