/**
 * useUserRole Hook - User role management with React Query
 * Following Pattern: React Query Patterns from docs/architectural-patterns-and-best-practices.md
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleService, RoleOperationResult } from '../services/roleService';
import { UserRole } from '../types';
import { roleKeys } from '../utils/queryKeyFactory';
import { useCurrentUser } from './useAuth';

/**
 * Hook to fetch and manage user role
 * Following Pattern: User-Isolated Query Keys
 */
export const useUserRole = (userId: string | null) => {
  // If no userId provided, return null state
  if (!userId) {
    return {
      data: null,
      isLoading: false,
      error: null,
      isSuccess: false,
      refetch: () => Promise.resolve({ data: null } as any),
    };
  }

  return useQuery({
    queryKey: roleKeys.userRole(userId),
    queryFn: () => roleService.getUserRole(userId),
    // Following Pattern: Optimized Cache Configuration
    staleTime: 5 * 60 * 1000,  // 5 minutes - roles change infrequently
    gcTime: 10 * 60 * 1000,    // 10 minutes - reasonable cleanup
    refetchOnMount: true,       // Always check on mount
    refetchOnWindowFocus: false, // Don't spam on focus changes
    // Following Pattern: Error Recovery & User Experience
    retry: 1,
    retryDelay: 1000,
  });
};

/**
 * Hook for role-related operations (mutations)
 * Following Pattern: Smart Query Invalidation
 */
export const useRoleOperations = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, newRole }: { userId: string; newRole: UserRole }) =>
      roleService.updateUserRole(userId, newRole),
    onSuccess: (data, variables) => {
      if (data.success) {
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
      }
    },
    onError: (error) => {
      // Following Pattern: User-Friendly Error Messages
      console.error('Failed to update user role:', error);
    },
  });

  const checkPermissionMutation = useMutation({
    mutationFn: ({ userId, permission }: { userId: string; permission: string }) =>
      roleService.hasPermission(userId, permission),
  });

  const checkActionMutation = useMutation({
    mutationFn: ({ userId, resource, action }: { userId: string; resource: string; action: string }) =>
      roleService.canPerformAction(userId, resource, action),
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
    isUpdatingRole: updateRoleMutation.isLoading,
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
  
  const hasLevel = roleService.hasHigherPrivileges(role, minimumRole) ||
                   role === minimumRole;
  
  return hasLevel;
};

/**
 * Hook to get all available roles
 */
export const useAvailableRoles = () => {
  return useQuery({
    queryKey: roleKeys.allRoles(),
    queryFn: () => Promise.resolve(roleService.getAllRoles()),
    staleTime: Infinity, // Roles list never changes
    gcTime: Infinity,
  });
};