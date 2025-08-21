import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Real Supabase configuration for testing
import { supabase } from '../../../config/supabase';

// Mock ValidationMonitor (following architectural pattern)
jest.mock('../../../utils/validationMonitor');

import { ProductBundleService } from '../productBundleService';
import { ValidationMonitor } from '../../../utils/validationMonitor';
import type { 
  ProductBundleTransform,
  CreateProductBundleInput,
  UpdateProductBundleInput,
  BundleProductInput
} from '../../../schemas/marketing';

// Phase 1 Integration: Role-based permissions
import { RolePermissionService } from '../../role-based/rolePermissionService';

// Phase 2 Integration: Inventory impact
import { InventoryService } from '../../inventory/inventoryService';

// Real database testing against test tables
describe('ProductBundleService - Phase 3.2 (Real Database)', () => {
  
  // Test data cleanup IDs
  const testBundleIds = new Set<string>();
  const testBundleProductIds = new Set<string>();
  const testProductIds = new Set<string>();
  const testUserId = 'test-user-bundle-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Track test data for cleanup
    testBundleIds.clear();
    testBundleProductIds.clear();
    testProductIds.clear();
  });

  afterEach(async () => {
    // Clean up test data from real database
    try {
      // Delete bundle products first (foreign key constraint)
      if (testBundleProductIds.size > 0) {
        await supabase
          .from('bundle_products')
          .delete()
          .in('id', Array.from(testBundleProductIds));
      }

      // Delete bundles
      if (testBundleIds.size > 0) {
        await supabase
          .from('product_bundles')
          .delete()
          .in('id', Array.from(testBundleIds));
      }
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });

  describe('createBundle', () => {
    it('should create bundle with product associations and pricing validation', async () => {
      // Mock role permission
      jest.spyOn(RolePermissionService, 'hasPermission').mockResolvedValue(true);

      const bundleData: CreateProductBundleInput = {
        bundleName: 'Test Fresh Produce Bundle',
        bundleDescription: 'A variety of fresh organic vegetables',
        bundlePrice: 45.99,
        bundleDiscountAmount: 8.00,
        isActive: true,
        isFeatured: false,
        displayOrder: 10,
        products: [
          { productId: 'test-product-1', quantity: 2, displayOrder: 1 },
          { productId: 'test-product-2', quantity: 3, displayOrder: 2 },
          { productId: 'test-product-3', quantity: 1, displayOrder: 3 }
        ]
      };

      const result = await ProductBundleService.createBundle(
        bundleData,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.success && result.data) {
        testBundleIds.add(result.data.id);

        // Verify bundle data transformation
        expect(result.data.bundleName).toBe('Test Fresh Produce Bundle');
        expect(result.data.bundlePrice).toBe(45.99);
        expect(result.data.bundleDiscountAmount).toBe(8.00);
        expect(result.data.isActive).toBe(true);
        expect(result.data.createdBy).toBe(testUserId);

        // Verify database state
        const { data: dbBundle } = await supabase
          .from('product_bundles')
          .select('*')
          .eq('id', result.data.id)
          .single();

        expect(dbBundle?.bundle_name).toBe('Test Fresh Produce Bundle');
        expect(dbBundle?.bundle_price).toBe(45.99);
        expect(dbBundle?.created_by).toBe(testUserId);

        // Verify bundle products were created
        const { data: bundleProducts } = await supabase
          .from('bundle_products')
          .select('*')
          .eq('bundle_id', result.data.id)
          .order('display_order');

        expect(bundleProducts).toHaveLength(3);
        expect(bundleProducts?.[0].product_id).toBe('test-product-1');
        expect(bundleProducts?.[0].quantity).toBe(2);
        expect(bundleProducts?.[1].product_id).toBe('test-product-2');
        expect(bundleProducts?.[1].quantity).toBe(3);

        // Track for cleanup
        bundleProducts?.forEach(bp => testBundleProductIds.add(bp.id));
      }

      // Verify ValidationMonitor integration
      expect(ValidationMonitor.logOperation).toHaveBeenCalledWith(
        'ProductBundleService.createBundle',
        true,
        expect.objectContaining({
          bundleName: 'Test Fresh Produce Bundle',
          productCount: 3
        })
      );
    });

    it('should validate bundle pricing business rules', async () => {
      jest.spyOn(RolePermissionService, 'hasPermission').mockResolvedValue(true);

      const invalidBundleData: CreateProductBundleInput = {
        bundleName: 'Invalid Pricing Bundle',
        bundlePrice: 20.00,
        bundleDiscountAmount: 25.00, // Discount exceeds price (invalid)
        isActive: true,
        products: [
          { productId: 'test-product-1', quantity: 1 }
        ]
      };

      const result = await ProductBundleService.createBundle(
        invalidBundleData,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Discount amount cannot exceed bundle price');
    });

    it('should enforce featured bundle pricing constraints', async () => {
      jest.spyOn(RolePermissionService, 'hasPermission').mockResolvedValue(true);

      const lowPriceFeaturedBundle: CreateProductBundleInput = {
        bundleName: 'Low Price Featured Bundle',
        bundlePrice: 5.00, // Below minimum for featured bundles ($10)
        isFeatured: true,
        isActive: true,
        products: [
          { productId: 'test-product-1', quantity: 1 }
        ]
      };

      const result = await ProductBundleService.createBundle(
        lowPriceFeaturedBundle,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Featured bundles should have a minimum price of $10');
    });

    it('should validate unique products in bundle', async () => {
      jest.spyOn(RolePermissionService, 'hasPermission').mockResolvedValue(true);

      const duplicateProductBundle: CreateProductBundleInput = {
        bundleName: 'Duplicate Product Bundle',
        bundlePrice: 30.00,
        isActive: true,
        products: [
          { productId: 'test-product-1', quantity: 2 },
          { productId: 'test-product-1', quantity: 1 } // Duplicate product
        ]
      };

      const result = await ProductBundleService.createBundle(
        duplicateProductBundle,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Bundle cannot contain duplicate products');
    });
  });

  describe('updateBundleProducts', () => {
    it('should update bundle products with inventory impact calculation', async () => {
      // Create test bundle first
      const testBundle = {
        bundle_name: 'Update Test Bundle',
        bundle_price: 50.00,
        is_active: true,
        created_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: createdBundle } = await supabase
        .from('product_bundles')
        .insert(testBundle)
        .select()
        .single();

      if (createdBundle) {
        testBundleIds.add(createdBundle.id);
      }

      // Create initial bundle products
      const initialProducts = [
        {
          bundle_id: createdBundle!.id,
          product_id: 'test-product-initial-1',
          quantity: 1,
          display_order: 1,
          created_at: new Date().toISOString()
        },
        {
          bundle_id: createdBundle!.id,
          product_id: 'test-product-initial-2',
          quantity: 2,
          display_order: 2,
          created_at: new Date().toISOString()
        }
      ];

      const { data: initialBundleProducts } = await supabase
        .from('bundle_products')
        .insert(initialProducts)
        .select();

      if (initialBundleProducts) {
        initialBundleProducts.forEach(bp => testBundleProductIds.add(bp.id));
      }

      // Update bundle products
      const updatedProducts: BundleProductInput[] = [
        { productId: 'test-product-updated-1', quantity: 3, displayOrder: 1 },
        { productId: 'test-product-updated-2', quantity: 1, displayOrder: 2 },
        { productId: 'test-product-updated-3', quantity: 2, displayOrder: 3 }
      ];

      const result = await ProductBundleService.updateBundleProducts(
        createdBundle!.id,
        updatedProducts,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.bundleId).toBe(createdBundle!.id);
      expect(result.data?.products).toHaveLength(3);

      // Verify database state
      const { data: updatedBundleProducts } = await supabase
        .from('bundle_products')
        .select('*')
        .eq('bundle_id', createdBundle!.id)
        .order('display_order');

      expect(updatedBundleProducts).toHaveLength(3);
      expect(updatedBundleProducts?.[0].product_id).toBe('test-product-updated-1');
      expect(updatedBundleProducts?.[0].quantity).toBe(3);
      expect(updatedBundleProducts?.[2].product_id).toBe('test-product-updated-3');
      expect(updatedBundleProducts?.[2].quantity).toBe(2);

      // Track new products for cleanup
      updatedBundleProducts?.forEach(bp => testBundleProductIds.add(bp.id));
    });

    it('should calculate inventory impact for bundle changes', async () => {
      // Mock inventory service integration
      jest.spyOn(InventoryService, 'checkAvailability').mockResolvedValue({
        success: true,
        data: {
          'test-product-1': { available: 10, reserved: 2 },
          'test-product-2': { available: 15, reserved: 5 }
        }
      });

      const bundleProducts: BundleProductInput[] = [
        { productId: 'test-product-1', quantity: 3 },
        { productId: 'test-product-2', quantity: 2 }
      ];

      const result = await ProductBundleService.calculateInventoryImpact(
        bundleProducts,
        5 // Bundle quantity
      );

      expect(result.success).toBe(true);
      expect(result.data?.impact).toEqual([
        { productId: 'test-product-1', requiredQuantity: 15 }, // 3 * 5
        { productId: 'test-product-2', requiredQuantity: 10 }  // 2 * 5
      ]);
      expect(result.data?.availability.isAvailable).toBe(false); // Product 1: 15 required > 10 available
      expect(result.data?.availability.shortages).toHaveLength(1);
    });
  });

  describe('getBundlePerformance', () => {
    it('should track bundle sales and conversion metrics', async () => {
      // Create test bundle
      const testBundle = {
        bundle_name: 'Performance Test Bundle',
        bundle_price: 75.99,
        bundle_discount_amount: 10.00,
        is_active: true,
        created_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: createdBundle } = await supabase
        .from('product_bundles')
        .insert(testBundle)
        .select()
        .single();

      if (createdBundle) {
        testBundleIds.add(createdBundle.id);
      }

      const result = await ProductBundleService.getBundlePerformance(
        createdBundle!.id,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        },
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.bundleId).toBe(createdBundle!.id);
      expect(result.data?.performance).toBeDefined();
      expect(typeof result.data?.performance.totalSales).toBe('number');
      expect(typeof result.data?.performance.conversionRate).toBe('number');
      expect(typeof result.data?.performance.averageOrderValue).toBe('number');
      expect(typeof result.data?.performance.totalRevenue).toBe('number');
    });

    it('should calculate bundle savings and value propositions', async () => {
      // Mock individual product prices for savings calculation
      const bundleProducts = [
        { productId: 'test-product-1', quantity: 2, individualPrice: 15.00 },
        { productId: 'test-product-2', quantity: 1, individualPrice: 25.00 }
      ];
      const bundlePrice = 45.99;
      const bundleDiscount = 5.00;

      const result = await ProductBundleService.calculateBundleSavings(
        bundlePrice,
        bundleProducts,
        bundleDiscount
      );

      expect(result.success).toBe(true);
      expect(result.data?.individualTotal).toBe(55.00); // (15*2) + (25*1)
      expect(result.data?.bundlePrice).toBe(45.99);
      expect(result.data?.finalPrice).toBe(40.99); // 45.99 - 5.00
      expect(result.data?.totalSavings).toBe(14.01); // 55.00 - 40.99
      expect(result.data?.savingsPercentage).toBeCloseTo(25.47, 1); // (14.01/55.00)*100
      expect(result.data?.hasMeaningfulSavings).toBe(true); // > 5%
    });
  });

  describe('toggleBundleStatus', () => {
    it('should manage bundle activation with inventory integration', async () => {
      // Create test bundle
      const testBundle = {
        bundle_name: 'Status Toggle Bundle',
        bundle_price: 30.00,
        is_active: true,
        created_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: createdBundle } = await supabase
        .from('product_bundles')
        .insert(testBundle)
        .select()
        .single();

      if (createdBundle) {
        testBundleIds.add(createdBundle.id);
      }

      // Deactivate bundle
      const result = await ProductBundleService.toggleBundleStatus(
        createdBundle!.id,
        false,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.isActive).toBe(false);

      // Verify database state
      const { data: updatedBundle } = await supabase
        .from('product_bundles')
        .select('*')
        .eq('id', createdBundle!.id)
        .single();

      expect(updatedBundle?.is_active).toBe(false);
    });

    it('should validate inventory availability before activation', async () => {
      // Mock insufficient inventory
      jest.spyOn(InventoryService, 'checkAvailability').mockResolvedValue({
        success: true,
        data: {
          'test-product-low': { available: 1, reserved: 0 }
        }
      });

      // Create bundle with products requiring more inventory than available
      const testBundle = {
        bundle_name: 'Low Inventory Bundle',
        bundle_price: 25.00,
        is_active: false,
        created_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: createdBundle } = await supabase
        .from('product_bundles')
        .insert(testBundle)
        .select()
        .single();

      if (createdBundle) {
        testBundleIds.add(createdBundle.id);
      }

      // Add bundle products requiring more inventory than available
      const bundleProduct = {
        bundle_id: createdBundle!.id,
        product_id: 'test-product-low',
        quantity: 5, // More than available (1)
        created_at: new Date().toISOString()
      };

      const { data: createdBundleProduct } = await supabase
        .from('bundle_products')
        .insert(bundleProduct)
        .select()
        .single();

      if (createdBundleProduct) {
        testBundleProductIds.add(createdBundleProduct.id);
      }

      // Try to activate bundle (should fail due to insufficient inventory)
      const result = await ProductBundleService.toggleBundleStatus(
        createdBundle!.id,
        true,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient inventory');
    });
  });

  describe('calculateBundleDiscount', () => {
    it('should calculate dynamic pricing with business logic', async () => {
      const bundleProducts = [
        { productId: 'test-product-1', quantity: 2, price: 12.00 },
        { productId: 'test-product-2', quantity: 1, price: 20.00 },
        { productId: 'test-product-3', quantity: 3, price: 8.00 }
      ];

      const result = await ProductBundleService.calculateBundleDiscount(
        bundleProducts,
        {
          discountType: 'percentage',
          discountValue: 15,
          minimumSavings: 5.00
        }
      );

      expect(result.success).toBe(true);
      expect(result.data?.individualTotal).toBe(68.00); // (12*2)+(20*1)+(8*3)
      expect(result.data?.discountAmount).toBe(10.20); // 68.00 * 0.15
      expect(result.data?.bundlePrice).toBe(57.80); // 68.00 - 10.20
      expect(result.data?.meetsMinimumSavings).toBe(true); // 10.20 > 5.00
    });

    it('should handle fixed amount discounts', async () => {
      const bundleProducts = [
        { productId: 'test-product-1', quantity: 1, price: 30.00 }
      ];

      const result = await ProductBundleService.calculateBundleDiscount(
        bundleProducts,
        {
          discountType: 'fixed',
          discountValue: 8.00,
          minimumSavings: 5.00
        }
      );

      expect(result.success).toBe(true);
      expect(result.data?.individualTotal).toBe(30.00);
      expect(result.data?.discountAmount).toBe(8.00);
      expect(result.data?.bundlePrice).toBe(22.00);
      expect(result.data?.meetsMinimumSavings).toBe(true);
    });
  });

  describe('Role-based access control', () => {
    it('should validate bundle management permissions', async () => {
      jest.spyOn(RolePermissionService, 'hasPermission').mockResolvedValue(false);

      const bundleData: CreateProductBundleInput = {
        bundleName: 'Unauthorized Bundle',
        bundlePrice: 25.00,
        isActive: true,
        products: [
          { productId: 'test-product-1', quantity: 1 }
        ]
      };

      const result = await ProductBundleService.createBundle(
        bundleData,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient permissions');
      expect(RolePermissionService.hasPermission).toHaveBeenCalledWith(
        testUserId,
        'bundle_management'
      );
    });

    it('should allow inventory staff read access to bundles', async () => {
      // Mock inventory staff permission (read-only)
      jest.spyOn(RolePermissionService, 'hasPermission')
        .mockImplementation((userId, permission) => {
          if (permission === 'bundle_management') return Promise.resolve(false);
          if (permission === 'inventory_management') return Promise.resolve(true);
          return Promise.resolve(false);
        });

      const result = await ProductBundleService.getBundlesByStatus(
        'active',
        { page: 1, limit: 10 },
        testUserId
      );

      expect(result.success).toBe(true);
      expect(RolePermissionService.hasPermission).toHaveBeenCalledWith(
        testUserId,
        'inventory_management'
      );
    });
  });

  describe('Integration with campaign system', () => {
    it('should support campaign association for bundles', async () => {
      const testBundle = {
        bundle_name: 'Campaign Bundle',
        bundle_price: 60.00,
        campaign_id: 'test-campaign-123',
        is_active: true,
        created_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: createdBundle } = await supabase
        .from('product_bundles')
        .insert(testBundle)
        .select()
        .single();

      if (createdBundle) {
        testBundleIds.add(createdBundle.id);
      }

      const result = await ProductBundleService.getBundleDetails(
        createdBundle!.id,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.campaignId).toBe('test-campaign-123');
      expect(result.data?.bundleName).toBe('Campaign Bundle');
    });

    it('should calculate effective pricing with campaign discounts', async () => {
      const bundlePrice = 50.00;
      const bundleDiscount = 5.00;
      const campaignDiscountPercentage = 20;

      const result = await ProductBundleService.calculateEffectivePrice(
        bundlePrice,
        bundleDiscount,
        campaignDiscountPercentage
      );

      expect(result.success).toBe(true);
      expect(result.data?.originalPrice).toBe(50.00);
      expect(result.data?.bundleDiscount).toBe(5.00);
      expect(result.data?.priceAfterBundleDiscount).toBe(45.00);
      expect(result.data?.campaignDiscount).toBe(9.00); // 45.00 * 0.20
      expect(result.data?.finalPrice).toBe(36.00); // 45.00 - 9.00
      expect(result.data?.totalSavings).toBe(14.00); // 50.00 - 36.00
    });
  });

  describe('Performance validation', () => {
    it('should handle bundle operations within performance targets', async () => {
      const startTime = performance.now();

      // Perform multiple bundle queries
      const promises = Array.from({ length: 3 }, () =>
        ProductBundleService.getBundlesByStatus('active', { page: 1, limit: 5 })
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Bundle queries should complete within reasonable time
      expect(executionTime).toBeLessThan(1000); // Allow margin for test environment
    });
  });
});