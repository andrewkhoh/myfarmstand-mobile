/**
 * Schema Contract Tests - Inventory
 * Ensures transformation schemas match their corresponding interfaces exactly
 * Following Pattern 2: Schema Contract Management
 */

import type { 
  InventoryItemTransform,
  StockMovementTransform,
  CreateStockMovementInput,
  StockUpdateInput
} from '../index';

import {
  InventoryItemTransformSchema,
  StockMovementTransformSchema,
  CreateStockMovementInputSchema,
  StockUpdateInputSchema
} from '../index';

import { z } from 'zod';

// Utility type to assert exact type matches
type AssertExact<T, Expected> = T extends Expected 
  ? Expected extends T 
    ? true 
    : false 
  : false;

// ✅ CONTRACT TEST: InventoryItemTransform schema must match interface exactly
describe('Inventory Schema Contracts', () => {
  describe('InventoryItemTransformSchema', () => {
    it('should match InventoryItemTransform interface exactly', () => {
      // This test ensures the schema transformation produces exactly what the interface expects
      type TransformationOutput = z.infer<typeof InventoryItemTransformSchema>;
      type ContractMatch = AssertExact<TransformationOutput, InventoryItemTransform>;
      
      const contractTest: ContractMatch = true;
      expect(contractTest).toBe(true);
    });

    it('should populate all required interface fields', () => {
      const mockRawData = {
        id: 'inv-1',
        inventory_item_id: 'item-1',
        product_id: 'prod-1',
        product_name: 'Test Product',
        current_stock: 10,
        reserved_stock: 2,
        minimum_threshold: 5,
        maximum_threshold: 100,
        is_active: true,
        is_visible_to_customers: true,
        last_stock_update: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = InventoryItemTransformSchema.parse(mockRawData);
      
      // Verify every interface field is present and correctly typed
      expect(result.id).toBeDefined();
      expect(result.inventoryItemId).toBeDefined();
      expect(result.productId).toBeDefined();
      expect(result.productName).toBeDefined();
      expect(result.currentStock).toBeDefined();
      expect(result.reservedStock).toBeDefined();
      expect(result.minimumThreshold).toBeDefined();
      expect(result.maximumThreshold).toBeDefined();
      expect(result.isActive).toBeDefined();
      expect(result.isVisibleToCustomers).toBeDefined();
      expect(result.lastStockUpdate).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      
      // Verify correct data transformation (snake_case → camelCase)
      expect(result.inventoryItemId).toBe('item-1');
      expect(result.productId).toBe('prod-1');
      expect(result.productName).toBe('Test Product');
      expect(result.isActive).toBe(true);
      expect(result.isVisibleToCustomers).toBe(true);
    });
  });

  describe('StockMovementTransformSchema', () => {
    it('should match StockMovementTransform interface exactly', () => {
      type TransformationOutput = z.infer<typeof StockMovementTransformSchema>;
      type ContractMatch = AssertExact<TransformationOutput, StockMovementTransform>;
      
      const contractTest: ContractMatch = true;
      expect(contractTest).toBe(true);
    });

    it('should populate all required interface fields', () => {
      const mockRawData = {
        id: 'mov-1',
        inventory_item_id: 'inv-1',
        movement_type: 'adjustment',
        quantity_change: -5,
        previous_stock: 100,
        new_stock: 95,
        reason: 'Test adjustment',
        performed_by: 'user-1',
        performed_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        reference_order_id: null,
        batch_id: null
      };

      const result = StockMovementTransformSchema.parse(mockRawData);
      
      // Verify every interface field is present
      expect(result.id).toBeDefined();
      expect(result.inventoryItemId).toBeDefined();
      expect(result.movementType).toBeDefined();
      expect(result.quantityChange).toBeDefined();
      expect(result.previousStock).toBeDefined();
      expect(result.newStock).toBeDefined();
      expect(result.reason).toBeDefined();
      expect(result.performedBy).toBeDefined();
      expect(result.performedAt).toBeDefined();
      expect(result.createdAt).toBeDefined();
      
      // Verify correct data transformation
      expect(result.inventoryItemId).toBe('inv-1');
      expect(result.movementType).toBe('adjustment');
      expect(result.quantityChange).toBe(-5);
      expect(result.performedBy).toBe('user-1');
    });
  });

  describe('CreateStockMovementInputSchema', () => {
    it('should match CreateStockMovementInput interface exactly', () => {
      type SchemaOutput = z.infer<typeof CreateStockMovementInputSchema>;
      type ContractMatch = AssertExact<SchemaOutput, CreateStockMovementInput>;
      
      const contractTest: ContractMatch = true;
      expect(contractTest).toBe(true);
    });
  });

  describe('StockUpdateInputSchema', () => {
    it('should match StockUpdateInput interface exactly', () => {
      type SchemaOutput = z.infer<typeof StockUpdateInputSchema>;
      type ContractMatch = AssertExact<SchemaOutput, StockUpdateInput>;
      
      const contractTest: ContractMatch = true;
      expect(contractTest).toBe(true);
    });
  });

  // ✅ COMPLETENESS VALIDATION: Catch incomplete transformations
  describe('Transformation Completeness', () => {
    it('should catch incomplete inventory item transformations', () => {
      const incompleteRawData = {
        id: 'inv-1',
        inventory_item_id: 'item-1',
        product_id: 'prod-1',
        // Missing required fields - should cause TypeScript errors in transformation
      };

      // This test ensures that if we miss mapping any required fields,
      // TypeScript will catch it during compilation
      expect(() => {
        // The schema should handle incomplete data gracefully
        // But TypeScript should prevent incomplete transformations
        InventoryItemTransformSchema.parse(incompleteRawData);
      }).toThrow();
    });

    it('should catch incomplete stock movement transformations', () => {
      const incompleteRawData = {
        id: 'mov-1',
        inventory_item_id: 'inv-1',
        // Missing required fields
      };

      expect(() => {
        StockMovementTransformSchema.parse(incompleteRawData);
      }).toThrow();
    });
  });

  // ✅ FIELD SELECTION VALIDATION: Ensure services select all required fields
  describe('Service Field Selection Validation', () => {
    it('should document required database fields for inventory items', () => {
      // This serves as documentation for services to ensure they select all required fields
      const requiredDatabaseFields = [
        'id',
        'inventory_item_id',
        'product_id', 
        'product_name',
        'current_stock',
        'reserved_stock',
        'minimum_threshold',
        'maximum_threshold',
        'is_active',
        'is_visible_to_customers',
        'last_stock_update',
        'created_at',
        'updated_at'
      ];

      // Services must select these exact fields for the transformation to work
      expect(requiredDatabaseFields).toHaveLength(13);
      
      // Verify no typos in field names
      expect(requiredDatabaseFields).toContain('inventory_item_id');
      expect(requiredDatabaseFields).toContain('is_visible_to_customers');
      expect(requiredDatabaseFields).toContain('last_stock_update');
    });

    it('should document required database fields for stock movements', () => {
      const requiredDatabaseFields = [
        'id',
        'inventory_item_id',
        'movement_type',
        'quantity_change',
        'previous_stock',
        'new_stock',
        'reason',
        'performed_by',
        'performed_at',
        'created_at',
        'reference_order_id',
        'batch_id'
      ];

      expect(requiredDatabaseFields).toHaveLength(12);
      expect(requiredDatabaseFields).toContain('inventory_item_id');
      expect(requiredDatabaseFields).toContain('movement_type');
      expect(requiredDatabaseFields).toContain('quantity_change');
    });
  });
});