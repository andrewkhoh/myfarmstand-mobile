/**
 * Data Population Management Hook
 * Hook for managing business_metrics data pipeline
 * Following @docs/architectural-patterns-and-best-practices.md
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { DataPopulationService, PopulationStatus } from '../../services/data-pipeline/dataPopulationService';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { useCurrentUser } from '../useAuth';
import { useCurrentUserHasPermission } from '../role-based/permissions';

export interface DataPopulationResult {
  success: boolean;
  message: string;
  metrics?: number;
}

export interface DataIntegrityReport {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}

export const useDataPopulation = () => {
  const { data: user } = useCurrentUser();
  const { hasPermission: hasSystemManage, isLoading: isLoadingPermissions } = useCurrentUserHasPermission('system:manage');
  const queryClient = useQueryClient();
  const [isInitializing, setIsInitializing] = useState(false);

  // Check permissions
  const canManageData = hasSystemManage;

  // Get population status
  const {
    data: populationStatus,
    isLoading: isLoadingStatus,
    error: statusError,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['data-population', 'status', user?.id],
    queryFn: async (): Promise<PopulationStatus> => {
      if (!canManageData) {
        throw new Error('Insufficient permissions to access data population status');
      }

      try {
        const status = await DataPopulationService.getPopulationStatus();

        ValidationMonitor.recordPatternSuccess({
          service: 'useDataPopulation',
          pattern: 'direct_supabase_query',
          operation: 'getPopulationStatus'
        });

        return status;
      } catch (error) {
        ValidationMonitor.recordValidationError({
          context: 'useDataPopulation.getPopulationStatus',
          errorCode: 'POPULATION_STATUS_QUERY_FAILED',
          validationPattern: 'direct_supabase_query',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    },
    enabled: !!user && canManageData && !isLoadingPermissions,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000 // Refresh every minute
  });

  // Get data integrity report
  const {
    data: integrityReport,
    isLoading: isLoadingIntegrity,
    refetch: refetchIntegrity
  } = useQuery({
    queryKey: ['data-population', 'integrity', user?.id],
    queryFn: async (): Promise<DataIntegrityReport> => {
      if (!canManageData) {
        throw new Error('Insufficient permissions to verify data integrity');
      }

      return await DataPopulationService.verifyDataIntegrity();
    },
    enabled: !!user && canManageData && !isLoadingPermissions,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Initialize business metrics
  const initializeMutation = useMutation({
    mutationFn: async (options: { daysBack?: number; force?: boolean } = {}) => {
      if (!canManageData) {
        throw new Error('Insufficient permissions to initialize data');
      }

      setIsInitializing(true);

      try {
        const result = await DataPopulationService.initializeBusinessMetrics(options);

        if (result.success) {
          ValidationMonitor.recordPatternSuccess({
            service: 'useDataPopulation',
            pattern: 'batch_process_metrics',
            operation: 'initializeBusinessMetrics'
          });
        }

        return result;
      } finally {
        setIsInitializing(false);
      }
    },
    onSuccess: () => {
      // Refresh status and integrity after successful initialization
      refetchStatus();
      refetchIntegrity();
      queryClient.invalidateQueries({ queryKey: ['business-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['data-population'] });
    },
    onError: (error) => {
      setIsInitializing(false);
      ValidationMonitor.recordValidationError({
        context: 'useDataPopulation.initializeMutation',
        errorCode: 'INITIALIZE_MUTATION_FAILED',
        validationPattern: 'batch_process_metrics',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Run incremental population
  const incrementalMutation = useMutation({
    mutationFn: async () => {
      if (!canManageData) {
        throw new Error('Insufficient permissions to run incremental population');
      }

      return await DataPopulationService.runIncrementalPopulation();
    },
    onSuccess: () => {
      refetchStatus();
      refetchIntegrity();
      queryClient.invalidateQueries({ queryKey: ['business-metrics'] });
    }
  });

  // Auto-fix data issues
  const autoFixMutation = useMutation({
    mutationFn: async () => {
      if (!canManageData) {
        throw new Error('Insufficient permissions to auto-fix data issues');
      }

      return await DataPopulationService.autoFixDataIssues();
    },
    onSuccess: () => {
      refetchStatus();
      refetchIntegrity();
      queryClient.invalidateQueries({ queryKey: ['business-metrics'] });
    }
  });

  // Helper functions
  const hasRecentData = () => {
    if (!populationStatus || typeof populationStatus !== 'object' || !('lastSuccess' in populationStatus)) return false;
    const lastSuccess = new Date(populationStatus.lastSuccess as string);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    return lastSuccess > threeDaysAgo;
  };

  const needsInitialization = () => {
    if (!populationStatus || typeof populationStatus !== 'object' || !('totalMetrics' in populationStatus)) return true;
    return populationStatus.totalMetrics === 0;
  };

  const hasDataIssues = () => {
    if (!integrityReport || typeof integrityReport !== 'object' || !('isValid' in integrityReport)) return false;
    return !integrityReport.isValid;
  };

  const getDataHealthScore = (): number => {
    if (!populationStatus || !integrityReport || typeof populationStatus !== 'object' || typeof integrityReport !== 'object') return 0;

    let score = 0;

    // Has data
    if ('totalMetrics' in populationStatus && (populationStatus.totalMetrics as number) > 0) score += 30;

    // Recent data
    if (hasRecentData()) score += 30;

    // No integrity issues
    if ('isValid' in integrityReport && integrityReport.isValid) score += 40;

    return score;
  };

  const getStatusColor = (): string => {
    const health = getDataHealthScore();
    if (health >= 80) return '#10b981'; // Green
    if (health >= 50) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const getStatusMessage = (): string => {
    if (isInitializing || (populationStatus && typeof populationStatus === 'object' && 'isRunning' in populationStatus && populationStatus.isRunning)) {
      return 'Data population in progress...';
    }

    if (needsInitialization()) {
      return 'Business metrics not initialized';
    }

    if (hasDataIssues()) {
      const issuesCount = integrityReport && typeof integrityReport === 'object' && 'issues' in integrityReport && Array.isArray(integrityReport.issues)
        ? integrityReport.issues.length
        : 0;
      return `Data issues detected: ${issuesCount} issues`;
    }

    if (!hasRecentData()) {
      return 'Data needs updating';
    }

    return 'Data pipeline healthy';
  };

  return {
    // Data
    populationStatus,
    integrityReport,

    // Loading states
    isLoadingStatus,
    isLoadingIntegrity,
    isInitializing: isInitializing || initializeMutation.isPending,
    isRunningIncremental: incrementalMutation.isPending,
    isAutoFixing: autoFixMutation.isPending,

    // Error states
    statusError,
    initializeError: initializeMutation.error,
    incrementalError: incrementalMutation.error,
    autoFixError: autoFixMutation.error,

    // Actions
    initializeBusinessMetrics: initializeMutation.mutate,
    runIncrementalPopulation: incrementalMutation.mutate,
    autoFixDataIssues: autoFixMutation.mutate,
    refreshStatus: refetchStatus,
    refreshIntegrity: refetchIntegrity,

    // Helper functions
    hasRecentData,
    needsInitialization,
    hasDataIssues,
    getDataHealthScore,
    getStatusColor,
    getStatusMessage,

    // Permissions
    canManageData,

    // Success states
    lastInitializeResult: initializeMutation.data,
    lastIncrementalResult: incrementalMutation.data,
    lastAutoFixResult: autoFixMutation.data
  };
};

// Helper hook for read-only data population status (for dashboards)
export const useDataPopulationStatus = () => {
  const { data: user } = useCurrentUser();

  return useQuery({
    queryKey: ['data-population', 'status-readonly', user?.id],
    queryFn: async () => {
      return await DataPopulationService.getPopulationStatus();
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1
  });
};