/**
 * Integration Tests for useUserRole and useUserPermissions Hooks
 * Following Pattern: Integration testing from established patterns
 * Reference: docs/architectural-patterns-and-best-practices.md
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { UserRole } from '../../types';

// Mock role service
jest.mock('../../services/roleService', () => ({
  roleService: {
    getUserRole: jest.fn(),
    updateUserRole: jest.fn(),
    getAllRoles: jest.fn(),
    getRoleLevel: jest.fn(),
    hasHigherPrivileges: jest.fn(),
    getUserPermissions: jest.fn(),
    hasPermission: jest.fn(),
    canPerformAction: jest.fn(),
    getRolePermissions: jest.fn(),
  }
}));

// Mock query key factory
jest.mock('../../utils/queryKeyFactory', () => ({
  roleKeys: {
    all: (userId?: string) => userId ? ['roles', userId] : ['roles'],
    userRole: (userId: string) => ['roles', userId, 'role'],
    permissions: (userId: string) => ['roles', userId, 'permissions'],
    allRoles: () => ['roles', 'all'],
    roleType: (roleType: string) => ['roles', 'type', roleType],
  }
}));

// Import after mocks
import { roleService, type RolePermission } from '../../services/roleService';
import { 
  useUserRole, 
  useUpdateUserRole,
  useHasRole,
  useHasMinimumRole 
} from '../role-based/useUserRole';
import { 
  useUserPermissions,
  useHasPermission,
  useCanPerformAction,
  useHasAllPermissions,
  useHasAnyPermission
} from '../role-based/usePermissions';

const mockRoleService = roleService as jest.Mocked<typeof roleService>;

describe('Role Hooks Integration Tests', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { 
          retry: false,
          staleTime: 0,
          gcTime: 0,
        },
        mutations: { retry: false },
      },
    });
    
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    
    return Wrapper;
  };

  const mockPermissions: RolePermission[] = [
    {
      id: 'perm-1',
      role: 'manager' as UserRole,
      permission: 'manage_products',
      resource: 'products',
      action: 'write',
      createdAt: '2024-01-01',
    },
    {
      id: 'perm-2',
      role: 'manager' as UserRole,
      permission: 'view_reports',
      resource: 'reports',
      action: 'read',
      createdAt: '2024-01-01',
    },
    {
      id: 'perm-3',
      role: 'manager' as UserRole,
      permission: 'manage_staff',
      resource: 'users',
      action: 'write',
      createdAt: '2024-01-01',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockRoleService.getUserRole.mockResolvedValue('manager');
    mockRoleService.getUserPermissions.mockResolvedValue(mockPermissions);
    mockRoleService.hasPermission.mockImplementation(async (userId, permission) => {
      return mockPermissions.some(p => p.permission === permission);
    });
    mockRoleService.canPerformAction.mockImplementation(async (userId, resource, action) => {
      return mockPermissions.some(p => p.resource === resource && p.action === action);
    });
    mockRoleService.getRoleLevel.mockImplementation((role) => {
      const levels: Record<string, number> = {
        customer: 1,
        vendor: 2,
        farmer: 2,
        staff: 3,
        manager: 4,
        admin: 5,
      };
      return levels[role] || 1;
    });
  });

  describe('🔄 Role and Permissions Integration', () => {
    it('should fetch both role and permissions for a user', async () => {
      const wrapper = createWrapper();
      
      // Render both hooks
      const { result: roleResult } = renderHook(
        () => useUserRole('user-123'),
        { wrapper }
      );
      
      const { result: permResult } = renderHook(
        () => useUserPermissions('user-123'),
        { wrapper }
      );

      // Wait for both to load
      await waitFor(() => {
        expect(roleResult.current.isLoading).toBe(false);
        expect(permResult.current.isLoading).toBe(false);
      });

      // Verify data
      expect(roleResult.current.role).toBe('manager');
      expect(permResult.current.permissions).toEqual(mockPermissions);
    });

    it('should update role and invalidate permissions', async () => {
      const wrapper = createWrapper();
      
      // Setup initial state
      const { result: roleResult } = renderHook(
        () => useUserRole('user-123'),
        { wrapper }
      );
      
      const { result: permResult } = renderHook(
        () => useUserPermissions('user-123'),
        { wrapper }
      );
      
      const { result: updateResult } = renderHook(
        () => useUpdateUserRole(),
        { wrapper }
      );

      await waitFor(() => {
        expect(roleResult.current.isLoading).toBe(false);
        expect(permResult.current.isLoading).toBe(false);
      });

      // Update role
      mockRoleService.updateUserRole.mockResolvedValue({
        success: true,
        message: 'Role updated',
        data: { userId: 'user-123', role: 'admin' as UserRole },
      });
      
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        await updateResult.current.mutateAsync({
          userId: 'user-123',
          role: 'admin' as UserRole,
        });
      });

      // Verify invalidations
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['roles', 'user-123', 'role'],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['roles', 'user-123', 'permissions'],
      });
    });
  });

  describe('🔒 Permission Checking Integration', () => {
    it('should correctly check permissions based on user role', async () => {
      const wrapper = createWrapper();
      
      // Check has permission
      const { result: hasPermResult } = renderHook(
        () => useHasPermission('user-123', 'manage_products'),
        { wrapper }
      );

      await waitFor(() => {
        expect(hasPermResult.current.isLoading).toBe(false);
      });

      expect(hasPermResult.current.hasPermission).toBe(true);

      // Check missing permission
      const { result: noPermResult } = renderHook(
        () => useHasPermission('user-123', 'admin_only'),
        { wrapper }
      );

      await waitFor(() => {
        expect(noPermResult.current.isLoading).toBe(false);
      });

      expect(noPermResult.current.hasPermission).toBe(false);
    });

    it('should check resource-based permissions', async () => {
      const wrapper = createWrapper();
      
      // Can write to products
      const { result: canWriteResult } = renderHook(
        () => useCanPerformAction('user-123', 'products', 'write'),
        { wrapper }
      );

      await waitFor(() => {
        expect(canWriteResult.current.isLoading).toBe(false);
      });

      expect(canWriteResult.current.canPerform).toBe(true);

      // Cannot delete products (no permission)
      const { result: cannotDeleteResult } = renderHook(
        () => useCanPerformAction('user-123', 'products', 'delete'),
        { wrapper }
      );

      await waitFor(() => {
        expect(cannotDeleteResult.current.isLoading).toBe(false);
      });

      expect(cannotDeleteResult.current.canPerform).toBe(false);
    });
  });

  describe('🎯 Role Level Checking', () => {
    it('should check minimum role requirements', async () => {
      mockRoleService.getUserRole.mockResolvedValue('manager');
      const wrapper = createWrapper();
      
      // Has minimum role (manager >= staff)
      const { result: hasMinResult } = renderHook(
        () => useHasMinimumRole('user-123', 'staff'),
        { wrapper }
      );

      await waitFor(() => {
        expect(hasMinResult).toBe(true);
      });

      // Does not have minimum role (manager < admin)
      const { result: noMinResult } = renderHook(
        () => useHasMinimumRole('user-123', 'admin'),
        { wrapper }
      );

      await waitFor(() => {
        expect(noMinResult).toBe(false);
      });
    });

    it('should check exact role match', async () => {
      mockRoleService.getUserRole.mockResolvedValue('staff');
      const wrapper = createWrapper();
      
      // Has exact role
      const { result: hasRoleResult } = renderHook(
        () => useHasRole('user-123', 'staff'),
        { wrapper }
      );

      await waitFor(() => {
        expect(hasRoleResult).toBe(true);
      });

      // Does not have role
      const { result: noRoleResult } = renderHook(
        () => useHasRole('user-123', 'admin'),
        { wrapper }
      );

      await waitFor(() => {
        expect(noRoleResult).toBe(false);
      });
    });
  });

  describe('🔀 Multiple Permission Checks', () => {
    it('should check if user has all required permissions', async () => {
      const wrapper = createWrapper();
      
      // Has all permissions
      const { result: hasAllResult } = renderHook(
        () => useHasAllPermissions('user-123', ['manage_products', 'view_reports']),
        { wrapper }
      );

      await waitFor(() => {
        expect(hasAllResult.isLoading).toBe(false);
      });

      expect(hasAllResult.hasAll).toBe(true);

      // Missing one permission
      const { result: missingResult } = renderHook(
        () => useHasAllPermissions('user-123', ['manage_products', 'admin_only']),
        { wrapper }
      );

      await waitFor(() => {
        expect(missingResult.isLoading).toBe(false);
      });

      expect(missingResult.hasAll).toBe(false);
    });

    it('should check if user has any of the required permissions', async () => {
      const wrapper = createWrapper();
      
      // Has at least one permission
      const { result: hasAnyResult } = renderHook(
        () => useHasAnyPermission('user-123', ['admin_only', 'manage_products']),
        { wrapper }
      );

      await waitFor(() => {
        expect(hasAnyResult.isLoading).toBe(false);
      });

      expect(hasAnyResult.hasAny).toBe(true);

      // Has none of the permissions
      const { result: hasNoneResult } = renderHook(
        () => useHasAnyPermission('user-123', ['admin_only', 'super_admin']),
        { wrapper }
      );

      await waitFor(() => {
        expect(hasNoneResult.isLoading).toBe(false);
      });

      expect(hasNoneResult.hasAny).toBe(false);
    });
  });

  describe('🚀 Cache Behavior', () => {
    it('should share cache between role and permission hooks', async () => {
      const wrapper = createWrapper();
      
      // First fetch
      renderHook(() => useUserRole('user-123'), { wrapper });
      
      await waitFor(() => {
        expect(mockRoleService.getUserRole).toHaveBeenCalledTimes(1);
      });

      // Second fetch with same userId - should use cache
      renderHook(() => useUserRole('user-123'), { wrapper });
      
      // Should not call service again
      expect(mockRoleService.getUserRole).toHaveBeenCalledTimes(1);
      
      // Different userId - should fetch
      renderHook(() => useUserRole('user-456'), { wrapper });
      
      await waitFor(() => {
        expect(mockRoleService.getUserRole).toHaveBeenCalledTimes(2);
      });
    });

    it('should deduplicate concurrent requests', async () => {
      const wrapper = createWrapper();
      
      // Simulate slow service
      mockRoleService.getUserPermissions.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockPermissions), 100))
      );

      // Multiple simultaneous renders
      const { result: result1 } = renderHook(
        () => useUserPermissions('user-123'),
        { wrapper }
      );
      const { result: result2 } = renderHook(
        () => useUserPermissions('user-123'),
        { wrapper }
      );
      const { result: result3 } = renderHook(
        () => useUserPermissions('user-123'),
        { wrapper }
      );

      // All should be loading
      expect(result1.current.isLoading).toBe(true);
      expect(result2.current.isLoading).toBe(true);
      expect(result3.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result2.current.isLoading).toBe(false);
        expect(result3.current.isLoading).toBe(false);
      });

      // Service should only be called once
      expect(mockRoleService.getUserPermissions).toHaveBeenCalledTimes(1);
      
      // All should have the same data
      expect(result1.current.permissions).toEqual(mockPermissions);
      expect(result2.current.permissions).toEqual(mockPermissions);
      expect(result3.current.permissions).toEqual(mockPermissions);
    });
  });

  describe('⚠️ Edge Cases', () => {
    it('should handle missing or invalid userId', async () => {
      const wrapper = createWrapper();
      
      // Empty string
      const { result: emptyResult } = renderHook(
        () => useUserRole(''),
        { wrapper }
      );
      
      expect(emptyResult.current.role).toBeUndefined();
      expect(emptyResult.current.isLoading).toBe(false);
      
      // Null
      const { result: nullResult } = renderHook(
        () => useUserPermissions(null as any),
        { wrapper }
      );
      
      expect(nullResult.current.permissions).toBeUndefined();
      expect(nullResult.current.isLoading).toBe(false);
      
      // Undefined
      const { result: undefinedResult } = renderHook(
        () => useHasPermission(undefined as any, 'some_permission'),
        { wrapper }
      );
      
      expect(undefinedResult.current.hasPermission).toBe(false);
      expect(undefinedResult.current.isLoading).toBe(false);
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Service unavailable');
      mockRoleService.getUserRole.mockRejectedValue(error);
      mockRoleService.getUserPermissions.mockRejectedValue(error);
      
      const wrapper = createWrapper();
      
      const { result: roleResult } = renderHook(
        () => useUserRole('user-123'),
        { wrapper }
      );
      
      const { result: permResult } = renderHook(
        () => useUserPermissions('user-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(roleResult.current.isError).toBe(true);
        expect(permResult.current.isError).toBe(true);
      });

      expect(roleResult.current.error).toBeDefined();
      expect(permResult.current.error).toBeDefined();
      expect(roleResult.current.role).toBeUndefined();
      expect(permResult.current.permissions).toBeUndefined();
    });
  });
});