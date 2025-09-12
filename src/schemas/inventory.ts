import { z } from 'zod';

// Database schema (snake_case)
export const InventoryItemDBSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  warehouse_id: z.string().uuid(),
  current_stock: z.number().int().min(0),
  reserved_stock: z.number().int().min(0),
  minimum_stock: z.number().int().min(0),
  maximum_stock: z.number().int().min(0),
  reorder_point: z.number().int().min(0),
  reorder_quantity: z.number().int().min(0),
  unit_cost: z.number().min(0),
  last_restocked_at: z.string().datetime().nullable(),
  last_counted_at: z.string().datetime().nullable(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Application schema (camelCase) with computed fields
export const InventoryItemTransformSchema = InventoryItemDBSchema.transform((data): {
  id: string;
  productId: string;
  warehouseId: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minimumStock: number;
  maximumStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  unitCost: number;
  totalValue: number;
  lastRestockedAt: string | null;
  lastCountedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stockStatus: string;
} => ({
  id: data.id,
  productId: data.product_id,
  warehouseId: data.warehouse_id,
  currentStock: data.current_stock,
  reservedStock: data.reserved_stock,
  availableStock: data.current_stock - data.reserved_stock,
  minimumStock: data.minimum_stock,
  maximumStock: data.maximum_stock,
  reorderPoint: data.reorder_point,
  reorderQuantity: data.reorder_quantity,
  unitCost: data.unit_cost,
  totalValue: data.current_stock * data.unit_cost,
  lastRestockedAt: data.last_restocked_at,
  lastCountedAt: data.last_counted_at,
  isActive: data.is_active,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  stockStatus: getStockStatus(
    data.current_stock - data.reserved_stock,
    data.minimum_stock,
    data.reorder_point
  ),
}));

function getStockStatus(available: number, minimum: number, reorderPoint: number): string {
  if (available <= 0) return 'out_of_stock';
  if (available <= minimum) return 'critical';
  if (available <= reorderPoint) return 'low';
  return 'normal';
}

// Create schema for new inventory items
export const CreateInventoryItemSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  currentStock: z.number().int().min(0),
  reservedStock: z.number().int().min(0).default(0),
  minimumStock: z.number().int().min(0),
  maximumStock: z.number().int().min(0),
  reorderPoint: z.number().int().min(0),
  reorderQuantity: z.number().int().min(0),
  unitCost: z.number().min(0),
});

// Update schema for inventory items
export const UpdateInventoryItemSchema = z.object({
  currentStock: z.number().int().min(0).optional(),
  reservedStock: z.number().int().min(0).optional(),
  minimumStock: z.number().int().min(0).optional(),
  maximumStock: z.number().int().min(0).optional(),
  reorderPoint: z.number().int().min(0).optional(),
  reorderQuantity: z.number().int().min(0).optional(),
  unitCost: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

// Stock movement schema
export const StockMovementDBSchema = z.object({
  id: z.string().uuid(),
  inventory_item_id: z.string().uuid(),
  movement_type: z.enum(['in', 'out', 'adjustment', 'transfer']),
  quantity: z.number().int(),
  reference_type: z.string().nullable(),
  reference_id: z.string().nullable(),
  from_warehouse_id: z.string().uuid().nullable(),
  to_warehouse_id: z.string().uuid().nullable(),
  reason: z.string().nullable(),
  performed_by: z.string().uuid(),
  notes: z.string().nullable(),
  created_at: z.string().datetime(),
});

export const StockMovementTransformSchema = StockMovementDBSchema.transform((data): {
  id: string;
  inventoryItemId: string;
  movementType: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  fromWarehouseId: string | null;
  toWarehouseId: string | null;
  reason: string | null;
  performedBy: string;
  notes: string | null;
  createdAt: string;
} => ({
  id: data.id,
  inventoryItemId: data.inventory_item_id,
  movementType: data.movement_type,
  quantity: data.quantity,
  referenceType: data.reference_type,
  referenceId: data.reference_id,
  fromWarehouseId: data.from_warehouse_id,
  toWarehouseId: data.to_warehouse_id,
  reason: data.reason,
  performedBy: data.performed_by,
  notes: data.notes,
  createdAt: data.created_at,
}));

export const CreateStockMovementSchema = z.object({
  inventoryItemId: z.string().uuid(),
  movementType: z.enum(['in', 'out', 'adjustment', 'transfer']),
  quantity: z.number().int(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  fromWarehouseId: z.string().uuid().optional(),
  toWarehouseId: z.string().uuid().optional(),
  reason: z.string().optional(),
  performedBy: z.string().uuid(),
  notes: z.string().optional(),
});

// Batch update schema
export const StockUpdateSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.number().int(),
  operation: z.enum(['add', 'subtract', 'set']),
  reason: z.string().optional(),
});

export const BatchStockUpdateSchema = z.object({
  updates: z.array(StockUpdateSchema),
  performedBy: z.string().uuid(),
});

// Types
export type InventoryItem = z.infer<typeof InventoryItemTransformSchema>;
export type CreateInventoryItem = z.infer<typeof CreateInventoryItemSchema>;
export type UpdateInventoryItem = z.infer<typeof UpdateInventoryItemSchema>;
export type StockMovement = z.infer<typeof StockMovementTransformSchema>;
export type CreateStockMovement = z.infer<typeof CreateStockMovementSchema>;
export type StockUpdate = z.infer<typeof StockUpdateSchema>;
export type BatchStockUpdate = z.infer<typeof BatchStockUpdateSchema>;