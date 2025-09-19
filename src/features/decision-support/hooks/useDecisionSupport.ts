/**
 * Decision Support Hooks - React Query integration with architectural compliance
 * Following established patterns from docs/architectural-patterns-and-best-practices.md
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { decisionSupportKeys } from '../../../utils/queryKeyFactory';
import { decisionSupportService } from '../services/decisionSupportService';
import { useCurrentUser } from '../../../hooks/useAuth';
import { useCurrentUserHasPermission } from '../../../hooks/role-based/permissions';
import type {
  ExecutiveData,
  RecommendationOptions,
  FeedbackData,
  LearningMetrics
} from '../schemas';

// Create user-friendly error helper (following UX patterns)
const createDecisionSupportError = (
  code: string,
  technicalMessage: string,
  userMessage: string
) => ({
  code,
  message: technicalMessage,
  userMessage,
  timestamp: new Date().toISOString()
});

/**
 * Hook for generating recommendations with React Query integration
 * Following Pattern: Graceful Degradation + Role-based Access Control
 */
export function useGenerateRecommendations(
  executiveData?: ExecutiveData,
  options?: RecommendationOptions
) {
  const { data: currentUser } = useCurrentUser();
  const { hasPermission: hasExecutiveAccess, isLoading: permissionLoading } = useCurrentUserHasPermission('executive_analytics');

  // Enhanced authentication and permission guard (Pattern 4: Error Recovery & User Experience)
  if (!currentUser?.id || permissionLoading) {
    const authError = createDecisionSupportError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated for decision support access',
      'Please sign in with executive permissions to access decision support'
    );

    return {
      data: null,
      recommendations: [],
      isLoading: false,
      error: authError,
      isError: true,
      isSuccess: false,
      queryKey: decisionSupportKeys.recommendations('unauthenticated'),
      refetch: () => Promise.resolve({ data: null } as any),
    };
  }

  // Permission-based access control
  if (!hasExecutiveAccess) {
    const permissionError = createDecisionSupportError(
      'PERMISSION_DENIED',
      'User lacks executive permissions for decision support',
      'You need executive permissions to access decision support features'
    );

    return {
      data: null,
      recommendations: [],
      isLoading: false,
      error: permissionError,
      isError: true,
      isSuccess: false,
      queryKey: decisionSupportKeys.recommendations(currentUser.id),
      refetch: () => Promise.resolve({ data: null } as any),
    };
  }

  const queryKey = decisionSupportKeys.recommendationsWithOptions(options, currentUser.id);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!executiveData) {
        throw new Error('Executive data is required for recommendation generation');
      }

      const result = await decisionSupportService.generateRecommendations(executiveData, options);

      if (!result.success) {
        throw result.error || new Error(result.message || 'Failed to generate recommendations');
      }

      return result.data || [];
    },
    enabled: !!currentUser.id && hasExecutiveAccess && !!executiveData,
    // Decision support cache optimization (Pattern 2: Optimized Cache Configuration)
    staleTime: 5 * 60 * 1000,    // 5 minutes - recommendations can change with new data
    gcTime: 15 * 60 * 1000,      // 15 minutes - valuable for short-term executive decisions
    refetchOnMount: false,        // Don't refetch on mount - recommendations are stable for short periods
    refetchOnWindowFocus: false,  // Don't spam on focus changes
    refetchOnReconnect: true,     // Do refetch when connection restored
    retry: 1,                     // Single retry for recommendation generation
    retryDelay: 3000,            // 3 second delay for retry
  });

  return {
    ...query,
    recommendations: query.data || [],
    queryKey,
  };
}

/**
 * Hook for tracking recommendation outcomes
 * Following Pattern: Atomic Operations
 */
