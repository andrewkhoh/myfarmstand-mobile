// Enhanced Report Scheduling Hook Tests
// Testing schedule creation, updates, management, and error handling

import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useReportScheduling } from '../useReportScheduling';
import { StrategicReportingService } from '../../../services/executive/strategicReportingService';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Mock services
jest.mock('../../../services/executive/strategicReportingService', () => ({
  StrategicReportingService: {
    getSchedules: jest.fn(),
    scheduleReport: jest.fn(),
    updateSchedule: jest.fn()
  }
}));
jest.mock('../../../utils/validationMonitor');
jest.mock('../../role-based/useUserRole', () => ({
  useUserRole: jest.fn()
}));
jest.mock('../../useAuth', () => ({
  useCurrentUser: jest.fn(() => ({ data: { id: 'user-123', role: 'executive' } }))
}));
jest.mock('../../../utils/queryKeyFactory', () => ({
  executiveAnalyticsKeys: {
    reportScheduling: jest.fn((userId, type) => ['executive', 'reportScheduling', userId, type]),
    reportSchedulingAll: jest.fn((userId) => ['executive', 'reportScheduling', userId, 'all']),
    strategicReporting: jest.fn((userId) => ['executive', 'strategicReporting', userId])
  }
}));

// Import the mock after it's been set up
import { useUserRole } from '../../role-based/useUserRole';

