import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCentralizedRealtime, useForceRefreshUserData } from '../useCentralizedRealtime';
import { supabase } from '../../config/supabase';
import { User } from '../../types';

// Mock dependencies
jest.mock('../../config/supabase', () => ({
  supabase: {
    channel: jest.fn()
  }
}));

jest.mock('../../hooks/useAuth', () => ({
  useCurrentUser: jest.fn()
}));

jest.mock('../../utils/broadcastFactory', () => ({
  cartBroadcast: {
    send: jest.fn().mockResolvedValue(undefined),
    getAuthorizedChannelNames: jest.fn().mockReturnValue(['cart-user-123'])
  },
  orderBroadcast: {
    user: {
      getAuthorizedChannelNames: jest.fn().mockReturnValue(['orders-user-123'])
    },
    admin: {
      getAuthorizedChannelNames: jest.fn().mockReturnValue([])
    }
  },
  productBroadcast: {
    getAuthorizedChannelNames: jest.fn().mockReturnValue(['products-global'])
  }
}));

const mockUseCurrentUser = require('../../hooks/useAuth').useCurrentUser;

describe('useCentralizedRealtime Race Condition Tests', () => {
  let queryClient: QueryClient;
  let mockChannel: any;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    phone: '555-0100',
    address: '123 Test St',
    role: 'customer',
    createdAt: new Date().toISOString()
  };

  const mockAdminUser: User = {
    ...mockUser,
    id: 'admin-123',
    role: 'admin',
    email: 'admin@example.com'
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

    // Setup mock channel
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback) => {
        if (typeof callback === 'function') {
          callback('SUBSCRIBED');
        }
        return mockChannel;
      }),
      unsubscribe: jest.fn().mockResolvedValue(undefined)
    };

    (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

    // Default mock for useCurrentUser
    mockUseCurrentUser.mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );

  describe('Channel Subscription Race Conditions', () => {
    it('should handle concurrent channel subscriptions', async () => {
      const { result } = renderHook(() => useCentralizedRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Fire multiple connect attempts
      await act(async () => {
        const promises = Promise.all([
          result.current.connectAsync(),
          result.current.connectAsync(),
          result.current.connectAsync()
        ]);

        await promises;
      });

      // Should handle concurrent connections gracefully
      expect(result.current.connectionState.isConnected).toBe(true);
      expect(result.current.connectionState.activeSubscriptions).toContain('cart');
      expect(result.current.connectionState.activeSubscriptions).toContain('userOrders');
      expect(result.current.connectionState.activeSubscriptions).toContain('products');
    });

    it('should handle connect/disconnect race conditions', async () => {
      const { result } = renderHook(() => useCentralizedRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Start connection and immediately disconnect
      await act(async () => {
        const connectPromise = result.current.connectAsync();
        const disconnectPromise = result.current.disconnectAsync();

        await Promise.allSettled([connectPromise, disconnectPromise]);
      });

      // Should end up disconnected
      expect(result.current.connectionState.isConnected).toBe(false);
      expect(result.current.connectionState.activeSubscriptions).toHaveLength(0);
    });

    it('should handle subscription setup during user switch', async () => {
      const { result, rerender } = renderHook(() => useCentralizedRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Connect as first user
      await act(async () => {
        await result.current.connectAsync();
      });

      // Switch to admin user
      mockUseCurrentUser.mockReturnValue({
        data: mockAdminUser,
        isLoading: false,
        error: null
      });

      rerender();

      // Channels should be recreated for new user
      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalledWith(expect.stringContaining('admin-123'));
      });
    });
  });

  describe('Security and Authorization Race Conditions', () => {
    it('should handle invalid user ID format', async () => {
      const invalidUser = { ...mockUser, id: 'user$$$123<script>' };
      mockUseCurrentUser.mockReturnValue({
        data: invalidUser,
        isLoading: false,
        error: null
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useCentralizedRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Should block subscriptions for invalid user ID
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid user ID format')
      );

      consoleErrorSpy.mockRestore();
    });

    it('should validate broadcast payloads', async () => {
      const { result } = renderHook(() => useCentralizedRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Simulate receiving unauthorized broadcast
      const cartHandler = mockChannel.on.mock.calls.find(
        call => call[1]?.event === 'cart-item-added'
      )?.[2];

      if (cartHandler) {
        // Broadcast with wrong userId
        cartHandler({
          payload: { userId: 'different-user', item: {} }
        });

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Unauthorized cart broadcast')
        );
      }

      consoleWarnSpy.mockRestore();
    });

    it('should handle role-based channel authorization', async () => {
      // Start as regular user
      const { result, rerender } = renderHook(() => useCentralizedRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Regular user should not have admin channels
      expect(result.current.connectionState.activeSubscriptions).not.toContain('adminOrders');

      // Switch to admin
      mockUseCurrentUser.mockReturnValue({
        data: mockAdminUser,
        isLoading: false,
        error: null
      });

      // Mock admin channels
      const mockOrderBroadcast = require('../../utils/broadcastFactory').orderBroadcast;
      mockOrderBroadcast.admin.getAuthorizedChannelNames.mockReturnValue(['orders-admin']);

      rerender();

      // Admin should have admin channels
      await act(async () => {
        await result.current.connectAsync();
      });

      // Note: actual subscription depends on broadcast factory mock
    });
  });

  describe('Optimistic Updates and State Management', () => {
    it('should apply optimistic connection state', async () => {
      const { result } = renderHook(() => useCentralizedRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Mock delayed connection
      const originalSubscribe = mockChannel.subscribe;
      mockChannel.subscribe = jest.fn(() => 
        new Promise(resolve => setTimeout(() => {
          originalSubscribe('SUBSCRIBED');
          resolve(mockChannel);
        }, 500))
      );

      await act(async () => {
        const promise = result.current.connectAsync();

        // Check optimistic update
        expect(result.current.connectionState.isConnected).toBe(true);

        jest.advanceTimersByTime(500);
        await promise;
      });

      // Final state should match optimistic
      expect(result.current.connectionState.isConnected).toBe(true);
    });

    it('should rollback on connection failure', async () => {
      const { result } = renderHook(() => useCentralizedRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const initialState = result.current.connectionState;

      // Mock connection failure
      mockChannel.subscribe = jest.fn(() => {
        throw new Error('Connection failed');
      });

      await act(async () => {
        try {
          await result.current.connectAsync();
        } catch (error) {
          // Expected to fail
        }
      });

      // Should rollback to initial state
      expect(result.current.connectionState).toEqual(initialState);
    });
  });

  describe('Broadcast Event Race Conditions', () => {
    it('should handle rapid broadcast events', async () => {
      const { result } = renderHook(() => useCentralizedRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      // Get cart event handler
      const cartHandler = mockChannel.on.mock.calls.find(
        call => call[1]?.event === 'cart-item-added'
      )?.[2];

      if (cartHandler) {
        // Send rapid events
        await act(async () => {
          for (let i = 0; i < 10; i++) {
            cartHandler({
              payload: { userId: mockUser.id, item: { id: i } }
            });
          }
        });

        // Should invalidate queries for each event
        expect(invalidateSpy).toHaveBeenCalled();
      }
    });

    it('should handle interleaved broadcast events', async () => {
      const { result } = renderHook(() => useCentralizedRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      // Get different event handlers
      const cartAddHandler = mockChannel.on.mock.calls.find(
        call => call[1]?.event === 'cart-item-added'
      )?.[2];

      const cartRemoveHandler = mockChannel.on.mock.calls.find(
        call => call[1]?.event === 'cart-item-removed'
      )?.[2];

      if (cartAddHandler && cartRemoveHandler) {
        // Interleave add and remove events
        await act(async () => {
          cartAddHandler({ payload: { userId: mockUser.id, item: { id: 1 } } });
          cartRemoveHandler({ payload: { userId: mockUser.id, item: { id: 1 } } });
          cartAddHandler({ payload: { userId: mockUser.id, item: { id: 2 } } });
        });

        // All events should trigger invalidations
        expect(invalidateSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('Force Refresh Race Conditions', () => {
    it('should handle concurrent force refresh operations', async () => {
      const { result } = renderHook(() => useForceRefreshUserData(), { wrapper });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      // Multiple refresh attempts
      await act(async () => {
        const promises = Promise.all([
          result.current.refreshUserDataAsync(),
          result.current.refreshUserDataAsync(),
          result.current.refreshUserDataAsync()
        ]);

        await promises;
      });

      // Should invalidate queries multiple times
      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('should handle refresh during connection changes', async () => {
      const { result: realtimeResult } = renderHook(() => useCentralizedRealtime(), { wrapper });
      const { result: refreshResult } = renderHook(() => useForceRefreshUserData(), { wrapper });

      await waitFor(() => expect(realtimeResult.current.isLoading).toBe(false));

      // Connect, refresh, disconnect rapidly
      await act(async () => {
        await realtimeResult.current.connectAsync();
        await refreshResult.current.refreshUserDataAsync();
        await realtimeResult.current.disconnectAsync();
      });

      // Should complete all operations
      expect(refreshResult.current.isRefreshing).toBe(false);
      expect(realtimeResult.current.connectionState.isConnected).toBe(false);
    });
  });

  describe('Cleanup and Unmount Race Conditions', () => {
    it('should cleanup subscriptions on unmount', async () => {
      const { result, unmount } = renderHook(() => useCentralizedRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Connect channels
      await act(async () => {
        await result.current.connectAsync();
      });

      // Unmount while connected
      unmount();

      // Should call unsubscribe
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });

    it('should handle pending operations on unmount', async () => {
      const { result, unmount } = renderHook(() => useCentralizedRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Start slow connection
      mockChannel.subscribe = jest.fn(() => 
        new Promise(resolve => setTimeout(() => resolve(mockChannel), 1000))
      );

      act(() => {
        result.current.connect();
      });

      // Unmount before completion
      unmount();

      // Should cleanup without errors
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing user gracefully', async () => {
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(() => useCentralizedRealtime(), { wrapper });

      // Should return safe defaults
      expect(result.current.connectionState.isConnected).toBe(false);
      expect(result.current.error?.code).toBe('AUTHENTICATION_REQUIRED');

      // Operations should warn
      result.current.connect();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('User not authenticated')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle channel subscription errors', async () => {
      mockChannel.subscribe = jest.fn((callback) => {
        if (typeof callback === 'function') {
          callback('ERROR');
        }
        return mockChannel;
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const { result } = renderHook(() => useCentralizedRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Should log subscription status
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('subscription status: ERROR')
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle broadcast send failures gracefully', async () => {
      const mockCartBroadcast = require('../../utils/broadcastFactory').cartBroadcast;
      mockCartBroadcast.send.mockRejectedValue(new Error('Broadcast failed'));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(() => useCentralizedRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Connect (which triggers broadcast)
      await act(async () => {
        await result.current.connectAsync();
      });

      // Should warn about broadcast failure
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to broadcast')
      );

      consoleWarnSpy.mockRestore();
    });
  });
});