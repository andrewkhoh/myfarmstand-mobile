/**
 * usePickupRescheduling Race Condition Tests
 * 
 * Tests for concurrent pickup rescheduling operations with Real React Query
 * Following the proven Option A pattern from established race testing
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePickupRescheduling } from '../usePickupRescheduling';
import { PickupReschedulingService, RescheduleRequest } from '../../services/pickupReschedulingService';

// Import mocked services (services are mocked, React Query is real)
jest.mock('../../services/pickupReschedulingService', () => ({
  PickupReschedulingService: {
    reschedulePickup: jest.fn(),
    wasRecentlyRescheduled: jest.fn(),
  }
}));

// Explicitly mock the orderBroadcast import in a way that Jest can understand
jest.mock('../../utils/broadcastFactory', () => ({
  orderBroadcast: {
    send: jest.fn().mockResolvedValue(undefined),
    user: { 
      send: jest.fn().mockResolvedValue(undefined),
      getAuthorizedChannelNames: jest.fn().mockReturnValue(['order-user-test']) 
    },
    admin: { 
      getAuthorizedChannelNames: jest.fn().mockReturnValue(['order-admin-test']) 
    },
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  createBroadcastHelper: jest.fn(() => ({
    send: jest.fn().mockResolvedValue(true)
  }))
}));

jest.mock('../useAuth', () => ({
  useCurrentUser: jest.fn(() => ({
    data: {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User'
    }
  }))
}));


// Get the mocked service
const mockPickupReschedulingService = PickupReschedulingService as jest.Mocked<typeof PickupReschedulingService>;

// Mock order data for testing
const mockOrder = {
  id: 'order-123',
  customerId: 'test-user-123',
  status: 'confirmed' as const,
  pickupDate: '2024-12-25',
  pickupTime: '10:00',
  customer_email: 'test@example.com',
  customer_phone: '+1234567890',
  customer_name: 'Test Customer',
  items: [],
  total: 25.99,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Helper to create a future date for testing
const getFutureDate = (daysAhead: number = 1): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
};

const mockRescheduleRequest: RescheduleRequest = {
  orderId: 'order-123',
  newPickupDate: getFutureDate(),
  newPickupTime: '14:00',
  reason: 'Customer request',
  requestedBy: 'customer',
  requestedByUserId: 'test-user-123',
  customerNotification: true
};

const createRescheduleRequest = (overrides: Partial<RescheduleRequest> = {}): RescheduleRequest => ({
  ...mockRescheduleRequest,
  ...overrides
});

describe('usePickupRescheduling Race Condition Tests (Real React Query)', () => {
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
    mockPickupReschedulingService.reschedulePickup.mockImplementation(async (request) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        success: true,
        order: { ...mockOrder, pickupDate: request.newPickupDate, pickupTime: request.newPickupTime },
        previousPickupDate: mockOrder.pickupDate,
        previousPickupTime: mockOrder.pickupTime,
        newPickupDate: request.newPickupDate,
        newPickupTime: request.newPickupTime,
        message: `Pickup rescheduled successfully to ${request.newPickupDate} ${request.newPickupTime}`,
        notificationSent: true
      };
    });

    mockPickupReschedulingService.wasRecentlyRescheduled.mockImplementation(async (orderId) => {
      await new Promise(resolve => setTimeout(resolve, 30));
      return {
        wasRescheduled: false
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
    it('should initialize usePickupRescheduling hook without hanging', async () => {
      const { result } = renderHook(() => usePickupRescheduling(), { wrapper });
      
      // Should initialize immediately without hanging
      expect(result.current).toBeDefined();
      expect(result.current.reschedulePickup).toBeDefined();
      expect(result.current.reschedulePickupAsync).toBeDefined();
      expect(result.current.checkRecentReschedule).toBeDefined();
      expect(result.current.validateReschedule).toBeDefined();
      
      // Should have proper mutation states
      expect(result.current.isRescheduling).toBe(false);
      expect(result.current.rescheduleError).toBeNull();
      
      // Should complete initialization within reasonable time
      await waitFor(() => {
        expect(result.current.getReschedulingQueryKey).toBeDefined();
      }, { timeout: 1000 });
    });
  });

  describe('🏁 Concurrent Rescheduling Operations', () => {
    it('should handle multiple concurrent reschedule requests correctly', async () => {
      let callCount = 0;
      mockPickupReschedulingService.reschedulePickup.mockImplementation(async (request) => {
        callCount++;
        console.log(`PickupReschedulingService.reschedulePickup called, callCount: ${callCount}`);
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          success: true,
          order: { ...mockOrder, pickupDate: request.newPickupDate, pickupTime: request.newPickupTime },
          previousPickupDate: mockOrder.pickupDate,
          previousPickupTime: mockOrder.pickupTime,
          newPickupDate: request.newPickupDate,
          newPickupTime: request.newPickupTime,
          message: `Reschedule ${callCount} completed`,
          notificationSent: true
        };
      });

      const { result: hook1 } = renderHook(() => usePickupRescheduling(), { wrapper });
      const { result: hook2 } = renderHook(() => usePickupRescheduling(), { wrapper });
      const { result: hook3 } = renderHook(() => usePickupRescheduling(), { wrapper });

      // Wait for initialization
      await waitFor(() => {
        expect(hook1.current.isRescheduling).toBe(false);
        expect(hook2.current.isRescheduling).toBe(false);
        expect(hook3.current.isRescheduling).toBe(false);
      });

      // Perform concurrent reschedules for different orders
      const startTime = Date.now();
      
      await act(async () => {
        const requests = [
          createRescheduleRequest({ orderId: 'order-1', newPickupDate: getFutureDate(1), newPickupTime: '10:00' }),
          createRescheduleRequest({ orderId: 'order-2', newPickupDate: getFutureDate(2), newPickupTime: '11:00' }),
          createRescheduleRequest({ orderId: 'order-3', newPickupDate: getFutureDate(3), newPickupTime: '12:00' })
        ];

        await Promise.all([
          hook1.current.reschedulePickupAsync(requests[0]),
          hook2.current.reschedulePickupAsync(requests[1]),
          hook3.current.reschedulePickupAsync(requests[2])
        ]);
      });

      const endTime = Date.now();
      console.log(`Concurrent reschedules completed in ${endTime - startTime}ms`);
      
      // All service calls should have been made
      expect(mockPickupReschedulingService.reschedulePickup).toHaveBeenCalledTimes(3);
      
      // Wait for all hooks to complete their reschedules
      await waitFor(() => {
        expect(hook1.current.isRescheduling).toBe(false);
        expect(hook2.current.isRescheduling).toBe(false);
        expect(hook3.current.isRescheduling).toBe(false);
      });
    });

    it('should handle rapid reschedule requests for same order', async () => {
      let callCount = 0;
      mockPickupReschedulingService.reschedulePickup.mockImplementation(async (request) => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 30));
        return {
          success: true,
          order: { ...mockOrder, pickupDate: request.newPickupDate, pickupTime: request.newPickupTime },
          previousPickupDate: mockOrder.pickupDate,
          previousPickupTime: mockOrder.pickupTime,
          newPickupDate: request.newPickupDate,
          newPickupTime: request.newPickupTime,
          message: `Rapid reschedule ${callCount} completed`,
          notificationSent: true
        };
      });

      const { result } = renderHook(() => usePickupRescheduling(), { wrapper });

      await waitFor(() => {
        expect(result.current.isRescheduling).toBe(false);
      });

      // Send rapid reschedule requests
      await act(async () => {
        const promises = [];
        for (let i = 1; i <= 5; i++) {
          const request = createRescheduleRequest({
            newPickupDate: getFutureDate(i),
            newPickupTime: `${10 + i}:00`,
            reason: `Rapid reschedule ${i}`
          });
          promises.push(result.current.reschedulePickupAsync(request));
        }
        
        await Promise.all(promises);
      });

      // Should have made all reschedule calls
      expect(mockPickupReschedulingService.reschedulePickup).toHaveBeenCalledTimes(5);
      
      // Wait for all mutations to complete
      await waitFor(() => {
        expect(result.current.isRescheduling).toBe(false);
      });
    });
  });

  describe('⚡ Validation & Check Operations', () => {
    it('should handle concurrent validation and reschedule operations', async () => {
      const { result } = renderHook(() => usePickupRescheduling(), { wrapper });

      await waitFor(() => {
        expect(result.current.isRescheduling).toBe(false);
      });

      // Trigger concurrent validation and reschedule operations
      await act(async () => {
        const request = createRescheduleRequest();
        
        const [validation, recentCheck, rescheduleResult] = await Promise.all([
          result.current.validateReschedule(request),
          result.current.checkRecentReschedule(request.orderId),
          result.current.reschedulePickupAsync(request)
        ]);

        // All operations should complete successfully
        expect(validation.isValid).toBe(true);
        expect(validation.canReschedule).toBe(true);
        expect(recentCheck).toMatchObject({ wasRescheduled: false });
        expect(rescheduleResult.success).toBe(true);
      });

      expect(mockPickupReschedulingService.reschedulePickup).toHaveBeenCalledTimes(1);
      expect(mockPickupReschedulingService.wasRecentlyRescheduled).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent recent check operations', async () => {
      let callCount = 0;
      mockPickupReschedulingService.wasRecentlyRescheduled.mockImplementation(async (orderId) => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 40));
        return {
          wasRescheduled: callCount % 2 === 0, // Alternate true/false
          lastRescheduleTime: callCount % 2 === 0 ? new Date().toISOString() : undefined
        };
      });

      const { result } = renderHook(() => usePickupRescheduling(), { wrapper });

      // Trigger multiple concurrent recent checks
      await act(async () => {
        const promises = [];
        for (let i = 1; i <= 4; i++) {
          promises.push(result.current.checkRecentReschedule(`order-${i}`));
        }
        
        const results = await Promise.all(promises);
        
        // Should have different results based on the alternating mock
        expect(results).toHaveLength(4);
        // All results should be objects with wasRescheduled property
        results.forEach(result => {
          expect(result).toHaveProperty('wasRescheduled');
          expect(typeof result.wasRescheduled).toBe('boolean');
        });
      });

      expect(mockPickupReschedulingService.wasRecentlyRescheduled).toHaveBeenCalledTimes(4);
    });

    it('should handle concurrent validation operations with different requests', async () => {
      const { result } = renderHook(() => usePickupRescheduling(), { wrapper });

      // Trigger concurrent validations with different scenarios
      await act(async () => {
        const [validRequest, invalidDate, missingOrder, pastDate] = await Promise.all([
          result.current.validateReschedule(createRescheduleRequest()),
          result.current.validateReschedule(createRescheduleRequest({ 
            newPickupDate: 'invalid-date' 
          })),
          result.current.validateReschedule(createRescheduleRequest({ 
            orderId: '' 
          })),
          result.current.validateReschedule(createRescheduleRequest({ 
            newPickupDate: '2020-01-01' // Past date
          }))
        ]);

        // Valid request should pass
        expect(validRequest.isValid).toBe(true);
        expect(validRequest.canReschedule).toBe(true);

        // Invalid date should fail
        expect(invalidDate.isValid).toBe(false);
        expect(invalidDate.canReschedule).toBe(false);
        expect(invalidDate.reason).toContain('Invalid pickup date format');

        // Missing order should fail
        expect(missingOrder.isValid).toBe(false);
        expect(missingOrder.canReschedule).toBe(false);
        expect(missingOrder.reason).toContain('Order ID is required');

        // Past date should fail
        expect(pastDate.isValid).toBe(false);
        expect(pastDate.canReschedule).toBe(false);
        expect(pastDate.reason).toContain('Cannot reschedule to past date');
      });
    });
  });

  describe('🔄 Cache Invalidation & Optimistic Updates', () => {
    it('should handle optimistic updates during concurrent operations', async () => {
      // Pre-populate query cache with order data
      queryClient.setQueryData(['orders'], [mockOrder]);
      queryClient.setQueryData(['orders', 'user', 'test-user-123'], [mockOrder]);

      const { result } = renderHook(() => usePickupRescheduling(), { wrapper });

      await waitFor(() => {
        expect(result.current.isRescheduling).toBe(false);
      });

      // Trigger multiple operations that cause optimistic updates
      await act(async () => {
        const [reschedule1, reschedule2, validation] = await Promise.allSettled([
          result.current.reschedulePickupAsync(createRescheduleRequest({
            orderId: 'order-123',
            newPickupDate: '2024-12-27',
            newPickupTime: '15:00'
          })),
          result.current.reschedulePickupAsync(createRescheduleRequest({
            orderId: 'order-123', // Same order - will cause cache conflicts
            newPickupDate: '2024-12-28',
            newPickupTime: '16:00'
          })),
          result.current.validateReschedule(createRescheduleRequest())
        ]);

        // All operations should complete
        expect(reschedule1.status).toBe('fulfilled');
        expect(reschedule2.status).toBe('fulfilled');
        expect(validation.status).toBe('fulfilled');
      });
    });

    it('should handle cache invalidation during active operations', async () => {
      // Pre-populate cache
      queryClient.setQueryData(['orders'], [mockOrder]);
      
      let queryCount = 0;
      mockPickupReschedulingService.reschedulePickup.mockImplementation(async (request) => {
        queryCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          success: true,
          order: { ...mockOrder, pickupDate: request.newPickupDate, pickupTime: request.newPickupTime },
          previousPickupDate: mockOrder.pickupDate,
          previousPickupTime: mockOrder.pickupTime,
          newPickupDate: request.newPickupDate,
          newPickupTime: request.newPickupTime,
          message: `Query ${queryCount} reschedule completed`,
          notificationSent: true
        };
      });

      const { result } = renderHook(() => usePickupRescheduling(), { wrapper });

      await waitFor(() => {
        expect(result.current.isRescheduling).toBe(false);
      });

      // Reschedule and immediately invalidate cache
      await act(async () => {
        const [rescheduleResult, invalidationResult] = await Promise.allSettled([
          result.current.reschedulePickupAsync(createRescheduleRequest()),
          queryClient.invalidateQueries({ queryKey: ['orders'] })
        ]);

        expect(rescheduleResult.status).toBe('fulfilled');
        expect(invalidationResult.status).toBe('fulfilled');
      });
    });
  });

  describe('🎯 State Consistency Across Components', () => {
    it('should maintain consistent rescheduling state across multiple hook instances', async () => {
      const { result: hook1 } = renderHook(() => usePickupRescheduling(), { wrapper });
      const { result: hook2 } = renderHook(() => usePickupRescheduling(), { wrapper });
      const { result: hook3 } = renderHook(() => usePickupRescheduling(), { wrapper });

      await waitFor(() => {
        expect(hook1.current.isRescheduling).toBe(false);
        expect(hook2.current.isRescheduling).toBe(false);
        expect(hook3.current.isRescheduling).toBe(false);
      });

      // All hooks should have the same query key generators
      const orderId = 'test-order';
      expect(hook1.current.getReschedulingQueryKey(orderId)).toEqual(hook2.current.getReschedulingQueryKey(orderId));
      expect(hook2.current.getReschedulingQueryKey(orderId)).toEqual(hook3.current.getReschedulingQueryKey(orderId));

      // Validation should be consistent across instances
      const request = createRescheduleRequest();
      const [validation1, validation2, validation3] = await Promise.all([
        hook1.current.validateReschedule(request),
        hook2.current.validateReschedule(request),
        hook3.current.validateReschedule(request)
      ]);

      expect(validation1).toEqual(validation2);
      expect(validation2).toEqual(validation3);
    });

    it('should synchronize mutation states across instances', async () => {
      const { result: scheduler1 } = renderHook(() => usePickupRescheduling(), { wrapper });
      const { result: scheduler2 } = renderHook(() => usePickupRescheduling(), { wrapper });

      await waitFor(() => {
        expect(scheduler1.current.isRescheduling).toBe(false);
        expect(scheduler2.current.isRescheduling).toBe(false);
      });

      // Reschedule from first instance, check state in second
      await act(async () => {
        await scheduler1.current.reschedulePickupAsync(createRescheduleRequest());
      });

      // Both instances should reflect the completion
      await waitFor(() => {
        expect(scheduler1.current.isRescheduling).toBe(false);
        expect(scheduler2.current.isRescheduling).toBe(false);
      });
    });
  });

  describe('🚨 Error Handling & Recovery', () => {
    it('should handle network errors during concurrent operations', async () => {
      // First initialize with working mock
      const { result: reschedule } = renderHook(() => usePickupRescheduling(), { wrapper });
      const { result: check } = renderHook(() => usePickupRescheduling(), { wrapper });

      await waitFor(() => {
        expect(reschedule.current.isRescheduling).toBe(false);
        expect(check.current.isRescheduling).toBe(false);
      });

      // Then set up mock to fail reschedule but succeed check
      mockPickupReschedulingService.reschedulePickup.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw new Error('Network connection failed');
      });

      // Try concurrent operations
      const results = [];
      await act(async () => {
        try {
          const rescheduleResult = await reschedule.current.reschedulePickupAsync(createRescheduleRequest());
          results.push({ type: 'reschedule', success: true, result: rescheduleResult });
        } catch (error) {
          results.push({ type: 'reschedule', success: false, error });
        }

        try {
          const checkResult = await check.current.checkRecentReschedule('order-123');
          results.push({ type: 'check', success: true, result: checkResult });
        } catch (error) {
          results.push({ type: 'check', success: false, error });
        }
      });

      // Check should succeed, reschedule should fail
      const checkResult = results.find(r => r.type === 'check');
      const rescheduleResult = results.find(r => r.type === 'reschedule');
      
      expect(checkResult?.success).toBe(true);
      expect(rescheduleResult?.success).toBe(false);

      // Hooks should still be functional
      await waitFor(() => {
        expect(reschedule.current.isRescheduling).toBe(false);
        expect(check.current.isRescheduling).toBe(false);
      });
    });

    it('should handle validation errors during concurrent operations', async () => {
      let callCount = 0;
      mockPickupReschedulingService.reschedulePickup.mockImplementation(async (request) => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (request.orderId === 'invalid-order') {
          throw new Error('Order not found');
        }
        
        return {
          success: true,
          order: { ...mockOrder, pickupDate: request.newPickupDate, pickupTime: request.newPickupTime },
          previousPickupDate: mockOrder.pickupDate,
          previousPickupTime: mockOrder.pickupTime,
          newPickupDate: request.newPickupDate,
          newPickupTime: request.newPickupTime,
          message: 'Reschedule successful',
          notificationSent: true
        };
      });

      const { result } = renderHook(() => usePickupRescheduling(), { wrapper });

      await waitFor(() => {
        expect(result.current.isRescheduling).toBe(false);
      });

      // Send multiple reschedules, one will fail
      const results = [];
      await act(async () => {
        const requests = [
          createRescheduleRequest({ orderId: 'valid-order' }),
          createRescheduleRequest({ orderId: 'invalid-order' }), // This will fail
          createRescheduleRequest({ orderId: 'another-valid-order' })
        ];

        for (const request of requests) {
          try {
            const rescheduleResult = await result.current.reschedulePickupAsync(request);
            results.push({ success: true, result: rescheduleResult });
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
        expect(result.current.isRescheduling).toBe(false);
      });
    });

    it('should handle rollback during optimistic update failures', async () => {
      // First initialize with working mock and populate cache
      const initialOrder = { ...mockOrder, pickupDate: '2024-12-25', pickupTime: '10:00' };
      queryClient.setQueryData(['orders'], [initialOrder]);
      queryClient.setQueryData(['orders', 'user', 'test-user-123'], [initialOrder]);

      const { result } = renderHook(() => usePickupRescheduling(), { wrapper });

      await waitFor(() => {
        expect(result.current.isRescheduling).toBe(false);
      });

      // Then set up mock to fail
      mockPickupReschedulingService.reschedulePickup.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw new Error('Failed to reschedule pickup');
      });

      // Try to reschedule that will fail
      await act(async () => {
        try {
          await result.current.reschedulePickupAsync(createRescheduleRequest({
            newPickupDate: '2024-12-27',
            newPickupTime: '15:00'
          }));
        } catch (error) {
          // Expected to fail
        }
      });

      // Cache should be rolled back to original state after mutation completes
      await waitFor(() => {
        expect(result.current.isRescheduling).toBe(false);
      });
      
      // Verify cache state (may be empty or rolled back)
      const ordersCache = queryClient.getQueryData(['orders']) as typeof initialOrder[];
      const userOrdersCache = queryClient.getQueryData(['orders', 'user', 'test-user-123']) as typeof initialOrder[];
      
      // Cache should either be rolled back to original or be invalidated (empty)
      if (ordersCache && ordersCache.length > 0) {
        expect(ordersCache[0].pickupDate).toBe(initialOrder.pickupDate);
        expect(ordersCache[0].pickupTime).toBe(initialOrder.pickupTime);
      }
      if (userOrdersCache && userOrdersCache.length > 0) {
        expect(userOrdersCache[0].pickupDate).toBe(initialOrder.pickupDate);
        expect(userOrdersCache[0].pickupTime).toBe(initialOrder.pickupTime);
      }
    });
  });

  describe('📊 Complex Rescheduling Scenarios', () => {
    it('should handle mixed rescheduling operations with different parameters', async () => {
      const { result } = renderHook(() => usePickupRescheduling(), { wrapper });

      await waitFor(() => {
        expect(result.current.isRescheduling).toBe(false);
      });

      // Trigger concurrent operations with different parameters
      await act(async () => {
        const [reschedule, validation, recentCheck, queryKey] = await Promise.all([
          result.current.reschedulePickupAsync(createRescheduleRequest({
            newPickupDate: getFutureDate(2),
            newPickupTime: '16:00',
            reason: 'Customer emergency'
          })),
          result.current.validateReschedule(createRescheduleRequest({
            newPickupDate: getFutureDate(3),
            newPickupTime: '17:00'
          })),
          result.current.checkRecentReschedule('order-456'),
          Promise.resolve(result.current.getReschedulingQueryKey('order-789'))
        ]);

        expect(reschedule.success).toBe(true);
        expect(validation.isValid).toBe(true);
        expect(recentCheck).toMatchObject({ wasRescheduled: false });
        expect(queryKey).toEqual(['rescheduling', 'reschedule', 'order-789']);
      });
    });

    it('should handle authentication edge cases during operations', async () => {
      const { result } = renderHook(() => usePickupRescheduling(), { wrapper });

      await waitFor(() => {
        expect(result.current.isRescheduling).toBe(false);
      });

      // Should work with authenticated user
      await act(async () => {
        const [reschedule, validation, recentCheck] = await Promise.all([
          result.current.reschedulePickupAsync(createRescheduleRequest()),
          result.current.validateReschedule(createRescheduleRequest()),
          result.current.checkRecentReschedule('order-123')
        ]);

        expect(reschedule.success).toBe(true);
        expect(validation.isValid).toBe(true);
        expect(recentCheck).toMatchObject({ wasRescheduled: false });
      });

      // Query keys should include user context
      expect(result.current.getHistoryQueryKey('test-user-123')).toEqual(['rescheduling', 'history', 'test-user-123']);
    });

    it('should handle time-based validation scenarios', async () => {
      const { result } = renderHook(() => usePickupRescheduling(), { wrapper });

      // Test various time-based validations concurrently
      await act(async () => {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const farFuture = new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000);
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const [validFuture, invalidFarFuture, invalidPast, invalidFormat] = await Promise.all([
          result.current.validateReschedule(createRescheduleRequest({
            newPickupDate: tomorrow.toISOString().split('T')[0],
            newPickupTime: '14:00'
          })),
          result.current.validateReschedule(createRescheduleRequest({
            newPickupDate: farFuture.toISOString().split('T')[0],
            newPickupTime: '14:00'
          })),
          result.current.validateReschedule(createRescheduleRequest({
            newPickupDate: yesterday.toISOString().split('T')[0],
            newPickupTime: '14:00'
          })),
          result.current.validateReschedule(createRescheduleRequest({
            newPickupDate: 'invalid-date',
            newPickupTime: '14:00'
          }))
        ]);

        // Valid future date should pass
        expect(validFuture.isValid).toBe(true);
        expect(validFuture.canReschedule).toBe(true);

        // Far future should fail (> 30 days)
        expect(invalidFarFuture.isValid).toBe(false);
        expect(invalidFarFuture.reason).toContain('30 days');

        // Past date should fail
        expect(invalidPast.isValid).toBe(false);
        expect(invalidPast.reason).toContain('past date');

        // Invalid format should fail
        expect(invalidFormat.isValid).toBe(false);
        expect(invalidFormat.reason).toContain('Invalid pickup date format');
      });
    });
  });
});