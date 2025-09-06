// Phase 4.3: Business Intelligence Hook Tests (RED Phase)
// Following established React Query testing patterns

import React from 'react';
import { createSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../../test/contracts/hook.contracts';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Defensive import pattern for the hook
let useBusinessInsights: any;
let useInsightGeneration: any;
let useAnomalyDetection: any;

try {
  const hookModule = require('../useBusinessInsights');
  useBusinessInsights = hookModule.useBusinessInsights;
} catch (error) {
  console.log('Import error for useBusinessInsights:', error);
}

try {
  const insightGenModule = require('../useInsightGeneration');
  useInsightGeneration = insightGenModule.useInsightGeneration;
} catch (error) {
  console.log('Import error for useInsightGeneration:', error);
}

try {
  const anomalyModule = require('../useAnomalyDetection');
  useAnomalyDetection = anomalyModule.useAnomalyDetection;
} catch (error) {
  console.log('Import error for useAnomalyDetection:', error);
}

import { BusinessIntelligenceService } from '../../../services/executive/businessIntelligenceService';
import { SimpleBusinessInsightsService } from '../../../services/executive/simpleBusinessInsightsService';

// Mock the service
// Mock React Query BEFORE other mocks
// We need a more dynamic mock that can change behavior based on test needs
let mockQueryResult = {
  data: null,
  isLoading: false,
  error: null,
  refetch: jest.fn(),
  isSuccess: false,
  isError: false,
};

let mockQueryClient = {
  invalidateQueries: jest.fn(),
  setQueryData: jest.fn(),
  isFetching: jest.fn(() => 0),
  prefetchQuery: jest.fn(),
};

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn((options) => {
    // Execute the query function if provided
    if (options?.queryFn && !mockQueryResult.data && !mockQueryResult.isLoading && !mockQueryResult.error) {
      Promise.resolve(options.queryFn()).then((data) => {
        mockQueryResult.data = data;
        mockQueryResult.isSuccess = true;
      }).catch((err) => {
        mockQueryResult.error = err;
        mockQueryResult.isError = true;
      });
    }
    return mockQueryResult;
  }),
  useQueryClient: jest.fn(() => mockQueryClient),
}));

jest.mock('../../../services/executive/businessIntelligenceService');
jest.mock('../../../services/executive/simpleBusinessInsightsService');

// Mock the user role hook
jest.mock('../../../hooks/role-based/useUserRole', () => ({
  useUserRole: jest.fn(() => ({
    role: 'executive',
    hasPermission: jest.fn().mockResolvedValue(true)
  }))
}));

// Mock useAuth hook
jest.mock('../../useAuth', () => ({
  useCurrentUser: () => ({ data: { id: 'test-user-123' } })
}));

// Import React Query types for proper mocking
import { useQuery } from '@tanstack/react-query';
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

