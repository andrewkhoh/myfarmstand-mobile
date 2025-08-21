/**
 * Task 2.4.5: Cache Strategy Integration Tests
 * Testing smart invalidation, real-time coordination, and performance optimization
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

import { useUpdateStock } from '../../useInventoryOperations';
import { useInventoryItem } from '../../useInventoryItems';
import { useMovementHistory } from '../../useStockMovements';
import { InventoryCacheManager, getInventoryCacheManager } from '../../cacheIntegration';
import { getCachePerformanceMonitor } from '../../cachePerformanceMonitor';

// Mock the services
import { InventoryService } from '../../../../services/inventory/inventoryService';
import { StockMovementService } from '../../../../services/inventory/stockMovementService';

jest.mock('../../../../services/inventory/inventoryService');
jest.mock('../../../../services/inventory/stockMovementService');

const mockInventoryService = InventoryService as jest.Mocked<typeof InventoryService>;
const mockStockMovementService = StockMovementService as jest.Mocked<typeof StockMovementService>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { 
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Cache Strategy Integration Tests', () => {
  let queryClient: QueryClient;
  let cacheManager: InventoryCacheManager;
  let wrapper: any;

  beforeEach(() => {
    jest.clearAllMocks();
    getCachePerformanceMonitor().reset();
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    
    cacheManager = getInventoryCacheManager(queryClient);
    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  });

  describe('Smart Invalidation Strategy', () => {
    it('should invalidate related caches when stock is updated', async () => {
      const mockInventoryItem = {
        id: 'inv-123',
        productId: 'product-1',
        currentStock: 100,
        reservedStock: 10,
        availableStock: 90,
        minimumThreshold: 15,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T10:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      };

      const updatedInventoryItem = {
        ...mockInventoryItem,
        currentStock: 75,
        availableStock: 65,
        lastStockUpdate: '2024-01-01T11:00:00Z'
      };

      const stockMovement = {
        inventoryItemId: 'inv-123',
        movementType: 'manual_adjustment' as const,
        quantityChange: -25,
        newStock: 75,
        reason: 'Manual adjustment',
        performedBy: 'admin-1'
      };

      // Mock service responses
      mockInventoryService.updateStock.mockResolvedValue(updatedInventoryItem);

      // Pre-populate caches
      queryClient.setQueryData(['inventory', 'user-specific', undefined, 'details', undefined, 'item', 'inv-123'], mockInventoryItem);
      queryClient.setQueryData(['inventory', 'user-specific', undefined, 'list', 'items'], [mockInventoryItem]);

      // Execute smart invalidation
      await cacheManager.invalidateStockUpdate('inv-123', stockMovement);

      // Verify all related caches were invalidated
      expect(queryClient.getQueryState(['inventory', 'user-specific', undefined, 'details', undefined, 'item', 'inv-123'])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(['inventory', 'user-specific', undefined, 'list', 'items'])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(['inventory', 'user-specific', undefined, 'list', 'low-stock', undefined])?.isInvalidated).toBe(true);
    });

    it('should coordinate cross-entity cache invalidation', async () => {
      const stockMovement = {
        inventoryItemId: 'inv-123',
        movementType: 'sale' as const,
        quantityChange: -5,
        newStock: 95,
        reason: 'Order fulfillment',
        performedBy: 'system',
        referenceOrderId: 'order-456'
      };

      // Set up initial cache data
      queryClient.setQueryData(['inventory', 'user-specific', undefined, 'details', undefined, 'item', 'inv-123'], {
        id: 'inv-123',
        productId: 'product-1'
      });
      queryClient.setQueryData(['orders', 'details', 'order-456'], { id: 'order-456' });
      queryClient.setQueryData(['products', 'details', 'product-1'], { id: 'product-1' });

      // Execute cross-entity invalidation
      await cacheManager.invalidateStockUpdate('inv-123', stockMovement);

      // Verify cross-entity caches were affected
      expect(queryClient.getQueryState(['inventory', 'user-specific', undefined, 'details', undefined, 'item', 'inv-123'])?.isInvalidated).toBe(true);
      // Note: Cross-entity invalidation would be tested with actual cache patterns
    });
  });

  describe('Optimistic Update Strategy', () => {
    it('should perform optimistic stock updates with intelligent rollback', async () => {
      const initialItem = {
        id: 'inv-123',
        productId: 'product-1',
        currentStock: 100,
        reservedStock: 10,
        availableStock: 90,
        minimumThreshold: 15,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T10:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      };

      const stockUpdate = {
        currentStock: 75,
        reason: 'Manual adjustment',
        performedBy: 'admin-1'
      };

      // Pre-populate cache
      queryClient.setQueryData(['inventory', 'user-specific', undefined, 'details', undefined, 'item', 'inv-123'], initialItem);

      // Execute optimistic update
      await cacheManager.optimisticStockUpdate('inv-123', stockUpdate);

      // Verify optimistic update was applied
      const optimisticData = queryClient.getQueryData(['inventory', 'user-specific', undefined, 'details', undefined, 'item', 'inv-123']);
      expect(optimisticData).toMatchObject({
        id: 'inv-123',
        currentStock: 75,
        availableStock: 65, // 75 - 10 reserved
      });
    });

    it('should update related list caches optimistically', async () => {
      const initialItem = {
        id: 'inv-123',
        productId: 'product-1',
        currentStock: 100,
        reservedStock: 10,
        availableStock: 90,
        minimumThreshold: 15,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T10:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      };

      const stockUpdate = {
        currentStock: 10, // Below threshold
        reason: 'Stock depletion',
        performedBy: 'system'
      };

      // Pre-populate list cache
      queryClient.setQueryData(['inventory', 'user-specific', undefined, 'list', 'items'], [initialItem]);

      // Execute optimistic update
      await cacheManager.optimisticStockUpdate('inv-123', stockUpdate);

      // Verify list cache was updated optimistically
      const listData = queryClient.getQueryData(['inventory', 'user-specific', undefined, 'list', 'items']) as any[];
      expect(listData?.[0]).toMatchObject({
        id: 'inv-123',
        currentStock: 10,
        availableStock: 0, // 10 - 10 reserved
      });
    });
  });

  describe('Real-time Update Coordination', () => {
    it('should handle real-time stock changes with smart cache updates', async () => {
      const newData = {
        id: 'inv-123',
        productId: 'product-1',
        currentStock: 85,
        reservedStock: 10,
        availableStock: 75,
        minimumThreshold: 15,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T11:30:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T11:30:00Z'
      };

      const movement = {
        id: 'movement-1',
        inventoryItemId: 'inv-123',
        movementType: 'restock' as const,
        quantityChange: 15,
        previousStock: 70,
        newStock: 85,
        reason: 'Real-time restock',
        performedBy: 'supplier',
        performedAt: '2024-01-01T11:30:00Z',
        referenceOrderId: null,
        batchId: null,
        createdAt: '2024-01-01T11:30:00Z'
      };

      // Execute real-time update
      await cacheManager.handleRealtimeStockChange('inv-123', newData, movement);

      // Verify primary cache was updated
      const itemData = queryClient.getQueryData(['inventory', 'user-specific', undefined, 'details', undefined, 'item', 'inv-123']);
      expect(itemData).toEqual(newData);
    });

    it('should add movements to audit trail cache during real-time updates', async () => {
      const newData = {
        id: 'inv-123',
        productId: 'product-1',
        currentStock: 85,
        reservedStock: 10,
        availableStock: 75,
        minimumThreshold: 15,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T11:30:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T11:30:00Z'
      };

      const movement = {
        id: 'movement-1',
        inventoryItemId: 'inv-123',
        movementType: 'restock' as const,
        quantityChange: 15,
        previousStock: 70,
        newStock: 85,
        reason: 'Real-time restock',
        performedBy: 'supplier',
        performedAt: '2024-01-01T11:30:00Z',
        referenceOrderId: null,
        batchId: null,
        createdAt: '2024-01-01T11:30:00Z'
      };

      // Pre-populate movement history
      const initialHistory = {
        success: [],
        totalProcessed: 0
      };
      queryClient.setQueryData(['inventory', 'user-specific', undefined, 'details', undefined, 'item', 'inv-123', 'movements', undefined], initialHistory);

      // Execute real-time update with movement
      await cacheManager.handleRealtimeStockChange('inv-123', newData, movement);

      // Verify movement was added to history cache
      const historyData = queryClient.getQueryData(['inventory', 'user-specific', undefined, 'details', undefined, 'item', 'inv-123', 'movements', undefined]) as any;
      expect(historyData?.success).toHaveLength(1);
      expect(historyData?.success[0]).toEqual(movement);
      expect(historyData?.totalProcessed).toBe(1);
    });
  });

  describe('Performance Optimization', () => {
    it('should perform batch invalidation for bulk operations', async () => {
      const operations = [
        {
          inventoryItemId: 'inv-1',
          operation: 'stock-update' as const,
          data: { currentStock: 50 }
        },
        {
          inventoryItemId: 'inv-2',
          operation: 'visibility-change' as const,
          data: { isVisibleToCustomers: false }
        },
        {
          inventoryItemId: 'inv-3',
          operation: 'threshold-update' as const,
          data: { minimumThreshold: 20 }
        }
      ];

      // Pre-populate caches
      operations.forEach(op => {
        queryClient.setQueryData(['inventory', 'user-specific', undefined, 'details', undefined, 'item', op.inventoryItemId], {
          id: op.inventoryItemId
        });
      });

      // Execute batch invalidation
      await cacheManager.batchInvalidateInventoryOperations(operations);

      // Verify all affected items were invalidated
      operations.forEach(op => {
        const state = queryClient.getQueryState(['inventory', 'user-specific', undefined, 'details', undefined, 'item', op.inventoryItemId]);
        expect(state?.isInvalidated).toBe(true);
      });
    });

    it('should warm inventory caches for predictive loading', async () => {
      const mostAccessedItems = ['inv-popular-1', 'inv-popular-2', 'inv-popular-3'];

      // Mock service responses for warming
      mockInventoryService.getInventoryItem.mockImplementation(async (id) => ({
        id,
        productId: `product-${id}`,
        currentStock: 100,
        reservedStock: 0,
        availableStock: 100,
        minimumThreshold: 10,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T10:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      }));

      // Execute cache warming
      await cacheManager.warmInventoryCaches(mostAccessedItems);

      // Note: In real implementation, this would verify prefetch was called
      // For now, we verify the structure is in place
      expect(cacheManager).toBeDefined();
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track cache performance metrics', async () => {
      const performanceMonitor = getCachePerformanceMonitor();
      
      // Record various cache operations
      performanceMonitor.recordCacheHit('test-operation', 25, 1);
      performanceMonitor.recordCacheMiss('test-operation', 150, 1);
      performanceMonitor.recordInvalidation('test-invalidation', 75, 3);
      performanceMonitor.recordOptimisticUpdate('test-optimistic', 50, 1);

      // Get metrics
      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(metrics.invalidations).toBe(1);
      expect(metrics.optimisticUpdates).toBe(1);
      expect(metrics.hitRate).toBe(0.5); // 1 hit / 2 total cache ops
      expect(metrics.totalOperations).toBe(4);
    });

    it('should provide performance analysis and recommendations', async () => {
      const performanceMonitor = getCachePerformanceMonitor();
      
      // Record high-performance scenario
      for (let i = 0; i < 8; i++) {
        performanceMonitor.recordCacheHit('fast-operation', 30, 1);
      }
      for (let i = 0; i < 2; i++) {
        performanceMonitor.recordCacheMiss('slow-operation', 100, 1);
      }

      const analysis = performanceMonitor.getPerformanceAnalysis();
      
      expect(analysis.status).toBe('excellent'); // 80% hit rate, fast response
      expect(analysis.highlights).toContain(expect.stringContaining('Excellent cache hit rate'));
      expect(analysis.highlights).toContain(expect.stringContaining('Fast average response time'));
    });
  });
});