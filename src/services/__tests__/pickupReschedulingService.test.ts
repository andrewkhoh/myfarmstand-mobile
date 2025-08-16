/**
 * PickupReschedulingService Test
 * Comprehensive testing for pickup rescheduling functionality including
 * time validation, order status checks, notification handling, audit logging,
 * no-show prevention, and broadcast updates
 */

import { 
  PickupReschedulingService,
  reschedulePickup,
  wasRecentlyRescheduled 
} from '../pickupReschedulingService';
import { Order } from '../../types';

// Mock the supabase module
const mockSupabase = require('../../config/supabase').supabase;

// Mock orderService functions
jest.mock('../orderService', () => ({
  getOrder: jest.fn(),
  updateOrderStatus: jest.fn()
}));

// Mock notification service 
jest.mock('../notificationService', () => ({
  NotificationService: {
    sendNotification: jest.fn()
  }
}));

// Get mocked modules
const mockOrderService = require('../orderService');
const mockSendOrderBroadcast = require('../../utils/broadcastFactory').sendOrderBroadcast;
const mockNotificationService = require('../notificationService').NotificationService;
const mockGetOrderCustomerId = require('../../utils/typeMappers').getOrderCustomerId;
const mockGetOrderCustomerInfo = require('../../utils/typeMappers').getOrderCustomerInfo;
const mockGetOrderFulfillmentType = require('../../utils/typeMappers').getOrderFulfillmentType;

