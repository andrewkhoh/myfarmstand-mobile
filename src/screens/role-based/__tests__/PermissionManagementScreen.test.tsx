/**
 * PermissionManagementScreen Tests
 * Tests for admin permission management interface
 * Following scratchpad-service-test-setup patterns
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { PermissionManagementScreen } from '../PermissionManagementScreen';
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
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
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

// Mock role-based hooks
jest.mock('../../../hooks/role-based/useUserRole');

import { useUserRole } from '../../../hooks/role-based/useUserRole';

const mockUseUserRole = useUserRole as jest.MockedFunction<typeof useUserRole>;

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

describe('PermissionManagementScreen', () => {
  const mockUsersData = [
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
    },
    {
      user_id: 'user-2',
      email: 'farmer@example.com',
      name: 'Farmer User',
      roles: [
        {
          role_type: 'farmer',
          is_active: true,
          assigned_at: '2025-08-23T00:00:00Z',
        },
        {
          role_type: 'customer',
          is_active: false,
          assigned_at: '2025-08-20T00:00:00Z',
        }
      ],
      last_activity: '2025-08-23T08:00:00Z',
    },
  ];

  const mockPermissions = [
    { permission_name: 'view:products', description: 'View products' },
    { permission_name: 'manage:cart', description: 'Manage shopping cart' },
    { permission_name: 'view:orders', description: 'View orders' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default admin user
    mockUseUserRole.mockReturnValue({
      data: {
        role: 'admin',
        userId: 'admin-123',
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    // Default service mocks
    mockRolePermissionService.getAllUsersWithRoles.mockResolvedValue({
      success: true,
      data: mockUsersData,
      message: 'Success'
    });

    mockRolePermissionService.getRolePermissions.mockResolvedValue({
      success: true,
      data: mockPermissions,
      message: 'Success'
    });

    mockRolePermissionService.assignUserRole.mockResolvedValue({
      success: true,
      data: null,
      message: 'Role assigned successfully'
    });

    mockRolePermissionService.removeUserRole.mockResolvedValue({
      success: true,
      data: null,
      message: 'Role removed successfully'
    });
  });

  describe('Authentication and Authorization', () => {
    it('should show loading state when user role is loading', () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, getByText } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('permission-management-screen-loading')).toBeTruthy();
      expect(getByText('Loading permission management...')).toBeTruthy();
    });

    it('should show access denied for non-admin users', () => {
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
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('permission-management-screen-access-denied')).toBeTruthy();
      expect(getByText('Access Denied')).toBeTruthy();
      expect(getByText('You need administrator privileges to access permission management.')).toBeTruthy();
      expect(getByTestId('permission-management-screen-go-back-button')).toBeTruthy();
    });

    it('should handle go back button press for non-admin users', async () => {
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
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      const goBackButton = getByTestId('permission-management-screen-go-back-button');
      fireEvent.press(goBackButton);

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('should show error state for admin user errors', () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'admin',
          userId: 'admin-123',
        },
        isLoading: false,
        error: new Error('Admin authentication failed'),
        refetch: jest.fn(),
      });

      const { getByTestId, getByText } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('permission-management-screen-error')).toBeTruthy();
      expect(getByText('Permission Management Error')).toBeTruthy();
      expect(getByText('Admin authentication failed')).toBeTruthy();
      expect(getByTestId('permission-management-screen-retry-button')).toBeTruthy();
    });
  });

  describe('Users View', () => {
    it('should display users list in default view', async () => {
      const { getByText, getByTestId } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('Permission Management')).toBeTruthy();
        expect(getByText('Manage user roles and permissions')).toBeTruthy();
        expect(getByTestId('permission-management-screen-users-list')).toBeTruthy();
      });
    });

    it('should display user information correctly', async () => {
      const { getByText, getByTestId } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('Customer User')).toBeTruthy();
        expect(getByText('customer@example.com')).toBeTruthy();
        expect(getByText('Farmer User')).toBeTruthy();
        expect(getByText('farmer@example.com')).toBeTruthy();
        
        expect(getByTestId('permission-management-screen-user-user-1')).toBeTruthy();
        expect(getByTestId('permission-management-screen-user-user-2')).toBeTruthy();
      });
    });

    it('should show user roles with proper styling', async () => {
      const { getByText, getByTestId } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('🛍️ Customer')).toBeTruthy();
        expect(getByText('🌾 Farmer')).toBeTruthy();
        expect(getByText('(Inactive)')).toBeTruthy();
        
        expect(getByTestId('permission-management-screen-user-role-user-1-customer')).toBeTruthy();
        expect(getByTestId('permission-management-screen-user-role-user-2-farmer')).toBeTruthy();
      });
    });

    it('should handle user search functionality', async () => {
      const { getByTestId, getByText, queryByText } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('Customer User')).toBeTruthy();
        expect(getByText('Farmer User')).toBeTruthy();
      });

      const searchInput = getByTestId('permission-management-screen-search-input');
      fireEvent.changeText(searchInput, 'customer');

      await waitFor(() => {
        expect(getByText('Customer User')).toBeTruthy();
        expect(queryByText('Farmer User')).toBeFalsy();
      });
    });

    it('should expand/collapse user details on press', async () => {
      const { getByTestId, queryByText } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(queryByText('Manage Roles:')).toBeFalsy();
      });

      const userCard = getByTestId('permission-management-screen-user-user-1');
      fireEvent.press(userCard);

      await waitFor(() => {
        expect(queryByText('Manage Roles:')).toBeTruthy();
      });

      // Press again to collapse
      fireEvent.press(userCard);

      await waitFor(() => {
        expect(queryByText('Manage Roles:')).toBeFalsy();
      });
    });
  });

  describe('Role Management Functionality', () => {
    it('should handle role assignment successfully', async () => {
      const { getByTestId } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const userCard = getByTestId('permission-management-screen-user-user-1');
        fireEvent.press(userCard);
      });

      await waitFor(() => {
        const assignButton = getByTestId('permission-management-screen-role-action-user-1-farmer');
        fireEvent.press(assignButton);
      });

      await waitFor(() => {
        expect(mockRolePermissionService.assignUserRole).toHaveBeenCalledWith('user-1', 'farmer');
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'PermissionManagementScreen',
          pattern: 'role_management',
          operation: 'assignRole'
        });
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'User role assigned successfully',
          [{ text: 'OK' }]
        );
      });
    });

    it('should handle role removal successfully', async () => {
      const { getByTestId } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const userCard = getByTestId('permission-management-screen-user-user-1');
        fireEvent.press(userCard);
      });

      await waitFor(() => {
        const removeButton = getByTestId('permission-management-screen-role-action-user-1-customer');
        fireEvent.press(removeButton);
      });

      await waitFor(() => {
        expect(mockRolePermissionService.removeUserRole).toHaveBeenCalledWith('user-1', 'customer');
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'PermissionManagementScreen',
          pattern: 'role_management',
          operation: 'removeRole'
        });
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'User role removed successfully',
          [{ text: 'OK' }]
        );
      });
    });

    it('should handle role assignment errors gracefully', async () => {
      mockRolePermissionService.assignUserRole.mockResolvedValue({
        success: false,
        data: null,
        message: 'Insufficient permissions'
      });

      const { getByTestId } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const userCard = getByTestId('permission-management-screen-user-user-1');
        fireEvent.press(userCard);
      });

      await waitFor(() => {
        const assignButton = getByTestId('permission-management-screen-role-action-user-1-farmer');
        fireEvent.press(assignButton);
      });

      await waitFor(() => {
        expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
          context: 'PermissionManagementScreen.handleUserRoleToggle',
          errorMessage: 'Insufficient permissions',
          errorCode: 'USER_ROLE_TOGGLE_FAILED'
        });
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Insufficient permissions',
          [{ text: 'OK' }]
        );
      });
    });
  });

  describe('Permissions View', () => {
    it('should switch to permissions view', async () => {
      const { getByTestId } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      const permissionsButton = getByTestId('permission-management-screen-view-permissions');
      fireEvent.press(permissionsButton);

      await waitFor(() => {
        expect(getByTestId('permission-management-screen-permissions-list')).toBeTruthy();
      });
    });

    it('should display role permissions correctly', async () => {
      const { getByTestId, getByText } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      const permissionsButton = getByTestId('permission-management-screen-view-permissions');
      fireEvent.press(permissionsButton);

      await waitFor(() => {
        expect(getByText('🛍️ Customer')).toBeTruthy();
        expect(getByText('🌾 Farmer')).toBeTruthy();
        expect(getByText('⚙️ Administrator')).toBeTruthy();
        expect(getByText('view:products')).toBeTruthy();
        expect(getByText('manage:cart')).toBeTruthy();
        expect(getByText('view:orders')).toBeTruthy();
        
        expect(getByTestId('permission-management-screen-role-permissions-customer')).toBeTruthy();
        expect(getByTestId('permission-management-screen-role-permissions-farmer')).toBeTruthy();
      });
    });

    it('should not show search bar in permissions view', async () => {
      const { getByTestId, queryByTestId } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('permission-management-screen-search-input')).toBeTruthy();

      const permissionsButton = getByTestId('permission-management-screen-view-permissions');
      fireEvent.press(permissionsButton);

      await waitFor(() => {
        expect(queryByTestId('permission-management-screen-search-input')).toBeFalsy();
      });
    });
  });

  describe('Data Loading and Error Handling', () => {
    it('should show loading state for users list', async () => {
      mockRolePermissionService.getAllUsersWithRoles.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { getByText } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('Loading users...')).toBeTruthy();
      });
    });

    it('should handle users loading errors gracefully', async () => {
      mockRolePermissionService.getAllUsersWithRoles.mockRejectedValue(
        new Error('Service unavailable')
      );

      render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Loading Error',
          'Failed to load user data. Please try again.',
          [{ text: 'OK' }]
        );
        expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
          context: 'PermissionManagementScreen.loadUsers',
          errorMessage: 'Service unavailable',
          errorCode: 'USERS_LOAD_FAILED'
        });
      });
    });

    it('should show loading state for permissions list', async () => {
      mockRolePermissionService.getRolePermissions.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { getByTestId, getByText } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      const permissionsButton = getByTestId('permission-management-screen-view-permissions');
      fireEvent.press(permissionsButton);

      await waitFor(() => {
        expect(getByText('Loading permissions...')).toBeTruthy();
      });
    });

    it('should handle permissions loading errors gracefully', async () => {
      mockRolePermissionService.getRolePermissions.mockRejectedValue(
        new Error('Permission service error')
      );

      const { getByTestId } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      const permissionsButton = getByTestId('permission-management-screen-view-permissions');
      fireEvent.press(permissionsButton);

      await waitFor(() => {
        expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
          context: 'PermissionManagementScreen.loadRolePermissions',
          errorMessage: 'Permission service error',
          errorCode: 'ROLE_PERMISSIONS_LOAD_FAILED'
        });
      });
    });

    it('should show empty state when no users found', async () => {
      mockRolePermissionService.getAllUsersWithRoles.mockResolvedValue({
        success: true,
        data: [],
        message: 'Success'
      });

      const { getByTestId, getByText } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-management-screen-empty-users')).toBeTruthy();
        expect(getByText('No Users Found')).toBeTruthy();
        expect(getByText('No users available')).toBeTruthy();
      });
    });

    it('should show empty state for search results', async () => {
      const { getByTestId, getByText } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const searchInput = getByTestId('permission-management-screen-search-input');
        fireEvent.changeText(searchInput, 'nonexistent');
      });

      await waitFor(() => {
        expect(getByText('No users match your search criteria')).toBeTruthy();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should handle pull to refresh in users view', async () => {
      const mockRefreshUsers = jest.fn().mockResolvedValue(undefined);
      mockRolePermissionService.getAllUsersWithRoles.mockImplementation(mockRefreshUsers);

      const { getByTestId } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      const refreshControl = getByTestId('permission-management-screen-refresh-control');
      
      await act(async () => {
        fireEvent(refreshControl, 'refresh');
      });

      await waitFor(() => {
        expect(mockRefreshUsers).toHaveBeenCalled();
      });
    });

    it('should handle pull to refresh in permissions view', async () => {
      const mockRefreshPermissions = jest.fn().mockResolvedValue({ success: true, data: [], message: 'Success' });
      mockRolePermissionService.getRolePermissions.mockImplementation(mockRefreshPermissions);

      const { getByTestId } = render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      const permissionsButton = getByTestId('permission-management-screen-view-permissions');
      fireEvent.press(permissionsButton);

      await waitFor(() => {
        const refreshControl = getByTestId('permission-management-screen-permissions-refresh-control');
        fireEvent(refreshControl, 'refresh');
      });

      await waitFor(() => {
        expect(mockRefreshPermissions).toHaveBeenCalled();
      });
    });

    it('should handle retry button press', async () => {
      const mockRefetch = jest.fn().mockResolvedValue(undefined);
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
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      const retryButton = getByTestId('permission-management-screen-retry-button');
      
      await act(async () => {
        fireEvent.press(retryButton);
      });

      // Should trigger both user refresh and data refresh
      await waitFor(() => {
        expect(mockRolePermissionService.getAllUsersWithRoles).toHaveBeenCalled();
        expect(mockRolePermissionService.getRolePermissions).toHaveBeenCalled();
      });
    });
  });

  describe('Screen Focus Analytics', () => {
    it('should track screen focus for admin users', async () => {
      render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'PermissionManagementScreen',
          pattern: 'screen_focus',
          operation: 'permissionManagementView'
        });
      });
    });

    it('should track successful data loading', async () => {
      render(
        <PermissionManagementScreen />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'PermissionManagementScreen',
          pattern: 'data_loading',
          operation: 'loadUsers'
        });
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'PermissionManagementScreen',
          pattern: 'data_loading',
          operation: 'loadRolePermissions'
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should provide proper test IDs for automation', async () => {
      const { getByTestId } = render(
        <PermissionManagementScreen testID="custom-permission-management" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('custom-permission-management')).toBeTruthy();
        expect(getByTestId('custom-permission-management-view-users')).toBeTruthy();
        expect(getByTestId('custom-permission-management-view-permissions')).toBeTruthy();
        expect(getByTestId('custom-permission-management-search-input')).toBeTruthy();
      });
    });
  });
});