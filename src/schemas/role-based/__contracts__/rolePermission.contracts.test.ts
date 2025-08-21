import { describe, it, expect } from '@jest/globals';
import type { MockDatabase } from './database-mock.types';
import { 
  RolePermissionDatabaseSchema, 
  RolePermissionTransformSchema,
  CreateRolePermissionSchema,
  ROLE_PERMISSIONS,
  type RolePermissionDatabaseContract,
  type RolePermissionTransform
} from '../rolePermission.schemas';

describe('Role Permission Schema Contracts - Phase 1', () => {
  // Contract Test 1: Database interface alignment (MANDATORY)
  // This test will FAIL initially - we haven't written the schemas yet
  it('must align with generated database types', () => {
    type DatabaseUserRole = MockDatabase['public']['Tables']['user_roles']['Row'];
    
    // This function MUST compile - if it doesn't, schema is wrong
    const contractValidator = (row: DatabaseUserRole): RolePermissionDatabaseContract => {
      return {
        id: row.id,                    // ✅ Compile fails if missing
        user_id: row.user_id,          // ✅ Compile fails if missing  
        role_type: row.role_type,      // ✅ Compile fails if missing
        permissions: row.permissions,   // ✅ Compile fails if missing
        is_active: row.is_active,      // ✅ Compile fails if missing
        created_at: row.created_at,    // ✅ Compile fails if missing
        updated_at: row.updated_at     // ✅ Compile fails if missing
      };
    };
    
    expect(contractValidator).toBeDefined();
  });

  // Contract Test 2: Transformation completeness validation (MANDATORY)
  it('must transform all database fields to interface fields', () => {
    const databaseData: RolePermissionDatabaseContract = {
      id: 'role-123',
      user_id: 'user-456', 
      role_type: 'inventory_staff',
      permissions: ['view_inventory'],
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const transformed = RolePermissionTransformSchema.parse(databaseData);
    
    // Verify EVERY interface field is populated (camelCase conversion)
    expect(transformed.id).toBe('role-123');
    expect(transformed.userId).toBe('user-456');     // Snake → camel
    expect(transformed.roleType).toBe('inventory_staff'); // Snake → camel  
    expect(transformed.permissions).toEqual(['view_inventory']);
    expect(transformed.isActive).toBe(true);         // Snake → camel
    expect(transformed.createdAt).toBeDefined();     // Snake → camel
    expect(transformed.updatedAt).toBeDefined();     // Snake → camel
    
    // Verify types are correct
    expect(typeof transformed.userId).toBe('string');
    expect(typeof transformed.roleType).toBe('string');
    expect(Array.isArray(transformed.permissions)).toBe(true);
    expect(typeof transformed.isActive).toBe('boolean');
  });

  // Contract Test 3: Handle database nulls gracefully (Pattern 2: Database-First Validation)
  it('must handle database nulls without breaking', () => {
    const nullData = {
      id: 'test-id',
      user_id: 'test-user',
      role_type: 'admin' as const,
      permissions: null,        // Database allows null
      is_active: null,         // Database allows null
      created_at: null,        // Database allows null
      updated_at: null         // Database allows null
    };

    const result = RolePermissionTransformSchema.parse(nullData);
    
    // Verify graceful null handling with defaults
    expect(result.permissions).toEqual([]);                  // Null → empty array
    expect(result.isActive).toBe(true);                     // Null → default true
    expect(result.createdAt).toMatch(/\d{4}-\d{2}-\d{2}/);   // Null → current timestamp
    expect(result.updatedAt).toMatch(/\d{4}-\d{2}-\d{2}/);   // Null → current timestamp
  });

  // Contract Test 4: Role type validation (enum enforcement)
  it('must validate role types match system requirements', () => {
    const validRoles = ['inventory_staff', 'marketing_staff', 'executive', 'admin'];
    
    validRoles.forEach(role => {
      expect(() => {
        RolePermissionDatabaseSchema.parse({
          id: 'test-id',
          user_id: 'test-user', 
          role_type: role,
          permissions: [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }).not.toThrow();
    });

    // Invalid role should throw
    expect(() => {
      RolePermissionDatabaseSchema.parse({
        id: 'test-id',
        user_id: 'test-user',
        role_type: 'invalid_role', // ❌ Invalid role
        permissions: []
      });
    }).toThrow();
  });

  // Contract Test 5: Input validation schema
  it('must validate input creation schema', () => {
    const validInput = {
      userId: 'user-123',
      roleType: 'inventory_staff' as const,
      permissions: ['view_inventory']
    };

    expect(() => {
      CreateRolePermissionSchema.parse(validInput);
    }).not.toThrow();

    // Invalid input should throw
    expect(() => {
      CreateRolePermissionSchema.parse({
        userId: '', // ❌ Empty string
        roleType: 'inventory_staff',
        permissions: []
      });
    }).toThrow();
  });

  // Contract Test 6: Permission definitions completeness
  it('must validate permission definitions are complete for all roles', () => {
    const allRoleTypes = ['inventory_staff', 'marketing_staff', 'executive', 'admin'] as const;
    
    allRoleTypes.forEach(roleType => {
      expect(ROLE_PERMISSIONS[roleType]).toBeDefined();
      expect(Array.isArray(ROLE_PERMISSIONS[roleType])).toBe(true);
      expect(ROLE_PERMISSIONS[roleType].length).toBeGreaterThan(0);
    });

    // Verify specific permissions exist
    expect(ROLE_PERMISSIONS.inventory_staff).toContain('view_inventory');
    expect(ROLE_PERMISSIONS.marketing_staff).toContain('update_product_content');
    expect(ROLE_PERMISSIONS.executive).toContain('view_all_analytics');
    expect(ROLE_PERMISSIONS.admin).toContain('manage_users');
  });

  // Contract Test 7: Schema export validation
  it('must export all required schemas and types', () => {
    expect(RolePermissionDatabaseSchema).toBeDefined();
    expect(RolePermissionTransformSchema).toBeDefined();
    expect(CreateRolePermissionSchema).toBeDefined();
    expect(ROLE_PERMISSIONS).toBeDefined();
    
    // Verify schema functions exist
    expect(typeof RolePermissionDatabaseSchema.parse).toBe('function');
    expect(typeof RolePermissionTransformSchema.parse).toBe('function');
    expect(typeof CreateRolePermissionSchema.parse).toBe('function');
  });

  // Contract Test 8: Edge case - empty permissions array
  it('must handle empty and undefined permissions correctly', () => {
    const dataWithEmptyPermissions = {
      id: 'test',
      user_id: 'test',
      role_type: 'admin' as const,
      permissions: [], // Empty array
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const result1 = RolePermissionTransformSchema.parse(dataWithEmptyPermissions);
    expect(result1.permissions).toEqual([]);

    const dataWithUndefinedPermissions = {
      ...dataWithEmptyPermissions,
      permissions: undefined // Undefined
    };

    const result2 = RolePermissionTransformSchema.parse(dataWithUndefinedPermissions);
    expect(result2.permissions).toEqual([]);
  });

  // Contract Test 9: Timestamp handling
  it('must handle various timestamp formats and nulls', () => {
    const testCases = [
      { created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      { created_at: null, updated_at: null },
      { created_at: undefined, updated_at: undefined }
    ];

    testCases.forEach((timestamps, index) => {
      const data = {
        id: `test-${index}`,
        user_id: 'test-user',
        role_type: 'admin' as const,
        permissions: [],
        is_active: true,
        ...timestamps
      };

      const result = RolePermissionTransformSchema.parse(data);
      
      // All should result in valid timestamp strings
      expect(typeof result.createdAt).toBe('string');
      expect(typeof result.updatedAt).toBe('string');
      expect(result.createdAt).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(result.updatedAt).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  // Contract Test 10: Boolean handling with falsy values  
  it('must handle boolean fields with various falsy values', () => {
    const testCases = [
      { is_active: true, expected: true },
      { is_active: false, expected: false },
      { is_active: null, expected: true },    // Null → default true
      { is_active: undefined, expected: true } // Undefined → default true
    ];

    testCases.forEach((testCase, index) => {
      const data = {
        id: `test-${index}`,
        user_id: 'test-user',
        role_type: 'admin' as const,
        permissions: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        ...testCase
      };

      const result = RolePermissionTransformSchema.parse(data);
      expect(result.isActive).toBe(testCase.expected);
    });
  });

  // Contract Test 11: Required field validation
  it('must require all mandatory fields', () => {
    const requiredFields = ['id', 'user_id', 'role_type'];
    
    requiredFields.forEach(field => {
      const incompleteData = {
        id: 'test-id',
        user_id: 'test-user',
        role_type: 'admin',
        permissions: [],
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      delete incompleteData[field]; // Remove required field

      expect(() => {
        RolePermissionDatabaseSchema.parse(incompleteData);
      }).toThrow();
    });
  });

  // Contract Test 12: Type safety enforcement
  it('must enforce correct data types', () => {
    const typeTestCases = [
      { field: 'id', value: 123, shouldThrow: true },          // Number instead of string
      { field: 'user_id', value: null, shouldThrow: true },    // Null instead of string
      { field: 'permissions', value: 'not-array', shouldThrow: true }, // String instead of array
      { field: 'is_active', value: 'true', shouldThrow: true }  // String instead of boolean
    ];

    typeTestCases.forEach(({ field, value, shouldThrow }) => {
      const data = {
        id: 'test-id',
        user_id: 'test-user',
        role_type: 'admin' as const,
        permissions: [],
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        [field]: value
      };

      if (shouldThrow) {
        expect(() => {
          RolePermissionDatabaseSchema.parse(data);
        }).toThrow();
      } else {
        expect(() => {
          RolePermissionDatabaseSchema.parse(data);
        }).not.toThrow();
      }
    });
  });

  // Contract Test 13: Transformation output type checking
  it('must produce correctly typed transformation output', () => {
    const inputData = {
      id: 'role-123',
      user_id: 'user-456',
      role_type: 'inventory_staff' as const,
      permissions: ['view_inventory', 'update_stock'],
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z'
    };

    const result = RolePermissionTransformSchema.parse(inputData);

    // Type checking
    expect(typeof result.id).toBe('string');
    expect(typeof result.userId).toBe('string');
    expect(typeof result.roleType).toBe('string');
    expect(Array.isArray(result.permissions)).toBe(true);
    expect(typeof result.isActive).toBe('boolean');
    expect(typeof result.createdAt).toBe('string');
    expect(typeof result.updatedAt).toBe('string');

    // Value checking
    expect(result.id).toBe('role-123');
    expect(result.userId).toBe('user-456');
    expect(result.roleType).toBe('inventory_staff');
    expect(result.permissions).toEqual(['view_inventory', 'update_stock']);
    expect(result.isActive).toBe(true);
    expect(result.createdAt).toBe('2024-01-01T00:00:00Z');
    expect(result.updatedAt).toBe('2024-01-02T00:00:00Z');
  });

  // Contract Test 14: Role type enum constraint
  it('must enforce role type enum constraints strictly', () => {
    const validRoleTypes = ['inventory_staff', 'marketing_staff', 'executive', 'admin'];
    const invalidRoleTypes = ['INVENTORY_STAFF', 'marketing', 'exec', 'administrator', 'staff', ''];

    // Valid role types should pass
    validRoleTypes.forEach(roleType => {
      expect(() => {
        RolePermissionDatabaseSchema.parse({
          id: 'test',
          user_id: 'test',
          role_type: roleType,
          permissions: [],
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        });
      }).not.toThrow();
    });

    // Invalid role types should throw
    invalidRoleTypes.forEach(roleType => {
      expect(() => {
        RolePermissionDatabaseSchema.parse({
          id: 'test',
          user_id: 'test',
          role_type: roleType,
          permissions: [],
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        });
      }).toThrow();
    });
  });

  // Contract Test 15: Complete interface coverage validation  
  it('must ensure transformation covers all interface fields', () => {
    const sampleData = {
      id: 'complete-test',
      user_id: 'user-complete',
      role_type: 'executive' as const,
      permissions: ['view_all_analytics'],
      is_active: false,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:30:00Z'
    };

    const transformed = RolePermissionTransformSchema.parse(sampleData);

    // Verify every expected interface field exists
    const expectedFields = [
      'id', 'userId', 'roleType', 'permissions', 
      'isActive', 'createdAt', 'updatedAt'
    ];

    expectedFields.forEach(field => {
      expect(transformed.hasOwnProperty(field)).toBe(true);
      expect(transformed[field]).toBeDefined();
    });

    // Verify no unexpected fields
    const transformedKeys = Object.keys(transformed);
    expect(transformedKeys.sort()).toEqual(expectedFields.sort());
  });
});