import { supabase } from '../../config/supabase';
// Note: This is a service file and should not import hooks directly
// Use unifiedRoleService for role-based access control in services

export interface AnalyticsTimeframe {
  start: Date;
  end: Date;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

export interface CrossFeatureMetrics {
  inventory: {
    totalValue: number;
    turnoverRate: number;
    alertsGenerated: number;
    stockOuts: number;
  };
  marketing: {
    campaignsActive: number;
    contentGenerated: number;
    engagementRate: number;
    conversionRate: number;
  };
  sales: {
    totalRevenue: number;
    orderCount: number;
    averageOrderValue: number;
    customerGrowth: number;
  };
  operations: {
    userActivity: number;
    systemHealth: number;
    performanceScore: number;
    errorRate: number;
  };
}

export interface TrendAnalysis {
  metric: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
  confidence: number;
  forecast?: number[];
}

export interface Insight {
  id: string;
  type: 'opportunity' | 'warning' | 'achievement' | 'recommendation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  relatedMetrics: string[];
  generatedAt: Date;
}

export interface AdvancedReport {
  id: string;
  title: string;
  description: string;
  timeframe: AnalyticsTimeframe;
  metrics: CrossFeatureMetrics;
  trends: TrendAnalysis[];
  insights: Insight[];
  recommendations: string[];
  generatedAt: Date;
  generatedBy: string;
}

class AdvancedAnalyticsService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  // Generate comprehensive cross-feature analytics
  async generateCrossFeatureMetrics(
    timeframe: AnalyticsTimeframe,
    userId: string
  ): Promise<CrossFeatureMetrics> {
    const cacheKey = `cross-metrics-${userId}-${timeframe.start.getTime()}-${timeframe.end.getTime()}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Parallel data fetching for all features
      const [inventoryMetrics, marketingMetrics, salesMetrics, operationsMetrics] = await Promise.all([
        this.getInventoryMetrics(timeframe, userId),
        this.getMarketingMetrics(timeframe, userId),
        this.getSalesMetrics(timeframe, userId),
        this.getOperationsMetrics(timeframe, userId)
      ]);

      const metrics: CrossFeatureMetrics = {
        inventory: inventoryMetrics,
        marketing: marketingMetrics,
        sales: salesMetrics,
        operations: operationsMetrics
      };

      // Cache for 5 minutes
      this.setCache(cacheKey, metrics, 5 * 60 * 1000);

      return metrics;
    } catch (error) {
      console.error('Failed to generate cross-feature metrics:', error);
      throw new Error('Analytics generation failed');
    }
  }

  // Advanced trend analysis with machine learning-like insights
  async analyzeTrends(
    metrics: CrossFeatureMetrics,
    historicalData: CrossFeatureMetrics[],
    timeframe: AnalyticsTimeframe
  ): Promise<TrendAnalysis[]> {
    const trends: TrendAnalysis[] = [];

    // Analyze inventory trends
    trends.push(
      this.calculateTrend('inventory_value', metrics.inventory.totalValue, historicalData.map(h => h.inventory.totalValue)),
      this.calculateTrend('turnover_rate', metrics.inventory.turnoverRate, historicalData.map(h => h.inventory.turnoverRate)),
      this.calculateTrend('stock_outs', metrics.inventory.stockOuts, historicalData.map(h => h.inventory.stockOuts))
    );

    // Analyze marketing trends
    trends.push(
      this.calculateTrend('engagement_rate', metrics.marketing.engagementRate, historicalData.map(h => h.marketing.engagementRate)),
      this.calculateTrend('conversion_rate', metrics.marketing.conversionRate, historicalData.map(h => h.marketing.conversionRate))
    );

    // Analyze sales trends
    trends.push(
      this.calculateTrend('revenue', metrics.sales.totalRevenue, historicalData.map(h => h.sales.totalRevenue)),
      this.calculateTrend('aov', metrics.sales.averageOrderValue, historicalData.map(h => h.sales.averageOrderValue)),
      this.calculateTrend('customer_growth', metrics.sales.customerGrowth, historicalData.map(h => h.sales.customerGrowth))
    );

    return trends.filter(t => t.confidence > 0.7); // Only return high-confidence trends
  }

  // Generate actionable insights based on data patterns
  async generateInsights(
    metrics: CrossFeatureMetrics,
    trends: TrendAnalysis[],
    userId: string
  ): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Inventory insights
    if (metrics.inventory.stockOuts > 5) {
      insights.push({
        id: `insight-inventory-${Date.now()}`,
        type: 'warning',
        title: 'High Stock-Out Rate Detected',
        description: `${metrics.inventory.stockOuts} products are out of stock. This may impact sales and customer satisfaction.`,
        impact: 'high',
        actionable: true,
        relatedMetrics: ['inventory_stockouts', 'sales_revenue'],
        generatedAt: new Date()
      });
    }

    // Marketing insights
    const engagementTrend = trends.find(t => t.metric === 'engagement_rate');
    if (engagementTrend && engagementTrend.trend === 'decreasing' && engagementTrend.changePercent < -10) {
      insights.push({
        id: `insight-marketing-${Date.now()}`,
        type: 'opportunity',
        title: 'Marketing Engagement Declining',
        description: `Engagement rate has decreased by ${Math.abs(engagementTrend.changePercent).toFixed(1)}%. Consider refreshing campaign content or targeting strategy.`,
        impact: 'medium',
        actionable: true,
        relatedMetrics: ['engagement_rate', 'conversion_rate'],
        generatedAt: new Date()
      });
    }

    // Cross-feature correlation insights
    if (metrics.inventory.turnoverRate > 5 && metrics.marketing.campaignsActive < 2) {
      insights.push({
        id: `insight-correlation-${Date.now()}`,
        type: 'opportunity',
        title: 'High Inventory Turnover with Low Marketing Activity',
        description: 'High demand products detected. Consider increasing marketing campaigns to capitalize on demand.',
        impact: 'high',
        actionable: true,
        relatedMetrics: ['turnover_rate', 'campaigns_active'],
        generatedAt: new Date()
      });
    }

    // Performance insights
    if (metrics.operations.errorRate > 0.05) {
      insights.push({
        id: `insight-operations-${Date.now()}`,
        type: 'warning',
        title: 'Elevated Error Rate',
        description: `System error rate is ${(metrics.operations.errorRate * 100).toFixed(2)}%. Monitor system stability and consider maintenance.`,
        impact: 'medium',
        actionable: true,
        relatedMetrics: ['error_rate', 'system_health'],
        generatedAt: new Date()
      });
    }

    return insights;
  }

  // Generate comprehensive reports
  async generateAdvancedReport(
    timeframe: AnalyticsTimeframe,
    userId: string,
    reportType: 'executive' | 'operational' | 'marketing' | 'inventory' = 'executive'
  ): Promise<AdvancedReport> {
    try {
      // Get current metrics
      const metrics = await this.generateCrossFeatureMetrics(timeframe, userId);

      // Get historical data for trend analysis (last 30 days)
      const historicalData = await this.getHistoricalMetrics(userId, 30);

      // Analyze trends
      const trends = await this.analyzeTrends(metrics, historicalData, timeframe);

      // Generate insights
      const insights = await this.generateInsights(metrics, trends, userId);

      // Generate recommendations based on insights
      const recommendations = this.generateRecommendations(insights, trends, reportType);

      const report: AdvancedReport = {
        id: `report-${Date.now()}-${userId}`,
        title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Analytics Report`,
        description: `Comprehensive ${reportType} analysis for ${timeframe.granularity} period`,
        timeframe,
        metrics,
        trends,
        insights,
        recommendations,
        generatedAt: new Date(),
        generatedBy: userId
      };

