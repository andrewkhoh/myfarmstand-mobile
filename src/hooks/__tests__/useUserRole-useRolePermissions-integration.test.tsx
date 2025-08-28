/**
 * Role Hooks Integration Tests
 * Following Pattern: docs/architectural-patterns-and-best-practices.md
 * Reference: src/hooks/__tests__/useCart.test.tsx (100% success pattern)
 * 
 * Tests the integration between useUserRole and useRolePermissions hooks
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the service - following established pattern
jest.mock('../../services/role-based/rolePermissionService', () => ({
  RolePermissionService: {
    getUserRole: jest.fn(),
    getUserPermissions: jest.fn(),
    hasPermission: jest.fn(),
    hasAnyPermission: jest.fn(),
    hasAllPermissions: jest.fn(),
    hasMultiplePermissions: jest.fn(),
    validatePermissions: jest.fn(),
    addPermission: jest.fn(),
    removePermission: jest.fn(),
    updateUserPermissions: jest.fn(),
    getAllPermissionsForRole: jest.fn(),
    createUserRole: jest.fn(),
    updateUserRole: jest.fn(),
  }
}));

// Mock query key factory - following centralized pattern
jest.mock('../../utils/queryKeyFactory', () => ({
  roleKeys: {
    all: (userId?: string) => userId ? ['roles', userId] : ['roles'],
    user: (userId: string) => ['roles', 'user', userId],
    userRole: (userId: string) => ['roles', userId, 'current'],
    permissions: (userId: string) => ['roles', 'user', userId, 'permissions'],
    allRoles: () => ['roles', 'all'],
    roleType: (roleType: string) => ['roles', 'type', roleType],
  }
}));

// Mock auth hook
jest.mock('../useAuth', () => ({
  useCurrentUser: jest.fn(),
}));

import { useUserRole } from '../useUserRole';
import { useRolePermissions } from '../useRolePermissions';
import { RolePermissionService } from '../../services/role-based/rolePermissionService';
import { useCurrentUser } from '../useAuth';

const mockRolePermissionService = RolePermissionService as jest.Mocked<typeof RolePermissionService>;
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

describe('Role Hooks Integration Tests', () => {
  let queryClient: QueryClient;
  
  // Test data following schema patterns
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockUserRole = {
    id: 'role-123',
    userId: 'test-user-123',
    roleType: 'inventory_staff' as const,
    permissions: ['view_inventory', 'update_stock'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockPermissions = [
    'view_inventory',
    'update_stock',
    'create_products',
    'delete_products',
    'view_reports',
    'manage_users',
  ];

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    // Create fresh query client for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default auth state
    mockUseCurrentUser.mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null,
    } as any);
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Integration: Role and Permissions Together', () => {
    it('should fetch both role and permissions for a user', async () => {
      mockRolePermissionService.getUserRole.mockResolvedValue(mockUserRole);
      mockRolePermissionService.getUserPermissions.mockResolvedValue(mockPermissions);
      
      const { result: roleResult } = renderHook(
        () => useUserRole('test-user-123'),
        { wrapper: createWrapper() }
      );

      const { result: permResult } = renderHook(
        () => useRolePermissions('test-user-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(roleResult.current.isSuccess).toBe(true);
        expect(permResult.current.isSuccess).toBe(true);
      });

      // Verify role data
      expect(roleResult.current.data).toEqual(mockUserRole);
      expect(roleResult.current.roleType).toBe('inventory_staff');

      // Verify permissions data
      expect(permResult.current.permissions).toEqual(mockPermissions);
      expect(permResult.current.hasPermission('view_inventory')).toBe(true);
    });

    it('should handle user with role but no custom permissions', async () => {
      const roleWithoutCustomPerms = { ...mockUserRole, permissions: [] };
      mockRolePermissionService.getUserRole.mockResolvedValue(roleWithoutCustomPerms);
      mockRolePermissionService.getUserPermissions.mockResolvedValue([]);
      
      const { result: roleResult } = renderHook(
        () => useUserRole('test-user-123'),
        { wrapper: createWrapper() }
      );

      const { result: permResult } = renderHook(
        () => useRolePermissions('test-user-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(roleResult.current.isSuccess).toBe(true);
        expect(permResult.current.isSuccess).toBe(true);
      });

      expect(roleResult.current.permissions).toEqual([]);
      expect(permResult.current.permissions).toEqual([]);
    });

    it('should coordinate updates when role changes', async () => {
      const adminRole = { ...mockUserRole, roleType: 'admin' as const };
      const adminPermissions = ['admin_all', 'manage_users', 'system_settings'];
      
      mockRolePermissionService.getUserRole.mockResolvedValue(mockUserRole);
      mockRolePermissionService.getUserPermissions.mockResolvedValue(mockPermissions);
      
      const { result: roleResult } = renderHook(
        () => useUserRole('test-user-123'),
        { wrapper: createWrapper() }
      );

      const { result: permResult } = renderHook(
        () => useRolePermissions('test-user-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(roleResult.current.isSuccess).toBe(true);
        expect(permResult.current.isSuccess).toBe(true);
      });

      expect(roleResult.current.roleType).toBe('inventory_staff');
      expect(permResult.current.hasPermission('admin_all')).toBe(false);

      // Update to admin role
      mockRolePermissionService.getUserRole.mockResolvedValue(adminRole);
      mockRolePermissionService.getUserPermissions.mockResolvedValue(adminPermissions);
      
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['roles'] });

      await waitFor(() => {
        expect(roleResult.current.roleType).toBe('admin');
      });

      await waitFor(() => {
        expect(permResult.current.hasPermission('admin_all')).toBe(true);
      });
    });

    it('should handle permission mutations affecting role data', async () => {
      mockRolePermissionService.getUserRole.mockResolvedValue(mockUserRole);
      mockRolePermissionService.getUserPermissions.mockResolvedValue(['view_inventory']);
      mockRolePermissionService.addPermission.mockResolvedValue(true);
      
      const { result: roleResult } = renderHook(
        () => useUserRole('test-user-123'),
        { wrapper: createWrapper() }
      );

      const { result: permResult } = renderHook(
        () => useRolePermissions('test-user-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(roleResult.current.isSuccess).toBe(true);
        expect(permResult.current.isSuccess).toBe(true);
      });

      // Initial state
      expect(permResult.current.hasPermission('update_stock')).toBe(false);

      // Add permission
      const updatedRole = { ...mockUserRole, permissions: ['view_inventory', 'update_stock'] };
      mockRolePermissionService.getUserRole.mockResolvedValue(updatedRole);
      mockRolePermissionService.getUserPermissions.mockResolvedValue(['view_inventory', 'update_stock']);

      await act(async () => {
        await permResult.current.addPermission.mutateAsync('update_stock');
      });

      // Both hooks should be invalidated
      await waitFor(() => {
        expect(roleResult.current.permissions).toContain('update_stock');
      });

      await waitFor(() => {
        expect(permResult.current.hasPermission('update_stock')).toBe(true);
      });
    });

    it('should handle concurrent loading states correctly', async () => {
      // Delay role response
      mockRolePermissionService.getUserRole.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockUserRole), 100))
      );
      
      // Delay permissions response differently
      mockRolePermissionService.getUserPermissions.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockPermissions), 50))
      );
      
      const { result: roleResult } = renderHook(
        () => useUserRole('test-user-123'),
        { wrapper: createWrapper() }
      );

      const { result: permResult } = renderHook(
        () => useRolePermissions('test-user-123'),
        { wrapper: createWrapper() }
      );

      // Initially both loading
      expect(roleResult.current.isLoading).toBe(true);
      expect(permResult.current.isLoading).toBe(true);

      // Permissions load first
      await waitFor(() => {
        expect(permResult.current.isSuccess).toBe(true);
      });

      // Role still loading
      expect(roleResult.current.isLoading).toBe(true);
      expect(permResult.current.isSuccess).toBe(true);

      // Role loads
      await waitFor(() => {
        expect(roleResult.current.isSuccess).toBe(true);
      });

      // Both loaded
      expect(roleResult.current.isSuccess).toBe(true);
      expect(permResult.current.isSuccess).toBe(true);
    });

    it('should handle error states independently', async () => {
      mockRolePermissionService.getUserRole.mockRejectedValue(new Error('Role fetch failed'));
      mockRolePermissionService.getUserPermissions.mockResolvedValue(mockPermissions);
      
      const { result: roleResult } = renderHook(
        () => useUserRole('test-user-123'),
        { wrapper: createWrapper() }
      );

      const { result: permResult } = renderHook(
        () => useRolePermissions('test-user-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(roleResult.current.isError).toBe(true);
      });

      await waitFor(() => {
        expect(permResult.current.isSuccess).toBe(true);
      });

      // Role failed but permissions succeeded
      expect(roleResult.current.isError).toBe(true);
      expect(roleResult.current.error).toBeDefined();
      expect(permResult.current.isSuccess).toBe(true);
      expect(permResult.current.permissions).toEqual(mockPermissions);
    });

    it('should share cache between multiple hook instances', async () => {
      mockRolePermissionService.getUserRole.mockResolvedValue(mockUserRole);
      mockRolePermissionService.getUserPermissions.mockResolvedValue(mockPermissions);
      
      // First instance
      const { result: roleResult1 } = renderHook(
        () => useUserRole('test-user-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(roleResult1.current.isSuccess).toBe(true);
      });

      expect(mockRolePermissionService.getUserRole).toHaveBeenCalledTimes(1);

      // Second instance should use cache
      const { result: roleResult2 } = renderHook(
        () => useUserRole('test-user-123'),
        { wrapper: createWrapper() }
      );

      expect(roleResult2.current.isSuccess).toBe(true);
      expect(roleResult2.current.data).toEqual(mockUserRole);
      
      // Should not call service again
      expect(mockRolePermissionService.getUserRole).toHaveBeenCalledTimes(1);
    });

    it('should handle user without any role', async () => {
      mockRolePermissionService.getUserRole.mockResolvedValue(null);
      mockRolePermissionService.getUserPermissions.mockResolvedValue([]);
      
      const { result: roleResult } = renderHook(
        () => useUserRole('test-user-123'),
        { wrapper: createWrapper() }
      );

      const { result: permResult } = renderHook(
        () => useRolePermissions('test-user-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(roleResult.current.isSuccess).toBe(true);
        expect(permResult.current.isSuccess).toBe(true);
      });

      // No role
      expect(roleResult.current.data).toBeNull();
      expect(roleResult.current.roleType).toBeUndefined();
      expect(roleResult.current.permissions).toEqual([]);

      // No permissions
      expect(permResult.current.permissions).toEqual([]);
      expect(permResult.current.hasPermission('view_inventory')).toBe(false);
      expect(permResult.current.hasAnyPermission(['view_inventory', 'update_stock'])).toBe(false);
    });
  });
});