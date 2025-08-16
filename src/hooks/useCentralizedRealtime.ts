import { useEffect, useRef, useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../config/supabase';
import { useCurrentUser } from './useAuth';
import { cartKeys, orderKeys, productKeys } from '../utils/queryKeyFactory';
import { cartBroadcast, orderBroadcast, productBroadcast } from '../utils/broadcastFactory';

// Enhanced interfaces following cart pattern
interface RealtimeError {
  code: 'AUTHENTICATION_REQUIRED' | 'CONNECTION_FAILED' | 'INVALID_USER' | 'UNKNOWN_ERROR';
  message: string;
  userMessage: string;
  channel?: string;
}

interface RealtimeOperationResult<T = any> {
  success: boolean;
  message?: string;
  error?: RealtimeError;
  data?: T;
}

interface RealtimeMutationContext {
  previousConnectionState?: ConnectionState;
  operationType: 'connect' | 'disconnect' | 'refresh';
  metadata?: Record<string, any>;
}

interface ConnectionState {
  isConnected: boolean;
  activeSubscriptions: string[];
  connectionCount: number;
  lastConnected?: string;
  errors?: RealtimeError[];
}

// Enhanced error handling utility (following cart pattern)
const createRealtimeError = (
  code: RealtimeError['code'],
  message: string,
  userMessage: string,
  channel?: string
): RealtimeError => ({
  code,
  message,
  userMessage,
  channel,
});

// Enhanced typed query function (following cart pattern)
type ConnectionStateQueryFn = (userId?: string) => Promise<ConnectionState>;

// Enhanced typed mutation functions (following cart pattern)
type ConnectRealtimeMutationFn = () => Promise<RealtimeOperationResult<ConnectionState>>;
type DisconnectRealtimeMutationFn = () => Promise<RealtimeOperationResult<void>>;
type RefreshConnectionMutationFn = () => Promise<RealtimeOperationResult<ConnectionState>>;

// SECURITY-HARDENED: Enhanced Centralized Realtime with Privacy Protection (following cart pattern)
export const useCentralizedRealtime = () => {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const subscriptionsRef = useRef<{ [key: string]: any }>({});
  const [connectionErrors, setConnectionErrors] = useState<RealtimeError[]>([]);

  // Enhanced authentication guard (following cart pattern)
  if (!user?.id) {
    const authError = createRealtimeError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated',
      'Please sign in to use real-time features'
    );
    
    return {
      connectionState: {
        isConnected: false,
        activeSubscriptions: [],
        connectionCount: 0,
        errors: [authError]
      } as ConnectionState,
      isLoading: false,
      error: authError,
      
      isConnecting: false,
      isDisconnecting: false,
      isRefreshing: false,
      
      connect: () => console.warn('⚠️ Realtime operation blocked: User not authenticated'),
      disconnect: () => console.warn('⚠️ Realtime operation blocked: User not authenticated'),
      refreshConnection: () => console.warn('⚠️ Realtime operation blocked: User not authenticated'),
      
      connectAsync: async (): Promise<RealtimeOperationResult<ConnectionState>> => ({ 
        success: false, 
        error: authError 
      }),
      disconnectAsync: async (): Promise<RealtimeOperationResult<void>> => ({ 
        success: false, 
        error: authError 
      }),
      refreshConnectionAsync: async (): Promise<RealtimeOperationResult<ConnectionState>> => ({ 
        success: false, 
        error: authError 
      }),
      
      getRealtimeQueryKey: () => ['realtime', 'unauthenticated'],
      
      // Legacy compatibility
      isConnected: false,
      activeSubscriptions: [],
    };
  }
  
  // SECURITY: Validate user ID format to prevent injection (following cart pattern)
  if (!/^[a-zA-Z0-9\-_]+$/.test(user.id)) {
    const invalidUserError = createRealtimeError(
      'INVALID_USER',
      'Invalid user ID format',
      'Invalid user credentials detected'
    );
    setConnectionErrors([invalidUserError]);
    console.error('❌ Invalid user ID format, blocking realtime subscriptions');
  }
  
  const realtimeQueryKey = ['realtime', 'connection', user.id];
  
  // Enhanced query with proper enabled guard and error handling (following cart pattern)
  const {
    data: connectionState = {
      isConnected: false,
      activeSubscriptions: [],
      connectionCount: 0,
      errors: connectionErrors
    },
    isLoading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: realtimeQueryKey,
    queryFn: async (): Promise<ConnectionState> => {
      try {
        const activeSubscriptions = Object.keys(subscriptionsRef.current);
        const isConnected = activeSubscriptions.length > 0;
        
        return {
          isConnected,
          activeSubscriptions,
          connectionCount: activeSubscriptions.length,
          lastConnected: isConnected ? new Date().toISOString() : undefined,
          errors: connectionErrors
        };
      } catch (error: any) {
        throw createRealtimeError(
          'CONNECTION_FAILED',
          error.message || 'Failed to get connection status',
          'Unable to check real-time connection status'
        );
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (following cart pattern)
    gcTime: 5 * 60 * 1000, // 5 minutes (following cart pattern)
    refetchOnMount: true, // (following cart pattern)
    refetchOnWindowFocus: false, // (following cart pattern)
    refetchOnReconnect: true, // (following cart pattern)
    enabled: !!user?.id, // Enhanced enabled guard (following cart pattern)
    retry: (failureCount, error) => {
      // Smart retry logic (following cart pattern)
      if (failureCount < 2) return true;
      // Don't retry on authentication errors
      if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff (following cart pattern)
  });
  
  // Enhanced error processing (following cart pattern)
  const error = queryError ? createRealtimeError(
    'CONNECTION_FAILED',
    queryError.message || 'Failed to load connection status',
    'Unable to check real-time connection. Please try again.',
  ) : null;
  
  useEffect(() => {
    // SECURITY: Only setup subscriptions for authenticated users
    if (!user?.id) {
      console.warn('⚠️ Realtime subscriptions blocked: User not authenticated');
      return;
    }

    // SECURITY: Validate user ID format to prevent injection
    if (!/^[a-zA-Z0-9\-_]+$/.test(user.id)) {
      console.error('❌ Invalid user ID format, blocking realtime subscriptions');
      return;
    }

    setupCartSubscriptions();
    setupOrderSubscriptions();
    setupProductSubscriptions();

    return () => {
      // Cleanup all subscriptions
      Object.values(subscriptionsRef.current).forEach((subscription) => {
        if (subscription?.unsubscribe) {
          subscription.unsubscribe();
        }
      });
      subscriptionsRef.current = {};
    };
  }, [user?.id, queryClient]);

  // SECURITY-HARDENED: Cart Subscriptions (User-Specific Only)
  const setupCartSubscriptions = () => {
    if (!user?.id) return;

    // SECURITY: Get authorized channel names only
    const authorizedChannels = cartBroadcast.getAuthorizedChannelNames(user.id, user.role);
    
    if (authorizedChannels.length === 0) {
      console.warn('⚠️ No authorized cart channels for user');
      return;
    }

    // SECURITY: Subscribe only to user's own cart channel
    const channelName = authorizedChannels[0]; // Primary user channel
    const cartChannel = supabase.channel(channelName);

    cartChannel
      .on('broadcast', { event: 'cart-item-added' }, (payload) => {
        // SECURITY: Validate payload and user authorization
        if (!payload.payload || payload.payload.userId !== user.id) {
          console.warn('⚠️ Unauthorized cart broadcast received, ignoring');
          return;
        }
        console.log('🛒 Authorized cart item added broadcast received');
        queryClient.invalidateQueries({ queryKey: cartKeys.all(user.id) });
      })
      .on('broadcast', { event: 'cart-item-removed' }, (payload) => {
        if (!payload.payload || payload.payload.userId !== user.id) {
          console.warn('⚠️ Unauthorized cart broadcast received, ignoring');
          return;
        }
        console.log('🛒 Authorized cart item removed broadcast received');
        queryClient.invalidateQueries({ queryKey: cartKeys.all(user.id) });
      })
      .on('broadcast', { event: 'cart-quantity-updated' }, (payload) => {
        if (!payload.payload || payload.payload.userId !== user.id) {
          console.warn('⚠️ Unauthorized cart broadcast received, ignoring');
          return;
        }
        console.log('🛒 Authorized cart quantity updated broadcast received');
        queryClient.invalidateQueries({ queryKey: cartKeys.all(user.id) });
      })
      .on('broadcast', { event: 'cart-cleared' }, (payload) => {
        if (!payload.payload || payload.payload.userId !== user.id) {
          console.warn('⚠️ Unauthorized cart broadcast received, ignoring');
          return;
        }
        console.log('🛒 Authorized cart cleared broadcast received');
        queryClient.invalidateQueries({ queryKey: cartKeys.all(user.id) });
      })
      .subscribe((status) => {
        console.log(`🛒 Cart subscription status: ${status} for channel: ${channelName}`);
      });

    subscriptionsRef.current.cart = cartChannel;
  };

  // SECURITY-HARDENED: Order Subscriptions (User-Specific + Admin with Role Verification)
  const setupOrderSubscriptions = () => {
    if (!user?.id) return;

    // User-specific order updates (always allowed for authenticated users)
    const userAuthorizedChannels = orderBroadcast.user.getAuthorizedChannelNames(user.id, user.role);
    
    if (userAuthorizedChannels.length > 0) {
      const userChannelName = userAuthorizedChannels[0];
      const userOrderChannel = supabase.channel(userChannelName);

      userOrderChannel
        .on('broadcast', { event: 'new-order' }, (payload) => {
          // SECURITY: Validate payload and user authorization
          if (!payload.payload || payload.payload.userId !== user.id) {
            console.warn('⚠️ Unauthorized order broadcast received, ignoring');
            return;
          }
          console.log('📦 Authorized new order broadcast received');
          queryClient.invalidateQueries({ queryKey: orderKeys.all(user.id) });
        })
        .on('broadcast', { event: 'order-status-updated' }, (payload) => {
          if (!payload.payload || payload.payload.userId !== user.id) {
            console.warn('⚠️ Unauthorized order broadcast received, ignoring');
            return;
          }
          console.log('📦 Authorized order status updated broadcast received');
          queryClient.invalidateQueries({ queryKey: orderKeys.all(user.id) });
        })
        .subscribe((status) => {
          console.log(`📦 User order subscription status: ${status} for channel: ${userChannelName}`);
        });

      subscriptionsRef.current.userOrders = userOrderChannel;
    }

    // SECURITY: Admin order updates (only for verified admin roles)
    // SERVER-SIDE VERIFICATION: This should be verified server-side in production
    const adminAuthorizedChannels = orderBroadcast.admin.getAuthorizedChannelNames(user.id, user.role);
    
    if (adminAuthorizedChannels.length > 0) {
      const adminChannelName = adminAuthorizedChannels[0];
      const adminOrderChannel = supabase.channel(adminChannelName);

      adminOrderChannel
        .on('broadcast', { event: 'new-order' }, (payload) => {
          // SECURITY: Admin can see all orders, but validate payload structure
          if (!payload.payload) {
            console.warn('⚠️ Invalid admin order broadcast received, ignoring');
            return;
          }
          console.log('📦 Admin new order broadcast received');
          // Invalidate all order queries for admin view
          queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        })
        .on('broadcast', { event: 'order-status-updated' }, (payload) => {
          if (!payload.payload) {
            console.warn('⚠️ Invalid admin order broadcast received, ignoring');
            return;
          }
          console.log('📦 Admin order status updated broadcast received');
          queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        })
        .subscribe((status) => {
          console.log(`📦 Admin order subscription status: ${status} for channel: ${adminChannelName}`);
        });

      subscriptionsRef.current.adminOrders = adminOrderChannel;
    }
  };

  // SECURITY-HARDENED: Product Subscriptions (Global - Safe for All Users)
  const setupProductSubscriptions = () => {
    // SECURITY: Products are global and safe for all users to receive
    const authorizedChannels = productBroadcast.getAuthorizedChannelNames(user?.id, user?.role);
    
    if (authorizedChannels.length === 0) {
      console.warn('⚠️ No authorized product channels');
      return;
    }

    const channelName = authorizedChannels[0];
    const productChannel = supabase.channel(channelName);

    productChannel
      .on('broadcast', { event: 'product-updated' }, (payload) => {
        // SECURITY: Products are global, but validate payload structure
        if (!payload.payload) {
          console.warn('⚠️ Invalid product broadcast received, ignoring');
          return;
        }
        console.log('🛍️ Product updated broadcast received');
        queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      })
      .on('broadcast', { event: 'product-stock-updated' }, (payload) => {
        if (!payload.payload) {
          console.warn('⚠️ Invalid product stock broadcast received, ignoring');
          return;
        }
        console.log('🛍️ Product stock updated broadcast received');
        queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      })
      .on('broadcast', { event: 'new-product' }, (payload) => {
        if (!payload.payload) {
          console.warn('⚠️ Invalid new product broadcast received, ignoring');
          return;
        }
        console.log('🛍️ New product broadcast received');
        queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      })
      .subscribe((status) => {
        console.log(`🛍️ Product subscription status: ${status} for channel: ${channelName}`);
      });

    subscriptionsRef.current.products = productChannel;
  };

  // Enhanced connect mutation (following cart pattern)
  const connectMutation = useMutation<RealtimeOperationResult<ConnectionState>, Error, void, RealtimeMutationContext>({
    mutationFn: async (): Promise<RealtimeOperationResult<ConnectionState>> => {
      try {
        setupCartSubscriptions();
        setupOrderSubscriptions();
        setupProductSubscriptions();
        
        // Wait for connections to establish
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const newState: ConnectionState = {
          isConnected: true,
          activeSubscriptions: Object.keys(subscriptionsRef.current),
          connectionCount: Object.keys(subscriptionsRef.current).length,
          lastConnected: new Date().toISOString(),
          errors: []
        };
        
        return { success: true, data: newState };
      } catch (error: any) {
        throw createRealtimeError(
          'CONNECTION_FAILED',
          error.message || 'Failed to establish real-time connections',
          'Unable to connect to real-time services. Please try again.'
        );
      }
    },
    onMutate: async (): Promise<RealtimeMutationContext> => {
      // Cancel outgoing refetches (following cart pattern)
      await queryClient.cancelQueries({ queryKey: realtimeQueryKey });
      
      // Snapshot previous value (following cart pattern)
      const previousConnectionState = queryClient.getQueryData<ConnectionState>(realtimeQueryKey);
      
      // Optimistically update connection state (following cart pattern)
      const optimisticState: ConnectionState = {
        isConnected: true,
        activeSubscriptions: ['cart', 'orders', 'products'],
        connectionCount: 3,
        lastConnected: new Date().toISOString(),
        errors: []
      };
      queryClient.setQueryData(realtimeQueryKey, optimisticState);
      
      return { 
        previousConnectionState, 
        operationType: 'connect',
        metadata: { userId: user.id }
      };
    },
    onError: (error: any, _variables: void, context?: RealtimeMutationContext) => {
      // Rollback on error (following cart pattern)
      if (context?.previousConnectionState) {
        queryClient.setQueryData(realtimeQueryKey, context.previousConnectionState);
      }
      
      // Enhanced error logging (following cart pattern)
      console.error('❌ Connect realtime failed:', {
        error: error.message,
        userMessage: (error as RealtimeError).userMessage,
        userId: user.id
      });
    },
    onSuccess: async (_result: RealtimeOperationResult<ConnectionState>) => {
      // Smart invalidation strategy (following cart pattern)
      await queryClient.invalidateQueries({ queryKey: realtimeQueryKey });
      
      // Broadcast success (following cart pattern)
      try {
        await cartBroadcast.send('realtime-connected', {
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      } catch (broadcastError) {
        console.warn('Failed to broadcast realtime connection:', broadcastError);
      }
    },
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, _error: any) => {
      return failureCount < 2;
    },
    retryDelay: 1000,
  });
  
  // Enhanced disconnect mutation (following cart pattern)
  const disconnectMutation = useMutation<RealtimeOperationResult<void>, Error, void, RealtimeMutationContext>({
    mutationFn: async (): Promise<RealtimeOperationResult<void>> => {
      try {
        // Cleanup all subscriptions
        Object.values(subscriptionsRef.current).forEach((subscription) => {
          if (subscription?.unsubscribe) {
            subscription.unsubscribe();
          }
        });
        subscriptionsRef.current = {};
        setConnectionErrors([]);
        
        return { success: true };
      } catch (error: any) {
        throw createRealtimeError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to disconnect real-time services',
          'Unable to disconnect properly. Please try again.'
        );
      }
    },
    onMutate: async (): Promise<RealtimeMutationContext> => {
      // Cancel outgoing refetches (following cart pattern)
      await queryClient.cancelQueries({ queryKey: realtimeQueryKey });
      
      // Snapshot previous value (following cart pattern)
      const previousConnectionState = queryClient.getQueryData<ConnectionState>(realtimeQueryKey);
      
      // Optimistically update connection state (following cart pattern)
      const optimisticState: ConnectionState = {
        isConnected: false,
        activeSubscriptions: [],
        connectionCount: 0,
        errors: []
      };
      queryClient.setQueryData(realtimeQueryKey, optimisticState);
      
      return { 
        previousConnectionState, 
        operationType: 'disconnect',
        metadata: { userId: user.id }
      };
    },
    onError: (error: any, _variables: void, context?: RealtimeMutationContext) => {
      // Rollback on error (following cart pattern)
      if (context?.previousConnectionState) {
        queryClient.setQueryData(realtimeQueryKey, context.previousConnectionState);
      }
      
      // Enhanced error logging (following cart pattern)
      console.error('❌ Disconnect realtime failed:', {
        error: error.message,
        userMessage: (error as RealtimeError).userMessage,
        userId: user.id
      });
    },
    onSuccess: async (_result: RealtimeOperationResult<void>) => {
      // Smart invalidation strategy (following cart pattern)
      await queryClient.invalidateQueries({ queryKey: realtimeQueryKey });
      
      // Broadcast success (following cart pattern)
      try {
        await cartBroadcast.send('realtime-disconnected', {
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      } catch (broadcastError) {
        console.warn('Failed to broadcast realtime disconnection:', broadcastError);
      }
    },
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, _error: any) => {
      return failureCount < 2;
    },
    retryDelay: 1000,
  });
  
  // Enhanced refresh connection mutation (following cart pattern)
  const refreshConnectionMutation = useMutation<RealtimeOperationResult<ConnectionState>, Error, void, RealtimeMutationContext>({
    mutationFn: async (): Promise<RealtimeOperationResult<ConnectionState>> => {
      try {
        // Refresh connection status
        await refetch();
        const newState = queryClient.getQueryData<ConnectionState>(realtimeQueryKey) || connectionState;
        return { success: true, data: newState };
      } catch (error: any) {
        throw createRealtimeError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to refresh connection status',
          'Unable to refresh connection status. Please try again.'
        );
      }
    },
    onSuccess: async (_result: RealtimeOperationResult<ConnectionState>) => {
      // Smart invalidation strategy (following cart pattern)
      await queryClient.invalidateQueries({ queryKey: realtimeQueryKey });
      
      // Broadcast success (following cart pattern)
      try {
        await cartBroadcast.send('realtime-refreshed', {
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      } catch (broadcastError) {
        console.warn('Failed to broadcast realtime refresh:', broadcastError);
      }
    },
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, _error: any) => {
      return failureCount < 2;
    },
    retryDelay: 1000,
  });
  
  // Enhanced utility functions with useCallback (following cart pattern)
  const getRealtimeQueryKey = useCallback(() => realtimeQueryKey, [user.id]);

  // SECURITY: Return enhanced subscription status information (following cart pattern)
  return {
    connectionState,
    isLoading,
    error,
    
    // Mutation states (following cart pattern)
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isRefreshing: refreshConnectionMutation.isPending,
    
    // Direct mutation functions (following cart pattern - single source of truth)
    connect: connectMutation.mutate,
    disconnect: disconnectMutation.mutate,
    refreshConnection: refreshConnectionMutation.mutate,
    
    // Async mutation functions (following cart pattern)
    connectAsync: connectMutation.mutateAsync,
    disconnectAsync: disconnectMutation.mutateAsync,
    refreshConnectionAsync: refreshConnectionMutation.mutateAsync,
    
    // Query keys for external use (following cart pattern)
    getRealtimeQueryKey,
    
    // Legacy compatibility (following cart pattern)
    isConnected: connectionState.isConnected,
    activeSubscriptions: connectionState.activeSubscriptions,
    // SECURITY: Don't expose actual subscription objects or sensitive data
  };
};

// Enhanced Hook to force refresh all user data (following cart pattern)
export const useForceRefreshUserData = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  // Enhanced authentication guard (following cart pattern)
  if (!user?.id) {
    const authError = createRealtimeError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated',
      'Please sign in to refresh data'
    );
    
    return {
      refreshUserData: () => console.warn('⚠️ Refresh operation blocked: User not authenticated'),
      refreshUserDataAsync: async (): Promise<RealtimeOperationResult<void>> => ({ 
        success: false, 
        error: authError 
      }),
      isRefreshing: false,
      error: authError,
    };
  }

  // Enhanced force refresh mutation (following cart pattern)
  const forceRefreshMutation = useMutation<RealtimeOperationResult<void>, Error, void, { userId: string }>({
    mutationFn: async (): Promise<RealtimeOperationResult<void>> => {
      try {
        console.log('🔄 Force refreshing all user data');
        
        // Invalidate all user-specific queries
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: cartKeys.all(user.id) }),
          queryClient.invalidateQueries({ queryKey: orderKeys.all(user.id) }),
          // Invalidate global queries
          queryClient.invalidateQueries({ queryKey: productKeys.all() }),
        ]);
        
        console.log('✅ All user data refresh triggered');
        return { success: true };
      } catch (error: any) {
        throw createRealtimeError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to refresh user data',
          'Unable to refresh data. Please try again.'
        );
      }
    },
    onMutate: async () => {
      return { userId: user.id };
    },
    onError: (error: any, _variables: void, context) => {
      // Enhanced error logging (following cart pattern)
      console.error('❌ Force refresh failed:', {
        error: error.message,
        userMessage: (error as RealtimeError).userMessage,
        userId: context?.userId
      });
    },
    onSuccess: async (_result: RealtimeOperationResult<void>) => {
      // Broadcast success (following cart pattern)
      try {
        await cartBroadcast.send('data-refreshed', {
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      } catch (broadcastError) {
        console.warn('Failed to broadcast data refresh:', broadcastError);
      }
    },
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, _error: any) => {
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  // Enhanced return with useCallback (following cart pattern)
  const refreshUserData = useCallback(() => {
    forceRefreshMutation.mutate();
  }, [forceRefreshMutation]);

  return {
    // Direct mutation functions (following cart pattern - single source of truth)
    refreshUserData,
    
    // Async mutation functions (following cart pattern)
    refreshUserDataAsync: forceRefreshMutation.mutateAsync,
    
    // Mutation states (following cart pattern)
    isRefreshing: forceRefreshMutation.isPending,
    error: forceRefreshMutation.error ? createRealtimeError(
      'UNKNOWN_ERROR',
      forceRefreshMutation.error.message,
      'Failed to refresh data'
    ) : null,
  };
};
