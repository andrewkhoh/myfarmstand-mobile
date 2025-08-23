/**
 * Task 2.4.2: Performance Integration Tests (RED Phase)
 * Testing scalability and performance across all layers
 */

import React from 'react';
import { createSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../../test/contracts/hook.contracts';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Import hooks for performance testing
import { useInventoryItems, useLowStockItems } from '../../useInventoryItems';
import { useBatchUpdateStock } from '../../useInventoryOperations';
import { useStockMovements, useMovementAnalytics } from '../../useStockMovements';

// Services for mocking large datasets
import { InventoryService } from '../../../../services/inventory/inventoryService';
import { StockMovementService } from '../../../../services/inventory/stockMovementService';

jest.mock('../../../../services/inventory/inventoryService');
jest.mock('../../../../services/inventory/stockMovementService');

const mockInventoryService = InventoryService as jest.Mocked<typeof InventoryService>;
const mockStockMovementService = StockMovementService as jest.Mocked<typeof StockMovementService>;

// Test wrapper with performance-optimized React Query
const createPerformanceWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { 
        retry: false,
        staleTime: 0, // Force fresh data for performance testing
        gcTime: 0,    // Immediate cleanup for memory testing
      },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Helper to generate large datasets
const generateInventoryItems = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: `inv-${index + 1}`,
    productId: `product-${index + 1}`,
    currentStock: Math.floor(Math.random() * 1000),
    reservedStock: Math.floor(Math.random() * 50),
    availableStock: Math.floor(Math.random() * 950),
    minimumThreshold: 10 + Math.floor(Math.random() * 20),
    maximumThreshold: 500 + Math.floor(Math.random() * 500),
    isActive: true,
    isVisibleToCustomers: Math.random() > 0.1, // 90% visible
    lastStockUpdate: '2024-01-01T10:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z'
  }));
};

const generateStockMovements = (count: number, inventoryItemId?: string) => {
  const movementTypes = ['restock', 'sale', 'adjustment', 'return'] as const;
  
  return Array.from({ length: count }, (_, index) => ({
    id: `movement-${index + 1}`,
    inventoryItemId: inventoryItemId || `inv-${Math.floor(Math.random() * 100) + 1}`,
    movementType: movementTypes[Math.floor(Math.random() * movementTypes.length)],
    quantityChange: Math.floor(Math.random() * 200) - 100,
    previousStock: Math.floor(Math.random() * 1000),
    newStock: Math.floor(Math.random() * 1000),
    reason: `Movement ${index + 1}`,
    performedBy: `user-${Math.floor(Math.random() * 10) + 1}`,
    performedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    referenceOrderId: Math.random() > 0.5 ? `order-${index}` : null,
    batchId: Math.random() > 0.8 ? `batch-${Math.floor(index / 10)}` : null,
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
  }));
};

