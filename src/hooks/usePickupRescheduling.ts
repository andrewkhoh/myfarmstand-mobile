import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { PickupReschedulingService, RescheduleRequest, RescheduleResult } from '../services/pickupReschedulingService';
import { orderKeys } from '../utils/queryKeyFactory';
import { orderBroadcast } from '../utils/broadcastFactory';
import { useCurrentUser } from './useAuth';
import { Order } from '../types';

// Enhanced interfaces following cart pattern
interface ReschedulingError {
  code: 'INVALID_REQUEST' | 'RESCHEDULE_FAILED' | 'UNAUTHORIZED' | 'NETWORK_ERROR' | 'ORDER_NOT_FOUND' | 'ALREADY_RESCHEDULED' | 'UNKNOWN_ERROR';
  message: string;
  userMessage: string;
  metadata?: Record<string, any>;
}

interface ReschedulingOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: ReschedulingError;
  message?: string;
}

interface ReschedulingMutationContext {
  previousOrders?: Order[];
  previousUserOrders?: Order[];
  operationType: 'reschedule-pickup';
  metadata: Record<string, any>;
}

// Enhanced error creation utility (following cart pattern)
function createReschedulingError(
  code: ReschedulingError['code'], 
  message: string, 
  userMessage: string, 
  metadata?: Record<string, any>
): ReschedulingError {
  return {
    code,
    message,
    userMessage,
    metadata,
    name: 'ReschedulingError',
  } as ReschedulingError & Error;
}

// Enhanced query keys for rescheduling operations (following cart pattern)
const reschedulingKeys = {
  all: ['rescheduling'] as const,
  reschedules: (orderId: string) => [...reschedulingKeys.all, 'reschedule', orderId] as const,
  validation: (orderId: string) => [...reschedulingKeys.all, 'validation', orderId] as const,
  history: (userId: string) => [...reschedulingKeys.all, 'history', userId] as const,
};

/**
 * Hook for pickup rescheduling operations following React Query atomic pattern
 */
