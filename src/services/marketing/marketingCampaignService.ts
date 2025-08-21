// Phase 3: Marketing Campaign Service Implementation (GREEN Phase)
// Following docs/architectural-patterns-and-best-practices.md
// Pattern: Direct Supabase queries + ValidationMonitor + Role permissions

import { supabase } from '../../config/supabase';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { RolePermissionService } from '../role-based/rolePermissionService';
import { 
  MarketingCampaignTransformSchema,
  CampaignLifecycleHelpers,
  CampaignMetricsHelpers,
  type MarketingCampaignTransform,
  type CreateMarketingCampaignInput,
  type UpdateMarketingCampaignInput,
  type CampaignStatusType
} from '../../schemas/marketing';

// Standard service response pattern
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Pagination support
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

// Campaign scheduling types
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

// Analytics types
interface AnalyticsOptions {
  startDate: string;
  endDate: string;
  includeProjections: boolean;
}

interface CampaignAnalytics {
  totalMetrics: CampaignMetrics;
  trends: {
    dailyMetrics: Array<{
      date: string;
      metrics: CampaignMetrics;
    }>;
  };
  projections?: {
    expectedRevenue: number;
    expectedConversions: number;
    confidenceLevel: number;
  };
}

interface AnalyticsResponse {
  campaignId: string;
  analytics: CampaignAnalytics;
}

