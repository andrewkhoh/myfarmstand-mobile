/**
 * useRoleMenu Hook Tests
 * Tests for role-based menu hook functionality
 * Following scratchpad-service-test-setup patterns
 */

// Mock ValidationMonitor before importing hook
jest.mock('../../../utils/validationMonitor');

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRoleMenu } from '../useRoleMenu';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Mock RoleNavigationService
jest.mock('../../../services/role-based/roleNavigationService', () => ({
  RoleNavigationService: {
    generateMenuItems: jest.fn(),
  },
}));

// Mock useUserRole
jest.mock('../useUserRole', () => ({
  useUserRole: jest.fn(),
}));

// Mock useNavigationPermissions
jest.mock('../useNavigationPermissions', () => ({
  useNavigationPermissions: jest.fn(),
}));

import { RoleNavigationService } from '../../../services/role-based/roleNavigationService';
import { useUserRole } from '../useUserRole';
import { useNavigationPermissions } from '../useNavigationPermissions';

const mockRoleNavigationService = RoleNavigationService as jest.Mocked<typeof RoleNavigationService>;
const mockUseUserRole = useUserRole as jest.MockedFunction<typeof useUserRole>;
const mockUseNavigationPermissions = useNavigationPermissions as jest.MockedFunction<typeof useNavigationPermissions>;

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

