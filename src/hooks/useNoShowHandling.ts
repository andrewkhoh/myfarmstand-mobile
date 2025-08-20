import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { NoShowHandlingService } from '../services/noShowHandlingService';
import { orderKeys } from '../utils/queryKeyFactory';
import { orderBroadcast } from '../utils/broadcastFactory';
import { useCurrentUser } from './useAuth';

// Enhanced interfaces following cart pattern
interface NoShowError {
  code: 'INVALID_CONFIG' | 'PROCESSING_FAILED' | 'UNAUTHORIZED' | 'NETWORK_ERROR' | 'ORDER_NOT_FOUND' | 'UNKNOWN_ERROR';
  message: string;
  userMessage: string;
  metadata?: Record<string, any>;
}

interface NoShowOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: NoShowError;
  message?: string;
}

interface NoShowMutationContext {
  previousOrders?: any;
  previousNoShowData?: any;
  operationType: 'process-no-show' | 'check-overdue';
  metadata: Record<string, any>;
}

// Enhanced error creation utility (following cart pattern)
function createNoShowError(
  code: NoShowError['code'], 
  message: string, 
  userMessage: string, 
  metadata?: Record<string, any>
): NoShowError {
  return {
    code,
    message,
    userMessage,
    metadata,
    name: 'NoShowError',
  } as NoShowError & Error;
}

// Enhanced query keys for no-show operations (following cart pattern)
const noShowKeys = {
  all: ['noshow'] as const,
  checks: (orderId: string) => [...noShowKeys.all, 'check', orderId] as const,
  history: (userId: string) => [...noShowKeys.all, 'history', userId] as const,
  processing: () => [...noShowKeys.all, 'processing'] as const,
  overdue: () => [...noShowKeys.all, 'overdue'] as const,
};

/**
 * Hook for no-show handling operations following React Query atomic pattern
 */
