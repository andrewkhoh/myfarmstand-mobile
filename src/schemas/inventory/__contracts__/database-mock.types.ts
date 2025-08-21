// Phase 2: Database Mock Types for Inventory Operations
// Following Phase 1 patterns for strict schema contract enforcement
// These interfaces must match the actual database structure exactly

export interface MockDatabase {
  public: {
    Tables: {
      inventory_items: {
        Row: {
          id: string;
          product_id: string;
          current_stock: number;
          reserved_stock: number;
          available_stock: number; // Generated column (current_stock - reserved_stock)
          minimum_threshold: number | null;
          maximum_threshold: number | null;
          is_active: boolean | null;
          is_visible_to_customers: boolean | null;
          last_stock_update: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          current_stock?: number;
          reserved_stock?: number;
          // available_stock is generated, cannot be inserted
          minimum_threshold?: number | null;
          maximum_threshold?: number | null;
          is_active?: boolean | null;
          is_visible_to_customers?: boolean | null;
          last_stock_update?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          product_id?: string;
          current_stock?: number;
          reserved_stock?: number;
          // available_stock is generated, cannot be updated directly
          minimum_threshold?: number | null;
          maximum_threshold?: number | null;
          is_active?: boolean | null;
          is_visible_to_customers?: boolean | null;
          last_stock_update?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      stock_movements: {
        Row: {
          id: string;
          inventory_item_id: string;
          movement_type: 'restock' | 'sale' | 'adjustment' | 'reservation' | 'release';
          quantity_change: number;
          previous_stock: number;
          new_stock: number;
          reason: string | null;
          performed_by: string | null;
          performed_at: string | null;
          reference_order_id: string | null;
          batch_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          inventory_item_id: string;
          movement_type: 'restock' | 'sale' | 'adjustment' | 'reservation' | 'release';
          quantity_change: number;
          previous_stock: number;
          new_stock: number;
          reason?: string | null;
          performed_by?: string | null;
          performed_at?: string | null;
          reference_order_id?: string | null;
          batch_id?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          inventory_item_id?: string;
          movement_type?: 'restock' | 'sale' | 'adjustment' | 'reservation' | 'release';
          quantity_change?: number;
          previous_stock?: number;
          new_stock?: number;
          reason?: string | null;
          performed_by?: string | null;
          performed_at?: string | null;
          reference_order_id?: string | null;
          batch_id?: string | null;
          created_at?: string | null;
        };
      };
    };
  };
}