/**
 * Comprehensive Test Suite for Atomic RPC Functions
 * Tests all new Supabase RPC functions for error recovery, notifications, 
 * pickup rescheduling, and no-show handling
 */

import { supabase } from '../config/supabase';
import { User, Order } from '../types';

// Mock test data
const mockUser: User = {
  id: 'test-user-123',
  email: 'test@farmstand.com',
  name: 'Test User',
  phone: '555-0123',
  address: '123 Test St',
  role: 'customer'
};

const mockOrder: Order = {
  id: 'test-order-123',
  customerId: 'test-user-123',
  customerInfo: {
    name: 'Test User',
    email: 'test@farmstand.com',
    phone: '555-0123'
  },
  items: [
    {
      id: 'item-1',
      productId: 'product-123',
      productName: 'Test Product',
      quantity: 2,
      price: 10.00,
      subtotal: 20.00
    }
  ],
  subtotal: 20.00,
  tax: 1.60,
  total: 21.60,
  status: 'confirmed',
  fulfillmentType: 'pickup',
  pickupDate: '2025-08-15',
  pickupTime: '14:00',
  paymentMethod: 'online',
  paymentStatus: 'paid',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe('Atomic RPC Functions Test Suite', () => {
  
  describe('recover_from_error_atomic', () => {
    it('should handle payment failure recovery with retry strategy', async () => {
      const result = await supabase.rpc('recover_from_error_atomic', {
        p_error_type: 'payment_failed',
        p_order_id: mockOrder.id,
        p_user_id: mockUser.id,
        p_operation: 'payment_processing',
        p_original_error: 'Payment gateway timeout',
        p_recovery_strategy: 'retry',
        p_metadata: {
          paymentMethod: 'credit_card',
          amount: 21.60,
          attemptNumber: 1
        }
      });

      expect(result.error).toBeNull();
      expect(result.data).toHaveProperty('success');
      expect(result.data).toHaveProperty('recovery_log_id');
      expect(result.data).toHaveProperty('actions_taken');
      
      if (result?.data?.success) {
        expect(result.data.actions_taken).toContain('retry_scheduled');
      }
    });

    it('should handle stock update failure with compensation strategy', async () => {
      const result = await supabase.rpc('recover_from_error_atomic', {
        p_error_type: 'stock_update_failed',
        p_order_id: mockOrder.id,
        p_user_id: mockUser.id,
        p_operation: 'stock_decrement',
        p_original_error: 'Concurrent stock modification detected',
        p_recovery_strategy: 'compensate',
        p_metadata: {
          productId: 'product-123',
          requestedQuantity: 2,
          availableStock: 1
        }
      });

      expect(result.error).toBeNull();
      expect(result.data).toHaveProperty('success');
      expect(result.data).toHaveProperty('compensation_applied');
      
      if (result?.data?.success && result?.data?.compensation_applied) {
        expect(result.data.actions_taken).toContain('stock_restored');
      }
    });

    it('should handle order creation failure with rollback strategy', async () => {
      const result = await supabase.rpc('recover_from_error_atomic', {
        p_error_type: 'order_creation_failed',
        p_order_id: mockOrder.id,
        p_user_id: mockUser.id,
        p_operation: 'order_submission',
        p_original_error: 'Database constraint violation',
        p_recovery_strategy: 'rollback',
        p_metadata: {
          orderData: mockOrder,
          failurePoint: 'order_items_insert'
        }
      });

      expect(result.error).toBeNull();
      expect(result.data).toHaveProperty('success');
      expect(result.data).toHaveProperty('rollback_completed');
      
      if (result?.data?.rollback_completed) {
        expect(result.data.actions_taken).toContain('cart_restored');
      }
    });

    it('should escalate to manual intervention for critical errors', async () => {
      const result = await supabase.rpc('recover_from_error_atomic', {
        p_error_type: 'system_error',
        p_order_id: mockOrder.id,
        p_user_id: mockUser.id,
        p_operation: 'critical_system_operation',
        p_original_error: 'Database connection lost',
        p_recovery_strategy: 'manual_intervention',
        p_metadata: {
          severity: 'critical',
          affectedSystems: ['orders', 'inventory', 'payments']
        }
      });

      expect(result.error).toBeNull();
      expect(result.data).toHaveProperty('success');
      expect(result.data).toHaveProperty('manual_review_required', true);
      expect(result.data.actions_taken).toContain('admin_notified');
    });
  });

  describe('send_notification_atomic', () => {
    it('should send order confirmation notification successfully', async () => {
      const result = await supabase.rpc('send_notification_atomic', {
        p_notification_type: 'order_confirmation',
        p_user_id: mockUser.id,
        p_order_id: mockOrder.id,
        p_customer_name: mockUser.name,
        p_customer_email: mockUser.email,
        p_customer_phone: mockUser.phone,
        p_message_content: 'Your order has been confirmed and is being prepared.',
        p_delivery_method: 'email',
        p_metadata: {
          orderTotal: mockOrder.total,
          pickupTime: `${mockOrder.pickupDate} at ${mockOrder.pickupTime}`
        }
      });

      expect(result.error).toBeNull();
      expect(result.data).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('notification_log_id');
      expect(result.data).toHaveProperty('delivery_status');
      expect(['sent', 'delivered']).toContain(result?.data?.delivery_status);
    });

    it('should handle pickup ready notification with multiple delivery methods', async () => {
      const result = await supabase.rpc('send_notification_atomic', {
        p_notification_type: 'pickup_ready',
        p_user_id: mockUser.id,
        p_order_id: mockOrder.id,
        p_customer_name: mockUser.name,
        p_customer_email: mockUser.email,
        p_customer_phone: mockUser.phone,
        p_message_content: 'Your order is ready for pickup!',
        p_delivery_method: 'sms',
        p_metadata: {
          pickupLocation: 'Farm Stand Main Location',
          orderItems: mockOrder.items.length
        }
      });

      expect(result.error).toBeNull();
      expect(result.data).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('sms_sent');
    });

    it('should handle notification failures gracefully', async () => {
      const result = await supabase.rpc('send_notification_atomic', {
        p_notification_type: 'pickup_reminder',
        p_user_id: mockUser.id,
        p_order_id: mockOrder.id,
        p_customer_name: mockUser.name,
        p_customer_email: 'invalid-email',
        p_customer_phone: 'invalid-phone',
        p_message_content: 'Reminder: Your order pickup is scheduled for today.',
        p_delivery_method: 'email',
        p_metadata: {
          reminderType: 'same_day'
        }
      });

      // Should still succeed but log the failure
      expect(result.error).toBeNull();
      expect(result.data).toHaveProperty('success');
      expect(result.data).toHaveProperty('delivery_failures');
    });
  });

  describe('reschedule_pickup_atomic', () => {
    it('should reschedule pickup time successfully', async () => {
      const newPickupDate = '2025-08-16';
      const newPickupTime = '16:00';

      const result = await supabase.rpc('reschedule_pickup_atomic', {
        p_order_id: mockOrder.id,
        p_user_id: mockUser.id,
        p_original_pickup_date: mockOrder.pickupDate,
        p_original_pickup_time: mockOrder.pickupTime,
        p_new_pickup_date: newPickupDate,
        p_new_pickup_time: newPickupTime,
        p_reason: 'Schedule conflict',
        p_requested_by: 'customer'
      });

      expect(result.error).toBeNull();
      expect(result.data).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('reschedule_log_id');
      expect(result.data).toHaveProperty('order_updated', true);
      expect(result.data).toHaveProperty('new_pickup_date', newPickupDate);
      expect(result.data).toHaveProperty('new_pickup_time', newPickupTime);
    });

    it('should handle staff-initiated reschedule with approval', async () => {
      const result = await supabase.rpc('reschedule_pickup_atomic', {
        p_order_id: mockOrder.id,
        p_user_id: mockUser.id,
        p_original_pickup_date: mockOrder.pickupDate,
        p_original_pickup_time: mockOrder.pickupTime,
        p_new_pickup_date: '2025-08-17',
        p_new_pickup_time: '10:00',
        p_reason: 'Inventory availability',
        p_requested_by: 'staff'
      });

      expect(result.error).toBeNull();
      expect(result.data).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('status', 'approved');
      expect(result.data).toHaveProperty('customer_notified', true);
    });

    it('should validate pickup time constraints', async () => {
      // Try to reschedule to a past date
      const pastDate = '2025-08-01';
      
      const result = await supabase.rpc('reschedule_pickup_atomic', {
        p_order_id: mockOrder.id,
        p_user_id: mockUser.id,
        p_original_pickup_date: mockOrder.pickupDate,
        p_original_pickup_time: mockOrder.pickupTime,
        p_new_pickup_date: pastDate,
        p_new_pickup_time: '14:00',
        p_reason: 'Test past date',
        p_requested_by: 'customer'
      });

      expect(result.data).toHaveProperty('success', false);
      expect(result.data).toHaveProperty('error_message');
      expect(result?.data?.error_message).toContain('past date');
    });
  });

  describe('process_no_show_atomic', () => {
    it('should process no-show with stock restoration', async () => {
      const result = await supabase.rpc('process_no_show_atomic', {
        p_order_id: mockOrder.id,
        p_user_id: mockUser.id,
        p_original_pickup_date: mockOrder.pickupDate,
        p_original_pickup_time: mockOrder.pickupTime,
        p_grace_period_minutes: 30
      });

      expect(result.error).toBeNull();
      expect(result.data).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('no_show_log_id');
      expect(result.data).toHaveProperty('order_cancelled', true);
      expect(result.data).toHaveProperty('stock_restored', true);
      expect(result.data).toHaveProperty('customer_notified', true);
    });

    it('should handle no-show with recent reschedule (should not process)', async () => {
      // First reschedule the order
      await supabase.rpc('reschedule_pickup_atomic', {
        p_order_id: mockOrder.id,
        p_user_id: mockUser.id,
        p_original_pickup_date: mockOrder.pickupDate,
        p_original_pickup_time: mockOrder.pickupTime,
        p_new_pickup_date: '2025-08-16',
        p_new_pickup_time: '16:00',
        p_reason: 'Schedule change',
        p_requested_by: 'customer'
      });

      // Then try to process no-show (should be prevented)
      const result = await supabase.rpc('process_no_show_atomic', {
        p_order_id: mockOrder.id,
        p_user_id: mockUser.id,
        p_original_pickup_date: mockOrder.pickupDate,
        p_original_pickup_time: mockOrder.pickupTime,
        p_grace_period_minutes: 30
      });

      expect(result.data).toHaveProperty('success', false);
      expect(result.data).toHaveProperty('skip_reason', 'recent_reschedule');
    });

    it('should handle partial stock restoration failures', async () => {
      const result = await supabase.rpc('process_no_show_atomic', {
        p_order_id: mockOrder.id,
        p_user_id: mockUser.id,
        p_original_pickup_date: mockOrder.pickupDate,
        p_original_pickup_time: mockOrder.pickupTime,
        p_grace_period_minutes: 15
      });

      expect(result.error).toBeNull();
      expect(result.data).toHaveProperty('success');
      expect(result.data).toHaveProperty('stock_restoration_details');
      
      if (result?.data?.stock_restoration_details) {
        expect(result.data.stock_restoration_details).toHaveProperty('items_processed');
        expect(result.data.stock_restoration_details).toHaveProperty('items_failed');
      }
    });
  });

  describe('RPC Function Error Handling', () => {
    it('should handle invalid order ID gracefully', async () => {
      const result = await supabase.rpc('recover_from_error_atomic', {
        p_error_type: 'payment_failed',
        p_order_id: 'invalid-order-id',
        p_user_id: mockUser.id,
        p_operation: 'test_operation',
        p_original_error: 'Test error',
        p_recovery_strategy: 'retry',
        p_metadata: {}
      });

      expect(result.data).toHaveProperty('success', false);
      expect(result.data).toHaveProperty('error_message');
      expect(result?.data?.error_message).toContain('order not found');
    });

    it('should handle invalid user ID gracefully', async () => {
      const result = await supabase.rpc('send_notification_atomic', {
        p_notification_type: 'order_confirmation',
        p_user_id: 'invalid-user-id',
        p_order_id: mockOrder.id,
        p_customer_name: 'Test User',
        p_customer_email: 'test@example.com',
        p_customer_phone: '555-0123',
        p_message_content: 'Test message',
        p_delivery_method: 'email',
        p_metadata: {}
      });

      expect(result.data).toHaveProperty('success', false);
      expect(result.data).toHaveProperty('error_message');
      expect(result?.data?.error_message).toContain('user not found');
    });

    it('should validate required parameters', async () => {
      const result = await supabase.rpc('reschedule_pickup_atomic', {
        p_order_id: null,
        p_user_id: mockUser.id,
        p_original_pickup_date: mockOrder.pickupDate,
        p_original_pickup_time: mockOrder.pickupTime,
        p_new_pickup_date: '2025-08-16',
        p_new_pickup_time: '16:00',
        p_reason: 'Test',
        p_requested_by: 'customer'
      });

      expect(result.data).toHaveProperty('success', false);
      expect(result.data).toHaveProperty('error_message');
      expect(result?.data?.error_message).toContain('required');
    });
  });

  describe('RPC Function Performance', () => {
    it('should complete error recovery within acceptable time', async () => {
      const startTime = Date.now();
      
      await supabase.rpc('recover_from_error_atomic', {
        p_error_type: 'payment_failed',
        p_order_id: mockOrder.id,
        p_user_id: mockUser.id,
        p_operation: 'performance_test',
        p_original_error: 'Performance test error',
        p_recovery_strategy: 'retry',
        p_metadata: { test: 'performance' }
      });

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent RPC calls without conflicts', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        supabase.rpc('send_notification_atomic', {
          p_notification_type: 'custom',
          p_user_id: mockUser.id,
          p_order_id: `${mockOrder.id}-${i}`,
          p_customer_name: mockUser.name,
          p_customer_email: mockUser.email,
          p_customer_phone: mockUser.phone,
          p_message_content: `Concurrent test message ${i}`,
          p_delivery_method: 'in_app',
          p_metadata: { testIndex: i }
        })
      );

      const results = await Promise.all(promises);
      
      // All should succeed or fail gracefully
      results.forEach((result, index) => {
        expect(result.error).toBeNull();
        expect(result.data).toHaveProperty('success');
      });
    });
  });
});