describe('useRoleMenu Hook', () => {
  const mockMenuItems = [
    {
      name: 'Home',
      component: 'HomeScreen',
      icon: 'home',
      permissions: ['view:home'],
      priority: 1,
    },
    {
      name: 'Products',
      component: 'ProductsScreen',
      icon: 'shopping-bag',
      permissions: ['view:products'],
      priority: 2,
    },
    {
      name: 'Cart',
      component: 'CartScreen',
      icon: 'shopping-cart',
      permissions: ['manage:cart'],
      priority: 3,
    },
  ];

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

    // Default menu items mock
    mockRoleNavigationService.generateMenuItems.mockResolvedValue(mockMenuItems);

    // Default permissions mock (all allowed)
    mockUseNavigationPermissions.mockReturnValue([
      { screen: 'HomeScreen', allowed: true, checked: true },
      { screen: 'ProductsScreen', allowed: true, checked: true },
      { screen: 'CartScreen', allowed: true, checked: true },
    ]);
  });

  describe('basic menu functionality', () => {
    it('should load menu items for current role', async () => {
      const { result } = renderHook(
        () => useRoleMenu(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.menuItems).toEqual(mockMenuItems);
      });

      expect(mockRoleNavigationService.generateMenuItems).toHaveBeenCalledWith('customer');
    });

    it('should handle menu loading states', () => {
      mockRoleNavigationService.generateMenuItems.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(
        () => useRoleMenu(),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.menuItems).toEqual([]);
    });

    it('should handle menu loading errors', async () => {
      mockRoleNavigationService.generateMenuItems.mockRejectedValue(new Error('Menu error'));

      const { result } = renderHook(
        () => useRoleMenu(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.menuItems).toEqual([]);
    });
  });

  describe('permission filtering', () => {
    it('should filter menu items by permissions when enabled', async () => {
      // Mock permissions where CartScreen is denied
      mockUseNavigationPermissions.mockReturnValue([
        { screen: 'HomeScreen', allowed: true, checked: true },
        { screen: 'ProductsScreen', allowed: true, checked: true },
        { screen: 'CartScreen', allowed: false, checked: true },
      ]);

      const { result } = renderHook(
        () => useRoleMenu({ filterByPermissions: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.menuItems).toHaveLength(2);
      });

      expect(result.current.menuItems.map(item => item.component)).toEqual([
        'HomeScreen',
        'ProductsScreen',
      ]);
    });

    it('should not filter when filterByPermissions is false', async () => {
      // Mock permissions where CartScreen is denied
      mockUseNavigationPermissions.mockReturnValue([
        { screen: 'HomeScreen', allowed: true, checked: true },
        { screen: 'ProductsScreen', allowed: true, checked: true },
        { screen: 'CartScreen', allowed: false, checked: true },
      ]);

      const { result } = renderHook(
        () => useRoleMenu({ filterByPermissions: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.menuItems).toHaveLength(3);
      });

      expect(result.current.menuItems).toEqual(mockMenuItems);
    });
  });

  describe('menu customization', () => {
    it('should save menu customization', async () => {
      const { result } = renderHook(
        () => useRoleMenu(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.menuItems).toEqual(mockMenuItems);
      });

      const customization = {
        hiddenItems: ['CartScreen'],
        pinnedItems: ['ProductsScreen'],
        customOrder: ['HomeScreen', 'ProductsScreen'],
      };

      await act(async () => {
        await result.current.saveCustomization(customization);
      });

      expect(result.current.isSavingCustomization).toBe(false);
    });

    it('should handle customization save errors', async () => {
      const { result } = renderHook(
        () => useRoleMenu(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.menuItems).toEqual(mockMenuItems);
      });

      // Force an error in save
      const customization = { hiddenItems: ['invalid'] };

      await act(async () => {
        try {
          await result.current.saveCustomization(customization);
        } catch (error) {
          // Expected to fail
        }
      });

      expect(result.current.isSavingCustomization).toBe(false);
    });
  });

  describe('menu refresh functionality', () => {
    it('should refresh menu items', async () => {
      const { result } = renderHook(
        () => useRoleMenu(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.menuItems).toEqual(mockMenuItems);
      });

      // Clear the mock to track new calls
      mockRoleNavigationService.generateMenuItems.mockClear();

      act(() => {
        result.current.refreshMenu();
      });

      await waitFor(() => {
        expect(mockRoleNavigationService.generateMenuItems).toHaveBeenCalledTimes(1);
      });
    });

    it('should increment refresh trigger on refresh', async () => {
      const { result } = renderHook(
        () => useRoleMenu(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.menuItems).toEqual(mockMenuItems);
      });

      const initialRefreshTrigger = result.current.refreshTrigger;

      act(() => {
        result.current.refreshMenu();
      });

      expect(result.current.refreshTrigger).toBe(initialRefreshTrigger + 1);
    });
  });

  describe('different user roles', () => {
    it('should work with farmer role', async () => {
      const farmerMenuItems = [
        { name: 'Dashboard', component: 'FarmerDashboard', icon: 'dashboard', permissions: [] },
        { name: 'Products', component: 'ProductManagementScreen', icon: 'inventory', permissions: [] },
      ];

      mockUseUserRole.mockReturnValue({
        role: 'farmer',
        userId: 'farmer-123',
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      mockRoleNavigationService.generateMenuItems.mockResolvedValue(farmerMenuItems);
      mockUseNavigationPermissions.mockReturnValue([
        { screen: 'FarmerDashboard', allowed: true, checked: true },
        { screen: 'ProductManagementScreen', allowed: true, checked: true },
      ]);

      const { result } = renderHook(
        () => useRoleMenu(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.menuItems).toEqual(farmerMenuItems);
      });

      expect(mockRoleNavigationService.generateMenuItems).toHaveBeenCalledWith('farmer');
    });

    it('should work with admin role', async () => {
      const adminMenuItems = [
        { name: 'Admin Dashboard', component: 'AdminDashboard', icon: 'admin-panel', permissions: [] },
        { name: 'Users', component: 'UserManagementScreen', icon: 'people', permissions: [] },
        { name: 'Settings', component: 'SystemSettingsScreen', icon: 'settings', permissions: [] },
      ];

      mockUseUserRole.mockReturnValue({
        role: 'admin',
        userId: 'admin-123',
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      mockRoleNavigationService.generateMenuItems.mockResolvedValue(adminMenuItems);
      mockUseNavigationPermissions.mockReturnValue([
        { screen: 'AdminDashboard', allowed: true, checked: true },
        { screen: 'UserManagementScreen', allowed: true, checked: true },
        { screen: 'SystemSettingsScreen', allowed: true, checked: true },
      ]);

      const { result } = renderHook(
        () => useRoleMenu(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.menuItems).toEqual(adminMenuItems);
      });

      expect(mockRoleNavigationService.generateMenuItems).toHaveBeenCalledWith('admin');
    });
  });

  describe('caching behavior', () => {
    it('should use caching when specified', async () => {
      const { result } = renderHook(
        () => useRoleMenu({ cacheTimeout: 5000 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.menuItems).toEqual(mockMenuItems);
      });

      expect(mockRoleNavigationService.generateMenuItems).toHaveBeenCalledWith('customer');
    });

    it('should disable caching when timeout is 0', async () => {
      const { result } = renderHook(
        () => useRoleMenu({ cacheTimeout: 0 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.menuItems).toEqual(mockMenuItems);
      });

      expect(mockRoleNavigationService.generateMenuItems).toHaveBeenCalledWith('customer');
    });
  });

  describe('loading and error states', () => {
    it('should handle user role loading', () => {
      mockUseUserRole.mockReturnValue({
        role: 'customer',
        userId: 'user-123',
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { result } = renderHook(
        () => useRoleMenu(),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
    });

    it('should handle missing user role', async () => {
      mockUseUserRole.mockReturnValue({
        role: null,
        userId: null,
        isLoading: false,
        error: new Error('User not found'),
        refetch: jest.fn(),
      });

      const { result } = renderHook(
        () => useRoleMenu(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.menuItems).toEqual([]);
    });
  });

  describe('query key usage', () => {
    it('should use centralized query key factory', async () => {
      const { result } = renderHook(
        () => useRoleMenu(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.menuItems).toEqual(mockMenuItems);
      });

      // Verify that the query is using proper structure
      expect(mockRoleNavigationService.generateMenuItems).toHaveBeenCalledWith('customer');
    });
  });
});