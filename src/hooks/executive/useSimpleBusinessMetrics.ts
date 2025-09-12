// Simplified Business Metrics Hook - Following useCart patterns exactly
// This demonstrates the correct testing approach for executive hooks

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserRole } from '../role-based/useUserRole';
import { executiveAnalyticsKeys } from '../../utils/queryKeyFactory';
import { 
  SimpleBusinessMetricsService, 
  type BusinessMetricsData,
  type UseBusinessMetricsOptions 
} from '../../services/executive/simpleBusinessMetricsService';

// Simple error interface
interface BusinessMetricsError {
  code: 'AUTHENTICATION_REQUIRED' | 'PERMISSION_DENIED' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  userMessage: string;
}

const createBusinessMetricsError = (
  code: BusinessMetricsError['code'],
  message: string,
  userMessage: string,
): BusinessMetricsError => ({
  code,
  message,
  userMessage,
});

export const useSimpleBusinessMetrics = (options: UseBusinessMetricsOptions = {}) => {
  const queryClient = useQueryClient();
  const { role, hasPermission } = useUserRole();
  
  const queryKey = executiveAnalyticsKeys.businessMetrics();

  // Simple query following useCart pattern exactly
  const {
    data: metrics,
    isLoading,
    error: queryError,
    refetch,
    isSuccess,
    isError
  } = useQuery({
    queryKey,
    queryFn: () => SimpleBusinessMetricsService.getMetrics(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    enabled: !!role && ['executive', 'admin'].includes(role.toLowerCase()), // Executive access for admin/manager/executive
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
  const error = queryError ? createBusinessMetricsError(
    'NETWORK_ERROR',
    queryError.message || 'Failed to load business metrics',
    'Unable to load business metrics. Please try again.',
  ) : null;

  // Authentication guard - allow admin, manager, and executive access
  if (!role || !['executive', 'admin'].includes(role.toLowerCase())) {
    const authError = createBusinessMetricsError(
      'PERMISSION_DENIED',
      'User lacks executive permissions',
      'You need executive, admin, or manager permissions to view business metrics',
    );
    
    return {
      metrics: undefined,
      isLoading: false,
      isSuccess: false,
      isError: true,
      error: authError,
      refetch: () => Promise.resolve(),
      queryKey,
    };
  }

  return {
    metrics,
    isLoading,
    isSuccess,
    isError,
    error,
    refetch,
    queryKey,
  };
};