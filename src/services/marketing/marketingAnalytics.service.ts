import { 
  MarketingCampaign,
  ProductBundle,
  ProductContent
} from '@/schemas/marketing';
import { ServiceError, ValidationError } from './errors/ServiceError';

export interface AnalyticsTimeRange {
  startDate: Date;
  endDate: Date;
}

export interface CampaignAnalytics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  averageCTR: number;
  averageConversionRate: number;
  averageROI: number;
}

export interface BundleAnalytics {
  totalBundles: number;
  activeBundles: number;
  averageDiscount: number;
  totalSavings: number;
  mostPopularType: string;
  averageProductsPerBundle: number;
}

export interface ContentAnalytics {
  totalContent: number;
  contentByState: Record<string, number>;
  averageTimeToPublish: number;
  publishedContent: number;
  conversionRate: number;
}

export interface RevenueMetrics {
  period: string;
  revenue: number;
  growth: number;
  transactions: number;
  averageOrderValue: number;
}

export interface ChannelPerformance {
  channel: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roi: number;
}

export class MarketingAnalyticsService {
  private campaigns: MarketingCampaign[] = [];
  private bundles: ProductBundle[] = [];
  private content: ProductContent[] = [];

  setCampaigns(campaigns: MarketingCampaign[]): void {
    this.campaigns = campaigns;
  }

  setBundles(bundles: ProductBundle[]): void {
    this.bundles = bundles;
  }

  setContent(content: ProductContent[]): void {
    this.content = content;
  }

  async getCampaignAnalytics(timeRange?: AnalyticsTimeRange): Promise<CampaignAnalytics> {
    let filteredCampaigns = this.campaigns;
    
    if (timeRange) {
      filteredCampaigns = this.campaigns.filter(
        c => c.createdAt >= timeRange.startDate && c.createdAt <= timeRange.endDate
      );
    }

    const activeCampaigns = filteredCampaigns.filter(c => c.status === 'active').length;
    
    const totals = filteredCampaigns.reduce((acc, campaign) => ({
      impressions: acc.impressions + campaign.metrics.impressions,
      clicks: acc.clicks + campaign.metrics.clicks,
      conversions: acc.conversions + campaign.metrics.conversions,
      revenue: acc.revenue + campaign.metrics.revenue
    }), { impressions: 0, clicks: 0, conversions: 0, revenue: 0 });

    const averageCTR = totals.impressions > 0 
      ? (totals.clicks / totals.impressions) * 100 
      : 0;
    
    const averageConversionRate = totals.clicks > 0 
      ? (totals.conversions / totals.clicks) * 100 
      : 0;

    const totalBudget = filteredCampaigns.reduce(
      (sum, c) => sum + (c.budget || 0), 0
    );
    
    const averageROI = totalBudget > 0 
      ? ((totals.revenue - totalBudget) / totalBudget) * 100 
      : 0;

    return {
      totalCampaigns: filteredCampaigns.length,
      activeCampaigns,
      totalImpressions: totals.impressions,
      totalClicks: totals.clicks,
      totalConversions: totals.conversions,
      totalRevenue: Math.round(totals.revenue * 100) / 100,
      averageCTR: Math.round(averageCTR * 100) / 100,
      averageConversionRate: Math.round(averageConversionRate * 100) / 100,
      averageROI: Math.round(averageROI * 100) / 100
    };
  }

