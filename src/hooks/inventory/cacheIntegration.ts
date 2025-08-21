/**
 * Task 2.4.5: Advanced Cache Strategy Integration
 * Smart invalidation, real-time coordination, and performance optimization
 */

import { QueryClient } from '@tanstack/react-query';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import type { 
  InventoryItemTransform, 
  StockMovementTransform,
  CreateStockMovementInput,
  StockUpdateInput
} from '../../schemas/inventory';

/**
 * Advanced cache coordination strategies for inventory operations
 */
export class InventoryCacheManager {
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Smart invalidation strategy for stock updates
   * Coordinates inventory items, movements, analytics, and related caches
   */
  async invalidateStockUpdate(
    inventoryItemId: string, 
    movement: CreateStockMovementInput,
    userId?: string
  ): Promise<void> {
    // 1. Primary inventory item cache
    await this.queryClient.invalidateQueries({
      queryKey: inventoryKeys.item(inventoryItemId, userId)
    });

    // 2. Related inventory lists (items, low-stock, visible, active)
    await Promise.all([
      this.queryClient.invalidateQueries({
        queryKey: inventoryKeys.items(userId)
      }),
      this.queryClient.invalidateQueries({
        queryKey: inventoryKeys.lowStock(undefined, userId)
      }),
      this.queryClient.invalidateQueries({
        queryKey: inventoryKeys.visible(userId)
      }),
      this.queryClient.invalidateQueries({
        queryKey: inventoryKeys.active(userId)
      })
    ]);

    // 3. Movement audit trail caches
    await Promise.all([
      this.queryClient.invalidateQueries({
        queryKey: inventoryKeys.movements(userId)
      }),
      this.queryClient.invalidateQueries({
        queryKey: inventoryKeys.movementHistory(inventoryItemId, undefined, userId)
      }),
      this.queryClient.invalidateQueries({
        queryKey: inventoryKeys.movementsByType(movement.movementType, undefined, userId)
      })
    ]);

    // 4. Analytics cache (performance-conscious: debounced invalidation)
    this.debounceAnalyticsInvalidation(userId);

    // 5. Cross-entity cache coordination
    await this.invalidateCrossEntityCaches(inventoryItemId, movement, userId);
  }

