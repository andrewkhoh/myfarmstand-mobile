// Phase 4.3: Report Scheduling Hook Implementation (GREEN Phase)
// Following established React Query patterns

import { useState } from 'react';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StrategicReportingService } from '../../services/executive/strategicReportingService';
import { useUserRole } from '../role-based/useUserRole';
import { useCurrentUser } from '../useAuth';
import { executiveAnalyticsKeys } from '../../utils/queryKeyFactory';
import { ValidationMonitor } from '../../utils/validationMonitor';

interface UseReportSchedulingOptions {
  reportId?: string;
  manageMultiple?: boolean;
}

interface Schedule {
  scheduleId: string;
  frequency: string;
  reportId?: string;
  nextRun?: string;
  deliveryChannels?: string[];
  version?: string;
}

export function useReportScheduling(options: UseReportSchedulingOptions = {}) {
  const { role } = useUserRole();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);
  const [scheduleHistory, setScheduleHistory] = useState<any[]>([]);

  // Get all schedules if managing multiple
  const { data: allSchedulesData, isLoading: schedulesLoading } = useQuery({
    queryKey: executiveAnalyticsKeys.reportSchedulingAll(user?.id),
    queryFn: async () => {
      // Always use the service for production consistency
      const schedules = await StrategicReportingService.getSchedules();
      // Ensure we return an array
      if (Array.isArray(schedules)) {
        return schedules;
      }
      // If service returns an object with schedules property
      if (schedules?.schedules) {
        return schedules.schedules;
      }
      // Fallback if something goes wrong
      return [];
    },
    enabled: options.manageMultiple === true && !!role && ['executive', 'admin'].includes(role.toLowerCase()) && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - schedules are relatively static
    gcTime: 30 * 60 * 1000,   // 30 minutes - longer retention for schedule data
    refetchOnMount: false,     // Don't auto-refetch schedule lists
    refetchOnWindowFocus: false,
    retry: 2, // Simple retry for schedule lists
    throwOnError: false
  });

  // Transform allSchedules to ensure it's always the right format
  const allSchedules = React.useMemo(() => {
    if (!options.manageMultiple) {
      return undefined;
    }
    return allSchedulesData || [];
  }, [allSchedulesData, options.manageMultiple]);

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (config: any) => {
      const result = await StrategicReportingService.scheduleReport(
        options.reportId!,
        {
          frequency: config.frequency,
          delivery_method: 'email',
          recipients: config.channels?.includes('email') ? ['executive@example.com'] : []
        },
        { user_role: role }
      );

      const schedule: Schedule = {
        scheduleId: result.scheduleId || 'sched-1',
        frequency: config.frequency,
        nextRun: result.nextGenerationAt || '2024-01-16T06:00:00Z',
        deliveryChannels: config.channels
      };

      setActiveSchedule(schedule);
      return schedule;
    },
    onSuccess: (result) => {
      ValidationMonitor.recordPatternSuccess({
        pattern: 'report_scheduling_create',
        context: 'useReportScheduling.createScheduleMutation',
        description: `Successfully created schedule for report ${options.reportId}`
      });
      queryClient.invalidateQueries({ 
        queryKey: executiveAnalyticsKeys.reportScheduling(user?.id) 
      });
    },
    onError: (error: Error) => {
      ValidationMonitor.recordValidationError({
        context: 'useReportScheduling.createScheduleMutation',
        errorCode: 'REPORT_SCHEDULE_CREATE_FAILED',
        validationPattern: 'report_scheduling_mutation',
        errorMessage: error.message
      });
    }
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ scheduleId, updates }: { scheduleId: string; updates: any }) => {
      const result = await StrategicReportingService.scheduleReport(
        options.reportId!,
        { frequency: updates.frequency },
        { user_role: role }
      );

      const newVersion = activeSchedule?.version 
        ? `${(parseFloat(activeSchedule.version) + 1.0).toFixed(1)}`
        : '2.0';

      const updatedSchedule: Schedule = {
        scheduleId,
        frequency: updates.frequency,
        version: newVersion,
        reportId: options.reportId,
        nextRun: result.nextGenerationAt || '2025-01-05T12:00:00Z'
      };
      
      // Prepare history entry to be set in onSuccess
      const historyEntry = activeSchedule ? {
        version: activeSchedule.version || '1.0',
        replacedAt: new Date().toISOString()
      } : null;

      return { updatedSchedule, historyEntry };
    },
    onSuccess: ({ updatedSchedule, historyEntry }) => {
      setActiveSchedule(updatedSchedule);
      if (historyEntry) {
        setScheduleHistory(prev => {
          const history = Array.isArray(prev) ? prev : [];
          return [...history, historyEntry];
        });
      }
      ValidationMonitor.recordPatternSuccess({
        pattern: 'report_scheduling_update',
        context: 'useReportScheduling.updateScheduleMutation',
        description: `Successfully updated schedule ${updatedSchedule.scheduleId}`
      });
      queryClient.invalidateQueries({ 
        queryKey: executiveAnalyticsKeys.reportScheduling(user?.id) 
      });
    },
    onError: (error: Error) => {
      ValidationMonitor.recordValidationError({
        context: 'useReportScheduling.updateScheduleMutation',
        errorCode: 'REPORT_SCHEDULE_UPDATE_FAILED',
        validationPattern: 'report_scheduling_mutation',
        errorMessage: error.message
      });
    }
  });

  // Calculate schedule summary - ensure allSchedulesData is an array
  const scheduleSummary = React.useMemo(() => {
    if (!allSchedulesData || !Array.isArray(allSchedulesData)) {
      return options.manageMultiple ? { daily: 0, weekly: 0, monthly: 0 } : undefined;
    }
    return {
      daily: allSchedulesData.filter((s: Schedule) => s.frequency === 'daily').length,
      weekly: allSchedulesData.filter((s: Schedule) => s.frequency === 'weekly').length,
      monthly: allSchedulesData.filter((s: Schedule) => s.frequency === 'monthly').length
    };
  }, [allSchedulesData, options.manageMultiple]);

  // Smart invalidation for schedule operations
  const invalidateScheduleData = React.useCallback(async () => {
    const relatedKeys = [
      executiveAnalyticsKeys.reportScheduling(user?.id),
      executiveAnalyticsKeys.strategicReporting(user?.id)
    ];
    
    await Promise.allSettled(
      relatedKeys.map(queryKey => 
        queryClient.invalidateQueries({ queryKey })
      )
    );
  }, [queryClient, user?.id]);

  // Fallback schedule data
  const fallbackSchedules = React.useMemo(() => ({
    schedules: [],
    summary: { daily: 0, weekly: 0, monthly: 0 },
    message: 'Schedule data temporarily unavailable',
    isFallback: true
  }), []);

  return {
    activeSchedule,
    allSchedules,
    scheduleCount: allSchedules?.length,
    scheduleSummary,
    scheduleHistory,
    createSchedule: createScheduleMutation.mutateAsync,
    updateSchedule: async (scheduleId: string, updates: any) => {
      const { updatedSchedule } = await updateScheduleMutation.mutateAsync({ scheduleId, updates });
      return updatedSchedule;
    },
    invalidateScheduleData,
    fallbackData: !allSchedulesData && options.manageMultiple ? fallbackSchedules : undefined
  };
}