export const useNoShowHandling = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  // ✅ ARCHITECTURAL PATTERN: Mutation doesn't need enabled, auth is handled in service
  const processNoShowMutation = useMutation<NoShowOperationResult<any>, Error, any, NoShowMutationContext>({
    mutationFn: async (config?: any): Promise<NoShowOperationResult<any>> => {
      try {
        const result = await NoShowHandlingService.processNoShowOrders(config);
        return { success: true, data: result };
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('unauthorized')) {
          throw createNoShowError(
            'UNAUTHORIZED',
            error.message,
            'Access denied. Admin privileges required.',
            { config, userId: user?.id }
          );
        }
        if (error.message?.includes('invalid') || error.message?.includes('config')) {
          throw createNoShowError(
            'INVALID_CONFIG',
            error.message,
            'Invalid configuration. Please check the settings.',
            { config }
          );
        }
        if (error.message?.includes('network')) {
          throw createNoShowError(
            'NETWORK_ERROR',
            error.message,
            'Unable to process no-show orders. Please check your connection.',
            { config }
          );
        }
        throw createNoShowError(
          'PROCESSING_FAILED',
          error.message || 'No-show processing failed',
          'Unable to process no-show orders. Please try again.',
          { config }
        );
      }
    },
    
    onMutate: async (config?: any): Promise<NoShowMutationContext> => {
      // Cancel outgoing queries to prevent race conditions (following cart pattern)
      await queryClient.cancelQueries({ queryKey: orderKeys.all() });
      await queryClient.cancelQueries({ queryKey: noShowKeys.all });
      
      // Snapshot previous order data for rollback (following cart pattern)
      const previousOrders = queryClient.getQueryData(orderKeys.all());
      const previousNoShowData = queryClient.getQueryData(noShowKeys.all);
      
      return { 
        previousOrders, 
        previousNoShowData,
        operationType: 'process-no-show',
        metadata: { config, userId: user?.id }
      };
    },
    
    onError: (error: any, config: any, context?: NoShowMutationContext) => {
      // Enhanced error logging (following cart pattern)
      console.error('❌ No-show processing failed:', {
        error: error.message,
        userMessage: (error as NoShowError).userMessage,
        config,
        userId: user?.id
      });
      
      // Rollback optimistic updates on error (following cart pattern)
      if (context?.previousOrders) {
        queryClient.setQueryData(orderKeys.all(), context.previousOrders);
      }
      if (context?.previousNoShowData) {
        queryClient.setQueryData(noShowKeys.all, context.previousNoShowData);
      }
    },
    
    onSuccess: async (result: NoShowOperationResult<any>, _config: any) => {
      if (result.success && result.data) {
        console.log('✅ No-show processing completed:', {
          processedCount: result.data.processedOrders?.length || 0,
          userId: user?.id
        });
        
        // Broadcast no-show events for each processed order (following cart pattern)
        if (result.data.processedOrders) {
          for (const processedOrder of result.data.processedOrders) {
            await orderBroadcast.user.send('order-no-show', {
              orderId: processedOrder.orderId,
              action: processedOrder.action,
              userId: user?.id,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        // Smart invalidation strategy (following cart pattern)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: orderKeys.all() }),
          queryClient.invalidateQueries({ queryKey: noShowKeys.all }),
          queryClient.invalidateQueries({ queryKey: noShowKeys.processing() })
        ]);
      }
    },
    
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, error: any) => {
      // Don't retry on unauthorized or invalid config errors
      if ((error as NoShowError).code === 'UNAUTHORIZED' || 
          (error as NoShowError).code === 'INVALID_CONFIG') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
    // ✅ NO onSettled - invalidation happens in onSuccess only (following cart pattern)
  });

  // ✅ ARCHITECTURAL PATTERN: Mutation handles auth through service layer
  const checkOverdueOrdersMutation = useMutation<NoShowOperationResult<any>, Error, void, NoShowMutationContext>({
    mutationFn: async (): Promise<NoShowOperationResult<any>> => {
      try {
        // Enhanced overdue check with actual service call (can be implemented later)
        console.log('Checking for overdue orders...');
        const result = { 
          checked: true, 
          timestamp: new Date().toISOString(),
          overdueCount: 0 // Placeholder - would come from actual service
        };
        return { success: true, data: result };
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('unauthorized')) {
          throw createNoShowError(
            'UNAUTHORIZED',
            error.message,
            'Access denied. Admin privileges required.',
            { userId: user?.id }
          );
        }
        if (error.message?.includes('network')) {
          throw createNoShowError(
            'NETWORK_ERROR',
            error.message,
            'Unable to check overdue orders. Please check your connection.'
          );
        }
        throw createNoShowError(
          'UNKNOWN_ERROR',
          error.message || 'Overdue check failed',
          'Unable to check overdue orders. Please try again.'
        );
      }
    },
    
    onMutate: async (): Promise<NoShowMutationContext> => {
      // Cancel outgoing queries (following cart pattern)
      await queryClient.cancelQueries({ queryKey: orderKeys.all() });
      await queryClient.cancelQueries({ queryKey: noShowKeys.overdue() });
      
      const previousOrders = queryClient.getQueryData(orderKeys.all());
      
      return {
        previousOrders,
        operationType: 'check-overdue',
        metadata: { userId: user?.id }
      };
    },
    
    onError: (error: any, _variables: void, _context?: NoShowMutationContext) => {
      // Enhanced error logging (following cart pattern)
      console.error('❌ Overdue orders check failed:', {
        error: error.message,
        userMessage: (error as NoShowError).userMessage,
        userId: user?.id
      });
    },
    
    onSuccess: async (result: NoShowOperationResult<any>) => {
      if (result.success && result.data) {
        console.log('✅ Overdue orders check completed:', {
          checked: result.data.checked,
          overdueCount: result.data.overdueCount,
          userId: user?.id
        });
        
        // Smart invalidation strategy (following cart pattern)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: orderKeys.all() }),
          queryClient.invalidateQueries({ queryKey: noShowKeys.overdue() })
        ]);
      }
    },
    
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, error: any) => {
      // Don't retry on unauthorized errors
      if ((error as NoShowError).code === 'UNAUTHORIZED') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  // ✅ ARCHITECTURAL PATTERN: Client-side utility function handles auth gracefully
  const checkNoShowEligibility = useCallback(async (orderId: string) => {
    try {
      if (!orderId) {
        throw createNoShowError(
          'ORDER_NOT_FOUND',
          'No order ID provided',
          'Order ID is required to check eligibility.'
        );
      }

      // Enhanced client-side eligibility check with error handling
      const now = new Date();
      // TODO: Add actual eligibility logic here based on business rules
      // This would typically check pickup time vs current time
      return { isEligible: true, reason: 'Past pickup time', timestamp: now.toISOString() };
    } catch (error: any) {
      console.error('Error checking no-show eligibility:', {
        error: error.message,
        orderId,
        userId: user?.id
      });
      return { isEligible: false, reason: error.userMessage || 'Check failed' };
    }
  }, [user?.id]);

  // Enhanced useCallback functions for stable references (following cart pattern)
  const processNoShowOrders = useCallback(
    (config?: any) => processNoShowMutation.mutate(config),
    [processNoShowMutation.mutate]
  );
  
  const processNoShowOrdersAsync = useCallback(
    (config?: any) => processNoShowMutation.mutateAsync(config),
    [processNoShowMutation.mutateAsync]
  );
  
  const checkOverdueOrders = useCallback(
    () => checkOverdueOrdersMutation.mutate(),
    [checkOverdueOrdersMutation.mutate]
  );
  
  const checkOverdueOrdersAsync = useCallback(
    () => checkOverdueOrdersMutation.mutateAsync(),
    [checkOverdueOrdersMutation.mutateAsync]
  );

  const getNoShowQueryKey = useCallback(
    (orderId: string) => noShowKeys.checks(orderId),
    []
  );

  // ✅ ARCHITECTURAL PATTERN: Simple conditional return for auth state
  if (!user?.id) {
    const authError = createNoShowError(
      'UNAUTHORIZED',
      'No authenticated user',
      'Please sign in to access no-show handling.'
    );
    
    return {
      isProcessingNoShow: false,
      isCheckingOverdue: false,
      isLoading: false,
      processError: authError,
      checkError: authError,
      
      // Safe no-op functions
      processNoShowOrders: () => console.warn('⚠️ Authentication required'),
      processNoShowOrdersAsync: async () => ({ success: false, error: authError }),
      checkOverdueOrders: () => console.warn('⚠️ Authentication required'),
      checkOverdueOrdersAsync: async () => ({ success: false, error: authError }),
      checkNoShowEligibility: async () => ({ isEligible: false, reason: 'Please sign in' }),
      
      getNoShowQueryKey: () => ['noshow', 'unauthenticated'],
      getOverdueQueryKey: () => ['noshow', 'overdue', 'unauthenticated'],
      getProcessingQueryKey: () => ['noshow', 'processing', 'unauthenticated'],
      
      resetProcessError: () => {},
      resetCheckError: () => {},
    };
  }

  return {
    // Enhanced mutation states (following cart pattern)
    isProcessingNoShow: processNoShowMutation.isPending,
    isCheckingOverdue: checkOverdueOrdersMutation.isPending,
    isLoading: processNoShowMutation.isPending || checkOverdueOrdersMutation.isPending,
    processError: processNoShowMutation.error,
    checkError: checkOverdueOrdersMutation.error,
    
    // Enhanced mutation functions with stable references (following cart pattern)
    processNoShowOrders,
    processNoShowOrdersAsync,
    checkOverdueOrders,
    checkOverdueOrdersAsync,
    
    // Enhanced utility functions (following cart pattern)
    checkNoShowEligibility,
    
    // Enhanced query keys for external use (following cart pattern)
    getNoShowQueryKey,
    getOverdueQueryKey: () => noShowKeys.overdue(),
    getProcessingQueryKey: () => noShowKeys.processing(),
    
    // Enhanced mutation utilities (following cart pattern)
    resetProcessError: processNoShowMutation.reset,
    resetCheckError: checkOverdueOrdersMutation.reset,
  };
};

export { 
  noShowKeys,
  type NoShowError,
  type NoShowOperationResult,
  type NoShowMutationContext
};
