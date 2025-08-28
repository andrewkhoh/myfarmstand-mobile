/**
 * UserRoleService Test - Following SimplifiedSupabaseMock Pattern
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
      USER_ROLES: 'user_roles',
      ROLE_PERMISSIONS: 'role_permissions'
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
import { UserRoleService } from '../userRoleService';

describe('UserRoleService', () => {
  let mockSupabase: SimplifiedSupabaseMock;
  let service: UserRoleService;
  
  // Test data
  const mockUserRoles = [
    {
      id: 'ur-1',
      user_id: 'user-1',
      role: 'inventory_staff',
      assigned_by: 'admin-1',
      assigned_at: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'ur-2',
      user_id: 'user-1',
      role: 'marketing_staff',
      assigned_by: 'admin-1',
      assigned_at: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'ur-3',
      user_id: 'user-2',
      role: 'inventory_manager',
      assigned_by: 'admin-1',
      assigned_at: '2024-01-02T00:00:00Z',
      created_at: '2024-01-02T00:00:00Z'
    },
    {
      id: 'ur-4',
      user_id: 'user-3',
      role: 'executive',
      assigned_by: 'admin-1',
      assigned_at: '2024-01-03T00:00:00Z',
      created_at: '2024-01-03T00:00:00Z'
    }
  ];

  const mockRolePermissions = [
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
      role: 'inventory_manager',
      permission: 'inventory.view',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'perm-4',
      role: 'inventory_manager',
      permission: 'inventory.delete',
      created_at: '2024-01-01T00:00:00Z'
    }
  ];

  beforeEach(() => {
    // Create new mock instance for each test
    mockSupabase = new SimplifiedSupabaseMock();
    
    // Set up test data
    mockSupabase.setTableData('user_roles', mockUserRoles);
    mockSupabase.setTableData('role_permissions', mockRolePermissions);
    
    // Create service instance with mock client
    const mockClient = mockSupabase.createClient();
    service = new UserRoleService(mockClient as any);
    
    jest.clearAllMocks();
  });

  describe('getUserRoles', () => {
    it('should fetch all roles for a specific user', async () => {
      const result = await service.getUserRoles('user-1');
      
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 'user-1',
            role: 'inventory_staff'
          }),
          expect.objectContaining({
            userId: 'user-1',
            role: 'marketing_staff'
          })
        ])
      );
    });

    it('should return empty array for user with no roles', async () => {
      const result = await service.getUserRoles('user-999');
      
      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.queueError(new Error('Database connection failed'));
      
      const result = await service.getUserRoles('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the specified role', async () => {
      const result = await service.hasRole('user-1', 'inventory_staff');
      
      expect(result).toBe(true);
    });

    it('should return false when user lacks the specified role', async () => {
      const result = await service.hasRole('user-1', 'executive');
      
      expect(result).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const result = await service.hasRole('user-999', 'inventory_staff');
      
      expect(result).toBe(false);
    });

    it('should handle empty parameters', async () => {
      const result1 = await service.hasRole('', 'inventory_staff');
      const result2 = await service.hasRole('user-1', '');
      
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });

  describe('assignRole', () => {
    it('should assign a new role to a user', async () => {
      const result = await service.assignRole('user-1', 'executive', 'admin-1');
      
      expect(result).toBeTruthy();
      expect(result).toMatchObject({
        userId: 'user-1',
        role: 'executive',
        assignedBy: 'admin-1'
      });
      
      // Verify role was added
      const userRoles = mockSupabase.getTableData('user_roles');
      expect(userRoles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            user_id: 'user-1',
            role: 'executive',
            assigned_by: 'admin-1'
          })
        ])
      );
    });

    it('should return existing role when already assigned', async () => {
      const result = await service.assignRole('user-1', 'inventory_staff', 'admin-1');
      
      expect(result).toBeTruthy();
      expect(result).toMatchObject({
        userId: 'user-1',
        role: 'inventory_staff'
      });
    });

    it('should handle database errors', async () => {
      mockSupabase.queueError(new Error('Insert failed'));
      
      await expect(service.assignRole('user-999', 'new_role', 'admin-1'))
        .rejects.toThrow('Insert failed');
    });
  });

  describe('removeRole', () => {
    it('should remove an existing role from a user', async () => {
      const result = await service.removeRole('user-1', 'inventory_staff');
      
      expect(result).toBe(true);
      
      // Verify role was removed
      const userRoles = mockSupabase.getTableData('user_roles')
        .filter((r: any) => r.user_id === 'user-1' && r.role === 'inventory_staff');
      expect(userRoles).toHaveLength(0);
    });

    it('should handle removing non-existent role', async () => {
      const result = await service.removeRole('user-1', 'non_existent_role');
      
      expect(result).toBe(true); // Should succeed even if role doesn't exist
    });

    it('should handle database errors', async () => {
      mockSupabase.queueError(new Error('Delete failed'));
      
      const result = await service.removeRole('user-1', 'inventory_staff');
      expect(result).toBe(false);
    });
  });

  describe('getUsersByRole', () => {
    it('should fetch all users with a specific role', async () => {
      const result = await service.getUsersByRole('inventory_staff');
      
      expect(result).toEqual(['user-1']);
    });

    it('should return multiple users with the same role', async () => {
      // Add another user with inventory_staff role
      mockSupabase.setTableData('user_roles', [
        ...mockUserRoles,
        {
          id: 'ur-5',
          user_id: 'user-4',
          role: 'inventory_staff',
          assigned_by: 'admin-1',
          assigned_at: '2024-01-04T00:00:00Z',
          created_at: '2024-01-04T00:00:00Z'
        }
      ]);
      
      const result = await service.getUsersByRole('inventory_staff');
      
      expect(result).toEqual(expect.arrayContaining(['user-1', 'user-4']));
    });

    it('should return empty array for non-existent role', async () => {
      const result = await service.getUsersByRole('non_existent_role');
      
      expect(result).toEqual([]);
    });
  });

  describe('bulkAssignRoles', () => {
    it('should assign multiple roles to a user', async () => {
      const roles = ['role1', 'role2', 'role3'];
      
      const result = await service.bulkAssignRoles('user-5', roles, 'admin-1');
      
      expect(result).toBe(true);
      
      // Verify all roles were added
      const userRoles = mockSupabase.getTableData('user_roles')
        .filter((r: any) => r.user_id === 'user-5');
      expect(userRoles).toHaveLength(3);
    });

    it('should handle empty roles array', async () => {
      const result = await service.bulkAssignRoles('user-5', [], 'admin-1');
      
      expect(result).toBe(true); // Should succeed with no-op
    });

    it('should handle partial failures gracefully', async () => {
      const roles = ['role1', 'role2'];
      
      // Already has inventory_staff, try to add more
      const result = await service.bulkAssignRoles('user-1', roles, 'admin-1');
      
      expect(result).toBe(true);
    });
  });

  describe('bulkRemoveRoles', () => {
    it('should remove multiple roles from a user', async () => {
      const roles = ['inventory_staff', 'marketing_staff'];
      
      const result = await service.bulkRemoveRoles('user-1', roles);
      
      expect(result).toBe(true);
      
      // Verify all roles were removed
      const userRoles = mockSupabase.getTableData('user_roles')
        .filter((r: any) => r.user_id === 'user-1');
      expect(userRoles).toHaveLength(0);
    });

    it('should handle empty roles array', async () => {
      const result = await service.bulkRemoveRoles('user-1', []);
      
      expect(result).toBe(true);
    });

    it('should handle removing non-existent roles', async () => {
      const roles = ['non_existent1', 'non_existent2'];
      
      const result = await service.bulkRemoveRoles('user-1', roles);
      
      expect(result).toBe(true);
    });
  });

  describe('changeUserRole', () => {
    it('should change user from one role to another', async () => {
      const result = await service.changeUserRole('user-1', 'inventory_staff', 'inventory_manager', 'admin-1');
      
      expect(result).toBe(true);
      
      // Verify old role removed and new role added
      const userRoles = mockSupabase.getTableData('user_roles')
        .filter((r: any) => r.user_id === 'user-1');
      
      expect(userRoles).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ role: 'inventory_staff' })
        ])
      );
      
      expect(userRoles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ role: 'inventory_manager' })
        ])
      );
    });

    it('should handle changing from non-existent role', async () => {
      const result = await service.changeUserRole('user-1', 'non_existent', 'new_role', 'admin-1');
      
      expect(result).toBe(true);
      
      // Should still add the new role
      const userRoles = mockSupabase.getTableData('user_roles')
        .filter((r: any) => r.user_id === 'user-1' && r.role === 'new_role');
      expect(userRoles).toHaveLength(1);
    });
  });

  describe('getUserPermissions', () => {
    it('should fetch all permissions for a user based on their roles', async () => {
      const result = await service.getUserPermissions('user-1');
      
      // User has inventory_staff role, should get its permissions
      expect(result).toEqual(
        expect.arrayContaining(['inventory.view', 'inventory.update'])
      );
    });

    it('should fetch permissions for user with multiple roles', async () => {
      // Add inventory_manager role to user-1
      await service.assignRole('user-1', 'inventory_manager', 'admin-1');
      
      const result = await service.getUserPermissions('user-1');
      
      // Should have permissions from both roles
      expect(result).toEqual(
        expect.arrayContaining([
          'inventory.view',
          'inventory.update',
          'inventory.delete'
        ])
      );
    });

    it('should return empty array for user with no roles', async () => {
      const result = await service.getUserPermissions('user-999');
      
      expect(result).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has permission through their role', async () => {
      const result = await service.hasPermission('user-1', 'inventory.view');
      
      expect(result).toBe(true);
    });

    it('should return false when user lacks permission', async () => {
      const result = await service.hasPermission('user-1', 'inventory.delete');
      
      expect(result).toBe(false);
    });

    it('should return false for user with no roles', async () => {
      const result = await service.hasPermission('user-999', 'inventory.view');
      
      expect(result).toBe(false);
    });
  });

  describe('getAllUsers', () => {
    it('should fetch all unique users with roles', async () => {
      const result = await service.getAllUsers();
      
      expect(result).toEqual(
        expect.arrayContaining(['user-1', 'user-2', 'user-3'])
      );
      
      // Should be unique
      const uniqueSet = new Set(result);
      expect(uniqueSet.size).toBe(result.length);
    });

    it('should return empty array when no user roles exist', async () => {
      mockSupabase.setTableData('user_roles', []);
      
      const result = await service.getAllUsers();
      
      expect(result).toEqual([]);
    });
  });

  describe('error handling and validation', () => {
    it('should handle invalid user IDs', async () => {
      const result1 = await service.getUserRoles('');
      const result2 = await service.hasRole('', 'role');
      
      expect(result1).toEqual([]);
      expect(result2).toBe(false);
    });

    it('should handle invalid role names', async () => {
      const result = await service.hasRole('user-1', '');
      
      expect(result).toBe(false);
    });

    it('should handle database connection errors', async () => {
      // Create mock with high error rate
      const errorMock = new SimplifiedSupabaseMock({ errorRate: 1 });
      const errorService = new UserRoleService(errorMock.createClient() as any);
      
      // Should return empty array on error
      const result = await errorService.getUserRoles('user-1');
      expect(result).toEqual([]);
    });
  });
});