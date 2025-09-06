// Enhanced Insight Generation Hook Tests
// Testing single/batch generation, statistical validation, and error handling

import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useInsightGeneration } from '../useInsightGeneration';
import { BusinessIntelligenceService } from '../../../services/executive/businessIntelligenceService';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Mock services
jest.mock('../../../services/executive/businessIntelligenceService');
jest.mock('../../../utils/validationMonitor');
jest.mock('../../role-based/useUserRole', () => ({
  useUserRole: jest.fn()
}));
jest.mock('../../../utils/queryKeyFactory', () => ({
  executiveAnalyticsKeys: {
    businessInsights: jest.fn((role) => ['executive', 'businessInsights', role])
  }
}));

// Import the mock after it's been set up
import { useUserRole } from '../../role-based/useUserRole';

describe('useInsightGeneration Enhanced Tests', () => {
  let queryClient: QueryClient;

  const mockInsightData = {
    insights: [
      {
        id: 'insight-1',
        type: 'correlation',
        title: 'Revenue-Marketing Correlation',
        description: 'Strong correlation found between marketing spend and revenue',
        confidence: 0.92,
        impact: 'high',
        actionable: true
      },
      {
        id: 'insight-2',
        type: 'trend',
        title: 'Customer Growth Trend',
        description: 'Steady 15% monthly growth in customer acquisition',
        confidence: 0.88,
        impact: 'medium',
        actionable: true
      }
    ],
    metadata: {
      generatedAt: '2025-01-04T12:00:00Z',
      analysisMethod: 'statistical_correlation'
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
    (BusinessIntelligenceService as any).generateInsights = jest.fn().mockResolvedValue(mockInsightData);
    (ValidationMonitor as any).recordPatternSuccess = jest.fn();
    (ValidationMonitor as any).recordValidationError = jest.fn();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('Core Functionality Tests', () => {
    it('should generate single insight successfully', async () => {
      const { result } = renderHook(() => useInsightGeneration(), {
        wrapper: createWrapper()
      });

      expect(result.current.isGenerating).toBe(false);

      await act(async () => {
        const insight = await result.current.generateInsight();
        expect(insight).toBeDefined();
      });

      expect(result.current.generatedInsight).toBeDefined();
      expect(result.current.generatedInsight.id).toBe('insight-1');
      expect(result.current.isGenerating).toBe(false);
    });

    it('should handle data source options', async () => {
      const options = { 
        dataSource: ['sales', 'marketing'],
        analysisType: 'correlation' as const
      };
      
      const { result } = renderHook(() => useInsightGeneration(options), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateInsight();
      });

      expect(BusinessIntelligenceService.generateInsights).toHaveBeenCalledWith({
        data_sources: ['sales', 'marketing'],
        insight_type: 'correlation',
        include_statistical_validation: undefined
      });
    });

    it('should handle analysis type filtering', async () => {
      const options = { analysisType: 'anomaly' as const };
      const { result } = renderHook(() => useInsightGeneration(options), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateInsight();
      });

      expect(BusinessIntelligenceService.generateInsights).toHaveBeenCalledWith({
        data_sources: undefined,
        insight_type: 'anomaly',
        include_statistical_validation: undefined
      });
    });

    it('should include statistical validation when requested', async () => {
      const options = { includeStatisticalValidation: true };
      const { result } = renderHook(() => useInsightGeneration(options), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateInsight();
      });

      expect(BusinessIntelligenceService.generateInsights).toHaveBeenCalledWith({
        data_sources: undefined,
        insight_type: undefined,
        include_statistical_validation: true
      });
    });
  });

  describe('Batch Generation Tests', () => {
    it('should generate batch insights with progress tracking', async () => {
      const { result } = renderHook(() => useInsightGeneration(), {
        wrapper: createWrapper()
      });

      expect(result.current.batchProgress).toBe(0);

      await act(async () => {
        const batchResults = await result.current.generateBatch();
        expect(batchResults).toBeDefined();
      });

      expect(result.current.batchResults).toHaveLength(3); // default types: trend, anomaly, correlation
      expect(result.current.batchProgress).toBe(100);
    });

    it('should handle custom insight types in batch', async () => {
      const options = { insightTypes: ['trend', 'seasonal'] };
      const { result } = renderHook(() => useInsightGeneration(options), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateBatch();
      });

      expect(result.current.batchResults).toHaveLength(2);
      expect(BusinessIntelligenceService.generateInsights).toHaveBeenCalledTimes(2);
    });

    it('should track progress during batch generation', async () => {
      const { result } = renderHook(() => useInsightGeneration(), {
        wrapper: createWrapper()
      });

      // Start batch generation
      act(() => {
        result.current.generateBatch();
      });

      // Progress should start at 0
      expect(result.current.batchProgress).toBeGreaterThanOrEqual(0);

      await waitFor(() => {
        expect(result.current.batchProgress).toBe(100);
      });
    });

    it('should reset batch state on new generation', async () => {
      const { result } = renderHook(() => useInsightGeneration(), {
        wrapper: createWrapper()
      });

      // Generate first batch
      await act(async () => {
        await result.current.generateBatch();
      });

      expect(result.current.batchResults).toHaveLength(3);
      expect(result.current.batchProgress).toBe(100);

      // Generate second batch - should reset
      await act(async () => {
        await result.current.generateBatch();
      });

      expect(result.current.batchResults).toHaveLength(3);
      expect(result.current.batchProgress).toBe(100);
    });
  });

  describe('Generation State Management Tests', () => {
    it('should track generation state during single insight generation', async () => {
      let resolveGeneration: (value: any) => void;
      const delayedPromise = new Promise(resolve => {
        resolveGeneration = resolve;
      });

      (BusinessIntelligenceService as any).generateInsights = jest.fn()
        .mockReturnValue(delayedPromise);

      const { result } = renderHook(() => useInsightGeneration(), {
        wrapper: createWrapper()
      });

      // Start generation
      act(() => {
        result.current.generateInsight();
      });

      // Should be generating
      expect(result.current.isGenerating).toBe(true);

      // Complete generation
      act(() => {
        resolveGeneration(mockInsightData);
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    });

    it('should clear generation error on successful retry', async () => {
      // First call fails
      (BusinessIntelligenceService as any).generateInsights = jest.fn()
        .mockRejectedValueOnce(new Error('Generation failed'))
        .mockResolvedValueOnce(mockInsightData);

      const { result } = renderHook(() => useInsightGeneration(), {
        wrapper: createWrapper()
      });

      // First attempt should fail
      await act(async () => {
        try {
          await result.current.generateInsight();
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.generationError).toBeDefined();
      expect(result.current.canRetry).toBe(true);

      // Second attempt should succeed
      await act(async () => {
        await result.current.generateInsight();
      });

      expect(result.current.generationError).toBeNull();
    });
  });

  describe('UI Transform Tests', () => {
    it('should provide insights with confidence and impact indicators', async () => {
      const { result } = renderHook(() => useInsightGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateInsight();
      });

      const insight = result.current.generatedInsight;
      expect(insight.confidence).toBeDefined();
      expect(insight.confidence).toBeGreaterThanOrEqual(0);
      expect(insight.confidence).toBeLessThanOrEqual(1);
      expect(insight.impact).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(insight.impact);
    });

    it('should include actionable flag for UI filtering', async () => {
      const { result } = renderHook(() => useInsightGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateInsight();
      });

      const insight = result.current.generatedInsight;
      expect(insight.actionable).toBeDefined();
      expect(typeof insight.actionable).toBe('boolean');
    });

    it('should provide batch results with proper structure', async () => {
      const { result } = renderHook(() => useInsightGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateBatch();
      });

      result.current.batchResults.forEach(batchItem => {
        expect(batchItem.id).toBeDefined();
        expect(batchItem.insightType).toBeDefined();
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle single insight generation errors', async () => {
      (BusinessIntelligenceService as any).generateInsights = jest.fn()
        .mockRejectedValue(new Error('Insight generation failed'));

      const { result } = renderHook(() => useInsightGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        try {
          await result.current.generateInsight();
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.generationError).toBeDefined();
      expect(result.current.generationError?.message).toBe('Insight generation failed');
      expect(result.current.isGenerating).toBe(false);
    });

    it('should handle empty insights response', async () => {
      (BusinessIntelligenceService as any).generateInsights = jest.fn()
        .mockResolvedValue({ insights: [] });

      const { result } = renderHook(() => useInsightGeneration(), {
        wrapper: createWrapper()
      });

      await expect(result.current.generateInsight()).rejects.toThrow('No insights generated');
    });

    it('should handle batch generation errors', async () => {
      (BusinessIntelligenceService as any).generateInsights = jest.fn()
        .mockRejectedValue(new Error('Batch generation failed'));

      const { result } = renderHook(() => useInsightGeneration(), {
        wrapper: createWrapper()
      });

      await expect(result.current.generateBatch()).rejects.toThrow('Batch generation failed');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'useInsightGeneration.generateBatchMutation',
        errorCode: 'BATCH_INSIGHT_GENERATION_FAILED',
        validationPattern: 'insight_generation_mutation',
        errorMessage: 'Batch generation failed'
      });
    });

    it('should handle missing insights in response', async () => {
      (BusinessIntelligenceService as any).generateInsights = jest.fn()
        .mockResolvedValue({ metadata: { generatedAt: '2025-01-04T12:00:00Z' } });

      const { result } = renderHook(() => useInsightGeneration(), {
        wrapper: createWrapper()
      });

      await expect(result.current.generateInsight()).rejects.toThrow('No insights generated');
    });
  });

  describe('Permission Tests', () => {
    it('should work with executive role permissions', async () => {
      (useUserRole as jest.Mock).mockReturnValue({
        role: 'executive',
        hasPermission: jest.fn().mockResolvedValue(true)
      });

      const { result } = renderHook(() => useInsightGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateInsight();
      });

      expect(result.current.generatedInsight).toBeDefined();
    });

    it('should work with proper permissions for other roles', async () => {
      const hasPermissionMock = jest.fn().mockResolvedValue(true);
      (useUserRole as jest.Mock).mockReturnValue({
        role: 'manager',
        hasPermission: hasPermissionMock
      });

      const { result } = renderHook(() => useInsightGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateInsight();
      });

      expect(result.current.generatedInsight).toBeDefined();
    });
  });

  describe('Query Invalidation Tests', () => {
    it('should invalidate related queries after successful single generation', async () => {
      const wrapper = createWrapper();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      
      const { result } = renderHook(() => useInsightGeneration(), {
        wrapper
      });

      await act(async () => {
        await result.current.generateInsight();
      });

      expect(invalidateQueriesSpy).toHaveBeenCalled();
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        pattern: 'insight_generation_single',
        context: 'useInsightGeneration.generateInsightMutation',
        description: 'Successfully generated general insight'
      });
    });

    it('should invalidate related queries after successful batch generation', async () => {
      const wrapper = createWrapper();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      
      const { result } = renderHook(() => useInsightGeneration(), {
        wrapper
      });

      await act(async () => {
        await result.current.generateBatch();
      });

      expect(invalidateQueriesSpy).toHaveBeenCalled();
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        pattern: 'insight_generation_batch',
        context: 'useInsightGeneration.generateBatchMutation',
        description: 'Successfully generated 3 batch insights'
      });
    });
  });

  describe('Validation Monitoring Tests', () => {
    it('should record successful pattern operations with correct analysis type', async () => {
      const { result } = renderHook(() => useInsightGeneration({ analysisType: 'trend' }), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateInsight();
      });

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        pattern: 'insight_generation_single',
        context: 'useInsightGeneration.generateInsightMutation',
        description: 'Successfully generated trend insight'
      });
    });

    it('should record validation errors with proper context', async () => {
      (BusinessIntelligenceService as any).generateInsights = jest.fn()
        .mockRejectedValue(new Error('Invalid analysis parameters'));

      const { result } = renderHook(() => useInsightGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        try {
          await result.current.generateInsight();
        } catch (error) {
          // Expected error
        }
      });

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'useInsightGeneration.generateInsightMutation',
        errorCode: 'INSIGHT_GENERATION_FAILED',
        validationPattern: 'insight_generation_mutation',
        errorMessage: 'Invalid analysis parameters'
      });
    });
  });
});