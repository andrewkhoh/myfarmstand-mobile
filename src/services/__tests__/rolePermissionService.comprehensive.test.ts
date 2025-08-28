/**
 * RolePermissionService Comprehensive Test Suite
 * Following PROVEN SimplifiedSupabaseMock pattern that achieved 100% success
 * Pattern Reference: src/services/__tests__/cartService.test.ts
 * 
 * CRITICAL: This follows the EXACT pattern from docs/architectural-patterns-and-best-practices.md
 */

// ============================================================================
// MOCK SETUP - MUST BE BEFORE ANY IMPORTS 
// ============================================================================

// Mock Supabase using the SimplifiedSupabaseMock pattern (Pattern from cartService.test.ts)
jest.mock("../../config/supabase", () => {
  const { SimplifiedSupabaseMock } = require("../../test/mocks/supabase.simplified.mock");
  const mockInstance = new SimplifiedSupabaseMock();
  return {
    supabase: mockInstance.createClient(),
    TABLES: {
      ROLE_PERMISSIONS: 'role_permissions',
      USER_ROLES: 'user_roles', 
      USERS: 'users',
    }
  };
});

// Mock validation monitor
jest.mock('../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordPatternSuccess: jest.fn(),
    recordDataIntegrity: jest.fn(),
    recordCalculationMismatch: jest.fn()
  }
}));

// ============================================================================
// IMPORTS - AFTER ALL MOCKS ARE SET UP
// ============================================================================

import { RolePermissionService } from '../rolePermissionService';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { supabase } from '../../config/supabase';

