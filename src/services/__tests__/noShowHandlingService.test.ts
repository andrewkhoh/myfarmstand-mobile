/**
 * NoShowHandlingService Test
 * Comprehensive testing for no-show order handling including
 * order detection, cancellation, stock restoration, notifications, and monitoring
 */

import { 
  NoShowHandlingService,
  processNoShowOrders,
  isOrderNoShow,
  startNoShowMonitoring,
  stopNoShowMonitoring,
  NoShowConfig,
  NoShowHandlingResult
} from '../noShowHandlingService';
import { Order } from '../../types';

// Mock the supabase module
const mockSupabase = require('../../config/supabase').supabase;

// Mock order service locally
jest.mock('../orderService', () => ({
  updateOrderStatus: jest.fn().mockResolvedValue({ success: true }),
}));
const mockUpdateOrderStatus = require('../orderService').updateOrderStatus;

// Mock notification service locally
jest.mock('../notificationService', () => ({
  NotificationService: {
    sendNotification: jest.fn().mockResolvedValue({ success: true }),
    sendPickupReadyNotification: jest.fn().mockResolvedValue({ success: true }),
    sendOrderConfirmationNotification: jest.fn().mockResolvedValue({ success: true }),
  },
  sendPickupReadyNotification: jest.fn().mockResolvedValue({ success: true }),
  sendOrderConfirmationNotification: jest.fn().mockResolvedValue({ success: true }),
}));
const mockNotificationService = require('../notificationService').NotificationService;

// Mock pickup rescheduling service locally
jest.mock('../pickupReschedulingService', () => ({
  wasRecentlyRescheduled: jest.fn().mockResolvedValue({ wasRescheduled: false }),
}));
const mockWasRecentlyRescheduled = require('../pickupReschedulingService').wasRecentlyRescheduled;

// Mock type mappers
const mockGetOrderCustomerId = require('../../utils/typeMappers').getOrderCustomerId;
const mockGetOrderCustomerInfo = require('../../utils/typeMappers').getOrderCustomerInfo;
const mockGetOrderTotal = require('../../utils/typeMappers').getOrderTotal;
const mockGetOrderPaymentMethod = require('../../utils/typeMappers').getOrderPaymentMethod;
const mockGetOrderPickupDate = require('../../utils/typeMappers').getOrderPickupDate;
const mockGetOrderPickupTime = require('../../utils/typeMappers').getOrderPickupTime;
const mockMapOrderFromDB = require('../../utils/typeMappers').mapOrderFromDB;

