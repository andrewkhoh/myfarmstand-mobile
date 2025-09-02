import { describe, it, expect } from '@jest/globals';
// @ts-expect-error - Schema not implemented yet (RED phase)
import { productBundleSchema } from '../productBundle';

describe('ProductBundle Schema', () => {
  describe('Validation', () => {
    it('should validate complete product bundle', () => {
      const valid = {
        id: 'bundle-550e8400-e29b-41d4-a716-446655440000',
        name: 'Summer Garden Bundle',
        description: 'Complete garden starter kit with seeds, tools, and fertilizer',
        bundle_type: 'fixed',
        status: 'active',
        products: [
          {
            product_id: 'prod-123e4567-e89b-12d3-a456-426614174001',
            quantity: 5,
            discount_percentage: 10,
            is_required: true
          },
          {
            product_id: 'prod-123e4567-e89b-12d3-a456-426614174002',
            quantity: 1,
            discount_percentage: 15,
            is_required: true
          },
          {
            product_id: 'prod-123e4567-e89b-12d3-a456-426614174003',
            quantity: 2,
            discount_percentage: 0,
            is_required: false
          }
        ],
        pricing: {
          strategy: 'fixed_discount',
          bundle_price: 149.99,
          original_price: 189.99,
          savings_amount: 40.00,
          savings_percentage: 21.05
        },
        inventory: {
          track_bundle_inventory: true,
          bundle_stock: 50,
          max_bundles_per_order: 3,
          low_stock_threshold: 10
        },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-08-31T23:59:59Z',
        created_by: 'admin_user',
        updated_by: 'admin_user',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-20T14:30:00Z'
      };
      
      const result = productBundleSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject missing required field: id', () => {
      const invalid = {
        name: 'Test Bundle',
        description: 'Test bundle description',
        bundle_type: 'fixed',
        status: 'active',
        products: [
          { product_id: 'prod-123', quantity: 1, discount_percentage: 0, is_required: true }
        ],
        pricing: {
          strategy: 'percentage_discount',
          bundle_price: 99.99,
          original_price: 119.99,
          savings_amount: 20.00,
          savings_percentage: 16.67
        },
        inventory: { track_bundle_inventory: false },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-08-31T23:59:59Z',
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid bundle_type enum value', () => {
      const invalid = {
        id: 'bundle-123',
        name: 'Test Bundle',
        description: 'Test bundle',
        bundle_type: 'invalid_type',
        status: 'active',
        products: [
          { product_id: 'prod-123', quantity: 1, discount_percentage: 0, is_required: true }
        ],
        pricing: {
          strategy: 'fixed_discount',
          bundle_price: 99.99,
          original_price: 119.99,
          savings_amount: 20.00,
          savings_percentage: 16.67
        },
        inventory: { track_bundle_inventory: false },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-08-31T23:59:59Z',
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept all valid bundle types', () => {
      const types = ['fixed', 'dynamic', 'mix_and_match', 'tiered'];
      
      types.forEach(type => {
        const data = {
          id: 'bundle-123',
          name: `${type} Bundle`,
          description: 'Test bundle',
          bundle_type: type,
          status: 'active',
          products: [
            { product_id: 'prod-123', quantity: 1, discount_percentage: 10, is_required: true }
          ],
          pricing: {
            strategy: 'percentage_discount',
            bundle_price: 89.99,
            original_price: 99.99,
            savings_amount: 10.00,
            savings_percentage: 10.00
          },
          inventory: { track_bundle_inventory: false },
          valid_from: '2024-06-01T00:00:00Z',
          valid_until: '2024-08-31T23:59:59Z',
          created_by: 'user1',
          updated_by: 'user1',
          created_at: '2024-05-15T10:00:00Z',
          updated_at: '2024-05-15T10:00:00Z'
        };
        
        const result = productBundleSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject empty products array', () => {
      const invalid = {
        id: 'bundle-123',
        name: 'Empty Bundle',
        description: 'Bundle with no products',
        bundle_type: 'fixed',
        status: 'active',
        products: [],
        pricing: {
          strategy: 'fixed_discount',
          bundle_price: 0,
          original_price: 0,
          savings_amount: 0,
          savings_percentage: 0
        },
        inventory: { track_bundle_inventory: false },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-08-31T23:59:59Z',
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject negative product quantity', () => {
      const invalid = {
        id: 'bundle-123',
        name: 'Test Bundle',
        description: 'Test bundle',
        bundle_type: 'fixed',
        status: 'active',
        products: [
          { product_id: 'prod-123', quantity: -1, discount_percentage: 10, is_required: true }
        ],
        pricing: {
          strategy: 'percentage_discount',
          bundle_price: 89.99,
          original_price: 99.99,
          savings_amount: 10.00,
          savings_percentage: 10.00
        },
        inventory: { track_bundle_inventory: false },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-08-31T23:59:59Z',
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Pricing Validation', () => {
    it('should validate fixed discount pricing strategy', () => {
      const valid = {
        id: 'bundle-123',
        name: 'Fixed Discount Bundle',
        description: 'Bundle with fixed price discount',
        bundle_type: 'fixed',
        status: 'active',
        products: [
          { product_id: 'prod-1', quantity: 2, discount_percentage: 0, is_required: true },
          { product_id: 'prod-2', quantity: 1, discount_percentage: 0, is_required: true }
        ],
        pricing: {
          strategy: 'fixed_discount',
          bundle_price: 75.00,
          original_price: 100.00,
          savings_amount: 25.00,
          savings_percentage: 25.00
        },
        inventory: { track_bundle_inventory: true, bundle_stock: 100 },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-12-31T23:59:59Z',
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate percentage discount pricing strategy', () => {
      const valid = {
        id: 'bundle-456',
        name: 'Percentage Discount Bundle',
        description: 'Bundle with percentage based discount',
        bundle_type: 'dynamic',
        status: 'active',
        products: [
          { product_id: 'prod-1', quantity: 1, discount_percentage: 20, is_required: true },
          { product_id: 'prod-2', quantity: 1, discount_percentage: 20, is_required: false }
        ],
        pricing: {
          strategy: 'percentage_discount',
          bundle_price: 160.00,
          original_price: 200.00,
          savings_amount: 40.00,
          savings_percentage: 20.00
        },
        inventory: { track_bundle_inventory: false },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-12-31T23:59:59Z',
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject bundle price higher than original price', () => {
      const invalid = {
        id: 'bundle-123',
        name: 'Invalid Price Bundle',
        description: 'Bundle with incorrect pricing',
        bundle_type: 'fixed',
        status: 'active',
        products: [
          { product_id: 'prod-1', quantity: 1, discount_percentage: 0, is_required: true }
        ],
        pricing: {
          strategy: 'fixed_discount',
          bundle_price: 150.00,
          original_price: 100.00,
          savings_amount: -50.00,
          savings_percentage: -50.00
        },
        inventory: { track_bundle_inventory: false },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-12-31T23:59:59Z',
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject discount percentage over 100', () => {
      const invalid = {
        id: 'bundle-123',
        name: 'Invalid Discount Bundle',
        description: 'Bundle with invalid discount',
        bundle_type: 'fixed',
        status: 'active',
        products: [
          { product_id: 'prod-1', quantity: 1, discount_percentage: 150, is_required: true }
        ],
        pricing: {
          strategy: 'percentage_discount',
          bundle_price: 0,
          original_price: 100.00,
          savings_amount: 100.00,
          savings_percentage: 100.00
        },
        inventory: { track_bundle_inventory: false },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-12-31T23:59:59Z',
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate tiered pricing strategy', () => {
      const valid = {
        id: 'bundle-789',
        name: 'Tiered Pricing Bundle',
        description: 'Bundle with quantity-based tiered pricing',
        bundle_type: 'tiered',
        status: 'active',
        products: [
          { product_id: 'prod-1', quantity: 1, discount_percentage: 0, is_required: true }
        ],
        pricing: {
          strategy: 'tiered',
          bundle_price: 85.00,
          original_price: 100.00,
          savings_amount: 15.00,
          savings_percentage: 15.00,
          tiers: [
            { min_quantity: 1, max_quantity: 2, discount_percentage: 10 },
            { min_quantity: 3, max_quantity: 5, discount_percentage: 15 },
            { min_quantity: 6, max_quantity: null, discount_percentage: 20 }
          ]
        },
        inventory: { track_bundle_inventory: true, bundle_stock: 500 },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-12-31T23:59:59Z',
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Inventory Management', () => {
    it('should validate bundle with inventory tracking enabled', () => {
      const valid = {
        id: 'bundle-inv-001',
        name: 'Tracked Inventory Bundle',
        description: 'Bundle with inventory management',
        bundle_type: 'fixed',
        status: 'active',
        products: [
          { product_id: 'prod-1', quantity: 2, discount_percentage: 10, is_required: true },
          { product_id: 'prod-2', quantity: 1, discount_percentage: 10, is_required: true }
        ],
        pricing: {
          strategy: 'fixed_discount',
          bundle_price: 89.99,
          original_price: 109.99,
          savings_amount: 20.00,
          savings_percentage: 18.18
        },
        inventory: {
          track_bundle_inventory: true,
          bundle_stock: 150,
          max_bundles_per_order: 5,
          low_stock_threshold: 20,
          auto_disable_when_out: true,
          reserve_component_stock: true
        },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-12-31T23:59:59Z',
        created_by: 'inventory_manager',
        updated_by: 'inventory_manager',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate bundle without inventory tracking', () => {
      const valid = {
        id: 'bundle-no-inv',
        name: 'Untracked Bundle',
        description: 'Bundle without inventory tracking',
        bundle_type: 'dynamic',
        status: 'active',
        products: [
          { product_id: 'prod-1', quantity: 1, discount_percentage: 15, is_required: false },
          { product_id: 'prod-2', quantity: 1, discount_percentage: 15, is_required: false }
        ],
        pricing: {
          strategy: 'percentage_discount',
          bundle_price: 85.00,
          original_price: 100.00,
          savings_amount: 15.00,
          savings_percentage: 15.00
        },
        inventory: {
          track_bundle_inventory: false
        },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-12-31T23:59:59Z',
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject negative bundle stock', () => {
      const invalid = {
        id: 'bundle-123',
        name: 'Invalid Stock Bundle',
        description: 'Bundle with negative stock',
        bundle_type: 'fixed',
        status: 'active',
        products: [
          { product_id: 'prod-1', quantity: 1, discount_percentage: 10, is_required: true }
        ],
        pricing: {
          strategy: 'fixed_discount',
          bundle_price: 90.00,
          original_price: 100.00,
          savings_amount: 10.00,
          savings_percentage: 10.00
        },
        inventory: {
          track_bundle_inventory: true,
          bundle_stock: -10
        },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-12-31T23:59:59Z',
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Date Range Validation', () => {
    it('should reject valid_until before valid_from', () => {
      const invalid = {
        id: 'bundle-123',
        name: 'Invalid Date Bundle',
        description: 'Bundle with invalid date range',
        bundle_type: 'fixed',
        status: 'scheduled',
        products: [
          { product_id: 'prod-1', quantity: 1, discount_percentage: 10, is_required: true }
        ],
        pricing: {
          strategy: 'fixed_discount',
          bundle_price: 90.00,
          original_price: 100.00,
          savings_amount: 10.00,
          savings_percentage: 10.00
        },
        inventory: { track_bundle_inventory: false },
        valid_from: '2024-08-01T00:00:00Z',
        valid_until: '2024-07-01T00:00:00Z',
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept same day valid_from and valid_until for flash sales', () => {
      const valid = {
        id: 'bundle-flash',
        name: 'Flash Sale Bundle',
        description: '24-hour flash sale bundle',
        bundle_type: 'fixed',
        status: 'active',
        products: [
          { product_id: 'prod-1', quantity: 1, discount_percentage: 50, is_required: true }
        ],
        pricing: {
          strategy: 'percentage_discount',
          bundle_price: 50.00,
          original_price: 100.00,
          savings_amount: 50.00,
          savings_percentage: 50.00
        },
        inventory: { track_bundle_inventory: true, bundle_stock: 50 },
        valid_from: '2024-07-04T00:00:00Z',
        valid_until: '2024-07-04T23:59:59Z',
        created_by: 'flash_sale_admin',
        updated_by: 'flash_sale_admin',
        created_at: '2024-07-03T10:00:00Z',
        updated_at: '2024-07-03T10:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Transformations', () => {
    it('should transform date strings to Date objects', () => {
      const data = {
        id: 'bundle-123',
        name: 'Test Bundle',
        description: 'Test bundle',
        bundle_type: 'fixed',
        status: 'active',
        products: [
          { product_id: 'prod-1', quantity: 1, discount_percentage: 10, is_required: true }
        ],
        pricing: {
          strategy: 'fixed_discount',
          bundle_price: 90.00,
          original_price: 100.00,
          savings_amount: 10.00,
          savings_percentage: 10.00
        },
        inventory: { track_bundle_inventory: false },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-12-31T23:59:59Z',
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-20T14:30:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.valid_from).toBeInstanceOf(Date);
        expect(result.data.valid_until).toBeInstanceOf(Date);
        expect(result.data.created_at).toBeInstanceOf(Date);
        expect(result.data.updated_at).toBeInstanceOf(Date);
      }
    });

    it('should round monetary values to 2 decimal places', () => {
      const data = {
        id: 'bundle-123',
        name: 'Test Bundle',
        description: 'Test bundle',
        bundle_type: 'fixed',
        status: 'active',
        products: [
          { product_id: 'prod-1', quantity: 1, discount_percentage: 10.555, is_required: true }
        ],
        pricing: {
          strategy: 'fixed_discount',
          bundle_price: 89.999,
          original_price: 99.996,
          savings_amount: 9.997,
          savings_percentage: 10.001
        },
        inventory: { track_bundle_inventory: false },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-12-31T23:59:59Z',
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pricing.bundle_price).toBe(90.00);
        expect(result.data.pricing.original_price).toBe(100.00);
        expect(result.data.pricing.savings_amount).toBe(10.00);
        expect(result.data.pricing.savings_percentage).toBe(10.00);
        expect(result.data.products[0].discount_percentage).toBe(10.56);
      }
    });
  });

  describe('Contract Tests', () => {
    it('should match TypeScript interface for complete bundle', () => {
      const data = {
        id: 'bundle-complete',
        name: 'Complete Bundle',
        description: 'Fully featured bundle',
        bundle_type: 'mix_and_match',
        status: 'active',
        products: [
          { product_id: 'prod-1', quantity: 2, discount_percentage: 15, is_required: true },
          { product_id: 'prod-2', quantity: 1, discount_percentage: 10, is_required: false },
          { product_id: 'prod-3', quantity: 3, discount_percentage: 20, is_required: false }
        ],
        pricing: {
          strategy: 'percentage_discount',
          bundle_price: 250.00,
          original_price: 300.00,
          savings_amount: 50.00,
          savings_percentage: 16.67
        },
        inventory: {
          track_bundle_inventory: true,
          bundle_stock: 200,
          max_bundles_per_order: 10,
          low_stock_threshold: 25
        },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-12-31T23:59:59Z',
        created_by: 'admin',
        updated_by: 'manager',
        created_at: '2024-05-01T10:00:00Z',
        updated_at: '2024-05-25T15:45:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(typeof result.data.id).toBe('string');
        expect(typeof result.data.name).toBe('string');
        expect(typeof result.data.description).toBe('string');
        expect(typeof result.data.bundle_type).toBe('string');
        expect(typeof result.data.status).toBe('string');
        expect(Array.isArray(result.data.products)).toBe(true);
        expect(typeof result.data.pricing).toBe('object');
        expect(typeof result.data.inventory).toBe('object');
        expect(result.data.valid_from).toBeInstanceOf(Date);
        expect(result.data.valid_until).toBeInstanceOf(Date);
        expect(typeof result.data.created_by).toBe('string');
        expect(typeof result.data.updated_by).toBe('string');
        expect(result.data.created_at).toBeInstanceOf(Date);
        expect(result.data.updated_at).toBeInstanceOf(Date);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum products in bundle (20 items)', () => {
      const products = Array.from({ length: 20 }, (_, i) => ({
        product_id: `prod-${i + 1}`,
        quantity: 1,
        discount_percentage: 5,
        is_required: i < 2
      }));
      
      const data = {
        id: 'bundle-max-products',
        name: 'Maximum Products Bundle',
        description: 'Bundle with maximum allowed products',
        bundle_type: 'mix_and_match',
        status: 'active',
        products: products,
        pricing: {
          strategy: 'percentage_discount',
          bundle_price: 900.00,
          original_price: 1000.00,
          savings_amount: 100.00,
          savings_percentage: 10.00
        },
        inventory: { track_bundle_inventory: true, bundle_stock: 10 },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-12-31T23:59:59Z',
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.products.length).toBe(20);
      }
    });

    it('should reject more than maximum products in bundle', () => {
      const products = Array.from({ length: 21 }, (_, i) => ({
        product_id: `prod-${i + 1}`,
        quantity: 1,
        discount_percentage: 5,
        is_required: false
      }));
      
      const data = {
        id: 'bundle-too-many',
        name: 'Too Many Products Bundle',
        description: 'Bundle with too many products',
        bundle_type: 'fixed',
        status: 'active',
        products: products,
        pricing: {
          strategy: 'fixed_discount',
          bundle_price: 900.00,
          original_price: 1000.00,
          savings_amount: 100.00,
          savings_percentage: 10.00
        },
        inventory: { track_bundle_inventory: false },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-12-31T23:59:59Z',
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should handle maximum quantity per product (999)', () => {
      const data = {
        id: 'bundle-max-qty',
        name: 'High Quantity Bundle',
        description: 'Bundle with maximum quantity per product',
        bundle_type: 'fixed',
        status: 'active',
        products: [
          { product_id: 'prod-bulk', quantity: 999, discount_percentage: 25, is_required: true }
        ],
        pricing: {
          strategy: 'percentage_discount',
          bundle_price: 7492.50,
          original_price: 9990.00,
          savings_amount: 2497.50,
          savings_percentage: 25.00
        },
        inventory: { track_bundle_inventory: true, bundle_stock: 5 },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-12-31T23:59:59Z',
        created_by: 'bulk_admin',
        updated_by: 'bulk_admin',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should handle very large bundle price', () => {
      const data = {
        id: 'bundle-expensive',
        name: 'Luxury Bundle',
        description: 'Very expensive bundle',
        bundle_type: 'fixed',
        status: 'active',
        products: [
          { product_id: 'prod-luxury', quantity: 1, discount_percentage: 5, is_required: true }
        ],
        pricing: {
          strategy: 'fixed_discount',
          bundle_price: 999999.99,
          original_price: 1050000.00,
          savings_amount: 50000.01,
          savings_percentage: 4.76
        },
        inventory: { track_bundle_inventory: true, bundle_stock: 1 },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-12-31T23:59:59Z',
        created_by: 'luxury_admin',
        updated_by: 'luxury_admin',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});