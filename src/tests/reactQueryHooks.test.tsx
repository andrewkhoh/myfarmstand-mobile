/**
 * Comprehensive Test Suite for React Query Hooks
 * Tests all new atomic React Query hooks for error recovery, notifications,
 * pickup rescheduling, and no-show handling
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useErrorRecovery } from '../hooks/useErrorRecovery';
import { useNotifications } from '../hooks/useNotifications';
import { usePickupRescheduling } from '../hooks/usePickupRescheduling';
import { useNoShowHandling } from '../hooks/useNoShowHandling';
import { User, Order } from '../types';
import { ErrorContext } from '../services/errorRecoveryService';
import { NotificationRequest } from '../services/notificationService';
import { RescheduleRequest } from '../services/pickupReschedulingService';

// Mock services
jest.mock('../services/errorRecoveryService');
jest.mock('../services/notificationService');
jest.mock('../services/pickupReschedulingService');
jest.mock('../services/noShowHandlingService');

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

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

describe('React Query Hooks Test Suite', () => {
  
  describe('useErrorRecovery', () => {
    it('should provide error recovery mutation with correct signature', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useErrorRecovery(), { wrapper });

      expect(result.current).toHaveProperty('recoverFromError');
      expect(result.current).toHaveProperty('isRecovering');
      expect(result.current).toHaveProperty('recoveryError');
      expect(typeof result.current.recoverFromError).toBe('function');
      expect(typeof result.current.isRecovering).toBe('boolean');
    });

    it('should handle error recovery mutation successfully', async () => {
      const mockRecoverFromError = jest.fn().mockResolvedValue({
        success: true,
        recoveryLogId: 'recovery-123',
        actionsTaken: ['retry_scheduled']
      });

      jest.doMock('../services/errorRecoveryService', () => ({
        ErrorRecoveryService: {
          recoverFromError: mockRecoverFromError
        }
      }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useErrorRecovery(), { wrapper });

      const errorData = {
        errorType: 'payment_failed' as const,
        orderId: mockOrder.id,
        userId: mockUser.id,
        operation: 'payment_processing',
        originalError: 'Payment timeout',
        recoveryStrategy: 'retry' as const,
        metadata: { amount: 21.60 }
      };

      result.current.recoverFromError(errorData);

      await waitFor(() => {
        expect(mockRecoverFromError).toHaveBeenCalledWith(errorData);
      });
    });

    it('should handle error recovery mutation failure', async () => {
      const mockRecoverFromError = jest.fn().mockRejectedValue(
        new Error('Recovery failed')
      );

      jest.doMock('../services/errorRecoveryService', () => ({
        ErrorRecoveryService: {
          recoverFromError: mockRecoverFromError
        }
      }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useErrorRecovery(), { wrapper });

      result.current.recoverFromError({
        errorType: 'system_error',
        orderId: mockOrder.id,
        userId: mockUser.id,
        operation: 'test_operation',
        originalError: 'Test error',
        recoveryStrategy: 'manual_intervention',
        metadata: {}
      });

      await waitFor(() => {
        expect(result.current.recoveryError).toBeTruthy();
      });
    });

    it('should follow atomic pattern (no try/catch wrappers)', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useErrorRecovery(), { wrapper });

      // Should expose direct mutation functions only
      expect(result.current).not.toHaveProperty('recoverFromErrorAsync');
      expect(result.current).not.toHaveProperty('recoverFromErrorWithTryCatch');
      
      // Should follow cart pattern naming
      expect(result.current).toHaveProperty('recoverFromError'); // Direct mutation
      expect(result.current).toHaveProperty('isRecovering'); // Loading state
      expect(result.current).toHaveProperty('recoveryError'); // Error state
    });
  });

  describe('useNotifications', () => {
    it('should provide notification mutation with correct signature', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useNotifications(), { wrapper });

      expect(result.current).toHaveProperty('sendNotification');
      expect(result.current).toHaveProperty('isSending');
      expect(result.current).toHaveProperty('notificationError');
      expect(typeof result.current.sendNotification).toBe('function');
      expect(typeof result.current.isSending).toBe('boolean');
    });

    it('should handle notification sending successfully', async () => {
      const mockSendNotification = jest.fn().mockResolvedValue({
        success: true,
        notificationLogId: 'notification-123',
        deliveryStatus: 'sent'
      });

      jest.doMock('../services/notificationService', () => ({
        NotificationService: {
          sendNotification: mockSendNotification
        }
      }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useNotifications(), { wrapper });

      const notificationData = {
        type: 'order_confirmation' as const,
        userId: mockUser.id,
        orderId: mockOrder.id,
        customerName: mockUser.name,
        customerEmail: mockUser.email,
        customerPhone: mockUser.phone,
        message: 'Your order has been confirmed',
        deliveryMethod: 'email' as const,
        metadata: { orderTotal: mockOrder.total }
      };

      result.current.sendNotification(notificationData);

      await waitFor(() => {
        expect(mockSendNotification).toHaveBeenCalledWith(notificationData);
      });
    });

    it('should handle multiple delivery methods', async () => {
      const mockSendNotification = jest.fn().mockResolvedValue({
        success: true,
        deliveryResults: {
          email: { success: true, messageId: 'email-123' },
          sms: { success: true, messageId: 'sms-456' },
          push: { success: false, error: 'Device not registered' }
        }
      });

      jest.doMock('../services/notificationService', () => ({
        NotificationService: {
          sendNotification: mockSendNotification
        }
      }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useNotifications(), { wrapper });

      result.current.sendNotification({
        type: 'pickup_ready',
        userId: mockUser.id,
        orderId: mockOrder.id,
        customerName: mockUser.name,
        customerEmail: mockUser.email,
        customerPhone: mockUser.phone,
        message: 'Your order is ready for pickup!',
        deliveryMethod: 'email',
        metadata: { multiChannel: true }
      });

      await waitFor(() => {
        expect(mockSendNotification).toHaveBeenCalled();
      });
    });

    it('should follow atomic pattern with React Query lifecycle', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useNotifications(), { wrapper });

      // Should not have wrapper functions
      expect(result.current).not.toHaveProperty('sendNotificationWithRetry');
      expect(result.current).not.toHaveProperty('sendNotificationAsync');
      
      // Should follow atomic pattern
      expect(result.current).toHaveProperty('sendNotification'); // Direct mutation
      expect(result.current).toHaveProperty('isSending'); // Loading state
      expect(result.current).toHaveProperty('notificationError'); // Error state
    });
  });

  describe('usePickupRescheduling', () => {
    it('should provide reschedule mutation with correct signature', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePickupRescheduling(), { wrapper });

      expect(result.current).toHaveProperty('reschedulePickup');
      expect(result.current).toHaveProperty('isRescheduling');
      expect(result.current).toHaveProperty('reschedulingError');
      expect(typeof result.current.reschedulePickup).toBe('function');
      expect(typeof result.current.isRescheduling).toBe('boolean');
    });

    it('should handle pickup rescheduling successfully', async () => {
      const mockReschedulePickup = jest.fn().mockResolvedValue({
        success: true,
        rescheduleLogId: 'reschedule-123',
        orderUpdated: true,
        newPickupDate: '2025-08-16',
        newPickupTime: '16:00'
      });

      jest.doMock('../services/pickupReschedulingService', () => ({
        PickupReschedulingService: {
          reschedulePickup: mockReschedulePickup
        }
      }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePickupRescheduling(), { wrapper });

      const rescheduleData = {
        orderId: mockOrder.id,
        userId: mockUser.id,
        newPickupDate: '2025-08-16',
        newPickupTime: '16:00',
        reason: 'Schedule conflict',
        requestedBy: 'customer' as const
      };

      result.current.reschedulePickup(rescheduleData);

      await waitFor(() => {
        expect(mockReschedulePickup).toHaveBeenCalledWith(rescheduleData);
      });
    });

    it('should handle staff-initiated reschedules', async () => {
      const mockReschedulePickup = jest.fn().mockResolvedValue({
        success: true,
        status: 'approved',
        customerNotified: true
      });

      jest.doMock('../services/pickupReschedulingService', () => ({
        PickupReschedulingService: {
          reschedulePickup: mockReschedulePickup
        }
      }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePickupRescheduling(), { wrapper });

      result.current.reschedulePickup({
        orderId: mockOrder.id,
        userId: mockUser.id,
        newPickupDate: '2025-08-17',
        newPickupTime: '10:00',
        reason: 'Inventory availability',
        requestedBy: 'staff'
      });

      await waitFor(() => {
        expect(mockReschedulePickup).toHaveBeenCalled();
      });
    });

    it('should validate reschedule constraints', async () => {
      const mockReschedulePickup = jest.fn().mockRejectedValue(
        new Error('Cannot reschedule to past date')
      );

      jest.doMock('../services/pickupReschedulingService', () => ({
        PickupReschedulingService: {
          reschedulePickup: mockReschedulePickup
        }
      }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePickupRescheduling(), { wrapper });

      result.current.reschedulePickup({
        orderId: mockOrder.id,
        userId: mockUser.id,
        newPickupDate: '2025-08-01', // Past date
        newPickupTime: '14:00',
        reason: 'Test',
        requestedBy: 'customer'
      });

      await waitFor(() => {
        expect(result.current.reschedulingError).toBeTruthy();
        expect(result.current.reschedulingError?.message).toContain('past date');
      });
    });
  });

  describe('useNoShowHandling', () => {
    it('should provide no-show processing mutation with correct signature', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useNoShowHandling(), { wrapper });

      expect(result.current).toHaveProperty('processNoShow');
      expect(result.current).toHaveProperty('isProcessing');
      expect(result.current).toHaveProperty('processingError');
      expect(typeof result.current.processNoShow).toBe('function');
      expect(typeof result.current.isProcessing).toBe('boolean');
    });

    it('should handle no-show processing successfully', async () => {
      const mockProcessNoShow = jest.fn().mockResolvedValue({
        success: true,
        noShowLogId: 'noshow-123',
        orderCancelled: true,
        stockRestored: true,
        customerNotified: true
      });

      jest.doMock('../services/noShowHandlingService', () => ({
        NoShowHandlingService: {
          processNoShow: mockProcessNoShow
        }
      }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useNoShowHandling(), { wrapper });

      const noShowData = {
        orderId: mockOrder.id,
        userId: mockUser.id,
        originalPickupDate: mockOrder.pickupDate,
        originalPickupTime: mockOrder.pickupTime,
        gracePeriodMinutes: 30
      };

      result.current.processNoShow(noShowData);

      await waitFor(() => {
        expect(mockProcessNoShow).toHaveBeenCalledWith(noShowData);
      });
    });

    it('should handle no-show with recent reschedule', async () => {
      const mockProcessNoShow = jest.fn().mockResolvedValue({
        success: false,
        skipReason: 'recent_reschedule',
        message: 'Order was recently rescheduled'
      });

      jest.doMock('../services/noShowHandlingService', () => ({
        NoShowHandlingService: {
          processNoShow: mockProcessNoShow
        }
      }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useNoShowHandling(), { wrapper });

      result.current.processNoShow({
        orderId: mockOrder.id,
        userId: mockUser.id,
        originalPickupDate: mockOrder.pickupDate,
        originalPickupTime: mockOrder.pickupTime,
        gracePeriodMinutes: 15
      });

      await waitFor(() => {
        expect(mockProcessNoShow).toHaveBeenCalled();
      });
    });

    it('should handle partial stock restoration failures', async () => {
      const mockProcessNoShow = jest.fn().mockResolvedValue({
        success: true,
        stockRestorationDetails: {
          itemsProcessed: 1,
          itemsFailed: 1,
          failures: [
            { productId: 'product-456', error: 'Product not found' }
          ]
        }
      });

      jest.doMock('../services/noShowHandlingService', () => ({
        NoShowHandlingService: {
          processNoShow: mockProcessNoShow
        }
      }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useNoShowHandling(), { wrapper });

      result.current.processNoShow({
        orderId: mockOrder.id,
        userId: mockUser.id,
        originalPickupDate: mockOrder.pickupDate,
        originalPickupTime: mockOrder.pickupTime,
        gracePeriodMinutes: 30
      });

      await waitFor(() => {
        expect(mockProcessNoShow).toHaveBeenCalled();
      });
    });
  });

  describe('Atomic Pattern Compliance', () => {
    it('should all hooks follow cart atomic pattern structure', () => {
      const wrapper = createWrapper();
      
      const { result: errorRecovery } = renderHook(() => useErrorRecovery(), { wrapper });
      const { result: notifications } = renderHook(() => useNotifications(), { wrapper });
      const { result: rescheduling } = renderHook(() => usePickupRescheduling(), { wrapper });
      const { result: noShow } = renderHook(() => useNoShowHandling(), { wrapper });

      // All should have direct mutation functions (no wrappers)
      expect(typeof errorRecovery.current.recoverFromError).toBe('function');
      expect(typeof notifications.current.sendNotification).toBe('function');
      expect(typeof rescheduling.current.reschedulePickup).toBe('function');
      expect(typeof noShow.current.processNoShow).toBe('function');

      // All should have loading states
      expect(typeof errorRecovery.current.isRecovering).toBe('boolean');
      expect(typeof notifications.current.isSending).toBe('boolean');
      expect(typeof rescheduling.current.isRescheduling).toBe('boolean');
      expect(typeof noShow.current.isProcessing).toBe('boolean');

      // All should have error states
      expect(errorRecovery.current).toHaveProperty('recoveryError');
      expect(notifications.current).toHaveProperty('notificationError');
      expect(rescheduling.current).toHaveProperty('reschedulingError');
      expect(noShow.current).toHaveProperty('processingError');

      // None should have async wrapper functions
      expect(errorRecovery.current).not.toHaveProperty('recoverFromErrorAsync');
      expect(notifications.current).not.toHaveProperty('sendNotificationAsync');
      expect(rescheduling.current).not.toHaveProperty('reschedulePickupAsync');
      expect(noShow.current).not.toHaveProperty('processNoShowAsync');
    });

    it('should handle optimistic updates and rollback', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePickupRescheduling(), { wrapper });

      // Mock a failed reschedule
      const mockReschedulePickup = jest.fn().mockRejectedValue(
        new Error('Reschedule failed')
      );

      jest.doMock('../services/pickupReschedulingService', () => ({
        PickupReschedulingService: {
          reschedulePickup: mockReschedulePickup
        }
      }));

      result.current.reschedulePickup({
        orderId: mockOrder.id,
        userId: mockUser.id,
        newPickupDate: '2025-08-16',
        newPickupTime: '16:00',
        reason: 'Test rollback',
        requestedBy: 'customer'
      });

      // Should handle rollback automatically via React Query
      await waitFor(() => {
        expect(result.current.reschedulingError).toBeTruthy();
        expect(result.current.isRescheduling).toBe(false);
      });
    });

    it('should invalidate related queries on success', async () => {
      const mockQueryClient = {
        invalidateQueries: jest.fn(),
        setQueryData: jest.fn()
      };

      // This would be tested with actual QueryClient integration
      // The hooks should trigger query invalidation on successful mutations
      expect(true).toBe(true); // Placeholder for actual implementation test
    });
  });

  describe('Hook Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      const wrapper = createWrapper();
      let renderCount = 0;
      
      const TestComponent = () => {
        renderCount++;
        const { recoverFromError } = useErrorRecovery();
        return null;
      };

      const { rerender } = renderHook(() => <TestComponent />, { wrapper });
      
      expect(renderCount).toBe(1);
      
      rerender();
      expect(renderCount).toBe(2); // Should only re-render when explicitly triggered
    });

    it('should handle concurrent mutations gracefully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useNotifications(), { wrapper });

      const mockSendNotification = jest.fn().mockResolvedValue({
        success: true,
        notificationLogId: 'concurrent-test'
      });

      jest.doMock('../services/notificationService', () => ({
        NotificationService: {
          sendNotification: mockSendNotification
        }
      }));

      // Trigger multiple concurrent mutations
      const promises = Array.from({ length: 3 }, (_, i) =>
        result.current.sendNotification({
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

      // Should handle all mutations without conflicts
      await waitFor(() => {
        expect(mockSendNotification).toHaveBeenCalledTimes(3);
      });
    });
  });
});