export function useTrackOutcome() {
  const { data: currentUser } = useCurrentUser();
  const { hasPermission: hasExecutiveAccess } = useCurrentUserHasPermission('executive_analytics');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recommendationId, outcome }: { recommendationId: string; outcome: any }) => {
      if (!currentUser?.id || !hasExecutiveAccess) {
        throw createDecisionSupportError(
          'PERMISSION_DENIED',
          'User lacks executive permissions for outcome tracking',
          'You need executive permissions to track outcomes'
        );
      }

      const result = await decisionSupportService.trackOutcome(recommendationId, outcome);

      if (!result.success) {
        throw result.error || new Error(result.message || 'Failed to track outcome');
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate learning metrics and outcome history
      if (currentUser?.id) {
        queryClient.invalidateQueries({
          queryKey: decisionSupportKeys.learningMetrics(currentUser.id)
        });
      }
    },
  });
}

/**
 * Hook for processing feedback
 * Following Pattern: Atomic Operations
 */
export function useProcessFeedback() {
  const { data: currentUser } = useCurrentUser();
  const { hasPermission: hasExecutiveAccess } = useCurrentUserHasPermission('executive_analytics');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedbackData: FeedbackData) => {
      if (!currentUser?.id || !hasExecutiveAccess) {
        throw createDecisionSupportError(
          'PERMISSION_DENIED',
          'User lacks executive permissions for feedback processing',
          'You need executive permissions to provide feedback'
        );
      }

      const result = await decisionSupportService.processFeedback(feedbackData);

      if (!result.success) {
        throw result.error || new Error(result.message || 'Failed to process feedback');
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate learning metrics
      if (currentUser?.id) {
        queryClient.invalidateQueries({
          queryKey: decisionSupportKeys.learningMetrics(currentUser.id)
        });
      }
    },
  });
}

/**
 * Hook for getting learning metrics
 * Following Pattern: Graceful Degradation
 */
export function useLearningMetrics() {
  const { data: currentUser } = useCurrentUser();
  const { hasPermission: hasExecutiveAccess, isLoading: permissionLoading } = useCurrentUserHasPermission('executive_analytics');

  // Enhanced authentication and permission guard
  if (!currentUser?.id || permissionLoading) {
    const authError = createDecisionSupportError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated for learning metrics access',
      'Please sign in with executive permissions to view learning metrics'
    );

    return {
      data: null,
      metrics: null,
      isLoading: false,
      error: authError,
      isError: true,
      isSuccess: false,
      queryKey: decisionSupportKeys.learningMetrics('unauthenticated'),
      refetch: () => Promise.resolve({ data: null } as any),
    };
  }

  if (!hasExecutiveAccess) {
    const permissionError = createDecisionSupportError(
      'PERMISSION_DENIED',
      'User lacks executive permissions for learning metrics',
      'You need executive permissions to view learning metrics'
    );

    return {
      data: null,
      metrics: null,
      isLoading: false,
      error: permissionError,
      isError: true,
      isSuccess: false,
      queryKey: decisionSupportKeys.learningMetrics(currentUser.id),
      refetch: () => Promise.resolve({ data: null } as any),
    };
  }

  const queryKey = decisionSupportKeys.learningMetrics(currentUser.id);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await decisionSupportService.getLearningMetrics();

      if (!result.success) {
        // Graceful degradation - return default metrics instead of throwing
        console.warn('Failed to get learning metrics, using defaults:', result.error);
        return {
          accuracy: 0.5,
          improvement: 0,
          totalFeedback: 0,
          successRate: 0
        } as LearningMetrics;
      }

      return result.data;
    },
    enabled: !!currentUser.id && hasExecutiveAccess,
    // Learning metrics cache optimization (Pattern 2: Optimized Cache Configuration)
    staleTime: 2 * 60 * 1000,    // 2 minutes - learning metrics can update frequently
    gcTime: 10 * 60 * 1000,      // 10 minutes - useful for executive dashboard
    refetchOnMount: false,        // Don't refetch on mount
    refetchOnWindowFocus: false,  // Don't spam on focus changes
    refetchOnReconnect: true,     // Do refetch when connection restored
    retry: 2,                     // Allow retries for learning metrics
    retryDelay: 2000,            // 2 second delay for retry
  });

  return {
    ...query,
    metrics: query.data,
    queryKey,
  };
}

