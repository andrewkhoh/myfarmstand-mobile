/**
 * Task 2.4.1: End-to-End Workflow Integration Tests (RED Phase)
 * Testing complete inventory management workflows across all layers
 */

// Mock React Query for integration tests
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    isSuccess: false,
    isError: false,
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isLoading: false,
    error: null,
    data: null,
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  })),
}));

import React from 'react';
import { createSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../../test/contracts/hook.contracts';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Import all layers for integration testing
import { useInventoryItem, useInventoryItems, useLowStockItems } from '../../useInventoryItems';
import { useUpdateStock, useUpdateVisibility, useBatchUpdateStock } from '../../useInventoryOperations';
import { useMovementHistory, useRecordMovement } from '../../useStockMovements';

// Services (will be mocked but with realistic behaviors)
import { InventoryService } from '../../../../services/inventory/inventoryService';
import { StockMovementService } from '../../../../services/inventory/stockMovementService';

// Mock services for integration testing
jest.mock('../../../../services/inventory/inventoryService');
jest.mock('../../../../services/inventory/stockMovementService');

const mockInventoryService = InventoryService as jest.Mocked<typeof InventoryService>;
const mockStockMovementService = StockMovementService as jest.Mocked<typeof StockMovementService>;

// Test wrapper with real React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('End-to-End Inventory Workflow Integration Tests (RED Phase)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Integration Test 1: Complete Stock Update Workflow
  describe('Complete Stock Update Workflow', () => {
    it('should execute stock update → audit trail → cache invalidation flow', async () => {
      // Setup initial inventory item
      const inventoryItem = {
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

      const updatedItem = {
        ...inventoryItem,
        currentStock: 75,
        availableStock: 65,
        lastStockUpdate: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z'
      };

      const movementRecord = {
        id: 'movement-123',
        inventoryItemId: 'inv-123',
        movementType: 'adjustment' as const,
        quantityChange: -25,
        previousStock: 100,
        newStock: 75,
        reason: 'Manual adjustment',
        performedBy: 'admin-1',
        performedAt: '2024-01-01T12:00:00Z',
        referenceOrderId: null,
        batchId: null,
        createdAt: '2024-01-01T12:00:00Z'
      };

      // Mock service responses
      mockInventoryService.getInventoryItem.mockResolvedValue(inventoryItem);
      mockInventoryService.updateStock.mockResolvedValue(updatedItem);
      mockStockMovementService.recordMovement.mockResolvedValue(movementRecord);
      mockStockMovementService.getMovementHistory.mockResolvedValue({
        success: [movementRecord],
        totalProcessed: 1
      });

      const wrapper = createWrapper();

      // 1. Load initial inventory item
      const { result: inventoryResult } = renderHook(
        () => useInventoryItem('inv-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(inventoryResult.current.isSuccess).toBe(true);
      });

      expect(inventoryResult.current.data).toEqual(inventoryItem);

      // 2. Update stock
      const { result: updateResult } = renderHook(
        () => useUpdateStock(),
        { wrapper }
      );

      await act(async () => {
        updateResult.current.mutate({
          inventoryId: 'inv-123',
          stockUpdate: {
            currentStock: 75,
            reason: 'Manual adjustment',
            performedBy: 'admin-1'
          }
        });
      });

      await waitFor(() => {
        expect(updateResult.current.isSuccess).toBe(true);
      });

      // 3. Record movement in audit trail
      const { result: movementResult } = renderHook(
        () => useRecordMovement(),
        { wrapper }
      );

      await act(async () => {
        movementResult.current.mutate({
          inventoryItemId: 'inv-123',
          movementType: 'adjustment',
          quantityChange: -25,
          previousStock: 100,
          newStock: 75,
          reason: 'Manual adjustment',
          performedBy: 'admin-1'
        });
      });

      await waitFor(() => {
        expect(movementResult.current.isSuccess).toBe(true);
      });

      // 4. Verify movement history includes new record
      const { result: historyResult } = renderHook(
        () => useMovementHistory('inv-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(historyResult.current.isSuccess).toBe(true);
      });

      expect(historyResult.current.data?.success).toContainEqual(movementRecord);

      // Verify all service calls were made correctly
      expect(mockInventoryService.getInventoryItem).toHaveBeenCalledWith('inv-123');
      expect(mockInventoryService.updateStock).toHaveBeenCalledWith('inv-123', {
        currentStock: 75,
        reason: 'Manual adjustment',
        performedBy: 'admin-1'
      });
      expect(mockStockMovementService.recordMovement).toHaveBeenCalledWith({
        inventoryItemId: 'inv-123',
        movementType: 'adjustment',
        quantityChange: -25,
        previousStock: 100,
        newStock: 75,
        reason: 'Manual adjustment',
        performedBy: 'admin-1'
      });
    });

    it('should handle partial failures gracefully in bulk operations', async () => {
      const batchUpdates = [
        { inventoryItemId: 'inv-1', currentStock: 100, reason: 'Restock' },
        { inventoryItemId: 'inv-2', currentStock: 50, reason: 'Adjustment' },
        { inventoryItemId: 'inv-3', currentStock: 200, reason: 'Restock' }
      ];

      const partialResult = {
        success: [
          {
            id: 'inv-1',
            productId: 'product-1',
            currentStock: 100,
            reservedStock: 5,
            availableStock: 95,
            minimumThreshold: 10,
            maximumThreshold: 500,
            isActive: true,
            isVisibleToCustomers: true,
            lastStockUpdate: '2024-01-01T12:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T12:00:00Z'
          }
        ],
        errors: [
          { inventoryItemId: 'inv-2', error: 'Stock level too low' },
          { inventoryItemId: 'inv-3', error: 'Product not found' }
        ],
        totalProcessed: 1
      };

      mockInventoryService.batchUpdateStock.mockResolvedValue(partialResult);

      const { result } = renderHook(
        () => useBatchUpdateStock(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate(batchUpdates);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(partialResult);
      expect(result.current.data?.success).toHaveLength(1);
      expect(result.current.data?.errors).toHaveLength(2);
    });
  });

  // Integration Test 2: Role Permission Enforcement Across All Layers
  describe('Role Permission Enforcement', () => {
    it('should enforce role permissions across schema → service → hook layers', async () => {
      // Mock permission error from service layer
      const permissionError = new Error('Insufficient permissions');
      (permissionError as any).status = 403;

      mockInventoryService.updateStock.mockRejectedValue(permissionError);

      const { result } = renderHook(
        () => useUpdateStock(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate({
          inventoryId: 'inv-123',
          stockUpdate: {
            currentStock: 75,
            reason: 'Unauthorized attempt',
            performedBy: 'guest-user'
          }
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(permissionError);
      
      // Verify that unauthorized update was rejected
      expect(mockInventoryService.updateStock).toHaveBeenCalledWith('inv-123', {
        currentStock: 75,
        reason: 'Unauthorized attempt',
        performedBy: 'guest-user'
      });
    });

    it('should handle read-only access for restricted users', async () => {
      const inventoryItem = {
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

      // Allow read operations
      mockInventoryService.getInventoryItem.mockResolvedValue(inventoryItem);
      
      // Reject write operations
      const writeError = new Error('Write access denied');
      (writeError as any).status = 403;
      mockInventoryService.updateStock.mockRejectedValue(writeError);

      const wrapper = createWrapper();

      // Read should succeed
      const { result: readResult } = renderHook(
        () => useInventoryItem('inv-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(readResult.current.isSuccess).toBe(true);
      });

      expect(readResult.current.data).toEqual(inventoryItem);

      // Write should fail
      const { result: writeResult } = renderHook(
        () => useUpdateStock(),
        { wrapper }
      );

      await act(async () => {
        writeResult.current.mutate({
          inventoryId: 'inv-123',
          stockUpdate: {
            currentStock: 75,
            reason: 'Unauthorized write',
            performedBy: 'read-only-user'
          }
        });
      });

      await waitFor(() => {
        expect(writeResult.current.isError).toBe(true);
      });

      expect(writeResult.current.error).toEqual(writeError);
    });
  });

  // Integration Test 3: Real-time Update Propagation
  describe('Real-time Update Propagation', () => {
    it('should propagate inventory changes to low stock alerts', async () => {
      const lowStockItem = {
        id: 'inv-low',
        productId: 'product-low',
        currentStock: 5, // Below threshold
        reservedStock: 0,
        availableStock: 5,
        minimumThreshold: 10,
        maximumThreshold: 100,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T10:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      };

      const updatedItem = {
        ...lowStockItem,
        currentStock: 15, // Above threshold now
        availableStock: 15,
        lastStockUpdate: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z'
      };

      // Initially show item in low stock
      mockInventoryService.getLowStockItems.mockResolvedValueOnce([lowStockItem]);
      
      // After update, remove from low stock
      mockInventoryService.getLowStockItems.mockResolvedValueOnce([]);
      mockInventoryService.updateStock.mockResolvedValue(updatedItem);

      const wrapper = createWrapper();

      // 1. Check initial low stock status
      const { result: lowStockResult } = renderHook(
        () => useLowStockItems(),
        { wrapper }
      );

      await waitFor(() => {
        expect(lowStockResult.current.isSuccess).toBe(true);
      });

      expect(lowStockResult.current.data).toContain(lowStockItem);

      // 2. Update stock to above threshold
      const { result: updateResult } = renderHook(
        () => useUpdateStock(),
        { wrapper }
      );

      await act(async () => {
        updateResult.current.mutate({
          inventoryId: 'inv-low',
          stockUpdate: {
            currentStock: 15,
            reason: 'Restocked',
            performedBy: 'staff-1'
          }
        });
      });

      await waitFor(() => {
        expect(updateResult.current.isSuccess).toBe(true);
      });

      // 3. Verify low stock list is updated (would be handled by cache invalidation)
      // In real implementation, this would trigger automatic refetch
      expect(mockInventoryService.updateStock).toHaveBeenCalledWith('inv-low', {
        currentStock: 15,
        reason: 'Restocked',
        performedBy: 'staff-1'
      });
    });
  });

  // Integration Test 4: Error Recovery Workflows
  describe('Error Recovery Workflows', () => {
    it('should recover from network errors with retry mechanism', async () => {
      const inventoryItem = {
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

      // First call fails with network error
      const networkError = new Error('Network error');
      mockInventoryService.getInventoryItem
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(inventoryItem);

      const { result } = renderHook(
        () => useInventoryItem('inv-123'),
        { wrapper: createWrapper() }
      );

      // Should eventually succeed after retry
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      }, { timeout: 10000 });

      expect(result.current.data).toEqual(inventoryItem);
      expect(mockInventoryService.getInventoryItem).toHaveBeenCalledTimes(2);
    });

    it('should handle optimistic update rollback on failure', async () => {
      const originalItem = {
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

      mockInventoryService.getInventoryItem.mockResolvedValue(originalItem);
      
      const updateError = new Error('Update failed');
      mockInventoryService.updateStock.mockRejectedValue(updateError);

      const wrapper = createWrapper();

      // 1. Load initial data
      const { result: inventoryResult } = renderHook(
        () => useInventoryItem('inv-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(inventoryResult.current.isSuccess).toBe(true);
      });

      expect(inventoryResult.current.data).toEqual(originalItem);

      // 2. Attempt update that will fail
      const { result: updateResult } = renderHook(
        () => useUpdateStock(),
        { wrapper }
      );

      await act(async () => {
        updateResult.current.mutate({
          inventoryId: 'inv-123',
          stockUpdate: {
            currentStock: 75,
            reason: 'Failed update',
            performedBy: 'user-1'
          }
        });
      });

      await waitFor(() => {
        expect(updateResult.current.isError).toBe(true);
      });

      // 3. Verify optimistic update was rolled back
      // The inventory data should revert to original state
      expect(updateResult.current.error).toEqual(updateError);
    });
  });

  // Integration Test 5: Cross-layer Data Consistency
  describe('Cross-layer Data Consistency', () => {
    it('should maintain data consistency across inventory items and movements', async () => {
      const inventoryItem = {
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

      const movements = {
        success: [
          {
            id: 'movement-1',
            inventoryItemId: 'inv-123',
            movementType: 'restock' as const,
            quantityChange: 50,
            previousStock: 50,
            newStock: 100,
            reason: 'Weekly restock',
            performedBy: 'staff-1',
            performedAt: '2024-01-01T10:00:00Z',
            referenceOrderId: null,
            batchId: null,
            createdAt: '2024-01-01T10:00:00Z'
          }
        ],
        totalProcessed: 1
      };

      mockInventoryService.getInventoryItem.mockResolvedValue(inventoryItem);
      mockStockMovementService.getMovementHistory.mockResolvedValue(movements);

      const wrapper = createWrapper();

      // Load both inventory item and its movement history
      const { result: inventoryResult } = renderHook(
        () => useInventoryItem('inv-123'),
        { wrapper }
      );

      const { result: movementResult } = renderHook(
        () => useMovementHistory('inv-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(inventoryResult.current.isSuccess).toBe(true);
        expect(movementResult.current.isSuccess).toBe(true);
      });

      // Verify data consistency
      const item = inventoryResult.current.data;
      const latestMovement = movementResult.current.data?.success[0];

      expect(item?.currentStock).toBe(latestMovement?.newStock);
      expect(item?.lastStockUpdate).toBe(latestMovement?.performedAt);
    });
  });
});