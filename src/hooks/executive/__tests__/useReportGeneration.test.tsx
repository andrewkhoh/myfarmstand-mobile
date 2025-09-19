// Enhanced Report Generation Hook Tests
// Testing single/batch generation, data aggregation, and error handling

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useReportGeneration } from '../useReportGeneration';
import { StrategicReportingService } from '../../../services/executive/strategicReportingService';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Mock services
jest.mock('../../../services/executive/strategicReportingService');
jest.mock('../../../utils/validationMonitor');
jest.mock('../../role-based/useUserRole', () => ({
  useUserRole: jest.fn()
}));
jest.mock('../../../utils/queryKeyFactory', () => ({
  executiveAnalyticsKeys: {
    strategicReporting: jest.fn((role) => ['executive', 'strategicReporting', role]),
    reportScheduling: jest.fn((role) => ['executive', 'reportScheduling', role]),
    businessMetrics: jest.fn((role) => ['executive', 'businessMetrics', role])
  }
}));

// Import the mock after it's been set up
import { useUserRole } from '../../role-based/useUserRole';

describe('useReportGeneration Enhanced Tests', () => {
  let queryClient: QueryClient;

  const mockReportResponse = {
    reportId: 'report-123',
    status: 'completed',
    generatedAt: '2025-01-04T12:00:00Z',
    url: 'https://example.com/report-123.pdf',
    metadata: {
      type: 'operational_efficiency',
      pages: 15,
      dataPoints: 1000
    }
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
    (StrategicReportingService as any).generateReport = jest.fn().mockResolvedValue(mockReportResponse);
    (StrategicReportingService as any).updateReportConfig = jest.fn().mockResolvedValue({ success: true });
    (ValidationMonitor as any).recordPatternSuccess = jest.fn();
    (ValidationMonitor as any).recordValidationError = jest.fn();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('Core Functionality Tests', () => {
    it('should generate single report successfully', async () => {
      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      expect(result.current.isGenerating).toBe(false);

      await act(async () => {
        const report = await result.current.generateReport();
        expect(report).toBeDefined();
      });

      expect(result.current.generatedReport).toBeDefined();
      expect(result.current.generatedReport.reportId).toBe('gen-1');
      expect(result.current.isGenerating).toBe(false);
    });

    it('should handle report type options', async () => {
      const options = { reportType: 'financial_summary' };
      const { result } = renderHook(() => useReportGeneration(options), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateReport();
      });

      expect(result.current.generatedReport.reportType).toBe('financial_summary');
      expect(StrategicReportingService.generateReport).toHaveBeenCalledWith(
        'gen-1',
        { include_all_analytics: undefined },
        { user_role: 'executive' }
      );
    });

    it('should handle data aggregation when enabled', async () => {
      const options = { 
        reportType: 'performance_analysis',
        dataAggregationEnabled: true 
      };
      
      const { result } = renderHook(() => useReportGeneration(options), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateReport();
      });

      expect(result.current.generatedReport.dataAggregation).toBeDefined();
      expect(result.current.generatedReport.dataAggregation.totalDataPoints).toBe(5000);
      expect(result.current.generatedReport.dataAggregation.aggregationMethod).toBe('time_series');
      expect(result.current.generatedReport.dataAggregation.samplingRate).toBe(0.95);

      expect(StrategicReportingService.generateReport).toHaveBeenCalledWith(
        'gen-1',
        { include_all_analytics: true },
        { user_role: 'executive' }
      );
    });

    it('should track generation metrics', async () => {
      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateReport();
      });

      const metrics = result.current.generatedReport.generationMetrics;
      expect(metrics.startTime).toBeDefined();
      expect(metrics.endTime).toBeDefined();
      expect(metrics.processingTime).toBe(60000); // 1 minute
    });
  });

  describe('Batch Generation Tests', () => {
    it('should generate batch reports with progress tracking', async () => {
      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      expect(result.current.batchProgress).toBe(0);

      const reportTypes = ['financial', 'operational', 'strategic'];

      await act(async () => {
        const batchResults = await result.current.generateBatchReports(reportTypes);
        expect(batchResults).toBeDefined();
      });

      expect(result.current.batchResults).toHaveLength(3);
      expect(result.current.batchProgress).toBe(100);
    });

    it('should handle custom report types in batch', async () => {
      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      const customTypes = ['monthly_summary', 'quarterly_review'];

      await act(async () => {
        await result.current.generateBatchReports(customTypes);
      });

      expect(result.current.batchResults).toHaveLength(2);
      expect(result.current.batchResults[0].reportType).toBe('monthly_summary');
      expect(result.current.batchResults[1].reportType).toBe('quarterly_review');
    });

    it('should track progress during batch generation', async () => {
      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      const reportTypes = ['type1', 'type2', 'type3', 'type4'];

      // Start batch generation
      act(() => {
        result.current.generateBatchReports(reportTypes);
      });

      // Progress should start at 0
      expect(result.current.batchProgress).toBeGreaterThanOrEqual(0);

      await waitFor(() => {
        expect(result.current.batchProgress).toBe(100);
      });
    });

    it('should reset batch state on new generation', async () => {
      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      // Generate first batch
      await act(async () => {
        await result.current.generateBatchReports(['report1']);
      });

      expect(result.current.batchResults).toHaveLength(1);
      expect(result.current.batchProgress).toBe(100);

      // Generate second batch - should reset
      await act(async () => {
        await result.current.generateBatchReports(['report2', 'report3']);
      });

      expect(result.current.batchResults).toHaveLength(2);
      expect(result.current.batchProgress).toBe(100);
    });
  });

  describe('Configuration Management Tests', () => {
    it('should update configuration successfully', async () => {
      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      const configUpdates = {
        format: 'pdf',
        includeCharts: true,
        dataRange: '90d'
      };

      await act(async () => {
        const updateResult = await result.current.updateConfiguration(configUpdates);
        expect(updateResult).toBeDefined();
      });

      expect(StrategicReportingService.updateReportConfig).toHaveBeenCalledWith(
        'report-1',
        configUpdates
      );
    });

    it('should handle configuration validation errors', async () => {
      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      const invalidConfig = {
        invalid_field: 'invalid_value'
      };

      await act(async () => {
        try {
          await result.current.updateConfiguration(invalidConfig);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.configurationError).toBeDefined();
      expect(result.current.configurationError?.message).toBe('Invalid report configuration schema');
    });

    it('should record configuration errors in validation monitor', async () => {
      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        try {
          await result.current.updateConfiguration({ invalid_field: 'test' });
        } catch (error) {
          // Expected error
        }
      });

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'useReportGeneration.updateConfigurationMutation',
        errorCode: 'REPORT_CONFIGURATION_UPDATE_FAILED',
        validationPattern: 'report_generation_mutation',
        errorMessage: 'Invalid report configuration schema'
      });
    });
  });

  describe('Generation State Management Tests', () => {
    it('should track generation state during report creation', async () => {
      let resolveGeneration: (value: any) => void;
      const delayedPromise = new Promise(resolve => {
        resolveGeneration = resolve;
      });

      (StrategicReportingService as any).generateReport = jest.fn()
        .mockReturnValue(delayedPromise);

      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      // Start generation
      act(() => {
        result.current.generateReport();
      });

      // Should be generating
      expect(result.current.isGenerating).toBe(true);

      // Complete generation
      act(() => {
        resolveGeneration(mockReportResponse);
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    });

    it('should handle generation state across multiple operations', async () => {
      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      // Single report generation
      await act(async () => {
        await result.current.generateReport();
      });

      expect(result.current.isGenerating).toBe(false);

      // Batch generation
      await act(async () => {
        await result.current.generateBatchReports(['report1']);
      });

      expect(result.current.isGenerating).toBe(false);
    });
  });

  describe('UI Transform Tests', () => {
    it('should provide report data in UI-ready format', async () => {
      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateReport();
      });

      const report = result.current.generatedReport;
      expect(report.reportId).toBeDefined();
      expect(report.reportType).toBeDefined();
      expect(report.generationMetrics).toBeDefined();
    });

    it('should provide batch results with proper structure', async () => {
      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateBatchReports(['financial', 'operational']);
      });

      result.current.batchResults.forEach(batchItem => {
        expect(batchItem.reportId).toBeDefined();
        expect(batchItem.reportType).toBeDefined();
      });
    });

    it('should include data aggregation details when enabled', async () => {
      const options = { dataAggregationEnabled: true };
      const { result } = renderHook(() => useReportGeneration(options), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateReport();
      });

      const aggregation = result.current.generatedReport.dataAggregation;
      expect(aggregation).toBeDefined();
      expect(aggregation.totalDataPoints).toBeDefined();
      expect(aggregation.aggregationMethod).toBeDefined();
      expect(aggregation.samplingRate).toBeDefined();
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle single report generation errors', async () => {
      (StrategicReportingService as any).generateReport = jest.fn()
        .mockRejectedValue(new Error('Report generation failed'));

      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        try {
          await result.current.generateReport();
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.isGenerating).toBe(false);
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'useReportGeneration.generateReportMutation',
        errorCode: 'REPORT_GENERATION_FAILED',
        validationPattern: 'report_generation_mutation',
        errorMessage: 'Report generation failed'
      });
    });

    it('should handle batch generation errors', async () => {
      (StrategicReportingService as any).generateReport = jest.fn()
        .mockRejectedValue(new Error('Batch generation failed'));

      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      await expect(result.current.generateBatchReports(['report1'])).rejects.toThrow('Batch generation failed');
    });

    it('should provide fallback data on configuration errors', async () => {
      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        try {
          await result.current.updateConfiguration({ invalid_field: 'test' });
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.fallbackData).toBeDefined();
      expect(result.current.fallbackData.reportId).toBe('fallback-1');
      expect(result.current.fallbackData.reportType).toBe('basic');
      expect(result.current.fallbackData.data).toBe('Limited data available');
    });
  });

  describe('Permission Tests', () => {
    it('should work with executive role permissions', async () => {
      (useUserRole as jest.Mock).mockReturnValue({
        role: 'executive',
        hasPermission: jest.fn().mockResolvedValue(true)
      });

      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateReport();
      });

      expect(result.current.generatedReport).toBeDefined();
    });

    it('should pass role to service calls', async () => {
      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateReport();
      });

      expect(StrategicReportingService.generateReport).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        { user_role: 'executive' }
      );
    });
  });

  describe('Query Invalidation Tests', () => {
    it('should invalidate related queries after successful generation', async () => {
      const wrapper = createWrapper();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      
      const { result } = renderHook(() => useReportGeneration(), {
        wrapper
      });

      await act(async () => {
        await result.current.generateReport();
      });

      expect(invalidateQueriesSpy).toHaveBeenCalled();
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        pattern: 'report_generation_single',
        context: 'useReportGeneration.generateReportMutation',
        description: 'Successfully generated operational_efficiency report'
      });
    });

    it('should provide smart invalidation helper', async () => {
      const wrapper = createWrapper();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      
      const { result } = renderHook(() => useReportGeneration(), {
        wrapper
      });

      await act(async () => {
        await result.current.invalidateRelatedReports();
      });

      // Should invalidate multiple related queries
      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Validation Monitoring Tests', () => {
    it('should record successful pattern operations with correct report type', async () => {
      const { result } = renderHook(() => useReportGeneration({ reportType: 'quarterly_summary' }), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateReport();
      });

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        pattern: 'report_generation_single',
        context: 'useReportGeneration.generateReportMutation',
        description: 'Successfully generated quarterly_summary report'
      });
    });

    it('should record validation errors with proper context', async () => {
      (StrategicReportingService as any).generateReport = jest.fn()
        .mockRejectedValue(new Error('Invalid report parameters'));

      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        try {
          await result.current.generateReport();
        } catch (error) {
          // Expected error
        }
      });

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'useReportGeneration.generateReportMutation',
        errorCode: 'REPORT_GENERATION_FAILED',
        validationPattern: 'report_generation_mutation',
        errorMessage: 'Invalid report parameters'
      });
    });
  });

  describe('Batch Mode Tests', () => {
    it('should enable batch mode when specified', async () => {
      const options = { batchMode: true };
      const { result } = renderHook(() => useReportGeneration(options), {
        wrapper: createWrapper()
      });

      expect(result.current.generateBatchReports).toBeDefined();
    });

    it('should handle mixed single and batch operations', async () => {
      const { result } = renderHook(() => useReportGeneration(), {
        wrapper: createWrapper()
      });

      // Single generation
      await act(async () => {
        await result.current.generateReport();
      });

      expect(result.current.generatedReport).toBeDefined();

      // Batch generation
      await act(async () => {
        await result.current.generateBatchReports(['report1', 'report2']);
      });

      expect(result.current.batchResults).toHaveLength(2);
      expect(result.current.generatedReport).toBeDefined(); // Should still exist
    });
  });
});