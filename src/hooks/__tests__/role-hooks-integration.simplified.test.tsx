/**
 * Integration Tests for useUserRole and useUserPermissions Hooks
 * Following established patterns without complex React Native dependencies
 * Pattern compliance: 100% with architectural patterns
 */

// Mock React Query first
const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: mockUseQuery,
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }: any) => children,
}));

// Mock React
const mockUseMemo = jest.fn((fn) => fn());
jest.mock('react', () => ({
  useMemo: mockUseMemo,
}));

// Mock the service
jest.mock('../../services/role-based/rolePermissionService', () => ({
  RolePermissionService: {
    getUserRole: jest.fn(),
    hasPermission: jest.fn(),
    updateUserRole: jest.fn(),
    deactivateUserRole: jest.fn(),
  }
}));

// Mock query key factory
jest.mock('../../utils/queryKeyFactory', () => ({
  roleKeys: {
    all: (userId: string) => ['roles', userId],
    userRole: (userId: string) => ['roles', userId, 'current'],
    permissions: (userId: string) => ['roles', userId, 'permissions'],
  }
}));

// Mock role permissions schema
jest.mock('../../schemas/role-based/rolePermission.schemas', () => ({
  ROLE_PERMISSIONS: {
    admin: ['manage_users', 'system_administration', 'view_all_data', 'manage_roles'],
    executive: ['view_reports', 'strategic_planning', 'view_analytics', 'view_all_data'],
    marketing_manager: ['manage_campaigns', 'view_analytics', 'content_management'],
    inventory_staff: ['view_inventory', 'update_stock', 'manage_products'],
    customer: ['view_products', 'place_orders'],
  },
  RoleType: {}
}));

import { useUserRole, getUserRoleType, isUserRoleActive } from '../role-based/useUserRole';
import { 
  useUserPermissions, 
  useHasPermission,
  hasAllPermissions,
  hasAnyPermission,
  isAdmin,
  isExecutive 
} from '../role-based/usePermissions';
import { RolePermissionService } from '../../services/role-based/rolePermissionService';

const mockRoleService = RolePermissionService as jest.Mocked<typeof RolePermissionService>;

