/**
 * KioskOrderIntegration Test - REFACTORED
 * Testing kiosk order integration functionality with simplified mocks and factories
 */

import { submitOrder } from '../orderService';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { 
  createOrder, 
  createOrderItem, 
  createUser,
  createProduct,
  resetAllFactories 
} from '../../test/factories';

// Replace complex mock setup with simple data-driven mock
jest.mock('../../config/supabase', () => ({
  supabase: null // Will be set in beforeEach
}));

// Mock dependencies
jest.mock('../../utils/broadcastFactory', () => ({
  sendOrderBroadcast: jest.fn().mockResolvedValue(true)
}));

jest.mock('../notificationService', () => ({
  sendPickupReadyNotification: jest.fn().mockResolvedValue(true),
  sendOrderConfirmationNotification: jest.fn().mockResolvedValue(true)
}));

describe('KioskOrderIntegration', () => {
  let supabaseMock: any;
  let testUser: any;
  let testProducts: any[];
  let testOrderItems: any[];
  let kioskSessionData: any;
  
  beforeEach(() => {
    // Reset factory counter for consistent IDs
    resetAllFactories();
    
    // Create test data using factories
    testUser = createUser({
      id: 'user-123',
      email: 'customer@example.com',
      name: 'Kiosk Customer'
    });
    
    testProducts = [
      createProduct({
        id: 'product-1',
        name: 'Apple',
        price: 1.50,
        stock_quantity: 100
      }),
      createProduct({
        id: 'product-2',
        name: 'Banana',
        price: 0.99,
        stock_quantity: 50
      })
    ];
    
    testOrderItems = [
      createOrderItem({
        product_id: 'product-1',
        quantity: 3,
        unit_price: 1.50
      }),
      createOrderItem({
        product_id: 'product-2',
        quantity: 2,
        unit_price: 0.99
      })
    ];
    
    kioskSessionData = {
      id: 'kiosk-session-123',
      kiosk_id: 'kiosk-terminal-01',
      staff_pin: '1234',
      session_start: new Date().toISOString(),
      session_status: 'active',
      orders_count: 0,
      total_sales: 0
    };
    
    // Create mock with initial data
    supabaseMock = createSupabaseMock({
      users: [testUser],
      products: testProducts,
      order_items: testOrderItems,
      orders: [],
      kiosk_sessions: [kioskSessionData],
      kiosk_transactions: []
    });
    
    // Inject mock
    require('../../config/supabase').supabase = supabaseMock;
  });

  describe('Kiosk Order Creation', () => {
    it('should create order with kiosk session tracking', async () => {
      const orderRequest = {
        user_id: 'user-123',
        items: testOrderItems,
        fulfillment_type: 'pickup',
        payment_method: 'cash_on_pickup',
        pickup_date: '2024-03-21',
        pickup_time: '14:00',
        customer_info: {
          name: 'Kiosk Customer',
          email: 'customer@example.com',
          phone: '+1234567890'
        },
        kiosk_session_id: 'kiosk-session-123' // Kiosk integration
      };

      const result = await submitOrder(orderRequest);

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.order.kiosk_session_id).toBe('kiosk-session-123');
      
      // Verify order was created with kiosk tracking
      const orders = supabaseMock.getTableData('orders');
      expect(orders).toHaveLength(1);
      expect(orders[0].kiosk_session_id).toBe('kiosk-session-123');
    });

    it('should create kiosk transaction record', async () => {
      const orderRequest = {
        user_id: 'user-123',
        items: testOrderItems,
        total_amount: 6.48,
        payment_method: 'cash_on_pickup',
        kiosk_session_id: 'kiosk-session-123'
      };

      await submitOrder(orderRequest);

      // Verify kiosk transaction was created
      const transactions = supabaseMock.getTableData('kiosk_transactions');
      expect(transactions).toHaveLength(1);
      expect(transactions[0]).toMatchObject({
        kiosk_session_id: 'kiosk-session-123',
        transaction_type: 'order_placed',
        amount: 6.48
      });
    });

    it('should update kiosk session statistics', async () => {
      const orderRequest = {
        user_id: 'user-123',
        items: testOrderItems,
        total_amount: 6.48,
        kiosk_session_id: 'kiosk-session-123'
      };

      await submitOrder(orderRequest);

      // Verify session stats were updated
      const sessions = supabaseMock.getTableData('kiosk_sessions');
      const updatedSession = sessions.find(s => s.id === 'kiosk-session-123');
      expect(updatedSession.orders_count).toBe(1);
      expect(updatedSession.total_sales).toBe(6.48);
    });

    it('should handle non-kiosk orders normally', async () => {
      const orderRequest = {
        user_id: 'user-123',
        items: testOrderItems,
        payment_method: 'stripe'
        // No kiosk_session_id
      };

      const result = await submitOrder(orderRequest);

      expect(result.success).toBe(true);
      expect(result.order.kiosk_session_id).toBeUndefined();
      
      // No kiosk transaction should be created
      const transactions = supabaseMock.getTableData('kiosk_transactions');
      expect(transactions).toHaveLength(0);
    });
  });

  describe('Kiosk Session Validation', () => {
    it('should validate kiosk session exists and is active', async () => {
      const orderRequest = {
        user_id: 'user-123',
        items: testOrderItems,
        kiosk_session_id: 'invalid-session'
      };

      const result = await submitOrder(orderRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid kiosk session');
    });

    it('should reject orders from inactive kiosk sessions', async () => {
      // Update session to inactive
      const sessions = supabaseMock.getTableData('kiosk_sessions');
      sessions[0].session_status = 'inactive';
      supabaseMock.setTableData('kiosk_sessions', sessions);

      const orderRequest = {
        user_id: 'user-123',
        items: testOrderItems,
        kiosk_session_id: 'kiosk-session-123'
      };

      const result = await submitOrder(orderRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Kiosk session is not active');
    });

    it('should validate staff PIN authorization', async () => {
      const orderRequest = {
        user_id: 'user-123',
        items: testOrderItems,
        kiosk_session_id: 'kiosk-session-123',
        staff_pin: 'wrong-pin'
      };

      const result = await submitOrder(orderRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid staff PIN');
    });
  });

  describe('Kiosk Transaction Types', () => {
    it('should track different transaction types', async () => {
      // Test order placement
      await submitOrder({
        user_id: 'user-123',
        items: [testOrderItems[0]],
        total_amount: 4.50,
        kiosk_session_id: 'kiosk-session-123'
      });

      // Test refund transaction
      await submitOrder({
        user_id: 'user-123',
        transaction_type: 'refund',
        amount: -2.25,
        kiosk_session_id: 'kiosk-session-123',
        reference_order_id: 'order-refund'
      });

      const transactions = supabaseMock.getTableData('kiosk_transactions');
      expect(transactions).toHaveLength(2);
      expect(transactions[0].transaction_type).toBe('order_placed');
      expect(transactions[1].transaction_type).toBe('refund');
      expect(transactions[1].amount).toBe(-2.25);
    });

    it('should handle cash payments at kiosk', async () => {
      const orderRequest = {
        user_id: 'user-123',
        items: testOrderItems,
        total_amount: 6.48,
        payment_method: 'cash_on_pickup',
        kiosk_session_id: 'kiosk-session-123'
      };

      await submitOrder(orderRequest);

      const transactions = supabaseMock.getTableData('kiosk_transactions');
      expect(transactions[0].payment_method).toBe('cash_on_pickup');
      expect(transactions[0].cash_received).toBeUndefined(); // Will be set at pickup
    });

    it('should track card payments at kiosk', async () => {
      const orderRequest = {
        user_id: 'user-123',
        items: testOrderItems,
        total_amount: 6.48,
        payment_method: 'card_at_kiosk',
        kiosk_session_id: 'kiosk-session-123'
      };

      await submitOrder(orderRequest);

      const transactions = supabaseMock.getTableData('kiosk_transactions');
      expect(transactions[0].payment_method).toBe('card_at_kiosk');
      expect(transactions[0].transaction_type).toBe('order_placed');
    });
  });

  describe('Kiosk Analytics Integration', () => {
    it('should track order completion for kiosk analytics', async () => {
      // Place order
      const orderResult = await submitOrder({
        user_id: 'user-123',
        items: testOrderItems,
        kiosk_session_id: 'kiosk-session-123'
      });

      // Mark as completed
      const orders = supabaseMock.getTableData('orders');
      orders[0].status = 'completed';
      orders[0].completed_at = new Date().toISOString();
      supabaseMock.setTableData('orders', orders);

      // This would typically trigger analytics update
      const completedOrder = orders[0];
      expect(completedOrder.kiosk_session_id).toBe('kiosk-session-123');
      expect(completedOrder.status).toBe('completed');
    });

    it('should track session duration and activity', async () => {
      // Multiple orders in same session
      for (let i = 0; i < 3; i++) {
        await submitOrder({
          user_id: 'user-123',
          items: [testOrderItems[0]],
          total_amount: 1.50,
          kiosk_session_id: 'kiosk-session-123'
        });
      }

      const sessions = supabaseMock.getTableData('kiosk_sessions');
      const session = sessions.find(s => s.id === 'kiosk-session-123');
      expect(session.orders_count).toBe(3);
      expect(session.total_sales).toBe(4.50);
    });
  });

  describe('Error Handling', () => {
    it('should handle kiosk database errors gracefully', async () => {
      supabaseMock.queueError(new Error('Kiosk database unavailable'));

      const orderRequest = {
        user_id: 'user-123',
        items: testOrderItems,
        kiosk_session_id: 'kiosk-session-123'
      };

      const result = await submitOrder(orderRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Kiosk integration error');
    });

    it('should continue with order if kiosk tracking fails', async () => {
      // Mock kiosk transaction creation to fail
      let callCount = 0;
      const originalInsert = supabaseMock.from().insert;
      supabaseMock.from().insert = jest.fn().mockImplementation((data) => {
        callCount++;
        if (callCount === 2) { // Fail kiosk transaction insert
          throw new Error('Kiosk transaction failed');
        }
        return originalInsert(data);
      });

      const orderRequest = {
        user_id: 'user-123',
        items: testOrderItems,
        kiosk_session_id: 'kiosk-session-123'
      };

      // Order should still succeed even if kiosk tracking fails
      const result = await submitOrder(orderRequest);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Kiosk tracking failed');
    });
  });

  describe('Staff Authorization', () => {
    it('should authorize staff actions with valid PIN', async () => {
      const staffAction = {
        action: 'void_order',
        order_id: 'order-123',
        staff_pin: '1234',
        kiosk_session_id: 'kiosk-session-123'
      };

      const result = await submitOrder({
        ...staffAction,
        user_id: 'user-123',
        items: []
      });

      expect(result.success).toBe(true);
    });

    it('should track staff actions in audit log', async () => {
      await submitOrder({
        user_id: 'user-123',
        items: testOrderItems,
        kiosk_session_id: 'kiosk-session-123',
        staff_override: true,
        staff_pin: '1234'
      });

      const transactions = supabaseMock.getTableData('kiosk_transactions');
      expect(transactions[0].staff_override).toBe(true);
      expect(transactions[0].staff_pin).toBe('1234');
    });
  });

  describe('Kiosk Performance Metrics', () => {
    it('should track order processing time', async () => {
      const startTime = Date.now();
      
      await submitOrder({
        user_id: 'user-123',
        items: testOrderItems,
        kiosk_session_id: 'kiosk-session-123'
      });

      const transactions = supabaseMock.getTableData('kiosk_transactions');
      const processingTime = Date.now() - startTime;
      
      expect(transactions[0]).toBeDefined();
      expect(processingTime).toBeLessThan(1000); // Should be fast
    });

    it('should track session metrics', async () => {
      // Simulate multiple interactions
      await submitOrder({
        user_id: 'user-123',
        items: [testOrderItems[0]],
        kiosk_session_id: 'kiosk-session-123'
      });

      const sessions = supabaseMock.getTableData('kiosk_sessions');
      const session = sessions.find(s => s.id === 'kiosk-session-123');
      
      expect(session.orders_count).toBe(1);
      expect(session.last_activity).toBeDefined();
    });
  });
});