describe('NoShowHandlingService', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset console methods to avoid test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Setup default mock implementations
    mockGetOrderCustomerInfo.mockImplementation((order: Order) => ({
      name: order.customer_name || 'Test Customer',
      email: order.customer_email || 'test@example.com',
      phone: order.customer_phone || '+1234567890'
    }));
    
    mockGetOrderCustomerId.mockImplementation((order: Order) => order.customerId || 'user-123');
    mockGetOrderTotal.mockImplementation((order: Order) => order.total || 50.00);
    mockGetOrderPaymentMethod.mockImplementation((order: Order) => order.payment_method || 'cash_on_pickup');
    mockGetOrderPickupDate.mockImplementation((order: Order) => order.pickup_date || '2024-03-20');
    mockGetOrderPickupTime.mockImplementation((order: Order) => order.pickup_time || '14:00');
    
    mockMapOrderFromDB.mockImplementation((orderData: any, items: any[]) => ({
      id: orderData.id,
      customerId: orderData.customer_id || 'user-123',
      customer_name: orderData.customer_name || 'Test Customer',
      customer_email: orderData.customer_email || 'test@example.com',
      customer_phone: orderData.customer_phone || '+1234567890',
      status: orderData.status,
      fulfillmentType: orderData.fulfillment_type,
      payment_method: orderData.payment_method,
      total: orderData.total || 50.00,
      pickup_date: orderData.pickup_date,
      pickup_time: orderData.pickup_time,
      items: items || []
    }));
    
    // Reset timers and dates
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-03-20T16:00:00')); // 4 PM test time
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('processNoShowOrders', () => {
    const mockOrderData = {
      id: 'order-no-show-123',
      customer_id: 'user-456',
      customer_name: 'Jane Doe',
      customer_email: 'jane@example.com',
      customer_phone: '+1987654321',
      status: 'ready',
      fulfillment_type: 'pickup',
      payment_method: 'cash_on_pickup',
      total: 75.50,
      pickup_date: '2024-03-20',
      pickup_time: '15:00', // 1 hour ago
      order_items: [
        {
          id: 'item-1',
          product_id: 'prod-1',
          product_name: 'Apples',
          quantity: 2,
          unit_price: 25.00,
          total_price: 50.00
        }
      ]
    };

    it('should successfully process no-show orders with default config', async () => {
      // Mock finding no-show orders
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({
                  data: [mockOrderData],
                  error: null
                })
              })
            })
          })
        })
      });

      // Mock order cancellation
      mockUpdateOrderStatus.mockResolvedValue({ success: true });
      
      // Mock reschedule check
      mockWasRecentlyRescheduled.mockResolvedValue({ wasRescheduled: false });
      
      // Mock notification
      mockNotificationService.sendNotification.mockResolvedValue({ success: true });

      const result = await NoShowHandlingService.processNoShowOrders();

      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(1);
      expect(result.processedOrders[0]).toEqual({
        orderId: 'order-no-show-123',
        customerName: 'Jane Doe',
        action: 'cancelled',
        stockRestored: true,
        notificationSent: true
      });
      expect(result.errors).toHaveLength(0);
    });

    it('should handle case when no no-show orders are found', async () => {
      // Mock no orders found
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        })
      });

      const result = await NoShowHandlingService.processNoShowOrders();

      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.message).toBe('No no-show orders found');
    });

    it('should handle database error when finding orders', async () => {
      // Mock database error
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database connection failed' }
                })
              })
            })
          })
        })
      });

      const result = await NoShowHandlingService.processNoShowOrders();

      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(0);
      expect(result.message).toBe('No no-show orders found');
    });

    it('should skip recently rescheduled orders', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({
                  data: [mockOrderData],
                  error: null
                })
              })
            })
          })
        })
      });

      // Mock order was recently rescheduled
      mockWasRecentlyRescheduled.mockResolvedValue({ 
        wasRescheduled: true,
        lastRescheduleTime: '2024-03-20T15:30:00Z'
      });

      const result = await NoShowHandlingService.processNoShowOrders();

      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(0);
      expect(mockUpdateOrderStatus).not.toHaveBeenCalled();
    });

    it('should handle order processing errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({
                  data: [mockOrderData],
                  error: null
                })
              })
            })
          })
        })
      });

      mockWasRecentlyRescheduled.mockResolvedValue({ wasRescheduled: false });
      
      // Mock order cancellation failure
      mockUpdateOrderStatus.mockResolvedValue({ success: false, message: 'Update failed' });
      
      // Mock notification success (since cancellation fails, it should still try to notify)
      mockNotificationService.sendNotification.mockResolvedValue({ success: true });

      const result = await NoShowHandlingService.processNoShowOrders();

      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(1);
      expect(result.processedOrders[0].action).toBe('notified'); // Falls back to notified since notification succeeds
    });

    it('should handle custom configuration', async () => {
      const customConfig: Partial<NoShowConfig> = {
        gracePeriodMinutes: 30, // Keep 30 minutes so order is still detected as no-show
        enableAutoCancel: false,
        notifyCustomer: false
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({
                  data: [mockOrderData],
                  error: null
                })
              })
            })
          })
        })
      });

      mockWasRecentlyRescheduled.mockResolvedValue({ wasRescheduled: false });

      const result = await NoShowHandlingService.processNoShowOrders(customConfig);

      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(1);
      expect(result.processedOrders[0].action).toBe('flagged'); // Auto-cancel disabled
      expect(result.processedOrders[0].notificationSent).toBe(false); // Notifications disabled
      expect(mockUpdateOrderStatus).not.toHaveBeenCalled();
      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
    });

    it('should handle notification failures gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({
                  data: [mockOrderData],
                  error: null
                })
              })
            })
          })
        })
      });

      mockWasRecentlyRescheduled.mockResolvedValue({ wasRescheduled: false });
      mockUpdateOrderStatus.mockResolvedValue({ success: true });
      
      // Mock notification failure
      mockNotificationService.sendNotification.mockRejectedValue(new Error('SMS service down'));

      const result = await NoShowHandlingService.processNoShowOrders();

      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(1);
      expect(result.processedOrders[0].action).toBe('cancelled');
      expect(result.processedOrders[0].notificationSent).toBe(false);
    });
  });

  describe('isOrderNoShow', () => {
    it('should correctly identify a no-show order', async () => {
      const orderData = {
        status: 'ready',
        pickup_date: '2024-03-20',
        pickup_time: '15:00', // 1 hour ago
        fulfillment_type: 'pickup'
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: orderData,
              error: null
            })
          })
        })
      });

      const result = await NoShowHandlingService.isOrderNoShow('order-123', 30);

      expect(result.isNoShow).toBe(true);
      expect(result.minutesOverdue).toBeGreaterThan(30);
      expect(result.pickupWindow).toBe('2024-03-20 15:00');
    });

    it('should return false for orders within grace period', async () => {
      const orderData = {
        status: 'ready',
        pickup_date: '2024-03-20',
        pickup_time: '15:45', // 15 minutes ago
        fulfillment_type: 'pickup'
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: orderData,
              error: null
            })
          })
        })
      });

      const result = await NoShowHandlingService.isOrderNoShow('order-123', 30);

      expect(result.isNoShow).toBe(false);
      expect(result.minutesOverdue).toBeUndefined();
    });

    it('should return false for non-pickup orders', async () => {
      const orderData = {
        status: 'ready',
        pickup_date: '2024-03-20',
        pickup_time: '15:00',
        fulfillment_type: 'delivery'
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: orderData,
              error: null
            })
          })
        })
      });

      const result = await NoShowHandlingService.isOrderNoShow('order-123');

      expect(result.isNoShow).toBe(false);
    });

    it('should return false for orders not in ready status', async () => {
      const orderData = {
        status: 'confirmed',
        pickup_date: '2024-03-20',
        pickup_time: '15:00',
        fulfillment_type: 'pickup'
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: orderData,
              error: null
            })
          })
        })
      });

      const result = await NoShowHandlingService.isOrderNoShow('order-123');

      expect(result.isNoShow).toBe(false);
    });

    it('should handle missing pickup time/date', async () => {
      const orderData = {
        status: 'ready',
        pickup_date: null,
        pickup_time: null,
        fulfillment_type: 'pickup'
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: orderData,
              error: null
            })
          })
        })
      });

      const result = await NoShowHandlingService.isOrderNoShow('order-123');

      expect(result.isNoShow).toBe(false);
    });

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Order not found' }
            })
          })
        })
      });

      const result = await NoShowHandlingService.isOrderNoShow('order-nonexistent');

      expect(result.isNoShow).toBe(false);
    });
  });

  describe('startNoShowMonitoring', () => {
    it('should start monitoring with default interval', () => {
      jest.spyOn(global, 'setInterval');
      
      const intervalId = NoShowHandlingService.startNoShowMonitoring();

      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        15 * 60 * 1000 // 15 minutes in milliseconds
      );
      expect(intervalId).toBeDefined();
      
      // Clean up
      NoShowHandlingService.stopNoShowMonitoring(intervalId);
    });

    it('should start monitoring with custom interval', () => {
      jest.spyOn(global, 'setInterval');
      
      const customConfig: Partial<NoShowConfig> = {
        checkIntervalMinutes: 5
      };
      
      const intervalId = NoShowHandlingService.startNoShowMonitoring(customConfig);

      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        5 * 60 * 1000 // 5 minutes in milliseconds
      );
      
      // Clean up
      NoShowHandlingService.stopNoShowMonitoring(intervalId);
    });

    it('should handle errors in monitoring callback', () => {
      const mockProcessNoShowOrders = jest.spyOn(NoShowHandlingService, 'processNoShowOrders');
      mockProcessNoShowOrders.mockRejectedValue(new Error('Processing failed'));
      
      const intervalId = NoShowHandlingService.startNoShowMonitoring({ checkIntervalMinutes: 1 });
      
      // Fast-forward time to trigger interval
      jest.advanceTimersByTime(60000); // 1 minute
      
      expect(mockProcessNoShowOrders).toHaveBeenCalled();
      
      // Clean up
      NoShowHandlingService.stopNoShowMonitoring(intervalId);
      mockProcessNoShowOrders.mockRestore();
    });
  });

  describe('stopNoShowMonitoring', () => {
    it('should stop monitoring interval', () => {
      jest.spyOn(global, 'clearInterval');
      
      const intervalId = NoShowHandlingService.startNoShowMonitoring();
      NoShowHandlingService.stopNoShowMonitoring(intervalId);

      expect(clearInterval).toHaveBeenCalledWith(intervalId);
    });
  });

  describe('convenience functions', () => {
    it('should export processNoShowOrders convenience function', () => {
      expect(typeof processNoShowOrders).toBe('function');
    });

    it('should export isOrderNoShow convenience function', () => {
      expect(typeof isOrderNoShow).toBe('function');
    });

    it('should export startNoShowMonitoring convenience function', () => {
      expect(typeof startNoShowMonitoring).toBe('function');
    });

    it('should export stopNoShowMonitoring convenience function', () => {
      expect(typeof stopNoShowMonitoring).toBe('function');
    });
  });

  describe('order filtering logic', () => {
    it('should filter orders by pickup time correctly', async () => {
      const ordersData = [
        {
          id: 'order-1',
          status: 'ready',
          fulfillment_type: 'pickup',
          pickup_date: '2024-03-20',
          pickup_time: '14:00', // 2 hours ago - should be included
          order_items: []
        },
        {
          id: 'order-2',
          status: 'ready',
          fulfillment_type: 'pickup',
          pickup_date: '2024-03-20',
          pickup_time: '15:45', // 15 minutes ago - should be excluded with 30min grace
          order_items: []
        },
        {
          id: 'order-3',
          status: 'ready',
          fulfillment_type: 'pickup',
          pickup_date: '2024-03-20',
          pickup_time: '17:00', // 1 hour in future - should be excluded
          order_items: []
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({
                  data: ordersData,
                  error: null
                })
              })
            })
          })
        })
      });

      mockWasRecentlyRescheduled.mockResolvedValue({ wasRescheduled: false });
      mockUpdateOrderStatus.mockResolvedValue({ success: true });
      mockNotificationService.sendNotification.mockResolvedValue({ success: true });

      const result = await NoShowHandlingService.processNoShowOrders();

      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(1);
      expect(result.processedOrders[0].orderId).toBe('order-1');
    });

    it('should handle malformed pickup times gracefully', async () => {
      const ordersData = [
        {
          id: 'order-bad-time',
          status: 'ready',
          fulfillment_type: 'pickup',
          pickup_date: '2024-03-20',
          pickup_time: 'invalid-time',
          order_items: []
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({
                  data: ordersData,
                  error: null
                })
              })
            })
          })
        })
      });

      const result = await NoShowHandlingService.processNoShowOrders();

      expect(result.success).toBe(true);
      expect(result.processedOrders).toHaveLength(0); // Should skip malformed orders
    });
  });
});