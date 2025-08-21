import { supabase } from '../../config/supabase';
import { ValidationMonitor } from '../../utils/validationMonitor';
import type { 
  InventoryItemTransform,
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  StockUpdateInput,
  VisibilityUpdateInput 
} from '../../schemas/inventory';
import { InventoryItemTransformSchema } from '../../schemas/inventory';

export class InventoryService {
  /**
   * Get single inventory item by ID with transformation and validation
   */
  static async getInventoryItem(inventoryId: string): Promise<InventoryItemTransform | null> {
    try {
      console.log('[DEBUG] Querying for inventory ID:', inventoryId);
      
      const queryPromise = supabase
        .from('test_inventory_items')
        .select('*')
        .eq('id', inventoryId)
        .single();
      
      console.log('[DEBUG] About to await query...');
      const { data, error } = await queryPromise;
      console.log('[DEBUG] Query completed with result:', { data, error });

      if (error || !data) {
        if (error?.code === 'PGRST116') {
          // Not found - this is valid, not an error
          ValidationMonitor.recordPatternSuccess({
            service: 'inventoryService',
            pattern: 'transformation_schema',
            operation: 'getInventoryItem'
          });
          return null;
        }
        
        ValidationMonitor.recordValidationError({
          context: 'InventoryService.getInventoryItem',
          errorCode: 'INVENTORY_FETCH_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: error?.message || 'Database query failed'
        });
        return null;
      }

      // Transform snake_case to camelCase
      const transformResult = InventoryItemTransformSchema.safeParse(data);
      
      if (!transformResult.success) {
        ValidationMonitor.recordValidationError({
          context: 'InventoryService.getInventoryItem',
          errorCode: 'INVENTORY_TRANSFORMATION_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: transformResult.error.message
        });
        return null;
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'inventoryService',
        pattern: 'transformation_schema',
        operation: 'getInventoryItem'
      });

      return transformResult.data;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'InventoryService.getInventoryItem',
        errorCode: 'INVENTORY_FETCH_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Get inventory item by product ID
   */
  static async getInventoryByProduct(productId: string): Promise<InventoryItemTransform | null> {
    try {
      const { data, error } = await supabase
        .from('test_inventory_items')
        .select('*')
        .eq('product_id', productId)
        .single();

      if (error || !data) {
        if (error?.code === 'PGRST116') {
          ValidationMonitor.recordPatternSuccess({
            service: 'inventoryService',
            pattern: 'transformation_schema',
            operation: 'getInventoryByProduct'
          });
          return null;
        }

        ValidationMonitor.recordValidationError({
          context: 'InventoryService.getInventoryByProduct',
          errorCode: 'INVENTORY_FETCH_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: error?.message || 'Database query failed'
        });
        return null;
      }

      const transformResult = InventoryItemTransformSchema.safeParse(data);
      
      if (!transformResult.success) {
        ValidationMonitor.recordValidationError({
          context: 'InventoryService.getInventoryByProduct',
          errorCode: 'INVENTORY_TRANSFORMATION_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: transformResult.error.message
        });
        return null;
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'inventoryService',
        pattern: 'transformation_schema',
        operation: 'getInventoryByProduct'
      });

      return transformResult.data;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'InventoryService.getInventoryByProduct',
        errorCode: 'INVENTORY_FETCH_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Update stock levels with atomic operation and audit trail
   */
  static async updateStock(inventoryId: string, stockUpdate: StockUpdateInput): Promise<InventoryItemTransform | null> {
    try {
      // First get current inventory to calculate previous stock
      const currentInventory = await this.getInventoryItem(inventoryId);
      if (!currentInventory) {
        ValidationMonitor.recordValidationError({
          context: 'InventoryService.updateStock',
          errorCode: 'STOCK_UPDATE_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: 'Inventory item not found'
        });
        return null;
      }

      // Update inventory
      const { data: updatedData, error: updateError } = await supabase
        .from('test_inventory_items')
        .update({
          current_stock: stockUpdate.currentStock,
          last_stock_update: new Date().toISOString()
        })
        .eq('id', inventoryId)
        .select()
        .single();

      if (updateError || !updatedData) {
        ValidationMonitor.recordValidationError({
          context: 'InventoryService.updateStock',
          errorCode: 'STOCK_UPDATE_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: updateError?.message || 'Database update failed'
        });
        return null;
      }

      // Create audit trail in stock_movements
      if (stockUpdate.reason || stockUpdate.performedBy) {
        const movementData = {
          inventory_item_id: inventoryId,
          movement_type: 'adjustment',
          quantity_change: stockUpdate.currentStock - currentInventory.currentStock,
          previous_stock: currentInventory.currentStock,
          new_stock: stockUpdate.currentStock,
          reason: stockUpdate.reason || 'Stock update',
          performed_by: stockUpdate.performedBy
        };

        await supabase
          .from('test_stock_movements')
          .insert(movementData);
      }

      const transformResult = InventoryItemTransformSchema.safeParse(updatedData);
      
      if (!transformResult.success) {
        ValidationMonitor.recordValidationError({
          context: 'InventoryService.updateStock',
          errorCode: 'INVENTORY_TRANSFORMATION_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: transformResult.error.message
        });
        return null;
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'inventoryService',
        pattern: 'transformation_schema',
        operation: 'updateStock'
      });

      return transformResult.data;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'InventoryService.updateStock',
        errorCode: 'STOCK_UPDATE_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Update product visibility settings
   */
  static async toggleProductVisibility(inventoryId: string, visibilityUpdate: VisibilityUpdateInput): Promise<InventoryItemTransform | null> {
    try {
      const { data: updatedData, error } = await supabase
        .from('test_inventory_items')
        .update({
          is_visible_to_customers: visibilityUpdate.isVisibleToCustomers,
          is_active: visibilityUpdate.isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', inventoryId)
        .select()
        .single();

      if (error || !updatedData) {
        ValidationMonitor.recordValidationError({
          context: 'InventoryService.toggleProductVisibility',
          errorCode: 'VISIBILITY_UPDATE_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: error?.message || 'Database update failed'
        });
        return null;
      }

      const transformResult = InventoryItemTransformSchema.safeParse(updatedData);
      
      if (!transformResult.success) {
        ValidationMonitor.recordValidationError({
          context: 'InventoryService.toggleProductVisibility',
          errorCode: 'INVENTORY_TRANSFORMATION_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: transformResult.error.message
        });
        return null;
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'inventoryService',
        pattern: 'transformation_schema',
        operation: 'toggleProductVisibility'
      });

      return transformResult.data;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'InventoryService.toggleProductVisibility',
        errorCode: 'VISIBILITY_UPDATE_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Get low stock items with resilient processing
   */
  static async getLowStockItems(): Promise<{ success: InventoryItemTransform[], errors: any[], totalProcessed: number }> {
    try {
      const { data, error } = await supabase
        .from('test_inventory_items')
        .select('*')
        .lte('available_stock', 'minimum_threshold')
        .eq('is_active', true);

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'InventoryService.getLowStockItems',
          errorCode: 'LOW_STOCK_FETCH_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: error?.message || 'Database query failed'
        });
        return { success: [], errors: [error], totalProcessed: 0 };
      }

      const results: InventoryItemTransform[] = [];
      const errors: any[] = [];

      // Resilient processing - continue even if some items fail validation
      for (const item of data || []) {
        const transformResult = InventoryItemTransformSchema.safeParse(item);
        if (transformResult.success) {
          results.push(transformResult.data);
        } else {
          errors.push({
            itemId: item.id,
            error: transformResult.error
          });
        }
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'inventoryService',
        pattern: 'transformation_schema',
        operation: 'getLowStockItems'
      });

      return {
        success: results,
        errors,
        totalProcessed: results.length
      };
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'InventoryService.getLowStockItems',
        errorCode: 'LOW_STOCK_FETCH_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return { success: [], errors: [error], totalProcessed: 0 };
    }
  }

  /**
   * Batch update stock with resilient processing
   */
  static async batchUpdateStock(updates: Array<{ inventoryItemId: string; currentStock: number; reason?: string }>): Promise<{ success: InventoryItemTransform[], errors: any[], totalProcessed: number }> {
    const results: InventoryItemTransform[] = [];
    const errors: any[] = [];

    for (const update of updates) {
      try {
        const result = await this.updateStock(update.inventoryItemId, {
          currentStock: update.currentStock,
          reason: update.reason
        });

        if (result) {
          results.push(result);
        } else {
          errors.push({
            inventoryItemId: update.inventoryItemId,
            error: 'Update failed'
          });
        }
      } catch (error) {
        errors.push({
          inventoryItemId: update.inventoryItemId,
          error
        });
      }
    }

    ValidationMonitor.recordPatternSuccess({
      service: 'inventoryService',
      pattern: 'transformation_schema',
      operation: 'batchUpdateStock'
    });

    return {
      success: results,
      errors,
      totalProcessed: results.length
    };
  }

  /**
   * Create new inventory item
   */
  static async createInventoryItem(input: CreateInventoryItemInput): Promise<InventoryItemTransform | null> {
    try {
      const { data, error } = await supabase
        .from('test_inventory_items')
        .insert({
          product_id: input.productId,
          current_stock: input.currentStock,
          reserved_stock: input.reservedStock || 0,
          minimum_threshold: input.minimumThreshold,
          maximum_threshold: input.maximumThreshold,
          is_active: input.isActive ?? true,
          is_visible_to_customers: input.isVisibleToCustomers ?? true
        })
        .select()
        .single();

      if (error || !data) {
        ValidationMonitor.recordValidationError({
          context: 'InventoryService.createInventoryItem',
          errorCode: 'INVENTORY_CREATION_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: error?.message || 'Database insert failed'
        });
        return null;
      }

      const transformResult = InventoryItemTransformSchema.safeParse(data);
      
      if (!transformResult.success) {
        ValidationMonitor.recordValidationError({
          context: 'InventoryService.createInventoryItem',
          errorCode: 'INVENTORY_TRANSFORMATION_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: transformResult.error.message
        });
        return null;
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'inventoryService',
        pattern: 'transformation_schema',
        operation: 'createInventoryItem'
      });

      return transformResult.data;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'InventoryService.createInventoryItem',
        errorCode: 'INVENTORY_CREATION_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Check inventory permissions for role-based access control
   */
  static async checkInventoryPermission(userId: string, permission: string): Promise<boolean> {
    try {
      // This integrates with Phase 1 role permission service
      // For now, implementing basic check - in full implementation would use RolePermissionService
      const { data, error } = await supabase
        .from('test_user_roles')
        .select('permissions')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error || !data) {
        ValidationMonitor.recordValidationError({
          context: 'InventoryService.checkInventoryPermission',
          errorCode: 'PERMISSION_CHECK_FAILED',
          validationPattern: 'simple_validation',
          errorMessage: error?.message || 'Permission check failed'
        });
        return false;
      }

      // Check if any role has the required permission
      const hasPermission = data.some(role => 
        role.permissions && (role.permissions as string[]).includes(permission)
      );

      ValidationMonitor.recordPatternSuccess({
        service: 'inventoryService',
        pattern: 'simple_input_validation',
        operation: 'checkInventoryPermission'
      });

      return hasPermission;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'InventoryService.checkInventoryPermission',
        errorCode: 'PERMISSION_CHECK_FAILED',
        validationPattern: 'simple_validation',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}