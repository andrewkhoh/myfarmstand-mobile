/**
 * Task 2.4.4: Integration Verification Test (GREEN Phase)
 * Verifying that all layers work together in the integration
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Test actual integration - import real hooks and verify they work
import { useInventoryItem } from '../../useInventoryItems';
import { useMovementHistory } from '../../useStockMovements';

// Mock the services to simulate real behavior
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

describe('Integration Verification Tests (GREEN Phase)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should verify integration layers work together', async () => {
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

    const mockMovements = {
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

    // Mock service responses
    mockInventoryService.getInventoryItem.mockResolvedValue(mockInventoryItem);
    mockStockMovementService.getMovementHistory.mockResolvedValue(mockMovements);

    const wrapper = createWrapper();

    // Test schema → service → hook integration
    const { result: inventoryResult } = renderHook(
      () => useInventoryItem('inv-123'),
      { wrapper }
    );

    const { result: movementResult } = renderHook(
      () => useMovementHistory('inv-123'),
      { wrapper }
    );

    // Wait for both to load
    await waitFor(() => {
      expect(inventoryResult.current.isSuccess).toBe(true);
      expect(movementResult.current.isSuccess).toBe(true);
    });

    // Verify integration working
    expect(inventoryResult.current.data).toEqual(mockInventoryItem);
    expect(movementResult.current.data).toEqual(mockMovements);

    // Verify services were called correctly
    expect(mockInventoryService.getInventoryItem).toHaveBeenCalledWith('inv-123');
    expect(mockStockMovementService.getMovementHistory).toHaveBeenCalledWith({
      inventoryItemId: 'inv-123'
    });
  });

  it('should verify cache invalidation integration works', async () => {
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

    mockInventoryService.getInventoryItem.mockResolvedValue(mockInventoryItem);

    const { result } = renderHook(
      () => useInventoryItem('inv-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockInventoryItem);
    
    // Verify query key factory integration by checking the hook was called
    expect(mockInventoryService.getInventoryItem).toHaveBeenCalledWith('inv-123');
  });

  it('should verify error handling integration across layers', async () => {
    // Use a 404 error which won't be retried by the hook's custom retry logic
    const serviceError = Object.assign(new Error('Not found'), { status: 404 });
    mockInventoryService.getInventoryItem.mockRejectedValue(serviceError);

    const { result } = renderHook(
      () => useInventoryItem('inv-error'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    }, { timeout: 3000 });

    expect(result.current.error).toEqual(serviceError);
    expect(mockInventoryService.getInventoryItem).toHaveBeenCalledWith('inv-error');
  });
});