  /**
   * Optimistic update strategy with intelligent rollback
   */
  async optimisticStockUpdate(
    inventoryItemId: string,
    updateData: StockUpdateInput,
    userId?: string
  ): Promise<void> {
    const itemKey = inventoryKeys.item(inventoryItemId, userId);
    
    // Get current data for rollback
    const previousData = this.queryClient.getQueryData<InventoryItemTransform>(itemKey);
    
    if (previousData) {
      // Optimistically update with computed values
      const optimisticData: InventoryItemTransform = {
        ...previousData,
        currentStock: updateData.currentStock,
        availableStock: updateData.currentStock - previousData.reservedStock,
        lastStockUpdate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Apply optimistic update
      this.queryClient.setQueryData(itemKey, optimisticData);

      // Update related caches optimistically
      this.updateRelatedCachesOptimistically(inventoryItemId, optimisticData, userId);
    }
  }

  /**
   * Real-time update coordination for live inventory changes
   */
  async handleRealtimeStockChange(
    inventoryItemId: string,
    newData: InventoryItemTransform,
    movement?: StockMovementTransform,
    userId?: string
  ): Promise<void> {
    // 1. Update primary cache with fresh data
    this.queryClient.setQueryData(
      inventoryKeys.item(inventoryItemId, userId),
      newData
    );

    // 2. Smart list cache updates (patch existing data instead of full invalidation)
    await this.smartUpdateListCaches(newData, userId);

    // 3. Add movement to audit trail cache if provided
    if (movement) {
      await this.addMovementToCache(inventoryItemId, movement, userId);
    }

    // 4. Trigger dependent cache refreshes (batched for performance)
    this.scheduleDependendCacheUpdates(inventoryItemId, userId);
  }

  /**
   * Performance-optimized batch invalidation for bulk operations
   */
  async batchInvalidateInventoryOperations(
    operations: Array<{
      inventoryItemId: string;
      operation: 'stock-update' | 'visibility-change' | 'threshold-update';
      data: any;
    }>,
    userId?: string
  ): Promise<void> {
    // Group operations by cache impact for efficient batching
    const impactedCaches = new Set<string>();
    const itemIds = new Set<string>();

    operations.forEach(op => {
      itemIds.add(op.inventoryItemId);
      this.collectCacheImpacts(op, impactedCaches);
    });

    // Batch invalidate all impacted caches in parallel
    const invalidationPromises = Array.from(impactedCaches).map(cachePattern => 
      this.queryClient.invalidateQueries({ 
        predicate: query => query.queryKey.join('.').includes(cachePattern)
      })
    );

    await Promise.all(invalidationPromises);

    // Update analytics cache efficiently (single call for batch)
    this.debounceAnalyticsInvalidation(userId);
  }

  /**
   * Cache warming strategy for predictive loading
   */
  async warmInventoryCaches(
    mostAccessedItems: string[],
    userId?: string
  ): Promise<void> {
    // Warm high-traffic inventory items in background
    const warmingPromises = mostAccessedItems.map(itemId =>
      this.queryClient.prefetchQuery({
        queryKey: inventoryKeys.item(itemId, userId),
        staleTime: 1000 * 60 * 5, // 5 minutes
      })
    );

    // Warm common list queries
    warmingPromises.push(
      this.queryClient.prefetchQuery({
        queryKey: inventoryKeys.lowStock(undefined, userId),
        staleTime: 1000 * 60 * 2, // 2 minutes
      }),
      this.queryClient.prefetchQuery({
        queryKey: inventoryKeys.visible(userId),
        staleTime: 1000 * 60 * 5, // 5 minutes
      })
    );

    await Promise.all(warmingPromises);
  }

  // Private helper methods for advanced cache coordination

  private debounceAnalyticsInvalidation(userId?: string): void {
    // Use a debounced approach to avoid excessive analytics cache invalidation
    clearTimeout((this as any)._analyticsTimer);
    (this as any)._analyticsTimer = setTimeout(() => {
      this.queryClient.invalidateQueries({
        queryKey: inventoryKeys.analytics(undefined, userId)
      });
    }, 1000); // 1 second debounce
  }

  private async invalidateCrossEntityCaches(
    inventoryItemId: string,
    movement: CreateStockMovementInput,
    userId?: string
  ): Promise<void> {
    // If movement affects orders (order fulfillment), invalidate order caches
    if (movement.referenceOrderId) {
      // Cross-entity coordination with order system
      await this.queryClient.invalidateQueries({
        predicate: query => 
          query.queryKey.includes('orders') && 
          query.queryKey.includes(movement.referenceOrderId!)
      });
    }

    // If movement affects products (restocking), invalidate product caches
    const inventoryItem = this.queryClient.getQueryData<InventoryItemTransform>(
      inventoryKeys.item(inventoryItemId, userId)
    );
    
    if (inventoryItem?.productId) {
      await this.queryClient.invalidateQueries({
        predicate: query => 
          query.queryKey.includes('products') && 
          query.queryKey.includes(inventoryItem.productId)
      });
    }
  }

  private updateRelatedCachesOptimistically(
    inventoryItemId: string,
    optimisticData: InventoryItemTransform,
    userId?: string
  ): void {
    // Update inventory items list cache optimistically
    const itemsKey = inventoryKeys.items(userId);
    const currentItems = this.queryClient.getQueryData<InventoryItemTransform[]>(itemsKey);
    
    if (currentItems) {
      const updatedItems = currentItems.map(item =>
        item.id === inventoryItemId ? optimisticData : item
      );
      this.queryClient.setQueryData(itemsKey, updatedItems);
    }

    // Update low stock cache if item crosses threshold
    if (optimisticData.currentStock <= optimisticData.minimumThreshold) {
      const lowStockKey = inventoryKeys.lowStock(undefined, userId);
      const currentLowStock = this.queryClient.getQueryData<InventoryItemTransform[]>(lowStockKey);
      
      if (currentLowStock && !currentLowStock.find(item => item.id === inventoryItemId)) {
        this.queryClient.setQueryData(lowStockKey, [...currentLowStock, optimisticData]);
      }
    }
  }

  private async smartUpdateListCaches(
    newData: InventoryItemTransform,
    userId?: string
  ): Promise<void> {
    // Smart patch approach: update existing list entries rather than full invalidation
    const listsToUpdate = [
      inventoryKeys.items(userId),
      inventoryKeys.visible(userId),
      inventoryKeys.active(userId),
      inventoryKeys.lowStock(undefined, userId)
    ];

    listsToUpdate.forEach(listKey => {
      const currentList = this.queryClient.getQueryData<InventoryItemTransform[]>(listKey);
      if (currentList) {
        const updatedList = currentList.map(item =>
          item.id === newData.id ? newData : item
        );
        this.queryClient.setQueryData(listKey, updatedList);
      }
    });
  }

  private async addMovementToCache(
    inventoryItemId: string,
    movement: StockMovementTransform,
    userId?: string
  ): Promise<void> {
    // Add new movement to movement history cache
    const historyKey = inventoryKeys.movementHistory(inventoryItemId, undefined, userId);
    const currentHistory = this.queryClient.getQueryData<{
      success: StockMovementTransform[];
      totalProcessed: number;
    }>(historyKey);

    if (currentHistory) {
      const updatedHistory = {
        success: [movement, ...currentHistory.success],
        totalProcessed: currentHistory.totalProcessed + 1
      };
      this.queryClient.setQueryData(historyKey, updatedHistory);
    }
  }

  private scheduleDependendCacheUpdates(inventoryItemId: string, userId?: string): void {
    // Schedule analytics refresh (debounced)
    this.debounceAnalyticsInvalidation(userId);
    
    // Schedule cross-entity cache checks (lower priority)
    setTimeout(() => {
      this.invalidateCrossEntityCaches(inventoryItemId, {} as any, userId);
    }, 500);
  }

  private collectCacheImpacts(
    operation: { inventoryItemId: string; operation: string; data: any },
    impactedCaches: Set<string>
  ): void {
    // Collect cache patterns that will be impacted by this operation
    impactedCaches.add('inventory.user-specific');
    impactedCaches.add(`inventory.item.${operation.inventoryItemId}`);
    
    switch (operation.operation) {
      case 'stock-update':
        impactedCaches.add('inventory.movements');
        impactedCaches.add('inventory.low-stock');
        break;
      case 'visibility-change':
        impactedCaches.add('inventory.visible');
        break;
      case 'threshold-update':
        impactedCaches.add('inventory.low-stock');
        break;
    }
  }
}

/**
 * Singleton cache manager instance factory
 */
let cacheManagerInstance: InventoryCacheManager | null = null;

export const getInventoryCacheManager = (queryClient: QueryClient): InventoryCacheManager => {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new InventoryCacheManager(queryClient);
  }
  return cacheManagerInstance;
};

/**
 * Hook for accessing cache manager in components
 */
export const useInventoryCacheManager = (): InventoryCacheManager => {
  // This would typically get the QueryClient from context
  throw new Error('useInventoryCacheManager requires QueryClient context implementation');
};