// Simplified Strategic Reporting Hook - Following useCart patterns exactly

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserRole } from '../role-based/useUserRole';
import { executiveAnalyticsKeys } from '../../utils/queryKeyFactory';
import { 
  SimpleStrategicReportingService, 
  type StrategicReportData,
  type UseStrategicReportingOptions 
} from '../../services/executive/simpleStrategicReportingService';

// Simple error interface
interface StrategicReportingError {
  code: 'AUTHENTICATION_REQUIRED' | 'PERMISSION_DENIED' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  userMessage: string;
}

const createStrategicReportingError = (
  code: StrategicReportingError['code'],
  message: string,
  userMessage: string,
): StrategicReportingError => ({
  code,
  message,
  userMessage,
});

export const useSimpleStrategicReporting = (options: UseStrategicReportingOptions = {}) => {
  const queryClient = useQueryClient();
  const { role, hasPermission } = useUserRole();
  
  const queryKey = executiveAnalyticsKeys.strategicReporting();

  // Simple query following useCart pattern exactly
  const {
    data: reportsData,
    isLoading,
    error: queryError,
    refetch,
    isSuccess,
    isError
  } = useQuery({
    queryKey,
    queryFn: () => SimpleStrategicReportingService.getReports(options),
    staleTime: 15 * 60 * 1000, // 15 minutes - strategic reports are less frequent
    gcTime: 60 * 60 * 1000, // 1 hour - longer retention for strategic data
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
  const error = queryError ? createStrategicReportingError(
    'NETWORK_ERROR',
    queryError.message || 'Failed to load strategic reports',
    'Unable to load strategic reports. Please try again.',
  ) : null;

  // Authentication guard - following useCart pattern exactly
  if (!role || !['executive', 'admin'].includes(role.toLowerCase())) {
    const authError = createStrategicReportingError(
      'PERMISSION_DENIED',
      'User lacks executive permissions',
      'You need executive permissions to view strategic reports',
    );
    
    return {
      reports: [],
      summary: undefined,
      isLoading: false,
      isSuccess: false,
      isError: true,
      error: authError,
      refetch: () => Promise.resolve(),
      queryKey,
    };
  }

  return {
    reports: reportsData?.reports || [],
    summary: reportsData?.summary,
    isLoading,
    isSuccess,
    isError,
    error,
    refetch,
    queryKey,
  };
};