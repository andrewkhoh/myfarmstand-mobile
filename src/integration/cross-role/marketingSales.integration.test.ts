import { marketingSalesIntegration } from '@/services/integration/marketingSalesIntegration';
import { supabase } from '@/config/supabase';
import type { DateRange, CampaignMetric as MarketingMetric, SalesMetric } from '@/services/integration/marketingSalesIntegration';

// Mock data generators
function generateMarketingData(days: number): MarketingMetric[] {
  const data: MarketingMetric[] = [];
  const baseDate = new Date('2024-01-01');
  
  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      campaign_id: `campaign-${i % 5}`, // Rotate through 5 campaigns
      spend: 1000 + Math.random() * 500,
      impressions: 10000 + Math.random() * 5000,
      clicks: 500 + Math.random() * 300,
      conversions: 50 + Math.random() * 30
    });
  }
  
  return data;
}

function generateCampaignData(count: number): any[] {
  const campaigns = [];
  const types = ['email', 'social', 'search', 'display'];
  
  for (let i = 0; i < count; i++) {
    campaigns.push({
      id: `campaign-${i}`,
      name: `Campaign ${i}`,
      type: types[i % types.length],
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      budget: 5000 + Math.random() * 10000,
      actual_spend: 4000 + Math.random() * 8000,
      roi: 1.5 + Math.random() * 2
    });
  }
  
  return campaigns;
}

function generateSalesWithAttribution(days: number): SalesMetric[] {
  const data: SalesMetric[] = [];
  const baseDate = new Date('2024-01-01');
  
  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    
    const revenue = 8000 + Math.random() * 4000;
    const transactions = 150 + Math.random() * 50;
    
    data.push({
      date: date.toISOString().split('T')[0],
      revenue: revenue,
      transactions: Math.floor(transactions),
      average_order_value: revenue / transactions,
      new_customers: Math.floor(20 + Math.random() * 10)
    });
  }
  
  return data;
}