/**
 * Hook for calculating stockout risk
 * Following Pattern: Direct Service with Validation
 */
export function useStockoutRisk(inventoryData?: any) {
  const { data: currentUser } = useCurrentUser();
  const { hasPermission: hasInventoryAccess, isLoading: permissionLoading } = useCurrentUserHasPermission('inventory_management');

  // Enhanced authentication and permission guard
  if (!currentUser?.id || permissionLoading) {
    const authError = createDecisionSupportError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated for stockout risk analysis',
      'Please sign in with inventory permissions to analyze stockout risk'
    );

    return {
      data: null,
      risk: null,
      isLoading: false,
      error: authError,
      isError: true,
      isSuccess: false,
      queryKey: decisionSupportKeys.riskAssessment('inventory', 'unauthenticated'),
      refetch: () => Promise.resolve({ data: null } as any),
    };
  }

  if (!hasInventoryAccess) {
    const permissionError = createDecisionSupportError(
      'PERMISSION_DENIED',
      'User lacks inventory permissions for stockout risk analysis',
      'You need inventory management permissions to analyze stockout risk'
    );

    return {
      data: null,
      risk: null,
      isLoading: false,
      error: permissionError,
      isError: true,
      isSuccess: false,
      queryKey: decisionSupportKeys.riskAssessment('inventory', currentUser.id),
      refetch: () => Promise.resolve({ data: null } as any),
    };
  }

  const queryKey = decisionSupportKeys.riskAssessment('inventory', currentUser.id);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!inventoryData) {
        throw new Error('Inventory data is required for stockout risk calculation');
      }

      const result = await decisionSupportService.calculateStockoutRisk(inventoryData);

      if (!result.success) {
        throw result.error || new Error(result.message || 'Failed to calculate stockout risk');
      }

      return result.data;
    },
    enabled: !!currentUser.id && hasInventoryAccess && !!inventoryData,
    // Risk assessment cache optimization (Pattern 2: Optimized Cache Configuration)
    staleTime: 10 * 60 * 1000,   // 10 minutes - risk calculations can be cached
    gcTime: 30 * 60 * 1000,      // 30 minutes - risk data valuable for operational decisions
    refetchOnMount: false,        // Don't refetch on mount
    refetchOnWindowFocus: false,  // Don't spam on focus changes
    refetchOnReconnect: true,     // Do refetch when connection restored
    retry: 1,                     // Single retry for risk calculations
    retryDelay: 3000,            // 3 second delay for retry
  });

  return {
    ...query,
    risk: query.data,
    queryKey,
  };
}

/**
 * Hook for getting adjusted confidence scores
 * Following Pattern: Graceful Degradation
 */
export function useAdjustedConfidence(type: string, baseConfidence: number) {
  const { data: currentUser } = useCurrentUser();
  const { hasPermission: hasExecutiveAccess } = useCurrentUserHasPermission('executive_analytics');

  const queryKey = decisionSupportKeys.learningMetrics(currentUser?.id);

  const query = useQuery({
    queryKey: [...queryKey, 'adjusted-confidence', type, baseConfidence],
    queryFn: async () => {
      const result = await decisionSupportService.getAdjustedConfidence(type, baseConfidence);

      if (!result.success) {
        // Graceful degradation - return base confidence
        console.warn('Failed to get adjusted confidence, using base:', result.error);
        return baseConfidence;
      }

      return result.data || baseConfidence;
    },
    enabled: !!currentUser?.id && hasExecutiveAccess && !!type && typeof baseConfidence === 'number',
    // Confidence calculation cache optimization
    staleTime: 5 * 60 * 1000,    // 5 minutes - confidence adjustments can be cached
    gcTime: 15 * 60 * 1000,      // 15 minutes - useful for multiple calculations
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,    // Confidence calculations don't need reconnect refresh
    retry: 0,                     // No retry for confidence calculations - fail fast with fallback
  });

  return {
    ...query,
    adjustedConfidence: query.data ?? baseConfidence, // Always provide fallback
  };
}