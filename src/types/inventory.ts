export interface InventoryItem {
  id: string;
  userId: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitPrice: number;
  reorderPoint: number;
  reorderQuantity: number;
  supplierId?: string;
  location?: string;
  lastRestocked?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovement {
  id: string;
  itemId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  reference?: string;
  userId: string;
  createdAt: Date;
}

export interface StockAlert {
  id: string;
  itemId: string;
  type: 'low_stock' | 'out_of_stock' | 'overstock';
  message: string;
  severity: 'low' | 'medium' | 'high';
  acknowledged: boolean;
  createdAt: Date;
}

export interface InventoryDashboard {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
  recentMovements: StockMovement[];
  alerts: StockAlert[];
}

export interface StockUpdate {
  id: string;
  newStock: number;
  reason?: string;
}

export interface BulkStockUpdate {
  updates: StockUpdate[];
  batchId?: string;
}

export interface InventoryFilters {
  category?: string;
  location?: string;
  stockStatus?: 'all' | 'low' | 'out' | 'normal';
  search?: string;
}