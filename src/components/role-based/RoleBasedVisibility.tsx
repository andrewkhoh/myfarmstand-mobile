/**
 * RoleBasedVisibility Component
 * Simple wrapper for showing/hiding components based on user roles
 * Following docs/architectural-patterns-and-best-practices.md
 */

import React from 'react';
import { useUserRole } from '../../hooks/role-based/useUserRole';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { UserRole } from '../../types';

interface RoleBasedVisibilityProps {
  /** Roles that should see this content */
  allowedRoles?: UserRole[];
  /** Roles that should NOT see this content */
  deniedRoles?: UserRole[];
  /** Show content when user is not authenticated (default: false) */
  showWhenUnauthenticated?: boolean;
  /** Show content while loading user role (default: false) */
  showWhileLoading?: boolean;
  /** Children to conditionally render */
  children: React.ReactNode;
  /** Test ID for automation */
  testID?: string;
}

export const RoleBasedVisibility: React.FC<RoleBasedVisibilityProps> = ({
  allowedRoles = [],
  deniedRoles = [],
  showWhenUnauthenticated = false,
  showWhileLoading = false,
  children,
  testID = 'role-based-visibility'
}) => {
  const { data: userRole, isLoading } = useUserRole();

  // Show loading state if configured
  if (isLoading) {
    return showWhileLoading ? <>{children}</> : null;
  }

  // Handle unauthenticated user
  if (!userRole?.role) {
    return showWhenUnauthenticated ? <>{children}</> : null;
  }

  const currentRole = userRole.role;

  // Check denied roles first (takes precedence)
  if (deniedRoles.length > 0 && deniedRoles.includes(currentRole)) {
    ValidationMonitor.recordPatternSuccess({
      service: 'RoleBasedVisibility' as const,
      pattern: 'role_filtering' as const,
      operation: 'contentHidden' as const
    });
    return null;
  }

  // Check allowed roles
  if (allowedRoles.length > 0) {
    if (!allowedRoles.includes(currentRole)) {
      ValidationMonitor.recordPatternSuccess({
        service: 'RoleBasedVisibility' as const,
        pattern: 'role_filtering' as const,
        operation: 'contentHidden' as const
      });
      return null;
    }
  }

  // Show content
  ValidationMonitor.recordPatternSuccess({
    service: 'RoleBasedVisibility' as const,
    pattern: 'role_filtering' as const,
    operation: 'contentShown' as const
  });

  return <div data-testid={testID}>{children}</div>;
};