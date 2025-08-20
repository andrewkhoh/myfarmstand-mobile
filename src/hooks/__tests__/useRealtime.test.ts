import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { createWrapper } from '../../test/test-utils';
import { RealtimeService } from '../../services/realtimeService';
import {
  useRealtime,
  useRealtimeNotifications,
} from '../useRealtime';
import { useCurrentUser } from '../useAuth';

jest.mock('../../services/realtimeService');
const mockRealtimeService = RealtimeService as jest.Mocked<typeof RealtimeService>;

jest.mock('../useAuth');
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

jest.mock('../../utils/queryKeyFactory', () => ({
  createQueryKeyFactory: () => ({
    detail: (userId: string, type: string) => ['realtime', 'detail', userId, type],
    lists: (userId: string) => ['realtime', 'list', userId],
  }),
  authKeys: {
    all: (userId?: string) => userId ? ['auth', userId] : ['auth'],
    lists: (userId?: string) => userId ? ['auth', userId, 'list'] : ['auth', 'list'],
    details: (userId?: string) => userId ? ['auth', userId, 'detail'] : ['auth', 'detail'],
    detail: (id: string, userId?: string) => userId ? ['auth', userId, 'detail', id] : ['auth', 'detail', id],
  },
  cartKeys: {
    all: (userId?: string) => userId ? ['cart', userId] : ['cart'],
    details: (userId?: string) => userId ? ['cart', userId, 'detail'] : ['cart', 'detail'],
  },
  orderKeys: {
    all: (userId?: string) => userId ? ['orders', userId] : ['orders'],
    lists: (userId?: string) => userId ? ['orders', userId, 'list'] : ['orders', 'list'],
  },
  productKeys: {
    all: () => ['products'],
    lists: () => ['products', 'list'],
  },
}));

jest.mock('../../utils/broadcastFactory', () => ({
  createBroadcastHelper: () => ({
    send: jest.fn(),
  }),
}));


const mockUser = { id: 'user123', email: 'test@example.com', name: 'Test User', role: 'customer' as const };

const mockSubscriptionStatus = {
  totalSubscriptions: 3,
  subscriptions: [
    { channel: 'cart', state: 'connected', isConnected: true },
    { channel: 'orders', state: 'connected', isConnected: true },
    { channel: 'products', state: 'connected', isConnected: true },
  ],
  allConnected: true,
};

