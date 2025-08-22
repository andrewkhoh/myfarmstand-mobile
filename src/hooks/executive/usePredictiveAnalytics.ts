// Phase 4.3: Predictive Analytics Hook Implementation (GREEN Phase)
// Following established React Query patterns

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PredictiveAnalyticsService } from '../../services/executive/predictiveAnalyticsService';
import { useUserRole } from '../role-based/useUserRole';
import { useState } from 'react';

interface UsePredictiveAnalyticsOptions {
  forecastType?: 'demand' | 'revenue' | 'inventory';
  includeConfidenceIntervals?: boolean;
  timeHorizon?: string;
  modelId?: string;
  realTimeUpdates?: boolean;
  updateInterval?: number;
  forecastId?: string;
}

export function usePredictiveAnalytics(options: UsePredictiveAnalyticsOptions = {}) {
  const { role, hasPermission } = useUserRole();
  const queryClient = useQueryClient();
  const [modelValidation, setModelValidation] = useState<any>(null);
  const [confidenceIntervals, setConfidenceIntervals] = useState<any>(null);

  const queryKey = ['executive', 'predictiveAnalytics', options.forecastType || 'demand'];

  const {
    data: forecastData,
    isLoading,
    isSuccess,
    isError,
    error
  } = useQuery({
    queryKey,
    queryFn: async () => {
      // Check permissions
      const canAccess = await hasPermission('predictive_analytics_read');
      if (!canAccess && role !== 'executive' && role !== 'admin') {
        throw new Error('Insufficient permissions for predictive analytics');
      }

      // Generate forecast
      const forecast = await PredictiveAnalyticsService.generateForecast({
        forecast_type: options.forecastType || 'demand',
        time_horizon: options.timeHorizon || 'month',
        include_confidence_intervals: options.includeConfidenceIntervals
      });

      return forecast;
    },
    enabled: !!role,
    refetchInterval: options.realTimeUpdates ? (options.updateInterval || 5000) : false
  });

  // Validate model mutation
  const validateModelMutation = useMutation({
    mutationFn: async (validationOptions: any) => {
      const result = await PredictiveAnalyticsService.validateModelAccuracy(
        options.modelId || 'model-1',
        {
          historical_data: validationOptions.historicalData,
          validation_method: validationOptions.validationMethod
        }
      );
      
      setModelValidation(result);
      return result;
    }
  });

  // Calculate confidence intervals mutation
  const calculateConfidenceMutation = useMutation({
    mutationFn: async (params: any) => {
      const result = await PredictiveAnalyticsService.calculateConfidenceIntervals(
        options.forecastId || 'forecast-1',
        { confidence_levels: params.confidenceLevels }
      );
      
      setConfidenceIntervals(result);
      return result;
    }
  });

  const lastUpdateTime = forecastData?.timestamp || forecastData?.generatedAt;

  return {
    forecastData,
    modelValidation,
    confidenceIntervals,
    isLoading,
    isSuccess,
    isError,
    error,
    queryKey,
    lastUpdateTime,
    validateModel: validateModelMutation.mutateAsync,
    calculateConfidence: calculateConfidenceMutation.mutateAsync
  };
}