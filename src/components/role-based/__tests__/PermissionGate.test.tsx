/**
 * PermissionGate Component Tests
 * Tests for permission-based content gating
 * Following scratchpad-service-test-setup patterns
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { RNText as RNRNText } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PermissionGate } from '../PermissionGate';
import { ValidationMonitor } from '../../../utils/validationMonitor';

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

const TestContent = () => <RNText>Protected Content</RNText>;

describe('PermissionGate Component', () => {
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

  describe('Loading States', () => {
    it('should show loading state when user role is loading', () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, getByRNText } = render(
        <PermissionGate>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('permission-gate-loading')).toBeTruthy();
      expect(getByRNText('Checking permissions...')).toBeTruthy();
    });

    it('should show loading state when screen permissions are being checked', () => {
      const basePermissions = {
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
        getPermission: jest.fn().mockReturnValue(null),
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
      };
      
      mockUseNavigationPermissions.mockReturnValue({
        ...basePermissions,
        isLoading: true,
        getPermission: jest.fn().mockReturnValue(null)
      });

      const { getByTestId } = render(
        <PermissionGate screen="TestScreen">
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('permission-gate-loading')).toBeTruthy();
    });

    it('should use custom loading component when provided', () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const CustomLoading = () => <RNText>Custom Loading...</RNText>;

      const { getByRNText } = render(
        <PermissionGate loadingComponent={CustomLoading}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      expect(getByRNText('Custom Loading...')).toBeTruthy();
    });

    it('should not show loading when showLoading is false', () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { queryByTestId } = render(
        <PermissionGate showLoading={false}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      expect(queryByTestId('permission-gate-loading')).toBeFalsy();
      expect(queryByTestId('permission-gate-denied')).toBeTruthy();
    });
  });

  describe('Permission Checks', () => {
    it('should grant access when user has required role', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'admin',
          userId: 'admin-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, getByRNText } = render(
        <PermissionGate roles={['admin', 'staff']}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-granted')).toBeTruthy();
        expect(getByRNText('Protected Content')).toBeTruthy();
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'PermissionGate',
          pattern: 'permission_check',
          operation: 'accessGranted'
        });
      });
    });

    it('should deny access when user lacks required role', async () => {
      const { getByTestId, getByRNText } = render(
        <PermissionGate roles={['admin', 'staff']}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-denied')).toBeTruthy();
        expect(getByRNText('Access Denied')).toBeTruthy();
        expect(getByRNText('Required role: admin or staff')).toBeTruthy();
        expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
          context: 'PermissionGate.permissionCheck',
          errorMessage: 'Required role: admin or staff',
          errorCode: 'PERMISSION_DENIED'
        });
      });
    });

    it('should grant access when user has required permissions', async () => {
      const { getByTestId, getByRNText } = render(
        <PermissionGate permissions={['view:products']}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-granted')).toBeTruthy();
        expect(getByRNText('Protected Content')).toBeTruthy();
      });
    });

    it('should deny access when user lacks required permissions', async () => {
      const { getByTestId, getByRNText } = render(
        <PermissionGate permissions={['admin:delete']}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-denied')).toBeTruthy();
        expect(getByRNText('Missing permission: admin:delete')).toBeTruthy();
      });
    });

    it('should check screen access permissions', async () => {
      const basePermissions = {
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
          screen: 'AdminScreen',
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
      };
      
      mockUseNavigationPermissions.mockReturnValue(basePermissions);

      const { getByTestId, getByRNText } = render(
        <PermissionGate screen="AdminScreen">
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-granted')).toBeTruthy();
        expect(getByRNText('Protected Content')).toBeTruthy();
      });
    });

    it('should deny access when screen permission denied', async () => {
      const basePermissions = {
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
          screen: 'AdminScreen',
          allowed: false,
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
      };
      
      mockUseNavigationPermissions.mockReturnValue(basePermissions);

      const { getByTestId, getByRNText } = render(
        <PermissionGate screen="AdminScreen">
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-denied')).toBeTruthy();
        expect(getByRNText('No access to AdminScreen')).toBeTruthy();
      });
    });

    it('should handle screen permission errors', async () => {
      const basePermissions = {
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
          screen: 'AdminScreen',
          allowed: false,
          checked: true,
          error: 'Permission service unavailable'
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
      };
      
      mockUseNavigationPermissions.mockReturnValue(basePermissions);

      const { getByTestId, getByRNText } = render(
        <PermissionGate screen="AdminScreen">
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-denied')).toBeTruthy();
        expect(getByRNText('Permission service unavailable')).toBeTruthy();
      });
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

      const { getByTestId, getByRNText } = render(
        <PermissionGate>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-denied')).toBeTruthy();
        expect(getByRNText('User not authenticated')).toBeTruthy();
      });
    });
  });

  describe('Inversion Logic', () => {
    it('should invert permission check when invert=true', async () => {
      const { getByTestId, getByRNText } = render(
        <PermissionGate roles={['admin']} invert={true}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-granted')).toBeTruthy();
        expect(getByRNText('Protected Content')).toBeTruthy();
      });
    });

    it('should deny access when invert=true and user has role', async () => {
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
        <PermissionGate roles={['admin']} invert={true}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-denied')).toBeTruthy();
      });
    });
  });

  describe('Fallback Handling', () => {
    it('should render custom fallback component', async () => {
      const CustomFallback = () => <RNText>Custom Fallback Content</RNText>;

      const { getByRNText } = render(
        <PermissionGate roles={['admin']} fallback={<CustomFallback />}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByRNText('Custom Fallback Content')).toBeTruthy();
      });
    });

    it('should render fallback function component with reason', async () => {
      const CustomFallback = ({ reason }: { reason?: string }) => (
        <RNText>Access Denied: {reason}</RNText>
      );

      const { getByRNText } = render(
        <PermissionGate roles={['admin']} fallback={CustomFallback}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByRNText('Access Denied: Required role: admin')).toBeTruthy();
      });
    });

    it('should render nothing when fallback is null', async () => {
      const { queryByTestId, queryByRNText } = render(
        <PermissionGate roles={['admin']} fallback={null}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(queryByTestId('permission-gate-denied')).toBeFalsy();
        expect(queryByRNText('Protected Content')).toBeFalsy();
        expect(queryByRNText('Access Denied')).toBeFalsy();
      });
    });
  });

  describe('Combined Permission Checks', () => {
    it('should require both role and permission when both specified', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'admin',
          userId: 'admin-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, getByRNText } = render(
        <PermissionGate roles={['admin']} permissions={['view:products']}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-granted')).toBeTruthy();
        expect(getByRNText('Protected Content')).toBeTruthy();
      });
    });

    it('should deny when role matches but permission missing', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'customer',
          userId: 'customer-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, getByRNText } = render(
        <PermissionGate roles={['customer']} permissions={['admin:delete']}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-denied')).toBeTruthy();
        expect(getByRNText('Missing permission: admin:delete')).toBeTruthy();
      });
    });
  });

  describe('Admin Override', () => {
    it('should grant admin users access to all permissions', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'admin',
          userId: 'admin-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, getByRNText } = render(
        <PermissionGate permissions={['any:permission']}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-granted')).toBeTruthy();
        expect(getByRNText('Protected Content')).toBeTruthy();
      });
    });
  });

  describe('Accessibility and Testing', () => {
    it('should provide proper test IDs', async () => {
      const { getByTestId } = render(
        <PermissionGate testID="custom-gate">
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('custom-gate-granted')).toBeTruthy();
      });
    });
  });
});