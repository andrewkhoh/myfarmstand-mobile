// Phase 2: Stock Movement Schemas Implementation (GREEN Phase)
// Following docs/architectural-patterns-and-best-practices.md
// Pattern: Database-first validation + transformation schemas + audit trail support

import { z } from 'zod';

// Movement Type Constants (for business logic and UI)
export const MOVEMENT_TYPES = {
  RESTOCK: 'restock',
  SALE: 'sale',
  ADJUSTMENT: 'adjustment',
  RESERVATION: 'reservation',
  RELEASE: 'release'
} as const;

export type MovementType = typeof MOVEMENT_TYPES[keyof typeof MOVEMENT_TYPES];

// Movement Type Enum Schema
const MovementTypeSchema = z.enum(['restock', 'sale', 'adjustment', 'reservation', 'release']);

// Phase 1: Database-First Validation
// Raw database schema validation - must match database structure exactly
export const StockMovementDatabaseSchema = z.object({
  id: z.string().uuid('Invalid stock movement ID format'),
  inventory_item_id: z.string().uuid('Invalid inventory item ID format'),
  movement_type: MovementTypeSchema,
  quantity_change: z.number().int().refine(
    (val) => val !== 0,
    { message: 'Quantity change cannot be zero' }
  ),
  previous_stock: z.number().int().min(0, 'Previous stock cannot be negative'),
  new_stock: z.number().int().min(0, 'New stock cannot be negative'),
  reason: z.string().nullable(),
  performed_by: z.string().nullable(),
  performed_at: z.string().datetime().nullable(),
  reference_order_id: z.string().nullable(),
  batch_id: z.string().nullable(),
  created_at: z.string().datetime().nullable()
}).strict().refine(
  (data) => {
    // Business rule: Stock calculation consistency
    // new_stock must equal previous_stock + quantity_change
    return data.new_stock === (data.previous_stock + data.quantity_change);
  },
  {
    message: 'Stock calculation inconsistency: new_stock must equal previous_stock + quantity_change',
    path: ['new_stock']
  }
);

// Phase 2: Transformation Interface (explicit definition to avoid circular references)
// Following Phase 1 architectural pattern
export interface StockMovementTransform {
  id: string;
  inventoryItemId: string;
  movementType: MovementType;
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

// Phase 2: Transformation Schema (snake_case → camelCase)
// Following architectural pattern: transformation with null-safe defaults
export const StockMovementTransformSchema = StockMovementDatabaseSchema.transform((data): StockMovementTransform => {
  return {
    id: data.id,
    inventoryItemId: data.inventory_item_id,                          // Snake → camel
    movementType: data.movement_type,                                 // Snake → camel
    quantityChange: data.quantity_change,                             // Snake → camel
    previousStock: data.previous_stock,                               // Snake → camel
    newStock: data.new_stock,                                         // Snake → camel
    reason: data.reason,
    performedBy: data.performed_by,                                   // Snake → camel
    performedAt: data.performed_at || new Date().toISOString(),       // Snake → camel, null-safe default
    referenceOrderId: data.reference_order_id,                       // Snake → camel
    batchId: data.batch_id,                                          // Snake → camel
    createdAt: data.created_at || new Date().toISOString()           // Snake → camel, null-safe default
  };
});

// Phase 3: Input Schemas
// Create input schema for recording new stock movements
export const CreateStockMovementSchema = z.object({
  inventoryItemId: z.string().uuid('Invalid inventory item ID format'),
  movementType: MovementTypeSchema,
  quantityChange: z.number().int().refine(
    (val) => val !== 0,
    { message: 'Quantity change cannot be zero' }
  ),
  previousStock: z.number().int().min(0, 'Previous stock cannot be negative'),
  newStock: z.number().int().min(0, 'New stock cannot be negative'),
  reason: z.string().min(1, 'Reason cannot be empty').nullable().optional(),
  performedBy: z.string().nullable().optional(),
  performedAt: z.string().datetime().optional(),
  referenceOrderId: z.string().nullable().optional(),
  batchId: z.string().nullable().optional()
}).strict().refine(
  (data) => {
    // Business rule: Stock calculation consistency
    return data.newStock === (data.previousStock + data.quantityChange);
  },
  {
    message: 'Stock calculation inconsistency: newStock must equal previousStock + quantityChange',
    path: ['newStock']
  }
);

// Batch Movement Input for bulk operations
export const BatchStockMovementSchema = z.object({
  movements: z.array(CreateStockMovementSchema).min(1, 'At least one movement is required'),
  batchId: z.string().uuid('Invalid batch ID format').optional(), // Will be generated if not provided
  reason: z.string().min(1, 'Batch reason is required'),
  performedBy: z.string().uuid('Invalid user ID format')
}).strict();

// Movement Filter Schema for querying movements
export const MovementFilterSchema = z.object({
  inventoryItemId: z.string().uuid('Invalid inventory item ID format').optional(),
  movementType: MovementTypeSchema.optional(),
  performedBy: z.string().uuid('Invalid user ID format').optional(),
  batchId: z.string().uuid('Invalid batch ID format').optional(),
  referenceOrderId: z.string().uuid('Invalid order ID format').optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().positive('Limit must be positive').max(1000, 'Limit cannot exceed 1000').default(100),
  offset: z.number().int().min(0, 'Offset cannot be negative').default(0)
}).strict().refine(
  (data) => {
    // Business rule: startDate must be before endDate
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) < new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'Start date must be before end date',
    path: ['endDate']
  }
);

