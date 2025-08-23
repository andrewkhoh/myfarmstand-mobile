/**
 * PermissionGate Component Tests
 * Tests for permission-based content gating
 * Following scratchpad-service-test-setup patterns
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
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

const TestContent = () => <Text>Protected Content</Text>;

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
      screen: '',
      allowed: true,
      checked: true,
      error: undefined,
      checkPermission: jest.fn(),
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
        <PermissionGate>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('permission-gate-loading')).toBeTruthy();
      expect(getByText('Checking permissions...')).toBeTruthy();
    });

    it('should show loading state when screen permissions are being checked', () => {
      mockUseNavigationPermissions.mockReturnValue({
        screen: 'TestScreen',
        allowed: false,
        checked: false,
        error: undefined,
        checkPermission: jest.fn(),
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

      const CustomLoading = () => <Text>Custom Loading...</Text>;

      const { getByText } = render(
        <PermissionGate loadingComponent={CustomLoading}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      expect(getByText('Custom Loading...')).toBeTruthy();
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

      const { getByTestId, getByText } = render(
        <PermissionGate roles={['admin', 'staff']}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-granted')).toBeTruthy();
        expect(getByText('Protected Content')).toBeTruthy();
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'PermissionGate',
          pattern: 'permission_check',
          operation: 'accessGranted'
        });
      });
    });

    it('should deny access when user lacks required role', async () => {
      const { getByTestId, getByText } = render(
        <PermissionGate roles={['admin', 'staff']}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-denied')).toBeTruthy();
        expect(getByText('Access Denied')).toBeTruthy();
        expect(getByText('Required role: admin or staff')).toBeTruthy();
        expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
          context: 'PermissionGate.permissionCheck',
          errorMessage: 'Required role: admin or staff',
          errorCode: 'PERMISSION_DENIED'
        });
      });
    });

    it('should grant access when user has required permissions', async () => {
      const { getByTestId, getByText } = render(
        <PermissionGate permissions={['view:products']}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-granted')).toBeTruthy();
        expect(getByText('Protected Content')).toBeTruthy();
      });
    });

    it('should deny access when user lacks required permissions', async () => {
      const { getByTestId, getByText } = render(
        <PermissionGate permissions={['admin:delete']}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-denied')).toBeTruthy();
        expect(getByText('Missing permission: admin:delete')).toBeTruthy();
      });
    });

    it('should check screen access permissions', async () => {
      mockUseNavigationPermissions.mockReturnValue({
        screen: 'AdminScreen',
        allowed: true,
        checked: true,
        error: undefined,
        checkPermission: jest.fn(),
      });

      const { getByTestId, getByText } = render(
        <PermissionGate screen="AdminScreen">
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-granted')).toBeTruthy();
        expect(getByText('Protected Content')).toBeTruthy();
      });
    });

    it('should deny access when screen permission denied', async () => {
      mockUseNavigationPermissions.mockReturnValue({
        screen: 'AdminScreen',
        allowed: false,
        checked: true,
        error: undefined,
        checkPermission: jest.fn(),
      });

      const { getByTestId, getByText } = render(
        <PermissionGate screen="AdminScreen">
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-denied')).toBeTruthy();
        expect(getByText('No access to AdminScreen')).toBeTruthy();
      });
    });

    it('should handle screen permission errors', async () => {
      mockUseNavigationPermissions.mockReturnValue({
        screen: 'AdminScreen',
        allowed: false,
        checked: true,
        error: 'Permission service unavailable',
        checkPermission: jest.fn(),
      });

      const { getByTestId, getByText } = render(
        <PermissionGate screen="AdminScreen">
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-denied')).toBeTruthy();
        expect(getByText('Permission service unavailable')).toBeTruthy();
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

      const { getByTestId, getByText } = render(
        <PermissionGate>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-denied')).toBeTruthy();
        expect(getByText('User not authenticated')).toBeTruthy();
      });
    });
  });

  describe('Inversion Logic', () => {
    it('should invert permission check when invert=true', async () => {
      const { getByTestId, getByText } = render(
        <PermissionGate roles={['admin']} invert={true}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-granted')).toBeTruthy();
        expect(getByText('Protected Content')).toBeTruthy();
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
      const CustomFallback = () => <Text>Custom Fallback Content</Text>;

      const { getByText } = render(
        <PermissionGate roles={['admin']} fallback={<CustomFallback />}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('Custom Fallback Content')).toBeTruthy();
      });
    });

    it('should render fallback function component with reason', async () => {
      const CustomFallback = ({ reason }: { reason?: string }) => (
        <Text>Access Denied: {reason}</Text>
      );

      const { getByText } = render(
        <PermissionGate roles={['admin']} fallback={CustomFallback}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('Access Denied: Required role: admin')).toBeTruthy();
      });
    });

    it('should render nothing when fallback is null', async () => {
      const { container } = render(
        <PermissionGate roles={['admin']} fallback={null}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(container.children.length).toBe(0);
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

      const { getByTestId, getByText } = render(
        <PermissionGate roles={['admin']} permissions={['view:products']}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-granted')).toBeTruthy();
        expect(getByText('Protected Content')).toBeTruthy();
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

      const { getByTestId, getByText } = render(
        <PermissionGate roles={['customer']} permissions={['admin:delete']}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-denied')).toBeTruthy();
        expect(getByText('Missing permission: admin:delete')).toBeTruthy();
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

      const { getByTestId, getByText } = render(
        <PermissionGate permissions={['any:permission']}>
          <TestContent />
        </PermissionGate>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('permission-gate-granted')).toBeTruthy();
        expect(getByText('Protected Content')).toBeTruthy();
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