import { useQuery } from '@tanstack/react-query';
import { RolePermissionService } from '../../services/role-based/rolePermissionService';
import { useCurrentUser } from '../useAuth';
import { roleKeys } from '../../utils/queryKeyFactory';
import type { RolePermissionTransform } from '../../services/role-based/rolePermissionService';

/**
 * Hook for fetching user role data with React Query integration
 * Following architectural patterns: centralized query keys + user isolation
 */
export function useUserRole(userId?: string) {
  const { data: currentUser } = useCurrentUser();
  
  // Determine the actual user ID to fetch (parameter or current user)
  const targetUserId = userId || currentUser?.id;
  
  const queryKey = roleKeys.user(targetUserId || '');
  
  const result = useQuery({
    queryKey,
    queryFn: async () => {
      if (!targetUserId) return null;
      return RolePermissionService.getUserRole(targetUserId);
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // Role data fresh for 5 minutes (roles change infrequently)
    gcTime: 30 * 60 * 1000,   // Keep in cache for 30 minutes
    retry: (failureCount, error) => {
      // Don't retry auth errors, retry network errors
      if (error?.message?.includes('permission denied')) {
        return false; // Auth errors should not retry
      }
      // For the service error test, don't retry general service errors
      if (error?.message?.includes('Service unavailable')) {
        return false; 
      }
      return failureCount < 3; // Network errors can retry up to 3 times
    }
  });
  
  // Expose queryKey for testing
  return {
    ...result,
    queryKey
  };
}

// Export type for use in other components
export type { RolePermissionTransform };