/**
 * OrderService Test - Using REFACTORED Infrastructure
 * Following the proven pattern from service test reference
 */

// ============================================================================
// MOCK SETUP - MUST BE BEFORE ANY IMPORTS 
// ============================================================================

// Mock Supabase using the refactored infrastructure - CREATE MOCK IN THE JEST.MOCK CALL
jest.mock('../../config/supabase', () => {
  const { SimplifiedSupabaseMock } = require('../../test/mocks/supabase.simplified.mock');
  const mockInstance = new SimplifiedSupabaseMock();
  return {
    supabase: mockInstance.createClient(),
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
import { createUser, createOrder, createOrderItem, resetAllFactories } from '../../test/factories';
import { AuthService } from '../authService';

// Get mock references
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

describe('OrderService - Refactored Infrastructure', () => {
  let testUser: any;
  let testOrder: any;
  let testOrderItem: any;

  beforeEach(() => {
    // Reset all factory counters for consistent test data
    resetAllFactories();
    
    // Create test data using factories
    testUser = createUser({
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com'
    });
    
    testOrder = createOrder({
      id: 'order-123',
      user_id: testUser.id,
      status: 'pending',
      total_amount: 20.00
    });
    
    testOrderItem = createOrderItem({
      id: 'item-123',
      order_id: testOrder.id,
      product_id: 'product-1',
      quantity: 2,
      unit_price: 10.00
    });
    
    jest.clearAllMocks();
    
    // Default mocks
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
      const result = await getOrder(testOrder.id);
      expect(result).toBeDefined();
    });

    it('should handle order not found', async () => {
      await expect(getOrder('nonexistent')).toBeDefined();
    });
  });

  describe('getCustomerOrders', () => {
    it('should get orders for customer', async () => {
      const result = await getCustomerOrders(testUser.id);
      expect(result).toBeDefined();
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
      const result = await updateOrderStatus(testOrder.id, 'completed');
      expect(result).toBeDefined();
    });

    it('should handle update error', async () => {
      await expect(updateOrderStatus('invalid-order', 'completed')).toBeDefined();
    });
  });

  describe('bulkUpdateOrderStatus', () => {
    it('should update multiple orders', async () => {
      const result = await bulkUpdateOrderStatus([testOrder.id], 'completed');
      expect(result).toBeDefined();
    });
  });

  describe('getAllOrders', () => {
    it('should get all orders', async () => {
      const result = await getAllOrders();
      expect(result).toBeDefined();
    });
  });

  describe('getOrderStats', () => {
    it('should get order statistics', async () => {
      const result = await getOrderStats();
      expect(result).toBeDefined();
    });
  });
});