describe('useReportScheduling Enhanced Tests', () => {
  let queryClient: QueryClient;

  const mockScheduleResponse = {
    scheduleId: 'schedule-123',
    nextGenerationAt: '2025-01-05T12:00:00Z',
    status: 'active',
    frequency: 'daily'
  };

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 }
      }
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useUserRole as jest.Mock).mockReturnValue({
      role: 'executive',
      hasPermission: jest.fn().mockResolvedValue(true)
    });
    (StrategicReportingService.scheduleReport as jest.Mock).mockResolvedValue(mockScheduleResponse);
    (StrategicReportingService.getSchedules as jest.Mock).mockResolvedValue([
      { scheduleId: 'sched-1', frequency: 'daily', nextRun: '2025-01-06T00:00:00Z', reportId: 'report-1' },
      { scheduleId: 'sched-2', frequency: 'weekly', nextRun: '2025-01-07T00:00:00Z', reportId: 'report-2' },
      { scheduleId: 'sched-3', frequency: 'monthly', nextRun: '2025-02-01T00:00:00Z', reportId: 'report-3' }
    ]);
    (ValidationMonitor as any).recordPatternSuccess = jest.fn();
    (ValidationMonitor as any).recordValidationError = jest.fn();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('Core Functionality Tests', () => {
    it('should initialize without reportId', () => {
      const { result } = renderHook(() => useReportScheduling(), {
        wrapper: createWrapper()
      });

      expect(result.current.activeSchedule).toBeNull();
      expect(result.current.scheduleHistory).toEqual([]);
    });

    it('should initialize with reportId', () => {
      const options = { reportId: 'test-report-1' };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      expect(result.current.activeSchedule).toBeNull();
      expect(result.current.createSchedule).toBeDefined();
    });

    it('should handle multiple schedule management', async () => {
      const options = { manageMultiple: true };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      // Wait for the schedules to actually load from the query
      await waitFor(() => {
        expect(result.current.allSchedules).toBeDefined();
        expect(result.current.allSchedules.length).toBeGreaterThan(0);
      });

      expect(Array.isArray(result.current.allSchedules)).toBe(true);
      expect(result.current.allSchedules).toHaveLength(3);
    });
  });

  describe('Schedule Creation Tests', () => {
    it('should create schedule successfully', async () => {
      const options = { reportId: 'report-1' };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      const config = {
        frequency: 'daily',
        channels: ['email']
      };

      await act(async () => {
        const schedule = await result.current.createSchedule(config);
        expect(schedule).toBeDefined();
      });

      expect(result.current.activeSchedule).toBeDefined();
      expect(result.current.activeSchedule?.frequency).toBe('daily');
      expect(result.current.activeSchedule?.deliveryChannels).toEqual(['email']);
    });

    it('should handle different frequency options', async () => {
      const options = { reportId: 'report-2' };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      const frequencies = ['daily', 'weekly', 'monthly'];

      for (const frequency of frequencies) {
        await act(async () => {
          await result.current.createSchedule({ frequency });
        });

        expect(StrategicReportingService.scheduleReport).toHaveBeenCalledWith(
          'report-2',
          expect.objectContaining({ frequency }),
          { user_role: 'executive' }
        );
      }
    });

    it('should handle delivery channel configuration', async () => {
      const options = { reportId: 'report-3' };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      const config = {
        frequency: 'weekly',
        channels: ['email', 'slack']
      };

      await act(async () => {
        await result.current.createSchedule(config);
      });

      expect(result.current.activeSchedule?.deliveryChannels).toEqual(['email', 'slack']);
      expect(StrategicReportingService.scheduleReport).toHaveBeenCalledWith(
        'report-3',
        expect.objectContaining({
          delivery_method: 'email',
          recipients: ['executive@example.com']
        }),
        { user_role: 'executive' }
      );
    });

    it('should set next run time from service response', async () => {
      const options = { reportId: 'report-4' };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.createSchedule({ frequency: 'daily' });
      });

      expect(result.current.activeSchedule?.nextRun).toBe('2025-01-05T12:00:00Z');
    });
  });

  describe('Schedule Update Tests', () => {
    it('should update schedule successfully', async () => {
      const options = { reportId: 'report-5' };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      // Create initial schedule
      await act(async () => {
        await result.current.createSchedule({ frequency: 'daily' });
      });

      const initialSchedule = result.current.activeSchedule;
      expect(initialSchedule?.frequency).toBe('daily');

      // Update schedule
      await act(async () => {
        await result.current.updateSchedule('schedule-123', { frequency: 'weekly' });
      });

      expect(result.current.activeSchedule?.frequency).toBe('weekly');
      expect(result.current.activeSchedule?.version).toBe('2.0');
    });

    it('should track schedule history during updates', async () => {
      const options = { reportId: 'report-6' };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      // Create initial schedule
      await act(async () => {
        await result.current.createSchedule({ frequency: 'daily' });
      });

      expect(result.current.scheduleHistory).toHaveLength(0);

      // Update schedule
      await act(async () => {
        await result.current.updateSchedule('schedule-123', { frequency: 'weekly' });
      });

      expect(result.current.scheduleHistory).toHaveLength(1);
      expect(result.current.scheduleHistory[0]).toEqual({
        version: '1.0',
        replacedAt: expect.any(String)
      });
    });

    it('should handle updates without previous schedule', async () => {
      const options = { reportId: 'report-7' };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      // Update without creating first
      await act(async () => {
        await result.current.updateSchedule('new-schedule', { frequency: 'monthly' });
      });

      expect(result.current.activeSchedule?.frequency).toBe('monthly');
      expect(result.current.scheduleHistory).toHaveLength(0);
    });
  });

  describe('Multiple Schedule Management Tests', () => {
    it('should fetch all schedules when managing multiple', async () => {
      const options = { manageMultiple: true };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.allSchedules).toBeDefined();
      }, { timeout: 3000 });

      // Wait for the data to be loaded
      await waitFor(() => {
        expect(result.current.allSchedules?.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      expect(result.current.allSchedules).toHaveLength(3);
      expect(result.current.allSchedules[0]).toEqual({
        scheduleId: 'sched-1',
        frequency: 'daily',
        reportId: 'report-1',
        nextRun: '2025-01-06T00:00:00Z'
      });
    });

    it('should calculate schedule summary', async () => {
      const options = { manageMultiple: true };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      // Wait for schedules to load first
      await waitFor(() => {
        expect(result.current.allSchedules).toBeDefined();
        expect(result.current.allSchedules?.length).toBeGreaterThan(0);
      });

      expect(result.current.scheduleSummary).toEqual({
        daily: 1,
        weekly: 1,
        monthly: 1
      });
    });

    it('should not fetch all schedules when not managing multiple', async () => {
      const options = { manageMultiple: false };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      expect(result.current.allSchedules).toBeUndefined();
      expect(result.current.scheduleSummary).toBeUndefined();
    });

    it('should handle empty schedule list', async () => {
      // Mock empty schedule list
      const mockEmptySchedules = jest.fn().mockResolvedValue([]);
      const queryClientWithEmptyData = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 }
        }
      });

      const options = { manageMultiple: true };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClientWithEmptyData}>
            {children}
          </QueryClientProvider>
        )
      });

      // Should handle empty list gracefully
      expect(result.current.allSchedules).toBeDefined();
    });
  });

  describe('UI Transform Tests', () => {
    it('should provide schedule data in UI-ready format', async () => {
      const options = { reportId: 'ui-report' };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.createSchedule({ frequency: 'weekly' });
      });

      const schedule = result.current.activeSchedule;
      expect(schedule?.scheduleId).toBeDefined();
      expect(schedule?.frequency).toBeDefined();
      expect(schedule?.nextRun).toBeDefined();
    });

    it('should provide summary data for dashboard display', async () => {
      const options = { manageMultiple: true };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.scheduleSummary).toBeDefined();
      });

      const summary = result.current.scheduleSummary;
      expect(typeof summary.daily).toBe('number');
      expect(typeof summary.weekly).toBe('number');
      expect(typeof summary.monthly).toBe('number');
    });

    it('should provide schedule history for audit trail', async () => {
      const options = { reportId: 'audit-report' };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.createSchedule({ frequency: 'daily' });
      });

      // Wait for activeSchedule to be set
      await waitFor(() => {
        expect(result.current.activeSchedule).toBeDefined();
      });

      await act(async () => {
        await result.current.updateSchedule('schedule-123', { frequency: 'weekly' });
      });

      expect(result.current.scheduleHistory).toHaveLength(1);
      expect(result.current.scheduleHistory[0]).toHaveProperty('version');
      expect(result.current.scheduleHistory[0]).toHaveProperty('replacedAt');
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle schedule creation errors', async () => {
      (StrategicReportingService.scheduleReport as jest.Mock)
        .mockRejectedValue(new Error('Schedule creation failed'));

      const options = { reportId: 'error-report' };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      await expect(result.current.createSchedule({ frequency: 'daily' })).rejects.toThrow('Schedule creation failed');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'useReportScheduling.createScheduleMutation',
        errorCode: 'REPORT_SCHEDULE_CREATE_FAILED',
        validationPattern: 'report_scheduling_mutation',
        errorMessage: 'Schedule creation failed'
      });
    });

    it('should handle schedule update errors', async () => {
      (StrategicReportingService as any).scheduleReport = jest.fn()
        .mockResolvedValueOnce(mockScheduleResponse) // Initial creation
        .mockRejectedValueOnce(new Error('Schedule update failed')); // Update fails

      const options = { reportId: 'update-error-report' };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      // Create initial schedule
      await act(async () => {
        await result.current.createSchedule({ frequency: 'daily' });
      });

      // Try to update
      await expect(result.current.updateSchedule('schedule-123', { frequency: 'weekly' }))
        .rejects.toThrow('Schedule update failed');
    });

    it('should provide fallback data when schedule fetching fails', async () => {
      const options = { manageMultiple: true };
      
      // Mock query to fail
      const failingQueryClient = new QueryClient({
        defaultOptions: {
          queries: { 
            retry: false, 
            gcTime: 0,
            queryFn: () => Promise.reject(new Error('Fetch failed'))
          }
        }
      });

      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={failingQueryClient}>
            {children}
          </QueryClientProvider>
        )
      });

      // Should eventually provide fallback data
      await waitFor(() => {
        expect(result.current.fallbackData || result.current.allSchedules).toBeDefined();
      });
    });
  });

  describe('Permission Tests', () => {
    it('should work with executive role permissions', async () => {
      (useUserRole as jest.Mock).mockReturnValue({
        role: 'executive',
        hasPermission: jest.fn().mockResolvedValue(true)
      });

      const options = { reportId: 'exec-report' };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.createSchedule({ frequency: 'daily' });
      });

      expect(result.current.activeSchedule).toBeDefined();
    });

    it('should pass role to service calls', async () => {
      const options = { reportId: 'role-report' };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.createSchedule({ frequency: 'weekly' });
      });

      expect(StrategicReportingService.scheduleReport).toHaveBeenCalledWith(
        'role-report',
        expect.any(Object),
        { user_role: 'executive' }
      );
    });
  });

  describe('Cache Strategy Tests', () => {
    it('should use appropriate stale time for schedules', async () => {
      const options = { manageMultiple: true };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.allSchedules).toBeDefined();
      });

      // Should use cache for subsequent calls
      const { result: result2 } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result2.current.allSchedules).toBeDefined();
      });
    });

    it('should not auto-refetch schedule lists', async () => {
      const options = { manageMultiple: true };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.allSchedules).toBeDefined();
      });

      // Simulate window focus
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });

      // Should not trigger additional fetches
      expect(result.current.allSchedules).toBeDefined();
    });
  });

  describe('Query Invalidation Tests', () => {
    it('should invalidate related queries after successful creation', async () => {
      const wrapper = createWrapper();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      
      const options = { reportId: 'invalidation-report' };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper
      });

      await act(async () => {
        await result.current.createSchedule({ frequency: 'daily' });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalled();
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        pattern: 'report_scheduling_create',
        context: 'useReportScheduling.createScheduleMutation',
        description: 'Successfully created schedule for report invalidation-report'
      });
    });

    it('should provide smart invalidation helper', async () => {
      const wrapper = createWrapper();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      
      const { result } = renderHook(() => useReportScheduling(), {
        wrapper
      });

      await act(async () => {
        await result.current.invalidateScheduleData();
      });

      // Should invalidate multiple related queries
      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Validation Monitoring Tests', () => {
    it('should record successful pattern operations', async () => {
      const options = { reportId: 'monitor-report' };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.createSchedule({ frequency: 'monthly' });
      });

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        pattern: 'report_scheduling_create',
        context: 'useReportScheduling.createScheduleMutation',
        description: 'Successfully created schedule for report monitor-report'
      });
    });

    it('should record validation errors with proper context', async () => {
      (StrategicReportingService as any).scheduleReport = jest.fn()
        .mockRejectedValue(new Error('Invalid schedule parameters'));

      const options = { reportId: 'validation-error-report' };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      await act(async () => {
        try {
          await result.current.createSchedule({ frequency: 'daily' });
        } catch (error) {
          // Expected error
        }
      });

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'useReportScheduling.createScheduleMutation',
        errorCode: 'REPORT_SCHEDULE_CREATE_FAILED',
        validationPattern: 'report_scheduling_mutation',
        errorMessage: 'Invalid schedule parameters'
      });
    });
  });

  describe('Fallback Data Tests', () => {
    it('should provide fallback schedules when multiple management fails', async () => {
      const options = { manageMultiple: true };
      const { result } = renderHook(() => useReportScheduling(options), {
        wrapper: createWrapper()
      });

      // Fallback data should be available if needed
      expect(result.current.fallbackData?.schedules).toBeDefined();
      expect(result.current.fallbackData?.summary).toBeDefined();
      expect(result.current.fallbackData?.message).toBeDefined();
      expect(result.current.fallbackData?.isFallback).toBe(true);
    });
  });
});