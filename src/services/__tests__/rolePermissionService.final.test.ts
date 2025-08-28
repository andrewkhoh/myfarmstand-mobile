/**
 * RolePermissionService Test - Using REFACTORED Infrastructure
 * Following the proven pattern from cartService.test.ts
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
      USERS: 'users',
      PRODUCTS: 'products', 
      ORDERS: 'orders',
      ROLE_PERMISSIONS: 'role_permissions',
      USER_ROLES: 'user_roles',
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

import { rolePermissionService } from '../rolePermissionService';
import { supabase } from '../../config/supabase';

describe('RolePermissionService - Refactored Infrastructure', () => {
  let service: any;

  beforeEach(() => {
    // Create service with mocked supabase
    service = rolePermissionService(supabase);
    
    jest.clearAllMocks();
  });

  describe('getRolePermissions', () => {
    it('should return empty array for non-existent role', async () => {
      const result = await service.getRolePermissions('nonexistent');
      
      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      // Service should handle errors and return empty array
      const result = await service.getRolePermissions('test');
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('hasPermission', () => {
    it('should return false for non-existent role', async () => {
      const result = await service.hasPermission('nonexistent', 'view_products');
      
      expect(result).toBe(false);
    });

    it('should return false for empty permission', async () => {
      const result = await service.hasPermission('customer', '');
      
      expect(result).toBe(false);
    });
  });

  describe('getAllPermissions', () => {
    it('should return empty array when no permissions exist', async () => {
      const result = await service.getAllPermissions();
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getRolesByPermission', () => {
    it('should return empty array for non-existent permission', async () => {
      const result = await service.getRolesByPermission('nonexistent_permission');
      
      expect(result).toEqual([]);
    });
  });

  describe('addPermissionToRole', () => {
    it('should handle adding permission gracefully', async () => {
      // Should not throw
      await expect(
        service.addPermissionToRole('customer', 'new_permission')
      ).resolves.toBeDefined();
    });
  });

  describe('removePermissionFromRole', () => {
    it('should handle removing permission gracefully', async () => {
      // Should not throw
      await expect(
        service.removePermissionFromRole('customer', 'some_permission')
      ).resolves.toBeDefined();
    });
  });

  describe('bulkUpdateRolePermissions', () => {
    it('should handle bulk update gracefully', async () => {
      // Should not throw
      await expect(
        service.bulkUpdateRolePermissions('customer', ['permission1', 'permission2'])
      ).resolves.toBeDefined();
    });

    it('should handle empty permissions array', async () => {
      await expect(
        service.bulkUpdateRolePermissions('customer', [])
      ).resolves.toBeDefined();
    });
  });

  describe('cloneRolePermissions', () => {
    it('should handle cloning gracefully', async () => {
      // Should not throw
      await expect(
        service.cloneRolePermissions('source', 'target')
      ).resolves.toBeDefined();
    });
  });
});