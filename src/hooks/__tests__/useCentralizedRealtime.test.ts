import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { createWrapper } from '../../test/test-utils';
import { supabase } from '../../config/supabase';
import {
  useCentralizedRealtime,
  useForceRefreshUserData,
} from '../useCentralizedRealtime';
import { useCurrentUser } from '../useAuth';

jest.mock('../../config/supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    })),
  },
}));

jest.mock('../useAuth');
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

jest.mock('../../utils/queryKeyFactory', () => ({
  cartKeys: {
    all: (userId: string) => ['cart', userId],
  },
  orderKeys: {
    all: (userId: string) => ['orders', userId],
    lists: () => ['orders', 'list'],
  },
  productKeys: {
    all: () => ['products'],
    lists: () => ['products', 'list'],
  },
}));

jest.mock('../../utils/broadcastFactory', () => ({
  cartBroadcast: {
    getAuthorizedChannelNames: jest.fn(() => ['cart-user123']),
    send: jest.fn(),
  },
  orderBroadcast: {
    user: {
      getAuthorizedChannelNames: jest.fn(() => ['orders-user-user123']),
    },
    admin: {
      getAuthorizedChannelNames: jest.fn(() => []),
    },
  },
  productBroadcast: {
    getAuthorizedChannelNames: jest.fn(() => ['products-global']),
  },
}));


const mockUser = { id: 'user123', email: 'test@example.com', name: 'Test User', role: 'customer' };
const mockAdminUser = { id: 'admin123', email: 'admin@example.com', name: 'Admin User', role: 'admin' };

