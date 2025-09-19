import { SupabaseClient } from '@supabase/supabase-js';
import { 
  StockMovementTransformSchema,
  CreateStockMovementSchema,
  type StockMovement,
  type CreateStockMovement,
} from '../../schemas/inventory';
import { ValidationMonitor } from '../../utils/validationMonitor';

export interface BatchResult<T = any> {
  success: boolean;
  data?: T;
  error?: any;
}

export interface MovementSummary {
  totalIn: number;
  totalOut: number;
  netChange: number;
  movementCount: number;
}

export interface TransferData {
  inventoryItemId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  reason?: string;
  performedBy: string;
  notes?: string;
}

export class StockMovementService {
  static supabaseInstance: SupabaseClient | null = null;

  constructor(private supabase: SupabaseClient) {
    StockMovementService.supabaseInstance = supabase;
  }

  // Static methods for compatibility with hooks
  static async getMovementsByFilter(filter: any): Promise<any[]> {
    if (!this.supabaseInstance) {
      throw new Error('StockMovementService not initialized');
    }

    try {
      let query = this.supabaseInstance
        .from('stock_movements')
        .select('*');

      // Apply filters
      if (filter.movementType && filter.movementType !== 'all') {
        query = query.eq('movement_type', filter.movementType);
      }

      if (filter.inventoryItemId) {
        query = query.eq('inventory_item_id', filter.inventoryItemId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the raw data to match what the UI expects
      return (data || []).map(item => ({
        id: item.id,
        inventoryItemId: item.inventory_item_id,
        movementType: item.movement_type,
        quantityChange: item.quantity,
        previousStock: item.stock_before || 0,
        newStock: item.stock_after || 0,
        reason: item.reason,
        performedBy: item.performed_by,
        performedAt: item.created_at,
        productName: 'Product',
      }));
    } catch (error) {
      console.error('Error fetching movements by filter:', error);
      return [];
    }
  }

  static async getMovementHistory(params: any): Promise<any[]> {
    if (!this.supabaseInstance) {
      throw new Error('StockMovementService not initialized');
    }

    const service = new StockMovementService(this.supabaseInstance);
    return service.getMovementHistory(
      params.inventoryItemId,
      params.startDate,
      params.endDate
    );
  }

  async recordMovement(data: CreateStockMovement): Promise<StockMovement> {
    try {
      // Validate input
      const validated = CreateStockMovementSchema.parse(data);

      // Transform to database format
      const dbData = {
        inventory_item_id: validated.inventoryItemId,
        movement_type: validated.movementType,
        quantity: validated.quantity,
        reference_type: validated.referenceType || null,
        reference_id: validated.referenceId || null,
        from_warehouse_id: validated.fromWarehouseId || null,
        to_warehouse_id: validated.toWarehouseId || null,
        reason: validated.reason || null,
        performed_by: validated.performedBy,
        notes: validated.notes || null,
      };

      const { data: created, error } = await this.supabase
        .from('stock_movements')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'movement-record',
          errorMessage: error.message,
          validationPattern: 'direct_supabase_query'
        });
        throw error;
      }

      const result = StockMovementTransformSchema.parse(created);
      ValidationMonitor.recordPatternSuccess({
        pattern: 'direct_supabase_query',
        context: 'movement-record'
      });
      return result;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError({
          context: 'movement-record',
          errorMessage: error.message,
          validationPattern: 'direct_supabase_query'
        });
      }
      throw error;
    }
  }

  async getMovementHistory(
    inventoryItemIdOrLimit?: string | number,
    startDate?: string,
    endDate?: string
  ): Promise<StockMovement[]> {
    try {
      let query = this.supabase
        .from('stock_movements')
        .select('*');

      // Handle overloaded parameter - can be inventoryItemId or limit
      if (typeof inventoryItemIdOrLimit === 'string') {
        query = query.eq('inventory_item_id', inventoryItemIdOrLimit);
      } else if (typeof inventoryItemIdOrLimit === 'number') {
        query = query.limit(inventoryItemIdOrLimit);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
        if (endDate) {
          query = query.lte('created_at', endDate);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'movement-history',
          errorMessage: error.message,
          validationPattern: 'direct_supabase_query'
        });
        throw error;
      }

      // Validate and transform each movement
      const results: StockMovement[] = [];
      for (const item of data || []) {
        try {
          const validated = StockMovementTransformSchema.parse(item);
          results.push(validated);
        } catch (err) {
          ValidationMonitor.recordValidationError({
            context: 'movement-history-item',
            errorMessage: err instanceof Error ? err.message : 'Unknown error',
            validationPattern: 'transformation_schema'
          });
          // Continue processing other items
        }
      }

      ValidationMonitor.recordPatternSuccess({
        pattern: 'direct_supabase_query',
        context: 'movement-history'
      });
      return results;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError({
          context: 'movement-history',
          errorMessage: error.message,
          validationPattern: 'direct_supabase_query'
        });
      }
      throw error;
    }
  }

  async batchRecordMovements(movements: CreateStockMovement[]): Promise<BatchResult[]> {
    const results: BatchResult[] = [];

    for (const movement of movements) {
      try {
        const result = await this.recordMovement(movement);
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ success: false, error });
        ValidationMonitor.recordValidationError({
          context: 'batch-movement',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          validationPattern: 'atomic_operation'
        });
      }
    }

    ValidationMonitor.recordPatternSuccess({
        pattern: 'atomic_operation',
        context: 'batch-movement'
      });
    return results;
  }

  async getMovementsByType(movementType: 'in' | 'out' | 'adjustment' | 'transfer'): Promise<StockMovement[]> {
    try {
      const { data, error } = await this.supabase
        .from('stock_movements')
        .select('*')
        .eq('movement_type', movementType)
        .order('created_at', { ascending: false });

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'movements-by-type',
          errorMessage: error.message,
          validationPattern: 'direct_supabase_query'
        });
        throw error;
      }

      const results: StockMovement[] = [];
      for (const item of data || []) {
        try {
          const validated = StockMovementTransformSchema.parse(item);
          results.push(validated);
        } catch (err) {
          ValidationMonitor.recordValidationError({
            context: 'movements-by-type-item',
            errorMessage: err instanceof Error ? err.message : 'Unknown error',
            validationPattern: 'transformation_schema'
          });
        }
      }

      ValidationMonitor.recordPatternSuccess({
        pattern: 'direct_supabase_query',
        context: 'movements-by-type'
      });
      return results;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError({
          context: 'movements-by-type',
          errorMessage: error.message,
          validationPattern: 'direct_supabase_query'
        });
      }
      throw error;
    }
  }

  async getMovementsByUser(userId: string): Promise<StockMovement[]> {
    try {
      const { data, error } = await this.supabase
        .from('stock_movements')
        .select('*')
        .eq('performed_by', userId)
        .order('created_at', { ascending: false });

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'movements-by-user',
          errorMessage: error.message,
          validationPattern: 'direct_supabase_query'
        });
        throw error;
      }

      const results: StockMovement[] = [];
      for (const item of data || []) {
        try {
          const validated = StockMovementTransformSchema.parse(item);
          results.push(validated);
        } catch (err) {
          ValidationMonitor.recordValidationError({
            context: 'movements-by-user-item',
            errorMessage: err instanceof Error ? err.message : 'Unknown error',
            validationPattern: 'transformation_schema'
          });
        }
      }

      ValidationMonitor.recordPatternSuccess({
        pattern: 'direct_supabase_query',
        context: 'movements-by-user'
      });
      return results;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError({
          context: 'movements-by-user',
          errorMessage: error.message,
          validationPattern: 'direct_supabase_query'
        });
      }
      throw error;
    }
  }

  async getMovementSummary(inventoryItemId: string): Promise<MovementSummary> {
    try {
      const { data, error } = await this.supabase
        .from('stock_movements')
        .select('*')
        .eq('inventory_item_id', inventoryItemId);

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'movement-summary',
          errorMessage: error.message,
          validationPattern: 'direct_supabase_query'
        });
        throw error;
      }

      let totalIn = 0;
      let totalOut = 0;
      let movementCount = 0;

      for (const item of data || []) {
        try {
          const validated = StockMovementTransformSchema.parse(item);
          movementCount++;
          
          if (validated.movementType === 'in') {
            totalIn += validated.quantity;
          } else if (validated.movementType === 'out') {
            totalOut += validated.quantity;
          } else if (validated.movementType === 'adjustment') {
            // Adjustments can be positive or negative
            if (validated.quantity > 0) {
              totalIn += validated.quantity;
            } else {
              totalOut += Math.abs(validated.quantity);
            }
          }
          // Transfer movements don't affect net totals for a single item
        } catch (err) {
          ValidationMonitor.recordValidationError({
            context: 'movement-summary-item',
            errorMessage: err instanceof Error ? err.message : 'Unknown error',
            validationPattern: 'transformation_schema'
          });
        }
      }

      const result = {
        totalIn,
        totalOut,
        netChange: totalIn - totalOut,
        movementCount,
      };

      ValidationMonitor.recordPatternSuccess({
        pattern: 'statistical_calculation',
        context: 'movement-summary'
      });
      return result;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError({
          context: 'movement-summary',
          errorMessage: error.message,
          validationPattern: 'direct_supabase_query'
        });
      }
      throw error;
    }
  }

  async recordTransfer(data: TransferData): Promise<StockMovement> {
    try {
      const movementData: CreateStockMovement = {
        inventoryItemId: data.inventoryItemId,
        movementType: 'transfer',
        quantity: data.quantity,
        fromWarehouseId: data.fromWarehouseId,
        toWarehouseId: data.toWarehouseId,
        reason: data.reason,
        performedBy: data.performedBy,
        notes: data.notes,
      };

      const result = await this.recordMovement(movementData);
      ValidationMonitor.recordPatternSuccess({
        pattern: 'atomic_operation',
        context: 'movement-transfer'
      });
      return result;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError({
          context: 'movement-transfer',
          errorMessage: error.message,
          validationPattern: 'atomic_operation'
        });
      }
      throw error;
    }
  }

  async getAdjustments(warehouseId?: string): Promise<StockMovement[]> {
    try {
      let query = this.supabase
        .from('stock_movements')
        .select('*')
        .eq('movement_type', 'adjustment');

      if (warehouseId) {
        // For adjustments, we might want to filter by from_warehouse_id
        query = query.eq('from_warehouse_id', warehouseId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'get-adjustments',
          errorMessage: error.message,
          validationPattern: 'direct_supabase_query'
        });
        throw error;
      }

      const results: StockMovement[] = [];
      for (const item of data || []) {
        try {
          const validated = StockMovementTransformSchema.parse(item);
          results.push(validated);
        } catch (err) {
          ValidationMonitor.recordValidationError({
            context: 'get-adjustments-item',
            errorMessage: err instanceof Error ? err.message : 'Unknown error',
            validationPattern: 'transformation_schema'
          });
        }
      }

      ValidationMonitor.recordPatternSuccess({
        pattern: 'direct_supabase_query',
        context: 'get-adjustments'
      });
      return results;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError({
          context: 'get-adjustments',
          errorMessage: error.message,
          validationPattern: 'direct_supabase_query'
        });
      }
      throw error;
    }
  }
}