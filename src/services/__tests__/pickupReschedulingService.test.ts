/**
 * PickupReschedulingService Test - REFACTORED
 * Testing pickup rescheduling functionality with simplified mocks and factories
 */

import { PickupReschedulingService } from '../pickupReschedulingService';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { createOrder, createUser, resetAllFactories } from '../../test/factories';

// Replace complex mock setup with simple data-driven mock
jest.mock('../../config/supabase', () => ({
  supabase: null // Will be set in beforeEach
}));

// Mock orderService functions
jest.mock('../orderService', () => ({
  getOrder: jest.fn(),
  updateOrder: jest.fn()
}));

describe('PickupReschedulingService', () => {
  let supabaseMock: any;
  let testOrder: any;
  let testUser: any;
  let mockOrderService: any;
  
  beforeEach(() => {
    // Reset factory counter for consistent IDs
    resetAllFactories();
    
    // Create test data using factories
    testUser = createUser({
      id: 'user-123',
      email: 'test@example.com',
      phone: '+1234567890'
    });
    
    testOrder = createOrder({
      id: 'order-456',
      user_id: 'user-123',
      status: 'ready',
      fulfillment_type: 'pickup',
      pickup_date: '2024-03-20',
      pickup_time: '14:00',
      total_amount: 42.50,
      customer_name: 'Test User',
      customer_email: 'test@example.com',
      customer_phone: '+1234567890'
    });
    
    // Create mock with initial data
    supabaseMock = createSupabaseMock({
      orders: [testOrder],
      users: [testUser],
      pickup_reschedule_logs: []
    });
    
    // Set up order service mock
    mockOrderService = require('../orderService');
    mockOrderService.getOrder.mockResolvedValue({
      success: true,
      order: testOrder
    });
    mockOrderService.updateOrder.mockResolvedValue({
      success: true,
      order: { ...testOrder, pickup_date: '2024-03-21', pickup_time: '15:00' }
    });
    
    // Inject mock
    require('../../config/supabase').supabase = supabaseMock;
  });

  describe('reschedulePickup', () => {
    it('should successfully reschedule pickup time', async () => {
      const newDate = '2024-03-21';
      const newTime = '15:00';

      const result = await PickupReschedulingService.reschedulePickup(
        'order-456',
        newDate,
        newTime
      );

      expect(result.success).toBe(true);
      expect(result.newPickupDate).toBe(newDate);
      expect(result.newPickupTime).toBe(newTime);
      expect(result.notificationSent).toBe(true);
    });

    it('should validate new pickup time is in the future', async () => {
      const pastDate = '2024-03-15'; // Past date
      const pastTime = '10:00';

      const result = await PickupReschedulingService.reschedulePickup(
        'order-456',
        pastDate,
        pastTime
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot reschedule to a past date/time');
    });

    it('should validate pickup time is within allowed hours', async () => {
      const futureDate = '2024-03-25';
      const earlyTime = '06:00'; // Too early

      const result = await PickupReschedulingService.reschedulePickup(
        'order-456',
        futureDate,
        earlyTime
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Pickup time outside allowed hours');
    });

    it('should prevent rescheduling beyond maximum advance days', async () => {
      const farFutureDate = new Date();
      farFutureDate.setDate(farFutureDate.getDate() + 15); // 15 days ahead
      
      const result = await PickupReschedulingService.reschedulePickup(
        'order-456',
        farFutureDate.toISOString().split('T')[0],
        '14:00'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot reschedule more than');
    });

    it('should handle invalid order ID', async () => {
      mockOrderService.getOrder.mockResolvedValueOnce({
        success: false,
        error: 'Order not found'
      });

      const result = await PickupReschedulingService.reschedulePickup(
        'invalid-order',
        '2024-03-21',
        '15:00'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Order not found');
    });

    it('should prevent rescheduling completed orders', async () => {
      const completedOrder = createOrder({
        ...testOrder,
        status: 'completed'
      });
      
      mockOrderService.getOrder.mockResolvedValueOnce({
        success: true,
        order: completedOrder
      });

      const result = await PickupReschedulingService.reschedulePickup(
        'order-456',
        '2024-03-21',
        '15:00'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Order cannot be rescheduled');
    });
  });

  describe('validateRescheduleRequest', () => {
    it('should validate all reschedule parameters', async () => {
      const result = await PickupReschedulingService.validateRescheduleRequest(
        testOrder,
        '2024-03-21',
        '15:00'
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return validation errors for invalid parameters', async () => {
      const result = await PickupReschedulingService.validateRescheduleRequest(
        testOrder,
        '2024-03-15', // Past date
        '06:00' // Early time
      );

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('past date');
    });

    it('should check for duplicate reschedule attempts', async () => {
      // Add reschedule log for same date/time
      const existingLog = {
        order_id: 'order-456',
        new_pickup_date: '2024-03-21',
        new_pickup_time: '15:00',
        created_at: new Date().toISOString()
      };
      
      supabaseMock.setTableData('pickup_reschedule_logs', [existingLog]);

      const result = await PickupReschedulingService.validateRescheduleRequest(
        testOrder,
        '2024-03-21',
        '15:00'
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('already rescheduled to this time');
    });
  });

  describe('getAvailableTimeSlots', () => {
    it('should return available time slots for a date', async () => {
      const result = await PickupReschedulingService.getAvailableTimeSlots('2024-03-21');

      expect(result.success).toBe(true);
      expect(result.timeSlots).toBeDefined();
      expect(result.timeSlots.length).toBeGreaterThan(0);
      expect(result.timeSlots[0]).toMatchObject({
        time: expect.any(String),
        available: expect.any(Boolean)
      });
    });

    it('should mark unavailable slots based on existing orders', async () => {
      // Add order for specific time slot
      const conflictingOrder = createOrder({
        id: 'order-conflict',
        pickup_date: '2024-03-21',
        pickup_time: '15:00',
        status: 'ready'
      });
      
      supabaseMock.setTableData('orders', [testOrder, conflictingOrder]);

      const result = await PickupReschedulingService.getAvailableTimeSlots('2024-03-21');

      expect(result.success).toBe(true);
      const slot15 = result.timeSlots.find(slot => slot.time === '15:00');
      expect(slot15?.available).toBe(false);
    });

    it('should handle invalid dates', async () => {
      const result = await PickupReschedulingService.getAvailableTimeSlots('invalid-date');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid date format');
    });
  });

  describe('sendRescheduleNotification', () => {
    it('should send notification about reschedule', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await PickupReschedulingService.sendRescheduleNotification(
        testOrder,
        '2024-03-21',
        '15:00'
      );

      expect(result.success).toBe(true);
      expect(result.channels).toContain('email');
      expect(result.channels).toContain('sms');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending reschedule notification for order:',
        'order-456'
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing customer contact info', async () => {
      const orderWithoutContact = createOrder({
        ...testOrder,
        customer_email: '',
        customer_phone: ''
      });

      const result = await PickupReschedulingService.sendRescheduleNotification(
        orderWithoutContact,
        '2024-03-21',
        '15:00'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No contact information available');
    });

    it('should handle notification service errors', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {
        throw new Error('Notification service unavailable');
      });

      const result = await PickupReschedulingService.sendRescheduleNotification(
        testOrder,
        '2024-03-21',
        '15:00'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send notification');

      consoleSpy.mockRestore();
    });
  });

  describe('logRescheduleAttempt', () => {
    it('should log reschedule attempt', async () => {
      await PickupReschedulingService.logRescheduleAttempt(
        'order-456',
        'user-123',
        '2024-03-20',
        '14:00',
        '2024-03-21',
        '15:00',
        'success'
      );

      const logs = supabaseMock.getTableData('pickup_reschedule_logs');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        order_id: 'order-456',
        user_id: 'user-123',
        original_pickup_date: '2024-03-20',
        original_pickup_time: '14:00',
        new_pickup_date: '2024-03-21',
        new_pickup_time: '15:00',
        status: 'success'
      });
    });

    it('should log failed reschedule attempts', async () => {
      await PickupReschedulingService.logRescheduleAttempt(
        'order-456',
        'user-123',
        '2024-03-20',
        '14:00',
        '2024-03-21',
        '15:00',
        'failed',
        'Validation error'
      );

      const logs = supabaseMock.getTableData('pickup_reschedule_logs');
      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe('failed');
      expect(logs[0].error_message).toBe('Validation error');
    });

    it('should handle logging errors gracefully', async () => {
      supabaseMock.queueError(new Error('Database logging failed'));

      // Should not throw even if logging fails
      await expect(
        PickupReschedulingService.logRescheduleAttempt(
          'order-456',
          'user-123',
          '2024-03-20',
          '14:00',
          '2024-03-21',
          '15:00',
          'success'
        )
      ).resolves.not.toThrow();
    });
  });

  describe('getRescheduleHistory', () => {
    it('should return reschedule history for an order', async () => {
      const rescheduleLog = {
        order_id: 'order-456',
        user_id: 'user-123',
        original_pickup_date: '2024-03-20',
        original_pickup_time: '14:00',
        new_pickup_date: '2024-03-21',
        new_pickup_time: '15:00',
        status: 'success',
        created_at: new Date().toISOString()
      };
      
      supabaseMock.setTableData('pickup_reschedule_logs', [rescheduleLog]);

      const result = await PickupReschedulingService.getRescheduleHistory('order-456');

      expect(result.success).toBe(true);
      expect(result.history).toHaveLength(1);
      expect(result.history[0]).toMatchObject({
        originalDate: '2024-03-20',
        originalTime: '14:00',
        newDate: '2024-03-21',
        newTime: '15:00',
        status: 'success'
      });
    });

    it('should return empty history for orders with no reschedules', async () => {
      const result = await PickupReschedulingService.getRescheduleHistory('order-new');

      expect(result.success).toBe(true);
      expect(result.history).toEqual([]);
    });

    it('should handle database errors', async () => {
      supabaseMock.queueError(new Error('Database query failed'));

      const result = await PickupReschedulingService.getRescheduleHistory('order-456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch reschedule history');
    });
  });

  describe('Batch Operations', () => {
    it('should handle bulk reschedule validation', async () => {
      const requests = [
        { orderId: 'order-456', newDate: '2024-03-21', newTime: '15:00' },
        { orderId: 'order-789', newDate: '2024-03-22', newTime: '16:00' }
      ];

      const results = await PickupReschedulingService.validateBulkReschedule(requests);

      expect(results).toHaveLength(2);
      expect(results[0].orderId).toBe('order-456');
      expect(results[0].valid).toBe(true);
    });

    it('should identify conflicts in bulk operations', async () => {
      // Multiple orders trying to reschedule to same slot
      const requests = [
        { orderId: 'order-456', newDate: '2024-03-21', newTime: '15:00' },
        { orderId: 'order-789', newDate: '2024-03-21', newTime: '15:00' }
      ];

      const results = await PickupReschedulingService.validateBulkReschedule(requests);

      expect(results.some(r => !r.valid)).toBe(true);
      const conflictingResult = results.find(r => !r.valid);
      expect(conflictingResult?.errors[0]).toContain('time slot conflict');
    });
  });

  describe('Configuration and Limits', () => {
    it('should respect daily reschedule limits', async () => {
      // Create multiple reschedule logs for today
      const today = new Date().toISOString();
      const multipleLogs = Array.from({ length: 3 }, (_, i) => ({
        order_id: 'order-456',
        created_at: today,
        status: 'success'
      }));
      
      supabaseMock.setTableData('pickup_reschedule_logs', multipleLogs);

      const result = await PickupReschedulingService.reschedulePickup(
        'order-456',
        '2024-03-25',
        '15:00'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Daily reschedule limit exceeded');
    });

    it('should use custom configuration when provided', async () => {
      const customConfig = {
        maxAdvanceDays: 5,
        allowedHours: { start: '10:00', end: '18:00' },
        dailyLimit: 1
      };

      const result = await PickupReschedulingService.reschedulePickup(
        'order-456',
        '2024-03-21',
        '15:00',
        customConfig
      );

      expect(result.success).toBe(true);
      expect(result.config).toMatchObject(customConfig);
    });
  });

  describe('Integration with OrderService', () => {
    it('should update order via OrderService', async () => {
      await PickupReschedulingService.reschedulePickup(
        'order-456',
        '2024-03-21',
        '15:00'
      );

      expect(mockOrderService.updateOrder).toHaveBeenCalledWith(
        'order-456',
        expect.objectContaining({
          pickup_date: '2024-03-21',
          pickup_time: '15:00',
          last_rescheduled_at: expect.any(String)
        })
      );
    });

    it('should handle OrderService update failures', async () => {
      mockOrderService.updateOrder.mockResolvedValueOnce({
        success: false,
        error: 'Update failed'
      });

      const result = await PickupReschedulingService.reschedulePickup(
        'order-456',
        '2024-03-21',
        '15:00'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to update order');
    });
  });
});