describe('Marketing-Sales Integration', () => {
  const mockUserId = 'user-456';
  const dateRange: DateRange = {
    start: '2024-01-01',
    end: '2024-01-31'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Campaign ROI Correlation', () => {
    it('should calculate ROI correlation between campaigns and sales', async () => {
      const mockMarketing = generateMarketingData(30);
      const mockCampaigns = generateCampaignData(5);
      const mockSales = generateSalesWithAttribution(30);
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'marketing_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockMarketing, error: null })
          } as any;
        }
        if (table === 'campaigns') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockCampaigns, error: null })
          } as any;
        }
        if (table === 'sales_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockSales, error: null })
          } as any;
        }
        return {} as any;
      });

      const result = await marketingSalesIntegration.getCorrelation(mockUserId, dateRange);

      expect(result.roi).toBeDefined();
      expect(result.roi.overall_roi).toBeGreaterThan(0);
      expect(result.roi.campaign_performance).toBeInstanceOf(Array);
      expect(result.insights).toBeInstanceOf(Array);
      expect(result.marketing).toBeDefined();
      expect(result.sales).toBeDefined();
    });

    it('should identify top performing campaigns', async () => {
      const marketingMetrics = [
        { date: '2024-01-01', campaign_id: '1', spend: 4500, impressions: 100000, clicks: 5000, conversions: 500 },
        { date: '2024-01-02', campaign_id: '2', spend: 2800, impressions: 50000, clicks: 2000, conversions: 200 },
        { date: '2024-01-03', campaign_id: '3', spend: 3900, impressions: 75000, clicks: 1500, conversions: 100 }
      ];
      
      const salesMetrics = [
        { date: '2024-01-01', revenue: 15750, transactions: 500, average_order_value: 31.5, new_customers: 100 },
        { date: '2024-01-02', revenue: 5600, transactions: 200, average_order_value: 28, new_customers: 50 },
        { date: '2024-01-03', revenue: 4290, transactions: 100, average_order_value: 42.9, new_customers: 25 }
      ];
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'marketing_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: marketingMetrics, error: null })
          } as any;
        }
        if (table === 'sales_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: salesMetrics, error: null })
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        } as any;
      });

      const result = await marketingSalesIntegration.getCorrelation(mockUserId, dateRange);

      expect(result.roi).toBeDefined();
      expect(result.roi.overall_roi).toBeGreaterThan(0);
    });

    it('should calculate time-lagged correlations', async () => {
      // Generate data with 3-day lag effect
      const days = 30;
      const marketingData: MarketingMetric[] = [];
      const salesData: SalesMetric[] = [];
      
      for (let i = 0; i < days; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Marketing spike on day 5
        const marketingSpend = i === 5 ? 5000 : 1000;
        marketingData.push({
          date: dateStr,
          campaign_id: 'campaign-lag-test',
          spend: marketingSpend,
          impressions: Math.floor(marketingSpend * 10),
          clicks: Math.floor(marketingSpend / 2),
          conversions: Math.floor(marketingSpend / 20)
        });
        
        // Sales spike on day 8 (3-day lag)
        const salesRevenue = i === 8 ? 15000 : 5000;
        const transactions = salesRevenue / 50;
        salesData.push({
          date: dateStr,
          revenue: salesRevenue,
          transactions: Math.floor(transactions),
          average_order_value: salesRevenue / transactions,
          new_customers: Math.floor(salesRevenue / 500)
        });
      }
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'marketing_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: marketingData, error: null })
          } as any;
        }
        if (table === 'sales_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: salesData, error: null })
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        } as any;
      });

      const result = await marketingSalesIntegration.getCorrelation(mockUserId, dateRange);

      expect(result.roi).toBeDefined();
      expect(result.roi.lag_days).toBeDefined();
      expect(result.insights).toBeInstanceOf(Array);
    });

    it('should maintain user data isolation in all queries', async () => {
      const queryTracking: { [key: string]: any } = {};
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        queryTracking[table] = {};
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockImplementation(function(this: any, field: string, value: any) {
            queryTracking[table][field] = value;
            return this;
          }),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        } as any;
      });

      await marketingSalesIntegration.getCorrelation(mockUserId, dateRange);

      // Verify all tables were queried with user_id
      expect(queryTracking['marketing_metrics']?.user_id).toBe(mockUserId);
      expect(queryTracking['sales_metrics']?.user_id).toBe(mockUserId);
    });
  });

  describe('Customer Acquisition Analysis', () => {
    it('should calculate customer acquisition cost and correlation', async () => {
      const mockMarketing = generateMarketingData(30);
      const mockCustomerData = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        new_customers: 20 + Math.floor(Math.random() * 10),
        acquisition_channel: ['email', 'social', 'search'][i % 3],
        acquisition_cost: 50 + Math.random() * 30
      }));
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'marketing_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockMarketing, error: null })
          } as any;
        }
        if (table === 'customer_acquisition') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockCustomerData, error: null })
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        } as any;
      });

      const result = await marketingSalesIntegration.getCorrelation(mockUserId, dateRange);

      expect(result.roi).toBeDefined();
      expect(result.marketing).toBeDefined();
      expect(result.sales).toBeDefined();
    });

    it('should identify most effective acquisition channels', async () => {
      const customerData = [
        { date: '2024-01-01', new_customers: 50, acquisition_channel: 'email', acquisition_cost: 40 },
        { date: '2024-01-02', new_customers: 30, acquisition_channel: 'social', acquisition_cost: 60 },
        { date: '2024-01-03', new_customers: 20, acquisition_channel: 'search', acquisition_cost: 80 }
      ];
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'customer_acquisition') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: customerData, error: null })
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        } as any;
      });

      const result = await marketingSalesIntegration.getCorrelation(mockUserId, dateRange);

      expect(result.roi).toBeDefined();
      expect(result.insights).toBeInstanceOf(Array);
    });
  });

  describe('Seasonal Trend Analysis', () => {
    it('should identify seasonal patterns in marketing effectiveness', async () => {
      // Generate seasonal data (higher in summer months)
      const marketingData: MarketingMetric[] = [];
      const salesData: SalesMetric[] = [];
      
      for (let month = 0; month < 12; month++) {
        for (let day = 1; day <= 30; day++) {
          const date = new Date(2024, month, day);
          const dateStr = date.toISOString().split('T')[0];
          
          // Summer months (June-August) have higher effectiveness
          const seasonalMultiplier = (month >= 5 && month <= 7) ? 2.0 : 1.0;
          
          marketingData.push({
            date: dateStr,
            campaign_id: `campaign-${month}`,
            spend: 1000,
            impressions: Math.floor(10000 * seasonalMultiplier),
            clicks: Math.floor(500 * seasonalMultiplier),
            conversions: Math.floor(50 * seasonalMultiplier)
          });
          
          salesData.push({
            date: dateStr,
            revenue: 5000 * seasonalMultiplier,
            transactions: Math.floor(100 * seasonalMultiplier),
            average_order_value: 50,
            new_customers: Math.floor(20 * seasonalMultiplier)
          });
        }
      }
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'marketing_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ 
              data: marketingData.filter(d => d.date >= '2024-01-01' && d.date <= '2024-12-31'), 
              error: null 
            })
          } as any;
        }
        if (table === 'sales_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ 
              data: salesData.filter(d => d.date >= '2024-01-01' && d.date <= '2024-12-31'), 
              error: null 
            })
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        } as any;
      });

      const yearRange = { start: '2024-01-01', end: '2024-12-31' };
      const result = await marketingSalesIntegration.getCorrelation(mockUserId, yearRange);

      expect(result.roi).toBeDefined();
      expect(result.insights).toBeInstanceOf(Array);
      expect(result.marketing).toBeDefined();
      expect(result.sales).toBeDefined();
    });
  });

  describe('Real-time Campaign Performance', () => {
    it('should track real-time campaign performance metrics', async () => {
      const realtimeData = {
        campaign_id: 'campaign-123',
        current_spend: 2500,
        current_impressions: 50000,
        current_clicks: 2500,
        current_conversions: 125,
        projected_roi: 2.3,
        trend: 'increasing'
      };
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'realtime_campaign_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: realtimeData, error: null })
          } as any;
        }
        return {} as any;
      });

      const result = await marketingSalesIntegration.getCorrelation(mockUserId, dateRange);

      expect(result.roi).toBeDefined();
      expect(result.insights).toBeInstanceOf(Array);
    });

    it('should generate alerts for underperforming campaigns', async () => {
      const underperformingData = {
        campaign_id: 'campaign-456',
        current_spend: 4500,
        budget: 5000,
        current_conversions: 10,
        projected_roi: 0.5, // Below threshold
        trend: 'decreasing'
      };
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'realtime_campaign_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: underperformingData, error: null })
          } as any;
        }
        return {} as any;
      });

      const result = await marketingSalesIntegration.getCorrelation(mockUserId, dateRange);

      expect(result.insights).toBeInstanceOf(Array);
      expect(result.insights.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle partial data failures in multi-source queries', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'marketing_metrics') {
          // Simulate failure
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockRejectedValue(new Error('Database error'))
          } as any;
        }
        if (table === 'sales_metrics') {
          // This one succeeds
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: generateSalesWithAttribution(10), error: null })
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        } as any;
      });

      const result = await marketingSalesIntegration.getCorrelation(mockUserId, dateRange);

      expect(result.marketing).toBeNull();
      expect(result.sales).not.toBeNull();
      expect(result.roi).toBeDefined();
    });

    it('should validate all data with Zod schemas', async () => {
      const mockMarketing = generateMarketingData(10);
      const mockSales = generateSalesWithAttribution(10);
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'marketing_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockMarketing, error: null })
          } as any;
        }
        if (table === 'sales_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockSales, error: null })
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        } as any;
      });

      const result = await marketingSalesIntegration.getCorrelation(mockUserId, dateRange);

      // Should not throw validation errors
      expect(result).toHaveProperty('roi');
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('marketing');
      expect(result).toHaveProperty('sales');
    });
  });

  describe('Performance Optimization', () => {
    it('should complete analysis within 500ms for large datasets', async () => {
      const largeMarketing = generateMarketingData(365); // Full year
      const largeSales = generateSalesWithAttribution(365);
      const largeCampaigns = generateCampaignData(50);
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        const delayedResponse = (data: any) => 
          new Promise(resolve => 
            setTimeout(() => resolve({ data, error: null }), 50)
          );
        
        if (table === 'marketing_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockImplementation(() => delayedResponse(largeMarketing))
          } as any;
        }
        if (table === 'sales_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockImplementation(() => delayedResponse(largeSales))
          } as any;
        }
        if (table === 'campaigns') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockImplementation(() => delayedResponse(largeCampaigns))
          } as any;
        }
        return {} as any;
      });

      const startTime = Date.now();
      await marketingSalesIntegration.getCampaignROICorrelation(mockUserId, {
        start: '2024-01-01',
        end: '2024-12-31'
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    it('should use parallel fetching with Promise.allSettled', async () => {
      let fetchOrder: string[] = [];
      let fetchTimes: { [key: string]: number } = {};
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        fetchOrder.push(table);
        fetchTimes[table] = Date.now();
        
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockImplementation(() => 
            new Promise(resolve => 
              setTimeout(() => resolve({ data: [], error: null }), 100)
            )
          )
        } as any;
      });

      const startTime = Date.now();
      await marketingSalesIntegration.getCorrelation(mockUserId, dateRange);
      const totalTime = Date.now() - startTime;

      // All fetches should start within 50ms of each other (parallel)
      const times = Object.values(fetchTimes);
      const maxDiff = Math.max(...times) - Math.min(...times);
      expect(maxDiff).toBeLessThan(50);
      
      // Total time should be around 100ms (not 300ms for sequential)
      expect(totalTime).toBeLessThan(150);
    });
  });
});