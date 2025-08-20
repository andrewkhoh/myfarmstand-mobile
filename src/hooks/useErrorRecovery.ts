import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { ErrorRecoveryService, ErrorContext, ErrorRecoveryResult, ErrorRecoveryConfig, ErrorType } from '../services/errorRecoveryService';
import { orderBroadcast } from '../utils/broadcastFactory';
import { useCurrentUser } from './useAuth';
import { orderKeys } from '../utils/queryKeyFactory';
import { createBroadcastHelper } from '../utils/broadcastFactory';

// Enhanced interfaces following cart pattern
interface ErrorRecoveryError {
  code: 'AUTHENTICATION_REQUIRED' | 'RECOVERY_FAILED' | 'INVALID_CONTEXT' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  userMessage: string;
  errorType?: ErrorType;
  orderId?: string;
}

interface ErrorRecoveryOperationResult<T = any> {
  success: boolean;
  message?: string;
  error?: ErrorRecoveryError;
  data?: T;
}

interface ErrorRecoveryMutationContext {
  previousOrders?: any;
  previousUserOrders?: any;
  previousErrorRecovery?: any;
  operationType: 'recover' | 'log' | 'cleanup';
  metadata?: Record<string, any>;
}

interface ErrorRecoveryState {
  activeRecoveries: number;
  totalRecoveries: number;
  lastRecovery?: string;
  errors: ErrorRecoveryError[];
}

// Enhanced error handling utility (following cart pattern)
const createErrorRecoveryError = (
  code: ErrorRecoveryError['code'],
  message: string,
  userMessage: string,
  metadata?: { errorType?: ErrorType; orderId?: string }
): ErrorRecoveryError => ({
  code,
  message,
  userMessage,
  ...metadata,
});

// Query key factory for error recovery operations (following cart pattern)
const errorRecoveryKeys = createQueryKeyFactory({
  entity: 'auth', // Using 'auth' as closest match for error recovery
  isolation: 'user-specific'
});

// Broadcast helper for error recovery events (following cart pattern)
const errorRecoveryBroadcast = createBroadcastHelper({
  entity: 'auth',
  target: 'user-specific'
});

// Enhanced typed query function (following cart pattern)
type ErrorRecoveryStateQueryFn = (userId?: string) => Promise<ErrorRecoveryState>;

// Enhanced typed mutation functions (following cart pattern)
type RecoverFromErrorMutationFn = (context: ErrorContext) => Promise<ErrorRecoveryOperationResult<ErrorRecoveryResult>>;
type LogErrorMutationFn = (context: ErrorContext) => Promise<ErrorRecoveryOperationResult<void>>;

/**
 * Enhanced Hook for error recovery operations following React Query atomic pattern
 * Enhanced following useCart.ts golden standard patterns
 */
