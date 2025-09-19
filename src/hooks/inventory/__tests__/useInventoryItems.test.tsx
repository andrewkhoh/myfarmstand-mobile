import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInventoryItems, useInventoryItem, useDeleteInventoryItem } from '../useInventoryItems';
import { InventoryService } from '../../../services/inventory/inventoryService';
import React from 'react';
import type { InventoryItem, InventoryFilters } from '../../../types/inventory';

jest.mock('../../../services/inventory/inventoryService');
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } })
    }
  }))
}));

describe('useInventoryItems', () => {
  let queryClient: QueryClient;
  let mockInventoryService: jest.Mocked<InventoryService>;

  const mockItems: Partial<InventoryItem>[] = [
    { 
      id: '1', 
      name: 'Widget A', 
      sku: 'WA001',
      currentStock: 100, 
      minStock: 20,
      unitPrice: 10,
      category: 'widgets' 
    },
    { 
      id: '2', 
      name: 'Gadget B', 
      sku: 'GB002',
      currentStock: 50, 
      minStock: 10,
      unitPrice: 20,
      category: 'gadgets' 
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false }
      }
    });

    mockInventoryService = {
      getInventoryItems: jest.fn(),
      getInventoryItem: jest.fn(),
      getLowStockItems: jest.fn(),
      getRecentMovements: jest.fn(),
      getAlerts: jest.fn(),
      updateStock: jest.fn(),
      batchUpdateStock: jest.fn(),
      createInventoryItem: jest.fn(),
      deleteInventoryItem: jest.fn(),
      acknowledgeAlert: jest.fn(),
    } as any;

    (InventoryService as jest.MockedClass<typeof InventoryService>).mockImplementation(
      () => mockInventoryService
    );
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('useInventoryItems', () => {
    it('should fetch inventory items successfully', async () => {
      mockInventoryService.getInventoryItems.mockResolvedValue(mockItems as InventoryItem[]);

      const { result } = renderHook(() => useInventoryItems(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockItems);
      expect(mockInventoryService.getInventoryItems).toHaveBeenCalledWith('test-user-id', undefined);
    });

    it('should fetch items with filters', async () => {
      const filters: InventoryFilters = {
        category: 'widgets',
        stockStatus: 'low',
        search: 'widget'
      };

      mockInventoryService.getInventoryItems.mockResolvedValue([mockItems[0] as InventoryItem]);

      const { result } = renderHook(() => useInventoryItems(filters), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInventoryService.getInventoryItems).toHaveBeenCalledWith('test-user-id', filters);
      expect(result.current.data).toHaveLength(1);
    });

    it('should use correct query key with filters', async () => {
      const filters: InventoryFilters = { category: 'widgets' };
      mockInventoryService.getInventoryItems.mockResolvedValue([]);

      renderHook(() => useInventoryItems(filters), { wrapper });

      await waitFor(() => {
        const queries = queryClient.getQueryCache().getAll();
        const expectedKey = ['inventory', 'list', JSON.stringify(filters)];
        const itemsQuery = queries.find(q => 
          q.queryKey.length === 3 &&
          q.queryKey[0] === 'inventory' &&
          q.queryKey[1] === 'list' &&
          q.queryKey[2] === JSON.stringify(filters)
        );
        expect(itemsQuery).toBeDefined();
      });
    });

    it('should handle loading state', () => {
      mockInventoryService.getInventoryItems.mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useInventoryItems(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle error state', async () => {
      const mockError = new Error('Failed to fetch items');
      mockInventoryService.getInventoryItems.mockRejectedValue(mockError);

      const { result } = renderHook(() => useInventoryItems(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should refetch when filters change', async () => {
      mockInventoryService.getInventoryItems.mockResolvedValue(mockItems as InventoryItem[]);

      const { result, rerender } = renderHook(
        ({ filters }) => useInventoryItems(filters),
        { 
          wrapper,
          initialProps: { filters: undefined }
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const newFilters: InventoryFilters = { category: 'gadgets' };
      
      mockInventoryService.getInventoryItems.mockResolvedValue([mockItems[1] as InventoryItem]);
      
      rerender({ filters: newFilters });

      await waitFor(() => {
        expect(mockInventoryService.getInventoryItems).toHaveBeenCalledWith('test-user-id', newFilters);
      });
    });
  });

  describe('useInventoryItem', () => {
    it('should fetch single inventory item', async () => {
      mockInventoryService.getInventoryItem.mockResolvedValue(mockItems[0] as InventoryItem);

      const { result } = renderHook(() => useInventoryItem('1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockItems[0]);
      expect(mockInventoryService.getInventoryItem).toHaveBeenCalledWith('1');
    });

    it('should handle null item response', async () => {
      mockInventoryService.getInventoryItem.mockResolvedValue(null);

      const { result } = renderHook(() => useInventoryItem('999'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('should use correct query key for detail', async () => {
      mockInventoryService.getInventoryItem.mockResolvedValue(mockItems[0] as InventoryItem);

      renderHook(() => useInventoryItem('1'), { wrapper });

      await waitFor(() => {
        const queries = queryClient.getQueryCache().getAll();
        const detailQuery = queries.find(q => 
          JSON.stringify(q.queryKey).includes('detail') &&
          JSON.stringify(q.queryKey).includes('1')
        );
        expect(detailQuery).toBeDefined();
      });
    });
  });

  describe('useCreateInventoryItem', () => {
    it('should create inventory item successfully', async () => {
      const newItem = { ...mockItems[0], id: '3' } as InventoryItem;
      mockInventoryService.createInventoryItem.mockResolvedValue(newItem);

      const { result } = renderHook(() => useCreateInventoryItem(), { wrapper });

      await act(async () => {
        result.current.mutate(newItem);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInventoryService.createInventoryItem).toHaveBeenCalledWith(newItem);
    });

    it('should invalidate queries after creation', async () => {
      const newItem = { ...mockItems[0], id: '3' } as InventoryItem;
      mockInventoryService.createInventoryItem.mockResolvedValue(newItem);
      
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateInventoryItem(), { wrapper });

      await act(async () => {
        result.current.mutate(newItem);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['inventory', 'list'] 
      });
    });

    it('should handle creation error', async () => {
      const mockError = new Error('Failed to create item');
      mockInventoryService.createInventoryItem.mockRejectedValue(mockError);

      const { result } = renderHook(() => useCreateInventoryItem(), { wrapper });

      await act(async () => {
        result.current.mutate({} as any);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useDeleteInventoryItem', () => {
    it('should delete inventory item successfully', async () => {
      mockInventoryService.deleteInventoryItem.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteInventoryItem(), { wrapper });

      await act(async () => {
        result.current.mutate('1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInventoryService.deleteInventoryItem).toHaveBeenCalledWith('1');
    });

    it('should invalidate queries after deletion', async () => {
      mockInventoryService.deleteInventoryItem.mockResolvedValue(undefined);
      
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDeleteInventoryItem(), { wrapper });

      await act(async () => {
        result.current.mutate('1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['inventory'] 
      });
    });

    it('should remove item from cache optimistically', async () => {
      // First, populate the cache
      queryClient.setQueryData(['inventory', 'list'], mockItems);

      mockInventoryService.deleteInventoryItem.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteInventoryItem(), { wrapper });

      await act(async () => {
        result.current.mutate('1');
      });

      // Check optimistic update
      const cachedData = queryClient.getQueryData(['inventory', 'list']) as any[];
      expect(cachedData.find((item: any) => item.id === '1')).toBeUndefined();
    });
  });
});