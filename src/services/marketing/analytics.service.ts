import { supabase } from '../../config/supabase';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { ServiceError, DatabaseError } from './errors/ServiceError';
import { unifiedRoleService } from '../unifiedRoleService';
import { orderAnalyticsService } from '../analytics/orderAnalytics.service';

interface AnalyticsTimeRange {
  start: Date;
  end: Date;
}

interface CampaignAnalytics {
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roi: number;
  ctr: number;
  conversionRate: number;
  costPerConversion: number;
}

interface ContentAnalytics {
  contentId: string;
  contentTitle: string;
  views: number;
  engagementRate: number;
  shareCount: number;
  averageTimeOnPage: number;
}

interface BundleAnalytics {
  bundleId: string;
  bundleName: string;
  unitsSold: number;
  revenue: number;
  averageOrderValue: number;
  conversionRate: number;
}

interface RevenueMetrics {
  totalRevenue: number;
  revenueByChannel: Record<string, number>;
  revenueGrowth: number;
  averageOrderValue: number;
  lifetimeValue: number;
}

interface OrderAttributionData {
  orderId: string;
  orderValue: number;
  customerId: string;
  customerSegment: string;
  attributionSource: 'campaign' | 'content' | 'bundle' | 'organic' | 'direct';
  sourceId: string | null;
  sourceName: string | null;
  conversionPath: string[];
  timeToConversion: number; // minutes
  createdAt: string;
}

interface CampaignOrderAttribution {
  campaignId: string;
  campaignName: string;
  totalAttributedOrders: number;
  totalAttributedRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  timeToConversion: {
    average: number;
    median: number;
    min: number;
    max: number;
  };
  customerSegmentBreakdown: Record<string, {
    orders: number;
    revenue: number;
    percentage: number;
  }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

interface ContentOrderAttribution {
  contentId: string;
  contentTitle: string;
  totalAttributedOrders: number;
  totalAttributedRevenue: number;
  conversionImpact: number; // percentage contribution to total conversions
  averageInfluenceTime: number; // how long between content view and order
  topInfluencedProducts: Array<{
    productId: string;
    productName: string;
    influenceCount: number;
  }>;
}

interface DashboardAnalytics {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    conversionRate: number;
  };
  campaigns: CampaignAnalytics[];
  content: ContentAnalytics[];
  bundles: BundleAnalytics[];
  revenue: RevenueMetrics;
  orderAttribution: {
    campaigns: CampaignOrderAttribution[];
    content: ContentOrderAttribution[];
    attributionSummary: {
      campaignDriven: number;
      contentDriven: number;
      bundleDriven: number;
      organic: number;
      direct: number;
    };
  };
}

