/**
 * Role Hooks Integration Tests
 * Verifies that useUserRole and useUserPermissions work correctly with services
 * Following established patterns from docs/architectural-patterns-and-best-practices.md
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the services
jest.mock('../../services/role-based/rolePermissionService', () => ({
  RolePermissionService: {
    getUserRole: jest.fn(),
    getUserPermissions: jest.fn(),
    hasPermission: jest.fn(),
    updateUserRole: jest.fn(),
    addPermission: jest.fn(),
    removePermission: jest.fn(),
  }
}));

jest.mock('../../services/roleService', () => ({
  roleService: {
    getUserRole: jest.fn(),
    getRolePermissions: jest.fn(),
    getUserPermissions: jest.fn(),
    hasPermission: jest.fn(),
    canPerformAction: jest.fn(),
    updateUserRole: jest.fn(),
    getAllRoles: jest.fn(),
    getRoleLevel: jest.fn(),
    hasHigherPrivileges: jest.fn(),
  }
}));

// Mock query key factory
jest.mock('../../utils/queryKeyFactory', () => ({
  roleKeys: {
    all: (userId?: string) => userId ? ['roles', userId] : ['roles'],
    userRole: (userId: string) => ['roles', 'user', userId, 'current'],
    user: (userId: string) => ['roles', 'user', userId],
    permissions: (userId: string) => ['roles', 'user', userId, 'permissions'],
    allRoles: () => ['roles', 'all'],
    roleType: (roleType: string) => ['roles', 'type', roleType],
  }
}));

// Import hooks and mocked services
import { useUserRole, isUserRoleActive } from '../role-based/useUserRole';
import { useUserPermissions, useHasPermission, hasAllPermissions, isAdmin } from '../role-based/usePermissions';
import { RolePermissionService } from '../../services/role-based/rolePermissionService';
import { roleService } from '../../services/roleService';

const mockRolePermissionService = RolePermissionService as jest.Mocked<typeof RolePermissionService>;
const mockRoleService = roleService as jest.Mocked<typeof roleService>;

describe('Role Hooks Integration Tests', () => {
  // Test data
  const testUserId = 'test-user-123';
  
  const mockStaffRoleData = {
    id: 'role-1',
    userId: testUserId,
    roleType: 'staff' as const,
    permissions: ['orders.view', 'orders.update', 'products.view'],
    isActive: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  const mockAdminRoleData = {
    id: 'role-2',
    userId: 'admin-user-456',
    roleType: 'admin' as const,
    permissions: ['*'], // Admin has all permissions
    isActive: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  // Create wrapper with React Query
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useUserRole and useUserPermissions integration', () => {
    it('should fetch user role and permissions together', async () => {
      // Setup mocks
      mockRolePermissionService.getUserRole.mockResolvedValue(mockStaffRoleData);
      mockRoleService.getUserRole.mockResolvedValue('staff');
      
      const wrapper = createWrapper();

      // Render both hooks
      const { result: roleResult } = renderHook(() => useUserRole(testUserId), { wrapper });
      const { result: permissionsResult } = renderHook(() => useUserPermissions(testUserId), { wrapper });

      // Wait for both to load
      await waitFor(() => {
        expect(roleResult.current.isSuccess).toBe(true);
        expect(permissionsResult.current.isSuccess).toBe(true);
      });

      // Verify role data
      expect(roleResult.current?.data?.roleType).toBe('staff');
      expect(getUserRoleType(roleResult.current)).toBe('staff');
      expect(isUserRoleActive(roleResult.current)).toBe(true);

      // Verify permissions data
      expect(permissionsResult.current.roleType).toBe('staff');
      expect(permissionsResult.current.permissions).toContain('orders.view');
      expect(permissionsResult.current.permissions).toContain('orders.update');
      expect(permissionsResult.current.permissions).toContain('products.view');
    });

    it('should check specific permissions correctly', async () => {
      // Setup mocks
      mockRolePermissionService.getUserRole.mockResolvedValue(mockStaffRoleData);
      mockRolePermissionService.hasPermission.mockImplementation(async (userId, permission) => {
        return mockStaffRoleData.permissions.includes(permission);
      });
      
      const wrapper = createWrapper();

      // Test useHasPermission hook
      const { result: hasOrdersView } = renderHook(
        () => useHasPermission(testUserId, 'orders.view'),
        { wrapper }
      );
      
      const { result: hasAdminAccess } = renderHook(
        () => useHasPermission(testUserId, 'admin.access'),
        { wrapper }
      );

      // Wait for results
      await waitFor(() => {
        expect(hasOrdersView.current.isSuccess).toBe(true);
        expect(hasAdminAccess.current.isSuccess).toBe(true);
      });

      // Verify permission checks
      expect(hasOrdersView.current.data).toBe(true);
      expect(hasAdminAccess.current.data).toBe(false);
    });

    it('should handle role updates correctly', async () => {
      // Initial setup as staff
      mockRolePermissionService.getUserRole.mockResolvedValue(mockStaffRoleData);
      mockRoleService.getUserRole.mockResolvedValue('staff');
      
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUserRole(testUserId), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current?.data?.roleType).toBe('staff');
      });

      // Update to admin role
      const adminRole = { ...mockStaffRoleData, roleType: 'admin' as const };
      mockRolePermissionService.getUserRole.mockResolvedValue(adminRole);
      mockRoleService.getUserRole.mockResolvedValue('admin');

      // Refetch to get updated role
      await act(async () => {
        await result.current.refetch();
      });

      // Verify updated role
      await waitFor(() => {
        expect(result.current?.data?.roleType).toBe('admin');
      });
    });
  });

  describe('permission helper functions', () => {
    it('should check multiple permissions correctly', async () => {
      // Setup mock
      mockRolePermissionService.getUserRole.mockResolvedValue(mockStaffRoleData);
      
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUserPermissions(testUserId), { wrapper });

      // Wait for data
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Test hasAllPermissions
      expect(hasAllPermissions(result.current, ['orders.view', 'products.view'])).toBe(true);
      expect(hasAllPermissions(result.current, ['orders.view', 'admin.access'])).toBe(false);

      // Test hasAnyPermission
      expect(hasAnyPermission(result.current, ['orders.view', 'admin.access'])).toBe(true);
      expect(hasAnyPermission(result.current, ['admin.access', 'users.manage'])).toBe(false);
    });

    it('should identify admin role correctly', async () => {
      // Setup admin user
      mockRolePermissionService.getUserRole.mockResolvedValue(mockAdminRoleData);
      
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUserPermissions('admin-user-456'), { wrapper });

      // Wait for data
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Test isAdmin helper
      expect(isAdmin(result.current)).toBe(true);
    });

    it('should handle non-admin roles', async () => {
      // Setup staff user
      mockRolePermissionService.getUserRole.mockResolvedValue(mockStaffRoleData);
      
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUserPermissions(testUserId), { wrapper });

      // Wait for data
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Test isAdmin helper for non-admin
      expect(isAdmin(result.current)).toBe(false);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle null user ID gracefully', () => {
      const wrapper = createWrapper();
      
      const { result: roleResult } = renderHook(() => useUserRole(null), { wrapper });
      const { result: permissionsResult } = renderHook(() => useUserPermissions(null), { wrapper });

      // Both should handle null gracefully
      expect(roleResult.current.isLoading).toBe(false);
      expect(roleResult.current.data).toBe(null);
      
      expect(permissionsResult.current.isLoading).toBe(false);
      expect(permissionsResult.current.permissions).toEqual([]);
    });

    it('should handle service errors gracefully', async () => {
      // Setup mock to throw error
      const errorMessage = 'Service error';
      mockRolePermissionService.getUserRole.mockRejectedValue(new Error(errorMessage));
      
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUserRole(testUserId), { wrapper });

      // Wait for error state
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Verify error handling
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe(errorMessage);
    });

    it('should handle missing permissions gracefully', async () => {
      // Setup role without permissions
      const roleWithoutPermissions = {
        ...mockStaffRoleData,
        permissions: [],
      };
      mockRolePermissionService.getUserRole.mockResolvedValue(roleWithoutPermissions);
      
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUserPermissions(testUserId), { wrapper });

      // Wait for data
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should have empty permissions array
      expect(result.current.permissions).toEqual([]);
      expect(hasAnyPermission(result.current, ['orders.view'])).toBe(false);
    });

    it('should handle inactive roles', async () => {
      // Setup inactive role
      const inactiveRole = {
        ...mockStaffRoleData,
        isActive: false,
      };
      mockRolePermissionService.getUserRole.mockResolvedValue(inactiveRole);
      
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUserRole(testUserId), { wrapper });

      // Wait for data
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check inactive status
      expect(isUserRoleActive(result.current)).toBe(false);
    });
  });

  describe('caching behavior', () => {
    it('should share cache between hooks for same user', async () => {
      // Setup mock
      mockRolePermissionService.getUserRole.mockResolvedValue(mockStaffRoleData);
      
      const wrapper = createWrapper();
      
      // Render first hook
      const { result: firstResult } = renderHook(() => useUserRole(testUserId), { wrapper });
      
      // Wait for first hook to load
      await waitFor(() => {
        expect(firstResult.current.isSuccess).toBe(true);
      });
      
      // Clear mock to verify cache is used
      mockRolePermissionService.getUserRole.mockClear();
      
      // Render second hook with same userId
      const { result: secondResult } = renderHook(() => useUserRole(testUserId), { wrapper });
      
      // Should get data from cache immediately
      expect(secondResult.current.data).toEqual(mockStaffRoleData);
      expect(mockRolePermissionService.getUserRole).not.toHaveBeenCalled();
    });

    it('should not share cache between different users', async () => {
      // Setup different responses for different users
      mockRolePermissionService.getUserRole
        .mockResolvedValueOnce(mockStaffRoleData)
        .mockResolvedValueOnce(mockAdminRoleData);
      
      const wrapper = createWrapper();
      
      // Render hooks for different users
      const { result: staffResult } = renderHook(() => useUserRole(testUserId), { wrapper });
      const { result: adminResult } = renderHook(() => useUserRole('admin-user-456'), { wrapper });
      
      // Wait for both to load
      await waitFor(() => {
        expect(staffResult.current.isSuccess).toBe(true);
        expect(adminResult.current.isSuccess).toBe(true);
      });
      
      // Verify different data for different users
      expect(staffResult.current?.data?.roleType).toBe('staff');
      expect(adminResult.current?.data?.roleType).toBe('admin');
      
      // Verify both users were fetched
      expect(mockRolePermissionService.getUserRole).toHaveBeenCalledTimes(2);
    });
  });
});