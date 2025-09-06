import { operationsFinanceIntegration } from '@/services/integration/operationsFinanceIntegration';
import { supabase } from '@/config/supabase';
import type { DateRange, OperationalMetric, FinancialMetric } from '@/services/integration/operationsFinanceIntegration';

// Mock data generators
function generateOperationalData(days: number): OperationalMetric[] {
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
    labor_cost: 2000 + Math.random() * 1000,
    material_cost: 3000 + Math.random() * 1500,
    overhead_cost: 1000 + Math.random() * 500,
    efficiency_rate: 0.7 + Math.random() * 0.25,
    waste_percentage: 2 + Math.random() * 8,
    production_volume: 100 + Math.random() * 50,
    downtime_hours: Math.random() * 3
  }));
}

function generateFinancialData(days: number): FinancialMetric[] {
  return Array.from({ length: days }, (_, i) => {
    const revenue = 10000 + Math.random() * 5000;
    const grossProfit = revenue * (0.3 + Math.random() * 0.2);
    const operatingExpenses = revenue * (0.15 + Math.random() * 0.1);
    
    return {
      date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
      revenue,
      gross_profit: grossProfit,
      operating_expenses: operatingExpenses,
      net_profit: grossProfit - operatingExpenses,
      cash_flow: (grossProfit - operatingExpenses) * (0.8 + Math.random() * 0.3),
      ebitda: (grossProfit - operatingExpenses) * 1.1,
      working_capital: revenue * 0.2
    };
  });
}

