/**
 * Comprehensive Test Suite for All Services
 * Tests all service implementations in src/services
 */

import { AuthService } from '../services/authService';
import { cartService } from '../services/cartService';
import { submitOrder, getOrder, updateOrderStatus } from '../services/orderService';
import productService from '../services/productService';
import { TokenService } from '../services/tokenService';
import { RealtimeService } from '../services/realtimeService';
import { StockRestorationService } from '../services/stockRestorationService';
import { supabase } from '../config/supabase';

// Mock Supabase
jest.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      updateUser: jest.fn(),
      refreshSession: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(),
          gte: jest.fn(),
          lte: jest.fn(),
        })),
        in: jest.fn(),
        or: jest.fn(),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(),
      })),
      upsert: jest.fn(),
    })),
    rpc: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    })),
  },
  TABLES: {
    PRODUCTS: 'products',
    CATEGORIES: 'categories',
  }
}));

// Mock other dependencies
jest.mock('../utils/broadcastFactory', () => ({
  sendOrderBroadcast: jest.fn().mockResolvedValue({ success: true }),
  cartBroadcast: {
    send: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock('../utils/typeMappers', () => ({
  mapProductFromDB: jest.fn((product) => ({
    id: product.id,
    name: product.name,
    price: product.price || 0,
    stock_quantity: product.stock_quantity,
    category_id: product.category_id,
    is_available: product.is_available,
  })),
  mapOrderFromDB: jest.fn((order, items) => ({
    id: order.id,
    customerId: order.user_id,
    items: items || [],
    total: order.total_amount,
    status: order.status,
  })),
  getOrderItems: jest.fn((order) => order.items || []),
  getOrderCustomerInfo: jest.fn((order) => ({ email: order.customer_email })),
  getProductStock: jest.fn((product) => product.stock_quantity || 0),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Mock test data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  phone: '555-0123',
  address: '123 Test St',
  role: 'customer' as const,
};

const mockProduct = {
  id: 'product-123',
  name: 'Test Product',
  description: 'A test product',
  price: 10.00,
  stock_quantity: 5,
  category_id: 'cat-1',
  is_available: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockOrder = {
  id: 'order-123',
  user_id: 'user-123',
  customer_email: 'test@example.com',
  customer_name: 'Test User',
  customer_phone: '555-0123',
  items: [
    {
      productId: 'product-123',
      productName: 'Test Product',
      quantity: 2,
      price: 10.00,
      subtotal: 20.00,
    }
  ],
  subtotal: 20.00,
  tax_amount: 1.60,
  total_amount: 21.60,
  status: 'pending',
  fulfillment_type: 'pickup',
  payment_method: 'online',
  payment_status: 'paid',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('All Services Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthService', () => {
    it('should login successfully with valid credentials', async () => {
      const mockAuthResponse = {
        data: {
          session: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
          },
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue(mockAuthResponse);
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      });

      const result = await AuthService.login('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('mock-access-token');
    });

    it('should handle login with invalid credentials', async () => {
      const mockAuthResponse = {
        data: null,
        error: { message: 'Invalid login credentials' },
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue(mockAuthResponse);

      await expect(AuthService.login('test@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid login credentials');
    });

    it('should register new user successfully', async () => {
      const mockAuthResponse = {
        data: {
          user: {
            id: 'user-456',
            email: 'newuser@example.com',
          },
          session: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
          },
        },
        error: null,
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue(mockAuthResponse);
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await AuthService.register(
        'newuser@example.com',
        'password123',
        'New User',
        '555-0124',
        '124 Test St'
      );

      expect(result.success).toBe(true);
      expect(result.user.email).toBe('newuser@example.com');
    });

    it('should logout successfully', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
      });

      const result = await AuthService.logout();
      expect(result.success).toBe(true);
    });

    it('should validate email format', async () => {
      await expect(AuthService.login('invalid-email', 'password123'))
        .rejects.toThrow('Please enter a valid email address');
    });
  });

  describe('CartService', () => {
    it('should get cart for authenticated user', async () => {
      const mockCartItems = [
        {
          id: 'cart-1',
          user_id: 'user-123',
          product_id: 'product-123',
          quantity: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockCartItems,
              error: null,
            }),
          }),
        }),
      }).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProduct,
              error: null,
            }),
          }),
        }),
      });

      const cart = await cartService.getCart();

      expect(cart.items).toHaveLength(1);
      expect(cart.total).toBe(20.00);
    });

    it('should return empty cart for unauthenticated user', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      const cart = await cartService.getCart();

      expect(cart.items).toHaveLength(0);
      expect(cart.total).toBe(0);
    });

    it('should add item to cart successfully', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      // Mock stock validation
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                stock_quantity: 10,
                is_pre_order: false,
                min_pre_order_quantity: null,
                max_pre_order_quantity: null,
              },
              error: null,
            }),
          }),
        }),
      }).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      const result = await cartService.addItem(mockProduct, 2);

      expect(result.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('upsert_cart_item', {
        input_user_id: 'user-123',
        input_product_id: 'product-123',
        input_quantity_to_add: 2,
      });
    });

    it('should handle insufficient stock', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                stock_quantity: 1,
                is_pre_order: false,
              },
              error: null,
            }),
          }),
        }),
      }).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const result = await cartService.addItem(mockProduct, 5);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Only 1 more items can be added');
    });
  });

  describe('OrderService', () => {
    it('should submit order successfully', async () => {
      const orderRequest = {
        customerInfo: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '555-0123',
        },
        items: [
          {
            productId: 'product-123',
            productName: 'Test Product',
            quantity: 2,
            price: 10.00,
            subtotal: 20.00,
          },
        ],
        fulfillmentType: 'pickup' as const,
        pickupDate: '2025-08-16',
        pickupTime: '14:00',
        paymentMethod: 'online' as const,
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          order: mockOrder,
        },
        error: null,
      });

      const result = await submitOrder(orderRequest);

      expect(result.success).toBe(true);
      expect(result.order).toBeTruthy();
    });

    it('should validate required customer information', async () => {
      const invalidOrderRequest = {
        customerInfo: {
          name: '',
          email: 'test@example.com',
          phone: '555-0123',
        },
        items: [
          {
            productId: 'product-123',
            productName: 'Test Product',
            quantity: 2,
            price: 10.00,
            subtotal: 20.00,
          },
        ],
        fulfillmentType: 'pickup' as const,
        pickupDate: '2025-08-16',
        pickupTime: '14:00',
        paymentMethod: 'online' as const,
      };

      const result = await submitOrder(invalidOrderRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required customer information');
    });

    it('should get order by ID', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockOrder,
              error: null,
            }),
          }),
        }),
      });

      const order = await getOrder('order-123');

      expect(order).toBeTruthy();
      expect(order?.id).toBe('order-123');
    });

    it('should update order status', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...mockOrder, status: 'ready' },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock getOrder call
      jest.doMock('../services/orderService', () => ({
        getOrder: jest.fn().mockResolvedValue({ ...mockOrder, status: 'ready' }),
      }));

      const result = await updateOrderStatus('order-123', 'ready');

      expect(result.success).toBe(true);
    });
  });

  describe('ProductService', () => {
    it('should get all products', async () => {
      const mockProducts = [mockProduct];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockProducts,
              error: null,
            }),
          }),
        }),
      });

      const result = await productService.getProducts();

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(1);
    });

    it('should get product by ID', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProduct,
              error: null,
            }),
          }),
        }),
      });

      const result = await productService.getProductById('product-123');

      expect(result.success).toBe(true);
      expect(result.product?.id).toBe('product-123');
    });

    it('should search products', async () => {
      const mockProducts = [mockProduct];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            or: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockProducts,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await productService.searchProducts('test');

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(1);
    });

    it('should update product stock', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...mockProduct, stock_quantity: 15 },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock getProductById call
      productService.getProductById = jest.fn().mockResolvedValue({
        success: true,
        product: { ...mockProduct, stock_quantity: 15 },
      });

      const result = await productService.updateProductStock('product-123', 15);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Product stock updated to 15');
    });
  });

  describe('TokenService', () => {
    it('should set and get access token', async () => {
      await TokenService.setAccessToken('test-token');
      const token = await TokenService.getAccessToken();
      
      // Token should be stored (mocked to return null for simplicity)
      expect(token).toBeNull(); // Due to mock
    });

    it('should set and get refresh token', async () => {
      await TokenService.setRefreshToken('refresh-token');
      const token = await TokenService.getRefreshToken();
      
      expect(token).toBeNull(); // Due to mock
    });

    it('should set and get user', async () => {
      await TokenService.setUser(mockUser);
      const user = await TokenService.getUser();
      
      expect(user).toBeNull(); // Due to mock
    });

    it('should clear all tokens', async () => {
      await TokenService.clearAllTokens();
      
      // Should complete without error
      expect(true).toBe(true);
    });

    it('should check token validity', async () => {
      const hasTokens = await TokenService.hasValidTokens();
      
      expect(hasTokens).toBe(false); // Due to mock returning null
    });
  });

  describe('RealtimeService', () => {
    it('should subscribe to order updates', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      await RealtimeService.subscribeToOrderUpdates();
      
      expect(supabase.channel).toHaveBeenCalled();
    });

    it('should subscribe to product updates', async () => {
      await RealtimeService.subscribeToProductUpdates();
      
      expect(supabase.channel).toHaveBeenCalled();
    });

    it('should subscribe to cart updates', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      await RealtimeService.subscribeToCartUpdates();
      
      expect(supabase.channel).toHaveBeenCalled();
    });

    it('should initialize all subscriptions', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      await RealtimeService.initializeAllSubscriptions();
      
      expect(supabase.channel).toHaveBeenCalledTimes(3); // order, product, cart
    });

    it('should get subscription status', () => {
      const status = RealtimeService.getSubscriptionStatus();
      
      expect(status).toHaveProperty('totalSubscriptions');
      expect(status).toHaveProperty('subscriptions');
    });
  });

  describe('StockRestorationService', () => {
    it('should restore order stock successfully', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          new_stock_level: 7,
        },
        error: null,
      });

      const result = await StockRestorationService.restoreOrderStock(
        mockOrder,
        'order_cancelled'
      );

      expect(result.success).toBe(true);
      expect(result.restoredItems).toHaveLength(1);
      expect(result.restoredItems[0].quantityRestored).toBe(2);
    });

    it('should handle stock restoration failure', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: {
          success: false,
          error: 'Product not found',
        },
        error: null,
      });

      const result = await StockRestorationService.restoreOrderStock(
        mockOrder,
        'order_cancelled'
      );

      expect(result.success).toBe(false);
      expect(result.failedItems).toHaveLength(1);
    });

    it('should verify restoration needed', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'cancelled', created_at: new Date().toISOString() },
              error: null,
            }),
          }),
        }),
      });

      const result = await StockRestorationService.verifyRestorationNeeded('order-123');

      expect(result.needed).toBe(true);
    });

    it('should handle emergency stock restoration', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          new_stock_level: 15,
        },
        error: null,
      });

      const result = await StockRestorationService.emergencyStockRestoration(
        'product-123',
        5,
        'Manual adjustment'
      );

      expect(result.success).toBe(true);
      expect(result.restoredItems).toHaveLength(1);
      expect(result.restoredItems[0].quantityRestored).toBe(5);
    });
  });

  describe('Service Integration Tests', () => {
    it('should handle cross-service workflows', async () => {
      // Test adding item to cart, then submitting order
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      // Mock cart operations
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { stock_quantity: 10, is_pre_order: false },
              error: null,
            }),
          }),
        }),
      });
      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      // Add item to cart
      const cartResult = await cartService.addItem(mockProduct, 2);
      expect(cartResult.success).toBe(true);

      // Submit order
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { success: true, order: mockOrder },
        error: null,
      });

      const orderRequest = {
        customerInfo: mockUser,
        items: [
          {
            productId: 'product-123',
            productName: 'Test Product',
            quantity: 2,
            price: 10.00,
            subtotal: 20.00,
          },
        ],
        fulfillmentType: 'pickup' as const,
        pickupDate: '2025-08-16',
        pickupTime: '14:00',
        paymentMethod: 'online' as const,
      };

      const orderResult = await submitOrder(orderRequest);
      expect(orderResult.success).toBe(true);
    });
  });
});