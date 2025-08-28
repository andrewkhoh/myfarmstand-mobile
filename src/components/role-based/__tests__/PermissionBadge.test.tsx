/**
 * PermissionBadge Component Tests
 * Tests for visual permission status indicator
 * Following established test patterns from PermissionGate.test.tsx
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PermissionBadge } from '../PermissionBadge';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Mock ValidationMonitor
jest.mock('../../../utils/validationMonitor');
const mockValidationMonitor = ValidationMonitor as jest.Mocked<typeof ValidationMonitor>;

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
      {children}
    </QueryClientProvider>
  );
};

describe('PermissionBadge Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
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
  });

  describe('Basic Rendering', () => {
    it('should render permission granted badge', async () => {
      const { getByTestId, getByText } = render(
        <PermissionBadge 
          permission="view:products"
          testID="permission-badge"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const badge = getByTestId('permission-badge-granted');
        expect(badge).toBeTruthy();
        expect(getByText('✓')).toBeTruthy();
      });
    });

    it('should render permission denied badge', async () => {
      const { getByTestId, getByText } = render(
        <PermissionBadge 
          permission="admin:delete"
          testID="permission-badge"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const badge = getByTestId('permission-badge-denied');
        expect(badge).toBeTruthy();
        expect(getByText('✗')).toBeTruthy();
      });
    });

    it('should show permission label when showLabel is true', async () => {
      const { getByText } = render(
        <PermissionBadge 
          permission="view:products"
          showLabel={true}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('view:products')).toBeTruthy();
      });
    });

    it('should hide when hideWhenGranted is true and permission is granted', async () => {
      const { queryByTestId } = render(
        <PermissionBadge 
          permission="view:products"
          hideWhenGranted={true}
          testID="permission-badge"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(queryByTestId('permission-badge-granted')).toBeFalsy();
        expect(queryByTestId('permission-badge-denied')).toBeFalsy();
      });
    });

    it('should hide when hideWhenDenied is true and permission is denied', async () => {
      const { queryByTestId } = render(
        <PermissionBadge 
          permission="admin:delete"
          hideWhenDenied={true}
          testID="permission-badge"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(queryByTestId('permission-badge-denied')).toBeFalsy();
        expect(queryByTestId('permission-badge-granted')).toBeFalsy();
      });
    });
  });

  describe('Role-Based Permissions', () => {
    it('should show granted for admin with any permission', async () => {
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
        <PermissionBadge 
          permission="any:permission"
          testID="admin-badge"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const badge = getByTestId('admin-badge-granted');
        expect(badge).toBeTruthy();
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'PermissionBadge',
          pattern: 'permission_check',
          operation: 'badgeGranted'
        });
      });
    });

    it('should show granted for staff with inventory permissions', async () => {
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
        <PermissionBadge 
          permission="manage:inventory"
          testID="staff-badge"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const badge = getByTestId('staff-badge-granted');
        expect(badge).toBeTruthy();
      });
    });

    it('should show denied for customer with admin permissions', async () => {
      const { getByTestId } = render(
        <PermissionBadge 
          permission="admin:users"
          testID="customer-badge"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const badge = getByTestId('customer-badge-denied');
        expect(badge).toBeTruthy();
        expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
          context: 'PermissionBadge.permissionCheck',
          errorMessage: 'Permission denied: admin:users',
          errorCode: 'BADGE_PERMISSION_DENIED'
        });
      });
    });
  });

  describe('Visual Variants', () => {
    it('should render minimal variant', async () => {
      const { getByTestId } = render(
        <PermissionBadge 
          permission="view:products"
          variant="minimal"
          testID="minimal-badge"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const badge = getByTestId('minimal-badge-granted');
        expect(badge).toBeTruthy();
      });
    });

    it('should render detailed variant with description', async () => {
      const { getByTestId, getByText } = render(
        <PermissionBadge 
          permission="view:products"
          variant="detailed"
          testID="detailed-badge"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const badge = getByTestId('detailed-badge-granted');
        expect(badge).toBeTruthy();
        expect(getByText('Access Granted')).toBeTruthy();
      });
    });

    it('should render icon-only variant', async () => {
      const { getByTestId, queryByText } = render(
        <PermissionBadge 
          permission="view:products"
          variant="icon-only"
          testID="icon-badge"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const badge = getByTestId('icon-badge-granted');
        expect(badge).toBeTruthy();
        expect(queryByText('view:products')).toBeFalsy();
      });
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom granted style', async () => {
      const customStyle = { backgroundColor: 'blue' };
      const { getByTestId } = render(
        <PermissionBadge 
          permission="view:products"
          grantedStyle={customStyle}
          testID="custom-granted"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const badge = getByTestId('custom-granted-granted');
        expect(badge).toBeTruthy();
      });
    });

    it('should apply custom denied style', async () => {
      const customStyle = { backgroundColor: 'red' };
      const { getByTestId } = render(
        <PermissionBadge 
          permission="admin:delete"
          deniedStyle={customStyle}
          testID="custom-denied"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const badge = getByTestId('custom-denied-denied');
        expect(badge).toBeTruthy();
      });
    });

    it('should apply custom text style', async () => {
      const customTextStyle = { fontSize: 20 };
      const { getByTestId } = render(
        <PermissionBadge 
          permission="view:products"
          textStyle={customTextStyle}
          testID="custom-text"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const badge = getByTestId('custom-text-granted');
        expect(badge).toBeTruthy();
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

      const { getByTestId, getByText } = render(
        <PermissionBadge 
          permission="view:products"
          testID="loading-badge"
        />,
        { wrapper: createWrapper() }
      );

      const badge = getByTestId('loading-badge-loading');
      expect(badge).toBeTruthy();
      expect(getByText('...')).toBeTruthy();
    });

    it('should not render when loading and hideWhenLoading is true', () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { queryByTestId } = render(
        <PermissionBadge 
          permission="view:products"
          hideWhenLoading={true}
          testID="permission-badge"
        />,
        { wrapper: createWrapper() }
      );

      expect(queryByTestId('permission-badge-loading')).toBeFalsy();
      expect(queryByTestId('permission-badge-granted')).toBeFalsy();
      expect(queryByTestId('permission-badge-denied')).toBeFalsy();
    });
  });

  describe('Unauthenticated Users', () => {
    it('should show denied for unauthenticated users', async () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <PermissionBadge 
          permission="view:products"
          testID="unauth-badge"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const badge = getByTestId('unauth-badge-denied');
        expect(badge).toBeTruthy();
      });
    });
  });

  describe('Multiple Permissions', () => {
    it('should check multiple permissions with AND logic', async () => {
      const { getByTestId } = render(
        <PermissionBadge 
          permissions={['view:products', 'edit:products']}
          permissionLogic="AND"
          testID="multi-and-badge"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const badge = getByTestId('multi-and-badge-denied');
        expect(badge).toBeTruthy();
      });
    });

    it('should check multiple permissions with OR logic', async () => {
      const { getByTestId } = render(
        <PermissionBadge 
          permissions={['view:products', 'admin:all']}
          permissionLogic="OR"
          testID="multi-or-badge"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const badge = getByTestId('multi-or-badge-granted');
        expect(badge).toBeTruthy();
      });
    });
  });
});