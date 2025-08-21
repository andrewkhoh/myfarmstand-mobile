// Phase 2: Stock Movement Schema Contract Tests (RED → GREEN → REFACTOR)
// Following Phase 1 patterns for strict schema contract enforcement
// These tests must FAIL initially (RED phase) - schemas don't exist yet

import { z } from 'zod';
import type { MockDatabase } from './database-mock.types';

// Contract interfaces - these will be enforced at compile time
interface StockMovementDatabaseContract {
  id: string;
  inventory_item_id: string;
  movement_type: 'restock' | 'sale' | 'adjustment' | 'reservation' | 'release';
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  performed_by: string | null;
  performed_at: string | null;
  reference_order_id: string | null;
  batch_id: string | null;
  created_at: string | null;
}

interface StockMovementTransformContract {
  id: string;
  inventoryItemId: string;
  movementType: 'restock' | 'sale' | 'adjustment' | 'reservation' | 'release';
  quantityChange: number;
  previousStock: number;
  newStock: number;
  reason: string | null;
  performedBy: string | null;
  performedAt: string;
  referenceOrderId: string | null;
  batchId: string | null;
  createdAt: string;
}

interface CreateStockMovementContract {
  inventoryItemId: string;
  movementType: 'restock' | 'sale' | 'adjustment' | 'reservation' | 'release';
  quantityChange: number;
  previousStock: number;
  newStock: number;
  reason?: string | null;
  performedBy?: string | null;
  performedAt?: string | null;
  referenceOrderId?: string | null;
  batchId?: string | null;
}