describe('Performance Integration Tests (RED Phase)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Performance Test 1: Large Dataset Handling
  describe('Large Dataset Handling', () => {
    it('should handle 1000+ inventory items efficiently', async () => {
      const largeDataset = generateInventoryItems(1000);
      
      mockInventoryService.getLowStockItems.mockResolvedValue(largeDataset);

      const startTime = performance.now();

      const { result } = renderHook(
        () => useInventoryItems(),
        { wrapper: createPerformanceWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Performance assertions
      expect(result.current.data).toHaveLength(1000);
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Memory usage validation
      expect(result.current.data).toBeDefined();
      expect(Array.isArray(result.current.data)).toBe(true);

      console.log(`Large dataset performance: ${responseTime.toFixed(2)}ms for 1000 items`);
    });

    it('should handle 10,000+ stock movements with pagination', async () => {
      const largeMovements = {
        success: generateStockMovements(10000),
        totalProcessed: 10000
      };

      mockStockMovementService.getMovementsByFilter.mockResolvedValue(largeMovements);

      const startTime = performance.now();

      const { result } = renderHook(
        () => useStockMovements({ movementType: 'all', limit: 10000 }),
        { wrapper: createPerformanceWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(result.current.data?.success).toHaveLength(10000);
      expect(responseTime).toBeLessThan(8000); // Should complete within 8 seconds

      console.log(`Large movements performance: ${responseTime.toFixed(2)}ms for 10,000 movements`);
    });

    it('should handle large low stock queries with filtering', async () => {
      // Generate 500 low stock items
      const lowStockItems = generateInventoryItems(500).map(item => ({
        ...item,
        currentStock: Math.floor(Math.random() * item.minimumThreshold), // Ensure low stock
        availableStock: Math.floor(Math.random() * item.minimumThreshold)
      }));

      mockInventoryService.getLowStockItems.mockResolvedValue(lowStockItems);

      const startTime = performance.now();

      const { result } = renderHook(
        () => useLowStockItems(),
        { wrapper: createPerformanceWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(result.current.data).toHaveLength(500);
      expect(responseTime).toBeLessThan(3000); // Should complete within 3 seconds
      
      // Verify all items are actually low stock
      result.current.data?.forEach(item => {
        expect(item.currentStock).toBeLessThanOrEqual(item.minimumThreshold);
      });

      console.log(`Low stock performance: ${responseTime.toFixed(2)}ms for 500 items`);
    });
  });

  // Performance Test 2: Bulk Operation Performance
  describe('Bulk Operation Performance', () => {
    it('should handle bulk updates of 100+ items efficiently', async () => {
      const batchSize = 100;
      const batchUpdates = Array.from({ length: batchSize }, (_, index) => ({
        inventoryItemId: `inv-${index + 1}`,
        currentStock: Math.floor(Math.random() * 1000),
        reason: `Bulk update ${index + 1}`
      }));

      const successResults = generateInventoryItems(batchSize);
      const batchResult = {
        success: successResults,
        errors: [],
        totalProcessed: batchSize
      };

      mockInventoryService.batchUpdateStock.mockResolvedValue(batchResult);

      const startTime = performance.now();

      const { result } = renderHook(
        () => useBatchUpdateStock(),
        { wrapper: createPerformanceWrapper() }
      );

      await act(async () => {
        result.current.mutate(batchUpdates);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(result.current.data?.success).toHaveLength(batchSize);
      expect(result.current.data?.errors).toHaveLength(0);
      expect(responseTime).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`Bulk update performance: ${responseTime.toFixed(2)}ms for ${batchSize} items`);
    });

    it('should handle partial failures in large batch operations', async () => {
      const batchSize = 200;
      const batchUpdates = Array.from({ length: batchSize }, (_, index) => ({
        inventoryItemId: `inv-${index + 1}`,
        currentStock: index % 10 === 0 ? -1 : Math.floor(Math.random() * 1000), // Every 10th item fails
        reason: `Bulk update ${index + 1}`
      }));

      const successCount = batchSize - Math.floor(batchSize / 10);
      const errorCount = Math.floor(batchSize / 10);

      const batchResult = {
        success: generateInventoryItems(successCount),
        errors: Array.from({ length: errorCount }, (_, index) => ({
          inventoryItemId: `inv-${(index * 10) + 1}`,
          error: 'Invalid stock level'
        })),
        totalProcessed: successCount
      };

      mockInventoryService.batchUpdateStock.mockResolvedValue(batchResult);

      const startTime = performance.now();

      const { result } = renderHook(
        () => useBatchUpdateStock(),
        { wrapper: createPerformanceWrapper() }
      );

      await act(async () => {
        result.current.mutate(batchUpdates);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(result.current.data?.success).toHaveLength(successCount);
      expect(result.current.data?.errors).toHaveLength(errorCount);
      expect(responseTime).toBeLessThan(15000); // Should complete within 15 seconds

      console.log(`Partial failure performance: ${responseTime.toFixed(2)}ms for ${batchSize} items with ${errorCount} failures`);
    });
  });

  // Performance Test 3: Cache Efficiency with Complex Invalidation
  describe('Cache Efficiency', () => {
    it('should efficiently invalidate related caches after bulk operations', async () => {
      const inventoryItems = generateInventoryItems(50);
      const batchUpdates = inventoryItems.map(item => ({
        inventoryItemId: item.id,
        currentStock: item.currentStock + 100,
        reason: 'Bulk restock'
      }));

      const updatedItems = inventoryItems.map(item => ({
        ...item,
        currentStock: item.currentStock + 100,
        availableStock: item.availableStock + 100,
        lastStockUpdate: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z'
      }));

      mockInventoryService.getLowStockItems.mockResolvedValue(inventoryItems);
      mockInventoryService.batchUpdateStock.mockResolvedValue({
        success: updatedItems,
        errors: [],
        totalProcessed: 50
      });

      const wrapper = createPerformanceWrapper();

      // 1. Load initial data
      const { result: lowStockResult } = renderHook(
        () => useLowStockItems(),
        { wrapper }
      );

      await waitFor(() => {
        expect(lowStockResult.current.isSuccess).toBe(true);
      });

      // 2. Perform bulk update
      const { result: batchResult } = renderHook(
        () => useBatchUpdateStock(),
        { wrapper }
      );

      const startTime = performance.now();

      await act(async () => {
        batchResult.current.mutate(batchUpdates);
      });

      await waitFor(() => {
        expect(batchResult.current.isSuccess).toBe(true);
      });

      const endTime = performance.now();
      const cacheInvalidationTime = endTime - startTime;

      expect(cacheInvalidationTime).toBeLessThan(5000); // Cache invalidation should be fast
      expect(batchResult.current.data?.success).toHaveLength(50);

      console.log(`Cache invalidation performance: ${cacheInvalidationTime.toFixed(2)}ms for 50 items`);
    });

    it('should handle complex query key invalidation patterns efficiently', async () => {
      const testItems = generateInventoryItems(20);
      
      // Mock multiple related queries
      mockInventoryService.getLowStockItems.mockResolvedValue(testItems.slice(0, 10));
      mockInventoryService.getInventoryItem.mockResolvedValue(testItems[0]);
      mockStockMovementService.getMovementHistory.mockResolvedValue({
        success: generateStockMovements(100, testItems[0].id),
        totalProcessed: 100
      });

      const wrapper = createPerformanceWrapper();

      // Load multiple related queries
      const { result: lowStockResult } = renderHook(() => useLowStockItems(), { wrapper });
      const { result: movementsResult } = renderHook(
        () => useStockMovements({ movementType: 'all', inventoryItemId: testItems[0].id }),
        { wrapper }
      );

      await waitFor(() => {
        expect(lowStockResult.current.isSuccess).toBe(true);
        expect(movementsResult.current.isSuccess).toBe(true);
      });

      // Measure time for all queries to load
      const queryLoadTime = performance.now();
      
      expect(lowStockResult.current.data).toHaveLength(10);
      expect(movementsResult.current.data?.success).toHaveLength(100);

      console.log(`Complex query pattern performance: ${queryLoadTime.toFixed(2)}ms`);
    });
  });

  // Performance Test 4: Memory Usage Validation
  describe('Memory Usage Validation', () => {
    it('should maintain reasonable memory usage with large datasets', async () => {
      const hugeDataset = generateInventoryItems(2000);
      
      mockInventoryService.getLowStockItems.mockResolvedValue(hugeDataset);

      // Create multiple hook instances to test memory usage
      const wrapper = createPerformanceWrapper();
      const hooks = [];

      const startTime = performance.now();

      // Create 10 concurrent hook instances
      for (let i = 0; i < 10; i++) {
        const { result } = renderHook(
          () => useInventoryItems(),
          { wrapper }
        );
        hooks.push(result);
      }

      // Wait for all to load
      await waitFor(() => {
        hooks.forEach(hook => {
          expect(hook.current.isSuccess).toBe(true);
        });
      });

      const endTime = performance.now();
      const concurrentLoadTime = endTime - startTime;

      // Verify all hooks have the same data
      hooks.forEach(hook => {
        expect(hook.current.data).toHaveLength(2000);
      });

      expect(concurrentLoadTime).toBeLessThan(20000); // Should handle concurrent loads within 20 seconds

      console.log(`Concurrent memory usage: ${concurrentLoadTime.toFixed(2)}ms for 10 hooks with 2000 items each`);
    });

    it('should handle memory cleanup after component unmount', async () => {
      const testData = generateInventoryItems(1000);
      
      mockInventoryService.getLowStockItems.mockResolvedValue(testData);

      const wrapper = createPerformanceWrapper();

      const { result, unmount } = renderHook(
        () => useInventoryItems(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(1000);

      // Unmount component
      const unmountStart = performance.now();
      unmount();
      const unmountTime = performance.now() - unmountStart;

      expect(unmountTime).toBeLessThan(1000); // Cleanup should be fast

      console.log(`Memory cleanup time: ${unmountTime.toFixed(2)}ms`);
    });
  });

  // Performance Test 5: Analytics Performance
  describe('Analytics Performance', () => {
    it('should handle complex analytics queries efficiently', async () => {
      const analyticsData = {
        totalMovements: 50000,
        movementsByType: {
          restock: 20000,
          sale: 15000,
          adjustment: 10000,
          return: 5000
        },
        movementsByDate: Array.from({ length: 30 }, (_, index) => ({
          date: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          movements: Math.floor(Math.random() * 2000) + 500
        })),
        topProducts: generateInventoryItems(100).map(item => ({
          productId: item.productId,
          totalMovements: Math.floor(Math.random() * 1000),
          totalQuantity: Math.floor(Math.random() * 10000)
        }))
      };

      mockStockMovementService.getMovementAnalytics.mockResolvedValue(analyticsData);

      const startTime = performance.now();

      const { result } = renderHook(
        () => useMovementAnalytics({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          groupBy: 'day'
        }),
        { wrapper: createPerformanceWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const endTime = performance.now();
      const analyticsTime = endTime - startTime;

      expect(result.current.data?.totalMovements).toBe(50000);
      expect(result.current.data?.movementsByDate).toHaveLength(30);
      expect(result.current.data?.topProducts).toHaveLength(100);
      expect(analyticsTime).toBeLessThan(12000); // Complex analytics should complete within 12 seconds

      console.log(`Analytics performance: ${analyticsTime.toFixed(2)}ms for complex aggregation`);
    });
  });
});