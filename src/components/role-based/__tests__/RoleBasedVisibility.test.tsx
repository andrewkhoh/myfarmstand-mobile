/**
 * RoleBasedVisibility Component Tests
 * Tests for role-based visibility wrapper component
 * Following established test patterns from PermissionGate.test.tsx
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleBasedVisibility } from '../RoleBasedVisibility';
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

const TestContent = () => <Text testID="test-content">Protected Content</Text>;

describe('RoleBasedVisibility Component', () => {
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
  });

  describe('Allowed Roles', () => {
    it('should show content when user has allowed role', async () => {
      const { getByTestId } = render(
        <RoleBasedVisibility allowedRoles={['customer', 'staff']}>
          <TestContent />
        </RoleBasedVisibility>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('test-content')).toBeTruthy();
      });
    });

    it('should hide content when user lacks allowed role', async () => {
      const { queryByTestId } = render(
        <RoleBasedVisibility allowedRoles={['admin', 'staff']}>
          <TestContent />
        </RoleBasedVisibility>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(queryByTestId('test-content')).toBeFalsy();
      });
    });

    it('should show content to admin when admin is in allowed roles', async () => {
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
        <RoleBasedVisibility allowedRoles={['admin']}>
          <TestContent />
        </RoleBasedVisibility>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('test-content')).toBeTruthy();
      });
    });
  });

  describe('Denied Roles', () => {
    it('should hide content when user has denied role', async () => {
      const { queryByTestId } = render(
        <RoleBasedVisibility deniedRoles={['customer']}>
          <TestContent />
        </RoleBasedVisibility>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(queryByTestId('test-content')).toBeFalsy();
      });
    });

    it('should show content when user lacks denied role', async () => {
      const { getByTestId } = render(
        <RoleBasedVisibility deniedRoles={['admin', 'staff']}>
          <TestContent />
        </RoleBasedVisibility>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('test-content')).toBeTruthy();
      });
    });

    it('should prioritize denied roles over allowed roles', async () => {
      const { queryByTestId } = render(
        <RoleBasedVisibility 
          allowedRoles={['customer', 'staff']} 
          deniedRoles={['customer']}
        >
          <TestContent />
        </RoleBasedVisibility>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(queryByTestId('test-content')).toBeFalsy();
      });
    });
  });

  describe('Loading States', () => {
    it('should hide content while loading by default', async () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { queryByTestId } = render(
        <RoleBasedVisibility allowedRoles={['customer']}>
          <TestContent />
        </RoleBasedVisibility>,
        { wrapper: createWrapper() }
      );

      expect(queryByTestId('test-content')).toBeFalsy();
    });

    it('should show content while loading when showWhileLoading is true', async () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <RoleBasedVisibility allowedRoles={['customer']} showWhileLoading={true}>
          <TestContent />
        </RoleBasedVisibility>,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('test-content')).toBeTruthy();
    });
  });

  describe('Unauthenticated Users', () => {
    it('should hide content for unauthenticated users by default', async () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { queryByTestId } = render(
        <RoleBasedVisibility allowedRoles={['customer']}>
          <TestContent />
        </RoleBasedVisibility>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(queryByTestId('test-content')).toBeFalsy();
      });
    });

    it('should show content to unauthenticated users when showWhenUnauthenticated is true', async () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <RoleBasedVisibility showWhenUnauthenticated={true}>
          <TestContent />
        </RoleBasedVisibility>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('test-content')).toBeTruthy();
      });
    });
  });

  describe('Combined Scenarios', () => {
    it('should show content when no roles specified', async () => {
      const { getByTestId } = render(
        <RoleBasedVisibility>
          <TestContent />
        </RoleBasedVisibility>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('test-content')).toBeTruthy();
      });
    });

    it('should handle multiple allowed roles correctly', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'vendor',
          userId: 'vendor-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <RoleBasedVisibility allowedRoles={['vendor', 'farmer', 'admin']}>
          <TestContent />
        </RoleBasedVisibility>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('test-content')).toBeTruthy();
      });
    });

    it('should handle error states gracefully', async () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load user role'),
        refetch: jest.fn(),
      });

      const { queryByTestId } = render(
        <RoleBasedVisibility allowedRoles={['customer']}>
          <TestContent />
        </RoleBasedVisibility>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(queryByTestId('test-content')).toBeFalsy();
      });
    });

    it('should track visibility decisions for monitoring', async () => {
      const { getByTestId } = render(
        <RoleBasedVisibility allowedRoles={['customer']}>
          <TestContent />
        </RoleBasedVisibility>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('test-content')).toBeTruthy();
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'RoleBasedVisibility',
          pattern: 'role_filtering',
          operation: 'contentShown'
        });
      });
    });

    it('should track visibility denials for monitoring', async () => {
      const { queryByTestId } = render(
        <RoleBasedVisibility allowedRoles={['admin']}>
          <TestContent />
        </RoleBasedVisibility>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(queryByTestId('test-content')).toBeFalsy();
        // Component uses recordPatternSuccess for hidden content, not recordValidationError
        expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
          service: 'RoleBasedVisibility',
          pattern: 'role_filtering',
          operation: 'contentHidden'
        });
      });
    });
  });

  describe('Manager Role', () => {
    it('should handle manager role correctly', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'manager',
          userId: 'manager-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <RoleBasedVisibility allowedRoles={['manager', 'admin']}>
          <TestContent />
        </RoleBasedVisibility>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('test-content')).toBeTruthy();
      });
    });
  });
});