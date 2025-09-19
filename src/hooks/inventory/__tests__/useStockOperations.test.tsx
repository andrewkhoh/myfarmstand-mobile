import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useUpdateStock, 
  useStockMovements, 
  useLowStockItems,
  useStockAlerts,
  useAcknowledgeAlert 
} from '../useStockOperations';
import { InventoryService } from '../../../services/inventory/inventoryService';
import React from 'react';
import type { InventoryItem, StockMovement, StockAlert } from '../../../types/inventory';

jest.mock('../../../services/inventory/inventoryService');
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } })
    }
  }))
}));

describe('Stock Operations Hooks', () => {
  let queryClient: QueryClient;
  let mockInventoryService: jest.Mocked<InventoryService>;

  const mockItem: Partial<InventoryItem> = {
    id: 'item-1',
    name: 'Test Item',
    currentStock: 100,
    minStock: 20,
    unitPrice: 10
  };

  const mockMovements: Partial<StockMovement>[] = [
    { id: 'm1', itemId: 'item-1', type: 'in', quantity: 50, reason: 'Restock' },
    { id: 'm2', itemId: 'item-1', type: 'out', quantity: 20, reason: 'Sale' }
  ];

  const mockAlerts: Partial<StockAlert>[] = [
    { id: 'a1', itemId: 'item-1', type: 'low_stock', message: 'Low stock warning', severity: 'medium', acknowledged: false }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 1000 * 60 * 5 }, // 5 minutes
        mutations: { retry: false }
      },
      logger: {
        log: () => {},
        warn: () => {},
        error: () => {}
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

  describe('useUpdateStock', () => {
    it('should update stock optimistically', async () => {
      // Set initial data in cache
      queryClient.setQueryData(['inventory', 'detail', 'item-1'], mockItem);
      
      const updatedItem = { ...mockItem, currentStock: 150 };
      mockInventoryService.updateStock.mockResolvedValue(updatedItem as InventoryItem);

      const { result } = renderHook(() => useUpdateStock(), { wrapper });

      await act(async () => {
        result.current.mutate({
          id: 'item-1',
          newStock: 150,
          reason: 'Manual adjustment'
        });
      });

      // Check optimistic update applied immediately
      const cached = queryClient.getQueryData(['inventory', 'detail', 'item-1']) as any;
      expect(cached.currentStock).toBe(150);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInventoryService.updateStock).toHaveBeenCalledWith({
        id: 'item-1',
        newStock: 150,
        reason: 'Manual adjustment'
      });
    });

    it('should rollback on error', async () => {
      // Set initial data in cache
      queryClient.setQueryData(['inventory', 'detail', 'item-1'], mockItem);
      
      const mockError = new Error('Update failed');
      mockInventoryService.updateStock.mockRejectedValue(mockError);

      const { result } = renderHook(() => useUpdateStock(), { wrapper });

      await act(async () => {
        result.current.mutate({
          id: 'item-1',
          newStock: 150
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Wait for rollback to settle
      await waitFor(() => {
        const cached = queryClient.getQueryData(['inventory', 'detail', 'item-1']) as any;
        expect(cached).toBeDefined();
        expect(cached.currentStock).toBe(100); // Original value
      });
    });

    it('should invalidate related queries on success', async () => {
      queryClient.setQueryData(['inventory', 'detail', 'item-1'], mockItem);
      
      const updatedItem = { ...mockItem, currentStock: 150 };
      mockInventoryService.updateStock.mockResolvedValue(updatedItem as InventoryItem);

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdateStock(), { wrapper });

      await act(async () => {
        result.current.mutate({
          id: 'item-1',
          newStock: 150
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['inventory'] });
    });

    it('should handle stock increase correctly', async () => {
      queryClient.setQueryData(['inventory', 'detail', 'item-1'], mockItem);
      
      const updatedItem = { ...mockItem, currentStock: 200 };
      mockInventoryService.updateStock.mockResolvedValue(updatedItem as InventoryItem);

      const { result } = renderHook(() => useUpdateStock(), { wrapper });

      await act(async () => {
        result.current.mutate({
          id: 'item-1',
          newStock: 200,
          reason: 'Bulk purchase'
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Wait for cache update
      await waitFor(() => {
        const cached = queryClient.getQueryData(['inventory', 'detail', 'item-1']) as any;
        expect(cached).toBeDefined();
        expect(cached.currentStock).toBe(200);
      });
    });

    it('should handle stock decrease correctly', async () => {
      queryClient.setQueryData(['inventory', 'detail', 'item-1'], mockItem);
      
      const updatedItem = { ...mockItem, currentStock: 50 };
      mockInventoryService.updateStock.mockResolvedValue(updatedItem as InventoryItem);

      const { result } = renderHook(() => useUpdateStock(), { wrapper });

      await act(async () => {
        result.current.mutate({
          id: 'item-1',
          newStock: 50,
          reason: 'Sales'
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Wait for cache update
      await waitFor(() => {
        const cached = queryClient.getQueryData(['inventory', 'detail', 'item-1']) as any;
        expect(cached).toBeDefined();
        expect(cached.currentStock).toBe(50);
      });
    });

    it('should handle zero stock update', async () => {
      queryClient.setQueryData(['inventory', 'detail', 'item-1'], mockItem);
      
      const updatedItem = { ...mockItem, currentStock: 0 };
      mockInventoryService.updateStock.mockResolvedValue(updatedItem as InventoryItem);

      const { result } = renderHook(() => useUpdateStock(), { wrapper });

      await act(async () => {
        result.current.mutate({
          id: 'item-1',
          newStock: 0,
          reason: 'Out of stock'
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Wait for cache update
      await waitFor(() => {
        const cached = queryClient.getQueryData(['inventory', 'detail', 'item-1']) as any;
        expect(cached).toBeDefined();
        expect(cached.currentStock).toBe(0);
      });
    });
  });

  describe('useStockMovements', () => {
    it('should fetch stock movements successfully', async () => {
      mockInventoryService.getRecentMovements.mockResolvedValue(mockMovements as StockMovement[]);

      const { result } = renderHook(() => useStockMovements(10), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMovements);
      expect(mockInventoryService.getRecentMovements).toHaveBeenCalledWith('test-user-id', 10);
    });

    it('should use default limit when not provided', async () => {
      mockInventoryService.getRecentMovements.mockResolvedValue(mockMovements as StockMovement[]);

      const { result } = renderHook(() => useStockMovements(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInventoryService.getRecentMovements).toHaveBeenCalledWith('test-user-id', 20);
    });

    it('should use correct query key', async () => {
      mockInventoryService.getRecentMovements.mockResolvedValue([]);

      renderHook(() => useStockMovements(), { wrapper });

      await waitFor(() => {
        const queries = queryClient.getQueryCache().getAll();
        const movementsQuery = queries.find(q => 
          JSON.stringify(q.queryKey).includes('movements')
        );
        expect(movementsQuery).toBeDefined();
      });
    });
  });

  describe('useLowStockItems', () => {
    it('should fetch low stock items successfully', async () => {
      const lowStockItems = [
        { ...mockItem, currentStock: 5, minStock: 20 }
      ];
      mockInventoryService.getLowStockItems.mockResolvedValue(lowStockItems as InventoryItem[]);

      const { result } = renderHook(() => useLowStockItems(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(lowStockItems);
      expect(mockInventoryService.getLowStockItems).toHaveBeenCalledWith('test-user-id');
    });

    it('should handle empty low stock items', async () => {
      mockInventoryService.getLowStockItems.mockResolvedValue([]);

      const { result } = renderHook(() => useLowStockItems(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should use correct query key', async () => {
      mockInventoryService.getLowStockItems.mockResolvedValue([]);

      renderHook(() => useLowStockItems(), { wrapper });

      await waitFor(() => {
        const queries = queryClient.getQueryCache().getAll();
        const lowStockQuery = queries.find(q => 
          JSON.stringify(q.queryKey).includes('lowStock')
        );
        expect(lowStockQuery).toBeDefined();
      });
    });
  });

  describe('useStockAlerts', () => {
    it('should fetch stock alerts successfully', async () => {
      mockInventoryService.getAlerts.mockResolvedValue(mockAlerts as StockAlert[]);

      const { result } = renderHook(() => useStockAlerts(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockAlerts);
      expect(mockInventoryService.getAlerts).toHaveBeenCalledWith('test-user-id');
    });

    it('should refetch alerts periodically', async () => {
      mockInventoryService.getAlerts.mockResolvedValue(mockAlerts as StockAlert[]);

      renderHook(() => useStockAlerts(), { wrapper });

      await waitFor(() => {
        const queries = queryClient.getQueryCache().getAll();
        const alertsQuery = queries.find(q => 
          JSON.stringify(q.queryKey).includes('alerts')
        );
        expect(alertsQuery?.options.refetchInterval).toBe(30000); // 30 seconds
      });
    });
  });

  describe('useAcknowledgeAlert', () => {
    it('should acknowledge alert successfully', async () => {
      mockInventoryService.acknowledgeAlert.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAcknowledgeAlert(), { wrapper });

      await act(async () => {
        result.current.mutate('a1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInventoryService.acknowledgeAlert).toHaveBeenCalledWith('a1');
    });

    it('should invalidate alerts query after acknowledgment', async () => {
      mockInventoryService.acknowledgeAlert.mockResolvedValue(undefined);
      
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useAcknowledgeAlert(), { wrapper });

      await act(async () => {
        result.current.mutate('a1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['inventory', 'alerts'] 
      });
    });

    it('should optimistically remove alert from cache', async () => {
      // Set initial alerts in cache
      queryClient.setQueryData(['inventory', 'alerts'], mockAlerts);
      
      mockInventoryService.acknowledgeAlert.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAcknowledgeAlert(), { wrapper });

      await act(async () => {
        result.current.mutate('a1');
      });

      // Check optimistic update
      const cached = queryClient.getQueryData(['inventory', 'alerts']) as any[];
      expect(cached.find((alert: any) => alert.id === 'a1')).toBeUndefined();
    });
  });
});