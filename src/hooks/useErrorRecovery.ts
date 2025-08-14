import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { ErrorRecoveryService, ErrorContext, ErrorRecoveryResult, ErrorRecoveryConfig, ErrorType } from '../services/errorRecoveryService';
import { orderBroadcast } from '../utils/broadcastFactory';
import { useCurrentUser } from './useAuth';

// Query keys for error recovery operations
const errorRecoveryKeys = {
  all: ['error-recovery'] as const,
  logs: (userId: string) => [...errorRecoveryKeys.all, 'logs', userId] as const,
  recovery: (orderId: string) => [...errorRecoveryKeys.all, 'recovery', orderId] as const,
};

/**
 * Hook for error recovery operations following React Query atomic pattern
 */
export const useErrorRecovery = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  // Recover from error mutation
  const recoverFromErrorMutation = useMutation({
    mutationFn: (context: ErrorContext) => 
      ErrorRecoveryService.recoverFromError(context),
    
    onMutate: async (context: ErrorContext) => {
      // Cancel outgoing queries to prevent race conditions (following cart pattern)
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      await queryClient.cancelQueries({ queryKey: ['orders', 'user', user?.id] });
      await queryClient.cancelQueries({ queryKey: ['error-recovery'] });
      
      // Snapshot previous values for rollback (following cart pattern)
      const previousOrders = queryClient.getQueryData(['orders']);
      const previousUserOrders = queryClient.getQueryData(['orders', 'user', user?.id]);
      const previousErrorRecovery = queryClient.getQueryData(['error-recovery']);
      
      // Optimistically update error recovery state (following cart pattern)
      const optimisticRecovery = {
        id: `temp-${Date.now()}`,
        errorType: context.errorType,
        status: 'recovering' as const,
        timestamp: new Date().toISOString()
      };
      
      queryClient.setQueryData(['error-recovery'], (old: any[] | undefined) => 
        old ? [optimisticRecovery, ...old] : [optimisticRecovery]
      );
      
      return { previousOrders, previousUserOrders, previousErrorRecovery };
    },
    
    onSuccess: async (result: ErrorRecoveryResult, errorContext: ErrorContext) => {
      console.log('✅ Error recovery completed:', result);
      
      // Broadcast recovery event for real-time sync (following cart pattern)
      // Note: Error recovery broadcasts help with admin monitoring
      
      // Invalidate queries to refresh data (following cart pattern)
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['error-recovery'] });
    },
    
    onError: (error, context, contextData) => {
      console.error('❌ Error recovery failed:', error);
      
      // Rollback optimistic updates (following cart pattern)
      if (contextData?.previousOrders) {
        queryClient.setQueryData(['orders'], contextData.previousOrders);
      }
      if (contextData?.previousUserOrders) {
        queryClient.setQueryData(['orders', 'user', user?.id], contextData.previousUserOrders);
      }
      if (contextData?.previousErrorRecovery) {
        queryClient.setQueryData(['error-recovery'], contextData.previousErrorRecovery);
      }
    }
    // ✅ NO onSettled - invalidation happens in onSuccess only (following cart pattern)
  });

  // Create error context helper (following cart pattern)
  const createErrorContext = useCallback((errorType: ErrorType, orderId?: string, operation: string = 'unknown', originalError?: Error) => {
    return {
      errorType,
      orderId: orderId || undefined,
      userId: user?.id || undefined,
      operation,
      originalError: originalError || new Error('Unknown error'),
      timestamp: new Date().toISOString(),
      retryCount: 0,
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };
  }, [user?.id]);

  // Single useCallback for stable reference (following cart pattern)
  const getErrorRecoveryQueryKey = useCallback((orderId: string) => errorRecoveryKeys.recovery(orderId), []);

  return {
    // Mutation states (following cart pattern)
    isRecovering: recoverFromErrorMutation.isPending,
    recoveryError: recoverFromErrorMutation.error,
    
    // Direct mutation functions (following cart pattern - single source of truth)
    recoverFromError: recoverFromErrorMutation.mutate,
    recoverFromErrorAsync: recoverFromErrorMutation.mutateAsync,
    
    // Utility functions (following cart pattern)
    createErrorContext,
    
    // Query keys for external use (following cart pattern)
    getErrorRecoveryQueryKey,
  };
};

export { errorRecoveryKeys };
