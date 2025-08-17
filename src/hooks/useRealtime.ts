import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RealtimeService } from '../services/realtimeService';
import { useCurrentUser } from './useAuth';
import { createQueryKeyFactory } from '../utils/queryKeyFactory';
import { createBroadcastHelper } from '../utils/broadcastFactory';

// Enhanced interfaces following cart pattern
interface RealtimeError {
  code: 'AUTHENTICATION_REQUIRED' | 'CONNECTION_FAILED' | 'SUBSCRIPTION_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
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
  previousStatus?: RealtimeStatus;
  operationType: 'initialize' | 'cleanup' | 'refresh';
  metadata?: Record<string, any>;
}

interface RealtimeStatus {
  totalSubscriptions: number;
  subscriptions: Array<{
    channel: string;
    state: any;
    isConnected: boolean;
  }>;
  allConnected: boolean;
  isInitialized: boolean;
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

// Query key factory for realtime operations (following cart pattern)
const realtimeKeys = createQueryKeyFactory({
  entity: 'auth', // Using 'auth' as closest match for realtime
  isolation: 'user-specific'
});

// Broadcast helper for realtime events (following cart pattern)
const realtimeBroadcast = createBroadcastHelper({
  entity: 'auth',
  target: 'user-specific'
});

// Enhanced typed query function (following cart pattern)
type RealtimeStatusQueryFn = (userId?: string) => Promise<RealtimeStatus>;

// Enhanced typed mutation functions (following cart pattern)
type InitializeSubscriptionsMutationFn = () => Promise<RealtimeOperationResult<RealtimeStatus>>;
type CleanupSubscriptionsMutationFn = () => Promise<RealtimeOperationResult<void>>;
type RefreshStatusMutationFn = () => Promise<RealtimeOperationResult<RealtimeStatus>>;

/**
 * Enhanced Hook to manage real-time subscriptions with React Query integration
 * Automatically subscribes when user is authenticated and unsubscribes on logout
 * Following useCart.ts golden standard patterns
 */
export const useRealtime = () => {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  // Create auth error for unauthenticated users
  const authError = !user?.id ? createRealtimeError(
    'AUTHENTICATION_REQUIRED',
    'User not authenticated',
    'Please sign in to use real-time features'
  ) : null;
  
  const realtimeQueryKey = user?.id ? realtimeKeys.detail(user.id, 'status') : ['realtime', 'unauthenticated'];
  
  // Enhanced query with proper enabled guard and error handling (following cart pattern)
  const {
    data: status = {
      totalSubscriptions: 0,
      subscriptions: [],
      allConnected: false,
      isInitialized: false
    },
    isLoading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: realtimeQueryKey,
    queryFn: async (): Promise<RealtimeStatus> => {
      try {
        const subscriptionStatus = RealtimeService.getSubscriptionStatus();
        // Derive initialization status from actual subscription state
        const isInitialized = subscriptionStatus.totalSubscriptions > 0 && subscriptionStatus.allConnected;
        return {
          ...subscriptionStatus,
          isInitialized
        };
      } catch (error: any) {
        throw createRealtimeError(
          'CONNECTION_FAILED',
          error.message || 'Failed to get realtime status',
          'Unable to connect to real-time services'
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
    'NETWORK_ERROR',
    queryError.message || 'Failed to load realtime status',
    'Unable to load real-time connection status. Please try again.',
  ) : null;
  
  // Initialize subscriptions when user is authenticated
  useEffect(() => {
    if (user && !status.isInitialized) {
      console.log('🚀 User authenticated, initializing real-time subscriptions...');
      RealtimeService.initializeAllSubscriptions();
      
      // Update React Query cache after initialization (with cleanup)
      const timeoutId = setTimeout(() => {
        refetch();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
    
    // Clean up subscriptions when user logs out
    if (!user && status.isInitialized) {
      console.log('🧹 User logged out, cleaning up real-time subscriptions...');
      RealtimeService.unsubscribeAll();
      // Invalidate query to update state
      queryClient.invalidateQueries({ queryKey: realtimeQueryKey });
    }
  }, [user, status.isInitialized, refetch, queryClient, realtimeQueryKey]);

  // Enhanced initialize subscriptions mutation (following cart pattern)
  const initializeSubscriptionsMutation = useMutation<RealtimeOperationResult<RealtimeStatus>, Error, void, RealtimeMutationContext>({
    mutationFn: async (): Promise<RealtimeOperationResult<RealtimeStatus>> => {
      try {
        RealtimeService.initializeAllSubscriptions();
        
        // Wait for connections to establish
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const subscriptionStatus = RealtimeService.getSubscriptionStatus();
        const isInitialized = subscriptionStatus.totalSubscriptions > 0 && subscriptionStatus.allConnected;
        const newStatus = {
          ...subscriptionStatus,
          isInitialized
        };
        
        return { success: true, data: newStatus };
      } catch (error: any) {
        throw createRealtimeError(
          'SUBSCRIPTION_ERROR',
          error.message || 'Failed to initialize subscriptions',
          'Unable to connect to real-time services. Please try again.'
        );
      }
    },
    onMutate: async (): Promise<RealtimeMutationContext> => {
      // Cancel outgoing refetches (following cart pattern)
      await queryClient.cancelQueries({ queryKey: realtimeQueryKey });
      
      // Snapshot previous value (following cart pattern)
      const previousStatus = queryClient.getQueryData<RealtimeStatus>(realtimeQueryKey);
      
      // Optimistically update status (following cart pattern)
      const optimisticStatus: RealtimeStatus = {
        ...status,
        isInitialized: true
      };
      queryClient.setQueryData(realtimeQueryKey, optimisticStatus);
      
      return { 
        previousStatus, 
        operationType: 'initialize',
        metadata: { userId: user.id }
      };
    },
    onError: (error: any, _variables: void, context?: RealtimeMutationContext) => {
      // Rollback on error (following cart pattern)
      if (context?.previousStatus) {
        queryClient.setQueryData(realtimeQueryKey, context.previousStatus);
      }
      
      // Enhanced error logging (following cart pattern)
      console.error('❌ Initialize subscriptions failed:', {
        error: error.message,
        userMessage: (error as RealtimeError).userMessage,
        userId: user.id
      });
    },
    onSuccess: async (_result: RealtimeOperationResult<RealtimeStatus>) => {
      // Smart invalidation strategy (following cart pattern)
      await queryClient.invalidateQueries({ queryKey: realtimeQueryKey });
      
      // Broadcast success (following cart pattern)
      await realtimeBroadcast.send('subscriptions-initialized', {
        userId: user.id,
        timestamp: new Date().toISOString()
      });
    },
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, _error: any) => {
      return failureCount < 2;
    },
    retryDelay: 1000,
  });
  
  // Enhanced cleanup subscriptions mutation (following cart pattern)
  const cleanupSubscriptionsMutation = useMutation<RealtimeOperationResult<void>, Error, void, RealtimeMutationContext>({
    mutationFn: async (): Promise<RealtimeOperationResult<void>> => {
      try {
        RealtimeService.unsubscribeAll();
        return { success: true };
      } catch (error: any) {
        throw createRealtimeError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to cleanup subscriptions',
          'Unable to disconnect from real-time services.'
        );
      }
    },
    onMutate: async (): Promise<RealtimeMutationContext> => {
      // Cancel outgoing refetches (following cart pattern)
      await queryClient.cancelQueries({ queryKey: realtimeQueryKey });
      
      // Snapshot previous value (following cart pattern)
      const previousStatus = queryClient.getQueryData<RealtimeStatus>(realtimeQueryKey);
      
      // Optimistically update status (following cart pattern)
      const optimisticStatus: RealtimeStatus = {
        totalSubscriptions: 0,
        subscriptions: [],
        allConnected: false,
        isInitialized: false
      };
      queryClient.setQueryData(realtimeQueryKey, optimisticStatus);
      
      return { 
        previousStatus, 
        operationType: 'cleanup',
        metadata: { userId: user.id }
      };
    },
    onError: (error: any, _variables: void, context?: RealtimeMutationContext) => {
      // Rollback on error (following cart pattern)
      if (context?.previousStatus) {
        queryClient.setQueryData(realtimeQueryKey, context.previousStatus);
      }
      
      // Enhanced error logging (following cart pattern)
      console.error('❌ Cleanup subscriptions failed:', {
        error: error.message,
        userMessage: (error as RealtimeError).userMessage,
        userId: user.id
      });
    },
    onSuccess: async (_result: RealtimeOperationResult<void>) => {
      // Smart invalidation strategy (following cart pattern)
      await queryClient.invalidateQueries({ queryKey: realtimeQueryKey });
      
      // Broadcast success (following cart pattern)
      await realtimeBroadcast.send('subscriptions-cleaned', {
        userId: user.id,
        timestamp: new Date().toISOString()
      });
    },
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, _error: any) => {
      return failureCount < 2;
    },
    retryDelay: 1000,
  });
  
  // Enhanced refresh status mutation (following cart pattern)
  const refreshStatusMutation = useMutation<RealtimeOperationResult<RealtimeStatus>, Error, void, RealtimeMutationContext>({
    mutationFn: async (): Promise<RealtimeOperationResult<RealtimeStatus>> => {
      try {
        RealtimeService.forceRefreshAllData();
        const subscriptionStatus = RealtimeService.getSubscriptionStatus();
        const isInitialized = subscriptionStatus.totalSubscriptions > 0 && subscriptionStatus.allConnected;
        const newStatus = {
          ...subscriptionStatus,
          isInitialized
        };
        return { success: true, data: newStatus };
      } catch (error: any) {
        throw createRealtimeError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to refresh status',
          'Unable to refresh real-time status. Please try again.'
        );
      }
    },
    onSuccess: async (_result: RealtimeOperationResult<RealtimeStatus>) => {
      // Smart invalidation strategy (following cart pattern)
      await queryClient.invalidateQueries({ queryKey: realtimeQueryKey });
      
      // Broadcast success (following cart pattern)
      await realtimeBroadcast.send('status-refreshed', {
        userId: user.id,
        timestamp: new Date().toISOString()
      });
    },
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, _error: any) => {
      return failureCount < 2;
    },
    retryDelay: 1000,
  });
  
  // Enhanced utility functions with useCallback (following cart pattern)
  const forceRefresh = useCallback(() => {
    RealtimeService.forceRefreshAllData();
    refetch();
  }, [refetch]);
  
  const getRealtimeQueryKey = useCallback(() => 
    user?.id ? realtimeKeys.detail(user.id, 'status') : ['realtime', 'unauthenticated'], 
    [user?.id]
  );

  // Handle unauthenticated users by returning safe defaults
  if (authError) {
    return {
      status: {
        totalSubscriptions: 0,
        subscriptions: [],
        allConnected: false,
        isInitialized: false
      } as RealtimeStatus,
      isLoading: false,
      error: authError,
      
      isInitializing: false,
      isRefreshing: false,
      isCleaning: false,
      
      initializeSubscriptions: () => console.warn('⚠️ Realtime operation blocked: User not authenticated'),
      cleanupSubscriptions: () => console.warn('⚠️ Realtime operation blocked: User not authenticated'),
      refreshStatus: () => console.warn('⚠️ Realtime operation blocked: User not authenticated'),
      forceRefresh: () => console.warn('⚠️ Realtime operation blocked: User not authenticated'),
      
      initializeSubscriptionsAsync: async (): Promise<RealtimeOperationResult<RealtimeStatus>> => ({ 
        success: false, 
        error: authError 
      }),
      cleanupSubscriptionsAsync: async (): Promise<RealtimeOperationResult<void>> => ({ 
        success: false, 
        error: authError 
      }),
      refreshStatusAsync: async (): Promise<RealtimeOperationResult<RealtimeStatus>> => ({ 
        success: false, 
        error: authError 
      }),
      
      getRealtimeQueryKey: () => ['realtime', 'unauthenticated'],
      isUserAuthenticated: false,
      isInitialized: false
    };
  }

  return {
    status,
    isLoading,
    error,
    
    // Mutation states (following cart pattern)
    isInitializing: initializeSubscriptionsMutation.isPending,
    isRefreshing: refreshStatusMutation.isPending,
    isCleaning: cleanupSubscriptionsMutation.isPending,
    
    // Direct mutation functions (following cart pattern - single source of truth)
    initializeSubscriptions: initializeSubscriptionsMutation.mutate,
    cleanupSubscriptions: cleanupSubscriptionsMutation.mutate,
    refreshStatus: refreshStatusMutation.mutate,
    
    // Async mutation functions (following cart pattern)
    initializeSubscriptionsAsync: initializeSubscriptionsMutation.mutateAsync,
    cleanupSubscriptionsAsync: cleanupSubscriptionsMutation.mutateAsync,
    refreshStatusAsync: refreshStatusMutation.mutateAsync,
    
    // Utility functions (following cart pattern)
    forceRefresh,
    
    // Query keys for external use (following cart pattern)
    getRealtimeQueryKey,
    
    // Legacy support
    isUserAuthenticated: !!user,
    isInitialized: status.isInitialized
  };
};

/**
 * Enhanced Hook to listen for real-time update notifications with React Query integration
 * Components can use this to show user feedback when data updates
 * Following useCart.ts golden standard patterns
 */
export const useRealtimeNotifications = () => {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  
  // Create auth error for unauthenticated users
  const authError = !user?.id ? createRealtimeError(
    'AUTHENTICATION_REQUIRED',
    'User not authenticated',
    'Please sign in to receive notifications'
  ) : null;
  
  // Query for notification history (following cart pattern)
  const notificationKeys = user?.id ? realtimeKeys.lists(user.id) : ['notifications', 'unauthenticated'];
  
  const {
    data: notificationHistory = [],
    isLoading
  } = useQuery({
    queryKey: notificationKeys,
    queryFn: async () => {
      // This could be enhanced to fetch notification history from a service
      return [];
    },
    staleTime: 30 * 1000, // 30 seconds (following cart pattern)
    gcTime: 2 * 60 * 1000, // 2 minutes (following cart pattern)
    enabled: !!user?.id, // Enhanced enabled guard (following cart pattern)
  });

  // Enhanced event handling with React Query integration (following cart pattern)
  useEffect(() => {
    // Skip event listener setup if user is not authenticated
    if (!user?.id) {
      return;
    }

    const handleRealtimeUpdate = (event: CustomEvent<{ message: string }>) => {
      setLastUpdate(event.detail.message);
      setUpdateCount(prev => prev + 1);
      
      // Invalidate relevant queries when realtime updates occur (following cart pattern)
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      // Clear the message after 3 seconds
      setTimeout(() => {
        setLastUpdate(null);
      }, 3000);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('realtimeUpdate', handleRealtimeUpdate as EventListener);
      
      return () => {
        window.removeEventListener('realtimeUpdate', handleRealtimeUpdate as EventListener);
      };
    }
  }, [user?.id, queryClient]);
  
  // Enhanced return with useCallback for stable references (following cart pattern)
  const getNotificationQueryKey = useCallback(() => notificationKeys, [user?.id]);

  // Handle unauthenticated users by returning safe defaults
  if (authError) {
    return {
      lastUpdate: null,
      updateCount: 0,
      hasRecentUpdate: false,
      notificationHistory: [],
      isLoading: false,
      error: authError,
      getNotificationQueryKey,
    };
  }

  return {
    lastUpdate,
    updateCount,
    hasRecentUpdate: !!lastUpdate,
    notificationHistory,
    isLoading,
    error: null,
    
    // Query keys for external use (following cart pattern)
    getNotificationQueryKey,
  };
};
