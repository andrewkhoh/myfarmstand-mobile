/**
 * RoleIndicator Component Tests
 * Tests for displaying user's current role with styling
 * Following established test patterns from existing component tests
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleIndicator } from '../RoleIndicator';

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

describe('RoleIndicator Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default customer role mock
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

  describe('Loading State', () => {
    it('should show loading state when user role is loading', () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, getByText } = render(
        <RoleIndicator />,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('role-indicator-loading')).toBeTruthy();
      expect(getByText('Loading...')).toBeTruthy();
    });
  });

  describe('Error States', () => {
    it('should show No Role when user data is not available', () => {
      mockUseUserRole.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, getByText } = render(
        <RoleIndicator />,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('role-indicator-error')).toBeTruthy();
      expect(getByText('No Role')).toBeTruthy();
    });

    it('should show Unknown for unrecognized role', () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'unknown_role' as any,
          userId: 'user-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, getByText } = render(
        <RoleIndicator />,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('role-indicator-unknown')).toBeTruthy();
      expect(getByText('Unknown')).toBeTruthy();
    });
  });

  describe('Role Display', () => {
    it('should display customer role with icon and title', async () => {
      const { getByTestId, getByText } = render(
        <RoleIndicator />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('role-indicator')).toBeTruthy();
        expect(getByTestId('role-indicator-icon')).toBeTruthy();
        expect(getByTestId('role-indicator-title')).toBeTruthy();
        expect(getByText('🛍️')).toBeTruthy();
        expect(getByText('Customer')).toBeTruthy();
      });
    });

    it('should display farmer role with correct styling', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'farmer',
          userId: 'farmer-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, getByText } = render(
        <RoleIndicator />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByTestId('role-indicator')).toBeTruthy();
        expect(getByText('🌾')).toBeTruthy();
        expect(getByText('Farmer')).toBeTruthy();
      });
    });

    it('should display vendor role', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'vendor',
          userId: 'vendor-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByText } = render(
        <RoleIndicator />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('🏪')).toBeTruthy();
        expect(getByText('Vendor')).toBeTruthy();
      });
    });

    it('should display admin role', async () => {
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
        <RoleIndicator />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('⚙️')).toBeTruthy();
        expect(getByText('Admin')).toBeTruthy();
      });
    });

    it('should display staff role', async () => {
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'staff',
          userId: 'staff-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByText } = render(
        <RoleIndicator />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(getByText('👨‍💼')).toBeTruthy();
        expect(getByText('Staff')).toBeTruthy();
      });
    });
  });

  describe('Size Variants', () => {
    it('should render small size variant', () => {
      const { getByTestId } = render(
        <RoleIndicator size="small" />,
        { wrapper: createWrapper() }
      );

      const indicator = getByTestId('role-indicator');
      expect(indicator).toBeTruthy();
      // Small size has specific padding and font size
    });

    it('should render medium size variant by default', () => {
      const { getByTestId } = render(
        <RoleIndicator />,
        { wrapper: createWrapper() }
      );

      const indicator = getByTestId('role-indicator');
      expect(indicator).toBeTruthy();
    });

    it('should render large size variant', () => {
      const { getByTestId } = render(
        <RoleIndicator size="large" />,
        { wrapper: createWrapper() }
      );

      const indicator = getByTestId('role-indicator');
      expect(indicator).toBeTruthy();
    });
  });

  describe('Display Variants', () => {
    it('should render badge variant by default', () => {
      const { getByTestId } = render(
        <RoleIndicator />,
        { wrapper: createWrapper() }
      );

      const indicator = getByTestId('role-indicator');
      expect(indicator).toBeTruthy();
      // Badge variant has shadow and elevation
    });

    it('should render chip variant', () => {
      const { getByTestId } = render(
        <RoleIndicator variant="chip" />,
        { wrapper: createWrapper() }
      );

      const indicator = getByTestId('role-indicator');
      expect(indicator).toBeTruthy();
      // Chip variant has more elevation
    });

    it('should render minimal variant', () => {
      const { getByTestId } = render(
        <RoleIndicator variant="minimal" />,
        { wrapper: createWrapper() }
      );

      const indicator = getByTestId('role-indicator');
      expect(indicator).toBeTruthy();
      // Minimal variant has transparent background and border
    });
  });

  describe('Icon and Title Options', () => {
    it('should hide icon when showIcon is false', () => {
      const { queryByTestId, getByText } = render(
        <RoleIndicator showIcon={false} />,
        { wrapper: createWrapper() }
      );

      expect(queryByTestId('role-indicator-icon')).toBeFalsy();
      expect(getByText('Customer')).toBeTruthy();
    });

    it('should hide title when showTitle is false', () => {
      const { queryByTestId, getByText } = render(
        <RoleIndicator showTitle={false} />,
        { wrapper: createWrapper() }
      );

      expect(queryByTestId('role-indicator-title')).toBeFalsy();
      expect(getByText('🛍️')).toBeTruthy();
    });

    it('should show only icon when both showIcon and showTitle are set', () => {
      const { getByText } = render(
        <RoleIndicator showIcon={true} showTitle={false} />,
        { wrapper: createWrapper() }
      );

      expect(getByText('🛍️')).toBeTruthy();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom container style', () => {
      const customStyle = { backgroundColor: 'red' };
      const { getByTestId } = render(
        <RoleIndicator style={customStyle} />,
        { wrapper: createWrapper() }
      );

      const indicator = getByTestId('role-indicator');
      expect(indicator).toBeTruthy();
    });

    it('should apply custom text style', () => {
      const customTextStyle = { fontSize: 20 };
      const { getByTestId } = render(
        <RoleIndicator textStyle={customTextStyle} />,
        { wrapper: createWrapper() }
      );

      const indicator = getByTestId('role-indicator');
      expect(indicator).toBeTruthy();
    });
  });

  describe('Test ID Support', () => {
    it('should use custom testID when provided', () => {
      const { getByTestId } = render(
        <RoleIndicator testID="custom-role-indicator" />,
        { wrapper: createWrapper() }
      );

      expect(getByTestId('custom-role-indicator')).toBeTruthy();
      expect(getByTestId('custom-role-indicator-icon')).toBeTruthy();
      expect(getByTestId('custom-role-indicator-title')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle role change dynamically', async () => {
      const { rerender, getByText } = render(
        <RoleIndicator />,
        { wrapper: createWrapper() }
      );

      expect(getByText('Customer')).toBeTruthy();

      // Change role to admin
      mockUseUserRole.mockReturnValue({
        data: {
          role: 'admin',
          userId: 'admin-123',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      rerender(<RoleIndicator />);

      await waitFor(() => {
        expect(getByText('Admin')).toBeTruthy();
      });
    });

    it('should handle all role combinations', async () => {
      const roles = ['customer', 'farmer', 'vendor', 'admin', 'staff'] as const;
      
      for (const role of roles) {
        mockUseUserRole.mockReturnValue({
          data: {
            role,
            userId: `${role}-123`,
          },
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        });

        const { getByTestId } = render(
          <RoleIndicator />,
          { wrapper: createWrapper() }
        );

        await waitFor(() => {
          expect(getByTestId('role-indicator')).toBeTruthy();
        });
      }
    });
  });
});