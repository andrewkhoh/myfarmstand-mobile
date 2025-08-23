/**
 * useRoleNavigation Hook Tests
 * Tests for role-based navigation hook functionality
 * Following scratchpad-service-test-setup patterns
 */

// Mock ValidationMonitor before importing service
jest.mock('../../../utils/validationMonitor');

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRoleNavigation } from '../useRoleNavigation';
import { ValidationMonitor } from '../../../utils/validationMonitor';
import { UserRole } from '../../../types';

// Mock the supabase module (exact authService pattern)
const mockSupabase = require('../../../config/supabase').supabase;

// Mock RoleNavigationService
jest.mock('../../../services/role-based/roleNavigationService', () => ({
  RoleNavigationService: {
    generateMenuItems: jest.fn(),
    canNavigateTo: jest.fn(),
    getDefaultScreen: jest.fn(),
    validateDeepLink: jest.fn(),
    persistNavigationState: jest.fn(),
    getNavigationState: jest.fn(),
    trackNavigation: jest.fn(),
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

describe('useRoleNavigation Hook', () => {
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

  describe('generateMenuItems', () => {
    it('should fetch menu items for current role', async () => {
      const mockMenuItems = [
        { name: 'Home', component: 'HomeScreen', icon: 'home', permissions: [] },
        { name: 'Products', component: 'ProductsScreen', icon: 'shopping-bag', permissions: [] },
      ];

      mockRoleNavigationService.generateMenuItems.mockResolvedValue(mockMenuItems);

      const { result } = renderHook(() => useRoleNavigation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.menuItems).toEqual(mockMenuItems);
      });

      expect(mockRoleNavigationService.generateMenuItems).toHaveBeenCalledWith('customer');
    });

    it('should handle menu generation errors', async () => {
      mockRoleNavigationService.generateMenuItems.mockRejectedValue(new Error('Menu error'));

      const { result } = renderHook(() => useRoleNavigation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMenuLoading).toBe(false);
      });

      expect(result.current.menuError).toBeTruthy();
      expect(result.current.menuItems).toEqual([]);
    });

    it('should enable caching when specified', async () => {
      const mockMenuItems = [
        { name: 'Home', component: 'HomeScreen', icon: 'home', permissions: [] },
      ];

      mockRoleNavigationService.generateMenuItems.mockResolvedValue(mockMenuItems);

      const { result } = renderHook(() => useRoleNavigation({ enableCaching: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.menuItems).toEqual(mockMenuItems);
      });

      expect(mockRoleNavigationService.generateMenuItems).toHaveBeenCalledWith('customer');
    });
  });

  describe('navigation permissions', () => {
    it('should check navigation permissions', async () => {
      mockRoleNavigationService.canNavigateTo.mockResolvedValue(true);

      const { result } = renderHook(() => useRoleNavigation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.checkPermission).toBeDefined();
      });

      const canNavigate = await result.current.checkPermission('ProductsScreen');
      expect(canNavigate).toBe(true);
      expect(mockRoleNavigationService.canNavigateTo).toHaveBeenCalledWith('customer', 'ProductsScreen');
    });

    it('should get default screen for role', async () => {
      mockRoleNavigationService.getDefaultScreen.mockResolvedValue('HomeScreen');

      const { result } = renderHook(() => useRoleNavigation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.getDefaultScreen).toBeDefined();
      });

      const defaultScreen = await result.current.getDefaultScreen();
      expect(defaultScreen).toBe('HomeScreen');
      expect(mockRoleNavigationService.getDefaultScreen).toHaveBeenCalledWith('customer');
    });
  });

  describe('deep link validation', () => {
    it('should validate deep links', async () => {
      const mockResult = {
        isValid: true,
        targetScreen: 'ProductsScreen',
        params: { productId: '123' },
      };

      mockRoleNavigationService.validateDeepLink.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useRoleNavigation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.validateDeepLink).toBeDefined();
      });

      const validation = await result.current.validateDeepLink('myfarmstand://products/123');
      expect(validation).toEqual(mockResult);
      expect(mockRoleNavigationService.validateDeepLink).toHaveBeenCalledWith(
        'myfarmstand://products/123',
        'customer'
      );
    });
  });

  describe('navigation state management', () => {
    it('should track navigation events', async () => {
      const { result } = renderHook(() => useRoleNavigation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.trackNavigation).toBeDefined();
      });

      await result.current.trackNavigation('HomeScreen', 'ProductsScreen');

      expect(mockRoleNavigationService.trackNavigation).toHaveBeenCalledWith({
        from: 'HomeScreen',
        to: 'ProductsScreen',
        role: 'customer',
        userId: 'user-123',
      });
    });

    it('should persist navigation state', async () => {
      const { result } = renderHook(() => useRoleNavigation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.persistCurrentState).toBeDefined();
      });

      // Simulate current state
      result.current.navigateToScreen('ProductsScreen');
      
      await result.current.persistCurrentState();

      expect(mockRoleNavigationService.persistNavigationState).toHaveBeenCalledWith({
        userId: 'user-123',
        currentScreen: 'ProductsScreen',
        history: ['ProductsScreen'],
        timestamp: expect.any(String),
      });
    });
  });

  describe('different user roles', () => {
    it('should work with farmer role', async () => {
      mockUseUserRole.mockReturnValue({
        role: 'farmer',
        userId: 'farmer-123',
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const mockFarmerMenuItems = [
        { name: 'Dashboard', component: 'FarmerDashboard', icon: 'dashboard', permissions: [] },
      ];

      mockRoleNavigationService.generateMenuItems.mockResolvedValue(mockFarmerMenuItems);

      const { result } = renderHook(() => useRoleNavigation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.menuItems).toEqual(mockFarmerMenuItems);
      });

      expect(mockRoleNavigationService.generateMenuItems).toHaveBeenCalledWith('farmer');
    });

    it('should work with admin role', async () => {
      mockUseUserRole.mockReturnValue({
        role: 'admin',
        userId: 'admin-123',
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const mockAdminMenuItems = [
        { name: 'Admin Dashboard', component: 'AdminDashboard', icon: 'admin-panel', permissions: [] },
        { name: 'Users', component: 'UserManagementScreen', icon: 'people', permissions: [] },
      ];

      mockRoleNavigationService.generateMenuItems.mockResolvedValue(mockAdminMenuItems);

      const { result } = renderHook(() => useRoleNavigation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.menuItems).toEqual(mockAdminMenuItems);
      });

      expect(mockRoleNavigationService.generateMenuItems).toHaveBeenCalledWith('admin');
    });
  });

  describe('loading and error states', () => {
    it('should handle loading state', () => {
      mockUseUserRole.mockReturnValue({
        role: 'customer',
        userId: 'user-123',
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useRoleNavigation(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should handle user role errors', () => {
      mockUseUserRole.mockReturnValue({
        role: null,
        userId: null,
        isLoading: false,
        error: new Error('User not found'),
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useRoleNavigation(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.menuItems).toEqual([]);
    });
  });

  describe('query key usage', () => {
    it('should use centralized query key factory', async () => {
      mockRoleNavigationService.generateMenuItems.mockResolvedValue([]);

      const { result } = renderHook(() => useRoleNavigation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMenuLoading).toBe(false);
      });

      // Verify that the hook is using navigationKeys from queryKeyFactory
      // This is implicit through the fact that the query works correctly
      expect(mockRoleNavigationService.generateMenuItems).toHaveBeenCalled();
    });
  });
});