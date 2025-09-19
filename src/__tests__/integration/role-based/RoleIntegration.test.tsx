/**
 * Role-Based Integration Tests
 * End-to-end tests for complete role-based UI integration
 * Following scratchpad-service-test-setup patterns
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { RoleDashboardScreen } from '../../../screens/role-based/RoleDashboard';
import { RoleSelectionScreen } from '../../../screens/role-based/RoleSelectionScreen';
import { PermissionManagementScreen } from '../../../screens/role-based/PermissionManagementScreen';
import { PermissionGate } from '../../../components/role-based/PermissionGate';
import { RoleBasedButton } from '../../../components/role-based/RoleBasedButton';
import { ValidationMonitor } from '../../../utils/validationMonitor';
import { RolePermissionService } from '../../../services/role-based/rolePermissionService';

// Mock external dependencies
jest.spyOn(Alert, 'alert');
jest.mock('../../../utils/validationMonitor');
jest.mock('../../../services/role-based/rolePermissionService');

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  canGoBack: jest.fn().mockReturnValue(true),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useFocusEffect: (callback: () => void) => {
    React.useEffect(callback, []);
  },
}));

// Mock hooks
jest.mock('../../../hooks/role-based/useUserRole');
jest.mock('../../../hooks/role-based/useRoleNavigation');
jest.mock('../../../hooks/role-based/useRoleMenu');
jest.mock('../../../hooks/role-based/useNavigationPermissions');

import { useUserRole } from '../../../hooks/role-based/useUserRole';
import { useRoleNavigation } from '../../../hooks/role-based/useRoleNavigation';
import { useRoleMenu } from '../../../hooks/role-based/useRoleMenu';
import { useNavigationPermissions } from '../../../hooks/role-based/useNavigationPermissions';

const mockUseUserRole = useUserRole as jest.MockedFunction<typeof useUserRole>;
const mockUseRoleNavigation = useRoleNavigation as jest.MockedFunction<typeof useRoleNavigation>;
const mockUseRoleMenu = useRoleMenu as jest.MockedFunction<typeof useRoleMenu>;
const mockUseNavigationPermissions = useNavigationPermissions as jest.MockedFunction<typeof useNavigationPermissions>;

const mockValidationMonitor = ValidationMonitor as jest.Mocked<typeof ValidationMonitor>;
const mockRolePermissionService = RolePermissionService as jest.Mocked<typeof RolePermissionService>;

const createIntegrationWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
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

describe('Role-Based Integration Tests', () => {
  const mockMenuItems = [
    {
      name: 'Home',
      component: 'HomeScreen',
      icon: '🏠',
      permissions: ['view:home'],
      priority: 1,
    },
    {
      name: 'Products',
      component: 'ProductsScreen',
      icon: '🛍️',
      permissions: ['view:products'],
      priority: 2,
    },
    {
      name: 'Orders',
      component: 'OrdersScreen',
      icon: '📦',
      permissions: ['view:orders'],
      priority: 3,
    },
  ];

  const mockUserRoles = [
    {
      user_id: 'user-123',
      role_type: 'customer',
      is_active: true,
      assigned_at: '2025-08-23T00:00:00Z',
    },
    {
      user_id: 'user-123',
      role_type: 'farmer',
      is_active: true,
      assigned_at: '2025-08-23T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all mocks to successful defaults
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
      navigateTo: jest.fn().mockResolvedValue({ screen: 'ProductsScreen', allowed: true }),
      getDefaultScreen: jest.fn().mockResolvedValue('RoleDashboard'),
      refetchMenu: jest.fn(),
      hasMenuItems: true,
      isLoading: false,
      setCurrentScreen: jest.fn(),
      checkPermission: jest.fn().mockResolvedValue(true),
      canAccessScreen: jest.fn().mockResolvedValue(true),
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

    mockUseNavigationPermissions.mockReturnValue({
      screen: '',
      allowed: true,
      checked: true,
      error: undefined,
      checkPermission: jest.fn().mockResolvedValue({
        screen: 'ProductsScreen',
        allowed: true,
        checked: true,
      }),
    });

    mockRolePermissionService.getUserRoles.mockResolvedValue({
      success: true,
      data: mockUserRoles,
      message: 'Success'
    });

    mockRolePermissionService.getRolePermissions.mockResolvedValue({
      success: true,
      data: [
        { permission_name: 'view:products' },
        { permission_name: 'view:orders' },
        { permission_name: 'manage:cart' },
      ],
      message: 'Success'
    });
  });

  describe('Customer Journey Integration', () => {
    it('should complete customer dashboard to product navigation flow', async () => {
      const { getByTestId, getByText } = render(
        <RoleDashboardScreen testID="customer-dashboard" />,
        { wrapper: createIntegrationWrapper() }
      );

      // Verify dashboard loads for customer
      await waitFor(() => {
        expect(getByText('Welcome to MyFarmstand')).toBeTruthy();
        expect(getByText('Discover fresh, local produce')).toBeTruthy();
        expect(getByText('CUSTOMER')).toBeTruthy();
      });

      // Verify quick actions are available
      await waitFor(() => {
        expect(getByTestId('customer-dashboard-quick-action-ProductsScreen')).toBeTruthy();
      });

      // Navigate to products
      const productsButton = getByTestId('customer-dashboard-quick-action-ProductsScreen');
      fireEvent.press(productsButton);

      await waitFor(() => {
        expect(mockUseRoleNavigation().navigateTo).toHaveBeenCalledWith(
          'ProductsScreen',
          undefined,
          'quick-action-tap'
        );
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'RoleDashboardScreen',
          pattern: 'user_interaction',
          operation: 'quickActionNavigation'
        });
      });
    });

    it('should handle permission denied scenario gracefully', async () => {
      // Mock permission denial
      const mockNavigateTo = jest.fn().mockRejectedValue(new Error('Permission denied'));
      mockUseRoleNavigation.mockReturnValue({
        ...mockUseRoleNavigation(),
        navigateTo: mockNavigateTo,
      });

      const { getByTestId } = render(
        <RoleDashboardScreen testID="customer-dashboard" />,
        { wrapper: createIntegrationWrapper() }
      );

      await waitFor(() => {
        const productsButton = getByTestId('customer-dashboard-quick-action-ProductsScreen');
        fireEvent.press(productsButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Navigation Error',
          'Permission denied',
          [{ text: 'OK' }]
        );
        expect(mockValidationMonitor.recordValidationError).toHaveBeenCalled();
      });
    });
  });

  describe('Role Switching Integration', () => {
    it('should complete role selection to dashboard flow', async () => {
      const { getByTestId, queryByTestId } = render(
        <RoleSelectionScreen testID="role-selection" />,
        { wrapper: createIntegrationWrapper() }
      );

      // Wait for roles to load
      await waitFor(() => {
        expect(getByTestId('role-selection-role-customer')).toBeTruthy();
        expect(getByTestId('role-selection-role-farmer')).toBeTruthy();
      });

      // Select different role (farmer)
      const farmerRole = getByTestId('role-selection-role-farmer');
      fireEvent.press(farmerRole);

      // Confirmation modal should appear
      await waitFor(() => {
        expect(getByTestId('role-selection-confirmation-modal')).toBeTruthy();
      });

      // Confirm role switch
      const confirmButton = getByTestId('role-selection-confirm-switch');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockRolePermissionService.switchUserRole).toHaveBeenCalledWith('user-123', 'farmer');
        expect(Alert.alert).toHaveBeenCalledWith(
          'Role Switched',
          'You are now acting as Farmer',
          expect.arrayContaining([
            expect.objectContaining({
              text: 'Continue',
              onPress: expect.any(Function)
            })
          ])
        );
      });
    });

    it('should handle role switch integration with dashboard refresh', async () => {
      const mockRefetch = jest.fn();
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'customer',
          userId: 'user-123',
        },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      mockRolePermissionService.switchUserRole.mockResolvedValue({
        success: true,
        data: null,
        message: 'Role switched successfully'
      });

      const { getByTestId } = render(
        <RoleSelectionScreen testID="role-selection" />,
        { wrapper: createIntegrationWrapper() }
      );

      await waitFor(() => {
        const farmerRole = getByTestId('role-selection-role-farmer');
        fireEvent.press(farmerRole);
      });

      await waitFor(() => {
        const confirmButton = getByTestId('role-selection-confirm-switch');
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled(); // User role should be refetched
      });
    });
  });

  describe('Admin Permission Management Integration', () => {
    it('should complete admin permission management flow', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'admin',
          userId: 'admin-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      mockRolePermissionService.getAllUsersWithRoles.mockResolvedValue({
        success: true,
        data: [
          {
            user_id: 'user-1',
            email: 'customer@example.com',
            name: 'Customer User',
            roles: [
              {
                role_type: 'customer',
                is_active: true,
                assigned_at: '2025-08-23T00:00:00Z',
              }
            ],
            last_activity: '2025-08-22T12:00:00Z',
          }
        ],
        message: 'Success'
      });

      const { getByText, getByTestId } = render(
        <PermissionManagementScreen testID="permission-management" />,
        { wrapper: createIntegrationWrapper() }
      );

      // Verify admin has access
      await waitFor(() => {
        expect(getByText('Permission Management')).toBeTruthy();
        expect(getByText('Customer User')).toBeTruthy();
        expect(getByTestId('permission-management-users-list')).toBeTruthy();
      });

      // Expand user details
      const userCard = getByTestId('permission-management-user-user-1');
      fireEvent.press(userCard);

      await waitFor(() => {
        expect(getByText('Manage Roles:')).toBeTruthy();
      });

      // Assign new role
      mockRolePermissionService.assignUserRole.mockResolvedValue({
        success: true,
        data: null,
        message: 'Role assigned successfully'
      });

      const assignButton = getByTestId('permission-management-role-action-user-1-farmer');
      fireEvent.press(assignButton);

      await waitFor(() => {
        expect(mockRolePermissionService.assignUserRole).toHaveBeenCalledWith('user-1', 'farmer');
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'User role assigned successfully',
          [{ text: 'OK' }]
        );
      });
    });

    it('should deny access to non-admin users', () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'customer',
          userId: 'customer-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, getByText } = render(
        <PermissionManagementScreen testID="permission-management" />,
        { wrapper: createIntegrationWrapper() }
      );

      expect(getByTestId('permission-management-access-denied')).toBeTruthy();
      expect(getByText('Access Denied')).toBeTruthy();
      expect(getByText('You need administrator privileges to access permission management.')).toBeTruthy();
    });
  });

  describe('Component Integration with Hooks', () => {
    it('should integrate PermissionGate with role hooks properly', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'admin',
          userId: 'admin-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const TestProtectedContent = () => (
        <PermissionGate roles={['admin']} testID="protected-gate">
          <RoleBasedButton
            title="Admin Action"
            onPress={jest.fn()}
            permissions={['admin:manage']}
            testID="admin-button"
          />
        </PermissionGate>
      );

      const { getByTestId, getByText } = render(
        <TestProtectedContent />,
        { wrapper: createIntegrationWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('protected-gate-granted')).toBeTruthy();
        expect(getByTestId('admin-button')).toBeTruthy();
        expect(getByText('Admin Action')).toBeTruthy();
      });
    });

    it('should cascade permissions correctly through component hierarchy', async () => {
      const TestNestedComponents = () => (
        <PermissionGate roles={['customer']} testID="outer-gate">
          <RoleBasedButton
            title="Customer Action"
            onPress={jest.fn()}
            permissions={['view:products']}
            testID="customer-button"
          />
        </PermissionGate>
      );

      const { getByTestId } = render(
        <TestNestedComponents />,
        { wrapper: createIntegrationWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('outer-gate-granted')).toBeTruthy();
        expect(getByTestId('customer-button')).toBeTruthy();
      });

      // Test button functionality
      const button = getByTestId('customer-button');
      const mockOnPress = jest.fn();
      button.props.onPress = mockOnPress;
      
      fireEvent.press(button);
      // Would verify onPress is called based on permissions
    });
  });

  describe('Cross-Screen Data Consistency', () => {
    it('should maintain role consistency across screen transitions', async () => {
      // Test that role data is consistent when navigating between screens
      let currentRole = 'customer';
      
      mockUseUserRole.mockImplementation(() => ({
        data: {
          role: currentRole as any,
          userId: 'user-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      }));

      const { rerender, getByText } = render(
        <RoleDashboardScreen />,
        { wrapper: createIntegrationWrapper() }
      );

      await waitFor(() => {
        expect(getByText('CUSTOMER')).toBeTruthy();
      });

      // Simulate role change
      currentRole = 'farmer';
      
      rerender(<RoleDashboardScreen />);

      await waitFor(() => {
        expect(getByText('FARMER')).toBeTruthy();
      });
    });

    it('should handle real-time permission updates', async () => {
      let userPermissions = ['view:products'];
      
      mockUseNavigationPermissions.mockImplementation(() => ({
        screen: 'ProductsScreen',
        allowed: userPermissions.includes('view:products'),
        checked: true,
        error: undefined,
        checkPermission: jest.fn(),
      }));

      const TestComponent = () => (
        <PermissionGate screen="ProductsScreen" testID="dynamic-gate">
          <RoleBasedButton
            title="Products"
            onPress={jest.fn()}
            screen="ProductsScreen"
            testID="products-button"
          />
        </PermissionGate>
      );

      const { rerender, getByTestId, queryByTestId } = render(
        <TestComponent />,
        { wrapper: createIntegrationWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('dynamic-gate-granted')).toBeTruthy();
      });

      // Simulate permission revocation
      userPermissions = [];
      
      rerender(<TestComponent />);

      await waitFor(() => {
        expect(queryByTestId('dynamic-gate-granted')).toBeFalsy();
        expect(queryByTestId('dynamic-gate-denied')).toBeTruthy();
      });
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle service failures gracefully across components', async () => {
      // Start with failed service
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Service unavailable'),
        refetch: jest.fn(),
      });

      const TestErrorRecovery = () => (
        <PermissionGate fallback={<div>Service Error</div>} testID="error-gate">
          <RoleDashboardScreen testID="dashboard" />
        </PermissionGate>
      );

      const { getByText, rerender } = render(
        <TestErrorRecovery />,
        { wrapper: createIntegrationWrapper() }
      );

      expect(getByText('Service Error')).toBeTruthy();

      // Simulate service recovery
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'customer',
          userId: 'user-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      rerender(<TestErrorRecovery />);

      await waitFor(() => {
        expect(getByText('Welcome to MyFarmstand')).toBeTruthy();
      });
    });

    it('should recover from network errors with retry functionality', async () => {
      const mockRefetch = jest.fn();
      
      // Start with network error
      mockRolePermissionService.getAllUsersWithRoles.mockRejectedValue(
        new Error('Network error')
      );
      
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'admin',
          userId: 'admin-123',
        },
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      });

      const { getByTestId } = render(
        <PermissionManagementScreen testID="permission-management" />,
        { wrapper: createIntegrationWrapper() }
      );

      const retryButton = getByTestId('permission-management-retry-button');
      
      // Simulate service recovery
      mockRolePermissionService.getAllUsersWithRoles.mockResolvedValue({
        success: true,
        data: [],
        message: 'Success'
      });

      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(mockRolePermissionService.getAllUsersWithRoles).toHaveBeenCalled();
      });
    });
  });

  describe('Performance and Caching Integration', () => {
    it('should use cached data appropriately across components', async () => {
      const TestCachingBehavior = () => (
        <>
          <RoleDashboardScreen testID="dashboard-1" />
          <RoleDashboardScreen testID="dashboard-2" />
        </>
      );

      render(<TestCachingBehavior />, { wrapper: createIntegrationWrapper() });

      await waitFor(() => {
        // Hooks should be called but services might use cached data
        expect(mockUseUserRole).toHaveBeenCalled();
        expect(mockUseRoleNavigation).toHaveBeenCalled();
      });

      // Verify both dashboards render correctly with potentially shared data
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'RoleDashboardScreen',
        pattern: 'screen_focus',
        operation: 'dashboardView'
      });
    });
  });

  describe('Analytics Integration', () => {
    it('should track user interactions across all components', async () => {
      const { getByTestId } = render(
        <RoleDashboardScreen testID="analytics-dashboard" />,
        { wrapper: createIntegrationWrapper() }
      );

      await waitFor(() => {
        const productsButton = getByTestId('analytics-dashboard-quick-action-ProductsScreen');
        fireEvent.press(productsButton);
      });

      await waitFor(() => {
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'RoleDashboardScreen',
          pattern: 'user_interaction',
          operation: 'quickActionNavigation'
        });
      });
    });

    it('should track permission denials for analytics', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'customer',
          userId: 'customer-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <PermissionGate roles={['admin']} testID="analytics-gate">
          <div>Admin Content</div>
        </PermissionGate>,
        { wrapper: createIntegrationWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('analytics-gate-denied')).toBeTruthy();
        expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
          context: 'PermissionGate.permissionCheck',
          errorMessage: 'Required role: admin',
          errorCode: 'PERMISSION_DENIED'
        });
      });
    });
  });
});