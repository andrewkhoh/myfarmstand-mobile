import { z } from 'zod';
import { 
  InventoryItemDatabaseSchema,
  InventoryItemTransformSchema,
  validateInventoryItem,
  validateInventoryItems
} from '../inventoryItem.schemas';
import type { InventoryItemDatabaseRow } from './database-mock.types';
import type { InventoryItem } from '../../types';

describe('InventoryItem Schema Contracts', () => {
  describe('Database Schema Contract', () => {
    it('should match the database row type exactly', () => {
      // Compile-time type checking
      type DatabaseSchemaType = z.infer<typeof InventoryItemDatabaseSchema>;
      type ExpectedDatabaseType = InventoryItemDatabaseRow;
      
      // These assignments will fail at compile time if types don't match
      const _dbToExpected: ExpectedDatabaseType = {} as DatabaseSchemaType;
      const _expectedToDb: DatabaseSchemaType = {} as ExpectedDatabaseType;
      
      expect(true).toBe(true); // Test passes if compilation succeeds
    });

    it('should validate valid database row data', () => {
      const validDatabaseRow: InventoryItemDatabaseRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        current_stock: 100,
        reserved_stock: 20,
        minimum_threshold: 10,
        maximum_threshold: 500,
        is_active: true,
        is_visible_to_customers: true,
        last_stock_update: '2024-01-01T10:00:00Z',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      };

      const result = InventoryItemDatabaseSchema.parse(validDatabaseRow);
      expect(result).toEqual(validDatabaseRow);
    });

    it('should handle nullable fields correctly', () => {
      const rowWithNulls: InventoryItemDatabaseRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        current_stock: 50,
        reserved_stock: 0,
        minimum_threshold: null,
        maximum_threshold: null,
        is_active: true,
        is_visible_to_customers: false,
        last_stock_update: '2024-01-01T10:00:00Z',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      };

      const result = InventoryItemDatabaseSchema.parse(rowWithNulls);
      expect(result.minimum_threshold).toBeNull();
      expect(result.maximum_threshold).toBeNull();
    });

    it('should reject invalid UUID formats', () => {
      const invalidRow = {
        id: 'not-a-uuid',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        current_stock: 100,
        reserved_stock: 20,
        minimum_threshold: 10,
        maximum_threshold: 500,
        is_active: true,
        is_visible_to_customers: true,
        last_stock_update: '2024-01-01T10:00:00Z',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      };

      expect(() => InventoryItemDatabaseSchema.parse(invalidRow)).toThrow();
    });

    it('should reject negative stock values', () => {
      const invalidRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        current_stock: -10,
        reserved_stock: 0,
        minimum_threshold: null,
        maximum_threshold: null,
        is_active: true,
        is_visible_to_customers: true,
        last_stock_update: '2024-01-01T10:00:00Z',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      };

      expect(() => InventoryItemDatabaseSchema.parse(invalidRow)).toThrow();
    });
  });

  describe('Transform Schema Contract', () => {
    it('should transform database row to application type', () => {
      const databaseRow: InventoryItemDatabaseRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        current_stock: 100,
        reserved_stock: 20,
        minimum_threshold: 10,
        maximum_threshold: 500,
        is_active: true,
        is_visible_to_customers: true,
        last_stock_update: '2024-01-01T10:00:00Z',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      };

      const result: InventoryItem = InventoryItemTransformSchema.parse(databaseRow);

      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        productId: '123e4567-e89b-12d3-a456-426614174001',
        currentStock: 100,
        reservedStock: 20,
        availableStock: 80,  // Computed field
        minimumThreshold: 10,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T10:00:00Z',
        createdAt: '2024-01-01T09:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      });
    });

    it('should correctly compute availableStock', () => {
      const databaseRow: InventoryItemDatabaseRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        current_stock: 50,
        reserved_stock: 30,
        minimum_threshold: null,
        maximum_threshold: null,
        is_active: true,
        is_visible_to_customers: true,
        last_stock_update: '2024-01-01T10:00:00Z',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      };

      const result = InventoryItemTransformSchema.parse(databaseRow);
      expect(result.availableStock).toBe(20);  // 50 - 30
    });

    it('should handle edge case where all stock is reserved', () => {
      const databaseRow: InventoryItemDatabaseRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        current_stock: 100,
        reserved_stock: 100,
        minimum_threshold: null,
        maximum_threshold: null,
        is_active: false,
        is_visible_to_customers: false,
        last_stock_update: '2024-01-01T10:00:00Z',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      };

      const result = InventoryItemTransformSchema.parse(databaseRow);
      expect(result.availableStock).toBe(0);
    });
  });

  describe('Validation Functions', () => {
    it('should validate single inventory item', () => {
      const databaseRow: InventoryItemDatabaseRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        current_stock: 100,
        reserved_stock: 20,
        minimum_threshold: 10,
        maximum_threshold: 500,
        is_active: true,
        is_visible_to_customers: true,
        last_stock_update: '2024-01-01T10:00:00Z',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      };

      const result = validateInventoryItem(databaseRow);
      expect(result.productId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(result.availableStock).toBe(80);
    });

    it('should validate array of inventory items', () => {
      const databaseRows: InventoryItemDatabaseRow[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          product_id: '123e4567-e89b-12d3-a456-426614174001',
          current_stock: 100,
          reserved_stock: 20,
          minimum_threshold: 10,
          maximum_threshold: 500,
          is_active: true,
          is_visible_to_customers: true,
          last_stock_update: '2024-01-01T10:00:00Z',
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T10:00:00Z'
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174000',
          product_id: '223e4567-e89b-12d3-a456-426614174001',
          current_stock: 50,
          reserved_stock: 10,
          minimum_threshold: null,
          maximum_threshold: null,
          is_active: false,
          is_visible_to_customers: false,
          last_stock_update: '2024-01-02T10:00:00Z',
          created_at: '2024-01-02T09:00:00Z',
          updated_at: '2024-01-02T10:00:00Z'
        }
      ];

      const result = validateInventoryItems(databaseRows);
      expect(result).toHaveLength(2);
      expect(result[0].availableStock).toBe(80);
      expect(result[1].availableStock).toBe(40);
    });

    it('should throw on invalid data in array validation', () => {
      const invalidData = [
        { invalid: 'data' },
        { another: 'invalid' }
      ];

      expect(() => validateInventoryItems(invalidData)).toThrow();
    });
  });

  describe('Type Safety Contract', () => {
    it('should enforce return type on transform', () => {
      // This test verifies that the transform has an explicit return type
      // The transform function signature should be:
      // (data: DatabaseRow) => InventoryItem
      
      const testTransform = (data: any) => {
        const result: InventoryItem = InventoryItemTransformSchema.parse(data);
        // Type checking ensures result is InventoryItem
        const _id: string = result.id;
        const _productId: string = result.productId;
        const _availableStock: number = result.availableStock;
        return result;
      };

      expect(typeof testTransform).toBe('function');
    });
  });
});