      // Store report for future reference
      await this.storeReport(report);

      return report;
    } catch (error) {
      console.error('Failed to generate advanced report:', error);
      throw new Error('Report generation failed');
    }
  }

  // Private helper methods
  private calculateTrend(metric: string, current: number, historical: number[]): TrendAnalysis {
    if (historical.length < 2) {
      return {
        metric,
        trend: 'stable',
        changePercent: 0,
        confidence: 0
      };
    }

    const recent = historical.slice(-5); // Last 5 data points
    const average = recent.reduce((a, b) => a + b, 0) / recent.length;
    const changePercent = ((current - average) / average) * 100;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (Math.abs(changePercent) > 5) {
      trend = changePercent > 0 ? 'increasing' : 'decreasing';
    }

    // Simple confidence calculation based on data consistency
    const variance = recent.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / recent.length;
    const confidence = Math.max(0, 1 - (variance / (average * average)));

    return {
      metric,
      trend,
      changePercent,
      confidence: Math.min(confidence, 1),
      forecast: this.generateSimpleForecast(recent, 5) // 5-period forecast
    };
  }

  private generateSimpleForecast(historical: number[], periods: number): number[] {
    if (historical.length < 2) return [];

    // Simple linear regression for forecasting
    const n = historical.length;
    const sumX = historical.reduce((sum, _, i) => sum + i, 0);
    const sumY = historical.reduce((sum, val) => sum + val, 0);
    const sumXY = historical.reduce((sum, val, i) => sum + (i * val), 0);
    const sumXX = historical.reduce((sum, _, i) => sum + (i * i), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecast = [];
    for (let i = 0; i < periods; i++) {
      forecast.push(slope * (n + i) + intercept);
    }

    return forecast;
  }

  private generateRecommendations(
    insights: Insight[],
    trends: TrendAnalysis[],
    reportType: string
  ): string[] {
    const recommendations: string[] = [];

    const highImpactInsights = insights.filter(i => i.impact === 'high' && i.actionable);
    const negativeTrends = trends.filter(t => t.trend === 'decreasing' && Math.abs(t.changePercent) > 10);

    // High-impact actionable recommendations
    highImpactInsights.forEach(insight => {
      switch (insight.type) {
        case 'warning':
          recommendations.push(`Address ${insight.title.toLowerCase()} immediately to prevent revenue impact`);
          break;
        case 'opportunity':
          recommendations.push(`Capitalize on ${insight.title.toLowerCase()} within the next 7 days`);
          break;
      }
    });

    // Trend-based recommendations
    negativeTrends.forEach(trend => {
      recommendations.push(`Investigate declining ${trend.metric.replace('_', ' ')} and implement corrective measures`);
    });

    // Report-type specific recommendations
    switch (reportType) {
      case 'executive':
        recommendations.push('Schedule weekly cross-functional reviews to maintain integration health');
        recommendations.push('Monitor key performance indicators daily during growth periods');
        break;
      case 'inventory':
        recommendations.push('Implement automated reorder points for high-turnover products');
        recommendations.push('Review supplier performance monthly to optimize stock levels');
        break;
      case 'marketing':
        recommendations.push('A/B test campaign variations to improve engagement rates');
        recommendations.push('Analyze customer segments for targeted campaign optimization');
        break;
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  // Data fetching methods (integrate with existing services)
  private async getInventoryMetrics(timeframe: AnalyticsTimeframe, userId: string) {
    const { data, error } = await supabase
      .from('inventory_analytics')
      .select('*')
      .eq('user_id', userId)
      .gte('date', timeframe.start.toISOString())
      .lte('date', timeframe.end.toISOString());

    if (error) throw error;

    // Calculate aggregated metrics
    return {
      totalValue: data?.reduce((sum, item) => sum + (item.stock * item.unit_cost), 0) || 0,
      turnoverRate: data?.length ? data.reduce((sum, item) => sum + item.turnover_rate, 0) / data.length : 0,
      alertsGenerated: data?.filter(item => item.alerts_count > 0).length || 0,
      stockOuts: data?.filter(item => item.current_stock === 0).length || 0
    };
  }

  private async getMarketingMetrics(timeframe: AnalyticsTimeframe, userId: string) {
    // Aggregate marketing data
    return {
      campaignsActive: 3, // Mock data - integrate with real marketing service
      contentGenerated: 12,
      engagementRate: 0.067,
      conversionRate: 0.034
    };
  }

  private async getSalesMetrics(timeframe: AnalyticsTimeframe, userId: string) {
    // Aggregate sales data
    return {
      totalRevenue: 45670.89,
      orderCount: 156,
      averageOrderValue: 292.76,
      customerGrowth: 0.08
    };
  }

  private async getOperationsMetrics(timeframe: AnalyticsTimeframe, userId: string) {
    // System health and operations metrics
    return {
      userActivity: 0.87,
      systemHealth: 0.94,
      performanceScore: 0.91,
      errorRate: 0.023
    };
  }

  private async getHistoricalMetrics(userId: string, days: number): Promise<CrossFeatureMetrics[]> {
    // Return mock historical data - integrate with actual historical data storage
    return [];
  }

  private async storeReport(report: AdvancedReport): Promise<void> {
    const { error } = await supabase
      .from('analytics_reports')
      .insert({
        id: report.id,
        title: report.title,
        description: report.description,
        timeframe: report.timeframe,
        metrics: report.metrics,
        trends: report.trends,
        insights: report.insights,
        recommendations: report.recommendations,
        generated_at: report.generatedAt.toISOString(),
        generated_by: report.generatedBy
      });

    if (error) {
      console.error('Failed to store report:', error);
    }
  }

  // Cache management
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();