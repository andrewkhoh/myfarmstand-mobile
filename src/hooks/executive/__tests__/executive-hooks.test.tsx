import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper, createTestQueryClient } from '../../test/test-wrapper';
import { useBusinessMetrics } from '../useBusinessMetrics';
import { useBusinessInsights } from '../useBusinessInsights';
import { usePredictiveAnalytics } from '../usePredictiveAnalytics';
import { useForecastGeneration } from '../useForecastGeneration';
import { useMetricTrends } from '../useMetricTrends';

describe('Executive Hooks', () => {
  const queryClient = createTestQueryClient();
  const wrapper = createWrapper(queryClient);

  beforeEach(() => {
    queryClient.clear();
  });

  describe('useBusinessMetrics', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useBusinessMetrics(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should fetch business metrics', async () => {
      const { result } = renderHook(() => useBusinessMetrics({
        dateRange: '30d',
        category: 'revenue'
      }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeUndefined();
    });
  });

  describe('useBusinessInsights', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useBusinessInsights(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should fetch business insights', async () => {
      const { result } = renderHook(() => useBusinessInsights({
        insightType: 'trend'
      }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeUndefined();
    });
  });

  describe('usePredictiveAnalytics', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => usePredictiveAnalytics(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.forecastData).toBeUndefined();
    });

    it('should fetch predictive analytics', async () => {
      const { result } = renderHook(() => usePredictiveAnalytics(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeUndefined();
    });
  });

  describe('useForecastGeneration', () => {
    it('should provide forecast generation mutation', () => {
      const { result } = renderHook(() => useForecastGeneration(), { wrapper });

      expect(result.current.generateForecast).toBeDefined();
      expect(typeof result.current.generateForecast).toBe('function');
    });
  });

  describe('useMetricTrends', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useMetricTrends({ metricType: 'revenue' }), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should fetch metric trends', async () => {
      const { result } = renderHook(() => useMetricTrends({
        metricType: 'revenue',
        timeRange: '30d',
        granularity: 'daily'
      }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeUndefined();
    });

    it('should work with default options', () => {
      const { result } = renderHook(() => useMetricTrends(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.isLoading).toBeDefined();
    });
  });
});