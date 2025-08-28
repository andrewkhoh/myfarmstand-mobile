/**
 * RolePermissionService Test - Following SimplifiedSupabaseMock Pattern
 * Based on the successful cartService.test.ts pattern (100% success rate)
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
    TABLES: {
      ROLE_PERMISSIONS: 'role_permissions',
      PERMISSIONS: 'permissions',
      ROLE_HIERARCHY: 'role_hierarchy'
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

// ============================================================================
// IMPORTS - AFTER ALL MOCKS ARE SET UP
// ============================================================================

import { SimplifiedSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { supabase } from '../../config/supabase';
import { RolePermissionService } from '../rolePermissionService';

describe('RolePermissionService', () => {
  let mockSupabase: SimplifiedSupabaseMock;
  let service: RolePermissionService;
  
  // Test data
  const mockPermissions = [
    {
      id: 'perm-1',
      role: 'inventory_staff',
      permission: 'inventory.view',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'perm-2', 
      role: 'inventory_staff',
      permission: 'inventory.update',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'perm-3',
      role: 'inventory_staff',
      permission: 'products.view',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'perm-4',
      role: 'inventory_manager',
      permission: 'inventory.view',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'perm-5',
      role: 'inventory_manager',
      permission: 'inventory.update',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'perm-6',
      role: 'inventory_manager',
      permission: 'inventory.delete',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'perm-7',
      role: 'inventory_manager',
      permission: 'inventory.approve',
      created_at: '2024-01-01T00:00:00Z'
    }
  ];

  const mockRoleHierarchy = [
    {
      id: 'hierarchy-1',
      parent_role: 'inventory_manager',
      child_role: 'inventory_staff',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'hierarchy-2',
      parent_role: 'executive',
      child_role: 'inventory_manager',
      created_at: '2024-01-01T00:00:00Z'
    }
  ];

  beforeEach(() => {
    // Create new mock instance for each test
    mockSupabase = new SimplifiedSupabaseMock();
    
    // Set up test data
    mockSupabase.setTableData('role_permissions', mockPermissions);
    mockSupabase.setTableData('role_hierarchy', mockRoleHierarchy);
    mockSupabase.setTableData('user_roles', []);
    
    // Create service instance with mock client
    const mockClient = mockSupabase.createClient();
    service = new RolePermissionService(mockClient as any);
    
    jest.clearAllMocks();
  });

  describe('getRolePermissions', () => {
    it('should fetch permissions for a specific role', async () => {
      const result = await service.getRolePermissions('inventory_staff');
      
      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            permission: 'inventory.view',
            role: 'inventory_staff'
          }),
          expect.objectContaining({
            permission: 'inventory.update',
            role: 'inventory_staff'
          }),
          expect.objectContaining({
            permission: 'products.view',
            role: 'inventory_staff'
          })
        ])
      );
    });

    it('should return empty array for non-existent role', async () => {
      const result = await service.getRolePermissions('non_existent_role');
      
      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      // Queue an error for the next operation
      mockSupabase.queueError(new Error('Database connection failed'));
      
      await expect(service.getRolePermissions('inventory_staff'))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('hasPermission', () => {
    it('should return true when role has permission', async () => {
      const result = await service.hasPermission('inventory_staff', 'inventory.view');
      
      expect(result).toBe(true);
    });

    it('should return false when role lacks permission', async () => {
      const result = await service.hasPermission('inventory_staff', 'inventory.delete');
      
      expect(result).toBe(false);
    });

    it('should return false for non-existent role', async () => {
      const result = await service.hasPermission('non_existent_role', 'inventory.view');
      
      expect(result).toBe(false);
    });

    it('should handle empty permission string', async () => {
      const result = await service.hasPermission('inventory_staff', '');
      
      expect(result).toBe(false);
    });
  });

  describe('getAllPermissions', () => {
    it('should fetch all permissions in the system', async () => {
      const result = await service.getAllPermissions();
      
      expect(result.length).toBeGreaterThanOrEqual(7);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ permission: 'inventory.view' }),
          expect.objectContaining({ permission: 'inventory.update' }),
          expect.objectContaining({ permission: 'inventory.delete' }),
          expect.objectContaining({ permission: 'inventory.approve' }),
          expect.objectContaining({ permission: 'products.view' })
        ])
      );
    });

    it('should return empty array when no permissions exist', async () => {
      mockSupabase.setTableData('role_permissions', []);
      
      const result = await service.getAllPermissions();
      
      expect(result).toEqual([]);
    });
  });

  describe('addPermission', () => {
    it('should add a new permission to a role', async () => {
      const result = await service.addPermission('inventory_staff', 'inventory.export');
      
      expect(result).toBeTruthy();
      expect(result).toMatchObject({
        role: 'inventory_staff',
        permission: 'inventory.export'
      });
      
      // Verify permission was added
      const permissions = mockSupabase.getTableData('role_permissions');
      expect(permissions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'inventory_staff',
            permission: 'inventory.export'
          })
        ])
      );
    });

    it('should return existing permission when already granted', async () => {
      // Try to add existing permission
      const result = await service.addPermission('inventory_staff', 'inventory.view');
      
      expect(result).toBeTruthy();
      expect(result).toMatchObject({
        role: 'inventory_staff',
        permission: 'inventory.view'
      });
    });

    it('should handle database errors during add', async () => {
      mockSupabase.queueError(new Error('Insert failed'));
      
      await expect(service.addPermission('inventory_staff', 'new.permission'))
        .rejects.toThrow('Insert failed');
    });
  });

  describe('removePermission', () => {
    it('should remove an existing permission from a role', async () => {
      const result = await service.removePermission('inventory_staff', 'inventory.update');
      
      expect(result).toBeTruthy();
      
      // Verify permission was removed
      const permissions = mockSupabase.getTableData('role_permissions');
      expect(permissions).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'inventory_staff',
            permission: 'inventory.update'
          })
        ])
      );
    });

    it('should handle removing non-existent permission', async () => {
      const result = await service.removePermission('inventory_staff', 'non.existent');
      
      expect(result).toBeTruthy(); // Should succeed even if permission doesn't exist
    });

    it('should handle database errors during remove', async () => {
      mockSupabase.queueError(new Error('Delete failed'));
      
      const result = await service.removePermission('inventory_staff', 'inventory.view');
      expect(result).toBe(false);
    });
  });

  describe('getRolesByPermission', () => {
    it('should fetch all roles that have a specific permission', async () => {
      const result = await service.getRolesByPermission('inventory.view');
      
      expect(result).toEqual(
        expect.arrayContaining([
          'inventory_staff',
          'inventory_manager'
        ])
      );
    });

    it('should return empty array when no roles have the permission', async () => {
      const result = await service.getRolesByPermission('non.existent');
      
      expect(result).toEqual([]);
    });
  });

  describe('getUserPermissions', () => {
    it('should fetch permissions for a user based on their roles', async () => {
      // Add user roles data
      mockSupabase.setTableData('user_roles', [
        { user_id: 'user-1', role: 'inventory_staff' },
        { user_id: 'user-1', role: 'inventory_manager' }
      ]);
      
      const result = await service.getUserPermissions('user-1');
      
      expect(result.length).toBeGreaterThanOrEqual(4);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ permission: 'inventory.view' }),
          expect.objectContaining({ permission: 'inventory.update' }),
          expect.objectContaining({ permission: 'inventory.delete' }),
          expect.objectContaining({ permission: 'inventory.approve' })
        ])
      );
    });

    it('should return empty array for user with no roles', async () => {
      const result = await service.getUserPermissions('user-2');
      
      expect(result).toEqual([]);
    });
  });

  describe('bulkUpdateRolePermissions', () => {
    it('should replace all permissions for a role', async () => {
      const newPermissions = ['reports.view', 'reports.export', 'reports.delete'];
      
      const result = await service.bulkUpdateRolePermissions('inventory_staff', newPermissions);
      
      expect(result).toBeTruthy();
      
      // Verify old permissions were removed and new ones added
      const allPermissions = mockSupabase.getTableData('role_permissions')
        .filter((p: any) => p.role === 'inventory_staff');
      
      expect(allPermissions).toHaveLength(3);
      newPermissions.forEach(permission => {
        expect(allPermissions).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              role: 'inventory_staff',
              permission
            })
          ])
        );
      });
    });

    it('should handle empty permissions array by removing all permissions', async () => {
      const result = await service.bulkUpdateRolePermissions('inventory_staff', []);
      
      expect(result).toBeTruthy();
      
      const permissions = mockSupabase.getTableData('role_permissions')
        .filter((p: any) => p.role === 'inventory_staff');
      expect(permissions).toHaveLength(0);
    });
  });

  describe('checkPermission', () => {
    it('should return true when role has permission', async () => {
      const result = await service.checkPermission('inventory_staff', 'inventory.view');
      
      expect(result).toBe(true);
    });

    it('should return false when role lacks permission', async () => {
      const result = await service.checkPermission('inventory_staff', 'inventory.delete');
      
      expect(result).toBe(false);
    });

    it('should be an alias for hasPermission', async () => {
      const hasPermResult = await service.hasPermission('inventory_staff', 'inventory.view');
      const checkPermResult = await service.checkPermission('inventory_staff', 'inventory.view');
      
      expect(checkPermResult).toBe(hasPermResult);
    });
  });

  describe('cloneRolePermissions', () => {
    it('should copy all permissions from one role to another', async () => {
      const result = await service.cloneRolePermissions('inventory_staff', 'new_role');
      
      expect(result).toBeTruthy();
      
      // Verify new role has same permissions
      const newRolePermissions = mockSupabase.getTableData('role_permissions')
        .filter((p: any) => p.role === 'new_role');
        
      expect(newRolePermissions).toHaveLength(3);
      expect(newRolePermissions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ permission: 'inventory.view' }),
          expect.objectContaining({ permission: 'inventory.update' }),
          expect.objectContaining({ permission: 'products.view' })
        ])
      );
    });

    it('should handle cloning from non-existent role', async () => {
      const result = await service.cloneRolePermissions('non_existent', 'new_role');
      
      expect(result).toBe(false); // Should return false when source has no permissions
    });

    it('should merge with existing target permissions', async () => {
      // Add existing permission to target role
      mockSupabase.setTableData('role_permissions', [
        ...mockPermissions,
        { id: 'perm-new', role: 'new_role', permission: 'custom.permission' }
      ]);
      
      const result = await service.cloneRolePermissions('inventory_staff', 'new_role');
      
      expect(result).toBeTruthy();
      
      const newRolePermissions = mockSupabase.getTableData('role_permissions')
        .filter((p: any) => p.role === 'new_role');
      
      expect(newRolePermissions).toHaveLength(4); // 3 from staff + 1 existing
    });
  });

  describe('error handling and validation', () => {
    it('should handle empty results gracefully', async () => {
      const result = await service.getRolePermissions('');
      expect(result).toEqual([]);
    });

    it('should validate permission format', async () => {
      await expect(service.hasPermission('inventory_staff', '')).resolves.toBe(false);
      await expect(service.hasPermission('', 'inventory.view')).resolves.toBe(false);
    });

    it('should handle database connection errors', async () => {
      // Create mock with high error rate
      const errorMock = new SimplifiedSupabaseMock({ errorRate: 1 });
      const errorService = new RolePermissionService(errorMock.createClient() as any);
      
      // Should return empty array on error
      const result = await errorService.getRolePermissions('inventory_staff');
      expect(result).toEqual([]);
    });
  });

  describe('alias methods', () => {
    it('should have working addPermissionToRole alias', async () => {
      const result = await service.addPermissionToRole('inventory_staff', 'new.permission');
      expect(result).toBeTruthy();
    });

    it('should have working removePermissionFromRole alias', async () => {
      const result = await service.removePermissionFromRole('inventory_staff', 'inventory.view');
      expect(result).toBeTruthy();
    });
  });
});