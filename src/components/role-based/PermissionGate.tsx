/**
 * PermissionGate Component
 * Conditionally renders children based on user permissions
 * Following docs/architectural-patterns-and-best-practices.md
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useUserRole } from '../../hooks/role-based/useUserRole';
import { useNavigationPermissions } from '../../hooks/role-based/useNavigationPermissions';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { UserRole } from '../../types';
import { Text } from '../Text';

interface PermissionGateProps {
  /** Required permissions (user must have at least one) */
  permissions?: string[];
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

export const PermissionGate: React.FC<PermissionGateProps> = ({
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
  // Get current user role
  const { data: userRole, isLoading: isUserLoading } = useUserRole();

  // Get screen permissions if screen is specified
  const navPermissions = useNavigationPermissions({
    screens: screen ? [screen] : [],
    enableBatchCheck: true,
    cacheResults: true
  });
  
  const screenPermissionResult = screen ? navPermissions.getPermission(screen) : null;

  // Determine permission status
  const permissionStatus = useMemo(() => {
    // Still loading user or screen permissions
    if (isUserLoading || (screen && navPermissions.isLoading)) {
      return { allowed: false, loading: true, reason: 'Loading permissions...' };
    }

    // No user role available
    if (!userRole?.role) {
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
      const hasRequiredRole = roles.includes(userRole.role);
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

    // Check specific permissions (this would need integration with permission system)
    if (permissions.length > 0 && hasPermission) {
      // Note: This is a simplified check. In a real implementation,
      // you'd check against the user's actual permissions from the database
      const rolePermissions = getRolePermissions(userRole.role);
      
      // Admin has all permissions
      const hasRequiredPermission = rolePermissions.includes('*') ||
        permissions.some(permission => rolePermissions.includes(permission));
      
      if (!hasRequiredPermission) {
        hasPermission = false;
        denialReason = `Missing permission: ${permissions.join(' or ')}`;
      }
    }

    // Apply inversion if specified
    const finalAllowed = invert ? !hasPermission : hasPermission;
    
    // Track permission check for analytics
    if (finalAllowed) {
      ValidationMonitor.recordPatternSuccess({
        service: 'PermissionGate' as const,
        pattern: 'permission_check' as const,
        operation: 'accessGranted' as const
      });
    } else {
      ValidationMonitor.recordValidationError({
        context: 'PermissionGate.permissionCheck',
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
    userRole?.role,
    roles,
    screen,
    screenPermissionResult,
    navPermissions.isLoading,
    permissions,
    invert
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

// Helper function to get role permissions (simplified)
// In a real implementation, this would be more sophisticated
const getRolePermissions = (role: UserRole): string[] => {
  const rolePermissionMap: Record<UserRole, string[]> = {
    customer: ['view:products', 'manage:cart', 'view:orders', 'manage:profile'],
    farmer: ['view:products', 'manage:products', 'view:orders', 'manage:inventory', 'view:analytics'],
    vendor: ['view:products', 'manage:products', 'view:orders', 'manage:inventory', 'view:analytics'],
    admin: ['*'], // Admin has all permissions
    staff: ['view:products', 'view:orders', 'manage:orders', 'view:inventory'],
    manager: ['view:products', 'manage:products', 'view:orders', 'manage:inventory', 'view:analytics', 'view:staff']
  };
  
  return rolePermissionMap[role] || [];
};

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