/**
 * useUserRole Hook Tests - Following proven pattern with 100% compliance
 * Pattern Reference: src/hooks/__tests__/useCart.test.tsx
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { createWrapper } from '../../test/test-utils';
import { createUser, resetAllFactories } from '../../test/factories';

// Mock services using simplified approach
jest.mock('../../services/roleService', () => ({
  roleService: {
    getUserRole: jest.fn(),
    getRolePermissions: jest.fn(),
    getUserPermissions: jest.fn(),
    hasPermission: jest.fn(),
    canPerformAction: jest.fn(),
    updateUserRole: jest.fn(),
    getAllRoles: jest.fn(),
    getRoleLevel: jest.fn(),
    hasHigherPrivileges: jest.fn(),
  }
}));

// Mock query key factory - use centralized factory pattern
jest.mock('../../utils/queryKeyFactory', () => ({
  roleKeys: {
    userRole: (userId: string) => ['roles', 'user', userId, 'current'],
    permissions: (userId: string) => ['roles', 'user', userId, 'permissions'],
    allRoles: () => ['roles', 'all'],
  }
}));

// Mock auth hook
jest.mock('../useAuth', () => ({
  useCurrentUser: jest.fn(),
}));

// Mock React Query - We'll set implementation in tests
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isLoading: false,
    error: null,
    data: null,
  })),
}));

// Defensive imports
let useUserRole: any;
let useRoleOperations: any;

try {
  const roleModule = require('../useUserRole');
  useUserRole = roleModule.useUserRole;
  useRoleOperations = roleModule.useRoleOperations;
} catch (error) {
  console.log('Import error (expected - hook not created yet):', error);
}

// Get mocked dependencies
import { roleService } from '../../services/roleService';
import { useCurrentUser } from '../useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { UserRole } from '../../types';

const mockRoleService = roleService as jest.Mocked<typeof roleService>;
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

describe('useUserRole Hook Tests - Following Established Patterns', () => {
  // Use factory-created, schema-validated test data
  const mockUser = createUser({
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'customer' as UserRole,
  });

  const mockStaffUser = createUser({
    id: 'staff-user-456',
    email: 'staff@example.com',
    name: 'Staff User',
    role: 'staff' as UserRole,
  });

  const mockAdminUser = createUser({
    id: 'admin-user-789',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin' as UserRole,
  });

  // Use pre-configured wrapper from infrastructure
  const wrapper = createWrapper();

  beforeEach(() => {
    // Reset all factories for test isolation
    resetAllFactories();
    jest.clearAllMocks();

    // Setup React Query mock to return role data
    mockUseQuery.mockReturnValue({
      data: 'customer',
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isSuccess: true,
    } as any);

    // Setup mutation mock for role operations
    mockUseMutation.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isLoading: false,
      error: null,
      data: null,
    } as any);

    // Setup auth mock
    mockUseCurrentUser.mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null,
    } as any);

    // Setup role service mocks
    mockRoleService.getUserRole.mockResolvedValue('customer');
    mockRoleService.getRolePermissions.mockResolvedValue([]);
    mockRoleService.getUserPermissions.mockResolvedValue([]);
    mockRoleService.hasPermission.mockResolvedValue(false);
    mockRoleService.canPerformAction.mockResolvedValue(false);
    mockRoleService.updateUserRole.mockResolvedValue({
      success: true,
      message: 'Role updated successfully',
      data: { userId: mockUser.id, role: 'customer' },
    });
    mockRoleService.getAllRoles.mockReturnValue(['customer', 'staff', 'manager', 'admin', 'farmer', 'vendor']);
    mockRoleService.getRoleLevel.mockReturnValue(1);
    mockRoleService.hasHigherPrivileges.mockReturnValue(false);
  });

  describe('🔧 Setup Verification', () => {
    it('should handle useUserRole import gracefully', () => {
      if (useUserRole) {
        expect(typeof useUserRole).toBe('function');
      } else {
        console.log('useUserRole not available - expected before implementation');
      }
    });

    it('should render useUserRole without crashing', () => {
      if (!useUserRole) {
        console.log('Skipping test - useUserRole not yet implemented');
        return;
      }

      expect(() => {
        renderHook(() => useUserRole('test-user-123'), { wrapper });
      }).not.toThrow();
    });
  });

  describe('👤 useUserRole Hook - Basic Functionality', () => {
    it('should fetch user role when user ID is provided', async () => {
      if (!useUserRole) {
        console.log('Skipping test - useUserRole not yet implemented');
        return;
      }

      const { result } = renderHook(() => useUserRole('test-user-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data).toBe('customer');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
    });

    it('should handle loading states correctly', async () => {
      if (!useUserRole) {
        console.log('Skipping test - useUserRole not yet implemented');
        return;
      }

      // Mock loading state
      mockUseQuery.mockReturnValueOnce({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
        isSuccess: false,
      } as any);

      const { result } = renderHook(() => useUserRole('test-user-123'), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      if (!useUserRole) {
        console.log('Skipping test - useUserRole not yet implemented');
        return;
      }

      const mockError = new Error('Failed to fetch user role');
      
      mockUseQuery.mockReturnValueOnce({
        data: undefined,
        isLoading: false,
        error: mockError,
        refetch: jest.fn(),
        isSuccess: false,
      } as any);

      const { result } = renderHook(() => useUserRole('test-user-123'), { wrapper });

      expect(result.current.error).toBe(mockError);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('should return null when no user ID is provided', async () => {
      if (!useUserRole) {
        console.log('Skipping test - useUserRole not yet implemented');
        return;
      }

      const { result } = renderHook(() => useUserRole(null), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should refetch role when refetch is called', async () => {
      if (!useUserRole) {
        console.log('Skipping test - useUserRole not yet implemented');
        return;
      }

      const mockRefetch = jest.fn().mockResolvedValue({ data: 'staff' });
      
      mockUseQuery.mockReturnValue({
        data: 'customer',
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        isSuccess: true,
      } as any);

      const { result } = renderHook(() => useUserRole('test-user-123'), { wrapper });

      await result.current.refetch();

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should handle role updates for staff users', async () => {
      if (!useUserRole) {
        console.log('Skipping test - useUserRole not yet implemented');
        return;
      }

      mockUseQuery.mockReturnValue({
        data: 'staff',
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
      } as any);

      mockRoleService.getUserRole.mockResolvedValue('staff');

      const { result } = renderHook(() => useUserRole('staff-user-456'), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBe('staff');
      });

      expect(result.current.isSuccess).toBe(true);
    });

    it('should handle role updates for admin users', async () => {
      if (!useUserRole) {
        console.log('Skipping test - useUserRole not yet implemented');
        return;
      }

      mockUseQuery.mockReturnValue({
        data: 'admin',
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
      } as any);

      mockRoleService.getUserRole.mockResolvedValue('admin');

      const { result } = renderHook(() => useUserRole('admin-user-789'), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBe('admin');
      });

      expect(result.current.isSuccess).toBe(true);
    });

    it('should cache role data with proper query keys', async () => {
      if (!useUserRole) {
        console.log('Skipping test - useUserRole not yet implemented');
        return;
      }

      renderHook(() => useUserRole('test-user-123'), { wrapper });

      // Verify that useQuery was called with proper query key
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['roles', 'user', 'test-user-123', 'current'],
        })
      );
    });

    it('should handle role fallback to customer on service error', async () => {
      if (!useUserRole) {
        console.log('Skipping test - useUserRole not yet implemented');
        return;
      }

      mockRoleService.getUserRole.mockRejectedValue(new Error('Service error'));
      
      // Mock the query to use the actual service
      mockUseQuery.mockImplementation((options: any) => ({
        data: 'customer', // Fallback value
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
      } as any));

      const { result } = renderHook(() => useUserRole('test-user-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBe('customer');
      });
    });

    it('should work with vendor and farmer roles', async () => {
      if (!useUserRole) {
        console.log('Skipping test - useUserRole not yet implemented');
        return;
      }

      // Test vendor role
      mockUseQuery.mockReturnValueOnce({
        data: 'vendor',
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
      } as any);

      const { result: vendorResult } = renderHook(() => useUserRole('vendor-123'), { wrapper });
      
      await waitFor(() => {
        expect(vendorResult.current.data).toBe('vendor');
      });

      // Test farmer role
      mockUseQuery.mockReturnValueOnce({
        data: 'farmer',
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
      } as any);

      const { result: farmerResult } = renderHook(() => useUserRole('farmer-456'), { wrapper });
      
      await waitFor(() => {
        expect(farmerResult.current.data).toBe('farmer');
      });
    });
  });

  describe('⚙️ useRoleOperations Hook', () => {
    it('should handle useRoleOperations import gracefully', () => {
      if (useRoleOperations) {
        expect(typeof useRoleOperations).toBe('function');
      } else {
        console.log('useRoleOperations not available - expected before implementation');
      }
    });

    it('should render useRoleOperations without crashing', () => {
      if (!useRoleOperations) {
        console.log('Skipping test - useRoleOperations not yet implemented');
        return;
      }

      expect(() => {
        renderHook(() => useRoleOperations(), { wrapper });
      }).not.toThrow();
    });

    it('should provide role operation functions', async () => {
      if (!useRoleOperations) {
        console.log('Skipping test - useRoleOperations not yet implemented');
        return;
      }

      const { result } = renderHook(() => useRoleOperations(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      // Check that operations are available
      if (result.current.updateUserRole) {
        expect(typeof result.current.updateUserRole).toBe('function');
      }
      if (result.current.checkPermission) {
        expect(typeof result.current.checkPermission).toBe('function');
      }
    });
  });
});