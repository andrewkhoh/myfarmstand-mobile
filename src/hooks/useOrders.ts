import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Order } from '../types';
import * as OrderService from '../services/orderService';
import { OrderFilters } from '../services/orderService';
import { orderKeys } from '../utils/queryKeyFactory';
import { useCurrentUser } from './useAuth';
import { ValidationMonitor } from '../utils/validationMonitor';

// Enhanced interfaces following cart pattern
interface OrderError {
  code: 'INVALID_ORDER' | 'ORDER_NOT_FOUND' | 'UNAUTHORIZED' | 'NETWORK_ERROR' | 'STATUS_UPDATE_FAILED' | 'UNKNOWN_ERROR';
  message: string;
  userMessage: string;
  metadata?: Record<string, any>;
}

interface OrderOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: OrderError;
  message?: string;
}

interface OrderMutationContext {
  previousOrders?: Order[];
  previousUserOrders?: Order[];
  previousOrder?: Order | null;
  previousStats?: any;
  operationType: 'update-status' | 'bulk-update-status';
  metadata: Record<string, any>;
}

// Enhanced error creation utility (following cart pattern)
function createOrderError(
  code: OrderError['code'], 
  message: string, 
  userMessage: string, 
  metadata?: Record<string, any>
): OrderError {
  return {
    code,
    message,
    userMessage,
    metadata,
    name: 'OrderError',
  } as OrderError & Error;
}

// Enhanced default query configuration (following cart pattern)
const defaultQueryConfig = {
  staleTime: 2 * 60 * 1000, // 2 minutes (matching cart)
  gcTime: 5 * 60 * 1000, // 5 minutes (matching cart)
  refetchOnMount: true, // Following cart pattern
  refetchOnWindowFocus: false,
  retry: (failureCount: number, error: any) => {
    // Don't retry on unauthorized errors (following cart pattern)
    if ((error as OrderError).code === 'UNAUTHORIZED') {
      return false;
    }
    return failureCount < 2;
  },
  retryDelay: 1000,
};

/**
 * Enhanced Hook for fetching customer orders with React Query atomic pattern (following cart pattern)
 */
