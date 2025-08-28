/**
 * UserRoleService Comprehensive Test Suite
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
      USER_ROLES: 'user_roles',
      USERS: 'users',
      ROLE_PERMISSIONS: 'role_permissions'
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

import { UserRoleService } from '../userRoleService';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { supabase } from '../../config/supabase';

describe('UserRoleService - Comprehensive Test Suite', () => {
  let service: UserRoleService;
  let mockSupabase: any;
  
  // Test data following the architectural patterns
  const validUserRoles = [
    {
      id: 'ur-1',
      user_id: 'user-1',
      role: 'customer',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'ur-2',
      user_id: 'user-1',
      role: 'staff',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'ur-3',
      user_id: 'user-2',
      role: 'manager',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'ur-4',
      user_id: 'user-3',
      role: 'admin',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'ur-5',
      user_id: 'user-4',
      role: 'customer',
      is_active: false, // Inactive role
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ];
  
  // Invalid data for testing resilient validation (Pattern 3)
  const invalidUserRole = {
    id: '', // Invalid: empty ID
    user_id: null, // Invalid: null user_id
    role: 123, // Invalid: number instead of string
    is_active: 'yes', // Invalid: string instead of boolean
    created_at: 'invalid-date',
    updated_at: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = supabase as any;
    service = new UserRoleService(mockSupabase);
  });

  describe('getUserRoles', () => {
    it('should fetch all roles for a user', async () => {
      const user1Roles = validUserRoles.filter(r => r.user_id === 'user-1');
      
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: user1Roles,
            error: null
          })
        })
      });

      const result = await service.getUserRoles('user-1');
      
      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user-1');
      expect(result.map(r => r.role)).toContain('customer');
      expect(result.map(r => r.role)).toContain('staff');
      expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
    });

    it('should return only active roles when activeOnly is true', async () => {
      const allRoles = validUserRoles.filter(r => r.user_id === 'user-4');
      
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: allRoles.filter(r => r.is_active),
              error: null
            })
          })
        })
      });

      const result = await service.getUserRoles('user-4', true);
      
      expect(result).toHaveLength(0); // user-4 has only inactive roles
    });

    it('should return empty array when user has no roles', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      const result = await service.getUserRoles('user-no-roles');
      
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

      await expect(service.getUserRoles('user-1'))
        .rejects.toThrow('Failed to fetch user roles');
      
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'UserRoleService.getUserRoles',
          errorCode: 'DATABASE_ERROR'
        })
      );
    });

    it('should skip invalid roles during validation (Pattern 3: Resilient Processing)', async () => {
      const mixedData = [
        validUserRoles[0],
        invalidUserRole,
        validUserRoles[1]
      ];
      
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mixedData,
            error: null
          })
        })
      });

      const result = await service.getUserRoles('user-1');
      
      // Should only return valid roles
      expect(result).toHaveLength(2);
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'UserRoleService.getUserRoles',
          errorCode: 'ROLE_VALIDATION_FAILED'
        })
      );
    });
  });

  describe('checkUserRole', () => {
    it('should return true when user has the role', async () => {
      const userRoles = validUserRoles.filter(r => r.user_id === 'user-1' && r.role === 'staff');
      
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: userRoles[0],
                  error: null
                })
              })
            })
          })
        })
      });

      const result = await service.checkUserRole('user-1', 'staff');
      
      expect(result).toBe(true);
    });

    it('should return false when user lacks the role', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: null
                })
              })
            })
          })
        })
      });

      const result = await service.checkUserRole('user-1', 'admin');
      
      expect(result).toBe(false);
    });

    it('should check only active roles when specified', async () => {
      const inactiveRole = validUserRoles.find(r => r.user_id === 'user-4' && !r.is_active);
      
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null, // No active role found
                  error: null
                })
              })
            })
          })
        })
      });

      const result = await service.checkUserRole('user-4', 'customer', true);
      
      expect(result).toBe(false);
    });
  });

  describe('assignRole', () => {
    it('should assign new role to user', async () => {
      const newRole = {
        id: 'ur-new',
        user_id: 'user-5',
        role: 'vendor',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: newRole,
              error: null
            })
          })
        })
      });

      const result = await service.assignRole('user-5', 'vendor');
      
      expect(result).toBeTruthy();
      expect(result.userId).toBe('user-5');
      expect(result.role).toBe('vendor');
      expect(result.isActive).toBe(true);
    });

    it('should handle duplicate role assignment errors', async () => {
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

      await expect(service.assignRole('user-1', 'customer'))
        .rejects.toThrow('Failed to assign role');
    });
  });

  describe('removeRole', () => {
    it('should remove role from user', async () => {
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

      const result = await service.removeRole('user-1', 'staff');
      
      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
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

      const result = await service.removeRole('user-2', 'manager');
      
      expect(result).toBe(false);
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('activateRole', () => {
    it('should activate an inactive role', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      });

      const result = await service.activateRole('user-4', 'customer');
      
      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
    });
  });

  describe('deactivateRole', () => {
    it('should deactivate an active role', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      });

      const result = await service.deactivateRole('user-1', 'customer');
      
      expect(result).toBe(true);
    });
  });

  describe('getUsersByRole', () => {
    it('should fetch all users with a specific role', async () => {
      const customerRoles = validUserRoles.filter(r => r.role === 'customer');
      
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: customerRoles,
            error: null
          })
        })
      });

      const result = await service.getUsersByRole('customer');
      
      expect(result).toHaveLength(2);
      expect(result.map(r => r.userId)).toContain('user-1');
      expect(result.map(r => r.userId)).toContain('user-4');
    });

    it('should return only active roles when specified', async () => {
      const activeCustomerRoles = validUserRoles.filter(r => r.role === 'customer' && r.is_active);
      
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: activeCustomerRoles,
              error: null
            })
          })
        })
      });

      const result = await service.getUsersByRole('customer', true);
      
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
    });
  });

  describe('bulkAssignRoles', () => {
    it('should assign multiple roles to a user', async () => {
      const newRoles = ['vendor', 'farmer'];
      const insertedRoles = newRoles.map((role, idx) => ({
        id: `ur-bulk-${idx}`,
        user_id: 'user-6',
        role,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: insertedRoles,
            error: null
          })
        })
      });

      const result = await service.bulkAssignRoles('user-6', newRoles);
      
      expect(result).toHaveLength(2);
      expect(result.map(r => r.role)).toContain('vendor');
      expect(result.map(r => r.role)).toContain('farmer');
    });

    it('should handle partial failures gracefully', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Some roles already exist' }
          })
        })
      });

      await expect(service.bulkAssignRoles('user-1', ['admin', 'customer']))
        .rejects.toThrow('Failed to bulk assign roles');
    });
  });

  describe('replaceUserRoles', () => {
    it('should replace all user roles with new ones', async () => {
      // Mock delete operation
      mockSupabase.from = jest.fn()
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'ur-replace-1',
                  user_id: 'user-7',
                  role: 'manager',
                  is_active: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ],
              error: null
            })
          })
        });

      const result = await service.replaceUserRoles('user-7', ['manager']);
      
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('manager');
    });
  });

  describe('Pattern Compliance Tests', () => {
    it('should follow Pattern 3: Individual validation with skip-on-error', async () => {
      const dataWithMultipleInvalid = [
        validUserRoles[0],
        { id: '', user_id: null, role: '' }, // Invalid
        validUserRoles[1],
        { id: 'bad', user_id: 123, role: [] }, // Invalid 
        validUserRoles[2]
      ];
      
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: dataWithMultipleInvalid,
            error: null
          })
        })
      });

      const result = await service.getUserRoles('user-1');
      
      // Should return only valid items
      expect(result).toHaveLength(3);
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledTimes(2);
    });

    it('should follow Pattern 1: Single validation pass', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: validUserRoles.slice(0, 2),
            error: null
          })
        })
      });

      const result = await service.getUserRoles('user-1');
      
      // Verify transformation occurred
      expect(result[0]).toHaveProperty('userId'); // camelCase transformation
      expect(result[0]).not.toHaveProperty('user_id'); // snake_case removed
      expect(result[0]).toHaveProperty('isActive'); // camelCase transformation
      expect(result[0]).not.toHaveProperty('is_active'); // snake_case removed
    });

    it('should handle null/undefined data gracefully', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      });

      const result = await service.getUserRoles('user-1');
      
      expect(result).toEqual([]);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('Performance and Scale Tests', () => {
    it('should handle large role sets efficiently', async () => {
      const largeRoleSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `ur-${i}`,
        user_id: `user-${i % 100}`,
        role: ['customer', 'staff', 'manager', 'admin'][i % 4],
        is_active: i % 2 === 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }));
      
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: largeRoleSet.filter(r => r.role === 'customer'),
            error: null
          })
        })
      });

      const startTime = Date.now();
      const result = await service.getUsersByRole('customer');
      const duration = Date.now() - startTime;
      
      expect(result).toHaveLength(250);
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
        await service.getUserRoles('user-1');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Failed to fetch user roles');
        expect(error.userMessage).toBeDefined();
      }
    });
  });

  describe('Role Hierarchy and Inheritance', () => {
    it('should check if user has higher or equal role', async () => {
      const user1Roles = validUserRoles.filter(r => r.user_id === 'user-1');
      
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: user1Roles,
            error: null
          })
        })
      });

      const result = await service.hasRoleOrHigher('user-1', 'customer');
      
      expect(result).toBe(true); // user has staff which is higher than customer
    });
  });
});