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
import { inventoryMarketingBridge } from '../cross-workflow/inventoryMarketingBridge';
import { errorCoordinator, WorkflowError } from '../cross-workflow/errorCoordinator';
import { getWarehouseId, DEFAULT_WAREHOUSE_ID } from '../../constants/warehouse';

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

  async getInventoryItem(id: string, userId?: string): Promise<InventoryItem> {
    try {
      // Validate user authentication if userId provided
      if (userId) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user || user.id !== userId) {
          throw new Error('Unauthorized access');
        }
      }

      let query = this.supabase
        .from('inventory_items')
        .select('*')
        .eq('id', id);

      // Add user isolation if userId provided
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.single();

      if (error) {
        ValidationMonitor.recordValidationError('inventory-fetch', error);
        await errorCoordinator.handleError({
          workflow: 'inventory',
          operation: 'getInventoryItem',
          errorType: 'network',
          severity: 'medium',
          message: error.message,
          code: error.code,
          context: { itemId: id, userId },
          timestamp: new Date()
        } as WorkflowError);
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
      // Validate user authentication if userId provided
      if (userId) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user || user.id !== userId) {
          throw new Error('Unauthorized access');
        }
      }

      let query = this.supabase
        .from('inventory_items')
        .select('id, product_id, warehouse_id, current_stock, reserved_stock, minimum_stock, maximum_stock, reorder_point, reorder_quantity, unit_cost, is_active, created_at, updated_at, user_id');

      // Add user isolation if userId provided
      if (userId) {
        query = query.eq('user_id', userId);
      }

      // Apply filters if provided
      if (filters) {
        if (filters.warehouseId) {
          query = query.eq('warehouse_id', filters.warehouseId);
        }
        if (filters.isActive !== undefined) {
          query = query.eq('is_active', filters.isActive);
        }
        if (filters.lowStock) {
          query = query.lte('current_stock', 'minimum_stock');
        }
      }

      const { data, error } = await query;

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

  async getInventoryItemsByWarehouse(warehouseId: string, userId?: string): Promise<InventoryItem[]> {
    try {
      // Validate user authentication if userId provided
      if (userId) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user || user.id !== userId) {
          throw new Error('Unauthorized access');
        }
      }

      let query = this.supabase
        .from('inventory_items')
        .select('id, product_id, warehouse_id, current_stock, reserved_stock, minimum_stock, maximum_stock, reorder_point, reorder_quantity, unit_cost, is_active, created_at, updated_at, user_id')
        .eq('warehouse_id', warehouseId);

      // Add user isolation if userId provided
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

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

  async createInventoryItem(data: CreateInventoryItem, userId?: string): Promise<InventoryItem> {
    try {
      // Validate user authentication if userId provided
      if (userId) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user || user.id !== userId) {
          throw new Error('Unauthorized access');
        }
      }

      // Validate input
      const validated = CreateInventoryItemSchema.parse(data);

      // Transform to database format
      const dbData: any = {
        product_id: validated.productId,
        warehouse_id: getWarehouseId(validated.warehouseId),
        current_stock: validated.currentStock,
        reserved_stock: validated.reservedStock || 0,
        minimum_stock: validated.minimumStock,
        maximum_stock: validated.maximumStock,
        reorder_point: validated.reorderPoint,
        reorder_quantity: validated.reorderQuantity,
        unit_cost: validated.unitCost,
        is_active: true,
      };

      // Add user_id if provided
      if (userId) {
        dbData.user_id = userId;
      }

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

  async updateInventoryItem(id: string, data: UpdateInventoryItem, userId?: string): Promise<InventoryItem> {
    try {
      // Validate user authentication if userId provided
      if (userId) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user || user.id !== userId) {
          throw new Error('Unauthorized access');
        }
      }

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

      let updateQuery = this.supabase
        .from('inventory_items')
        .update(dbData)
        .eq('id', id);

      // Add user isolation if userId provided
      if (userId) {
        updateQuery = updateQuery.eq('user_id', userId);
      }

      const { data: updated, error } = await updateQuery
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

  async updateStock(stockUpdate: StockUpdate, performedBy: string, userId?: string): Promise<InventoryItem> {
    try {
      // Validate user authentication if userId provided
      if (userId) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user || user.id !== userId) {
          throw new Error('Unauthorized access');
        }
      }

      // Validate input
      const validated = StockUpdateSchema.parse(stockUpdate);

      // Use atomic database function for thread-safe stock updates
      const { data, error } = await this.supabase
        .rpc('update_stock_atomic', {
          p_item_id: validated.inventoryItemId,
          p_user_id: userId || null,
          p_operation: validated.operation,
          p_quantity: validated.quantity,
          p_reason: validated.reason || 'Stock adjustment',
          p_performed_by: performedBy || userId || null
        });

      if (error) {
        ValidationMonitor.recordValidationError('stock-update-atomic', error);
        throw error;
      }

      if (!data || !data[0]) {
        throw new Error('Stock update failed: No response from database');
      }

      const result = data[0];
      if (!result.success) {
        const errorMessage = result.message || 'Stock update failed';
        ValidationMonitor.recordValidationError('stock-update-atomic', new Error(errorMessage));

        // Check if this is an out of stock error
        if (errorMessage.includes('out of stock') || errorMessage.includes('insufficient')) {
          await errorCoordinator.handleError({
            workflow: 'inventory',
            operation: 'updateStock',
            errorType: 'business',
            severity: 'high',
            message: errorMessage,
            code: 'OUT_OF_STOCK',
            context: {
              itemId: validated.inventoryItemId,
              operation: validated.operation,
              quantity: validated.quantity,
              productIds: [validated.inventoryItemId]
            },
            timestamp: new Date(),
            relatedWorkflows: ['marketing', 'executive']
          } as WorkflowError);
        }

        throw new Error(errorMessage);
      }

      // Fetch the updated item with all fields
      let fetchQuery = this.supabase
        .from('inventory_items')
        .select('id, product_id, warehouse_id, current_stock, reserved_stock, minimum_stock, maximum_stock, reorder_point, reorder_quantity, unit_cost, is_active, created_at, updated_at, user_id')
        .eq('id', validated.inventoryItemId);

      if (userId) {
        fetchQuery = fetchQuery.eq('user_id', userId);
      }

      const { data: updated, error: fetchError } = await fetchQuery.single();

      if (fetchError) {
        ValidationMonitor.recordValidationError('stock-fetch-after-update', fetchError);
        throw fetchError;
      }

      const item = InventoryItemTransformSchema.parse(updated);

      // Record calculation validation for stock level changes
      if (result.new_stock !== item.currentStock) {
        ValidationMonitor.recordCalculationMismatch({
          service: 'InventoryService',
          operation: 'updateStock',
          expected: result.new_stock,
          actual: item.currentStock,
          context: { itemId: validated.inventoryItemId, operation: validated.operation }
        });
      }

      // Notify marketing workflow of stock changes
      const bridge = inventoryMarketingBridge(this.supabase);
      await bridge.syncInventoryToMarketing({
        productId: item.productId,
        warehouseId: item.warehouseId,
        newStock: item.currentStock,
        changeType: validated.operation === 'add' || validated.operation === 'receive' ? 'increase' : 'decrease'
      });

      ValidationMonitor.recordPatternSuccess('stock-update-atomic');
      return item;
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
  async batchUpdateStock(updates: StockUpdate[], performedBy: string, userId?: string): Promise<BatchResult[]>;
  async batchUpdateStock(updates: StockUpdate[], performedBy?: string, userId?: string): Promise<BatchResult[]> {
    const results: BatchResult[] = [];

    for (const update of updates) {
      try {
        const result = await this.updateStock(update, performedBy || 'system', userId);
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
      // Validate user authentication
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user || user.id !== userId) {
        throw new Error('Unauthorized access');
      }

      const { data, error } = await this.supabase
        .from('inventory_items')
        .select('id, product_id, warehouse_id, current_stock, reserved_stock, minimum_stock, maximum_stock, reorder_point, reorder_quantity, unit_cost, is_active, created_at, updated_at, user_id')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        ValidationMonitor.recordValidationError('low-stock-items', error);
        throw error;
      }

      const results: InventoryItem[] = [];
      for (const item of data || []) {
        try {
          if (item.current_stock <= item.minimum_stock) {
            const validated = InventoryItemTransformSchema.parse(item);
            results.push(validated);
          }
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
      // Validate user authentication
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user || user.id !== userId) {
        throw new Error('Unauthorized access');
      }

      // First get user's inventory items
      const { data: userItems } = await this.supabase
        .from('inventory_items')
        .select('id')
        .eq('user_id', userId);

      const itemIds = userItems?.map(item => item.id) || [];

      if (itemIds.length === 0) {
        return [];
      }

      const { data, error } = await this.supabase
        .from('stock_movements')
        .select('id, inventory_item_id, movement_type, quantity, stock_before, stock_after, reason, performed_by, created_at')
        .in('inventory_item_id', itemIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        ValidationMonitor.recordValidationError('recent-movements', error);
        throw error;
      }

      // Transform snake_case database fields to camelCase
      const transformedMovements = (data || []).map(movement => ({
        id: movement.id,
        inventoryItemId: movement.inventory_item_id,
        userId: userId,
        movementType: movement.movement_type as 'in' | 'out' | 'adjustment' | 'add' | 'subtract' | 'set',
        quantity: movement.quantity,
        reason: movement.reason,
        performedBy: movement.performed_by,
        stockBefore: movement.stock_before,
        stockAfter: movement.stock_after,
        createdAt: movement.created_at
      }));

      ValidationMonitor.recordPatternSuccess('recent-movements');
      return transformedMovements;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('recent-movements', error);
      }
      throw error;
    }
  }

  async getAlerts(userId: string): Promise<any[]> {
    try {
      console.log('[InventoryService.getAlerts] Starting with userId:', userId);

      // Validate user authentication
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user || user.id !== userId) {
        throw new Error('Unauthorized access');
      }

      // Generate alerts dynamically from inventory items instead of querying alerts table
      const { data: inventoryItems, error } = await this.supabase
        .from('inventory_items')
        .select('id, product_id, warehouse_id, current_stock, minimum_stock, maximum_stock, reorder_point, is_active')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('[InventoryService.getAlerts] Error fetching inventory items:', error);
        ValidationMonitor.recordValidationError('stock-alerts', error);
        throw error;
      }

      console.log('[InventoryService.getAlerts] Found inventory items:', inventoryItems?.length || 0);

      if (!inventoryItems || inventoryItems.length === 0) {
        console.log('[InventoryService.getAlerts] No inventory items found, returning empty alerts');
        return [];
      }

      // Generate alerts based on stock levels
      const alerts = [];
      const now = new Date().toISOString();

      for (const item of inventoryItems) {
        // Out of stock alert (critical)
        if (item.current_stock === 0) {
          alerts.push({
            id: `alert-${item.id}-out-of-stock`,
            inventoryItemId: item.id,
            userId: userId,
            itemName: null,
            alertType: 'out_of_stock' as const,
            severity: 'critical' as const,
            message: `Item ${item.id.slice(0, 8)} is out of stock`,
            thresholdValue: item.minimum_stock,
            currentValue: item.current_stock,
            acknowledged: false,
            acknowledgedBy: null,
            acknowledgedAt: null,
            createdAt: now
          });
        }
        // Low stock alert (warning)
        else if (item.current_stock <= item.minimum_stock) {
          alerts.push({
            id: `alert-${item.id}-low-stock`,
            inventoryItemId: item.id,
            userId: userId,
            itemName: null,
            alertType: 'low_stock' as const,
            severity: 'warning' as const,
            message: `Item ${item.id.slice(0, 8)} is running low (${item.current_stock} units remaining)`,
            thresholdValue: item.minimum_stock,
            currentValue: item.current_stock,
            acknowledged: false,
            acknowledgedBy: null,
            acknowledgedAt: null,
            createdAt: now
          });
        }
        // Reorder point alert (low)
        else if (item.reorder_point && item.current_stock <= item.reorder_point) {
          alerts.push({
            id: `alert-${item.id}-reorder`,
            inventoryItemId: item.id,
            userId: userId,
            itemName: null,
            alertType: 'reorder_needed' as const,
            severity: 'low' as const,
            message: `Item ${item.id.slice(0, 8)} has reached reorder point (${item.current_stock} units)`,
            thresholdValue: item.reorder_point,
            currentValue: item.current_stock,
            acknowledged: false,
            acknowledgedBy: null,
            acknowledgedAt: null,
            createdAt: now
          });
        }
        // Overstock alert (low)
        else if (item.maximum_stock && item.current_stock >= item.maximum_stock * 0.9) {
          alerts.push({
            id: `alert-${item.id}-overstock`,
            inventoryItemId: item.id,
            userId: userId,
            itemName: null,
            alertType: 'overstock' as const,
            severity: 'low' as const,
            message: `Item ${item.id.slice(0, 8)} is near maximum capacity (${item.current_stock}/${item.maximum_stock})`,
            thresholdValue: item.maximum_stock,
            currentValue: item.current_stock,
            acknowledged: false,
            acknowledgedBy: null,
            acknowledgedAt: null,
            createdAt: now
          });
        }
      }

      // Sort by severity: critical first, then warning, then low
      alerts.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, low: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      console.log('[InventoryService.getAlerts] Generated alerts:', alerts.length);
      console.log('[InventoryService.getAlerts] Alert details:', JSON.stringify(alerts, null, 2));

      ValidationMonitor.recordPatternSuccess('stock-alerts');
      return alerts;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('stock-alerts', error);
      }
      throw error;
    }
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    try {
      // Validate user authentication
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user || user.id !== userId) {
        throw new Error('Unauthorized access');
      }

      // Verify the alert belongs to the user's inventory
      const { data: alert } = await this.supabase
        .from('inventory_alerts')
        .select('inventory_item_id')
        .eq('id', alertId)
        .single();

      if (!alert) {
        throw new Error('Alert not found');
      }

      // Verify ownership
      const { data: item } = await this.supabase
        .from('inventory_items')
        .select('user_id')
        .eq('id', alert.inventory_item_id)
        .single();

      if (!item || item.user_id !== userId) {
        throw new Error('Unauthorized access to alert');
      }

      const { error } = await this.supabase
        .from('inventory_alerts')
        .update({
          acknowledged: true,
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString()
        })
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

  async deleteInventoryItem(itemId: string, userId: string): Promise<void> {
    try {
      // Validate user authentication
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user || user.id !== userId) {
        throw new Error('Unauthorized access');
      }

      const { error } = await this.supabase
        .from('inventory_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId); // Ensure user owns the item

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