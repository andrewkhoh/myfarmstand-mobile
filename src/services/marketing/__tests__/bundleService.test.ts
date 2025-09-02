import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMockSupabaseClient, createMockLogger } from '@/test/serviceSetup';

// Mock Supabase FIRST
jest.mock('@/config/supabase', () => ({
  supabase: createMockSupabaseClient()
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: createMockLogger()
}));

// Mock the service (it doesn't exist yet - RED phase)
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
    applyBundleDiscount: jest.fn(),
    validateBundleInventory: jest.fn(),
    activateBundle: jest.fn(),
    deactivateBundle: jest.fn(),
    getBundleProducts: jest.fn()
  }
}));

describe('BundleService', () => {
  let mockSupabase: any;
  let mockLogger: any;
  let bundleService: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = require('@/config/supabase').supabase;
    mockLogger = require('@/utils/logger').logger;
    bundleService = require('../bundleService').bundleService;
    
    // Setup default mock behaviors
    setupDefaultMocks();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  function setupDefaultMocks() {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis() as any,
      insert: jest.fn().mockReturnThis() as any,
      update: jest.fn().mockReturnThis() as any,
      delete: jest.fn().mockReturnThis() as any,
      eq: jest.fn().mockReturnThis() as any,
      neq: jest.fn().mockReturnThis() as any,
      in: jest.fn().mockReturnThis() as any,
      gte: jest.fn().mockReturnThis() as any,
      lte: jest.fn().mockReturnThis() as any,
      order: jest.fn().mockReturnThis() as any,
      limit: jest.fn().mockReturnThis() as any,
      single: jest.fn().mockResolvedValue({ data: null, error: null }) as any,
      execute: jest.fn().mockResolvedValue({ data: [], error: null }) as any
    });
  }
  
  describe('createBundle', () => {
    it('should create product bundle with pricing', async () => {
      const mockData = {
        name: 'Summer Collection Bundle',
        description: 'Complete summer outfit package',
        product_ids: ['prod-1', 'prod-2', 'prod-3'],
        discount_type: 'percentage',
        discount_value: 15,
        valid_from: '2024-06-01',
        valid_until: '2024-08-31'
      };
      
      const expectedResult = {
        id: 'bundle-123',
        ...mockData,
        status: 'draft',
        total_price: 150.00,
        discounted_price: 127.50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [expectedResult],
            error: null
          } as any)
        } as any)
      } as any);
      
      // This will fail - service doesn't exist (RED phase)
      const result = await bundleService.createBundle(mockData);
      
      expect(result).toEqual(expectedResult);
      expect(result.status).toBe('draft');
      expect(result.discounted_price).toBe(127.50);
      expect(mockSupabase.from).toHaveBeenCalledWith('marketing_bundles');
    });
    
    it('should validate bundle has at least 2 products', async () => {
      const invalidData = {
        name: 'Invalid Bundle',
        product_ids: ['prod-1'] // Only one product
      };
      
      await expect(bundleService.createBundle(invalidData))
        .rejects.toThrow('Bundle must contain at least 2 products');
    });
    
    it('should validate discount value ranges', async () => {
      const invalidData = {
        name: 'Invalid Discount Bundle',
        product_ids: ['prod-1', 'prod-2'],
        discount_type: 'percentage',
        discount_value: 150 // Over 100%
      };
      
      await expect(bundleService.createBundle(invalidData))
        .rejects.toThrow('Percentage discount cannot exceed 100%');
    });
    
    it('should handle database errors during creation', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          } as any)
        } as any)
      } as any);
      
      await expect(bundleService.createBundle({ name: 'Test' }))
        .rejects.toThrow('Failed to create bundle');
      
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
  
  describe('Product Management', () => {
    it('should add product to existing bundle', async () => {
      const bundleId = 'bundle-123';
      const productId = 'prod-4';
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: bundleId,
                product_ids: ['prod-1', 'prod-2', 'prod-3']
              },
              error: null
            } as any)
          } as any)
        } as any)
      } as any);
      
      const result = await bundleService.addProductToBundle(bundleId, productId);
      
      expect(result.product_ids).toContain(productId);
      expect(result.product_ids).toHaveLength(4);
    });
    
    it('should prevent duplicate products in bundle', async () => {
      const bundleId = 'bundle-123';
      const productId = 'prod-1';
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: bundleId,
                product_ids: ['prod-1', 'prod-2']
              },
              error: null
            } as any)
          } as any)
        } as any)
      } as any);
      
      await expect(bundleService.addProductToBundle(bundleId, productId))
        .rejects.toThrow('Product already exists in bundle');
    });
    
    it('should remove product from bundle', async () => {
      const bundleId = 'bundle-123';
      const productId = 'prod-2';
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: bundleId,
                product_ids: ['prod-1', 'prod-2', 'prod-3']
              },
              error: null
            } as any)
          } as any)
        } as any)
      } as any);
      
      const result = await bundleService.removeProductFromBundle(bundleId, productId);
      
      expect(result.product_ids).not.toContain(productId);
      expect(result.product_ids).toHaveLength(2);
    });
    
    it('should maintain minimum product requirement', async () => {
      const bundleId = 'bundle-123';
      const productId = 'prod-2';
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: bundleId,
                product_ids: ['prod-1', 'prod-2'] // Only 2 products
              },
              error: null
            } as any)
          } as any)
        } as any)
      } as any);
      
      await expect(bundleService.removeProductFromBundle(bundleId, productId))
        .rejects.toThrow('Bundle must contain at least 2 products');
    });
  });
  
  describe('Pricing Calculations', () => {
    it('should calculate bundle price with percentage discount', async () => {
      const bundleId = 'bundle-123';
      const products = [
        { id: 'prod-1', price: 50 },
        { id: 'prod-2', price: 75 },
        { id: 'prod-3', price: 25 }
      ];
      const discountPercentage = 20;
      
      const result = await bundleService.calculateBundlePrice(
        bundleId, 
        products, 
        'percentage', 
        discountPercentage
      );
      
      expect(result.original_price).toBe(150);
      expect(result.discounted_price).toBe(120);
      expect(result.savings).toBe(30);
    });
    
    it('should calculate bundle price with fixed discount', async () => {
      const bundleId = 'bundle-123';
      const products = [
        { id: 'prod-1', price: 50 },
        { id: 'prod-2', price: 75 }
      ];
      const fixedDiscount = 25;
      
      const result = await bundleService.calculateBundlePrice(
        bundleId, 
        products, 
        'fixed', 
        fixedDiscount
      );
      
      expect(result.original_price).toBe(125);
      expect(result.discounted_price).toBe(100);
      expect(result.savings).toBe(25);
    });
    
    it('should not allow negative final price', async () => {
      const bundleId = 'bundle-123';
      const products = [{ id: 'prod-1', price: 50 }];
      const fixedDiscount = 100;
      
      const result = await bundleService.calculateBundlePrice(
        bundleId, 
        products, 
        'fixed', 
        fixedDiscount
      );
      
      expect(result.discounted_price).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Bundle Activation', () => {
    it('should activate draft bundle', async () => {
      const bundleId = 'bundle-123';
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: bundleId,
                status: 'draft',
                product_ids: ['prod-1', 'prod-2']
              },
              error: null
            } as any)
          } as any)
        } as any)
      } as any);
      
      const result = await bundleService.activateBundle(bundleId);
      
      expect(result.status).toBe('active');
      expect(result.activated_at).toBeDefined();
    });
    
    it('should validate inventory before activation', async () => {
      const bundleId = 'bundle-123';
      
      // Mock inventory check failure
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue({
              data: [
                { id: 'prod-1', inventory_count: 5 },
                { id: 'prod-2', inventory_count: 0 } // Out of stock
              ],
              error: null
            } as any)
          } as any)
        } as any)
      } as any);
      
      await expect(bundleService.activateBundle(bundleId))
        .rejects.toThrow('Insufficient inventory for bundle products');
    });
    
    it('should deactivate active bundle', async () => {
      const bundleId = 'bundle-123';
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: bundleId,
                status: 'active'
              },
              error: null
            } as any)
          } as any)
        } as any)
      } as any);
      
      const result = await bundleService.deactivateBundle(bundleId);
      
      expect(result.status).toBe('inactive');
      expect(result.deactivated_at).toBeDefined();
    });
  });
  
  describe('Error Handling', () => {
    it('should handle bundle not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            } as any)
          } as any)
        } as any)
      } as any);
      
      await expect(bundleService.getBundle('non-existent'))
        .rejects.toThrow('Bundle not found');
    });
    
    it('should handle concurrent modifications', async () => {
      const bundleId = 'bundle-123';
      
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [],
                error: { code: 'PGRST301' }
              } as any)
            } as any)
          } as any)
        } as any)
      } as any);
      
      await expect(bundleService.updateBundle(bundleId, {}))
        .rejects.toThrow('Bundle was modified by another user');
    });
  });
});