// Database mock types - must match database/inventory-test-schema.sql EXACTLY
// These types represent the raw data structure from the database

export interface InventoryItemDatabaseRow {
  id: string;
  product_id: string;
  current_stock: number;
  reserved_stock: number;
  minimum_threshold: number | null;
  maximum_threshold: number | null;
  is_active: boolean;
  is_visible_to_customers: boolean;
  last_stock_update: string;
  created_at: string;
  updated_at: string;
}

export interface StockMovementDatabaseRow {
  id: string;
  inventory_item_id: string;
  movement_type: 'restock' | 'sale' | 'adjustment' | 'reservation' | 'release';
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  performed_by: string | null;
  performed_at: string;
  reference_order_id: string | null;
  batch_id: string | null;
  created_at: string;
}