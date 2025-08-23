/**
 * useNavigationPermissions Hook Tests
 * Tests for navigation permissions hook functionality
 * Following scratchpad-service-test-setup patterns
 */

// Mock ValidationMonitor before importing hook
jest.mock('../../../utils/validationMonitor');

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNavigationPermissions } from '../useNavigationPermissions';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Mock RoleNavigationService
jest.mock('../../../services/role-based/roleNavigationService', () => ({
  RoleNavigationService: {
    canNavigateTo: jest.fn(),
  },
}));

// Mock useUserRole
jest.mock('../useUserRole', () => ({
  useUserRole: jest.fn(),
}));

import { RoleNavigationService } from '../../../services/role-based/roleNavigationService';
import { useUserRole } from '../useUserRole';

const mockRoleNavigationService = RoleNavigationService as jest.Mocked<typeof RoleNavigationService>;
const mockUseUserRole = useUserRole as jest.MockedFunction<typeof useUserRole>;

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

describe('useNavigationPermissions Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default user role mock
    mockUseUserRole.mockReturnValue({
      role: 'customer',
      userId: 'user-123',
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  describe('single permission checks', () => {
    it('should check permission for allowed screen', async () => {
      mockRoleNavigationService.canNavigateTo.mockResolvedValue(true);

      const { result } = renderHook(
        () => useNavigationPermissions('ProductsScreen'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.allowed).toBe(true);
      });

      expect(result.current.checked).toBe(true);
      expect(result.current.screen).toBe('ProductsScreen');
      expect(mockRoleNavigationService.canNavigateTo).toHaveBeenCalledWith('customer', 'ProductsScreen');
    });

    it('should check permission for denied screen', async () => {
      mockRoleNavigationService.canNavigateTo.mockResolvedValue(false);

      const { result } = renderHook(
        () => useNavigationPermissions('AdminDashboard'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.allowed).toBe(false);
      });

      expect(result.current.checked).toBe(true);
      expect(result.current.screen).toBe('AdminDashboard');
    });

    it('should handle permission check errors', async () => {
      mockRoleNavigationService.canNavigateTo.mockRejectedValue(new Error('Permission error'));

      const { result } = renderHook(
        () => useNavigationPermissions('TestScreen'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.checked).toBe(true);
      });

      expect(result.current.allowed).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('batch permission checks', () => {
    it('should check permissions for multiple screens', async () => {
      // Mock different responses for different screens
      mockRoleNavigationService.canNavigateTo
        .mockImplementation((role, screen) => {
          if (screen === 'ProductsScreen') return Promise.resolve(true);
          if (screen === 'CartScreen') return Promise.resolve(true);
          if (screen === 'AdminDashboard') return Promise.resolve(false);
          return Promise.resolve(false);
        });

      const { result } = renderHook(
        () => useNavigationPermissions(['ProductsScreen', 'CartScreen', 'AdminDashboard'], {
          enableBatchCheck: true,
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.length).toBe(3);
      });

      expect(result.current[0]).toEqual({
        screen: 'ProductsScreen',
        allowed: true,
        checked: true,
        error: undefined,
      });

      expect(result.current[1]).toEqual({
        screen: 'CartScreen',
        allowed: true,
        checked: true,
        error: undefined,
      });

      expect(result.current[2]).toEqual({
        screen: 'AdminDashboard',
        allowed: false,
        checked: true,
        error: undefined,
      });
    });

    it('should handle mixed success/error in batch check', async () => {
      mockRoleNavigationService.canNavigateTo
        .mockImplementation((role, screen) => {
          if (screen === 'ProductsScreen') return Promise.resolve(true);
          if (screen === 'ErrorScreen') return Promise.reject(new Error('Test error'));
          return Promise.resolve(false);
        });

      const { result } = renderHook(
        () => useNavigationPermissions(['ProductsScreen', 'ErrorScreen'], {
          enableBatchCheck: true,
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.length).toBe(2);
      });

      expect(result.current[0]).toEqual({
        screen: 'ProductsScreen',
        allowed: true,
        checked: true,
        error: undefined,
      });

      expect(result.current[1]).toEqual({
        screen: 'ErrorScreen',
        allowed: false,
        checked: true,
        error: 'Test error',
      });
    });
  });

  describe('caching behavior', () => {
    it('should cache results when enabled', async () => {
      mockRoleNavigationService.canNavigateTo.mockResolvedValue(true);

      const { result, rerender } = renderHook(
        () => useNavigationPermissions('ProductsScreen', { cacheResults: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.allowed).toBe(true);
      });

      // Clear the mock to see if it gets called again
      mockRoleNavigationService.canNavigateTo.mockClear();

      // Re-render should use cached result
      rerender();

      await waitFor(() => {
        expect(result.current.allowed).toBe(true);
      });

      // Should not call service again due to caching
      expect(mockRoleNavigationService.canNavigateTo).not.toHaveBeenCalled();
    });

    it('should not cache when caching is disabled', async () => {
      mockRoleNavigationService.canNavigateTo.mockResolvedValue(true);

      const { result } = renderHook(
        () => useNavigationPermissions('ProductsScreen', { cacheResults: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.allowed).toBe(true);
      });

      // With caching disabled, each render could potentially make a new call
      expect(mockRoleNavigationService.canNavigateTo).toHaveBeenCalled();
    });
  });

  describe('different user roles', () => {
    it('should work with admin role', async () => {
      mockUseUserRole.mockReturnValue({
        role: 'admin',
        userId: 'admin-123',
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      mockRoleNavigationService.canNavigateTo.mockResolvedValue(true);

      const { result } = renderHook(
        () => useNavigationPermissions('UserManagementScreen'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.allowed).toBe(true);
      });

      expect(mockRoleNavigationService.canNavigateTo).toHaveBeenCalledWith('admin', 'UserManagementScreen');
    });

    it('should work with farmer role', async () => {
      mockUseUserRole.mockReturnValue({
        role: 'farmer',
        userId: 'farmer-123',
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      mockRoleNavigationService.canNavigateTo.mockResolvedValue(true);

      const { result } = renderHook(
        () => useNavigationPermissions('FarmerDashboard'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.allowed).toBe(true);
      });

      expect(mockRoleNavigationService.canNavigateTo).toHaveBeenCalledWith('farmer', 'FarmerDashboard');
    });
  });

  describe('loading and error states', () => {
    it('should handle user role loading state', () => {
      mockUseUserRole.mockReturnValue({
        role: 'customer',
        userId: 'user-123',
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { result } = renderHook(
        () => useNavigationPermissions('ProductsScreen'),
        { wrapper: createWrapper() }
      );

      expect(result.current.checked).toBe(false);
      expect(result.current.allowed).toBe(false);
    });

    it('should handle missing user role', () => {
      mockUseUserRole.mockReturnValue({
        role: null,
        userId: null,
        isLoading: false,
        error: new Error('User not found'),
        refetch: jest.fn(),
      });

      const { result } = renderHook(
        () => useNavigationPermissions('ProductsScreen'),
        { wrapper: createWrapper() }
      );

      expect(result.current.checked).toBe(true);
      expect(result.current.allowed).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should provide checkPermission method', async () => {
      mockRoleNavigationService.canNavigateTo.mockResolvedValue(true);

      const { result } = renderHook(
        () => useNavigationPermissions('ProductsScreen'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.checkPermission).toBeDefined();
      });

      const permission = await result.current.checkPermission('CartScreen');
      expect(permission).toEqual({
        screen: 'CartScreen',
        allowed: true,
        checked: true,
        error: undefined,
      });
    });
  });

  describe('query key usage', () => {
    it('should use user-specific query keys', async () => {
      mockRoleNavigationService.canNavigateTo.mockResolvedValue(true);

      const { result } = renderHook(
        () => useNavigationPermissions('ProductsScreen'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.checked).toBe(true);
      });

      // Verify that the query is properly structured
      expect(mockRoleNavigationService.canNavigateTo).toHaveBeenCalledWith('customer', 'ProductsScreen');
    });
  });
});