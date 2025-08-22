// Phase 3.3.5: Marketing Campaign Hooks Implementation (GREEN Phase)
// Following architectural patterns from docs/architectural-patterns-and-best-practices.md
// Pattern: React Query + centralized factory + ValidationMonitor + role permissions

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../useAuth';
import { MarketingCampaignService } from '../../services/marketing/marketingCampaignService';
import { RolePermissionService } from '../../services/role-based/rolePermissionService';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { campaignKeys } from '../../utils/queryKeyFactory';
import type {
  MarketingCampaignTransform,
  CreateMarketingCampaignInput,
  CampaignStatusType
} from '../../schemas/marketing';

// Standard hook response patterns
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PaginationOptions {
  page: number;
  limit: number;
}

interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

// Campaign performance types
interface CampaignMetrics {
  views: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

interface CampaignPerformance {
  clickThroughRate: number;
  conversionRate: number;
  revenuePerConversion: number;
  totalROI: number;
}

interface CampaignPerformanceResponse {
  campaignId: string;
  metrics: CampaignMetrics;
  performance: CampaignPerformance;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

interface ScheduleCampaignInput {
  startDate: string;
  endDate: string;
  autoActivate: boolean;
}

interface ScheduleResponse {
  campaignId: string;
  scheduledActivation: boolean;
  startDate: string;
  endDate: string;
}

// Using centralized query key factory from utils/queryKeyFactory

/**
 * Hook to fetch marketing campaigns with role-based filtering
 * Supports pagination and status-based filtering
 */
export function useMarketingCampaigns(
  status: CampaignStatusType,
  pagination: PaginationOptions,
  userId?: string
) {
  const { user } = useAuth();
  const effectiveUserId = userId || user?.id;

  return useQuery({
    queryKey: campaignKeys.byStatusPaginated(status, pagination),
    queryFn: async (): Promise<PaginatedResponse<MarketingCampaignTransform>> => {
      if (!effectiveUserId) {
        throw new Error('Authentication required for campaign access');
      }

      // Role-based access control
      const hasPermission = await RolePermissionService.hasPermission(
        effectiveUserId,
        'campaign_management'
      );
      
      if (!hasPermission) {
        ValidationMonitor.recordValidationError({
          context: 'useMarketingCampaigns',
          errorCode: 'INSUFFICIENT_PERMISSIONS',
          validationPattern: 'simple_validation',
          errorMessage: 'Insufficient permissions for campaign access'
        });
        throw new Error('Insufficient permissions for campaign access');
      }

      const result = await MarketingCampaignService.getCampaignsByStatus(status, pagination, effectiveUserId);
      
      if (!result.success || !result.data) {
        ValidationMonitor.recordValidationError({
          context: 'useMarketingCampaigns',
          errorCode: 'CAMPAIGN_QUERY_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: result.error || 'Failed to fetch campaigns'
        });
        throw new Error(result.error || 'Failed to fetch campaigns');
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'useMarketingCampaigns',
        pattern: 'transformation_schema',
        operation: 'getCampaignsByStatus'
      });

      return result.data;
    },
    enabled: !!effectiveUserId && !!status,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch campaign performance metrics with aggregation
 * Supports real-time analytics and performance tracking
 */
export function useCampaignPerformance(campaignId: string) {
  return useQuery({
    queryKey: campaignKeys.performance(campaignId),
    queryFn: async (): Promise<CampaignPerformanceResponse> => {
      const result = await MarketingCampaignService.getCampaignPerformance(campaignId);
      
      if (!result.success || !result.data) {
        ValidationMonitor.recordValidationError({
          context: 'useCampaignPerformance',
          errorCode: 'PERFORMANCE_QUERY_FAILED',
          validationPattern: 'direct_schema',
          errorMessage: result.error || 'Failed to fetch campaign performance'
        });
        throw new Error(result.error || 'Failed to fetch campaign performance');
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'useCampaignPerformance',
        pattern: 'direct_supabase_query',
        operation: 'getCampaignPerformance'
      });

      return result.data;
    },
    enabled: !!campaignId,
    staleTime: 5 * 60 * 1000, // 5 minutes for performance data
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes for real-time analytics
  });
}

/**
 * Hook for creating marketing campaigns with business rule validation
 * Supports campaign type validation and date constraint checks
 */
export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      campaignData,
      userId
    }: {
      campaignData: CreateMarketingCampaignInput;
      userId: string;
    }): Promise<MarketingCampaignTransform> => {
      const result = await MarketingCampaignService.createCampaign(campaignData, userId);
      
      if (!result.success || !result.data) {
        ValidationMonitor.recordValidationError({
          context: 'useCreateCampaign',
          errorCode: 'CAMPAIGN_CREATION_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: result.error || 'Failed to create campaign'
        });
        throw new Error(result.error || 'Failed to create campaign');
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'useCreateCampaign',
        pattern: 'transformation_schema',
        operation: 'createCampaign'
      });

