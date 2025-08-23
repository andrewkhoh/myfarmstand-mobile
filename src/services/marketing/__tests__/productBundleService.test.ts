// Mock ValidationMonitor before importing service (Pattern 1)
jest.mock('../../../utils/validationMonitor');

import { ProductBundleService } from '../productBundleService';
import { ValidationMonitor } from '../../../utils/validationMonitor';
import type { 
  ProductBundleTransform,
  CreateProductBundleInput,
  UpdateProductBundleInput,
  BundleProductInput
} from '../../../schemas/marketing';

// Mock the supabase module at the service level (AuthService exact pattern)
const mockSupabase = require('../../../config/supabase').supabase;

// Mock role permissions
jest.mock('../../role-based/rolePermissionService');
const mockRolePermissionService = require('../../role-based/rolePermissionService').RolePermissionService;

// Mock inventory service
jest.mock('../../inventory/inventoryService', () => ({
  InventoryService: {
    checkProductsAvailability: jest.fn(),
    reserveProductsForBundle: jest.fn(),
    releaseProductReservation: jest.fn(),
    updateInventoryForBundle: jest.fn()
  }
}));
const mockInventoryService = require('../../inventory/inventoryService').InventoryService;

// Mock pattern testing (Pattern 1 from scratchpad analysis)
describe('ProductBundleService - Phase 3.2 (Mock Pattern)', () => {
  const testUserId = 'test-user-bundle-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns for chainable Supabase queries
    mockSupabase.from = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    }));
    
    // Default permission mock
    mockRolePermissionService.hasPermission.mockResolvedValue(true);
    
    // Default inventory service mocks
    mockInventoryService.checkProductsAvailability.mockResolvedValue({
      success: true,
      data: { available: true, stock: 100 }
    });
    mockInventoryService.reserveProductsForBundle.mockResolvedValue({
      success: true,
      data: { reservationId: 'reservation-123' }
    });
  });

  // No cleanup needed for mock-based tests

  describe('createBundle', () => {
    it('should create bundle with product associations and pricing validation', async () => {
      // Mock role permission
      mockRolePermissionService.hasPermission = jest.fn().mockResolvedValue(true);

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

      // Mock successful bundle creation
      const mockCreatedBundle = {
        id: 'bundle-created-123',
        bundle_name: 'Test Fresh Produce Bundle',
        bundle_description: 'A variety of fresh organic vegetables',
        bundle_price: 45.99,
        bundle_discount_amount: 8.00,
        is_active: true,
        is_featured: false,
        display_order: 10,
        campaign_id: null,
        created_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock the bundle creation (first database call)
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockCreatedBundle,
              error: null
            })
          })
        })
      });

      // Mock the bundle products creation (second database call)
      const mockBundleProducts = [
        {
          id: 'bundle-product-1',
          bundle_id: 'bundle-created-123',
          product_id: 'product-1',
          quantity: 2,
          display_order: 1,
          created_at: new Date().toISOString()
        },
        {
          id: 'bundle-product-2', 
          bundle_id: 'bundle-created-123',
          product_id: 'product-2',
          quantity: 1,
          display_order: 2,
          created_at: new Date().toISOString()
        }
      ];

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: mockBundleProducts,
            error: null
          })
        })
      });

      const result = await ProductBundleService.createBundle(
        bundleData,
        testUserId
      );

      // Debug: log the result to see what's happening
      if (!result.success) {
        console.log('Create bundle failed with error:', result.error);
      }

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.success && result.data) {
        // Verify bundle data transformation
        expect(result.data.bundleName).toBe('Test Fresh Produce Bundle');
        expect(result.data.bundlePrice).toBe(45.99);
        expect(result.data.bundleDiscountAmount).toBe(8.00);
        expect(result.data.isActive).toBe(true);
        expect(result.data.createdBy).toBe(testUserId);

        // Verify bundle creation succeeded (no database verification needed with mocks)
        expect(result.data.bundleName).toBe('Test Fresh Produce Bundle');
        expect(result.data.bundlePrice).toBe(45.99);
        expect(result.data.createdBy).toBe(testUserId);
      }

      // Verify ValidationMonitor integration
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'productBundleService',
        pattern: 'transformation_schema',
        operation: 'createBundle'
      });
    });

    it('should validate bundle pricing business rules', async () => {
      // Role permission already mocked in beforeEach

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
      mockRolePermissionService.hasPermission = jest.fn().mockResolvedValue(true);

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
      mockRolePermissionService.hasPermission = jest.fn().mockResolvedValue(true);

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
      // Mock test bundle data
      const testBundleId = 'test-bundle-update-123';
      const mockBundle = {
        id: testBundleId,
        bundle_name: 'Update Test Bundle',
        bundle_price: 50.00,
        is_active: true,
        created_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock initial bundle products
      const initialBundleProducts = [
        {
          id: 'bundle-product-1',
          bundle_id: testBundleId,
          product_id: 'test-product-initial-1',
          quantity: 1,
          display_order: 1,
          created_at: new Date().toISOString()
        },
        {
          id: 'bundle-product-2',
          bundle_id: testBundleId,
          product_id: 'test-product-initial-2',
          quantity: 2,
          display_order: 2,
          created_at: new Date().toISOString()
        }
      ];

      // Update bundle products
      const updatedProducts: BundleProductInput[] = [
        { productId: 'test-product-updated-1', quantity: 3, displayOrder: 1 },
        { productId: 'test-product-updated-2', quantity: 1, displayOrder: 2 },
        { productId: 'test-product-updated-3', quantity: 2, displayOrder: 3 }
      ];

      // Mock the delete and insert operations for bundle products update
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({ 
            data: updatedProducts.map((p, index) => ({ 
              id: `bundle-product-${index + 1}`,
              bundle_id: testBundleId,
              product_id: p.productId,
              quantity: p.quantity,
              display_order: p.displayOrder,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })), 
            error: null 
          })
        })
      });

      const result = await ProductBundleService.updateBundleProducts(
        testBundleId,
        updatedProducts,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.bundleId).toBe(testBundleId);
      expect(result.data?.products).toHaveLength(3);

      // Verify mock was called correctly
      expect(mockSupabase.from).toHaveBeenCalledWith('bundle_products');
      expect(mockSupabase.from).toHaveBeenCalledWith('product_bundles');
    });

    it('should calculate inventory impact for bundle changes', async () => {
      // Mock inventory service integration for each product call
      mockInventoryService.getInventoryByProduct = jest.fn()
        .mockImplementation((productId) => {
          if (productId === 'test-product-1') {
            return { availableStock: 10 }; // Shortage: needs 15, has 10
          } else if (productId === 'test-product-2') {
            return { availableStock: 15 }; // No shortage: needs 10, has 15
          }
          return { availableStock: 0 };
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
      // Mock test bundle
      const testBundleId = 'test-bundle-perf-123';
      const mockBundle = {
        id: testBundleId,
        bundle_name: 'Performance Test Bundle',
        bundle_price: 75.99,
        bundle_discount_amount: 10.00,
        is_active: true,
        created_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock the bundle query
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBundle, error: null })
      }));

      const result = await ProductBundleService.getBundlePerformance(
        testBundleId,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        },
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.bundleId).toBe(testBundleId);
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
      expect(result.data?.totalSavings).toBeCloseTo(14.01, 2); // 55.00 - 40.99
      expect(result.data?.savingsPercentage).toBeCloseTo(25.47, 1); // (14.01/55.00)*100
      expect(result.data?.hasMeaningfulSavings).toBe(true); // > 5%
    });
  });

  describe('toggleBundleStatus', () => {
    it('should manage bundle activation with inventory integration', async () => {
      // Mock test bundle
      const testBundleId = 'test-bundle-toggle-123';
      const mockBundle = {
        id: testBundleId,
        bundle_name: 'Status Toggle Bundle',
        bundle_price: 30.00,
        is_active: true,
        created_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock the queries
      mockSupabase.from = jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { ...mockBundle, is_active: false }, 
          error: null 
        })
      }));

      // Deactivate bundle
      const result = await ProductBundleService.toggleBundleStatus(
        testBundleId,
        false,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.isActive).toBe(false);

      // Verify mock was called correctly
      expect(mockSupabase.from).toHaveBeenCalledWith('product_bundles');
    });

    it('should validate inventory availability before activation', async () => {
      // Mock insufficient inventory
      mockInventoryService.checkAvailability = jest.fn().mockResolvedValue({
        success: true,
        data: {
          'test-product-low': { available: 1, reserved: 0 }
        }
      });

      // Mock test bundle with products
      const testBundleId = 'test-bundle-inventory-123';
      const mockBundle = {
        id: testBundleId,
        bundle_name: 'Low Inventory Bundle',
        bundle_price: 25.00,
        is_active: false,
        created_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const mockBundleProducts = [{
        id: 'bundle-product-low-1',
        bundle_id: testBundleId,
        product_id: 'test-product-low',
        quantity: 5, // More than available (1)
        created_at: new Date().toISOString()
      }];

      // Mock the queries
      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'product_bundles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockBundle, error: null })
          };
        }
        if (table === 'bundle_products') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: mockBundleProducts, error: null })
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        };
      });

      // Try to activate bundle (should fail due to insufficient inventory)
      const result = await ProductBundleService.toggleBundleStatus(
        testBundleId,
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
      mockRolePermissionService.hasPermission = jest.fn().mockResolvedValue(false);

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
      expect(mockRolePermissionService.hasPermission).toHaveBeenCalledWith(
        testUserId,
        'bundle_management'
      );
    });

    it('should allow inventory staff read access to bundles', async () => {
      // Mock inventory staff permission (read-only)
      mockRolePermissionService.hasPermission = jest.fn()
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
      expect(mockRolePermissionService.hasPermission).toHaveBeenCalledWith(
        testUserId,
        'inventory_management'
      );
    });
  });

  describe('Integration with campaign system', () => {
    it('should support campaign association for bundles', async () => {
      const bundleId = 'bundle-campaign-123';
      
      // Mock bundle data with campaign association
      const mockBundleData = {
        id: bundleId,
        bundle_name: 'Campaign Bundle',
        bundle_description: 'Test bundle with campaign',
        bundle_price: 60.00,
        campaign_id: 'test-campaign-123',
        is_active: true,
        created_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        discount_percentage: 15.0,
        total_savings: 10.50,
        bundle_products: []
      };

      // Mock database call for getBundleDetails
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockBundleData,
          error: null
        })
      });

      const result = await ProductBundleService.getBundleDetails(
        bundleId,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.campaignId).toBe('test-campaign-123');
      expect(result.data?.bundleName).toBe('Campaign Bundle');
      
      // Verify ValidationMonitor integration
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'productBundleService',
        pattern: 'transformation_schema',
        operation: 'getBundleDetails'
      });
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