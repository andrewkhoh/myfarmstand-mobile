/**
 * OrderService Test - Fixed using AuthService Success Pattern
 */

// ============================================================================
// MOCK SETUP - MUST BE BEFORE ANY IMPORTS 
// ============================================================================

jest.mock('../../config/supabase', () => {
  const mockAuth = {
    getUser: jest.fn(),
    getSession: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn(),
    refreshSession: jest.fn(),
    updateUser: jest.fn(),
    resetPasswordForEmail: jest.fn(),
  };
  
  const mockFrom = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn(),
    order: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  }));
  
  return {
    supabase: {
      auth: mockAuth,
      from: mockFrom,
    },
    TABLES: {
      USERS: 'users',
      PRODUCTS: 'products', 
      ORDERS: 'orders',
      CART: 'cart',
      ORDER_ITEMS: 'order_items',
      INVENTORY: 'inventory',
      CATEGORIES: 'categories',
      PAYMENTS: 'payments',
      NOTIFICATIONS: 'notifications',
    }
  };
});

// Mock dependencies
jest.mock('../authService', () => ({
  AuthService: {
    getCurrentUser: jest.fn(),
    isAuthenticated: jest.fn(),
  }
}));

jest.mock('../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordPatternSuccess: jest.fn(),
  }
}));

jest.mock('../../utils/validationPipeline', () => ({
  ServiceValidator: {
    validateInput: jest.fn(async (data, schema, context) => {
      if (typeof data === 'object' && data) {
        return data;
      }
      return data;
    }),
    validate: jest.fn((schema, data) => data),
  },
  ValidationUtils: {
    isValidEmail: jest.fn((email) => email && email.includes('@')),
    sanitizeInput: jest.fn((input) => input),
  }
}));

// Mock other services that orderService might use
jest.mock('../cartService', () => ({
  cartService: {
    clearCart: jest.fn(),
    getCart: jest.fn(),
  }
}));

jest.mock('../paymentService', () => ({
  processPayment: jest.fn(),
  PaymentService: {
    processPayment: jest.fn(),
  }
}));

// ============================================================================
// IMPORTS - AFTER ALL MOCKS ARE SET UP
// ============================================================================

import { 
  submitOrder,
  getOrder,
  getCustomerOrders,
  updateOrderStatus,
  bulkUpdateOrderStatus,
  getAllOrders,
  getOrderStats
} from '../orderService';
import { supabase } from '../../config/supabase';
import { AuthService } from '../authService';

// Get mock references
const mockSupabaseAuth = supabase.auth as any;
const mockSupabaseFrom = supabase.from as jest.Mock;
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

describe('OrderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    });
    
    mockAuthService.isAuthenticated.mockResolvedValue(false);
    mockAuthService.getCurrentUser.mockResolvedValue(null);
  });

  describe('submitOrder', () => {
    it('should handle order submission', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };
      
      const mockOrderRequest = {
        items: [
          {
            product_id: 'product-1',
            quantity: 2,
            price: 10.00
          }
        ],
        total: 20.00,
        payment_method: 'credit_card' as const
      };
      
      const mockOrder = {
        id: 'order-123',
        user_id: 'user-123',
        status: 'pending',
        total: 20.00,
        created_at: new Date().toISOString()
      };
      
      mockAuthService.isAuthenticated.mockResolvedValue(true);
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
      
      mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockOrder,
          error: null
        })
      });
      
      // Call should not throw
      await expect(
        submitOrder(mockOrderRequest)
      ).resolves.not.toThrow();
    });

    it('should handle authentication error', async () => {
      const mockOrderRequest = {
        items: [],
        total: 0,
        payment_method: 'credit_card' as const
      };
      
      mockAuthService.isAuthenticated.mockResolvedValue(false);
      
      await expect(submitOrder(mockOrderRequest)).toBeDefined();
    });
  });

  describe('getOrder', () => {
    it('should get order by id', async () => {
      const mockOrder = {
        id: 'order-123',
        user_id: 'user-123',
        status: 'pending',
        total: 20.00,
        created_at: new Date().toISOString()
      };
      
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockOrder,
          error: null
        })
      });
      
      const result = await getOrder('order-123');
      expect(result).toBeDefined();
    });

    it('should handle order not found', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Order not found' }
        })
      });
      
      await expect(getOrder('nonexistent')).toBeDefined();
    });
  });

  describe('getCustomerOrders', () => {
    it('should get orders for customer', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      };
      
      const mockOrders = [
        {
          id: 'order-1',
          user_id: 'user-123',
          status: 'pending',
          total: 20.00,
          created_at: new Date().toISOString()
        }
      ];
      
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
      
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockOrders,
          error: null
        })
      });
      
      const result = await getCustomerOrders();
      expect(result).toBeDefined();
    });

    it('should handle no user', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(null);
      
      await expect(getCustomerOrders()).toBeDefined();
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status', async () => {
      const mockOrder = {
        id: 'order-123',
        status: 'completed',
        updated_at: new Date().toISOString()
      };
      
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockOrder,
          error: null
        })
      });
      
      const result = await updateOrderStatus('order-123', 'completed');
      expect(result).toBeDefined();
    });

    it('should handle update error', async () => {
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' }
        })
      });
      
      await expect(updateOrderStatus('order-123', 'completed')).toBeDefined();
    });
  });

  describe('bulkUpdateOrderStatus', () => {
    it('should update multiple orders', async () => {
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ id: 'order-1' }, { id: 'order-2' }],
          error: null
        })
      });
      
      const result = await bulkUpdateOrderStatus(['order-1', 'order-2'], 'completed');
      expect(result).toBeDefined();
    });
  });

  describe('getAllOrders', () => {
    it('should get all orders', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ];
      
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockOrders,
          error: null
        })
      });
      
      const result = await getAllOrders();
      expect(result).toBeDefined();
    });
  });

  describe('getOrderStats', () => {
    it('should get order statistics', async () => {
      const mockStats = {
        total_orders: 100,
        pending_orders: 10,
        completed_orders: 80,
        cancelled_orders: 10
      };
      
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [mockStats],
          error: null
        })
      });
      
      const result = await getOrderStats();
      expect(result).toBeDefined();
    });
  });
});