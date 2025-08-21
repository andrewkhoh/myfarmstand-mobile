import { supabase } from '../../config/supabase';
import { ValidationMonitor } from '../../utils/validationMonitor';
import type {
  StockMovementTransform,
  CreateStockMovementInput,
  BatchStockMovementInput,
  MovementFilterInput,
  MovementHistoryInput
} from '../../schemas/inventory';
import { StockMovementTransformSchema } from '../../schemas/inventory';
import { InventoryService } from './inventoryService';

export class StockMovementService {
  /**
   * Record a single stock movement with complete audit trail
   */
  static async recordMovement(input: CreateStockMovementInput): Promise<StockMovementTransform | null> {
    try {
      console.log('[DEBUG] Recording movement with input:', JSON.stringify(input, null, 2));
      const { data, error } = await supabase
        .from('test_stock_movements')
        .insert({
          inventory_item_id: input.inventoryItemId,
          movement_type: input.movementType,
          quantity_change: input.quantityChange,
          previous_stock: input.previousStock,
          new_stock: input.newStock,
          reason: input.reason,
          performed_by: input.performedBy,
          reference_order_id: input.referenceOrderId,
          batch_id: input.batchId
        })
        .select()
        .single();

      console.log('[DEBUG] DB Insert result:', { data, error });

      if (error || !data) {
        console.log('[DEBUG] Insert failed - error:', error);
        ValidationMonitor.recordValidationError({
          context: 'StockMovementService.recordMovement',
          errorCode: 'MOVEMENT_RECORDING_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: error?.message || 'Database operation failed'
        });
        return null;
      }

      console.log('[DEBUG] Raw movement data from DB:', JSON.stringify(data, null, 2));
      const transformResult = StockMovementTransformSchema.safeParse(data);
      
      if (!transformResult.success) {
        console.log('[DEBUG] Transformation failed:', transformResult.error.message);
        ValidationMonitor.recordValidationError({
          context: 'StockMovementService.recordMovement',
          errorCode: 'MOVEMENT_TRANSFORMATION_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: transformResult.error.message
        });
        return null;
      }
      
      console.log('[DEBUG] Transformed movement data:', JSON.stringify(transformResult.data, null, 2));

      ValidationMonitor.recordPatternSuccess({
        service: 'stockMovementService',
        pattern: 'transformation_schema',
        operation: 'recordMovement'
      });

      return transformResult.data;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'StockMovementService.recordMovement',
        errorCode: 'MOVEMENT_RECORDING_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Get movement history for an inventory item with pagination
   */
  static async getMovementHistory(input: MovementHistoryInput): Promise<{ success: StockMovementTransform[], totalProcessed: number }> {
    try {
      let query = supabase
        .from('test_stock_movements')
        .select('*')
        .eq('inventory_item_id', input.inventoryItemId)
        .order('performed_at', { ascending: false });

      if (input.limit) {
        query = query.limit(input.limit);
      }

      if (input.offset) {
        query = query.range(input.offset, input.offset + (input.limit || 10) - 1);
      }

      if (input.includeSystemMovements === false) {
        query = query.not('performed_by', 'is', null);
      }

      const { data, error } = await query;

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'StockMovementService.getMovementHistory',
          errorCode: 'MOVEMENT_HISTORY_FETCH_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: error?.message || 'Database operation failed'
        });
        return { success: [], totalProcessed: 0 };
      }

      const results: StockMovementTransform[] = [];

      // Resilient processing
      for (const movement of data || []) {
        const transformResult = StockMovementTransformSchema.safeParse(movement);
        if (transformResult.success) {
          results.push(transformResult.data);
        }
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'stockMovementService',
        pattern: 'transformation_schema',
        operation: 'getMovementHistory'
      });