export const useErrorRecovery = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  
  // Enhanced authentication guard (following cart pattern)
  if (!user?.id) {
    const authError = createErrorRecoveryError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated',
      'Please sign in to use error recovery features'
    );
    
    return {
      recoveryState: {
        activeRecoveries: 0,
        totalRecoveries: 0,
        errors: [authError]
      } as ErrorRecoveryState,
      isLoading: false,
      error: authError,
      
      isRecovering: false,
      isLogging: false,
      
      recoverFromError: () => console.warn('⚠️ Error recovery operation blocked: User not authenticated'),
      logError: () => console.warn('⚠️ Error logging operation blocked: User not authenticated'),
      createErrorContext: () => {
        console.warn('⚠️ Error context creation blocked: User not authenticated');
        return null;
      },
      
      recoverFromErrorAsync: async (): Promise<ErrorRecoveryOperationResult<ErrorRecoveryResult>> => ({ 
        success: false, 
        error: authError 
      }),
      logErrorAsync: async (): Promise<ErrorRecoveryOperationResult<void>> => ({ 
        success: false, 
        error: authError 
      }),
      
      getErrorRecoveryQueryKey: () => ['error-recovery', 'unauthenticated'],
    };
  }
  
  const errorRecoveryQueryKey = errorRecoveryKeys.detail(user.id, 'state');
  
  // Enhanced query with proper enabled guard and error handling (following cart pattern)
  const {
    data: recoveryState = {
      activeRecoveries: 0,
      totalRecoveries: 0,
      errors: []
    },
    isLoading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: errorRecoveryQueryKey,
    queryFn: async (): Promise<ErrorRecoveryState> => {
      try {
        // This could be enhanced to fetch error recovery state from a service
        const activeRecoveries = 0; // Mock implementation
        const totalRecoveries = 0; // Mock implementation
        
        return {
          activeRecoveries,
          totalRecoveries,
          lastRecovery: undefined,
          errors: []
        };
      } catch (error: any) {
        throw createErrorRecoveryError(
          'NETWORK_ERROR',
          error.message || 'Failed to load error recovery state',
          'Unable to load error recovery status'
        );
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (following cart pattern)
    gcTime: 5 * 60 * 1000, // 5 minutes (following cart pattern)
    refetchOnMount: true, // (following cart pattern)
    refetchOnWindowFocus: false, // (following cart pattern)
    refetchOnReconnect: true, // (following cart pattern)
    enabled: !!user?.id, // Enhanced enabled guard (following cart pattern)
    retry: (failureCount, error) => {
      // Smart retry logic (following cart pattern)
      if (failureCount < 2) return true;
      // Don't retry on authentication errors
      if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff (following cart pattern)
  });
  
  // Enhanced error processing (following cart pattern)
  const error = queryError ? createErrorRecoveryError(
    'NETWORK_ERROR',
    queryError.message || 'Failed to load error recovery state',
    'Unable to load error recovery status. Please try again.',
  ) : null;

  // Enhanced recover from error mutation (following cart pattern)
  const recoverFromErrorMutation = useMutation<ErrorRecoveryOperationResult<ErrorRecoveryResult>, Error, ErrorContext, ErrorRecoveryMutationContext>({
    mutationFn: async (context: ErrorContext): Promise<ErrorRecoveryOperationResult<ErrorRecoveryResult>> => {
      try {
        const result = await ErrorRecoveryService.recoverFromError(context);
        return { success: true, data: result };
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('invalid')) {
          throw createErrorRecoveryError(
            'INVALID_CONTEXT',
            error.message,
            'Invalid error context provided',
            { errorType: context.errorType, orderId: context.orderId }
          );
        }
        throw createErrorRecoveryError(
          'RECOVERY_FAILED',
          error.message || 'Failed to recover from error',
          'Unable to recover from the error. Please try again or contact support.'
        );
      }
    },
    
    onMutate: async (context: ErrorContext): Promise<ErrorRecoveryMutationContext> => {
      // Cancel outgoing queries to prevent race conditions (following cart pattern)
      await queryClient.cancelQueries({ queryKey: orderKeys.all() });
      await queryClient.cancelQueries({ queryKey: orderKeys.lists(user?.id) });
      await queryClient.cancelQueries({ queryKey: errorRecoveryQueryKey });
      
      // Snapshot previous values for rollback (following cart pattern)
      const previousOrders = queryClient.getQueryData(orderKeys.all());
      const previousUserOrders = queryClient.getQueryData(orderKeys.lists(user?.id));
      const previousErrorRecovery = queryClient.getQueryData(errorRecoveryQueryKey);
      
      // Optimistically update error recovery state (following cart pattern)
      const optimisticRecoveryState: ErrorRecoveryState = {
        ...recoveryState,
        activeRecoveries: recoveryState.activeRecoveries + 1,
        lastRecovery: new Date().toISOString()
      };
      
      queryClient.setQueryData(errorRecoveryQueryKey, optimisticRecoveryState);
      
      return { 
        previousOrders, 
        previousUserOrders, 
        previousErrorRecovery,
        operationType: 'recover',
        metadata: { errorType: context.errorType, orderId: context.orderId }
      };
    },
    
    onError: (error: any, context: ErrorContext, contextData?: ErrorRecoveryMutationContext) => {
      // Rollback optimistic updates (following cart pattern)
      if (contextData?.previousOrders) {
        queryClient.setQueryData(orderKeys.all(), contextData.previousOrders);
      }
      if (contextData?.previousUserOrders) {
        queryClient.setQueryData(orderKeys.lists(user?.id), contextData.previousUserOrders);
      }
      if (contextData?.previousErrorRecovery) {
        queryClient.setQueryData(errorRecoveryQueryKey, contextData.previousErrorRecovery);
      }
      
      // Enhanced error logging (following cart pattern)
      console.error('❌ Error recovery failed:', {
        error: error.message,
        userMessage: (error as ErrorRecoveryError).userMessage,
        errorType: context.errorType,
        orderId: context.orderId,
        userId: user.id
      });
    },
    
    onSuccess: async (_result: ErrorRecoveryOperationResult<ErrorRecoveryResult>, errorContext: ErrorContext) => {
      console.log('✅ Error recovery completed:', _result);
      
      // Smart invalidation strategy (following cart pattern)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.all() }),
        queryClient.invalidateQueries({ queryKey: errorRecoveryQueryKey })
      ]);
      
      // Broadcast recovery event for real-time sync (following cart pattern)
      await errorRecoveryBroadcast.send('error-recovered', {
        userId: user.id,
        errorType: errorContext.errorType,
        orderId: errorContext.orderId,
        timestamp: new Date().toISOString()
      });
    },
    
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, error: any) => {
      // Don't retry on invalid context
      if ((error as ErrorRecoveryError).code === 'INVALID_CONTEXT') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
    // ✅ NO onSettled - invalidation happens in onSuccess only (following cart pattern)
  });
  
  // Enhanced log error mutation (following cart pattern)
  const logErrorMutation = useMutation<ErrorRecoveryOperationResult<void>, Error, ErrorContext, ErrorRecoveryMutationContext>({
    mutationFn: async (context: ErrorContext): Promise<ErrorRecoveryOperationResult<void>> => {
      try {
        // This could be enhanced to log errors to a service
        console.error('Error logged:', context);
        return { success: true };
      } catch (error: any) {
        throw createErrorRecoveryError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to log error',
          'Unable to log error. Please try again.'
        );
      }
    },
    onSuccess: async (_result: ErrorRecoveryOperationResult<void>, errorContext: ErrorContext) => {
      // Smart invalidation strategy (following cart pattern)
      await queryClient.invalidateQueries({ queryKey: errorRecoveryQueryKey });
      
      // Broadcast log event (following cart pattern)
      await errorRecoveryBroadcast.send('error-logged', {
        userId: user.id,
        errorType: errorContext.errorType,
        timestamp: new Date().toISOString()
      });
    },
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, _error: any) => {
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  // Enhanced create error context helper (following cart pattern)
  const createErrorContext = useCallback((errorType: ErrorType, orderId?: string, operation: string = 'unknown', originalError?: Error): ErrorContext | null => {
    if (!user?.id) {
      console.warn('Cannot create error context: User not authenticated');
      return null;
    }
    
    return {
      errorType,
      orderId: orderId || undefined,
      userId: user.id,
      operation,
      originalError: originalError || new Error('Unknown error'),
      timestamp: new Date().toISOString(),
      retryCount: 0,
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown'
      }
    };
  }, [user?.id]);

  // Enhanced utility functions with useCallback (following cart pattern)
  const getErrorRecoveryQueryKey = useCallback(() => errorRecoveryQueryKey, [user.id]);

  return {
    recoveryState,
    isLoading,
    error,
    
    // Mutation states (following cart pattern)
    isRecovering: recoverFromErrorMutation.isPending,
    isLogging: logErrorMutation.isPending,
    
    // Error states (following cart pattern)
    recoveryError: recoverFromErrorMutation.error ? createErrorRecoveryError(
      'RECOVERY_FAILED',
      recoverFromErrorMutation.error.message,
      'Recovery operation failed'
    ) : null,
    loggingError: logErrorMutation.error ? createErrorRecoveryError(
      'UNKNOWN_ERROR',
      logErrorMutation.error.message,
      'Error logging failed'
    ) : null,
    
    // Direct mutation functions (following cart pattern - single source of truth)
    recoverFromError: recoverFromErrorMutation.mutate,
    logError: logErrorMutation.mutate,
    
    // Async mutation functions (following cart pattern)
    recoverFromErrorAsync: recoverFromErrorMutation.mutateAsync,
    logErrorAsync: logErrorMutation.mutateAsync,
    
    // Utility functions (following cart pattern)
    createErrorContext,
    
    // Query keys for external use (following cart pattern)
    getErrorRecoveryQueryKey,
  };
};

// Export enhanced error recovery keys for external use (following cart pattern)\nexport { errorRecoveryKeys };
