/**
 * RoleService Test - Using REFACTORED Infrastructure
 * Following the proven pattern from cartService.test.ts with SimplifiedSupabaseMock
 */

// ============================================================================
// MOCK SETUP - MUST BE BEFORE ANY IMPORTS 
// ============================================================================

// Mock Supabase using the SimplifiedSupabaseMock pattern
jest.mock("../../config/supabase", () => {
  const { SimplifiedSupabaseMock } = require("../../test/mocks/supabase.simplified.mock");
  const mockInstance = new SimplifiedSupabaseMock();
  return {
    supabase: mockInstance.createClient(),
  };
});

// Mock validation monitor
jest.mock('../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordPatternSuccess: jest.fn(),
    recordDataIntegrity: jest.fn()
  }
}));

// ============================================================================
// IMPORTS - AFTER ALL MOCKS ARE SET UP
// ============================================================================

import { roleService } from '../roleService';
import { SimplifiedSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { UserRole } from '../../types';

describe('RoleService - Refactored Infrastructure', () => {
  let mockSupabase: SimplifiedSupabaseMock;

  // Test data
  const testUserId = 'user-123';
  const testRole: UserRole = 'staff';
  
  const mockUserRoleData = {
    id: 'role-1',
    user_id: testUserId,
    role: testRole,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const mockPermissionsData = [
    {
      id: 'perm-1',
      role: 'staff',
      permission: 'orders.view',
      resource: 'orders',
      action: 'view',
      created_at: '2023-01-01T00:00:00Z',
    },
    {
      id: 'perm-2',
      role: 'staff',
      permission: 'orders.update',
      resource: 'orders',
      action: 'update',
      created_at: '2023-01-01T00:00:00Z',
    },
    {
      id: 'perm-3',
      role: 'staff',
      permission: 'products.view',
      resource: 'products',
      action: 'view',
      created_at: '2023-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    // Create fresh mock instance for each test
    mockSupabase = new SimplifiedSupabaseMock();
    
    // Replace the supabase client with our mock
    const supabaseModule = require('../../config/supabase');
    supabaseModule.supabase = mockSupabase.createClient();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('getUserRole', () => {
    it('should return user role when found', async () => {
      // Setup mock data
      mockSupabase.setTableData('user_roles', [mockUserRoleData]);
      
      const result = await roleService.getUserRole(testUserId);
      
      expect(result).toBe('staff');
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'RoleService',
        pattern: 'transformation_schema',
        operation: 'getUserRole',
      });
    });

    it('should return customer role when user has no role', async () => {
      // Setup empty table
      mockSupabase.setTableData('user_roles', []);
      
      const result = await roleService.getUserRole(testUserId);
      
      expect(result).toBe('customer');
    });

    it('should return customer role on error', async () => {
      // Queue an error
      mockSupabase.queueError(new Error('Database connection failed'));
      
      const result = await roleService.getUserRole(testUserId);
      
      expect(result).toBe('customer');
    });

    it('should handle invalid user ID', async () => {
      const result = await roleService.getUserRole('');
      
      expect(result).toBe('customer');
    });

    it('should handle validation errors gracefully', async () => {
      // Setup invalid data (missing required field)
      mockSupabase.setTableData('user_roles', [{
        id: 'role-1',
        user_id: testUserId,
        // Missing 'role' field
        created_at: '2023-01-01T00:00:00Z',
      }]);
      
      const result = await roleService.getUserRole(testUserId);
      
      expect(result).toBe('customer');
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'RoleService.getUserRole',
        errorMessage: expect.any(String),
        errorCode: 'USER_ROLE_VALIDATION_FAILED',
      });
    });
  });

  describe('getRolePermissions', () => {
    it('should return all permissions for a role', async () => {
      // Setup mock data
      mockSupabase.setTableData('role_permissions', mockPermissionsData);
      
      const result = await roleService.getRolePermissions('staff');
      
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        role: 'staff',
        permission: 'orders.view',
        resource: 'orders',
        action: 'view',
      });
    });

    it('should return empty array when no permissions found', async () => {
      // Setup empty table
      mockSupabase.setTableData('role_permissions', []);
      
      const result = await roleService.getRolePermissions('customer');
      
      expect(result).toEqual([]);
    });

    it('should skip invalid permissions and continue', async () => {
      // Setup mixed valid/invalid data
      mockSupabase.setTableData('role_permissions', [
        mockPermissionsData[0],
        { 
          id: 'invalid', 
          // Missing required fields
        },
        mockPermissionsData[2],
      ]);
      
      const result = await roleService.getRolePermissions('staff');
      
      expect(result).toHaveLength(2); // Only valid permissions
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Queue an error
      mockSupabase.queueError(new Error('Database error'));
      
      const result = await roleService.getRolePermissions('staff');
      
      expect(result).toEqual([]);
    });
  });

  describe('getUserPermissions', () => {
    it('should return permissions for user based on their role', async () => {
      // Setup user role and permissions
      mockSupabase.setTableData('user_roles', [mockUserRoleData]);
      mockSupabase.setTableData('role_permissions', mockPermissionsData);
      
      const result = await roleService.getUserPermissions(testUserId);
      
      expect(result).toHaveLength(3);
      expect(result[0].permission).toBe('orders.view');
    });

    it('should return empty array when user not found', async () => {
      // No user role data
      mockSupabase.setTableData('user_roles', []);
      mockSupabase.setTableData('role_permissions', mockPermissionsData);
      
      const result = await roleService.getUserPermissions('unknown-user');
      
      expect(result).toEqual([]);
    });

    it('should handle errors in role lookup', async () => {
      // Queue error for first call (getUserRole)
      mockSupabase.queueError(new Error('Role lookup failed'));
      
      const result = await roleService.getUserPermissions(testUserId);
      
      expect(result).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      // Setup data
      mockSupabase.setTableData('user_roles', [mockUserRoleData]);
      mockSupabase.setTableData('role_permissions', mockPermissionsData);
      
      const result = await roleService.hasPermission(testUserId, 'orders.view');
      
      expect(result).toBe(true);
    });

    it('should return false when user lacks permission', async () => {
      // Setup data
      mockSupabase.setTableData('user_roles', [mockUserRoleData]);
      mockSupabase.setTableData('role_permissions', mockPermissionsData);
      
      const result = await roleService.hasPermission(testUserId, 'admin.access');
      
      expect(result).toBe(false);
    });

    it('should return false on error (fail secure)', async () => {
      // Queue error
      mockSupabase.queueError(new Error('Permission check failed'));
      
      const result = await roleService.hasPermission(testUserId, 'orders.view');
      
      expect(result).toBe(false);
    });
  });

  describe('canPerformAction', () => {
    it('should return true when user can perform action on resource', async () => {
      // Setup data
      mockSupabase.setTableData('user_roles', [mockUserRoleData]);
      mockSupabase.setTableData('role_permissions', mockPermissionsData);
      
      const result = await roleService.canPerformAction(testUserId, 'orders', 'view');
      
      expect(result).toBe(true);
    });

    it('should return false when user cannot perform action', async () => {
      // Setup data
      mockSupabase.setTableData('user_roles', [mockUserRoleData]);
      mockSupabase.setTableData('role_permissions', mockPermissionsData);
      
      const result = await roleService.canPerformAction(testUserId, 'orders', 'delete');
      
      expect(result).toBe(false);
    });

    it('should handle wildcard actions', async () => {
      // Setup data with wildcard permission
      mockSupabase.setTableData('user_roles', [mockUserRoleData]);
      mockSupabase.setTableData('role_permissions', [{
        id: 'perm-wild',
        role: 'staff',
        permission: 'products.all',
        resource: 'products',
        action: '*',
        created_at: '2023-01-01T00:00:00Z',
      }]);
      
      const result = await roleService.canPerformAction(testUserId, 'products', 'delete');
      
      expect(result).toBe(true);
    });
  });

  describe('updateUserRole', () => {
    it('should successfully update user role', async () => {
      // Mock successful upsert (no error)
      mockSupabase.setTableData('user_roles', []);
      
      const result = await roleService.updateUserRole(testUserId, 'manager');
      
      expect(result).toEqual({
        success: true,
        message: 'User role updated successfully',
        data: { userId: testUserId, role: 'manager' },
      });
    });

    it('should handle missing user ID', async () => {
      const result = await roleService.updateUserRole('', 'manager');
      
      expect(result).toEqual({
        success: false,
        error: 'User ID is required',
        message: 'Please provide a valid user ID',
      });
    });

    it('should handle missing role', async () => {
      const result = await roleService.updateUserRole(testUserId, null as any);
      
      expect(result).toEqual({
        success: false,
        error: 'Role is required',
        message: 'Please provide a valid role',
      });
    });

    it('should handle database errors', async () => {
      // Queue error for upsert
      mockSupabase.queueError(new Error('Database update failed'));
      
      const result = await roleService.updateUserRole(testUserId, 'manager');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database update failed');
      expect(result.message).toBe('Failed to update user role. Please try again.');
    });
  });

  describe('utility methods', () => {
    it('should return all available roles', () => {
      const roles = roleService.getAllRoles();
      
      expect(roles).toEqual(['customer', 'staff', 'manager', 'admin', 'farmer', 'vendor']);
    });

    it('should return correct role levels', () => {
      expect(roleService.getRoleLevel('customer')).toBe(1);
      expect(roleService.getRoleLevel('vendor')).toBe(2);
      expect(roleService.getRoleLevel('farmer')).toBe(2);
      expect(roleService.getRoleLevel('staff')).toBe(3);
      expect(roleService.getRoleLevel('manager')).toBe(4);
      expect(roleService.getRoleLevel('admin')).toBe(5);
    });

    it('should correctly compare role privileges', () => {
      expect(roleService.hasHigherPrivileges('admin', 'staff')).toBe(true);
      expect(roleService.hasHigherPrivileges('staff', 'admin')).toBe(false);
      expect(roleService.hasHigherPrivileges('vendor', 'farmer')).toBe(false); // Same level
      expect(roleService.hasHigherPrivileges('manager', 'customer')).toBe(true);
    });
  });
});