describe('PickupReschedulingService', () => {
  // Test data
  const mockOrder: Order = {
    id: 'order-123456',
    customerId: 'user-789',
    customer_name: 'John Doe',
    customer_email: 'john.doe@example.com',
    customer_phone: '+1234567890',
    status: 'confirmed',
    fulfillmentType: 'pickup',
    payment_method: 'cash_on_pickup',
    paymentMethod: 'cash_on_pickup',
    payment_status: 'pending',
    total: 45.67,
    total_amount: 45.67,
    pickup_date: '2024-03-20',
    pickup_time: '14:00',
    pickupDate: '2024-03-20',
    pickupTime: '14:00',
    items: [],
    customerInfo: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockReadyOrder: Order = {
    ...mockOrder,
    id: 'order-ready-789',
    status: 'ready'
  };

  const mockDeliveryOrder: Order = {
    ...mockOrder,
    id: 'order-delivery-456',
    fulfillmentType: 'delivery'
  };

  // Dynamic dates for testing
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 5);
  const futureDateString = futureDate.toISOString().split('T')[0];

  const validRescheduleRequest = {
    orderId: 'order-123456',
    newPickupDate: futureDateString,
    newPickupTime: '16:00',
    reason: 'Customer request',
    requestedBy: 'customer' as const,
    requestedByUserId: 'user-789',
    customerNotification: true
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default Supabase mocks
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockOrder, pickup_date: futureDateString, pickup_time: '16:00' },
              error: null
            })
          })
        })
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' } // No rows returned
                })
              })
            })
          })
        })
      }),
      insert: jest.fn().mockResolvedValue({ error: null })
    });

    // Setup service mocks
    mockOrderService.getOrder.mockResolvedValue(mockOrder);
    mockOrderService.updateOrderStatus.mockResolvedValue({ success: true });
    mockSendOrderBroadcast.mockResolvedValue({ success: true });

    // Setup notification mock
    mockNotificationService.sendNotification = jest.fn().mockResolvedValue({
      success: true,
      sentChannels: ['push', 'sms'],
      failedChannels: []
    });

    // Setup type mapper mocks
    mockGetOrderCustomerId.mockReturnValue('user-789');
    mockGetOrderCustomerInfo.mockReturnValue({
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890'
    });
    mockGetOrderFulfillmentType.mockReturnValue('pickup');

    // Console spies
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('reschedulePickup', () => {
    it('should reschedule pickup successfully for valid request', async () => {
      const result = await PickupReschedulingService.reschedulePickup(validRescheduleRequest);

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.previousPickupDate).toBe('2024-03-20');
      expect(result.previousPickupTime).toBe('14:00');
      expect(result.newPickupDate).toBe(futureDateString);
      expect(result.newPickupTime).toBe('16:00');
      expect(result.notificationSent).toBe(true);
      expect(result.message).toContain(`Pickup rescheduled from 2024-03-20 14:00 to ${futureDateString} 16:00`);
      expect(console.log).toHaveBeenCalledWith(
        '📅 Processing pickup reschedule request for order: order-123456'
      );
    });

    it('should handle ready orders for rescheduling', async () => {
      mockOrderService.getOrder.mockResolvedValue(mockReadyOrder);
      const request = { ...validRescheduleRequest, orderId: 'order-ready-789' };

      const result = await PickupReschedulingService.reschedulePickup(request);

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
    });

    it('should reject rescheduling for missing required fields', async () => {
      const invalidRequest = {
        orderId: '',
        newPickupDate: '2024-03-25',
        newPickupTime: '16:00',
        requestedBy: 'customer' as const
      };

      const result = await PickupReschedulingService.reschedulePickup(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing required fields');
      expect(result.error).toContain('Missing required fields');
    });

    it('should reject rescheduling for invalid date format', async () => {
      const invalidRequest = {
        ...validRescheduleRequest,
        newPickupDate: 'invalid-date'
      };

      const result = await PickupReschedulingService.reschedulePickup(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid date or time format');
      expect(result.error).toBe('Invalid date or time format');
    });

    it('should reject rescheduling for past dates', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const invalidRequest = {
        ...validRescheduleRequest,
        newPickupDate: pastDate.toISOString().split('T')[0],
        newPickupTime: '10:00'
      };

      const result = await PickupReschedulingService.reschedulePickup(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.message).toContain('New pickup time must be in the future');
    });

    it('should reject rescheduling for non-existent orders', async () => {
      mockOrderService.getOrder.mockResolvedValue(null);

      const result = await PickupReschedulingService.reschedulePickup(validRescheduleRequest);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Reschedule validation failed: Order not found');
      expect(result.error).toBe('Order not found');
    });

    it('should reject rescheduling for completed orders', async () => {
      const completedOrder = { ...mockOrder, status: 'completed' };
      mockOrderService.getOrder.mockResolvedValue(completedOrder);

      const result = await PickupReschedulingService.reschedulePickup(validRescheduleRequest);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Order status \'completed\' cannot be rescheduled');
      expect(result.error).toContain('Only orders that are confirmed, preparing, or ready for pickup can be rescheduled');
    });

    it('should reject rescheduling for delivery orders', async () => {
      mockOrderService.getOrder.mockResolvedValue(mockDeliveryOrder);
      mockGetOrderFulfillmentType.mockReturnValue('delivery');

      const request = { ...validRescheduleRequest, orderId: 'order-delivery-456' };
      const result = await PickupReschedulingService.reschedulePickup(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Only pickup orders can be rescheduled');
      expect(result.error).toBe('Only pickup orders can be rescheduled');
    });

    it('should handle database errors during update', async () => {
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Database update failed' }
      });

      const result = await PickupReschedulingService.reschedulePickup(validRescheduleRequest);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to update pickup time');
      expect(result.error).toContain('Database error: Database update failed');
    });

    it('should handle notification failures gracefully', async () => {
      mockNotificationService.sendNotification.mockRejectedValue(new Error('Notification service down'));

      const result = await PickupReschedulingService.reschedulePickup(validRescheduleRequest);

      expect(result.success).toBe(true); // Should still succeed
      expect(result.notificationSent).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to send reschedule notification:',
        expect.any(Error)
      );
    });

    it('should skip notifications when customerNotification is false', async () => {
      const requestWithoutNotification = {
        ...validRescheduleRequest,
        customerNotification: false
      };

      const result = await PickupReschedulingService.reschedulePickup(requestWithoutNotification);

      expect(result.success).toBe(true);
      expect(result.notificationSent).toBe(false);
      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
    });

    it('should handle broadcast failures gracefully', async () => {
      mockSendOrderBroadcast.mockRejectedValue(new Error('Broadcast service down'));

      const result = await PickupReschedulingService.reschedulePickup(validRescheduleRequest);

      expect(result.success).toBe(true); // Should still succeed
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to broadcast reschedule:',
        expect.any(Error)
      );
    });

    it('should log reschedule events for audit trail', async () => {
      await PickupReschedulingService.reschedulePickup(validRescheduleRequest);

      expect(mockSupabase.from).toHaveBeenCalledWith('pickup_reschedule_log');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          order_id: 'order-123456',
          customer_email: 'john.doe@example.com',
          customer_name: 'John Doe',
          previous_pickup_date: '2024-03-20',
          previous_pickup_time: '14:00',
          new_pickup_date: futureDateString,
          new_pickup_time: '16:00',
          requested_by: 'customer',
          requested_by_user_id: 'user-789',
          reason: 'Customer request'
        })
      );
    });

    it('should handle logging errors gracefully', async () => {
      mockSupabase.from().insert.mockResolvedValue({
        error: { message: 'Logging failed' }
      });

      const result = await PickupReschedulingService.reschedulePickup(validRescheduleRequest);

      expect(result.success).toBe(true); // Should still succeed
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to log reschedule event:',
        expect.objectContaining({ message: 'Logging failed' })
      );
    });

    it('should handle unexpected errors', async () => {
      mockOrderService.getOrder.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      const result = await PickupReschedulingService.reschedulePickup(validRescheduleRequest);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Reschedule validation failed: Validation failed due to system error');
      expect(result.error).toBe('Validation failed due to system error');
      expect(console.error).toHaveBeenCalledWith(
        'Error validating reschedule request:',
        expect.any(Error)
      );
    });
  });

  describe('wasRecentlyRescheduled', () => {
    it('should return false when no recent reschedules found', async () => {
      const result = await PickupReschedulingService.wasRecentlyRescheduled('order-123456');

      expect(result.wasRescheduled).toBe(false);
      expect(result.lastRescheduleTime).toBeUndefined();
      expect(mockSupabase.from).toHaveBeenCalledWith('pickup_reschedule_log');
    });

    it('should return true when recent reschedule found', async () => {
      const recentTime = new Date().toISOString();
      mockSupabase.from().select().eq().gte().order().limit().single.mockResolvedValue({
        data: { created_at: recentTime },
        error: null
      });

      const result = await PickupReschedulingService.wasRecentlyRescheduled('order-123456');

      expect(result.wasRescheduled).toBe(true);
      expect(result.lastRescheduleTime).toBe(recentTime);
    });

    it('should use custom time window for reschedule check', async () => {
      const customMinutes = 30;
      await PickupReschedulingService.wasRecentlyRescheduled('order-123456', customMinutes);

      const expectedCutoff = new Date();
      expectedCutoff.setMinutes(expectedCutoff.getMinutes() - customMinutes);

      expect(mockSupabase.from().select().eq().gte).toHaveBeenCalledWith(
        'created_at',
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
      );
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.from().select().eq().gte().order().limit().single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed', code: 'DB_ERROR' }
      });

      const result = await PickupReschedulingService.wasRecentlyRescheduled('order-123456');

      expect(result.wasRescheduled).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Error checking reschedule history:',
        expect.objectContaining({ message: 'Database connection failed' })
      );
    });

    it('should handle network errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Network timeout');
      });

      const result = await PickupReschedulingService.wasRecentlyRescheduled('order-123456');

      expect(result.wasRescheduled).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Error checking reschedule history:',
        expect.any(Error)
      );
    });
  });

  describe('Convenience functions', () => {
    it('should export reschedulePickup function', async () => {
      const result = await reschedulePickup(validRescheduleRequest);

      expect(result.success).toBe(true);
      expect(result.newPickupDate).toBe(futureDateString);
      expect(result.newPickupTime).toBe('16:00');
      expect(console.log).toHaveBeenCalledWith(
        '📅 Processing pickup reschedule request for order: order-123456'
      );
    });

    it('should export wasRecentlyRescheduled function', async () => {
      const result = await wasRecentlyRescheduled('order-123456', 30);

      expect(result.wasRescheduled).toBe(false);
    });
  });

  describe('Integration and edge cases', () => {
    it('should handle different requestedBy types', async () => {
      const requests = [
        { ...validRescheduleRequest, requestedBy: 'customer' as const },
        { ...validRescheduleRequest, requestedBy: 'staff' as const },
        { ...validRescheduleRequest, requestedBy: 'admin' as const }
      ];

      for (const request of requests) {
        const result = await PickupReschedulingService.reschedulePickup(request);
        expect(result.success).toBe(true);
      }
    });

    it('should handle orders with missing pickup information', async () => {
      const orderWithoutPickup = {
        ...mockOrder,
        pickup_date: undefined,
        pickup_time: undefined,
        pickupDate: undefined,
        pickupTime: undefined
      };
      mockOrderService.getOrder.mockResolvedValue(orderWithoutPickup);

      const result = await PickupReschedulingService.reschedulePickup(validRescheduleRequest);

      expect(result.success).toBe(true);
      expect(result.previousPickupDate).toBeUndefined();
      expect(result.previousPickupTime).toBeUndefined();
    });

    it('should handle concurrent reschedule requests', async () => {
      const promises = [
        PickupReschedulingService.reschedulePickup(validRescheduleRequest),
        PickupReschedulingService.reschedulePickup({
          ...validRescheduleRequest,
          orderId: 'order-concurrent-1',
          newPickupTime: '17:00'
        }),
        PickupReschedulingService.reschedulePickup({
          ...validRescheduleRequest,
          orderId: 'order-concurrent-2',
          newPickupTime: '18:00'
        })
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results.every(result => result.success)).toBe(true);
    });

    it('should validate time boundaries correctly', async () => {
      // Test exact future boundary
      const futureTime = new Date();
      futureTime.setMinutes(futureTime.getMinutes() + 1);
      
      const borderlineRequest = {
        ...validRescheduleRequest,
        newPickupDate: futureTime.toISOString().split('T')[0],
        newPickupTime: futureTime.toTimeString().substring(0, 5)
      };

      const result = await PickupReschedulingService.reschedulePickup(borderlineRequest);

      expect(result.success).toBe(true);
    });

    it('should handle malformed customer information gracefully', async () => {
      const orderWithMissingInfo = {
        ...mockOrder,
        customer_name: '',
        customer_email: null,
        customerInfo: undefined
      };
      mockOrderService.getOrder.mockResolvedValue(orderWithMissingInfo);
      mockGetOrderCustomerInfo.mockReturnValue({
        name: '',
        email: '',
        phone: ''
      });

      const result = await PickupReschedulingService.reschedulePickup(validRescheduleRequest);

      expect(result.success).toBe(true);
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_name: '',
          customer_email: ''
        })
      );
    });

    it('should handle very long order IDs and reasons', async () => {
      const longRequest = {
        ...validRescheduleRequest,
        orderId: 'very-long-order-id-' + 'x'.repeat(100),
        reason: 'Very long reason: ' + 'explanation '.repeat(50)
      };

      const result = await PickupReschedulingService.reschedulePickup(longRequest);

      expect(result.success).toBe(true);
    });

    it('should broadcast correct data structure', async () => {
      await PickupReschedulingService.reschedulePickup(validRescheduleRequest);

      expect(mockSendOrderBroadcast).toHaveBeenCalledWith('pickup-rescheduled', {
        userId: 'user-789',
        orderId: 'order-123456',
        newPickupDate: futureDateString,
        newPickupTime: '16:00',
        timestamp: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
        action: 'pickup_rescheduled'
      });
    });

    it('should send notifications with correct parameters', async () => {
      await PickupReschedulingService.reschedulePickup(validRescheduleRequest);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith({
        userId: 'user-789',
        customerEmail: 'john.doe@example.com',
        customerPhone: '+1234567890',
        customerName: 'John Doe',
        type: 'pickup_rescheduled',
        channels: ['push', 'sms'],
        order: expect.objectContaining({
          id: 'order-123456'
        })
      });
    });
  });
});