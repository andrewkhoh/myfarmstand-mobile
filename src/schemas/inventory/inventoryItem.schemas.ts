// Phase 2: Inventory Item Schemas Implementation (GREEN Phase)
// Following docs/architectural-patterns-and-best-practices.md
// Pattern: Database-first validation + transformation schemas + TypeScript return annotations

import { z } from 'zod';

// Phase 1: Database-First Validation
// Raw database schema validation - must match database structure exactly
export const InventoryItemDatabaseSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  current_stock: z.number().int().min(0, 'Current stock cannot be negative'),
  reserved_stock: z.number().int().min(0, 'Reserved stock cannot be negative'),
  available_stock: z.number().int().min(0, 'Available stock cannot be negative'), // Generated column
  minimum_threshold: z.number().int().min(0, 'Minimum threshold cannot be negative').nullable(),
  maximum_threshold: z.number().int().positive('Maximum threshold must be positive').nullable(),
  is_active: z.boolean().nullable().default(true),
  is_visible_to_customers: z.boolean().nullable().default(true),
  last_stock_update: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime().nullable().optional(),
  updated_at: z.string().datetime().nullable().optional()
}).strict().refine(
  (data) => {
    // Business rule: reserved_stock cannot exceed current_stock
    return data.reserved_stock <= data.current_stock;
  },
  {
    message: 'Reserved stock cannot exceed current stock',
    path: ['reserved_stock']
  }
).refine(
  (data) => {
    // Business rule: available_stock should equal current_stock - reserved_stock
    return data.available_stock === (data.current_stock - data.reserved_stock);
  },
  {
    message: 'Available stock calculation inconsistency',
    path: ['available_stock']
  }
).refine(
  (data) => {
    // Business rule: maximum_threshold must be greater than minimum_threshold
    if (data.minimum_threshold !== null && data.maximum_threshold !== null) {
      return data.maximum_threshold > data.minimum_threshold;
    }
    return true;
  },
  {
    message: 'Maximum threshold must be greater than minimum threshold',
    path: ['maximum_threshold']
  }
);

// Phase 2: Transformation Interface (explicit definition to avoid circular references)
// Following Phase 1 architectural pattern
export interface InventoryItemTransform {
  id: string;
  productId: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minimumThreshold: number;
  maximumThreshold: number;
  isActive: boolean;
  isVisibleToCustomers: boolean;
  lastStockUpdate: string;
  createdAt: string;
  updatedAt: string;
}

// Phase 2: Transformation Schema (snake_case → camelCase)
// Following architectural pattern: transformation with null-safe defaults
export const InventoryItemTransformSchema = InventoryItemDatabaseSchema.transform((data): InventoryItemTransform => {
  return {
    id: data.id,
    productId: data.product_id,                                       // Snake → camel
    currentStock: data.current_stock,                                 // Snake → camel
    reservedStock: data.reserved_stock,                               // Snake → camel
    availableStock: data.available_stock,                             // Snake → camel
    minimumThreshold: data.minimum_threshold ?? 10,                  // Snake → camel, null-safe default
    maximumThreshold: data.maximum_threshold ?? 1000,                // Snake → camel, null-safe default
    isActive: data.is_active ?? true,                                 // Snake → camel, null-safe default
    isVisibleToCustomers: data.is_visible_to_customers ?? true,       // Snake → camel, null-safe default
    lastStockUpdate: data.last_stock_update || new Date().toISOString(), // Snake → camel, null-safe default
    createdAt: data.created_at || new Date().toISOString(),           // Snake → camel, null-safe default
    updatedAt: data.updated_at || new Date().toISOString()            // Snake → camel, null-safe default
  };
});

// Phase 3: Input/Update Schemas
// Create input schema for new inventory items
export const CreateInventoryItemSchema = z.object({
  productId: z.string().min(1, 'Product ID cannot be empty'),
  currentStock: z.number().int().min(0, 'Current stock cannot be negative').default(0),
  reservedStock: z.number().int().min(0, 'Reserved stock cannot be negative').default(0),
  minimumThreshold: z.number().int().min(0, 'Minimum threshold cannot be negative').nullable().default(10),
  maximumThreshold: z.number().int().positive('Maximum threshold must be positive').nullable().default(1000),
  isActive: z.boolean().default(true),
  isVisibleToCustomers: z.boolean().default(true)
}).strict().refine(
  (data) => {
    // Business rule: reserved_stock cannot exceed current_stock
    return data.reservedStock <= data.currentStock;
  },
  {
    message: 'Reserved stock cannot exceed current stock',
    path: ['reservedStock']
  }
).refine(
  (data) => {
    // Business rule: maximum_threshold must be greater than minimum_threshold
    if (data.minimumThreshold !== null && data.maximumThreshold !== null) {
      return data.maximumThreshold > data.minimumThreshold;
    }
    return true;
  },
  {
    message: 'Maximum threshold must be greater than minimum threshold',
    path: ['maximumThreshold']
  }
);

