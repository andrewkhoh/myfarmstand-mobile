// Simplified Business Insights Hook - Following useCart patterns exactly

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserRole } from '../role-based/useUserRole';
import { executiveAnalyticsKeys } from '../../utils/queryKeyFactory';
import { 
  SimpleBusinessInsightsService, 
  type BusinessInsightData,
  type UseBusinessInsightsOptions 
} from '../../services/executive/simpleBusinessInsightsService';

// Simple error interface
interface BusinessInsightsError {
  code: 'AUTHENTICATION_REQUIRED' | 'PERMISSION_DENIED' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  userMessage: string;
}

const createBusinessInsightsError = (
  code: BusinessInsightsError['code'],
  message: string,
  userMessage: string,
): BusinessInsightsError => ({
  code,
  message,
  userMessage,
});

export const useSimpleBusinessInsights = (options: UseBusinessInsightsOptions = {}) => {
  const queryClient = useQueryClient();
  const { role, hasPermission } = useUserRole();
  
  const queryKey = executiveAnalyticsKeys.businessInsights();

  // Simple query following useCart pattern exactly
  const {
    data: insightsData,
    isLoading,
    error: queryError,
    refetch,
    isSuccess,
    isError
  } = useQuery({
    queryKey,
    queryFn: () => SimpleBusinessInsightsService.getInsights(options),
    staleTime: 3 * 60 * 1000, // 3 minutes - insights change frequently
    gcTime: 15 * 60 * 1000, // 15 minutes 
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    enabled: !!role && ['executive', 'admin'].includes(role.toLowerCase()), // Simple enabled guard
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
  const error = queryError ? createBusinessInsightsError(
    'NETWORK_ERROR',
    queryError.message || 'Failed to load business insights',
    'Unable to load business insights. Please try again.',
  ) : null;

  // Authentication guard - following useCart pattern exactly
  if (!role || role !== 'executive') {
    const authError = createBusinessInsightsError(
      'PERMISSION_DENIED',
      'User lacks executive permissions',
      'You need executive permissions to view business insights',
    );
    
    return {
      insights: [],
      metadata: undefined,
      isLoading: false,
      isSuccess: false,
      isError: true,
      error: authError,
      refetch: () => Promise.resolve(),
      queryKey,
    };
  }

  return {
    insights: insightsData?.insights || [],
    metadata: insightsData?.metadata,
    isLoading,
    isSuccess,
    isError,
    error,
    refetch,
    queryKey,
  };
};