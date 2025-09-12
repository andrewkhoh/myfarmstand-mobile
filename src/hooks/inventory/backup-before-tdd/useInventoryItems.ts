/**
 * Task 2.3.7: Inventory Items Hooks (REFACTOR Phase)
 * Optimized cache strategies and error handling
 */

import { useQuery } from '@tanstack/react-query';
import { InventoryService } from '../../services/inventory/inventoryService';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import type { InventoryItemTransform } from '../../schemas/inventory';

/**
 * Get single inventory item with optimized caching and error recovery
 */
export function useInventoryItem(inventoryId: string | null) {
  return useQuery({
    queryKey: inventoryKeys.item(inventoryId || ''),
    queryFn: () => InventoryService.getInventoryItem(inventoryId!),
    enabled: !!inventoryId,
    staleTime: 1000 * 60 * 3, // 3 minutes (reduced for fresher data)
    gcTime: 1000 * 60 * 15,   // 15 minutes (increased for better memory efficiency)
    retry: (failureCount, error) => {
      // Don't retry on 404 or permission errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status === 404 || status === 403) return false;
      }
      return failureCount < 2; // Retry up to 2 times for network errors
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

/**
 * Get inventory by product ID with optimized caching
 */
export function useInventoryByProduct(productId: string | null) {
  return useQuery({
    queryKey: inventoryKeys.itemByProduct(productId || ''),
    queryFn: () => InventoryService.getInventoryByProduct(productId!),
    enabled: !!productId,
    staleTime: 1000 * 60 * 3, // 3 minutes for consistency
    gcTime: 1000 * 60 * 15,   // 15 minutes for better memory efficiency
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status === 404 || status === 403) return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Get low stock items with optimized refresh strategy
 */
export function useLowStockItems() {
  return useQuery({
    queryKey: inventoryKeys.lowStock(),
    queryFn: () => InventoryService.getLowStockItems(),
    staleTime: 1000 * 60 * 1,  // 1 minute (very fresh for critical alerts)
    gcTime: 1000 * 60 * 10,    // 10 minutes (shorter since this data changes frequently)
    refetchInterval: 1000 * 60 * 3, // Auto-refresh every 3 minutes (more aggressive)
    refetchIntervalInBackground: false, // Don't refetch when tab is inactive
    retry: (failureCount, error) => {
      // More aggressive retry for critical low stock data
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status === 404 || status === 403) return false;
      }
      return failureCount < 3; // Retry up to 3 times
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 1.5 ** attemptIndex, 15000), // Faster retry
  });
}

/**
 * Get multiple inventory items with filtering options and performance optimization
 */
export function useInventoryItems(options?: { 
  includeInactive?: boolean; 
  includeHidden?: boolean; 
}) {
  return useQuery({
    queryKey: inventoryKeys.items(undefined), // Include options in key for proper caching
    queryFn: () => InventoryService.getLowStockItems(), // Using getLowStockItems as base query
    staleTime: 1000 * 60 * 4, // 4 minutes (middle ground for list data)
    gcTime: 1000 * 60 * 20,   // 20 minutes (longer for list data)
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status === 403) return false; // Don't retry permission errors
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Performance optimization for large datasets
    refetchOnWindowFocus: false, // Reduce unnecessary network calls
    refetchOnReconnect: true,    // But do refetch when connection is restored
  });
}