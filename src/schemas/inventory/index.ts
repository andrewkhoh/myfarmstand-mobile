// Phase 2: Inventory Schema Index - Clean Exports
// Following architectural patterns for clean module organization

// Inventory Item Schemas and Types
export {
  InventoryItemDatabaseSchema,
  InventoryItemTransformSchema,
  CreateInventoryItemSchema,
  UpdateInventoryItemSchema,
  type CreateInventoryItemInput,
  type UpdateInventoryItemInput
} from './inventoryItem.schemas';

// Stock Movement Schemas and Types
export {
  StockMovementDatabaseSchema,
  StockMovementTransformSchema,
  CreateStockMovementSchema,
  MOVEMENT_TYPES,
  validateStockMovement,
  validateStockMovements,
  type CreateStockMovementInput
} from './stockMovement.schemas';

// Combined export for easy imports
export const InventorySchemas = {
  // Inventory Item Schemas
  InventoryItem: {
    Database: require('./inventoryItem.schemas').InventoryItemDatabaseSchema,
    Transform: require('./inventoryItem.schemas').InventoryItemTransformSchema,
    Create: require('./inventoryItem.schemas').CreateInventoryItemSchema,
    Update: require('./inventoryItem.schemas').UpdateInventoryItemSchema
  },
  // Stock Movement Schemas
  StockMovement: {
    Database: require('./stockMovement.schemas').StockMovementDatabaseSchema,
    Transform: require('./stockMovement.schemas').StockMovementTransformSchema,
    Create: require('./stockMovement.schemas').CreateStockMovementSchema
  }
} as const;

// Re-export contract types for testing
export type { 
  InventoryItemDatabaseRow, 
  StockMovementDatabaseRow 
} from './__contracts__/database-mock.types';