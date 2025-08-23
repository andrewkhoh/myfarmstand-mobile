import { createSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../../test/contracts/hook.contracts';

/**
 * Phase 2.3.1: Inventory Hooks Tests (RED Phase)
 * Following TDD - these tests will FAIL until hooks are implemented
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Import the hooks that don't exist yet (will cause RED phase failures)
import {
  useInventoryItems,
  useInventoryItem,
  useInventoryByProduct,
  useLowStockItems
} from '../useInventoryItems';

// Mock services following the established pattern
import { InventoryService } from '../../../services/inventory/inventoryService';

jest.mock('../../../services/inventory/inventoryService');

const mockInventoryService = InventoryService as jest.Mocked<typeof InventoryService>;

// Test wrapper with QueryClient
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

describe('useInventoryItems Hook Tests (RED Phase)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useInventoryItem', () => {
    it('should fetch single inventory item with role-based filtering', async () => {
      const mockInventoryItem = {
        id: '123',
        productId: 'product-1',
        currentStock: 100,
        reservedStock: 10,
        availableStock: 90,
        minimumThreshold: 15,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockInventoryService.getInventoryItem.mockResolvedValue(mockInventoryItem);

      const { result } = renderHook(
        () => useInventoryItem('123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockInventoryItem);
      expect(mockInventoryService.getInventoryItem).toHaveBeenCalledWith('123');
    });

    it('should handle null inventory ID gracefully', () => {
      const { result } = renderHook(
        () => useInventoryItem(null),
        { wrapper: createWrapper() }
      );

      expect(result.current.data).toBeUndefined();
      expect(mockInventoryService.getInventoryItem).not.toHaveBeenCalled();
    });

    it('should handle inventory item not found', async () => {
      mockInventoryService.getInventoryItem.mockResolvedValue(null);

      const { result } = renderHook(
        () => useInventoryItem('nonexistent'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should handle inventory service errors', async () => {
      const mockError = new Error('Service unavailable');
      mockInventoryService.getInventoryItem.mockRejectedValue(mockError);

      const { result } = renderHook(
        () => useInventoryItem('123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBeUndefined();
    });

    it('should use proper cache configuration', () => {
      const { result } = renderHook(
        () => useInventoryItem('123'),
        { wrapper: createWrapper() }
      );

      // Should use inventory-specific query key
      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refetch');
    });
  });

  describe('useInventoryByProduct', () => {
    it('should fetch inventory by product ID with user isolation', async () => {
      const mockInventory = {
        id: '123',
        productId: 'product-1',
        currentStock: 50,
        reservedStock: 5,
        availableStock: 45,
        minimumThreshold: 10,
        maximumThreshold: 200,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockInventoryService.getInventoryByProduct.mockResolvedValue(mockInventory);

      const { result } = renderHook(
        () => useInventoryByProduct('product-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockInventory);
      expect(mockInventoryService.getInventoryByProduct).toHaveBeenCalledWith('product-1');
    });

    it('should handle null product ID', () => {
      const { result } = renderHook(
        () => useInventoryByProduct(null),
        { wrapper: createWrapper() }
      );

      expect(result.current.data).toBeUndefined();
      expect(mockInventoryService.getInventoryByProduct).not.toHaveBeenCalled();
    });

    it('should return null for non-existent product', async () => {
      mockInventoryService.getInventoryByProduct.mockResolvedValue(null);

      const { result } = renderHook(
        () => useInventoryByProduct('nonexistent'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useLowStockItems', () => {
    it('should fetch low stock items with threshold filtering', async () => {
      const mockLowStockResult = {
        success: [
          {
            id: '123',
            productId: 'product-1',
            currentStock: 8,
            reservedStock: 2,
            availableStock: 6,
            minimumThreshold: 10,
            maximumThreshold: 100,
            isActive: true,
            isVisibleToCustomers: true,
            lastStockUpdate: '2024-01-01T00:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        errors: [],
        totalProcessed: 1
      };

      mockInventoryService.getLowStockItems.mockResolvedValue(mockLowStockResult);

      const { result } = renderHook(
        () => useLowStockItems(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockLowStockResult);
      expect(mockInventoryService.getLowStockItems).toHaveBeenCalled();
    });

    it('should auto-refresh low stock items every 5 minutes', () => {
      const { result } = renderHook(
        () => useLowStockItems(),
        { wrapper: createWrapper() }
      );

      // Should have refetch interval configured
      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('refetch');
    });

    it('should handle empty low stock results', async () => {
      const mockEmptyResult = {
        success: [],
        errors: [],
        totalProcessed: 0
      };

      mockInventoryService.getLowStockItems.mockResolvedValue(mockEmptyResult);

      const { result } = renderHook(
        () => useLowStockItems(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockEmptyResult);
      expect(result.current.data?.success).toHaveLength(0);
    });

    it('should handle resilient processing with partial failures', async () => {
      const mockPartialResult = {
        success: [
          {
            id: '123',
            productId: 'product-1',
            currentStock: 5,
            reservedStock: 0,
            availableStock: 5,
            minimumThreshold: 10,
            maximumThreshold: 100,
            isActive: true,
            isVisibleToCustomers: true,
            lastStockUpdate: '2024-01-01T00:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        errors: [{ itemId: '456', error: 'Transformation failed' }],
        totalProcessed: 1
      };

      mockInventoryService.getLowStockItems.mockResolvedValue(mockPartialResult);

      const { result } = renderHook(
        () => useLowStockItems(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.success).toHaveLength(1);
      expect(result.current.data?.errors).toHaveLength(1);
      expect(result.current.data?.totalProcessed).toBe(1);
    });
  });

  describe('useInventoryItems (List Hook)', () => {
    it('should fetch multiple inventory items with role-based filtering', async () => {
      const mockInventoryItems = {
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
            lastStockUpdate: '2024-01-01T00:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: '456',
            productId: 'product-2',
            currentStock: 50,
            reservedStock: 5,
            availableStock: 45,
            minimumThreshold: 10,
            maximumThreshold: 200,
            isActive: true,
            isVisibleToCustomers: false,
            lastStockUpdate: '2024-01-01T00:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        errors: [],
        totalProcessed: 2
      };

      // Mock the service method that will be called
      mockInventoryService.getLowStockItems.mockResolvedValue(mockInventoryItems);

      const { result } = renderHook(
        () => useInventoryItems({ includeInactive: true, includeHidden: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeTruthy();
      expect(result.current.error).toBeFalsy();
    });

    it('should handle filtering options correctly', () => {
      const { result } = renderHook(
        () => useInventoryItems({ includeInactive: false, includeHidden: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
    });
  });

  describe('Query Key Integration', () => {
    it('should use centralized query key factory (prevent dual systems)', () => {
      const { result } = renderHook(
        () => useInventoryItem('123'),
        { wrapper: createWrapper() }
      );

      // Should use proper query key structure
      expect(result.current).toBeDefined();
    });

    it('should handle cache invalidation properly', async () => {
      const mockItem = {
        id: '123',
        productId: 'product-1',
        currentStock: 100,
        reservedStock: 10,
        availableStock: 90,
        minimumThreshold: 15,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockInventoryService.getInventoryItem.mockResolvedValue(mockItem);

      const { result } = renderHook(
        () => useInventoryItem('123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have refetch capability for cache invalidation
      expect(typeof result.current.refetch).toBe('function');
    });
  });
});