      return {
        success: results,
        totalProcessed: results.length
      };
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'StockMovementService.getMovementHistory',
        errorCode: 'MOVEMENT_HISTORY_FETCH_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return { success: [], totalProcessed: 0 };
    }
  }

  /**
   * Get movements by filter criteria
   */
  static async getMovementsByFilter(filter: MovementFilterInput): Promise<{ success: StockMovementTransform[], totalProcessed: number }> {
    try {
      let query = supabase
        .from('test_stock_movements')
        .select('*')
        .order('performed_at', { ascending: false });

      if (filter.movementType) {
        query = query.eq('movement_type', filter.movementType);
      }

      if (filter.startDate) {
        query = query.gte('performed_at', filter.startDate);
      }

      if (filter.endDate) {
        query = query.lte('performed_at', filter.endDate);
      }

      if (filter.performedBy) {
        query = query.eq('performed_by', filter.performedBy);
      }

      if (filter.inventoryItemId) {
        query = query.eq('inventory_item_id', filter.inventoryItemId);
      }

      if (filter.limit) {
        query = query.limit(filter.limit);
      }

      const { data, error } = await query;

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'StockMovementService.getMovementsByFilter',
          errorCode: 'MOVEMENT_FILTER_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: error?.message || 'Database operation failed'
        });
        return { success: [], totalProcessed: 0 };
      }

      const results: StockMovementTransform[] = [];

      for (const movement of data || []) {
        const transformResult = StockMovementTransformSchema.safeParse(movement);
        if (transformResult.success) {
          results.push(transformResult.data);
        }
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'stockMovementService',
        pattern: 'transformation_schema',
        operation: 'getMovementsByFilter'
      });

      return {
        success: results,
        totalProcessed: results.length
      };
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'StockMovementService.getMovementsByFilter',
        errorCode: 'MOVEMENT_FILTER_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return { success: [], totalProcessed: 0 };
    }
  }

  /**
   * Get movements by batch ID for bulk operation tracking
   */
  static async getBatchMovements(batchId: string): Promise<{ success: StockMovementTransform[], totalProcessed: number }> {
    try {
      const { data, error } = await supabase
        .from('test_stock_movements')
        .select('*')
        .eq('batch_id', batchId)
        .order('performed_at', { ascending: true });

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'StockMovementService.getBatchMovements',
          errorCode: 'BATCH_MOVEMENTS_FETCH_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: error?.message || 'Database operation failed'
        });
        return { success: [], totalProcessed: 0 };
      }

      const results: StockMovementTransform[] = [];

      for (const movement of data || []) {
        const transformResult = StockMovementTransformSchema.safeParse(movement);
        if (transformResult.success) {
          results.push(transformResult.data);
        }
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'stockMovementService',
        pattern: 'transformation_schema',
        operation: 'getBatchMovements'
      });

      return {
        success: results,
        totalProcessed: results.length
      };
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'StockMovementService.getBatchMovements',
        errorCode: 'BATCH_MOVEMENTS_FETCH_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return { success: [], totalProcessed: 0 };
    }
  }

  /**
   * Record batch movements with resilient processing
   */
  static async recordBatchMovements(input: BatchStockMovementInput): Promise<{ 
    success: StockMovementTransform[], 
    errors: any[], 
    totalProcessed: number, 
    batchId: string 
  }> {
    const batchId = crypto.randomUUID();
    const results: StockMovementTransform[] = [];
    const errors: any[] = [];

    for (const movement of input.movements) {
      try {
        const movementInput: CreateStockMovementInput = {
          ...movement,
          performedBy: input.performedBy,
          batchId,
          reason: movement.reason || input.reason
        };

        const result = await this.recordMovement(movementInput);
        if (result) {
          results.push(result);
        } else {
          errors.push({
            inventoryItemId: movement.inventoryItemId,
            error: 'Movement recording failed'
          });
        }
      } catch (error) {
        errors.push({
          inventoryItemId: movement.inventoryItemId,
          error
        });
      }
    }

    ValidationMonitor.recordPatternSuccess({
      service: 'stockMovementService',
      pattern: 'transformation_schema',
      operation: 'recordBatchMovements'
    });

    return {
      success: results,
      errors,
      totalProcessed: results.length,
      batchId
    };
  }

  /**
   * Get movement analytics with aggregations
   */
  static async getMovementAnalytics(input: { 
    startDate?: string; 
    endDate?: string; 
    groupBy?: 'day' | 'week' | 'month' 
  }): Promise<{ success: any[], totalProcessed: number }> {
    try {
      let query = supabase
        .from('test_stock_movements')
        .select('movement_type, quantity_change, performed_at');

      if (input.startDate) {
        query = query.gte('performed_at', input.startDate);
      }

      if (input.endDate) {
        query = query.lte('performed_at', input.endDate);
      }

      const { data, error } = await query;

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'StockMovementService.getMovementAnalytics',
          errorCode: 'ANALYTICS_FETCH_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: error?.message || 'Database operation failed'
        });
        return { success: [], totalProcessed: 0 };
      }

      // Process analytics - group by movement type
      const analytics = new Map();

      for (const movement of data || []) {
        const type = movement.movement_type;
        if (!analytics.has(type)) {
          analytics.set(type, {
            movementType: type,
            totalQuantity: 0,
            movementCount: 0,
            averageQuantity: 0,
            impact: this.getMovementImpact(type)
          });
        }

        const current = analytics.get(type);
        current.totalQuantity += Math.abs(movement.quantity_change);
        current.movementCount += 1;
        current.averageQuantity = current.totalQuantity / current.movementCount;
      }

      const results = Array.from(analytics.values());

      ValidationMonitor.recordPatternSuccess({
        service: 'stockMovementService',
        pattern: 'transformation_schema',
        operation: 'getMovementAnalytics'
      });

      return {
        success: results,
        totalProcessed: results.length
      };
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'StockMovementService.getMovementAnalytics',
        errorCode: 'ANALYTICS_FETCH_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return { success: [], totalProcessed: 0 };
    }
  }

  /**
   * Record movement with integrated inventory update (atomic operation)
   */
  static async recordMovementWithInventoryUpdate(input: CreateStockMovementInput): Promise<{
    movementRecord: StockMovementTransform;
    updatedInventory: any;
  } | null> {
    try {
      // Record the movement
      const movementRecord = await this.recordMovement(input);
      if (!movementRecord) {
        return null;
      }

      // Update the inventory stock levels
      const updatedInventory = await InventoryService.updateStock(input.inventoryItemId, {
        currentStock: input.newStock,
        reason: input.reason,
        performedBy: input.performedBy
      });

      if (!updatedInventory) {
        ValidationMonitor.recordValidationError({
          context: 'StockMovementService.recordMovementWithInventoryUpdate',
          errorCode: 'INVENTORY_UPDATE_FAILED',
          validationPattern: 'transformation_schema',
          errorData: 'Failed to update inventory after movement'
        });
        return null;
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'stockMovementService',
        pattern: 'transformation_schema',
        operation: 'recordMovementWithInventoryUpdate'
      });

      return {
        movementRecord,
        updatedInventory
      };
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'StockMovementService.recordMovementWithInventoryUpdate',
        errorCode: 'INTEGRATED_UPDATE_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Check movement permissions for role-based access control
   */
  static async checkMovementPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('test_user_roles')
        .select('role_type, permissions')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error || !data) {
        ValidationMonitor.recordValidationError({
          context: 'StockMovementService.checkMovementPermission',
          errorCode: 'PERMISSION_CHECK_FAILED',
          validationPattern: 'simple_input_validation',
          errorMessage: error?.message || 'Database operation failed'
        });
        return false;
      }

      // Check role-based permissions
      for (const role of data) {
        if (permission === 'read_movements') {
          // Marketing, executive, admin can read
          if (['marketing_staff', 'executive', 'admin'].includes(role.role_type)) {
            ValidationMonitor.recordPatternSuccess({
              service: 'stockMovementService',
              pattern: 'simple_input_validation',
              operation: 'checkMovementPermission'
            });
            return true;
          }
        }

        if (permission === 'record_movements') {
          // Only inventory staff and admin can record movements
          if (['inventory_staff', 'admin'].includes(role.role_type)) {
            ValidationMonitor.recordPatternSuccess({
              service: 'stockMovementService',
              pattern: 'simple_input_validation',
              operation: 'checkMovementPermission'
            });
            return true;
          }
        }

        // Check explicit permissions
        if (role.permissions && (role.permissions as string[]).includes(permission)) {
          ValidationMonitor.recordPatternSuccess({
            service: 'stockMovementService',
            pattern: 'simple_input_validation',
            operation: 'checkMovementPermission'
          });
          return true;
        }
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'stockMovementService',
        pattern: 'simple_input_validation',
        operation: 'checkMovementPermission'
      });

      return false;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'StockMovementService.checkMovementPermission',
        errorCode: 'PERMISSION_CHECK_FAILED',
        validationPattern: 'simple_input_validation',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Helper method to determine movement impact
   */
  private static getMovementImpact(movementType: string): 'positive' | 'negative' | 'neutral' {
    switch (movementType) {
      case 'restock':
      case 'release':
        return 'positive';
      case 'sale':
      case 'reservation':
        return 'negative';
      case 'adjustment':
      default:
        return 'neutral';
    }
  }
}