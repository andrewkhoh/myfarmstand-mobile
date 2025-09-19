// Simplified Business Metrics Hook - Following useCart patterns exactly
// This demonstrates the correct testing approach for executive hooks

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserRole } from '../role-based/useUserRole';
import { executiveAnalyticsKeys } from '../../utils/queryKeyFactory';
// Note: simpleBusinessMetricsService was removed, using BusinessMetricsService instead
import { BusinessMetricsService } from '../../services/executive/businessMetricsService';
type UseBusinessMetricsOptions = any;
import { type BusinessMetricsData } from '../../schemas/executive/businessMetricsSchema';

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
  const userRole = useUserRole();
  const role = userRole.role?.role || '';

  // Calculate dynamic date range - last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

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
    queryFn: () => BusinessMetricsService.aggregateBusinessMetrics(['sales'], 'daily', startDateStr, endDateStr),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    enabled: !!role && ['executive', 'admin'].includes(role?.role?.toLowerCase() || ''), // Executive access for admin/manager/executive
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
  if (!role || !['executive', 'admin'].includes(role?.role?.toLowerCase() || '')) {
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