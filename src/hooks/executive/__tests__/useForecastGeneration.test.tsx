// Enhanced Forecast Generation Hook Tests
// Testing scenario generation, external factors, and error handling

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useForecastGeneration } from '../useForecastGeneration';
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
    predictiveAnalytics: jest.fn((role) => ['executive', 'predictiveAnalytics', role]),
    businessInsights: jest.fn((role) => ['executive', 'businessInsights', role]),
    metricTrends: jest.fn((role) => ['executive', 'metricTrends', role])
  }
}));

// Import the mock after it's been set up
import { useUserRole } from '../../role-based/useUserRole';

describe('useForecastGeneration Enhanced Tests', () => {
  let queryClient: QueryClient;

  const mockForecastData = {
    forecast: 125000,
    confidence: 0.85,
    period: '90d',
    factors: ['seasonality', 'market_trends'],
    metadata: {
      modelType: 'arima',
      trainingData: '12m'
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
    (PredictiveAnalyticsService as any).generateForecast = jest.fn().mockResolvedValue(mockForecastData);
    (ValidationMonitor as any).recordPatternSuccess = jest.fn();
    (ValidationMonitor as any).recordValidationError = jest.fn();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('Core Functionality Tests', () => {
    it('should generate basic forecast successfully', async () => {
      const { result } = renderHook(() => useForecastGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        const forecast = await result.current.generateForecast();
        expect(forecast).toBeDefined();
      });

      expect(PredictiveAnalyticsService.generateForecast).toHaveBeenCalledWith({
        forecast_type: 'demand'
      });
    });

    it('should handle forecast type options', async () => {
      const options = { forecastType: 'revenue' };
      const { result } = renderHook(() => useForecastGeneration(options), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateForecast();
      });

      expect(PredictiveAnalyticsService.generateForecast).toHaveBeenCalledWith({
        forecast_type: 'revenue'
      });
    });

    it('should handle external factors integration', async () => {
      const { result } = renderHook(() => useForecastGeneration(), {
        wrapper: createWrapper()
      });

      const factors = ['seasonality', 'market_trends', 'competitor_activity'];

      await act(async () => {
        const enhancedForecast = await result.current.generateWithFactors(factors);
        expect(enhancedForecast).toBeDefined();
      });

      expect(result.current.enhancedForecast).toBeDefined();
      expect(result.current.enhancedForecast.externalFactors).toBeDefined();
    });
  });

  describe('Scenario Generation Tests', () => {
    it('should generate scenario analysis successfully', async () => {
      const options = { scenarioAnalysis: true, forecastType: 'revenue' };
      const { result } = renderHook(() => useForecastGeneration(options), {
        wrapper: createWrapper()
      });

      await act(async () => {
        const scenarios = await result.current.generateScenarios();
        expect(scenarios).toBeDefined();
      });

      expect(result.current.scenarios).toBeDefined();
      expect(result.current.scenarios.bestCase).toBeDefined();
      expect(result.current.scenarios.mostLikely).toBeDefined();
      expect(result.current.scenarios.worstCase).toBeDefined();

      expect(PredictiveAnalyticsService.generateForecast).toHaveBeenCalledWith({
        forecast_type: 'revenue',
        scenario_analysis: true
      });
    });

    it('should provide probability values for scenarios', async () => {
      const { result } = renderHook(() => useForecastGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateScenarios();
      });

      const scenarios = result.current.scenarios;
      expect(scenarios.bestCase.probability).toBe(0.25);
      expect(scenarios.mostLikely.probability).toBe(0.50);
      expect(scenarios.worstCase.probability).toBe(0.25);
    });

    it('should include assumptions for each scenario', async () => {
      const { result } = renderHook(() => useForecastGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateScenarios();
      });

      const scenarios = result.current.scenarios;
      expect(scenarios.bestCase.assumptions).toEqual(['high_demand', 'favorable_market']);
      expect(scenarios.mostLikely.assumptions).toEqual(['normal_demand', 'stable_market']);
      expect(scenarios.worstCase.assumptions).toEqual(['low_demand', 'challenging_market']);
    });
  });

  describe('External Factors Tests', () => {
    it('should calculate impact of external factors', async () => {
      const { result } = renderHook(() => useForecastGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateWithFactors(['seasonality']);
      });

      const enhanced = result.current.enhancedForecast;
      expect(enhanced.baseForecast).toBeDefined();
      expect(enhanced.adjustedForecast).toBeDefined();
      expect(enhanced.totalImpact).toBeDefined();
      expect(enhanced.externalFactors).toBeDefined();
    });

    it('should provide confidence scores for factor impacts', async () => {
      const { result } = renderHook(() => useForecastGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateWithFactors(['seasonality', 'market_trends']);
      });

      const factors = result.current.enhancedForecast.externalFactors;
      expect(factors.seasonality.confidence).toBeGreaterThanOrEqual(0);
      expect(factors.seasonality.confidence).toBeLessThanOrEqual(1);
      expect(factors.marketTrends.confidence).toBeGreaterThanOrEqual(0);
      expect(factors.marketTrends.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle factor impact calculation', async () => {
      const { result } = renderHook(() => useForecastGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateWithFactors(['seasonality']);
      });

      const enhanced = result.current.enhancedForecast;
      expect(enhanced.totalImpact).toBe(1.12);
      expect(enhanced.adjustedForecast).toBeGreaterThan(enhanced.baseForecast);
    });
  });

  describe('UI Transform Tests', () => {
    it('should provide scenario data in UI-ready format', async () => {
      const { result } = renderHook(() => useForecastGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateScenarios();
      });

      const scenarios = result.current.scenarios;
      Object.keys(scenarios).forEach(scenarioType => {
        const scenario = scenarios[scenarioType];
        expect(scenario.forecast).toBeDefined();
        expect(scenario.probability).toBeDefined();
        expect(scenario.assumptions).toBeDefined();
        expect(Array.isArray(scenario.assumptions)).toBe(true);
      });
    });

    it('should provide enhanced forecast with factor breakdown', async () => {
      const { result } = renderHook(() => useForecastGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateWithFactors(['seasonality']);
      });

      const enhanced = result.current.enhancedForecast;
      expect(enhanced.baseForecast).toBeDefined();
      expect(enhanced.adjustedForecast).toBeDefined();
      expect(enhanced.externalFactors).toBeDefined();
      
      Object.values(enhanced.externalFactors).forEach((factor: any) => {
        expect(factor.impact).toBeDefined();
        expect(factor.confidence).toBeDefined();
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle forecast generation errors gracefully', async () => {
      (PredictiveAnalyticsService as any).generateForecast = jest.fn()
        .mockRejectedValue(new Error('Forecast service unavailable'));

      const { result } = renderHook(() => useForecastGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        try {
          await result.current.generateForecast();
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('Forecast service unavailable');
    });

    it('should provide fallback data on error', async () => {
      (PredictiveAnalyticsService as any).generateForecast = jest.fn()
        .mockRejectedValue(new Error('Service error'));

      const { result } = renderHook(() => useForecastGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        try {
          await result.current.generateForecast();
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.fallbackData).toBeDefined();
      expect(result.current.fallbackData.forecast).toBe(100000);
      expect(result.current.fallbackData.confidence).toBe(0.7);
      expect(result.current.fallbackData.isFallback).toBe(true);
    });

    it('should handle scenario generation errors', async () => {
      (PredictiveAnalyticsService as any).generateForecast = jest.fn()
        .mockRejectedValue(new Error('Scenario generation failed'));

      const { result } = renderHook(() => useForecastGeneration(), {
        wrapper: createWrapper()
      });

      await expect(result.current.generateScenarios()).rejects.toThrow('Scenario generation failed');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'useForecastGeneration.generateScenariosMutation',
        errorCode: 'FORECAST_SCENARIOS_GENERATION_FAILED',
        validationPattern: 'forecast_generation_mutation',
        errorMessage: 'Scenario generation failed'
      });
    });
  });

  describe('Query Invalidation Tests', () => {
    it('should invalidate related queries after successful generation', async () => {
      const wrapper = createWrapper();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      
      const { result } = renderHook(() => useForecastGeneration(), {
        wrapper
      });

      await act(async () => {
        await result.current.generateScenarios();
      });

      expect(invalidateQueriesSpy).toHaveBeenCalled();
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        pattern: 'forecast_generation_scenarios',
        context: 'useForecastGeneration.generateScenariosMutation',
        description: 'Successfully generated revenue scenarios'
      });
    });

    it('should provide smart invalidation helper', async () => {
      const wrapper = createWrapper();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      
      const { result } = renderHook(() => useForecastGeneration(), {
        wrapper
      });

      await act(async () => {
        await result.current.invalidateForecastData();
      });

      // Should invalidate multiple related queries
      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Recovery Tests', () => {
    it('should provide enhanced fallback with error recovery suggestions', async () => {
      (PredictiveAnalyticsService as any).generateForecast = jest.fn()
        .mockRejectedValue(new Error('Validation error'));

      const { result } = renderHook(() => useForecastGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        try {
          await result.current.generateForecast();
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.fallbackData.canRetry).toBe(false); // validation errors can't retry
      expect(result.current.fallbackData.errorRecovery).toBeDefined();
      expect(result.current.fallbackData.errorRecovery.suggestedAction).toBeDefined();
      expect(result.current.fallbackData.errorRecovery.alternativeData).toBeDefined();
    });

    it('should allow retry for non-validation errors', async () => {
      (PredictiveAnalyticsService as any).generateForecast = jest.fn()
        .mockRejectedValue(new Error('Network timeout'));

      const { result } = renderHook(() => useForecastGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        try {
          await result.current.generateForecast();
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.fallbackData.canRetry).toBe(true);
    });
  });

  describe('Validation Monitoring Tests', () => {
    it('should record successful pattern operations', async () => {
      const { result } = renderHook(() => useForecastGeneration({ forecastType: 'sales' }), {
        wrapper: createWrapper()
      });

      await act(async () => {
        await result.current.generateScenarios();
      });

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        pattern: 'forecast_generation_scenarios',
        context: 'useForecastGeneration.generateScenariosMutation',
        description: 'Successfully generated sales scenarios'
      });
    });

    it('should record validation errors with proper context', async () => {
      (PredictiveAnalyticsService as any).generateForecast = jest.fn()
        .mockRejectedValue(new Error('Invalid forecast parameters'));

      const { result } = renderHook(() => useForecastGeneration(), {
        wrapper: createWrapper()
      });

      await act(async () => {
        try {
          await result.current.generateForecast();
        } catch (error) {
          // Expected error
        }
      });

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'useForecastGeneration.generateForecastMutation',
        errorCode: 'FORECAST_GENERATION_FAILED',
        validationPattern: 'forecast_generation_mutation',
        errorMessage: 'Invalid forecast parameters'
      });
    });
  });
});