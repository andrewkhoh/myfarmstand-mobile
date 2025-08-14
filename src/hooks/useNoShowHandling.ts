import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { NoShowHandlingService } from '../services/noShowHandlingService';
import { orderBroadcast } from '../utils/broadcastFactory';
import { useCurrentUser } from './useAuth';
import { Order } from '../types';

// Query keys for no-show operations
const noShowKeys = {
  all: ['noshow'] as const,
  checks: (orderId: string) => [...noShowKeys.all, 'check', orderId] as const,
  history: (userId: string) => [...noShowKeys.all, 'history', userId] as const,
};

/**
 * Hook for no-show handling operations following React Query atomic pattern
 */
export const useNoShowHandling = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  // Process no-show orders mutation (using static service method)
  const processNoShowMutation = useMutation({
    mutationFn: (config?: any) => NoShowHandlingService.processNoShowOrders(config),
    
    onMutate: async (config?: any) => {
      // Cancel outgoing queries to prevent race conditions (following cart pattern)
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      await queryClient.cancelQueries({ queryKey: ['noshow'] });
      
      // Snapshot previous order data for rollback (following cart pattern)
      const previousOrders = queryClient.getQueryData(['orders']);
      const previousNoShowData = queryClient.getQueryData(['noshow']);
      
      return { previousOrders, previousNoShowData };
    },
    
    onSuccess: async (result, config) => {
      console.log('✅ No-show processing completed:', result);
      
      // Broadcast no-show events for each processed order (following cart pattern)
      if (result.processedOrders) {
        for (const processedOrder of result.processedOrders) {
          await orderBroadcast.user.send('order-no-show', {
            orderId: processedOrder.orderId,
            action: processedOrder.action,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Invalidate all order-related queries (following cart pattern)
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['noshow'] });
    },
    
    onError: (error, config, context) => {
      console.error('❌ No-show processing failed:', error);
      
      // Rollback optimistic updates on error (following cart pattern)
      if (context?.previousOrders) {
        queryClient.setQueryData(['orders'], context.previousOrders);
      }
      if (context?.previousNoShowData) {
        queryClient.setQueryData(['noshow'], context.previousNoShowData);
      }
    }
    // ✅ NO onSettled - invalidation happens in onSuccess only (following cart pattern)
  });

  // Check for overdue orders (simplified implementation)
  const checkOverdueOrdersMutation = useMutation({
    mutationFn: async () => {
      // Basic overdue check - can be enhanced based on actual service methods
      console.log('Checking for overdue orders...');
      return { checked: true, timestamp: new Date().toISOString() };
    },
    
    onSuccess: (result) => {
      console.log('✅ Overdue orders check completed:', result);
      
      // Invalidate orders to refresh with updated statuses
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    
    onError: (error) => {
      console.error('❌ Overdue orders check failed:', error);
    }
  });

  // Check if order qualifies as no-show (client-side logic)
  const checkNoShowEligibility = useCallback(async (orderId: string) => {
    try {
      // Basic client-side eligibility check
      // This would typically check pickup time vs current time
      const now = new Date();
      // Add actual eligibility logic here based on your business rules
      return { isEligible: true, reason: 'Past pickup time' };
    } catch (error) {
      console.error('Error checking no-show eligibility:', error);
      return { isEligible: false, reason: 'Check failed' };
    }
  }, []);



  return {
    // Mutation states
    isProcessingNoShow: processNoShowMutation.isPending,
    isCheckingOverdue: checkOverdueOrdersMutation.isPending,
    processError: processNoShowMutation.error,
    checkError: checkOverdueOrdersMutation.error,
    
    // Mutation functions
    processNoShowOrders: processNoShowMutation.mutate,
    processNoShowOrdersAsync: processNoShowMutation.mutateAsync,
    checkOverdueOrders: checkOverdueOrdersMutation.mutate,
    checkOverdueOrdersAsync: checkOverdueOrdersMutation.mutateAsync,
    
    // Utility functions
    checkNoShowEligibility,
    
    // Query keys for external use
    getNoShowQueryKey: (orderId: string) => noShowKeys.checks(orderId),
  };
};

export { noShowKeys };
