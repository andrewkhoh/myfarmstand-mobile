/**
 * Role Hooks Integration Tests - Testing hooks work together
 * Pattern Reference: src/hooks/__tests__/useCart.test.tsx
 * Following architectural patterns from docs/architectural-patterns-and-best-practices.md
 */

import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the service
jest.mock('../../../services/role-based/rolePermissionService', () => ({
  RolePermissionService: {
    getUserRole: jest.fn(),
    hasPermission: jest.fn(),
    updateUserPermissions: jest.fn(),
    createUserRole: jest.fn(),
    getAllUserRoles: jest.fn(),
  }
}));

// Mock auth hook
jest.mock('../../useAuth', () => ({
  useCurrentUser: jest.fn(),
}));

// Import hooks after mocks
import { useUserRole } from '../useUserRole';
import { useUserPermissions } from '../role-based/usePermissions';
import { RolePermissionService } from '../../../services/role-based/rolePermissionService';
import { useCurrentUser } from '../../useAuth';
import { ROLE_PERMISSIONS } from '../../../schemas/role-based/rolePermission.schemas';

const mockRoleService = RolePermissionService as jest.Mocked<typeof RolePermissionService>;
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

describe('Role Hooks Integration Tests', () => {
  // Test data
  const mockUser = {
    id: 'integration-user-123',
    email: 'integration@example.com',
    name: 'Integration Test User',
  };

  const createMockRole = (roleType: 'inventory_staff' | 'marketing_staff' | 'executive' | 'admin') => ({
    id: `role-${roleType}`,
    userId: mockUser.id,
    roleType,
    permissions: ['custom_permission'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  });

  // Create wrapper
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default auth setup
    mockUseCurrentUser.mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null,
    } as any);
  });

  describe('🔗 useUserRole and useUserPermissions Integration', () => {
    it('should work together for inventory staff', async () => {
      const inventoryRole = createMockRole('inventory_staff');
      mockRoleService.getUserRole.mockResolvedValue(inventoryRole);
      mockRoleService.hasPermission.mockImplementation(async (userId, permission) => {
        const allPermissions = [...ROLE_PERMISSIONS.inventory_staff, 'custom_permission'];
        return allPermissions.includes(permission);
      });

      const wrapper = createWrapper();

      // Render both hooks
      const roleHook = renderHook(() => useUserRole(), { wrapper });
      const permissionsHook = renderHook(() => useUserPermissions(), { wrapper });

      await waitFor(() => {
        expect(roleHook.result.current.isSuccess).toBe(true);
        expect(permissionsHook.result.current.isSuccess).toBe(true);
      });

      // Verify role data
      expect(roleHook.result.current?.data?.roleType).toBe('inventory_staff');

      // Verify permissions data
      expect(permissionsHook.result.current?.data?.roleType).toBe('inventory_staff');
      expect(permissionsHook.result.current.isStaff).toBe(true);
      expect(permissionsHook.result.current.canManageInventory).toBe(true);
      expect(permissionsHook.result.current.canManageContent).toBe(false);

      // Verify permission checking
      const hasInventoryPermission = await permissionsHook.result.current.hasPermission('view_inventory');
      expect(hasInventoryPermission).toBe(true);

      const hasCustomPermission = await permissionsHook.result.current.hasPermission('custom_permission');
      expect(hasCustomPermission).toBe(true);
    });

    it('should work together for marketing staff', async () => {
      const marketingRole = createMockRole('marketing_staff');
      mockRoleService.getUserRole.mockResolvedValue(marketingRole);
      mockRoleService.hasPermission.mockImplementation(async (userId, permission) => {
        const allPermissions = [...ROLE_PERMISSIONS.marketing_staff, 'custom_permission'];
        return allPermissions.includes(permission);
      });

      const wrapper = createWrapper();

      const roleHook = renderHook(() => useUserRole(), { wrapper });
      const permissionsHook = renderHook(() => useUserPermissions(), { wrapper });

      await waitFor(() => {
        expect(roleHook.result.current.isSuccess).toBe(true);
        expect(permissionsHook.result.current.isSuccess).toBe(true);
      });

      // Verify role data
      expect(roleHook.result.current?.data?.roleType).toBe('marketing_staff');

      // Verify permissions data
      expect(permissionsHook.result.current?.data?.roleType).toBe('marketing_staff');
      expect(permissionsHook.result.current.isStaff).toBe(true);
      expect(permissionsHook.result.current.canManageContent).toBe(true);
      expect(permissionsHook.result.current.canManageInventory).toBe(false);

      // Verify permission checking
      const hasContentPermission = await permissionsHook.result.current.hasPermission('content_management');
      expect(hasContentPermission).toBe(true);

      const hasInventoryPermission = await permissionsHook.result.current.hasPermission('inventory_management');
      expect(hasInventoryPermission).toBe(false);
    });

    it('should work together for executive role', async () => {
      const executiveRole = createMockRole('executive');
      mockRoleService.getUserRole.mockResolvedValue(executiveRole);
      mockRoleService.hasPermission.mockImplementation(async (userId, permission) => {
        const allPermissions = [...ROLE_PERMISSIONS.executive, 'custom_permission'];
        return allPermissions.includes(permission);
      });

      const wrapper = createWrapper();

      const roleHook = renderHook(() => useUserRole(), { wrapper });
      const permissionsHook = renderHook(() => useUserPermissions(), { wrapper });

      await waitFor(() => {
        expect(roleHook.result.current.isSuccess).toBe(true);
        expect(permissionsHook.result.current.isSuccess).toBe(true);
      });

      // Verify role data
      expect(roleHook.result.current?.data?.roleType).toBe('executive');

      // Verify permissions data
      expect(permissionsHook.result.current.isExecutive).toBe(true);
      expect(permissionsHook.result.current.isAdmin).toBe(false);
      expect(permissionsHook.result.current.isStaff).toBe(false);

      // Verify executive analytics permission
      const hasAnalyticsPermission = await permissionsHook.result.current.hasPermission('executive_analytics');
      expect(hasAnalyticsPermission).toBe(true);
    });

    it('should work together for admin role', async () => {
      const adminRole = createMockRole('admin');
      mockRoleService.getUserRole.mockResolvedValue(adminRole);
      mockRoleService.hasPermission.mockImplementation(async () => true); // Admin has all permissions

      const wrapper = createWrapper();

      const roleHook = renderHook(() => useUserRole(), { wrapper });
      const permissionsHook = renderHook(() => useUserPermissions(), { wrapper });

      await waitFor(() => {
        expect(roleHook.result.current.isSuccess).toBe(true);
        expect(permissionsHook.result.current.isSuccess).toBe(true);
      });

      // Verify role data
      expect(roleHook.result.current?.data?.roleType).toBe('admin');

      // Verify permissions data
      expect(permissionsHook.result.current.isAdmin).toBe(true);
      expect(permissionsHook.result.current.canManageInventory).toBe(true);
      expect(permissionsHook.result.current.canManageContent).toBe(true);

      // Verify admin has all permissions
      const hasAllPermissions = await permissionsHook.result.current.hasAllPermissions([
        'manage_users',
        'inventory_management',
        'content_management',
        'executive_analytics',
      ]);
      expect(hasAllPermissions).toBe(true);
    });
  });

  describe('🔄 Data Flow Integration', () => {
    it('should handle role updates affecting permissions', async () => {
      // Start with inventory staff
      let currentRole = createMockRole('inventory_staff');
      mockRoleService.getUserRole.mockResolvedValue(currentRole);
      mockRoleService.hasPermission.mockImplementation(async (userId, permission) => {
        const rolePerms = ROLE_PERMISSIONS[currentRole.roleType];
        return [...rolePerms, ...currentRole.permissions].includes(permission);
      });

      const wrapper = createWrapper();
      const permissionsHook = renderHook(() => useUserPermissions(), { wrapper });

      await waitFor(() => {
        expect(permissionsHook.result.current.isSuccess).toBe(true);
      });

      expect(permissionsHook.result.current.canManageInventory).toBe(true);
      expect(permissionsHook.result.current.canManageContent).toBe(false);

      // Simulate role change to marketing staff
      currentRole = createMockRole('marketing_staff');
      mockRoleService.getUserRole.mockResolvedValue(currentRole);

      await act(async () => {
        await permissionsHook.result.current.refetch();
      });

      await waitFor(() => {
        expect(permissionsHook.result.current?.data?.roleType).toBe('marketing_staff');
      });

      expect(permissionsHook.result.current.canManageInventory).toBe(false);
      expect(permissionsHook.result.current.canManageContent).toBe(true);
    });

    it('should handle permission updates', async () => {
      const role = createMockRole('inventory_staff');
      mockRoleService.getUserRole.mockResolvedValue(role);
      mockRoleService.updateUserPermissions.mockImplementation(async (userId, permissions) => ({
        ...role,
        permissions,
      }));

      const wrapper = createWrapper();
      const permissionsHook = renderHook(() => useUserPermissions(), { wrapper });

      await waitFor(() => {
        expect(permissionsHook.result.current.isSuccess).toBe(true);
      });

      // Update permissions
      const newPermissions = ['new_custom_1', 'new_custom_2'];
      const updateResult = await permissionsHook.result.current.updatePermissions(newPermissions);

      expect(updateResult.success).toBe(true);
      expect(mockRoleService.updateUserPermissions).toHaveBeenCalledWith(mockUser.id, newPermissions);
    });
  });

  describe('❌ Error Scenarios', () => {
    it('should handle both hooks when user is not authenticated', () => {
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      } as any);

      const wrapper = createWrapper();

      const roleHook = renderHook(() => useUserRole(), { wrapper });
      const permissionsHook = renderHook(() => useUserPermissions(), { wrapper });

      // Both hooks should be in error state
      expect(roleHook.result.current.isError).toBe(true);
      expect(permissionsHook.result.current.isError).toBe(true);

      // Both should have authentication error
      expect(roleHook.result.current.error?.code).toBe('AUTHENTICATION_REQUIRED');
      expect(permissionsHook.result.current.error?.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should handle when user has no role', async () => {
      mockRoleService.getUserRole.mockResolvedValue(null);

      const wrapper = createWrapper();

      const roleHook = renderHook(() => useUserRole(), { wrapper });
      const permissionsHook = renderHook(() => useUserPermissions(), { wrapper });

      await waitFor(() => {
        expect(roleHook.result.current.isSuccess).toBe(true);
        expect(permissionsHook.result.current.isSuccess).toBe(true);
      });

      // Role hook should return null
      expect(roleHook.result.current.data).toBeNull();

      // Permissions hook should return empty permissions
      expect(permissionsHook.result.current?.data?.permissions).toEqual([]);
      expect(permissionsHook.result.current?.data?.rolePermissions).toEqual([]);
      expect(permissionsHook.result.current?.data?.allPermissions).toEqual([]);

      // All role checks should be false
      expect(permissionsHook.result.current.isAdmin).toBe(false);
      expect(permissionsHook.result.current.isExecutive).toBe(false);
      expect(permissionsHook.result.current.isStaff).toBe(false);
    });
  });

  describe('🚀 Performance and Caching', () => {
    it('should share cached data between hooks', async () => {
      const role = createMockRole('inventory_staff');
      mockRoleService.getUserRole.mockResolvedValue(role);

      const wrapper = createWrapper();

      // Render first hook
      const roleHook1 = renderHook(() => useUserRole(), { wrapper });
      await waitFor(() => {
        expect(roleHook1.result.current.isSuccess).toBe(true);
      });

      // Service should be called once
      expect(mockRoleService.getUserRole).toHaveBeenCalledTimes(1);

      // Render second hook with same userId - should use cache
      const roleHook2 = renderHook(() => useUserRole(), { wrapper });
      await waitFor(() => {
        expect(roleHook2.result.current.isSuccess).toBe(true);
      });

      // Service should still only be called once (cached)
      expect(mockRoleService.getUserRole).toHaveBeenCalledTimes(1);

      // Both hooks should have same data
      expect(roleHook1.result.current.data).toEqual(roleHook2.result.current.data);
    });
  });
});