// Update input schema for inventory item modifications
export const UpdateInventoryItemSchema = z.object({
  productId: z.string().optional(),
  currentStock: z.number().int().min(0, 'Current stock cannot be negative').optional(),
  reservedStock: z.number().int().min(0, 'Reserved stock cannot be negative').optional(),
  minimumThreshold: z.number().int().min(0, 'Minimum threshold cannot be negative').nullable().optional(),
  maximumThreshold: z.number().int().positive('Maximum threshold must be positive').nullable().optional(),
  isActive: z.boolean().optional(),
  isVisibleToCustomers: z.boolean().optional(),
  lastStockUpdate: z.string().datetime().optional()
}).strict().refine(
  (data) => {
    // Business rule: if both currentStock and reservedStock are provided, validate the relationship
    if (data.currentStock !== undefined && data.reservedStock !== undefined) {
      return data.reservedStock <= data.currentStock;
    }
    return true;
  },
  {
    message: 'Reserved stock cannot exceed current stock',
    path: ['reservedStock']
  }
).refine(
  (data) => {
    // Business rule: if both thresholds are provided, validate the relationship
    if (data.minimumThreshold !== undefined && data.maximumThreshold !== undefined &&
        data.minimumThreshold !== null && data.maximumThreshold !== null) {
      return data.maximumThreshold > data.minimumThreshold;
    }
    return true;
  },
  {
    message: 'Maximum threshold must be greater than minimum threshold',
    path: ['maximumThreshold']
  }
);

// Stock Update Schema for atomic stock operations
export const StockUpdateSchema = z.object({
  currentStock: z.number().int().min(0, 'Current stock cannot be negative'),
  reason: z.string().min(1, 'Reason is required for stock updates').optional(),
  performedBy: z.string().optional()
}).strict();

// Visibility Update Schema for marketing staff
export const VisibilityUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  isVisibleToCustomers: z.boolean().optional()
}).strict().refine(
  (data) => {
    // At least one field must be provided
    return data.isActive !== undefined || data.isVisibleToCustomers !== undefined;
  },
  {
    message: 'At least one visibility field must be provided',
    path: ['isActive', 'isVisibleToCustomers']
  }
);

// Low Stock Filter Schema
export const LowStockFilterSchema = z.object({
  includeInactive: z.boolean().default(false),
  includeHidden: z.boolean().default(false),
  customThreshold: z.number().int().min(0).optional()
}).strict();

// TypeScript Type Exports (with return annotations for compile-time contract enforcement)
export type InventoryItemDatabase = z.infer<typeof InventoryItemDatabaseSchema>;
// InventoryItemTransform is exported as interface above (no z.infer to avoid circular reference)
export type CreateInventoryItemInput = z.infer<typeof CreateInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof UpdateInventoryItemSchema>;
export type StockUpdateInput = z.infer<typeof StockUpdateSchema>;
export type VisibilityUpdateInput = z.infer<typeof VisibilityUpdateSchema>;
export type LowStockFilterInput = z.infer<typeof LowStockFilterSchema>;

// Stock Status Constants for UI and business logic
export const STOCK_STATUS = {
  OUT_OF_STOCK: 'out_of_stock',
  LOW_STOCK: 'low_stock',
  IN_STOCK: 'in_stock',
  OVERSTOCKED: 'overstocked'
} as const;

export type StockStatus = typeof STOCK_STATUS[keyof typeof STOCK_STATUS];

// Helper function to determine stock status
export const getStockStatus = (
  availableStock: number,
  minimumThreshold: number | null,
  maximumThreshold: number | null
): StockStatus => {
  if (availableStock === 0) {
    return STOCK_STATUS.OUT_OF_STOCK;
  }
  
  if (minimumThreshold !== null && availableStock <= minimumThreshold) {
    return STOCK_STATUS.LOW_STOCK;
  }
  
  if (maximumThreshold !== null && availableStock >= maximumThreshold) {
    return STOCK_STATUS.OVERSTOCKED;
  }
  
  return STOCK_STATUS.IN_STOCK;
};

// Query Helper Types for React Query integration
export const INVENTORY_QUERY_TYPES = {
  ALL: 'all',
  BY_PRODUCT: 'by_product',
  LOW_STOCK: 'low_stock',
  VISIBLE: 'visible',
  ACTIVE: 'active'
} as const;

export type InventoryQueryType = typeof INVENTORY_QUERY_TYPES[keyof typeof INVENTORY_QUERY_TYPES];