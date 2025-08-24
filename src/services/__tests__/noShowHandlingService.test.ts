/**
 * NoShowHandlingService Test - Following Service Test Pattern (REFERENCE)
 */

// Setup all mocks BEFORE any imports
jest.mock('../../config/supabase', () => {
  const mockFrom = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  }));
  
  return {
    supabase: {
      from: mockFrom,
    },
    TABLES: {
      USERS: 'users',
      PRODUCTS: 'products', 
      ORDERS: 'orders',
      ORDER_ITEMS: 'order_items',
      NO_SHOWS: 'no_shows',
    }
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
import { supabase } from '../../config/supabase';
import { updateOrderStatus } from '../orderService';
import { NotificationService } from '../notificationService';
import { wasRecentlyRescheduled } from '../pickupReschedulingService';

// Get mock references for use in tests
const mockSupabaseFrom = supabase.from as jest.Mock;
const mockUpdateOrderStatus = updateOrderStatus as jest.Mock;
const mockWasRecentlyRescheduled = wasRecentlyRescheduled as jest.Mock;
const mockSendNotification = NotificationService.sendNotification as jest.Mock;

describe('NoShowHandlingService', () => {
  const mockConfig: NoShowConfig = {
    gracePeriodMinutes: 30,
    checkIntervalMinutes: 15,
    enableAutoCancel: true,
    notifyCustomer: true
  };

  const mockPastTime = new Date();
  mockPastTime.setMinutes(mockPastTime.getMinutes() - 60); // 1 hour ago

  const mockOrderData = {
    id: 'order-123',
    customer_id: 'customer-456',
    customer_name: 'Test Customer',
    customer_email: 'test@example.com',
    customer_phone: '+1234567890',
    status: 'ready',
    fulfillment_type: 'pickup',
    pickup_date: mockPastTime.toISOString().split('T')[0],
    pickup_time: mockPastTime.toTimeString().split(' ')[0].slice(0, 5),
    total_amount: 25.99,
    payment_method: 'online',
    order_items: [
      {
        id: 'item-1',
        product_id: 'product-1',
        product_name: 'Test Product',
        quantity: 2,
        unit_price: 12.99,
        total_price: 25.98
      }
    ]
  };

  beforeEach(() => {
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

      const result = await NoShowHandlingService.processNoShowOrders(mockConfig);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(1);
      expect(result.processedOrders[0].orderId).toBe('order-123');
      expect(result.processedOrders[0].action).toBe('cancelled');
      expect(result.processedOrders[0].stockRestored).toBe(true);
      expect(result.processedOrders[0].notificationSent).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Verify service dependencies were called
      expect(mockUpdateOrderStatus).toHaveBeenCalledWith('order-123', 'cancelled');
      expect(mockSendNotification).toHaveBeenCalledWith({
        userId: 'customer-456',
        customerEmail: 'test@example.com',
        customerPhone: '+1234567890',
        customerName: 'Test Customer',
        type: 'order_cancelled',
        channels: ['sms', 'email'],
        order: expect.any(Object),
        customMessage: expect.stringContaining('Your order was automatically cancelled due to no-show')
      });
    });

    it('should return empty result when no no-show orders found', async () => {
      // Setup mock database response with no orders
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      });

      const result = await NoShowHandlingService.processNoShowOrders(mockConfig);

      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.message).toBe('No no-show orders found');
    });

    it('should handle orders that were recently rescheduled', async () => {
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

      // Mock recent reschedule
      mockWasRecentlyRescheduled.mockResolvedValue({
        wasRescheduled: true,
        lastRescheduleTime: new Date().toISOString()
      });

      const result = await NoShowHandlingService.processNoShowOrders(mockConfig);

      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(0);
      expect(mockUpdateOrderStatus).not.toHaveBeenCalled();
    });

    it('should handle config with auto-cancel disabled', async () => {
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

      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(1);
      expect(result.processedOrders[0].action).toBe('cancelled');
      expect(result.processedOrders[0].notificationSent).toBe(false);
      expect(mockUpdateOrderStatus).toHaveBeenCalled();
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Setup mock database error
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      });

      const result = await NoShowHandlingService.processNoShowOrders(mockConfig);

      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle order processing errors', async () => {
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

      // Mock order update failure
      mockUpdateOrderStatus.mockResolvedValue({ success: false, message: 'Update failed' });

      const result = await NoShowHandlingService.processNoShowOrders(mockConfig);

      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(1);
      expect(result.processedOrders[0].action).toBe('notified'); // fallback action
      expect(result.processedOrders[0].stockRestored).toBe(false);
    });

    it('should handle notification failures gracefully', async () => {
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

      // Mock notification failure
      mockSendNotification.mockRejectedValue(new Error('Notification service down'));

      const result = await NoShowHandlingService.processNoShowOrders(mockConfig);

      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(1);
      expect(result.processedOrders[0].action).toBe('cancelled');
      expect(result.processedOrders[0].notificationSent).toBe(false);
    });
  });

  describe('isOrderNoShow', () => {
    it('should correctly identify a no-show order', async () => {
      // Setup mock database response for no-show order
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 60);
      
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            status: 'ready',
            pickup_date: pastDate.toISOString().split('T')[0],
            pickup_time: pastDate.toTimeString().split(' ')[0].slice(0, 5),
            fulfillment_type: 'pickup'
          },
          error: null
        })
      });

      const result = await NoShowHandlingService.isOrderNoShow('order-123', 30);

      expect(result).toBeDefined();
      expect(result.isNoShow).toBe(true);
      expect(result.minutesOverdue).toBeGreaterThan(0);
      expect(result.pickupWindow).toBeDefined();
    });

    it('should correctly identify an order that is not a no-show', async () => {
      // Setup mock database response for future order
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 60);
      
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            status: 'ready',
            pickup_date: futureDate.toISOString().split('T')[0],
            pickup_time: futureDate.toTimeString().split(' ')[0].slice(0, 5),
            fulfillment_type: 'pickup'
          },
          error: null
        })
      });

      const result = await NoShowHandlingService.isOrderNoShow('order-123', 30);

      expect(result).toBeDefined();
      expect(result.isNoShow).toBe(false);
      expect(result.minutesOverdue).toBeUndefined();
    });

    it('should handle non-pickup orders', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            status: 'ready',
            pickup_date: null,
            pickup_time: null,
            fulfillment_type: 'delivery'
          },
          error: null
        })
      });

      const result = await NoShowHandlingService.isOrderNoShow('order-123', 30);

      expect(result.isNoShow).toBe(false);
    });

    it('should handle orders without pickup information', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            status: 'ready',
            pickup_date: null,
            pickup_time: null,
            fulfillment_type: 'pickup'
          },
          error: null
        })
      });

      const result = await NoShowHandlingService.isOrderNoShow('order-123', 30);

      expect(result.isNoShow).toBe(false);
    });

    it('should handle database errors', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Order not found' }
        })
      });

      const result = await NoShowHandlingService.isOrderNoShow('invalid-order', 30);

      expect(result.isNoShow).toBe(false);
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