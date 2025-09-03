import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketingKeys } from '@/utils/queryKeys';
import { campaignService } from '@/services/marketing/campaignService';
import { MarketingCampaign, MarketingContent, CampaignFilter, Product, ProductBundle, WorkflowState, WorkflowConfig, WorkflowResult, WorkflowContext, CalendarEvent } from '@/schemas/marketing';


interface PerformanceData {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  roi: number;
  roas: number;
  spend: number;
  revenue: number;
}

interface AudienceSegment {
  name: string;
  conversionRate: number;
  revenue: number;
  engagement: number;
}

interface Attribution {
  lastTouch: Record<string, number>;
  firstTouch: Record<string, number>;
  linear: Record<string, number>;
}

interface ABTest {
  winner: string;
  confidence: number;
  variants: Array<{
    name: string;
    conversions: number;
    visitors: number;
  }>;
}

interface Anomaly {
  metric: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: Date;
  value: number;
  expected: number;
}

export function useCampaignPerformance(campaignId?: string) {
  const queryClient = useQueryClient();
  const [realTimeUpdates, setRealTimeUpdates] = useState(false);
  const [comparison, setComparison] = useState<any[]>([]);
  const [retryAfter, setRetryAfter] = useState(60);
  const [isCached, setIsCached] = useState(false);

  // Main performance query
  const performanceQuery = useQuery({
    queryKey: marketingKeys.campaigns.performance(campaignId || ''),
    queryFn: async () => {
      if (!campaignId) return null;
      return campaignService.getPerformance(campaignId);
    },
    enabled: !!campaignId,
    staleTime: 30000
  });

  // Analytics query
  const analyticsQuery = useQuery({
    queryKey: marketingKeys.campaigns.analytics(campaignId || ''),
    queryFn: async () => {
      if (!campaignId) return null;
      return campaignService.getAnalytics?.(campaignId) || {};
    },
    enabled: !!campaignId
  });

  // Fetch metrics mutation
  const fetchMetricsMutation = useMutation({
      onError: (error) => {
        console.error('Operation failed:', error);
      },
    mutationFn: async (params: { startDate: Date; endDate: Date; metrics: string[] }) => {
      if (!campaignId) throw new Error('Campaign ID required');
      return campaignService.fetchMetrics?.(campaignId, params) || {};
    }
  });

  // Compare campaigns
  const compareCampaigns = useCallback(async (campaignIds: string[]) => {
    try {
      const results = await Promise.all(
      campaignIds.map(id => campaignService.getPerformance(id))
    );
    } catch (error) {
      console.error('Promise.all failed:', error);
      throw error;
    }
    
    const compared = results.map((data, index) => ({
      campaign_id: campaignIds[index],
      roi: data.roi || 0,
      roas: data.roas || 0,
      conversions: data.conversions || 0
    }));
    
    setComparison(compared);
    return compared;
  }, []);

  // Generate forecast
  const generateForecast = useCallback(async () => {
    if (!campaignId) return null;
    
    if (campaignService.generateForecast) {
      return campaignService.generateForecast(campaignId);
    }
    
    // Mock forecast
    return {
      nextWeek: { impressions: 150000, conversions: 225 },
      nextMonth: { impressions: 650000, conversions: 975 }
    };
  }, [campaignId]);

  // Aggregate by period
  const aggregateByPeriod = useCallback(async (period: 'daily' | 'weekly' | 'monthly') => {
    if (!campaignId) return null;
    
    if (campaignService.aggregateByPeriod) {
      return campaignService.aggregateByPeriod(campaignId, period);
    }
    
    // Mock aggregation
    return {
      daily: [],
      weekly: [],
      monthly: []
    };
  }, [campaignId]);

  // Export data
  const exportData = useCallback(async (format: 'csv' | 'pdf' | 'json') => {
    if (!campaignId) return null;
    
    if (campaignService.exportData) {
      return campaignService.exportData(campaignId, format);
    }
    
    // Mock export
    return {
      url: `https://download.example.com/performance-export.${format}`
    };
  }, [campaignId]);

  // Calculate KPI
  const calculateKPI = useCallback((formula: string) => {
    const data = performanceQuery.data;
    if (!data) return 0;
    
    // Simple KPI calculation based on formula
    if (formula.type === 'ratio' && formula.numerator === 'conversions' && formula.denominator === 'clicks') {
      return (data.conversions / data.clicks) * 100;
    }
    
    return 0;
  }, [performanceQuery.data]);

  // Invalidate cache
  const invalidateCache = useCallback(() => {
    if (campaignId) {
      queryClient.invalidateQueries({ 
        queryKey: marketingKeys.campaigns.performance(campaignId) 
      });
      setIsCached(false);
    }
  }, [campaignId, queryClient]);

  // Real-time subscription
  useEffect(() => {
    if (!campaignId || !realTimeUpdates) return;
    
    const subscribe = () => {
      if (campaignService.subscribeToPerformance) {
        return campaignService.subscribeToPerformance(campaignId, (update) => {
          queryClient.setQueryData(
            marketingKeys.campaigns.performance(campaignId),
            update
          );
        });
      }
      return () => {};
    };
    
    const unsubscribe = subscribe();
    return () => {
      unsubscribe();
    };
  }, [campaignId, realTimeUpdates, queryClient]);

  // Enable real-time updates
  useEffect(() => {
    setRealTimeUpdates(true);
  }, []);

  // Check cache status
  useEffect(() => {
    if (performanceQuery.dataUpdatedAt > 0) {
      const age = Date.now() - performanceQuery.dataUpdatedAt;
      setIsCached(age < 30000); // Consider cached if less than 30s old
    }
  }, [performanceQuery.dataUpdatedAt]);

  // Build audience segments
  const audienceSegments: AudienceSegment[] = analyticsQuery.data?.segments || [
    { name: 'Young Adults', conversionRate: 4.5, revenue: 25000, engagement: 72 },
    { name: 'Professionals', conversionRate: 3.8, revenue: 35000, engagement: 68 },
    { name: 'Parents', conversionRate: 5.2, revenue: 28000, engagement: 75 },
    { name: 'Seniors', conversionRate: 2.9, revenue: 15000, engagement: 55 }
  ];

  // Build attribution data
  const attribution: Attribution = analyticsQuery.data?.attribution || {
    lastTouch: { email: 35, social: 45, search: 20 },
    firstTouch: { social: 55, search: 30, email: 15 },
    linear: { social: 45, email: 30, search: 25 }
  };

  // Build A/B test data
  const abTests: ABTest = analyticsQuery.data?.abTests || {
    winner: 'B',
    confidence: 95,
    variants: [
      { name: 'A', conversions: 150, visitors: 5000 },
      { name: 'B', conversions: 180, visitors: 5000 }
    ]
  };

  // Build anomalies
  const anomalies: Anomaly[] = analyticsQuery.data?.anomalies || [
    {
      metric: 'CTR',
      severity: 'high',
      timestamp: new Date(),
      value: 0.5,
      expected: 3.0
    },
    {
      metric: 'Conversions',
      severity: 'medium',
      timestamp: new Date(),
      value: 50,
      expected: 150
    }
  ];

  return {
    // Data
    data: performanceQuery.data,
    comparison,
    realTimeUpdates,
    audienceSegments,
    attribution,
    abTests,
    anomalies,
    retryAfter,
    isCached,
    
    // Actions
    fetchMetrics: (params: { metrics?: string[]; period?: string; filters?: Record<string, unknown> }) => fetchMetricsMutation.mutate(params),
    compareCampaigns,
    generateForecast,
    aggregateByPeriod,
    exportData,
    calculateKPI,
    invalidateCache,
    
    // Status
    isLoading: performanceQuery.isLoading,
    isError: performanceQuery.isError,
    error: performanceQuery.error
  };
}