// Test Infrastructure Imports
import { createProduct, createUser, resetAllFactories } from "../../test/factories";

/**
 * RolePermissionService Test - Following Service Test Pattern (REFERENCE)
 */

// Setup all mocks BEFORE any imports
jest.mock("../../config/supabase", () => {
  const { SimplifiedSupabaseMock } = require("../../test/mocks/supabase.simplified.mock");
  const mockInstance = new SimplifiedSupabaseMock();
  return {
  const mockFrom = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    order: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis()
  }));
  
  return {
    supabase: {
      from: mockFrom,
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123', role: 'admin' } },
          error: null
        })
      }
    },
    TABLES: {
      USER_ROLES: 'user_roles',
      ROLE_PERMISSIONS: 'role_permissions',
      USERS: 'users'
    }
  };
    TABLES: { /* Add table constants */ }
  };
});

jest.mock('../../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordPatternSuccess: jest.fn(),
    recordValidationError: jest.fn()
  }
}));

// Import AFTER mocks are setup
import { RolePermissionService } from '../rolePermissionService';
import { supabase } from '../../../config/supabase';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Get mock references for use in tests
const mockSupabaseFrom = supabase.from as jest.Mock;

describe('RolePermissionService - Phase 1', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserRole', () => {
    it('should get user role with transformation and monitoring', async () => {
      const mockRoleData = {
        id: 'role-123',
        user_id: 'user-456',
        role_type: 'inventory_staff',
        permissions: ['view_inventory'],
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Setup mock database response
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockRoleData,
          error: null
        })
      });

      const result = await RolePermissionService.getUserRole('user-456');

      // Verify transformation occurred (snake_case → camelCase)
      expect(result?.id).toBe('role-123');
      expect(result?.userId).toBe('user-456');
      expect(result?.roleType).toBe('inventory_staff');
      expect(result?.permissions).toEqual(['view_inventory']);
      expect(result?.isActive).toBe(true);

      // Verify ValidationMonitor integration
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        context: 'rolePermissionService',
        pattern: 'transformation_schema',
        operation: 'getUserRole'
      });

      // Verify database query structure
      expect(mockSupabaseFrom).toHaveBeenCalledWith('user_roles');
    });

    it('should return null when user role not found', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      });

      const result = await RolePermissionService.getUserRole('nonexistent');
      
      expect(result).toBeNull();
      // ValidationMonitor.recordPatternSuccess should NOT be called when no data found
      expect(ValidationMonitor.recordPatternSuccess).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully and record failures', async () => {
      const databaseError = { message: 'Database connection failed' };
      
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: databaseError
        })
      });

      const result = await RolePermissionService.getUserRole('user-456');
      
      // Graceful degradation
      expect(result).toBeNull();
      
      // Error monitoring
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'RolePermissionService.getUserRole',
        errorMessage: 'Database connection failed',
        errorCode: 'ROLE_FETCH_FAILED',
        validationPattern: 'transformation_schema'
      });
    });

    it('should handle malformed data with schema validation', async () => {
      const malformedData = {
        id: 'test',
        // Missing required fields
        invalid_field: 'bad data'
      };

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: malformedData,
          error: null
        })
      });

      const result = await RolePermissionService.getUserRole('user-456');
      
      // Should return null due to validation failure
      expect(result).toBeNull();
      
      // Should record validation error
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('hasPermission', () => {
    it('should check role-based permissions correctly', async () => {
      const mockUserRole = {
        id: 'role-123',
        userId: 'user-456',
        roleType: 'inventory_staff' as const,
        permissions: [],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      // Mock getUserRole to return inventory staff
      jest.spyOn(RolePermissionService, 'getUserRole').mockResolvedValue(mockUserRole);

      const hasPermission = await RolePermissionService.hasPermission('user-456', 'view_inventory');
      
      expect(hasPermission).toBe(true); // inventory_staff has view_inventory permission
      
      // Verify analytics tracking
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        context: 'rolePermissionService',
        pattern: 'simple_input_validation',
        operation: 'hasPermission'
      });
    });

    it('should check custom permissions correctly', async () => {
      const mockUserRole = {
        id: 'role-123',
        userId: 'user-456',
        roleType: 'inventory_staff' as const,
        permissions: ['custom_permission'],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      jest.spyOn(RolePermissionService, 'getUserRole').mockResolvedValue(mockUserRole);

      const hasPermission = await RolePermissionService.hasPermission('user-456', 'custom_permission');
      
      expect(hasPermission).toBe(true);
    });

    it('should return false for invalid permissions', async () => {
      const mockUserRole = {
        id: 'role-123',
        userId: 'user-456',
        roleType: 'inventory_staff' as const,
        permissions: [],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      jest.spyOn(RolePermissionService, 'getUserRole').mockResolvedValue(mockUserRole);

      const hasPermission = await RolePermissionService.hasPermission('user-456', 'invalid_permission');
      
      expect(hasPermission).toBe(false);
    });

    it('should fail closed when user has no role (security)', async () => {
      jest.spyOn(RolePermissionService, 'getUserRole').mockResolvedValue(null);

      const hasPermission = await RolePermissionService.hasPermission('user-456', 'any_permission');
      
      expect(hasPermission).toBe(false); // Fail closed for security
    });

    it('should handle errors gracefully and fail closed', async () => {
      jest.spyOn(RolePermissionService, 'getUserRole').mockRejectedValue(new Error('Service error'));

      const hasPermission = await RolePermissionService.hasPermission('user-456', 'any_permission');
      
      expect(hasPermission).toBe(false); // Fail closed
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('getAllUserRoles', () => {
    it('should process valid items and skip invalid ones (resilient processing)', async () => {
      const mockRoleData = [
        {
          id: 'role-1',
          user_id: 'user-1',
          role_type: 'inventory_staff',
          permissions: ['view_inventory'],
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        { 
          id: 'invalid-role',
          invalid_field: 'bad data'
          // Missing required fields - should be skipped
        },
        {
          id: 'role-2',
          user_id: 'user-2',
          role_type: 'marketing_staff',
          permissions: [],
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockRoleData,
          error: null
        })
      });

      const result = await RolePermissionService.getAllUserRoles();
      
      // Should process 2 valid items, skip 1 invalid
      expect(result.success).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.totalProcessed).toBe(2);
      
      // Verify first valid item transformation
      expect(result.success[0].userId).toBe('user-1');
      expect(result.success[0].roleType).toBe('inventory_staff');
      
      // Verify resilient processing doesn't break on invalid data
      expect(result.success[1].userId).toBe('user-2');
    });

    it('should handle complete database failure gracefully', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database unavailable' }
        })
      });

      const result = await RolePermissionService.getAllUserRoles();
      
      expect(result.success).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.totalProcessed).toBe(0);
      
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'RolePermissionService.getAllUserRoles',
        errorMessage: 'Database unavailable',
        errorCode: 'BULK_ROLE_FETCH_FAILED',
        validationPattern: 'transformation_schema'
      });
    });
  });

  describe('createUserRole', () => {
    it('should create user role with input validation', async () => {
      const inputData = {
        userId: 'user-789',
        roleType: 'marketing_staff' as const,
        permissions: ['view_products']
      };

      const mockCreatedRole = {
        id: 'role-new',
        user_id: 'user-789',
        role_type: 'marketing_staff',
        permissions: ['view_products'],
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockCreatedRole,
          error: null
        })
      });

      const result = await RolePermissionService.createUserRole(inputData);
      
      expect(result?.userId).toBe('user-789');
      expect(result?.roleType).toBe('marketing_staff');
      
      // Verify ValidationMonitor tracking
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        context: 'rolePermissionService',
        pattern: 'transformation_schema',
        operation: 'createUserRole'
      });
    });

    it('should handle creation errors gracefully', async () => {
      const inputData = {
        userId: 'user-789',
        roleType: 'admin' as const,
        permissions: []
      };

      mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Unique constraint violation' }
        })
      });

      const result = await RolePermissionService.createUserRole(inputData);
      
      expect(result).toBeNull();
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });

    it('should validate input before creation', async () => {
      const invalidInput = {
        userId: '', // Invalid empty string
        roleType: 'admin' as const,
        permissions: []
      };

      const result = await RolePermissionService.createUserRole(invalidInput);
      
      expect(result).toBeNull();
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('updateUserPermissions', () => {
    it('should update user permissions with atomic operation', async () => {
      const updatedRole = {
        id: 'role-123',
        user_id: 'user-456',
        role_type: 'inventory_staff',
        permissions: ['view_inventory', 'update_stock', 'new_permission'],
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      };

      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: updatedRole,
          error: null
        })
      });

      const result = await RolePermissionService.updateUserPermissions(
        'user-456', 
        ['view_inventory', 'update_stock', 'new_permission']
      );
      
      expect(result?.permissions).toEqual(['view_inventory', 'update_stock', 'new_permission']);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        context: 'rolePermissionService',
        pattern: 'transformation_schema',
        operation: 'updateUserPermissions'
      });
    });

    it('should handle update errors gracefully', async () => {
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'User not found' }
        })
      });

      const result = await RolePermissionService.updateUserPermissions('nonexistent', []);
      
      expect(result).toBeNull();
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('checkRoleAccess', () => {
    it('should check role access with proper hierarchy', async () => {
      const mockUserRole = {
        id: 'role-123',
        userId: 'user-456',
        roleType: 'admin' as const,
        permissions: ['admin_access'],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      jest.spyOn(RolePermissionService, 'getUserRole').mockResolvedValue(mockUserRole);

      const hasAccess = await RolePermissionService.checkRoleAccess('user-456', ['admin', 'manager']);
      
      expect(hasAccess).toBe(true);
    });

    it('should deny access for insufficient role level', async () => {
      const mockUserRole = {
        id: 'role-123',
        userId: 'user-456',
        roleType: 'staff' as const,
        permissions: [],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      jest.spyOn(RolePermissionService, 'getUserRole').mockResolvedValue(mockUserRole);

      const hasAccess = await RolePermissionService.checkRoleAccess('user-456', ['admin', 'manager']);
      
      expect(hasAccess).toBe(false);
    });

    it('should handle inactive roles', async () => {
      const mockUserRole = {
        id: 'role-123',
        userId: 'user-456',
        roleType: 'admin' as const,
        permissions: ['admin_access'],
        isActive: false, // Inactive role
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      jest.spyOn(RolePermissionService, 'getUserRole').mockResolvedValue(mockUserRole);

      const hasAccess = await RolePermissionService.checkRoleAccess('user-456', ['admin']);
      
      expect(hasAccess).toBe(false);
    });
  });
});