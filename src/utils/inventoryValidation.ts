import {
  InventoryItemTransformSchema,
  StockMovementTransformSchema,
  type InventoryItem,
  type StockMovement
} from '../schemas/inventory';
import { ValidationMonitor } from './validationMonitor';
import { z } from 'zod';

/**
 * Validates and transforms raw inventory items from the database
 */
export const validateInventoryItems = (data: unknown): InventoryItem[] => {
  try {
    if (!Array.isArray(data)) {
      throw new Error('Expected array of inventory items');
    }

    const validated = data.map(item => InventoryItemTransformSchema.parse(item));
    ValidationMonitor.recordPatternSuccess({
      pattern: 'transformation_schema',
      context: 'inventory-items'
    });
    return validated;
  } catch (error) {
    ValidationMonitor.recordValidationError({
      context: 'inventory-items',
      errorMessage: error instanceof Error ? error.message : 'Validation failed',
      validationPattern: 'transformation_schema'
    });
    throw error;
  }
};

/**
 * Validates a single inventory item
 */
export const validateInventoryItem = (data: unknown): InventoryItem => {
  try {
    const validated = InventoryItemTransformSchema.parse(data);
    ValidationMonitor.recordPatternSuccess({
      pattern: 'transformation_schema',
      context: 'inventory-item'
    });
    return validated;
  } catch (error) {
    ValidationMonitor.recordValidationError({
      context: 'inventory-item',
      errorMessage: error instanceof Error ? error.message : 'Validation failed',
      validationPattern: 'transformation_schema'
    });
    throw error;
  }
};

/**
 * Validates stock movements from the database
 */
export const validateStockMovements = (data: unknown): StockMovement[] => {
  try {
    if (!Array.isArray(data)) {
      throw new Error('Expected array of stock movements');
    }

    const validated = data.map(movement => StockMovementTransformSchema.parse(movement));
    ValidationMonitor.recordPatternSuccess({
      pattern: 'transformation_schema',
      context: 'stock-movements'
    });
    return validated;
  } catch (error) {
    ValidationMonitor.recordValidationError({
      context: 'stock-movements',
      errorMessage: error instanceof Error ? error.message : 'Validation failed',
      validationPattern: 'transformation_schema'
    });
    throw error;
  }
};

/**
 * Generic validation wrapper for async operations
 */
export const validateAndTransform = async <T>(
  queryFn: () => Promise<any>,
  schema: z.ZodSchema<T>,
  context: string
): Promise<T> => {
  try {
    const data = await queryFn();
    const validated = schema.parse(data);
    ValidationMonitor.recordPatternSuccess({
      pattern: 'direct_schema_validation',
      context
    });
    return validated;
  } catch (error) {
    ValidationMonitor.recordValidationError({
      context,
      errorMessage: error instanceof Error ? error.message : 'Validation failed',
      validationPattern: 'direct_schema'
    });
    throw error;
  }
};

/**
 * Validates inventory metrics data
 */
export const InventoryMetricsSchema = z.object({
  totalItems: z.number().min(0),
  totalValue: z.number().min(0),
  lowStockCount: z.number().min(0),
  outOfStockCount: z.number().min(0),
  warehouseDistribution: z.array(z.object({
    warehouseId: z.string(),
    warehouseName: z.string(),
    itemCount: z.number().min(0),
    totalValue: z.number().min(0)
  })),
  categoryBreakdown: z.array(z.object({
    category: z.string(),
    itemCount: z.number().min(0),
    currentStock: z.number().min(0),
    minimumStock: z.number().min(0),
    maximumStock: z.number().min(0)
  })),
  recentMovements: z.array(z.object({
    id: z.string(),
    itemName: z.string(),
    movementType: z.string(),
    quantity: z.number(),
    timestamp: z.string()
  }))
});

export type InventoryMetrics = z.infer<typeof InventoryMetricsSchema>;