export class MarketingAnalyticsService {
  /**
   * Get comprehensive marketing dashboard analytics with order attribution
   */
  async getDashboardAnalytics(
    timeRange?: AnalyticsTimeRange,
    options?: { userId?: string }
  ): Promise<DashboardAnalytics> {
    try {
      const startTime = Date.now();
      const range = timeRange || this.getDefaultTimeRange();

      // Permission check for marketing analytics access
      if (options?.userId) {
        const hasPermission = await unifiedRoleService.hasPermission(
          options.userId,
          'campaigns:view'
        );

        if (!hasPermission) {
          throw new ServiceError(
            'Insufficient permissions for marketing analytics access',
            'PERMISSION_DENIED',
            403
          );
        }
      }

      // Fetch all analytics data in parallel, including order attribution
      const [overview, campaigns, content, bundles, revenue, orderAttribution] = await Promise.all([
        this.getOverviewMetrics(range),
        this.getCampaignAnalytics(range),
        this.getContentAnalytics(range),
        this.getBundleAnalytics(range),
        this.getRevenueMetrics(range),
        this.getOrderAttributionAnalytics(range),
      ]);

      ValidationMonitor.recordPatternSuccess({
        service: 'MarketingAnalyticsService',
        pattern: 'direct_supabase_query',
        operation: 'getDashboardAnalytics',
        performanceMs: Date.now() - startTime
      });

      return {
        overview,
        campaigns,
        content,
        bundles,
        revenue,
        orderAttribution,
      };
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'MarketingAnalyticsService.getDashboardAnalytics',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'ANALYTICS_FETCH_FAILED',
        validationPattern: 'direct_supabase_query'
      });
      throw error;
    }
  }

  /**
   * Get overview metrics
   */
  private async getOverviewMetrics(timeRange: AnalyticsTimeRange) {
    try {
      // Get order metrics
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, total_amount, created_at')
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());

      if (orderError) throw new DatabaseError(orderError);

      const totalOrders = orderData?.length || 0;
      const totalRevenue = orderData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Get conversion metrics (simplified - you might want to track this separately)
      const { data: visitorData, error: visitorError } = await supabase
        .from('analytics_events')
        .select('id')
        .eq('event_type', 'page_view')
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());

      if (visitorError) throw new DatabaseError(visitorError);

      const totalVisitors = visitorData?.length || 1; // Prevent division by zero
      const conversionRate = (totalOrders / totalVisitors) * 100;

      return {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        conversionRate,
      };
    } catch (error) {
      throw new ServiceError(`Failed to get overview metrics: ${error}`, 'ANALYTICS_ERROR', 500);
    }
  }

  /**
   * Get campaign analytics
   */
  private async getCampaignAnalytics(timeRange: AnalyticsTimeRange): Promise<CampaignAnalytics[]> {
    try {
      // Get active campaigns
      const { data: campaigns, error: campaignError } = await supabase
        .from('marketing_campaigns')
        .select('id, campaign_name, campaign_status')
        .eq('campaign_status', 'active')
        .gte('start_date', timeRange.start.toISOString())
        .lte('end_date', timeRange.end.toISOString());

      if (campaignError) throw new DatabaseError(campaignError);

      // Get analytics for each campaign
      const analyticsPromises = (campaigns || []).map(async (campaign) => {
        // Fetch campaign-specific analytics (you might have a separate analytics table)
        const { data: analyticsData, error } = await supabase
          .from('campaign_analytics')
          .select('impressions, clicks, conversions, revenue, cost')
          .eq('campaign_id', campaign.id)
          .gte('date', timeRange.start.toISOString())
          .lte('date', timeRange.end.toISOString());

        if (error) {
          console.error(`Error fetching analytics for campaign ${campaign.id}:`, error);
          // Return default values if analytics fetch fails
          return this.getDefaultCampaignAnalytics(campaign.id, campaign.campaign_name);
        }

        // Aggregate the data
        const totals = analyticsData?.reduce(
          (acc, curr) => ({
            impressions: acc.impressions + (curr.impressions || 0),
            clicks: acc.clicks + (curr.clicks || 0),
            conversions: acc.conversions + (curr.conversions || 0),
            revenue: acc.revenue + (curr.revenue || 0),
            cost: acc.cost + (curr.cost || 0),
          }),
          { impressions: 0, clicks: 0, conversions: 0, revenue: 0, cost: 0 }
        ) || { impressions: 0, clicks: 0, conversions: 0, revenue: 0, cost: 0 };

        return {
          campaignId: campaign.id,
          campaignName: campaign.campaign_name,
          impressions: totals.impressions,
          clicks: totals.clicks,
          conversions: totals.conversions,
          revenue: totals.revenue,
          roi: totals.cost > 0 ? ((totals.revenue - totals.cost) / totals.cost) * 100 : 0,
          ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
          conversionRate: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
          costPerConversion: totals.conversions > 0 ? totals.cost / totals.conversions : 0,
        };
      });

      return Promise.all(analyticsPromises);
    } catch (error) {
      throw new ServiceError(`Failed to get campaign analytics: ${error}`, 'ANALYTICS_ERROR', 500);
    }
  }

  /**
   * Get content analytics
   */
  private async getContentAnalytics(timeRange: AnalyticsTimeRange): Promise<ContentAnalytics[]> {
    try {
      // Get published content
      const { data: content, error: contentError } = await supabase
        .from('product_content')
        .select('id, title')
        .eq('workflow_state', 'published')
        .gte('published_at', timeRange.start.toISOString())
        .lte('published_at', timeRange.end.toISOString());

      if (contentError) throw new DatabaseError(contentError);

      // Get analytics for each content piece
      const analyticsPromises = (content || []).map(async (item: any) => {
        // Fetch content-specific analytics
        const { data: analyticsData, error } = await supabase
          .from('content_analytics')
          .select('views, engagement_rate, shares, time_on_page')
          .eq('content_id', item.id)
          .gte('date', timeRange.start.toISOString())
          .lte('date', timeRange.end.toISOString());

        if (error) {
          console.error(`Error fetching analytics for content ${item.id}:`, error);
          // Return default values
          return this.getDefaultContentAnalytics(item.id, item.title);
        }

        // Aggregate the data
        const totals = analyticsData?.reduce(
          (acc, curr) => ({
            views: acc.views + (curr.views || 0),
            engagementRate: acc.engagementRate + (curr.engagement_rate || 0),
            shares: acc.shares + (curr.shares || 0),
            timeOnPage: acc.timeOnPage + (curr.time_on_page || 0),
            count: acc.count + 1,
          }),
          { views: 0, engagementRate: 0, shares: 0, timeOnPage: 0, count: 0 }
        ) || { views: 0, engagementRate: 0, shares: 0, timeOnPage: 0, count: 0 };

        return {
          contentId: item.id,
          contentTitle: item.title,
          views: totals.views,
          engagementRate: totals.count > 0 ? totals.engagementRate / totals.count : 0,
          shareCount: totals.shares,
          averageTimeOnPage: totals.count > 0 ? totals.timeOnPage / totals.count : 0,
        };
      });

      return Promise.all(analyticsPromises);
    } catch (error) {
      throw new ServiceError(`Failed to get content analytics: ${error}`, 'ANALYTICS_ERROR', 500);
    }
  }

  /**
   * Get bundle analytics
   */
  private async getBundleAnalytics(timeRange: AnalyticsTimeRange): Promise<BundleAnalytics[]> {
    try {
      // Get active bundles
      const { data: bundles, error: bundleError } = await supabase
        .from('product_bundles')
        .select('id, name')
        .eq('is_active', true);

      if (bundleError) throw new DatabaseError(bundleError);

      // Get sales data for each bundle
      const analyticsPromises = (bundles || []).map(async (bundle) => {
        // Fetch bundle sales data
        const { data: salesData, error } = await supabase
          .from('order_items')
          .select('quantity, price')
          .eq('bundle_id', bundle.id)
          .gte('created_at', timeRange.start.toISOString())
          .lte('created_at', timeRange.end.toISOString());

        if (error) {
          console.error(`Error fetching sales for bundle ${bundle.id}:`, error);
          // Return default values
          return this.getDefaultBundleAnalytics(bundle.id, bundle.name);
        }

        const totals = salesData?.reduce(
          (acc, curr) => ({
            unitsSold: acc.unitsSold + (curr.quantity || 0),
            revenue: acc.revenue + ((curr.price || 0) * (curr.quantity || 0)),
            orderCount: acc.orderCount + 1,
          }),
          { unitsSold: 0, revenue: 0, orderCount: 0 }
        ) || { unitsSold: 0, revenue: 0, orderCount: 0 };

        return {
          bundleId: bundle.id,
          bundleName: bundle.name,
          unitsSold: totals.unitsSold,
          revenue: totals.revenue,
          averageOrderValue: totals.orderCount > 0 ? totals.revenue / totals.orderCount : 0,
          conversionRate: 0, // Would need visitor data to calculate
        };
      });

      return Promise.all(analyticsPromises);
    } catch (error) {
      throw new ServiceError(`Failed to get bundle analytics: ${error}`, 'ANALYTICS_ERROR', 500);
    }
  }

  /**
   * Get revenue metrics
   */
  private async getRevenueMetrics(timeRange: AnalyticsTimeRange): Promise<RevenueMetrics> {
    try {
      // Get current period revenue
      const { data: currentRevenue, error: currentError } = await supabase
        .from('orders')
        .select('total_amount, channel')
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());

      if (currentError) throw new DatabaseError(currentError);

      // Get previous period revenue for growth calculation
      const previousRange = this.getPreviousTimeRange(timeRange);
      const { data: previousRevenue, error: previousError } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', previousRange.start.toISOString())
        .lte('created_at', previousRange.end.toISOString());

      if (previousError) throw new DatabaseError(previousError);

      const totalRevenue = currentRevenue?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const previousTotal = previousRevenue?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      // Calculate revenue by channel
      const revenueByChannel: Record<string, number> = {};
      currentRevenue?.forEach(order => {
        const channel = order.channel || 'direct';
        revenueByChannel[channel] = (revenueByChannel[channel] || 0) + (order.total_amount || 0);
      });

      // Calculate growth
      const revenueGrowth = previousTotal > 0
        ? ((totalRevenue - previousTotal) / previousTotal) * 100
        : 0;

      // Calculate average order value
      const orderCount = currentRevenue?.length || 1;
      const averageOrderValue = totalRevenue / orderCount;

      // Simplified lifetime value (would need more customer data in production)
      const lifetimeValue = averageOrderValue * 3; // Simplified assumption

      return {
        totalRevenue,
        revenueByChannel,
        revenueGrowth,
        averageOrderValue,
        lifetimeValue,
      };
    } catch (error) {
      throw new ServiceError(`Failed to get revenue metrics: ${error}`, 'ANALYTICS_ERROR', 500);
    }
  }

  /**
   * Get order attribution insights for marketing teams
   * Public method for accessing attribution analytics with proper permissions
   */
  async getOrderAttributionInsights(
    timeRange?: AnalyticsTimeRange,
    options?: { userId?: string }
  ): Promise<{
    campaigns: CampaignOrderAttribution[];
    content: ContentOrderAttribution[];
    attributionSummary: {
      campaignDriven: number;
      contentDriven: number;
      bundleDriven: number;
      organic: number;
      direct: number;
    };
    insights: {
      topPerformingCampaigns: CampaignOrderAttribution[];
      topInfluentialContent: ContentOrderAttribution[];
      recommendations: Array<{
        type: 'campaign' | 'content' | 'general';
        priority: 'high' | 'medium' | 'low';
        message: string;
        action: string;
      }>;
    };
  }> {
    try {
      const startTime = Date.now();
      const range = timeRange || this.getDefaultTimeRange();

      // Permission check for marketing analytics access
      if (options?.userId) {
        const hasPermission = await unifiedRoleService.hasPermission(
          options.userId,
          'campaigns:view'
        );

        if (!hasPermission) {
          throw new ServiceError(
            'Insufficient permissions for order attribution insights',
            'PERMISSION_DENIED',
            403
          );
        }
      }

      // Get attribution analytics
      const attributionData = await this.getOrderAttributionAnalytics(range);

      // Generate insights and recommendations
      const insights = this.generateAttributionInsights(attributionData);

      ValidationMonitor.recordPatternSuccess({
        service: 'MarketingAnalyticsService',
        pattern: 'direct_supabase_query',
        operation: 'getOrderAttributionInsights',
        performanceMs: Date.now() - startTime
      });

      return {
        ...attributionData,
        insights
      };

    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'MarketingAnalyticsService.getOrderAttributionInsights',
        errorCode: 'ATTRIBUTION_INSIGHTS_FAILED',
        validationPattern: 'direct_supabase_query',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get order attribution analytics following monitoring patterns
   * Connects marketing campaigns and content to actual order data
   */
  private async getOrderAttributionAnalytics(timeRange: AnalyticsTimeRange) {
    try {
      const startTime = Date.now();

      // Get order attribution data using resilient processing pattern
      const orderAttributions = await this.fetchOrderAttributionData(timeRange);

      // Process campaign attributions
      const campaignAttributions = await this.processCampaignAttributions(orderAttributions);

      // Process content attributions
      const contentAttributions = await this.processContentAttributions(orderAttributions);

      // Generate attribution summary
      const attributionSummary = this.generateAttributionSummary(orderAttributions);

      ValidationMonitor.recordPatternSuccess({
        service: 'MarketingAnalyticsService',
        pattern: 'resilient_processing',
        operation: 'getOrderAttributionAnalytics',
        performanceMs: Date.now() - startTime
      });

      return {
        campaigns: campaignAttributions,
        content: contentAttributions,
        attributionSummary
      };

    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'MarketingAnalyticsService.getOrderAttributionAnalytics',
        errorCode: 'ORDER_ATTRIBUTION_FAILED',
        validationPattern: 'resilient_processing',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Fetch order attribution data with resilient processing
   * Following skip-on-error pattern for individual order processing
   */
  private async fetchOrderAttributionData(timeRange: AnalyticsTimeRange): Promise<OrderAttributionData[]> {
    // Get orders with basic attribution information
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        user_id,
        created_at,
        customer_email,
        customer_name,
        order_items (
          id,
          product_id,
          product_name,
          quantity,
          total_price
        )
      `)
      .gte('created_at', timeRange.start.toISOString())
      .lte('created_at', timeRange.end.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw new DatabaseError(error);
    }

    const attributions: OrderAttributionData[] = [];
    let processedCount = 0;
    let skippedCount = 0;

    // Process each order with resilient error handling
    for (const order of orders || []) {
      try {
        // Determine attribution source through various methods
        const attribution = await this.determineOrderAttribution(order);

        if (attribution) {
          attributions.push(attribution);
          processedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        ValidationMonitor.recordValidationError({
          context: 'MarketingAnalyticsService.fetchOrderAttributionData',
          errorCode: 'ORDER_ATTRIBUTION_PROCESSING_FAILED',
          validationPattern: 'resilient_processing',
          errorMessage: `Failed to process order ${order.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        skippedCount++;
        // Continue processing other orders (skip-on-error pattern)
      }
    }

    ValidationMonitor.recordPatternSuccess({
      service: 'MarketingAnalyticsService',
      pattern: 'resilient_processing',
      operation: 'fetchOrderAttributionData',
      description: `Processed ${processedCount} orders, skipped ${skippedCount} due to errors`
    });

    return attributions;
  }

  /**
   * Determine attribution source for an order using multiple signals
   * Following monitoring patterns for comprehensive attribution tracking
   */
  private async determineOrderAttribution(order: any): Promise<OrderAttributionData | null> {
    const orderId = order.id;
    const customerId = order.user_id || order.customer_email;

    // Check for direct campaign attribution (highest priority)
    const campaignAttribution = await this.checkCampaignAttribution(orderId, customerId);
    if (campaignAttribution) {
      return {
        orderId,
        orderValue: order.total_amount || 0,
        customerId,
        customerSegment: await this.determineCustomerSegment(order),
        attributionSource: 'campaign',
        sourceId: campaignAttribution.campaignId,
        sourceName: campaignAttribution.campaignName,
        conversionPath: campaignAttribution.path,
        timeToConversion: campaignAttribution.timeToConversion,
        createdAt: order.created_at
      };
    }

    // Check for content attribution (medium priority)
    const contentAttribution = await this.checkContentAttribution(orderId, customerId);
    if (contentAttribution) {
      return {
        orderId,
        orderValue: order.total_amount || 0,
        customerId,
        customerSegment: await this.determineCustomerSegment(order),
        attributionSource: 'content',
        sourceId: contentAttribution.contentId,
        sourceName: contentAttribution.contentTitle,
        conversionPath: contentAttribution.path,
        timeToConversion: contentAttribution.timeToConversion,
        createdAt: order.created_at
      };
    }

    // Check for bundle attribution
    const bundleAttribution = await this.checkBundleAttribution(order);
    if (bundleAttribution) {
      return {
        orderId,
        orderValue: order.total_amount || 0,
        customerId,
        customerSegment: await this.determineCustomerSegment(order),
        attributionSource: 'bundle',
        sourceId: bundleAttribution.bundleId,
        sourceName: bundleAttribution.bundleName,
        conversionPath: ['bundle_view', 'order'],
        timeToConversion: 0, // Immediate for bundle purchases
        createdAt: order.created_at
      };
    }

    // Default to direct attribution
    return {
      orderId,
      orderValue: order.total_amount || 0,
      customerId,
      customerSegment: await this.determineCustomerSegment(order),
      attributionSource: 'direct',
      sourceId: null,
      sourceName: null,
      conversionPath: ['direct'],
      timeToConversion: 0,
      createdAt: order.created_at
    };
  }

  /**
   * Check for campaign attribution by looking at user interaction history
   */
  private async checkCampaignAttribution(orderId: string, customerId: string): Promise<any> {
    // Look for campaign interactions in the last 30 days before order
    const { data: interactions, error } = await supabase
      .from('user_campaign_interactions')
      .select(`
        campaign_id,
        interaction_type,
        created_at,
        campaigns:campaign_id (
          id,
          campaign_name
        )
      `)
      .eq('user_id', customerId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !interactions?.length) {
      return null;
    }

    // Find the most recent relevant interaction
    const relevantInteraction = interactions[0];

    return {
      campaignId: relevantInteraction.campaign_id,
      campaignName: (relevantInteraction as any).campaigns?.campaign_name || 'Unknown Campaign',
      path: [relevantInteraction.interaction_type, 'order'],
      timeToConversion: 0 // Would calculate from interaction timestamp
    };
  }

  /**
   * Check for content attribution by looking at content engagement
   */
  private async checkContentAttribution(orderId: string, customerId: string): Promise<any> {
    // Look for content views that may have influenced the purchase
    const { data: contentViews, error } = await supabase
      .from('content_engagement_log')
      .select(`
        content_id,
        engagement_type,
        created_at,
        content:content_id (
          id,
          title
        )
      `)
      .eq('user_id', customerId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error || !contentViews?.length) {
      return null;
    }

    const relevantContent = contentViews[0];

    return {
      contentId: relevantContent.content_id,
      contentTitle: (relevantContent as any).content?.title || 'Unknown Content',
      path: ['content_view', 'order'],
      timeToConversion: 0 // Would calculate from view timestamp
    };
  }

  /**
   * Check for bundle attribution by analyzing order items
   */
  private async checkBundleAttribution(order: any): Promise<any> {
    const orderItems = order.order_items || [];

    // Check if any order items are part of bundles
    for (const item of orderItems) {
      const { data: bundleData, error } = await supabase
        .from('product_bundle_items')
        .select(`
          bundle_id,
          bundles:bundle_id (
            id,
            name
          )
        `)
        .eq('product_id', item.product_id)
        .limit(1);

      if (!error && bundleData?.length) {
        const bundle = bundleData[0];
        return {
          bundleId: bundle.bundle_id,
          bundleName: (bundle as any).bundles?.name || 'Unknown Bundle'
        };
      }
    }

    return null;
  }

  /**
   * Determine customer segment based on order history and value
   */
  private async determineCustomerSegment(order: any): Promise<string> {
    const customerId = order.user_id || order.customer_email;

    // Get customer's order history
    const { data: orderHistory, error } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('user_id', customerId)
      .neq('id', order.id);

    if (error || !orderHistory?.length) {
      return 'new_customer';
    }

    const totalHistoryValue = orderHistory.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const averageOrderValue = totalHistoryValue / orderHistory.length;

    if (totalHistoryValue > 200) return 'high_value';
    if (averageOrderValue > 50) return 'premium';
    if (orderHistory.length > 3) return 'regular';
    return 'occasional';
  }

  /**
   * Process campaign attributions to generate attribution analytics
   */
  private async processCampaignAttributions(attributions: OrderAttributionData[]): Promise<CampaignOrderAttribution[]> {
    const campaignData = new Map<string, {
      orders: OrderAttributionData[];
      campaignName: string;
    }>();

    // Group attributions by campaign
    attributions
      .filter(attr => attr.attributionSource === 'campaign' && attr.sourceId)
      .forEach(attr => {
        if (!campaignData.has(attr.sourceId!)) {
          campaignData.set(attr.sourceId!, {
            orders: [],
            campaignName: attr.sourceName || 'Unknown Campaign'
          });
        }
        campaignData.get(attr.sourceId!)!.orders.push(attr);
      });

    // Process each campaign's attribution data
    const results: CampaignOrderAttribution[] = [];

    for (const [campaignId, data] of Array.from(campaignData.entries())) {
      const orders = data.orders;
      const totalRevenue = orders.reduce((sum, order) => sum + order.orderValue, 0);

      // Calculate time to conversion metrics
      const conversionTimes = orders.map(o => o.timeToConversion).filter(t => t > 0);
      const timeMetrics = {
        average: conversionTimes.length ? conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length : 0,
        median: conversionTimes.length ? conversionTimes[Math.floor(conversionTimes.length / 2)] : 0,
        min: conversionTimes.length ? Math.min(...conversionTimes) : 0,
        max: conversionTimes.length ? Math.max(...conversionTimes) : 0
      };

      // Calculate customer segment breakdown
      const segmentBreakdown: Record<string, { orders: number; revenue: number; percentage: number }> = {};
      orders.forEach(order => {
        if (!segmentBreakdown[order.customerSegment]) {
          segmentBreakdown[order.customerSegment] = { orders: 0, revenue: 0, percentage: 0 };
        }
        segmentBreakdown[order.customerSegment].orders++;
        segmentBreakdown[order.customerSegment].revenue += order.orderValue;
      });

      // Calculate percentages
      Object.keys(segmentBreakdown).forEach(segment => {
        segmentBreakdown[segment].percentage = (segmentBreakdown[segment].orders / orders.length) * 100;
      });

      results.push({
        campaignId,
        campaignName: data.campaignName,
        totalAttributedOrders: orders.length,
        totalAttributedRevenue: totalRevenue,
        averageOrderValue: orders.length ? totalRevenue / orders.length : 0,
        conversionRate: 0, // Would need additional data to calculate
        timeToConversion: timeMetrics,
        customerSegmentBreakdown: segmentBreakdown,
        topProducts: [] // Would need to analyze order items
      });
    }

    return results;
  }

  /**
   * Process content attributions to generate content attribution analytics
   */
  private async processContentAttributions(attributions: OrderAttributionData[]): Promise<ContentOrderAttribution[]> {
    const contentData = new Map<string, {
      orders: OrderAttributionData[];
      contentTitle: string;
    }>();

    // Group attributions by content
    attributions
      .filter(attr => attr.attributionSource === 'content' && attr.sourceId)
      .forEach(attr => {
        if (!contentData.has(attr.sourceId!)) {
          contentData.set(attr.sourceId!, {
            orders: [],
            contentTitle: attr.sourceName || 'Unknown Content'
          });
        }
        contentData.get(attr.sourceId!)!.orders.push(attr);
      });

    const results: ContentOrderAttribution[] = [];
    const totalAttributedOrders = attributions.filter(attr => attr.attributionSource === 'content').length;

    for (const [contentId, data] of Array.from(contentData.entries())) {
      const orders = data.orders;
      const totalRevenue = orders.reduce((sum, order) => sum + order.orderValue, 0);

      results.push({
        contentId,
        contentTitle: data.contentTitle,
        totalAttributedOrders: orders.length,
        totalAttributedRevenue: totalRevenue,
        conversionImpact: totalAttributedOrders > 0 ? (orders.length / totalAttributedOrders) * 100 : 0,
        averageInfluenceTime: orders.reduce((sum, o) => sum + o.timeToConversion, 0) / orders.length || 0,
        topInfluencedProducts: [] // Would need to analyze order items
      });
    }

    return results;
  }

  /**
   * Generate actionable insights from attribution data
   * Following monitoring patterns for business intelligence recommendations
   */
  private generateAttributionInsights(attributionData: any) {
    const { campaigns, content, attributionSummary } = attributionData;

    // Identify top performing campaigns by revenue
    const topPerformingCampaigns = campaigns
      .sort((a: CampaignOrderAttribution, b: CampaignOrderAttribution) => b.totalAttributedRevenue - a.totalAttributedRevenue)
      .slice(0, 5);

    // Identify most influential content by conversion impact
    const topInfluentialContent = content
      .sort((a: ContentOrderAttribution, b: ContentOrderAttribution) => b.conversionImpact - a.conversionImpact)
      .slice(0, 5);

    // Generate actionable recommendations
    const recommendations = [];

    // Campaign recommendations
    if (attributionSummary.campaignDriven < 30) {
      recommendations.push({
        type: 'campaign' as const,
        priority: 'high' as const,
        message: 'Campaign-driven conversions are below 30%. Consider increasing campaign budget or improving targeting.',
        action: 'Review campaign strategy and budget allocation'
      });
    }

    if (topPerformingCampaigns.length > 0) {
      const topCampaign = topPerformingCampaigns[0];
      if (topCampaign.totalAttributedRevenue > 1000) {
        recommendations.push({
          type: 'campaign' as const,
          priority: 'medium' as const,
          message: `Campaign "${topCampaign.campaignName}" generated $${topCampaign.totalAttributedRevenue.toFixed(2)} in attributed revenue. Consider scaling similar campaigns.`,
          action: `Analyze and replicate success factors from ${topCampaign.campaignName}`
        });
      }
    }

    // Content recommendations
    if (attributionSummary.contentDriven < 20) {
      recommendations.push({
        type: 'content' as const,
        priority: 'medium' as const,
        message: 'Content-driven conversions are below 20%. Consider creating more engaging content or improving content distribution.',
        action: 'Audit content performance and create new content strategy'
      });
    }

    if (topInfluentialContent.length > 0) {
      const topContent = topInfluentialContent[0];
      if (topContent.conversionImpact > 15) {
        recommendations.push({
          type: 'content' as const,
          priority: 'low' as const,
          message: `Content "${topContent.contentTitle}" has ${topContent.conversionImpact.toFixed(1)}% conversion impact. Consider creating similar content.`,
          action: `Create content similar to ${topContent.contentTitle}`
        });
      }
    }

    // General recommendations
    if (attributionSummary.direct > 60) {
      recommendations.push({
        type: 'general' as const,
        priority: 'high' as const,
        message: 'Over 60% of orders are direct attribution. This may indicate poor attribution tracking or low marketing impact.',
        action: 'Improve attribution tracking and increase marketing touchpoints'
      });
    }

    return {
      topPerformingCampaigns,
      topInfluentialContent,
      recommendations
    };
  }

  /**
   * Generate attribution summary across all sources
   */
  private generateAttributionSummary(attributions: OrderAttributionData[]) {
    const total = attributions.length;
    if (total === 0) {
      return {
        campaignDriven: 0,
        contentDriven: 0,
        bundleDriven: 0,
        organic: 0,
        direct: 0
      };
    }

    const summary = {
      campaignDriven: (attributions.filter(a => a.attributionSource === 'campaign').length / total) * 100,
      contentDriven: (attributions.filter(a => a.attributionSource === 'content').length / total) * 100,
      bundleDriven: (attributions.filter(a => a.attributionSource === 'bundle').length / total) * 100,
      organic: (attributions.filter(a => a.attributionSource === 'organic').length / total) * 100,
      direct: (attributions.filter(a => a.attributionSource === 'direct').length / total) * 100
    };

    return summary;
  }

  /**
   * Get default time range (last 30 days)
   */
  private getDefaultTimeRange(): AnalyticsTimeRange {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end };
  }

  /**
   * Get previous time range for comparison
   */
  private getPreviousTimeRange(current: AnalyticsTimeRange): AnalyticsTimeRange {
    const duration = current.end.getTime() - current.start.getTime();
    return {
      start: new Date(current.start.getTime() - duration),
      end: new Date(current.start.getTime()),
    };
  }

  /**
   * Default values when analytics data is not available
   */
  private getDefaultCampaignAnalytics(id: string, name: string): CampaignAnalytics {
    return {
      campaignId: id,
      campaignName: name,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      roi: 0,
      ctr: 0,
      conversionRate: 0,
      costPerConversion: 0,
    };
  }

  private getDefaultContentAnalytics(id: string, title: string): ContentAnalytics {
    return {
      contentId: id,
      contentTitle: title,
      views: 0,
      engagementRate: 0,
      shareCount: 0,
      averageTimeOnPage: 0,
    };
  }

  private getDefaultBundleAnalytics(id: string, name: string): BundleAnalytics {
    return {
      bundleId: id,
      bundleName: name,
      unitsSold: 0,
      revenue: 0,
      averageOrderValue: 0,
      conversionRate: 0,
    };
  }
}

// Export singleton instance
export const marketingAnalyticsService = new MarketingAnalyticsService();