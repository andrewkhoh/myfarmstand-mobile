import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import {
  errorRecoveryService,
  AppError,
  ErrorContext,
  ErrorMetrics
} from '../../services/error/errorRecoveryService';
import { useCurrentUser } from '../useAuth';
import { useUnifiedRealtime } from '../useUnifiedRealtime';

export interface ErrorState {
  hasError: boolean;
  error: AppError | null;
  isRecovering: boolean;
  canRetry: boolean;
  retryCount: number;
}

export interface ErrorRecoveryOptions {
  showUserFriendlyMessages?: boolean;
  autoRetry?: boolean;
  maxAutoRetries?: number;
  silentRecovery?: boolean;
  onError?: (error: AppError) => void;
  onRecovery?: (error: AppError) => void;
}

/**
 * Main error recovery hook for handling and recovering from errors
 */
export function useErrorRecovery(options: ErrorRecoveryOptions = {}) {
  const { data: user } = useCurrentUser();
  const { refreshAll } = useUnifiedRealtime();
  const queryClient = useQueryClient();

  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    isRecovering: false,
    canRetry: false,
    retryCount: 0
  });

  const {
    showUserFriendlyMessages = true,
    autoRetry = true,
    maxAutoRetries = 3,
    silentRecovery = false,
    onError,
    onRecovery
  } = options;

  // Handle errors with automatic recovery
  const handleError = useCallback(async (
    error: Error | AppError,
    context: Partial<ErrorContext> = {}
  ): Promise<AppError> => {
    const enrichedContext: Partial<ErrorContext> = {
      userId: user?.id,
      sessionId: `session-${Date.now()}`,
      ...context
    };

    setErrorState(prev => ({ ...prev, isRecovering: true }));

    try {
      const appError = await errorRecoveryService.handleError(error, enrichedContext);

      setErrorState({
        hasError: true,
        error: appError,
        isRecovering: false,
        canRetry: appError.retryCount < appError.maxRetries,
        retryCount: appError.retryCount
      });

      // Show user-friendly error message if enabled
      if (showUserFriendlyMessages && !silentRecovery) {
        Alert.alert(
          'Error Detected',
          appError.userMessage,
          [
            { text: 'OK', style: 'default' },
            ...(appError.recoverable ? [{
              text: 'Retry',
              onPress: () => retryOperation(appError)
            }] : [])
          ]
        );
      }

      // Call error callback
      onError?.(appError);

      return appError;
    } catch (handlingError) {
      console.error('Error handling failed:', handlingError);
      throw handlingError;
    }
  }, [user?.id, showUserFriendlyMessages, silentRecovery, onError]);

  // Retry a failed operation
  const retryOperation = useCallback(async (error?: AppError) => {
    const targetError = error || errorState.error;

    if (!targetError || !targetError.recoverable) {
      console.warn('Cannot retry non-recoverable error');
      return false;
    }

    if (targetError.retryCount >= targetError.maxRetries) {
      console.warn('Maximum retry attempts reached');
      return false;
    }

    setErrorState(prev => ({ ...prev, isRecovering: true }));

    try {
      // Attempt recovery again
      const recovered = await errorRecoveryService.handleError(targetError, {
        retryAttempt: true
      });

      if (recovered) {
        setErrorState({
          hasError: false,
          error: null,
          isRecovering: false,
          canRetry: false,
          retryCount: 0
        });

        // Refresh data after successful recovery
        await refreshAll();

        // Call recovery callback
        onRecovery?.(targetError);

        if (!silentRecovery) {
          Alert.alert('Recovery Successful', 'The operation completed successfully.');
        }

        return true;
      } else {
        setErrorState(prev => ({
          ...prev,
          isRecovering: false,
          retryCount: targetError.retryCount + 1,
          canRetry: targetError.retryCount + 1 < targetError.maxRetries
        }));

        return false;
      }
    } catch (retryError) {
      console.error('Retry operation failed:', retryError);
      setErrorState(prev => ({ ...prev, isRecovering: false }));
      return false;
    }
  }, [errorState.error, refreshAll, onRecovery, silentRecovery]);

  // Clear current error state
  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      isRecovering: false,
      canRetry: false,
      retryCount: 0
    });
  }, []);

  // Auto-retry logic
  useEffect(() => {
    if (
      autoRetry &&
      errorState.hasError &&
      errorState.canRetry &&
      errorState.retryCount < maxAutoRetries &&
      !errorState.isRecovering
    ) {
      const delay = Math.min(1000 * Math.pow(2, errorState.retryCount), 10000); // Exponential backoff

      const timeoutId = setTimeout(() => {
        retryOperation();
      }, delay);

      return () => clearTimeout(timeoutId);
    }
  }, [autoRetry, errorState, maxAutoRetries, retryOperation]);

  return {
    // Error state
    ...errorState,

    // Actions
    handleError,
    retryOperation,
    clearError,

    // Helper functions
    canRecover: errorState.error?.recoverable || false,
    shouldShowRetry: errorState.canRetry && !errorState.isRecovering,
    errorSeverity: errorState.error?.severity,
    errorCategory: errorState.error?.category,
  };
}

