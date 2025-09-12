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
  constructor(private supabase: SupabaseClient) {}

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
        ValidationMonitor.recordValidationError('movement-record', error);
        throw error;
      }

      const result = StockMovementTransformSchema.parse(created);
      ValidationMonitor.recordPatternSuccess('movement-record');
      return result;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('movement-record', error);
      }
      throw error;
    }
  }

  async getMovementHistory(
    inventoryItemId: string,
    startDate?: string,
    endDate?: string
  ): Promise<StockMovement[]> {
    try {
      let query = this.supabase
        .from('stock_movements')
        .select('*')
        .eq('inventory_item_id', inventoryItemId);

      if (startDate) {
        query = query.gte('created_at', startDate);
        if (endDate) {
          query = query.lte('created_at', endDate);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        ValidationMonitor.recordValidationError('movement-history', error);
        throw error;
      }

      const results: StockMovement[] = [];
      for (const item of data || []) {
        try {
          const validated = StockMovementTransformSchema.parse(item);
          results.push(validated);
        } catch (err) {
          ValidationMonitor.recordValidationError('movement-history-item', err);
        }
      }

      ValidationMonitor.recordPatternSuccess('movement-history');
      return results;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('movement-history', error);
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
        ValidationMonitor.recordValidationError('batch-movement', error);
      }
    }

    ValidationMonitor.recordPatternSuccess('batch-movement');
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
        ValidationMonitor.recordValidationError('movements-by-type', error);
        throw error;
      }

      const results: StockMovement[] = [];
      for (const item of data || []) {
        try {
          const validated = StockMovementTransformSchema.parse(item);
          results.push(validated);
        } catch (err) {
          ValidationMonitor.recordValidationError('movements-by-type-item', err);
        }
      }

      ValidationMonitor.recordPatternSuccess('movements-by-type');
      return results;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('movements-by-type', error);
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
        ValidationMonitor.recordValidationError('movements-by-user', error);
        throw error;
      }

      const results: StockMovement[] = [];
      for (const item of data || []) {
        try {
          const validated = StockMovementTransformSchema.parse(item);
          results.push(validated);
        } catch (err) {
          ValidationMonitor.recordValidationError('movements-by-user-item', err);
        }
      }

      ValidationMonitor.recordPatternSuccess('movements-by-user');
      return results;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('movements-by-user', error);
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
        ValidationMonitor.recordValidationError('movement-summary', error);
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
          ValidationMonitor.recordValidationError('movement-summary-item', err);
        }
      }

      const result = {
        totalIn,
        totalOut,
        netChange: totalIn - totalOut,
        movementCount,
      };

      ValidationMonitor.recordPatternSuccess('movement-summary');
      return result;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('movement-summary', error);
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
      ValidationMonitor.recordPatternSuccess('movement-transfer');
      return result;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('movement-transfer', error);
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
        ValidationMonitor.recordValidationError('get-adjustments', error);
        throw error;
      }

      const results: StockMovement[] = [];
      for (const item of data || []) {
        try {
          const validated = StockMovementTransformSchema.parse(item);
          results.push(validated);
        } catch (err) {
          ValidationMonitor.recordValidationError('get-adjustments-item', err);
        }
      }

      ValidationMonitor.recordPatternSuccess('get-adjustments');
      return results;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ValidationMonitor')) {
        ValidationMonitor.recordValidationError('get-adjustments', error);
      }
      throw error;
    }
  }
}