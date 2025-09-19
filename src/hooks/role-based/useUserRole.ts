import { useQuery } from '@tanstack/react-query';
import { unifiedRoleService } from '../../services/unifiedRoleService';
import { useCurrentUser } from '../useAuth';
import { roleKeys } from '../../utils/queryKeyFactory';
import type { RoleData } from '../../types/roles';

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
 * DEPRECATED: Legacy useUserRole hook
 *
 * ⚠️ This hook is deprecated. Use useCurrentUserRole() from useUnifiedRole instead.
 *
 * Migration:
 * OLD: const { role, hasPermission } = useUserRole();
 * NEW: const { role, hasPermission } = useCurrentUserRole();
 *
 * @deprecated Use useCurrentUserRole() from useUnifiedRole instead
 */
export function useUserRole(userId?: string) {
  console.warn('⚠️ DEPRECATED: useUserRole() is deprecated. Use useCurrentUserRole() from useUnifiedRole instead.');

  const { data: currentUser } = useCurrentUser();

  // Simplified stable approach - always use fixed query key
  const queryKey = roleKeys.user('default');

  // Minimal useQuery call to avoid any complications
  const result = useQuery({
    queryKey,
    queryFn: async () => {
      // Get the actual user ID to use
      const actualUserId = userId || currentUser?.id;

      if (!actualUserId || typeof actualUserId !== 'string') {
        return null;
      }

      try {
        return await unifiedRoleService.getUserRole(actualUserId);
      } catch (error) {
        console.warn('Error in getUserRole:', error);
        return null;
      }
    },
    enabled: true, // Always enabled to avoid conditional behavior
    staleTime: 30000,
    gcTime: 60000,
    retry: false,
  });

  // Always return the same structure
  return {
    ...result,
    role: result.data,
    hasPermission: async (permission: string) => {
      const actualUserId = userId || currentUser?.id;
      if (!actualUserId) return false;

      try {
        return await unifiedRoleService.hasPermission(actualUserId, permission as any);
      } catch (error) {
        console.warn('Error checking permission:', error);
        return false;
      }
    },
    queryKey
  };
}

// Export type for use in other components
export type { RoleData };