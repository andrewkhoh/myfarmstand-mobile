// Phase 4.3: Anomaly Detection Hook Implementation (GREEN Phase)
// Following established React Query patterns

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BusinessIntelligenceService } from '../../services/executive/businessIntelligenceService';
import { useUserRole } from '../role-based/useUserRole';
import { executiveAnalyticsKeys } from '../../utils/queryKeyFactory';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { useState, useEffect } from 'react';
import React from 'react';

interface UseAnomalyDetectionOptions {
  category?: string;
  sensitivity?: 'low' | 'medium' | 'high';
  alertingEnabled?: boolean;
  realTimeMonitoring?: boolean;
  pollingInterval?: number;
  includeTrendAnalysis?: boolean;
  trendPeriod?: string;
}

export function useAnomalyDetection(options: UseAnomalyDetectionOptions = {}) {
  const { role, hasPermission } = useUserRole();
  const queryClient = useQueryClient();
  const [newAnomalyDetected, setNewAnomalyDetected] = useState(false);

  const queryKey = executiveAnalyticsKeys.anomalyDetection(role, options);

  const {
    data,
    isLoading,
    isSuccess,
    isError,
    error
  } = useQuery({
    queryKey,
    queryFn: async () => {
      // Check permissions
      const canAccess = await hasPermission('anomaly_detection_read');
      if (!canAccess && role !== 'executive' && role !== 'admin') {
        throw new Error('Insufficient permissions for anomaly detection');
      }

      // Detect anomalies
      const anomaliesResult = await BusinessIntelligenceService.detectAnomalies({
        category: options.category,
        sensitivity: options.sensitivity || 'medium',
        alerting_enabled: options.alertingEnabled
      });

      // Get trend analysis if requested
      if (options.includeTrendAnalysis) {
        const trendData = await BusinessIntelligenceService.getAnomalyTrends({
          period: options.trendPeriod || '7d'
        });
        
        return {
          ...anomaliesResult,
          anomalyTrends: trendData
        };
      }

      return anomaliesResult;
    },
    enabled: !!role,
    staleTime: options.realTimeMonitoring ? 30 * 1000 : 2 * 60 * 1000, // 30s for real-time, 2min otherwise
    gcTime: 10 * 60 * 1000,   // 10 minutes cache retention
    refetchOnMount: options.realTimeMonitoring,
    refetchOnWindowFocus: options.realTimeMonitoring,
    refetchInterval: options.realTimeMonitoring ? (options.pollingInterval || 5000) : false,
    retry: (failureCount, error) => {
      if (error.message.includes('Insufficient permissions')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    throwOnError: false
  });

  // Track new anomalies with error handling
  useEffect(() => {
    if (safeData?.anomalies && safeData.anomalies.length > 0) {
      try {
        const hasNewAnomaly = safeData.anomalies.some((a: any) => a.isNew);
        setNewAnomalyDetected(hasNewAnomaly);
        
        if (hasNewAnomaly && options.alertingEnabled) {
          ValidationMonitor.recordPatternSuccess({
            pattern: 'anomaly_detection_new_anomaly',
            context: 'useAnomalyDetection.newAnomalyTracking',
            description: `Detected ${safeData.anomalies.filter((a: any) => a.isNew).length} new anomalies`
          });
        }
      } catch (error) {
        ValidationMonitor.recordValidationError({
          context: 'useAnomalyDetection.newAnomalyTracking',
          errorCode: 'ANOMALY_TRACKING_FAILED',
          validationPattern: 'anomaly_detection_operation',
          errorMessage: error.message
        });
        setNewAnomalyDetected(false);
      }
    }
  }, [safeData?.anomalies, options.alertingEnabled]);

  // Fallback data for anomaly detection
  const fallbackData = React.useMemo(() => ({
    anomalies: [],
    totalAnomalies: 0,
    message: 'Anomaly detection temporarily unavailable',
    isFallback: true,
    alertingStatus: options.alertingEnabled ? 'disabled' : 'not_configured'
  }), [options.alertingEnabled]);

  // Safe data with error handling
  const safeData = data || (isError ? fallbackData : undefined);

  // Check for active alerts with error handling
  const hasActiveAlerts = React.useMemo(() => {
    if (!options.alertingEnabled || !safeData?.anomalies) return false;
    try {
      return safeData.anomalies.some((a: any) => a.shouldAlert);
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'useAnomalyDetection.hasActiveAlerts',
        errorCode: 'ALERT_CHECK_FAILED',
        validationPattern: 'anomaly_detection_operation',
        errorMessage: error.message
      });
      return false;
    }
  }, [options.alertingEnabled, safeData?.anomalies]);

  return {
    data: safeData,
    anomalies: safeData?.anomalies,
    anomalyTrends: safeData?.anomalyTrends,
    totalAnomalies: safeData?.totalAnomalies,
    fallbackData: isError ? fallbackData : undefined,
    hasActiveAlerts,
    newAnomalyDetected,
    isLoading,
    isSuccess,
    isError,
    error,
    queryKey
  };
}