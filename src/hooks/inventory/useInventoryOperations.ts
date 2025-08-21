/**
 * Task 2.4.5: Inventory Operations with Advanced Cache Integration
 * Smart invalidation, real-time coordination, and performance optimization
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InventoryService } from '../../services/inventory/inventoryService';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import { getInventoryCacheManager } from './cacheIntegration';
import { getCachePerformanceMonitor, withCachePerformanceMonitoring } from './cachePerformanceMonitor';
import type {
  InventoryItemTransform,
  CreateInventoryItemInput,
  StockUpdateInput,
  VisibilityUpdateInput
} from '../../schemas/inventory';

/**
 * Update stock levels with advanced cache integration
 * Includes smart invalidation, performance monitoring, and cross-entity coordination
 */
export function useUpdateStock() {
  const queryClient = useQueryClient();
  const cacheManager = getInventoryCacheManager(queryClient);
  const performanceMonitor = getCachePerformanceMonitor();

  return useMutation({
    mutationFn: withCachePerformanceMonitoring(
      'stock-update',
      async ({ inventoryId, stockUpdate }: {
        inventoryId: string;
        stockUpdate: StockUpdateInput;
      }) => InventoryService.updateStock(inventoryId, stockUpdate),
      1
    ),

    // Advanced optimistic update with cache manager
    onMutate: async ({ inventoryId, stockUpdate }) => {
      const startTime = performance.now();
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: inventoryKeys.item(inventoryId) });

      // Snapshot previous value
      const previousInventory = queryClient.getQueryData<InventoryItemTransform>(
        inventoryKeys.item(inventoryId)
      );

      // Use advanced cache manager for optimistic update
      await cacheManager.optimisticStockUpdate(inventoryId, stockUpdate);
      
      const duration = performance.now() - startTime;
      performanceMonitor.recordOptimisticUpdate('stock-update-optimistic', duration, 1);

      return { previousInventory };
    },

    // Success: Smart invalidation with cross-entity coordination
    onSuccess: async (updatedInventory, { inventoryId, stockUpdate }) => {
      const startTime = performance.now();
      
      if (updatedInventory) {
        // Create movement record for audit trail
        const movement = {
          inventoryItemId: inventoryId,
          movementType: 'manual_adjustment' as const,
          quantityChange: stockUpdate.currentStock - (updatedInventory.currentStock || 0),
          newStock: stockUpdate.currentStock,
          reason: stockUpdate.reason || 'Manual stock update',
          performedBy: stockUpdate.performedBy
        };

        // Use smart invalidation strategy
        await cacheManager.invalidateStockUpdate(inventoryId, movement);
        
        const duration = performance.now() - startTime;
        performanceMonitor.recordInvalidation('stock-update-success', duration, 5); // Multiple caches affected
      }
    },

    // Error: Rollback with performance tracking
    onError: (error, { inventoryId }, context) => {
      const startTime = performance.now();
      
      if (context?.previousInventory) {
        queryClient.setQueryData(inventoryKeys.item(inventoryId), context.previousInventory);
      }
      
      const duration = performance.now() - startTime;
      performanceMonitor.recordCacheError('stock-update-rollback', duration, error.message);
    },

    // Final settlement with cache warming for related items
    onSettled: async (data, error, { inventoryId }) => {
      // Ensure item cache is fresh
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.item(inventoryId) });
      
      // If successful, warm related caches for better performance
      if (data && !error) {
        const relatedItems = [inventoryId]; // Could expand to related products
        await cacheManager.warmInventoryCaches(relatedItems);
      }
    },
  });
}

/**
 * Update product visibility with cache invalidation
 */
export function useUpdateVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ inventoryId, visibilityUpdate }: {
      inventoryId: string;
      visibilityUpdate: VisibilityUpdateInput;
    }) => InventoryService.toggleProductVisibility(inventoryId, visibilityUpdate),

    // Optimistic update for visibility changes
    onMutate: async ({ inventoryId, visibilityUpdate }) => {
      await queryClient.cancelQueries({ queryKey: inventoryKeys.item(inventoryId) });

      const previousInventory = queryClient.getQueryData<InventoryItemTransform>(
        inventoryKeys.item(inventoryId)
      );

      if (previousInventory) {
        const optimisticInventory: InventoryItemTransform = {
          ...previousInventory,
          ...visibilityUpdate,
          updatedAt: new Date().toISOString(),
        };

        queryClient.setQueryData(inventoryKeys.item(inventoryId), optimisticInventory);
      }

      return { previousInventory };
    },

    onSuccess: (updatedInventory, { inventoryId }) => {
      if (updatedInventory) {
        queryClient.setQueryData(inventoryKeys.item(inventoryId), updatedInventory);
        queryClient.invalidateQueries({ queryKey: inventoryKeys.itemByProduct(updatedInventory.productId) });
      }
    },

    onError: (error, { inventoryId }, context) => {
      if (context?.previousInventory) {
        queryClient.setQueryData(inventoryKeys.item(inventoryId), context.previousInventory);
      }
    },

    onSettled: (data, error, { inventoryId }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.item(inventoryId) });
    },
  });
}

/**
 * Batch stock updates with resilient processing
 */
export function useBatchUpdateStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Array<{ inventoryItemId: string; currentStock: number; reason?: string }>) =>
      InventoryService.batchUpdateStock(updates),

    onSuccess: (result) => {
      // Invalidate all affected inventory items
      result.success.forEach(inventory => {
        queryClient.setQueryData(inventoryKeys.item(inventory.id), inventory);
        queryClient.invalidateQueries({ queryKey: inventoryKeys.itemByProduct(inventory.productId) });
      });

      // Refresh low stock items
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
    },

    onError: () => {
      // On error, invalidate all inventory queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all() });
    },
  });
}

/**
 * Create new inventory item
 */
export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInventoryItemInput) => InventoryService.createInventoryItem(input),

    onSuccess: (newInventory) => {
      if (newInventory) {
        // Add to cache
        queryClient.setQueryData(inventoryKeys.item(newInventory.id), newInventory);
        queryClient.setQueryData(inventoryKeys.itemByProduct(newInventory.productId), newInventory);
        
        // Refresh related queries
        queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
      }
    },
  });
}