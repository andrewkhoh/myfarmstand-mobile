/**
 * useUserRole Hook - Consolidated user role and permissions management
 * Following Pattern: React Query Patterns from docs/architectural-patterns-and-best-practices.md
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { unifiedRoleService } from '../services/unifiedRoleService';
import { UserRole } from '../types/roles';
import { roleKeys } from '../utils/queryKeyFactory';
import { useCurrentUser } from './useAuth';

/**
 * Hook to fetch and manage user role with permissions
 * Following Pattern: User-Isolated Query Keys + Comprehensive Permission Checks
 */
export const useUserRole = (userId?: string | null) => {
  const { data: currentUser } = useCurrentUser();
  const targetUserId = userId || currentUser?.id;

  // If no userId available, return empty state with permission helpers
  if (!targetUserId) {
    return {
      data: null,
      role: null,
      isLoading: false,
      error: null,
      isSuccess: false,
      refetch: () => Promise.resolve({ data: null } as any),
      hasPermission: (permission: string) => false,
      hasRole: (role: UserRole) => false,
      isAdmin: false,
      isExecutive: false,
      isStaff: false,
    };
  }

  const roleQuery = useQuery({
    queryKey: roleKeys.userRole(targetUserId),
    queryFn: async () => {
      const roleData = await unifiedRoleService.getUserRole(targetUserId);
      // Convert to legacy UserRole format
      const roleMapping: Record<string, UserRole> = {
        'admin': 'admin',
        'executive': 'manager',
        'inventory_staff': 'staff',
        'marketing_staff': 'staff',
        'customer': 'customer'
      };
      return roleMapping[roleData.role] || 'customer';
    },
    // Following Pattern: Optimized Cache Configuration
    staleTime: 5 * 60 * 1000,  // 5 minutes - roles change infrequently
    gcTime: 10 * 60 * 1000,    // 10 minutes - reasonable cleanup
    refetchOnMount: true,       // Always check on mount
    refetchOnWindowFocus: false, // Don't spam on focus changes
    // Following Pattern: Error Recovery & User Experience
    retry: 1,
    retryDelay: 1000,
  });

  const permissionsQuery = useQuery({
    queryKey: roleKeys.permissions(targetUserId),
    queryFn: async () => {
      const permissions = await unifiedRoleService.getUserPermissions(targetUserId);
      return permissions;
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const role = roleQuery.data;
  const permissions = permissionsQuery.data || [];

  return {
    data: role,
    role,
    isLoading: roleQuery.isLoading || permissionsQuery.isLoading,
    error: roleQuery.error || permissionsQuery.error,
    isSuccess: roleQuery.isSuccess && permissionsQuery.isSuccess,
    refetch: () => Promise.all([roleQuery.refetch(), permissionsQuery.refetch()]),

    // Permission helpers
    hasPermission: (permission: string) => permissions.includes(permission),
    hasRole: (checkRole: UserRole) => role === checkRole,

    // Role checks - aligned with UserRole type
    isAdmin: role === 'admin',
    isExecutive: role === 'manager',
    isStaff: role === 'staff' || role === 'manager' || role === 'vendor' || role === 'farmer',
  };
};

/**
 * Hook for role-related operations (mutations)
 * Following Pattern: Smart Query Invalidation
 */
export const useRoleOperations = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, newRole }: { userId: string; newRole: UserRole }) => {
      // Convert legacy role to new UserRole enum
      const roleMapping = {
        'admin': 'admin',
        'manager': 'executive',
        'staff': 'inventory_staff',
        'customer': 'customer'
      } as const;
      const mappedRole = roleMapping[newRole as keyof typeof roleMapping] || 'customer';
      return unifiedRoleService.updateUserRole(userId, mappedRole as any, currentUser?.id);
    },
    onSuccess: (data, variables) => {
      // Following Pattern: Targeted invalidation
      queryClient.invalidateQueries({
        queryKey: roleKeys.userRole(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: roleKeys.permissions(variables.userId),
      });
      // Also invalidate auth queries as role affects user data
      queryClient.invalidateQueries({
        queryKey: ['auth'],
      });
    },
    onError: (error) => {
      // Following Pattern: User-Friendly Error Messages
      console.error('Failed to update user role:', error);
    },
  });

  const checkPermissionMutation = useMutation({
    mutationFn: ({ userId, permission }: { userId: string; permission: string }) =>
      unifiedRoleService.hasPermission(userId, permission as any),
  });

  const checkActionMutation = useMutation({
    mutationFn: ({ userId, resource, action }: { userId: string; resource: string; action: string }) =>
      unifiedRoleService.canPerformAction(userId, resource, action),
  });

  return {
    updateUserRole: (userId: string, newRole: UserRole) => {
      return updateRoleMutation.mutateAsync({ userId, newRole });
    },
    updateUserRoleSync: (userId: string, newRole: UserRole) => {
      updateRoleMutation.mutate({ userId, newRole });
    },
    checkPermission: async (userId: string, permission: string) => {
      return checkPermissionMutation.mutateAsync({ userId, permission });
    },
    checkAction: async (userId: string, resource: string, action: string) => {
      return checkActionMutation.mutateAsync({ userId, resource, action });
    },
    isUpdatingRole: updateRoleMutation.isPending,
    updateError: updateRoleMutation.error,
  };
};

/**
 * Hook to get current user's role
 * Following Pattern: Comprehensive Error Handling
 */
export const useCurrentUserRole = () => {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  const {
    data: role,
    isLoading: roleLoading,
    error,
    refetch,
  } = useUserRole(currentUser?.id || null);

  return {
    role: role || 'customer', // Default to customer if no role found
    isLoading: userLoading || roleLoading,
    error,
    refetch,
    userId: currentUser?.id,
  };
};

/**
 * Hook to check if current user has a specific role level or higher
 */
export const useHasRoleLevel = (minimumRole: UserRole) => {
  const { role } = useCurrentUserRole();
  
  const hasLevel = unifiedRoleService.hasHigherPrivileges(role as any, minimumRole as any) ||
                   role === minimumRole;
  
  return hasLevel;
};

/**
 * Hook to get all available roles
 */
export const useAvailableRoles = () => {
  return useQuery({
    queryKey: roleKeys.allRoles(),
    queryFn: () => Promise.resolve(['customer', 'staff', 'manager', 'admin', 'farmer', 'vendor'] as UserRole[]),
    staleTime: Infinity, // Roles list never changes
    gcTime: Infinity,
  });
};