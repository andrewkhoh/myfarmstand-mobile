/**
 * useNavigationPermissions Hook
 * Provides navigation permission checking functionality
 */

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RoleNavigationService } from '../../services/role-based/roleNavigationService';
import { useUserRole } from './useUserRole';
import { navigationKeys } from '../../utils/queryKeyFactory';
import { UserRole } from '../../types';
import { ValidationMonitor } from '../../utils/validationMonitor';

interface NavigationPermission {
  screen: string;
  allowed: boolean;
  checked: boolean;
  error?: string;
}

interface UseNavigationPermissionsOptions {
  screens?: string[];
  enableBatchCheck?: boolean;
  cacheResults?: boolean;
}

export const useNavigationPermissions = (options: UseNavigationPermissionsOptions = {}) => {
  const {
    screens = [],
    enableBatchCheck = true,
    cacheResults = true,
  } = options;

  const { data: userRole, isLoading: isRoleLoading } = useUserRole();
  
  // Single permission check query factory
  const createPermissionQuery = useCallback(
    (screen: string) => ({
      queryKey: navigationKeys.permission(userRole?.role || 'customer', screen, userRole?.userId),
      queryFn: async () => {
        if (!userRole?.role) {
          throw new Error('User role not available');
        }
        
        const allowed = await RoleNavigationService.canNavigateTo(userRole.role, screen);
        
        ValidationMonitor.recordPatternSuccess({
          service: 'roleNavigationService' as const,
          pattern: 'simple_input_validation' as const,
          operation: 'permission_checked' as const
        });
        
        return {
          screen,
          allowed,
          checked: true,
        } as NavigationPermission;
      },
      enabled: !!userRole?.role,
      staleTime: cacheResults ? 5 * 60 * 1000 : 0, // 5 minutes if caching enabled
      gcTime: cacheResults ? 10 * 60 * 1000 : 0, // 10 minutes if caching enabled
      retry: false, // Don't retry permission checks
      onError: (error: any) => {
        ValidationMonitor.recordValidationError({
          context: 'useNavigationPermissions.createPermissionQuery',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'PERMISSION_CHECK_FAILED',
          validationPattern: 'simple_validation'
        });
      },
    }),
    [userRole?.role, cacheResults]
  );

  // Batch permission check for multiple screens
  const {
    data: batchPermissions,
    isLoading: isBatchLoading,
    error: batchError,
  } = useQuery({
    queryKey: navigationKeys.batchPermissions(userRole?.role || '', screens, userRole?.userId),
    queryFn: async () => {
      if (!userRole?.role || screens.length === 0) {
        return [] as NavigationPermission[];
      }

      const results: NavigationPermission[] = [];
      
      for (const screen of screens) {
        try {
          const allowed = await RoleNavigationService.canNavigateTo(userRole.role, screen);
          results.push({
            screen,
            allowed,
            checked: true,
          });
        } catch (error) {
          results.push({
            screen,
            allowed: false,
            checked: true,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          
          ValidationMonitor.recordValidationError({
            context: 'useNavigationPermissions.batchPermissionCheck',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorCode: 'BATCH_PERMISSION_FAILED',
            validationPattern: 'simple_validation'
          });
        }
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'roleNavigationService' as const,
        pattern: 'simple_input_validation' as const,
        operation: 'batch_permissions_checked' as const
      });

      return results;
    },
    enabled: enableBatchCheck && !!userRole?.role && screens.length > 0,
    staleTime: cacheResults ? 5 * 60 * 1000 : 0,
    gcTime: cacheResults ? 10 * 60 * 1000 : 0,
  });

  // Individual permission checkers
  const checkPermission = useCallback(
    async (screen: string): Promise<NavigationPermission> => {
      if (!userRole?.role) {
        return {
          screen,
          allowed: false,
          checked: true,
          error: 'User role not available',
        };
      }

      try {
        const allowed = await RoleNavigationService.canNavigateTo(userRole.role, screen);
        
        return {
          screen,
          allowed,
          checked: true,
        };
      } catch (error) {
        ValidationMonitor.recordValidationError({
          context: 'useNavigationPermissions.checkPermission',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'PERMISSION_CHECK_FAILED',
          validationPattern: 'simple_validation'
        });
        
        return {
          screen,
          allowed: false,
          checked: true,
          error: error instanceof Error ? error.message : 'Permission check failed',
        };
      }
    },
    [userRole?.role]
  );

  // Bulk permission checker
  const checkPermissions = useCallback(
    async (screenList: string[]): Promise<NavigationPermission[]> => {
      if (!userRole?.role) {
        return screenList.map(screen => ({
          screen,
          allowed: false,
          checked: true,
          error: 'User role not available',
        }));
      }

      const results: NavigationPermission[] = [];
      
      for (const screen of screenList) {
        const result = await checkPermission(screen);
        results.push(result);
      }

      return results;
    },
    [checkPermission, userRole?.role]
  );

  // Quick permission checks for common scenarios
  const canAccessAdminScreens = useMemo(() => {
    if (!userRole?.role) return false;
    return userRole.role === 'admin';
  }, [userRole?.role]);

  const canAccessManagementScreens = useMemo(() => {
    if (!userRole?.role) return false;
    return ['admin', 'farmer', 'vendor'].includes(userRole.role);
  }, [userRole?.role]);

  const canAccessCustomerOnlyScreens = useMemo(() => {
    if (!userRole?.role) return false;
    return ['customer', 'admin'].includes(userRole.role);
  }, [userRole?.role]);

  const canAccessStaffScreens = useMemo(() => {
    if (!userRole?.role) return false;
    return ['staff', 'admin'].includes(userRole.role);
  }, [userRole?.role]);

  // Permission helpers
  const isAllowed = useCallback(
    (screen: string): boolean => {
      if (enableBatchCheck && batchPermissions) {
        const permission = batchPermissions.find(p => p.screen === screen);
        return permission?.allowed || false;
      }
      
      // For non-batch mode, this would require individual queries
      // which is less efficient but more flexible
      return false;
    },
    [enableBatchCheck, batchPermissions]
  );

  const getPermission = useCallback(
    (screen: string): NavigationPermission | null => {
      if (enableBatchCheck && batchPermissions) {
        return batchPermissions.find(p => p.screen === screen) || null;
      }
      
      return null;
    },
    [enableBatchCheck, batchPermissions]
  );

  const getAllowedScreens = useCallback((): string[] => {
    if (enableBatchCheck && batchPermissions) {
      return batchPermissions
        .filter(p => p.allowed)
        .map(p => p.screen);
    }
    
    return [];
  }, [enableBatchCheck, batchPermissions]);

  const getDeniedScreens = useCallback((): string[] => {
    if (enableBatchCheck && batchPermissions) {
      return batchPermissions
        .filter(p => !p.allowed)
        .map(p => p.screen);
    }
    
    return [];
  }, [enableBatchCheck, batchPermissions]);

  const getPermissionErrors = useCallback((): NavigationPermission[] => {
    if (enableBatchCheck && batchPermissions) {
      return batchPermissions.filter(p => p.error);
    }
    
    return [];
  }, [enableBatchCheck, batchPermissions]);

  // Role-based screen filters
  const getScreensByRole = useCallback(
    (role: UserRole): string[] => {
      const roleScreens: Record<UserRole, string[]> = {
        customer: [
          'HomeScreen',
          'ProductsScreen',
          'CartScreen',
          'OrdersScreen',
          'ProfileScreen',
          'ProductDetailScreen',
          'OrderDetailScreen',
        ],
        farmer: [
          'HomeScreen',
          'FarmerDashboard',
          'ProductsScreen',
          'ProductManagementScreen',
          'InventoryScreen',
          'OrdersScreen',
          'AnalyticsScreen',
          'ProfileScreen',
          'ProductDetailScreen',
          'OrderDetailScreen',
        ],
        admin: [
          'HomeScreen',
          'AdminDashboard',
          'UserManagementScreen',
          'SystemSettingsScreen',
          'ProductsScreen',
          'ProductManagementScreen',
          'InventoryScreen',
          'OrdersScreen',
          'AnalyticsScreen',
          'ProfileScreen',
          'PermissionManagementScreen',
          'ProductDetailScreen',
          'OrderDetailScreen',
          'UserDetailScreen',
        ],
        vendor: [
          'HomeScreen',
          'VendorDashboard',
          'ProductsScreen',
          'ProductManagementScreen',
          'InventoryScreen',
          'OrdersScreen',
          'AnalyticsScreen',
          'ProfileScreen',
          'ProductDetailScreen',
          'OrderDetailScreen',
        ],
        staff: [
          'HomeScreen',
          'StaffDashboard',
          'OrdersScreen',
          'InventoryScreen',
          'ProfileScreen',
          'OrderDetailScreen',
        ],
        manager: [
          'HomeScreen',
          'ManagerDashboard',
          'UserManagementScreen',
          'ProductsScreen',
          'ProductManagementScreen',
          'InventoryScreen',
          'OrdersScreen',
          'AnalyticsScreen',
          'ProfileScreen',
          'ProductDetailScreen',
          'OrderDetailScreen',
        ],
      };

      return roleScreens[role] || [];
    },
    []
  );

  const getAccessibleScreens = useCallback((): string[] => {
    if (!userRole?.role) return [];
    return getScreensByRole(userRole.role);
  }, [userRole?.role, getScreensByRole]);

  // Permission validation helpers
  const validateScreenAccess = useCallback(
    async (screen: string): Promise<{ allowed: boolean; reason?: string }> => {
      if (!userRole?.role) {
        return { allowed: false, reason: 'User not authenticated' };
      }

      try {
        const allowed = await RoleNavigationService.canNavigateTo(userRole.role, screen);
        
        if (!allowed) {
          const denied = await RoleNavigationService.handlePermissionDenied(
            userRole.role,
            screen
          );
          
          return { allowed: false, reason: denied.message };
        }

        return { allowed: true };
      } catch (error) {
        return {
          allowed: false,
          reason: error instanceof Error ? error.message : 'Permission check failed',
        };
      }
    },
    [userRole?.role]
  );

  // Loading state
  const isLoading = isRoleLoading || (enableBatchCheck && isBatchLoading);

  return {
    // Data
    permissions: batchPermissions || [],
    userRole: userRole?.role,
    
    // Loading states
    isLoading,
    isBatchLoading,
    
    // Errors
    batchError,
    hasPermissionErrors: !!(batchPermissions && batchPermissions.some(p => p.error)),
    
    // Permission checkers
    checkPermission,
    checkPermissions,
    validateScreenAccess,
    
    // Permission queries
    isAllowed,
    getPermission,
    getAllowedScreens,
    getDeniedScreens,
    getPermissionErrors,
    
    // Role-based helpers
    canAccessAdminScreens,
    canAccessManagementScreens,
    canAccessCustomerOnlyScreens,
    canAccessStaffScreens,
    
    // Screen filters
    getScreensByRole,
    getAccessibleScreens,
    
    // Utilities
    hasPermissions: !!(batchPermissions && batchPermissions.length > 0),
    checkedScreenCount: batchPermissions?.length || 0,
    allowedScreenCount: batchPermissions?.filter(p => p.allowed).length || 0,
    deniedScreenCount: batchPermissions?.filter(p => !p.allowed).length || 0,
  };
};