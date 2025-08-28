/**
 * RolePermissionService Test
 * Following MANDATORY SimplifiedSupabaseMock pattern from successful tests
 * Pattern Reference: src/services/__tests__/cartService.test.ts
 */

// ============================================================================
// MOCK SETUP - MUST BE BEFORE ANY IMPORTS 
// ============================================================================

// Mock Supabase using the SimplifiedSupabaseMock pattern
const { SimplifiedSupabaseMock } = require("../../test/mocks/supabase.simplified.mock");
const mockSupabaseInstance = new SimplifiedSupabaseMock();

jest.mock("../../config/supabase", () => ({
  supabase: mockSupabaseInstance.createClient(),
  TABLES: {
    ROLE_PERMISSIONS: 'role_permissions',
    USER_ROLES: 'user_roles',
    USERS: 'users',
  }
}));

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

import { RolePermissionService } from '../rolePermissionService';
import { ValidationMonitor } from '../../utils/validationMonitor';

describe('RolePermissionService', () => {
  let service: RolePermissionService;

  // Test data
  const mockPermissions = {
    customer: ['view_products', 'add_to_cart', 'checkout'],
    staff: ['view_products', 'add_to_cart', 'checkout', 'scan_qr', 'view_orders'],
    manager: ['view_products', 'add_to_cart', 'checkout', 'scan_qr', 'view_orders', 'manage_inventory', 'view_reports'],
    admin: ['view_products', 'add_to_cart', 'checkout', 'scan_qr', 'view_orders', 'manage_inventory', 'view_reports', 'manage_users', 'manage_roles']
  };

  const mockRolePermissionRecords = [
    {
      id: '1',
      role: 'customer',
      permission: 'view_products',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      role: 'customer',
      permission: 'add_to_cart',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '3',
      role: 'customer',
      permission: 'checkout',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '4',
      role: 'staff',
      permission: 'view_products',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '5',
      role: 'staff',
      permission: 'scan_qr',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '6',
      role: 'admin',
      permission: 'manage_users',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ];

  beforeEach(() => {
    // Reset mock instance data
    mockSupabaseInstance.clearAllData();
    
    // Set up test data
    mockSupabaseInstance.setTableData('role_permissions', mockRolePermissionRecords);
    
    // Initialize service with the already-mocked supabase from config
    const { supabase } = require('../../config/supabase');
    service = new RolePermissionService(supabase);
    
    jest.clearAllMocks();
  });

  describe('getRolePermissions', () => {
    it('should fetch permissions for a specific role', async () => {
      const result = await service.getRolePermissions('customer');
      
      expect(result).toEqual(['view_products', 'add_to_cart', 'checkout']);
    });

    it('should return empty array for non-existent role', async () => {
      const result = await service.getRolePermissions('nonexistent');
      
      expect(result).toEqual([]);
    });

    it('should return all permissions for admin role', async () => {
      // Add more admin permissions to test data
      mockSupabaseInstance.setTableData('role_permissions', [
        ...mockRolePermissionRecords,
        { id: '7', role: 'admin', permission: 'manage_roles', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
        { id: '8', role: 'admin', permission: 'view_reports', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }
      ]);
      
      const result = await service.getRolePermissions('admin');
      
      expect(result).toContain('manage_users');
      expect(result).toContain('manage_roles');
      expect(result).toContain('view_reports');
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseInstance.queueError(new Error('Database connection failed'));
      
      const result = await service.getRolePermissions('customer');
      
      expect(result).toEqual([]);
    });

    it('should validate and skip invalid permission records', async () => {
      mockSupabaseInstance.setTableData('role_permissions', [
        { id: '1', role: 'customer', permission: 'valid_permission', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
        { id: '2', role: 'customer', permission: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }, // Invalid
        { id: '3', role: 'customer', permission: '', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }, // Invalid
        { id: '4', role: 'customer', permission: 'another_valid', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }
      ]);
      
      const result = await service.getRolePermissions('customer');
      
      expect(result).toEqual(['valid_permission', 'another_valid']);
    });
  });

  describe('hasPermission', () => {
    it('should return true when role has permission', async () => {
      const result = await service.hasPermission('customer', 'view_products');
      
      expect(result).toBe(true);
    });

    it('should return false when role does not have permission', async () => {
      const result = await service.hasPermission('customer', 'manage_users');
      
      expect(result).toBe(false);
    });

    it('should return false for non-existent role', async () => {
      const result = await service.hasPermission('nonexistent', 'view_products');
      
      expect(result).toBe(false);
    });

    it('should cache permission checks for performance', async () => {
      // First call - should hit database
      await service.hasPermission('customer', 'view_products');
      
      // Clear mock to verify cache usage
      mockSupabaseInstance.clearAllData();
      
      // Second call - should use cache
      const result = await service.hasPermission('customer', 'view_products');
      
      expect(result).toBe(true);
    });
  });

  describe('getAllPermissions', () => {
    it('should return all unique permissions in the system', async () => {
      const result = await service.getAllPermissions();
      
      expect(result).toContain('view_products');
      expect(result).toContain('add_to_cart');
      expect(result).toContain('checkout');
      expect(result).toContain('scan_qr');
      expect(result).toContain('manage_users');
      expect(result.length).toBe(6); // All unique permissions
    });

    it('should return empty array when no permissions exist', async () => {
      mockSupabaseInstance.setTableData('role_permissions', []);
      
      const result = await service.getAllPermissions();
      
      expect(result).toEqual([]);
    });
  });

  describe('getRolesByPermission', () => {
    it('should return all roles that have a specific permission', async () => {
      const result = await service.getRolesByPermission('view_products');
      
      expect(result).toContain('customer');
      expect(result).toContain('staff');
    });

    it('should return empty array for non-existent permission', async () => {
      const result = await service.getRolesByPermission('nonexistent_permission');
      
      expect(result).toEqual([]);
    });

    it('should return only admin for admin-specific permissions', async () => {
      const result = await service.getRolesByPermission('manage_users');
      
      expect(result).toEqual(['admin']);
    });
  });

  describe('addPermissionToRole', () => {
    it('should add a new permission to a role', async () => {
      await service.addPermissionToRole('customer', 'view_orders');
      
      const permissions = await service.getRolePermissions('customer');
      expect(permissions).toContain('view_orders');
    });

    it('should not duplicate existing permissions', async () => {
      await service.addPermissionToRole('customer', 'view_products');
      
      const permissions = await service.getRolePermissions('customer');
      const viewProductsCount = permissions.filter(p => p === 'view_products').length;
      expect(viewProductsCount).toBe(1);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseInstance.queueError(new Error('Insert failed'));
      
      const result = await service.addPermissionToRole('customer', 'new_permission');
      
      expect(result).toBe(false);
    });
  });

  describe('removePermissionFromRole', () => {
    it('should remove a permission from a role', async () => {
      await service.removePermissionFromRole('customer', 'checkout');
      
      const permissions = await service.getRolePermissions('customer');
      expect(permissions).not.toContain('checkout');
    });

    it('should handle removing non-existent permission gracefully', async () => {
      const result = await service.removePermissionFromRole('customer', 'nonexistent');
      
      expect(result).toBe(true); // Should succeed even if permission doesn't exist
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseInstance.queueError(new Error('Delete failed'));
      
      const result = await service.removePermissionFromRole('customer', 'view_products');
      
      expect(result).toBe(false);
    });
  });

  describe('bulkUpdateRolePermissions', () => {
    it('should replace all permissions for a role', async () => {
      const newPermissions = ['read_only', 'view_catalog'];
      
      await service.bulkUpdateRolePermissions('customer', newPermissions);
      
      const permissions = await service.getRolePermissions('customer');
      expect(permissions).toEqual(newPermissions);
    });

    it('should handle empty permissions array', async () => {
      await service.bulkUpdateRolePermissions('customer', []);
      
      const permissions = await service.getRolePermissions('customer');
      expect(permissions).toEqual([]);
    });

    it('should handle database transaction errors', async () => {
      mockSupabaseInstance.queueError(new Error('Transaction failed'));
      
      const result = await service.bulkUpdateRolePermissions('customer', ['new_permission']);
      
      expect(result).toBe(false);
    });
  });

  describe('cloneRolePermissions', () => {
    it('should copy all permissions from one role to another', async () => {
      await service.cloneRolePermissions('staff', 'new_role');
      
      const sourcePermissions = await service.getRolePermissions('staff');
      const targetPermissions = await service.getRolePermissions('new_role');
      
      expect(targetPermissions).toEqual(sourcePermissions);
    });

    it('should handle cloning to existing role by merging permissions', async () => {
      await service.cloneRolePermissions('staff', 'customer');
      
      const permissions = await service.getRolePermissions('customer');
      
      // Should have both original customer permissions and staff permissions
      expect(permissions).toContain('view_products'); // Original customer
      expect(permissions).toContain('scan_qr'); // From staff
    });

    it('should handle non-existent source role', async () => {
      const result = await service.cloneRolePermissions('nonexistent', 'new_role');
      
      expect(result).toBe(false);
    });
  });
});