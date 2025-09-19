/**
 * Canonical Role Permissions Hooks (usePermissions)
 *
 * Centralized API for permission-related hooks. Prefer these exports over legacy
 * modules in `src/hooks/useRolePermissions.ts` and `.tsx`.
 *
 * Exports:
 * - useUserPermissions(userId)
 * - useRolePermissionsByType(roleType)
 * - useHasPermission(userId, permission)
 * - useCanPerformAction(userId, resource, action)
 * - useHasAllPermissions(userId, permissions)
 * - useHasAnyPermission(userId, permissions)
 * - useCurrentUserPermissions()
 * - useCurrentUserHasPermission(permission)
 * - useCurrentUserCanPerformAction(resource, action)
 */

import { useQuery } from '@tanstack/react-query';
import { roleService, type RolePermission } from '../../services/roleService';
import { roleKeys } from '../../utils/queryKeyFactory';
import { useCurrentUser } from '../useAuth';
import type { UserRole } from '../../types';

/**
 * Fetch permissions for a specific user
 */
export function useUserPermissions(userId: string | null) {
  if (!userId) {
    return {
      permissions: [] as RolePermission[],
      isLoading: false,
      isError: false,
      error: null as unknown as Error | null,
      isSuccess: true,
      refetch: () => Promise.resolve({} as any),
    };
  }

  const query = useQuery({
    queryKey: roleKeys.permissions(userId),
    queryFn: () => roleService.getUserPermissions(userId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 1000,
  });

  return {
    permissions: query.data ?? ([] as RolePermission[]),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
    isSuccess: query.isSuccess,
    refetch: query.refetch,
  };
}

/**
 * Fetch permissions by role type (role schema)
 */
export function useRolePermissionsByType(roleType: UserRole | null | undefined) {
  const query = useQuery({
    queryKey: roleType ? roleKeys.roleType(roleType) : roleKeys.roleType('none' as any),
    queryFn: () => (roleType ? roleService.getRolePermissions(roleType) : Promise.resolve([] as RolePermission[])),
    enabled: !!roleType,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 1000,
  });

  return {
    permissions: (query.data ?? []) as RolePermission[],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
    isSuccess: query.isSuccess,
    refetch: query.refetch,
  };
}

/**
 * Check if user has a specific permission
 */
export function useHasPermission(userId: string | null, permission: string | null) {
  if (!userId || !permission) {
    return {
      hasPermission: false,
      isLoading: false,
      isError: false,
      error: null as unknown as Error | null,
    };
  }

  const query = useQuery({
    queryKey: [...roleKeys.permissions(userId), 'has', permission],
    queryFn: () => roleService.hasPermission(userId, permission),
    enabled: !!userId && !!permission,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 0,
  });

  return {
    hasPermission: query.data ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
  };
}

/**
 * Check if user can perform action on resource
 */
export function useCanPerformAction(
  userId: string | null,
  resource: string | null,
  action: string | null
) {
  if (!userId || !resource || !action) {
    return {
      canPerform: false,
      isLoading: false,
      isError: false,
      error: null as unknown as Error | null,
    };
  }

  const query = useQuery({
    queryKey: [...roleKeys.permissions(userId), 'can', resource, action],
    queryFn: () => roleService.canPerformAction(userId, resource, action),
    enabled: !!userId && !!resource && !!action,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 0,
  });

  return {
    canPerform: query.data ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
  };
}

/**
 * Check if user has ALL required permissions
 */
export function useHasAllPermissions(userId: string | null, required: string[]) {
  const { permissions: userPermissions, isLoading } = useUserPermissions(userId);

  if (!userId || isLoading || !userPermissions) {
    return { hasAll: false, isLoading };
  }

  const granted = new Set(userPermissions.map((p) => p.permission));
  const hasAll = required.every((p) => granted.has(p));
  return { hasAll, isLoading: false };
}

/**
 * Check if user has ANY of the required permissions
 */
export function useHasAnyPermission(userId: string | null, required: string[]) {
  const { permissions: userPermissions, isLoading } = useUserPermissions(userId);

  if (!userId || isLoading || !userPermissions) {
    return { hasAny: false, isLoading };
  }

  const granted = new Set(userPermissions.map((p) => p.permission));
  const hasAny = required.some((p) => granted.has(p));
  return { hasAny, isLoading: false };
}

/**
 * Current-user convenience hooks
 */
export function useCurrentUserPermissions() {
  const { data: currentUser } = useCurrentUser();
  return useUserPermissions(currentUser?.id);
}

export function useCurrentUserHasPermission(permission: string) {
  const { data: currentUser } = useCurrentUser();
  return useHasPermission(currentUser?.id, permission);
}

export function useCurrentUserCanPerformAction(resource: string, action: string) {
  const { data: currentUser } = useCurrentUser();
  return useCanPerformAction(currentUser?.id, resource, action);
}
