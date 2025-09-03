import { describe, it, expect } from '@jest/globals';
import { productBundleSchema } from '../productBundle';

describe('ProductBundle Schema', () => {
  describe('Validation', () => {
    it('should validate complete product bundle with all fields', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Summer Garden Bundle',
        description: 'Complete garden starter kit with seeds, tools, and fertilizer',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 5,
            discount_percentage: 10,
            is_required: true
          },
          {
            product_id: '123e4567-e89b-12d3-a456-426614174002',
            quantity: 2,
            discount_percentage: 15,
            is_required: true
          },
          {
            product_id: '123e4567-e89b-12d3-a456-426614174003',
            quantity: 1,
            discount_percentage: 0,
            is_required: false
          }
        ],
        pricing: {
          bundle_price: 149.99,
          original_price: 199.99,
          savings_amount: 50.00,
          savings_percentage: 25
        },
        inventory: {
          available_quantity: 100,
          reserved_quantity: 10,
          low_stock_threshold: 20
        },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-08-31T23:59:59Z',
        max_purchases_per_customer: 3,
        campaign_ids: ['123e4567-e89b-12d3-a456-426614174004'],
        tags: ['garden', 'starter-kit', 'summer'],
        metadata: {
          featured: true,
          display_order: 1
        },
        created_by: 'user123',
        updated_by: 'user456',
        created_at: '2024-05-01T00:00:00Z',
        updated_at: '2024-05-15T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate minimal required fields', () => {
      const minimalData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Basic Bundle',
        bundle_type: 'fixed',
        status: 'draft',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });

    it('should reject missing bundle name', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        bundle_type: 'fixed',
        status: 'draft',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty product_items array', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Empty Bundle',
        bundle_type: 'fixed',
        status: 'draft',
        product_items: [],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      const invalidData = {
        id: 'not-a-uuid',
        name: 'Bundle',
        bundle_type: 'fixed',
        status: 'draft',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative bundle price', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Negative Price Bundle',
        bundle_type: 'fixed',
        status: 'draft',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: -99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject bundle price higher than original price', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Overpriced Bundle',
        bundle_type: 'fixed',
        status: 'draft',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 199.99,
          original_price: 99.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject zero or negative product quantity', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Invalid Quantity Bundle',
        bundle_type: 'fixed',
        status: 'draft',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 0,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject discount percentage over 100', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Excessive Discount Bundle',
        bundle_type: 'fixed',
        status: 'draft',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            discount_percentage: 101,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative discount percentage', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Negative Discount Bundle',
        bundle_type: 'fixed',
        status: 'draft',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            discount_percentage: -10,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Bundle Type Validation', () => {
    it('should accept fixed bundle type', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Fixed Bundle',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept dynamic bundle type', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Dynamic Bundle',
        bundle_type: 'dynamic',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: false
          },
          {
            product_id: '123e4567-e89b-12d3-a456-426614174002',
            quantity: 1,
            is_required: false
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept customizable bundle type', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Customizable Bundle',
        bundle_type: 'customizable',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          },
          {
            product_id: '123e4567-e89b-12d3-a456-426614174002',
            quantity: 1,
            is_required: false
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid bundle type', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Invalid Type Bundle',
        bundle_type: 'invalid_type',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Bundle Status Validation', () => {
    it('should accept draft status', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Draft Bundle',
        bundle_type: 'fixed',
        status: 'draft',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept active status', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Active Bundle',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept inactive status', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Inactive Bundle',
        bundle_type: 'fixed',
        status: 'inactive',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept archived status', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Archived Bundle',
        bundle_type: 'fixed',
        status: 'archived',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Invalid Status Bundle',
        bundle_type: 'fixed',
        status: 'invalid_status',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Date Validation', () => {
    it('should reject valid_until before valid_from', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Invalid Date Bundle',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        valid_from: '2024-08-31T23:59:59Z',
        valid_until: '2024-06-01T00:00:00Z',
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept same valid_from and valid_until for single-day bundles', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Flash Sale Bundle',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-06-01T23:59:59Z',
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Invalid Date Format Bundle',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        valid_from: 'not-a-date',
        valid_until: '2024-06-30T23:59:59Z',
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Inventory Validation', () => {
    it('should accept valid inventory data', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Inventory Bundle',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        inventory: {
          available_quantity: 100,
          reserved_quantity: 10,
          low_stock_threshold: 20
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject negative inventory quantities', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Negative Inventory Bundle',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        inventory: {
          available_quantity: -10,
          reserved_quantity: 0,
          low_stock_threshold: 20
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject reserved quantity greater than available', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Over-reserved Bundle',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        inventory: {
          available_quantity: 10,
          reserved_quantity: 20,
          low_stock_threshold: 5
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Transformations', () => {
    it('should transform date strings to Date objects', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Date Transform Bundle',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        valid_from: '2024-06-01T00:00:00Z',
        valid_until: '2024-08-31T23:59:59Z',
        created_at: '2024-05-01T00:00:00Z',
        updated_at: '2024-05-15T00:00:00Z',
        created_by: 'user123'
      };
      
      const result = productBundleSchema.safeParse(data);
      if (result.success) {
        expect(result.data.valid_from).toBeInstanceOf(Date);
        expect(result.data.valid_until).toBeInstanceOf(Date);
        expect(result.data.created_at).toBeInstanceOf(Date);
        expect(result.data.updated_at).toBeInstanceOf(Date);
      }
    });

    it('should calculate savings automatically', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Auto Calculate Bundle',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 75.00,
          original_price: 100.00
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      if (result.success) {
        expect(result.data.pricing.savings_amount).toBe(25.00);
        expect(result.data.pricing.savings_percentage).toBe(25);
      }
    });

    it('should trim whitespace from bundle name', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: '  Bundle Name  ',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      if (result.success) {
        expect(result.data.name).toBe('Bundle Name');
      }
    });

    it('should round prices to 2 decimal places', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Price Rounding Bundle',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.999,
          original_price: 129.999
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      if (result.success) {
        expect(result.data.pricing.bundle_price).toBe(100.00);
        expect(result.data.pricing.original_price).toBe(130.00);
      }
    });
  });

  describe('Contract Tests', () => {
    it('should match TypeScript interface for complete bundle', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Contract Test Bundle',
        description: 'Testing TypeScript contract',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 2,
            discount_percentage: 10,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99,
          savings_amount: 30.00,
          savings_percentage: 23.08
        },
        inventory: {
          available_quantity: 50,
          reserved_quantity: 5,
          low_stock_threshold: 10
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('id');
        expect(result.data).toHaveProperty('name');
        expect(result.data).toHaveProperty('bundle_type');
        expect(result.data).toHaveProperty('status');
        expect(result.data).toHaveProperty('product_items');
        expect(result.data).toHaveProperty('pricing');
        expect(result.data).toHaveProperty('created_at');
      }
    });

    it('should preserve optional field types when present', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Optional Fields Bundle',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        max_purchases_per_customer: 5,
        tags: ['test', 'bundle'],
        metadata: { test: true },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      if (result.success) {
        expect(typeof result.data.max_purchases_per_customer).toBe('number');
        expect(Array.isArray(result.data.tags)).toBe(true);
        expect(typeof result.data.metadata).toBe('object');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum length bundle name', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'A'.repeat(200),
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject bundle name exceeding maximum length', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'A'.repeat(201),
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should handle bundles with many product items', () => {
      const productItems = Array(100).fill(null).map((_, i) => ({
        product_id: `123e4567-e89b-12d3-a456-42661417400${i}`,
        quantity: 1,
        discount_percentage: 10,
        is_required: i === 0
      }));
      
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Large Bundle',
        bundle_type: 'customizable',
        status: 'active',
        product_items: productItems,
        pricing: {
          bundle_price: 999.99,
          original_price: 1999.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should handle very high quantity values', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'High Quantity Bundle',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 9999,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99999.99,
          original_price: 199999.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should handle zero discount percentage', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'No Discount Bundle',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            discount_percentage: 0,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 99.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should handle complex metadata objects', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Complex Metadata Bundle',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        metadata: {
          featured: true,
          display_order: 1,
          promotional_text: 'Limited time offer!',
          images: ['image1.jpg', 'image2.jpg'],
          categories: ['summer', 'sale', 'popular'],
          custom_attributes: {
            color_theme: 'blue',
            target_audience: 'families',
            season: 'summer'
          }
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should handle special characters in bundle name', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Summer Bundle™ - Save 25%! 🌞',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 99.99,
          original_price: 129.99
        },
        created_by: 'user123',
        created_at: '2024-05-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should handle year-long validity periods', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Annual Bundle',
        bundle_type: 'fixed',
        status: 'active',
        product_items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            quantity: 1,
            is_required: true
          }
        ],
        pricing: {
          bundle_price: 999.99,
          original_price: 1499.99
        },
        valid_from: '2024-01-01T00:00:00Z',
        valid_until: '2024-12-31T23:59:59Z',
        created_by: 'user123',
        created_at: '2023-12-01T00:00:00Z'
      };
      
      const result = productBundleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});