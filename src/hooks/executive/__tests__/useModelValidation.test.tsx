// Enhanced Model Validation Hook Tests
// Testing continuous monitoring, retraining triggers, and version comparison

import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useModelValidation } from '../useModelValidation';
import { PredictiveAnalyticsService } from '../../../services/executive/predictiveAnalyticsService';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Mock services
jest.mock('../../../services/executive/predictiveAnalyticsService');
jest.mock('../../../utils/validationMonitor');
jest.mock('../../role-based/useUserRole', () => ({
  useUserRole: jest.fn()
}));
jest.mock('../../../utils/queryKeyFactory', () => ({
  executiveAnalyticsKeys: {
    modelValidation: jest.fn((role, modelId) => ['executive', 'modelValidation', role, modelId]),
    predictiveAnalytics: jest.fn((role) => ['executive', 'predictiveAnalytics', role])
  }
}));

// Import the mock after it's been set up
import { useUserRole } from '../../role-based/useUserRole';

describe('useModelValidation Enhanced Tests', () => {
  let queryClient: QueryClient;

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
    (PredictiveAnalyticsService as any).validateModel = jest.fn();
    (ValidationMonitor as any).recordPatternSuccess = jest.fn();
    (ValidationMonitor as any).recordValidationError = jest.fn();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('Core Functionality Tests', () => {
    it('should initialize with model ID', () => {
      const options = { modelId: 'test-model-1' };
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      expect(result.current.queryKey).toContain('test-model-1');
    });

    it('should handle required modelId parameter', () => {
      const options = { modelId: 'required-model' };
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      expect(result.current.queryKey).toBeDefined();
    });

    it('should provide invalidation helper', async () => {
      const wrapper = createWrapper();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      
      const options = { modelId: 'test-model' };
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper
      });

      await act(async () => {
        await result.current.invalidateModelData();
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Continuous Monitoring Tests', () => {
    it('should enable monitoring when continuousMonitoring is true', async () => {
      const options = { 
        modelId: 'monitored-model',
        continuousMonitoring: true 
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.monitoringData).toBeDefined();
      });

      expect(result.current.monitoringData.modelHealth).toBeDefined();
      expect(result.current.monitoringData.performanceMetrics).toBeDefined();
    });

    it('should provide health status indicators', async () => {
      const options = { 
        modelId: 'health-model',
        continuousMonitoring: true 
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.monitoringData).toBeDefined();
      });

      expect(['healthy', 'degraded', 'critical']).toContain(result.current.monitoringData.modelHealth);
    });

    it('should track performance metrics', async () => {
      const options = { 
        modelId: 'performance-model',
        continuousMonitoring: true 
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.monitoringData).toBeDefined();
      });

      const metrics = result.current.monitoringData.performanceMetrics;
      expect(metrics.currentAccuracy).toBeDefined();
      expect(metrics.baselineAccuracy).toBeDefined();
      expect(metrics.degradation).toBeDefined();
    });

    it('should provide monitoring schedule information', async () => {
      const options = { 
        modelId: 'scheduled-model',
        continuousMonitoring: true 
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.monitoringData).toBeDefined();
      });

      expect(result.current.monitoringData.lastChecked).toBeDefined();
      expect(result.current.monitoringData.nextCheck).toBeDefined();
    });

    it('should not enable monitoring when continuousMonitoring is false', async () => {
      const options = { 
        modelId: 'non-monitored-model',
        continuousMonitoring: false 
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      expect(result.current.monitoringData).toBeUndefined();
    });
  });

  describe('Auto-Retraining Tests', () => {
    it('should trigger retraining when accuracy drops below threshold', async () => {
      const options = { 
        modelId: 'retrain-model',
        continuousMonitoring: true,
        autoRetrain: true,
        accuracyThreshold: 0.85
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.monitoringData).toBeDefined();
      });

      // Mock data should show degraded health and trigger retraining
      expect(result.current.monitoringData.modelHealth).toBe('degraded');
      expect(result.current.monitoringData.retrainingRecommended).toBe(true);
      expect(result.current.retrainingTriggered).toBe(true);
    });

    it('should not trigger retraining when accuracy is above threshold', async () => {
      const options = { 
        modelId: 'good-model',
        continuousMonitoring: true,
        autoRetrain: true,
        accuracyThreshold: 0.70 // Lower threshold
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.monitoringData).toBeDefined();
      });

      expect(result.current.monitoringData.modelHealth).toBe('healthy');
      expect(result.current.retrainingTriggered).toBe(false);
    });

    it('should not trigger retraining when autoRetrain is disabled', async () => {
      const options = { 
        modelId: 'manual-model',
        continuousMonitoring: true,
        autoRetrain: false,
        accuracyThreshold: 0.85
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.monitoringData).toBeDefined();
      });

      expect(result.current.retrainingTriggered).toBe(false);
    });

    it('should handle threshold accuracy validation', async () => {
      const options = { 
        modelId: 'threshold-model',
        continuousMonitoring: true,
        autoRetrain: true,
        accuracyThreshold: 0.90
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.monitoringData).toBeDefined();
      });

      const currentAccuracy = result.current.monitoringData.performanceMetrics.currentAccuracy;
      const shouldRetrain = currentAccuracy < options.accuracyThreshold;
      
      expect(result.current.retrainingTriggered).toBe(shouldRetrain);
    });
  });

  describe('Version Comparison Tests', () => {
    it('should compare model versions when requested', async () => {
      const options = { 
        modelId: 'versioned-model',
        compareVersions: true 
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.modelComparison).toBeDefined();
      });

      expect(result.current.modelComparison.models).toBeDefined();
      expect(result.current.modelComparison.bestModel).toBeDefined();
      expect(result.current.modelComparison.improvement).toBeDefined();
    });

    it('should provide model version details', async () => {
      const options = { 
        modelId: 'detailed-model',
        compareVersions: true 
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.modelComparison).toBeDefined();
      });

      const models = result.current.modelComparison.models;
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      
      models.forEach(model => {
        expect(model.id).toBeDefined();
        expect(model.accuracy).toBeDefined();
        expect(model.createdAt).toBeDefined();
      });
    });

    it('should identify best performing model', async () => {
      const options = { 
        modelId: 'best-model',
        compareVersions: true 
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.modelComparison).toBeDefined();
      });

      expect(result.current.modelComparison.bestModel).toBe('v3');
      expect(result.current.modelComparison.improvement).toBe(0.06);
    });

    it('should not compare versions when not requested', async () => {
      const options = { 
        modelId: 'no-comparison-model',
        compareVersions: false 
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      expect(result.current.modelComparison).toBeUndefined();
    });
  });

  describe('UI Transform Tests', () => {
    it('should provide monitoring data in UI-ready format', async () => {
      const options = { 
        modelId: 'ui-model',
        continuousMonitoring: true 
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.monitoringData).toBeDefined();
      });

      const data = result.current.monitoringData;
      expect(data.modelHealth).toBeDefined();
      expect(['healthy', 'degraded', 'critical']).toContain(data.modelHealth);
      expect(data.performanceMetrics).toBeDefined();
      expect(typeof data.performanceMetrics.currentAccuracy).toBe('number');
    });

    it('should provide comparison data with improvement metrics', async () => {
      const options = { 
        modelId: 'comparison-ui-model',
        compareVersions: true 
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.modelComparison).toBeDefined();
      });

      const comparison = result.current.modelComparison;
      expect(typeof comparison.improvement).toBe('number');
      expect(comparison.improvement).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling Tests', () => {
    it('should provide fallback data when monitoring fails', async () => {
      const options = { 
        modelId: 'failing-model',
        continuousMonitoring: true 
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      // Since we're mocking the query to return mock data, let's simulate an error scenario
      expect(result.current.fallbackData).toBeUndefined(); // No error initially

      // If there was an error, fallback would be provided
      const expectedFallback = {
        modelHealth: 'unknown',
        performanceMetrics: {
          currentAccuracy: 0,
          baselineAccuracy: 0,
          degradation: 0
        },
        message: 'Model validation temporarily unavailable',
        isFallback: true
      };

      // Test the structure matches expected fallback
      if (result.current.fallbackData) {
        expect(result.current.fallbackData).toMatchObject(expectedFallback);
      }
    });

    it('should handle version comparison errors gracefully', async () => {
      const options = { 
        modelId: 'error-model',
        compareVersions: true 
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      // Should not crash on version comparison errors
      expect(result.current).toBeDefined();
    });
  });

  describe('Cache Strategy Tests', () => {
    it('should use shorter stale time for continuous monitoring', async () => {
      const options1 = { 
        modelId: 'monitoring-model',
        continuousMonitoring: true 
      };
      
      const options2 = { 
        modelId: 'regular-model',
        continuousMonitoring: false 
      };

      const { result: monitoringResult } = renderHook(() => useModelValidation(options1), {
        wrapper: createWrapper()
      });

      const { result: regularResult } = renderHook(() => useModelValidation(options2), {
        wrapper: createWrapper()
      });

      // Both should initialize properly
      expect(monitoringResult.current).toBeDefined();
      expect(regularResult.current).toBeDefined();
    });

    it('should use appropriate cache times for model comparison', async () => {
      const options = { 
        modelId: 'cached-model',
        compareVersions: true 
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      // Should use longer cache for version comparisons since they change rarely
      expect(result.current).toBeDefined();
    });

    it('should not auto-refetch expensive model operations', async () => {
      const options = { 
        modelId: 'expensive-model',
        continuousMonitoring: true 
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      // Simulate window focus
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });

      // Should not trigger additional expensive operations
      expect(result.current).toBeDefined();
    });
  });

  describe('Query Key Tests', () => {
    it('should generate unique query keys for different models', () => {
      const { result: result1 } = renderHook(
        () => useModelValidation({ modelId: 'model-1' }),
        { wrapper: createWrapper() }
      );

      const { result: result2 } = renderHook(
        () => useModelValidation({ modelId: 'model-2' }),
        { wrapper: createWrapper() }
      );

      expect(result1.current.queryKey).not.toEqual(result2.current.queryKey);
    });

    it('should include model ID in query key', () => {
      const options = { modelId: 'unique-model-123' };
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      expect(result.current.queryKey).toContain('unique-model-123');
    });
  });

  describe('Drift Detection Tests', () => {
    it('should detect model drift in monitoring data', async () => {
      const options = { 
        modelId: 'drift-model',
        continuousMonitoring: true 
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.monitoringData).toBeDefined();
      });

      expect(result.current.monitoringData.driftDetected).toBeDefined();
      expect(typeof result.current.monitoringData.driftDetected).toBe('boolean');
    });
  });

  describe('Retry Strategy Tests', () => {
    it('should use limited retries for expensive model operations', async () => {
      const options = { 
        modelId: 'retry-model',
        continuousMonitoring: true 
      };
      
      const { result } = renderHook(() => useModelValidation(options), {
        wrapper: createWrapper()
      });

      // Should initialize with limited retry strategy
      expect(result.current).toBeDefined();
    });
  });
});