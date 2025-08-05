import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { Order } from '../types';
import * as OrderService from '../services/orderService';
import { OrderFilters } from '../services/orderService';

// Query key factory following Pattern 1
const orderKeys = {
  all: ['orders'] as const,
  lists: (): readonly ['orders', 'list'] => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderFilters): readonly ['orders', 'list', OrderFilters] => [...orderKeys.lists(), filters] as const,
  details: (): readonly ['orders', 'detail'] => [...orderKeys.all, 'detail'] as const,
  detail: (id: string): readonly ['orders', 'detail', string] => [...orderKeys.details(), id] as const,
  stats: (): readonly ['orders', 'stats'] => [...orderKeys.all, 'stats'] as const,
  userOrders: (userId: string): readonly ['orders', 'user', string] => [...orderKeys.all, 'user', userId] as const,
};

// Default query configuration following Pattern 5
const defaultQueryConfig = {
  staleTime: 2 * 60 * 1000,     // 2 minutes (orders change frequently)
  gcTime: 5 * 60 * 1000,        // 5 minutes
  retry: 1,
  refetchOnWindowFocus: true,
};

/**
 * Hook for fetching all orders with optional filtering (admin only)
 */
export const useOrders = (filters: OrderFilters = {}): UseQueryResult<Order[], Error> => {
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => OrderService.getAllOrders(filters),
    ...defaultQueryConfig,
  });
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
    queryKey: orderKeys.userOrders(userId),
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
      // Cancel outgoing queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: orderKeys.all });

      // Snapshot previous values for rollback
      const previousOrders = queryClient.getQueryData(orderKeys.list({}));
      const previousOrder = queryClient.getQueryData(orderKeys.detail(orderId));
      const previousStats = queryClient.getQueryData(orderKeys.stats());

      // Optimistically update order in lists
      queryClient.setQueryData(orderKeys.list({}), (old: Order[] | undefined) =>
        old?.map(order =>
          order.id === orderId
            ? { ...order, status: status as any, updatedAt: new Date().toISOString() }
            : order
        )
      );

      // Optimistically update specific order
      queryClient.setQueryData(orderKeys.detail(orderId), (old: Order | null | undefined) =>
        old ? { ...old, status: status as any, updatedAt: new Date().toISOString() } : old
      );

      // Optimistically update statistics with new daily/weekly structure
      queryClient.setQueryData(orderKeys.stats(), (oldStats: any) => {
        if (!oldStats || !previousOrders) return oldStats;
        
        const updatedOrders = (previousOrders as Order[]).map(order =>
          order.id === orderId
            ? { ...order, status: status as any, updatedAt: new Date().toISOString() }
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

      return { previousOrders, previousOrder, previousStats };
    },

    // Success: invalidate for fresh data
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },

    // Error: rollback optimistic updates
    onError: (err, { orderId }, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(orderKeys.list({}), context.previousOrders);
      }
      if (context?.previousOrder) {
        queryClient.setQueryData(orderKeys.detail(orderId), context.previousOrder);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(orderKeys.stats(), context.previousStats);
      }
    },

    // Always: cleanup
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
};

/**
 * Mutation hook for bulk updating order status
 */
export const useBulkUpdateOrderStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderIds, status }: { orderIds: string[]; status: string }) =>
      OrderService.bulkUpdateOrderStatus(orderIds, status),

    onMutate: async ({ orderIds, status }) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.all });

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
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },

    onError: (err, variables, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(orderKeys.list({}), context.previousOrders);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(orderKeys.stats(), context.previousStats);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
};

/**
 * Combined operations hook following Pattern 6
 */
export const useOrderOperations = () => {
  const updateStatusMutation = useUpdateOrderStatusMutation();
  const bulkUpdateMutation = useBulkUpdateOrderStatusMutation();

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const result = await updateStatusMutation.mutateAsync({ orderId, status });
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update order status'
      };
    }
  };

  const bulkUpdateOrderStatus = async (orderIds: string[], status: string) => {
    try {
      const result = await bulkUpdateMutation.mutateAsync({ orderIds, status });
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to bulk update orders'
      };
    }
  };

  return {
    updateOrderStatus,
    bulkUpdateOrderStatus,
    isUpdating: updateStatusMutation.isPending,
    isBulkUpdating: bulkUpdateMutation.isPending,
    isLoading: updateStatusMutation.isPending || bulkUpdateMutation.isPending,
  };
};

// Export query keys for external use
export { orderKeys };
