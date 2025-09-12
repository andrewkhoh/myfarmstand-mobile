import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RolePermissionService } from '../../services/rolePermissionService';
import { useCurrentUser } from '../useAuth';
import { roleKeys } from '../../utils/queryKeyFactory';
import { ROLE_PERMISSIONS } from '../../schemas/role-based/rolePermission.schemas';
import type { RoleType, RolePermissionTransform } from '../../services/rolePermissionService';

// Create user-friendly permission error (following UX patterns)
const createPermissionError = (
  code: string,
  technicalMessage: string,
  userMessage: string
) => ({
  code,
  message: technicalMessage,      // For developers/logs
  userMessage,                    // For users
  timestamp: new Date().toISOString()
});

interface PermissionData {
  roleType?: RoleType;
  permissions: string[];        // Custom permissions from DB
  rolePermissions: string[];    // Role-based permissions
  allPermissions: string[];     // Combined permissions
}

interface PermissionResult {
  success: boolean;
  error?: any;
}

/**
 * Hook for managing user permissions with React Query integration
 * Following architectural patterns: centralized query keys + comprehensive error handling
 */
export function useRolePermissions(userId?: string) {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  
  // Enhanced authentication guard (Pattern 4: Error Recovery & User Experience)
  if (!userId && !currentUser?.id) {
    const authError = createPermissionError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated for permissions access',
      'Please sign in to view permissions'
    );
    
    return {
      data: null,
      isLoading: false,
      error: authError,
      isError: true,
      isSuccess: false,
      queryKey: roleKeys.permissions('unauthenticated'),
      refetch: () => Promise.resolve({ data: null } as any),
      hasPermission: async () => false,
      hasAllPermissions: async () => false,
      hasAnyPermission: async () => false,
      updatePermissions: async () => ({ success: false, error: authError }),
      isAdmin: false,
      isExecutive: false,
      isStaff: false,
      canManageInventory: false,
      canManageContent: false,
    };
  }
  
  const targetUserId = userId || currentUser?.id || '';
  const queryKey = roleKeys.permissions(targetUserId);
  
  // Fetch user role and permissions
  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<PermissionData> => {
      if (!targetUserId) {
        return {
          permissions: [],
          rolePermissions: [],
          allPermissions: [],
        };
      }
      
      const userRole = await RolePermissionService.getUserRole(targetUserId);
      
      if (!userRole) {
        return {
          permissions: [],
          rolePermissions: [],
          allPermissions: [],
        };
      }
      
      // Get role-based permissions
      const rolePermissions = ROLE_PERMISSIONS[userRole.roleType] || [];
      // Get custom permissions from user role
      const customPermissions = userRole.permissions || [];
      // Combine and deduplicate
      const allPermissions = [...new Set([...rolePermissions, ...customPermissions])];
      
      return {
        roleType: userRole.roleType,
        permissions: customPermissions,
        rolePermissions: [...rolePermissions],
        allPermissions,
      };
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // Permissions fresh for 5 minutes
    gcTime: 30 * 60 * 1000,   // Keep in cache for 30 minutes
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error?.message?.includes('permission denied')) {
        return false;
      }
      // Don't retry service errors (for testing)
      if (error?.message?.includes('Service unavailable')) {
        return false;
      }
      return failureCount < 3;
    }
  });
  
  // Update permissions mutation
  const updateMutation = useMutation({
    mutationFn: async (newPermissions: string[]) => {
      return RolePermissionService.updateUserPermissions(targetUserId, newPermissions);
    },
    onSuccess: () => {
      // Invalidate permissions cache
      queryClient.invalidateQueries({ queryKey });
    },
  });
  
  // Permission check utilities
  const hasPermission = async (permission: string): Promise<boolean> => {
    if (!targetUserId) return false;
    return RolePermissionService.hasPermission(targetUserId, permission);
  };
  
  const hasAllPermissions = async (permissions: string[]): Promise<boolean> => {
    if (!targetUserId) return false;
    
    for (const permission of permissions) {
      const hasIt = await RolePermissionService.hasPermission(targetUserId, permission);
      if (!hasIt) return false;
    }
    return true;
  };
  
  const hasAnyPermission = async (permissions: string[]): Promise<boolean> => {
    if (!targetUserId) return false;
    
    for (const permission of permissions) {
      const hasIt = await RolePermissionService.hasPermission(targetUserId, permission);
      if (hasIt) return true;
    }
    return false;
  };
  
  const updatePermissions = async (permissions: string[]): Promise<PermissionResult> => {
    try {
      await updateMutation.mutateAsync(permissions);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };
  
  // Role-based utility flags
  const isAdmin = query.data?.roleType === 'admin';
  const isExecutive = query.data?.roleType === 'executive';
  const isStaff = query.data?.roleType === 'inventory_staff' || query.data?.roleType === 'marketing_staff';
  
  // Permission-based utility flags
  const canManageInventory = query.data?.allPermissions?.includes('inventory_management') || false;
  const canManageContent = query.data?.allPermissions?.includes('content_management') || false;
  
  return {
    ...query,
    queryKey,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    updatePermissions,
    isAdmin,
    isExecutive,
    isStaff,
    canManageInventory,
    canManageContent,
  };
}

// Export type for use in other components
export type { PermissionData, RoleType };