// Movement History Query Schema
export const MovementHistorySchema = z.object({
  inventoryItemId: z.string().uuid('Invalid inventory item ID format'),
  limit: z.number().int().positive('Limit must be positive').max(500, 'Limit cannot exceed 500').default(50),
  offset: z.number().int().min(0, 'Offset cannot be negative').default(0),
  includeSystemMovements: z.boolean().default(false) // Include auto-generated movements
}).strict();

// Movement Analytics Schema
export const MovementAnalyticsSchema = z.object({
  inventoryItemId: z.string().uuid('Invalid inventory item ID format').optional(),
  movementTypes: z.array(MovementTypeSchema).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  groupBy: z.enum(['day', 'week', 'month']).default('day')
}).strict().refine(
  (data) => {
    return new Date(data.startDate) < new Date(data.endDate);
  },
  {
    message: 'Start date must be before end date',
    path: ['endDate']
  }
);

// TypeScript Type Exports (with return annotations for compile-time contract enforcement)
export type StockMovementDatabase = z.infer<typeof StockMovementDatabaseSchema>;
// StockMovementTransform is exported as interface above (no z.infer to avoid circular reference)
export type CreateStockMovementInput = z.infer<typeof CreateStockMovementSchema>;
export type BatchStockMovementInput = z.infer<typeof BatchStockMovementSchema>;
export type MovementFilterInput = z.infer<typeof MovementFilterSchema>;
export type MovementHistoryInput = z.infer<typeof MovementHistorySchema>;
export type MovementAnalyticsInput = z.infer<typeof MovementAnalyticsSchema>;

// Movement Reason Templates for UI assistance
export const MOVEMENT_REASONS = {
  RESTOCK: {
    DELIVERY: 'Product delivery received',
    PRODUCTION: 'New production batch completed',
    RETURN: 'Customer return processed',
    CORRECTION: 'Inventory correction - increase'
  },
  SALE: {
    CUSTOMER_PURCHASE: 'Customer purchase',
    WHOLESALE: 'Wholesale order fulfillment',
    SAMPLE: 'Product sample distributed',
    GIFT: 'Promotional gift'
  },
  ADJUSTMENT: {
    DAMAGE: 'Product damaged - write off',
    EXPIRY: 'Product expired - disposal',
    THEFT: 'Inventory shrinkage - theft',
    COUNT_CORRECTION: 'Physical count correction',
    TRANSFER: 'Inter-location transfer'
  },
  RESERVATION: {
    ORDER_PLACED: 'Customer order reservation',
    PENDING_FULFILLMENT: 'Pending order fulfillment',
    QUALITY_HOLD: 'Quality inspection hold',
    SPECIAL_ORDER: 'Special customer order'
  },
  RELEASE: {
    ORDER_CANCELLED: 'Customer order cancelled',
    QUALITY_APPROVED: 'Quality inspection passed',
    TIMEOUT: 'Reservation timeout expired',
    MANUAL_RELEASE: 'Manual reservation release'
  }
} as const;

// Movement Impact Schema for business analytics
export const MOVEMENT_IMPACT = {
  POSITIVE: 'positive',    // Increases available stock (restock, release)
  NEGATIVE: 'negative',    // Decreases available stock (sale, reservation)
  NEUTRAL: 'neutral'       // Adjustments (can be + or -)
} as const;

export type MovementImpact = typeof MOVEMENT_IMPACT[keyof typeof MOVEMENT_IMPACT];

// Helper function to determine movement impact
export const getMovementImpact = (movementType: MovementType): MovementImpact => {
  switch (movementType) {
    case MOVEMENT_TYPES.RESTOCK:
    case MOVEMENT_TYPES.RELEASE:
      return MOVEMENT_IMPACT.POSITIVE;
    case MOVEMENT_TYPES.SALE:
    case MOVEMENT_TYPES.RESERVATION:
      return MOVEMENT_IMPACT.NEGATIVE;
    case MOVEMENT_TYPES.ADJUSTMENT:
      return MOVEMENT_IMPACT.NEUTRAL;
    default:
      return MOVEMENT_IMPACT.NEUTRAL;
  }
};

// Query Helper Types for React Query integration
export const MOVEMENT_QUERY_TYPES = {
  ALL: 'all',
  BY_INVENTORY_ITEM: 'by_inventory_item',
  BY_TYPE: 'by_type',
  BY_USER: 'by_user',
  BY_BATCH: 'by_batch',
  BY_ORDER: 'by_order',
  HISTORY: 'history',
  ANALYTICS: 'analytics'
} as const;

export type MovementQueryType = typeof MOVEMENT_QUERY_TYPES[keyof typeof MOVEMENT_QUERY_TYPES];

// Batch Processing Result Type
export interface BatchProcessingResult<T> {
  success: T[];
  errors: Array<{ item: unknown; error: Error }>;
  totalProcessed: number;
  batchId?: string;
}

// Movement Summary Type for analytics
export interface MovementSummary {
  movementType: MovementType;
  totalQuantity: number;
  movementCount: number;
  averageQuantity: number;
  impact: MovementImpact;
}

// Export validation helpers
export const validateStockMovement = (movement: unknown) => {
  return StockMovementDatabaseSchema.parse(movement);
};

export const validateCreateMovement = (input: unknown) => {
  return CreateStockMovementSchema.parse(input);
};

export const validateBatchMovements = (batch: unknown) => {
  return BatchStockMovementSchema.parse(batch);
};