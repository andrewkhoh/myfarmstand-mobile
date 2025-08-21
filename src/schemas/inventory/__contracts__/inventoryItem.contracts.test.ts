import { describe, it, expect } from '@jest/globals';
import type { MockDatabase } from './database-mock.types';
import { 
  InventoryItemDatabaseSchema, 
  InventoryItemTransformSchema,
  CreateInventoryItemSchema,
  UpdateInventoryItemSchema,
  type InventoryItemDatabaseContract,
  type InventoryItemTransform
} from '../inventoryItem.schemas';
import type { z } from 'zod';

// Phase 1 Integration: Role-based permissions validation
import { ROLE_PERMISSIONS } from '../../role-based/rolePermission.schemas';

// CRITICAL: Compile-time contract enforcement (Pattern from architectural doc)
// This MUST compile - if it doesn't, schema transformation is incomplete
type InventoryItemContract = z.infer<typeof InventoryItemTransformSchema> extends InventoryItemTransform 
  ? InventoryItemTransform extends z.infer<typeof InventoryItemTransformSchema> 
    ? true 
    : false 
  : false;

describe('Inventory Item Schema Contracts - Phase 2', () => {
  // Contract Test 0: Compile-time contract enforcement (CRITICAL PATTERN)
  it('must pass compile-time contract validation', () => {
    // This test validates that the contract type compiled successfully
    const contractIsValid: InventoryItemContract = true;
    expect(contractIsValid).toBe(true);
    
    // If this test compiles, the schema-interface alignment is enforced at compile time
    // If the schema transformation doesn't match the interface exactly, TypeScript compilation will fail
  });

  // Contract Test 1: Database interface alignment (MANDATORY)
  // This test will FAIL initially - we haven't written the schemas yet
  it('must align with generated database types', () => {
    type DatabaseInventoryItem = MockDatabase['public']['Tables']['inventory_items']['Row'];
    
    // This function MUST compile - if it doesn't, schema is wrong
    const contractValidator = (row: DatabaseInventoryItem): InventoryItemDatabaseContract => {
      return {
        id: row.id,                           // ✅ Compile fails if missing
        product_id: row.product_id,           // ✅ Compile fails if missing  
        current_stock: row.current_stock,     // ✅ Compile fails if missing
        reserved_stock: row.reserved_stock,   // ✅ Compile fails if missing
        available_stock: row.available_stock, // ✅ Generated column
        minimum_threshold: row.minimum_threshold, // ✅ Nullable
        maximum_threshold: row.maximum_threshold, // ✅ Nullable
        is_active: row.is_active,             // ✅ Nullable with default
        is_visible_to_customers: row.is_visible_to_customers, // ✅ Nullable with default
        last_stock_update: row.last_stock_update, // ✅ Nullable timestamp
        created_at: row.created_at,           // ✅ Nullable timestamp
        updated_at: row.updated_at            // ✅ Nullable timestamp
      };
    };
    
    expect(contractValidator).toBeDefined();
  });

  // Contract Test 2: Transformation completeness validation (MANDATORY)
  it('must transform all database fields to interface fields', () => {
    const databaseData: InventoryItemDatabaseContract = {
      id: 'inv-123',
      product_id: 'prod-456', 
      current_stock: 100,
      reserved_stock: 20,
      available_stock: 80,
      minimum_threshold: 10,
      maximum_threshold: 500,
      is_active: true,
      is_visible_to_customers: true,
      last_stock_update: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const transformed = InventoryItemTransformSchema.parse(databaseData);
    
    // Verify EVERY interface field is populated (camelCase conversion)
    expect(transformed.id).toBe('inv-123');
    expect(transformed.productId).toBe('prod-456');     // Snake → camel
    expect(transformed.currentStock).toBe(100);         // Snake → camel
    expect(transformed.reservedStock).toBe(20);         // Snake → camel  
    expect(transformed.availableStock).toBe(80);        // Snake → camel
    expect(transformed.minimumThreshold).toBe(10);      // Snake → camel
    expect(transformed.maximumThreshold).toBe(500);     // Snake → camel
    expect(transformed.isActive).toBe(true);            // Snake → camel
    expect(transformed.isVisibleToCustomers).toBe(true); // Snake → camel
    expect(transformed.lastStockUpdate).toBeDefined();  // Snake → camel
    expect(transformed.createdAt).toBeDefined();        // Snake → camel
    expect(transformed.updatedAt).toBeDefined();        // Snake → camel
    
    // Verify types are correct
    expect(typeof transformed.currentStock).toBe('number');
    expect(typeof transformed.availableStock).toBe('number');
    expect(typeof transformed.isActive).toBe('boolean');
    expect(typeof transformed.isVisibleToCustomers).toBe('boolean');
  });

  // Contract Test 3: Handle database nulls gracefully (Pattern 2: Database-First Validation)
  it('must handle database nulls without breaking', () => {
    const nullData = {
      id: 'test-id',
      product_id: 'test-product',
      current_stock: 50,
      reserved_stock: 5,
      available_stock: 45,
      minimum_threshold: null,      // Database allows null
      maximum_threshold: null,      // Database allows null
      is_active: null,             // Database allows null
      is_visible_to_customers: null, // Database allows null
      last_stock_update: null,     // Database allows null
      created_at: null,            // Database allows null
      updated_at: null             // Database allows null
    };

    const result = InventoryItemTransformSchema.parse(nullData);
    
    // Verify graceful null handling with defaults
    expect(result.minimumThreshold).toBe(10);          // Null → default 10
    expect(result.maximumThreshold).toBe(1000);        // Null → default 1000
    expect(result.isActive).toBe(true);                // Null → default true
    expect(result.isVisibleToCustomers).toBe(true);    // Null → default true
    expect(result.lastStockUpdate).toMatch(/\d{4}-\d{2}-\d{2}/); // Null → current timestamp
    expect(result.createdAt).toMatch(/\d{4}-\d{2}-\d{2}/);       // Null → current timestamp
    expect(result.updatedAt).toMatch(/\d{4}-\d{2}-\d{2}/);       // Null → current timestamp
  });

  // Contract Test 4: Stock calculation validation
  it('must validate stock calculations and constraints', () => {
    const stockData = {
      id: 'stock-test',
      product_id: 'prod-789',
      current_stock: 100,
      reserved_stock: 30,
      available_stock: 70, // Should match current - reserved
      minimum_threshold: 15,
      maximum_threshold: 500,
      is_active: true,
      is_visible_to_customers: true,
      last_stock_update: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    expect(() => {
      InventoryItemDatabaseSchema.parse(stockData);
    }).not.toThrow();

    // Invalid stock should throw
    expect(() => {
      InventoryItemDatabaseSchema.parse({
        ...stockData,
        current_stock: -1 // ❌ Negative stock
      });
    }).toThrow();

    expect(() => {
      InventoryItemDatabaseSchema.parse({
        ...stockData,
        reserved_stock: 150, // ❌ Reserved > current
        current_stock: 100
      });
    }).toThrow();
  });

  // Contract Test 5: Input validation schema (create operations)
  it('must validate input creation schema', () => {
    const validInput = {
      productId: 'prod-123',
      currentStock: 100,
      minimumThreshold: 10,
      maximumThreshold: 500,
      isVisibleToCustomers: true
    };

    expect(() => {
      CreateInventoryItemSchema.parse(validInput);
    }).not.toThrow();

    // Invalid input should throw
    expect(() => {
      CreateInventoryItemSchema.parse({
        productId: '', // ❌ Empty string
        currentStock: 100
      });
    }).toThrow();

    expect(() => {
      CreateInventoryItemSchema.parse({
        productId: 'valid-id',
        currentStock: -5 // ❌ Negative stock
      });
    }).toThrow();
  });

  // Contract Test 6: Update validation schema
  it('must validate update operations with partial data', () => {
    const validPartialUpdate = {
      currentStock: 150,
      isVisibleToCustomers: false
    };

    expect(() => {
      UpdateInventoryItemSchema.parse(validPartialUpdate);
    }).not.toThrow();

    // Validate threshold relationships
    expect(() => {
      UpdateInventoryItemSchema.parse({
        minimumThreshold: 100,
        maximumThreshold: 50 // ❌ Max < Min
      });
    }).toThrow();
  });

  // Contract Test 7: Schema export validation
  it('must export all required schemas and types', () => {
    expect(InventoryItemDatabaseSchema).toBeDefined();
    expect(InventoryItemTransformSchema).toBeDefined();
    expect(CreateInventoryItemSchema).toBeDefined();
    expect(UpdateInventoryItemSchema).toBeDefined();
    
    // Verify schema functions exist
    expect(typeof InventoryItemDatabaseSchema.parse).toBe('function');
    expect(typeof InventoryItemTransformSchema.parse).toBe('function');
    expect(typeof CreateInventoryItemSchema.parse).toBe('function');
    expect(typeof UpdateInventoryItemSchema.parse).toBe('function');
  });

  // Contract Test 8: Edge case - zero stock scenarios
  it('must handle zero and boundary stock values correctly', () => {
    const zeroStockData = {
      id: 'zero-stock',
      product_id: 'prod-zero',
      current_stock: 0,     // Zero is valid
      reserved_stock: 0,    // Zero is valid
      available_stock: 0,   // Zero is valid
      minimum_threshold: 0, // Zero threshold is valid
      maximum_threshold: 1, // Minimum valid max
      is_active: true,
      is_visible_to_customers: false, // Out of stock, hide from customers
      last_stock_update: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const result = InventoryItemTransformSchema.parse(zeroStockData);
    expect(result.currentStock).toBe(0);
    expect(result.availableStock).toBe(0);
    expect(result.isVisibleToCustomers).toBe(false);
  });

  // Contract Test 9: Timestamp handling consistency
  it('must handle various timestamp formats and nulls consistently', () => {
    const testCases = [
      { 
        last_stock_update: '2024-01-01T00:00:00Z', 
        created_at: '2024-01-01T00:00:00Z', 
        updated_at: '2024-01-01T00:00:00Z' 
      },
      { last_stock_update: null, created_at: null, updated_at: null },
      { last_stock_update: undefined, created_at: undefined, updated_at: undefined }
    ];

    testCases.forEach((timestamps, index) => {
      const data = {
        id: `timestamp-test-${index}`,
        product_id: 'prod-timestamp',
        current_stock: 10,
        reserved_stock: 2,
        available_stock: 8,
        minimum_threshold: 5,
        maximum_threshold: 100,
        is_active: true,
        is_visible_to_customers: true,
        ...timestamps
      };

      const result = InventoryItemTransformSchema.parse(data);
      
      // All should result in valid timestamp strings
      expect(typeof result.lastStockUpdate).toBe('string');
      expect(typeof result.createdAt).toBe('string');
      expect(typeof result.updatedAt).toBe('string');
      expect(result.lastStockUpdate).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(result.createdAt).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(result.updatedAt).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  // Contract Test 10: Boolean handling with role-based scenarios
  it('must handle boolean fields for role-based visibility control', () => {
    const testCases = [
      { is_active: true, is_visible_to_customers: true, expectedActive: true, expectedVisible: true },
      { is_active: false, is_visible_to_customers: false, expectedActive: false, expectedVisible: false },
      { is_active: null, is_visible_to_customers: null, expectedActive: true, expectedVisible: true }, // Defaults
      { is_active: undefined, is_visible_to_customers: undefined, expectedActive: true, expectedVisible: true }
    ];

    testCases.forEach((testCase, index) => {
      const data = {
        id: `boolean-test-${index}`,
        product_id: 'prod-boolean',
        current_stock: 25,
        reserved_stock: 5,
        available_stock: 20,
        minimum_threshold: 10,
        maximum_threshold: 100,
        last_stock_update: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        is_active: testCase.is_active,
        is_visible_to_customers: testCase.is_visible_to_customers
      };

      const result = InventoryItemTransformSchema.parse(data);
      expect(result.isActive).toBe(testCase.expectedActive);
      expect(result.isVisibleToCustomers).toBe(testCase.expectedVisible);
    });
  });

  // Contract Test 11: Required field validation
  it('must require all mandatory fields', () => {
    const requiredFields = ['id', 'product_id', 'current_stock', 'reserved_stock', 'available_stock'];
    
    requiredFields.forEach(field => {
      const incompleteData = {
        id: 'test-id',
        product_id: 'test-product',
        current_stock: 50,
        reserved_stock: 10,
        available_stock: 40,
        minimum_threshold: 15,
        maximum_threshold: 200,
        is_active: true,
        is_visible_to_customers: true,
        last_stock_update: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      delete incompleteData[field]; // Remove required field

      expect(() => {
        InventoryItemDatabaseSchema.parse(incompleteData);
      }).toThrow();
    });
  });

  // Contract Test 12: Type safety enforcement for inventory operations
  it('must enforce correct data types for inventory fields', () => {
    const typeTestCases = [
      { field: 'current_stock', value: '50', shouldThrow: true },      // String instead of number
      { field: 'reserved_stock', value: null, shouldThrow: true },     // Null instead of number
      { field: 'is_active', value: 'true', shouldThrow: true },        // String instead of boolean
      { field: 'minimum_threshold', value: '10', shouldThrow: true },  // String instead of number
      { field: 'product_id', value: 123, shouldThrow: true }           // Number instead of string
    ];

    typeTestCases.forEach(({ field, value, shouldThrow }) => {
      const data = {
        id: 'type-test',
        product_id: 'prod-type',
        current_stock: 100,
        reserved_stock: 20,
        available_stock: 80,
        minimum_threshold: 15,
        maximum_threshold: 300,
        is_active: true,
        is_visible_to_customers: true,
        last_stock_update: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        [field]: value
      };

      if (shouldThrow) {
        expect(() => {
          InventoryItemDatabaseSchema.parse(data);
        }).toThrow();
      } else {
        expect(() => {
          InventoryItemDatabaseSchema.parse(data);
        }).not.toThrow();
      }
    });
  });

  // Contract Test 13: Transformation output type checking
  it('must produce correctly typed transformation output', () => {
    const inputData = {
      id: 'transform-test',
      product_id: 'prod-transform',
      current_stock: 75,
      reserved_stock: 15,
      available_stock: 60,
      minimum_threshold: 20,
      maximum_threshold: 400,
      is_active: true,
      is_visible_to_customers: false,
      last_stock_update: '2024-01-01T10:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T10:00:00Z'
    };

    const result = InventoryItemTransformSchema.parse(inputData);

    // Type checking
    expect(typeof result.id).toBe('string');
    expect(typeof result.productId).toBe('string');
    expect(typeof result.currentStock).toBe('number');
    expect(typeof result.reservedStock).toBe('number');
    expect(typeof result.availableStock).toBe('number');
    expect(typeof result.minimumThreshold).toBe('number');
    expect(typeof result.maximumThreshold).toBe('number');
    expect(typeof result.isActive).toBe('boolean');
    expect(typeof result.isVisibleToCustomers).toBe('boolean');
    expect(typeof result.lastStockUpdate).toBe('string');
    expect(typeof result.createdAt).toBe('string');
    expect(typeof result.updatedAt).toBe('string');

    // Value checking
    expect(result.id).toBe('transform-test');
    expect(result.productId).toBe('prod-transform');
    expect(result.currentStock).toBe(75);
    expect(result.availableStock).toBe(60);
    expect(result.isVisibleToCustomers).toBe(false);
  });

  // Contract Test 14: Stock threshold validation
  it('must validate stock threshold business rules', () => {
    // Valid thresholds
    expect(() => {
      InventoryItemDatabaseSchema.parse({
        id: 'threshold-valid',
        product_id: 'prod-threshold',
        current_stock: 100,
        reserved_stock: 20,
        available_stock: 80,
        minimum_threshold: 15,
        maximum_threshold: 500, // Max > Min ✅
        is_active: true,
        is_visible_to_customers: true,
        last_stock_update: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });
    }).not.toThrow();

    // Equal thresholds should be invalid
    expect(() => {
      InventoryItemDatabaseSchema.parse({
        id: 'threshold-equal',
        product_id: 'prod-threshold',
        current_stock: 100,
        reserved_stock: 20,
        available_stock: 80,
        minimum_threshold: 50,
        maximum_threshold: 50, // Max = Min ❌
        is_active: true,
        is_visible_to_customers: true,
        last_stock_update: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });
    }).toThrow();
  });

  // Contract Test 15: Role-based permission integration validation (Phase 1 Integration)
  it('must validate role-based access patterns with inventory operations', () => {
    // Verify inventory permissions are properly defined for all roles
    expect(ROLE_PERMISSIONS.inventory_staff).toContain('view_inventory');
    expect(ROLE_PERMISSIONS.inventory_staff).toContain('update_stock');
    expect(ROLE_PERMISSIONS.marketing_staff).toContain('update_product_content');
    expect(ROLE_PERMISSIONS.executive).toContain('view_all_analytics');
    expect(ROLE_PERMISSIONS.admin).toContain('manage_users');
    
    // Verify inventory-specific permissions exist
    expect(ROLE_PERMISSIONS.inventory_staff.length).toBeGreaterThan(0);
    expect(ROLE_PERMISSIONS.marketing_staff.length).toBeGreaterThan(0);
  });

  // Contract Test 16: Query key factory integration validation (CRITICAL Pattern Compliance)
  it('must integrate with centralized query key factory from Phase 1', () => {
    // This test ensures Phase 2 doesn't create dual systems
    // We'll verify inventory keys extend the centralized factory
    expect(typeof require('../../../utils/queryKeyFactory')).toBe('object');
    
    // Verify no local duplicate factories are created (audit finding fix)
    const factoryModule = require('../../../utils/queryKeyFactory');
    expect(factoryModule.inventoryKeys).toBeDefined();
    
    // This prevents the dual systems anti-pattern found in audit
  });

  // Contract Test 17: Complete interface coverage validation  
  it('must ensure transformation covers all interface fields for inventory management', () => {
    const sampleData = {
      id: 'coverage-test',
      product_id: 'prod-coverage',
      current_stock: 125,
      reserved_stock: 25,
      available_stock: 100,
      minimum_threshold: 30,
      maximum_threshold: 800,
      is_active: true,
      is_visible_to_customers: true,
      last_stock_update: '2024-01-01T15:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T15:00:00Z'
    };

    const transformed = InventoryItemTransformSchema.parse(sampleData);

    // Verify every expected interface field exists
    const expectedFields = [
      'id', 'productId', 'currentStock', 'reservedStock', 'availableStock',
      'minimumThreshold', 'maximumThreshold', 'isActive', 'isVisibleToCustomers', 
      'lastStockUpdate', 'createdAt', 'updatedAt'
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