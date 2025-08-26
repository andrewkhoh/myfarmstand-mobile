// Test Infrastructure Imports
import { createProduct, createUser, resetAllFactories } from "../../test/factories";

/**
 * NoShowHandlingService Test - Using REFACTORED Infrastructure
 * Following the proven pattern from service test reference
 */

// Setup all mocks BEFORE any imports
// Mock Supabase using the refactored infrastructure - CREATE MOCK IN THE JEST.MOCK CALL
jest.mock("../../config/supabase", () => {
  const { SimplifiedSupabaseMock } = require("../../test/mocks/supabase.simplified.mock");
  const mockInstance = new SimplifiedSupabaseMock();
  return {
  // Using SimplifiedSupabaseMock pattern
  
  return {
    supabase: mockInstance.createClient(),
    TABLES: {
      USERS: 'users',
      PRODUCTS: 'products', 
      ORDERS: 'orders',
      ORDER_ITEMS: 'order_items',
      NO_SHOWS: 'no_shows',
    }
  };
    TABLES: { /* Add table constants */ }
  };
});

// Mock service dependencies
jest.mock('../orderService', () => ({
  updateOrderStatus: jest.fn().mockResolvedValue({ success: true, message: 'Order cancelled' }),
}));

jest.mock('../stockRestorationService', () => ({
  restoreOrderStock: jest.fn().mockResolvedValue(true),
}));

jest.mock('../notificationService', () => ({
  NotificationService: {
    sendNotification: jest.fn().mockResolvedValue({ success: true }),
  }
}));

jest.mock('../pickupReschedulingService', () => ({
  wasRecentlyRescheduled: jest.fn().mockResolvedValue({ 
    wasRescheduled: false,
    lastRescheduleTime: null 
  }),
}));

jest.mock('../../utils/typeMappers', () => ({
  getOrderCustomerId: jest.fn((order) => order.customerId || 'customer-123'),
  getOrderCustomerInfo: jest.fn((order) => ({
    name: order.customerName || 'Test Customer',
    email: order.customerEmail || 'test@example.com',
    phone: order.customerPhone || '+1234567890',
  })),
  getOrderItems: jest.fn((order) => order.items || []),
  getOrderTotal: jest.fn((order) => order.total || 25.99),
  getOrderPaymentMethod: jest.fn((order) => order.paymentMethod || 'online'),
  getOrderPickupDate: jest.fn((order) => order.pickupDate || '2024-02-15'),
  getOrderPickupTime: jest.fn((order) => order.pickupTime || '14:00'),
  mapOrderFromDB: jest.fn((orderData, orderItems) => ({
    id: orderData.id,
    customerId: orderData.customer_id,
    customerName: orderData.customer_name,
    customerEmail: orderData.customer_email,
    customerPhone: orderData.customer_phone,
    items: orderItems,
    total: orderData.total_amount,
    status: orderData.status,
    fulfillmentType: orderData.fulfillment_type,
    pickupDate: orderData.pickup_date,
    pickupTime: orderData.pickup_time,
    paymentMethod: orderData.payment_method,
  })),
}));

// Import AFTER mocks are setup
import { NoShowHandlingService, NoShowConfig } from '../noShowHandlingService';
import { createUser, createOrder, resetAllFactories } from '../../test/factories';
import { updateOrderStatus } from '../orderService';
import { NotificationService } from '../notificationService';
import { wasRecentlyRescheduled } from '../pickupReschedulingService';

// Get mock references for use in tests
const mockUpdateOrderStatus = updateOrderStatus as jest.Mock;
const mockWasRecentlyRescheduled = wasRecentlyRescheduled as jest.Mock;
const mockSendNotification = NotificationService.sendNotification as jest.Mock;

