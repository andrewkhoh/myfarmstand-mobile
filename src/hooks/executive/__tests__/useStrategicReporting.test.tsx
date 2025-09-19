// Phase 4.3: Strategic Reporting Hook Tests (RED Phase)
// Following established React Query testing patterns

import React from 'react';
import { createSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../../test/contracts/hook.contracts';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Defensive import pattern for the hook
let useStrategicReporting: any;
let useReportGeneration: any;
let useReportScheduling: any;

try {
  const hookModule = require('../useStrategicReporting');
  useStrategicReporting = hookModule.useStrategicReporting;
} catch (error) {
  console.log('Import error for useStrategicReporting:', error);
}

try {
  const reportGenModule = require('../useReportGeneration');
  useReportGeneration = reportGenModule.useReportGeneration;
} catch (error) {
  console.log('Import error for useReportGeneration:', error);
}

try {
  const reportSchedModule = require('../useReportScheduling');
  useReportScheduling = reportSchedModule.useReportScheduling;
} catch (error) {
  console.log('Import error for useReportScheduling:', error);
}

import { StrategicReportingService } from '../../../services/executive/strategicReportingService';

// Mock the service
// Mock React Query BEFORE other mocks
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    isSuccess: false,
    isError: false,
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
  })),
}));

jest.mock('../../../services/executive/strategicReportingService');
const mockStrategicReportingService = StrategicReportingService as jest.Mocked<typeof StrategicReportingService>;

// Mock the user role hook
jest.mock('../../../hooks/role-based/useUserRole', () => ({
  useUserRole: jest.fn(() => ({
    role: 'executive',
    hasPermission: jest.fn().mockResolvedValue(true)
  }))
}));

// Mock useCurrentUser hook
jest.mock('../../useAuth', () => ({
  useCurrentUser: () => ({ data: { id: 'test-user-123' } })
}));

// Import React Query types for proper mocking
import { useQuery } from '@tanstack/react-query';
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

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

  // Verify hook exists
  it('should exist and be importable', () => {
    expect(useStrategicReporting).toBeDefined();
    expect(typeof useStrategicReporting).toBe('function');
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

      mockStrategicReportingService.generateReport.mockResolvedValue(mockReport);

      mockUseQuery.mockReturnValue({
        data: mockReport,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

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

      mockStrategicReportingService.scheduleReport.mockResolvedValue(mockScheduleResult);

      mockUseQuery.mockReturnValue({
        data: mockScheduleResult,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

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
      // When optimize_for_size is true, the hook should return compressed values
      const mockExportResult = {
        exportFormat: 'pdf',
        fileSize: 512000,  // Compressed size
        originalSize: 2048000,  // Original size before compression
        compressionRatio: 0.25,  // Compression ratio
        downloadUrl: 'https://reports.example.com/download/report-1.pdf',
        includesCharts: true,
        processingTime: 800  // Faster processing time due to compression
      };

      mockStrategicReportingService.exportReportData.mockResolvedValue(mockExportResult);

      mockUseQuery.mockReturnValue({
        data: mockExportResult,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

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

      mockStrategicReportingService.getReportData.mockResolvedValue(mockFilteredReport);

      mockUseQuery.mockReturnValue({
        data: mockFilteredReport,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

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

      mockUseQuery.mockReturnValue({
        data: { reportData: mockGeneratedReport },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

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
        { scheduleId: 'sched-1', frequency: 'daily', reportId: 'report-1', nextRun: '2025-01-06T00:00:00Z' },
        { scheduleId: 'sched-2', frequency: 'weekly', reportId: 'report-2', nextRun: '2025-01-07T00:00:00Z' },
        { scheduleId: 'sched-3', frequency: 'monthly', reportId: 'report-3', nextRun: '2025-02-01T00:00:00Z' }
      ];

      (StrategicReportingService.getSchedules as jest.Mock).mockResolvedValue(mockSchedules);

      // Mock useQuery to call the queryFn and return the result
      let queryFnCalled = false;
      mockUseQuery.mockImplementation((options: any) => {
        // Execute the queryFn if it exists to simulate real behavior
        if (options.queryFn && !queryFnCalled && options.enabled !== false) {
          queryFnCalled = true;
          // The queryFn should call getSchedules and return the mock data
          const dataPromise = options.queryFn();
          // Since we mocked getSchedules above, this should resolve to mockSchedules
          return {
            data: mockSchedules, // Return the mocked schedules directly
            isLoading: false,
            error: null,
            refetch: jest.fn(),
            isSuccess: true,
            isError: false,
          } as any;
        }
        // Default mock for other queries
        return {
          data: null,
          isLoading: false,
          error: null,
          refetch: jest.fn(),
          isSuccess: false,
          isError: false,
        } as any;
      });

      const { result } = renderHook(
        () => useReportScheduling({ manageMultiple: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.allSchedules).toBeDefined();
        expect(result.current.allSchedules?.length).toBe(3);
      });

      expect(result.current.allSchedules).toHaveLength(3);
      expect(result.current.scheduleSummary).toEqual({
        daily: 1,
        weekly: 1,
        monthly: 1
      });
    });

    it('should handle schedule modifications with versioning', async () => {
      const mockInitialSchedule = {
        scheduleId: 'sched-1',
        frequency: 'daily',
        nextGenerationAt: '2024-01-16T06:00:00Z'
      };

      const mockUpdatedSchedule = {
        scheduleId: 'sched-1',
        frequency: 'bi_weekly',
        version: '2.0',
        previousVersion: '1.0',
        updatedAt: '2024-01-15T10:00:00Z',
        nextGenerationAt: '2025-01-05T12:00:00Z'
      };

      (StrategicReportingService.scheduleReport as jest.Mock)
        .mockResolvedValueOnce(mockInitialSchedule)
        .mockResolvedValueOnce(mockUpdatedSchedule);

      const { result } = renderHook(
        () => useReportScheduling({ reportId: 'report-1' }),
        { wrapper: createWrapper() }
      );

      // First create a schedule to establish version 1.0
      await act(async () => {
        await result.current.createSchedule({
          frequency: 'daily',
          deliveryTime: '06:00',
          channels: ['email']
        });
      });

      // Now update the schedule to version 2.0
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
        reportData: {
          summary: 'Quick summary data',
          details: 'Detailed analysis',
          charts: 'Visual representations'
        },
        reportMetadata: {
          reportId: 'report-1',
          reportType: 'executive_summary',
          generatedAt: '2024-01-15T10:00:00Z'
        }
      };

      (StrategicReportingService.generateReport as jest.Mock).mockResolvedValue(mockProgressiveData);

      mockUseQuery.mockReturnValue({
        data: mockProgressiveData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useStrategicReporting({
          reportId: 'report-1',
          progressiveLoading: true
        }),
        { wrapper: createWrapper() }
      );

      // Initial phase should be summary
      expect(result.current.loadingPhase).toBe('summary');

      // Wait for progressive phase to advance to 'details'
      await waitFor(() => {
        expect(result.current.loadingPhase).toBe('details');
      }, { timeout: 200 });

      // Wait for progressive phase to advance to 'complete'
      await waitFor(() => {
        expect(result.current.loadingPhase).toBe('complete');
      }, { timeout: 300 });

      expect(result.current.reportData).toBeDefined();
      expect(result.current.reportData?.reportData).toHaveProperty('summary');
    });
  });

  describe('Query Key Factory Integration', () => {
    it('should use centralized query key factory for reports', async () => {
      mockUseQuery.mockReturnValue({
        data: {},
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

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