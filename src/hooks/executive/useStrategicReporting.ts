// Phase 4.3: Strategic Reporting Hook Implementation (GREEN Phase)
// Following established React Query patterns

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StrategicReportingService } from '../../services/executive/strategicReportingService';
import { useUserRole } from '../role-based/useUserRole';
import { useState } from 'react';

interface UseStrategicReportingOptions {
  reportId: string;
  includeAllDataSources?: boolean;
  detailLevel?: 'summary' | 'detailed' | 'comprehensive' | 'maximum';
  userRole?: string;
  progressiveLoading?: boolean;
}

export function useStrategicReporting(options: UseStrategicReportingOptions) {
  const { role, hasPermission } = useUserRole();
  const queryClient = useQueryClient();
  const [scheduleInfo, setScheduleInfo] = useState<any>(null);
  const [exportResult, setExportResult] = useState<any>(null);
  const [loadingPhase, setLoadingPhase] = useState<'summary' | 'details' | 'complete'>('summary');

  const userRole = options.userRole || role;
  const queryKey = ['executive', 'strategicReporting', options.reportId];

  const {
    data: reportData,
    isLoading,
    isSuccess,
    isError,
    error
  } = useQuery({
    queryKey,
    queryFn: async () => {
      // Progressive loading phases
      if (options.progressiveLoading) {
        setLoadingPhase('summary');
      }

      const result = await StrategicReportingService.generateReport(
        options.reportId,
        {
          include_all_analytics: options.includeAllDataSources,
          detail_level: options.detailLevel,
          include_cross_role_correlation: options.includeAllDataSources,
          include_predictive_analytics: options.includeAllDataSources
        },
        { user_role: userRole }
      );

      if (options.progressiveLoading) {
        setLoadingPhase('complete');
      }

      return result;
    },
    enabled: !!options.reportId && !!userRole
  });

  // Get filtered data based on role
  const {
    data: filteredData
  } = useQuery({
    queryKey: [...queryKey, 'filtered', userRole],
    queryFn: () => StrategicReportingService.getReportData(
      options.reportId,
      { user_role: userRole }
    ),
    enabled: !!options.reportId && !!userRole && !!options.userRole
  });

  // Schedule report mutation
  const scheduleReportMutation = useMutation({
    mutationFn: async (scheduleConfig: any) => {
      const result = await StrategicReportingService.scheduleReport(
        options.reportId,
        scheduleConfig,
        { user_role: userRole }
      );
      setScheduleInfo(result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  // Export report mutation
  const exportReportMutation = useMutation({
    mutationFn: async (exportOptions: any) => {
      const result = await StrategicReportingService.exportReportData(
        options.reportId,
        exportOptions
      );
      setExportResult(result);
      return result;
    }
  });

  return {
    reportData,
    filteredData,
    scheduleInfo,
    exportResult,
    isLoading,
    isSuccess,
    isError,
    error,
    queryKey,
    loadingPhase,
    scheduleReport: scheduleReportMutation.mutateAsync,
    exportReport: exportReportMutation.mutateAsync
  };
}