export class MarketingCampaignService {
  /**
   * Create campaign with complete lifecycle management
   */
  static async createCampaign(
    campaignData: CreateMarketingCampaignInput,
    userId: string
  ): Promise<ServiceResponse<MarketingCampaignTransform>> {
    try {
      // Validate permissions
      const hasPermission = await RolePermissionService.hasPermission(
        userId, 
        'campaign_management'
      );
      if (!hasPermission) {
        ValidationMonitor.recordValidationError({
          context: 'MarketingCampaignService.createCampaign',
          errorCode: 'INSUFFICIENT_PERMISSIONS',
          validationPattern: 'transformation_schema',
          errorMessage: 'Insufficient permissions for campaign management'
        });
        return { success: false, error: 'Insufficient permissions for campaign management' };
      }

      // Business rule validation
      const startDate = new Date(campaignData.startDate);
      const endDate = new Date(campaignData.endDate);
      
      if (endDate <= startDate) {
        ValidationMonitor.recordValidationError({
          context: 'MarketingCampaignService.createCampaign',
          errorCode: 'INVALID_DATE_RANGE',
          validationPattern: 'simple_validation',
          errorMessage: 'End date must be after start date'
        });
        return { success: false, error: 'End date must be after start date' };
      }

      // Validate campaign type specific rules
      if (campaignData.campaignType === 'clearance' && 
          campaignData.discountPercentage && 
          campaignData.discountPercentage < 25) {
        ValidationMonitor.recordValidationError({
          context: 'MarketingCampaignService.createCampaign',
          errorCode: 'INVALID_DISCOUNT_PERCENTAGE',
          validationPattern: 'simple_validation',
          errorMessage: 'Clearance campaigns must have at least 25% discount'
        });
        return { success: false, error: 'Clearance campaigns must have at least 25% discount' };
      }

      // Prepare database insert (convert camelCase to snake_case)
      const dbInsertData = {
        campaign_name: campaignData.campaignName,
        campaign_type: campaignData.campaignType,
        description: campaignData.description || null,
        start_date: campaignData.startDate,
        end_date: campaignData.endDate,
        discount_percentage: campaignData.discountPercentage || null,
        target_audience: campaignData.targetAudience || null,
        campaign_status: campaignData.campaignStatus || 'planned',
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert(dbInsertData)
        .select()
        .single();

      if (error || !data) {
        ValidationMonitor.recordValidationError({
          context: 'MarketingCampaignService.createCampaign',
          errorCode: 'CAMPAIGN_CREATION_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: error?.message || 'Insert failed'
        });
        return { success: false, error: error?.message || 'Failed to create campaign' };
      }

      // Transform response
      const transformedCampaign = MarketingCampaignTransformSchema.parse(data);

      ValidationMonitor.recordPatternSuccess({
        service: 'marketingCampaignService',
        pattern: 'transformation_schema',
        operation: 'createCampaign'
      });

      return { success: true, data: transformedCampaign };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      ValidationMonitor.recordValidationError({
        context: 'MarketingCampaignService.createCampaign',
        errorCode: 'CAMPAIGN_CREATION_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update campaign status with state transition validation
   */
  static async updateCampaignStatus(
    campaignId: string,
    newStatus: CampaignStatusType,
    userId: string
  ): Promise<ServiceResponse<MarketingCampaignTransform>> {
    try {
      // Validate permissions
      const hasPermission = await RolePermissionService.hasPermission(
        userId, 
        'campaign_management'
      );
      if (!hasPermission) {
        return { success: false, error: 'Insufficient permissions for campaign management' };
      }

      // Get current campaign for validation
      const { data: currentCampaign, error: fetchError } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (fetchError || !currentCampaign) {
        ValidationMonitor.recordValidationError({
          context: 'MarketingCampaignService.updateCampaignStatus',
          errorCode: 'CAMPAIGN_NOT_FOUND',
          validationPattern: 'transformation_schema',
          errorMessage: 'Campaign not found'
        });
        return { success: false, error: 'Campaign not found' };
      }

      // Validate state transition
      const canTransition = CampaignLifecycleHelpers.canTransitionTo(
        currentCampaign.campaign_status,
        newStatus
      );

      if (!canTransition) {
        ValidationMonitor.recordValidationError({
          context: 'MarketingCampaignService.updateCampaignStatus',
          errorCode: 'INVALID_STATUS_TRANSITION',
          validationPattern: 'transformation_schema',
          errorMessage: `Invalid campaign status transition from ${currentCampaign.campaign_status} to ${newStatus}`
        });
        return { 
          success: false, 
          error: `Invalid campaign status transition from ${currentCampaign.campaign_status} to ${newStatus}` 
        };
      }

      // Update campaign status
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .update({ 
          campaign_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .select()
        .single();

      if (error || !data) {
        ValidationMonitor.recordValidationError({
          context: 'MarketingCampaignService.updateCampaignStatus',
          errorCode: 'STATUS_UPDATE_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: error?.message || 'Update failed'
        });
        return { success: false, error: error?.message || 'Failed to update campaign status' };
      }

      // Transform response
      const transformedCampaign = MarketingCampaignTransformSchema.parse(data);

      ValidationMonitor.recordPatternSuccess({
        service: 'marketingCampaignService',
        pattern: 'transformation_schema',
        operation: 'updateCampaignStatus'
      });

      return { success: true, data: transformedCampaign };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Status update failed';
      
      ValidationMonitor.recordValidationError({
        context: 'MarketingCampaignService.updateCampaignStatus',
        errorCode: 'STATUS_UPDATE_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get campaign performance with metrics aggregation
   */
  static async getCampaignPerformance(
    campaignId: string,
    userId: string
  ): Promise<ServiceResponse<CampaignPerformanceResponse>> {
    try {
      // Validate permissions
      const hasPermission = await RolePermissionService.hasPermission(
        userId, 
        'campaign_management'
      );
      if (!hasPermission) {
        return { success: false, error: 'Insufficient permissions for campaign analytics' };
      }

      // Get campaign details
      const { data: campaign, error: campaignError } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        return { success: false, error: 'Campaign not found' };
      }

      // Get campaign metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('campaign_metrics')
        .select('*')
        .eq('campaign_id', campaignId);

      if (metricsError) {
        ValidationMonitor.recordValidationError({
          context: 'MarketingCampaignService.getCampaignPerformance',
          errorCode: 'METRICS_QUERY_FAILED',
          validationPattern: 'direct_schema',
          errorMessage: metricsError.message
        });
        return { success: false, error: metricsError.message };
      }

      // Aggregate metrics
      const aggregatedMetrics: CampaignMetrics = {
        views: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0
      };

      (metrics || []).forEach(metric => {
        if (metric.metric_type in aggregatedMetrics) {
          aggregatedMetrics[metric.metric_type as keyof CampaignMetrics] += Number(metric.metric_value);
        }
      });

      // Calculate performance indicators
      const performance: CampaignPerformance = {
        clickThroughRate: aggregatedMetrics.views > 0 ? aggregatedMetrics.clicks / aggregatedMetrics.views : 0,
        conversionRate: aggregatedMetrics.clicks > 0 ? aggregatedMetrics.conversions / aggregatedMetrics.clicks : 0,
        revenuePerConversion: aggregatedMetrics.conversions > 0 ? aggregatedMetrics.revenue / aggregatedMetrics.conversions : 0,
        totalROI: 0 // Would calculate based on campaign cost if available
      };

      const response: CampaignPerformanceResponse = {
        campaignId,
        metrics: aggregatedMetrics,
        performance,
        dateRange: {
          startDate: campaign.start_date,
          endDate: campaign.end_date
        }
      };

      ValidationMonitor.recordPatternSuccess({
        service: 'marketingCampaignService',
        pattern: 'direct_supabase_query',
        operation: 'getCampaignPerformance'
      });

      return { success: true, data: response };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Performance query failed';
      
      ValidationMonitor.recordValidationError({
        context: 'MarketingCampaignService.getCampaignPerformance',
        errorCode: 'PERFORMANCE_QUERY_FAILED',
        validationPattern: 'direct_schema',
        errorMessage
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Schedule campaign with date validation and automation
   */
  static async scheduleCampaign(
    campaignId: string,
    scheduleData: ScheduleCampaignInput,
    userId: string
  ): Promise<ServiceResponse<ScheduleResponse>> {
    try {
      // Validate permissions
      const hasPermission = await RolePermissionService.hasPermission(
        userId, 
        'campaign_management'
      );
      if (!hasPermission) {
        return { success: false, error: 'Insufficient permissions for campaign scheduling' };
      }

      // Validate dates
      const startDate = new Date(scheduleData.startDate);
      const endDate = new Date(scheduleData.endDate);
      const now = new Date();

      if (startDate < now) {
        ValidationMonitor.recordValidationError({
          context: 'MarketingCampaignService.scheduleCampaign',
          errorCode: 'INVALID_START_DATE',
          validationPattern: 'simple_validation',
          errorMessage: 'Start date cannot be in the past'
        });
        return { success: false, error: 'Start date cannot be in the past' };
      }

      if (endDate <= startDate) {
        return { success: false, error: 'End date must be after start date' };
      }

      // Update campaign with new schedule
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .update({
          start_date: scheduleData.startDate,
          end_date: scheduleData.endDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .select()
        .single();

      if (error || !data) {
        ValidationMonitor.recordValidationError({
          context: 'MarketingCampaignService.scheduleCampaign',
          errorCode: 'CAMPAIGN_SCHEDULING_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: error?.message || 'Scheduling failed'
        });
        return { success: false, error: error?.message || 'Failed to schedule campaign' };
      }

      const response: ScheduleResponse = {
        campaignId,
        scheduledActivation: scheduleData.autoActivate,
        startDate: scheduleData.startDate,
        endDate: scheduleData.endDate
      };

      ValidationMonitor.recordPatternSuccess({
        service: 'marketingCampaignService',
        pattern: 'transformation_schema',
        operation: 'scheduleCampaign'
      });

      return { success: true, data: response };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Scheduling failed';
      
      ValidationMonitor.recordValidationError({
        context: 'MarketingCampaignService.scheduleCampaign',
        errorCode: 'CAMPAIGN_SCHEDULING_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get campaigns by status with role-based access
   */
  static async getCampaignsByStatus(
    status: CampaignStatusType,
    pagination: PaginationOptions,
    userId: string
  ): Promise<ServiceResponse<PaginatedResponse<MarketingCampaignTransform>>> {
    try {
      // Validate permissions
      const hasPermission = await RolePermissionService.hasPermission(
        userId, 
        'campaign_management'
      );
      if (!hasPermission) {
        ValidationMonitor.recordValidationError({
          context: 'MarketingCampaignService.getCampaignsByStatus',
          errorCode: 'INSUFFICIENT_PERMISSIONS',
          validationPattern: 'transformation_schema',
          errorMessage: 'Insufficient permissions'
        });
        return { success: false, error: 'Insufficient permissions for campaign access' };
      }

      const offset = (pagination.page - 1) * pagination.limit;

      // Get total count
      const { count } = await supabase
        .from('marketing_campaigns')
        .select('id', { count: 'exact' })
        .eq('campaign_status', status);

      // Get paginated results
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('campaign_status', status)
        .order('updated_at', { ascending: false })
        .range(offset, offset + pagination.limit - 1);

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'MarketingCampaignService.getCampaignsByStatus',
          errorCode: 'STATUS_QUERY_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: error.message
        });
        return { success: false, error: error.message };
      }

      // Transform results
      const transformedItems = (data || []).map(item => 
        MarketingCampaignTransformSchema.parse(item)
      );

      const totalCount = count || 0;
      const hasMore = offset + pagination.limit < totalCount;

      const response: PaginatedResponse<MarketingCampaignTransform> = {
        items: transformedItems,
        totalCount,
        hasMore,
        page: pagination.page,
        limit: pagination.limit
      };

      ValidationMonitor.recordPatternSuccess({
        service: 'marketingCampaignService',
        pattern: 'transformation_schema',
        operation: 'getCampaignsByStatus'
      });

      return { success: true, data: response };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Query failed';
      
      ValidationMonitor.recordValidationError({
        context: 'MarketingCampaignService.getCampaignsByStatus',
        errorCode: 'STATUS_QUERY_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Record campaign metric with analytics collection
   */
  static async recordCampaignMetric(
    campaignId: string,
    metricType: 'views' | 'clicks' | 'conversions' | 'revenue',
    metricValue: number,
    productId: string | undefined,
    userId: string
  ): Promise<ServiceResponse<{ id: string; metricType: string; metricValue: number }>> {
    try {
      // Validate metric type
      const validMetricTypes = ['views', 'clicks', 'conversions', 'revenue'];
      if (!validMetricTypes.includes(metricType)) {
        return { success: false, error: 'Invalid metric type' };
      }

      // Insert metric record
      const { data, error } = await supabase
        .from('campaign_metrics')
        .insert({
          campaign_id: campaignId,
          metric_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
          metric_type: metricType,
          metric_value: metricValue,
          product_id: productId || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error || !data) {
        ValidationMonitor.recordValidationError({
          context: 'MarketingCampaignService.recordCampaignMetric',
          errorCode: 'METRIC_RECORDING_FAILED',
          validationPattern: 'direct_schema',
          errorMessage: error?.message || 'Insert failed'
        });
        return { success: false, error: error?.message || 'Failed to record metric' };
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'marketingCampaignService',
        pattern: 'direct_supabase_query',
        operation: 'recordCampaignMetric'
      });

      return { 
        success: true, 
        data: { 
          id: data.id,
          metricType: data.metric_type,
          metricValue: Number(data.metric_value)
        } 
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Metric recording failed';
      
      ValidationMonitor.recordValidationError({
        context: 'MarketingCampaignService.recordCampaignMetric',
        errorCode: 'METRIC_RECORDING_FAILED',
        validationPattern: 'direct_schema',
        errorMessage
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get campaign details for bundle/content integration
   */
  static async getCampaignDetails(
    campaignId: string,
    userId: string
  ): Promise<ServiceResponse<MarketingCampaignTransform>> {
    try {
      // Validate permissions
      const hasPermission = await RolePermissionService.hasPermission(
        userId, 
        'campaign_management'
      );
      if (!hasPermission) {
        return { success: false, error: 'Insufficient permissions for campaign access' };
      }

      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error || !data) {
        const errorMessage = error?.code === 'PGRST116' ? 'Campaign not found' : 'Database query failed';
        return { success: false, error: errorMessage };
      }

      // Transform response
      const transformedCampaign = MarketingCampaignTransformSchema.parse(data);

      ValidationMonitor.recordPatternSuccess({
        service: 'marketingCampaignService',
        pattern: 'transformation_schema',
        operation: 'getCampaignDetails'
      });

      return { success: true, data: transformedCampaign };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Query failed';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get analytics data for executive insights
   */
  static async getAnalyticsData(
    campaignId: string,
    options: AnalyticsOptions,
    userId: string
  ): Promise<ServiceResponse<AnalyticsResponse>> {
    try {
      // Validate permissions (executives and admins can view analytics)
      const hasPermission = await RolePermissionService.hasPermission(
        userId, 
        'executive_analytics'
      ) || await RolePermissionService.hasPermission(
        userId, 
        'campaign_management'
      );

      if (!hasPermission) {
        return { success: false, error: 'Insufficient permissions for analytics access' };
      }

      // Get campaign metrics for date range
      const { data: metrics, error } = await supabase
        .from('campaign_metrics')
        .select('*')
        .eq('campaign_id', campaignId)
        .gte('metric_date', options.startDate.split('T')[0])
        .lte('metric_date', options.endDate.split('T')[0])
        .order('metric_date');

      if (error) {
        return { success: false, error: error.message };
      }

      // Aggregate total metrics
      const totalMetrics: CampaignMetrics = {
        views: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0
      };

      // Group by date for trends
      const dailyMetricsMap = new Map<string, CampaignMetrics>();

      (metrics || []).forEach(metric => {
        // Aggregate totals
        if (metric.metric_type in totalMetrics) {
          totalMetrics[metric.metric_type as keyof CampaignMetrics] += Number(metric.metric_value);
        }

        // Group by date
        const date = metric.metric_date;
        if (!dailyMetricsMap.has(date)) {
          dailyMetricsMap.set(date, { views: 0, clicks: 0, conversions: 0, revenue: 0 });
        }
        const dailyMetrics = dailyMetricsMap.get(date)!;
        if (metric.metric_type in dailyMetrics) {
          dailyMetrics[metric.metric_type as keyof CampaignMetrics] += Number(metric.metric_value);
        }
      });

      // Convert daily metrics to array
      const dailyMetrics = Array.from(dailyMetricsMap.entries()).map(([date, metrics]) => ({
        date,
        metrics
      }));

      // Calculate projections if requested
      let projections;
      if (options.includeProjections && dailyMetrics.length > 0) {
        const avgDailyRevenue = totalMetrics.revenue / Math.max(dailyMetrics.length, 1);
        const avgDailyConversions = totalMetrics.conversions / Math.max(dailyMetrics.length, 1);
        
        projections = {
          expectedRevenue: avgDailyRevenue * 30, // 30-day projection
          expectedConversions: avgDailyConversions * 30,
          confidenceLevel: Math.min(95, Math.max(60, dailyMetrics.length * 10)) // Confidence based on data points
        };
      }

      const analytics: CampaignAnalytics = {
        totalMetrics,
        trends: {
          dailyMetrics
        },
        projections
      };

      const response: AnalyticsResponse = {
        campaignId,
        analytics
      };

      ValidationMonitor.recordPatternSuccess({
        service: 'marketingCampaignService',
        pattern: 'direct_supabase_query',
        operation: 'getAnalyticsData'
      });

      return { success: true, data: response };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analytics query failed';
      
      ValidationMonitor.recordValidationError({
        context: 'MarketingCampaignService.getAnalyticsData',
        errorCode: 'ANALYTICS_QUERY_FAILED',
        validationPattern: 'direct_schema',
        errorMessage
      });

      return { success: false, error: errorMessage };
    }
  }
}