// Phase 4.3: Predictive Analytics Hook Tests (RED Phase)
// Following established React Query testing patterns

import React from 'react';
import { createSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../../test/contracts/hook.contracts';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePredictiveAnalytics } from '../usePredictiveAnalytics';
import { useForecastGeneration } from '../useForecastGeneration';
import { useModelValidation } from '../useModelValidation';
import { PredictiveAnalyticsService } from '../../../services/executive/predictiveAnalyticsService';

// Mock the service
jest.mock('../../../services/executive/predictiveAnalyticsService');

// Mock the user role hook
jest.mock('../../../hooks/role-based/useUserRole', () => ({
  useUserRole: jest.fn(() => ({
    role: 'executive',
    hasPermission: jest.fn().mockResolvedValue(true)
  }))
}));

describe('usePredictiveAnalytics Hook - Phase 4.3', () => {
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

  describe('usePredictiveAnalytics', () => {
    it('should generate demand forecasts with confidence intervals', async () => {
      const mockForecast = {
        forecastData: {
          demandPrediction: {
            nextMonth: 1500,
            nextQuarter: 4200,
            nextYear: 18000
          },
          confidenceIntervals: {
            nextMonth: { lower: 1350, upper: 1650, confidence: 0.95 },
            nextQuarter: { lower: 3800, upper: 4600, confidence: 0.95 }
          },
          seasonalFactors: {
            january: 0.8,
            july: 1.3,
            december: 1.5
          }
        },
        modelMetrics: {
          accuracy: 0.89,
          mape: 11.2,
          rmse: 125.5
        },
        generatedAt: '2024-01-15T10:00:00Z'
      };

      (PredictiveAnalyticsService.generateForecast as jest.Mock).mockResolvedValue(mockForecast);

      const { result } = renderHook(
        () => usePredictiveAnalytics({
          forecastType: 'demand',
          includeConfidenceIntervals: true,
          timeHorizon: 'year'
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.forecastData).toEqual(mockForecast);
      expect(result.current.forecastData?.modelMetrics.accuracy).toBeGreaterThan(0.85);
      expect(result.current.forecastData?.forecastData.confidenceIntervals).toBeDefined();
    });

    it('should validate predictive models with historical data', async () => {
      const mockValidation = {
        isValid: true,
        validationMetrics: {
          accuracy: 0.92,
          precision: 0.89,
          recall: 0.91,
          f1Score: 0.90
        },
        backtestResults: {
          periodsTestId: 12,
          successRate: 0.917,
          averageError: 8.3
        }
      };

      (PredictiveAnalyticsService.validateModelAccuracy as jest.Mock).mockResolvedValue(mockValidation);

      const { result } = renderHook(
        () => usePredictiveAnalytics({ modelId: 'model-1' }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.validateModel({
          historicalData: 'last_12_months',
          validationMethod: 'backtesting'
        });
      });

      expect(result.current.modelValidation).toEqual(mockValidation);
      expect(result.current.modelValidation?.isValid).toBe(true);
      expect(result.current.modelValidation?.validationMetrics.f1Score).toBeGreaterThan(0.85);
    });

    it('should support real-time forecast updates', async () => {
      const mockInitialForecast = {
        forecastData: { revenue: 100000 },
        timestamp: '2024-01-15T10:00:00Z'
      };
      const mockUpdatedForecast = {
        forecastData: { revenue: 105000 },
        timestamp: '2024-01-15T10:05:00Z'
      };

      (PredictiveAnalyticsService.generateForecast as jest.Mock)
        .mockResolvedValueOnce(mockInitialForecast)
        .mockResolvedValueOnce(mockUpdatedForecast);

      const { result } = renderHook(
        () => usePredictiveAnalytics({
          realTimeUpdates: true,
          updateInterval: 5000
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.forecastData).toEqual(mockInitialForecast);
      });

      // Simulate real-time update
      act(() => {
        queryClient.invalidateQueries({ queryKey: ['predictiveAnalytics'] });
      });

      await waitFor(() => {
        expect(result.current.forecastData).toEqual(mockUpdatedForecast);
      });

      expect(result.current.lastUpdateTime).toBe('2024-01-15T10:05:00Z');
    });

    it('should calculate confidence intervals for forecasts', async () => {
      const mockConfidenceIntervals = {
        intervals: {
          '95%': { lower: 900, upper: 1100 },
          '90%': { lower: 920, upper: 1080 },
          '80%': { lower: 940, upper: 1060 }
        },
        mostLikely: 1000,
        standardDeviation: 50
      };

      (PredictiveAnalyticsService.calculateConfidenceIntervals as jest.Mock).mockResolvedValue(mockConfidenceIntervals);

      const { result } = renderHook(
        () => usePredictiveAnalytics({ forecastId: 'forecast-1' }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.calculateConfidence({
          confidenceLevels: [0.95, 0.90, 0.80]
        });
      });

      expect(result.current.confidenceIntervals).toEqual(mockConfidenceIntervals);
      expect(result.current.confidenceIntervals?.intervals['95%'].lower).toBeLessThan(1000);
    });
  });

  describe('useForecastGeneration', () => {
    it('should generate multi-scenario forecasts', async () => {
      const mockScenarios = {
        bestCase: {
          forecast: 150000,
          probability: 0.25,
          assumptions: ['high_demand', 'favorable_market']
        },
        mostLikely: {
          forecast: 120000,
          probability: 0.50,
          assumptions: ['normal_demand', 'stable_market']
        },
        worstCase: {
          forecast: 90000,
          probability: 0.25,
          assumptions: ['low_demand', 'challenging_market']
        }
      };

      (PredictiveAnalyticsService.generateForecast as jest.Mock).mockResolvedValue({
        scenarios: mockScenarios
      });

      const { result } = renderHook(
        () => useForecastGeneration({
          scenarioAnalysis: true,
          forecastType: 'revenue'
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.generateScenarios();
      });

      expect(result.current.scenarios).toEqual(mockScenarios);
      expect(result.current.scenarios?.mostLikely.probability).toBe(0.50);
    });

    it('should integrate external factors into forecasts', async () => {
      const mockEnhancedForecast = {
        baseForecast: 100000,
        adjustedForecast: 112000,
        externalFactors: {
          seasonality: { impact: 1.08, confidence: 0.9 },
          marketTrends: { impact: 1.05, confidence: 0.85 },
          competitorActivity: { impact: 0.98, confidence: 0.7 }
        },
        totalImpact: 1.12
      };

      (PredictiveAnalyticsService.generateForecast as jest.Mock).mockResolvedValue(mockEnhancedForecast);

      const { result } = renderHook(
        () => useForecastGeneration({
          includeExternalFactors: true
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.generateWithFactors([
          'seasonality',
          'marketTrends',
          'competitorActivity'
        ]);
      });

      expect(result.current.enhancedForecast).toEqual(mockEnhancedForecast);
      expect(result.current.enhancedForecast?.totalImpact).toBeGreaterThan(1);
    });

    it('should handle forecast generation failures gracefully', async () => {
      const mockError = new Error('Insufficient historical data for forecast');
      (PredictiveAnalyticsService.generateForecast as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(
        () => useForecastGeneration({}),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await expect(result.current.generateForecast()).rejects.toThrow('Insufficient historical data');
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.fallbackData).toBeDefined();
    });
  });

  describe('useModelValidation', () => {
    it('should perform continuous model monitoring', async () => {
      const mockMonitoringData = {
        modelHealth: 'healthy',
        driftDetected: false,
        performanceMetrics: {
          currentAccuracy: 0.88,
          baselineAccuracy: 0.90,
          degradation: -0.02
        },
        lastChecked: '2024-01-15T10:00:00Z',
        nextCheck: '2024-01-15T11:00:00Z'
      };

      (PredictiveAnalyticsService.monitorModelPerformance as jest.Mock).mockResolvedValue(mockMonitoringData);

      const { result } = renderHook(
        () => useModelValidation({
          modelId: 'model-1',
          continuousMonitoring: true
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.monitoringData).toEqual(mockMonitoringData);
      });

      expect(result.current.monitoringData?.modelHealth).toBe('healthy');
      expect(result.current.monitoringData?.driftDetected).toBe(false);
    });

    it('should trigger model retraining when accuracy degrades', async () => {
      const mockDegradedModel = {
        modelHealth: 'degraded',
        performanceMetrics: {
          currentAccuracy: 0.75,
          baselineAccuracy: 0.90,
          degradation: -0.15
        },
        retrainingRecommended: true
      };

      (PredictiveAnalyticsService.monitorModelPerformance as jest.Mock).mockResolvedValue(mockDegradedModel);

      const { result } = renderHook(
        () => useModelValidation({
          modelId: 'model-1',
          autoRetrain: true,
          accuracyThreshold: 0.80
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.retrainingTriggered).toBe(true);
      });

      expect(result.current.monitoringData?.retrainingRecommended).toBe(true);
    });

    it('should compare multiple model versions', async () => {
      const mockComparison = {
        models: [
          { id: 'v1', accuracy: 0.85, createdAt: '2024-01-01' },
          { id: 'v2', accuracy: 0.88, createdAt: '2024-01-08' },
          { id: 'v3', accuracy: 0.91, createdAt: '2024-01-15' }
        ],
        bestModel: 'v3',
        improvement: 0.06
      };

      (PredictiveAnalyticsService.compareModels as jest.Mock).mockResolvedValue(mockComparison);

      const { result } = renderHook(
        () => useModelValidation({ compareVersions: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.modelComparison).toEqual(mockComparison);
      });

      expect(result.current.modelComparison?.bestModel).toBe('v3');
      expect(result.current.modelComparison?.improvement).toBeGreaterThan(0);
    });
  });

  describe('Query Key Factory Integration', () => {
    it('should use centralized query key factory for analytics', async () => {
      const { result } = renderHook(
        () => usePredictiveAnalytics({ forecastType: 'demand' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.queryKey).toEqual(['executive', 'predictiveAnalytics', 'demand']);
      });
    });
  });
});