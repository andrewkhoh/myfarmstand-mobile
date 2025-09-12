import { z } from 'zod';
import type { InventoryItem } from '../types';

// Database schema - matches database/inventory-test-schema.sql EXACTLY
export const InventoryItemDatabaseSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  current_stock: z.number().int().min(0),
  reserved_stock: z.number().int().min(0),
  minimum_threshold: z.number().int().nullable(),
  maximum_threshold: z.number().int().nullable(),
  is_active: z.boolean(),
  is_visible_to_customers: z.boolean(),
  last_stock_update: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

// Database row type
export type InventoryItemDatabaseRow = z.infer<typeof InventoryItemDatabaseSchema>;

// Transform schema with EXPLICIT return type annotation
export const InventoryItemTransformSchema = InventoryItemDatabaseSchema
  .transform((data): InventoryItem => ({
    id: data.id,
    productId: data.product_id,
    currentStock: data.current_stock,
    reservedStock: data.reserved_stock,
    availableStock: data.current_stock - data.reserved_stock,  // Computed field
    minimumThreshold: data.minimum_threshold,
    maximumThreshold: data.maximum_threshold,
    isActive: data.is_active,
    isVisibleToCustomers: data.is_visible_to_customers,
    lastStockUpdate: data.last_stock_update,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }));

// Validation functions
export const validateInventoryItem = (data: unknown): InventoryItem => {
  return InventoryItemTransformSchema.parse(data);
};

export const validateInventoryItems = (data: unknown): InventoryItem[] => {
  const arraySchema = z.array(InventoryItemTransformSchema);
  return arraySchema.parse(data);
};

// Input schemas for creating/updating inventory items
export const CreateInventoryItemSchema = z.object({
  productId: z.string().uuid(),
  currentStock: z.number().int().min(0).default(0),
  reservedStock: z.number().int().min(0).default(0),
  minimumThreshold: z.number().int().optional(),
  maximumThreshold: z.number().int().optional(),
  isActive: z.boolean().default(true),
  isVisibleToCustomers: z.boolean().default(true)
});

export const UpdateInventoryItemSchema = z.object({
  currentStock: z.number().int().min(0).optional(),
  reservedStock: z.number().int().min(0).optional(),
  minimumThreshold: z.number().int().nullable().optional(),
  maximumThreshold: z.number().int().nullable().optional(),
  isActive: z.boolean().optional(),
  isVisibleToCustomers: z.boolean().optional()
});

// Type exports
export type CreateInventoryItemInput = z.infer<typeof CreateInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof UpdateInventoryItemSchema>;