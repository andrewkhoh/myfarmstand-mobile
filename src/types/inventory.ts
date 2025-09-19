// Database-aligned inventory types
export interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  userId: string | null;
  currentStock: number;
  reservedStock: number;
  availableStock: number; // Computed field
  minimumStock: number;
  maximumStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  unitCost: number;
  totalValue: number; // Computed field
  lastRestockedAt: string | null;
  lastCountedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stockStatus: string; // Computed field
}

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  userId: string | null;
  movementType: 'in' | 'out' | 'adjustment' | 'add' | 'subtract' | 'set';
  quantity: number;
  reason: string | null;
  performedBy: string | null;
  stockBefore: number | null;
  stockAfter: number | null;
  createdAt: string;
}

export interface StockAlert {
  id: string;
  inventoryItemId: string;
  userId: string | null;
  itemName: string | null;
  alertType: 'low_stock' | 'out_of_stock' | 'reorder_needed' | 'overstock';
  severity: 'critical' | 'warning' | 'low';
  message: string;
  thresholdValue: number | null;
  currentValue: number | null;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface InventoryDashboard {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
  recentMovements: StockMovement[];
  alerts: StockAlert[];
}

// Schema-aligned types for operations
export interface CreateInventoryItem {
  productId: string;
  warehouseId: string;
  currentStock: number;
  reservedStock?: number;
  minimumStock: number;
  maximumStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  unitCost: number;
}

export interface UpdateInventoryItem {
  currentStock?: number;
  reservedStock?: number;
  minimumStock?: number;
  maximumStock?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  unitCost?: number;
  isActive?: boolean;
}

export interface StockUpdate {
  inventoryItemId: string;
  operation: 'add' | 'subtract' | 'set';
  quantity: number;
  reason?: string;
}

export interface BulkStockUpdate {
  updates: StockUpdate[];
  batchId?: string;
}

export interface InventoryFilters {
  warehouseId?: string;
  isActive?: boolean;
  stockStatus?: 'all' | 'low' | 'out' | 'normal';
  search?: string;
}

// Operation result types
export interface BatchResult {
  success: boolean;
  data?: InventoryItem;
  error?: any;
}

// Error types for user-friendly messaging
export interface InventoryError {
  code: string;
  message: string;
  userMessage: string;
  itemId?: string;
  availableStock?: number;
}