/**
 * RoleDashboard Screen Tests
 * Tests for role-based dashboard screen functionality
 * Following scratchpad-service-test-setup patterns
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { RoleDashboardScreen } from '../RoleDashboard';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock ValidationMonitor
jest.mock('../../../utils/validationMonitor');
const mockValidationMonitor = ValidationMonitor as jest.Mocked<typeof ValidationMonitor>;

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  canGoBack: jest.fn().mockReturnValue(true),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useFocusEffect: (callback: () => void) => {
    React.useEffect(callback, []);
  },
}));

// Mock role-based hooks
jest.mock('../../../hooks/role-based/useUserRole');
jest.mock('../../../hooks/role-based/useRoleNavigation');
jest.mock('../../../hooks/role-based/useRoleMenu');

import { useUserRole } from '../../../hooks/role-based/useUserRole';
import { useRoleNavigation } from '../../../hooks/role-based/useRoleNavigation';
import { useRoleMenu } from '../../../hooks/role-based/useRoleMenu';

const mockUseUserRole = useUserRole as jest.MockedFunction<typeof useUserRole>;
const mockUseRoleNavigation = useRoleNavigation as jest.MockedFunction<typeof useRoleNavigation>;
const mockUseRoleMenu = useRoleMenu as jest.MockedFunction<typeof useRoleMenu>;

// Mock Dimensions
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn().mockReturnValue({ width: 375, height: 667 }), // iPhone size
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        {children}
      </NavigationContainer>
    </QueryClientProvider>
  );
};

describe('RoleDashboard Screen', () => {
  const mockMenuItems = [
    {
      name: 'Products',
      component: 'ProductsScreen',
      icon: '🛍️',
      permissions: ['view:products'],
      priority: 1,
    },
    {
      name: 'Orders',
      component: 'OrdersScreen',
      icon: '📦',
      permissions: ['view:orders'],
      priority: 2,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful state
    mockUseUserRole.mockReturnValue({
      data: {
        role: 'customer',
        userId: 'user-123',
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseRoleNavigation.mockReturnValue({
      menuItems: mockMenuItems,
      isMenuLoading: false,
      menuError: null,
      navigateTo: jest.fn(),
      getDefaultScreen: jest.fn(),
      refetchMenu: jest.fn(),
      hasMenuItems: true,
      isLoading: false,
      setCurrentScreen: jest.fn(),
      checkPermission: jest.fn(),
      canAccessScreen: jest.fn(),
      handlePermissionDenied: jest.fn(),
      validateDeepLink: jest.fn(),
      persistCurrentState: jest.fn(),
      clearMenuCache: jest.fn(),
      navigationHistory: [],
      navigationState: null,
      currentScreen: 'RoleDashboard',
      userRole: 'customer',
      isStateLoading: false,
      isHistoryLoading: false,
      isTrackingNavigation: false,
      isPersistingState: false,
    });

    mockUseRoleMenu.mockReturnValue({
      menuItems: mockMenuItems,
      isLoading: false,
      error: null,
      refreshMenu: jest.fn(),
      saveCustomization: jest.fn(),
      isSavingCustomization: false,
      refreshTrigger: 0,
    });
  });

  describe('Dashboard Loading States', () => {
    it('should show loading state when user role is loading', () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, getByText } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('role-dashboard-screen-loading')).toBeTruthy();
      expect(getByText('Loading your dashboard...')).toBeTruthy();
    });

    it('should show loading state when menu is loading', () => {
      mockUseRoleNavigation.mockReturnValue({
        ...mockUseRoleNavigation(),
        isMenuLoading: true,
      });

      const { getByTestId } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('role-dashboard-screen-loading')).toBeTruthy();
    });

    it('should show loading state when role menu items are loading', () => {
      mockUseRoleMenu.mockReturnValue({
        ...mockUseRoleMenu(),
        isLoading: true,
      });

      const { getByTestId } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('role-dashboard-screen-loading')).toBeTruthy();
    });
  });

  describe('Error States and Graceful Degradation', () => {
    it('should handle role loading error gracefully', () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load user role'),
        refetch: jest.fn(),
      });

      const { getByTestId, getByText } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('role-dashboard-screen-error')).toBeTruthy();
      expect(getByText('Unable to Load Dashboard')).toBeTruthy();
      expect(getByText('Failed to load user role')).toBeTruthy();
      expect(getByTestId('role-dashboard-screen-retry-button')).toBeTruthy();
    });

    it('should handle missing user role gracefully', () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, getByText } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('role-dashboard-screen-error')).toBeTruthy();
      expect(getByText('Please check your connection and try again')).toBeTruthy();
    });

    it('should handle unknown role configuration error', () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'unknown-role' as any,
          userId: 'user-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, getByText } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('role-dashboard-screen-config-error')).toBeTruthy();
      expect(getByText('Dashboard Configuration Error')).toBeTruthy();
      expect(getByText('Unknown user role: unknown-role')).toBeTruthy();
    });

    it('should show menu error while keeping dashboard functional', async () => {
      mockUseRoleNavigation.mockReturnValue({
        ...mockUseRoleNavigation(),
        menuError: new Error('Menu loading failed'),
        hasMenuItems: false,
      });

      const { getByText, queryByText } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('Menu Loading Error')).toBeTruthy();
        expect(getByText('Some features may not be available. Pull to refresh to try again.')).toBeTruthy();
      });

      // Dashboard should still show header and quick actions
      expect(getByText('Welcome to MyFarmstand')).toBeTruthy();
      expect(getByText('Quick Actions')).toBeTruthy();
      
      // But not the full menu section
      expect(queryByText('Available Features')).toBeFalsy();
    });
  });

  describe('Role-Specific Dashboard Configuration', () => {
    it('should display customer dashboard configuration', async () => {
      const { getByText, getByTestId } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('Welcome to MyFarmstand')).toBeTruthy();
        expect(getByText('Discover fresh, local produce')).toBeTruthy();
        expect(getByText('CUSTOMER')).toBeTruthy();
        expect(getByTestId('role-dashboard-screen-user-info')).toBeTruthy();
      });
    });

    it('should display farmer dashboard configuration', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'farmer',
          userId: 'farmer-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByText } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('Farmer Dashboard')).toBeTruthy();
        expect(getByText('Manage your products and orders')).toBeTruthy();
        expect(getByText('FARMER')).toBeTruthy();
      });
    });

    it('should display admin dashboard configuration', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'admin',
          userId: 'admin-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByText } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('Admin Dashboard')).toBeTruthy();
        expect(getByText('System management and oversight')).toBeTruthy();
        expect(getByText('ADMIN')).toBeTruthy();
      });
    });

    it('should display vendor dashboard configuration', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'vendor',
          userId: 'vendor-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByText } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('Vendor Portal')).toBeTruthy();
        expect(getByText('Track your business performance')).toBeTruthy();
        expect(getByText('VENDOR')).toBeTruthy();
      });
    });

    it('should display staff dashboard configuration', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'staff',
          userId: 'staff-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByText } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('Staff Dashboard')).toBeTruthy();
        expect(getByText('Order fulfillment and support')).toBeTruthy();
        expect(getByText('STAFF')).toBeTruthy();
      });
    });
  });

  describe('Quick Actions Functionality', () => {
    it('should display role-specific quick actions for customer', async () => {
      const { getByTestId } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('role-dashboard-screen-quick-action-ProductsScreen')).toBeTruthy();
        expect(getByTestId('role-dashboard-screen-quick-action-CartScreen')).toBeTruthy();
        expect(getByTestId('role-dashboard-screen-quick-action-OrdersScreen')).toBeTruthy();
        expect(getByTestId('role-dashboard-screen-quick-action-ProfileScreen')).toBeTruthy();
      });
    });

    it('should handle quick action navigation successfully', async () => {
      const mockNavigateTo = jest.fn().mockResolvedValue({ screen: 'ProductsScreen', allowed: true });
      mockUseRoleNavigation.mockReturnValue({
        ...mockUseRoleNavigation(),
        navigateTo: mockNavigateTo,
      });

      const { getByTestId } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      const productButton = getByTestId('role-dashboard-screen-quick-action-ProductsScreen');
      
      await act(async () => {
        fireEvent.press(productButton);
      });

      await waitFor(() => {
        expect(mockNavigateTo).toHaveBeenCalledWith('ProductsScreen', undefined, 'quick-action-tap');
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'RoleDashboardScreen',
          pattern: 'user_interaction',
          operation: 'quickActionNavigation'
        });
      });
    });

    it('should handle quick action navigation errors gracefully', async () => {
      const mockNavigateTo = jest.fn().mockRejectedValue(new Error('Permission denied'));
      mockUseRoleNavigation.mockReturnValue({
        ...mockUseRoleNavigation(),
        navigateTo: mockNavigateTo,
      });

      const { getByTestId } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      const productButton = getByTestId('role-dashboard-screen-quick-action-ProductsScreen');
      
      await act(async () => {
        fireEvent.press(productButton);
      });

      await waitFor(() => {
        expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
          context: 'RoleDashboardScreen.handleNavigation',
          errorMessage: 'Permission denied',
          errorCode: 'DASHBOARD_NAVIGATION_FAILED'
        });
        expect(Alert.alert).toHaveBeenCalledWith(
          'Navigation Error',
          'Permission denied',
          [{ text: 'OK' }]
        );
      });
    });
  });

  describe('Menu Items Display', () => {
    it('should display available menu items', async () => {
      const { getByText, getByTestId } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('Available Features')).toBeTruthy();
        expect(getByTestId('role-dashboard-screen-menu-item-ProductsScreen')).toBeTruthy();
        expect(getByTestId('role-dashboard-screen-menu-item-OrdersScreen')).toBeTruthy();
      });
    });

    it('should handle menu item navigation', async () => {
      const mockNavigateTo = jest.fn().mockResolvedValue({ screen: 'OrdersScreen', allowed: true });
      mockUseRoleNavigation.mockReturnValue({
        ...mockUseRoleNavigation(),
        navigateTo: mockNavigateTo,
      });

      const { getByTestId } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      const ordersMenuItem = getByTestId('role-dashboard-screen-menu-item-OrdersScreen');
      
      await act(async () => {
        fireEvent.press(ordersMenuItem);
      });

      await waitFor(() => {
        expect(mockNavigateTo).toHaveBeenCalledWith('OrdersScreen', undefined, 'quick-action-tap');
      });
    });

    it('should not display menu items section when hasMenuItems is false', async () => {
      mockUseRoleNavigation.mockReturnValue({
        ...mockUseRoleNavigation(),
        hasMenuItems: false,
      });

      const { queryByText } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(queryByText('Available Features')).toBeFalsy();
      });
    });
  });

  describe('Pull to Refresh Functionality', () => {
    it('should handle pull to refresh successfully', async () => {
      const mockRefetchRole = jest.fn().mockResolvedValue(undefined);
      const mockRefetchMenu = jest.fn().mockResolvedValue(undefined);
      const mockRefreshMenu = jest.fn().mockResolvedValue(undefined);

      mockUseUserRole.mockReturnValue({
        data: {
          role: 'customer',
          userId: 'user-123',
        },
        isLoading: false,
        error: null,
        refetch: mockRefetchRole,
      });

      mockUseRoleNavigation.mockReturnValue({
        ...mockUseRoleNavigation(),
        refetchMenu: mockRefetchMenu,
      });

      mockUseRoleMenu.mockReturnValue({
        ...mockUseRoleMenu(),
        refreshMenu: mockRefreshMenu,
      });

      const { getByTestId } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      const refreshControl = getByTestId('role-dashboard-screen-refresh-control');
      
      await act(async () => {
        fireEvent(refreshControl, 'refresh');
      });

      await waitFor(() => {
        expect(mockRefetchRole).toHaveBeenCalled();
        expect(mockRefetchMenu).toHaveBeenCalled();
        expect(mockRefreshMenu).toHaveBeenCalled();
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'RoleDashboardScreen',
          pattern: 'data_refresh',
          operation: 'pullToRefresh'
        });
      });
    });

    it('should handle pull to refresh errors gracefully', async () => {
      const mockRefetchRole = jest.fn().mockRejectedValue(new Error('Network error'));
      
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'customer',
          userId: 'user-123',
        },
        isLoading: false,
        error: null,
        refetch: mockRefetchRole,
      });

      const { getByTestId } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      const refreshControl = getByTestId('role-dashboard-screen-refresh-control');
      
      await act(async () => {
        fireEvent(refreshControl, 'refresh');
      });

      await waitFor(() => {
        expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
          context: 'RoleDashboardScreen.handleRefresh',
          errorMessage: 'Network error',
          errorCode: 'DASHBOARD_REFRESH_FAILED'
        });
      });
    });
  });

  describe('Screen Focus Analytics', () => {
    it('should track screen focus for analytics', async () => {
      render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'RoleDashboardScreen',
          pattern: 'screen_focus',
          operation: 'dashboardView'
        });
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to tablet screen sizes', async () => {
      // Mock tablet dimensions
      const Dimensions = require('react-native/Libraries/Utilities/Dimensions');
      Dimensions.get.mockReturnValue({ width: 1024, height: 768 });

      const { container } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(container).toBeTruthy();
        // Tablet-specific styles would be applied
      });
    });
  });

  describe('Accessibility', () => {
    it('should provide proper test IDs for automation', async () => {
      const { getByTestId } = render(
        <RoleDashboardScreen testID="custom-dashboard" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('custom-dashboard')).toBeTruthy();
        expect(getByTestId('custom-dashboard-user-info')).toBeTruthy();
        expect(getByTestId('custom-dashboard-refresh-control')).toBeTruthy();
      });
    });

    it('should handle retry button press', async () => {
      const mockRefetch = jest.fn().mockResolvedValue(undefined);
      
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Connection failed'),
        refetch: mockRefetch,
      });

      const { getByTestId } = render(
        <RoleDashboardScreen />,
        { wrapper: createWrapper() }
      );

      const retryButton = getByTestId('role-dashboard-screen-retry-button');
      
      await act(async () => {
        fireEvent.press(retryButton);
      });

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });
});