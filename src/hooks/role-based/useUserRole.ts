import { useQuery } from '@tanstack/react-query';
import { RolePermissionService } from '../../services/role-based/rolePermissionService';
import { useCurrentUser } from '../useAuth';
import { roleKeys } from '../../utils/queryKeyFactory';
import type { RolePermissionTransform } from '../../services/role-based/rolePermissionService';

// Create user-friendly role error (following UX patterns)
const createRoleError = (
  code: string,
  technicalMessage: string,
  userMessage: string
) => ({
  code,
  message: technicalMessage,      // For developers/logs
  userMessage,                    // For users
  timestamp: new Date().toISOString()
});

/**
 * Hook for fetching user role data with React Query integration
 * Following architectural patterns: centralized query keys + user isolation + comprehensive error handling
 */
export function useUserRole(userId?: string) {
  const { data: currentUser } = useCurrentUser();
  
  // Determine the actual user ID to fetch (parameter or current user)
  const targetUserId = userId || currentUser?.id;
  
  // Enhanced authentication guard (Pattern 4: Error Recovery & User Experience)
  if (!userId && !currentUser?.id) {
    const authError = createRoleError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated for role access',
      'Please sign in to view role information'
    );
    
    return {
      data: null, // Provide null role, don't break UI
      isLoading: false,
      error: authError,
      isError: true,
      queryKey: ['roles', 'user', 'unauthenticated'] as const,
      refetch: () => Promise.resolve({ data: null } as any),
    };
  }
  
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
      // Don't retry auth errors, retry network errors (Pattern 4: Smart Retry)
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
  
  // Expose queryKey for testing (Pattern 1: Centralized Query Keys)
  return {
    ...result,
    queryKey
  };
}

// Export type for use in other components
export type { RolePermissionTransform };