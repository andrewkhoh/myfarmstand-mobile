import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Order } from '../types';
import * as OrderService from '../services/orderService';
import { OrderFilters } from '../services/orderService';
import { orderKeys } from '../utils/queryKeyFactory';
import { orderBroadcast } from '../utils/broadcastFactory';
import { useCurrentUser } from './useAuth';

// Default query configuration (following cart pattern exactly)
const defaultQueryConfig = {
  staleTime: 2 * 60 * 1000, // 2 minutes (matching cart)
  gcTime: 5 * 60 * 1000, // 5 minutes (matching cart)
  retry: 1,
  refetchOnMount: true, // Following cart pattern
  refetchOnWindowFocus: false,
};

/**
 * Hook for fetching customer orders with React Query atomic pattern
 */
export const useCustomerOrders = (userEmail?: string): UseQueryResult<Order[], Error> => {
  const { data: user } = useCurrentUser();
  const effectiveUserEmail = userEmail || user?.email;
  
  // Early return for unauthenticated users (following cart pattern)
  if (!effectiveUserEmail) {
    return {
      data: [] as Order[],
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      status: 'success' as const,
      fetchStatus: 'idle' as const,
      refetch: () => Promise.resolve({ data: [] as Order[], isLoading: false, error: null } as any),
    } as UseQueryResult<Order[], Error>;
  }

  return useQuery({
    queryKey: ['orders', 'user', effectiveUserEmail] as const,
    queryFn: () => OrderService.getCustomerOrders(effectiveUserEmail),
    ...defaultQueryConfig,
    enabled: !!effectiveUserEmail,
  });
};

/**
 * Hook for fetching all orders with optional filtering (admin only)
 */
export const useOrders = (filters: OrderFilters = {}): UseQueryResult<Order[], Error> => {
  const query = useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => OrderService.getAllOrders(filters),
    ...defaultQueryConfig,
  });

  return query;
};

/**
 * Hook for fetching a specific order by ID
 */
export const useOrder = (orderId: string): UseQueryResult<Order | null, Error> => {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => OrderService.getOrder(orderId),
    ...defaultQueryConfig,
    enabled: !!orderId, // Only run if orderId is provided
  });
};

/**
 * Hook for fetching order statistics (admin only)
 */
export const useOrderStats = () => {
  return useQuery({
    queryKey: orderKeys.stats(),
    queryFn: () => OrderService.getOrderStats(),
    ...defaultQueryConfig,
    staleTime: 1 * 60 * 1000, // Stats can be slightly more stale
  });
};

/**
 * Hook for fetching user-specific orders
 */
export const useUserOrders = (userId: string): UseQueryResult<Order[], Error> => {
  return useQuery({
    queryKey: ['orders', 'user', userId] as const,
    queryFn: () => OrderService.getCustomerOrders(userId),
    ...defaultQueryConfig,
    enabled: !!userId,
  });
};

/**
 * Mutation hook for updating order status following Pattern 3
 */
export const useUpdateOrderStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      OrderService.updateOrderStatus(orderId, status),

    // Optimistic update pattern
    onMutate: async ({ orderId, status }) => {
      // Cancel outgoing queries to prevent race conditions (following cart pattern)
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      await queryClient.cancelQueries({ queryKey: ['orders', 'user'] });
      
      // Snapshot previous values for rollback (following cart pattern)
      const previousOrders = queryClient.getQueryData(['orders']);
      const previousUserOrders = queryClient.getQueryData(['orders', 'user']);
      const previousOrder = queryClient.getQueryData(['orders', 'detail', orderId]);
      
      // Optimistically update all relevant caches (following cart pattern)
      queryClient.setQueryData(['orders'], (old: Order[] | undefined) =>
        old?.map(order =>
          order.id === orderId
            ? { ...order, status: status as any, updatedAt: new Date().toISOString() }
            : order
        )
      );
      
      queryClient.setQueryData(['orders', 'user'], (old: Order[] | undefined) =>
        old?.map(order =>
          order.id === orderId
            ? { ...order, status: status as any, updatedAt: new Date().toISOString() }
            : order
        )
      );
      
      queryClient.setQueryData(['orders', 'detail', orderId], (old: Order | undefined) =>
        old ? { ...old, status: status as any, updatedAt: new Date().toISOString() } : old
      );
      
      return { previousOrders, previousUserOrders, previousOrder };
    },

    // Success: invalidate cache (orderService.ts already handles broadcast)
    onSuccess: async (result, { orderId, status }) => {
      // Note: orderService.updateOrderStatus already handles the broadcast with proper userId
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },

    // Error: rollback optimistic updates (following cart pattern)
    onError: (err, { orderId }, context) => {
      console.error('❌ Failed to update order status:', err);
      
      if (context?.previousOrders) {
        queryClient.setQueryData(['orders'], context.previousOrders);
      }
      if (context?.previousUserOrders) {
        queryClient.setQueryData(['orders', 'user'], context.previousUserOrders);
      }
      if (context?.previousOrder) {
        queryClient.setQueryData(['orders', 'detail', orderId], context.previousOrder);
      }
    }
    // ✅ NO onSettled - invalidation happens in onSuccess only (following cart pattern)
  });
};