  async getBundleAnalytics(timeRange?: AnalyticsTimeRange): Promise<BundleAnalytics> {
    let filteredBundles = this.bundles;
    
    if (timeRange) {
      filteredBundles = this.bundles.filter(
        b => b.createdAt >= timeRange.startDate && b.createdAt <= timeRange.endDate
      );
    }

    const activeBundles = filteredBundles.filter(b => b.isActive).length;
    
    const totalDiscount = filteredBundles.reduce((sum, b) => {
      const discount = b.pricing.discountType === 'percentage'
        ? b.pricing.discountValue
        : (b.pricing.discountValue / b.pricing.basePrice) * 100;
      return sum + discount;
    }, 0);
    
    const averageDiscount = filteredBundles.length > 0 
      ? totalDiscount / filteredBundles.length 
      : 0;

    const totalSavings = filteredBundles.reduce((sum, b) => {
      return sum + (b.pricing.basePrice - b.pricing.finalPrice);
    }, 0);

    const typeCounts = filteredBundles.reduce((acc, b) => {
      acc[b.type] = (acc[b.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostPopularType = Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';

    const totalProducts = filteredBundles.reduce(
      (sum, b) => sum + b.products.length, 0
    );
    
    const averageProductsPerBundle = filteredBundles.length > 0
      ? totalProducts / filteredBundles.length
      : 0;

    return {
      totalBundles: filteredBundles.length,
      activeBundles,
      averageDiscount: Math.round(averageDiscount * 100) / 100,
      totalSavings: Math.round(totalSavings * 100) / 100,
      mostPopularType,
      averageProductsPerBundle: Math.round(averageProductsPerBundle * 10) / 10
    };
  }

  async getContentAnalytics(timeRange?: AnalyticsTimeRange): Promise<ContentAnalytics> {
    let filteredContent = this.content;
    
    if (timeRange) {
      filteredContent = this.content.filter(
        c => c.createdAt >= timeRange.startDate && c.createdAt <= timeRange.endDate
      );
    }

    const contentByState = filteredContent.reduce((acc, c) => {
      acc[c.workflowState] = (acc[c.workflowState] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const publishedContent = filteredContent.filter(c => c.publishedAt).length;
    
    const publishTimes = filteredContent
      .filter(c => c.publishedAt)
      .map(c => {
        const publishTime = c.publishedAt ? new Date(c.publishedAt).getTime() : 0;
        const createTime = new Date(c.createdAt).getTime();
        return (publishTime - createTime) / (1000 * 60 * 60 * 24); // Days
      });
    
    const averageTimeToPublish = publishTimes.length > 0
      ? publishTimes.reduce((sum, time) => sum + time, 0) / publishTimes.length
      : 0;

    const conversionRate = filteredContent.length > 0
      ? (publishedContent / filteredContent.length) * 100
      : 0;

    return {
      totalContent: filteredContent.length,
      contentByState,
      averageTimeToPublish: Math.round(averageTimeToPublish * 10) / 10,
      publishedContent,
      conversionRate: Math.round(conversionRate * 100) / 100
    };
  }

  async getChannelPerformance(timeRange?: AnalyticsTimeRange): Promise<ChannelPerformance[]> {
    let filteredCampaigns = this.campaigns;
    
    if (timeRange) {
      filteredCampaigns = this.campaigns.filter(
        c => c.startDate >= timeRange.startDate && c.endDate <= timeRange.endDate
      );
    }

    const channelMetrics = new Map<string, ChannelPerformance>();
    const channelBudgets = new Map<string, number>();

    for (const campaign of filteredCampaigns) {
      const metricsPerChannel = campaign.channels.length || 1;
      const budgetPerChannel = (campaign.budget || 0) / metricsPerChannel;
      
      for (const channel of campaign.channels) {
        const existing = channelMetrics.get(channel) || {
          channel,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          roi: 0
        };

        existing.impressions += campaign.metrics.impressions / metricsPerChannel;
        existing.clicks += campaign.metrics.clicks / metricsPerChannel;
        existing.conversions += campaign.metrics.conversions / metricsPerChannel;
        existing.revenue += campaign.metrics.revenue / metricsPerChannel;
        
        channelMetrics.set(channel, existing);
        
        const currentBudget = channelBudgets.get(channel) || 0;
        channelBudgets.set(channel, currentBudget + budgetPerChannel);
      }
    }

    const results: ChannelPerformance[] = [];
    
    for (const [channel, metrics] of channelMetrics) {
      const budget = channelBudgets.get(channel) || 0;
      const roi = budget > 0 ? ((metrics.revenue - budget) / budget) * 100 : 0;
      
      results.push({
        ...metrics,
        impressions: Math.round(metrics.impressions),
        clicks: Math.round(metrics.clicks),
        conversions: Math.round(metrics.conversions),
        revenue: Math.round(metrics.revenue * 100) / 100,
        roi: Math.round(roi * 100) / 100
      });
    }

    return results.sort((a, b) => b.revenue - a.revenue);
  }

  async getRevenueMetrics(
    period: 'daily' | 'weekly' | 'monthly',
    timeRange?: AnalyticsTimeRange
  ): Promise<RevenueMetrics[]> {
    let filteredCampaigns = this.campaigns;
    
    if (timeRange) {
      filteredCampaigns = this.campaigns.filter(
        c => c.startDate >= timeRange.startDate && c.endDate <= timeRange.endDate
      );
    }

    const metrics: Map<string, RevenueMetrics> = new Map();
    
    for (const campaign of filteredCampaigns) {
      const periodKey = this.getPeriodKey(campaign.startDate, period);
      
      const existing = metrics.get(periodKey) || {
        period: periodKey,
        revenue: 0,
        growth: 0,
        transactions: 0,
        averageOrderValue: 0
      };

      existing.revenue += campaign.metrics.revenue;
      existing.transactions += campaign.metrics.conversions;
      
      metrics.set(periodKey, existing);
    }

    const results = Array.from(metrics.values()).map(m => ({
      ...m,
      revenue: Math.round(m.revenue * 100) / 100,
      averageOrderValue: m.transactions > 0 
        ? Math.round((m.revenue / m.transactions) * 100) / 100
        : 0
    }));

    // Calculate growth
    for (let i = 1; i < results.length; i++) {
      const current = results[i];
      const previous = results[i - 1];
      
      if (previous.revenue > 0) {
        current.growth = Math.round(
          ((current.revenue - previous.revenue) / previous.revenue) * 10000
        ) / 100;
      }
    }

    return results;
  }

  async getTopPerformingCampaigns(limit: number = 10): Promise<MarketingCampaign[]> {
    return this.campaigns
      .sort((a, b) => b.metrics.revenue - a.metrics.revenue)
      .slice(0, limit);
  }

  async getTopPerformingBundles(limit: number = 10): Promise<ProductBundle[]> {
    return this.bundles
      .filter(b => b.isActive)
      .sort((a, b) => {
        const savingsA = a.pricing.basePrice - a.pricing.finalPrice;
        const savingsB = b.pricing.basePrice - b.pricing.finalPrice;
        return savingsB - savingsA;
      })
      .slice(0, limit);
  }

  async getConversionFunnel(campaignId?: string): Promise<{
    stage: string;
    count: number;
    rate: number;
  }[]> {
    let campaigns = campaignId 
      ? this.campaigns.filter(c => c.id === campaignId)
      : this.campaigns;

    const totals = campaigns.reduce((acc, c) => ({
      impressions: acc.impressions + c.metrics.impressions,
      clicks: acc.clicks + c.metrics.clicks,
      conversions: acc.conversions + c.metrics.conversions
    }), { impressions: 0, clicks: 0, conversions: 0 });

    const funnel = [
      {
        stage: 'Impressions',
        count: totals.impressions,
        rate: 100
      },
      {
        stage: 'Clicks',
        count: totals.clicks,
        rate: totals.impressions > 0 
          ? Math.round((totals.clicks / totals.impressions) * 10000) / 100
          : 0
      },
      {
        stage: 'Conversions',
        count: totals.conversions,
        rate: totals.impressions > 0
          ? Math.round((totals.conversions / totals.impressions) * 10000) / 100
          : 0
      }
    ];

    return funnel;
  }

  async getSegmentPerformance(): Promise<{
    segment: string;
    campaigns: number;
    revenue: number;
    conversions: number;
  }[]> {
    const segmentMap = new Map<string, {
      campaigns: Set<string>;
      revenue: number;
      conversions: number;
    }>();

    for (const campaign of this.campaigns) {
      for (const segment of campaign.targetAudience.segments) {
        const existing = segmentMap.get(segment) || {
          campaigns: new Set(),
          revenue: 0,
          conversions: 0
        };

        existing.campaigns.add(campaign.id);
        existing.revenue += campaign.metrics.revenue;
        existing.conversions += campaign.metrics.conversions;
        
        segmentMap.set(segment, existing);
      }
    }

    return Array.from(segmentMap.entries())
      .map(([segment, data]) => ({
        segment,
        campaigns: data.campaigns.size,
        revenue: Math.round(data.revenue * 100) / 100,
        conversions: data.conversions
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private getPeriodKey(date: Date, period: 'daily' | 'weekly' | 'monthly'): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    switch (period) {
      case 'daily':
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      case 'weekly':
        const week = Math.ceil(day / 7);
        return `${year}-W${week.toString().padStart(2, '0')}`;
      case 'monthly':
        return `${year}-${month.toString().padStart(2, '0')}`;
    }
  }

  clearData(): void {
    this.campaigns = [];
    this.bundles = [];
    this.content = [];
  }
}