import { inventorySalesIntegration } from '@/services/integration/inventorySalesIntegration';
import { supabase } from '@/config/supabase';
import type { DateRange, InventoryMetric, SalesMetric } from '@/services/integration/inventorySalesIntegration';

// Mock data generators
function generateInventoryData(days: number): InventoryMetric[] {
  const data: InventoryMetric[] = [];
  const baseDate = new Date('2024-01-01');
  
  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      total_value: 10000 + Math.random() * 5000,
      stock_levels: 500 + Math.random() * 200,
      turnover_rate: 2 + Math.random() * 3
    });
  }
  
  return data;
}

function generateSalesData(days: number): SalesMetric[] {
  const data: SalesMetric[] = [];
  const baseDate = new Date('2024-01-01');
  
  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      revenue: 5000 + Math.random() * 3000,
      volume: 100 + Math.random() * 50,
      growth_rate: 0.05 + Math.random() * 0.15
    });
  }
  
  return data;
}

describe('Inventory-Sales Integration', () => {
  const mockUserId = 'user-123';
  const dateRange: DateRange = {
    start: '2024-01-01',
    end: '2024-01-31'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Data Correlation', () => {
    it('should calculate correlation coefficient with full data', async () => {
      const mockInventory = generateInventoryData(30);
      const mockSales = generateSalesData(30);
      
      // Mock Supabase responses
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'inventory_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockInventory, error: null })
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

      const result = await inventorySalesIntegration.getCorrelation(mockUserId, dateRange);

      expect(result.correlation.coefficient).not.toBeNull();
      expect(typeof result.correlation.coefficient).toBe('number');
      expect(result.correlation.interpretation).toBeDefined();
      expect(result.insights).toBeInstanceOf(Array);
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should handle partial data failures gracefully', async () => {
      const mockSales = generateSalesData(30);
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'inventory_metrics') {
          // Simulate database error
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
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

      const result = await inventorySalesIntegration.getCorrelation(mockUserId, dateRange);

      expect(result.correlation.coefficient).toBeNull();
      expect(result.correlation.interpretation).toBe('insufficient_data');
      expect(result.inventory).toBeNull();
      expect(result.sales).not.toBeNull(); // Sales data should still be returned
    });

    it('should maintain user data isolation', async () => {
      const mockInventory = generateInventoryData(10);
      const mockSales = generateSalesData(10);
      
      let inventoryQuery: any = {};
      let salesQuery: any = {};
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        const query = {
          select: jest.fn().mockImplementation(function(this: any) { return this; }),
          eq: jest.fn().mockImplementation(function(this: any, field: string, value: any) { 
            if (table === 'inventory_metrics') {
              inventoryQuery[field] = value;
            } else if (table === 'sales_metrics') {
              salesQuery[field] = value;
            }
            return this; 
          }),
          gte: jest.fn().mockImplementation(function(this: any) { return this; }),
          lte: jest.fn().mockImplementation(function(this: any) { return this; }),
          order: jest.fn().mockImplementation(function(this: any) {
            if (table === 'inventory_metrics') {
              return Promise.resolve({ data: mockInventory, error: null });
            }
            return Promise.resolve({ data: mockSales, error: null });
          })
        };
        return query as any;
      });

      await inventorySalesIntegration.getCorrelation(mockUserId, dateRange);

      // Verify both queries included user_id filter
      expect(inventoryQuery.user_id).toBe(mockUserId);
      expect(salesQuery.user_id).toBe(mockUserId);
    });

    it('should calculate meaningful insights based on correlation', async () => {
      const mockInventory = generateInventoryData(30);
      const mockSales = generateSalesData(30);
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'inventory_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockInventory, error: null })
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

      const result = await inventorySalesIntegration.getCorrelation(mockUserId, dateRange);

      expect(result.insights).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: expect.any(String),
            impact: expect.stringMatching(/^(high|medium|low)$/),
            recommendation: expect.any(String)
          })
        ])
      );
      
      // Check for specific insight types
      const insightTypes = result.insights.map((i: any) => i.type);
      expect(insightTypes).toEqual(
        expect.arrayContaining(['inventory_optimization'])
      );
    });

    it('should aggregate inventory and sales data correctly', async () => {
      const mockInventory = generateInventoryData(10);
      const mockSales = generateSalesData(10);
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'inventory_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockInventory, error: null })
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

      const result = await inventorySalesIntegration.getCorrelation(mockUserId, dateRange);

      // Verify inventory aggregation
      expect(result.inventory).not.toBeNull();
      expect(result.inventory?.avgValue).toBeGreaterThan(0);
      expect(result.inventory?.avgStockLevel).toBeGreaterThan(0);
      expect(result.inventory?.avgTurnoverRate).toBeGreaterThan(0);

      // Verify sales aggregation
      expect(result.sales).not.toBeNull();
      expect(result.sales?.totalRevenue).toBeGreaterThan(0);
      expect(result.sales?.totalVolume).toBeGreaterThan(0);
      expect(result.sales?.avgGrowthRate).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle both data sources failing', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(() => {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
        } as any;
      });

      const result = await inventorySalesIntegration.getCorrelation(mockUserId, dateRange);

      expect(result.correlation.coefficient).toBeNull();
      expect(result.correlation.interpretation).toBe('insufficient_data');
      expect(result.inventory).toBeNull();
      expect(result.sales).toBeNull();
      expect(result.insights).toEqual([]);
    });

    it('should handle empty datasets gracefully', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(() => {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        } as any;
      });

      const result = await inventorySalesIntegration.getCorrelation(mockUserId, dateRange);

      expect(result.correlation.coefficient).toBeNull();
      expect(result.correlation.interpretation).toBe('insufficient_data');
      expect(result.inventory).toBeNull();
      expect(result.sales).toBeNull();
    });

    it('should handle misaligned date ranges', async () => {
      const inventoryData = generateInventoryData(10);
      const salesData = generateSalesData(5); // Different number of days
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'inventory_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: inventoryData, error: null })
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
        return {} as any;
      });

      const result = await inventorySalesIntegration.getCorrelation(mockUserId, dateRange);

      // Should still calculate correlation with available overlapping data
      expect(result.correlation.coefficient).not.toBeNull();
      expect(result.correlation.confidence).toBeLessThan(1); // Lower confidence due to misalignment
    });
  });

  describe('Performance', () => {
    it('should complete aggregation within 500ms', async () => {
      const mockInventory = generateInventoryData(90); // Large dataset
      const mockSales = generateSalesData(90);
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'inventory_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockInventory, error: null })
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

      const startTime = Date.now();
      await inventorySalesIntegration.getCorrelation(mockUserId, {
        start: '2024-01-01',
        end: '2024-03-31'
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500);
    });

    it('should use Promise.allSettled for parallel fetching', async () => {
      const mockInventory = generateInventoryData(10);
      const mockSales = generateSalesData(10);
      
      let inventoryFetchTime = 0;
      let salesFetchTime = 0;
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'inventory_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockImplementation(() => {
              inventoryFetchTime = Date.now();
              return new Promise(resolve => {
                setTimeout(() => resolve({ data: mockInventory, error: null }), 100);
              });
            })
          } as any;
        }
        if (table === 'sales_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockImplementation(() => {
              salesFetchTime = Date.now();
              return new Promise(resolve => {
                setTimeout(() => resolve({ data: mockSales, error: null }), 100);
              });
            })
          } as any;
        }
        return {} as any;
      });

      const startTime = Date.now();
      await inventorySalesIntegration.getCorrelation(mockUserId, dateRange);
      const totalTime = Date.now() - startTime;

      // Both fetches should start at roughly the same time (parallel)
      expect(Math.abs(inventoryFetchTime - salesFetchTime)).toBeLessThan(50);
      // Total time should be close to single fetch time (not double)
      expect(totalTime).toBeLessThan(150);
    });
  });

  describe('Data Validation', () => {
    it('should validate all returned data with Zod schemas', async () => {
      const mockInventory = generateInventoryData(10);
      const mockSales = generateSalesData(10);
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'inventory_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockInventory, error: null })
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

      const result = await inventorySalesIntegration.getCorrelation(mockUserId, dateRange);

      // Result should match schema structure
      expect(result).toHaveProperty('correlation');
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('inventory');
      expect(result).toHaveProperty('sales');
      
      // Correlation should have required fields
      expect(result.correlation).toHaveProperty('coefficient');
      expect(result.correlation).toHaveProperty('interpretation');
      expect(result.correlation).toHaveProperty('confidence');
      
      // Each insight should have required fields
      result.insights.forEach((insight: any) => {
        expect(insight).toHaveProperty('type');
        expect(insight).toHaveProperty('impact');
        expect(insight).toHaveProperty('recommendation');
      });
    });

    it('should reject invalid date ranges', async () => {
      const invalidDateRange = {
        start: '2024-01-31',
        end: '2024-01-01' // End before start
      };

      await expect(
        inventorySalesIntegration.getCorrelation(mockUserId, invalidDateRange)
      ).rejects.toThrow();
    });

    it('should handle null values in database data', async () => {
      const mockInventory = [
        {
          date: '2024-01-01',
          total_value: null, // Null value
          stock_levels: 500,
          turnover_rate: 2.5
        }
      ];
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'inventory_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockInventory, error: null })
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

      const result = await inventorySalesIntegration.getCorrelation(mockUserId, dateRange);

      // Should handle null gracefully
      expect(result.correlation.interpretation).toBe('insufficient_data');
    });
  });

  describe('Correlation Accuracy', () => {
    it('should detect strong positive correlation', async () => {
      // Generate correlated data
      const days = 30;
      const inventoryData: InventoryMetric[] = [];
      const salesData: SalesMetric[] = [];
      
      for (let i = 0; i < days; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const stockLevel = 500 + i * 10; // Increasing stock
        inventoryData.push({
          date: dateStr,
          total_value: stockLevel * 20,
          stock_levels: stockLevel,
          turnover_rate: 2.5
        });
        
        salesData.push({
          date: dateStr,
          revenue: stockLevel * 15, // Correlated with stock
          volume: stockLevel / 5,
          growth_rate: 0.1
        });
      }
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'inventory_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: inventoryData, error: null })
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
        return {} as any;
      });

      const result = await inventorySalesIntegration.getCorrelation(mockUserId, dateRange);

      expect(result.correlation.coefficient).toBeGreaterThan(0.7); // Strong positive
      expect(result.correlation.interpretation).toContain('strong');
    });

    it('should detect negative correlation', async () => {
      // Generate inversely correlated data
      const days = 30;
      const inventoryData: InventoryMetric[] = [];
      const salesData: SalesMetric[] = [];
      
      for (let i = 0; i < days; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const stockLevel = 800 - i * 10; // Decreasing stock
        inventoryData.push({
          date: dateStr,
          total_value: stockLevel * 20,
          stock_levels: stockLevel,
          turnover_rate: 2.5
        });
        
        salesData.push({
          date: dateStr,
          revenue: 5000 + i * 100, // Increasing as stock decreases
          volume: 100 + i * 2,
          growth_rate: 0.1
        });
      }
      
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'inventory_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: inventoryData, error: null })
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
        return {} as any;
      });

      const result = await inventorySalesIntegration.getCorrelation(mockUserId, dateRange);

      expect(result.correlation.coefficient).toBeLessThan(-0.5); // Negative correlation
      expect(result.correlation.interpretation).toContain('negative');
    });
  });
});