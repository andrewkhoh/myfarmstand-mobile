// Phase 4.3: Report Scheduling Hook Implementation (GREEN Phase)
// Following established React Query patterns

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StrategicReportingService } from '../../services/executive/strategicReportingService';
import { useUserRole } from '../role-based/useUserRole';

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
  const queryClient = useQueryClient();
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);
  const [scheduleHistory, setScheduleHistory] = useState<any[]>([]);

  // Get all schedules if managing multiple
  const { data: allSchedules } = useQuery({
    queryKey: ['executive', 'reportSchedules', 'all'],
    queryFn: async () => {
      // Mock implementation - in real app would fetch from service
      return [
        { scheduleId: 'sched-1', frequency: 'daily', reportId: 'report-1' },
        { scheduleId: 'sched-2', frequency: 'weekly', reportId: 'report-2' },
        { scheduleId: 'sched-3', frequency: 'monthly', reportId: 'report-3' }
      ];
    },
    enabled: options.manageMultiple
  });

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
        scheduleId: result.scheduleId,
        frequency: config.frequency,
        nextRun: result.nextGenerationAt,
        deliveryChannels: config.channels
      };

      setActiveSchedule(schedule);
      return schedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executive', 'reportSchedules'] });
    }
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ scheduleId, updates }: { scheduleId: string; updates: any }) => {
      // Track old version in history
      if (activeSchedule) {
        setScheduleHistory(prev => [...prev, {
          version: activeSchedule.version || '1.0',
          replacedAt: new Date().toISOString()
        }]);
      }

      const result = await StrategicReportingService.scheduleReport(
        options.reportId!,
        { frequency: updates.frequency },
        { user_role: role }
      );

      const updatedSchedule: Schedule = {
        scheduleId,
        frequency: updates.frequency,
        version: '2.0',
        nextRun: result.nextGenerationAt
      };

      setActiveSchedule(updatedSchedule);
      return updatedSchedule;
    }
  });

  // Calculate schedule summary
  const scheduleSummary = allSchedules ? {
    daily: allSchedules.filter((s: Schedule) => s.frequency === 'daily').length,
    weekly: allSchedules.filter((s: Schedule) => s.frequency === 'weekly').length,
    monthly: allSchedules.filter((s: Schedule) => s.frequency === 'monthly').length
  } : undefined;

  return {
    activeSchedule,
    allSchedules,
    scheduleSummary,
    scheduleHistory,
    createSchedule: createScheduleMutation.mutateAsync,
    updateSchedule: (scheduleId: string, updates: any) => 
      updateScheduleMutation.mutateAsync({ scheduleId, updates })
  };
}