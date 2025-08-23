/**
 * NotificationService Test - REFACTORED
 * Testing notification functionality with simplified mocks and factories
 */

import { 
  NotificationService,
  sendPickupReadyNotification,
  sendOrderConfirmationNotification 
} from '../notificationService';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { createOrder, createUser, resetAllFactories } from '../../test/factories';

// Replace complex mock setup with simple data-driven mock
jest.mock('../../config/supabase', () => ({
  supabase: null // Will be set in beforeEach
}));

describe('NotificationService', () => {
  let supabaseMock: any;
  let testOrder: any;
  let testUser: any;
  let consoleSpy: { log: jest.SpyInstance; warn: jest.SpyInstance; error: jest.SpyInstance; };
  
  beforeEach(() => {
    // Reset factory counter for consistent IDs
    resetAllFactories();
    
    // Create test data using factories
    testUser = createUser({
      id: 'user-789',
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890'
    });
    
    testOrder = createOrder({
      id: 'order-123456',
      user_id: 'user-789',
      customer_name: 'John Doe',
      customer_email: 'john.doe@example.com',
      customer_phone: '+1234567890',
      status: 'ready',
      fulfillment_type: 'pickup',
      payment_method: 'cash_on_pickup',
      payment_status: 'pending',
      total_amount: 45.67,
      pickup_date: '2024-03-20',
      pickup_time: '14:00'
    });
    
    // Create mock with initial data
    supabaseMock = createSupabaseMock({
      orders: [testOrder],
      users: [testUser],
      notification_logs: []
    });
    
    // Inject mock
    require('../../config/supabase').supabase = supabaseMock;
    
    // Setup console spies
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('sendPickupReadyNotification', () => {
    it('should send pickup ready notification via push and SMS', async () => {
      const result = await NotificationService.sendPickupReadyNotification(testOrder);

      expect(result.success).toBe(true);
      expect(result.sentChannels).toEqual(['push', 'sms']);
      expect(result.failedChannels).toEqual([]);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '📱 Sending pickup ready notification for order:', 'order-123456'
      );
    });

    it('should include cash payment reminder for cash orders', async () => {
      const result = await NotificationService.sendPickupReadyNotification(testOrder);

      expect(result.success).toBe(true);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '📱 Push notification sent:',
        expect.objectContaining({
          title: '🎉 Your order is ready for pickup!',
          body: expect.stringContaining('Please bring cash for payment')
        })
      );
    });

    it('should not include cash reminder for online payment orders', async () => {
      const onlinePaymentOrder = createOrder({
        ...testOrder,
        id: 'order-789012',
        payment_method: 'stripe',
        payment_status: 'paid'
      });

      const result = await NotificationService.sendPickupReadyNotification(onlinePaymentOrder);

      expect(result.success).toBe(true);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '📱 Push notification sent:',
        expect.objectContaining({
          body: expect.not.stringContaining('Please bring cash for payment')
        })
      );
    });

    it('should handle errors gracefully', async () => {
      // Mock error during notification sending
      consoleSpy.log.mockImplementation(() => {
        throw new Error('Notification service unavailable');
      });

      const result = await NotificationService.sendPickupReadyNotification(testOrder);

      expect(result.success).toBe(false);
      expect(result.sentChannels).toEqual([]);
      expect(result.failedChannels).toEqual(['push', 'sms']);
      expect(result.error).toContain('Failed to send pickup notification');
    });

    it('should handle missing customer data gracefully', async () => {
      const orderWithMissingData = createOrder({
        ...testOrder,
        customer_name: '',
        customer_email: '',
        customer_phone: ''
      });

      const result = await NotificationService.sendPickupReadyNotification(orderWithMissingData);

      expect(result.success).toBe(true);
      expect(result.sentChannels).toEqual(['push', 'sms']);
    });
  });

  describe('sendOrderConfirmationNotification', () => {
    it('should send order confirmation via push and email', async () => {
      const result = await NotificationService.sendOrderConfirmationNotification(testOrder);

      expect(result.success).toBe(true);
      expect(result.sentChannels).toEqual(['push', 'email']);
      expect(result.failedChannels).toEqual([]);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '📧 Sending order confirmation notification for order:', 'order-123456'
      );
    });

    it('should include pickup date in confirmation message', async () => {
      const result = await NotificationService.sendOrderConfirmationNotification(testOrder);

      expect(result.success).toBe(true);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '📧 Email notification sent:',
        expect.objectContaining({
          body: expect.stringContaining('Pickup date: 2024-03-20')
        })
      );
    });

    it('should handle errors gracefully', async () => {
      consoleSpy.log.mockImplementation(() => {
        throw new Error('Email service unavailable');
      });

      const result = await NotificationService.sendOrderConfirmationNotification(testOrder);

      expect(result.success).toBe(false);
      expect(result.sentChannels).toEqual([]);
      expect(result.failedChannels).toEqual(['push', 'email']);
      expect(result.error).toContain('Failed to send confirmation notification');
    });

    it('should validate order data before sending', async () => {
      const invalidOrder = createOrder({
        ...testOrder,
        id: '', // Invalid ID
        customer_email: 'invalid-email' // Invalid email
      });

      const result = await NotificationService.sendOrderConfirmationNotification(invalidOrder);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid order data');
    });
  });

  describe('sendNotification', () => {
    const mockNotification = {
      title: 'Test Notification',
      body: 'This is a test notification',
      data: { orderId: 'order-123456' }
    };

    it('should send notifications via all requested channels', async () => {
      const result = await NotificationService.sendNotification(
        testUser.id,
        mockNotification,
        ['push', 'email']
      );

      expect(result.success).toBe(true);
      expect(result.sentChannels).toEqual(['push', 'email']);
      expect(result.failedChannels).toEqual([]);
    });

    it('should handle partial failures gracefully', async () => {
      // Mock partial failure by making email fail
      let callCount = 0;
      consoleSpy.log.mockImplementation(() => {
        callCount++;
        if (callCount > 2) { // Fail on email notification
          throw new Error('Email service unavailable');
        }
      });

      const result = await NotificationService.sendNotification(
        testUser.id,
        mockNotification,
        ['push', 'email']
      );

      expect(result.success).toBe(true); // Partial success
      expect(result.sentChannels).toEqual(['push']);
      expect(result.failedChannels).toEqual(['email']);
    });

    it('should log notification attempts to database', async () => {
      await NotificationService.sendNotification(
        testUser.id,
        mockNotification,
        ['push']
      );

      // Check that logging data was stored
      const logs = supabaseMock.getTableData('notification_logs');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        user_id: testUser.id,
        type: 'push',
        status: 'sent'
      });
    });

    it('should handle database logging errors gracefully', async () => {
      supabaseMock.queueError(new Error('Database connection failed'));

      const result = await NotificationService.sendNotification(
        testUser.id,
        mockNotification,
        ['push']
      );

      // Should still succeed even if logging fails
      expect(result.success).toBe(true);
      expect(result.sentChannels).toEqual(['push']);
    });
  });

  describe('Template generation', () => {
    it('should generate correct template for order ready notification', async () => {
      const template = NotificationService.generateTemplate('order_ready', testOrder);

      expect(template.title).toBe('🎉 Your order is ready for pickup!');
      expect(template.body).toContain('Order #order-123456');
      expect(template.body).toContain('Please bring cash for payment');
    });

    it('should generate correct template for order confirmation', async () => {
      const template = NotificationService.generateTemplate('order_confirmation', testOrder);

      expect(template.title).toBe('✅ Order confirmed!');
      expect(template.body).toContain('Order #order-123456');
      expect(template.body).toContain('Pickup date: 2024-03-20');
    });

    it('should generate correct template for payment reminder', async () => {
      const template = NotificationService.generateTemplate('payment_reminder', testOrder);

      expect(template.title).toBe('💳 Payment reminder');
      expect(template.body).toContain('Order #order-123456');
      expect(template.body).toContain('$45.67');
    });

    it('should handle unknown template types', async () => {
      const template = NotificationService.generateTemplate('unknown_type', testOrder);

      expect(template.title).toBe('Notification');
      expect(template.body).toContain('You have an update');
    });

    it('should handle missing order data in templates', async () => {
      const incompleteOrder = createOrder({
        id: 'incomplete-order',
        total_amount: null,
        pickup_date: null
      });

      const template = NotificationService.generateTemplate('order_ready', incompleteOrder);

      expect(template.title).toBeDefined();
      expect(template.body).toBeDefined();
      // Should handle gracefully without throwing
    });
  });

  describe('Channel-specific functionality', () => {
    it('should format push notifications correctly', async () => {
      const result = await NotificationService.sendPushNotification(testUser.id, {
        title: 'Test Push',
        body: 'Test message'
      });

      expect(result).toBe(true);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '📱 Push notification sent:',
        expect.objectContaining({
          title: 'Test Push',
          body: 'Test message'
        })
      );
    });

    it('should format SMS messages correctly', async () => {
      const result = await NotificationService.sendSMSNotification(testUser.phone, 'Test SMS');

      expect(result).toBe(true);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '📱 SMS sent to +1234567890:', 'Test SMS'
      );
    });

    it('should format email notifications correctly', async () => {
      const result = await NotificationService.sendEmailNotification(
        testUser.email,
        'Test Subject',
        'Test body content'
      );

      expect(result).toBe(true);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '📧 Email notification sent:',
        expect.objectContaining({
          to: 'john.doe@example.com',
          subject: 'Test Subject',
          body: 'Test body content'
        })
      );
    });

    it('should handle invalid recipient data', async () => {
      const result = await NotificationService.sendEmailNotification('', 'Test', 'Test');

      expect(result).toBe(false);
    });
  });
});