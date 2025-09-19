/**
 * Unified Role Hook
 * Single hook for all role and permission operations
 * Replaces useUserRole, useRolePermissions, and related hooks
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { unifiedRoleService, UnifiedRoleError } from '../../services/unifiedRoleService';
import { useCurrentUser } from '../useAuth';
import { roleKeys } from '../../utils/queryKeyFactory';
import {
  UserRole,
  Permission,
  RoleData,
  PermissionResult,
  RoleErrorType,
  SecurityContext,
} from '../../types/roles';

// Error creation helper
const createRoleError = (
  code: RoleErrorType,
  message: string,
  context: SecurityContext,
  userMessage: string
) => ({
  code,
  message,
  userMessage,
  context,
  timestamp: new Date().toISOString(),
});

/**
 * Primary unified role hook
 * Replaces all existing role hooks
 */
export function useUnifiedRole(userId?: string) {
  const { data: currentUser } = useCurrentUser();
  const targetUserId = userId || currentUser?.id;

  const roleQuery = useQuery({
    queryKey: roleKeys.user(targetUserId || 'unauthenticated'),
    queryFn: async (): Promise<RoleData | null> => {
      if (!targetUserId) {
        return null;
      }

      try {
        return await unifiedRoleService.getUserRole(targetUserId);
      } catch (error) {
        // Don't throw - return null to prevent breaking UI
        console.warn('Role query error:', error);
        return null;
      }
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Don't retry authentication errors
      if (error instanceof UnifiedRoleError) {
        return error.code !== RoleErrorType.AUTHENTICATION_REQUIRED;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  // Handle unauthenticated state
  if (!targetUserId) {
    const authError = createRoleError(
      RoleErrorType.AUTHENTICATION_REQUIRED,
      'User not authenticated for role access',
      SecurityContext.AUTHENTICATION,
      'Please sign in to access this feature'
    );

    return {
      // Data
      data: null,
      role: null,
      permissions: [],
      isLoading: false,
      isError: true,
      error: authError,

      // Permission checks
      hasPermission: async () => false,
      checkPermission: async () => ({ allowed: false, reason: 'Not authenticated' }),
      hasRole: () => false,

      // Role checks
      isAdmin: false,
      isExecutive: false,
      isStaff: false,
      isCustomer: false,

      // Utils
      refetch: () => Promise.resolve({ data: null }),
      queryKey: roleKeys.user('unauthenticated'),
    };
  }

  const roleData = roleQuery.data;

  return {
    // Data
    data: roleData,
    role: roleData?.role || null,
    permissions: roleData?.permissions || [],
    isLoading: roleQuery.isLoading,
    isError: roleQuery.isError,
    error: roleQuery.error,

    // Permission checks
    hasPermission: async (permission: Permission): Promise<boolean> => {
      if (!targetUserId) return false;
      return unifiedRoleService.hasPermission(targetUserId, permission);
    },

    checkPermission: async (permission: Permission): Promise<PermissionResult> => {
      if (!targetUserId) {
        return {
          allowed: false,
          reason: 'Not authenticated',
          fallbackAction: 'redirect',
          fallbackTarget: '/login',
        };
      }
      return unifiedRoleService.checkPermission(targetUserId, permission);
    },

    hasRole: (role: UserRole): boolean => {
      return roleData?.role === role;
    },

    // Convenience role checks
    isAdmin: roleData?.role === UserRole.ADMIN,
    isExecutive: roleData?.role === UserRole.EXECUTIVE,
    isStaff: roleData?.role === UserRole.INVENTORY_STAFF || roleData?.role === UserRole.MARKETING_STAFF,
    isCustomer: roleData?.role === UserRole.CUSTOMER,

    // Utils
    refetch: roleQuery.refetch,
    queryKey: roleKeys.user(targetUserId),
  };
}

/**
 * Role management operations hook
 */
export function useRoleOperations() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: UserRole }) => {
      await unifiedRoleService.updateUserRole(userId, newRole, currentUser?.id);
    },
    onSuccess: (_, { userId }) => {
      // Invalidate all role-related queries for the user
      queryClient.invalidateQueries({
        queryKey: roleKeys.user(userId),
      });
      queryClient.invalidateQueries({
        queryKey: roleKeys.permissions(userId),
      });
    },
    onError: (error) => {
      console.error('Failed to update user role:', error);
    },
  });

  return {
    updateUserRole: async (userId: string, newRole: UserRole) => {
      return updateRoleMutation.mutateAsync({ userId, newRole });
    },

    isUpdatingRole: updateRoleMutation.isPending,
    updateError: updateRoleMutation.error,
  };
}

