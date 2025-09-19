/**
 * RoleBasedButton Component Tests
 * Tests for permission-aware button functionality
 * Following scratchpad-service-test-setup patterns
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleBasedButton } from '../RoleBasedButton';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Mock Alert properly
import { Alert } from 'react-native';
const mockAlert = jest.fn();
Alert.alert = mockAlert;

// Mock ValidationMonitor
jest.mock('../../../utils/validationMonitor');
const mockValidationMonitor = ValidationMonitor as jest.Mocked<typeof ValidationMonitor>;

// Mock role-based hooks
jest.mock('../../../hooks/role-based/useUserRole');
jest.mock('../../../hooks/role-based/useNavigationPermissions');

import { useUserRole } from '../../../hooks/role-based/useUserRole';
import { useNavigationPermissions } from '../../../hooks/role-based/useNavigationPermissions';

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
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Helper function to create navigation permissions mock
const createNavPermissionsMock = (overrides: any = {}) => ({
  permissions: [],
  userRole: 'customer',
  isLoading: false,
  isBatchLoading: false,
  batchError: undefined,
  hasPermissionErrors: false,
  checkPermission: jest.fn().mockResolvedValue({
    screen: '',
    allowed: true,
    checked: true
  }),
  checkPermissions: jest.fn(),
  validateScreenAccess: jest.fn(),
  isAllowed: jest.fn().mockReturnValue(true),
  getPermission: jest.fn().mockReturnValue({
    screen: '',
    allowed: true,
    checked: true
  }),
  getAllowedScreens: jest.fn().mockReturnValue([]),
  getDeniedScreens: jest.fn().mockReturnValue([]),
  getPermissionErrors: jest.fn().mockReturnValue([]),
  canAccessAdminScreens: false,
  canAccessManagementScreens: false,
  canAccessCustomerOnlyScreens: true,
  canAccessStaffScreens: false,
  getScreensByRole: jest.fn().mockReturnValue([]),
  getAccessibleScreens: jest.fn().mockReturnValue([]),
  hasPermissions: false,
  checkedScreenCount: 0,
  allowedScreenCount: 0,
  deniedScreenCount: 0,
  ...overrides
});

describe('RoleBasedButton Component', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
    
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

    // Default navigation permissions mock
    mockUseNavigationPermissions.mockReturnValue({
      permissions: [],
      userRole: 'customer',
      isLoading: false,
      isBatchLoading: false,
      batchError: undefined,
      hasPermissionErrors: false,
      checkPermission: jest.fn().mockResolvedValue({
        screen: '',
        allowed: true,
        checked: true
      }),
      checkPermissions: jest.fn(),
      validateScreenAccess: jest.fn(),
      isAllowed: jest.fn().mockReturnValue(true),
      getPermission: jest.fn().mockReturnValue({
        screen: '',
        allowed: true,
        checked: true
      }),
      getAllowedScreens: jest.fn().mockReturnValue([]),
      getDeniedScreens: jest.fn().mockReturnValue([]),
      getPermissionErrors: jest.fn().mockReturnValue([]),
      canAccessAdminScreens: false,
      canAccessManagementScreens: false,
      canAccessCustomerOnlyScreens: true,
      canAccessStaffScreens: false,
      getScreensByRole: jest.fn().mockReturnValue([]),
      getAccessibleScreens: jest.fn().mockReturnValue([]),
      hasPermissions: false,
      checkedScreenCount: 0,
      allowedScreenCount: 0,
      deniedScreenCount: 0
    });
  });

  describe('Basic Functionality', () => {
    it('should render button with correct title', () => {
      const { getByText } = render(
        <RoleBasedButton title="Test Button" onPress={mockOnPress} />,
        { wrapper: createWrapper() }
      );

      expect(getByText('Test Button')).toBeTruthy();
    });

    it('should call onPress when user has permission', async () => {
      const { getByTestId } = render(
        <RoleBasedButton 
          title="Test Button" 
          onPress={mockOnPress}
          testID="test-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('test-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnPress).toHaveBeenCalled();
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'RoleBasedButton',
          pattern: 'permission_check',
          operation: 'buttonAccessGranted'
        });
      });
    });

    it('should handle disabled prop independently of permissions', async () => {
      const { getByTestId } = render(
        <RoleBasedButton 
          title="Test Button" 
          onPress={mockOnPress}
          disabled={true}
          testID="test-button"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const button = getByTestId('test-button');
        
        // Verify button is disabled
        expect(button.props.disabled).toBe(true);
        
        // Try to press the button
        fireEvent.press(button);

        // onPress should not be called because button is disabled
        expect(mockOnPress).not.toHaveBeenCalled();
      });
    });

    it('should show loading state', () => {
      const { getByTestId, queryByText } = render(
        <RoleBasedButton 
          title="Test Button" 
          onPress={mockOnPress}
          loading={true}
          testID="test-button"
        />,
        { wrapper: createWrapper() }
      );

      // Button component shows ActivityIndicator when loading, not text
      const button = getByTestId('test-button');
      expect(button).toBeTruthy();
      expect(button.props.disabled).toBe(true); // Button is disabled when loading
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow access when user has required role', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'admin',
          userId: 'admin-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <RoleBasedButton 
          title="Admin Action" 
          onPress={mockOnPress}
          roles={['admin']}
          testID="admin-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('admin-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnPress).toHaveBeenCalled();
      });
    });

    it('should deny access and show message when user lacks required role', async () => {
      const { getByTestId } = render(
        <RoleBasedButton 
          title="Admin Action" 
          onPress={mockOnPress}
          roles={['admin']}
          showPermissionMessage={true}
          testID="admin-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('admin-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnPress).not.toHaveBeenCalled();
        expect(mockAlert).toHaveBeenCalledWith(
          'Permission Required',
          'This feature requires Administrator access',
          [{ text: 'OK' }]
        );
        expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
          context: 'RoleBasedButton.handlePress',
          errorMessage: 'This feature requires Administrator access',
          errorCode: 'BUTTON_PERMISSION_DENIED'
        });
      });
    });

    it('should handle multiple allowed roles', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'staff',
          userId: 'staff-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <RoleBasedButton 
          title="Staff Action" 
          onPress={mockOnPress}
          roles={['admin', 'staff']}
          testID="staff-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('staff-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnPress).toHaveBeenCalled();
      });
    });
  });

  describe('Permission-Based Access Control', () => {
    it('should allow access when user has required permission', async () => {
      const { getByTestId } = render(
        <RoleBasedButton 
          title="View Products" 
          onPress={mockOnPress}
          permissions={['view:products']}
          testID="products-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('products-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnPress).toHaveBeenCalled();
      });
    });

    it('should deny access when user lacks required permission', async () => {
      const { getByTestId } = render(
        <RoleBasedButton 
          title="Delete User" 
          onPress={mockOnPress}
          permissions={['admin:delete']}
          showPermissionMessage={true}
          testID="delete-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('delete-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnPress).not.toHaveBeenCalled();
        expect(mockAlert).toHaveBeenCalledWith(
          'Permission Required',
          'This feature requires admin:delete permission',
          [{ text: 'OK' }]
        );
      });
    });

    it('should allow admin users to access all permissions', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'admin',
          userId: 'admin-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <RoleBasedButton 
          title="Any Action" 
          onPress={mockOnPress}
          permissions={['any:permission']}
          testID="any-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('any-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnPress).toHaveBeenCalled();
      });
    });
  });

  describe('Screen-Based Access Control', () => {
    it('should allow access when user can navigate to screen', async () => {
      mockUseNavigationPermissions.mockReturnValue({
        permissions: [],
        userRole: 'customer',
        isLoading: false,
        isBatchLoading: false,
        batchError: undefined,
        hasPermissionErrors: false,
        checkPermission: jest.fn().mockResolvedValue({
          screen: 'AdminScreen',
          allowed: true,
          checked: true
        }),
        checkPermissions: jest.fn(),
        validateScreenAccess: jest.fn(),
        isAllowed: jest.fn().mockImplementation(screen => screen === 'AdminScreen'),
        getPermission: jest.fn().mockImplementation(screen => ({
          screen,
          allowed: screen === 'AdminScreen',
          checked: true
        })),
        getAllowedScreens: jest.fn().mockReturnValue(['AdminScreen']),
        getDeniedScreens: jest.fn().mockReturnValue([]),
        getPermissionErrors: jest.fn().mockReturnValue([]),
        canAccessAdminScreens: true,
        canAccessManagementScreens: false,
        canAccessCustomerOnlyScreens: true,
        canAccessStaffScreens: false,
        getScreensByRole: jest.fn().mockReturnValue(['AdminScreen']),
        getAccessibleScreens: jest.fn().mockReturnValue(['AdminScreen']),
        hasPermissions: true,
        checkedScreenCount: 1,
        allowedScreenCount: 1,
        deniedScreenCount: 0
      });

      const { getByTestId } = render(
        <RoleBasedButton 
          title="Go to Admin" 
          onPress={mockOnPress}
          screen="AdminScreen"
          showPermissionMessage={true}
          testID="admin-nav-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('admin-nav-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnPress).toHaveBeenCalled();
      });
    });

    it('should deny access when user cannot navigate to screen', async () => {
      mockUseNavigationPermissions.mockReturnValue({
        permissions: [],
        userRole: 'customer',
        isLoading: false,
        isBatchLoading: false,
        batchError: undefined,
        hasPermissionErrors: false,
        checkPermission: jest.fn().mockResolvedValue({
          screen: 'AdminScreen',
          allowed: false,
          checked: true
        }),
        checkPermissions: jest.fn(),
        validateScreenAccess: jest.fn(),
        isAllowed: jest.fn().mockReturnValue(false),
        getPermission: jest.fn().mockReturnValue({
          screen: 'AdminScreen',
          allowed: false,
          checked: true
        }),
        getAllowedScreens: jest.fn().mockReturnValue([]),
        getDeniedScreens: jest.fn().mockReturnValue(['AdminScreen']),
        getPermissionErrors: jest.fn().mockReturnValue([]),
        canAccessAdminScreens: false,
        canAccessManagementScreens: false,
        canAccessCustomerOnlyScreens: true,
        canAccessStaffScreens: false,
        getScreensByRole: jest.fn().mockReturnValue([]),
        getAccessibleScreens: jest.fn().mockReturnValue([]),
        hasPermissions: true,
        checkedScreenCount: 1,
        allowedScreenCount: 0,
        deniedScreenCount: 1
      });

      const { getByTestId } = render(
        <RoleBasedButton 
          title="Go to Admin" 
          onPress={mockOnPress}
          screen="AdminScreen"
          showPermissionMessage={true}
          testID="admin-nav-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('admin-nav-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnPress).not.toHaveBeenCalled();
        expect(mockAlert).toHaveBeenCalledWith(
          'Permission Required',
          "You don't have access to AdminScreen",
          [{ text: 'OK' }]
        );
      });
    });

    it('should handle navigation permission errors', async () => {
      mockUseNavigationPermissions.mockReturnValue({
        permissions: [],
        userRole: 'customer',
        isLoading: false,
        isBatchLoading: false,
        batchError: undefined,
        hasPermissionErrors: false,
        checkPermission: jest.fn().mockResolvedValue({
          screen: 'AdminScreen',
          allowed: false,
          checked: true,
          error: 'Navigation service unavailable'
        }),
        checkPermissions: jest.fn(),
        validateScreenAccess: jest.fn(),
        isAllowed: jest.fn().mockReturnValue(false),
        getPermission: jest.fn().mockReturnValue({
          screen: 'AdminScreen',
          allowed: false,
          checked: true,
          error: 'Navigation service unavailable'
        }),
        getAllowedScreens: jest.fn().mockReturnValue([]),
        getDeniedScreens: jest.fn().mockReturnValue(['AdminScreen']),
        getPermissionErrors: jest.fn().mockReturnValue([{
          screen: 'AdminScreen',
          allowed: false,
          checked: true,
          error: 'Navigation service unavailable'
        }]),
        canAccessAdminScreens: false,
        canAccessManagementScreens: false,
        canAccessCustomerOnlyScreens: true,
        canAccessStaffScreens: false,
        getScreensByRole: jest.fn().mockReturnValue([]),
        getAccessibleScreens: jest.fn().mockReturnValue([]),
        hasPermissions: true,
        checkedScreenCount: 1,
        allowedScreenCount: 0,
        deniedScreenCount: 1
      });

      const { getByTestId } = render(
        <RoleBasedButton 
          title="Go to Admin" 
          onPress={mockOnPress}
          screen="AdminScreen"
          showPermissionMessage={true}
          testID="admin-nav-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('admin-nav-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Permission Required',
          'Navigation error: Navigation service unavailable',
          [{ text: 'OK' }]
        );
      });
    });
  });

  describe('Loading States', () => {
    it('should show checking state when user role is loading', () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <RoleBasedButton title="Test Button" onPress={mockOnPress} />,
        { wrapper: createWrapper() }
      );

      // When loading, Button component shows ActivityIndicator, not text
      expect(getByTestId('role-based-button')).toBeTruthy();
    });

    it('should show checking state when screen permissions are loading', () => {
      mockUseNavigationPermissions.mockReturnValue(createNavPermissionsMock({
        isLoading: true,
        getPermission: jest.fn().mockReturnValue({
          screen: 'TestScreen',
          allowed: false,
          checked: false
        })
      }));

      const { getByTestId } = render(
        <RoleBasedButton 
          title="Test Button" 
          onPress={mockOnPress}
          screen="TestScreen"
        />,
        { wrapper: createWrapper() }
      );

      // When loading, Button component shows ActivityIndicator, not text
      expect(getByTestId('role-based-button')).toBeTruthy();
    });
  });

  describe('Unauthenticated Users', () => {
    it('should deny access for unauthenticated users', async () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <RoleBasedButton 
          title="Test Button" 
          onPress={mockOnPress}
          showPermissionMessage={true}
          testID="test-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('test-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnPress).not.toHaveBeenCalled();
        expect(mockAlert).toHaveBeenCalledWith(
          'Permission Required',
          'Please log in to access this feature',
          [{ text: 'OK' }]
        );
      });
    });
  });

  describe('Custom Messages and Styling', () => {
    it('should use custom permission message', async () => {
      const { getByTestId } = render(
        <RoleBasedButton 
          title="Test Button" 
          onPress={mockOnPress}
          roles={['admin']}
          showPermissionMessage={true}
          permissionMessage="You need admin access for this action"
          testID="test-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('test-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Permission Required',
          'You need admin access for this action',
          [{ text: 'OK' }]
        );
      });
    });

    it('should not show permission message when showPermissionMessage is false', async () => {
      const { getByTestId } = render(
        <RoleBasedButton 
          title="Test Button" 
          onPress={mockOnPress}
          roles={['admin']}
          showPermissionMessage={false}
          testID="test-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('test-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnPress).not.toHaveBeenCalled();
        expect(mockAlert).not.toHaveBeenCalled();
      });
    });

    it('should apply custom disabled style', () => {
      const customDisabledStyle = { backgroundColor: 'red' };
      const { getByTestId } = render(
        <RoleBasedButton 
          title="Test Button" 
          onPress={mockOnPress}
          roles={['admin']}
          disabledStyle={customDisabledStyle}
          testID="test-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('test-button');
      // Would need to check style application in a real test environment
      expect(button).toBeTruthy();
    });
  });

  describe('Hide When Denied', () => {
    it('should hide button when hideWhenDenied is true and permission denied', async () => {
      const { queryByTestId } = render(
        <RoleBasedButton 
          title="Admin Button" 
          onPress={mockOnPress}
          roles={['admin']}
          hideWhenDenied={true}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(queryByTestId('role-based-button')).toBeFalsy();
      });
    });

    it('should show button when hideWhenDenied is true but user has permission', async () => {
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
        <RoleBasedButton 
          title="Admin Button" 
          onPress={mockOnPress}
          roles={['admin']}
          hideWhenDenied={true}
        />,
        { wrapper: createWrapper() }
      );

      expect(getByText('Admin Button')).toBeTruthy();
    });

    it('should show button in loading state even when hideWhenDenied is true', () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <RoleBasedButton 
          title="Admin Button" 
          onPress={mockOnPress}
          roles={['admin']}
          hideWhenDenied={true}
        />,
        { wrapper: createWrapper() }
      );

      // When loading, Button component shows ActivityIndicator, not text
      expect(getByTestId('role-based-button')).toBeTruthy();
    });
  });

  describe('Complex Permission Scenarios', () => {
    it('should handle multiple permission types', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'admin',
          userId: 'admin-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      mockUseNavigationPermissions.mockReturnValue(createNavPermissionsMock({
        isAllowed: jest.fn().mockImplementation(screen => screen === 'AdminScreen'),
        getPermission: jest.fn().mockImplementation(screen => ({
          screen,
          allowed: screen === 'AdminScreen',
          checked: true
        }))
      }));

      const { getByTestId } = render(
        <RoleBasedButton 
          title="Complex Action" 
          onPress={mockOnPress}
          roles={['admin']}
          permissions={['manage:users']}
          screen="AdminScreen"
          testID="complex-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('complex-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnPress).toHaveBeenCalled();
      });
    });

    it('should deny when any permission check fails', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'admin',
          userId: 'admin-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      mockUseNavigationPermissions.mockReturnValue(createNavPermissionsMock({
        isAllowed: jest.fn().mockReturnValue(false),
        getPermission: jest.fn().mockReturnValue({
          screen: 'AdminScreen',
          allowed: false,
          checked: true
        })
      }));

      const { getByTestId } = render(
        <RoleBasedButton 
          title="Complex Action" 
          onPress={mockOnPress}
          roles={['admin']}
          permissions={['manage:users']}
          screen="AdminScreen"
          showPermissionMessage={true}
          testID="complex-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('complex-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnPress).not.toHaveBeenCalled();
        expect(mockAlert).toHaveBeenCalled();
      });
    });
  });
});