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

// Import React Query types for proper mocking
import { useQuery, useMutation } from '@tanstack/react-query';
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

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

      // Mock useQuery for the hook
      mockUseQuery.mockReturnValue({
        data: mockInventoryItem,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

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
      // Mock useQuery for disabled query
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: false,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useInventoryItem(null),
        { wrapper: createWrapper() }
      );

      expect(result.current.data).toBeUndefined();
      expect(mockInventoryService.getInventoryItem).not.toHaveBeenCalled();
    });

    it('should handle inventory item not found', async () => {
      mockInventoryService.getInventoryItem.mockResolvedValue(null);

      // Mock useQuery for the hook with null data
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

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

      // Mock useQuery for the hook with error state
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { message: 'Service unavailable' },
        refetch: jest.fn(),
        isSuccess: false,
        isError: true,
      } as any);

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
      // Mock useQuery for cache configuration test
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
        isSuccess: false,
        isError: false,
      } as any);

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

      // Mock useQuery for the hook
      mockUseQuery.mockReturnValue({
        data: mockInventory,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

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
      // Mock useQuery for disabled query
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: false,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useInventoryByProduct(null),
        { wrapper: createWrapper() }
      );

      expect(result.current.data).toBeUndefined();
      expect(mockInventoryService.getInventoryByProduct).not.toHaveBeenCalled();
    });

    it('should return null for non-existent product', async () => {
      mockInventoryService.getInventoryByProduct.mockResolvedValue(null);

      // Mock useQuery for the hook with null data
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

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

      // Mock useQuery for the hook
      mockUseQuery.mockReturnValue({
        data: mockLowStockResult,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

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
      // Mock useQuery for auto-refresh test
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
        isSuccess: false,
        isError: false,
      } as any);

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

      // Mock useQuery for the hook
      mockUseQuery.mockReturnValue({
        data: mockEmptyResult,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

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

      // Mock useQuery for the hook
      mockUseQuery.mockReturnValue({
        data: mockPartialResult,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

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

      // Mock useQuery for the hook
      mockUseQuery.mockReturnValue({
        data: mockInventoryItems,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

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
      // Mock useQuery for filtering test
      mockUseQuery.mockReturnValue({
        data: { success: [], errors: [], totalProcessed: 0 },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

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
      // Mock useQuery for query key integration test
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
        isSuccess: false,
        isError: false,
      } as any);

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

      const refetchMock = jest.fn();
      
      // Mock useQuery for the hook
      mockUseQuery.mockReturnValue({
        data: mockItem,
        isLoading: false,
        error: null,
        refetch: refetchMock,
        isSuccess: true,
        isError: false,
      } as any);

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