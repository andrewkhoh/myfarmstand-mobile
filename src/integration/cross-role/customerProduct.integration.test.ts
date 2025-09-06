import { supabase } from '@/config/supabase';
import { customerProductIntegration } from '@/services/integration/customerProductIntegration';
import type { DateRange, CustomerMetric, ProductMetric } from '@/services/integration/customerProductIntegration';

// Mock service methods removed - using actual service implementation

// Mock data generators
function generateCustomerData(count: number): CustomerMetric[] {
  const categories = ['produce', 'dairy', 'meat', 'bakery', 'organic'];
  return Array.from({ length: count }, (_, i) => ({
    date: new Date(2024, 0, (i % 30) + 1).toISOString().split('T')[0],
    customer_id: `customer-${i}`,
    total_spent: 200 + Math.random() * 1500,
    order_count: 5 + Math.floor(Math.random() * 20),
    favorite_category: categories[i % categories.length]
  }));
}

function generateProductData(count: number): ProductMetric[] {
  return Array.from({ length: count }, (_, i) => ({
    date: new Date(2024, 0, (i % 30) + 1).toISOString().split('T')[0],
    product_id: `product-${i}`,
    units_sold: 10 + Math.floor(Math.random() * 200),
    revenue: 50 + Math.random() * 500,
    customer_rating: 3 + Math.random() * 2
  }));
}

describe('Customer-Product Integration', () => {
  const mockUserId = 'user-789';
  const dateRange: DateRange = {
    start: '2024-01-01',
    end: '2024-01-31'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Preference Pattern Analysis', () => {
    it('should identify category preferences across customers', async () => {
      const mockCustomers = generateCustomerData(100);
      const mockProducts = generateProductData(50);

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'customer_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockCustomers, error: null })
          } as any;
        }
        if (table === 'product_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockProducts, error: null })
          } as any;
        }
        return {} as any;
      });

      const result = await customerProductIntegration.getPreferencePatterns(mockUserId, dateRange);

      expect(result.patterns).toBeInstanceOf(Array);
      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.patterns[0]).toHaveProperty('type', 'category_preference');
      expect(result.patterns[0]).toHaveProperty('category');
      expect(result.patterns[0]).toHaveProperty('strength');
    });

    it('should segment customers by value', async () => {
      const mockCustomers = [
        ...Array.from({ length: 10 }, (_, i) => ({
          ...generateCustomerData(1)[0],
          customer_id: `high-${i}`,
          total_spent: 1500 + Math.random() * 500
        })),
        ...Array.from({ length: 20 }, (_, i) => ({
          ...generateCustomerData(1)[0],
          customer_id: `medium-${i}`,
          total_spent: 600 + Math.random() * 300
        })),
        ...Array.from({ length: 30 }, (_, i) => ({
          ...generateCustomerData(1)[0],
          customer_id: `low-${i}`,
          total_spent: 100 + Math.random() * 300
        }))
      ];

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'customer_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockCustomers, error: null })
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

      const result = await customerProductIntegration.getPreferencePatterns(mockUserId, dateRange);

      expect(result.segments).toBeInstanceOf(Array);
      expect(result.segments).toHaveLength(3);
      
      const highValueSegment = result.segments.find((s: any) => s.name === 'high_value');
      expect(highValueSegment?.size).toBe(10);
      expect(highValueSegment?.avgSpend).toBeGreaterThan(1500);
    });

    it('should identify high-rated products with low sales', async () => {
      const mockProducts = [
        ...Array.from({ length: 5 }, (_, i) => ({
          ...generateProductData(1)[0],
          product_id: `hidden-gem-${i}`,
          customer_rating: 4.6 + Math.random() * 0.4,
          units_sold: 20 + Math.random() * 20
        })),
        ...Array.from({ length: 10 }, (_, i) => ({
          ...generateProductData(1)[0],
          product_id: `normal-${i}`,
          customer_rating: 3.5 + Math.random() * 0.5,
          units_sold: 100 + Math.random() * 100
        }))
      ];

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'product_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockProducts, error: null })
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

      const result = await customerProductIntegration.getPreferencePatterns(mockUserId, dateRange);

      const hiddenGemsRec = result.recommendations.find((r: any) => r.type === 'promote_hidden_gems');
      expect(hiddenGemsRec).toBeDefined();
      expect(hiddenGemsRec?.priority).toBe('high');
      expect(hiddenGemsRec?.expectedImpact).toBeDefined();
    });

    it('should maintain user data isolation', async () => {
      let customerQuery: any = {};
      let productQuery: any = {};

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        const query = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockImplementation(function(this: any, field: string, value: any) {
            if (table === 'customer_metrics') {
              customerQuery[field] = value;
            } else if (table === 'product_metrics') {
              productQuery[field] = value;
            }
            return this;
          }),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        };
        return query as any;
      });

      await customerProductIntegration.getPreferencePatterns(mockUserId, dateRange);

      expect(customerQuery.user_id).toBe(mockUserId);
      expect(productQuery.user_id).toBe(mockUserId);
    });

    it('should handle partial data failures gracefully', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'customer_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockRejectedValue(new Error('Database error'))
          } as any;
        }
        if (table === 'product_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: generateProductData(10), error: null })
          } as any;
        }
        return {} as any;
      });

      const result = await customerProductIntegration.getPreferencePatterns(mockUserId, dateRange);

      expect(result.patterns).toEqual([]);
      expect(result.segments).toEqual([]);
      expect(result.recommendations).toBeInstanceOf(Array); // Still generates product-based recommendations
    });
  });

  describe('Performance Optimization', () => {
    it('should complete analysis within 500ms', async () => {
      const largeCustomers = generateCustomerData(1000);
      const largeProducts = generateProductData(500);

      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        const delayedResponse = (data: any) => 
          new Promise(resolve => 
            setTimeout(() => resolve({ data, error: null }), 50)
          );

        if (table === 'customer_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockImplementation(() => delayedResponse(largeCustomers))
          } as any;
        }
        if (table === 'product_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockImplementation(() => delayedResponse(largeProducts))
          } as any;
        }
        return {} as any;
      });

      const startTime = Date.now();
      await customerProductIntegration.getPreferencePatterns(mockUserId, dateRange);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });
  });
});