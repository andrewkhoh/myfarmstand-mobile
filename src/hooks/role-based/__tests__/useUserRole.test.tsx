/**
 * useUserRole Hook Tests - Following Established Test Pattern
 * Pattern Reference: src/hooks/__tests__/useCart.test.tsx
 * Following architectural patterns from docs/architectural-patterns-and-best-practices.md
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the service first
jest.mock('../../../services/role-based/rolePermissionService', () => ({
  RolePermissionService: {
    getUserRole: jest.fn(),
  }
}));

// Mock auth hook
jest.mock('../../useAuth', () => ({
  useCurrentUser: jest.fn(),
}));

// Import hook after mocks
import { useUserRole } from '../useUserRole';
import { RolePermissionService } from '../../../services/role-based/rolePermissionService';
import { useCurrentUser } from '../../useAuth';

const mockGetUserRole = RolePermissionService.getUserRole as jest.MockedFunction<typeof RolePermissionService.getUserRole>;
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

describe('useUserRole Hook Tests', () => {
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
  });

  describe('🔧 Basic Functionality', () => {
    it('should fetch user role when user is authenticated', async () => {
      mockGetUserRole.mockResolvedValue(mockRoleData);

      const { result } = renderHook(() => useUserRole(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRoleData);
      expect(mockGetUserRole).toHaveBeenCalledWith('test-user-123');
    });

    it('should fetch role for specific userId when provided', async () => {
      const specificUserId = 'specific-user-456';
      const specificRoleData = {
        ...mockRoleData,
        userId: specificUserId,
      };

      mockGetUserRole.mockResolvedValue(specificRoleData);

      const { result } = renderHook(() => useUserRole(specificUserId), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(specificRoleData);
      expect(mockGetUserRole).toHaveBeenCalledWith(specificUserId);
    });

    it('should handle loading state correctly', () => {
      mockGetUserRole.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockRoleData), 100))
      );

      const { result } = renderHook(() => useUserRole(), { 
        wrapper: createWrapper() 
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('🔐 Authentication Handling', () => {
    it('should return error when user is not authenticated', () => {
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useUserRole(), { 
        wrapper: createWrapper() 
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toEqual({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'User not authenticated for role access',
        userMessage: 'Please sign in to view role information',
        timestamp: expect.any(String),
      });
      expect(result.current.data).toBeNull();
    });

    it('should work when userId is provided even if current user is not authenticated', async () => {
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      } as any);

      const providedUserId = 'provided-user-789';
      mockGetUserRole.mockResolvedValue({
        ...mockRoleData,
        userId: providedUserId,
      });

      const { result } = renderHook(() => useUserRole(providedUserId), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.userId).toBe(providedUserId);
      expect(mockGetUserRole).toHaveBeenCalledWith(providedUserId);
    });
  });

  describe('❌ Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const serviceError = new Error('Service unavailable');
      mockGetUserRole.mockRejectedValue(serviceError);

      const { result } = renderHook(() => useUserRole(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(serviceError);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle null role data', async () => {
      mockGetUserRole.mockResolvedValue(null);

      const { result } = renderHook(() => useUserRole(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('should not retry on permission denied errors', async () => {
      const permissionError = new Error('permission denied');
      mockGetUserRole.mockRejectedValue(permissionError);

      const { result } = renderHook(() => useUserRole(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should only be called once (no retries)
      expect(mockGetUserRole).toHaveBeenCalledTimes(1);
    });
  });

  describe('🔄 Refetch Functionality', () => {
    it('should support manual refetch', async () => {
      mockGetUserRole.mockResolvedValue(mockRoleData);

      const { result } = renderHook(() => useUserRole(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Clear mock and setup new response
      mockGetUserRole.mockClear();
      const updatedRoleData = {
        ...mockRoleData,
        roleType: 'admin' as const,
        permissions: ['manage_users', 'manage_roles'],
      };
      mockGetUserRole.mockResolvedValue(updatedRoleData);

      // Trigger refetch
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.data).toEqual(updatedRoleData);
      });

      expect(mockGetUserRole).toHaveBeenCalledWith('test-user-123');
    });
  });

  describe('📊 Different Role Types', () => {
    it('should handle inventory_staff role', async () => {
      const inventoryRole = {
        ...mockRoleData,
        roleType: 'inventory_staff' as const,
        permissions: ['view_inventory', 'update_stock', 'receive_stock'],
      };

      mockGetUserRole.mockResolvedValue(inventoryRole);

      const { result } = renderHook(() => useUserRole(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.roleType).toBe('inventory_staff');
      expect(result.current.data?.permissions).toContain('view_inventory');
    });

    it('should handle marketing_staff role', async () => {
      const marketingRole = {
        ...mockRoleData,
        roleType: 'marketing_staff' as const,
        permissions: ['view_products', 'create_promotions', 'manage_bundles'],
      };

      mockGetUserRole.mockResolvedValue(marketingRole);

      const { result } = renderHook(() => useUserRole(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.roleType).toBe('marketing_staff');
      expect(result.current.data?.permissions).toContain('create_promotions');
    });

    it('should handle executive role', async () => {
      const executiveRole = {
        ...mockRoleData,
        roleType: 'executive' as const,
        permissions: ['view_all_analytics', 'view_cross_role_insights'],
      };

      mockGetUserRole.mockResolvedValue(executiveRole);

      const { result } = renderHook(() => useUserRole(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.roleType).toBe('executive');
      expect(result.current.data?.permissions).toContain('view_all_analytics');
    });

    it('should handle admin role with all permissions', async () => {
      const adminRole = {
        ...mockRoleData,
        roleType: 'admin' as const,
        permissions: [
          'manage_users',
          'manage_roles',
          'system_administration',
          'view_all_data',
          'content_management',
          'campaign_management',
          'inventory_management',
          'executive_analytics',
        ],
      };

      mockGetUserRole.mockResolvedValue(adminRole);

      const { result } = renderHook(() => useUserRole(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.roleType).toBe('admin');
      expect(result.current.data?.permissions).toContain('manage_users');
      expect(result.current.data?.permissions).toContain('system_administration');
    });
  });

  describe('🔑 Query Key Exposure', () => {
    it('should expose query key for testing', async () => {
      mockGetUserRole.mockResolvedValue(mockRoleData);

      const { result } = renderHook(() => useUserRole(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.queryKey).toBeDefined();
      expect(Array.isArray(result.current.queryKey)).toBe(true);
    });

    it('should provide proper query key for unauthenticated state', () => {
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useUserRole(), { 
        wrapper: createWrapper() 
      });

      expect(result.current.queryKey).toContain('unauthenticated');
    });
  });
});