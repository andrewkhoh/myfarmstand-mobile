import { z } from 'zod';
import { 
  StockMovementDatabaseSchema,
  StockMovementTransformSchema,
  validateStockMovement,
  validateStockMovements,
  MOVEMENT_TYPES
} from '../stockMovement.schemas';
import type { StockMovementDatabaseRow } from './database-mock.types';
import type { StockMovement } from '../../types';

describe('StockMovement Schema Contracts', () => {
  describe('Database Schema Contract', () => {
    it('should match the database row type exactly', () => {
      // Compile-time type checking
      type DatabaseSchemaType = z.infer<typeof StockMovementDatabaseSchema>;
      type ExpectedDatabaseType = StockMovementDatabaseRow;
      
      // These assignments will fail at compile time if types don't match
      const _dbToExpected: ExpectedDatabaseType = {} as DatabaseSchemaType;
      const _expectedToDb: DatabaseSchemaType = {} as ExpectedDatabaseType;
      
      expect(true).toBe(true); // Test passes if compilation succeeds
    });

    it('should validate valid database row data', () => {
      const validDatabaseRow: StockMovementDatabaseRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        inventory_item_id: '123e4567-e89b-12d3-a456-426614174001',
        movement_type: 'restock',
        quantity_change: 50,
        previous_stock: 100,
        new_stock: 150,
        reason: 'Regular restock',
        performed_by: '123e4567-e89b-12d3-a456-426614174002',
        performed_at: '2024-01-01T10:00:00Z',
        reference_order_id: '123e4567-e89b-12d3-a456-426614174003',
        batch_id: '123e4567-e89b-12d3-a456-426614174004',
        created_at: '2024-01-01T10:00:00Z'
      };

      const result = StockMovementDatabaseSchema.parse(validDatabaseRow);
      expect(result).toEqual(validDatabaseRow);
    });

    it('should handle nullable fields correctly', () => {
      const rowWithNulls: StockMovementDatabaseRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        inventory_item_id: '123e4567-e89b-12d3-a456-426614174001',
        movement_type: 'adjustment',
        quantity_change: -10,
        previous_stock: 100,
        new_stock: 90,
        reason: null,
        performed_by: null,
        performed_at: '2024-01-01T10:00:00Z',
        reference_order_id: null,
        batch_id: null,
        created_at: '2024-01-01T10:00:00Z'
      };

      const result = StockMovementDatabaseSchema.parse(rowWithNulls);
      expect(result.reason).toBeNull();
      expect(result.performed_by).toBeNull();
      expect(result.reference_order_id).toBeNull();
      expect(result.batch_id).toBeNull();
    });

    it('should validate all movement types', () => {
      const movementTypes = ['restock', 'sale', 'adjustment', 'reservation', 'release'] as const;
      
      movementTypes.forEach(type => {
        const row: StockMovementDatabaseRow = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          inventory_item_id: '123e4567-e89b-12d3-a456-426614174001',
          movement_type: type,
          quantity_change: type === 'sale' ? -10 : 10,
          previous_stock: 100,
          new_stock: type === 'sale' ? 90 : 110,
          reason: null,
          performed_by: null,
          performed_at: '2024-01-01T10:00:00Z',
          reference_order_id: null,
          batch_id: null,
          created_at: '2024-01-01T10:00:00Z'
        };

        const result = StockMovementDatabaseSchema.parse(row);
        expect(result.movement_type).toBe(type);
      });
    });

    it('should reject invalid movement types', () => {
      const invalidRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        inventory_item_id: '123e4567-e89b-12d3-a456-426614174001',
        movement_type: 'invalid_type',
        quantity_change: 10,
        previous_stock: 100,
        new_stock: 110,
        reason: null,
        performed_by: null,
        performed_at: '2024-01-01T10:00:00Z',
        reference_order_id: null,
        batch_id: null,
        created_at: '2024-01-01T10:00:00Z'
      };

      expect(() => StockMovementDatabaseSchema.parse(invalidRow)).toThrow();
    });

    it('should reject negative stock values', () => {
      const invalidRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        inventory_item_id: '123e4567-e89b-12d3-a456-426614174001',
        movement_type: 'sale',
        quantity_change: -150,
        previous_stock: 100,
        new_stock: -50,  // Invalid: negative stock
        reason: null,
        performed_by: null,
        performed_at: '2024-01-01T10:00:00Z',
        reference_order_id: null,
        batch_id: null,
        created_at: '2024-01-01T10:00:00Z'
      };

      expect(() => StockMovementDatabaseSchema.parse(invalidRow)).toThrow();
    });
  });

  describe('Transform Schema Contract', () => {
    it('should transform database row to application type', () => {
      const databaseRow: StockMovementDatabaseRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        inventory_item_id: '123e4567-e89b-12d3-a456-426614174001',
        movement_type: 'restock',
        quantity_change: 50,
        previous_stock: 100,
        new_stock: 150,
        reason: 'Regular restock',
        performed_by: '123e4567-e89b-12d3-a456-426614174002',
        performed_at: '2024-01-01T10:00:00Z',
        reference_order_id: '123e4567-e89b-12d3-a456-426614174003',
        batch_id: '123e4567-e89b-12d3-a456-426614174004',
        created_at: '2024-01-01T10:00:00Z'
      };

      const result: StockMovement = StockMovementTransformSchema.parse(databaseRow);

      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174001',
        movementType: 'restock',
        quantityChange: 50,
        previousStock: 100,
        newStock: 150,
        reason: 'Regular restock',
        performedBy: '123e4567-e89b-12d3-a456-426614174002',
        performedAt: '2024-01-01T10:00:00Z',
        referenceOrderId: '123e4567-e89b-12d3-a456-426614174003',
        batchId: '123e4567-e89b-12d3-a456-426614174004',
        createdAt: '2024-01-01T10:00:00Z'
      });
    });

    it('should handle sale movements correctly', () => {
      const databaseRow: StockMovementDatabaseRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        inventory_item_id: '123e4567-e89b-12d3-a456-426614174001',
        movement_type: 'sale',
        quantity_change: -20,
        previous_stock: 100,
        new_stock: 80,
        reason: null,
        performed_by: null,
        performed_at: '2024-01-01T10:00:00Z',
        reference_order_id: '123e4567-e89b-12d3-a456-426614174003',
        batch_id: null,
        created_at: '2024-01-01T10:00:00Z'
      };

      const result = StockMovementTransformSchema.parse(databaseRow);
      expect(result.movementType).toBe('sale');
      expect(result.quantityChange).toBe(-20);
      expect(result.newStock).toBe(80);
    });

    it('should handle adjustments with both positive and negative changes', () => {
      // Positive adjustment
      const positiveAdjustment: StockMovementDatabaseRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        inventory_item_id: '123e4567-e89b-12d3-a456-426614174001',
        movement_type: 'adjustment',
        quantity_change: 15,
        previous_stock: 100,
        new_stock: 115,
        reason: 'Found additional stock during audit',
        performed_by: '123e4567-e89b-12d3-a456-426614174002',
        performed_at: '2024-01-01T10:00:00Z',
        reference_order_id: null,
        batch_id: null,
        created_at: '2024-01-01T10:00:00Z'
      };

      const positiveResult = StockMovementTransformSchema.parse(positiveAdjustment);
      expect(positiveResult.quantityChange).toBe(15);
      expect(positiveResult.newStock).toBe(115);

      // Negative adjustment
      const negativeAdjustment: StockMovementDatabaseRow = {
        id: '223e4567-e89b-12d3-a456-426614174000',
        inventory_item_id: '123e4567-e89b-12d3-a456-426614174001',
        movement_type: 'adjustment',
        quantity_change: -5,
        previous_stock: 115,
        new_stock: 110,
        reason: 'Damaged items removed',
        performed_by: '123e4567-e89b-12d3-a456-426614174002',
        performed_at: '2024-01-01T11:00:00Z',
        reference_order_id: null,
        batch_id: null,
        created_at: '2024-01-01T11:00:00Z'
      };

      const negativeResult = StockMovementTransformSchema.parse(negativeAdjustment);
      expect(negativeResult.quantityChange).toBe(-5);
      expect(negativeResult.newStock).toBe(110);
    });
  });

  describe('Validation Functions', () => {
    it('should validate single stock movement', () => {
      const databaseRow: StockMovementDatabaseRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        inventory_item_id: '123e4567-e89b-12d3-a456-426614174001',
        movement_type: 'reservation',
        quantity_change: -30,
        previous_stock: 100,
        new_stock: 70,
        reason: 'Reserved for order',
        performed_by: null,
        performed_at: '2024-01-01T10:00:00Z',
        reference_order_id: '123e4567-e89b-12d3-a456-426614174003',
        batch_id: null,
        created_at: '2024-01-01T10:00:00Z'
      };

      const result = validateStockMovement(databaseRow);
      expect(result.inventoryItemId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(result.movementType).toBe('reservation');
    });

    it('should validate array of stock movements', () => {
      const databaseRows: StockMovementDatabaseRow[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          inventory_item_id: '123e4567-e89b-12d3-a456-426614174001',
          movement_type: 'restock',
          quantity_change: 100,
          previous_stock: 50,
          new_stock: 150,
          reason: 'Initial stock',
          performed_by: '123e4567-e89b-12d3-a456-426614174002',
          performed_at: '2024-01-01T09:00:00Z',
          reference_order_id: null,
          batch_id: '123e4567-e89b-12d3-a456-426614174004',
          created_at: '2024-01-01T09:00:00Z'
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174000',
          inventory_item_id: '123e4567-e89b-12d3-a456-426614174001',
          movement_type: 'sale',
          quantity_change: -20,
          previous_stock: 150,
          new_stock: 130,
          reason: null,
          performed_by: null,
          performed_at: '2024-01-01T10:00:00Z',
          reference_order_id: '323e4567-e89b-12d3-a456-426614174003',
          batch_id: null,
          created_at: '2024-01-01T10:00:00Z'
        }
      ];

      const result = validateStockMovements(databaseRows);
      expect(result).toHaveLength(2);
      expect(result[0].movementType).toBe('restock');
      expect(result[1].movementType).toBe('sale');
    });

    it('should throw on invalid data in array validation', () => {
      const invalidData = [
        { invalid: 'data' },
        { another: 'invalid' }
      ];

      expect(() => validateStockMovements(invalidData)).toThrow();
    });
  });

  describe('Movement Type Constants', () => {
    it('should export correct movement type constants', () => {
      expect(MOVEMENT_TYPES.RESTOCK).toBe('restock');
      expect(MOVEMENT_TYPES.SALE).toBe('sale');
      expect(MOVEMENT_TYPES.ADJUSTMENT).toBe('adjustment');
      expect(MOVEMENT_TYPES.RESERVATION).toBe('reservation');
      expect(MOVEMENT_TYPES.RELEASE).toBe('release');
    });
  });

  describe('Type Safety Contract', () => {
    it('should enforce return type on transform', () => {
      // This test verifies that the transform has an explicit return type
      const testTransform = (data: any) => {
        const result: StockMovement = StockMovementTransformSchema.parse(data);
        // Type checking ensures result is StockMovement
        const _id: string = result.id;
        const _inventoryItemId: string = result.inventoryItemId;
        const _movementType: string = result.movementType;
        return result;
      };

      expect(typeof testTransform).toBe('function');
    });
  });
});