import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { NotificationService, NotificationRequest, NotificationResult } from '../services/notificationService';
import { useCurrentUser } from './useAuth';
import { Order } from '../types';

// Query keys for notification operations
const notificationKeys = {
  all: ['notifications'] as const,
  history: (userId: string) => [...notificationKeys.all, 'history', userId] as const,
  preferences: (userId: string) => [...notificationKeys.all, 'preferences', userId] as const,
};

/**
 * Hook for notification operations following React Query atomic pattern
 */
export const useNotifications = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: (request: NotificationRequest) =>
      NotificationService.sendNotification(request),
    
    onMutate: async (request: NotificationRequest) => {
      // Cancel outgoing queries to prevent race conditions (following cart pattern)
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['notifications', 'user', request.userId] });
      
      // Snapshot previous values for rollback (following cart pattern)
      const previousNotifications = queryClient.getQueryData(['notifications']);
      const previousUserNotifications = queryClient.getQueryData(['notifications', 'user', request.userId]);
      
      // Optimistically add notification to cache (following cart pattern)
      const optimisticNotification = {
        id: `temp-${Date.now()}`,
        type: request.type,
        userId: request.userId,
        customerName: request.customerName,
        status: 'sending' as const,
        createdAt: new Date().toISOString()
      };
      
      queryClient.setQueryData(['notifications'], (old: any[] | undefined) => 
        old ? [optimisticNotification, ...old] : [optimisticNotification]
      );
      
      queryClient.setQueryData(['notifications', 'user', request.userId], (old: any[] | undefined) => 
        old ? [optimisticNotification, ...old] : [optimisticNotification]
      );
      
      return { previousNotifications, previousUserNotifications };
    },
    
    onSuccess: async (result, request) => {
      console.log('✅ Notification sent successfully:', result);
      
      // Broadcast notification event for real-time sync (following cart pattern)
      // Note: Notifications don't typically need broadcasts, but maintaining pattern consistency
      
      // Invalidate notification queries to refresh data (following cart pattern)
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    
    onError: (error, request, context) => {
      console.error('❌ Failed to send notification:', error);
      
      // Rollback optimistic updates (following cart pattern)
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
      if (context?.previousUserNotifications) {
        queryClient.setQueryData(['notifications', 'user', request.userId], context.previousUserNotifications);
      }
    }
    // ✅ NO onSettled - invalidation happens in onSuccess only (following cart pattern)
  });

  // Single useCallback for stable reference (following cart pattern)
  const getNotificationQueryKey = useCallback((userId: string) => notificationKeys.history(userId), []);

  return {
    // Mutation states (following cart pattern)
    isSending: sendNotificationMutation.isPending,
    sendError: sendNotificationMutation.error,
    
    // Direct mutation functions (following cart pattern - single source of truth)
    sendNotification: sendNotificationMutation.mutate,
    sendNotificationAsync: sendNotificationMutation.mutateAsync,
    
    // Query keys for external use (following cart pattern)
    getNotificationQueryKey,
  };
};

export { notificationKeys };