      return result.data;
    },
    onSuccess: (createdCampaign) => {
      // Invalidate campaign lists to include new campaign
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      queryClient.invalidateQueries({ queryKey: campaignKeys.byStatus(createdCampaign.campaignStatus) });
      
      // Set new campaign in cache
      queryClient.setQueryData(campaignKeys.detail(createdCampaign.id), createdCampaign);
    },
    onError: (error) => {
      ValidationMonitor.recordValidationError({
        context: 'useCreateCampaign.onError',
        errorCode: 'CAMPAIGN_CREATION_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Campaign creation failed'
      });
    }
  });
}

/**
 * Hook for campaign scheduling with date management and automation
 * Supports automated activation and scheduling constraints
 */
export function useCampaignScheduling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      scheduleData,
      userId
    }: {
      campaignId: string;
      scheduleData: ScheduleCampaignInput;
      userId: string;
    }): Promise<ScheduleResponse> => {
      const result = await MarketingCampaignService.scheduleCampaign(campaignId, scheduleData, userId);
      
      if (!result.success || !result.data) {
        ValidationMonitor.recordValidationError({
          context: 'useCampaignScheduling',
          errorCode: 'CAMPAIGN_SCHEDULING_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: result.error || 'Failed to schedule campaign'
        });
        throw new Error(result.error || 'Failed to schedule campaign');
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'useCampaignScheduling',
        pattern: 'transformation_schema',
        operation: 'scheduleCampaign'
      });

      return result.data;
    },
    onSuccess: (scheduleResponse) => {
      // Invalidate campaign details and scheduling queries
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(scheduleResponse.campaignId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.scheduling() });
    },
    onError: (error) => {
      ValidationMonitor.recordValidationError({
        context: 'useCampaignScheduling.onError',
        errorCode: 'CAMPAIGN_SCHEDULING_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Campaign scheduling failed'
      });
    }
  });
}

/**
 * Hook for recording campaign metrics for real-time analytics
 * Supports metric validation and batch recording
 */
export function useCampaignMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      metricType,
      value,
      userId
    }: {
      campaignId: string;
      metricType: string;
      value: number;
      userId: string;
    }): Promise<{ recorded: boolean }> => {
      const result = await MarketingCampaignService.recordCampaignMetric(campaignId, metricType, value, userId);
      
      if (!result.success) {
        ValidationMonitor.recordValidationError({
          context: 'useCampaignMetrics',
          errorCode: 'METRIC_RECORDING_FAILED',
          validationPattern: 'direct_schema',
          errorMessage: result.error || 'Failed to record campaign metric'
        });
        throw new Error(result.error || 'Failed to record campaign metric');
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'useCampaignMetrics',
        pattern: 'direct_supabase_query',
        operation: 'recordCampaignMetric'
      });

      return { recorded: true };
    },
    onSuccess: (_, variables) => {
      // Invalidate performance data to reflect new metrics
      queryClient.invalidateQueries({ queryKey: campaignKeys.performance(variables.campaignId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.metrics() });
      queryClient.invalidateQueries({ queryKey: campaignKeys.analytics(variables.campaignId) });
    },
    onError: (error) => {
      ValidationMonitor.recordValidationError({
        context: 'useCampaignMetrics.onError',
        errorCode: 'METRIC_RECORDING_FAILED',
        validationPattern: 'direct_schema',
        errorMessage: error instanceof Error ? error.message : 'Metric recording failed'
      });
    }
  });
}

/**
 * Hook for updating campaign status with lifecycle validation
 * Supports campaign lifecycle management and state transitions
 */
export function useUpdateCampaignStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      newStatus,
      userId
    }: {
      campaignId: string;
      newStatus: CampaignStatusType;
      userId: string;
    }): Promise<MarketingCampaignTransform> => {
      const result = await MarketingCampaignService.updateCampaignStatus(campaignId, newStatus, userId);
      
      if (!result.success || !result.data) {
        ValidationMonitor.recordValidationError({
          context: 'useUpdateCampaignStatus',
          errorCode: 'STATUS_UPDATE_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: result.error || 'Failed to update campaign status'
        });
        throw new Error(result.error || 'Failed to update campaign status');
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'useUpdateCampaignStatus',
        pattern: 'transformation_schema',
        operation: 'updateCampaignStatus'
      });

      return result.data;
    },
    onSuccess: (updatedCampaign, variables) => {
      // Invalidate status-specific queries and update cache
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(updatedCampaign.id) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.byStatus(updatedCampaign.campaignStatus) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.byStatus(variables.newStatus) });
      
      // Update campaign in cache
      queryClient.setQueryData(campaignKeys.detail(updatedCampaign.id), updatedCampaign);
      
      // Invalidate related content and bundle queries when campaign status changes
      // This supports cross-system integration
      queryClient.invalidateQueries({ queryKey: ['content', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['bundles', 'list'] });
    },
    onError: (error) => {
      ValidationMonitor.recordValidationError({
        context: 'useUpdateCampaignStatus.onError',
        errorCode: 'STATUS_UPDATE_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Status update failed'
      });
    }
  });
}

// Export query key factory for use in other hooks and components
export { campaignKeys };