export const useCustomerOrders = (userEmail?: string): UseQueryResult<Order[], Error> => {
  const { data: user } = useCurrentUser();
  const effectiveUserEmail = userEmail || user?.email;
  
  const query = useQuery<Order[], Error>({
    queryKey: orderKeys.lists(user?.id),
    queryFn: async (): Promise<Order[]> => {
      try {
        const orders = await OrderService.getCustomerOrders(effectiveUserEmail!);
        return orders || [];
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('unauthorized')) {
          throw createOrderError(
            'UNAUTHORIZED',
            error.message,
            'Your session has expired. Please sign in again.',
            { userEmail: effectiveUserEmail }
          );
        }
        if (error.message?.includes('network')) {
          throw createOrderError(
            'NETWORK_ERROR',
            error.message,
            'Unable to load orders. Please check your connection.',
            { userEmail: effectiveUserEmail }
          );
        }
        throw createOrderError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to fetch customer orders',
          'Unable to load your orders. Please try again.',
          { userEmail: effectiveUserEmail }
        );
      }
    },
    // ✅ ARCHITECTURAL PATTERN: Context-appropriate cache for customer orders
    staleTime: 1 * 60 * 1000, // 1 minute - orders change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes - moderate retention for user orders
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    // ✅ ARCHITECTURAL PATTERN: React Query handles conditional execution
    enabled: !!effectiveUserEmail,
    retry: (failureCount: number, error: any) => {
      // Don't retry on unauthorized errors (following cart pattern)
      if ((error as OrderError).code === 'UNAUTHORIZED') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  // ✅ ARCHITECTURAL PATTERN: Simple conditional return based on auth state
  if (!effectiveUserEmail) {
    return {
      ...query,
      data: [],
      error: createOrderError(
        'UNAUTHORIZED',
        'No authenticated user',
        'Please sign in to view your orders.'
      ),
      isError: true,
    } as UseQueryResult<Order[], Error>;
  }

  return query;
};

/**
 * Enhanced Hook for fetching all orders with optional filtering (admin only) (following cart pattern)
 */
export const useOrders = (filters: OrderFilters = {}): UseQueryResult<Order[], Error> => {
  const { data: user } = useCurrentUser();
  
  const query = useQuery<Order[], Error>({
    queryKey: orderKeys.list(filters),
    queryFn: async (): Promise<Order[]> => {
      try {
        const orders = await OrderService.getAllOrders(filters);
        return orders || [];
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('unauthorized')) {
          throw createOrderError(
            'UNAUTHORIZED',
            error.message,
            'Access denied. Admin privileges required.',
            { filters, userId: user?.id }
          );
        }
        if (error.message?.includes('network')) {
          throw createOrderError(
            'NETWORK_ERROR',
            error.message,
            'Unable to load orders. Please check your connection.',
            { filters }
          );
        }
        throw createOrderError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to fetch orders',
          'Unable to load orders. Please try again.',
          { filters }
        );
      }
    },
    // ✅ ARCHITECTURAL PATTERN: Context-appropriate cache for admin orders
    staleTime: 30 * 1000, // 30 seconds - admin orders change very frequently
    gcTime: 2 * 60 * 1000, // 2 minutes - shorter retention for admin views
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    // ✅ ARCHITECTURAL PATTERN: Admin queries don't need user auth (service handles it)
    enabled: true,
    retry: (failureCount: number, error: any) => {
      // Don't retry on unauthorized errors (following cart pattern)
      if ((error as OrderError).code === 'UNAUTHORIZED') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  return query;
};

/**
 * Enhanced Hook for fetching a specific order by ID (following cart pattern)
 */
export const useOrder = (orderId: string): UseQueryResult<Order | null, Error> => {
  const { data: user } = useCurrentUser();
  
  const query = useQuery<Order | null, Error>({
    queryKey: orderKeys.detail(orderId),
    queryFn: async (): Promise<Order | null> => {
      try {
        const order = await OrderService.getOrder(orderId);
        return order || null;
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('not found')) {
          throw createOrderError(
            'ORDER_NOT_FOUND',
            error.message,
            'Order not found. Please check the order ID.',
            { orderId }
          );
        }
        if (error.message?.includes('unauthorized')) {
          throw createOrderError(
            'UNAUTHORIZED',
            error.message,
            'Access denied. You cannot view this order.',
            { orderId, userId: user?.id }
          );
        }
        if (error.message?.includes('network')) {
          throw createOrderError(
            'NETWORK_ERROR',
            error.message,
            'Unable to load order details. Please check your connection.',
            { orderId }
          );
        }
        throw createOrderError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to fetch order',
          'Unable to load order details. Please try again.',
          { orderId }
        );
      }
    },
    // ✅ ARCHITECTURAL PATTERN: Context-appropriate cache for individual orders
    staleTime: 2 * 60 * 1000, // 2 minutes - individual orders change moderately
    gcTime: 10 * 60 * 1000, // 10 minutes - longer retention for order details
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    // ✅ ARCHITECTURAL PATTERN: Combined enabled guard for orderId
    enabled: !!orderId,
    retry: (failureCount: number, error: any) => {
      // Don't retry on unauthorized errors (following cart pattern)
      if ((error as OrderError).code === 'UNAUTHORIZED') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  // ✅ ARCHITECTURAL PATTERN: Simple conditional return for validation
  if (!orderId) {
    return {
      ...query,
      data: null,
      error: createOrderError(
        'INVALID_ORDER',
        'No order ID provided',
        'Order ID is required to fetch order details.'
      ),
      isError: true,
    } as UseQueryResult<Order | null, Error>;
  }

  return query;
};

/**
 * Enhanced Hook for fetching order statistics (admin only) (following cart pattern)
 */
export const useOrderStats = () => {
  const { data: user } = useCurrentUser();
  
  return useQuery({
    queryKey: orderKeys.stats(),
    queryFn: async () => {
      try {
        const stats = await OrderService.getOrderStats();
        return stats;
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('unauthorized')) {
          throw createOrderError(
            'UNAUTHORIZED',
            error.message,
            'Access denied. Admin privileges required.',
            { userId: user?.id }
          );
        }
        if (error.message?.includes('network')) {
          throw createOrderError(
            'NETWORK_ERROR',
            error.message,
            'Unable to load statistics. Please check your connection.'
          );
        }
        throw createOrderError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to fetch order statistics',
          'Unable to load statistics. Please try again.'
        );
      }
    },
    // ✅ ARCHITECTURAL PATTERN: Context-appropriate cache for statistics (can be more stale)
    staleTime: 2 * 60 * 1000, // 2 minutes - stats change less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes - longer retention for stats
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    // ✅ ARCHITECTURAL PATTERN: Admin stats don't need user auth (service handles it)
    enabled: true,
    retry: (failureCount: number, error: any) => {
      // Don't retry on unauthorized errors (following cart pattern)
      if ((error as OrderError).code === 'UNAUTHORIZED') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });
};

/**
 * Enhanced Hook for fetching user-specific orders (following cart pattern)
 */
export const useUserOrders = (userId: string): UseQueryResult<Order[], Error> => {
  const { data: currentUser } = useCurrentUser();
  
  const query = useQuery<Order[], Error>({
    queryKey: orderKeys.lists(userId),
    queryFn: async (): Promise<Order[]> => {
      try {
        const orders = await OrderService.getCustomerOrders(userId);
        return orders || [];
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('unauthorized')) {
          throw createOrderError(
            'UNAUTHORIZED',
            error.message,
            'Access denied. You cannot view these orders.',
            { userId, currentUserId: currentUser?.id }
          );
        }
        if (error.message?.includes('network')) {
          throw createOrderError(
            'NETWORK_ERROR',
            error.message,
            'Unable to load orders. Please check your connection.',
            { userId }
          );
        }
        throw createOrderError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to fetch user orders',
          'Unable to load orders. Please try again.',
          { userId }
        );
      }
    },
    // ✅ ARCHITECTURAL PATTERN: Context-appropriate cache for user-specific orders
    staleTime: 1 * 60 * 1000, // 1 minute - user orders change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes - moderate retention
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    // ✅ ARCHITECTURAL PATTERN: Combined enabled guard for userId
    enabled: !!userId,
    retry: (failureCount: number, error: any) => {
      // Don't retry on unauthorized errors (following cart pattern)
      if ((error as OrderError).code === 'UNAUTHORIZED') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  // ✅ ARCHITECTURAL PATTERN: Simple conditional return for validation
  if (!userId) {
    return {
      ...query,
      data: [],
      error: createOrderError(
        'INVALID_ORDER',
        'No user ID provided',
        'User ID is required to fetch orders.'
      ),
      isError: true,
    } as UseQueryResult<Order[], Error>;
  }

  return query;
};

/**
 * Enhanced Mutation hook for updating order status (following cart pattern)
 */
export const useUpdateOrderStatusMutation = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  return useMutation<OrderOperationResult<Order>, Error, { orderId: string; status: string }, OrderMutationContext>({
    mutationFn: async ({ orderId, status }): Promise<OrderOperationResult<Order>> => {
      try {
        const result = await OrderService.updateOrderStatus(orderId, status);
        if (result.success && result.order) {
          return { success: true, data: result.order };
        }
        throw new Error(result.message || 'Update failed');
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('not found')) {
          throw createOrderError(
            'ORDER_NOT_FOUND',
            error.message,
            'Order not found. Please check the order ID.',
            { orderId, status }
          );
        }
        if (error.message?.includes('unauthorized')) {
          throw createOrderError(
            'UNAUTHORIZED',
            error.message,
            'Access denied. You cannot update this order.',
            { orderId, status, userId: user?.id }
          );
        }
        if (error.message?.includes('invalid status')) {
          throw createOrderError(
            'STATUS_UPDATE_FAILED',
            error.message,
            'Invalid status transition. Please check the order status.',
            { orderId, status }
          );
        }
        if (error.message?.includes('network')) {
          throw createOrderError(
            'NETWORK_ERROR',
            error.message,
            'Unable to update order status. Please check your connection.',
            { orderId, status }
          );
        }
        throw createOrderError(
          'STATUS_UPDATE_FAILED',
          error.message || 'Order status update failed',
          'Unable to update order status. Please try again.',
          { orderId, status }
        );
      }
    },

    onMutate: async ({ orderId, status }): Promise<OrderMutationContext> => {
      // Cancel outgoing queries to prevent race conditions (following cart pattern)
      await queryClient.cancelQueries({ queryKey: orderKeys.all() });
      await queryClient.cancelQueries({ queryKey: orderKeys.lists() });
      
      // Snapshot previous values for rollback (following cart pattern)
      const previousOrders = queryClient.getQueryData<Order[]>(orderKeys.all());
      const previousUserOrders = queryClient.getQueryData<Order[]>(orderKeys.lists());
      const previousOrder = queryClient.getQueryData<Order>(orderKeys.detail(orderId));
      
      // Optimistically update all relevant caches (following cart pattern)
      queryClient.setQueryData(orderKeys.all(), (old: Order[] | undefined) =>
        old?.map(order =>
          order.id === orderId
            ? { ...order, status: status as any, updatedAt: new Date().toISOString() }
            : order
        )
      );
      
      queryClient.setQueryData(orderKeys.lists(), (old: Order[] | undefined) =>
        old?.map(order =>
          order.id === orderId
            ? { ...order, status: status as any, updatedAt: new Date().toISOString() }
            : order
        )
      );
      
      queryClient.setQueryData(orderKeys.detail(orderId), (old: Order | undefined) =>
        old ? { ...old, status: status as any, updatedAt: new Date().toISOString() } : old
      );
      
      return { 
        previousOrders, 
        previousUserOrders, 
        previousOrder,
        operationType: 'update-status',
        metadata: { orderId, status }
      };
    },

    onError: (error: any, { orderId, status }, context?: OrderMutationContext) => {
      // Enhanced error logging (following cart pattern)
      console.error('❌ Failed to update order status:', {
        error: error.message,
        userMessage: (error as OrderError).userMessage,
        orderId,
        status,
        userId: user?.id
      });
      
      // Rollback optimistic updates (following cart pattern)
      if (context?.previousOrders) {
        queryClient.setQueryData(orderKeys.all(), context.previousOrders);
      }
      if (context?.previousUserOrders) {
        queryClient.setQueryData(orderKeys.lists(), context.previousUserOrders);
      }
      if (context?.previousOrder) {
        queryClient.setQueryData(orderKeys.detail(orderId), context.previousOrder);
      }
    },

    onSuccess: async (result: OrderOperationResult<Order>, { orderId, status: _status }) => {
      if (result.success && result.data) {
        // Record pattern success
        ValidationMonitor.recordPatternSuccess({
          service: 'useOrders',
          pattern: 'order_status_update',
          operation: 'updateOrderStatus',
          category: 'order_management_pattern_success'
        });
        
        console.log('✅ Order status updated successfully:', {
          orderId: result.data.id,
          newStatus: result.data.status,
          userId: user?.id
        });
        
        // PERFORMANCE: Smart cache updates instead of invalidations to avoid refetches
        const updatedOrder = result.data;
        
        // Standard React Query pattern: invalidate all order-related caches
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: orderKeys.all() }), // Should match all orders queries
          queryClient.invalidateQueries({ queryKey: orderKeys.lists() }), // More specific for lists
          queryClient.invalidateQueries({ queryKey: orderKeys.details() }), // More specific for details
          queryClient.invalidateQueries({ queryKey: orderKeys.stats() })
        ]);
        
        // Broadcast handled by OrderService (following cart pattern)
      }
    },
    
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, error: any) => {
      // Don't retry on validation errors, not found, or unauthorized
      if ((error as OrderError).code === 'ORDER_NOT_FOUND' || 
          (error as OrderError).code === 'UNAUTHORIZED' ||
          (error as OrderError).code === 'STATUS_UPDATE_FAILED') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
    // ✅ NO onSettled - invalidation happens in onSuccess only (following cart pattern)
  });
};

