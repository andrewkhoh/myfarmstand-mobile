import { useEffect, useState, useCallback } from 'react';
import { useErrorRecovery } from './useErrorRecovery';
import { AppError } from '../../services/error/errorRecoveryService';

// Web-specific types for cross-platform compatibility
interface PromiseRejectionEvent {
  reason: any;
  preventDefault?: () => void;
}

interface ErrorEvent {
  error: any;
  preventDefault?: () => void;
}

export interface GlobalErrorState {
  recentErrors: AppError[];
  systemHealth: 'healthy' | 'degraded' | 'critical';
  errorRate: number;
  lastErrorTime: Date | null;
}

export function useGlobalErrorHandler() {
  const [globalState, setGlobalState] = useState<GlobalErrorState>({
    recentErrors: [],
    systemHealth: 'healthy',
    errorRate: 0,
    lastErrorTime: null
  });

  const { handleError } = useErrorRecovery({
    showUserFriendlyMessages: true,
    autoRetry: true,
    maxAutoRetries: 2,
    onError: useCallback((error: AppError) => {
      setGlobalState(prev => {
        const now = new Date();
        const recentErrors = [
          error,
          ...prev.recentErrors.slice(0, 9) // Keep last 10 errors
        ];

        // Calculate error rate (errors per hour)
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const recentErrorCount = recentErrors.filter(
          e => e.context.timestamp > hourAgo
        ).length;

        // Determine system health
        let systemHealth: GlobalErrorState['systemHealth'] = 'healthy';
        if (recentErrorCount > 10) {
          systemHealth = 'critical';
        } else if (recentErrorCount > 5 || error.severity === 'critical') {
          systemHealth = 'degraded';
        }

        return {
          recentErrors,
          systemHealth,
          errorRate: recentErrorCount,
          lastErrorTime: now
        };
      });
    }, [])
  });

  // Global error handlers for unhandled promises and errors
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      handleError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          screen: 'global',
          action: 'unhandled_promise_rejection',
          feature: 'system'
        }
      );
      event.preventDefault();
    };

    const handleGlobalError = (event: ErrorEvent) => {
      console.error('Global Error:', event.error);
      handleError(
        event.error || new Error(event.message),
        {
          screen: 'global',
          action: 'uncaught_error',
          feature: 'system'
        }
      );
    };

    // Add event listeners for web environment
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      window.addEventListener('error', handleGlobalError);

      return () => {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.removeEventListener('error', handleGlobalError);
      };
    }

    // For React Native, we can set up ErrorUtils
    if (typeof ErrorUtils !== 'undefined') {
      const originalHandler = ErrorUtils.getGlobalHandler();

      ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        handleError(error, {
          screen: 'global',
          action: 'react_native_error',
          feature: 'system',
          isFatal: String(isFatal)
        });

        // Call original handler if it exists
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });

      return () => {
        if (originalHandler) {
          ErrorUtils.setGlobalHandler(originalHandler);
        }
      };
    }
  }, [handleError]);

  // Periodic health check
  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalState(prev => {
        const now = new Date();
        const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

        // Remove old errors (older than 30 minutes)
        const recentErrors = prev.recentErrors.filter(
          error => error.context.timestamp > thirtyMinutesAgo
        );

        // Recalculate health based on recent errors
        let systemHealth: GlobalErrorState['systemHealth'] = 'healthy';
        const criticalErrors = recentErrors.filter(e => e.severity === 'critical');
        const highErrors = recentErrors.filter(e => e.severity === 'high');

        if (criticalErrors.length > 0 || recentErrors.length > 10) {
          systemHealth = 'critical';
        } else if (highErrors.length > 2 || recentErrors.length > 5) {
          systemHealth = 'degraded';
        }

        return {
          ...prev,
          recentErrors,
          systemHealth,
          errorRate: recentErrors.length * 2 // Errors per hour (30 min * 2)
        };
      });
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Manual error reporting
  const reportError = useCallback(
    (error: Error | string, context?: Partial<AppError['context']>) => {
      const errorObj = error instanceof Error ? error : new Error(error);
      return handleError(errorObj, {
        screen: 'manual_report',
        action: 'user_reported',
        feature: 'error_reporting',
        ...context
      });
    },
    [handleError]
  );

  // Clear old errors manually
  const clearErrors = useCallback(() => {
    setGlobalState(prev => ({
      ...prev,
      recentErrors: [],
      systemHealth: 'healthy',
      errorRate: 0
    }));
  }, []);

  // Get error summary for health dashboards
  const getErrorSummary = useCallback(() => {
    const now = new Date();
    const errors = globalState.recentErrors;

    const summary = {
      total: errors.length,
      byCategory: errors.reduce((acc, error) => {
        acc[error.category] = (acc[error.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: errors.reduce((acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recent: errors.filter(
        error => now.getTime() - error.context.timestamp.getTime() < 60 * 60 * 1000
      ).length
    };

    return summary;
  }, [globalState.recentErrors]);

  return {
    // State
    globalErrorState: globalState,
    recentErrors: globalState.recentErrors,
    systemHealth: globalState.systemHealth,
    errorRate: globalState.errorRate,
    lastErrorTime: globalState.lastErrorTime,

    // Actions
    reportError,
    clearErrors,

    // Utilities
    getErrorSummary,
    isHealthy: globalState.systemHealth === 'healthy',
    hasRecentErrors: globalState.recentErrors.length > 0,

    // Status helpers
    getHealthColor: () => {
      switch (globalState.systemHealth) {
        case 'healthy': return '#28a745';
        case 'degraded': return '#ffc107';
        case 'critical': return '#dc3545';
        default: return '#6c757d';
      }
    },

    getHealthMessage: () => {
      switch (globalState.systemHealth) {
        case 'healthy': return 'System is operating normally';
        case 'degraded': return 'Some issues detected, monitoring closely';
        case 'critical': return 'Multiple errors detected, please check system';
        default: return 'Status unknown';
      }
    }
  };
}