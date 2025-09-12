import { z } from 'zod';
import type { StockMovement, MovementType } from '../types';

// Movement type enum - matches database CHECK constraint exactly
export const MOVEMENT_TYPES = {
  RESTOCK: 'restock',
  SALE: 'sale',
  ADJUSTMENT: 'adjustment',
  RESERVATION: 'reservation',
  RELEASE: 'release'
} as const;

// Movement type schema
export const MovementTypeSchema = z.enum([
  MOVEMENT_TYPES.RESTOCK,
  MOVEMENT_TYPES.SALE,
  MOVEMENT_TYPES.ADJUSTMENT,
  MOVEMENT_TYPES.RESERVATION,
  MOVEMENT_TYPES.RELEASE
]);

// Database schema - matches database/inventory-test-schema.sql EXACTLY
export const StockMovementDatabaseSchema = z.object({
  id: z.string().uuid(),
  inventory_item_id: z.string().uuid(),
  movement_type: MovementTypeSchema,
  quantity_change: z.number().int(),
  previous_stock: z.number().int().min(0),
  new_stock: z.number().int().min(0),
  reason: z.string().nullable(),
  performed_by: z.string().uuid().nullable(),
  performed_at: z.string(),
  reference_order_id: z.string().uuid().nullable(),
  batch_id: z.string().uuid().nullable(),
  created_at: z.string()
});

// Database row type
export type StockMovementDatabaseRow = z.infer<typeof StockMovementDatabaseSchema>;

// Transform schema with EXPLICIT return type annotation
export const StockMovementTransformSchema = StockMovementDatabaseSchema
  .transform((data): StockMovement => ({
    id: data.id,
    inventoryItemId: data.inventory_item_id,
    movementType: data.movement_type,
    quantityChange: data.quantity_change,
    previousStock: data.previous_stock,
    newStock: data.new_stock,
    reason: data.reason,
    performedBy: data.performed_by,
    performedAt: data.performed_at,
    referenceOrderId: data.reference_order_id,
    batchId: data.batch_id,
    createdAt: data.created_at
  }));

// Validation functions
export const validateStockMovement = (data: unknown): StockMovement => {
  return StockMovementTransformSchema.parse(data);
};

export const validateStockMovements = (data: unknown): StockMovement[] => {
  const arraySchema = z.array(StockMovementTransformSchema);
  return arraySchema.parse(data);
};

// Input schemas for creating stock movements
export const CreateStockMovementSchema = z.object({
  inventoryItemId: z.string().uuid(),
  movementType: MovementTypeSchema,
  quantityChange: z.number().int(),
  previousStock: z.number().int().min(0),
  newStock: z.number().int().min(0),
  reason: z.string().optional(),
  performedBy: z.string().uuid().optional(),
  referenceOrderId: z.string().uuid().optional(),
  batchId: z.string().uuid().optional()
});

// Specific movement type schemas for different operations
export const RestockMovementSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  reason: z.string().optional(),
  performedBy: z.string().uuid(),
  batchId: z.string().uuid().optional()
});

export const SaleMovementSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  referenceOrderId: z.string().uuid(),
  performedBy: z.string().uuid().optional()
});

export const AdjustmentMovementSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantityChange: z.number().int(),  // Can be positive or negative
  reason: z.string(),
  performedBy: z.string().uuid()
});

export const ReservationMovementSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  referenceOrderId: z.string().uuid(),
  performedBy: z.string().uuid().optional()
});

export const ReleaseMovementSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  reason: z.string().optional(),
  referenceOrderId: z.string().uuid().optional(),
  performedBy: z.string().uuid().optional()
});

// Type exports
export type CreateStockMovementInput = z.infer<typeof CreateStockMovementSchema>;
export type RestockMovementInput = z.infer<typeof RestockMovementSchema>;
export type SaleMovementInput = z.infer<typeof SaleMovementSchema>;
export type AdjustmentMovementInput = z.infer<typeof AdjustmentMovementSchema>;
export type ReservationMovementInput = z.infer<typeof ReservationMovementSchema>;
export type ReleaseMovementInput = z.infer<typeof ReleaseMovementSchema>;