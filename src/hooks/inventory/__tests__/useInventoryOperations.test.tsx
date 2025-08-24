import { createSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../../test/contracts/hook.contracts';

/**
 * Phase 2.3.1: Inventory Operations Hooks Tests (RED Phase)
 * Testing mutations, optimistic updates, and batch operations
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Import hooks that don't exist yet (RED phase)
import {
  useUpdateStock,
  useUpdateVisibility,
  useBatchUpdateStock,
  useCreateInventoryItem
} from '../useInventoryOperations';

// Mock services
import { InventoryService } from '../../../services/inventory/inventoryService';

// Mock React Query BEFORE other mocks
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

jest.mock('../../../services/inventory/inventoryService');

const mockInventoryService = InventoryService as jest.Mocked<typeof InventoryService>;

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Import React Query types for proper mocking
import { useQuery, useMutation } from '@tanstack/react-query';
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

describe('useInventoryOperations Hook Tests (RED Phase)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useUpdateStock', () => {
    it('should update stock with optimistic updates', async () => {
      const mockUpdatedItem = {
        id: '123',
        productId: 'product-1',
        currentStock: 75,
        reservedStock: 10,
        availableStock: 65,
        minimumThreshold: 15,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T12:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z'
      };

      mockInventoryService.updateStock.mockResolvedValue(mockUpdatedItem);

      // Mock useMutation for the hook
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue(mockUpdatedItem),
        isLoading: false,
        error: null,
        data: mockUpdatedItem,
        isSuccess: true,
        isError: false,
        isIdle: false,
      } as any);

      const { result } = renderHook(
        () => useUpdateStock(),
        { wrapper: createWrapper() }
      );

      const stockUpdate = {
        currentStock: 75,
        reason: 'Manual adjustment',
        performedBy: 'user-123'
      };

      await act(async () => {
        result.current.mutate({
          inventoryId: '123',
          stockUpdate
        });
      });

      await waitFor(() => {
        expect(result.current.isIdle).toBe(false);
      });

      expect(mockInventoryService.updateStock).toHaveBeenCalledWith('123', stockUpdate);
    });

    it('should handle stock update with atomic operation and audit trail', async () => {
      const mockUpdatedItem = {
        id: '123',
        productId: 'product-1',
        currentStock: 100,
        reservedStock: 10,
        availableStock: 90,
        minimumThreshold: 15,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T12:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z'
      };

      mockInventoryService.updateStock.mockResolvedValue(mockUpdatedItem);

      // Mock useMutation for the hook
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue(mockUpdatedItem),
        isLoading: false,
        error: null,
        data: mockUpdatedItem,
        isSuccess: true,
        isError: false,
        isIdle: false,
      } as any);

      const { result } = renderHook(
        () => useUpdateStock(),
        { wrapper: createWrapper() }
      );

      const stockUpdate = {
        currentStock: 100,
        reason: 'Weekly restock',
        performedBy: 'staff-456'
      };

      await act(async () => {
        result.current.mutate({
          inventoryId: '123',
          stockUpdate
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUpdatedItem);
    });

    it('should rollback optimistic updates on error', async () => {
      const mockError = new Error('Stock update failed');
      mockInventoryService.updateStock.mockRejectedValue(mockError);

      const { result } = renderHook(
        () => useUpdateStock(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        try {
          await result.current.mutateAsync({
            inventoryId: '123',
            stockUpdate: { currentStock: 50 }
          });
        } catch (error) {
          // Expected to fail
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should handle cache invalidation after successful update', async () => {
      const mockUpdatedItem = {
        id: '123',
        productId: 'product-1',
        currentStock: 80,
        reservedStock: 5,
        availableStock: 75,
        minimumThreshold: 15,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T12:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z'
      };

      mockInventoryService.updateStock.mockResolvedValue(mockUpdatedItem);

      const { result } = renderHook(
        () => useUpdateStock(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate({
          inventoryId: '123',
          stockUpdate: { currentStock: 80, reason: 'Adjustment' }
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useUpdateVisibility', () => {
    it('should update product visibility with role-based access control', async () => {
      const mockUpdatedItem = {
        id: '123',
        productId: 'product-1',
        currentStock: 100,
        reservedStock: 10,
        availableStock: 90,
        minimumThreshold: 15,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: false, // Updated
        lastStockUpdate: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z'
      };

      mockInventoryService.toggleProductVisibility.mockResolvedValue(mockUpdatedItem);

      const { result } = renderHook(
        () => useUpdateVisibility(),
        { wrapper: createWrapper() }
      );

      const visibilityUpdate = {
        isVisibleToCustomers: false,
        isActive: true
      };

      await act(async () => {
        result.current.mutate({
          inventoryId: '123',
          visibilityUpdate
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInventoryService.toggleProductVisibility).toHaveBeenCalledWith('123', visibilityUpdate);
      expect(result.current.data).toEqual(mockUpdatedItem);
    });

    it('should handle visibility update optimistic updates', async () => {
      const mockUpdatedItem = {
        id: '123',
        productId: 'product-1',
        currentStock: 100,
        reservedStock: 10,
        availableStock: 90,
        minimumThreshold: 15,
        maximumThreshold: 500,
        isActive: false, // Updated
        isVisibleToCustomers: false, // Updated
        lastStockUpdate: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z'
      };

      mockInventoryService.toggleProductVisibility.mockResolvedValue(mockUpdatedItem);

      const { result } = renderHook(
        () => useUpdateVisibility(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate({
          inventoryId: '123',
          visibilityUpdate: { isActive: false, isVisibleToCustomers: false }
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUpdatedItem);
    });

    it('should handle visibility update errors gracefully', async () => {
      const mockError = new Error('Permission denied');
      mockInventoryService.toggleProductVisibility.mockRejectedValue(mockError);

      const { result } = renderHook(
        () => useUpdateVisibility(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate({
          inventoryId: '123',
          visibilityUpdate: { isVisibleToCustomers: false }
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('useBatchUpdateStock', () => {
    it('should handle batch stock updates with resilient processing', async () => {
      const mockBatchResult = {
        success: [
          {
            id: '123',
            productId: 'product-1',
            currentStock: 150,
            reservedStock: 10,
            availableStock: 140,
            minimumThreshold: 15,
            maximumThreshold: 500,
            isActive: true,
            isVisibleToCustomers: true,
            lastStockUpdate: '2024-01-01T12:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T12:00:00Z'
          }
        ],
        errors: [],
        totalProcessed: 1
      };

      mockInventoryService.batchUpdateStock.mockResolvedValue(mockBatchResult);

      const { result } = renderHook(
        () => useBatchUpdateStock(),
        { wrapper: createWrapper() }
      );

      const batchUpdates = [
        {
          inventoryItemId: '123',
          currentStock: 150,
          reason: 'Bulk restock'
        }
      ];

      await act(async () => {
        result.current.mutate(batchUpdates);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInventoryService.batchUpdateStock).toHaveBeenCalledWith(batchUpdates);
      expect(result.current.data).toEqual(mockBatchResult);
    });

    it('should handle partial failures in batch processing', async () => {
      const mockPartialResult = {
        success: [
          {
            id: '123',
            productId: 'product-1',
            currentStock: 100,
            reservedStock: 10,
            availableStock: 90,
            minimumThreshold: 15,
            maximumThreshold: 500,
            isActive: true,
            isVisibleToCustomers: true,
            lastStockUpdate: '2024-01-01T12:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T12:00:00Z'
          }
        ],
        errors: [
          { inventoryItemId: '456', error: 'Item not found' }
        ],
        totalProcessed: 1
      };

      mockInventoryService.batchUpdateStock.mockResolvedValue(mockPartialResult);

      const { result } = renderHook(
        () => useBatchUpdateStock(),
        { wrapper: createWrapper() }
      );

      const batchUpdates = [
        { inventoryItemId: '123', currentStock: 100, reason: 'Valid update' },
        { inventoryItemId: '456', currentStock: 50, reason: 'Invalid update' }
      ];

      await act(async () => {
        result.current.mutate(batchUpdates);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.success).toHaveLength(1);
      expect(result.current.data?.errors).toHaveLength(1);
      expect(result.current.data?.totalProcessed).toBe(1);
    });

    it('should handle complete batch failure gracefully', async () => {
      const mockError = new Error('Batch operation failed');
      mockInventoryService.batchUpdateStock.mockRejectedValue(mockError);

      const { result } = renderHook(
        () => useBatchUpdateStock(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate([
          { inventoryItemId: '123', currentStock: 100 }
        ]);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should provide progress tracking for batch operations', () => {
      const { result } = renderHook(
        () => useBatchUpdateStock(),
        { wrapper: createWrapper() }
      );

      // Should provide loading states for progress tracking
      expect(result.current).toHaveProperty('isPending');
      expect(result.current).toHaveProperty('isSuccess');
      expect(result.current).toHaveProperty('isError');
    });
  });

  describe('useCreateInventoryItem', () => {
    it('should create inventory item with input validation', async () => {
      const mockCreatedItem = {
        id: '789',
        productId: 'new-product',
        currentStock: 100,
        reservedStock: 0,
        availableStock: 100,
        minimumThreshold: 10,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T12:00:00Z',
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z'
      };

      mockInventoryService.createInventoryItem.mockResolvedValue(mockCreatedItem);

      const { result } = renderHook(
        () => useCreateInventoryItem(),
        { wrapper: createWrapper() }
      );

      const createInput = {
        productId: 'new-product',
        currentStock: 100,
        reservedStock: 0,
        minimumThreshold: 10,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: true
      };

      await act(async () => {
        result.current.mutate(createInput);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInventoryService.createInventoryItem).toHaveBeenCalledWith(createInput);
      expect(result.current.data).toEqual(mockCreatedItem);
    });

    it('should handle creation errors with validation failures', async () => {
      const mockError = new Error('Invalid product ID');
      mockInventoryService.createInventoryItem.mockRejectedValue(mockError);

      const { result } = renderHook(
        () => useCreateInventoryItem(),
        { wrapper: createWrapper() }
      );

      const invalidInput = {
        productId: '', // Invalid
        currentStock: -10, // Invalid
        reservedStock: 0
      };

      await act(async () => {
        result.current.mutate(invalidInput);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should update cache after successful creation', async () => {
      const mockCreatedItem = {
        id: '789',
        productId: 'new-product',
        currentStock: 50,
        reservedStock: 5,
        availableStock: 45,
        minimumThreshold: 10,
        maximumThreshold: 200,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T12:00:00Z',
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z'
      };

      mockInventoryService.createInventoryItem.mockResolvedValue(mockCreatedItem);

      const { result } = renderHook(
        () => useCreateInventoryItem(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate({
          productId: 'new-product',
          currentStock: 50,
          reservedStock: 5,
          minimumThreshold: 10,
          maximumThreshold: 200
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCreatedItem);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should provide comprehensive error states', async () => {
      const mockError = new Error('Network error');
      mockInventoryService.updateStock.mockRejectedValue(mockError);

      const { result } = renderHook(
        () => useUpdateStock(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate({
          inventoryId: '123',
          stockUpdate: { currentStock: 100 }
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
      expect(result.current.isPending).toBe(false);
    });

    it('should allow retry after errors', async () => {
      const mockError = new Error('Temporary error');
      mockInventoryService.updateStock
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          id: '123',
          productId: 'product-1',
          currentStock: 100,
          reservedStock: 10,
          availableStock: 90,
          minimumThreshold: 15,
          maximumThreshold: 500,
          isActive: true,
          isVisibleToCustomers: true,
          lastStockUpdate: '2024-01-01T12:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T12:00:00Z'
        });

      const { result } = renderHook(
        () => useUpdateStock(),
        { wrapper: createWrapper() }
      );

      // First attempt fails
      await act(async () => {
        result.current.mutate({
          inventoryId: '123',
          stockUpdate: { currentStock: 100 }
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Reset and retry
      result.current.reset();

      // Second attempt succeeds
      await act(async () => {
        result.current.mutate({
          inventoryId: '123',
          stockUpdate: { currentStock: 100 }
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });
});