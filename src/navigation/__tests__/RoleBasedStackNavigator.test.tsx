/**
 * RoleBasedStackNavigator Tests
 * Tests for dynamic role-based navigation structure
 */

import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleBasedStackNavigator } from '../RoleBasedStackNavigator';
import { RoleNavigationService } from '../../services/role-based/roleNavigationService';
import { useUserRole } from '../../hooks/role-based/useUserRole';
// import { useRolePermissions } from '../../hooks/role-based/useRolePermissions';
import { navigationMocks } from '../../test/navigationSetup';
import { ValidationMonitor } from '../../utils/validationMonitor';

// Mock broadcast factory first
jest.mock('../../utils/broadcastFactory', () => ({
  createBroadcastHelper: jest.fn(() => ({
    dispatch: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  })),
}));

// Mock other dependencies
jest.mock('../../hooks/useAuth', () => ({
  useCurrentUser: jest.fn(() => ({ data: { id: 'user-123' } })),
}));

// Mock hooks
jest.mock('../../hooks/role-based/useUserRole');
jest.mock('../../services/role-based/roleNavigationService');
jest.mock('../../utils/validationMonitor');
jest.mock('../../utils/debounce', () => ({
  debounce: jest.fn((fn) => fn),
}));

// Mock all screen imports  
jest.mock('../../screens/HomeScreen', () => ({ HomeScreen: () => 'HomeScreen' }));
jest.mock('../../screens/ProductsScreen', () => ({ ProductsScreen: () => 'ProductsScreen' }));
jest.mock('../../screens/CartScreen', () => ({ CartScreen: () => 'CartScreen' }));
jest.mock('../../screens/OrdersScreen', () => ({ OrdersScreen: () => 'OrdersScreen' }));
jest.mock('../../screens/ProfileScreen', () => ({ ProfileScreen: () => 'ProfileScreen' }));
jest.mock('../../screens/PermissionDeniedScreen', () => ({ PermissionDeniedScreen: () => 'PermissionDeniedScreen' }));
jest.mock('../../screens/auth/LoginScreen', () => ({ LoginScreen: () => 'LoginScreen' }));

const mockUseUserRole = useUserRole as jest.MockedFunction<typeof useUserRole>;
const mockRoleNavigationService = RoleNavigationService as jest.Mocked<typeof RoleNavigationService>;
const mockValidationMonitor = ValidationMonitor as jest.Mocked<typeof ValidationMonitor>;

