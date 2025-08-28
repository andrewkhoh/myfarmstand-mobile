/**
 * useRolePermissions Hook
 * Following Pattern: React Query Hooks from useCart.tsx
 * Reference: docs/architectural-patterns-and-best-practices.md
 * Uses centralized query key factory
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { roleService, type RolePermission } from '../services/roleService';
import { roleKeys } from '../utils/queryKeyFactory';

/**
 * Hook to fetch user's permissions
 * Following Pattern: User-isolated queries with centralized keys
 */
export function useRolePermissions(
  userId: string,
  options?: UseQueryOptions<RolePermission[], Error>
) {
  const query = useQuery({
    queryKey: roleKeys.permissions(userId),
    queryFn: () => roleService.getUserPermissions(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

  return {
    permissions: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isSuccess: query.isSuccess,
    refetch: query.refetch,
  };
}

/**
 * Hook to check if user has a specific permission
 * Following Pattern: Derived state with server validation
 */
export function useHasPermission(
  userId: string,
  permission: string,
  options?: UseQueryOptions<boolean, Error>
) {
  const query = useQuery({
    queryKey: [...roleKeys.permissions(userId), 'has', permission],
    queryFn: () => roleService.hasPermission(userId, permission),
    enabled: !!userId && !!permission,
    staleTime: 5 * 60 * 1000,
    ...options,
  });

  return {
    hasPermission: query.data ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

/**
 * Hook to check if user can perform action on resource
 * Following Pattern: Resource-based access control
 */
export function useCanPerformAction(
  userId: string,
  resource: string,
  action: string,
  options?: UseQueryOptions<boolean, Error>
) {
  const query = useQuery({
    queryKey: [...roleKeys.permissions(userId), 'can', resource, action],
    queryFn: () => roleService.canPerformAction(userId, resource, action),
    enabled: !!userId && !!resource && !!action,
    staleTime: 5 * 60 * 1000,
    ...options,
  });

  return {
    canPerform: query.data ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

/**
 * Hook to get permissions for a specific role type
 * Following Pattern: Role-based permission lookup
 */
export function useRolePermissionsByType(
  roleType: string,
  options?: UseQueryOptions<RolePermission[], Error>
) {
  return useQuery({
    queryKey: roleKeys.roleType(roleType),
    queryFn: () => roleService.getRolePermissions(roleType),
    enabled: !!roleType,
    staleTime: 10 * 60 * 1000, // 10 minutes (more stable than user permissions)
    ...options,
  });
}

/**
 * Hook to check if user has all required permissions
 * Following Pattern: Multi-permission validation
 */
export function useHasAllPermissions(
  userId: string,
  permissions: string[]
) {
  const { permissions: userPermissions, isLoading } = useRolePermissions(userId);
  
  if (!userId || isLoading || !userPermissions) {
    return { hasAll: false, isLoading };
  }
  
  const permissionSet = new Set(userPermissions.map(p => p.permission));
  const hasAll = permissions.every(p => permissionSet.has(p));
  
  return { hasAll, isLoading: false };
}

/**
 * Hook to check if user has any of the required permissions
 * Following Pattern: Alternative permission validation
 */
export function useHasAnyPermission(
  userId: string,
  permissions: string[]
) {
  const { permissions: userPermissions, isLoading } = useRolePermissions(userId);
  
  if (!userId || isLoading || !userPermissions) {
    return { hasAny: false, isLoading };
  }
  
  const permissionSet = new Set(userPermissions.map(p => p.permission));
  const hasAny = permissions.some(p => permissionSet.has(p));
  
  return { hasAny, isLoading: false };
}