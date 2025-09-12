import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Supabase with inline implementation to avoid hoisting issues
jest.mock('@/config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn()
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn()
      }))
    },
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn()
    }
  }
}));

// Mock the service
jest.mock('../bundleService', () => ({
  bundleService: {
    createBundle: jest.fn(),
    updateBundle: jest.fn(),
    getBundle: jest.fn(),
    deleteBundle: jest.fn(),
    listBundles: jest.fn(),
    addProductToBundle: jest.fn(),
    removeProductFromBundle: jest.fn(),
    calculateBundlePrice: jest.fn(),
    validateBundleInventory: jest.fn(),
    activateBundle: jest.fn(),
    deactivateBundle: jest.fn(),
    getBundleProducts: jest.fn()
  }
}));

describe('BundleService', () => {
  let mockSupabase: any;
  let bundleService: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = require('@/config/supabase').supabase;
    bundleService = require('../bundleService').bundleService;
  });
  
  describe('createBundle', () => {
    it('should create bundle with products', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{ 
              id: 'bundle123',
              name: 'Summer Bundle',
              product_ids: ['prod1', 'prod2'],
              discount_percentage: 15
            }],
            error: null
          })
        })
      });
      
      const result = await bundleService.createBundle({
        name: 'Summer Bundle',
        product_ids: ['prod1', 'prod2'],
        discount_percentage: 15
      });
      
      expect(result.name).toBe('Summer Bundle');
      expect(result.product_ids).toHaveLength(2);
    });

    it('should validate minimum products in bundle', async () => {
      await expect(bundleService.createBundle({
        name: 'Invalid Bundle',
        product_ids: ['prod1'],
        discount_percentage: 10
      })).rejects.toThrow('Bundle must contain at least 2 products');
    });

    it('should validate discount percentage range', async () => {
      await expect(bundleService.createBundle({
        name: 'High Discount Bundle',
        product_ids: ['prod1', 'prod2'],
        discount_percentage: 101
      })).rejects.toThrow('Invalid discount percentage');
    });
  });

  describe('Bundle Pricing', () => {
    it('should calculate bundle price with discount', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: [
              { id: 'prod1', price: 100 },
              { id: 'prod2', price: 50 }
            ],
            error: null
          })
        })
      });
      
      const price = await bundleService.calculateBundlePrice('bundle123');
      expect(price.original).toBe(150);
      expect(price.discounted).toBe(127.5); // 15% discount
    });

    it('should apply tiered discounts based on quantity', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        data: { 
          product_ids: ['prod1', 'prod2', 'prod3', 'prod4'],
          base_discount: 10
        },
        error: null
      });
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: mockEq
        })
      });
      
      const discount = await bundleService.calculateTieredDiscount('bundle123');
      expect(discount.percentage).toBeGreaterThan(10);
    });

    it('should handle dynamic pricing rules', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        data: { 
          pricing_rules: {
            seasonal: true,
            multiplier: 1.2
          }
        },
        error: null
      });
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: mockEq
        })
      });
      
      const price = await bundleService.applyDynamicPricing('bundle123');
      expect(price.adjusted).toBeDefined();
    });
  });

  describe('Bundle Inventory', () => {
    it('should validate all products are in stock', async () => {
      const mockIn = jest.fn().mockResolvedValue({
        data: [
          { id: 'prod1', stock: 10 },
          { id: 'prod2', stock: 5 }
        ],
        error: null
      });
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: mockIn
        })
      });
      
      const available = await bundleService.validateBundleInventory('bundle123');
      expect(available.in_stock).toBe(true);
      expect(available.max_quantity).toBe(5);
    });

    it('should handle out of stock products', async () => {
      const mockIn = jest.fn().mockResolvedValue({
        data: [
          { id: 'prod1', stock: 10 },
          { id: 'prod2', stock: 0 }
        ],
        error: null
      });
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: mockIn
        })
      });
      
      const available = await bundleService.validateBundleInventory('bundle123');
      expect(available.in_stock).toBe(false);
      expect(available.unavailable_products).toContain('prod2');
    });

    it('should reserve inventory for bundle orders', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        data: { reserved: true },
        error: null
      });
      
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: mockEq
        })
      });
      
      const reservation = await bundleService.reserveBundleInventory('bundle123', 2);
      expect(reservation.reserved).toBe(true);
    });
  });

  describe('Bundle Product Management', () => {
    it('should add product to existing bundle', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        data: { product_ids: ['prod1', 'prod2', 'prod3'] },
        error: null
      });
      
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: mockEq
        })
      });
      
      const result = await bundleService.addProductToBundle('bundle123', 'prod3');
      expect(result.product_ids).toHaveLength(3);
    });

    it('should prevent duplicate products in bundle', async () => {
      await expect(bundleService.addProductToBundle('bundle123', 'prod1'))
        .rejects.toThrow('Product already in bundle');
    });

    it('should remove product from bundle', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        data: { product_ids: ['prod1'] },
        error: null
      });
      
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: mockEq
        })
      });
      
      const result = await bundleService.removeProductFromBundle('bundle123', 'prod2');
      expect(result.product_ids).toHaveLength(1);
    });

    it('should prevent removing last required products', async () => {
      await expect(bundleService.removeProductFromBundle('bundle123', 'prod1', ['prod1']))
        .rejects.toThrow('Cannot remove: bundle requires minimum 2 products');
    });
  });

  describe('Bundle Activation', () => {
    it('should activate bundle for sale', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        data: { is_active: true, activated_at: '2025-01-01' },
        error: null
      });
      
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: mockEq
        })
      });
      
      const result = await bundleService.activateBundle('bundle123');
      expect(result.is_active).toBe(true);
    });

    it('should deactivate bundle', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        data: { is_active: false },
        error: null
      });
      
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: mockEq
        })
      });
      
      const result = await bundleService.deactivateBundle('bundle123');
      expect(result.is_active).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid bundle ID', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: null
      });
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: mockEq
        })
      });
      
      await expect(bundleService.getBundle('invalid'))
        .rejects.toThrow('Bundle not found');
    });

    it('should handle database errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      await expect(bundleService.listBundles())
        .rejects.toThrow('Database error');
    });
  });
});
