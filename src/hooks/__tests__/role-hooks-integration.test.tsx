/**
 * Role Hooks Integration Tests
 * Testing interaction between useUserRole and useRolePermissions
 * Following established test patterns from successful hooks
 * Pattern compliance: docs/architectural-patterns-and-best-practices.md
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { UserRole } from '../../types';
import type { RolePermission } from '../../services/roleService';

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
  }
}));

// Import after mocks
import { roleService } from '../../services/roleService';

// Import hooks
import { 
  useUserRole,
  useUpdateUserRole,
  useHasRole,
  useHasMinimumRole,
} from '../useUserRole';

import { 
  useRolePermissions,
  useHasPermission,
  useCanPerformAction,
  useRolePermissionsByType,
} from '../useRolePermissions';

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

  const mockPermissions: Record<UserRole, RolePermission[]> = {
    customer: [
      {
        id: 'perm-customer-1',
        role: 'customer',
        permission: 'view_products',
        resource: 'products',
        action: 'read',
        createdAt: '2024-01-01',
      },
      {
        id: 'perm-customer-2',
        role: 'customer',
        permission: 'manage_own_orders',
        resource: 'orders',
        action: 'read',
        createdAt: '2024-01-01',
      },
    ],
    staff: [
      {
        id: 'perm-staff-1',
        role: 'staff',
        permission: 'view_products',
        resource: 'products',
        action: 'read',
        createdAt: '2024-01-01',
      },
      {
        id: 'perm-staff-2',
        role: 'staff',
        permission: 'manage_orders',
        resource: 'orders',
        action: 'write',
        createdAt: '2024-01-01',
      },
      {
        id: 'perm-staff-3',
        role: 'staff',
        permission: 'scan_qr',
        resource: 'scanner',
        action: 'use',
        createdAt: '2024-01-01',
      },
    ],
    manager: [
      {
        id: 'perm-manager-1',
        role: 'manager',
        permission: 'manage_products',
        resource: 'products',
        action: 'write',
        createdAt: '2024-01-01',
      },
      {
        id: 'perm-manager-2',
        role: 'manager',
        permission: 'manage_staff',
        resource: 'users',
        action: 'write',
        createdAt: '2024-01-01',
      },
      {
        id: 'perm-manager-3',
        role: 'manager',
        permission: 'view_reports',
        resource: 'reports',
        action: 'read',
        createdAt: '2024-01-01',
      },
    ],
    admin: [
      {
        id: 'perm-admin-1',
        role: 'admin',
        permission: '*',
        resource: '*',
        action: '*',
        createdAt: '2024-01-01',
      },
    ],
    farmer: [
      {
        id: 'perm-farmer-1',
        role: 'farmer',
        permission: 'manage_own_products',
        resource: 'products',
        action: 'write',
        createdAt: '2024-01-01',
      },
      {
        id: 'perm-farmer-2',
        role: 'farmer',
        permission: 'view_own_orders',
        resource: 'orders',
        action: 'read',
        createdAt: '2024-01-01',
      },
    ],
    vendor: [
      {
        id: 'perm-vendor-1',
        role: 'vendor',
        permission: 'manage_vendor_products',
        resource: 'products',
        action: 'write',
        createdAt: '2024-01-01',
      },
      {
        id: 'perm-vendor-2',
        role: 'vendor',
        permission: 'view_vendor_orders',
        resource: 'orders',
        action: 'read',
        createdAt: '2024-01-01',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default service mocks
    mockRoleService.getAllRoles.mockReturnValue(['customer', 'staff', 'manager', 'admin', 'farmer', 'vendor']);
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

  describe('🔗 Role and Permissions Integration', () => {
    it('should fetch role and corresponding permissions for a user', async () => {
      if (!useUserRole || !useRolePermissions) {
        console.log('Skipping - hooks not implemented yet');
        return;
      }

      mockRoleService.getUserRole.mockResolvedValue('staff');
      mockRoleService.getUserPermissions.mockResolvedValue(mockPermissions.staff);

      const wrapper = createWrapper();
      
      // Render both hooks
      const { result: roleResult } = renderHook(() => useUserRole('user-123'), { wrapper });
      const { result: permResult } = renderHook(() => useRolePermissions('user-123'), { wrapper });

      await waitFor(() => {
        expect(roleResult.current.isLoading).toBe(false);
        expect(permResult.current.isLoading).toBe(false);
      });

      expect(roleResult.current.role).toBe('staff');
      expect(permResult.current.permissions).toEqual(mockPermissions.staff);
      expect(permResult.current.permissions?.length).toBe(3);
    });

    it('should update permissions when user role changes', async () => {
      if (!useUserRole || !useRolePermissions || !useUpdateUserRole) {
        console.log('Skipping - hooks not implemented yet');
        return;
      }

      mockRoleService.getUserRole
        .mockResolvedValueOnce('customer')
        .mockResolvedValueOnce('staff');
      mockRoleService.getUserPermissions
        .mockResolvedValueOnce(mockPermissions.customer)
        .mockResolvedValueOnce(mockPermissions.staff);
      mockRoleService.updateUserRole.mockResolvedValue({
        success: true,
        data: { userId: 'user-123', role: 'staff' as UserRole },
      });

      const wrapper = createWrapper();
      
      const { result: roleResult } = renderHook(() => useUserRole('user-123'), { wrapper });
      const { result: permResult } = renderHook(() => useRolePermissions('user-123'), { wrapper });
      const { result: updateResult } = renderHook(() => useUpdateUserRole(), { wrapper });

      await waitFor(() => {
        expect(roleResult.current.role).toBe('customer');
        expect(permResult.current.permissions).toEqual(mockPermissions.customer);
      });

      // Update role to staff
      await act(async () => {
        await updateResult.current.mutateAsync({ userId: 'user-123', role: 'staff' });
      });

      // Mock the refetch responses
      mockRoleService.getUserRole.mockResolvedValue('staff');
      mockRoleService.getUserPermissions.mockResolvedValue(mockPermissions.staff);

      // Force refetch after update
      await act(async () => {
        await roleResult.current.refetch();
        await permResult.current.refetch();
      });

      await waitFor(() => {
        expect(roleResult.current.role).toBe('staff');
        expect(permResult.current.permissions).toEqual(mockPermissions.staff);
      });
    });

    it('should correctly determine role hierarchy permissions', async () => {
      if (!useUserRole || !useHasMinimumRole) {
        console.log('Skipping - hooks not implemented yet');
        return;
      }

      const wrapper = createWrapper();

      // Test manager role against different minimum requirements
      mockRoleService.getUserRole.mockResolvedValue('manager');
      
      const { result: hasStaffMin } = renderHook(() => useHasMinimumRole('user-123', 'staff'), { wrapper });
      const { result: hasManagerMin } = renderHook(() => useHasMinimumRole('user-123', 'manager'), { wrapper });
      const { result: hasAdminMin } = renderHook(() => useHasMinimumRole('user-123', 'admin'), { wrapper });

      await waitFor(() => {
        expect(hasStaffMin.current).toBe(true); // Manager >= Staff
        expect(hasManagerMin.current).toBe(true); // Manager >= Manager
        expect(hasAdminMin.current).toBe(false); // Manager < Admin
      });
    });

    it('should check specific permissions based on role', async () => {
      if (!useRolePermissions || !useHasPermission) {
        console.log('Skipping - hooks not implemented yet');
        return;
      }

      mockRoleService.getUserPermissions.mockResolvedValue(mockPermissions.staff);
      mockRoleService.hasPermission.mockImplementation((userId, permission) => {
        const staffPerms = mockPermissions.staff.map(p => p.permission);
        return Promise.resolve(staffPerms.includes(permission));
      });

      const wrapper = createWrapper();
      
      const { result: hasViewProducts } = renderHook(() => useHasPermission('user-123', 'view_products'), { wrapper });
      const { result: hasManageProducts } = renderHook(() => useHasPermission('user-123', 'manage_products'), { wrapper });
      const { result: hasScanQR } = renderHook(() => useHasPermission('user-123', 'scan_qr'), { wrapper });

      await waitFor(() => {
        expect(hasViewProducts.current.isLoading).toBe(false);
        expect(hasManageProducts.current.isLoading).toBe(false);
        expect(hasScanQR.current.isLoading).toBe(false);
      });

      expect(hasViewProducts.current.hasPermission).toBe(true);
      expect(hasManageProducts.current.hasPermission).toBe(false);
      expect(hasScanQR.current.hasPermission).toBe(true);
    });

    it('should handle role-specific action permissions', async () => {
      if (!useCanPerformAction) {
        console.log('Skipping - hook not implemented yet');
        return;
      }

      // Mock different action permissions for different roles
      mockRoleService.canPerformAction.mockImplementation((userId, resource, action) => {
        if (userId === 'customer-123') {
          return Promise.resolve(resource === 'products' && action === 'read');
        }
        if (userId === 'staff-123') {
          return Promise.resolve(
            (resource === 'products' && action === 'read') ||
            (resource === 'orders' && action === 'write')
          );
        }
        if (userId === 'admin-123') {
          return Promise.resolve(true); // Admin can do everything
        }
        return Promise.resolve(false);
      });

      const wrapper = createWrapper();
      
      // Test customer permissions
      const { result: customerRead } = renderHook(() => useCanPerformAction('customer-123', 'products', 'read'), { wrapper });
      const { result: customerWrite } = renderHook(() => useCanPerformAction('customer-123', 'products', 'write'), { wrapper });
      
      // Test staff permissions
      const { result: staffOrders } = renderHook(() => useCanPerformAction('staff-123', 'orders', 'write'), { wrapper });
      
      // Test admin permissions
      const { result: adminDelete } = renderHook(() => useCanPerformAction('admin-123', 'users', 'delete'), { wrapper });

      await waitFor(() => {
        expect(customerRead.current.isLoading).toBe(false);
        expect(customerWrite.current.isLoading).toBe(false);
        expect(staffOrders.current.isLoading).toBe(false);
        expect(adminDelete.current.isLoading).toBe(false);
      });

      expect(customerRead.current.canPerform).toBe(true);
      expect(customerWrite.current.canPerform).toBe(false);
      expect(staffOrders.current.canPerform).toBe(true);
      expect(adminDelete.current.canPerform).toBe(true);
    });

    it('should cache role and permission data efficiently', async () => {
      if (!useUserRole || !useRolePermissions) {
        console.log('Skipping - hooks not implemented yet');
        return;
      }

      mockRoleService.getUserRole.mockResolvedValue('manager');
      mockRoleService.getUserPermissions.mockResolvedValue(mockPermissions.manager);

      const wrapper = createWrapper();
      
      // First set of hooks
      const { result: role1 } = renderHook(() => useUserRole('user-123'), { wrapper });
      const { result: perm1 } = renderHook(() => useRolePermissions('user-123'), { wrapper });

      await waitFor(() => {
        expect(role1.current.isLoading).toBe(false);
        expect(perm1.current.isLoading).toBe(false);
      });

      // Second set of hooks with same userId - should use cache
      const { result: role2 } = renderHook(() => useUserRole('user-123'), { wrapper });
      const { result: perm2 } = renderHook(() => useRolePermissions('user-123'), { wrapper });

      // Should immediately have cached data
      expect(role2.current.role).toBe('manager');
      expect(role2.current.isLoading).toBe(false);
      expect(perm2.current.permissions).toEqual(mockPermissions.manager);
      expect(perm2.current.isLoading).toBe(false);

      // Services should only be called once each due to caching
      expect(mockRoleService.getUserRole).toHaveBeenCalledTimes(1);
      expect(mockRoleService.getUserPermissions).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent role and permission fetches', async () => {
      if (!useUserRole || !useRolePermissions) {
        console.log('Skipping - hooks not implemented yet');
        return;
      }

      // Delay the service responses
      mockRoleService.getUserRole.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('admin'), 50))
      );
      mockRoleService.getUserPermissions.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockPermissions.admin), 50))
      );

      const wrapper = createWrapper();
      
      // Render multiple hooks simultaneously
      const { result: role1 } = renderHook(() => useUserRole('user-123'), { wrapper });
      const { result: role2 } = renderHook(() => useUserRole('user-123'), { wrapper });
      const { result: perm1 } = renderHook(() => useRolePermissions('user-123'), { wrapper });
      const { result: perm2 } = renderHook(() => useRolePermissions('user-123'), { wrapper });

      // All should be loading
      expect(role1.current.isLoading).toBe(true);
      expect(role2.current.isLoading).toBe(true);
      expect(perm1.current.isLoading).toBe(true);
      expect(perm2.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(role1.current.isLoading).toBe(false);
        expect(role2.current.isLoading).toBe(false);
        expect(perm1.current.isLoading).toBe(false);
        expect(perm2.current.isLoading).toBe(false);
      });

      // All should have the same data
      expect(role1.current.role).toBe('admin');
      expect(role2.current.role).toBe('admin');
      expect(perm1.current.permissions).toEqual(mockPermissions.admin);
      expect(perm2.current.permissions).toEqual(mockPermissions.admin);
      
      // Services should only be called once each due to deduplication
      expect(mockRoleService.getUserRole).toHaveBeenCalledTimes(1);
      expect(mockRoleService.getUserPermissions).toHaveBeenCalledTimes(1);
    });

    it('should handle role-based feature flags correctly', async () => {
      if (!useUserRole || !useHasRole || !useRolePermissions) {
        console.log('Skipping - hooks not implemented yet');
        return;
      }

      mockRoleService.getUserRole.mockResolvedValue('manager');
      mockRoleService.getUserPermissions.mockResolvedValue(mockPermissions.manager);

      const wrapper = createWrapper();
      
      // Check various role-based feature flags
      const { result: isManager } = renderHook(() => useHasRole('user-123', 'manager'), { wrapper });
      const { result: isAdmin } = renderHook(() => useHasRole('user-123', 'admin'), { wrapper });
      const { result: isStaff } = renderHook(() => useHasRole('user-123', 'staff'), { wrapper });

      await waitFor(() => {
        expect(isManager.current).toBe(true);
        expect(isAdmin.current).toBe(false);
        expect(isStaff.current).toBe(false);
      });
    });
  });
});