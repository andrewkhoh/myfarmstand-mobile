import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { PickupReschedulingService, RescheduleRequest, RescheduleResult } from '../services/pickupReschedulingService';
import { orderBroadcast } from '../utils/broadcastFactory';
import { useCurrentUser } from './useAuth';
import { Order } from '../types';

// Query keys for rescheduling operations
const reschedulingKeys = {
  all: ['rescheduling'] as const,
  reschedules: (orderId: string) => [...reschedulingKeys.all, 'reschedule', orderId] as const,
};

/**
 * Hook for pickup rescheduling operations following React Query atomic pattern
 */
export const usePickupRescheduling = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  // Reschedule pickup mutation with optimistic updates
  const reschedulePickupMutation = useMutation({
    mutationFn: (request: RescheduleRequest) => PickupReschedulingService.reschedulePickup(request),
    
    onMutate: async (request: RescheduleRequest) => {
      // Cancel outgoing queries to prevent race conditions (following cart pattern)
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      await queryClient.cancelQueries({ queryKey: ['orders', 'user', user?.id] });
      
      // Snapshot previous values for rollback (following cart pattern)
      const previousOrders = queryClient.getQueryData(['orders']);
      const previousUserOrders = queryClient.getQueryData(['orders', 'user', user?.id]);
      
      // Optimistically update all relevant caches (following cart pattern)
      queryClient.setQueryData(['orders'], (old: Order[] | undefined) =>
        old?.map(order =>
          order.id === request.orderId
            ? { ...order, pickupDate: request.newPickupDate, updatedAt: new Date().toISOString() }
            : order
        )
      );
      
      queryClient.setQueryData(['orders', 'user', user?.id], (old: Order[] | undefined) =>
        old?.map(order =>
          order.id === request.orderId
            ? { ...order, pickupDate: request.newPickupDate, updatedAt: new Date().toISOString() }
            : order
        )
      );
      
      return { previousOrders, previousUserOrders };
    },
    
    onSuccess: async (result, request) => {
      console.log('✅ Pickup rescheduled successfully:', result);
      
      // Broadcast the reschedule event for real-time sync (following cart pattern)
      await orderBroadcast.user.send('pickup-rescheduled', {
        orderId: request.orderId,
        newPickupDate: request.newPickupDate,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      
      // Invalidate queries to refresh data (following cart pattern)
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    
    onError: (err, request, context) => {
      console.error('❌ Failed to reschedule pickup:', err);
      
      // Rollback optimistic updates (following cart pattern)
      if (context?.previousOrders) {
        queryClient.setQueryData(['orders'], context.previousOrders);
      }
      if (context?.previousUserOrders) {
        queryClient.setQueryData(['orders', 'user', user?.id], context.previousUserOrders);
      }
    },
  });

  // Check if order was recently rescheduled
  const checkRecentReschedule = useCallback(async (orderId: string) => {
    try {
      return await PickupReschedulingService.wasRecentlyRescheduled(orderId);
    } catch (error) {
      console.error('Error checking recent reschedule:', error);
      return false;
    }
  }, []);

  // Basic reschedule validation (client-side)
  const validateReschedule = useCallback(async (request: RescheduleRequest) => {
    try {
      // Basic client-side validation
      const now = new Date();
      const requestedDate = new Date(request.newPickupDate);
      
      if (requestedDate < now) {
        return { isValid: false, canReschedule: false, reason: 'Cannot reschedule to past date' };
      }
      
      return { isValid: true, canReschedule: true };
    } catch (error) {
      console.error('Error validating reschedule:', error);
      return { isValid: false, canReschedule: false, reason: 'Validation failed' };
    }
  }, []);

  return {
    // Mutation states
    isRescheduling: reschedulePickupMutation.isPending,
    rescheduleError: reschedulePickupMutation.error,
    
    // Mutation functions
    reschedulePickup: reschedulePickupMutation.mutate,
    reschedulePickupAsync: reschedulePickupMutation.mutateAsync,
    
    // Utility functions
    checkRecentReschedule,
    validateReschedule,
    
    // Query keys for external use
    getReschedulingQueryKey: (orderId: string) => reschedulingKeys.reschedules(orderId),
  };
};

export { reschedulingKeys };