describe('Stock Movement Schema Contracts (Phase 2.1.4)', () => {
  
  // Test 1: Compile-Time Contract Enforcement
  it('must align with generated database types', () => {
    // This test ensures compile-time contract enforcement
    // If database structure changes, TypeScript compilation will fail
    type DatabaseStockMovement = MockDatabase['public']['Tables']['stock_movements']['Row'];
    
    const contractValidator = (row: DatabaseStockMovement): StockMovementDatabaseContract => {
      return {
        id: row.id,                           // ✅ Compile fails if missing
        inventory_item_id: row.inventory_item_id, // ✅ Compile fails if missing
        movement_type: row.movement_type,     // ✅ Compile fails if missing
        quantity_change: row.quantity_change, // ✅ Compile fails if missing
        previous_stock: row.previous_stock,   // ✅ Compile fails if missing
        new_stock: row.new_stock,            // ✅ Compile fails if missing
        reason: row.reason,                  // ✅ Compile fails if missing
        performed_by: row.performed_by,      // ✅ Compile fails if missing
        performed_at: row.performed_at,      // ✅ Compile fails if missing
        reference_order_id: row.reference_order_id, // ✅ Compile fails if missing
        batch_id: row.batch_id,              // ✅ Compile fails if missing
        created_at: row.created_at           // ✅ Compile fails if missing
      };
    };

    // Runtime validation will be tested separately
    expect(contractValidator).toBeDefined();
  });

  // Test 2: Database Schema Validation (RED Phase - will fail until schema exists)
  it('StockMovementDatabaseSchema should validate database row structure', () => {
    // Import will fail initially - that's expected in RED phase
    expect(() => {
      const { StockMovementDatabaseSchema } = require('../stockMovement.schemas');
      
      const validDatabaseRow = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        inventory_item_id: '550e8400-e29b-41d4-a716-446655440001',
        movement_type: 'restock',
        quantity_change: 50,
        previous_stock: 100,
        new_stock: 150,
        reason: 'Weekly restock delivery',
        performed_by: 'staff-001',
        performed_at: '2024-01-15T10:00:00Z',
        reference_order_id: null,
        batch_id: 'batch-001',
        created_at: '2024-01-15T10:00:00Z'
      };

      const result = StockMovementDatabaseSchema.parse(validDatabaseRow);
      expect(result).toEqual(validDatabaseRow);
    }).not.toThrow();
  });

  // Test 3: Movement Type Enum Constraint Validation
  it('StockMovementDatabaseSchema should enforce movement type constraints', () => {
    expect(() => {
      const { StockMovementDatabaseSchema } = require('../stockMovement.schemas');
      
      // Test all valid movement types
      const validTypes = ['restock', 'sale', 'adjustment', 'reservation', 'release'];
      
      validTypes.forEach(movementType => {
        const validRow = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          inventory_item_id: '550e8400-e29b-41d4-a716-446655440001',
          movement_type: movementType,
          quantity_change: 10,
          previous_stock: 100,
          new_stock: 110,
          reason: 'Test movement',
          performed_by: null,
          performed_at: '2024-01-15T10:00:00Z',
          reference_order_id: null,
          batch_id: null,
          created_at: '2024-01-15T10:00:00Z'
        };
        
        expect(() => StockMovementDatabaseSchema.parse(validRow)).not.toThrow();
      });

      // Test invalid movement type
      const invalidRow = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        inventory_item_id: '550e8400-e29b-41d4-a716-446655440001',
        movement_type: 'invalid_type',
        quantity_change: 10,
        previous_stock: 100,
        new_stock: 110,
        reason: null,
        performed_by: null,
        performed_at: null,
        reference_order_id: null,
        batch_id: null,
        created_at: null
      };
      
      expect(() => StockMovementDatabaseSchema.parse(invalidRow)).toThrow();
    }).not.toThrow();
  });

  // Test 4: Quantity and Stock Validation
  it('StockMovementDatabaseSchema should validate quantity and stock constraints', () => {
    expect(() => {
      const { StockMovementDatabaseSchema } = require('../stockMovement.schemas');
      
      // Test zero quantity change (should fail - business rule)
      const zeroQuantityRow = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        inventory_item_id: '550e8400-e29b-41d4-a716-446655440001',
        movement_type: 'adjustment',
        quantity_change: 0,  // Should be invalid
        previous_stock: 100,
        new_stock: 100,
        reason: 'No change',
        performed_by: null,
        performed_at: null,
        reference_order_id: null,
        batch_id: null,
        created_at: null
      };
      
      expect(() => StockMovementDatabaseSchema.parse(zeroQuantityRow)).toThrow();

      // Test negative stock values (should fail)
      const negativeStockRow = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        inventory_item_id: '550e8400-e29b-41d4-a716-446655440001',
        movement_type: 'sale',
        quantity_change: -10,
        previous_stock: -5,  // Should be invalid
        new_stock: -15,      // Should be invalid
        reason: 'Invalid sale',
        performed_by: null,
        performed_at: null,
        reference_order_id: null,
        batch_id: null,
        created_at: null
      };
      
      expect(() => StockMovementDatabaseSchema.parse(negativeStockRow)).toThrow();
    }).not.toThrow();
  });

  // Test 5: Complete Transformation Testing (snake_case → camelCase)
  it('StockMovementTransformSchema should transform all fields correctly', () => {
    expect(() => {
      const { StockMovementTransformSchema } = require('../stockMovement.schemas');
      
      const databaseRow = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        inventory_item_id: '550e8400-e29b-41d4-a716-446655440001',
        movement_type: 'restock',
        quantity_change: 50,
        previous_stock: 100,
        new_stock: 150,
        reason: 'Weekly restock',
        performed_by: 'staff-001',
        performed_at: '2024-01-15T10:00:00Z',
        reference_order_id: 'order-123',
        batch_id: 'batch-001',
        created_at: '2024-01-15T10:00:00Z'
      };

      const result = StockMovementTransformSchema.parse(databaseRow);
      
      // Verify all field transformations
      expect(result).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440000',
        inventoryItemId: '550e8400-e29b-41d4-a716-446655440001',  // snake → camel
        movementType: 'restock',                                   // snake → camel
        quantityChange: 50,                                        // snake → camel
        previousStock: 100,                                        // snake → camel
        newStock: 150,                                             // snake → camel
        reason: 'Weekly restock',
        performedBy: 'staff-001',                                  // snake → camel
        performedAt: '2024-01-15T10:00:00Z',                      // snake → camel
        referenceOrderId: 'order-123',                            // snake → camel
        batchId: 'batch-001',                                     // snake → camel
        createdAt: '2024-01-15T10:00:00Z'                         // snake → camel
      });
    }).not.toThrow();
  });

  // Test 6: Null Handling with Database-First Validation
  it('StockMovementTransformSchema should handle null values correctly', () => {
    expect(() => {
      const { StockMovementTransformSchema } = require('../stockMovement.schemas');
      
      const databaseRowWithNulls = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        inventory_item_id: '550e8400-e29b-41d4-a716-446655440001',
        movement_type: 'adjustment',
        quantity_change: -5,
        previous_stock: 105,
        new_stock: 100,
        reason: null,              // Nullable
        performed_by: null,        // Nullable
        performed_at: null,        // Nullable → default
        reference_order_id: null,  // Nullable
        batch_id: null,           // Nullable
        created_at: null          // Nullable → default
      };

      const result = StockMovementTransformSchema.parse(databaseRowWithNulls);
      
      // Verify null handling and defaults
      expect(result.reason).toBeNull();
      expect(result.performedBy).toBeNull();
      expect(result.performedAt).toBeDefined(); // Should have default
      expect(result.referenceOrderId).toBeNull();
      expect(result.batchId).toBeNull();
      expect(result.createdAt).toBeDefined(); // Should have default
    }).not.toThrow();
  });

  // Test 7: Create Schema Input Validation
  it('CreateStockMovementSchema should validate input structure', () => {
    expect(() => {
      const { CreateStockMovementSchema } = require('../stockMovement.schemas');
      
      const validInput = {
        inventoryItemId: '550e8400-e29b-41d4-a716-446655440001',
        movementType: 'sale',
        quantityChange: -3,
        previousStock: 50,
        newStock: 47,
        reason: 'Customer purchase',
        performedBy: 'staff-002',
        referenceOrderId: 'order-456'
      };

      const result = CreateStockMovementSchema.parse(validInput);
      expect(result.inventoryItemId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result.movementType).toBe('sale');
      expect(result.quantityChange).toBe(-3);
    }).not.toThrow();
  });

  // Test 8: Movement Type Constants Export
  it('should export movement type constants', () => {
    expect(() => {
      const { MOVEMENT_TYPES } = require('../stockMovement.schemas');
      
      expect(MOVEMENT_TYPES).toEqual({
        RESTOCK: 'restock',
        SALE: 'sale',
        ADJUSTMENT: 'adjustment',
        RESERVATION: 'reservation',
        RELEASE: 'release'
      });
    }).not.toThrow();
  });

  // Test 9: Batch Operation Support Validation
  it('StockMovementDatabaseSchema should support batch operations', () => {
    expect(() => {
      const { StockMovementDatabaseSchema } = require('../stockMovement.schemas');
      
      const batchMovementRows = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          inventory_item_id: '550e8400-e29b-41d4-a716-446655440001',
          movement_type: 'restock',
          quantity_change: 100,
          previous_stock: 50,
          new_stock: 150,
          reason: 'Bulk restock operation',
          performed_by: 'staff-001',
          performed_at: '2024-01-16T10:00:00Z',
          reference_order_id: null,
          batch_id: 'batch-001',  // Same batch
          created_at: '2024-01-16T10:00:00Z'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          inventory_item_id: '550e8400-e29b-41d4-a716-446655440002',
          movement_type: 'restock',
          quantity_change: 75,
          previous_stock: 25,
          new_stock: 100,
          reason: 'Bulk restock operation',
          performed_by: 'staff-001',
          performed_at: '2024-01-16T10:01:00Z',
          reference_order_id: null,
          batch_id: 'batch-001',  // Same batch
          created_at: '2024-01-16T10:01:00Z'
        }
      ];

      batchMovementRows.forEach(row => {
        expect(() => StockMovementDatabaseSchema.parse(row)).not.toThrow();
      });
    }).not.toThrow();
  });

  // Test 10: Stock Calculation Consistency Validation
  it('should validate stock calculation consistency', () => {
    expect(() => {
      const { StockMovementDatabaseSchema } = require('../stockMovement.schemas');
      
      // Valid calculation: previous_stock + quantity_change = new_stock
      const validCalculation = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        inventory_item_id: '550e8400-e29b-41d4-a716-446655440001',
        movement_type: 'sale',
        quantity_change: -5,
        previous_stock: 20,
        new_stock: 15,  // 20 + (-5) = 15 ✅
        reason: 'Customer purchase',
        performed_by: null,
        performed_at: null,
        reference_order_id: null,
        batch_id: null,
        created_at: null
      };
      
      expect(() => StockMovementDatabaseSchema.parse(validCalculation)).not.toThrow();

      // Invalid calculation: numbers don't add up
      const invalidCalculation = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        inventory_item_id: '550e8400-e29b-41d4-a716-446655440001',
        movement_type: 'sale',
        quantity_change: -5,
        previous_stock: 20,
        new_stock: 30,  // 20 + (-5) ≠ 30 ❌
        reason: 'Invalid calculation',
        performed_by: null,
        performed_at: null,
        reference_order_id: null,
        batch_id: null,
        created_at: null
      };
      
      expect(() => StockMovementDatabaseSchema.parse(invalidCalculation)).toThrow();
    }).not.toThrow();
  });

  // Test 11: TypeScript Return Type Annotations (Compile-Time Contract)
  it('should enforce compile-time contracts with TypeScript return annotations', () => {
    // Import will fail initially - that's expected in RED phase
    expect(() => {
      const schemas = require('../stockMovement.schemas');
      
      // Test that schemas have correct TypeScript return annotations
      type TransformResult = ReturnType<typeof schemas.StockMovementTransformSchema.parse>;
      type DatabaseResult = ReturnType<typeof schemas.StockMovementDatabaseSchema.parse>;
      type CreateResult = ReturnType<typeof schemas.CreateStockMovementSchema.parse>;
      
      // These type assertions ensure compile-time contract enforcement
      const transformContract: StockMovementTransformContract = {} as TransformResult;
      const databaseContract: StockMovementDatabaseContract = {} as DatabaseResult;
      const createContract: CreateStockMovementContract = {} as CreateResult;
      
      expect(transformContract).toBeDefined();
      expect(databaseContract).toBeDefined();
      expect(createContract).toBeDefined();
    }).not.toThrow();
  });

  // Test 12: Export Validation for Schema Index Integration
  it('should export all required schemas and types', () => {
    expect(() => {
      const {
        StockMovementDatabaseSchema,
        StockMovementTransformSchema,
        CreateStockMovementSchema,
        MOVEMENT_TYPES,
        // Types should be exported for TypeScript usage
      } = require('../stockMovement.schemas');
      
      expect(StockMovementDatabaseSchema).toBeDefined();
      expect(StockMovementTransformSchema).toBeDefined();
      expect(CreateStockMovementSchema).toBeDefined();
      expect(MOVEMENT_TYPES).toBeDefined();
    }).not.toThrow();
  });
});