/**
 * Enhanced Mutation hook for bulk updating order status (following cart pattern)
 */
export const useBulkUpdateOrderStatusMutation = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  return useMutation<OrderOperationResult<Order[]>, Error, { orderIds: string[]; status: string }, OrderMutationContext>({
    mutationFn: async ({ orderIds, status }): Promise<OrderOperationResult<Order[]>> => {
      try {
        const result = await OrderService.bulkUpdateOrderStatus(orderIds, status);
        if (result.success && result.updatedOrders) {
          return { success: true, data: result.updatedOrders };
        }
        throw new Error(result.message || 'Bulk update failed');
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('unauthorized')) {
          throw createOrderError(
            'UNAUTHORIZED',
            error.message,
            'Access denied. You cannot update these orders.',
            { orderIds, status, userId: user?.id }
          );
        }
        if (error.message?.includes('invalid status')) {
          throw createOrderError(
            'STATUS_UPDATE_FAILED',
            error.message,
            'Invalid status transition for one or more orders.',
            { orderIds, status }
          );
        }
        if (error.message?.includes('network')) {
          throw createOrderError(
            'NETWORK_ERROR',
            error.message,
            'Unable to update order statuses. Please check your connection.',
            { orderIds, status }
          );
        }
        throw createOrderError(
          'STATUS_UPDATE_FAILED',
          error.message || 'Bulk order status update failed',
          'Unable to update order statuses. Please try again.',
          { orderIds, status }
        );
      }
    },

    onMutate: async ({ orderIds, status }): Promise<OrderMutationContext> => {
      // Cancel outgoing queries to prevent race conditions (following cart pattern)
      await queryClient.cancelQueries({ queryKey: orderKeys.all() });
      await queryClient.cancelQueries({ queryKey: orderKeys.lists(user?.id) });

      // Snapshot previous values for rollback (following cart pattern)
      const previousOrders = queryClient.getQueryData<Order[]>(orderKeys.list({}));
      const previousStats = queryClient.getQueryData(orderKeys.stats());

      // Optimistically update multiple orders (following cart pattern)
      queryClient.setQueryData(orderKeys.list({}), (old: Order[] | undefined) =>
        old?.map(order =>
          orderIds.includes(order.id)
            ? { ...order, status: status as any, updatedAt: new Date().toISOString() }
            : order
        )
      );

      // Optimistically update statistics for bulk update with enhanced logic (following cart pattern)
      queryClient.setQueryData(orderKeys.stats(), (oldStats: any) => {
        if (!oldStats || !previousOrders) return oldStats;
        
        const updatedOrders = (previousOrders as Order[]).map(order =>
          orderIds.includes(order.id)
            ? { ...order, status: status as any }
            : order
        );
        
        // Recalculate with same logic as service (following cart pattern)
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        const todayOrders = updatedOrders.filter(o => o.createdAt && new Date(o.createdAt) >= todayStart);
        const weekOrders = updatedOrders.filter(o => o.createdAt && new Date(o.createdAt) >= weekStart);
        const dailyCompleted = todayOrders.filter(o => o.status === 'completed');
        const weeklyCompleted = weekOrders.filter(o => o.status === 'completed');
        const allPending = updatedOrders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status));
        
        return {
          daily: {
            ordersPlaced: todayOrders.length,
            ordersCompleted: dailyCompleted.length,
            revenue: dailyCompleted.reduce((sum, o) => sum + (o.total || 0), 0),
            pendingFromToday: todayOrders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length,
          },
          weekly: {
            ordersPlaced: weekOrders.length,
            ordersCompleted: weeklyCompleted.length,
            revenue: weeklyCompleted.reduce((sum, o) => sum + (o.total || 0), 0),
            pendingFromWeek: weekOrders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length,
          },
          active: {
            totalPending: allPending.length,
          },
        };
      });

      return { 
        previousOrders, 
        previousStats,
        operationType: 'bulk-update-status',
        metadata: { orderIds, status }
      };
    },

    onError: (error: any, { orderIds, status }, context?: OrderMutationContext) => {
      // Enhanced error logging (following cart pattern)
      console.error('❌ Failed to bulk update order status:', {
        error: error.message,
        userMessage: (error as OrderError).userMessage,
        orderCount: orderIds.length,
        status,
        userId: user?.id
      });
      
      // Rollback optimistic updates (following cart pattern)
      if (context?.previousOrders) {
        queryClient.setQueryData(orderKeys.list({}), context.previousOrders);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(orderKeys.stats(), context.previousStats);
      }
    },

    onSuccess: async (result: OrderOperationResult<Order[]>, { orderIds: _orderIds, status }) => {
      if (result.success && result.data) {
        console.log('✅ Orders bulk updated successfully:', {
          updatedCount: result.data.length,
          newStatus: status,
          userId: user?.id
        });
        
        // Standard React Query pattern: invalidate all order-related caches
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: orderKeys.all() }), // Should match all orders queries
          queryClient.invalidateQueries({ queryKey: orderKeys.lists() }), // More specific for lists
          queryClient.invalidateQueries({ queryKey: orderKeys.details() }), // More specific for details
          queryClient.invalidateQueries({ queryKey: orderKeys.stats() })
        ]);
        
        // Broadcast handled by OrderService (following cart pattern)
      }
    },
    
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, error: any) => {
      // Don't retry on validation errors or unauthorized
      if ((error as OrderError).code === 'UNAUTHORIZED' ||
          (error as OrderError).code === 'STATUS_UPDATE_FAILED') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
    // ✅ NO onSettled - invalidation happens in onSuccess only (following cart pattern)
  });
};

