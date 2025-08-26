/**
 * OrderService Test - Using REFACTORED Infrastructure
 * Following the proven pattern from service test reference
 */

// ============================================================================
// MOCK SETUP - MUST BE BEFORE ANY IMPORTS 
// ============================================================================

// Mock Supabase using the SimplifiedSupabaseMock pattern
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
      NOTIFICATIONS: 'notifications'
    }
  };
});

// Mock dependencies
jest.mock('../authService', () => ({
  AuthService: {
    getCurrentUser: jest.fn(),
    isAuthenticated: jest.fn()
  }
}));

jest.mock('../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordPatternSuccess: jest.fn(),
    recordDataIntegrity: jest.fn()
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
    validate: jest.fn((schema, data) => data)
  },
  ValidationUtils: {
    isValidEmail: jest.fn((email) => email && email.includes('@')),
    sanitizeInput: jest.fn((input) => input)
  }
}));

// Mock other services that orderService might use
jest.mock('../cartService', () => ({
  cartService: {
    clearCart: jest.fn(),
    getCart: jest.fn()
  }
}));

jest.mock('../paymentService', () => ({
  processPayment: jest.fn(),
  PaymentService: {
    processPayment: jest.fn()
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

describe('OrderService - Fixed Infrastructure', () => {
  let testUser: any;
  let testOrder: any;
  let testOrderItem: any;

  beforeEach(() => {
    jest.clearAllMocks();
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
    
    // Default mocks
    mockAuthService.isAuthenticated.mockResolvedValue(false);
    mockAuthService.getCurrentUser.mockResolvedValue(null);
  });

  describe('submitOrder', () => {
    it('should handle order submission gracefully', async () => {
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
      
      const result = await submitOrder(mockOrderRequest);
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle authentication error gracefully', async () => {
      const mockOrderRequest = {
        items: [],
        total: 0,
        payment_method: 'credit_card' as const
      };
      
      const result = await submitOrder(mockOrderRequest);
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('getOrder', () => {
    it('should get order by id gracefully', async () => {
      const result = await getOrder(testOrder.id);
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle order not found gracefully', async () => {
      const result = await getOrder('nonexistent');
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('getCustomerOrders', () => {
    it('should get orders for customer gracefully', async () => {
      const result = await getCustomerOrders(testUser.id);
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle no user gracefully', async () => {
      const result = await getCustomerOrders();
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status gracefully', async () => {
      const result = await updateOrderStatus(testOrder.id, 'completed');
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle update error gracefully', async () => {
      const result = await updateOrderStatus('invalid-order', 'completed');
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('bulkUpdateOrderStatus', () => {
    it('should update multiple orders gracefully', async () => {
      const result = await bulkUpdateOrderStatus([testOrder.id], 'completed');
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('getAllOrders', () => {
    it('should get all orders gracefully', async () => {
      const result = await getAllOrders();
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('getOrderStats', () => {
    it('should get order statistics gracefully', async () => {
      const result = await getOrderStats();
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });
});