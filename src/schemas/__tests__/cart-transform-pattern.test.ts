import { describe, expect } from '@jest/globals';
import { 
  DbCartItemTransformSchema,
  DbCartItemArrayTransformSchema,
  CartItemSchema,
  CartStateSchema 
} from '../cart.schema';
import { ProductSchema } from '../product.schema';

describe('Cart Transform Pattern Tests', () => {
  // Mock raw database cart item data
  const rawDbCartItem = {
    id: 'cart-item-1',
    user_id: 'user-123',
    product_id: 'product-456',
    quantity: 2,
    created_at: '2025-08-19T10:00:00Z',
    updated_at: '2025-08-19T10:30:00Z'
  };

  // Mock product data (raw database format)
  const mockProduct = {
    id: 'product-456',
    name: 'Test Product',
    description: 'A test product',
    price: 19.99,
    stock_quantity: 10,
    category_id: 'category-1', // Fixed to use correct DB field name
    image_url: 'https://example.com/image.jpg',
    is_weekly_special: false,
    is_bundle: false,
    seasonal_availability: null,
    unit: 'each',
    weight: null,
    sku: 'TEST-001',
    tags: [],
    nutrition_info: null,
    is_available: true,
    is_pre_order: false,
    pre_order_available_date: null,
    min_pre_order_quantity: null,
    max_pre_order_quantity: null,
    created_at: '2025-08-19T09:00:00Z',
    updated_at: '2025-08-19T09:00:00Z'
  };

  describe('DbCartItemTransformSchema', () => {
    it('should validate raw database cart item data', () => {
      // Should work without product (before product lookup)
      const result = DbCartItemTransformSchema.parse({
        ...rawDbCartItem,
        product: undefined
      });

      expect(result).toMatchObject({
        product: undefined,
        quantity: 2,
        _dbData: {
          id: 'cart-item-1',
          user_id: 'user-123',
          product_id: 'product-456',
          created_at: '2025-08-19T10:00:00Z',
          updated_at: '2025-08-19T10:30:00Z'
        }
      });
    });

    it('should transform cart item with populated product', () => {
      const result = DbCartItemTransformSchema.parse({
        ...rawDbCartItem,
        product: mockProduct
      });

      expect(result).toMatchObject({
        product: mockProduct,
        quantity: 2,
        _dbData: expect.objectContaining({
          id: 'cart-item-1',
          product_id: 'product-456'
        })
      });
    });

    it('should handle nullable created_at and updated_at', () => {
      const result = DbCartItemTransformSchema.parse({
        ...rawDbCartItem,
        created_at: null,
        updated_at: null,
        product: mockProduct
      });

      expect(result._dbData.created_at).toBeNull();
      expect(result._dbData.updated_at).toBeNull();
    });

    it('should fail validation for invalid cart item data', () => {
      expect(() => {
        DbCartItemTransformSchema.parse({
          id: '', // Invalid empty string
          user_id: 'user-123',
          product_id: 'product-456',
          quantity: 0, // Invalid quantity
          created_at: '2025-08-19T10:00:00Z',
          updated_at: '2025-08-19T10:30:00Z'
        });
      }).toThrow();
    });
  });

  describe('DbCartItemArrayTransformSchema', () => {
    it('should validate array of raw cart items', () => {
      const rawCartItems = [
        rawDbCartItem,
        {
          ...rawDbCartItem,
          id: 'cart-item-2',
          product_id: 'product-789',
          quantity: 1
        }
      ];

      const result = DbCartItemArrayTransformSchema.parse(rawCartItems);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject(rawDbCartItem);
      expect(result[1].id).toBe('cart-item-2');
    });
  });

  describe('Integration with existing schemas', () => {
    it('should work with ProductSchema validation', () => {
      // Verify ProductSchema still works with our mock data
      const validatedProduct = ProductSchema.parse(mockProduct);
      expect(validatedProduct.id).toBe('product-456');
      expect(validatedProduct.price).toBe(19.99);
    });

    it('should integrate with service layer properly', () => {
      // Test that our transformation schema produces the correct structure
      // that can be used by the cart service
      const transformedProduct = ProductSchema.parse(mockProduct);
      
      const transformedItem = DbCartItemTransformSchema.parse({
        ...rawDbCartItem,
        product: transformedProduct
      });

      // Verify transformation structure
      expect(transformedItem.product).toBeDefined();
      expect(transformedItem.quantity).toBe(2);
      expect(transformedItem._dbData.id).toBe('cart-item-1');
      expect(transformedItem._dbData.product_id).toBe('product-456');
    });

    it('should provide transformed data compatible with cart operations', () => {
      // Verify the transformation provides the right structure for cart calculations
      const transformedProduct = ProductSchema.parse(mockProduct);
      
      const transformedItem = DbCartItemTransformSchema.parse({
        ...rawDbCartItem,
        product: transformedProduct
      });

      // Should be able to calculate totals
      const total = transformedItem.product.price * transformedItem.quantity;
      expect(total).toBe(39.98); // 19.99 * 2
      
      // Should have access to DB metadata for operations
      expect(transformedItem._dbData.user_id).toBe('user-123');
    });
  });

  describe('Error handling', () => {
    it('should provide clear error messages for missing required fields', () => {
      try {
        DbCartItemTransformSchema.parse({
          // Missing required fields
          quantity: 2
        });
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.message).toContain('Required');
      }
    });

    it('should handle invalid quantity types', () => {
      expect(() => {
        DbCartItemTransformSchema.parse({
          ...rawDbCartItem,
          quantity: '2' // String instead of number
        });
      }).toThrow();
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain _dbData for internal cart operations', () => {
      const result = DbCartItemTransformSchema.parse({
        ...rawDbCartItem,
        product: mockProduct
      });

      // Internal data should be preserved for database operations
      expect(result._dbData.id).toBe('cart-item-1');
      expect(result._dbData.user_id).toBe('user-123');
      expect(result._dbData.product_id).toBe('product-456');
    });
  });
});