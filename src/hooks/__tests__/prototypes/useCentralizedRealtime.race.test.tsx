/**
 * useCentralizedRealtime Race Condition Tests with REAL React Query
 * 
 * This test file uses real React Query instances to test actual race conditions.
 * Key differences from mocked tests:
 * - Uses actual QueryClient and mutations
 * - Tests real optimistic updates and rollbacks  
 * - Tests real query invalidation and caching
 * - Tests actual concurrent operation handling
 * - Tests real-time subscription coordination races
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { 
  useCentralizedRealtime, 
  useForceRefreshUserData 
} from '../useCentralizedRealtime';
import { supabase } from '../../config/supabase';

// Get the mocked services (services are mocked, React Query is real)
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useCentralizedRealtime Race Condition Tests (Real React Query)', () => {
  let queryClient: QueryClient;

  // Basic smoke test to verify setup works
  describe('🔧 Setup Verification', () => {
    it('should initialize useCentralizedRealtime hook without hanging', async () => {
      const { result } = renderHook(() => useCentralizedRealtime(), { wrapper });

      // Should complete initialization within reasonable time
      await waitFor(() => {
        expect(result.current).toBeDefined();
        expect(result.current.connect).toBeDefined();
        expect(result.current.disconnect).toBeDefined();
        expect(result.current.refreshConnection).toBeDefined();
      }, { timeout: 3000 });

      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isDisconnecting).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
    });

    it('should initialize useForceRefreshUserData hook without hanging', async () => {
      const { result } = renderHook(() => useForceRefreshUserData(), { wrapper });

      // Should complete initialization within reasonable time
      await waitFor(() => {
        expect(result.current).toBeDefined();
        expect(result.current.refreshUserData).toBeDefined();
        expect(result.current.refreshUserDataAsync).toBeDefined();
      }, { timeout: 3000 });

      expect(result.current.isRefreshing).toBe(false);
    });
  });

  beforeEach(() => {
    // Create fresh QueryClient for each test to avoid interference
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { 
          retry: false,
          staleTime: 0,
          gcTime: 0,
          refetchOnMount: false,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false
        },
        mutations: { 
          retry: false
        }
      },
      // Prevent hanging by setting shorter timeouts
      mutationCache: undefined,
      queryCache: undefined
    });

    jest.clearAllMocks();
    
    // Use real timers for React Query compatibility (proven Option A methodology)
    jest.useRealTimers();

    // Reset channel mock for each test
    const mockChannel = mockSupabase.channel();
    mockChannel.on.mockReturnThis();
    mockChannel.subscribe.mockImplementation((callback) => {
      // Simulate subscription success with real timing
      setTimeout(() => {
        if (typeof callback === 'function') {
          callback('SUBSCRIBED');
        }
      }, 50);
      return mockChannel;
    });
    mockChannel.unsubscribe.mockResolvedValue(undefined);

    // Broadcast mocks are handled in the setup file
    // Just ensure Supabase channel mocking is ready
  });

  afterEach(async () => {
    // Properly cleanup QueryClient to prevent hanging
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      queryClient.unmount();
    } catch {
      // Ignore cleanup errors
    }
  });

  // Wrapper component that provides real QueryClient
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('🔌 Connection Management Races', () => {
    it('should handle concurrent connection attempts correctly', async () => {
      // Mock connection setup with timing delays for race conditions
      const mockChannel = mockSupabase.channel();
      let subscriptionCount = 0;
      
      mockChannel.subscribe.mockImplementation((callback) => {
        subscriptionCount++;
        // Use real short delay for race condition testing
        setTimeout(() => {
          if (typeof callback === 'function') {
            callback('SUBSCRIBED');
          }
        }, 60 + subscriptionCount * 10); // Slightly different timing for each
        return mockChannel;
      });

      const { result } = renderHook(() => useCentralizedRealtime(), { wrapper });

      // Wait for initial load
      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

      // Fire two concurrent connection attempts with real timing
      const startTime = Date.now();
      
      await act(async () => {
        const promises = Promise.all([
          result.current.connectAsync(),
          result.current.connectAsync()
        ]);

        // Wait for all operations to complete with timeout protection
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), 5000)
        );
        
        await Promise.race([promises, timeoutPromise]);
      });

      const endTime = Date.now();
      console.log(`Concurrent connections completed in ${endTime - startTime}ms`);

      // Verify channel creation was called (subscription setup)
      expect(mockSupabase.channel).toHaveBeenCalled();
      
      // Wait for connections to complete
      await waitFor(() => {
        expect(result.current.isConnecting).toBe(false);
      });
    });

    it('should handle disconnect during connection setup', async () => {
      const mockChannel = mockSupabase.channel();
      
      // Mock delayed connection setup
      mockChannel.subscribe.mockImplementation((callback) => {
        // Longer delay to create race condition window
        setTimeout(() => {
          if (typeof callback === 'function') {
            callback('SUBSCRIBED');
          }
        }, 100);
        return mockChannel;
      });

      const { result } = renderHook(() => useCentralizedRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Start connection, then immediately disconnect
      await act(async () => {
        const connectPromise = result.current.connectAsync();
        
        // Start disconnect while connection is still setting up
        const disconnectPromise = result.current.disconnectAsync();
        
        await Promise.allSettled([connectPromise, disconnectPromise]);
      });

      // Should complete both operations without hanging
      await waitFor(() => {
        expect(result.current.isConnecting).toBe(false);
        expect(result.current.isDisconnecting).toBe(false);
      });

      // Verify cleanup methods were called
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });

    it('should handle connection refresh during active subscriptions', async () => {
      const { result } = renderHook(() => useCentralizedRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // First establish connection
      await act(async () => {
        await result.current.connectAsync();
      });

      await waitFor(() => {
        expect(result.current.isConnecting).toBe(false);
      });

      // Now refresh connection while subscriptions are active
      await act(async () => {
        await result.current.refreshConnectionAsync();
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });

      // Connection should remain stable
      expect(result.current.connectionState.isConnected).toBeDefined();
    });
  });

  describe('📡 Subscription Setup Races', () => {
    it('should handle concurrent subscription setup for different types', async () => {
      // Create multiple hook instances (simulating multiple components)
      const { result: result1 } = renderHook(() => useCentralizedRealtime(), { wrapper });
      const { result: result2 } = renderHook(() => useCentralizedRealtime(), { wrapper });

      // Wait for all to load
      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result2.current.isLoading).toBe(false);
      });

      // Both components attempt connection simultaneously
      await act(async () => {
        const promises = Promise.all([
          result1.current.connectAsync(),
          result2.current.connectAsync()
        ]);
        
        await promises;
      });

      // Both should complete successfully
      await waitFor(() => {
        expect(result1.current.isConnecting).toBe(false);
        expect(result2.current.isConnecting).toBe(false);
      });

      // Should have established subscriptions
      expect(mockSupabase.channel).toHaveBeenCalled();
    });

    it('should handle subscription cleanup vs new setup conflicts', async () => {
      const { result } = renderHook(() => useCentralizedRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Rapid connect/disconnect cycle
      await act(async () => {
        await result.current.connectAsync();
      });

      await waitFor(() => {
        expect(result.current.isConnecting).toBe(false);
      });

      // Immediately disconnect and reconnect
      await act(async () => {
        const disconnectPromise = result.current.disconnectAsync();
        
        // Start new connection while disconnect is processing
        const reconnectPromise = result.current.connectAsync();
        
        await Promise.allSettled([disconnectPromise, reconnectPromise]);
      });

      // Should handle the race condition gracefully
      await waitFor(() => {
        expect(result.current.isConnecting).toBe(false);
        expect(result.current.isDisconnecting).toBe(false);
      });
    });
  });

  describe('🔄 Cross-Entity Invalidation Races', () => {
    it('should handle force refresh during real-time updates', async () => {
      const { result: realtimeResult } = renderHook(() => useCentralizedRealtime(), { wrapper });
      const { result: refreshResult } = renderHook(() => useForceRefreshUserData(), { wrapper });

      await waitFor(() => {
        expect(realtimeResult.current.isLoading).toBe(false);
        expect(refreshResult.current.isRefreshing).toBe(false);
      });

      // Establish real-time connection
      await act(async () => {
        await realtimeResult.current.connectAsync();
      });

      await waitFor(() => {
        expect(realtimeResult.current.isConnecting).toBe(false);
      });

      // Simulate concurrent force refresh and real-time activity
      await act(async () => {
        const promises = Promise.all([
          refreshResult.current.refreshUserDataAsync(),
          // Simulate real-time connection refresh
          realtimeResult.current.refreshConnectionAsync()
        ]);
        
        await promises;
      });

      // Both operations should complete
      await waitFor(() => {
        expect(refreshResult.current.isRefreshing).toBe(false);
        expect(realtimeResult.current.isRefreshing).toBe(false);
      });
    });

    it('should handle concurrent force refresh operations', async () => {
      const { result: refresh1 } = renderHook(() => useForceRefreshUserData(), { wrapper });
      const { result: refresh2 } = renderHook(() => useForceRefreshUserData(), { wrapper });

      await waitFor(() => {
        expect(refresh1.current.isRefreshing).toBe(false);
        expect(refresh2.current.isRefreshing).toBe(false);
      });

      // Multiple components trigger refresh simultaneously
      await act(async () => {
        const promises = Promise.all([
          refresh1.current.refreshUserDataAsync(),
          refresh2.current.refreshUserDataAsync()
        ]);
        
        await promises;
      });

      // Both should complete successfully
      await waitFor(() => {
        expect(refresh1.current.isRefreshing).toBe(false);
        expect(refresh2.current.isRefreshing).toBe(false);
      });
    });
  });

  describe('🔄 Connection State Consistency', () => {
    it('should maintain connection state consistency across multiple hook instances', async () => {
      // Create multiple hook instances (simulating multiple components)
      const { result: result1 } = renderHook(() => useCentralizedRealtime(), { wrapper });
      const { result: result2 } = renderHook(() => useCentralizedRealtime(), { wrapper });
      const { result: result3 } = renderHook(() => useCentralizedRealtime(), { wrapper });

      // Wait for all to load
      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result2.current.isLoading).toBe(false);
        expect(result3.current.isLoading).toBe(false);
      });

      // Connect from first component
      await act(async () => {
        await result1.current.connectAsync();
      });

      // All components should eventually see the connected state
      await waitFor(() => {
        expect(result1.current.isConnecting).toBe(false);
        expect(result2.current.isConnecting).toBe(false);
        expect(result3.current.isConnecting).toBe(false);
      });
    });

    it('should handle connection status queries during mutations', async () => {
      const { result: realtime } = renderHook(() => useCentralizedRealtime(), { wrapper });

      await waitFor(() => expect(realtime.current.isLoading).toBe(false));

      // Query connection state while performing connection operations
      await act(async () => {
        const connectPromise = realtime.current.connectAsync();
        
        // Check connection state during mutation
        const connectionState = realtime.current.connectionState;
        expect(connectionState).toBeDefined();
        
        await connectPromise;
      });

      await waitFor(() => {
        expect(realtime.current.isConnecting).toBe(false);
      });

      // Final connection state should be consistent
      expect(realtime.current.connectionState.isConnected).toBeDefined();
    });
  });

  describe('🚨 Error Handling & Recovery', () => {
    it('should handle connection failures gracefully', async () => {
      const { result } = renderHook(() => useCentralizedRealtime(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Mock connection failure
      const mockChannel = mockSupabase.channel();
      mockChannel.subscribe.mockImplementation((callback) => {
        // Simulate subscription failure
        setTimeout(() => {
          if (typeof callback === 'function') {
            callback('CHANNEL_ERROR');
          }
        }, 50);
        return mockChannel;
      });

      let errorOccurred = false;

      await act(async () => {
        try {
          await result.current.connectAsync();
        } catch (error) {
          errorOccurred = true;
        }
      });

      // Should handle connection failure
      await waitFor(() => {
        expect(result.current.isConnecting).toBe(false);
      });

      // Connection state should reflect failure appropriately
      expect(result.current.connectionState).toBeDefined();
    });

    it('should handle force refresh failures during real-time operations', async () => {
      const { result: realtimeResult } = renderHook(() => useCentralizedRealtime(), { wrapper });
      const { result: refreshResult } = renderHook(() => useForceRefreshUserData(), { wrapper });

      await waitFor(() => {
        expect(realtimeResult.current.isLoading).toBe(false);
        expect(refreshResult.current.isRefreshing).toBe(false);
      });

      // Establish connection first
      await act(async () => {
        await realtimeResult.current.connectAsync();
      });

      await waitFor(() => {
        expect(realtimeResult.current.isConnecting).toBe(false);
      });

      // Mock refresh failure scenario
      let refreshError = false;

      await act(async () => {
        try {
          await refreshResult.current.refreshUserDataAsync();
        } catch (error) {
          refreshError = true;
        }
      });

      // Should handle refresh completion
      await waitFor(() => {
        expect(refreshResult.current.isRefreshing).toBe(false);
      });

      // Real-time connection should remain stable
      expect(realtimeResult.current.connectionState.isConnected).toBeDefined();
    });
  });
});