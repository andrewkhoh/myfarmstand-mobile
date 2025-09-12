/**
 * useRolePermissions Hook Tests - Following Established Test Pattern
 * Pattern Reference: src/hooks/__tests__/useCart.test.tsx
 * Following architectural patterns from docs/architectural-patterns-and-best-practices.md
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the service first
jest.mock('../../../services/rolePermissionService', () => ({
  RolePermissionService: {
    getUserRole: jest.fn(),
    hasPermission: jest.fn(),
    updateUserPermissions: jest.fn(),
  }
}));

// Mock auth hook
jest.mock('../../useAuth', () => ({
  useCurrentUser: jest.fn(),
}));

// Import hook after mocks
import { useRolePermissions } from '../useRolePermissions';
import { RolePermissionService } from '../../../services/rolePermissionService';
import { useCurrentUser } from '../../useAuth';
import { ROLE_PERMISSIONS } from '../../../schemas/role-based/rolePermission.schemas';

const mockGetUserRole = RolePermissionService.getUserRole as jest.MockedFunction<typeof RolePermissionService.getUserRole>;
const mockHasPermission = RolePermissionService.hasPermission as jest.MockedFunction<typeof RolePermissionService.hasPermission>;
const mockUpdateUserPermissions = RolePermissionService.updateUserPermissions as jest.MockedFunction<typeof RolePermissionService.updateUserPermissions>;
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

describe('useRolePermissions Hook Tests', () => {
  // Test data following schema structure
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockRoleData = {
    id: 'role-123',
    userId: 'test-user-123',
    roleType: 'inventory_staff' as const,
    permissions: ['view_inventory', 'update_stock'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  // Create wrapper following pattern
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

    // Default service setup
    mockGetUserRole.mockResolvedValue(mockRoleData);
  });

  describe('🔑 Basic Functionality', () => {
    it('should fetch user permissions when authenticated', async () => {
      const { result } = renderHook(() => useRolePermissions(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.permissions).toBeDefined();
      expect(result.current.data?.rolePermissions).toBeDefined();
      expect(result.current.data?.allPermissions).toBeDefined();
    });

    it('should combine role and custom permissions', async () => {
      const customPermissions = ['custom_permission_1', 'custom_permission_2'];
      const roleWithCustom = {
        ...mockRoleData,
        permissions: customPermissions,
      };

      mockGetUserRole.mockResolvedValue(roleWithCustom);

      const { result } = renderHook(() => useRolePermissions(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should have both role-based and custom permissions
      expect(result.current.data?.allPermissions).toContain('view_inventory'); // Role-based
      expect(result.current.data?.allPermissions).toContain('custom_permission_1'); // Custom
    });

    it('should fetch permissions for specific userId', async () => {
      const specificUserId = 'specific-user-456';
      mockGetUserRole.mockResolvedValue({
        ...mockRoleData,
        userId: specificUserId,
      });

      const { result } = renderHook(() => useRolePermissions(specificUserId), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGetUserRole).toHaveBeenCalledWith(specificUserId);
    });
  });

  describe('= Permission Checking', () => {
    it('should check single permission correctly', async () => {
      mockHasPermission.mockResolvedValue(true);

      const { result } = renderHook(() => useRolePermissions(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const hasPermission = await result.current.hasPermission('view_inventory');
      expect(hasPermission).toBe(true);
    });

    it('should check multiple permissions correctly', async () => {
      mockHasPermission.mockImplementation(async (userId, permission) => {
        return ['view_inventory', 'update_stock'].includes(permission);
      });

      const { result } = renderHook(() => useRolePermissions(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const hasAll = await result.current.hasAllPermissions(['view_inventory', 'update_stock']);
      expect(hasAll).toBe(true);

      const hasSome = await result.current.hasAnyPermission(['view_inventory', 'nonexistent']);
      expect(hasSome).toBe(true);

      const hasNone = await result.current.hasAnyPermission(['nonexistent1', 'nonexistent2']);
      expect(hasNone).toBe(false);
    });
  });

  describe('=� Different Role Types', () => {
    it('should handle inventory_staff permissions', async () => {
      const { result } = renderHook(() => useRolePermissions(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.roleType).toBe('inventory_staff');
      expect(result.current.data?.rolePermissions).toEqual(
        expect.arrayContaining(ROLE_PERMISSIONS.inventory_staff)
      );
    });

    it('should handle marketing_staff permissions', async () => {
      mockGetUserRole.mockResolvedValue({
        ...mockRoleData,
        roleType: 'marketing_staff',
      });

      const { result } = renderHook(() => useRolePermissions(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.roleType).toBe('marketing_staff');
      expect(result.current.data?.rolePermissions).toEqual(
        expect.arrayContaining(ROLE_PERMISSIONS.marketing_staff)
      );
    });

    it('should handle executive permissions', async () => {
      mockGetUserRole.mockResolvedValue({
        ...mockRoleData,
        roleType: 'executive',
      });

      const { result } = renderHook(() => useRolePermissions(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.roleType).toBe('executive');
      expect(result.current.data?.rolePermissions).toEqual(
        expect.arrayContaining(ROLE_PERMISSIONS.executive)
      );
    });

    it('should handle admin permissions', async () => {
      mockGetUserRole.mockResolvedValue({
        ...mockRoleData,
        roleType: 'admin',
      });

      const { result } = renderHook(() => useRolePermissions(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.roleType).toBe('admin');
      expect(result.current.data?.rolePermissions).toEqual(
        expect.arrayContaining(ROLE_PERMISSIONS.admin)
      );
    });
  });

  describe('= Permission Updates', () => {
    it('should update user permissions', async () => {
      const newPermissions = ['new_permission_1', 'new_permission_2'];
      mockUpdateUserPermissions.mockResolvedValue({
        ...mockRoleData,
        permissions: newPermissions,
      });

      const { result } = renderHook(() => useRolePermissions(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      await result.current.updatePermissions(newPermissions);

      expect(mockUpdateUserPermissions).toHaveBeenCalledWith('test-user-123', newPermissions);
    });

    it('should handle update errors gracefully', async () => {
      mockUpdateUserPermissions.mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useRolePermissions(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const updateResult = await result.current.updatePermissions(['new_permission']);
      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBeDefined();
    });
  });

  describe('L Error Handling', () => {
    it('should handle unauthenticated state', () => {
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useRolePermissions(), { 
        wrapper: createWrapper() 
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toEqual({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'User not authenticated for permissions access',
        userMessage: 'Please sign in to view permissions',
        timestamp: expect.any(String),
      });
    });

    it('should handle no role data gracefully', async () => {
      mockGetUserRole.mockResolvedValue(null);

      const { result } = renderHook(() => useRolePermissions(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.permissions).toEqual([]);
      expect(result.current.data?.rolePermissions).toEqual([]);
      expect(result.current.data?.allPermissions).toEqual([]);
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Service unavailable');
      mockGetUserRole.mockRejectedValue(serviceError);

      const { result } = renderHook(() => useRolePermissions(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(serviceError);
    });
  });

  describe('<� Permission Utilities', () => {
    it('should provide isAdmin utility', async () => {
      mockGetUserRole.mockResolvedValue({
        ...mockRoleData,
        roleType: 'admin',
      });

      const { result } = renderHook(() => useRolePermissions(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isAdmin).toBe(true);
    });

    it('should provide isExecutive utility', async () => {
      mockGetUserRole.mockResolvedValue({
        ...mockRoleData,
        roleType: 'executive',
      });

      const { result } = renderHook(() => useRolePermissions(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isExecutive).toBe(true);
    });

    it('should provide isStaff utility', async () => {
      const { result } = renderHook(() => useRolePermissions(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isStaff).toBe(true);
    });

    it('should provide canManageInventory utility', async () => {
      const { result } = renderHook(() => useRolePermissions(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.canManageInventory).toBe(true);
    });

    it('should provide canManageContent utility', async () => {
      mockGetUserRole.mockResolvedValue({
        ...mockRoleData,
        roleType: 'marketing_staff',
      });

      const { result } = renderHook(() => useRolePermissions(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.canManageContent).toBe(true);
    });
  });
});