/**
 * Enhanced Combined operations hook (following cart pattern)
 */
export const useOrderOperations = () => {
  const updateStatusMutation = useUpdateOrderStatusMutation();
  const bulkUpdateMutation = useBulkUpdateOrderStatusMutation();

  // Enhanced useCallback functions for stable references (following cart pattern)
  const updateOrderStatus = useCallback(
    (params: { orderId: string; status: string }) => updateStatusMutation.mutate(params),
    [updateStatusMutation.mutate]
  );
  
  const updateOrderStatusAsync = useCallback(
    (params: { orderId: string; status: string }) => updateStatusMutation.mutateAsync(params),
    [updateStatusMutation.mutateAsync]
  );
  
  const bulkUpdateOrderStatus = useCallback(
    (params: { orderIds: string[]; status: string }) => bulkUpdateMutation.mutate(params),
    [bulkUpdateMutation.mutate]
  );
  
  const bulkUpdateOrderStatusAsync = useCallback(
    (params: { orderIds: string[]; status: string }) => bulkUpdateMutation.mutateAsync(params),
    [bulkUpdateMutation.mutateAsync]
  );

  return {
    // Enhanced mutation functions with stable references (following cart pattern)
    updateOrderStatus,
    updateOrderStatusAsync,
    bulkUpdateOrderStatus,
    bulkUpdateOrderStatusAsync,
    
    // Enhanced mutation states (following cart pattern)
    isUpdatingStatus: updateStatusMutation.isPending,
    isBulkUpdating: bulkUpdateMutation.isPending,
    isLoading: updateStatusMutation.isPending || bulkUpdateMutation.isPending,
    
    // Enhanced error states (following cart pattern)
    updateError: updateStatusMutation.error,
    bulkUpdateError: bulkUpdateMutation.error,
    
    // Enhanced mutation utilities (following cart pattern)
    resetUpdateError: updateStatusMutation.reset,
    resetBulkUpdateError: bulkUpdateMutation.reset,
  };
};

// Enhanced exports (following cart pattern)
export { 
  orderKeys,
  type OrderError,
  type OrderOperationResult,
  type OrderMutationContext
};