describe('RoleBasedStackNavigator', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderNavigator = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <RoleBasedStackNavigator {...props} />
        </NavigationContainer>
      </QueryClientProvider>
    );
  };

  describe('Dynamic Menu Generation', () => {
    it('should generate menu items based on user role', async () => {
      mockUseUserRole.mockReturnValue({
        data: { role: 'admin', userId: 'user-123' },
        isLoading: false,
        error: null,
      } as any);

      mockRoleNavigationService.generateMenuItems.mockResolvedValue([
        { name: 'Home', component: 'HomeScreen', icon: 'home' },
        { name: 'Users', component: 'UsersScreen', icon: 'users' },
        { name: 'Settings', component: 'SettingsScreen', icon: 'settings' },
      ]);

      const { getByTestId } = renderNavigator();

      await waitFor(() => {
        expect(mockRoleNavigationService.generateMenuItems).toHaveBeenCalledWith('admin');
        expect(getByTestId('navigation-menu')).toBeTruthy();
      });
    });

    it('should update menu when role changes', async () => {
      const { rerender } = renderNavigator();

      mockUseUserRole.mockReturnValue({
        data: { role: 'customer', userId: 'user-123' },
        isLoading: false,
        error: null,
      } as any);

      mockRoleNavigationService.generateMenuItems.mockResolvedValue([
        { name: 'Home', component: 'HomeScreen', icon: 'home' },
        { name: 'Products', component: 'ProductsScreen', icon: 'shopping-bag' },
        { name: 'Cart', component: 'CartScreen', icon: 'shopping-cart' },
      ]);

      await act(async () => {
        rerender(
          <QueryClientProvider client={queryClient}>
            <NavigationContainer>
              <RoleBasedStackNavigator />
            </NavigationContainer>
          </QueryClientProvider>
        );
      });

      await waitFor(() => {
        expect(mockRoleNavigationService.generateMenuItems).toHaveBeenCalledWith('customer');
      });
    });

    it('should handle menu generation errors gracefully', async () => {
      mockUseUserRole.mockReturnValue({
        data: { role: 'admin', userId: 'user-123' },
        isLoading: false,
        error: null,
      } as any);

      mockRoleNavigationService.generateMenuItems.mockRejectedValue(
        new Error('Menu generation failed')
      );

      const { getByTestId } = renderNavigator();

      await waitFor(() => {
        expect(getByTestId('navigation-error')).toBeTruthy();
        expect(mockValidationMonitor.trackFailure).toHaveBeenCalledWith(
          'navigation',
          'menu_generation',
          expect.any(Error)
        );
      });
    });
  });

  describe('Navigation Permission Enforcement', () => {
    it('should prevent navigation to unauthorized screens', async () => {
      mockUseUserRole.mockReturnValue({
        data: { role: 'customer', userId: 'user-123' },
        isLoading: false,
        error: null,
      } as any);

      mockRoleNavigationService.canNavigateTo.mockResolvedValue(false);

      const { getByTestId } = renderNavigator();
      
      await act(async () => {
        const adminButton = getByTestId('navigate-admin');
        fireEvent.press(adminButton);
      });

      await waitFor(() => {
        expect(mockRoleNavigationService.canNavigateTo).toHaveBeenCalledWith('customer', 'AdminScreen');
        expect(getByTestId('permission-denied-modal')).toBeTruthy();
      });
    });

    it('should allow navigation to authorized screens', async () => {
      mockUseUserRole.mockReturnValue({
        data: { role: 'admin', userId: 'user-123' },
        isLoading: false,
        error: null,
      } as any);

      mockRoleNavigationService.canNavigateTo.mockResolvedValue(true);

      const { getByTestId, queryByTestId } = renderNavigator();
      
      await act(async () => {
        const adminButton = getByTestId('navigate-admin');
        fireEvent.press(adminButton);
      });

      await waitFor(() => {
        expect(mockRoleNavigationService.canNavigateTo).toHaveBeenCalledWith('admin', 'AdminScreen');
        expect(queryByTestId('permission-denied-modal')).toBeNull();
      });
    });

    it('should handle permission check errors gracefully', async () => {
      mockRoleNavigationService.canNavigateTo.mockRejectedValue(
        new Error('Permission check failed')
      );

      const { getByTestId } = renderNavigator();
      
      await act(async () => {
        const button = getByTestId('navigate-products');
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(mockValidationMonitor.trackFailure).toHaveBeenCalledWith(
          'navigation',
          'permission_check',
          expect.any(Error)
        );
        expect(getByTestId('navigation-error-fallback')).toBeTruthy();
      });
    });
  });

  describe('Role Switching Navigation Updates', () => {
    it('should update navigation stack when role switches', async () => {
      const { rerender } = renderNavigator();

      mockUseUserRole.mockReturnValue({
        data: { role: 'customer', userId: 'user-123' },
        isLoading: false,
        error: null,
      } as any);

      await act(async () => {
        mockUseUserRole.mockReturnValue({
          data: { role: 'farmer', userId: 'user-123' },
          isLoading: false,
          error: null,
        } as any);

        rerender(
          <QueryClientProvider client={queryClient}>
            <NavigationContainer>
              <RoleBasedStackNavigator />
            </NavigationContainer>
          </QueryClientProvider>
        );
      });

      await waitFor(() => {
        expect(mockRoleNavigationService.generateMenuItems).toHaveBeenCalledWith('farmer');
        expect(mockRoleNavigationService.getDefaultScreen).toHaveBeenCalledWith('farmer');
      });
    });

    it('should preserve navigation state during role switch when possible', async () => {
      mockRoleNavigationService.getNavigationState.mockResolvedValue({
        currentScreen: 'ProductsScreen',
        history: ['HomeScreen', 'ProductsScreen'],
      });

      const { rerender } = renderNavigator();

      await act(async () => {
        mockUseUserRole.mockReturnValue({
          data: { role: 'vendor', userId: 'user-123' },
          isLoading: false,
          error: null,
        } as any);

        rerender(
          <QueryClientProvider client={queryClient}>
            <NavigationContainer>
              <RoleBasedStackNavigator />
            </NavigationContainer>
          </QueryClientProvider>
        );
      });

      await waitFor(() => {
        expect(mockRoleNavigationService.persistNavigationState).toHaveBeenCalled();
      });
    });

    it('should reset to default screen if current screen is not accessible after role switch', async () => {
      mockRoleNavigationService.canNavigateTo.mockResolvedValue(false);
      mockRoleNavigationService.getDefaultScreen.mockResolvedValue('HomeScreen');

      const { rerender } = renderNavigator();

      await act(async () => {
        mockUseUserRole.mockReturnValue({
          data: { role: 'staff', userId: 'user-123' },
          isLoading: false,
          error: null,
        } as any);

        rerender(
          <QueryClientProvider client={queryClient}>
            <NavigationContainer>
              <RoleBasedStackNavigator />
            </NavigationContainer>
          </QueryClientProvider>
        );
      });

      await waitFor(() => {
        expect(mockRoleNavigationService.getDefaultScreen).toHaveBeenCalledWith('staff');
      });
    });
  });

  describe('Deep-linking with Role Permissions', () => {
    it('should validate deep link permissions before navigation', async () => {
      const deepLink = 'myfarmstand://admin/users';
      
      mockRoleNavigationService.validateDeepLink.mockResolvedValue({
        isValid: true,
        targetScreen: 'UsersScreen',
        params: {},
      });

      const { getByTestId } = renderNavigator({ initialDeepLink: deepLink });

      await waitFor(() => {
        expect(mockRoleNavigationService.validateDeepLink).toHaveBeenCalledWith(
          deepLink,
          expect.any(String)
        );
      });
    });

    it('should reject invalid deep links', async () => {
      const deepLink = 'myfarmstand://admin/invalid';
      
      mockRoleNavigationService.validateDeepLink.mockResolvedValue({
        isValid: false,
        targetScreen: null,
        params: null,
      });

      const { getByTestId } = renderNavigator({ initialDeepLink: deepLink });

      await waitFor(() => {
        expect(getByTestId('invalid-deeplink-error')).toBeTruthy();
      });
    });

    it('should handle deep link validation errors', async () => {
      const deepLink = 'myfarmstand://products/123';
      
      mockRoleNavigationService.validateDeepLink.mockRejectedValue(
        new Error('Deep link validation failed')
      );

      const { getByTestId } = renderNavigator({ initialDeepLink: deepLink });

      await waitFor(() => {
        expect(mockValidationMonitor.trackFailure).toHaveBeenCalledWith(
          'navigation',
          'deeplink_validation',
          expect.any(Error)
        );
      });
    });
  });

  describe('Navigation State Persistence', () => {
    it('should persist navigation state on app background', async () => {
      const { getByTestId } = renderNavigator();

      await act(async () => {
        const event = new Event('blur');
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(mockRoleNavigationService.persistNavigationState).toHaveBeenCalled();
      });
    });

    it('should restore navigation state on app foreground', async () => {
      mockRoleNavigationService.getNavigationState.mockResolvedValue({
        currentScreen: 'CartScreen',
        history: ['HomeScreen', 'ProductsScreen', 'CartScreen'],
      });

      const { getByTestId } = renderNavigator();

      await act(async () => {
        const event = new Event('focus');
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(mockRoleNavigationService.getNavigationState).toHaveBeenCalled();
      });
    });
  });

  describe('Permission-Denied Fallback', () => {
    it('should show fallback UI for permission-denied scenarios', async () => {
      mockRoleNavigationService.handlePermissionDenied.mockResolvedValue({
        fallbackScreen: 'PermissionDeniedScreen',
        message: 'You do not have permission to access this area',
      });

      const { getByText } = renderNavigator();

      await act(async () => {
        mockRoleNavigationService.canNavigateTo.mockResolvedValue(false);
      });

      await waitFor(() => {
        expect(getByText('You do not have permission to access this area')).toBeTruthy();
      });
    });

    it('should provide upgrade path in permission-denied scenarios', async () => {
      mockRoleNavigationService.handlePermissionDenied.mockResolvedValue({
        fallbackScreen: 'UpgradeAccountScreen',
        message: 'Upgrade your account to access this feature',
        upgradeOptions: ['farmer', 'vendor'],
      });

      const { getByTestId } = renderNavigator();

      await waitFor(() => {
        expect(getByTestId('upgrade-account-button')).toBeTruthy();
      });
    });
  });

  describe('Admin Override Navigation', () => {
    it('should allow admin to bypass navigation restrictions', async () => {
      mockUseUserRole.mockReturnValue({
        data: { role: 'admin', userId: 'admin-123', isAdmin: true },
        isLoading: false,
        error: null,
      } as any);

      mockRoleNavigationService.canNavigateTo.mockResolvedValue(true);

      const { queryByTestId } = renderNavigator();

      await act(async () => {
        // Admin should be able to navigate anywhere
        const button = queryByTestId('navigate-restricted');
        if (button) fireEvent.press(button);
      });

      await waitFor(() => {
        expect(queryByTestId('permission-denied-modal')).toBeNull();
      });
    });

    it('should track admin override usage', async () => {
      mockUseUserRole.mockReturnValue({
        data: { role: 'admin', userId: 'admin-123', isAdmin: true },
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = renderNavigator();

      await act(async () => {
        const button = getByTestId('admin-override-navigation');
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(mockValidationMonitor.trackSuccess).toHaveBeenCalledWith(
          'navigation',
          'admin_override',
          expect.any(Object)
        );
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('should cache menu items for performance', async () => {
      mockRoleNavigationService.getCachedMenuItems.mockReturnValue([
        { name: 'Home', component: 'HomeScreen', icon: 'home' },
      ]);

      renderNavigator();

      await waitFor(() => {
        expect(mockRoleNavigationService.getCachedMenuItems).toHaveBeenCalled();
      });
    });

    it('should debounce rapid role changes', async () => {
      const { rerender } = renderNavigator();

      // Simulate rapid role changes
      for (let i = 0; i < 5; i++) {
        mockUseUserRole.mockReturnValue({
          data: { role: i % 2 === 0 ? 'customer' : 'farmer', userId: 'user-123' },
          isLoading: false,
          error: null,
        } as any);

        rerender(
          <QueryClientProvider client={queryClient}>
            <NavigationContainer>
              <RoleBasedStackNavigator />
            </NavigationContainer>
          </QueryClientProvider>
        );
      }

      await waitFor(() => {
        // Should not call generateMenuItems 5 times due to debouncing
        expect(mockRoleNavigationService.generateMenuItems).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Accessibility Compliance', () => {
    it('should have proper accessibility labels for navigation items', async () => {
      const { getByLabelText } = renderNavigator();

      await waitFor(() => {
        expect(getByLabelText('Navigate to Home')).toBeTruthy();
        expect(getByLabelText('Navigate to Products')).toBeTruthy();
      });
    });

    it('should announce navigation changes to screen readers', async () => {
      const { getByTestId } = renderNavigator();

      await act(async () => {
        const button = getByTestId('navigate-products');
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(getByTestId('screen-reader-announcement')).toHaveTextContent(
          'Navigated to Products screen'
        );
      });
    });

    it('should support keyboard navigation', async () => {
      const { getByTestId } = renderNavigator();

      await act(async () => {
        const navMenu = getByTestId('navigation-menu');
        fireEvent(navMenu, 'onAccessibilityAction', { actionName: 'activate' });
      });

      await waitFor(() => {
        expect(getByTestId('keyboard-navigation-active')).toBeTruthy();
      });
    });
  });

  describe('Mobile Gesture Navigation', () => {
    it('should support swipe gestures for navigation', async () => {
      const { getByTestId } = renderNavigator();

      await act(async () => {
        const screen = getByTestId('navigation-screen');
        fireEvent(screen, 'onSwipeLeft');
      });

      await waitFor(() => {
        expect(mockRoleNavigationService.trackNavigation).toHaveBeenCalledWith(
          expect.objectContaining({ gesture: 'swipe_left' })
        );
      });
    });

    it('should support pull-to-refresh on navigation menu', async () => {
      const { getByTestId } = renderNavigator();

      await act(async () => {
        const menu = getByTestId('navigation-menu');
        fireEvent(menu, 'onRefresh');
      });

      await waitFor(() => {
        expect(mockRoleNavigationService.clearMenuCache).toHaveBeenCalled();
        expect(mockRoleNavigationService.generateMenuItems).toHaveBeenCalled();
      });
    });
  });

  describe('Error Recovery', () => {
    it('should recover from navigation service errors', async () => {
      mockRoleNavigationService.generateMenuItems
        .mockRejectedValueOnce(new Error('Service error'))
        .mockResolvedValueOnce([
          { name: 'Home', component: 'HomeScreen', icon: 'home' },
        ]);

      const { getByTestId, rerender } = renderNavigator();

      await waitFor(() => {
        expect(getByTestId('navigation-error')).toBeTruthy();
      });

      // Trigger retry
      await act(async () => {
        const retryButton = getByTestId('retry-navigation');
        fireEvent.press(retryButton);
      });

      await waitFor(() => {
        expect(getByTestId('navigation-menu')).toBeTruthy();
      });
    });

    it('should provide offline fallback navigation', async () => {
      mockRoleNavigationService.generateMenuItems.mockRejectedValue(
        new Error('Network error')
      );

      const { getByTestId } = renderNavigator();

      await waitFor(() => {
        expect(getByTestId('offline-navigation-menu')).toBeTruthy();
      });
    });
  });
});