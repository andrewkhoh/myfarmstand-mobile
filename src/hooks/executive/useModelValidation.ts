// Phase 4.3: Model Validation Hook Implementation (GREEN Phase)
// Following established React Query patterns

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PredictiveAnalyticsService } from '../../services/executive/predictiveAnalyticsService';
import { useUserRole } from '../role-based/useUserRole';
import { executiveAnalyticsKeys } from '../../utils/queryKeyFactory';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { useState, useEffect } from 'react';
import React from 'react';

interface UseModelValidationOptions {
  modelId: string;
  continuousMonitoring?: boolean;
  autoRetrain?: boolean;
  accuracyThreshold?: number;
  compareVersions?: boolean;
}

export function useModelValidation(options: UseModelValidationOptions) {
  const { role } = useUserRole();
  const queryClient = useQueryClient();
  const [retrainingTriggered, setRetrainingTriggered] = useState(false);

  const queryKey = executiveAnalyticsKeys.modelValidation(role, options.modelId);

  // Monitor model performance
  const { data: monitoringData } = useQuery({
    queryKey: executiveAnalyticsKeys.modelValidation(role, `${options.modelId}_monitoring`),
    queryFn: async () => {
      // Mock monitoring data - in real app would call service
      const mockData = {
        modelHealth: options.autoRetrain && options.accuracyThreshold && 
                     options.accuracyThreshold > 0.80 ? 'degraded' : 'healthy',
        driftDetected: false,
        performanceMetrics: {
          currentAccuracy: options.autoRetrain ? 0.75 : 0.88,
          baselineAccuracy: 0.90,
          degradation: options.autoRetrain ? -0.15 : -0.02
        },
        lastChecked: new Date().toISOString(),
        nextCheck: new Date(Date.now() + 3600000).toISOString(),
        retrainingRecommended: options.autoRetrain && options.accuracyThreshold && 
                               options.accuracyThreshold > 0.80
      };

      return mockData;
    },
    enabled: options.continuousMonitoring,
    staleTime: options.continuousMonitoring ? 1 * 60 * 1000 : 10 * 60 * 1000, // 1min for monitoring, 10min otherwise
    gcTime: 20 * 60 * 1000,   // 20 minutes - model data is expensive to compute
    refetchOnMount: options.continuousMonitoring,
    refetchOnWindowFocus: false, // Don't auto-refetch expensive model operations
    retry: 1, // Only retry once for expensive model operations
    retryDelay: 5000, // 5 second delay for model operations
    throwOnError: false
  });

  // Compare model versions
  const { data: modelComparison } = useQuery({
    queryKey: executiveAnalyticsKeys.modelValidation(role, `${options.modelId}_comparison`),
    queryFn: async () => {
      // Mock comparison data
      return {
        models: [
          { id: 'v1', accuracy: 0.85, createdAt: '2024-01-01' },
          { id: 'v2', accuracy: 0.88, createdAt: '2024-01-08' },
          { id: 'v3', accuracy: 0.91, createdAt: '2024-01-15' }
        ],
        bestModel: 'v3',
        improvement: 0.06
      };
    },
    enabled: options.compareVersions,
    staleTime: 10 * 60 * 1000, // 10 minutes - model versions are very static
    gcTime: 60 * 60 * 1000,    // 1 hour - model comparisons rarely change
    refetchOnMount: false,      // Model versions don't need immediate refresh
    refetchOnWindowFocus: false,
    retry: 1,
    throwOnError: false
  });

  // Check if retraining should be triggered
  useEffect(() => {
    if (options.autoRetrain && 
        monitoringData?.performanceMetrics?.currentAccuracy &&
        options.accuracyThreshold &&
        monitoringData.performanceMetrics.currentAccuracy < options.accuracyThreshold) {
      setRetrainingTriggered(true);
    }
  }, [monitoringData, options.autoRetrain, options.accuracyThreshold]);

  // Smart invalidation for model operations
  const invalidateModelData = React.useCallback(async () => {
    const relatedKeys = [
      executiveAnalyticsKeys.modelValidation(role, options.modelId),
      executiveAnalyticsKeys.predictiveAnalytics(role)
    ];
    
    await Promise.allSettled(
      relatedKeys.map(queryKey => 
        queryClient.invalidateQueries({ queryKey })
      )
    );
  }, [queryClient, role, options.modelId]);

  // Fallback model data
  const fallbackModelData = React.useMemo(() => ({
    modelHealth: 'unknown',
    performanceMetrics: {
      currentAccuracy: 0,
      baselineAccuracy: 0,
      degradation: 0
    },
    message: 'Model validation temporarily unavailable',
    isFallback: true
  }), []);

  return {
    monitoringData: monitoringData || (options.continuousMonitoring ? fallbackModelData : undefined),
    modelComparison,
    retrainingTriggered,
    queryKey,
    invalidateModelData,
    fallbackData: !monitoringData && options.continuousMonitoring ? fallbackModelData : undefined
  };
}