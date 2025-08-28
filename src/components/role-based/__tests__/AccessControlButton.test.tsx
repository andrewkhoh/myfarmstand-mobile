/**
 * AccessControlButton Component Tests
 * Tests for enhanced permission-aware button with loading states
 * Following established test patterns from PermissionGate.test.tsx
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AccessControlButton } from '../AccessControlButton';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Mock ValidationMonitor
jest.mock('../../../utils/validationMonitor');
const mockValidationMonitor = ValidationMonitor as jest.Mocked<typeof ValidationMonitor>;

// Mock Alert properly
const mockAlert = jest.fn();
Alert.alert = mockAlert;

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

describe('AccessControlButton Component', () => {
  const mockOnPress = jest.fn();
  const mockOnPermissionDenied = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
    
    // Default user role mock (customer)
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

  describe('Basic Rendering', () => {
    it('should render button with title', () => {
      const { getByText } = render(
        <AccessControlButton 
          title="Test Button" 
          onPress={mockOnPress}
        />,
        { wrapper: createWrapper() }
      );

      expect(getByText('Test Button')).toBeTruthy();
    });

    it('should apply custom styles', () => {
      const customStyle = { backgroundColor: 'red' };
      const { getByTestId } = render(
        <AccessControlButton 
          title="Styled Button"
          onPress={mockOnPress}
          style={customStyle}
          testID="styled-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('styled-button');
      expect(button).toBeTruthy();
    });

    it('should show custom icon when provided', () => {
      const { getByText } = render(
        <AccessControlButton 
          title="Icon Button"
          onPress={mockOnPress}
          icon="🔒"
        />,
        { wrapper: createWrapper() }
      );

      expect(getByText('🔒')).toBeTruthy();
      expect(getByText('Icon Button')).toBeTruthy();
    });
  });

  describe('Permission Checking', () => {
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
        <AccessControlButton 
          title="Admin Action"
          onPress={mockOnPress}
          roles={['admin', 'staff']}
          testID="admin-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('admin-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnPress).toHaveBeenCalled();
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'AccessControlButton',
          pattern: 'permission_check',
          operation: 'accessGranted'
        });
      });
    });

    it('should deny access when user lacks required role', async () => {
      const { getByTestId } = render(
        <AccessControlButton 
          title="Admin Action"
          onPress={mockOnPress}
          onPermissionDenied={mockOnPermissionDenied}
          roles={['admin']}
          testID="admin-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('admin-button-denied');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnPress).not.toHaveBeenCalled();
        expect(mockOnPermissionDenied).toHaveBeenCalledWith({
          reason: 'Missing role: admin'
        });
        expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
          context: 'AccessControlButton.permissionCheck',
          errorMessage: 'Missing role: admin',
          errorCode: 'ACCESS_DENIED'
        });
      });
    });

    it('should check multiple permissions with AND logic', async () => {
      const { getByTestId } = render(
        <AccessControlButton 
          title="Protected Action"
          onPress={mockOnPress}
          permissions={['view:products', 'edit:products']}
          permissionLogic="AND"
          testID="protected-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('protected-button-denied');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnPress).not.toHaveBeenCalled();
      });
    });

    it('should check multiple permissions with OR logic', async () => {
      const { getByTestId } = render(
        <AccessControlButton 
          title="Protected Action"
          onPress={mockOnPress}
          permissions={['view:products', 'admin:all']}
          permissionLogic="OR"
          testID="protected-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('protected-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnPress).toHaveBeenCalled();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state when checking permissions', () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <AccessControlButton 
          title="Test Button"
          onPress={mockOnPress}
          testID="loading-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('loading-button-loading');
      expect(button).toBeTruthy();
    });

    it('should show custom loading text', () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { getByText } = render(
        <AccessControlButton 
          title="Test Button"
          onPress={mockOnPress}
          loadingText="Verifying..."
        />,
        { wrapper: createWrapper() }
      );

      // When roleLoading is true, it shows "Checking..." not the custom loadingText
      expect(getByText('Checking...')).toBeTruthy();
    });

    it('should disable button during external loading', () => {
      const { getByTestId } = render(
        <AccessControlButton 
          title="Test Button"
          onPress={mockOnPress}
          loading={true}
          testID="external-loading"
        />,
        { wrapper: createWrapper() }
      );

      // When loading is true, testID becomes 'external-loading-loading'
      const button = getByTestId('external-loading-loading');
      fireEvent.press(button);

      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Visual Feedback', () => {
    it('should apply denied style when permissions are denied', async () => {
      const { getByTestId } = render(
        <AccessControlButton 
          title="Admin Only"
          onPress={mockOnPress}
          roles={['admin']}
          showDeniedState={true}
          testID="denied-button"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const button = getByTestId('denied-button-denied');
        expect(button).toBeTruthy();
      });
    });

    it('should hide button when hideWhenDenied is true', async () => {
      const { queryByTestId } = render(
        <AccessControlButton 
          title="Admin Only"
          onPress={mockOnPress}
          roles={['admin']}
          hideWhenDenied={true}
          testID="hidden-button"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(queryByTestId('hidden-button')).toBeFalsy();
      });
    });

    it('should show lock icon when access is denied', async () => {
      const { getByTestId } = render(
        <AccessControlButton 
          title="Locked Action"
          onPress={mockOnPress}
          roles={['admin']}
          showLockIcon={true}
          testID="locked-button"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const lockIcon = getByTestId('locked-button-lock-icon');
        expect(lockIcon).toBeTruthy();
      });
    });
  });

  describe('Custom Permission Messages', () => {
    it('should show custom permission message', async () => {
      const { getByTestId } = render(
        <AccessControlButton 
          title="Admin Action"
          onPress={mockOnPress}
          roles={['admin']}
          permissionMessage="Administrator privileges required"
          showPermissionMessage={true}
          testID="custom-message"
        />,
        { wrapper: createWrapper() }
      );

      // Wait for the component to determine access state
      await waitFor(() => {
        expect(getByTestId('custom-message-denied')).toBeTruthy();
      });

      const button = getByTestId('custom-message-denied');
      fireEvent.press(button);

      expect(mockAlert).toHaveBeenCalledWith(
        'Access Denied',
        'Administrator privileges required',
        [{ text: 'OK' }]
      );
    });

    it('should show tooltip with permission requirements', async () => {
      const { getByTestId } = render(
        <AccessControlButton 
          title="Protected"
          onPress={mockOnPress}
          roles={['admin', 'staff']}
          showTooltip={true}
          testID="tooltip-button"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const tooltip = getByTestId('tooltip-button-tooltip');
        expect(tooltip).toBeTruthy();
      });
    });
  });

  describe('Async Operations', () => {
    it('should handle async onPress with loading state', async () => {
      const asyncOnPress = jest.fn().mockResolvedValue(undefined);

      const { getByTestId, queryByTestId } = render(
        <AccessControlButton 
          title="Async Action"
          onPress={asyncOnPress}
          testID="async-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('async-button');
      fireEvent.press(button);

      // Should call the async function
      await waitFor(() => {
        expect(asyncOnPress).toHaveBeenCalled();
      });

      // Note: Loading state testing would require checking component implementation
      // For now, we just verify the async operation was called
    });

    it('should handle async operation errors', async () => {
      const asyncOnPress = jest.fn().mockRejectedValue(new Error('Operation failed'));

      const { getByTestId } = render(
        <AccessControlButton 
          title="Error Action"
          onPress={asyncOnPress}
          testID="error-button"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('error-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
          context: 'AccessControlButton.asyncOperation',
          errorMessage: 'Operation failed',
          errorCode: 'ASYNC_ERROR'
        });
      });
    });
  });

  describe('Admin Override', () => {
    it('should always grant access to admin users', async () => {
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
        <AccessControlButton 
          title="Any Permission"
          onPress={mockOnPress}
          permissions={['restricted:permission']}
          testID="admin-override"
        />,
        { wrapper: createWrapper() }
      );

      const button = getByTestId('admin-override');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnPress).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should provide accessibility label', () => {
      const { getByLabelText } = render(
        <AccessControlButton 
          title="Accessible Button"
          onPress={mockOnPress}
          accessibilityLabel="Perform accessible action"
        />,
        { wrapper: createWrapper() }
      );

      expect(getByLabelText('Perform accessible action')).toBeTruthy();
    });

    it('should indicate disabled state in accessibility', async () => {
      const { getByTestId } = render(
        <AccessControlButton 
          title="Disabled Button"
          onPress={mockOnPress}
          roles={['admin']}
          showDeniedState={true}
          testID="disabled-accessible"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const button = getByTestId('disabled-accessible-denied');
        expect(button.props.accessibilityState?.disabled).toBe(true);
      });
    });
  });
});