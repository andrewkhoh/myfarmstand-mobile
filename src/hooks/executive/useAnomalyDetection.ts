// Phase 4.3: Anomaly Detection Hook Implementation (GREEN Phase)
// Following established React Query patterns

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BusinessIntelligenceService } from '../../services/executive/businessIntelligenceService';
import { useUserRole } from '../role-based/useUserRole';
import { useState, useEffect } from 'react';

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

  const queryKey = ['executive', 'anomalyDetection', options];

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
    refetchInterval: options.realTimeMonitoring ? (options.pollingInterval || 5000) : false
  });

  // Track new anomalies
  useEffect(() => {
    if (data?.anomalies && data.anomalies.length > 0) {
      const hasNewAnomaly = data.anomalies.some((a: any) => a.isNew);
      setNewAnomalyDetected(hasNewAnomaly);
    }
  }, [data?.anomalies]);

  // Check for active alerts
  const hasActiveAlerts = options.alertingEnabled && 
    data?.anomalies?.some((a: any) => a.shouldAlert) || false;

  return {
    data,
    anomalies: data?.anomalies,
    anomalyTrends: data?.anomalyTrends,
    totalAnomalies: data?.totalAnomalies,
    hasActiveAlerts,
    newAnomalyDetected,
    isLoading,
    isSuccess,
    isError,
    error,
    queryKey
  };
}