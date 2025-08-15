import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { NotificationService, NotificationRequest, NotificationResult } from '../services/notificationService';
import { useCurrentUser } from './useAuth';
import { Order } from '../types';
import { createQueryKeyFactory } from '../utils/queryKeyFactory';
import { createBroadcastHelper } from '../utils/broadcastFactory';

// Query key factory for notification operations (following cart pattern)
const notificationKeys = createQueryKeyFactory({
  entity: 'auth', // Using 'auth' as closest match for notifications
  isolation: 'user-specific'
});

// Broadcast helper for notification events (following cart pattern)
const notificationBroadcast = createBroadcastHelper({
  entity: 'auth', // Using 'auth' as closest match for notifications
  target: 'user-specific'
});

// TypeScript interfaces for notification data
interface NotificationHistory {
  id: string;
  type: string;
  userId: string;
  customerName?: string;
  status: 'sent' | 'failed' | 'pending';
  createdAt: string;
  message?: string;
}

interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  orderReady: boolean;
  orderCancelled: boolean;
  promotions: boolean;
  updatedAt: string;
}

/**
 * Hook for notification operations following React Query atomic pattern
 * Aligned with CartService golden standard
 */
export const useNotifications = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  // Authentication guard (following cart pattern)
  if (!user?.id) {
    console.warn('useNotifications: No authenticated user found');
    return {
      // Safe no-op functions
      isSending: false,
      sendError: null,
      sendNotification: () => {},
      sendNotificationAsync: async () => ({ success: false, message: 'Not authenticated' }),
      updatePreferences: () => {},
      updatePreferencesAsync: async () => ({ success: false, message: 'Not authenticated' }),
      
      // Empty query data
      notificationHistory: [],
      preferences: null,
      isLoadingHistory: false,
      isLoadingPreferences: false,
      
      // Query keys
      getNotificationQueryKey: () => ['notifications'],
    };
  }

  // Notification history query (following cart pattern)
  const notificationHistoryQuery = useQuery({
    queryKey: notificationKeys.lists(user.id),
    queryFn: async (): Promise<NotificationHistory[]> => {
      try {
        // TODO: Implement getNotificationHistory in NotificationService
        // const result = await NotificationService.getNotificationHistory(user.id);
        const result = { data: [] }; // Mock for now
        return result.data || [];
      } catch (error) {
        console.error('Failed to fetch notification history:', error);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Notification preferences query (following cart pattern)
  const preferencesQuery = useQuery({
    queryKey: notificationKeys.detail(user.id, 'preferences'),
    queryFn: async (): Promise<NotificationPreferences | null> => {
      try {
        // TODO: Implement getPreferences in NotificationService
        // const result = await NotificationService.getPreferences(user.id);
        const result = { data: null }; // Mock for now
        return result.data || {
          userId: user.id,
          emailEnabled: true,
          smsEnabled: true,
          inAppEnabled: true,
          orderReady: true,
          orderCancelled: true,
          promotions: false,
          updatedAt: new Date().toISOString()
        };
      } catch (error) {
        console.error('Failed to fetch notification preferences:', error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Send notification mutation (following cart pattern)
  const sendNotificationMutation = useMutation({
    mutationFn: (request: NotificationRequest) =>
      NotificationService.sendNotification(request),
    
    onMutate: async (request: NotificationRequest) => {
      // Cancel outgoing queries to prevent race conditions (following cart pattern)
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists(user.id) });
      
      // Snapshot previous values for rollback (following cart pattern)
      const previousHistory = queryClient.getQueryData(notificationKeys.lists(user.id));
      
      // Optimistically add notification to cache (following cart pattern)
      const optimisticNotification: NotificationHistory = {
        id: `temp-${Date.now()}`,
        type: request.type,
        userId: request.userId,
        customerName: request.customerName,
        status: 'pending',
        createdAt: new Date().toISOString(),
        message: (request as any).message || `${request.type} notification`
      };
      
      queryClient.setQueryData(notificationKeys.lists(user.id), (old: NotificationHistory[] | undefined) => 
        old ? [optimisticNotification, ...old] : [optimisticNotification]
      );
      
      return { previousHistory };
    },
    
    onSuccess: async (result, request) => {
      console.log('✅ Notification sent successfully:', result);
      
      // Broadcast notification event for real-time sync (following cart pattern)
      try {
        await notificationBroadcast.send('notification-sent', {
          userId: request.userId,
          type: request.type,
          timestamp: new Date().toISOString()
        });
      } catch (broadcastError) {
        console.warn('Failed to broadcast notification event:', broadcastError);
        // Non-blocking - notification was sent successfully
      }
      
      // Invalidate notification queries to refresh data (following cart pattern)
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists(user.id) });
    },
    
    onError: (error, request, context) => {
      console.error('❌ Failed to send notification:', error);
      
      // Rollback optimistic updates (following cart pattern)
      if (context?.previousHistory) {
        queryClient.setQueryData(notificationKeys.lists(user.id), context.previousHistory);
      }
    }
    // ✅ NO onSettled - invalidation happens in onSuccess only (following cart pattern)
  });

  // Update preferences mutation (following cart pattern)
  const updatePreferencesMutation = useMutation({
    mutationFn: (preferences: Partial<NotificationPreferences>) => {
      // TODO: Implement updatePreferences in NotificationService
      // return NotificationService.updatePreferences(user.id, preferences);
      return Promise.resolve({ success: true, data: preferences });
    },
    
    onMutate: async (newPreferences) => {
      // Cancel outgoing queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: notificationKeys.detail(user.id, 'preferences') });
      
      // Snapshot previous values for rollback
      const previousPreferences = queryClient.getQueryData(notificationKeys.detail(user.id, 'preferences'));
      
      // Optimistically update preferences
      queryClient.setQueryData(notificationKeys.detail(user.id, 'preferences'), (old: NotificationPreferences | null) => 
        old ? { ...old, ...newPreferences, updatedAt: new Date().toISOString() } : null
      );
      
      return { previousPreferences };
    },
    
    onSuccess: async (result) => {
      console.log('✅ Notification preferences updated:', result);
      
      // Broadcast preferences update
      try {
        await notificationBroadcast.send('preferences-updated', {
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      } catch (broadcastError) {
        console.warn('Failed to broadcast preferences update:', broadcastError);
      }
      
      // Invalidate preferences query
      queryClient.invalidateQueries({ queryKey: notificationKeys.detail(user.id, 'preferences') });
    },
    
    onError: (error, variables, context) => {
      console.error('❌ Failed to update preferences:', error);
      
      // Rollback optimistic updates
      if (context?.previousPreferences) {
        queryClient.setQueryData(notificationKeys.detail(user.id, 'preferences'), context.previousPreferences);
      }
    }
  });

  // Single useCallback for stable reference (following cart pattern)
  const getNotificationQueryKey = useCallback((userId: string) => notificationKeys.lists(userId), []);

  return {
    // Mutation states (following cart pattern)
    isSending: sendNotificationMutation.isPending,
    sendError: sendNotificationMutation.error,
    isUpdatingPreferences: updatePreferencesMutation.isPending,
    preferencesError: updatePreferencesMutation.error,
    
    // Query data (following cart pattern)
    notificationHistory: notificationHistoryQuery.data || [],
    preferences: preferencesQuery.data,
    isLoadingHistory: notificationHistoryQuery.isLoading,
    isLoadingPreferences: preferencesQuery.isLoading,
    
    // Direct mutation functions (following cart pattern - single source of truth)
    sendNotification: sendNotificationMutation.mutate,
    sendNotificationAsync: sendNotificationMutation.mutateAsync,
    updatePreferences: updatePreferencesMutation.mutate,
    updatePreferencesAsync: updatePreferencesMutation.mutateAsync,
    
    // Query keys for external use (following cart pattern)
    getNotificationQueryKey,
  };
};

export { notificationKeys, type NotificationHistory, type NotificationPreferences };
