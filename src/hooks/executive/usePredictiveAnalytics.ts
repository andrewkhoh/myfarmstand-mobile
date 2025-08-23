// Predictive Analytics Hook - Following useCart patterns exactly
// Replaced complex implementation with proven working pattern

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserRole } from '../role-based/useUserRole';
import { executiveAnalyticsKeys } from '../../utils/queryKeyFactory';
import { 
  SimplePredictiveAnalyticsService, 
  type PredictiveForecastData,
  type UsePredictiveAnalyticsOptions 
} from '../../services/executive/simplePredictiveAnalyticsService';

// Simple error interface
interface PredictiveAnalyticsError {
  code: 'AUTHENTICATION_REQUIRED' | 'PERMISSION_DENIED' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  userMessage: string;
}

const createPredictiveAnalyticsError = (
  code: PredictiveAnalyticsError['code'],
  message: string,
  userMessage: string,
): PredictiveAnalyticsError => ({
  code,
  message,
  userMessage,
});

export const usePredictiveAnalytics = (options: UsePredictiveAnalyticsOptions = {}) => {
  const queryClient = useQueryClient();
  const { role, hasPermission } = useUserRole();
  
  const queryKey = executiveAnalyticsKeys.predictiveAnalytics();

  // Simple query following useCart pattern exactly
  const {
    data: forecastData,
    isLoading,
    error: queryError,
    refetch,
    isSuccess,
    isError
  } = useQuery({
    queryKey,
    queryFn: () => SimplePredictiveAnalyticsService.getForecast(options),
    staleTime: 10 * 60 * 1000, // 10 minutes - forecasts are computationally expensive
    gcTime: 30 * 60 * 1000, // 30 minutes - long retention
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    enabled: !!role && role === 'executive', // Simple enabled guard
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error.message?.includes('authentication') || error.message?.includes('permission')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Enhanced error processing
  const error = queryError ? createPredictiveAnalyticsError(
    'NETWORK_ERROR',
    queryError.message || 'Failed to load predictive analytics',
    'Unable to load predictive analytics. Please try again.',
  ) : null;

  // Authentication guard - following useCart pattern exactly
  if (!role || role !== 'executive') {
    const authError = createPredictiveAnalyticsError(
      'PERMISSION_DENIED',
      'User lacks executive permissions',
      'You need executive permissions to view predictive analytics',
    );
    
    return {
      forecastData: undefined,
      isLoading: false,
      isSuccess: false,
      isError: true,
      error: authError,
      refetch: () => Promise.resolve(),
      queryKey,
    };
  }

  return {
    forecastData,
    isLoading,
    isSuccess,
    isError,
    error,
    refetch,
    queryKey,
  };
};