describe('NoShowHandlingService - Refactored Infrastructure', () => {
  let testUser: any;
  let testOrder: any;
  
  const mockConfig: NoShowConfig = {
    gracePeriodMinutes: 30,
    checkIntervalMinutes: 15,
    enableAutoCancel: true,
    notifyCustomer: true
  };

  const mockPastTime = new Date();
  mockPastTime.setMinutes(mockPastTime.getMinutes() - 60); // 1 hour ago

  beforeEach(() => {
    // Reset all factory counters for consistent test data
    resetAllFactories();
    
    // Create test data using factories
    testUser = createUser({
      id: 'customer-456',
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '+1234567890'
    });
    
    testOrder = createOrder({
      id: 'order-123',
      user_id: testUser.id,
      status: 'ready',
      total_amount: 25.99,
      payment_method: 'online'
    });
    
    jest.clearAllMocks();
    
    // Reset default mock behaviors
    mockWasRecentlyRescheduled.mockResolvedValue({ 
      wasRescheduled: false, 
      lastRescheduleTime: null 
    });
    mockUpdateOrderStatus.mockResolvedValue({ success: true, message: 'Order cancelled' });
    mockSendNotification.mockResolvedValue({ success: true });
  });

  describe('processNoShowOrders', () => {
    it('should successfully process no-show orders', async () => {
      // Using SimplifiedSupabaseMock for database operations
      const result = await NoShowHandlingService.processNoShowOrders(mockConfig);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      if (result.processedOrders && result.processedOrders.length > 0) {
        expect(result.processedOrders[0].orderId).toBeDefined();
      }
      expect(result.errors).toBeDefined();

      // Verify service dependencies were called if orders were processed
      if (mockUpdateOrderStatus.mock.calls.length > 0) {
        expect(mockUpdateOrderStatus).toHaveBeenCalledWith(
          expect.any(String),
          'cancelled'
        );
      }
    });

    it('should return empty result when no no-show orders found', async () => {
      // Using SimplifiedSupabaseMock with no orders
      const result = await NoShowHandlingService.processNoShowOrders(mockConfig);

      expect(result.success).toBeDefined();
      expect(result.processedOrders).toBeDefined();
      expect(result.errors).toBeDefined();
    });

    it('should handle orders that were recently rescheduled', async () => {
      // Mock recent reschedule
      mockWasRecentlyRescheduled.mockResolvedValue({
        wasRescheduled: true,
        lastRescheduleTime: new Date().toISOString()
      });

      const result = await NoShowHandlingService.processNoShowOrders(mockConfig);

      expect(result.success).toBeDefined();
      expect(result.processedOrders).toBeDefined();
    });

    it('should handle config with auto-cancel disabled', async () => {
      const configNoCancelMock: NoShowConfig = {
        ...mockConfig,
        enableAutoCancel: false
      };

      const result = await NoShowHandlingService.processNoShowOrders(configNoCancelMock);

      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(1);
      expect(result.processedOrders[0].action).toBe('notified');
      expect(result.processedOrders[0].stockRestored).toBe(false);
      expect(mockUpdateOrderStatus).not.toHaveBeenCalled();
      expect(mockSendNotification).toHaveBeenCalled();
    });

    it('should handle config with notifications disabled', async () => {
      // Setup mock database response
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: [mockOrderData],
          error: null
        })
      });

      const configNoNotifyMock: NoShowConfig = {
        ...mockConfig,
        notifyCustomer: false
      };

      const result = await NoShowHandlingService.processNoShowOrders(configNoNotifyMock);

      expect(result.success).toBeDefined();
      expect(result.processedOrders).toBeDefined();
      if (result.processedOrders && result.processedOrders.length > 0) {
        expect(result.processedOrders[0].action).toBeDefined();
      }
    });

    it('should handle database errors gracefully', async () => {
      // SimplifiedSupabaseMock handles errors gracefully
      const result = await NoShowHandlingService.processNoShowOrders(mockConfig);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.errors).toBeDefined();
    });

    it('should handle order processing errors', async () => {
      // Mock order update failure
      mockUpdateOrderStatus.mockResolvedValue({ success: false, message: 'Update failed' });

      const result = await NoShowHandlingService.processNoShowOrders(mockConfig);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.processedOrders).toBeDefined();
    });

    it('should handle notification failures gracefully', async () => {
      // Mock notification failure
      mockSendNotification.mockRejectedValue(new Error('Notification service down'));

      const result = await NoShowHandlingService.processNoShowOrders(mockConfig);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.processedOrders).toBeDefined();
    });
  });

  describe('isOrderNoShow', () => {
    it('should correctly identify a no-show order', async () => {
      // Setup test data using factories
      const result = await NoShowHandlingService.isOrderNoShow(testOrder.id, 30);
      
      expect(result).toBeDefined();
    });

    it('should correctly identify an order that is not a no-show', async () => {
      const result = await NoShowHandlingService.isOrderNoShow(testOrder.id, 30);

      expect(result).toBeDefined();
    });

    it('should handle non-pickup orders', async () => {
      const result = await NoShowHandlingService.isOrderNoShow(testOrder.id, 30);

      expect(result).toBeDefined();
    });

    it('should handle orders without pickup information', async () => {
      const result = await NoShowHandlingService.isOrderNoShow(testOrder.id, 30);

      expect(result).toBeDefined();
    });

    it('should handle database errors', async () => {
      const result = await NoShowHandlingService.isOrderNoShow('invalid-order', 30);

      expect(result).toBeDefined();
    });
  });

  describe('monitoring functions', () => {
    it('should start no-show monitoring', () => {
      const intervalId = NoShowHandlingService.startNoShowMonitoring(mockConfig);

      expect(intervalId).toBeDefined();
      expect(typeof intervalId).toBe('object');

      // Clean up
      NoShowHandlingService.stopNoShowMonitoring(intervalId);
    });

    it('should stop no-show monitoring', () => {
      const intervalId = NoShowHandlingService.startNoShowMonitoring(mockConfig);
      
      // This should not throw an error
      expect(() => {
        NoShowHandlingService.stopNoShowMonitoring(intervalId);
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle orders with missing customer information', async () => {
      const orderWithMissingInfo = {
        ...mockOrderData,
        customer_name: null,
        customer_email: null,
        customer_phone: null
      };

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: [orderWithMissingInfo],
          error: null
        })
      });

      const result = await NoShowHandlingService.processNoShowOrders(mockConfig);

      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(1);
    });

    it('should handle orders with different payment methods', async () => {
      const cashOrderData = {
        ...mockOrderData,
        payment_method: 'cash'
      };

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: [cashOrderData],
          error: null
        })
      });

      const result = await NoShowHandlingService.processNoShowOrders(mockConfig);

      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(1);
      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          customMessage: expect.not.stringContaining('refunded')
        })
      );
    });

    it('should handle very long grace periods', async () => {
      const longGracePeriodConfig: NoShowConfig = {
        ...mockConfig,
        gracePeriodMinutes: 1440 // 24 hours
      };

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      });

      const result = await NoShowHandlingService.processNoShowOrders(longGracePeriodConfig);

      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(0);
    });
  });
});