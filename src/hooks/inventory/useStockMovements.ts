/**
 * Task 2.3.7: Stock Movement Hooks (REFACTOR Phase)
 * Optimized audit trail with enhanced performance and caching
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { StockMovementService } from '../../services/inventory/stockMovementService';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import { supabase } from '../../config/supabase';
import type {
  CreateStockMovementInput,
  MovementFilterInput,
  MovementHistoryInput
} from '../../schemas/inventory';

// Initialize the service with supabase instance
if (!StockMovementService.supabaseInstance) {
  new StockMovementService(supabase);
}

/**
 * Get movement history with optimized pagination and caching
 */
export function useMovementHistory(inventoryItemId: string, options?: Partial<MovementHistoryInput>) {
  return useQuery({
    queryKey: inventoryKeys.movementHistory(inventoryItemId, options),
    queryFn: () => StockMovementService.getMovementHistory({
      inventoryItemId,
      ...options
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes (audit data doesn't change often)
    gcTime: 1000 * 60 * 30,   // 30 minutes (keep audit data longer for reporting)
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status === 403 || status === 404) return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Optimize for audit trail viewing patterns
    refetchOnWindowFocus: false, // Audit data doesn't need frequent refresh
  });
}

/**
 * Get movements with filter criteria and performance optimization
 */
export function useStockMovements(filter: MovementFilterInput) {
  return useQuery({
    queryKey: inventoryKeys.movementsByType(filter.movementType || 'all', filter),
    queryFn: () => StockMovementService.getMovementsByFilter(filter),
    staleTime: 1000 * 60 * 3, // 3 minutes for filtered data
    gcTime: 1000 * 60 * 15,   // 15 minutes for filtered queries
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status === 403) return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false, // Reduce unnecessary queries for filtered data
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
 * Get movement analytics with performance-optimized caching
 */
export function useMovementAnalytics(options: {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}) {
  return useQuery({
    queryKey: inventoryKeys.analytics(options),
    queryFn: () => StockMovementService.getMovementAnalytics(options),
    staleTime: 1000 * 60 * 15, // 15 minutes (analytics are expensive, cache longer)
    gcTime: 1000 * 60 * 60,    // 1 hour (keep analytics in memory longer)
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status === 403 || status === 422) return false; // Don't retry on permissions or validation errors
      }
      return failureCount < 1; // Only retry once for analytics (expensive queries)
    },
    retryDelay: 5000, // Fixed 5 second delay for analytics
    refetchOnWindowFocus: false, // Analytics don't need frequent refresh
    refetchOnReconnect: false,   // Don't refetch analytics on reconnect
    // Performance optimization for expensive analytics
    notifyOnChangeProps: ['data', 'error', 'isLoading'], // Only notify on essential prop changes
  });
}