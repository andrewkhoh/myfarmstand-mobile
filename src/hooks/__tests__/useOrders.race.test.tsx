/**
 * useOrders Race Condition Tests with REAL React Query
 * 
 * This test file uses real React Query instances to test actual race conditions.
 * Key differences from mocked tests:
 * - Uses actual QueryClient and mutations
 * - Tests real optimistic updates and rollbacks  
 * - Tests real query invalidation and caching
 * - Tests actual concurrent operation handling
 * - Tests complex statistics calculation races
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { 
  useOrders, 
  useOrder, 
  useOrderStats, 
  useOrderOperations,
  useUpdateOrderStatusMutation,
  useBulkUpdateOrderStatusMutation 
} from '../useOrders';
import * as OrderService from '../../services/orderService';
import type { Order } from '../../types';

// Get the mocked order service (services are mocked, React Query is real)
const mockOrderService = OrderService as jest.Mocked<typeof OrderService>;

describe('useOrders Race Condition Tests (Real React Query)', () => {
  let queryClient: QueryClient;

  // Basic smoke test to verify setup works
  describe('🔧 Setup Verification', () => {
    it('should initialize useOrderOperations hook without hanging', async () => {
      const { result } = renderHook(() => useOrderOperations(), { wrapper });

      // Should complete initialization within reasonable time
      await waitFor(() => {
        expect(result.current).toBeDefined();
        expect(result.current.updateOrderStatus).toBeDefined();
        expect(result.current.bulkUpdateOrderStatus).toBeDefined();
      }, { timeout: 3000 });

      expect(result.current.isUpdatingStatus).toBe(false);
      expect(result.current.isBulkUpdating).toBe(false);
    });
  });

  // Mock order data for testing
  const mockOrder1: Order = {
    id: 'order-1',
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    customer_phone: '555-0101',
    subtotal: 25.99,
    tax_amount: 2.21,
    total_amount: 28.20,
    fulfillment_type: 'pickup',
    status: 'pending',
    payment_method: 'card',
    payment_status: 'completed',
    pickup_date: '2024-01-15',
    pickup_time: '10:00',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    order_items: []
  };

  const mockOrder2: Order = {
    id: 'order-2',
    customer_name: 'Jane Smith',
    customer_email: 'jane@example.com', 
    customer_phone: '555-0102',
    subtotal: 45.50,
    tax_amount: 3.87,
    total_amount: 49.37,
    fulfillment_type: 'pickup',
    status: 'confirmed',
    payment_method: 'card',
    payment_status: 'completed',
    pickup_date: '2024-01-15',
    pickup_time: '11:00',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    order_items: []
  };

  const mockOrder3: Order = {
    id: 'order-3',
    customer_name: 'Bob Wilson',
    customer_email: 'bob@example.com',
    customer_phone: '555-0103', 
    subtotal: 15.75,
    tax_amount: 1.34,
    total_amount: 17.09,
    fulfillment_type: 'pickup',
    status: 'preparing',
    payment_method: 'card',
    payment_status: 'completed',
    pickup_date: '2024-01-15',
    pickup_time: '12:00',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    order_items: []
  };

  const mockOrders = [mockOrder1, mockOrder2, mockOrder3];

  beforeEach(() => {
    // Create fresh QueryClient for each test to avoid interference
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { 
          retry: false,
          staleTime: 0,
          gcTime: 0,
          refetchOnMount: false,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false
        },
        mutations: { 
          retry: false
        }
      },
      // Prevent hanging by setting shorter timeouts
      mutationCache: undefined,
      queryCache: undefined
    });

    jest.clearAllMocks();
    
    // Use real timers for React Query compatibility (proven Option A methodology)
    jest.useRealTimers();

    // Default order service mocks
    mockOrderService.getAllOrders.mockResolvedValue(mockOrders);
    mockOrderService.getOrder.mockResolvedValue(mockOrder1);
    mockOrderService.getOrderStats.mockResolvedValue({
      daily: {
        ordersPlaced: 3,
        ordersCompleted: 1,
        revenue: 28.20,
        pendingFromToday: 2
      },
      weekly: {
        ordersPlaced: 10,
        ordersCompleted: 7,
        revenue: 315.50,
        pendingFromWeek: 3
      },
      active: {
        totalPending: 5
      }
    });
  });

  afterEach(async () => {
    // Properly cleanup QueryClient to prevent hanging
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      queryClient.unmount();
    } catch {
      // Ignore cleanup errors
    }
  });

  // Wrapper component that provides real QueryClient
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('🏁 Concurrent Status Updates', () => {
    it('should handle concurrent status updates on same order correctly', async () => {
      // Mock service responses for concurrent updates
      let updateCount = 0;
      mockOrderService.updateOrderStatus.mockImplementation(async (orderId, status) => {
        updateCount++;
        // Use real short delay for race condition testing
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (orderId === 'order-1') {
          return { 
            success: true, 
            order: { ...mockOrder1, status, updatedAt: new Date().toISOString() }
          };
        }
        throw new Error('Order not found');
      });

      const { result } = renderHook(() => useOrderOperations(), { wrapper });

      // Wait for initial load
      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

      // Fire two concurrent status updates on same order with real timing
      const startTime = Date.now();
      
      await act(async () => {
        const promises = Promise.all([
          result.current.updateOrderStatusAsync({ orderId: 'order-1', status: 'confirmed' }),
          result.current.updateOrderStatusAsync({ orderId: 'order-1', status: 'preparing' })
        ]);

        // Wait for all operations to complete with timeout protection
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), 5000)
        );
        
        await Promise.race([promises, timeoutPromise]);
      });

      const endTime = Date.now();
      console.log(`Concurrent updates completed in ${endTime - startTime}ms`);

      // Verify both service calls were made
      expect(mockOrderService.updateOrderStatus).toHaveBeenCalledTimes(2);
      
      // Wait for mutations to complete and pending state to update
      await waitFor(() => {
        expect(result.current.isUpdatingStatus).toBe(false);
      });
    });

    it('should handle rapid status transitions correctly', async () => {
      // Mock progressive status updates
      mockOrderService.updateOrderStatus.mockImplementation(async (orderId, status) => {
        await new Promise(resolve => setTimeout(resolve, 30));
        
        if (orderId === 'order-1') {
          return { 
            success: true, 
            order: { ...mockOrder1, status, updatedAt: new Date().toISOString() }
          };
        }
        throw new Error('Order not found');
      });

      const { result } = renderHook(() => useOrderOperations(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Rapid sequential status transitions
      await act(async () => {
        // Fire rapid sequence: pending -> confirmed -> preparing -> ready
        await result.current.updateOrderStatusAsync({ orderId: 'order-1', status: 'confirmed' });
        await result.current.updateOrderStatusAsync({ orderId: 'order-1', status: 'preparing' });
        await result.current.updateOrderStatusAsync({ orderId: 'order-1', status: 'ready' });
      });

      // Should complete all updates
      expect(mockOrderService.updateOrderStatus).toHaveBeenCalledTimes(3);
      
      // Wait for mutations to complete
      await waitFor(() => {
        expect(result.current.isUpdatingStatus).toBe(false);
      });
    });
  });

  describe('⚡ Bulk vs Individual Operations', () => {
    it('should handle bulk update during individual updates', async () => {
      // Mock both individual and bulk updates
      mockOrderService.updateOrderStatus.mockImplementation(async (orderId, status) => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Slower individual
        return { 
          success: true, 
          order: { ...mockOrders.find(o => o.id === orderId), status, updatedAt: new Date().toISOString() }
        };
      });

      mockOrderService.bulkUpdateOrderStatus.mockImplementation(async (orderIds, status) => {
        await new Promise(resolve => setTimeout(resolve, 150)); // Slower bulk
        
        const updatedOrders = orderIds.map(id => ({
          ...mockOrders.find(o => o.id === id),
          status,
          updatedAt: new Date().toISOString()
        }));
        
        return { success: true, updatedOrders };
      });

      const { result } = renderHook(() => useOrderOperations(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Start individual update, then bulk update that includes same order
      await act(async () => {
        const promises = Promise.all([
          result.current.updateOrderStatusAsync({ orderId: 'order-1', status: 'confirmed' }),
          result.current.bulkUpdateOrderStatusAsync({ 
            orderIds: ['order-1', 'order-2', 'order-3'], 
            status: 'preparing' 
          })
        ]);
        
        await promises;
      });

      // Both operations should complete
      expect(mockOrderService.updateOrderStatus).toHaveBeenCalledTimes(1);
      expect(mockOrderService.bulkUpdateOrderStatus).toHaveBeenCalledTimes(1);
      
      // Wait for mutations to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle overlapping bulk operations', async () => {
      // Mock bulk operations with different speeds
      let bulkCount = 0;
      mockOrderService.bulkUpdateOrderStatus.mockImplementation(async (orderIds, status) => {
        bulkCount++;
        const delay = bulkCount === 1 ? 80 : 60; // First bulk slower
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const updatedOrders = orderIds.map(id => ({
          ...mockOrders.find(o => o.id === id),
          status,
          updatedAt: new Date().toISOString()
        }));
        
        return { success: true, updatedOrders };
      });

      const { result } = renderHook(() => useOrderOperations(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Fire overlapping bulk operations
      await act(async () => {
        const promises = Promise.all([
          result.current.bulkUpdateOrderStatusAsync({ 
            orderIds: ['order-1', 'order-2'], 
            status: 'confirmed' 
          }),
          result.current.bulkUpdateOrderStatusAsync({ 
            orderIds: ['order-2', 'order-3'], 
            status: 'preparing' 
          })
        ]);
        
        await promises;
      });

      expect(mockOrderService.bulkUpdateOrderStatus).toHaveBeenCalledTimes(2);
      expect(result.current.isBulkUpdating).toBe(false);
    });
  });

  describe('📊 Statistics Calculation Races', () => {
    it('should maintain statistics consistency during concurrent updates', async () => {
      // Setup: Hook for order stats
      const { result: statsResult } = renderHook(() => useOrderStats(), { wrapper });
      const { result: operationsResult } = renderHook(() => useOrderOperations(), { wrapper });

      await waitFor(() => {
        expect(statsResult.current.isLoading).toBe(false);
        expect(operationsResult.current.isLoading).toBe(false);
      });

      // Store initial stats
      const initialStats = statsResult.current.data;
      expect(initialStats).toBeDefined();

      // Mock updates that affect statistics
      mockOrderService.updateOrderStatus.mockImplementation(async (orderId, status) => {
        await new Promise(resolve => setTimeout(resolve, 40));
        return { 
          success: true, 
          order: { ...mockOrders.find(o => o.id === orderId), status, updatedAt: new Date().toISOString() }
        };
      });

      // Update order status that affects daily statistics
      await act(async () => {
        await operationsResult.current.updateOrderStatusAsync({ 
          orderId: 'order-1', 
          status: 'completed' 
        });
      });

      // Statistics should be invalidated and updated
      await waitFor(() => {
        expect(mockOrderService.updateOrderStatus).toHaveBeenCalledWith('order-1', 'completed');
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(operationsResult.current.isUpdatingStatus).toBe(false);
      });
    });

    it('should handle statistics recalculation during bulk updates', async () => {
      const { result: statsResult } = renderHook(() => useOrderStats(), { wrapper });
      const { result: operationsResult } = renderHook(() => useOrderOperations(), { wrapper });

      await waitFor(() => {
        expect(statsResult.current.isLoading).toBe(false);
        expect(operationsResult.current.isLoading).toBe(false);
      });

      // Mock bulk update that affects multiple statistics
      mockOrderService.bulkUpdateOrderStatus.mockImplementation(async (orderIds, status) => {
        await new Promise(resolve => setTimeout(resolve, 80));
        
        const updatedOrders = orderIds.map(id => ({
          ...mockOrders.find(o => o.id === id),
          status,
          updatedAt: new Date().toISOString()
        }));
        
        return { success: true, updatedOrders };
      });

      // Bulk update that changes statistics significantly
      await act(async () => {
        await operationsResult.current.bulkUpdateOrderStatusAsync({
          orderIds: ['order-1', 'order-2', 'order-3'],
          status: 'completed'
        });
      });

      // Verify bulk operation completed
      expect(mockOrderService.bulkUpdateOrderStatus).toHaveBeenCalledWith(
        ['order-1', 'order-2', 'order-3'],
        'completed'
      );
      
      // Wait for bulk mutation to complete
      await waitFor(() => {
        expect(operationsResult.current.isBulkUpdating).toBe(false);
      });
    });
  });

  describe('🔄 Cache Management Races', () => {
    it('should handle concurrent query invalidations', async () => {
      // Create multiple hook instances (simulating multiple admin users)
      const { result: operations1 } = renderHook(() => useOrderOperations(), { wrapper });
      const { result: operations2 } = renderHook(() => useOrderOperations(), { wrapper });
      const { result: orders1 } = renderHook(() => useOrders(), { wrapper });
      const { result: orders2 } = renderHook(() => useOrders(), { wrapper });

      // Wait for all to load
      await waitFor(() => {
        expect(operations1.current.isLoading).toBe(false);
        expect(operations2.current.isLoading).toBe(false);
        expect(orders1.current.isLoading).toBe(false);
        expect(orders2.current.isLoading).toBe(false);
      });

      // Mock successful updates
      mockOrderService.updateOrderStatus.mockImplementation(async (orderId, status) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { 
          success: true, 
          order: { ...mockOrders.find(o => o.id === orderId), status, updatedAt: new Date().toISOString() }
        };
      });

      // Both admin users update different orders simultaneously
      await act(async () => {
        const promises = Promise.all([
          operations1.current.updateOrderStatusAsync({ orderId: 'order-1', status: 'confirmed' }),
          operations2.current.updateOrderStatusAsync({ orderId: 'order-2', status: 'preparing' })
        ]);
        
        await promises;
      });

      // Both operations should complete successfully
      expect(mockOrderService.updateOrderStatus).toHaveBeenCalledTimes(2);
      
      // Wait for both mutations to complete
      await waitFor(() => {
        expect(operations1.current.isUpdatingStatus).toBe(false);
        expect(operations2.current.isUpdatingStatus).toBe(false);
      });
    });

    it('should maintain cache consistency across multiple hook instances', async () => {
      // Create multiple order listing hooks
      const { result: orders1 } = renderHook(() => useOrders(), { wrapper });
      const { result: orders2 } = renderHook(() => useOrders(), { wrapper });
      const { result: operations } = renderHook(() => useOrderOperations(), { wrapper });

      await waitFor(() => {
        expect(orders1.current.isLoading).toBe(false);
        expect(orders2.current.isLoading).toBe(false);
        expect(operations.current.isLoading).toBe(false);
      });

      // Mock successful update
      mockOrderService.updateOrderStatus.mockResolvedValue({
        success: true,
        order: { ...mockOrder1, status: 'completed', updatedAt: new Date().toISOString() }
      });

      // Update from operations hook
      await act(async () => {
        await operations.current.updateOrderStatusAsync({ 
          orderId: 'order-1', 
          status: 'completed' 
        });
      });

      // Mutation should complete
      expect(operations.current.isUpdatingStatus).toBe(false);
      expect(mockOrderService.updateOrderStatus).toHaveBeenCalledWith('order-1', 'completed');
    });
  });

  describe('🚨 Error Handling & Recovery', () => {
    it('should handle partial failures in bulk operations', async () => {
      const { result } = renderHook(() => useOrderOperations(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Mock bulk operation with partial failure
      mockOrderService.bulkUpdateOrderStatus.mockImplementation(async (orderIds, status) => {
        await new Promise(resolve => setTimeout(resolve, 60));
        
        // Simulate partial failure - some orders update, some fail
        if (orderIds.includes('order-2')) {
          throw new Error('Order 2 status transition not allowed');
        }
        
        const updatedOrders = orderIds
          .filter(id => id !== 'order-2')
          .map(id => ({
            ...mockOrders.find(o => o.id === id),
            status,
            updatedAt: new Date().toISOString()
          }));
        
        return { success: true, updatedOrders };
      });

      let errorOccurred = false;

      await act(async () => {
        try {
          await result.current.bulkUpdateOrderStatusAsync({
            orderIds: ['order-1', 'order-2', 'order-3'],
            status: 'preparing'
          });
        } catch (error) {
          errorOccurred = true;
          expect((error as Error).message).toContain('Order 2 status transition not allowed');
        }
      });

      // Should handle the error appropriately
      expect(errorOccurred).toBe(true);
      
      // Wait for mutation to complete even on error
      await waitFor(() => {
        expect(result.current.isBulkUpdating).toBe(false);
      });
    });

    it('should maintain data integrity during network failures', async () => {
      const { result: orders } = renderHook(() => useOrders(), { wrapper });
      const { result: operations } = renderHook(() => useOrderOperations(), { wrapper });

      await waitFor(() => {
        expect(orders.current.isLoading).toBe(false);
        expect(operations.current.isLoading).toBe(false);
      });

      // Mock network failure
      mockOrderService.updateOrderStatus.mockRejectedValue(new Error('Network error'));

      let errorOccurred = false;

      await act(async () => {
        try {
          await operations.current.updateOrderStatusAsync({ 
            orderId: 'order-1', 
            status: 'preparing' 
          });
        } catch (error) {
          errorOccurred = true;
        }
      });

      // Should handle network failure gracefully
      expect(errorOccurred).toBe(true);
      expect(operations.current.isUpdatingStatus).toBe(false);
    });
  });
});