describe('RolePermissionService - Comprehensive Test Suite', () => {
  let service: RolePermissionService;
  let mockSupabase: any;
  
  // Test data following the architectural patterns
  const validRolePermissions = [
    {
      id: 'perm-1',
      role: 'customer',
      permission: 'view_products',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'perm-2',
      role: 'customer',
      permission: 'add_to_cart',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'perm-3',
      role: 'customer',
      permission: 'checkout',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'perm-4',
      role: 'staff',
      permission: 'view_products',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'perm-5',
      role: 'staff',
      permission: 'scan_qr',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'perm-6',
      role: 'staff',
      permission: 'view_orders',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'perm-7',
      role: 'manager',
      permission: 'manage_inventory',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'perm-8',
      role: 'manager',
      permission: 'view_reports',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'perm-9',
      role: 'admin',
      permission: 'manage_users',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'perm-10',
      role: 'admin',
      permission: 'manage_roles',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ];
  
  // Invalid data for testing resilient validation (Pattern 3)
  const invalidPermission = {
    id: '', // Invalid: empty ID
    role: 'invalid_role',
    permission: null, // Invalid: null permission
    created_at: 'invalid-date',
    updated_at: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = supabase as any;
    service = new RolePermissionService(mockSupabase);
  });

  describe('getRolePermissions', () => {
    it('should fetch permissions for a specific role', async () => {
      const customerPerms = validRolePermissions.filter(p => p.role === 'customer');
      
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: customerPerms,
            error: null
          })
        })
      });

      const result = await service.getRolePermissions('customer');
      
      expect(result).toHaveLength(3);
      expect(result[0].role).toBe('customer');
      expect(result.map(p => p.permission)).toEqual(['view_products', 'add_to_cart', 'checkout']);
      expect(mockSupabase.from).toHaveBeenCalledWith('role_permissions');
    });

    it('should return empty array when role has no permissions', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      const result = await service.getRolePermissions('vendor');
      
      expect(result).toEqual([]);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' }
          })
        })
      });

      await expect(service.getRolePermissions('customer'))
        .rejects.toThrow('Failed to fetch role permissions');
      
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'RolePermissionService.getRolePermissions',
          errorCode: 'DATABASE_ERROR'
        })
      );
    });

    it('should skip invalid permissions during validation (Pattern 3: Resilient Processing)', async () => {
      const mixedData = [
        validRolePermissions[0],
        invalidPermission,
        validRolePermissions[1]
      ];
      
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mixedData,
            error: null
          })
        })
      });

      const result = await service.getRolePermissions('customer');
      
      // Should only return valid permissions
      expect(result).toHaveLength(2);
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'RolePermissionService.getRolePermissions',
          errorCode: 'PERMISSION_VALIDATION_FAILED'
        })
      );
    });
  });

  describe('getAllPermissions', () => {
    it('should fetch all permissions from database', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: validRolePermissions,
          error: null
        })
      });

      const result = await service.getAllPermissions();
      
      expect(result).toHaveLength(10);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('role');
      expect(result[0]).toHaveProperty('permission');
    });

    it('should handle empty permission set', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      });

      const result = await service.getAllPermissions();
      
      expect(result).toEqual([]);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('checkPermission', () => {
    it('should return true when role has permission', async () => {
      const staffPerms = validRolePermissions.filter(p => p.role === 'staff');
      
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: staffPerms[0],
                error: null
              })
            })
          })
        })
      });

      const result = await service.checkPermission('staff', 'view_products');
      
      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('role_permissions');
    });

    it('should return false when role lacks permission', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          })
        })
      });

      const result = await service.checkPermission('customer', 'manage_users');
      
      expect(result).toBe(false);
    });

    it('should handle database errors by returning false', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Query failed' }
              })
            })
          })
        })
      });

      const result = await service.checkPermission('staff', 'view_orders');
      
      expect(result).toBe(false);
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('addPermission', () => {
    it('should add new permission to role', async () => {
      const newPermission = {
        id: 'perm-new',
        role: 'vendor',
        permission: 'manage_products',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: newPermission,
              error: null
            })
          })
        })
      });

      const result = await service.addPermission('vendor', 'manage_products');
      
      expect(result).toBeTruthy();
      expect(result.role).toBe('vendor');
      expect(result.permission).toBe('manage_products');
    });

    it('should handle duplicate permission errors gracefully', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Unique constraint violation' }
            })
          })
        })
      });

      await expect(service.addPermission('customer', 'view_products'))
        .rejects.toThrow('Failed to add permission');
    });
  });

  describe('removePermission', () => {
    it('should remove permission from role', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      });

      const result = await service.removePermission('staff', 'scan_qr');
      
      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('role_permissions');
    });

    it('should handle deletion errors', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Deletion failed' }
            })
          })
        })
      });

      const result = await service.removePermission('admin', 'manage_users');
      
      expect(result).toBe(false);
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('getUserPermissions', () => {
    it('should fetch all permissions for user roles', async () => {
      const userRoles = [
        { role: 'customer' },
        { role: 'staff' }
      ];
      
      const customerPerms = validRolePermissions.filter(p => p.role === 'customer');
      const staffPerms = validRolePermissions.filter(p => p.role === 'staff');
      
      // Mock getUserRoles
      mockSupabase.from = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: userRoles,
              error: null
            })
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [...customerPerms, ...staffPerms],
              error: null
            })
          })
        });

      const result = await service.getUserPermissions('user-123');
      
      expect(result).toHaveLength(6);
      expect(result.map(p => p.permission)).toContain('view_products');
      expect(result.map(p => p.permission)).toContain('scan_qr');
    });

    it('should return empty array for user with no roles', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      const result = await service.getUserPermissions('user-no-roles');
      
      expect(result).toEqual([]);
    });
  });

  describe('Pattern Compliance Tests', () => {
    it('should follow Pattern 3: Individual validation with skip-on-error', async () => {
      const dataWithMultipleInvalid = [
        validRolePermissions[0],
        { id: '', role: null, permission: '' }, // Invalid
        validRolePermissions[1],
        { id: 'bad', role: 123, permission: [] }, // Invalid 
        validRolePermissions[2]
      ];
      
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: dataWithMultipleInvalid,
            error: null
          })
        })
      });

      const result = await service.getRolePermissions('customer');
      
      // Should return only valid items
      expect(result).toHaveLength(3);
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledTimes(2);
    });

    it('should follow Pattern 1: Single validation pass', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: validRolePermissions.slice(0, 3),
          error: null
        })
      });

      const result = await service.getAllPermissions();
      
      // Verify transformation occurred
      expect(result[0]).toHaveProperty('createdAt'); // camelCase transformation
      expect(result[0]).not.toHaveProperty('created_at'); // snake_case removed
    });

    it('should handle null/undefined data gracefully', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      });

      const result = await service.getAllPermissions();
      
      expect(result).toEqual([]);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('Performance and Scale Tests', () => {
    it('should handle large permission sets efficiently', async () => {
      const largePermissionSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `perm-${i}`,
        role: ['customer', 'staff', 'manager', 'admin'][i % 4],
        permission: `permission_${i}`,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }));
      
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: largePermissionSet,
          error: null
        })
      });

      const startTime = Date.now();
      const result = await service.getAllPermissions();
      const duration = Date.now() - startTime;
      
      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should process in under 1 second
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should provide user-friendly error messages', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Connection timeout', code: 'TIMEOUT' }
          })
        })
      });

      try {
        await service.getRolePermissions('customer');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Failed to fetch role permissions');
        expect(error.userMessage).toBeDefined();
      }
    });

    it('should retry on transient failures', async () => {
      let callCount = 0;
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                data: null,
                error: { message: 'Temporary failure' }
              });
            }
            return Promise.resolve({
              data: validRolePermissions.filter(p => p.role === 'customer'),
              error: null
            });
          })
        })
      });

      // Service should have retry logic
      const result = await service.getRolePermissions('customer');
      
      // If retry is implemented, this should succeed
      // For now, we expect the error
      expect(result).toBeDefined();
    });
  });
});