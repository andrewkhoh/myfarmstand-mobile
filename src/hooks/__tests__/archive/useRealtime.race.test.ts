import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useRealtime, useRealtimeNotifications } from '../useRealtime';
import { RealtimeService } from '../../services/realtimeService';
import { User } from '../../types';

// Mock services and hooks
jest.mock('../../services/realtimeService');
jest.mock('../../hooks/useAuth', () => ({
  useCurrentUser: jest.fn()
}));
jest.mock('../../utils/broadcastFactory', () => ({
  createBroadcastHelper: () => ({
    send: jest.fn().mockResolvedValue(undefined),
    getAuthorizedChannelNames: jest.fn().mockReturnValue(['test-channel'])
  })
}));

const mockUseCurrentUser = require('../../hooks/useAuth').useCurrentUser;

describe('useRealtime Race Condition Tests', () => {
  let queryClient: QueryClient;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    phone: '555-0100',
    address: '123 Test St',
    role: 'customer',
    createdAt: new Date().toISOString()
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock implementations
    mockUseCurrentUser.mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null
    });

    (RealtimeService.getSubscriptionStatus as jest.Mock).mockReturnValue({
      totalSubscriptions: 0,
      subscriptions: [],
      allConnected: false
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('Subscription Initialization Race Conditions', () => {
    it('should handle concurrent initialization attempts', async () => {
      let initCount = 0;
      (RealtimeService.initializeAllSubscriptions as jest.Mock).mockImplementation(() => {
        initCount++;
      });

      (RealtimeService.getSubscriptionStatus as jest.Mock).mockReturnValue({
        totalSubscriptions: 3,
        subscriptions: [
          { channel: 'cart', state: 'connected', isConnected: true },
          { channel: 'orders', state: 'connected', isConnected: true },
          { channel: 'products', state: 'connected', isConnected: true }
        ],
        allConnected: true
      });

      const { result } = renderHook(() => useRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Fire multiple initialization attempts
      await act(async () => {
        const promises = Promise.all([
          result.current.initializeSubscriptionsAsync(),
          result.current.initializeSubscriptionsAsync(),
          result.current.initializeSubscriptionsAsync()
        ]);

        await promises;
      });

      // Should handle concurrent attempts gracefully
      expect(initCount).toBeGreaterThanOrEqual(3);
      expect(result.current.status.allConnected).toBe(true);
      expect(result.current.status.totalSubscriptions).toBe(3);
    });

    it('should handle initialization during cleanup', async () => {
      (RealtimeService.initializeAllSubscriptions as jest.Mock).mockImplementation(() => {
        // Simulate initialization
      });
      
      (RealtimeService.unsubscribeAll as jest.Mock).mockImplementation(() => {
        // Simulate cleanup
      });

      const { result } = renderHook(() => useRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Start initialization and cleanup simultaneously
      await act(async () => {
        const initPromise = result.current.initializeSubscriptionsAsync();
        const cleanupPromise = result.current.cleanupSubscriptionsAsync();

        await Promise.allSettled([initPromise, cleanupPromise]);
      });

      // Final state should be consistent (cleanup wins)
      expect(result.current.status.isInitialized).toBe(false);
      expect(result.current.status.totalSubscriptions).toBe(0);
    });

    it('should derive initialization state from subscription status', async () => {
      // Start with no subscriptions
      (RealtimeService.getSubscriptionStatus as jest.Mock).mockReturnValue({
        totalSubscriptions: 0,
        subscriptions: [],
        allConnected: false
      });

      const { result, rerender } = renderHook(() => useRealtime(), { wrapper });

      // Should not be initialized
      expect(result.current.status.isInitialized).toBe(false);

      // Update to have connected subscriptions
      (RealtimeService.getSubscriptionStatus as jest.Mock).mockReturnValue({
        totalSubscriptions: 3,
        subscriptions: [
          { channel: 'cart', state: 'connected', isConnected: true },
          { channel: 'orders', state: 'connected', isConnected: true },
          { channel: 'products', state: 'connected', isConnected: true }
        ],
        allConnected: true
      });

      // Trigger re-fetch
      await act(async () => {
        await result.current.forceRefresh();
      });

      // Should now be initialized (derived from subscription state)
      await waitFor(() => {
        expect(result.current.status.isInitialized).toBe(true);
      });
    });
  });

  describe('Authentication State Change Race Conditions', () => {
    it('should handle user login during pending operations', async () => {
      // Start with no user
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null
      });

      const { result, rerender } = renderHook(() => useRealtime(), { wrapper });

      // Should return safe defaults for unauthenticated
      expect(result.current.status.isInitialized).toBe(false);
      expect(result.current.error?.code).toBe('AUTHENTICATION_REQUIRED');

      // User logs in
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null
      });

      rerender();

      // Should now allow operations
      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it('should cleanup subscriptions on user logout', async () => {
      let cleanupCalled = false;
      (RealtimeService.unsubscribeAll as jest.Mock).mockImplementation(() => {
        cleanupCalled = true;
      });

      (RealtimeService.getSubscriptionStatus as jest.Mock).mockReturnValue({
        totalSubscriptions: 3,
        subscriptions: [],
        allConnected: true
      });

      // Start with authenticated user
      const { result, rerender } = renderHook(() => useRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Initialize subscriptions
      await act(async () => {
        await result.current.initializeSubscriptionsAsync();
      });

      // User logs out
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null
      });

      rerender();

      // Cleanup should be triggered
      await waitFor(() => {
        expect(cleanupCalled).toBe(true);
      });
    });

    it('should handle rapid user switching', async () => {
      const user1 = { ...mockUser, id: 'user-1' };
      const user2 = { ...mockUser, id: 'user-2', email: 'user2@example.com' };

      mockUseCurrentUser.mockReturnValue({
        data: user1,
        isLoading: false,
        error: null
      });

      const { result, rerender } = renderHook(() => useRealtime(), { wrapper });

      // Initialize for user1
      await act(async () => {
        await result.current.initializeSubscriptionsAsync();
      });

      // Switch to user2
      mockUseCurrentUser.mockReturnValue({
        data: user2,
        isLoading: false,
        error: null
      });

      rerender();

      // Switch back to user1
      mockUseCurrentUser.mockReturnValue({
        data: user1,
        isLoading: false,
        error: null
      });

      rerender();

      // Should maintain consistency
      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Refresh and Force Refresh Race Conditions', () => {
    it('should handle concurrent refresh operations', async () => {
      let refreshCount = 0;
      (RealtimeService.forceRefreshAllData as jest.Mock).mockImplementation(() => {
        refreshCount++;
      });

      const { result } = renderHook(() => useRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Multiple refresh attempts
      await act(async () => {
        result.current.forceRefresh();
        result.current.forceRefresh();
        result.current.forceRefresh();
      });

      // All refreshes should execute
      expect(refreshCount).toBe(3);
    });

    it('should handle refresh during initialization', async () => {
      (RealtimeService.initializeAllSubscriptions as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        // Start initialization
        const initPromise = result.current.initializeSubscriptionsAsync();

        // Try to refresh during initialization
        await result.current.refreshStatusAsync();

        // Complete initialization
        jest.advanceTimersByTime(100);
        await initPromise;
      });

      // Should handle gracefully
      expect(result.current.error).toBeNull();
    });
  });

  describe('Optimistic Updates and Rollback', () => {
    it('should apply optimistic updates immediately', async () => {
      const { result } = renderHook(() => useRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Mock delayed response
      (RealtimeService.initializeAllSubscriptions as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 500))
      );

      await act(async () => {
        const promise = result.current.initializeSubscriptionsAsync();

        // Check optimistic update
        expect(result.current.status.isInitialized).toBe(true);

        // Complete operation
        jest.advanceTimersByTime(500);
        await promise;
      });

      // Final state should match optimistic update
      expect(result.current.status.isInitialized).toBe(true);
    });

    it('should rollback on operation failure', async () => {
      const { result } = renderHook(() => useRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const initialStatus = result.current.status;

      (RealtimeService.initializeAllSubscriptions as jest.Mock).mockImplementation(() => {
        throw new Error('Connection failed');
      });

      await act(async () => {
        try {
          await result.current.initializeSubscriptionsAsync();
        } catch (error) {
          // Expected to fail
        }
      });

      // Should rollback to initial state
      expect(result.current.status).toEqual(initialStatus);
    });
  });

  describe('Notification Hook Race Conditions', () => {
    it('should handle rapid notification updates', async () => {
      const { result } = renderHook(() => useRealtimeNotifications(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Simulate rapid realtime updates
      await act(async () => {
        for (let i = 0; i < 10; i++) {
          const event = new CustomEvent('realtimeUpdate', {
            detail: { message: `Update ${i}` }
          });
          window.dispatchEvent(event);
        }
      });

      // Should have last update
      expect(result.current.updateCount).toBe(10);
    });

    it('should clear notifications after timeout', async () => {
      const { result } = renderHook(() => useRealtimeNotifications(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Send notification
      await act(async () => {
        const event = new CustomEvent('realtimeUpdate', {
          detail: { message: 'Test notification' }
        });
        window.dispatchEvent(event);
      });

      expect(result.current.lastUpdate).toBe('Test notification');
      expect(result.current.hasRecentUpdate).toBe(true);

      // Wait for timeout
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      // Should be cleared
      await waitFor(() => {
        expect(result.current.lastUpdate).toBeNull();
        expect(result.current.hasRecentUpdate).toBe(false);
      });
    });

    it('should handle notifications during auth changes', async () => {
      // Start authenticated
      const { result, rerender } = renderHook(() => useRealtimeNotifications(), { wrapper });

      // Send notification
      await act(async () => {
        const event = new CustomEvent('realtimeUpdate', {
          detail: { message: 'Authenticated update' }
        });
        window.dispatchEvent(event);
      });

      expect(result.current.lastUpdate).toBe('Authenticated update');

      // User logs out
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null
      });

      rerender();

      // Should return safe defaults
      expect(result.current.error?.code).toBe('AUTHENTICATION_REQUIRED');
      expect(result.current.lastUpdate).toBeNull();
    });
  });

  describe('Query Invalidation Race Conditions', () => {
    it('should invalidate related queries on realtime updates', async () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRealtimeNotifications(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Send realtime update
      await act(async () => {
        const event = new CustomEvent('realtimeUpdate', {
          detail: { message: 'Data updated' }
        });
        window.dispatchEvent(event);
      });

      // Should invalidate related queries
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['cart'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['orders'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['products'] });
    });

    it('should batch query invalidations', async () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRealtimeNotifications(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Send multiple updates rapidly
      await act(async () => {
        for (let i = 0; i < 5; i++) {
          const event = new CustomEvent('realtimeUpdate', {
            detail: { message: `Update ${i}` }
          });
          window.dispatchEvent(event);
        }
      });

      // Invalidations should be called for each update
      // React Query will batch them internally
      const cartInvalidations = invalidateSpy.mock.calls.filter(
        call => JSON.stringify(call[0]) === JSON.stringify({ queryKey: ['cart'] })
      );
      expect(cartInvalidations.length).toBe(5);
    });
  });

  describe('setTimeout Cleanup', () => {
    it('should cleanup setTimeout on unmount', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { result, unmount } = renderHook(() => useRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Trigger operation with setTimeout
      await act(async () => {
        RealtimeService.initializeAllSubscriptions();
      });

      // Unmount component
      unmount();

      // clearTimeout should have been called
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should cleanup notification timeouts properly', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { result, unmount } = renderHook(() => useRealtimeNotifications(), { wrapper });

      // Send notification (triggers setTimeout)
      await act(async () => {
        const event = new CustomEvent('realtimeUpdate', {
          detail: { message: 'Test' }
        });
        window.dispatchEvent(event);
      });

      // Send another before first timeout
      await act(async () => {
        jest.advanceTimersByTime(1000);
        const event = new CustomEvent('realtimeUpdate', {
          detail: { message: 'Test 2' }
        });
        window.dispatchEvent(event);
      });

      unmount();

      // Should cleanup all timeouts
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing user gracefully', async () => {
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null
      });

      const { result } = renderHook(() => useRealtime(), { wrapper });

      // Should return safe defaults
      expect(result.current.status.isInitialized).toBe(false);
      expect(result.current.error?.code).toBe('AUTHENTICATION_REQUIRED');

      // Operations should be no-ops with warnings
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      result.current.initializeSubscriptions();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('User not authenticated'));

      consoleWarnSpy.mockRestore();
    });

    it('should handle partial subscription success', async () => {
      (RealtimeService.getSubscriptionStatus as jest.Mock).mockReturnValue({
        totalSubscriptions: 3,
        subscriptions: [
          { channel: 'cart', state: 'connected', isConnected: true },
          { channel: 'orders', state: 'error', isConnected: false },
          { channel: 'products', state: 'connected', isConnected: true }
        ],
        allConnected: false
      });

      const { result } = renderHook(() => useRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Should not be fully initialized if not all connected
      expect(result.current.status.isInitialized).toBe(false);
      expect(result.current.status.allConnected).toBe(false);
      expect(result.current.status.totalSubscriptions).toBe(3);
    });
  });
});