export const usePickupRescheduling = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  // Enhanced reschedule pickup mutation with comprehensive error handling (following cart pattern)
  const reschedulePickupMutation = useMutation<ReschedulingOperationResult<RescheduleResult>, Error, RescheduleRequest, ReschedulingMutationContext>({
    mutationFn: async (request: RescheduleRequest): Promise<ReschedulingOperationResult<RescheduleResult>> => {
      // Authentication guard (following cart pattern)
      if (!user?.id) {
        throw createReschedulingError(
          'UNAUTHORIZED',
          'No authenticated user',
          'Please sign in to reschedule your pickup.'
        );
      }

      try {
        const result = await PickupReschedulingService.reschedulePickup(request);
        return { success: true, data: result };
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('not found')) {
          throw createReschedulingError(
            'ORDER_NOT_FOUND',
            error.message,
            'Order not found. Please check the order ID.',
            { request, userId: user.id }
          );
        }
        if (error.message?.includes('unauthorized')) {
          throw createReschedulingError(
            'UNAUTHORIZED',
            error.message,
            'Access denied. You cannot reschedule this order.',
            { request, userId: user.id }
          );
        }
        if (error.message?.includes('already rescheduled') || error.message?.includes('limit')) {
          throw createReschedulingError(
            'ALREADY_RESCHEDULED',
            error.message,
            'This order has already been rescheduled or reached the reschedule limit.',
            { request }
          );
        }
        if (error.message?.includes('invalid') || error.message?.includes('validation')) {
          throw createReschedulingError(
            'INVALID_REQUEST',
            error.message,
            'Invalid reschedule request. Please check the new pickup date.',
            { request }
          );
        }
        if (error.message?.includes('network')) {
          throw createReschedulingError(
            'NETWORK_ERROR',
            error.message,
            'Unable to reschedule pickup. Please check your connection.',
            { request }
          );
        }
        throw createReschedulingError(
          'RESCHEDULE_FAILED',
          error.message || 'Reschedule pickup failed',
          'Unable to reschedule pickup. Please try again.',
          { request }
        );
      }
    },
    
    onMutate: async (request: RescheduleRequest): Promise<ReschedulingMutationContext> => {
      // Cancel outgoing queries to prevent race conditions (following cart pattern)
      await queryClient.cancelQueries({ queryKey: orderKeys.all() });
      await queryClient.cancelQueries({ queryKey: orderKeys.lists(user?.id) });
      
      // Snapshot previous values for rollback (following cart pattern)
      const previousOrders = queryClient.getQueryData<Order[]>(orderKeys.all());
      const previousUserOrders = queryClient.getQueryData<Order[]>(orderKeys.lists(user?.id));
      
      // Optimistically update all relevant caches (following cart pattern)
      queryClient.setQueryData(orderKeys.all(), (old: Order[] | undefined) =>
        old?.map(order =>
          order.id === request.orderId
            ? { ...order, pickupDate: request.newPickupDate, updatedAt: new Date().toISOString() }
            : order
        )
      );
      
      queryClient.setQueryData(orderKeys.lists(user?.id), (old: Order[] | undefined) =>
        old?.map(order =>
          order.id === request.orderId
            ? { ...order, pickupDate: request.newPickupDate, updatedAt: new Date().toISOString() }
            : order
        )
      );
      
      return { 
        previousOrders, 
        previousUserOrders,
        operationType: 'reschedule-pickup',
        metadata: { request, userId: user?.id }
      };
    },
    
    onError: (error: any, request: RescheduleRequest, context?: ReschedulingMutationContext) => {
      // Enhanced error logging (following cart pattern)
      console.error('❌ Failed to reschedule pickup:', {
        error: error.message,
        userMessage: (error as ReschedulingError).userMessage,
        orderId: request.orderId,
        newPickupDate: request.newPickupDate,
        userId: user?.id
      });
      
      // Rollback optimistic updates (following cart pattern)
      if (context?.previousOrders) {
        queryClient.setQueryData(orderKeys.all(), context.previousOrders);
      }
      if (context?.previousUserOrders) {
        queryClient.setQueryData(orderKeys.lists(user?.id), context.previousUserOrders);
      }
    },
    
    onSuccess: async (result: ReschedulingOperationResult<RescheduleResult>, request: RescheduleRequest) => {
      if (result.success && result.data) {
        console.log('✅ Pickup rescheduled successfully:', {
          orderId: request.orderId,
          newPickupDate: request.newPickupDate,
          userId: user?.id
        });
        
        // Smart invalidation strategy (following cart pattern)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: orderKeys.all() }),
          queryClient.invalidateQueries({ queryKey: orderKeys.lists(user?.id) }),
          queryClient.invalidateQueries({ queryKey: reschedulingKeys.reschedules(request.orderId) })
        ]);
        
        // Broadcast the reschedule event for real-time sync (following cart pattern)
        try {
          await orderBroadcast.user.send('pickup-rescheduled', {
            orderId: request.orderId,
            newPickupDate: request.newPickupDate,
            userId: user?.id,
            timestamp: new Date().toISOString()
          });
        } catch (broadcastError) {
          // Don't fail the entire operation if broadcast fails
          console.warn('Failed to broadcast reschedule event:', broadcastError);
        }
      }
    },
    
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, error: any) => {
      // Don't retry on validation errors, unauthorized, or already rescheduled
      if ((error as ReschedulingError).code === 'INVALID_REQUEST' || 
          (error as ReschedulingError).code === 'UNAUTHORIZED' ||
          (error as ReschedulingError).code === 'ALREADY_RESCHEDULED' ||
          (error as ReschedulingError).code === 'ORDER_NOT_FOUND') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
    // ✅ NO onSettled - invalidation happens in onSuccess only (following cart pattern)
  });

  // Enhanced check if order was recently rescheduled (following cart pattern)
  const checkRecentReschedule = useCallback(async (orderId: string) => {
    try {
      // Authentication guard (following cart pattern)
      if (!user?.id) {
        throw createReschedulingError(
          'UNAUTHORIZED',
          'No authenticated user',
          'Please sign in to check reschedule history.'
        );
      }

      if (!orderId) {
        throw createReschedulingError(
          'ORDER_NOT_FOUND',
          'No order ID provided',
          'Order ID is required to check reschedule status.'
        );
      }

      const result = await PickupReschedulingService.wasRecentlyRescheduled(orderId);
      return result;
    } catch (error: any) {
      console.error('Error checking recent reschedule:', {
        error: error.message,
        orderId,
        userId: user?.id
      });
      return false;
    }
  }, [user?.id]);

  // Enhanced reschedule validation with comprehensive checks (following cart pattern)
  const validateReschedule = useCallback(async (request: RescheduleRequest) => {
    try {
      // Authentication guard (following cart pattern)
      if (!user?.id) {
        return { 
          isValid: false, 
          canReschedule: false, 
          reason: 'Please sign in to reschedule pickup.' 
        };
      }

      if (!request.orderId) {
        return { 
          isValid: false, 
          canReschedule: false, 
          reason: 'Order ID is required.' 
        };
      }

      if (!request.newPickupDate) {
        return { 
          isValid: false, 
          canReschedule: false, 
          reason: 'New pickup date is required.' 
        };
      }

      // Enhanced client-side validation (following cart pattern)
      const now = new Date();
      const requestedDate = new Date(request.newPickupDate);
      
      if (isNaN(requestedDate.getTime())) {
        return { 
          isValid: false, 
          canReschedule: false, 
          reason: 'Invalid pickup date format.' 
        };
      }
      
      if (requestedDate < now) {
        return { 
          isValid: false, 
          canReschedule: false, 
          reason: 'Cannot reschedule to past date.' 
        };
      }
      
      // Check if too far in the future (business rule)
      const maxFutureDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
      if (requestedDate > maxFutureDate) {
        return { 
          isValid: false, 
          canReschedule: false, 
          reason: 'Cannot reschedule more than 30 days in the future.' 
        };
      }
      
      return { 
        isValid: true, 
        canReschedule: true, 
        validatedDate: requestedDate.toISOString() 
      };
    } catch (error: any) {
      console.error('Error validating reschedule:', {
        error: error.message,
        request,
        userId: user?.id
      });
      return { 
        isValid: false, 
        canReschedule: false, 
        reason: 'Validation failed. Please try again.' 
      };
    }
  }, [user?.id]);

  // Enhanced useCallback functions for stable references (following cart pattern)
  const reschedulePickup = useCallback(
    (request: RescheduleRequest) => reschedulePickupMutation.mutate(request),
    [reschedulePickupMutation.mutate]
  );
  
  const reschedulePickupAsync = useCallback(
    (request: RescheduleRequest) => reschedulePickupMutation.mutateAsync(request),
    [reschedulePickupMutation.mutateAsync]
  );

  const getReschedulingQueryKey = useCallback(
    (orderId: string) => reschedulingKeys.reschedules(orderId),
    []
  );

  return {
    // Enhanced mutation states (following cart pattern)
    isRescheduling: reschedulePickupMutation.isPending,
    rescheduleError: reschedulePickupMutation.error,
    
    // Enhanced mutation functions with stable references (following cart pattern)
    reschedulePickup,
    reschedulePickupAsync,
    
    // Enhanced utility functions (following cart pattern)
    checkRecentReschedule,
    validateReschedule,
    
    // Enhanced query keys for external use (following cart pattern)
    getReschedulingQueryKey,
    getValidationQueryKey: (orderId: string) => reschedulingKeys.validation(orderId),
    getHistoryQueryKey: (userId: string) => reschedulingKeys.history(userId),
    
    // Enhanced mutation utilities (following cart pattern)
    resetRescheduleError: reschedulePickupMutation.reset,
  };
};

export { 
  reschedulingKeys,
  type ReschedulingError,
  type ReschedulingOperationResult,
  type ReschedulingMutationContext
};
