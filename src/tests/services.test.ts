/**
 * Comprehensive Test Suite for Services
 * Tests all new service implementations for error recovery, notifications,
 * pickup rescheduling, and no-show handling
 */

import { ErrorRecoveryService } from '../services/errorRecoveryService';
import { NotificationService } from '../services/notificationService';
import { PickupReschedulingService } from '../services/pickupReschedulingService';
import { NoShowHandlingService } from '../services/noShowHandlingService';
import { supabase } from '../config/supabase';
import { User, Order } from '../types';

// Mock Supabase
jest.mock('../config/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      }))
    }))
  }
}));

// Mock broadcast factory
jest.mock('../utils/broadcastFactory', () => ({
  sendOrderBroadcast: jest.fn().mockResolvedValue({ success: true })
}));

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

describe('Services Test Suite', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ErrorRecoveryService', () => {
    it('should recover from payment failure with retry strategy', async () => {
      const mockRpcResponse = {
        data: {
          success: true,
          recovery_log_id: 'recovery-123',
          actions_taken: ['retry_scheduled'],
          compensation_applied: false,
          manual_review_required: false
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockRpcResponse);

      const result = await ErrorRecoveryService.recoverFromError({
        errorType: 'payment_failed',
        orderId: mockOrder.id,
        userId: mockUser.id,
        operation: 'payment_processing',
        originalError: 'Payment gateway timeout',
        recoveryStrategy: 'retry',
        metadata: { amount: 21.60, paymentMethod: 'credit_card' }
      });

      expect(supabase.rpc).toHaveBeenCalledWith('recover_from_error_atomic', {
        p_error_type: 'payment_failed',
        p_order_id: mockOrder.id,
        p_user_id: mockUser.id,
        p_operation: 'payment_processing',
        p_original_error: 'Payment gateway timeout',
        p_recovery_strategy: 'retry',
        p_metadata: { amount: 21.60, paymentMethod: 'credit_card' }
      });

      expect(result).toEqual({
        success: true,
        recoveryLogId: 'recovery-123',
        actionsTaken: ['retry_scheduled'],
        compensationApplied: false,
        manualReviewRequired: false
      });
    });

    it('should handle stock update failure with compensation', async () => {
      const mockRpcResponse = {
        data: {
          success: true,
          recovery_log_id: 'recovery-456',
          actions_taken: ['stock_restored', 'customer_notified'],
          compensation_applied: true,
          manual_review_required: false
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockRpcResponse);

      const result = await ErrorRecoveryService.recoverFromError({
        errorType: 'stock_update_failed',
        orderId: mockOrder.id,
        userId: mockUser.id,
        operation: 'stock_decrement',
        originalError: 'Concurrent modification detected',
        recoveryStrategy: 'compensate',
        metadata: { productId: 'product-123', requestedQuantity: 2 }
      });

      expect(result.compensationApplied).toBe(true);
      expect(result.actionsTaken).toContain('stock_restored');
    });

    it('should escalate critical errors to manual intervention', async () => {
      const mockRpcResponse = {
        data: {
          success: true,
          recovery_log_id: 'recovery-789',
          actions_taken: ['admin_notified', 'order_flagged'],
          compensation_applied: false,
          manual_review_required: true
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockRpcResponse);

      const result = await ErrorRecoveryService.recoverFromError({
        errorType: 'system_error',
        orderId: mockOrder.id,
        userId: mockUser.id,
        operation: 'critical_operation',
        originalError: 'Database connection lost',
        recoveryStrategy: 'manual_intervention',
        metadata: { severity: 'critical' }
      });

      expect(result.manualReviewRequired).toBe(true);
      expect(result.actionsTaken).toContain('admin_notified');
    });

    it('should handle RPC function errors gracefully', async () => {
      const mockRpcResponse = {
        data: null,
        error: { message: 'Order not found', code: '23503' }
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockRpcResponse);

      await expect(ErrorRecoveryService.recoverFromError({
        errorType: 'payment_failed',
        orderId: 'invalid-order-id',
        userId: mockUser.id,
        operation: 'test_operation',
        originalError: 'Test error',
        recoveryStrategy: 'retry',
        metadata: {}
      })).rejects.toThrow('Order not found');
    });

    it('should validate required parameters', async () => {
      await expect(ErrorRecoveryService.recoverFromError({
        errorType: 'payment_failed',
        orderId: '',
        userId: mockUser.id,
        operation: 'test_operation',
        originalError: 'Test error',
        recoveryStrategy: 'retry',
        metadata: {}
      })).rejects.toThrow('Order ID is required');
    });
  });

  describe('NotificationService', () => {
    it('should send order confirmation notification successfully', async () => {
      const mockRpcResponse = {
        data: {
          success: true,
          notification_log_id: 'notification-123',
          delivery_status: 'sent',
          delivery_results: {
            email: { success: true, message_id: 'email-456' }
          }
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockRpcResponse);

      const result = await NotificationService.sendNotification({
        type: 'order_confirmation',
        userId: mockUser.id,
        orderId: mockOrder.id,
        customerName: mockUser.name,
        customerEmail: mockUser.email,
        customerPhone: mockUser.phone,
        message: 'Your order has been confirmed',
        deliveryMethod: 'email',
        metadata: { orderTotal: mockOrder.total }
      });

      expect(supabase.rpc).toHaveBeenCalledWith('send_notification_atomic', {
        p_notification_type: 'order_confirmation',
        p_user_id: mockUser.id,
        p_order_id: mockOrder.id,
        p_customer_name: mockUser.name,
        p_customer_email: mockUser.email,
        p_customer_phone: mockUser.phone,
        p_message_content: 'Your order has been confirmed',
        p_delivery_method: 'email',
        p_metadata: { orderTotal: mockOrder.total }
      });

      expect(result).toEqual({
        success: true,
        notificationLogId: 'notification-123',
        deliveryStatus: 'sent',
        deliveryResults: {
          email: { success: true, messageId: 'email-456' }
        }
      });
    });

    it('should handle pickup ready notification with SMS', async () => {
      const mockRpcResponse = {
        data: {
          success: true,
          notification_log_id: 'notification-456',
          delivery_status: 'delivered',
          sms_sent: true
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockRpcResponse);

      const result = await NotificationService.sendNotification({
        type: 'pickup_ready',
        userId: mockUser.id,
        orderId: mockOrder.id,
        customerName: mockUser.name,
        customerEmail: mockUser.email,
        customerPhone: mockUser.phone,
        message: 'Your order is ready for pickup!',
        deliveryMethod: 'sms',
        metadata: { pickupLocation: 'Farm Stand Main' }
      });

      expect(result.deliveryStatus).toBe('delivered');
    });

    it('should handle notification delivery failures', async () => {
      const mockRpcResponse = {
        data: {
          success: false,
          notification_log_id: 'notification-789',
          delivery_status: 'failed',
          delivery_failures: ['invalid_email_address']
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockRpcResponse);

      const result = await NotificationService.sendNotification({
        type: 'pickup_reminder',
        userId: mockUser.id,
        orderId: mockOrder.id,
        customerName: mockUser.name,
        customerEmail: 'invalid-email',
        customerPhone: mockUser.phone,
        message: 'Pickup reminder',
        deliveryMethod: 'email',
        metadata: {}
      });

      expect(result.success).toBe(false);
      expect(result.deliveryFailures).toContain('invalid_email_address');
    });

    it('should validate notification parameters', async () => {
      await expect(NotificationService.sendNotification({
        type: 'order_confirmation',
        userId: '',
        orderId: mockOrder.id,
        customerName: mockUser.name,
        customerEmail: mockUser.email,
        customerPhone: mockUser.phone,
        message: 'Test message',
        deliveryMethod: 'email',
        metadata: {}
      })).rejects.toThrow('User ID is required');
    });
  });

  describe('PickupReschedulingService', () => {
    it('should reschedule pickup successfully', async () => {
      const mockRpcResponse = {
        data: {
          success: true,
          reschedule_log_id: 'reschedule-123',
          order_updated: true,
          new_pickup_date: '2025-08-16',
          new_pickup_time: '16:00',
          status: 'approved'
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockRpcResponse);

      const result = await PickupReschedulingService.reschedulePickup({
        orderId: mockOrder.id,
        userId: mockUser.id,
        newPickupDate: '2025-08-16',
        newPickupTime: '16:00',
        reason: 'Schedule conflict',
        requestedBy: 'customer'
      });

      expect(supabase.rpc).toHaveBeenCalledWith('reschedule_pickup_atomic', {
        p_order_id: mockOrder.id,
        p_user_id: mockUser.id,
        p_original_pickup_date: undefined, // Will be fetched from order
        p_original_pickup_time: undefined, // Will be fetched from order
        p_new_pickup_date: '2025-08-16',
        p_new_pickup_time: '16:00',
        p_reason: 'Schedule conflict',
        p_requested_by: 'customer'
      });

      expect(result).toEqual({
        success: true,
        rescheduleLogId: 'reschedule-123',
        orderUpdated: true,
        newPickupDate: '2025-08-16',
        newPickupTime: '16:00',
        status: 'approved'
      });
    });

    it('should handle staff-initiated reschedule with approval', async () => {
      const mockRpcResponse = {
        data: {
          success: true,
          reschedule_log_id: 'reschedule-456',
          order_updated: true,
          status: 'approved',
          customer_notified: true
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockRpcResponse);

      const result = await PickupReschedulingService.reschedulePickup({
        orderId: mockOrder.id,
        userId: mockUser.id,
        newPickupDate: '2025-08-17',
        newPickupTime: '10:00',
        reason: 'Inventory availability',
        requestedBy: 'staff'
      });

      expect(result.status).toBe('approved');
      expect(result.customerNotified).toBe(true);
    });

    it('should validate pickup time constraints', async () => {
      const mockRpcResponse = {
        data: {
          success: false,
          error_message: 'Cannot reschedule to past date'
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockRpcResponse);

      await expect(PickupReschedulingService.reschedulePickup({
        orderId: mockOrder.id,
        userId: mockUser.id,
        newPickupDate: '2025-08-01', // Past date
        newPickupTime: '14:00',
        reason: 'Test',
        requestedBy: 'customer'
      })).rejects.toThrow('Cannot reschedule to past date');
    });

    it('should handle order not found error', async () => {
      const mockRpcResponse = {
        data: null,
        error: { message: 'Order not found', code: '23503' }
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockRpcResponse);

      await expect(PickupReschedulingService.reschedulePickup({
        orderId: 'invalid-order-id',
        userId: mockUser.id,
        newPickupDate: '2025-08-16',
        newPickupTime: '16:00',
        reason: 'Test',
        requestedBy: 'customer'
      })).rejects.toThrow('Order not found');
    });

    it('should broadcast reschedule events', async () => {
      const mockRpcResponse = {
        data: {
          success: true,
          reschedule_log_id: 'reschedule-789',
          order_updated: true,
          new_pickup_date: '2025-08-16',
          new_pickup_time: '16:00'
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockRpcResponse);

      const { sendOrderBroadcast } = require('../utils/broadcastFactory');

      await PickupReschedulingService.reschedulePickup({
        orderId: mockOrder.id,
        userId: mockUser.id,
        newPickupDate: '2025-08-16',
        newPickupTime: '16:00',
        reason: 'Schedule conflict',
        requestedBy: 'customer'
      });

      expect(sendOrderBroadcast).toHaveBeenCalledWith('pickup-rescheduled', {
        userId: mockUser.id,
        orderId: mockOrder.id,
        newPickupDate: '2025-08-16',
        newPickupTime: '16:00',
        timestamp: expect.any(String),
        action: 'pickup_rescheduled'
      });
    });
  });

  describe('NoShowHandlingService', () => {
    it('should process no-show with stock restoration', async () => {
      const mockRpcResponse = {
        data: {
          success: true,
          no_show_log_id: 'noshow-123',
          order_cancelled: true,
          stock_restored: true,
          customer_notified: true,
          stock_restoration_details: {
            items_processed: 1,
            items_failed: 0,
            total_restored: 2
          }
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockRpcResponse);

      const result = await NoShowHandlingService.processNoShow({
        orderId: mockOrder.id,
        userId: mockUser.id,
        originalPickupDate: mockOrder.pickupDate,
        originalPickupTime: mockOrder.pickupTime,
        gracePeriodMinutes: 30
      });

      expect(supabase.rpc).toHaveBeenCalledWith('process_no_show_atomic', {
        p_order_id: mockOrder.id,
        p_user_id: mockUser.id,
        p_original_pickup_date: mockOrder.pickupDate,
        p_original_pickup_time: mockOrder.pickupTime,
        p_grace_period_minutes: 30
      });

      expect(result).toEqual({
        success: true,
        noShowLogId: 'noshow-123',
        orderCancelled: true,
        stockRestored: true,
        customerNotified: true,
        stockRestorationDetails: {
          itemsProcessed: 1,
          itemsFailed: 0,
          totalRestored: 2
        }
      });
    });

    it('should skip no-show processing for recent reschedule', async () => {
      const mockRpcResponse = {
        data: {
          success: false,
          skip_reason: 'recent_reschedule',
          message: 'Order was recently rescheduled'
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockRpcResponse);

      const result = await NoShowHandlingService.processNoShow({
        orderId: mockOrder.id,
        userId: mockUser.id,
        originalPickupDate: mockOrder.pickupDate,
        originalPickupTime: mockOrder.pickupTime,
        gracePeriodMinutes: 15
      });

      expect(result.success).toBe(false);
      expect(result.skipReason).toBe('recent_reschedule');
    });

    it('should handle partial stock restoration failures', async () => {
      const mockRpcResponse = {
        data: {
          success: true,
          no_show_log_id: 'noshow-456',
          order_cancelled: true,
          stock_restored: true,
          customer_notified: true,
          stock_restoration_details: {
            items_processed: 1,
            items_failed: 1,
            failures: [
              { product_id: 'product-456', error: 'Product not found' }
            ]
          }
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockRpcResponse);

      const result = await NoShowHandlingService.processNoShow({
        orderId: mockOrder.id,
        userId: mockUser.id,
        originalPickupDate: mockOrder.pickupDate,
        originalPickupTime: mockOrder.pickupTime,
        gracePeriodMinutes: 30
      });

      expect(result.stockRestorationDetails?.itemsFailed).toBe(1);
      expect(result.stockRestorationDetails?.failures).toHaveLength(1);
    });

    it('should validate no-show parameters', async () => {
      await expect(NoShowHandlingService.processNoShow({
        orderId: '',
        userId: mockUser.id,
        originalPickupDate: mockOrder.pickupDate,
        originalPickupTime: mockOrder.pickupTime,
        gracePeriodMinutes: 30
      })).rejects.toThrow('Order ID is required');
    });

    it('should handle grace period validation', async () => {
      await expect(NoShowHandlingService.processNoShow({
        orderId: mockOrder.id,
        userId: mockUser.id,
        originalPickupDate: mockOrder.pickupDate,
        originalPickupTime: mockOrder.pickupTime,
        gracePeriodMinutes: -10 // Invalid negative grace period
      })).rejects.toThrow('Grace period must be positive');
    });
  });

  describe('Service Integration', () => {
    it('should handle service-to-service communication', async () => {
      // Test error recovery triggering notification
      const mockErrorRecoveryResponse = {
        data: {
          success: true,
          recovery_log_id: 'recovery-integration',
          actions_taken: ['customer_notification_scheduled'],
          compensation_applied: true
        },
        error: null
      };

      const mockNotificationResponse = {
        data: {
          success: true,
          notification_log_id: 'notification-integration',
          delivery_status: 'sent'
        },
        error: null
      };

      (supabase.rpc as jest.Mock)
        .mockResolvedValueOnce(mockErrorRecoveryResponse)
        .mockResolvedValueOnce(mockNotificationResponse);

      // Error recovery should trigger notification
      const recoveryResult = await ErrorRecoveryService.recoverFromError({
        errorType: 'payment_failed',
        orderId: mockOrder.id,
        userId: mockUser.id,
        operation: 'payment_processing',
        originalError: 'Payment failed',
        recoveryStrategy: 'compensate',
        metadata: {}
      });

      expect(recoveryResult.actionsTaken).toContain('customer_notification_scheduled');

      // Notification should be sent as part of recovery
      if (recoveryResult.actionsTaken?.includes('customer_notification_scheduled')) {
        const notificationResult = await NotificationService.sendNotification({
          type: 'payment_failed',
          userId: mockUser.id,
          orderId: mockOrder.id,
          customerName: mockUser.name,
          customerEmail: mockUser.email,
          customerPhone: mockUser.phone,
          message: 'Payment issue resolved - order processing continues',
          deliveryMethod: 'email',
          metadata: { recoveryLogId: recoveryResult.recoveryLogId }
        });

        expect(notificationResult.success).toBe(true);
      }
    });

    it('should handle atomic operations across services', async () => {
      // Test reschedule triggering no-show cancellation
      const mockRescheduleResponse = {
        data: {
          success: true,
          reschedule_log_id: 'reschedule-atomic',
          order_updated: true
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockRescheduleResponse);

      const rescheduleResult = await PickupReschedulingService.reschedulePickup({
        orderId: mockOrder.id,
        userId: mockUser.id,
        newPickupDate: '2025-08-16',
        newPickupTime: '16:00',
        reason: 'Schedule conflict',
        requestedBy: 'customer'
      });

      expect(rescheduleResult.success).toBe(true);

      // No-show processing should now skip due to recent reschedule
      const mockNoShowResponse = {
        data: {
          success: false,
          skip_reason: 'recent_reschedule'
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockNoShowResponse);

      const noShowResult = await NoShowHandlingService.processNoShow({
        orderId: mockOrder.id,
        userId: mockUser.id,
        originalPickupDate: mockOrder.pickupDate,
        originalPickupTime: mockOrder.pickupTime,
        gracePeriodMinutes: 30
      });

      expect(noShowResult.skipReason).toBe('recent_reschedule');
    });
  });

  describe('Service Performance', () => {
    it('should complete operations within acceptable time limits', async () => {
      const mockRpcResponse = {
        data: { success: true, recovery_log_id: 'perf-test' },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockRpcResponse);

      const startTime = Date.now();
      
      await ErrorRecoveryService.recoverFromError({
        errorType: 'payment_failed',
        orderId: mockOrder.id,
        userId: mockUser.id,
        operation: 'performance_test',
        originalError: 'Performance test',
        recoveryStrategy: 'retry',
        metadata: {}
      });

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it('should handle concurrent service calls', async () => {
      const mockRpcResponse = {
        data: { success: true, notification_log_id: 'concurrent-test' },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockRpcResponse);

      const promises = Array.from({ length: 5 }, (_, i) =>
        NotificationService.sendNotification({
          type: 'custom',
          userId: mockUser.id,
          orderId: `${mockOrder.id}-${i}`,
          customerName: mockUser.name,
          customerEmail: mockUser.email,
          customerPhone: mockUser.phone,
          message: `Concurrent test ${i}`,
          deliveryMethod: 'in_app',
          metadata: { testIndex: i }
        })
      );

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      expect(supabase.rpc).toHaveBeenCalledTimes(5);
    });
  });
});
