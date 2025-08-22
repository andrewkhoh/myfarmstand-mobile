// Phase 4.3: Strategic Reporting Hook Tests (RED Phase)
// Following established React Query testing patterns

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStrategicReporting } from '../useStrategicReporting';
import { useReportGeneration } from '../useReportGeneration';
import { useReportScheduling } from '../useReportScheduling';
import { StrategicReportingService } from '../../../services/executive/strategicReportingService';

// Mock the service
jest.mock('../../../services/executive/strategicReportingService');

// Mock the user role hook
jest.mock('../../../hooks/role-based/useUserRole', () => ({
  useUserRole: jest.fn(() => ({
    role: 'executive',
    hasPermission: jest.fn().mockResolvedValue(true)
  }))
}));

describe('useStrategicReporting Hook - Phase 4.3', () => {
  let queryClient: QueryClient;

  // Create wrapper with QueryClient
  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
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
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('useStrategicReporting', () => {
    it('should generate comprehensive strategic reports with all data sources', async () => {
      const mockReport = {
        reportData: {
          crossRoleAnalysis: {
            correlationMatrix: {
              'inventory-marketing': 0.75,
              'marketing-sales': 0.82
            }
          },
          predictiveInsights: {
            demandForecast: { nextMonth: 1250, confidence: 0.87 }
          },
          performanceTrends: {
            overallPerformance: 'above_target',
            keyMetrics: { revenue_growth: 15.2 }
          }
        },
        reportMetadata: {
          reportId: 'report-1',
          reportType: 'executive_summary',
          generatedAt: '2024-01-15T10:00:00Z',
          dataSourcesUsed: ['business_metrics', 'predictive_forecasts']
        },
        generatedAt: '2024-01-15T10:00:00Z',
        performanceMetrics: { generationTime: 1200 }
      };

      (StrategicReportingService.generateReport as jest.Mock).mockResolvedValue(mockReport);

      const { result } = renderHook(
        () => useStrategicReporting({
          reportId: 'report-1',
          includeAllDataSources: true,
          detailLevel: 'comprehensive'
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.reportData).toEqual(mockReport);
      expect(result.current.reportData?.reportMetadata.dataSourcesUsed).toContain('business_metrics');
      expect(result.current.reportData?.performanceMetrics.generationTime).toBeLessThan(5000);
    });

    it('should support scheduled report automation', async () => {
      const mockScheduleResult = {
        isAutomated: true,
        nextGenerationAt: '2024-01-22T10:00:00Z',
        reportFrequency: 'weekly',
        scheduleId: 'schedule-1'
      };

      (StrategicReportingService.scheduleReport as jest.Mock).mockResolvedValue(mockScheduleResult);

      const { result } = renderHook(
        () => useStrategicReporting({ reportId: 'report-1' }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.scheduleReport({
          frequency: 'weekly',
          delivery_method: 'email',
          recipients: ['executive@example.com']
        });
      });

      expect(result.current.scheduleInfo).toEqual(mockScheduleResult);
      expect(result.current.scheduleInfo?.isAutomated).toBe(true);
    });

    it('should handle report export in multiple formats', async () => {
      const mockExportResult = {
        exportFormat: 'pdf',
        fileSize: 2048000,
        downloadUrl: 'https://reports.example.com/download/report-1.pdf',
        includesCharts: true,
        processingTime: 1500
      };

      (StrategicReportingService.exportReportData as jest.Mock).mockResolvedValue(mockExportResult);

      const { result } = renderHook(
        () => useStrategicReporting({ reportId: 'report-1' }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.exportReport({
          format: 'pdf',
          include_charts: true,
          optimize_for_size: true
        });
      });

      expect(result.current.exportResult).toEqual(mockExportResult);
      expect(result.current.exportResult?.includesCharts).toBe(true);
    });

    it('should apply role-based filtering to report data', async () => {
      const mockFilteredReport = {
        reportData: { inventory_only: true },
        accessLevel: 'inventory_staff',
        formattedData: { inventory_metrics: [] },
        availableMetrics: ['inventory_only', 'inventory_turnover']
      };

      (StrategicReportingService.getReportData as jest.Mock).mockResolvedValue(mockFilteredReport);

      const { result } = renderHook(
        () => useStrategicReporting({
          reportId: 'report-1',
          userRole: 'inventory_staff'
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.filteredData).toEqual(mockFilteredReport);
      });

      expect(result.current.filteredData?.accessLevel).toBe('inventory_staff');
      expect(result.current.filteredData?.availableMetrics).not.toContain('marketing_roi');
    });
  });

  describe('useReportGeneration', () => {
    it('should generate dynamic reports with real-time data aggregation', async () => {
      const mockGeneratedReport = {
        reportId: 'gen-1',
        reportType: 'operational_efficiency',
        dataAggregation: {
          totalDataPoints: 5000,
          aggregationMethod: 'time_series',
          samplingRate: 0.95
        },
        generationMetrics: {
          startTime: '2024-01-15T09:59:00Z',
          endTime: '2024-01-15T10:00:00Z',
          processingTime: 60000
        }
      };

      (StrategicReportingService.generateReport as jest.Mock).mockResolvedValue({
        reportData: mockGeneratedReport
      });

      const { result } = renderHook(
        () => useReportGeneration({
          reportType: 'operational_efficiency',
          dataAggregationEnabled: true
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      await act(async () => {
        await result.current.generateReport();
      });

      expect(result.current.generatedReport).toEqual(mockGeneratedReport);
      expect(result.current.generatedReport?.dataAggregation.totalDataPoints).toBeGreaterThan(1000);
    });

    it('should support batch report generation', async () => {
      const mockBatchReports = [
        { reportId: 'batch-1', reportType: 'financial' },
        { reportId: 'batch-2', reportType: 'operational' },
        { reportId: 'batch-3', reportType: 'strategic' }
      ];

      (StrategicReportingService.generateReport as jest.Mock)
        .mockResolvedValueOnce({ reportData: mockBatchReports[0] })
        .mockResolvedValueOnce({ reportData: mockBatchReports[1] })
        .mockResolvedValueOnce({ reportData: mockBatchReports[2] });

      const { result } = renderHook(
        () => useReportGeneration({ batchMode: true }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.generateBatchReports(['financial', 'operational', 'strategic']);
      });

      expect(result.current.batchResults).toHaveLength(3);
      expect(result.current.batchProgress).toBe(100);
    });

    it('should validate report configuration before generation', async () => {
      const mockError = new Error('Invalid report configuration schema');
      (StrategicReportingService.updateReportConfig as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(
        () => useReportGeneration({}),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await expect(result.current.updateConfiguration({
          invalid_field: 'should_fail'
        })).rejects.toThrow('Invalid report configuration');
      });

      expect(result.current.configurationError).toBeDefined();
    });
  });

  describe('useReportScheduling', () => {
    it('should schedule automated report delivery', async () => {
      const mockSchedule = {
        scheduleId: 'sched-1',
        frequency: 'daily',
        nextRun: '2024-01-16T06:00:00Z',
        deliveryChannels: ['email', 'dashboard']
      };

      (StrategicReportingService.scheduleReport as jest.Mock).mockResolvedValue(mockSchedule);

      const { result } = renderHook(
        () => useReportScheduling({ reportId: 'report-1' }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.createSchedule({
          frequency: 'daily',
          deliveryTime: '06:00',
          channels: ['email', 'dashboard']
        });
      });

      expect(result.current.activeSchedule).toEqual(mockSchedule);
      expect(result.current.activeSchedule?.frequency).toBe('daily');
    });

    it('should manage multiple report schedules', async () => {
      const mockSchedules = [
        { scheduleId: 'sched-1', frequency: 'daily', reportId: 'report-1' },
        { scheduleId: 'sched-2', frequency: 'weekly', reportId: 'report-2' },
        { scheduleId: 'sched-3', frequency: 'monthly', reportId: 'report-3' }
      ];

      (StrategicReportingService.getSchedules as jest.Mock).mockResolvedValue(mockSchedules);

      const { result } = renderHook(
        () => useReportScheduling({ manageMultiple: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.allSchedules).toEqual(mockSchedules);
      });

      expect(result.current.allSchedules).toHaveLength(3);
      expect(result.current.scheduleSummary).toEqual({
        daily: 1,
        weekly: 1,
        monthly: 1
      });
    });

    it('should handle schedule modifications with versioning', async () => {
      const mockUpdatedSchedule = {
        scheduleId: 'sched-1',
        frequency: 'bi_weekly',
        version: '2.0',
        previousVersion: '1.0',
        updatedAt: '2024-01-15T10:00:00Z'
      };

      (StrategicReportingService.updateSchedule as jest.Mock).mockResolvedValue(mockUpdatedSchedule);

      const { result } = renderHook(
        () => useReportScheduling({ reportId: 'report-1' }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.updateSchedule('sched-1', {
          frequency: 'bi_weekly'
        });
      });

      expect(result.current.activeSchedule?.version).toBe('2.0');
      expect(result.current.scheduleHistory).toContainEqual({
        version: '1.0',
        replacedAt: expect.any(String)
      });
    });
  });

  describe('Report Optimization and Performance', () => {
    it('should optimize large report generation with compression', async () => {
      const mockOptimizedReport = {
        exportFormat: 'pdf',
        fileSize: 512000, // 500KB after compression
        originalSize: 2048000, // 2MB original
        compressionRatio: 0.25,
        processingTime: 800
      };

      (StrategicReportingService.exportReportData as jest.Mock).mockResolvedValue(mockOptimizedReport);

      const { result } = renderHook(
        () => useStrategicReporting({ reportId: 'large-report' }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.exportReport({
          format: 'pdf',
          compression: 'high',
          optimize_for_size: true
        });
      });

      expect(result.current.exportResult?.compressionRatio).toBeLessThan(0.5);
      expect(result.current.exportResult?.fileSize).toBeLessThan(1000000);
    });

    it('should implement progressive report loading for better UX', async () => {
      const mockProgressiveData = {
        phase1: { summary: 'Quick summary data' },
        phase2: { details: 'Detailed analysis' },
        phase3: { charts: 'Visual representations' }
      };

      let loadPhase = 0;
      (StrategicReportingService.generateReport as jest.Mock).mockImplementation(() => {
        loadPhase++;
        if (loadPhase === 1) return Promise.resolve({ reportData: mockProgressiveData.phase1 });
        if (loadPhase === 2) return Promise.resolve({ reportData: { ...mockProgressiveData.phase1, ...mockProgressiveData.phase2 } });
        return Promise.resolve({ reportData: mockProgressiveData });
      });

      const { result } = renderHook(
        () => useStrategicReporting({
          reportId: 'report-1',
          progressiveLoading: true
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.loadingPhase).toBe('summary');
      });

      expect(result.current.reportData?.reportData).toHaveProperty('summary');

      // Trigger next phase
      act(() => {
        queryClient.invalidateQueries({ queryKey: ['strategicReporting'] });
      });

      await waitFor(() => {
        expect(result.current.loadingPhase).toBe('complete');
      });
    });
  });

  describe('Query Key Factory Integration', () => {
    it('should use centralized query key factory for reports', async () => {
      const { result } = renderHook(
        () => useStrategicReporting({ reportId: 'report-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.queryKey).toEqual(['executive', 'strategicReporting', 'report-1']);
      });
    });
  });
});