/**
 * Mutation hook for bulk updating order status
 */
export const useBulkUpdateOrderStatusMutation = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  return useMutation({
    mutationFn: ({ orderIds, status }: { orderIds: string[]; status: string }) =>
      OrderService.bulkUpdateOrderStatus(orderIds, status),

    onMutate: async ({ orderIds, status }) => {
      await queryClient.cancelQueries({ queryKey: ['orders', 'user', user?.id] });

      const previousOrders = queryClient.getQueryData(orderKeys.list({}));
      const previousStats = queryClient.getQueryData(orderKeys.stats());

      // Optimistically update multiple orders
      queryClient.setQueryData(orderKeys.list({}), (old: Order[] | undefined) =>
        old?.map(order =>
          orderIds.includes(order.id)
            ? { ...order, status: status as any, updatedAt: new Date().toISOString() }
            : order
        )
      );

      // Optimistically update statistics for bulk update with new daily/weekly structure
      queryClient.setQueryData(orderKeys.stats(), (oldStats: any) => {
        if (!oldStats || !previousOrders) return oldStats;
        
        const updatedOrders = (previousOrders as Order[]).map(order =>
          orderIds.includes(order.id)
            ? { ...order, status: status as any }
            : order
        );
        
        // Recalculate with same logic as service
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        const todayOrders = updatedOrders.filter(o => new Date(o.createdAt) >= todayStart);
        const weekOrders = updatedOrders.filter(o => new Date(o.createdAt) >= weekStart);
        const dailyCompleted = todayOrders.filter(o => o.status === 'completed');
        const weeklyCompleted = weekOrders.filter(o => o.status === 'completed');
        const allPending = updatedOrders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status));
        
        return {
          daily: {
            ordersPlaced: todayOrders.length,
            ordersCompleted: dailyCompleted.length,
            revenue: dailyCompleted.reduce((sum, o) => sum + o.total, 0),
            pendingFromToday: todayOrders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length,
          },
          weekly: {
            ordersPlaced: weekOrders.length,
            ordersCompleted: weeklyCompleted.length,
            revenue: weeklyCompleted.reduce((sum, o) => sum + o.total, 0),
            pendingFromWeek: weekOrders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length,
          },
          active: {
            totalPending: allPending.length,
          },
        };
      });

      return { previousOrders, previousStats };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },

    onError: (err, variables, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(orderKeys.list({}), context.previousOrders);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(orderKeys.stats(), context.previousStats);
      }
    },
  });
};

/**
 * Combined operations hook following Pattern 6
 */
export const useOrderOperations = () => {
  const updateStatusMutation = useUpdateOrderStatusMutation();
  const bulkUpdateMutation = useBulkUpdateOrderStatusMutation();

  return {
    // Direct mutation functions (following cart pattern - single source of truth)
    updateOrderStatus: updateStatusMutation.mutate,
    updateOrderStatusAsync: updateStatusMutation.mutateAsync,
    bulkUpdateOrderStatus: bulkUpdateMutation.mutate,
    bulkUpdateOrderStatusAsync: bulkUpdateMutation.mutateAsync,
    
    // Mutation states (following cart pattern)
    isUpdatingStatus: updateStatusMutation.isPending,
    isBulkUpdating: bulkUpdateMutation.isPending,
    
    // Error states (following cart pattern)
    updateError: updateStatusMutation.error,
    bulkUpdateError: bulkUpdateMutation.error,
  };
};

// Export query keys for external use
export { orderKeys };
