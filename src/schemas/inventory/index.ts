// Phase 2: Inventory Schema Index - Clean Exports
// Following architectural patterns for clean module organization

// Inventory Item Schemas and Types
export {
  InventoryItemDatabaseSchema,
  InventoryItemTransformSchema,
  CreateInventoryItemSchema,
  UpdateInventoryItemSchema,
  StockUpdateSchema,
  VisibilityUpdateSchema,
  LowStockFilterSchema,
  STOCK_STATUS,
  INVENTORY_QUERY_TYPES,
  getStockStatus,
  type InventoryItemDatabase,
  type InventoryItemTransform,
  type CreateInventoryItemInput,
  type UpdateInventoryItemInput,
  type StockUpdateInput,
  type VisibilityUpdateInput,
  type LowStockFilterInput,
  type StockStatus,
  type InventoryQueryType
} from './inventoryItem.schemas';

// Stock Movement Schemas and Types
export {
  StockMovementDatabaseSchema,
  StockMovementTransformSchema,
  CreateStockMovementSchema,
  BatchStockMovementSchema,
  MovementFilterSchema,
  MovementHistorySchema,
  MovementAnalyticsSchema,
  MOVEMENT_TYPES,
  MOVEMENT_REASONS,
  MOVEMENT_IMPACT,
  MOVEMENT_QUERY_TYPES,
  getMovementImpact,
  validateStockMovement,
  validateCreateMovement,
  validateBatchMovements,
  type StockMovementDatabase,
  type StockMovementTransform,
  type CreateStockMovementInput,
  type BatchStockMovementInput,
  type MovementFilterInput,
  type MovementHistoryInput,
  type MovementAnalyticsInput,
  type MovementType,
  type MovementImpact,
  type MovementQueryType,
  type BatchProcessingResult,
  type MovementSummary
} from './stockMovement.schemas';

// Combined export for easy imports
export const InventorySchemas = {
  // Inventory Item Schemas
  InventoryItem: {
    Database: require('./inventoryItem.schemas').InventoryItemDatabaseSchema,
    Transform: require('./inventoryItem.schemas').InventoryItemTransformSchema,
    Create: require('./inventoryItem.schemas').CreateInventoryItemSchema,
    Update: require('./inventoryItem.schemas').UpdateInventoryItemSchema,
    StockUpdate: require('./inventoryItem.schemas').StockUpdateSchema,
    VisibilityUpdate: require('./inventoryItem.schemas').VisibilityUpdateSchema,
    LowStockFilter: require('./inventoryItem.schemas').LowStockFilterSchema
  },
  // Stock Movement Schemas
  StockMovement: {
    Database: require('./stockMovement.schemas').StockMovementDatabaseSchema,
    Transform: require('./stockMovement.schemas').StockMovementTransformSchema,
    Create: require('./stockMovement.schemas').CreateStockMovementSchema,
    Batch: require('./stockMovement.schemas').BatchStockMovementSchema,
    Filter: require('./stockMovement.schemas').MovementFilterSchema,
    History: require('./stockMovement.schemas').MovementHistorySchema,
    Analytics: require('./stockMovement.schemas').MovementAnalyticsSchema
  }
} as const;

// Re-export contract types for testing
export type { MockDatabase } from './__contracts__/database-mock.types';