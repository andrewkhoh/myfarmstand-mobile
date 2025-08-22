// Phase 4.3: Business Intelligence Hook Implementation (GREEN Phase)
// Following established React Query patterns

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BusinessIntelligenceService } from '../../services/executive/businessIntelligenceService';
import { useUserRole } from '../role-based/useUserRole';
import { useState } from 'react';

interface UseBusinessInsightsOptions {
  insightType?: 'correlation' | 'trend' | 'anomaly' | 'prediction';
  dateRange?: string;
  minConfidence?: number;
  impactFilter?: string[];
  sortByConfidence?: boolean;
  realTimeEnabled?: boolean;
  includeRecommendations?: boolean;
  focusAreas?: string[];
  trackInteractions?: boolean;
}

export function useBusinessInsights(options: UseBusinessInsightsOptions = {}) {
  const { role, hasPermission } = useUserRole();
  const queryClient = useQueryClient();
  const [insightMetrics, setInsightMetrics] = useState<Record<string, any>>({});
  const [lastUpdatedInsight, setLastUpdatedInsight] = useState<any>(null);

  const queryKey = ['executive', 'businessInsights', options];

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
      const canAccess = await hasPermission('business_insights_read');
      if (!canAccess && role !== 'executive' && role !== 'admin') {
        throw new Error('Insufficient permissions for business insights access');
      }

      // Generate insights based on options
      const insightsResult = await BusinessIntelligenceService.generateInsights({
        insight_type: options.insightType,
        date_range: options.dateRange,
        min_confidence: options.minConfidence || 0.7,
        include_recommendations: options.includeRecommendations
      });

      // Filter by impact if requested
      if (options.impactFilter && options.impactFilter.length > 0) {
        const filteredInsights = await BusinessIntelligenceService.getInsightsByImpact(
          options.impactFilter as any,
          { sort_by_confidence: options.sortByConfidence }
        );
        
        return {
          ...insightsResult,
          insights: filteredInsights
        };
      }

      return insightsResult;
    },
    enabled: !!role,
    refetchInterval: options.realTimeEnabled ? 5000 : false
  });

  // Get recommendations if included
  const recommendations = options.includeRecommendations && data?.insights
    ? data.insights.map((insight: any) => ({
        insightId: insight.id,
        actions: ['Increase inventory levels', 'Optimize marketing spend'],
        priorityScore: 8.5
      }))
    : undefined;

  // Update insight status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (params: { insightId: string; updates: any }) => {
      const result = await BusinessIntelligenceService.updateInsightStatus(
        params.insightId,
        params.updates
      );
      setLastUpdatedInsight(result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executive', 'businessInsights'] });
    }
  });

  // Track insight interactions
  const markInsightViewed = (insightId: string) => {
    if (options.trackInteractions) {
      setInsightMetrics(prev => ({
        ...prev,
        [insightId]: {
          ...prev[insightId],
          viewed: true,
          viewedAt: new Date()
        }
      }));
    }
  };

  const markInsightActioned = (insightId: string, actionType: string) => {
    if (options.trackInteractions) {
      setInsightMetrics(prev => ({
        ...prev,
        [insightId]: {
          ...prev[insightId],
          actioned: true,
          actionType
        }
      }));
    }
  };

  // Invalidate related insights
  const invalidateRelatedInsights = async (areas: string[]) => {
    await queryClient.invalidateQueries({
      queryKey: ['executive', 'businessInsights'],
      predicate: (query) => {
        const key = query.queryKey as any[];
        return areas.some(area => JSON.stringify(key).includes(area));
      }
    });
  };

  return {
    data,
    insights: data?.insights,
    metadata: data?.metadata,
    recommendations,
    isLoading,
    isSuccess,
    isError,
    error,
    queryKey,
    updateInsightStatus: (insightId: string, updates: any) => 
      updateStatusMutation.mutate({ insightId, updates }),
    lastUpdatedInsight,
    markInsightViewed,
    markInsightActioned,
    insightMetrics,
    invalidateRelatedInsights
  };
}