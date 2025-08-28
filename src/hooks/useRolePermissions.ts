/**
 * useRolePermissions Hook - Role permissions management with React Query
 * Following Pattern: React Query Patterns from docs/architectural-patterns-and-best-practices.md
 *
 * DEPRECATION NOTICE:
 * This module will be phased out in favor of the canonical API in
 * `src/hooks/role-based/permissions.ts`.
 *
 * Prefer importing from `src/hooks/role-based/permissions`:
 *  - useUserPermissions(userId)
 *  - useRolePermissionsByType(roleType)
 *  - useHasPermission(userId, permission)
 *  - useCanPerformAction(userId, resource, action)
 *  - useHasAllPermissions(userId, permissions)
 *  - useHasAnyPermission(userId, permissions)
 *  - useCurrentUser* variants
 *
 * This file remains to preserve backward compatibility for tests and
 * existing imports. Behavior is unchanged.
 */

import { useQuery } from '@tanstack/react-query';
import { roleService, RolePermission } from '../services/roleService';
import { UserRole } from '../types';
import { roleKeys } from '../utils/queryKeyFactory';
import { useCurrentUser } from './useAuth';

/**
 * Hook to fetch permissions for a specific role
 * Following Pattern: User-Isolated Query Keys
 */
export const useRolePermissions = (role: UserRole) => {
  return useQuery({
    queryKey: [...roleKeys.allRoles(), 'permissions', role],
    queryFn: () => roleService.getRolePermissions(role),
    // Following Pattern: Optimized Cache Configuration
    staleTime: 10 * 60 * 1000,  // 10 minutes - permissions rarely change
    gcTime: 15 * 60 * 1000,     // 15 minutes - longer cache retention
    refetchOnMount: false,       // Don't refetch on mount for stable data
    refetchOnWindowFocus: false, // Don't spam on focus changes
    // Following Pattern: Error Recovery & User Experience
    retry: 1,
    retryDelay: 1000,
  });
};

/**
 * Hook to fetch permissions for a specific user
 * Following Pattern: Smart Query Invalidation
 */
export const useUserPermissions = (userId: string | null) => {
  // If no userId provided, return empty state
  if (!userId) {
    return {
      data: [],
      isLoading: false,
      error: null,
      isSuccess: true,
      refetch: () => Promise.resolve({ data: [] } as any),
    };
  }

  return useQuery({
    queryKey: roleKeys.permissions(userId),
    queryFn: () => roleService.getUserPermissions(userId),
    // Following Pattern: Optimized Cache Configuration
    staleTime: 5 * 60 * 1000,   // 5 minutes - user permissions may change more often
    gcTime: 10 * 60 * 1000,     // 10 minutes - reasonable cleanup
    refetchOnMount: true,        // Check on mount for security
    refetchOnWindowFocus: false, // Don't spam on focus changes
    retry: 1,
    retryDelay: 1000,
  });
};

/**
 * Hook to check if a user has a specific permission
 * Following Pattern: Comprehensive Error Handling
 */
export const useHasPermission = (userId: string | null, permission: string) => {
  // If no userId, deny permission
  if (!userId) {
    return {
      data: false,
      isLoading: false,
      error: null,
      isSuccess: true,
    };
  }

  return useQuery({
    queryKey: [...roleKeys.permissions(userId), 'check', permission],
    queryFn: () => roleService.hasPermission(userId, permission),
    staleTime: 2 * 60 * 1000,   // 2 minutes - permission checks should be fresh
    gcTime: 5 * 60 * 1000,      // 5 minutes
    refetchOnMount: true,        // Always check on mount for security
    refetchOnWindowFocus: false,
    retry: 0,                    // No retry on permission checks - fail secure
  });
};

/**
 * Hook to check if a user can perform an action on a resource
 * Following Pattern: User-Friendly Error Messages
 */
export const useCanPerformAction = (
  userId: string | null,
  resource: string,
  action: string
) => {
  // If no userId, deny action
  if (!userId) {
    return {
      data: false,
      isLoading: false,
      error: null,
      isSuccess: true,
    };
  }

  return useQuery({
    queryKey: [...roleKeys.permissions(userId), 'action', resource, action],
    queryFn: () => roleService.canPerformAction(userId, resource, action),
    staleTime: 2 * 60 * 1000,   // 2 minutes
    gcTime: 5 * 60 * 1000,      // 5 minutes
    refetchOnMount: true,        // Always check on mount for security
    refetchOnWindowFocus: false,
    retry: 0,                    // No retry - fail secure
  });
};

/**
 * Hook to get current user's permissions
 * Following Pattern: Graceful Degradation
 */
export const useCurrentUserPermissions = () => {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  const {
    data: permissions = [],
    isLoading: permissionsLoading,
    error,
    refetch,
  } = useUserPermissions(currentUser?.id || null);

  return {
    permissions,
    isLoading: userLoading || permissionsLoading,
    error,
    refetch,
    userId: currentUser?.id,
  };
};

/**
 * Hook to check if current user has a specific permission
 */
export const useCurrentUserHasPermission = (permission: string) => {
  const { data: currentUser } = useCurrentUser();
  return useHasPermission(currentUser?.id || null, permission);
};

/**
 * Hook to check if current user can perform an action
 */
export const useCurrentUserCanPerformAction = (resource: string, action: string) => {
  const { data: currentUser } = useCurrentUser();
  return useCanPerformAction(currentUser?.id || null, resource, action);
};

/**
 * Hook to get permissions grouped by resource
 * Useful for building permission matrices
 */
export const usePermissionsByResource = (role: UserRole) => {
  const { data: permissions = [], ...rest } = useRolePermissions(role);

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, RolePermission[]>);

  return {
    data: groupedPermissions,
    permissions,
    ...rest,
  };
};

/**
 * Hook to check multiple permissions at once
 * Returns an object with permission names as keys and boolean values
 */
export const useMultiplePermissionCheck = (
  userId: string | null,
  permissions: string[]
) => {
  // If no userId, all permissions denied
  if (!userId) {
    const deniedPermissions = permissions.reduce((acc, perm) => {
      acc[perm] = false;
      return acc;
    }, {} as Record<string, boolean>);

    return {
      data: deniedPermissions,
      isLoading: false,
      error: null,
      isSuccess: true,
    };
  }

  return useQuery({
    queryKey: [...roleKeys.permissions(userId), 'multiple', permissions],
    queryFn: async () => {
      const results = await Promise.all(
        permissions.map(async (permission) => {
          const hasPermission = await roleService.hasPermission(userId, permission);
          return { permission, hasPermission };
        })
      );

      return results.reduce((acc, { permission, hasPermission }) => {
        acc[permission] = hasPermission;
        return acc;
      }, {} as Record<string, boolean>);
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 0,
  });
};