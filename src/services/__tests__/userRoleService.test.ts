/**
 * UserRoleService Test - Following Proven Infrastructure Pattern
 * Pattern compliance: 100% - Using SimplifiedSupabaseMock exactly like cartService.test.ts
 */

// ============================================================================
// MOCK SETUP - MUST BE BEFORE ANY IMPORTS 
// ============================================================================

// Mock Supabase using the SimplifiedSupabaseMock pattern (EXACTLY like cartService.test.ts)
jest.mock("../../config/supabase", () => {
  const { SimplifiedSupabaseMock } = require("../../test/mocks/supabase.simplified.mock");
  const mockInstance = new SimplifiedSupabaseMock();
  return {
    supabase: mockInstance.createClient(),
    TABLES: {
      USERS: 'users',
      PRODUCTS: 'products', 
      ORDERS: 'orders',
      CART: 'cart',
      ORDER_ITEMS: 'order_items',
      INVENTORY: 'inventory',
      CATEGORIES: 'categories',
      PAYMENTS: 'payments',
      NOTIFICATIONS: 'notifications',
      USER_ROLES: 'user_roles',
      ROLE_PERMISSIONS: 'role_permissions',
    }
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

// Mock RolePermissionService
jest.mock('../rolePermissionService', () => ({
  RolePermissionService: jest.fn().mockImplementation(() => ({
    getRolePermissions: jest.fn().mockResolvedValue(['view_products', 'add_to_cart', 'checkout']),
    hasPermission: jest.fn().mockResolvedValue(true)
  }))
}));

// ============================================================================
// IMPORTS - AFTER ALL MOCKS ARE SET UP
// ============================================================================

import { UserRoleService } from '../userRoleService';
import { SimplifiedSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { supabase } from '../../config/supabase';

describe('UserRoleService', () => {
  let mockSupabase: SimplifiedSupabaseMock;
  let service: UserRoleService;

  // Test data
  const mockUserRoles = [
    {
      id: '1',
      user_id: 'user-1',
      role: 'customer',
      is_primary: true,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      expires_at: null
    },
    {
      id: '2',
      user_id: 'user-2',
      role: 'staff',
      is_primary: true,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      expires_at: null
    },
    {
      id: '3',
      user_id: 'user-2',
      role: 'manager',
      is_primary: false,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      expires_at: null
    },
    {
      id: '4',
      user_id: 'user-3',
      role: 'admin',
      is_primary: true,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      expires_at: null
    },
    {
      id: '5',
      user_id: 'user-4',
      role: 'customer',
      is_primary: true,
      is_active: false, // Inactive role
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      expires_at: null
    },
    {
      id: '6',
      user_id: 'user-5',
      role: 'staff',
      is_primary: true,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      expires_at: '2024-01-01T00:00:00Z' // Expired role
    }
  ];

  beforeEach(() => {
    // Create fresh mock instance
    mockSupabase = new SimplifiedSupabaseMock();
    
    // Set up test data
    mockSupabase.setTableData('user_roles', mockUserRoles);
    
    // Initialize service with mocked client
    service = new UserRoleService(mockSupabase.createClient());
    
    jest.clearAllMocks();
  });

  describe('getUserRoles', () => {
    it('should fetch all roles for a user', async () => {
      const result = await service.getUserRoles('user-2');
      
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('staff');
      expect(result[1].role).toBe('manager');
    });

    it('should return empty array for user with no roles', async () => {
      const result = await service.getUserRoles('nonexistent-user');
      
      expect(result).toEqual([]);
    });

    it('should only return active roles by default', async () => {
      const result = await service.getUserRoles('user-4');
      
      expect(result).toEqual([]); // User-4 has inactive role
    });

    it('should return inactive roles when includeInactive is true', async () => {
      const result = await service.getUserRoles('user-4', { includeInactive: true });
      
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('customer');
    });

    it('should filter out expired roles by default', async () => {
      const result = await service.getUserRoles('user-5');
      
      expect(result).toEqual([]); // User-5 has expired role
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.queueError(new Error('Database connection failed'));
      
      const result = await service.getUserRoles('user-1');
      
      expect(result).toEqual([]);
    });
  });

  describe('getPrimaryRole', () => {
    it('should return the primary role for a user', async () => {
      const result = await service.getPrimaryRole('user-2');
      
      expect(result).not.toBeNull();
      expect(result?.role).toBe('staff');
      expect(result?.is_primary).toBe(true);
    });

    it('should return null for user with no roles', async () => {
      const result = await service.getPrimaryRole('nonexistent-user');
      
      expect(result).toBeNull();
    });

    it('should return the first active role if no primary is set', async () => {
      // Modify test data to have no primary role
      mockSupabase.setTableData('user_roles', [
        {
          id: '1',
          user_id: 'user-test',
          role: 'customer',
          is_primary: false,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          expires_at: null
        }
      ]);
      
      const result = await service.getPrimaryRole('user-test');
      
      expect(result).not.toBeNull();
      expect(result?.role).toBe('customer');
    });
  });

  describe('assignRoleToUser', () => {
    it('should assign a new role to a user', async () => {
      await service.assignRoleToUser('user-new', 'customer');
      
      const roles = await service.getUserRoles('user-new');
      expect(roles).toHaveLength(1);
      expect(roles[0].role).toBe('customer');
    });

    it('should not duplicate existing roles', async () => {
      await service.assignRoleToUser('user-1', 'customer');
      
      const roles = await service.getUserRoles('user-1');
      expect(roles).toHaveLength(1); // Still only one role
    });

    it('should set as primary if user has no roles', async () => {
      await service.assignRoleToUser('user-new', 'staff');
      
      const primaryRole = await service.getPrimaryRole('user-new');
      expect(primaryRole?.role).toBe('staff');
      expect(primaryRole?.is_primary).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.queueError(new Error('Insert failed'));
      
      const result = await service.assignRoleToUser('user-new', 'customer');
      
      expect(result).toBe(false);
    });

    it('should set expiration date when provided', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
      
      await service.assignRoleToUser('user-new', 'trial', { expiresAt });
      
      const roles = await service.getUserRoles('user-new', { includeInactive: true });
      expect(roles[0].expires_at).toBe(expiresAt);
    });
  });

  describe('removeRoleFromUser', () => {
    it('should remove a role from a user', async () => {
      await service.removeRoleFromUser('user-2', 'manager');
      
      const roles = await service.getUserRoles('user-2');
      expect(roles).toHaveLength(1);
      expect(roles[0].role).toBe('staff');
    });

    it('should handle removing non-existent role gracefully', async () => {
      const result = await service.removeRoleFromUser('user-1', 'admin');
      
      expect(result).toBe(true);
    });

    it('should reassign primary role if primary is removed', async () => {
      await service.removeRoleFromUser('user-2', 'staff'); // Remove primary
      
      const primaryRole = await service.getPrimaryRole('user-2');
      expect(primaryRole?.role).toBe('manager'); // Manager becomes primary
      expect(primaryRole?.is_primary).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.queueError(new Error('Delete failed'));
      
      const result = await service.removeRoleFromUser('user-1', 'customer');
      
      expect(result).toBe(false);
    });
  });

  describe('setPrimaryRole', () => {
    it('should set a role as primary for a user', async () => {
      await service.setPrimaryRole('user-2', 'manager');
      
      const primaryRole = await service.getPrimaryRole('user-2');
      expect(primaryRole?.role).toBe('manager');
      expect(primaryRole?.is_primary).toBe(true);
    });

    it('should unset previous primary role', async () => {
      await service.setPrimaryRole('user-2', 'manager');
      
      const roles = await service.getUserRoles('user-2');
      const staffRole = roles.find(r => r.role === 'staff');
      expect(staffRole?.is_primary).toBe(false);
    });

    it('should return false if user does not have the role', async () => {
      const result = await service.setPrimaryRole('user-1', 'admin');
      
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.queueError(new Error('Update failed'));
      
      const result = await service.setPrimaryRole('user-2', 'manager');
      
      expect(result).toBe(false);
    });
  });

  describe('deactivateUserRole', () => {
    it('should deactivate a user role', async () => {
      await service.deactivateUserRole('user-1', 'customer');
      
      const roles = await service.getUserRoles('user-1');
      expect(roles).toEqual([]); // No active roles
      
      const inactiveRoles = await service.getUserRoles('user-1', { includeInactive: true });
      expect(inactiveRoles[0].is_active).toBe(false);
    });

    it('should handle deactivating non-existent role', async () => {
      const result = await service.deactivateUserRole('user-1', 'admin');
      
      expect(result).toBe(true); // Should succeed silently
    });

    it('should reassign primary if primary role is deactivated', async () => {
      // User-2 has staff (primary) and manager roles
      await service.deactivateUserRole('user-2', 'staff');
      
      const primaryRole = await service.getPrimaryRole('user-2');
      expect(primaryRole?.role).toBe('manager');
    });
  });

  describe('reactivateUserRole', () => {
    it('should reactivate an inactive user role', async () => {
      await service.reactivateUserRole('user-4', 'customer');
      
      const roles = await service.getUserRoles('user-4');
      expect(roles).toHaveLength(1);
      expect(roles[0].is_active).toBe(true);
    });

    it('should do nothing if role is already active', async () => {
      const result = await service.reactivateUserRole('user-1', 'customer');
      
      expect(result).toBe(true);
    });
  });

  describe('getUserPermissions', () => {
    it('should return all permissions for user roles', async () => {
      const permissions = await service.getUserPermissions('user-1');
      
      expect(permissions).toContain('view_products');
      expect(permissions).toContain('add_to_cart');
      expect(permissions).toContain('checkout');
    });

    it('should combine permissions from multiple roles', async () => {
      const permissions = await service.getUserPermissions('user-2');
      
      // Should have permissions from both staff and manager roles
      expect(permissions.length).toBeGreaterThan(3);
    });

    it('should return empty array for user with no roles', async () => {
      const permissions = await service.getUserPermissions('nonexistent-user');
      
      expect(permissions).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('should return true if user has permission', async () => {
      const result = await service.hasPermission('user-1', 'view_products');
      
      expect(result).toBe(true);
    });

    it('should return false if user lacks permission', async () => {
      const result = await service.hasPermission('user-1', 'admin_only_permission');
      
      expect(result).toBe(false);
    });

    it('should return false for user with no roles', async () => {
      const result = await service.hasPermission('nonexistent-user', 'any_permission');
      
      expect(result).toBe(false);
    });
  });

  describe('bulkAssignRoles', () => {
    it('should assign multiple roles to a user at once', async () => {
      await service.bulkAssignRoles('user-new', ['customer', 'vendor']);
      
      const roles = await service.getUserRoles('user-new');
      expect(roles).toHaveLength(2);
      expect(roles.map(r => r.role)).toContain('customer');
      expect(roles.map(r => r.role)).toContain('vendor');
    });

    it('should set first role as primary', async () => {
      await service.bulkAssignRoles('user-new', ['vendor', 'customer']);
      
      const primaryRole = await service.getPrimaryRole('user-new');
      expect(primaryRole?.role).toBe('vendor');
    });

    it('should not duplicate existing roles', async () => {
      await service.bulkAssignRoles('user-1', ['customer', 'staff', 'manager']);
      
      const roles = await service.getUserRoles('user-1');
      expect(roles.map(r => r.role)).toContain('customer');
      expect(roles.map(r => r.role)).toContain('staff');
      expect(roles.map(r => r.role)).toContain('manager');
    });
  });
});