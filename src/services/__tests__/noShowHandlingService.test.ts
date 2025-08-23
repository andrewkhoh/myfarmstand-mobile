/**
 * NoShowHandlingService Test - REFACTORED
 * Testing no-show handling functionality with simplified mocks and factories
 */

import { NoShowHandlingService } from '../noShowHandlingService';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { createOrder, createUser, resetAllFactories } from '../../test/factories';

// Replace complex mock setup with simple data-driven mock
jest.mock('../../config/supabase', () => ({
  supabase: null // Will be set in beforeEach
}));

describe('NoShowHandlingService', () => {
  let supabaseMock: any;
  let testOrder: any;
  let testUser: any;
  
  beforeEach(() => {
    // Reset factory counter for consistent IDs
    resetAllFactories();
    
    // Create test data using factories
    testUser = createUser({
      id: 'user-123',
      email: 'test@example.com',
      phone: '+1234567890'
    });
    
    // Create order ready for pickup but past scheduled time
    const pastPickupTime = new Date();
    pastPickupTime.setHours(pastPickupTime.getHours() - 2);
    
    testOrder = createOrder({
      id: 'order-456',
      user_id: 'user-123',
      status: 'ready',
      fulfillment_type: 'pickup',
      pickup_date: pastPickupTime.toISOString().split('T')[0],
      pickup_time: pastPickupTime.toTimeString().slice(0, 5),
      total_amount: 35.50,
      customer_name: 'Test User',
      customer_email: 'test@example.com',
      customer_phone: '+1234567890'
    });
    
    // Create mock with initial data
    supabaseMock = createSupabaseMock({
      orders: [testOrder],
      users: [testUser],
      no_show_logs: []
    });
    
    // Inject mock
    require('../../config/supabase').supabase = supabaseMock;
  });

  describe('checkForNoShows', () => {
    it('should identify orders past pickup time', async () => {
      const result = await NoShowHandlingService.checkForNoShows();

      expect(result.success).toBe(true);
      expect(result.noShowOrders).toHaveLength(1);
      expect(result.noShowOrders[0].id).toBe('order-456');
    });

    it('should not flag orders within grace period', async () => {
      // Update order to be within grace period (30 minutes)
      const recentPickupTime = new Date();
      recentPickupTime.setMinutes(recentPickupTime.getMinutes() - 15);
      
      const recentOrder = createOrder({
        ...testOrder,
        id: 'order-recent',
        pickup_date: recentPickupTime.toISOString().split('T')[0],
        pickup_time: recentPickupTime.toTimeString().slice(0, 5)
      });
      
      supabaseMock.setTableData('orders', [recentOrder]);

      const result = await NoShowHandlingService.checkForNoShows();

      expect(result.success).toBe(true);
      expect(result.noShowOrders).toHaveLength(0);
    });

    it('should handle multiple no-show orders', async () => {
      const pastTime = new Date();
      pastTime.setHours(pastTime.getHours() - 3);
      
      const additionalOrders = [
        createOrder({
          id: 'order-789',
          user_id: 'user-456',
          status: 'ready',
          pickup_date: pastTime.toISOString().split('T')[0],
          pickup_time: pastTime.toTimeString().slice(0, 5)
        }),
        createOrder({
          id: 'order-101',
          user_id: 'user-789',
          status: 'ready',
          pickup_date: pastTime.toISOString().split('T')[0],
          pickup_time: pastTime.toTimeString().slice(0, 5)
        })
      ];
      
      supabaseMock.setTableData('orders', [testOrder, ...additionalOrders]);

      const result = await NoShowHandlingService.checkForNoShows();

      expect(result.success).toBe(true);
      expect(result.noShowOrders).toHaveLength(3);
    });

    it('should handle database errors gracefully', async () => {
      supabaseMock.queueError(new Error('Database connection failed'));

      const result = await NoShowHandlingService.checkForNoShows();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to check for no-shows');
    });
  });

  describe('processNoShow', () => {
    it('should process no-show order successfully', async () => {
      const result = await NoShowHandlingService.processNoShow('order-456');

      expect(result.success).toBe(true);
      expect(result.actions).toContain('order_marked_no_show');
      expect(result.actions).toContain('customer_notified');
      expect(result.actions).toContain('stock_restored');
    });

    it('should update order status to no_show', async () => {
      await NoShowHandlingService.processNoShow('order-456');

      const orders = supabaseMock.getTableData('orders');
      const updatedOrder = orders.find(o => o.id === 'order-456');
      expect(updatedOrder.status).toBe('no_show');
      expect(updatedOrder.no_show_processed_at).toBeDefined();
    });

    it('should log no-show event', async () => {
      await NoShowHandlingService.processNoShow('order-456');

      const logs = supabaseMock.getTableData('no_show_logs');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        order_id: 'order-456',
        user_id: 'user-123',
        original_pickup_time: expect.any(String),
        processed_at: expect.any(String)
      });
    });

    it('should handle invalid order ID', async () => {
      const result = await NoShowHandlingService.processNoShow('invalid-order');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Order not found');
    });

    it('should not process already completed orders', async () => {
      // Update order to completed status
      const completedOrder = { ...testOrder, status: 'completed' };
      supabaseMock.setTableData('orders', [completedOrder]);

      const result = await NoShowHandlingService.processNoShow('order-456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Order is not eligible for no-show processing');
    });
  });

  describe('sendNoShowNotification', () => {
    it('should send notification to customer', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await NoShowHandlingService.sendNoShowNotification(testOrder);

      expect(result.success).toBe(true);
      expect(result.channels).toContain('email');
      expect(result.channels).toContain('sms');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending no-show notification for order:',
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

      const result = await NoShowHandlingService.sendNoShowNotification(orderWithoutContact);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No contact information available');
    });

    it('should handle notification errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {
        throw new Error('Notification service unavailable');
      });

      const result = await NoShowHandlingService.sendNoShowNotification(testOrder);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send notification');

      consoleSpy.mockRestore();
    });
  });

  describe('restoreStock', () => {
    it('should restore stock for no-show order items', async () => {
      const result = await NoShowHandlingService.restoreStock('order-456');

      expect(result.success).toBe(true);
      expect(result.itemsRestored).toBeDefined();
      expect(result.totalQuantityRestored).toBeGreaterThan(0);
    });

    it('should handle orders without items', async () => {
      const orderWithoutItems = createOrder({
        ...testOrder,
        id: 'order-empty',
        items: []
      });
      
      supabaseMock.setTableData('orders', [testOrder, orderWithoutItems]);

      const result = await NoShowHandlingService.restoreStock('order-empty');

      expect(result.success).toBe(true);
      expect(result.itemsRestored).toEqual([]);
      expect(result.totalQuantityRestored).toBe(0);
    });

    it('should handle stock restoration errors', async () => {
      supabaseMock.queueError(new Error('Stock update failed'));

      const result = await NoShowHandlingService.restoreStock('order-456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to restore stock');
    });
  });

  describe('rescheduleOrder', () => {
    it('should allow rescheduling within time limit', async () => {
      const newPickupTime = new Date();
      newPickupTime.setHours(newPickupTime.getHours() + 2);

      const result = await NoShowHandlingService.rescheduleOrder(
        'order-456',
        newPickupTime.toISOString().split('T')[0],
        newPickupTime.toTimeString().slice(0, 5)
      );

      expect(result.success).toBe(true);
      expect(result.newPickupDate).toBeDefined();
      expect(result.newPickupTime).toBeDefined();
    });

    it('should prevent rescheduling after cutoff time', async () => {
      // Mock order that's been no-show for too long
      const veryPastTime = new Date();
      veryPastTime.setHours(veryPastTime.getHours() - 25); // 25 hours ago
      
      const oldOrder = createOrder({
        ...testOrder,
        pickup_date: veryPastTime.toISOString().split('T')[0],
        pickup_time: veryPastTime.toTimeString().slice(0, 5)
      });
      
      supabaseMock.setTableData('orders', [oldOrder]);

      const newPickupTime = new Date();
      newPickupTime.setHours(newPickupTime.getHours() + 2);

      const result = await NoShowHandlingService.rescheduleOrder(
        'order-456',
        newPickupTime.toISOString().split('T')[0],
        newPickupTime.toTimeString().slice(0, 5)
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Order cannot be rescheduled');
    });

    it('should update order pickup time', async () => {
      const newDate = '2024-03-25';
      const newTime = '15:30';

      await NoShowHandlingService.rescheduleOrder('order-456', newDate, newTime);

      const orders = supabaseMock.getTableData('orders');
      const updatedOrder = orders.find(o => o.id === 'order-456');
      expect(updatedOrder.pickup_date).toBe(newDate);
      expect(updatedOrder.pickup_time).toBe(newTime);
      expect(updatedOrder.status).toBe('ready'); // Reset from no_show
    });
  });

  describe('getNoShowStatistics', () => {
    it('should return no-show statistics', async () => {
      // Create some no-show logs
      const noShowLogs = [
        { order_id: 'order-1', user_id: 'user-1', processed_at: new Date().toISOString() },
        { order_id: 'order-2', user_id: 'user-2', processed_at: new Date().toISOString() }
      ];
      
      supabaseMock.setTableData('no_show_logs', noShowLogs);

      const result = await NoShowHandlingService.getNoShowStatistics();

      expect(result.success).toBe(true);
      expect(result.stats).toMatchObject({
        totalNoShows: 2,
        noShowsToday: expect.any(Number),
        noShowsThisWeek: expect.any(Number),
        noShowsThisMonth: expect.any(Number)
      });
    });

    it('should handle empty statistics', async () => {
      supabaseMock.setTableData('no_show_logs', []);

      const result = await NoShowHandlingService.getNoShowStatistics();

      expect(result.success).toBe(true);
      expect(result.stats.totalNoShows).toBe(0);
    });

    it('should handle database errors', async () => {
      supabaseMock.queueError(new Error('Statistics query failed'));

      const result = await NoShowHandlingService.getNoShowStatistics();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch statistics');
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple no-shows concurrently', async () => {
      const additionalOrders = [
        createOrder({ id: 'order-batch-1', status: 'ready' }),
        createOrder({ id: 'order-batch-2', status: 'ready' })
      ];
      
      supabaseMock.setTableData('orders', [testOrder, ...additionalOrders]);

      const orderIds = ['order-456', 'order-batch-1', 'order-batch-2'];
      const results = await NoShowHandlingService.processBatchNoShows(orderIds);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should handle partial failures in batch processing', async () => {
      const orderIds = ['order-456', 'invalid-order'];
      const results = await NoShowHandlingService.processBatchNoShows(orderIds);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should use custom grace period', async () => {
      const customGracePeriod = 60; // 60 minutes
      
      const result = await NoShowHandlingService.checkForNoShows({
        gracePeriodMinutes: customGracePeriod
      });

      expect(result.success).toBe(true);
      expect(result.config.gracePeriodMinutes).toBe(customGracePeriod);
    });

    it('should use default configuration when none provided', async () => {
      const result = await NoShowHandlingService.checkForNoShows();

      expect(result.success).toBe(true);
      expect(result.config).toMatchObject({
        gracePeriodMinutes: 30,
        rescheduleTimeLimit: 24
      });
    });
  });
});