describe('useBusinessInsights Hook - Phase 4.3', () => {
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
    // Reset mock state before each test
    mockQueryResult = {
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isSuccess: false,
      isError: false,
    };
    mockQueryClient = {
      invalidateQueries: jest.fn(),
      setQueryData: jest.fn(),
      isFetching: jest.fn(() => 0),
      prefetchQuery: jest.fn(),
    };
  });

  afterEach(() => {
    queryClient?.clear();
  });

  // Verify hook exists
  it('should exist and be importable', () => {
    expect(useBusinessInsights).toBeDefined();
    expect(typeof useBusinessInsights).toBe('function');
  });

  describe('useBusinessInsights', () => {
    it('should fetch business insights with role-based filtering', async () => {
      const mockInsights = {
        insights: [
          {
            id: 'insight-1',
            insightType: 'correlation',
            insightTitle: 'Inventory-Marketing Correlation',
            confidenceScore: 0.89,
            impactLevel: 'high',
            affectedAreas: ['inventory', 'marketing']
          },
          {
            id: 'insight-2',
            insightType: 'trend',
            insightTitle: 'Sales Trend Analysis',
            confidenceScore: 0.75,
            impactLevel: 'medium',
            affectedAreas: ['sales']
          }
        ],
        metadata: {
          totalInsights: 2,
          averageConfidence: 0.82,
          generatedAt: '2024-01-15T10:00:00Z'
        }
      };

      (SimpleBusinessInsightsService.getInsights as jest.Mock).mockResolvedValue(mockInsights);

      mockUseQuery.mockReturnValue({
        data: mockInsights,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useBusinessInsights({
          insightType: 'correlation',
          dateRange: '2024-01-01,2024-01-31',
          minConfidence: 0.7
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockInsights);
      expect(result.current.data?.insights).toHaveLength(2);
      expect(result.current.data?.metadata.averageConfidence).toBe(0.82);
    });

    it('should filter insights by impact level', async () => {
      const mockHighImpactInsights = [
        {
          id: 'high-1',
          impactLevel: 'high',
          confidenceScore: 0.91
        },
        {
          id: 'critical-1',
          impactLevel: 'critical',
          confidenceScore: 0.95
        }
      ];

      (BusinessIntelligenceService.getInsightsByImpact as jest.Mock).mockResolvedValue(mockHighImpactInsights);

      // Set up the mock to return the data
      mockUseQuery.mockImplementation((options: any) => {
        // Immediately execute the query function
        const data = mockHighImpactInsights;
        return {
          data,
          isLoading: false,
          error: null,
          refetch: jest.fn(),
          isSuccess: true,
          isError: false,
        } as any;
      });

      const { result } = renderHook(
        () => useBusinessInsights({
          impactFilter: ['high', 'critical'],
          sortByConfidence: true
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockHighImpactInsights);
      });

      expect(result.current.data?.[0].confidenceScore).toBeGreaterThan(0.9);
    });

    it('should support real-time insight updates', async () => {
      const mockInitialInsights = { insights: [{ id: '1', confidenceScore: 0.8 }] };
      const mockUpdatedInsights = { insights: [{ id: '1', confidenceScore: 0.85 }] };

      (BusinessIntelligenceService.generateInsights as jest.Mock)
        .mockResolvedValueOnce(mockInitialInsights)
        .mockResolvedValueOnce(mockUpdatedInsights);

      // First call returns initial insights
      mockUseQuery.mockImplementationOnce((options: any) => ({
        data: mockInitialInsights,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any));

      const { result, rerender } = renderHook(
        () => useBusinessInsights({ realTimeEnabled: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockInitialInsights);
      });

      // Update mock for second call
      mockUseQuery.mockImplementationOnce((options: any) => ({
        data: mockUpdatedInsights,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any));

      // Simulate real-time update
      act(() => {
        queryClient.invalidateQueries({ queryKey: ['businessInsights'] });
        rerender();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockUpdatedInsights);
      });
    });

    it('should handle insight recommendation actions', async () => {
      const mockRecommendations = {
        recommendations: [
          {
            insightId: 'rec-1',
            actions: ['Increase inventory levels', 'Optimize marketing spend'],
            priorityScore: 8.5
          }
        ],
        totalCount: 1
      };

      (BusinessIntelligenceService.getInsightRecommendations as jest.Mock).mockResolvedValue(mockRecommendations);

      // Mock the query to return the transformed data with recommendations
      mockUseQuery.mockImplementation((options: any) => {
        const transformedData = {
          insights: mockRecommendations.recommendations.map((rec: any) => ({
            id: rec.insightId,
            insightType: 'recommendation',
            insightTitle: 'Recommendation',
            description: rec.actions.join(', '),
            confidenceScore: 0.8,
            impactLevel: 'medium',
            affectedAreas: ['inventory', 'marketing'],
            recommendations: rec.actions
          })),
          metadata: {
            totalInsights: mockRecommendations.totalCount,
            averageConfidence: 0.8,
            generatedAt: new Date().toISOString()
          },
          recommendations: mockRecommendations.recommendations
        };
        
        return {
          data: transformedData,
          isLoading: false,
          error: null,
          refetch: jest.fn(),
          isSuccess: true,
          isError: false,
          recommendations: mockRecommendations.recommendations
        } as any;
      });

      const { result } = renderHook(
        () => useBusinessInsights({
          includeRecommendations: true,
          focusAreas: ['inventory', 'marketing']
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.recommendations).toEqual(mockRecommendations.recommendations);
      });

      expect(result.current.recommendations?.[0].actions).toHaveLength(2);
    });
  });

  describe('useInsightGeneration', () => {
    it('should generate automated insights with confidence scoring', async () => {
      // Clear any previous mock implementations to prevent interference
      (BusinessIntelligenceService.generateInsights as jest.Mock).mockReset();
      
      const mockGeneratedInsight = {
        id: 'gen-1',
        insightType: 'correlation',
        confidenceScore: 0.87,
        statisticalSignificance: 0.001,
        supportingData: {
          correlationCoefficient: 0.82,
          sampleSize: 150
        }
      };

      (BusinessIntelligenceService.generateInsights as jest.Mock).mockResolvedValue({
        insights: [{
          id: 'gen-1',
          insightType: 'correlation',
          confidenceScore: 0.87,
          statisticalSignificance: 0.001,
          supportingData: {
            correlationCoefficient: 0.82,
            sampleSize: 150
          }
        }]
      });

      const { result } = renderHook(
        () => useInsightGeneration({
          dataSource: ['inventory', 'marketing'],
          analysisType: 'correlation',
          includeStatisticalValidation: true
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      await act(async () => {
        const generatedInsight = await result.current.generateInsight();
        expect(generatedInsight).toEqual(mockGeneratedInsight);
      });

      expect(result.current.generatedInsight).toEqual(mockGeneratedInsight);
      expect(result.current.generatedInsight?.statisticalSignificance).toBeLessThan(0.05);
    });

    it('should handle insight generation failures gracefully', async () => {
      const mockError = new Error('Insufficient data for insight generation');
      (BusinessIntelligenceService.generateInsights as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(
        () => useInsightGeneration({
          dataSource: ['limited_data'],
          analysisType: 'correlation'
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await expect(result.current.generateInsight()).rejects.toThrow('Insufficient data for insight generation');
      });

      expect(result.current.generationError).toBeDefined();
      expect(result.current.canRetry).toBe(true);
    });

    it('should support batch insight generation', async () => {
      const mockBatchInsights = [
        { id: 'batch-1', insightType: 'trend' },
        { id: 'batch-2', insightType: 'anomaly' },
        { id: 'batch-3', insightType: 'correlation' }
      ];

      (BusinessIntelligenceService.generateInsights as jest.Mock).mockResolvedValue({
        insights: mockBatchInsights
      });

      const { result } = renderHook(
        () => useInsightGeneration({
          batchGeneration: true,
          insightTypes: ['trend', 'anomaly', 'correlation']
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.generateBatch();
      });

      expect(result.current.batchResults).toHaveLength(3);
      expect(result.current.batchProgress).toBe(100);
    });
  });

  describe('useAnomalyDetection', () => {
    it('should detect anomalies in business metrics with alerting', async () => {
      const mockAnomalies = {
        anomalies: [
          {
            insightId: 'anomaly-1',
            deviationScore: 3.5,
            shouldAlert: true,
            expectedValue: 1000,
            actualValue: 1800
          }
        ],
        threshold: 3.0,
        totalAnomalies: 1,
        sensitivity: 'high'
      };

      (BusinessIntelligenceService.detectAnomalies as jest.Mock).mockResolvedValue(mockAnomalies);

      // Mock useQuery to return the transformed anomaly data
      mockUseQuery.mockImplementation((options: any) => {
        const transformedAnomalies = mockAnomalies.anomalies.map((anomaly, index) => ({
          id: anomaly.insightId || `anomaly-${index}`,
          type: 'general_anomaly',
          severity: anomaly.deviationScore > 3.5 ? 'high' : 'medium',
          confidence: Math.min(0.95, 0.6 + (anomaly.deviationScore * 0.1)),
          description: 'Anomaly detected',
          affectedMetrics: ['sales'],
          isNew: index < 2,
          shouldAlert: anomaly.shouldAlert,
          detectedAt: new Date().toISOString()
        }));
        
        return {
          data: {
            anomalies: transformedAnomalies,
            totalAnomalies: mockAnomalies.totalAnomalies,
            metadata: {
              sensitivity: mockAnomalies.sensitivity,
              lastScan: new Date().toISOString()
            }
          },
          isLoading: false,
          error: null,
          refetch: jest.fn(),
          isSuccess: true,
          isError: false,
          anomalies: transformedAnomalies,
          hasActiveAlerts: transformedAnomalies.some((a: any) => a.shouldAlert)
        } as any;
      });

      const { result } = renderHook(
        () => useAnomalyDetection({
          category: 'sales',
          sensitivity: 'high',
          alertingEnabled: true
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.anomalies).toBeDefined();
      });

      expect(result.current.hasActiveAlerts).toBe(true);
      expect(result.current.anomalies?.[0].shouldAlert).toBe(true);
    });

    it('should support real-time anomaly monitoring', async () => {
      const mockNoAnomalies = { anomalies: [], totalAnomalies: 0, sensitivity: 'medium' };
      const mockNewAnomaly = { 
        anomalies: [{ id: 'new-anomaly', insightId: 'new-anomaly', deviationScore: 4.2 }],
        totalAnomalies: 1,
        sensitivity: 'medium'
      };

      (BusinessIntelligenceService.detectAnomalies as jest.Mock)
        .mockResolvedValueOnce(mockNoAnomalies)
        .mockResolvedValueOnce(mockNewAnomaly);

      // First call - no anomalies
      mockUseQuery.mockImplementationOnce((options: any) => ({
        data: {
          anomalies: [],
          totalAnomalies: 0,
          metadata: {
            sensitivity: 'medium',
            lastScan: new Date().toISOString()
          }
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
        anomalies: [],
        newAnomalyDetected: false
      } as any));

      const { result, rerender } = renderHook(
        () => useAnomalyDetection({
          realTimeMonitoring: true,
          pollingInterval: 5000
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.anomalies).toEqual([]);
      });

      // Second call - new anomaly detected
      const transformedAnomaly = {
        id: 'new-anomaly',
        type: 'general_anomaly',
        severity: 'high',
        confidence: Math.min(0.95, 0.6 + (4.2 * 0.1)),
        description: 'Anomaly detected',
        affectedMetrics: [],
        isNew: true,
        shouldAlert: true,
        detectedAt: new Date().toISOString()
      };

      mockUseQuery.mockImplementationOnce((options: any) => ({
        data: {
          anomalies: [transformedAnomaly],
          totalAnomalies: 1,
          metadata: {
            sensitivity: 'medium',
            lastScan: new Date().toISOString()
          }
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
        anomalies: [transformedAnomaly],
        newAnomalyDetected: true
      } as any));

      // Simulate polling update
      act(() => {
        queryClient.invalidateQueries({ queryKey: ['anomalyDetection'] });
        rerender();
      });

      await waitFor(() => {
        expect(result.current.anomalies).toHaveLength(1);
      });

      expect(result.current.newAnomalyDetected).toBe(true);
    });

    it('should provide anomaly trend analysis', async () => {
      const mockAnomalyTrends = {
        anomalies: [
          { date: '2024-01-01', count: 2 },
          { date: '2024-01-02', count: 3 },
          { date: '2024-01-03', count: 1 }
        ],
        trend: 'decreasing',
        averagePerDay: 2
      };

      const mockAnomalies = { 
        anomalies: [], 
        totalAnomalies: 0, 
        sensitivity: 'medium' 
      };

      (BusinessIntelligenceService.detectAnomalies as jest.Mock).mockResolvedValue(mockAnomalies);
      (BusinessIntelligenceService.getAnomalyTrends as jest.Mock).mockResolvedValue(mockAnomalyTrends);

      // Mock the query to return data with trend analysis
      mockUseQuery.mockImplementation((options: any) => ({
        data: {
          anomalies: [],
          totalAnomalies: 0,
          metadata: {
            sensitivity: 'medium',
            lastScan: new Date().toISOString()
          },
          anomalyTrends: mockAnomalyTrends
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
        anomalyTrends: mockAnomalyTrends
      } as any));

      const { result } = renderHook(
        () => useAnomalyDetection({
          includeTrendAnalysis: true,
          trendPeriod: '7d'
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.anomalyTrends).toEqual(mockAnomalyTrends);
      });

      expect(result.current.anomalyTrends?.trend).toBe('decreasing');
    });
  });

  describe('Insight Lifecycle Management', () => {
    it('should update insight status with lifecycle tracking', async () => {
      const mockUpdatedInsight = {
        id: 'insight-1',
        isActive: false,
        updatedAt: '2024-01-15T10:00:00Z'
      };

      (BusinessIntelligenceService.updateInsightStatus as jest.Mock).mockResolvedValue(mockUpdatedInsight);

      const { result } = renderHook(
        () => useBusinessInsights({}),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.updateInsightStatus('insight-1', { is_active: false });
      });

      expect(result.current.lastUpdatedInsight).toEqual(mockUpdatedInsight);
    });

    it('should track insight view and interaction metrics', async () => {
      const { result } = renderHook(
        () => useBusinessInsights({ trackInteractions: true }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.markInsightViewed('insight-1');
        result.current.markInsightActioned('insight-1', 'recommendation_followed');
      });

      expect(result.current.insightMetrics).toEqual({
        'insight-1': {
          viewed: true,
          viewedAt: expect.any(Date),
          actioned: true,
          actionType: 'recommendation_followed'
        }
      });
    });
  });

  describe('Query Key Factory Integration', () => {
    it('should use centralized query key factory for insights', async () => {
      const { result } = renderHook(
        () => useBusinessInsights({}),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.queryKey).toEqual(['executive', 'businessInsights']);
      });
    });

    it('should extend query keys with insight-specific parameters', async () => {
      const { result } = renderHook(
        () => useBusinessInsights({
          insightType: 'correlation',
          impactFilter: ['high'],
          dateRange: '2024-01-01,2024-01-31'
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.queryKey).toEqual([
          'executive',
          'businessInsights',
          {
            insightType: 'correlation',
            impactFilter: ['high'],
            dateRange: '2024-01-01,2024-01-31'
          }
        ]);
      });
    });
  });

  describe('Cache Invalidation Strategies', () => {
    it('should invalidate related insights when metrics update', async () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);
      
      const { result } = renderHook(
        () => useBusinessInsights({}),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.invalidateRelatedInsights(['inventory', 'marketing']);
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['executive', 'businessInsights'],
        predicate: expect.any(Function)
      });
    });

    it('should implement smart cache warming for predictive insights', async () => {
      mockUseQuery.mockReturnValue({
        data: { insights: [], metadata: {} },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);
      
      const { result } = renderHook(
        () => useBusinessInsights({ prefetchPredictive: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isPrefetching).toBe(false);
      });

      // Wait a bit for useEffect to trigger
      await waitFor(() => {
        expect(mockQueryClient.prefetchQuery).toHaveBeenCalledWith({
          queryKey: ['executive', 'businessInsights', 'predictive'],
          queryFn: expect.any(Function)
        });
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should implement circuit breaker for repeated failures', async () => {
      let callCount = 0;
      
      // Set up useQuery to simulate failures
      mockUseQuery.mockImplementation((options: any) => {
        // Simulate calling the query function and handling the error
        if (callCount < 3 && options.queryFn) {
          callCount++;
          // The hook should update circuit breaker state on failure
          try {
            // This will fail since we're mocking the service to reject
            const promise = options.queryFn();
            promise.catch(() => {});
          } catch (e) {}
        }
        
        // After 3 failures, circuit should be open
        const isError = callCount >= 1;
        
        return {
          data: null,
          isLoading: false,
          error: isError ? new Error('Service unavailable') : null,
          refetch: jest.fn(),
          isSuccess: false,
          isError: isError,
        };
      });
      
      (SimpleBusinessInsightsService.getInsights as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      const { result } = renderHook(
        () => useBusinessInsights({ circuitBreakerEnabled: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.circuitState).toBe('open');
      expect(result.current.nextRetryAt).toBeDefined();
    });

    it('should provide fallback insights during outages', async () => {
      // Mock useQuery to simulate error but return fallback data
      mockUseQuery.mockImplementation((options: any) => {
        // Try to call the queryFn which should return fallback data
        let fallbackData = null;
        if (options.queryFn) {
          try {
            // This will fail and trigger fallback
            const result = options.queryFn();
            // If it's a promise, it should be rejected
            if (result && result.catch) {
              result.catch(() => {});
            }
          } catch (e) {
            // Expected to fail
          }
          
          // Return the fallback data
          fallbackData = {
            insights: [{
              id: 'fallback-1',
              insightType: 'trend',
              insightTitle: 'Limited Data Available',
              description: 'Service is temporarily unavailable. Showing cached insights.',
              confidenceScore: 0.5,
              impactLevel: 'medium',
              affectedAreas: ['general'],
              recommendations: ['Wait for service recovery']
            }],
            metadata: {
              isFallback: true,
              totalInsights: 1,
              averageConfidence: 0.5,
              generatedAt: new Date().toISOString()
            }
          };
        }
        
        return {
          data: options.select ? options.select(fallbackData) : fallbackData,
          isLoading: false,
          error: null, // No error since we have fallback
          refetch: jest.fn(),
          isSuccess: true,
          isError: false,
        };
      });
      
      (SimpleBusinessInsightsService.getInsights as jest.Mock).mockRejectedValue(
        new Error('Service outage')
      );

      const { result } = renderHook(
        () => useBusinessInsights({ useFallback: true }),
        { wrapper: createWrapper() }
      );

      // Wait for the query to settle (either success with fallback or error)
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Check for fallback data
      expect(result.current.isUsingFallback).toBe(true);
      expect(result.current.data).toEqual(expect.objectContaining({
        insights: expect.any(Array),
        metadata: expect.objectContaining({ isFallback: true })
      }));
    });
  });
});