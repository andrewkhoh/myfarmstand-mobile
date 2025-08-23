// Simple Predictive Analytics Hook Tests - Following proven working pattern

import React from 'react';
import { createSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../../test/contracts/hook.contracts';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useSimplePredictiveAnalytics } from '../useSimplePredictiveAnalytics';
import { SimplePredictiveAnalyticsService } from '../../../services/executive/simplePredictiveAnalyticsService';
import { useUserRole } from '../../role-based/useUserRole';
import { createWrapper } from '../../../test/test-utils';

// Mock the service - following the proven pattern
jest.mock('../../../services/executive/simplePredictiveAnalyticsService');
const mockService = SimplePredictiveAnalyticsService as jest.Mocked<typeof SimplePredictiveAnalyticsService>;

// Mock the user role hook - following useCart pattern exactly
jest.mock('../../role-based/useUserRole');
const mockUseUserRole = useUserRole as jest.MockedFunction<typeof useUserRole>;

// Mock the query key factory - following useCart pattern exactly
jest.mock('../../../utils/queryKeyFactory', () => ({
  executiveAnalyticsKeys: {
    predictiveAnalytics: () => ['executive', 'predictiveAnalytics'],
  },
}));

// Mock broadcast factory - following proven pattern
jest.mock('../../../utils/broadcastFactory', () => {
  const mockBroadcastHelper = {
    send: jest.fn(),
    getAuthorizedChannelNames: jest.fn(() => ['test-channel'])
  };
  
  return {
    createBroadcastHelper: jest.fn(() => mockBroadcastHelper),
    executiveBroadcast: mockBroadcastHelper,
    realtimeBroadcast: mockBroadcastHelper,
  };
});

describe('useSimplePredictiveAnalytics Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when user has executive role', () => {
    beforeEach(() => {
      mockUseUserRole.mockReturnValue({
        role: 'executive',
        hasPermission: jest.fn().mockResolvedValue(true)
      } as any);
    });

    it('should fetch predictive analytics successfully', async () => {
      const mockForecast = {
        forecastData: {
          demandPrediction: {
            nextMonth: 1200,
            nextQuarter: 3500,
            nextYear: 15000
          },
          confidenceIntervals: {
            nextMonth: { lower: 1000, upper: 1400, confidence: 0.85 },
            nextQuarter: { lower: 3000, upper: 4000, confidence: 0.82 }
          },
          seasonalFactors: {
            january: 0.8,
            july: 1.3,
            december: 1.1
          }
        },
        modelMetrics: {
          accuracy: 0.87,
          mape: 0.13,
          rmse: 45.2
        },
        generatedAt: '2024-01-15T10:00:00Z'
      };

      mockService.getForecast.mockResolvedValue(mockForecast);

      const { result } = renderHook(() => useSimplePredictiveAnalytics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.forecastData).toEqual(mockForecast);
      expect(result.current.isSuccess).toBe(true);
      expect(mockService.getForecast).toHaveBeenCalled();
    });

    it('should handle predictive analytics with options', async () => {
      const mockForecastWithOptions = {
        forecastData: {
          demandPrediction: {
            nextMonth: 800,
            nextQuarter: 2400,
            nextYear: 10000
          },
          confidenceIntervals: {
            nextMonth: { lower: 700, upper: 900, confidence: 0.90 },
            nextQuarter: { lower: 2200, upper: 2600, confidence: 0.88 }
          },
          seasonalFactors: {
            january: 0.85,
            july: 1.25,
            december: 1.15
          }
        },
        modelMetrics: {
          accuracy: 0.91,
          mape: 0.09,
          rmse: 32.1
        },
        generatedAt: '2024-01-15T10:00:00Z'
      };

      mockService.getForecast.mockResolvedValue(mockForecastWithOptions);

      const { result } = renderHook(
        () => useSimplePredictiveAnalytics({
          forecastType: 'demand',
          timeHorizon: 'quarter',
          includeConfidenceIntervals: true
        }), 
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.forecastData).toEqual(mockForecastWithOptions);
      expect(mockService.getForecast).toHaveBeenCalledWith({
        forecastType: 'demand',
        timeHorizon: 'quarter',
        includeConfidenceIntervals: true
      });
    });

    it('should provide query key for external invalidation', () => {
      const { result } = renderHook(() => useSimplePredictiveAnalytics(), {
        wrapper: createWrapper(),
      });

      expect(result.current.queryKey).toEqual(['executive', 'predictiveAnalytics']);
    });
  });

  describe('when user lacks executive role', () => {
    beforeEach(() => {
      mockUseUserRole.mockReturnValue({
        role: 'staff',
        hasPermission: jest.fn().mockResolvedValue(false)
      } as any);
    });

    it('should return permission denied error', () => {
      const { result } = renderHook(() => useSimplePredictiveAnalytics(), {
        wrapper: createWrapper(),
      });

      expect(result.current.forecastData).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.code).toBe('PERMISSION_DENIED');
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseUserRole.mockReturnValue({
        role: null,
        hasPermission: jest.fn().mockResolvedValue(false)
      } as any);
    });

    it('should return permission denied error', () => {
      const { result } = renderHook(() => useSimplePredictiveAnalytics(), {
        wrapper: createWrapper(),
      });

      expect(result.current.forecastData).toBeUndefined();
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.code).toBe('PERMISSION_DENIED');
    });
  });
});