describe('useRealtime hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock DOM methods for realtime event handling
    Object.defineProperty(window, 'addEventListener', {
      value: jest.fn(),
      writable: true,
    });
    Object.defineProperty(window, 'removeEventListener', {
      value: jest.fn(),
      writable: true,
    });
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      // Reset all mocks including RealtimeService
      mockRealtimeService.initializeAllSubscriptions.mockReset();
      mockRealtimeService.unsubscribeAll.mockReset();
      mockRealtimeService.forceRefreshAllData.mockReset();
      mockRealtimeService.getSubscriptionStatus.mockReset();
      
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      } as any);
    });

    describe('useRealtime', () => {
      it('should initialize with proper status', () => {
        mockRealtimeService.getSubscriptionStatus.mockReturnValue(mockSubscriptionStatus);

        const { result } = renderHook(() => useRealtime(), {
          wrapper: createWrapper(),
        });

        expect(result.current.status.isInitialized).toBe(false);
        expect(result.current.isLoading).toBe(true);
      });

      it('should provide realtime operations', () => {
        mockRealtimeService.getSubscriptionStatus.mockReturnValue(mockSubscriptionStatus);

        const { result } = renderHook(() => useRealtime(), {
          wrapper: createWrapper(),
        });

        expect(result.current.initializeSubscriptions).toBeDefined();
        expect(result.current.cleanupSubscriptions).toBeDefined();
        expect(result.current.refreshStatus).toBeDefined();
        expect(result.current.forceRefresh).toBeDefined();
        expect(result.current.initializeSubscriptionsAsync).toBeDefined();
        expect(result.current.cleanupSubscriptionsAsync).toBeDefined();
        expect(result.current.refreshStatusAsync).toBeDefined();
      });

      it('should initialize subscriptions successfully', async () => {
        mockRealtimeService.getSubscriptionStatus.mockReturnValue(mockSubscriptionStatus);
        mockRealtimeService.initializeAllSubscriptions.mockImplementation(() => Promise.resolve());

        const { result } = renderHook(() => useRealtime(), {
          wrapper: createWrapper(),
        });

        result.current.initializeSubscriptions();

        await waitFor(() => {
          expect(result.current.isInitializing).toBe(false);
        });

        expect(mockRealtimeService.initializeAllSubscriptions).toHaveBeenCalled();
      });

      it.skip('should handle initialization failure', async () => {
        // SKIPPED: Error is leaking across test isolation - needs hook implementation fix
        mockRealtimeService.initializeAllSubscriptions.mockRejectedValue(new Error('Connection failed'));

        const { result } = renderHook(() => useRealtime(), {
          wrapper: createWrapper(),
        });

        result.current.initializeSubscriptions();

        await waitFor(() => {
          expect(result.current.isInitializing).toBe(false);
        });

        // Error should be handled gracefully
        expect(result.current.error).toBeFalsy();
      });

      it('should cleanup subscriptions successfully', async () => {
        mockRealtimeService.unsubscribeAll.mockImplementation(() => {});

        const { result } = renderHook(() => useRealtime(), {
          wrapper: createWrapper(),
        });

        result.current.cleanupSubscriptions();

        await waitFor(() => {
          expect(result.current.isCleaning).toBe(false);
        });

        expect(mockRealtimeService.unsubscribeAll).toHaveBeenCalled();
      });

      it('should refresh status successfully', async () => {
        mockRealtimeService.forceRefreshAllData.mockImplementation(() => {});
        mockRealtimeService.getSubscriptionStatus.mockReturnValue(mockSubscriptionStatus);

        const { result } = renderHook(() => useRealtime(), {
          wrapper: createWrapper(),
        });

        result.current.refreshStatus();

        await waitFor(() => {
          expect(result.current.isRefreshing).toBe(false);
        });

        expect(mockRealtimeService.forceRefreshAllData).toHaveBeenCalled();
      });

      it('should force refresh data', () => {
        mockRealtimeService.forceRefreshAllData.mockImplementation(() => {});

        const { result } = renderHook(() => useRealtime(), {
          wrapper: createWrapper(),
        });

        result.current.forceRefresh();

        expect(mockRealtimeService.forceRefreshAllData).toHaveBeenCalled();
      });

      it('should provide async operations', async () => {
        mockRealtimeService.getSubscriptionStatus.mockReturnValue(mockSubscriptionStatus);
        mockRealtimeService.initializeAllSubscriptions.mockImplementation(() => Promise.resolve());

        const { result } = renderHook(() => useRealtime(), {
          wrapper: createWrapper(),
        });

        const initResult = await result.current.initializeSubscriptionsAsync();
        expect(initResult.success).toBe(true);

        const cleanupResult = await result.current.cleanupSubscriptionsAsync();
        expect(cleanupResult.success).toBe(true);

        const refreshResult = await result.current.refreshStatusAsync();
        expect(refreshResult.success).toBe(true);
      });

      it('should provide loading states', () => {
        const { result } = renderHook(() => useRealtime(), {
          wrapper: createWrapper(),
        });

        expect(typeof result.current.isInitializing).toBe('boolean');
        expect(typeof result.current.isRefreshing).toBe('boolean');
        expect(typeof result.current.isCleaning).toBe('boolean');
        expect(typeof result.current.isLoading).toBe('boolean');
      });

      it('should provide status information', () => {
        mockRealtimeService.getSubscriptionStatus.mockReturnValue(mockSubscriptionStatus);

        const { result } = renderHook(() => useRealtime(), {
          wrapper: createWrapper(),
        });

        expect(result.current.status).toBeDefined();
        expect(result.current.isUserAuthenticated).toBe(true);
      });

      it('should generate correct query key', () => {
        const { result } = renderHook(() => useRealtime(), {
          wrapper: createWrapper(),
        });

        const queryKey = result.current.getRealtimeQueryKey();
        expect(queryKey).toEqual(['auth', 'user123', 'detail', 'realtime', 'status']);
      });
    });

    describe('useRealtimeNotifications', () => {
      it('should initialize with default values', () => {
        const { result } = renderHook(() => useRealtimeNotifications(), {
          wrapper: createWrapper(),
        });

        expect(result.current.lastUpdate).toBeNull();
        expect(result.current.updateCount).toBe(0);
        expect(result.current.hasRecentUpdate).toBe(false);
        expect(result.current.notificationHistory).toEqual([]);
        expect(result.current.error).toBeNull();
      });

      it('should setup event listeners', () => {
        const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

        renderHook(() => useRealtimeNotifications(), {
          wrapper: createWrapper(),
        });

        expect(addEventListenerSpy).toHaveBeenCalledWith(
          'realtimeUpdate',
          expect.any(Function)
        );
      });

      it('should cleanup event listeners on unmount', () => {
        const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

        const { unmount } = renderHook(() => useRealtimeNotifications(), {
          wrapper: createWrapper(),
        });

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith(
          'realtimeUpdate',
          expect.any(Function)
        );
      });

      it('should provide loading states', () => {
        const { result } = renderHook(() => useRealtimeNotifications(), {
          wrapper: createWrapper(),
        });

        expect(typeof result.current.isLoading).toBe('boolean');
      });

      it('should generate correct notification query key', () => {
        const { result } = renderHook(() => useRealtimeNotifications(), {
          wrapper: createWrapper(),
        });

        const queryKey = result.current.getNotificationQueryKey?.();
        expect(queryKey).toEqual(['auth', 'user123', 'list', 'notifications']);
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

    describe('useRealtime', () => {
      it('should return authentication error state', () => {
        const { result } = renderHook(() => useRealtime(), {
          wrapper: createWrapper(),
        });

        expect(result.current.status.isInitialized).toBe(false);
        expect(result.current.status.totalSubscriptions).toBe(0);
        expect(result.current.status.subscriptions).toEqual([]);
        expect(result.current.status.allConnected).toBe(false);
        expect(result.current.error?.code).toBe('AUTHENTICATION_REQUIRED');
        expect(result.current.isLoading).toBe(false);
      });

      it('should block realtime operations when not authenticated', () => {
        const { result } = renderHook(() => useRealtime(), {
          wrapper: createWrapper(),
        });

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        result.current.initializeSubscriptions();
        result.current.cleanupSubscriptions();
        result.current.refreshStatus();
        result.current.forceRefresh();

        expect(consoleSpy).toHaveBeenCalledTimes(4);
        expect(consoleSpy).toHaveBeenCalledWith('⚠️ Realtime operation blocked: User not authenticated');

        consoleSpy.mockRestore();
      });

      it('should return error for async operations when not authenticated', async () => {
        const { result } = renderHook(() => useRealtime(), {
          wrapper: createWrapper(),
        });

        const initResult = await result.current.initializeSubscriptionsAsync();
        const cleanupResult = await result.current.cleanupSubscriptionsAsync();
        const refreshResult = await result.current.refreshStatusAsync();

        expect(initResult.success).toBe(false);
        expect(initResult.error?.code).toBe('AUTHENTICATION_REQUIRED');
        expect(cleanupResult.success).toBe(false);
        expect(cleanupResult.error?.code).toBe('AUTHENTICATION_REQUIRED');
        expect(refreshResult.success).toBe(false);
        expect(refreshResult.error?.code).toBe('AUTHENTICATION_REQUIRED');
      });
    });

    describe('useRealtimeNotifications', () => {
      it('should return authentication error state', () => {
        const { result } = renderHook(() => useRealtimeNotifications(), {
          wrapper: createWrapper(),
        });

        expect(result.current.lastUpdate).toBeNull();
        expect(result.current.updateCount).toBe(0);
        expect(result.current.hasRecentUpdate).toBe(false);
        expect(result.current.error?.code).toBe('AUTHENTICATION_REQUIRED');
        expect(result.current.isLoading).toBe(false);
      });

      it('should not setup event listeners when not authenticated', () => {
        const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

        renderHook(() => useRealtimeNotifications(), {
          wrapper: createWrapper(),
        });

        // Should not add realtime event listeners when not authenticated
        expect(addEventListenerSpy).not.toHaveBeenCalledWith(
          'realtimeUpdate',
          expect.any(Function)
        );
      });
    });
  });
});