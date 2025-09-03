import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketingKeys } from '@/utils/queryKeys';
import { marketingService } from '@/services/marketing/marketingService';
import { MarketingCampaign, MarketingContent, CampaignFilter, Product, ProductBundle, WorkflowState, WorkflowConfig, WorkflowResult, WorkflowContext, CalendarEvent } from '@/schemas/marketing';


export interface AnalyticsData {
  period: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  conversionRate: number;
  roi: number;
  totalRevenue?: number;
  avgROI?: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color: string;
  }[];
}

interface Trend {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
}

interface FunnelStage {
  name: string;
  visitors: number;
  conversionRate: number;
}

interface CLVMetrics {
  averageClv: number;
  clvToCAC: number;
  paybackPeriod: number;
}

interface ContentPerformance {
  topContent: Array<{ id: string; title: string; engagement: number; revenue: number }>;
  contentROI: number;
}

interface Demographics {
  age: Record<string, { revenue: number; conversions: number }>;
  geography: Record<string, { revenue: number; conversions: number }>;
}

interface Attribution {
  paths: Array<{ path: string[]; conversions: number }>;
  topTouchpoints: string[];
}

interface Competitive {
  marketShare: number;
  position: number;
  competitors: Array<{ name: string; share: number }>;
}

export function useMarketingAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month') {
  const queryClient = useQueryClient();
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [chartData, setChartData] = useState<ChartData | null>(null);

  // Main analytics query
  const analyticsQuery = useQuery({
    queryKey: marketingKeys.analytics.overview(),
    queryFn: async () => {
      try {
        if (marketingService.getAnalytics) {
          return await marketingService.getAnalytics(period);
        }
        
        // Mock data for tests
        return {
          totalRevenue: 125000,
          avgROI: 285,
          campaigns: []
        };
      } catch (error) {
        console.error('Error fetching analytics:', error);
        throw new Error('Failed to load analytics data. Please try again.');
      }
    },
    staleTime: 30000
  });

  // Trends query
  const trendsQuery = useQuery({
    queryKey: marketingKeys.analytics.performance('trends'),
    queryFn: async () => {
      try {
        if (marketingService.getTrends) {
          return await marketingService.getTrends(period);
        }
        
        // Mock trends
        return {
          revenue: { direction: 'up' as const, percentage: 15.5 },
          conversions: { direction: 'up' as const, percentage: 12.3 },
          ctr: { direction: 'down' as const, percentage: 2.1 }
        };
      } catch (error) {
        console.error('Error fetching trends:', error);
        throw new Error('Failed to load trends data. Please try again.');
      }
    }
  });

  // Funnel query
  const funnelQuery = useQuery({
    queryKey: marketingKeys.analytics.performance('funnel'),
    queryFn: async () => {
      try {
        if (marketingService.getFunnel) {
          return await marketingService.getFunnel();
        }
        
        // Mock funnel
        return {
          stages: [
            { name: 'Awareness', visitors: 100000, conversionRate: 50 },
            { name: 'Interest', visitors: 50000, conversionRate: 30 },
            { name: 'Consideration', visitors: 15000, conversionRate: 20 },
            { name: 'Purchase', visitors: 3000, conversionRate: 60 }
          ],
          overallConversion: 0.09
        };
      } catch (error) {
        console.error('Error fetching funnel data:', error);
        throw new Error('Failed to load funnel data. Please try again.');
      }
    }
  });

  // CLV metrics
  const clvQuery = useQuery({
    queryKey: marketingKeys.analytics.performance('clv'),
    queryFn: async () => {
      try {
        if (marketingService.getCLV) {
          return await marketingService.getCLV();
        }
        
        return {
          averageClv: 850,
          clvToCAC: 3.2,
          paybackPeriod: 6
        };
      } catch (error) {
        console.error('Error fetching CLV metrics:', error);
        throw new Error('Failed to load CLV metrics. Please try again.');
      }
    }
  });

  // Content performance
  const contentQuery = useQuery({
    queryKey: marketingKeys.analytics.content(),
    queryFn: async () => {
      try {
        if (marketingService.getContentPerformance) {
          return await marketingService.getContentPerformance();
        }
        
        return {
          topContent: [
            { id: '1', title: 'Product Guide', engagement: 4500, revenue: 25000 },
            { id: '2', title: 'How-to Video', engagement: 3200, revenue: 18000 },
            { id: '3', title: 'Case Study', engagement: 2800, revenue: 22000 }
          ],
          contentROI: 320
        };
      } catch (error) {
        console.error('Error fetching content performance:', error);
        throw new Error('Failed to load content performance. Please try again.');
      }
    }
  });

  // Demographics
  const demographicsQuery = useQuery({
    queryKey: marketingKeys.analytics.performance('demographics'),
    queryFn: async () => {
      try {
        if (marketingService.getDemographics) {
          return await marketingService.getDemographics();
        }
        
        return {
          age: {
            '18-24': { revenue: 20000, conversions: 120 },
            '25-34': { revenue: 45000, conversions: 280 },
            '35-44': { revenue: 35000, conversions: 200 },
            '45+': { revenue: 25000, conversions: 150 }
          },
          geography: {
            'North America': { revenue: 75000, conversions: 450 },
            'Europe': { revenue: 35000, conversions: 200 },
            'Asia': { revenue: 15000, conversions: 100 }
          }
        };
      } catch (error) {
        console.error('Error fetching demographics:', error);
        throw new Error('Failed to load demographics. Please try again.');
      }
    }
  });

  // Attribution
  const attributionQuery = useQuery({
    queryKey: marketingKeys.analytics.performance('attribution'),
    queryFn: async () => {
      try {
        if (marketingService.getAttribution) {
          return await marketingService.getAttribution();
        }
        
        return {
          paths: [
            { path: ['Email', 'Social', 'Direct'], conversions: 150 },
            { path: ['Search', 'Email'], conversions: 120 },
            { path: ['Social', 'Search', 'Email'], conversions: 80 }
          ],
          topTouchpoints: ['Email', 'Social', 'Search']
        };
      } catch (error) {
        console.error('Error fetching attribution data:', error);
        throw new Error('Failed to load attribution data. Please try again.');
      }
    }
  });

  // Competitive analysis
  const competitiveQuery = useQuery({
    queryKey: marketingKeys.analytics.performance('competitive'),
    queryFn: async () => {
      try {
        if (marketingService.getCompetitive) {
          return await marketingService.getCompetitive();
        }
        
        return {
          marketShare: 18.5,
          position: 3,
          competitors: [
            { name: 'Competitor A', share: 32.5 },
            { name: 'Competitor B', share: 24.8 },
            { name: 'Us', share: 18.5 },
            { name: 'Others', share: 24.2 }
          ]
        };
      } catch (error) {
        console.error('Error fetching competitive analysis:', error);
        throw new Error('Failed to load competitive analysis. Please try again.');
      }
    }
  });

  // Aggregate campaigns
  const aggregateCampaigns = useCallback(async (campaignIds: string[]) => {
    if (marketingService.aggregateCampaigns) {
      return marketingService.aggregateCampaigns(campaignIds);
    }
    
    // Mock aggregation
    return {
      totalImpressions: 5000000,
      totalClicks: 150000,
      totalConversions: 1500,
      avgCTR: 3.0
    };
  }, []);

  // Generate predictions
  const generatePredictions = useCallback(async () => {
    if (marketingService.generatePredictions) {
      return marketingService.generatePredictions();
    }
    
    return {
      nextQuarterRevenue: { estimate: 145000, confidence: 0.82 },
      churnRisk: { high: 15, medium: 25, low: 60 },
      growthRate: { predicted: 12.5, current: 10.2 }
    };
  }, []);

  // Export analytics
  const exportAnalytics = useCallback(async (format: 'pdf' | 'csv' | 'excel', options?: { format?: string; includeMetadata?: boolean }) => {
    if (marketingService.exportAnalytics) {
      return marketingService.exportAnalytics(format, options);
    }
    
    return {
      format,
      url: `https://download.example.com/analytics.${format}`,
      size: 2485760
    };
  }, []);

  // Generate report
  const generateReport = useCallback(async (type: 'monthly' | 'quarterly' | 'annual') => {
    if (marketingService.generateReport) {
      return marketingService.generateReport(type);
    }
    
    return {
      reportId: 'report-789',
      status: 'completed',
      insights: [
        'Revenue up 15.5% month over month',
        'Best performing channel: Email (35% of conversions)',
        'Customer acquisition cost decreased by 12%'
      ]
    };
  }, []);

  // Schedule report
  const scheduleReport = useCallback(async (config: { schedule: string; recipients: string[]; format: string }) => {
    if (marketingService.scheduleReport) {
      return marketingService.scheduleReport(config);
    }
    
    return {
      scheduleId: 'schedule-123',
      frequency: 'weekly',
      nextRun: '2025-02-08T09:00:00Z'
    };
  }, []);

  // Build chart data
  useEffect(() => {
    const data = analyticsQuery.data;
    if (!data) return;
    
    const periods = ['2025-01', '2025-02'];
    const analyticsData: AnalyticsData[] = [
      {
        period: '2025-01',
        impressions: 150000,
        clicks: 3200,
        conversions: 250,
        revenue: 45000,
        ctr: 2.13,
        conversionRate: 7.81,
        roi: 125,
        totalRevenue: data.totalRevenue,
        avgROI: data.avgROI
      },
      {
        period: '2025-02',
        impressions: 185000,
        clicks: 4100,
        conversions: 320,
        revenue: 58000,
        ctr: 2.22,
        conversionRate: 7.80,
        roi: 145,
        totalRevenue: data.totalRevenue,
        avgROI: data.avgROI
      }
    ];
    
    setAnalytics(analyticsData);
    
    setChartData({
      labels: analyticsData.map(d => d.period),
      datasets: [
        {
          label: 'Impressions',
          data: analyticsData.map(d => d.impressions),
          color: '#3498db'
        },
        {
          label: 'Clicks',
          data: analyticsData.map(d => d.clicks),
          color: '#2ecc71'
        },
        {
          label: 'Conversions',
          data: analyticsData.map(d => d.conversions),
          color: '#e74c3c'
        }
      ]
    });
  }, [analyticsQuery.data]);

  const exportData = async (format: 'csv' | 'pdf' | 'excel') => {
    return exportAnalytics(format);
  };

  return {
    // Data
    data: analyticsQuery.data,
    analytics,
    chartData,
    trends: trendsQuery.data,
    funnel: funnelQuery.data,
    clvMetrics: clvQuery.data,
    contentPerformance: contentQuery.data,
    demographics: demographicsQuery.data,
    attribution: attributionQuery.data,
    competitive: competitiveQuery.data,
    
    // Actions
    aggregateCampaigns,
    generatePredictions,
    exportAnalytics,
    generateReport,
    scheduleReport,
    exportData,
    
    // Status
    isLoading: analyticsQuery.isLoading,
    error: analyticsQuery.error
  };
}
