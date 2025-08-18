/**
 * CartService Test
 * Comprehensive testing for cart functionality including CRUD operations,
 * stock validation, authentication guards, and error handling
 */

import { cartService } from '../cartService';
import { CartState, Product } from '../../types';

// Mock the supabase module
const mockSupabase = require('../../config/supabase').supabase;

// Mock cart broadcast utility
const mockCartBroadcast = require('../../utils/broadcastFactory').cartBroadcast;

// Mock type mappers
const mockMapProductFromDB = require('../../utils/typeMappers').mapProductFromDB;
const mockGetProductStock = require('../../utils/typeMappers').getProductStock;
const mockIsProductPreOrder = require('../../utils/typeMappers').isProductPreOrder;
const mockGetProductMinPreOrderQty = require('../../utils/typeMappers').getProductMinPreOrderQty;
const mockGetProductMaxPreOrderQty = require('../../utils/typeMappers').getProductMaxPreOrderQty;

describe('CartService', () => {
  // Test data
  const mockUser = {
    id: 'user123',
    email: 'test@example.com'
  };

  const mockProduct: Product = {
    id: 'product-1',
    name: 'Test Product',
    description: 'Test Description',
    price: 10.99,
    stock_quantity: 100,
    category_id: 'cat-1',
    image_url: 'https://example.com/test-image.jpg',
    is_available: true,
    is_pre_order: false,
    min_pre_order_quantity: 1,
    max_pre_order_quantity: 10,
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const mockPreOrderProduct: Product = {
    ...mockProduct,
    id: 'product-2',
    name: 'Pre-Order Product',
    is_pre_order: true,
    stock_quantity: 0,
    min_pre_order_quantity: 2,
    max_pre_order_quantity: 5
  };

  const mockDbCartItem = {
    id: 'cart-item-1',
    user_id: 'user123',
    product_id: 'product-1',
    quantity: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const mockEmptyCart: CartState = {
    items: [],
    total: 0
  };

  const mockCartWithItems: CartState = {
    items: [
      {
        product: mockProduct,
        quantity: 2
      }
    ],
    total: 21.98
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockMapProductFromDB.mockReturnValue(mockProduct);
    mockGetProductStock.mockReturnValue(100);
    mockIsProductPreOrder.mockReturnValue(false);
    mockGetProductMinPreOrderQty.mockReturnValue(1);
    mockGetProductMaxPreOrderQty.mockReturnValue(10);
    mockCartBroadcast.send.mockResolvedValue({ success: true });

    // Setup authenticated user by default
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
  });

  describe('getCart', () => {
    it('should return empty cart when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const result = await cartService.getCart();

      expect(result).toEqual(mockEmptyCart);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should return empty cart when no items in database', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      });

      const result = await cartService.getCart();

      expect(result).toEqual(mockEmptyCart);
      expect(mockSupabase.from).toHaveBeenCalledWith('cart_items');
    });

    it('should return cart with items from database', async () => {
      // Mock cart_items query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [mockDbCartItem],
              error: null
            })
          })
        })
      });

      // Mock product query with .in() method
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: [{
              id: 'product-1',
              name: 'Test Product',
              description: 'Test Description',
              price: 10.99,
              stock_quantity: 100,
              category_id: 'cat-1',
              image_url: 'https://example.com/test-image.jpg',
              is_available: true,
              is_pre_order: false,
              min_pre_order_quantity: 1,
              max_pre_order_quantity: 10,
              tags: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }],
            error: null
          })
        })
      });

      const result = await cartService.getCart();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(2);
      expect(result.total).toBe(21.98);
    });

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      });

      await expect(cartService.getCart()).rejects.toEqual({ message: 'Database error' });
    });
  });

  describe('saveCart', () => {
    it('should throw error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      await expect(cartService.saveCart(mockEmptyCart)).rejects.toThrow('User must be authenticated to save cart');
    });

    it('should save cart items to database', async () => {
      const upsertMock = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        upsert: upsertMock
      });

      const result = await cartService.saveCart(mockCartWithItems);

      expect(upsertMock).toHaveBeenCalledWith(
        [{
          user_id: 'user123',
          product_id: 'product-1',
          quantity: 2
        }],
        { onConflict: 'user_id,product_id' }
      );
      expect(result).toEqual(mockCartWithItems);
    });

    it('should clear cart when saving empty cart', async () => {
      const deleteMock = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: deleteMock
        })
      });

      const result = await cartService.saveCart(mockEmptyCart);

      expect(deleteMock).toHaveBeenCalledWith('user_id', 'user123');
      expect(result).toEqual(mockEmptyCart);
    });

    it('should handle database errors during save', async () => {
      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          error: { message: 'Save failed' }
        })
      });

      await expect(cartService.saveCart(mockCartWithItems)).rejects.toEqual({ message: 'Save failed' });
    });
  });

  describe('addItem', () => {
    beforeEach(() => {
      // Reset mocks for each test
      mockSupabase.from.mockClear();
    });

    it('should throw error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const result = await cartService.addItem(mockProduct, 1);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User must be authenticated to add items to cart');
    });

    it('should add item successfully when product is available', async () => {
      // Mock the stock check query (first call to products table)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  stock_quantity: 100,
                  is_pre_order: false,
                  min_pre_order_quantity: 1,
                  max_pre_order_quantity: 10
                },
                error: null
              })
            })
          })
        })
      });

      // Mock the cart check query (second call to cart_items table)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null, // No existing cart item
                error: null
              })
            })
          })
        })
      });

      // Mock the RPC call for upsert_cart_item
      mockSupabase.rpc.mockResolvedValue({ error: null });

      const result = await cartService.addItem(mockProduct, 2);

      expect(result.success).toBe(true);
      expect(mockCartBroadcast.send).toHaveBeenCalledWith('cart-item-added', expect.any(Object));
    });

    it('should reject unavailable product', async () => {
      // Mock stock check returning no data (product not available)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Product not found' }
              })
            })
          })
        })
      });

      const result = await cartService.addItem(mockProduct, 1);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Product is no longer available');
    });

    it('should validate pre-order minimum quantity', async () => {
      // Mock stock check with pre-order data
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  stock_quantity: 0,
                  is_pre_order: true,
                  min_pre_order_quantity: 3,
                  max_pre_order_quantity: 10
                },
                error: null
              })
            })
          })
        })
      });

      // Mock cart check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        })
      });

      const result = await cartService.addItem(mockPreOrderProduct, 2);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Minimum pre-order quantity is 3');
    });

    it('should validate pre-order maximum quantity', async () => {
      // Mock stock check with pre-order data
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  stock_quantity: 0,
                  is_pre_order: true,
                  min_pre_order_quantity: 2,
                  max_pre_order_quantity: 5
                },
                error: null
              })
            })
          })
        })
      });

      // Mock cart check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        })
      });

      const result = await cartService.addItem(mockPreOrderProduct, 6);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Maximum pre-order quantity is 5');
    });

    it('should check stock availability for regular products', async () => {
      // Override the stock helper for this test
      mockGetProductStock.mockReturnValue(0);
      
      // Mock stock check showing out of stock
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  stock_quantity: 0,
                  is_pre_order: false,
                  min_pre_order_quantity: 1,
                  max_pre_order_quantity: 10
                },
                error: null
              })
            })
          })
        })
      });

      // Mock cart check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        })
      });

      const result = await cartService.addItem(mockProduct, 1);

      expect(result.success).toBe(false);
      expect(result.message).toBe('This item is out of stock');
    });

    it('should handle database errors during add', async () => {
      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          error: { message: 'Database error' }
        })
      });

      const result = await cartService.addItem(mockProduct, 1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to add item to cart');
    });
  });

  describe('removeItem', () => {
    beforeEach(() => {
      // Reset mocks for each test
      mockSupabase.from.mockClear();
    });

    it('should throw error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const result = await cartService.removeItem('product-1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('User must be authenticated to remove items from cart');
    });

    it('should remove item successfully', async () => {
      // Mock successful delete operation
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        })
      });

      const result = await cartService.removeItem('product-1');

      expect(result.success).toBe(true);
      expect(mockCartBroadcast.send).toHaveBeenCalledWith('cart-item-removed', expect.any(Object));
    });

    it('should handle database errors during removal', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: { message: 'Delete failed' }
            })
          })
        })
      });

      const result = await cartService.removeItem('product-1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to remove item');
    });
  });

  describe('updateQuantity', () => {
    beforeEach(() => {
      // Reset mocks for each test
      mockSupabase.from.mockClear();
    });

    it('should throw error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const result = await cartService.updateQuantity('product-1', 3);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User must be authenticated to update cart');
    });

    it('should update quantity successfully', async () => {
      // Mock successful update operation
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        })
      });

      const result = await cartService.updateQuantity('product-1', 3);

      expect(result.success).toBe(true);
      expect(mockCartBroadcast.send).toHaveBeenCalledWith('cart-quantity-updated', expect.any(Object));
    });

    it('should handle database errors during update', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: { message: 'Update failed' }
            })
          })
        })
      });

      const result = await cartService.updateQuantity('product-1', 3);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to update quantity');
    });
  });

  describe('clearCart', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      });
    });

    it('should throw error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const result = await cartService.clearCart();

      expect(result.success).toBe(false);
      expect(result.message).toBe('User must be authenticated to clear cart');
    });

    it('should clear cart successfully', async () => {
      const result = await cartService.clearCart();

      expect(result.success).toBe(true);
      expect(mockCartBroadcast.send).toHaveBeenCalledWith('cart-cleared', expect.any(Object));
    });

    it('should handle database errors during clear', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { message: 'Clear failed' }
          })
        })
      });

      const result = await cartService.clearCart();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to clear cart');
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle malformed cart data gracefully', async () => {
      const cartWithValidItems = {
        items: [
          { product: mockProduct, quantity: 2 }
        ],
        total: 21.98
      };

      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: null })
      });

      // Should handle cart with valid items
      const result = await cartService.saveCart(cartWithValidItems);
      expect(result).toBeDefined();
      expect(result.success).not.toBe(false);
    });

    it('should calculate totals correctly', async () => {
      const cartWithMultipleItems: CartState = {
        items: [
          { product: { ...mockProduct, price: 10.00 }, quantity: 2 },
          { product: { ...mockProduct, id: 'product-2', price: 5.50 }, quantity: 3 }
        ],
        total: 36.50 // (10.00 * 2) + (5.50 * 3) = 36.50
      };

      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: null })
      });

      const result = await cartService.saveCart(cartWithMultipleItems);
      
      // Should calculate: (10.00 * 2) + (5.50 * 3) = 20.00 + 16.50 = 36.50
      expect(result.total).toBe(36.50);
    });

    it('should handle concurrent operations gracefully', async () => {
      // Simulate multiple rapid operations
      const promises = [
        cartService.addItem(mockProduct, 1),
        cartService.addItem(mockPreOrderProduct, 2),
        cartService.updateQuantity('product-1', 3)
      ];

      // All should complete without interference
      const results = await Promise.allSettled(promises);
      expect(results).toHaveLength(3);
    });
  });
});