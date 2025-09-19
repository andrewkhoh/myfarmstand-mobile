/**
 * Canonical Role Permissions Hooks
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
import { unifiedRoleService } from '../../services/unifiedRoleService';
import { roleKeys } from '../../utils/queryKeyFactory';
import { useCurrentUser } from '../useAuth';
import { UserRole, type Permission } from '../../types/roles';

// Legacy interface for backward compatibility
export interface RolePermission {
  id: string;
  role: UserRole;
  permission: string;
  resource: string;
  action: string;
  createdAt: string;
}

/**
 * Fetch permissions for a specific user
 */
// Helper function for user-friendly error creation
const createRoleError = (
  code: string,
  technicalMessage: string,
  userMessage: string
) => ({
  code,
  message: technicalMessage,
  userMessage,
  timestamp: new Date().toISOString()
});

export function useUserPermissions(userId: string | null) {
  // Graceful degradation for unauthenticated users (Pattern 1: Graceful Degradation)
  if (!userId) {
    const authError = createRoleError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated for permissions access',
      'Please sign in to view permissions'
    );

    return {
      permissions: [] as RolePermission[],
      isLoading: false,
      isError: true,        // ✅ Proper error state
      error: authError,     // ✅ User-friendly error
      isSuccess: false,     // ✅ Not successful without auth
      refetch: () => Promise.resolve({ data: [] } as any),
    };
  }

  const query = useQuery({
    queryKey: roleKeys.permissions(userId),
    queryFn: async () => {
      const permissions = await unifiedRoleService.getUserPermissions(userId);
      // Convert to legacy format for backward compatibility
      return permissions.map((perm, index): RolePermission => ({
        id: `unified-${index}`,
        role: UserRole.CUSTOMER, // Simplified - would need role data
        permission: perm,
        resource: perm.split(':')[0] || 'general',
        action: perm.split(':')[1] || 'access',
        createdAt: new Date().toISOString()
      }));
    },
    // Permission list cache optimization (Pattern 2: Optimized Cache Configuration)
    staleTime: 8 * 60 * 1000,    // 8 minutes - permissions change occasionally
    gcTime: 30 * 60 * 1000,      // 30 minutes - good balance for memory
    refetchOnMount: false,        // Don't refetch on mount - permissions are stable
    refetchOnWindowFocus: false,  // Don't spam on focus changes
    refetchOnReconnect: true,     // Do refetch when connection restored
    retry: 1,                     // Single retry for permission lists
    retryDelay: 2000,            // 2 second delay for retry
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
    queryFn: async () => {
      if (!roleType) return [] as RolePermission[];
      // Get permissions for role type from unified system
      const rolePermissions = await unifiedRoleService.getUserPermissions('system'); // System user to get role permissions
      // This is simplified - in practice you'd need a proper way to get role-specific permissions
      return [] as RolePermission[];
    },
    enabled: !!roleType,
    // Role type permissions cache optimization (Pattern 2: Optimized Cache Configuration)
    staleTime: 15 * 60 * 1000,   // 15 minutes - role type permissions very stable
    gcTime: 60 * 60 * 1000,      // 1 hour - role permissions valuable to cache long-term
    refetchOnMount: false,        // Don't refetch on mount - role permissions are very stable
    refetchOnWindowFocus: false,  // Don't spam on focus changes
    refetchOnReconnect: false,    // Role permissions don't change often enough to warrant reconnect refetch
    retry: 1,                     // Single retry for role type data
    retryDelay: 3000,            // 3 second delay - longer for stable data
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
  // Graceful degradation for missing parameters (Pattern 1: Graceful Degradation)
  if (!userId || !permission) {
    const authError = createRoleError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated or permission not specified',
      'Please sign in to check permissions'
    );

    return {
      hasPermission: false,
      isLoading: false,
      isError: true,       // ✅ Proper error state
      error: authError,    // ✅ User-friendly error
    };
  }

  const query = useQuery({
    queryKey: roleKeys.hasPermission(userId, permission),
    queryFn: () => unifiedRoleService.hasPermission(userId, permission as Permission),
    enabled: !!userId && !!permission,
    // Individual permission check cache optimization (Pattern 2: Optimized Cache Configuration)
    staleTime: 5 * 60 * 1000,    // 5 minutes - permission checks can be cached
    gcTime: 15 * 60 * 1000,      // 15 minutes - individual checks valuable for short term
    refetchOnMount: false,        // Don't refetch on mount - permission checks are stable
    refetchOnWindowFocus: false,  // Don't spam on focus changes
    refetchOnReconnect: true,     // Do refetch when connection restored
    retry: 0,                     // No retry for permission checks - fail fast
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
  // Graceful degradation for missing parameters (Pattern 1: Graceful Degradation)
  if (!userId || !resource || !action) {
    const authError = createRoleError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated or resource/action not specified',
      'Please sign in to check action permissions'
    );

    return {
      canPerform: false,
      isLoading: false,
      isError: true,       // ✅ Proper error state
      error: authError,    // ✅ User-friendly error
    };
  }

  const query = useQuery({
    queryKey: roleKeys.canPerformAction(userId, resource, action),
    queryFn: () => unifiedRoleService.canPerformAction(userId, resource, action),
    enabled: !!userId && !!resource && !!action,
    // Action permission cache optimization (Pattern 2: Optimized Cache Configuration)
    staleTime: 5 * 60 * 1000,    // 5 minutes - action permissions can be cached
    gcTime: 15 * 60 * 1000,      // 15 minutes - action checks valuable for short term
    refetchOnMount: false,        // Don't refetch on mount - action permissions are stable
    refetchOnWindowFocus: false,  // Don't spam on focus changes
    refetchOnReconnect: true,     // Do refetch when connection restored
    retry: 0,                     // No retry for action checks - fail fast
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
  const { permissions: userPermissions, isLoading, isError, error } = useUserPermissions(userId);

  // Graceful degradation - return error state if underlying hook has error
  if (!userId || isError) {
    return {
      hasAll: false,
      isLoading: false,
      isError: true,
      error: error || createRoleError(
        'AUTHENTICATION_REQUIRED',
        'User not authenticated for permission check',
        'Please sign in to check permissions'
      )
    };
  }

  if (isLoading || !userPermissions) {
    return { hasAll: false, isLoading, isError: false, error: null };
  }

  const granted = new Set(userPermissions.map((p) => p.permission));
  const hasAll = required.every((p) => granted.has(p));
  return { hasAll, isLoading: false, isError: false, error: null };
}

/**
 * Check if user has ANY of the required permissions
 */
export function useHasAnyPermission(userId: string | null, required: string[]) {
  const { permissions: userPermissions, isLoading, isError, error } = useUserPermissions(userId);

  // Graceful degradation - return error state if underlying hook has error
  if (!userId || isError) {
    return {
      hasAny: false,
      isLoading: false,
      isError: true,
      error: error || createRoleError(
        'AUTHENTICATION_REQUIRED',
        'User not authenticated for permission check',
        'Please sign in to check permissions'
      )
    };
  }

  if (isLoading || !userPermissions) {
    return { hasAny: false, isLoading, isError: false, error: null };
  }

  const granted = new Set(userPermissions.map((p) => p.permission));
  const hasAny = required.some((p) => granted.has(p));
  return { hasAny, isLoading: false, isError: false, error: null };
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
