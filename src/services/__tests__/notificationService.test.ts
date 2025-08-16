/**
 * NotificationService Test
 * Comprehensive testing for notification functionality including
 * pickup alerts, order confirmations, multi-channel delivery,
 * template generation, error handling, and audit logging
 */

import { 
  NotificationService,
  sendPickupReadyNotification,
  sendOrderConfirmationNotification 
} from '../notificationService';
import { Order } from '../../types';

// Mock the supabase module
const mockSupabase = require('../../config/supabase').supabase;

describe('NotificationService', () => {
  // Test data
  const mockOrder: Order = {
    id: 'order-123456',
    customerId: 'user-789',
    customer_name: 'John Doe',
    customer_email: 'john.doe@example.com',
    customer_phone: '+1234567890',
    status: 'ready',
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

  const mockOnlinePaymentOrder: Order = {
    ...mockOrder,
    id: 'order-789012',
    payment_method: 'stripe',
    paymentMethod: 'stripe',
    payment_status: 'paid'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default Supabase mocks
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null })
    });

    // Console spies
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('sendPickupReadyNotification', () => {
    it('should send pickup ready notification via push and SMS', async () => {
      const result = await NotificationService.sendPickupReadyNotification(mockOrder);

      expect(result.success).toBe(true);
      expect(result.sentChannels).toEqual(['push', 'sms']);
      expect(result.failedChannels).toEqual([]);
      expect(console.log).toHaveBeenCalledWith(
        '📱 Sending pickup ready notification for order:', 'order-123456'
      );
    });

    it('should include cash payment reminder for cash orders', async () => {
      const result = await NotificationService.sendPickupReadyNotification(mockOrder);

      expect(result.success).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        '📱 Push notification sent:',
        expect.objectContaining({
          title: '🎉 Your order is ready for pickup!',
          body: expect.stringContaining('Please bring cash for payment')
        })
      );
    });

    it('should not include cash reminder for online payment orders', async () => {
      const result = await NotificationService.sendPickupReadyNotification(mockOnlinePaymentOrder);

      expect(result.success).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        '📱 Push notification sent:',
        expect.objectContaining({
          body: expect.not.stringContaining('Please bring cash for payment')
        })
      );
    });

    it('should handle errors gracefully', async () => {
      // Mock console.error to throw an error during notification sending
      const originalLog = console.log;
      console.log = jest.fn().mockImplementation(() => {
        throw new Error('Notification service unavailable');
      });

      const result = await NotificationService.sendPickupReadyNotification(mockOrder);

      expect(result.success).toBe(false);
      expect(result.sentChannels).toEqual([]);
      expect(result.failedChannels).toEqual(['push', 'sms']);
      expect(result.error).toContain('Failed to send pickup notification');

      console.log = originalLog;
    });

    it('should handle missing customer data gracefully', async () => {
      const orderWithMissingData = {
        ...mockOrder,
        customer_name: '',
        customer_email: '',
        customer_phone: ''
      };

      const result = await NotificationService.sendPickupReadyNotification(orderWithMissingData);

      expect(result.success).toBe(true);
      expect(result.sentChannels).toEqual(['push', 'sms']);
    });
  });

  describe('sendOrderConfirmationNotification', () => {
    it('should send order confirmation via push and email', async () => {
      const result = await NotificationService.sendOrderConfirmationNotification(mockOrder);

      expect(result.success).toBe(true);
      expect(result.sentChannels).toEqual(['push', 'email']);
      expect(result.failedChannels).toEqual([]);
      expect(console.log).toHaveBeenCalledWith(
        '📧 Sending order confirmation notification for order:', 'order-123456'
      );
    });

    it('should include pickup date in confirmation message', async () => {
      const result = await NotificationService.sendOrderConfirmationNotification(mockOrder);

      expect(result.success).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        '📧 Email notification sent:',
        expect.objectContaining({
          body: expect.stringContaining('Pickup date: 2024-03-20')
        })
      );
    });

    it('should prefer customerInfo data over direct fields', async () => {
      const orderWithCustomerInfo = {
        ...mockOrder,
        customer_email: 'old@example.com',
        customerInfo: {
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          phone: '+0987654321'
        }
      };

      const result = await NotificationService.sendOrderConfirmationNotification(orderWithCustomerInfo);

      expect(result.success).toBe(true);
      // Should use customerInfo.email, not customer_email
      expect(console.log).toHaveBeenCalledWith(
        '📧 Email notification sent:',
        expect.objectContaining({
          to: 'jane.smith@example.com'
        })
      );
    });

    it('should handle errors gracefully', async () => {
      // Mock an error in the notification process
      const originalLog = console.log;
      console.log = jest.fn().mockImplementation(() => {
        throw new Error('Email service down');
      });

      const result = await NotificationService.sendOrderConfirmationNotification(mockOrder);

      expect(result.success).toBe(false);
      expect(result.sentChannels).toEqual([]);
      expect(result.failedChannels).toEqual(['push', 'email']);
      expect(result.error).toContain('Failed to send confirmation notification');

      console.log = originalLog;
    });
  });

  describe('sendNotification', () => {
    const mockNotificationRequest = {
      userId: 'user-789',
      customerEmail: 'john.doe@example.com',
      customerPhone: '+1234567890',
      customerName: 'John Doe',
      type: 'order_ready' as const,
      channels: ['push', 'sms', 'email'] as const,
      order: mockOrder
    };

    it('should send notifications via all requested channels', async () => {
      const result = await NotificationService.sendNotification(mockNotificationRequest);

      expect(result.success).toBe(true);
      expect(result.sentChannels).toEqual(['push', 'sms', 'email']);
      expect(result.failedChannels).toEqual([]);
      expect(result.message).toBe('Notification sent via: push, sms, email');
    });

    it('should handle partial failures gracefully', async () => {
      // Mock SMS to fail
      const originalLog = console.log;
      console.log = jest.fn().mockImplementation((message, data) => {
        if (message === '📱 SMS notification sent:') {
          throw new Error('SMS service unavailable');
        }
      });

      const result = await NotificationService.sendNotification(mockNotificationRequest);

      expect(result.success).toBe(true); // Still successful because other channels worked
      expect(result.sentChannels).toEqual(['push', 'email']);
      expect(result.failedChannels).toEqual(['sms']);
      expect(result.message).toBe('Notification sent via: push, email');

      console.log = originalLog;
    });

    it('should fail when all channels fail', async () => {
      // Mock all channels to fail
      const originalLog = console.log;
      console.log = jest.fn().mockImplementation(() => {
        throw new Error('All services down');
      });

      const result = await NotificationService.sendNotification(mockNotificationRequest);

      expect(result.success).toBe(false);
      expect(result.sentChannels).toEqual([]);
      expect(result.failedChannels).toEqual(['push', 'sms', 'email']);
      expect(result.message).toBe('Failed to send notification via any channel');

      console.log = originalLog;
    });

    it('should log notification attempts to database', async () => {
      await NotificationService.sendNotification(mockNotificationRequest);

      expect(mockSupabase.from).toHaveBeenCalledWith('notification_logs');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          order_id: 'order-123456',
          customer_email: 'john.doe@example.com',
          notification_type: 'order_ready',
          channels_attempted: ['push', 'sms', 'email'],
          channels_sent: ['push', 'sms', 'email'],
          channels_failed: [],
          template_title: expect.any(String),
          template_body: expect.any(String),
          created_at: expect.any(String)
        })
      );
    });

    it('should handle database logging errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ 
          error: { message: 'Database logging failed' } 
        })
      });

      const result = await NotificationService.sendNotification(mockNotificationRequest);

      expect(result.success).toBe(true); // Notification still succeeds
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to log notification:',
        expect.objectContaining({ message: 'Database logging failed' })
      );
    });
  });

  describe('Channel-specific sending', () => {
    const mockRequest = {
      userId: 'user-789',
      customerEmail: 'john.doe@example.com',
      customerPhone: '+1234567890',
      customerName: 'John Doe',
      type: 'order_ready' as const,
      channels: ['push'] as const,
      order: mockOrder
    };

    describe('Push notifications', () => {
      it('should send push notification with correct data', async () => {
        const result = await NotificationService.sendNotification({
          ...mockRequest,
          channels: ['push']
        });

        expect(result.success).toBe(true);
        expect(console.log).toHaveBeenCalledWith(
          '📱 Push notification sent:',
          expect.objectContaining({
            to: 'user-789',
            title: '🎉 Your order is ready for pickup!',
            body: expect.stringContaining('Your order #123456 is ready'),
            data: expect.objectContaining({
              orderId: 'order-123456',
              total: 45.67
            })
          })
        );
      });
    });

    describe('SMS notifications', () => {
      it('should send SMS notification with formatted message', async () => {
        const result = await NotificationService.sendNotification({
          ...mockRequest,
          channels: ['sms']
        });

        expect(result.success).toBe(true);
        expect(console.log).toHaveBeenCalledWith(
          '📱 SMS notification sent:',
          expect.objectContaining({
            to: '+1234567890',
            message: expect.stringContaining('🎉 Your order is ready for pickup!')
          })
        );
      });
    });

    describe('Email notifications', () => {
      it('should send email notification with subject and body', async () => {
        const result = await NotificationService.sendNotification({
          ...mockRequest,
          channels: ['email']
        });

        expect(result.success).toBe(true);
        expect(console.log).toHaveBeenCalledWith(
          '📧 Email notification sent:',
          expect.objectContaining({
            to: 'john.doe@example.com',
            subject: '🎉 Your order is ready for pickup!',
            body: expect.stringContaining('Your order #123456 is ready')
          })
        );
      });
    });
  });

  describe('Template generation', () => {
    it('should generate correct template for order ready notification', async () => {
      const result = await NotificationService.sendNotification({
        userId: 'user-789',
        customerEmail: 'john@example.com',
        customerPhone: '+1234567890',
        customerName: 'John Doe',
        type: 'order_ready',
        channels: ['push'],
        order: mockOrder
      });

      expect(result.success).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        '📱 Push notification sent:',
        expect.objectContaining({
          title: '🎉 Your order is ready for pickup!',
          body: expect.stringContaining('John Doe'),
          body: expect.stringContaining('#123456'),
          body: expect.stringContaining('My Farm Stand'),
          body: expect.stringContaining('123 Farm Road')
        })
      );
    });

    it('should generate correct template for order confirmation', async () => {
      const result = await NotificationService.sendNotification({
        userId: 'user-789',
        customerEmail: 'john@example.com',
        customerPhone: '+1234567890',
        customerName: 'John Doe',
        type: 'order_confirmed',
        channels: ['push'],
        order: mockOrder
      });

      expect(result.success).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        '📱 Push notification sent:',
        expect.objectContaining({
          title: '✅ Order confirmed!',
          body: expect.stringContaining('Thank you John Doe'),
          body: expect.stringContaining('#123456'),
          body: expect.stringContaining('2024-03-20')
        })
      );
    });

    it('should generate correct template for order cancellation', async () => {
      const orderWithOnlinePayment = {
        ...mockOnlinePaymentOrder,
        paymentMethod: 'online' // Ensure paymentMethod is 'online' to trigger refund message
      };

      const result = await NotificationService.sendNotification({
        userId: 'user-789',
        customerEmail: 'john@example.com',
        customerPhone: '+1234567890',
        customerName: 'John Doe',
        type: 'order_cancelled',
        channels: ['push'],
        order: orderWithOnlinePayment
      });

      expect(result.success).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        '📱 Push notification sent:',
        expect.objectContaining({
          title: '❌ Order cancelled',
          body: expect.stringContaining('#789012'),
          body: expect.stringContaining('refunded within 3-5 business days')
        })
      );
    });

    it('should generate correct template for payment reminder', async () => {
      const result = await NotificationService.sendNotification({
        userId: 'user-789',
        customerEmail: 'john@example.com',
        customerPhone: '+1234567890',
        customerName: 'John Doe',
        type: 'payment_reminder',
        channels: ['push'],
        order: mockOrder
      });

      expect(result.success).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        '📱 Push notification sent:',
        expect.objectContaining({
          title: '💳 Payment reminder',
          body: expect.stringContaining('John Doe'),
          body: expect.stringContaining('$45.67'),
          body: expect.stringContaining('#123456')
        })
      );
    });

    it('should generate default template for unknown notification types', async () => {
      const result = await NotificationService.sendNotification({
        userId: 'user-789',
        customerEmail: 'john@example.com',
        customerPhone: '+1234567890',
        customerName: 'John Doe',
        type: 'unknown_type' as any,
        channels: ['push'],
        order: mockOrder
      });

      expect(result.success).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        '📱 Push notification sent:',
        expect.objectContaining({
          title: 'Farm Stand Notification',
          body: expect.stringContaining('#123456')
        })
      );
    });
  });

  describe('Convenience functions', () => {
    it('should export sendPickupReadyNotification function', async () => {
      const result = await sendPickupReadyNotification(mockOrder);

      expect(result.success).toBe(true);
      expect(result.sentChannels).toEqual(['push', 'sms']);
      expect(result.failedChannels).toEqual([]);
      expect(console.log).toHaveBeenCalledWith(
        '📱 Sending pickup ready notification for order:', 'order-123456'
      );
    });

    it('should export sendOrderConfirmationNotification function', async () => {
      const result = await sendOrderConfirmationNotification(mockOrder);

      expect(result.success).toBe(true);
      expect(result.sentChannels).toEqual(['push', 'email']);
      expect(console.log).toHaveBeenCalledWith(
        '📧 Sending order confirmation notification for order:', 'order-123456'
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle orders with missing IDs', async () => {
      const orderWithoutId = {
        ...mockOrder,
        id: ''
      };

      const result = await NotificationService.sendPickupReadyNotification(orderWithoutId);

      expect(result.success).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        '📱 Push notification sent:',
        expect.objectContaining({
          body: expect.stringContaining('#')
        })
      );
    });

    it('should handle very long order IDs gracefully', async () => {
      const orderWithLongId = {
        ...mockOrder,
        id: 'very-long-order-id-that-exceeds-normal-length-123456789'
      };

      const result = await NotificationService.sendPickupReadyNotification(orderWithLongId);

      expect(result.success).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        '📱 Push notification sent:',
        expect.objectContaining({
          body: expect.stringContaining('#456789') // Last 6 chars from slice(-6)
        })
      );
    });

    it('should handle concurrent notification requests', async () => {
      const promises = [
        NotificationService.sendPickupReadyNotification(mockOrder),
        NotificationService.sendOrderConfirmationNotification(mockOrder),
        NotificationService.sendPickupReadyNotification(mockOnlinePaymentOrder)
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results.every(result => result.success)).toBe(true);
    });

    it('should handle database connection failures during logging', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await NotificationService.sendNotification({
        userId: 'user-789',
        customerEmail: 'john@example.com',
        customerPhone: '+1234567890',
        customerName: 'John Doe',
        type: 'order_ready',
        channels: ['push'],
        order: mockOrder
      });

      expect(result.success).toBe(true); // Notification still succeeds
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to log notification:',
        expect.any(Error)
      );
    });

    it('should handle null/undefined order data gracefully', async () => {
      const malformedOrder = {
        ...mockOrder,
        customer_name: null,
        total: undefined,
        total_amount: null
      } as any;

      const result = await NotificationService.sendPickupReadyNotification(malformedOrder);

      expect(result.success).toBe(true);
      // Should not crash and should handle missing data
    });
  });
});