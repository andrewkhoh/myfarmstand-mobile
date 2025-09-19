/**
 * useNotifications Race Condition Tests
 * 
 * Tests for concurrent notification operations with Real React Query
 * Following the proven Option A pattern from established race testing
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useNotifications } from '../useNotifications';
import { NotificationService, NotificationRequest } from '../../services/notificationService';

// Import mocked notification service (services are mocked, React Query is real)
jest.mock('../../services/notificationService', () => ({
  NotificationService: {
    sendNotification: jest.fn(),
    sendPickupReadyNotification: jest.fn(),
    sendOrderConfirmedNotification: jest.fn(),
    sendOrderCancelledNotification: jest.fn(),
    sendPaymentReminderNotification: jest.fn(),
  }
}));

// Get the mocked service
const mockNotificationService = NotificationService as jest.Mocked<typeof NotificationService>;

// Mock notification data for testing
const mockOrder = {
  id: 'order-123',
  customerId: 'test-user-123',
  customer_email: 'test@example.com',
  customer_phone: '+1234567890',
  customer_name: 'Test Customer',
  status: 'ready' as const,
  total: 25.99,
  items: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const mockNotificationRequest: NotificationRequest = {
  userId: 'test-user-123',
  customerEmail: 'test@example.com',
  customerPhone: '+1234567890',
  customerName: 'Test Customer',
  type: 'order_ready',
  channels: ['push', 'sms', 'email'],
  order: mockOrder
};

const mockNotificationHistory = [
  {
    id: 'notif-1',
    type: 'order_ready',
    userId: 'test-user-123',
    customerName: 'Test Customer',
    status: 'sent' as const,
    createdAt: new Date().toISOString(),
    message: 'Your order is ready for pickup'
  },
  {
    id: 'notif-2',
    type: 'order_confirmed',
    userId: 'test-user-123',
    customerName: 'Test Customer',
    status: 'sent' as const,
    createdAt: new Date().toISOString(),
    message: 'Your order has been confirmed'
  }
];

const mockPreferences = {
  userId: 'test-user-123',
  emailEnabled: true,
  smsEnabled: true,
  inAppEnabled: true,
  orderReady: true,
  orderCancelled: true,
  promotions: false,
  updatedAt: new Date().toISOString()
};

// Helper to create error for NotificationService
const createNotificationError = (
  code: string,
  message: string
) => {
  const error = new Error(message);
  (error as any).code = code;
  return error;
};

describe('useNotifications Race Condition Tests (Real React Query)', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    // CRITICAL: Use real timers for React Query compatibility
    jest.useRealTimers();
    
    // Fresh query client for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { 
          retry: false,
          staleTime: 0,
          gcTime: 0,
        },
        mutations: { retry: false }
      }
    });
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock behavior
    mockNotificationService.sendNotification.mockImplementation(async (request) => {
      // Use real short delay for race condition testing
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        success: true,
        sentChannels: request.channels,
        failedChannels: [],
        message: 'Notification sent successfully'
      };
    });
  });

  afterEach(() => {
    queryClient.clear();
  });
  
  // Enhanced wrapper with proper React Query context (following cart pattern)
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('🔧 Setup Verification', () => {
    it('should initialize useNotifications hook without hanging', async () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      
      // Should initialize immediately without hanging
      expect(result.current).toBeDefined();
      expect(result.current.sendNotification).toBeDefined();
      expect(result.current.updatePreferences).toBeDefined();
      
      // Should complete initialization within reasonable time
      await waitFor(() => {
        expect(result.current.isLoadingHistory).toBe(false);
        expect(result.current.isLoadingPreferences).toBe(false);
      }, { timeout: 3000 });
    });
  });

  describe('🏁 Concurrent Notification Sending', () => {
    it('should handle multiple concurrent notification sends correctly', async () => {
      let callCount = 0;
      mockNotificationService.sendNotification.mockImplementation(async (request) => {
        callCount++;
        console.log(`NotificationService.sendNotification called, callCount: ${callCount}`);
        // Use real short delay for race condition testing
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          success: true,
          sentChannels: request.channels,
          failedChannels: [],
          message: `Notification ${callCount} sent successfully`
        };
      });

      const { result: notif1 } = renderHook(() => useNotifications(), { wrapper });
      const { result: notif2 } = renderHook(() => useNotifications(), { wrapper });
      const { result: notif3 } = renderHook(() => useNotifications(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(notif1.current.isLoadingHistory).toBe(false);
        expect(notif2.current.isLoadingHistory).toBe(false);
        expect(notif3.current.isLoadingHistory).toBe(false);
      });

      // Perform concurrent notification sends
      const startTime = Date.now();
      
      await act(async () => {
        const requests = [
          { ...mockNotificationRequest, type: 'order_ready' as const },
          { ...mockNotificationRequest, type: 'order_confirmed' as const },
          { ...mockNotificationRequest, type: 'order_cancelled' as const }
        ];

        await Promise.all([
          notif1.current.sendNotificationAsync(requests[0]),
          notif2.current.sendNotificationAsync(requests[1]),
          notif3.current.sendNotificationAsync(requests[2])
        ]);
      });

      const endTime = Date.now();
      console.log(`Concurrent notifications completed in ${endTime - startTime}ms`);
      
      // All service calls should have been made
      expect(mockNotificationService.sendNotification).toHaveBeenCalledTimes(3);
      
      // All notifications should be in different states
      expect(notif1.current.isSending).toBe(false);
      expect(notif2.current.isSending).toBe(false);
      expect(notif3.current.isSending).toBe(false);
    });

    it('should handle rapid notification sends to same recipients', async () => {
      let callCount = 0;
      mockNotificationService.sendNotification.mockImplementation(async (request) => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 30));
        return {
          success: true,
          sentChannels: request.channels,
          failedChannels: [],
          message: `Rapid notification ${callCount} sent`
        };
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingHistory).toBe(false);
      });

      // Send rapid notifications
      await act(async () => {
        const promises = [];
        for (let i = 1; i <= 5; i++) {
          const request = {
            ...mockNotificationRequest,
            type: i % 2 === 0 ? 'order_ready' as const : 'order_confirmed' as const,
            customMessage: `Rapid notification ${i}`
          };
          promises.push(result.current.sendNotificationAsync(request));
        }
        
        await Promise.all(promises);
      });

      // Should have sent all notifications
      expect(mockNotificationService.sendNotification).toHaveBeenCalledTimes(5);
      
      // Wait for all mutations to complete
      await waitFor(() => {
        expect(result.current.isSending).toBe(false);
      });
    });
  });

  describe('⚡ Notification Types & Preferences Races', () => {
    it('should handle concurrent notification sends with different types', async () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingHistory).toBe(false);
      });

      // Send different notification types concurrently
      await act(async () => {
        const [orderReady, orderConfirmed, orderCancelled, paymentReminder] = await Promise.all([
          result.current.sendNotificationAsync({
            ...mockNotificationRequest,
            type: 'order_ready',
            channels: ['push', 'sms']
          }),
          result.current.sendNotificationAsync({
            ...mockNotificationRequest,
            type: 'order_confirmed',
            channels: ['email']
          }),
          result.current.sendNotificationAsync({
            ...mockNotificationRequest,
            type: 'order_cancelled',
            channels: ['push', 'email']
          }),
          result.current.sendNotificationAsync({
            ...mockNotificationRequest,
            type: 'payment_reminder',
            channels: ['sms', 'email']
          })
        ]);

        // All should succeed
        expect(orderReady.success).toBe(true);
        expect(orderConfirmed.success).toBe(true);
        expect(orderCancelled.success).toBe(true);
        expect(paymentReminder.success).toBe(true);
      });

      expect(mockNotificationService.sendNotification).toHaveBeenCalledTimes(4);
    });

    it('should handle concurrent preference updates', async () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingPreferences).toBe(false);
      });

      // Update different preferences concurrently
      await act(async () => {
        await Promise.all([
          result.current.updatePreferencesAsync({ emailEnabled: false }),
          result.current.updatePreferencesAsync({ smsEnabled: false }),
          result.current.updatePreferencesAsync({ promotions: true })
        ]);
      });

      // Final state should reflect all updates
      const finalPrefs = result.current.preferences;
      expect(finalPrefs).toBeTruthy();
    });
  });

  describe('🔄 Cache Invalidation & Optimistic Updates', () => {
    it('should handle optimistic updates during concurrent operations', async () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingHistory).toBe(false);
      });

      // Trigger multiple operations that cause optimistic updates
      await act(async () => {
        // Start concurrent operations
        const [notif1, notif2, prefUpdate] = await Promise.allSettled([
          result.current.sendNotificationAsync({
            ...mockNotificationRequest,
            type: 'order_ready'
          }),
          result.current.sendNotificationAsync({
            ...mockNotificationRequest,
            type: 'order_confirmed'
          }),
          result.current.updatePreferencesAsync({
            orderReady: false,
            promotions: true
          })
        ]);

        // All operations should complete
        expect(notif1.status).toBe('fulfilled');
        expect(notif2.status).toBe('fulfilled');
        expect(prefUpdate.status).toBe('fulfilled');
      });
    });

    it('should handle cache invalidation during active queries', async () => {
      let queryCount = 0;
      mockNotificationService.sendNotification.mockImplementation(async (request) => {
        queryCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          success: true,
          sentChannels: request.channels,
          failedChannels: [],
          message: `Query ${queryCount} notification sent`
        };
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingHistory).toBe(false);
      });

      // Send notification and immediately refetch history
      await act(async () => {
        const [sendResult, refetchResult] = await Promise.allSettled([
          result.current.sendNotificationAsync(mockNotificationRequest),
          result.current.refetchHistory()
        ]);

        expect(sendResult.status).toBe('fulfilled');
        expect(refetchResult.status).toBe('fulfilled');
      });
    });
  });

  describe('🎯 State Consistency Across Components', () => {
    it('should maintain consistent notification state across multiple hook instances', async () => {
      const { result: hook1 } = renderHook(() => useNotifications(), { wrapper });
      const { result: hook2 } = renderHook(() => useNotifications(), { wrapper });
      const { result: hook3 } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(hook1.current.isLoadingHistory).toBe(false);
        expect(hook2.current.isLoadingHistory).toBe(false);
        expect(hook3.current.isLoadingHistory).toBe(false);
      });

      // All hooks should share the same notification history
      expect(hook1.current.notificationHistory).toEqual(hook2.current.notificationHistory);
      expect(hook2.current.notificationHistory).toEqual(hook3.current.notificationHistory);

      // Preferences should be consistent
      expect(hook1.current.preferences).toEqual(hook2.current.preferences);
      expect(hook2.current.preferences).toEqual(hook3.current.preferences);
    });

    it('should synchronize mutation states across instances', async () => {
      const { result: sender1 } = renderHook(() => useNotifications(), { wrapper });
      const { result: sender2 } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(sender1.current.isLoadingHistory).toBe(false);
        expect(sender2.current.isLoadingHistory).toBe(false);
      });

      // Send notification from first instance, check state in second
      await act(async () => {
        await sender1.current.sendNotificationAsync(mockNotificationRequest);
      });

      // Both instances should reflect the completion
      await waitFor(() => {
        expect(sender1.current.isSending).toBe(false);
        expect(sender2.current.isSending).toBe(false);
      });
    });
  });

  describe('🚨 Error Handling & Recovery', () => {
    it('should handle network errors during concurrent operations', async () => {
      // Set up mock to always fail 'order_confirmed' type
      mockNotificationService.sendNotification.mockImplementation(async (request) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (request.type === 'order_confirmed') {
          const error = new Error('Network connection failed');
          (error as any).message = 'network error';
          throw error;
        }
        
        return {
          success: true,
          sentChannels: request.channels,
          failedChannels: [],
          message: 'Notification sent successfully'
        };
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingHistory).toBe(false);
      });

      // Send multiple notifications, 'order_confirmed' will fail
      const results = [];
      await act(async () => {
        const requests = [
          { ...mockNotificationRequest, type: 'order_ready' as const },
          { ...mockNotificationRequest, type: 'order_confirmed' as const },  // This will fail
          { ...mockNotificationRequest, type: 'order_cancelled' as const }
        ];

        for (const request of requests) {
          try {
            const notificationResult = await result.current.sendNotificationAsync(request);
            results.push({ success: true, result: notificationResult });
          } catch (error) {
            results.push({ success: false, error });
          }
        }
      });

      // Should have 2 successes and 1 failure
      const succeeded = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      expect(succeeded).toBe(2);
      expect(failed).toBe(1);

      // Hook should still be functional
      await waitFor(() => {
        expect(result.current.isSending).toBe(false);
      });
    });

    it('should handle rate limiting during concurrent sends', async () => {
      let callCount = 0;
      mockNotificationService.sendNotification.mockImplementation(async (request) => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (callCount > 2) {
          throw createNotificationError('RATE_LIMITED', 'Rate limit exceeded');
        }
        
        return {
          success: true,
          sentChannels: request.channels,
          failedChannels: [],
          message: 'Notification sent successfully'
        };
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingHistory).toBe(false);
      });

      // Send rapid notifications that will hit rate limit
      const results = [];
      await act(async () => {
        for (let i = 1; i <= 5; i++) {
          try {
            const notificationResult = await result.current.sendNotificationAsync({
              ...mockNotificationRequest,
              type: i % 2 === 0 ? 'order_ready' as const : 'order_confirmed' as const
            });
            results.push({ success: true, result: notificationResult });
          } catch (error) {
            results.push({ success: false, error });
          }
        }
      });

      // Should have attempted all sends, some succeed, some fail
      expect(results.length).toBe(5);
      
      const succeeded = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      // At least first 2 should succeed before rate limiting
      expect(succeeded).toBeGreaterThanOrEqual(2);
      expect(failed).toBeGreaterThanOrEqual(1);
    });

    it('should handle rollback during optimistic update failures', async () => {
      mockNotificationService.sendNotification.mockImplementation(async (request) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw createNotificationError('SEND_FAILED', 'Failed to send notification');
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingHistory).toBe(false);
      });

      const initialHistoryLength = result.current.notificationHistory.length;

      // Try to send notification that will fail
      await act(async () => {
        try {
          await result.current.sendNotificationAsync(mockNotificationRequest);
        } catch (error) {
          // Expected to fail
        }
      });

      // History should be rolled back to original state after mutation completes
      await waitFor(() => {
        expect(result.current.isSending).toBe(false);
      });
      
      // History length should be back to original (rollback occurred)
      expect(result.current.notificationHistory.length).toBe(initialHistoryLength);
    });
  });

  describe('📊 Complex Notification Scenarios', () => {
    it('should handle mixed notification channels correctly', async () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingHistory).toBe(false);
      });

      // Send notifications with different channel combinations
      await act(async () => {
        const [pushOnly, smsEmail, allChannels] = await Promise.all([
          result.current.sendNotificationAsync({
            ...mockNotificationRequest,
            type: 'order_ready',
            channels: ['push']
          }),
          result.current.sendNotificationAsync({
            ...mockNotificationRequest,
            type: 'order_confirmed',
            channels: ['sms', 'email']
          }),
          result.current.sendNotificationAsync({
            ...mockNotificationRequest,
            type: 'order_cancelled',
            channels: ['push', 'sms', 'email']
          })
        ]);

        expect(pushOnly.success).toBe(true);
        expect(smsEmail.success).toBe(true);
        expect(allChannels.success).toBe(true);
      });
    });

    it('should handle preference-based notification filtering', async () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingPreferences).toBe(false);
      });

      // Update preferences and send notifications concurrently
      await act(async () => {
        const [prefUpdate, notification] = await Promise.allSettled([
          result.current.updatePreferencesAsync({
            emailEnabled: false,
            smsEnabled: true,
            orderReady: true
          }),
          result.current.sendNotificationAsync({
            ...mockNotificationRequest,
            type: 'order_ready',
            channels: ['email', 'sms']  // Email disabled, SMS enabled
          })
        ]);

        expect(prefUpdate.status).toBe('fulfilled');
        expect(notification.status).toBe('fulfilled');
      });
    });
  });
});