describe('Operations-Finance Integration', () => {
  const mockUserId = 'user-ops-fin';
  const dateRange: DateRange = {
    start: '2024-01-01',
    end: '2024-01-31'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cost-Revenue Analysis', () => {
    it('should analyze cost structure breakdown', async () => {
      const mockOps = generateOperationalData(30);
      const mockFin = generateFinancialData(30);

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'operational_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockOps, error: null })
          } as any;
        }
        if (table === 'financial_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockFin, error: null })
          } as any;
        }
        return {} as any;
      });

      const result = await operationsFinanceIntegration.getCostRevenueRelationship(mockUserId, dateRange);

      expect(result.costBreakdown).toBeDefined();
      expect(result.costBreakdown?.laborPercentage).toBeGreaterThan(0);
      expect(result.costBreakdown?.materialPercentage).toBeGreaterThan(0);
      expect(result.costBreakdown?.overheadPercentage).toBeGreaterThan(0);
      expect(Math.round(
        result.costBreakdown!.laborPercentage + 
        result.costBreakdown!.materialPercentage + 
        result.costBreakdown!.overheadPercentage
      )).toBe(100);
    });

    it('should identify profitability drivers', async () => {
      // Create data with high efficiency
      const highEfficiencyOps = generateOperationalData(30).map(op => ({
        ...op,
        efficiency_rate: 0.88 + Math.random() * 0.1
      }));
      
      const mockFin = generateFinancialData(30);

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'operational_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: highEfficiencyOps, error: null })
          } as any;
        }
        if (table === 'financial_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockFin, error: null })
          } as any;
        }
        return {} as any;
      });

      const result = await operationsFinanceIntegration.getCostRevenueRelationship(mockUserId, dateRange);

      expect(result.profitabilityDrivers).toBeInstanceOf(Array);
      const highEfficiencyDriver = result.profitabilityDrivers.find((d: any) => d.factor === 'high_efficiency');
      expect(highEfficiencyDriver).toBeDefined();
      expect(highEfficiencyDriver?.impact).toBeGreaterThan(0);
    });

    it('should calculate efficiency impact on profitability', async () => {
      const mockOps = generateOperationalData(30);
      const mockFin = generateFinancialData(30);

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'operational_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockOps, error: null })
          } as any;
        }
        if (table === 'financial_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockFin, error: null })
          } as any;
        }
        return {} as any;
      });

      const result = await operationsFinanceIntegration.getCostRevenueRelationship(mockUserId, dateRange);

      expect(result.efficiencyImpact).toBeDefined();
      expect(result.efficiencyImpact?.correlation).toBeDefined();
      expect(result.efficiencyImpact?.interpretation).toBeDefined();
      expect(result.efficiencyImpact?.potentialSavings).toBeGreaterThanOrEqual(0);
    });

    it('should project cash flow trends', async () => {
      const mockOps = generateOperationalData(30);
      const mockFin = generateFinancialData(30);

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'operational_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockOps, error: null })
          } as any;
        }
        if (table === 'financial_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockFin, error: null })
          } as any;
        }
        return {} as any;
      });

      const result = await operationsFinanceIntegration.getCostRevenueRelationship(mockUserId, dateRange);

      expect(result.cashFlowProjection).toBeDefined();
      expect(result.cashFlowProjection?.next7Days).toBeDefined();
      expect(result.cashFlowProjection?.next30Days).toBeDefined();
      expect(result.cashFlowProjection?.confidence).toBeGreaterThan(0);
      expect(['improving', 'declining', 'stable']).toContain(result.cashFlowProjection?.trend);
    });

    it('should handle partial data failures gracefully', async () => {
      const mockFin = generateFinancialData(30);

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'operational_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
          } as any;
        }
        if (table === 'financial_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockFin, error: null })
          } as any;
        }
        return {} as any;
      });

      const result = await operationsFinanceIntegration.getCostRevenueRelationship(mockUserId, dateRange);

      expect(result.costBreakdown).toBeNull();
      expect(result.profitabilityDrivers).toEqual([]);
      expect(result.efficiencyImpact).toBeNull();
      expect(result.cashFlowProjection).toBeDefined();
    });
  });

  describe('Efficiency Analysis', () => {
    it('should calculate ROI of efficiency improvements', async () => {
      const mockOps = generateOperationalData(30);
      const mockFin = generateFinancialData(30);

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'operational_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockOps, error: null })
          } as any;
        }
        if (table === 'financial_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockFin, error: null })
          } as any;
        }
        return {} as any;
      });

      const result = await operationsFinanceIntegration.getCostRevenueRelationship(mockUserId, dateRange);

      expect(result.efficiencyImpact).toBeDefined();
      expect(result.efficiencyImpact?.roi).toBeDefined();
      expect(result.efficiencyImpact?.breakEvenPoint).toBeGreaterThan(0);
    });
  });

  describe('Profitability Drivers', () => {
    it('should detect low efficiency impact', async () => {
      const lowEfficiencyOps = generateOperationalData(30).map(op => ({
        ...op,
        efficiency_rate: 0.4 + Math.random() * 0.2
      }));
      
      const mockFin = generateFinancialData(30);

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'operational_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: lowEfficiencyOps, error: null })
          } as any;
        }
        if (table === 'financial_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockFin, error: null })
          } as any;
        }
        return {} as any;
      });

      const result = await operationsFinanceIntegration.getCostRevenueRelationship(mockUserId, dateRange);

      const lowEfficiencyDriver = result.profitabilityDrivers.find((d: any) => d.factor === 'low_efficiency');
      expect(lowEfficiencyDriver).toBeDefined();
      expect(lowEfficiencyDriver?.impact).toBeLessThan(0);
      expect(lowEfficiencyDriver?.recommendation).toContain('efficiency');
    });

    it('should detect high waste impact', async () => {
      const highWasteOps = generateOperationalData(30).map(op => ({
        ...op,
        waste_percentage: 8 + Math.random() * 4
      }));
      
      const mockFin = generateFinancialData(30);

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'operational_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: highWasteOps, error: null })
          } as any;
        }
        if (table === 'financial_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockFin, error: null })
          } as any;
        }
        return {} as any;
      });

      const result = await operationsFinanceIntegration.getCostRevenueRelationship(mockUserId, dateRange);

      const wasteDriver = result.profitabilityDrivers.find((d: any) => d.factor === 'high_waste');
      expect(wasteDriver).toBeDefined();
      expect(wasteDriver?.impact).toBeLessThan(0);
      expect(wasteDriver?.recommendation).toContain('waste reduction');
    });
  });

  describe('User Isolation', () => {
    it('should maintain user data isolation', async () => {
      const mockOps = generateOperationalData(10);
      const mockFin = generateFinancialData(10);
      
      let opsQuery: any = {};
      let finQuery: any = {};

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        const query = {
          select: jest.fn().mockImplementation(function(this: any) { return this; }),
          eq: jest.fn().mockImplementation(function(this: any, field: string, value: any) { 
            if (table === 'operational_metrics') {
              opsQuery[field] = value;
            } else if (table === 'financial_metrics') {
              finQuery[field] = value;
            }
            return this; 
          }),
          gte: jest.fn().mockImplementation(function(this: any) { return this; }),
          lte: jest.fn().mockImplementation(function(this: any) { return this; }),
          order: jest.fn().mockImplementation(function(this: any) {
            if (table === 'operational_metrics') {
              return Promise.resolve({ data: mockOps, error: null });
            }
            return Promise.resolve({ data: mockFin, error: null });
          })
        };
        return query as any;
      });

      await operationsFinanceIntegration.getCostRevenueRelationship(mockUserId, dateRange);

      expect(opsQuery.user_id).toBe(mockUserId);
      expect(finQuery.user_id).toBe(mockUserId);
    });
  });
});