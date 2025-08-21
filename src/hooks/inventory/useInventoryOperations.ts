/**
 * Task 2.3.4: Inventory Operations Hooks Implementation (GREEN Phase)
 * Mutations, optimistic updates, and batch operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InventoryService } from '../../services/inventory/inventoryService';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import type {
  InventoryItemTransform,
  CreateInventoryItemInput,
  StockUpdateInput,
  VisibilityUpdateInput
} from '../../schemas/inventory';

/**
 * Update stock levels with optimistic updates and rollback
 */
export function useUpdateStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ inventoryId, stockUpdate }: {
      inventoryId: string;
      stockUpdate: StockUpdateInput;
    }) => InventoryService.updateStock(inventoryId, stockUpdate),

    // Optimistic update
    onMutate: async ({ inventoryId, stockUpdate }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: inventoryKeys.item(inventoryId) });

      // Snapshot previous value
      const previousInventory = queryClient.getQueryData<InventoryItemTransform>(
        inventoryKeys.item(inventoryId)
      );

      // Optimistically update
      if (previousInventory) {
        const optimisticInventory: InventoryItemTransform = {
          ...previousInventory,
          currentStock: stockUpdate.currentStock,
          availableStock: stockUpdate.currentStock - previousInventory.reservedStock,
          lastStockUpdate: new Date().toISOString(),
        };

        queryClient.setQueryData(inventoryKeys.item(inventoryId), optimisticInventory);
      }

      return { previousInventory };
    },

    // Success: Invalidate related queries
    onSuccess: (updatedInventory, { inventoryId }) => {
      if (updatedInventory) {
        // Update the specific item
        queryClient.setQueryData(inventoryKeys.item(inventoryId), updatedInventory);
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: inventoryKeys.itemByProduct(updatedInventory.productId) });
        queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
      }
    },

    // Error: Rollback optimistic update
    onError: (error, { inventoryId }, context) => {
      if (context?.previousInventory) {
        queryClient.setQueryData(inventoryKeys.item(inventoryId), context.previousInventory);
      }
    },

    // Always refetch after completion (success or error)
    onSettled: (data, error, { inventoryId }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.item(inventoryId) });
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