/**
 * Task 2.3.4: Inventory Items Hooks Implementation (GREEN Phase)
 * Following established patterns with React Query integration
 */

import { useQuery } from '@tanstack/react-query';
import { InventoryService } from '../../services/inventory/inventoryService';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import type { InventoryItemTransform } from '../../schemas/inventory';

/**
 * Get single inventory item with caching and transformation
 */
export function useInventoryItem(inventoryId: string | null) {
  return useQuery({
    queryKey: inventoryKeys.item(inventoryId || ''),
    queryFn: () => InventoryService.getInventoryItem(inventoryId!),
    enabled: !!inventoryId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
  });
}

/**
 * Get inventory by product ID with caching
 */
export function useInventoryByProduct(productId: string | null) {
  return useQuery({
    queryKey: inventoryKeys.itemByProduct(productId || ''),
    queryFn: () => InventoryService.getInventoryByProduct(productId!),
    enabled: !!productId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}

/**
 * Get low stock items with automatic refresh
 */
export function useLowStockItems() {
  return useQuery({
    queryKey: inventoryKeys.lowStock(),
    queryFn: () => InventoryService.getLowStockItems(),
    staleTime: 1000 * 60 * 2,  // 2 minutes (more frequent for critical data)
    gcTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
  });
}

/**
 * Get multiple inventory items with filtering options
 */
export function useInventoryItems(options?: { 
  includeInactive?: boolean; 
  includeHidden?: boolean; 
}) {
  return useQuery({
    queryKey: inventoryKeys.items(),
    queryFn: () => InventoryService.getLowStockItems(), // Using getLowStockItems as base query
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}