/**
 * Current user role hook - most common use case
 */
export function useCurrentUserRole() {
  const { data: currentUser } = useCurrentUser();
  return useUnifiedRole(currentUser?.id);
}

/**
 * Permission-specific hooks for common patterns
 */
export function usePermission(permission: Permission) {
  const { data: currentUser } = useCurrentUser();

  return useQuery({
    queryKey: ['permission', currentUser?.id, permission],
    queryFn: async () => {
      if (!currentUser?.id) return false;
      return unifiedRoleService.hasPermission(currentUser.id, permission);
    },
    enabled: !!currentUser?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Multiple permissions check hook
 */
export function usePermissions(permissions?: Permission[]) {
  const { data: currentUser } = useCurrentUser();

  const permissionsQuery = useQuery({
    queryKey: ['permissions', currentUser?.id, permissions?.join(',') || 'all'],
    queryFn: async () => {
      if (!currentUser?.id) return {};

      // If no permissions specified, get all permissions for user
      if (!permissions || permissions.length === 0) {
        return {};
      }

      const results: Record<Permission, boolean> = {} as Record<Permission, boolean>;

      for (const permission of permissions) {
        results[permission] = await unifiedRoleService.hasPermission(currentUser.id, permission);
      }

      return results;
    },
    enabled: !!currentUser?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const hasPermission = async (permission: Permission): Promise<boolean> => {
    if (!currentUser?.id) return false;
    return await unifiedRoleService.hasPermission(currentUser.id, permission);
  };

  return {
    ...permissionsQuery,
    hasPermission,
    isLoading: permissionsQuery.isLoading,
  };
}

/**
 * Role hierarchy check hook
 */
export function useRoleHierarchy() {
  const roleQuery = useCurrentUserRole();

  const hasRoleLevel = (minimumRole: UserRole): boolean => {
    if (!roleQuery.role) return false;
    return unifiedRoleService.hasHigherPrivileges(roleQuery.role, minimumRole) ||
           roleQuery.role === minimumRole;
  };

  return {
    hasRoleLevel,
    currentRole: roleQuery.role,
    isLoading: roleQuery.isLoading,
  };
}

/**
 * Debug hook for development
 */
export function useRoleDebugger() {
  const roleQuery = useCurrentUserRole();
  const { data: currentUser } = useCurrentUser();

  if (__DEV__ && roleQuery.data) {
    console.group('🔐 Role Debug Info');
    console.log('User ID:', currentUser?.id);
    console.log('Role:', roleQuery.role);
    console.log('Permissions:', roleQuery.permissions);
    console.log('Is Admin:', roleQuery.isAdmin);
    console.log('Is Staff:', roleQuery.isStaff);
    console.log('Last Updated:', roleQuery.data.updatedAt);
    console.groupEnd();
  }

  return {
    debugInfo: roleQuery.data ? {
      userId: currentUser?.id,
      role: roleQuery.role,
      permissions: roleQuery.permissions,
      isAdmin: roleQuery.isAdmin,
      isStaff: roleQuery.isStaff,
      lastUpdated: roleQuery.data.updatedAt,
    } : null,
    clearCache: () => unifiedRoleService.clearAllCaches(),
  };
}
