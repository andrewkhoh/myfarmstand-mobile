/**
 * RoleSelectionScreen Tests
 * Tests for role selection and switching functionality
 * Following scratchpad-service-test-setup patterns
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { RoleSelectionScreen } from '../RoleSelectionScreen';
import { ValidationMonitor } from '../../../utils/validationMonitor';
import { RolePermissionService } from '../../../services/role-based/rolePermissionService';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock ValidationMonitor
jest.mock('../../../utils/validationMonitor');
const mockValidationMonitor = ValidationMonitor as jest.Mocked<typeof ValidationMonitor>;

// Mock RolePermissionService
jest.mock('../../../services/role-based/rolePermissionService');
const mockRolePermissionService = RolePermissionService as jest.Mocked<typeof RolePermissionService>;

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
}));

// Mock role-based hooks
jest.mock('../../../hooks/role-based/useUserRole');
jest.mock('../../../hooks/role-based/useRoleNavigation');

import { useUserRole } from '../../../hooks/role-based/useUserRole';
import { useRoleNavigation } from '../../../hooks/role-based/useRoleNavigation';

const mockUseUserRole = useUserRole as jest.MockedFunction<typeof useUserRole>;
const mockUseRoleNavigation = useRoleNavigation as jest.MockedFunction<typeof useRoleNavigation>;

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

describe('RoleSelectionScreen', () => {
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

  const mockPermissions = [
    { permission_name: 'view:products' },
    { permission_name: 'manage:cart' },
    { permission_name: 'view:orders' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default user role mock
    mockUseUserRole.mockReturnValue({
      data: {
        role: 'customer',
        userId: 'user-123',
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    // Default navigation mock
    mockUseRoleNavigation.mockReturnValue({
      getDefaultScreen: jest.fn().mockResolvedValue('RoleDashboard'),
      handlePermissionDenied: jest.fn(),
      menuItems: [],
      isMenuLoading: false,
      menuError: null,
      navigateTo: jest.fn(),
      refetchMenu: jest.fn(),
      hasMenuItems: true,
      isLoading: false,
      setCurrentScreen: jest.fn(),
      checkPermission: jest.fn(),
      canAccessScreen: jest.fn(),
      validateDeepLink: jest.fn(),
      persistCurrentState: jest.fn(),
      clearMenuCache: jest.fn(),
      navigationHistory: [],
      navigationState: null,
      currentScreen: 'RoleSelection',
      userRole: 'customer',
      isStateLoading: false,
      isHistoryLoading: false,
      isTrackingNavigation: false,
      isPersistingState: false,
    });

    // Default service mocks
    mockRolePermissionService.getUserRoles.mockResolvedValue({
      success: true,
      data: mockUserRoles,
      message: 'Success'
    });

    mockRolePermissionService.getRolePermissions.mockResolvedValue({
      success: true,
      data: mockPermissions,
      message: 'Success'
    });

    mockRolePermissionService.switchUserRole.mockResolvedValue({
      success: true,
      data: null,
      message: 'Role switched successfully'
    });
  });

  describe('Loading States', () => {
    it('should show loading state when user role is loading', () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, getByText } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('role-selection-screen-loading')).toBeTruthy();
      expect(getByText('Loading available roles...')).toBeTruthy();
    });

    it('should show loading state while fetching available roles', async () => {
      // Mock slow role loading
      mockRolePermissionService.getUserRoles.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { getByTestId } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('role-selection-screen-loading')).toBeTruthy();
    });
  });

  describe('Error States and Graceful Degradation', () => {
    it('should handle user role loading error gracefully', () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load user role'),
        refetch: jest.fn(),
      });

      const { getByTestId, getByText } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('role-selection-screen-error')).toBeTruthy();
      expect(getByText('Unable to Load Roles')).toBeTruthy();
      expect(getByText('Failed to load user role')).toBeTruthy();
      expect(getByTestId('role-selection-screen-retry-button')).toBeTruthy();
    });

    it('should handle missing user ID gracefully', () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'customer',
          userId: '',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, getByText } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('role-selection-screen-error')).toBeTruthy();
      expect(getByText('Please check your connection and try again')).toBeTruthy();
    });

    it('should handle role loading service errors', async () => {
      mockRolePermissionService.getUserRoles.mockRejectedValue(
        new Error('Service unavailable')
      );

      const { getByTestId } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Loading Error',
          'Failed to load available roles. Please try again.',
          [{ text: 'OK' }]
        );
      });

      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'RoleSelectionScreen.loadAvailableRoles',
        errorMessage: 'Service unavailable',
        errorCode: 'AVAILABLE_ROLES_LOAD_FAILED'
      });
    });
  });

  describe('Single Role Account Handling', () => {
    it('should show single role message when user has only one role', async () => {
      mockRolePermissionService.getUserRoles.mockResolvedValue({
        success: true,
        data: [mockUserRoles[0]], // Only customer role
        message: 'Success'
      });

      const { getByTestId, getByText } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('role-selection-screen-single-role')).toBeTruthy();
        expect(getByText('Single Role Account')).toBeTruthy();
        expect(getByText('Your account has access to one role: customer')).toBeTruthy();
        expect(getByTestId('role-selection-screen-dashboard-button')).toBeTruthy();
      });
    });

    it('should navigate to dashboard when single role dashboard button pressed', async () => {
      mockRolePermissionService.getUserRoles.mockResolvedValue({
        success: true,
        data: [mockUserRoles[0]],
        message: 'Success'
      });

      const { getByTestId } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const dashboardButton = getByTestId('role-selection-screen-dashboard-button');
        fireEvent.press(dashboardButton);
      });

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith('RoleDashboard');
      });
    });
  });

  describe('Multiple Roles Display', () => {
    it('should display available roles with proper configuration', async () => {
      const { getByText, getByTestId } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('Select Your Role')).toBeTruthy();
        expect(getByText('Choose how you want to use MyFarmstand')).toBeTruthy();
        expect(getByText('Currently: Customer')).toBeTruthy();
        
        expect(getByTestId('role-selection-screen-role-customer')).toBeTruthy();
        expect(getByTestId('role-selection-screen-role-farmer')).toBeTruthy();
        
        expect(getByText('Customer')).toBeTruthy();
        expect(getByText('Shop for fresh produce and place orders')).toBeTruthy();
        expect(getByText('Farmer')).toBeTruthy();
        expect(getByText('Manage your farm products and fulfill orders')).toBeTruthy();
      });
    });

    it('should mark current role as active', async () => {
      const { getByText } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('CURRENT')).toBeTruthy();
      });
    });

    it('should display role permissions preview', async () => {
      const { getByText } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('Permissions:')).toBeTruthy();
        expect(getByText('• view:products')).toBeTruthy();
        expect(getByText('• manage:cart')).toBeTruthy();
        expect(getByText('• view:orders')).toBeTruthy();
      });
    });

    it('should handle roles with many permissions', async () => {
      const manyPermissions = Array.from({ length: 10 }, (_, i) => ({
        permission_name: `permission:${i}`
      }));
      
      mockRolePermissionService.getRolePermissions.mockResolvedValue({
        success: true,
        data: manyPermissions,
        message: 'Success'
      });

      const { getByText } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('+7 more')).toBeTruthy();
      });
    });

    it('should display unavailable roles appropriately', async () => {
      const unavailableRoles = [
        { ...mockUserRoles[0], is_active: true },
        { ...mockUserRoles[1], is_active: false }, // Farmer unavailable
      ];

      mockRolePermissionService.getUserRoles.mockResolvedValue({
        success: true,
        data: unavailableRoles,
        message: 'Success'
      });

      const { getByText } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('This role is currently unavailable')).toBeTruthy();
      });
    });
  });

  describe('Role Selection and Switching', () => {
    it('should navigate to dashboard when selecting current role', async () => {
      const { getByTestId } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const customerRole = getByTestId('role-selection-screen-role-customer');
        fireEvent.press(customerRole);
      });

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith('RoleDashboard');
      });
    });

    it('should show confirmation modal when selecting different role', async () => {
      const { getByTestId } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const farmerRole = getByTestId('role-selection-screen-role-farmer');
        fireEvent.press(farmerRole);
      });

      await waitFor(() => {
        expect(getByTestId('role-selection-screen-confirmation-modal')).toBeTruthy();
        expect(getByTestId('role-selection-screen-cancel-switch')).toBeTruthy();
        expect(getByTestId('role-selection-screen-confirm-switch')).toBeTruthy();
      });
    });

    it('should cancel role switch when cancel button pressed', async () => {
      const { getByTestId, queryByTestId } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const farmerRole = getByTestId('role-selection-screen-role-farmer');
        fireEvent.press(farmerRole);
      });

      await waitFor(() => {
        const cancelButton = getByTestId('role-selection-screen-cancel-switch');
        fireEvent.press(cancelButton);
      });

      await waitFor(() => {
        expect(queryByTestId('role-selection-screen-confirmation-modal')).toBeFalsy();
      });
    });

    it('should successfully switch role when confirmed', async () => {
      const mockRefetch = jest.fn().mockResolvedValue(undefined);
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'customer',
          userId: 'user-123',
        },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      const { getByTestId } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const farmerRole = getByTestId('role-selection-screen-role-farmer');
        fireEvent.press(farmerRole);
      });

      await waitFor(() => {
        const confirmButton = getByTestId('role-selection-screen-confirm-switch');
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(mockRolePermissionService.switchUserRole).toHaveBeenCalledWith('user-123', 'farmer');
        expect(mockRefetch).toHaveBeenCalled();
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'RoleSelectionScreen',
          pattern: 'role_switching',
          operation: 'confirmRoleSwitch'
        });
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

    it('should handle role switch errors gracefully', async () => {
      mockRolePermissionService.switchUserRole.mockResolvedValue({
        success: false,
        data: null,
        message: 'Switch failed: insufficient permissions'
      });

      const { getByTestId } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const farmerRole = getByTestId('role-selection-screen-role-farmer');
        fireEvent.press(farmerRole);
      });

      await waitFor(() => {
        const confirmButton = getByTestId('role-selection-screen-confirm-switch');
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
          context: 'RoleSelectionScreen.confirmRoleSwitch',
          errorMessage: 'Switch failed: insufficient permissions',
          errorCode: 'ROLE_SWITCH_FAILED'
        });
        expect(Alert.alert).toHaveBeenCalledWith(
          'Switch Failed',
          'Switch failed: insufficient permissions',
          [{ text: 'OK' }]
        );
      });
    });

    it('should not allow selection of unavailable roles', async () => {
      const unavailableRoles = [
        { ...mockUserRoles[0], is_active: true },
        { ...mockUserRoles[1], is_active: false },
      ];

      mockRolePermissionService.getUserRoles.mockResolvedValue({
        success: true,
        data: unavailableRoles,
        message: 'Success'
      });

      const { getByTestId, queryByTestId } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const farmerRole = getByTestId('role-selection-screen-role-farmer');
        fireEvent.press(farmerRole);
      });

      // Should not show confirmation modal for unavailable role
      expect(queryByTestId('role-selection-screen-confirmation-modal')).toBeFalsy();
    });
  });

  describe('Permission Loading and Error Handling', () => {
    it('should handle permission loading errors gracefully', async () => {
      mockRolePermissionService.getRolePermissions.mockRejectedValue(
        new Error('Permission service error')
      );

      const { getByText } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('Customer')).toBeTruthy();
        // Should still show roles even if permissions fail to load
      });

      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'RoleSelectionScreen.loadRolePermissions',
        errorMessage: 'Permission service error',
        errorCode: 'ROLE_PERMISSIONS_LOAD_FAILED'
      });
    });

    it('should show empty permissions list when permission loading fails', async () => {
      mockRolePermissionService.getRolePermissions.mockResolvedValue({
        success: false,
        data: null,
        message: 'Failed to load permissions'
      });

      const { getByText, queryByText } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('Permissions:')).toBeTruthy();
        // Should not show any permission items
        expect(queryByText('• view:products')).toBeFalsy();
      });
    });
  });

  describe('Navigation and Footer Actions', () => {
    it('should navigate to current dashboard when footer button pressed', async () => {
      const { getByTestId } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const dashboardButton = getByTestId('role-selection-screen-current-dashboard-button');
        fireEvent.press(dashboardButton);
      });

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith('RoleDashboard');
      });
    });

    it('should handle dashboard navigation errors by falling back to RoleDashboard', async () => {
      const mockGetDefaultScreen = jest.fn().mockRejectedValue(new Error('Navigation error'));
      mockUseRoleNavigation.mockReturnValue({
        ...mockUseRoleNavigation(),
        getDefaultScreen: mockGetDefaultScreen,
      });

      const { getByTestId } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const dashboardButton = getByTestId('role-selection-screen-current-dashboard-button');
        fireEvent.press(dashboardButton);
      });

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith('RoleDashboard');
      });
    });
  });

  describe('Retry Functionality', () => {
    it('should retry loading when retry button pressed', async () => {
      const mockRefetch = jest.fn().mockResolvedValue(undefined);
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Connection failed'),
        refetch: mockRefetch,
      });

      const { getByTestId } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      const retryButton = getByTestId('role-selection-screen-retry-button');
      
      await act(async () => {
        fireEvent.press(retryButton);
      });

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
        expect(mockRolePermissionService.getUserRoles).toHaveBeenCalled();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to tablet screen sizes', async () => {
      // Mock tablet dimensions
      const Dimensions = require('react-native/Libraries/Utilities/Dimensions');
      Dimensions.get.mockReturnValue({ width: 1024, height: 768 });

      const { container } = render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(container).toBeTruthy();
        // Tablet-specific styles would be applied
      });
    });
  });

  describe('Analytics Tracking', () => {
    it('should track successful role data loading', async () => {
      render(
        <RoleSelectionScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'RoleSelectionScreen',
          pattern: 'data_loading',
          operation: 'loadAvailableRoles'
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should provide proper test IDs for automation', async () => {
      const { getByTestId } = render(
        <RoleSelectionScreen testID="custom-role-selection" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('custom-role-selection')).toBeTruthy();
      });
    });
  });
});