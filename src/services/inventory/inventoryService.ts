import { SupabaseClient } from '@supabase/supabase-js';
import { 
  InventoryItemTransformSchema,
  CreateInventoryItemSchema,
  UpdateInventoryItemSchema,
  StockUpdateSchema,
  type InventoryItem,
  type CreateInventoryItem,
  type UpdateInventoryItem,
  type StockUpdate,
} from '../../schemas/inventory';
import { ValidationMonitor } from '../../utils/validationMonitorAdapter';

export interface BatchResult<T = any> {
  success: boolean;
  data?: T;
  error?: any;
}

export interface StockValueResult {
  totalValue: number;
  itemCount: number;
  totalUnits: number;
}

export interface TransferRequest {
  inventoryItemId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
}

export interface TransferResult {
  success: boolean;
  sourceStock?: number;
  destinationStock?: number;
  error?: string;
}

export class InventoryService {
  constructor(private supabase: SupabaseClient) {}

  async getInventoryItem(id: string): Promise<InventoryItem> {
    try {
      const { data, error } = await this.supabase
        .from('inventory_items')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        ValidationMonitor.recordValidationError('inventory-fetch', error);
        throw error;
      }

      const validated = InventoryItemTransformSchema.parse(data);
      ValidationMonitor.recordPatternSuccess('inventory-fetch');
      return validated;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('inventory-fetch', error);
      }
      throw error;
    }
  }

  // Hook-compatible method - overloaded to support userId and filters
  async getInventoryItems(userId?: string, filters?: any): Promise<InventoryItem[]>;
  async getInventoryItems(): Promise<InventoryItem[]>;
  async getInventoryItems(userId?: string, filters?: any): Promise<InventoryItem[]> {
    try {
      const { data, error } = await this.supabase
        .from('inventory_items')
        .select('*');

      if (error) {
        ValidationMonitor.recordValidationError('inventory-list', error);
        throw error;
      }

      const results: InventoryItem[] = [];
      for (const item of data || []) {
        try {
          const validated = InventoryItemTransformSchema.parse(item);
          results.push(validated);
        } catch (err) {
          ValidationMonitor.recordValidationError('inventory-item', err);
        }
      }

      ValidationMonitor.recordPatternSuccess('inventory-list');
      return results;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('inventory-list', error);
      }
      throw error;
    }
  }

  async getInventoryItemsByWarehouse(warehouseId: string): Promise<InventoryItem[]> {
    try {
      const { data, error } = await this.supabase
        .from('inventory_items')
        .select('*')
        .eq('warehouse_id', warehouseId);

      if (error) {
        ValidationMonitor.recordValidationError('inventory-warehouse', error);
        throw error;
      }

      const results: InventoryItem[] = [];
      for (const item of data || []) {
        try {
          const validated = InventoryItemTransformSchema.parse(item);
          results.push(validated);
        } catch (err) {
          ValidationMonitor.recordValidationError('inventory-item', err);
        }
      }

      ValidationMonitor.recordPatternSuccess('inventory-warehouse');
      return results;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('inventory-warehouse', error);
      }
      throw error;
    }
  }

  async createInventoryItem(data: CreateInventoryItem): Promise<InventoryItem> {
    try {
      // Validate input
      const validated = CreateInventoryItemSchema.parse(data);

      // Transform to database format
      const dbData = {
        product_id: validated.productId,
        warehouse_id: validated.warehouseId,
        current_stock: validated.currentStock,
        reserved_stock: validated.reservedStock || 0,
        minimum_stock: validated.minimumStock,
        maximum_stock: validated.maximumStock,
        reorder_point: validated.reorderPoint,
        reorder_quantity: validated.reorderQuantity,
        unit_cost: validated.unitCost,
        is_active: true,
      };

      const { data: created, error } = await this.supabase
        .from('inventory_items')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        ValidationMonitor.recordValidationError('inventory-create', error);
        throw error;
      }

      const result = InventoryItemTransformSchema.parse(created);
      ValidationMonitor.recordPatternSuccess('inventory-create');
      return result;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('inventory-create', error);
      }
      throw error;
    }
  }

  async updateInventoryItem(id: string, data: UpdateInventoryItem): Promise<InventoryItem> {
    try {
      // Validate input
      const validated = UpdateInventoryItemSchema.parse(data);

      // Transform to database format
      const dbData: any = {};
      if (validated.currentStock !== undefined) dbData.current_stock = validated.currentStock;
      if (validated.reservedStock !== undefined) dbData.reserved_stock = validated.reservedStock;
      if (validated.minimumStock !== undefined) dbData.minimum_stock = validated.minimumStock;
      if (validated.maximumStock !== undefined) dbData.maximum_stock = validated.maximumStock;
      if (validated.reorderPoint !== undefined) dbData.reorder_point = validated.reorderPoint;
      if (validated.reorderQuantity !== undefined) dbData.reorder_quantity = validated.reorderQuantity;
      if (validated.unitCost !== undefined) dbData.unit_cost = validated.unitCost;
      if (validated.isActive !== undefined) dbData.is_active = validated.isActive;

      const { data: updated, error } = await this.supabase
        .from('inventory_items')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        ValidationMonitor.recordValidationError('inventory-update', error);
        throw error;
      }

      const result = InventoryItemTransformSchema.parse(updated);
      ValidationMonitor.recordPatternSuccess('inventory-update');
      return result;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('inventory-update', error);
      }
      throw error;
    }
  }

  async updateStock(stockUpdate: StockUpdate, performedBy: string): Promise<InventoryItem> {
    try {
      // Validate input
      const validated = StockUpdateSchema.parse(stockUpdate);

      // Get current stock
      const { data: current, error: fetchError } = await this.supabase
        .from('inventory_items')
        .select('current_stock')
        .eq('id', validated.inventoryItemId)
        .single();

      if (fetchError) {
        ValidationMonitor.recordValidationError('stock-fetch', fetchError);
        throw fetchError;
      }

      // Calculate new stock
      let newStock: number;
      if (validated.operation === 'add') {
        newStock = current.current_stock + validated.quantity;
      } else if (validated.operation === 'subtract') {
        newStock = current.current_stock - validated.quantity;
        if (newStock < 0) {
          throw new Error('Insufficient stock');
        }
      } else {
        newStock = validated.quantity;
      }

      // Update stock
      const { data: updated, error: updateError } = await this.supabase
        .from('inventory_items')
        .update({ current_stock: newStock })
        .eq('id', validated.inventoryItemId)
        .select()
        .single();

      if (updateError) {
        ValidationMonitor.recordValidationError('stock-update', updateError);
        throw updateError;
      }

      // Create audit trail
      const movementType = validated.operation === 'add' ? 'in' : 
                          validated.operation === 'subtract' ? 'out' : 'adjustment';
      
      const { error: auditError } = await this.supabase
        .from('stock_movements')
        .insert({
          inventory_item_id: validated.inventoryItemId,
          movement_type: movementType,
          quantity: validated.quantity,
          reason: validated.reason,
          performed_by: performedBy,
        });

      if (auditError) {
        ValidationMonitor.recordValidationError('stock-audit', auditError);
      }

      const result = InventoryItemTransformSchema.parse(updated);
      ValidationMonitor.recordPatternSuccess('stock-update');
      return result;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('stock-update', error);
      }
      throw error;
    }
  }

  // Hook-compatible overload
  async batchUpdateStock(updates: StockUpdate[]): Promise<BatchResult[]>;
  async batchUpdateStock(updates: StockUpdate[], performedBy: string): Promise<BatchResult[]>;
  async batchUpdateStock(updates: StockUpdate[], performedBy?: string): Promise<BatchResult[]> {
    const results: BatchResult[] = [];

    for (const update of updates) {
      try {
        const result = await this.updateStock(update, performedBy || 'system');
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ success: false, error });
        ValidationMonitor.recordValidationError('batch-update', error);
      }
    }

    ValidationMonitor.recordPatternSuccess('batch-update');
    return results;
  }

  async checkLowStock(warehouseId?: string): Promise<InventoryItem[]> {
    try {
      let query = this.supabase
        .from('inventory_items')
        .select('*');

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      // Get items where available stock (current - reserved) is at or below reorder point
      query = query.eq('is_active', true);
      const { data, error } = await query.lte('current_stock', 'reorder_point');

      if (error) {
        ValidationMonitor.recordValidationError('low-stock-check', error);
        throw error;
      }

      const results: InventoryItem[] = [];
      for (const item of data || []) {
        try {
          const validated = InventoryItemTransformSchema.parse(item);
          // Only include if available stock is actually low
          if (validated.availableStock <= validated.reorderPoint) {
            results.push(validated);
          }
        } catch (err) {
          ValidationMonitor.recordValidationError('low-stock-item', err);
        }
      }

      ValidationMonitor.recordPatternSuccess('low-stock-check');
      return results;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('low-stock-check', error);
      }
      throw error;
    }
  }

  async getStockValue(warehouseId?: string): Promise<StockValueResult> {
    try {
      let query = this.supabase
        .from('inventory_items')
        .select('*');

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }
      
      query = query.eq('is_active', true);
      const { data, error } = await query;

      if (error) {
        ValidationMonitor.recordValidationError('stock-value', error);
        throw error;
      }

      let totalValue = 0;
      let totalUnits = 0;
      let itemCount = 0;

      for (const item of data || []) {
        try {
          const validated = InventoryItemTransformSchema.parse(item);
          totalValue += validated.totalValue;
          totalUnits += validated.currentStock;
          itemCount++;
        } catch (err) {
          ValidationMonitor.recordValidationError('stock-value-item', err);
        }
      }

      ValidationMonitor.recordPatternSuccess('stock-value');
      return {
        totalValue,
        itemCount,
        totalUnits,
      };
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('stock-value', error);
      }
      throw error;
    }
  }

  async transferStock(transfer: TransferRequest, performedBy: string): Promise<TransferResult> {
    try {
      const { inventoryItemId, fromWarehouseId, toWarehouseId, quantity } = transfer;

      // Get source item
      const { data: sourceItem, error: sourceError } = await this.supabase
        .from('inventory_items')
        .select('*')
        .eq('id', inventoryItemId)
        .eq('warehouse_id', fromWarehouseId)
        .single();

      if (sourceError) {
        return { success: false, error: 'Source item not found' };
      }

      // Check sufficient stock
      if (sourceItem.current_stock < quantity) {
        return { success: false, error: 'Insufficient stock in source warehouse' };
      }

      // Get or create destination item
      const { data: destItem, error: destError } = await this.supabase
        .from('inventory_items')
        .select('*')
        .eq('product_id', sourceItem.product_id)
        .eq('warehouse_id', toWarehouseId)
        .single();

      // Update source
      const { data: updatedSource, error: updateSourceError } = await this.supabase
        .from('inventory_items')
        .update({ current_stock: sourceItem.current_stock - quantity })
        .eq('id', inventoryItemId)
        .select()
        .single();

      if (updateSourceError) {
        return { success: false, error: 'Failed to update source' };
      }

      // Update destination
      const newDestStock = (destItem?.current_stock || 0) + quantity;
      const { data: updatedDest, error: updateDestError } = await this.supabase
        .from('inventory_items')
        .update({ current_stock: newDestStock })
        .eq('id', destItem.id)
        .select()
        .single();

      if (updateDestError) {
        // Rollback source update
        await this.supabase
          .from('inventory_items')
          .update({ current_stock: sourceItem.current_stock })
          .eq('id', inventoryItemId);
        
        return { success: false, error: 'Failed to update destination' };
      }

      // Create movement record
      await this.supabase
        .from('stock_movements')
        .insert({
          inventory_item_id: inventoryItemId,
          movement_type: 'transfer',
          quantity,
          from_warehouse_id: fromWarehouseId,
          to_warehouse_id: toWarehouseId,
          performed_by: performedBy,
        });

      ValidationMonitor.recordPatternSuccess('stock-transfer');
      return {
        success: true,
        sourceStock: updatedSource.current_stock,
        destinationStock: updatedDest.current_stock,
      };
    } catch (error) {
      ValidationMonitor.recordValidationError('stock-transfer', error);
      return { success: false, error: 'Transfer failed' };
    }
  }

  // Hook-compatible methods
  async getLowStockItems(userId: string): Promise<InventoryItem[]> {
    try {
      const { data, error } = await this.supabase
        .from('inventory_items')
        .select('*')
        .lte('current_stock', 'reorder_point');

      if (error) {
        ValidationMonitor.recordValidationError('low-stock-items', error);
        throw error;
      }

      const results: InventoryItem[] = [];
      for (const item of data || []) {
        try {
          const validated = InventoryItemTransformSchema.parse(item);
          results.push(validated);
        } catch (err) {
          ValidationMonitor.recordValidationError('low-stock-item', err);
        }
      }

      ValidationMonitor.recordPatternSuccess('low-stock-items');
      return results;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('low-stock-items', error);
      }
      throw error;
    }
  }

  async getRecentMovements(userId: string, limit = 10): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        ValidationMonitor.recordValidationError('recent-movements', error);
        throw error;
      }

      ValidationMonitor.recordPatternSuccess('recent-movements');
      return data || [];
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('recent-movements', error);
      }
      throw error;
    }
  }

  async getAlerts(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('stock_alerts')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false });

      if (error) {
        ValidationMonitor.recordValidationError('stock-alerts', error);
        throw error;
      }

      ValidationMonitor.recordPatternSuccess('stock-alerts');
      return data || [];
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('stock-alerts', error);
      }
      throw error;
    }
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('stock_alerts')
        .update({ acknowledged: true })
        .eq('id', alertId);

      if (error) {
        ValidationMonitor.recordValidationError('acknowledge-alert', error);
        throw error;
      }

      ValidationMonitor.recordPatternSuccess('acknowledge-alert');
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('acknowledge-alert', error);
      }
      throw error;
    }
  }

  async deleteInventoryItem(itemId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('inventory_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        ValidationMonitor.recordValidationError('inventory-delete', error);
        throw error;
      }

      ValidationMonitor.recordPatternSuccess('inventory-delete');
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('inventory-delete', error);
      }
      throw error;
    }
  }
}