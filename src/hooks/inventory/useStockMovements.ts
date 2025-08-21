/**
 * Task 2.3.4: Stock Movement Hooks Implementation (GREEN Phase)
 * Audit trail, movement history, and batch tracking hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StockMovementService } from '../../services/inventory/stockMovementService';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import type {
  CreateStockMovementInput,
  MovementFilterInput,
  MovementHistoryInput
} from '../../schemas/inventory';

/**
 * Get movement history with pagination and filtering
 */
export function useMovementHistory(inventoryItemId: string, options?: Partial<MovementHistoryInput>) {
  return useQuery({
    queryKey: inventoryKeys.movementHistory(inventoryItemId, options),
    queryFn: () => StockMovementService.getMovementHistory({
      inventoryItemId,
      ...options
    }),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5,
  });
}

/**
 * Get movements with filter criteria
 */
export function useStockMovements(filter: MovementFilterInput) {
  return useQuery({
    queryKey: inventoryKeys.movementsByType(filter.movementType || 'all', filter),
    queryFn: () => StockMovementService.getMovementsByFilter(filter),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });
}

/**
 * Record stock movement with complete audit trail
 */
export function useRecordMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateStockMovementInput) => 
      StockMovementService.recordMovement(input),

    onSuccess: (recordedMovement, input) => {
      if (recordedMovement) {
        // Invalidate movement history for the affected inventory item
        queryClient.invalidateQueries({ 
          queryKey: inventoryKeys.movementHistory(input.inventoryItemId) 
        });
        
        // Invalidate movements list
        queryClient.invalidateQueries({ 
          queryKey: inventoryKeys.movements() 
        });
        
        // Invalidate the inventory item itself (stock levels may have changed)
        queryClient.invalidateQueries({ 
          queryKey: inventoryKeys.item(input.inventoryItemId) 
        });
      }
    },
  });
}

/**
 * Get movements by batch ID for bulk operation tracking
 */
export function useBatchMovements(batchId: string) {
  return useQuery({
    queryKey: inventoryKeys.movementsByBatch(batchId),
    queryFn: () => StockMovementService.getBatchMovements(batchId),
    staleTime: 1000 * 60 * 5, // 5 minutes (batch operations are less frequent)
    gcTime: 1000 * 60 * 10,
  });
}

/**
 * Get movement analytics with aggregations
 */
export function useMovementAnalytics(options: {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}) {
  return useQuery({
    queryKey: inventoryKeys.analytics(options),
    queryFn: () => StockMovementService.getMovementAnalytics(options),
    staleTime: 1000 * 60 * 10, // 10 minutes (analytics can be cached longer)
    gcTime: 1000 * 60 * 15,
  });
}