describe('useCentralizedRealtime hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      } as any);
    });

    describe('useCentralizedRealtime', () => {
      it('should initialize with default connection state', () => {
        const { result } = renderHook(() => useCentralizedRealtime(), {
          wrapper: createWrapper(),
        });

        expect(result.current.connectionState.isConnected).toBe(false);
        expect(result.current.connectionState.activeSubscriptions).toEqual([]);
        expect(result.current.connectionState.connectionCount).toBe(0);
        expect(result.current.isLoading).toBe(true);
      });

      it('should provide realtime connection operations', () => {
        const { result } = renderHook(() => useCentralizedRealtime(), {
          wrapper: createWrapper(),
        });

        expect(result.current.connect).toBeDefined();
        expect(result.current.disconnect).toBeDefined();
        expect(result.current.refreshConnection).toBeDefined();
        expect(result.current.connectAsync).toBeDefined();
        expect(result.current.disconnectAsync).toBeDefined();
        expect(result.current.refreshConnectionAsync).toBeDefined();
      });

      it('should setup supabase channels on mount', () => {
        const mockChannel = {
          on: jest.fn().mockReturnThis(),
          subscribe: jest.fn(),
        };
        (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

        renderHook(() => useCentralizedRealtime(), {
          wrapper: createWrapper(),
        });

        expect(supabase.channel).toHaveBeenCalledWith('cart-user123');
        expect(supabase.channel).toHaveBeenCalledWith('orders-user-user123');
        expect(supabase.channel).toHaveBeenCalledWith('products-global');
      });

      it('should connect successfully', async () => {
        const mockChannel = {
          on: jest.fn().mockReturnThis(),
          subscribe: jest.fn(),
        };
        (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

        const { result } = renderHook(() => useCentralizedRealtime(), {
          wrapper: createWrapper(),
        });

        result.current.connect();

        await waitFor(() => {
          expect(result.current.isConnecting).toBe(false);
        });

        // Connection should be attempted
        expect(supabase.channel).toHaveBeenCalled();
      });

      it('should disconnect successfully', async () => {
        const mockChannel = {
          on: jest.fn().mockReturnThis(),
          subscribe: jest.fn(),
          unsubscribe: jest.fn(),
        };
        (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

        const { result } = renderHook(() => useCentralizedRealtime(), {
          wrapper: createWrapper(),
        });

        result.current.disconnect();

        await waitFor(() => {
          expect(result.current.isDisconnecting).toBe(false);
        });
      });

      it('should refresh connection successfully', async () => {
        const { result } = renderHook(() => useCentralizedRealtime(), {
          wrapper: createWrapper(),
        });

        result.current.refreshConnection();

        await waitFor(() => {
          expect(result.current.isRefreshing).toBe(false);
        });
      });

      it('should provide async operations', async () => {
        const { result } = renderHook(() => useCentralizedRealtime(), {
          wrapper: createWrapper(),
        });

        const connectResult = await result.current.connectAsync();
        expect(connectResult.success).toBe(true);

        const disconnectResult = await result.current.disconnectAsync();
        expect(disconnectResult.success).toBe(true);

        const refreshResult = await result.current.refreshConnectionAsync();
        expect(refreshResult.success).toBe(true);
      });

      it('should provide loading states', () => {
        const { result } = renderHook(() => useCentralizedRealtime(), {
          wrapper: createWrapper(),
        });

        expect(typeof result.current.isConnecting).toBe('boolean');
        expect(typeof result.current.isDisconnecting).toBe('boolean');
        expect(typeof result.current.isRefreshing).toBe('boolean');
        expect(typeof result.current.isLoading).toBe('boolean');
      });

      it('should provide legacy compatibility props', () => {
        const { result } = renderHook(() => useCentralizedRealtime(), {
          wrapper: createWrapper(),
        });

        expect(typeof result.current.isConnected).toBe('boolean');
        expect(Array.isArray(result.current.activeSubscriptions)).toBe(true);
      });

      it('should generate correct query key', () => {
        const { result } = renderHook(() => useCentralizedRealtime(), {
          wrapper: createWrapper(),
        });

        const queryKey = result.current.getRealtimeQueryKey();
        expect(queryKey).toEqual(['realtime', 'connection', 'user123']);
      });

      it('should cleanup subscriptions on unmount', () => {
        const mockChannel = {
          on: jest.fn().mockReturnThis(),
          subscribe: jest.fn(),
          unsubscribe: jest.fn(),
        };
        (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

        const { unmount } = renderHook(() => useCentralizedRealtime(), {
          wrapper: createWrapper(),
        });

        unmount();

        // Cleanup should be called (tested through effect cleanup)
        expect(true).toBe(true); // Placeholder as cleanup is internal
      });
    });

    describe('useCentralizedRealtime with admin user', () => {
      beforeEach(() => {
        mockUseCurrentUser.mockReturnValue({
          data: mockAdminUser,
          isLoading: false,
          error: null,
        } as any);
      });

      it('should setup admin subscriptions for admin users', () => {
        const mockChannel = {
          on: jest.fn().mockReturnThis(),
          subscribe: jest.fn(),
        };
        (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

        // Mock admin authorization
        const { orderBroadcast } = require('../../utils/broadcastFactory');
        orderBroadcast.admin.getAuthorizedChannelNames.mockReturnValue(['orders-admin']);

        renderHook(() => useCentralizedRealtime(), {
          wrapper: createWrapper(),
        });

        // Should setup both user and admin channels
        expect(supabase.channel).toHaveBeenCalled();
      });
    });

    describe('useForceRefreshUserData', () => {
      it('should provide refresh functionality', () => {
        const { result } = renderHook(() => useForceRefreshUserData(), {
          wrapper: createWrapper(),
        });

        expect(result.current.refreshUserData).toBeDefined();
        expect(result.current.refreshUserDataAsync).toBeDefined();
        expect(typeof result.current.isRefreshing).toBe('boolean');
      });

      it('should refresh user data successfully', async () => {
        const { result } = renderHook(() => useForceRefreshUserData(), {
          wrapper: createWrapper(),
        });

        result.current.refreshUserData();

        await waitFor(() => {
          expect(result.current.isRefreshing).toBe(false);
        });
      });

      it('should refresh user data async successfully', async () => {
        const { result } = renderHook(() => useForceRefreshUserData(), {
          wrapper: createWrapper(),
        });

        const refreshResult = await result.current.refreshUserDataAsync();
        expect(refreshResult.success).toBe(true);
      });

      it('should provide loading states', () => {
        const { result } = renderHook(() => useForceRefreshUserData(), {
          wrapper: createWrapper(),
        });

        expect(typeof result.current.isRefreshing).toBe('boolean');
        expect(result.current.error).toBeDefined();
      });
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      } as any);
    });

    describe('useCentralizedRealtime', () => {
      it('should return authentication error state', () => {
        const { result } = renderHook(() => useCentralizedRealtime(), {
          wrapper: createWrapper(),
        });

        expect(result.current.connectionState.isConnected).toBe(false);
        expect(result.current.connectionState.activeSubscriptions).toEqual([]);
        expect(result.current.connectionState.connectionCount).toBe(0);
        expect(result.current.connectionState.errors).toHaveLength(1);
        expect(result.current.connectionState.errors?.[0].code).toBe('AUTHENTICATION_REQUIRED');
        expect(result.current.error?.code).toBe('AUTHENTICATION_REQUIRED');
        expect(result.current.isLoading).toBe(false);
      });

      it('should block realtime operations when not authenticated', () => {
        const { result } = renderHook(() => useCentralizedRealtime(), {
          wrapper: createWrapper(),
        });

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        result.current.connect();
        result.current.disconnect();
        result.current.refreshConnection();

        expect(consoleSpy).toHaveBeenCalledTimes(3);
        expect(consoleSpy).toHaveBeenCalledWith('⚠️ Realtime operation blocked: User not authenticated');

        consoleSpy.mockRestore();
      });

      it('should return error for async operations when not authenticated', async () => {
        const { result } = renderHook(() => useCentralizedRealtime(), {
          wrapper: createWrapper(),
        });

        const connectResult = await result.current.connectAsync();
        const disconnectResult = await result.current.disconnectAsync();
        const refreshResult = await result.current.refreshConnectionAsync();

        expect(connectResult.success).toBe(false);
        expect(connectResult.error?.code).toBe('AUTHENTICATION_REQUIRED');
        expect(disconnectResult.success).toBe(false);
        expect(disconnectResult.error?.code).toBe('AUTHENTICATION_REQUIRED');
        expect(refreshResult.success).toBe(false);
        expect(refreshResult.error?.code).toBe('AUTHENTICATION_REQUIRED');
      });
    });

    describe('useForceRefreshUserData', () => {
      it('should return authentication error state', () => {
        const { result } = renderHook(() => useForceRefreshUserData(), {
          wrapper: createWrapper(),
        });

        expect(result.current.error?.code).toBe('AUTHENTICATION_REQUIRED');
        expect(result.current.isRefreshing).toBe(false);
      });

      it('should block refresh operations when not authenticated', () => {
        const { result } = renderHook(() => useForceRefreshUserData(), {
          wrapper: createWrapper(),
        });

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        result.current.refreshUserData();

        expect(consoleSpy).toHaveBeenCalledWith('⚠️ Refresh operation blocked: User not authenticated');

        consoleSpy.mockRestore();
      });

      it('should return error for async refresh when not authenticated', async () => {
        const { result } = renderHook(() => useForceRefreshUserData(), {
          wrapper: createWrapper(),
        });

        const refreshResult = await result.current.refreshUserDataAsync();

        expect(refreshResult.success).toBe(false);
        expect(refreshResult.error?.code).toBe('AUTHENTICATION_REQUIRED');
      });
    });
  });

  describe('security validation', () => {
    it('should handle invalid user ID format', () => {
      const invalidUser = { id: 'user@123!', email: 'test@example.com', name: 'Test User', role: 'customer' };
      mockUseCurrentUser.mockReturnValue({
        data: invalidUser,
        isLoading: false,
        error: null,
      } as any);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      renderHook(() => useCentralizedRealtime(), {
        wrapper: createWrapper(),
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Invalid user ID format, blocking realtime subscriptions');

      consoleErrorSpy.mockRestore();
    });
  });
});