/**
 * Hook for monitoring error metrics and system health
 */
export function useErrorMetrics(timeframe: { start: Date; end: Date }) {
  const errorMetricsQuery = useQuery({
    queryKey: ['error-metrics', timeframe.start.getTime(), timeframe.end.getTime()],
    queryFn: (): Promise<ErrorMetrics> =>
      errorRecoveryService.getErrorMetrics(timeframe),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });

  const healthScore = errorMetricsQuery.data ?
    Math.max(0, 1 - (errorMetricsQuery.data.totalErrors / 100)) *
    errorMetricsQuery.data.recoverySuccessRate : 1;

  return {
    metrics: errorMetricsQuery.data,
    isLoading: errorMetricsQuery.isLoading,
    error: errorMetricsQuery.error,
    healthScore,
    isHealthy: healthScore > 0.8,
    refetch: errorMetricsQuery.refetch,
  };
}

/**
 * Hook for handling specific types of errors with custom recovery
 */
export function useSpecificErrorHandler<T = any>(
  errorType: string,
  customRecovery?: (error: AppError) => Promise<boolean>
) {
  const { handleError: baseHandleError } = useErrorRecovery({
    silentRecovery: !!customRecovery,
    autoRetry: !customRecovery
  });

  const handleSpecificError = useCallback(async (
    error: Error,
    context?: Partial<ErrorContext>
  ): Promise<T | null> => {
    const appError = await baseHandleError(error, {
      ...context,
      errorType
    });

    // Try custom recovery if provided
    if (customRecovery && appError.recoverable) {
      try {
        const recovered = await customRecovery(appError);
        if (recovered) {
          return null; // Successful recovery
        }
      } catch (recoveryError) {
        console.error('Custom recovery failed:', recoveryError);
      }
    }

    throw appError; // Re-throw if recovery failed or not attempted
  }, [baseHandleError, errorType, customRecovery]);

  return {
    handleError: handleSpecificError,
  };
}

/**
 * Hook for wrapping async operations with error handling
 */
export function useAsyncErrorWrapper() {
  const { handleError } = useErrorRecovery();

  const wrapAsync = useCallback(<T>(
    asyncFn: () => Promise<T>,
    context?: Partial<ErrorContext>
  ) => {
    return async (): Promise<T | null> => {
      try {
        return await asyncFn();
      } catch (error) {
        await handleError(error as Error, context);
        return null;
      }
    };
  }, [handleError]);

  const wrapAsyncWithFallback = useCallback(<T>(
    asyncFn: () => Promise<T>,
    fallbackFn: () => T,
    context?: Partial<ErrorContext>
  ) => {
    return async (): Promise<T> => {
      try {
        return await asyncFn();
      } catch (error) {
        await handleError(error as Error, context);
        return fallbackFn();
      }
    };
  }, [handleError]);

  return {
    wrapAsync,
    wrapAsyncWithFallback,
  };
}

/**
 * Error boundary hook for React components
 */
export function useErrorBoundary() {
  const [hasError, setHasError] = useState(false);
  const [boundaryError, setBoundaryError] = useState<Error | null>(null);
  const { handleError } = useErrorRecovery({
    showUserFriendlyMessages: false, // Handle UI separately in boundary
    autoRetry: false
  });

  const captureError = useCallback((error: Error, errorInfo?: any) => {
    setHasError(true);
    setBoundaryError(error);

    handleError(error, {
      screen: 'error_boundary',
      action: 'component_error',
      feature: 'ui',
      errorInfo: JSON.stringify(errorInfo)
    });
  }, [handleError]);

  const resetBoundary = useCallback(() => {
    setHasError(false);
    setBoundaryError(null);
  }, []);

  return {
    hasError,
    error: boundaryError,
    captureError,
    resetBoundary,
  };
}