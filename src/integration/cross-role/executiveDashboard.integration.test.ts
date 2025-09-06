import { supabase } from '@/config/supabase';
import { executiveDashboardIntegration as executiveDashboardService } from '@/services/integration/executiveDashboardIntegration';
import type { DateRange } from '@/services/integration/executiveDashboardIntegration';

// Mock service methods removed - using actual service implementation

describe('Executive Dashboard Aggregation', () => {
  const mockUserId = 'executive-user';
  const dateRange: DateRange = {
    start: '2024-01-01',
    end: '2024-01-31'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Unified Data Model', () => {
    it('should aggregate data from all departments', async () => {
      const mockResponses = {
        inventory_metrics: Array(10).fill({}).map((_, i) => ({ 
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          stock_levels: 500 + Math.random() * 200,
          total_value: 10000 + Math.random() * 5000,
          turnover_rate: 2 + Math.random() * 2
        })),
        sales_metrics: Array(10).fill({}).map((_, i) => ({ 
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          revenue: 5000 + Math.random() * 2000,
          volume: 100 + Math.random() * 50,
          growth_rate: 0.05 + Math.random() * 0.1
        })),
        marketing_metrics: Array(10).fill({}).map((_, i) => ({ 
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          campaign_id: `campaign-${i}`,
          spend: 1000 + Math.random() * 500,
          impressions: 10000 + Math.random() * 5000,
          clicks: 200 + Math.random() * 100,
          conversions: 50 + Math.random() * 30
        })),
        customer_metrics: Array(10).fill({}).map((_, i) => ({ 
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          customer_id: `customer-${i}`,
          total_spent: 500 + Math.random() * 500,
          order_count: 5 + Math.floor(Math.random() * 10),
          favorite_category: 'produce',
          lifetime_value: 2000 + Math.random() * 3000,
          churn_risk: 0.1 + Math.random() * 0.3
        })),
        operational_metrics: Array(10).fill({}).map((_, i) => ({ 
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          labor_cost: 1000 + Math.random() * 500,
          material_cost: 2000 + Math.random() * 1000,
          overhead_cost: 500 + Math.random() * 200,
          efficiency_rate: 0.7 + Math.random() * 0.2,
          waste_percentage: 0.05 + Math.random() * 0.05,
          production_volume: 100 + Math.random() * 50,
          downtime_hours: 1 + Math.random() * 3
        })),
        financial_metrics: Array(10).fill({}).map((_, i) => ({ 
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          revenue: 10000 + Math.random() * 5000,
          gross_profit: 4000 + Math.random() * 2000,
          operating_expenses: 3000 + Math.random() * 1000,
          net_profit: 1000 + Math.random() * 1000
        }))
      };

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ 
            data: mockResponses[table as keyof typeof mockResponses] || [], 
            error: null 
          })
        } as any;
      });

      const result = await executiveDashboardService.getExecutiveOverview(mockUserId, dateRange);

      expect(result.kpis).toBeDefined();
      expect(result.kpis.revenue).toBeDefined();
      expect(result.kpis.customerGrowth).toBeDefined();
      expect(result.kpis.operationalEfficiency).toBeDefined();
      expect(result.kpis.marketingROI).toBeDefined();
    });

    it('should handle partial department failures gracefully', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'inventory_metrics' || table === 'marketing_metrics') {
          // These fail
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockRejectedValue(new Error('Database error'))
          } as any;
        }
        // Others succeed
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ 
            data: Array(5).fill({}).map((_, i) => ({ 
              date: `2024-01-${String(i + 1).padStart(2, '0')}`,
              revenue: 5000,
              volume: 100,
              growth_rate: 0.1,
              efficiency_rate: 0.8,
              labor_cost: 1000,
              material_cost: 2000,
              overhead_cost: 500,
              waste_percentage: 0.05
            })), 
            error: null 
          })
        } as any;
      });

      const result = await executiveDashboardService.getExecutiveOverview(mockUserId, dateRange);

      // Should still return results for available departments
      expect(result).toBeDefined();
      expect(result.kpis).toBeDefined();
      expect(result.correlations.length).toBeGreaterThanOrEqual(0);
    });

    it('should calculate KPI trends correctly', async () => {
      const financialData = Array(30).fill({}).map((_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        revenue: 10000 + i * 100, // Increasing trend
        gross_profit: 4000 + i * 40,
        operating_expenses: 3000 + i * 20,
        net_profit: 1000 + i * 20
      }));

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'financial_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: financialData, error: null })
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

      const result = await executiveDashboardService.getExecutiveOverview(mockUserId, dateRange);

      expect(result.kpis.revenue).not.toBeNull();
      expect(result.kpis.revenue?.trend).toBe('up');
      expect(result.kpis.revenue?.changePercent).toBeGreaterThan(0);
    });
  });

  describe('Real-time KPI Synthesis', () => {
    it('should aggregate real-time metrics', async () => {
      const realtimeData = {
        inventory_metrics: [{ 
          date: '2024-01-01',
          stock_levels: 600, 
          total_value: 12000,
          turnover_rate: 3.2 
        }],
        sales_metrics: [{ 
          date: '2024-01-01',
          revenue: 7500, 
          volume: 150,
          growth_rate: 0.08
        }],
        financial_metrics: [{ 
          date: '2024-01-01',
          revenue: 15000, 
          gross_profit: 6000,
          operating_expenses: 1500,
          net_profit: 4500 
        }]
      };

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ 
            data: realtimeData[table as keyof typeof realtimeData] || [], 
            error: null 
          })
        } as any;
      });

      const result = await executiveDashboardService.getExecutiveOverview(mockUserId, dateRange);

      expect(result.kpis.revenue).not.toBeNull();
      expect(result.kpis.revenue?.current).toBeGreaterThan(0);
    });

    it('should calculate cross-department correlations', async () => {
      const mockData = {
        inventory_metrics: Array(30).fill({}).map((_, i) => ({ 
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          stock_levels: 500 + Math.random() * 200,
          total_value: 10000 + Math.random() * 5000,
          turnover_rate: 2 + Math.random() * 2
        })),
        sales_metrics: Array(30).fill({}).map((_, i) => ({ 
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          revenue: 5000 + Math.random() * 2000,
          volume: 100 + Math.random() * 50,
          growth_rate: 0.05 + Math.random() * 0.1
        })),
        marketing_metrics: Array(30).fill({}).map((_, i) => ({ 
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          campaign_id: `campaign-${i}`,
          spend: 1000 + Math.random() * 500,
          impressions: 10000 + Math.random() * 5000,
          clicks: 200 + Math.random() * 100,
          conversions: 50 + Math.random() * 30
        }))
      };

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ 
            data: mockData[table as keyof typeof mockData] || [], 
            error: null 
          })
        } as any;
      });

      const result = await executiveDashboardService.getExecutiveOverview(mockUserId, dateRange);

      expect(result.correlations).toBeInstanceOf(Array);
      expect(result.correlations.length).toBeGreaterThan(0);
      
      const inventorySalesCorr = result.correlations.find(c => c.type === 'inventory_sales');
      expect(inventorySalesCorr).toBeDefined();
      expect(inventorySalesCorr?.departments).toContain('inventory');
      expect(inventorySalesCorr?.departments).toContain('sales');
    });
  });

  describe('Alert Prioritization', () => {
    it('should generate alerts for threshold violations', async () => {
      const poorOperationalData = Array(10).fill({}).map((_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        labor_cost: 1000 + Math.random() * 500,
        material_cost: 2000 + Math.random() * 1000,
        overhead_cost: 500 + Math.random() * 200,
        efficiency_rate: 0.62 + Math.random() * 0.07, // Between 0.62-0.69, will trigger warning not critical
        waste_percentage: 0.1 + Math.random() * 0.05,
        production_volume: 100 + Math.random() * 50,
        downtime_hours: 2 + Math.random() * 3
      }));

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'operational_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: poorOperationalData, error: null })
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

      const result = await executiveDashboardService.getExecutiveOverview(mockUserId, dateRange);

      const efficiencyAlert = result.alerts.find(a => a.metric === 'efficiency_rate');
      expect(efficiencyAlert).toBeDefined();
      expect(efficiencyAlert?.severity).toBe('warning');
      expect(efficiencyAlert?.current).toBeLessThan(0.7);
    });

    it('should prioritize alerts by severity', async () => {
      // Create conditions that trigger multiple alerts
      const mockData = {
        operational_metrics: [{
          date: '2024-01-01',
          labor_cost: 1500,
          material_cost: 2500,
          overhead_cost: 700,
          efficiency_rate: 0.5, // Will trigger critical (below 0.6)
          waste_percentage: 0.15,
          production_volume: 80,
          downtime_hours: 5
        }],
        customer_metrics: [], // Will trigger customer decline
        financial_metrics: [{ 
          date: '2024-01-01',
          revenue: 5000,
          gross_profit: 2000,
          operating_expenses: 3000,
          net_profit: -1000
        }]
      };

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ 
            data: mockData[table as keyof typeof mockData] || [], 
            error: null 
          })
        } as any;
      });

      const result = await executiveDashboardService.getExecutiveOverview(mockUserId, dateRange);

      expect(result.alerts.length).toBeGreaterThan(0);
      // Alerts should be ordered by severity
      const severityOrder = ['critical', 'warning', 'info'];
      const alertSeverities = result.alerts.map(a => a.severity);
      const isSorted = alertSeverities.every((severity, i) => {
        if (i === 0) return true;
        const prevIndex = severityOrder.indexOf(alertSeverities[i - 1]);
        const currIndex = severityOrder.indexOf(severity);
        return prevIndex <= currIndex;
      });
      expect(isSorted || alertSeverities.length <= 1).toBe(true);
    });
  });

  describe('Recommendation Engine', () => {
    it('should generate actionable recommendations', async () => {
      const mockData = {
        operational_metrics: Array(10).fill({}).map(() => ({ efficiency_rate: 0.6 })),
        financial_metrics: Array(10).fill({}).map(() => ({ revenue: 15000 }))
      };

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ 
            data: mockData[table as keyof typeof mockData] || [], 
            error: null 
          })
        } as any;
      });

      const result = await executiveDashboardService.getExecutiveOverview(mockUserId, dateRange);

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      result.recommendations.forEach(rec => {
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('action');
        expect(rec).toHaveProperty('expectedOutcome');
        expect(rec).toHaveProperty('timeframe');
        expect(rec).toHaveProperty('departments');
      });
    });

    it('should prioritize recommendations by impact', async () => {
      const mockData = {
        operational_metrics: Array(10).fill({}).map(() => ({ efficiency_rate: 0.6 })),
        financial_metrics: Array(10).fill({}).map(() => ({ revenue: 20000 })),
        sales_metrics: Array(10).fill({}).map(() => ({ revenue: 8000 }))
      };

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ 
            data: mockData[table as keyof typeof mockData] || [], 
            error: null 
          })
        } as any;
      });

      const result = await executiveDashboardService.getExecutiveOverview(mockUserId, dateRange);

      // Check that recommendations are sorted by priority
      const priorities = result.recommendations.map(r => r.priority);
      const isSorted = priorities.every((p, i) => i === 0 || p >= priorities[i - 1]);
      expect(isSorted).toBe(true);
    });
  });

  describe('User Data Isolation', () => {
    it('should maintain user isolation across all queries', async () => {
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

      await executiveDashboardService.getExecutiveOverview(mockUserId, dateRange);

      // Check that all tables were queried with user_id
      const tables = ['inventory_metrics', 'sales_metrics', 'marketing_metrics', 
                     'customer_metrics', 'operational_metrics', 'financial_metrics'];
      
      tables.forEach(table => {
        if (queryTracking[table]) {
          expect(queryTracking[table].user_id).toBe(mockUserId);
        }
      });
    });
  });

  describe('Performance', () => {
    it('should complete full aggregation within 500ms', async () => {
      const largeMockData = {
        inventory_metrics: Array(365).fill({}).map((_, i) => ({ 
          date: `2024-${String(Math.floor(i/30) + 1).padStart(2, '0')}-${String((i%30) + 1).padStart(2, '0')}`,
          stock_levels: 500,
          total_value: 10000,
          turnover_rate: 2.5
        })),
        sales_metrics: Array(365).fill({}).map((_, i) => ({ 
          date: `2024-${String(Math.floor(i/30) + 1).padStart(2, '0')}-${String((i%30) + 1).padStart(2, '0')}`,
          revenue: 5000,
          volume: 100,
          growth_rate: 0.08
        })),
        marketing_metrics: Array(365).fill({}).map((_, i) => ({ 
          date: `2024-${String(Math.floor(i/30) + 1).padStart(2, '0')}-${String((i%30) + 1).padStart(2, '0')}`,
          campaign_id: `campaign-${i}`,
          spend: 1000,
          impressions: 10000,
          clicks: 200,
          conversions: 50
        })),
        customer_metrics: Array(1000).fill({}).map((_, i) => ({ 
          date: `2024-${String(Math.floor(i/30) + 1).padStart(2, '0')}-${String((i%30) + 1).padStart(2, '0')}`,
          customer_id: `customer-${i}`,
          total_spent: 500,
          order_count: 5,
          favorite_category: 'produce',
          lifetime_value: 2000,
          churn_risk: 0.1
        })),
        operational_metrics: Array(365).fill({}).map((_, i) => ({ 
          date: `2024-${String(Math.floor(i/30) + 1).padStart(2, '0')}-${String((i%30) + 1).padStart(2, '0')}`,
          labor_cost: 1000,
          material_cost: 2000,
          overhead_cost: 500,
          efficiency_rate: 0.8,
          waste_percentage: 0.05,
          production_volume: 100,
          downtime_hours: 2
        })),
        financial_metrics: Array(365).fill({}).map((_, i) => ({ 
          date: `2024-${String(Math.floor(i/30) + 1).padStart(2, '0')}-${String((i%30) + 1).padStart(2, '0')}`,
          revenue: 10000,
          gross_profit: 4000,
          operating_expenses: 3000,
          net_profit: 1000
        }))
      };

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        // Return data immediately without delay for performance test
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ 
            data: largeMockData[table as keyof typeof largeMockData] || [], 
            error: null 
          })
        } as any;
      });

      const startTime = Date.now();
      await executiveDashboardService.getExecutiveOverview(mockUserId, {
        start: '2024-01-01',
        end: '2024-12-31'
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    it('should use Promise.allSettled for parallel fetching', async () => {
      let fetchTimes: { [key: string]: number } = {};

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
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
      await executiveDashboardService.getExecutiveOverview(mockUserId, dateRange);
      const totalTime = Date.now() - startTime;

      // All fetches should start within 50ms of each other (parallel)
      const times = Object.values(fetchTimes);
      if (times.length > 1) {
        const maxDiff = Math.max(...times) - Math.min(...times);
        expect(maxDiff).toBeLessThan(50);
      }
      
      // Total time should be around 100ms (not 600ms for sequential)
      expect(totalTime).toBeLessThan(200);
    });
  });
});