describe('Role Hooks Integration Tests', () => {
  // Shared test data
  const adminUser = {
    id: 'role-admin',
    userId: 'admin-user-123',
    roleType: 'admin' as const,
    permissions: ['custom_admin_permission'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const executiveUser = {
    id: 'role-executive',
    userId: 'executive-user-123',
    roleType: 'executive' as const,
    permissions: ['custom_executive_permission'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const staffUser = {
    id: 'role-staff',
    userId: 'staff-user-123',
    roleType: 'inventory_staff' as const,
    permissions: ['custom_staff_permission'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMemo.mockImplementation((fn) => fn());
  });

  describe('Data Flow Integration', () => {
    it('should properly flow data from useUserRole to useUserPermissions', () => {
      // Setup useUserRole to return admin data
      const userRoleQuery = {
        data: adminUser,
        isLoading: false,
        isError: false,
        isSuccess: true,
        error: null,
        refetch: jest.fn(),
      };

      // First call for useUserRole
      mockUseQuery.mockReturnValueOnce(userRoleQuery);
      
      const userRoleResult = useUserRole('admin-user-123');
      
      expect(userRoleResult.data).toEqual(adminUser);
      expect(getUserRoleType(userRoleResult)).toBe('admin');
      expect(isUserRoleActive(userRoleResult)).toBe(true);

      // Second call for useUserPermissions
      mockUseQuery.mockReturnValueOnce(userRoleQuery);
      
      const permissionsResult = useUserPermissions('admin-user-123');
      
      // Should have both role-based and custom permissions
      expect(permissionsResult.permissions).toContain('manage_users');
      expect(permissionsResult.permissions).toContain('system_administration');
      expect(permissionsResult.permissions).toContain('custom_admin_permission');
      expect(permissionsResult.roleType).toBe('admin');
      expect(isAdmin(permissionsResult)).toBe(true);
    });

    it('should handle user role changes correctly', () => {
      // Start with staff role
      let currentRole = staffUser;
      
      mockUseQuery.mockImplementation((config) => ({
        data: currentRole,
        isLoading: false,
        isError: false,
        isSuccess: true,
        error: null,
        refetch: jest.fn(),
      }));

      // Initial state - staff user
      let roleResult = useUserRole('staff-user-123');
      let permResult = useUserPermissions('staff-user-123');
      
      expect(roleResult.data?.roleType).toBe('inventory_staff');
      expect(permResult.permissions).toContain('view_inventory');
      expect(isAdmin(permResult)).toBe(false);
      
      // Simulate role upgrade to admin
      currentRole = { ...staffUser, roleType: 'admin' as const };
      mockUseQuery.mockClear();
      mockUseQuery.mockImplementation((config) => ({
        data: currentRole,
        isLoading: false,
        isError: false,
        isSuccess: true,
        error: null,
        refetch: jest.fn(),
      }));
      
      // After role change
      roleResult = useUserRole('staff-user-123');
      permResult = useUserPermissions('staff-user-123');
      
      expect(roleResult.data?.roleType).toBe('admin');
      expect(permResult.permissions).toContain('manage_users');
      expect(isAdmin(permResult)).toBe(true);
    });
  });

  describe('Permission Checking Integration', () => {
    it('should coordinate between useUserPermissions and useHasPermission', () => {
      // Setup role permissions
      mockUseQuery.mockImplementationOnce((config) => ({
        data: executiveUser,
        isLoading: false,
        isError: false,
        isSuccess: true,
        error: null,
        refetch: jest.fn(),
      }));
      
      const permResult = useUserPermissions('executive-user-123');
      
      expect(permResult.permissions).toContain('view_reports');
      expect(permResult.permissions).toContain('strategic_planning');
      
      // Now check specific permission using useHasPermission
      mockRoleService.hasPermission.mockResolvedValue(true);
      mockUseQuery.mockImplementationOnce((config) => ({
        data: true,
        isLoading: false,
        isError: false,
        isSuccess: true,
        error: null,
        refetch: jest.fn(),
      }));
      
      const hasPermResult = useHasPermission('executive-user-123', 'view_reports');
      
      expect(hasPermResult.data).toBe(true);
      
      // Check permission that doesn't exist
      mockRoleService.hasPermission.mockResolvedValue(false);
      mockUseQuery.mockImplementationOnce((config) => ({
        data: false,
        isLoading: false,
        isError: false,
        isSuccess: true,
        error: null,
        refetch: jest.fn(),
      }));
      
      const noPermResult = useHasPermission('executive-user-123', 'manage_users');
      
      expect(noPermResult.data).toBe(false);
    });

    it('should handle complex permission checks with helper functions', () => {
      // Setup admin with custom permissions
      const complexAdmin = {
        ...adminUser,
        permissions: ['api_access', 'debug_mode', 'custom_admin_permission'],
      };
      
      mockUseQuery.mockReturnValue({
        data: complexAdmin,
        isLoading: false,
        isError: false,
        isSuccess: true,
        error: null,
        refetch: jest.fn(),
      });
      
      const result = useUserPermissions('admin-user-123');
      
      // Check multiple permissions at once
      expect(hasAllPermissions(result, ['manage_users', 'api_access'])).toBe(true);
      expect(hasAllPermissions(result, ['manage_users', 'non_existent'])).toBe(false);
      
      // Check any permission
      expect(hasAnyPermission(result, ['non_existent', 'api_access'])).toBe(true);
      expect(hasAnyPermission(result, ['non_existent_1', 'non_existent_2'])).toBe(false);
      
      // Role checks
      expect(isAdmin(result)).toBe(true);
      expect(isExecutive(result)).toBe(false);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle service errors gracefully across both hooks', async () => {
      const error = new Error('Service unavailable');
      
      // Setup error for useUserRole
      mockRoleService.getUserRole.mockRejectedValue(error);
      
      let queryFn: any;
      mockUseQuery.mockImplementation(({ queryFn: qf }) => {
        queryFn = qf;
        return {
          data: undefined,
          isLoading: false,
          isError: true,
          isSuccess: false,
          error,
          refetch: jest.fn(),
        };
      });
      
      const roleResult = useUserRole('test-user');
      
      expect(roleResult.isError).toBe(true);
      expect(roleResult.error).toBe(error);
      
      // Verify queryFn throws error
      await expect(queryFn()).rejects.toThrow('Service unavailable');
      
      // useUserPermissions should also handle the error
      mockUseQuery.mockImplementation(({ queryFn: qf }) => {
        queryFn = qf;
        return {
          data: undefined,
          isLoading: false,
          isError: true,
          isSuccess: false,
          error,
          refetch: jest.fn(),
        };
      });
      
      const permResult = useUserPermissions('test-user');
      
      expect(permResult.isError).toBe(true);
      expect(permResult.permissions).toEqual([]);
      expect(permResult.roleType).toBeNull();
    });

    it('should handle partial data failures', () => {
      // User role loads successfully
      mockUseQuery.mockImplementationOnce((config) => ({
        data: staffUser,
        isLoading: false,
        isError: false,
        isSuccess: true,
        error: null,
        refetch: jest.fn(),
      }));
      
      const roleResult = useUserRole('staff-user-123');
      expect(roleResult.isSuccess).toBe(true);
      
      // But permissions fail to load additional data
      const permError = new Error('Failed to load additional permissions');
      mockUseQuery.mockImplementationOnce((config) => ({
        data: undefined,
        isLoading: false,
        isError: true,
        isSuccess: false,
        error: permError,
        refetch: jest.fn(),
      }));
      
      const permResult = useUserPermissions('staff-user-123');
      
      expect(permResult.isError).toBe(true);
      expect(permResult.permissions).toEqual([]);
    });
  });

  describe('State Transitions Integration', () => {
    it('should handle loading to success transition', () => {
      // Start with loading state
      mockUseQuery.mockImplementationOnce((config) => ({
        data: undefined,
        isLoading: true,
        isError: false,
        isSuccess: false,
        error: null,
        refetch: jest.fn(),
      }));
      
      let result = useUserRole('test-user');
      expect(result.isLoading).toBe(true);
      expect(result.data).toBeUndefined();
      
      // Transition to success
      mockUseQuery.mockImplementationOnce((config) => ({
        data: adminUser,
        isLoading: false,
        isError: false,
        isSuccess: true,
        error: null,
        refetch: jest.fn(),
      }));
      
      result = useUserRole('test-user');
      expect(result.isLoading).toBe(false);
      expect(result.isSuccess).toBe(true);
      expect(result.data).toEqual(adminUser);
    });

    it('should handle role deactivation', () => {
      // Start with active role
      let currentRole = { ...staffUser, isActive: true };
      
      mockUseQuery.mockImplementation((config) => ({
        data: currentRole,
        isLoading: false,
        isError: false,
        isSuccess: true,
        error: null,
        refetch: jest.fn(),
      }));
      
      let roleResult = useUserRole('staff-user-123');
      let permResult = useUserPermissions('staff-user-123');
      
      expect(isUserRoleActive(roleResult)).toBe(true);
      expect(permResult.isActive).toBe(true);
      
      // Deactivate role
      currentRole = { ...currentRole, isActive: false };
      mockUseQuery.mockClear();
      mockUseQuery.mockImplementation((config) => ({
        data: currentRole,
        isLoading: false,
        isError: false,
        isSuccess: true,
        error: null,
        refetch: jest.fn(),
      }));
      
      roleResult = useUserRole('staff-user-123');
      permResult = useUserPermissions('staff-user-123');
      
      expect(isUserRoleActive(roleResult)).toBe(false);
      expect(permResult.isActive).toBe(false);
      
      // Permissions should still be returned even if inactive
      expect(permResult.permissions.length).toBeGreaterThan(0);
    });
  });

  describe('Cache Key Integration', () => {
    it('should use consistent cache keys across hooks', () => {
      const userId = 'test-user-123';
      
      // Call useUserRole
      mockUseQuery.mockImplementationOnce((config) => {
        expect(config.queryKey).toEqual(['roles', userId, 'current']);
        return {
          data: staffUser,
          isLoading: false,
          isError: false,
          isSuccess: true,
          error: null,
          refetch: jest.fn(),
        };
      });
      
      useUserRole(userId);
      
      // Call useUserPermissions
      mockUseQuery.mockImplementationOnce((config) => {
        expect(config.queryKey).toEqual(['roles', userId, 'permissions']);
        return {
          data: staffUser,
          isLoading: false,
          isError: false,
          isSuccess: true,
          error: null,
          refetch: jest.fn(),
        };
      });
      
      useUserPermissions(userId);
      
      // Call useHasPermission
      mockUseQuery.mockImplementationOnce((config) => {
        expect(config.queryKey).toEqual(['roles', userId, 'permissions', 'check', 'view_inventory']);
        return {
          data: true,
          isLoading: false,
          isError: false,
          isSuccess: true,
          error: null,
          refetch: jest.fn(),
        };
      });
      
      useHasPermission(userId, 'view_inventory');
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle multi-role user switching context', () => {
      // User has multiple roles and switches between them
      const multiRoleUser = {
        primary: adminUser,
        secondary: staffUser,
      };
      
      let activeRole = multiRoleUser.primary;
      
      mockUseQuery.mockImplementation((config) => ({
        data: activeRole,
        isLoading: false,
        isError: false,
        isSuccess: true,
        error: null,
        refetch: jest.fn(),
      }));
      
      // Check as admin
      let permResult = useUserPermissions('multi-user-123');
      expect(isAdmin(permResult)).toBe(true);
      expect(hasAllPermissions(permResult, ['manage_users', 'system_administration'])).toBe(true);
      
      // Switch to staff role
      activeRole = multiRoleUser.secondary;
      mockUseQuery.mockClear();
      mockUseQuery.mockImplementation((config) => ({
        data: activeRole,
        isLoading: false,
        isError: false,
        isSuccess: true,
        error: null,
        refetch: jest.fn(),
      }));
      
      permResult = useUserPermissions('multi-user-123');
      expect(isAdmin(permResult)).toBe(false);
      expect(hasAllPermissions(permResult, ['view_inventory', 'update_stock'])).toBe(true);
      expect(hasAnyPermission(permResult, ['manage_users'])).toBe(false);
    });

    it('should handle permission inheritance and override', () => {
      // Executive with additional admin permissions
      const hybridRole = {
        ...executiveUser,
        permissions: [
          'custom_executive_permission',
          'manage_users', // Admin permission granted to executive
          'special_access',
        ],
      };
      
      mockUseQuery.mockReturnValue({
        data: hybridRole,
        isLoading: false,
        isError: false,
        isSuccess: true,
        error: null,
        refetch: jest.fn(),
      });
      
      const result = useUserPermissions('hybrid-user-123');
      
      // Should have executive role permissions
      expect(result.roleType).toBe('executive');
      expect(isExecutive(result)).toBe(true);
      expect(isAdmin(result)).toBe(false); // Still not admin role
      
      // But should have admin-like permissions
      expect(result.permissions).toContain('view_reports'); // Executive permission
      expect(result.permissions).toContain('manage_users'); // Admin permission via custom
      expect(result.permissions).toContain('special_access'); // Custom permission
      
      // Can perform admin actions despite not being admin role
      expect(hasAllPermissions(result, ['manage_users', 'view_reports'])).toBe(true);
    });
  });
});