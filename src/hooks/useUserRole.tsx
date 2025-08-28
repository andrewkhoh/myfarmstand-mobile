/**
 * useUserRole Hook
 * Following Pattern: React Query Hooks from useCart.tsx
 * Reference: docs/architectural-patterns-and-best-practices.md
 * Uses centralized query key factory
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { roleService, type RoleOperationResult } from '../services/roleService';
import { roleKeys } from '../utils/queryKeyFactory';
import { UserRole } from '../types';

/**
 * Hook to fetch user's role
 * Following Pattern: User-isolated queries with centralized keys
 */
export function useUserRole(
  userId: string,
  options?: UseQueryOptions<UserRole | null, Error>
) {
  const query = useQuery({
    queryKey: roleKeys.userRole(userId),
    queryFn: () => roleService.getUserRole(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

  return {
    role: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isSuccess: query.isSuccess,
    refetch: query.refetch,
  };
}

/**
 * Mutation hook to update user's role
 * Following Pattern: Optimistic updates with invalidation
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) => 
      roleService.updateUserRole(userId, role),
    onSuccess: (result, variables) => {
      if (result.success) {
        // Invalidate user's role cache
        queryClient.invalidateQueries({ 
          queryKey: roleKeys.userRole(variables.userId) 
        });
        // Also invalidate permissions as they may have changed
        queryClient.invalidateQueries({ 
          queryKey: roleKeys.permissions(variables.userId) 
        });
      }
    },
    onError: (error, variables) => {
      console.error('Failed to update user role:', error);
      // Could add toast notification here
    },
  });
}

/**
 * Helper hook to check if user has a specific role
 * Following Pattern: Derived state from base query
 */
export function useHasRole(userId: string | null | undefined, targetRole: UserRole): boolean {
  const { role } = useUserRole(userId || '');
  
  if (!userId || !role) return false;
  return role === targetRole;
}

/**
 * Helper hook to check if user has minimum role level
 * Following Pattern: Business logic encapsulation
 */
export function useHasMinimumRole(userId: string | null | undefined, minimumRole: UserRole): boolean {
  const { role } = useUserRole(userId || '');
  
  if (!userId || !role) return false;
  
  const currentLevel = roleService.getRoleLevel(role);
  const minimumLevel = roleService.getRoleLevel(minimumRole);
  
  return currentLevel >= minimumLevel;
}

/**
 * Hook to get all available roles
 * Following Pattern: Static data with infinite cache
 */
export function useAvailableRoles() {
  return useQuery({
    queryKey: roleKeys.allRoles(),
    queryFn: () => Promise.resolve(roleService.getAllRoles()),
    staleTime: Infinity, // Never goes stale
    gcTime: Infinity, // Never garbage collected
  });
}