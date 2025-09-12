// Type definitions for the application layer
// These are the transformed types used throughout the application

export interface InventoryItem {
  id: string;
  productId: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;  // Computed: currentStock - reservedStock
  minimumThreshold: number | null;
  maximumThreshold: number | null;
  isActive: boolean;
  isVisibleToCustomers: boolean;
  lastStockUpdate: string;
  createdAt: string;
  updatedAt: string;
}

export type MovementType = 'restock' | 'sale' | 'adjustment' | 'reservation' | 'release';

export interface StockMovement {
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