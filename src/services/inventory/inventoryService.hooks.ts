import { SupabaseClient } from '@supabase/supabase-js';
import type {
  InventoryItem,
  StockMovement,
  StockAlert,
  StockUpdate,
  InventoryFilters,
  BulkStockUpdate
} from '../../types/inventory';

export class InventoryService {
  constructor(private supabase: SupabaseClient) {}

  async getInventoryItems(
    userId: string,
    filters?: InventoryFilters
  ): Promise<InventoryItem[]> {
    let query = this.supabase
      .from('inventory_items')
      .select('*')
      .eq('userId', userId);

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.location) {
      query = query.eq('location', filters.location);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
    }

    if (filters?.stockStatus) {
      switch (filters.stockStatus) {
        case 'low':
          query = query.lte('currentStock', 'minStock');
          break;
        case 'out':
          query = query.eq('currentStock', 0);
          break;
        case 'normal':
          query = query.gt('currentStock', 'minStock');
          break;
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getInventoryItem(itemId: string): Promise<InventoryItem | null> {
    const { data, error } = await this.supabase
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (error) throw error;
    return data;
  }

  async getLowStockItems(userId: string): Promise<InventoryItem[]> {
    const { data, error } = await this.supabase
      .from('inventory_items')
      .select('*')
      .eq('userId', userId)
      .lte('currentStock', 'minStock');

    if (error) throw error;
    return data || [];
  }

  async getRecentMovements(
    userId: string,
    limit = 10
  ): Promise<StockMovement[]> {
    const { data, error } = await this.supabase
      .from('stock_movements')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getAlerts(userId: string): Promise<StockAlert[]> {
    const { data, error } = await this.supabase
      .from('stock_alerts')
      .select('*')
      .eq('userId', userId)
      .eq('acknowledged', false)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateStock(update: StockUpdate): Promise<InventoryItem> {
    const { data: item, error: fetchError } = await this.supabase
      .from('inventory_items')
      .select('*')
      .eq('id', update.id)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await this.supabase
      .from('inventory_items')
      .update({ 
        currentStock: update.newStock,
        updatedAt: new Date().toISOString()
      })
      .eq('id', update.id)
      .select()
      .single();

    if (error) throw error;

    // Record stock movement
    await this.supabase.from('stock_movements').insert({
      itemId: update.id,
      type: update.newStock > item.currentStock ? 'in' : 'out',
      quantity: Math.abs(update.newStock - item.currentStock),
      reason: update.reason || 'Manual adjustment',
      userId: item.userId,
      createdAt: new Date().toISOString()
    });

    return data;
  }

  async batchUpdateStock(
    updates: StockUpdate[]
  ): Promise<Array<{ success: boolean; data?: InventoryItem; error?: Error }>> {
    const results = await Promise.allSettled(
      updates.map(update => this.updateStock(update))
    );

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return { success: true, data: result.value };
      } else {
        return { success: false, error: result.reason };
      }
    });
  }

  async createInventoryItem(item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> {
    const { data, error } = await this.supabase
      .from('inventory_items')
      .insert({
        ...item,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteInventoryItem(itemId: string): Promise<void> {
    const { error } = await this.supabase
      .from('inventory_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const { error } = await this.supabase
      .from('stock_alerts')
      .update({ acknowledged: true })
      .eq('id', alertId);

    if (error) throw error;
  }
}