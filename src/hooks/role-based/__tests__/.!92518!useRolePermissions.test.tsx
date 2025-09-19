/**
 * useUserPermissions Hook Tests - Following Established Test Pattern
 * Pattern Reference: src/hooks/__tests__/useCart.test.tsx
 * Following architectural patterns from docs/architectural-patterns-and-best-practices.md
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { UserRole } from '../types/roles';import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserRole } from '../types/roles';import React from 'react';
import { UserRole } from '../types/roles';
// Mock the service first
jest.mock('../../../services/role-based/rolePermissionService', () => ({
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
import { useUserPermissions } from '../useUserPermissions';
import { UserRole } from '../types/roles';import { RolePermissionService } from '../../../services/role-based/rolePermissionService';
import { UserRole } from '../types/roles';import { useCurrentUser } from '../../useAuth';
import { UserRole } from '../types/roles';import { ROLE_PERMISSIONS } from '../../../schemas/role-based/rolePermission.schemas';
import { UserRole } from '../types/roles';
const mockGetUserRole = RolePermissionService.getUserRole as jest.MockedFunction<typeof RolePermissionService.getUserRole>;
const mockHasPermission = RolePermissionService.hasPermission as jest.MockedFunction<typeof RolePermissionService.hasPermission>;
const mockUpdateUserPermissions = RolePermissionService.updateUserPermissions as jest.MockedFunction<typeof RolePermissionService.updateUserPermissions>;
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

describe('useUserPermissions Hook Tests', () => {
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

  describe('=' Basic Functionality', () => {
    it('should fetch user permissions when authenticated', async () => {
      const { result } = renderHook(() => useUserPermissions(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current?.data?.permissions).toBeDefined();
      expect(result.current?.data?.rolePermissions).toBeDefined();
      expect(result.current?.data?.allPermissions).toBeDefined();
    });

    it('should combine role and custom permissions', async () => {
      const customPermissions = ['custom_permission_1', 'custom_permission_2'];
      const roleWithCustom = {
        ...mockRoleData,
        permissions: customPermissions,
      };

      mockGetUserRole.mockResolvedValue(roleWithCustom);

      const { result } = renderHook(() => useUserPermissions(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should have both role-based and custom permissions
      expect(result.current?.data?.allPermissions).toContain('view_inventory'); // Role-based
      expect(result.current?.data?.allPermissions).toContain('custom_permission_1'); // Custom
    });

    it('should fetch permissions for specific userId', async () => {
      const specificUserId = 'specific-user-456';
      mockGetUserRole.mockResolvedValue({
        ...mockRoleData,
        userId: specificUserId,
      });

      const { result } = renderHook(() => useUserPermissions(specificUserId), { 
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

      const { result } = renderHook(() => useUserPermissions(), { 
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

      const { result } = renderHook(() => useUserPermissions(), { 
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

