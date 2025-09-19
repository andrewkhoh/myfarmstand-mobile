/**
 * Legacy Test Compatibility Stubs
 * This file provides mock implementations for deprecated services and hooks
 * to maintain test compatibility during the migration period.
 *
 * ⚠️ FOR TESTING ONLY - Do not use in production code
 *
 * @deprecated These stubs are for test compatibility only
 */

import { UserRole } from '../types/roles';

// Legacy service mock for tests
export const mockRoleService = {
  getUserRole: jest.fn().mockImplementation(async (userId: string) => {
    if (userId === 'admin-user') return 'admin';
    if (userId === 'staff-user') return 'staff';
    if (userId === 'manager-user') return 'manager';
    return 'customer';
  }),

  hasPermission: jest.fn().mockImplementation(async (userId: string, permission: string) => {
    if (userId === 'admin-user') return true;
    if (permission === 'inventory:view' && userId === 'staff-user') return true;
    return false;
  }),

  canPerformAction: jest.fn().mockImplementation(async (userId: string, resource: string, action: string) => {
    if (userId === 'admin-user') return true;
    if (resource === 'inventory' && action === 'read' && userId === 'staff-user') return true;
    return false;
  }),

  getUserPermissions: jest.fn().mockImplementation(async (userId: string) => {
    if (userId === 'admin-user') {
      return [
        { id: '1', role: 'admin', permission: 'all', resource: 'all', action: 'all', createdAt: '2023-01-01' }
      ];
    }
    return [];
  }),

  updateUserRole: jest.fn().mockImplementation(async (userId: string, role: UserRole) => {
    return { success: true, message: 'Role updated', data: { userId, role } };
  }),

  getAllRoles: jest.fn().mockReturnValue(['customer', 'staff', 'manager', 'admin', 'farmer', 'vendor']),

  hasHigherPrivileges: jest.fn().mockImplementation((role1: UserRole, role2: UserRole) => {
    const levels = { customer: 1, staff: 2, manager: 3, admin: 4 };
    return (levels[role1] || 1) > (levels[role2] || 1);
  }),

  getRolePermissions: jest.fn().mockImplementation(async (role: UserRole) => {
    return [];
  }),

  getRoleLevel: jest.fn().mockImplementation((role: UserRole) => {
    const levels = { customer: 1, vendor: 2, farmer: 2, staff: 3, manager: 4, admin: 5 };
    return levels[role] || 1;
  })
};

// Legacy hook mocks for tests
export const mockUseRolePermissions = jest.fn().mockImplementation((userId?: string) => ({
  permissions: [],
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
  hasPermission: jest.fn().mockReturnValue(false),
  hasAnyPermission: jest.fn().mockReturnValue(false),
  hasAllPermissions: jest.fn().mockReturnValue(false)
}));

export const mockUseHasPermission = jest.fn().mockImplementation((permission: string, userId?: string) => ({
  hasPermission: false,
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn()
}));

export const mockUseUserRole = jest.fn().mockImplementation((userId?: string) => ({
  data: 'customer' as UserRole,
  role: 'customer' as UserRole,
  isLoading: false,
  error: null,
  isSuccess: true,
  refetch: jest.fn(),
  hasPermission: jest.fn().mockReturnValue(false),
  hasRole: jest.fn().mockReturnValue(false),
  isAdmin: false,
  isExecutive: false,
  isStaff: false
}));

// Legacy component mocks for tests
export const MockPermissionGate = ({ children, permissions, roles, fallback }: any) => {
  // For tests, always render children unless explicitly testing denial
  if (process.env.NODE_ENV === 'test' && !process.env.TEST_PERMISSION_DENIAL) {
    return children;
  }
  return fallback || null;
};

export const MockRoleBasedButton = ({ children, onPress, permissions, roles, disabled }: any) => {
  // This is a mock component for testing - implementation varies by platform
  const handlePress = () => {
    if (!disabled && onPress) {
      onPress();
    }
  };

  // Return a generic mock object for testing
  return {
    type: 'MockRoleBasedButton',
    props: { children, onPress: handlePress, permissions, roles, disabled },
    children
  };
};

// Query key factories for legacy tests
export const legacyQueryKeys = {
  roles: {
    all: () => ['roles'] as const,
    list: (filters?: any) => ['roles', 'list', filters] as const,
    detail: (id: string) => ['roles', 'detail', id] as const,
    permissions: (userId: string) => ['roles', 'permissions', userId] as const,
    userRole: (userId: string) => ['roles', 'user', userId] as const,
    hasPermission: (userId: string, permission: string) => ['roles', 'has-permission', userId, permission] as const,
    canPerformAction: (userId: string, resource: string, action: string) => ['roles', 'can-perform', userId, resource, action] as const,
    roleType: (roleType: string) => ['roles', 'type', roleType] as const,
    allRoles: () => ['roles', 'all'] as const
  }
};

// Test utilities
export const setTestPermissionDenial = (denied: boolean) => {
  if (denied) {
    process.env.TEST_PERMISSION_DENIAL = 'true';
  } else {
    delete process.env.TEST_PERMISSION_DENIAL;
  }
};

export const createMockUser = (role: UserRole = 'customer', permissions: string[] = []) => ({
  id: `test-user-${role}`,
  email: `${role}@test.com`,
  role,
  permissions,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
});

// Test setup helpers
export const setupLegacyMocks = () => {
  // Reset all mocks
  jest.clearAllMocks();

  // Setup default returns
  mockRoleService.getUserRole.mockImplementation(async (userId: string) => 'customer');
  mockRoleService.hasPermission.mockImplementation(async () => false);
  mockRoleService.canPerformAction.mockImplementation(async () => false);
  mockRoleService.getUserPermissions.mockImplementation(async () => []);

  mockUseRolePermissions.mockImplementation(() => ({
    permissions: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    hasPermission: jest.fn().mockReturnValue(false),
    hasAnyPermission: jest.fn().mockReturnValue(false),
    hasAllPermissions: jest.fn().mockReturnValue(false)
  }));

  mockUseUserRole.mockImplementation(() => ({
    data: 'customer' as UserRole,
    role: 'customer' as UserRole,
    isLoading: false,
    error: null,
    isSuccess: true,
    refetch: jest.fn(),
    hasPermission: jest.fn().mockReturnValue(false),
    hasRole: jest.fn().mockReturnValue(false),
    isAdmin: false,
    isExecutive: false,
    isStaff: false
  }));

  // Clear permission denial
  delete process.env.TEST_PERMISSION_DENIAL;
};

export default {
  mockRoleService,
  mockUseRolePermissions,
  mockUseHasPermission,
  mockUseUserRole,
  MockPermissionGate,
  MockRoleBasedButton,
  legacyQueryKeys,
  setTestPermissionDenial,
  createMockUser,
  setupLegacyMocks
};