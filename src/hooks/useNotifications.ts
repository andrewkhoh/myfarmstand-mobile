import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { NotificationService, NotificationResult } from '../services/notificationService';
import { notificationKeys } from '../utils/queryKeyFactory';
import { useCurrentUser } from './useAuth';
import { createBroadcastHelper } from '../utils/broadcastFactory';

// Enhanced interfaces following cart pattern
interface NotificationError {
  code: 'INVALID_REQUEST' | 'SEND_FAILED' | 'NETWORK_ERROR' | 'UNAUTHORIZED' | 'RATE_LIMITED' | 'UNKNOWN_ERROR';
  message: string;
  userMessage: string;
  metadata?: Record<string, any>;
}

interface NotificationOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: NotificationError;
  message?: string;
}

interface NotificationMutationContext {
  previousHistory?: NotificationHistory[];
  previousPreferences?: NotificationPreferences | null;
  operationType: 'send-notification' | 'update-preferences';
  metadata: Record<string, any>;
}

// Enhanced error creation utility (following cart pattern)
function createNotificationError(
  code: NotificationError['code'], 
  message: string, 
  userMessage: string, 
  metadata?: Record<string, any>
): NotificationError {
  return {
    code,
    message,
    userMessage,
    metadata,
    name: 'NotificationError',
  } as NotificationError & Error;
}

// ✅ REFACTORED: Using centralized notificationKeys factory from queryKeyFactory

// Broadcast helper for notification events (following cart pattern)
const notificationBroadcast = createBroadcastHelper({
  entity: 'notifications', // Using correct entity type
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
      isUpdatingPreferences: false,
      preferencesError: null,
      sendNotification: () => {},
      sendNotificationAsync: async () => ({ success: false, message: 'Not authenticated' }),
      updatePreferences: () => {},
      updatePreferencesAsync: async () => ({ success: false, message: 'Not authenticated' }),
      
      // Empty query data
      notificationHistory: [],
      preferences: null,
      isLoadingHistory: false,
      isLoadingPreferences: false,
      historyError: null,
      preferencesQueryError: null,
      
      // Query keys and utilities
      getNotificationQueryKey: () => ['notifications'],
      getPreferencesQueryKey: () => ['notifications', 'preferences'],
      refetchHistory: () => Promise.resolve({} as any),
      refetchPreferences: () => Promise.resolve({} as any),
    };
  }

  // Enhanced notification history query (following cart pattern)
  const notificationHistoryQuery = useQuery<NotificationHistory[], Error>({
    queryKey: notificationKeys.lists(user.id),
    queryFn: async (): Promise<NotificationHistory[]> => {
      // Authentication guard (following cart pattern)
      if (!user?.id) {
        throw createNotificationError(
          'UNAUTHORIZED',
          'No authenticated user',
          'Please sign in to view notification history.'
        );
      }

      try {
        // TODO: Implement getNotificationHistory in NotificationService
        // const result = await NotificationService.getNotificationHistory(user.id);
        const result = { data: [] }; // Mock for now
        return result.data || [];
      } catch (error: any) {
        console.error('Failed to fetch notification history:', error);
        
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('unauthorized')) {
          throw createNotificationError(
            'UNAUTHORIZED',
            error.message,
            'Your session has expired. Please sign in again.',
            { userId: user.id }
          );
        }
        if (error.message?.includes('network')) {
          throw createNotificationError(
            'NETWORK_ERROR',
            error.message,
            'Unable to load notification history. Please check your connection.',
            { userId: user.id }
          );
        }
        throw createNotificationError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to fetch notification history',
          'Unable to load notification history. Please try again.',
          { userId: user.id }
        );
      }
    },
    // Enhanced query configuration (following cart pattern)
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry on unauthorized errors (following cart pattern)
      if ((error as NotificationError).code === 'UNAUTHORIZED') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
    enabled: !!user?.id, // Only run when user is authenticated (following cart pattern)
  });

  // Enhanced notification preferences query (following cart pattern)
  const preferencesQuery = useQuery<NotificationPreferences | null, Error>({
    queryKey: notificationKeys.preferences(user.id),
    queryFn: async (): Promise<NotificationPreferences | null> => {
      // Authentication guard (following cart pattern)
      if (!user?.id) {
        throw createNotificationError(
          'UNAUTHORIZED',
          'No authenticated user',
          'Please sign in to view notification preferences.'
        );
      }

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
      } catch (error: any) {
        console.error('Failed to fetch notification preferences:', error);
        
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('unauthorized')) {
          throw createNotificationError(
            'UNAUTHORIZED',
            error.message,
            'Your session has expired. Please sign in again.',
            { userId: user.id }
          );
        }
        if (error.message?.includes('network')) {
          throw createNotificationError(
            'NETWORK_ERROR',
            error.message,
            'Unable to load preferences. Please check your connection.',
            { userId: user.id }
          );
        }
        throw createNotificationError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to fetch notification preferences',
          'Unable to load preferences. Please try again.',
          { userId: user.id }
        );
      }
    },
    // Enhanced query configuration (following cart pattern)
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry on unauthorized errors (following cart pattern)
      if ((error as NotificationError).code === 'UNAUTHORIZED') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
    enabled: !!user?.id, // Only run when user is authenticated (following cart pattern)
  });

  // Enhanced send notification mutation (following cart pattern)
  const sendNotificationMutation = useMutation<NotificationOperationResult<NotificationResult>, Error, NotificationRequest, NotificationMutationContext>({
    mutationFn: async (request: NotificationRequest): Promise<NotificationOperationResult<NotificationResult>> => {
      try {
        const result = await NotificationService.sendNotification(request);
        return { success: true, data: result };
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('invalid') || error.message?.includes('validation')) {
          throw createNotificationError(
            'INVALID_REQUEST',
            error.message,
            'Invalid notification request. Please check the details.',
            { request }
          );
        }
        if (error.message?.includes('rate') || error.message?.includes('limit')) {
          throw createNotificationError(
            'RATE_LIMITED',
            error.message,
            'Too many notifications sent. Please wait before sending more.',
            { request }
          );
        }
        if (error.message?.includes('unauthorized')) {
          throw createNotificationError(
            'UNAUTHORIZED',
            error.message,
            'Your session has expired. Please sign in again.',
            { request }
          );
        }
        if (error.message?.includes('network')) {
          throw createNotificationError(
            'NETWORK_ERROR',
            error.message,
            'Unable to send notification. Please check your connection.',
            { request }
          );
        }
        throw createNotificationError(
          'SEND_FAILED',
          error.message || 'Send notification failed',
          'Unable to send notification. Please try again.',
          { request }
        );
      }
    },
    
    onMutate: async (request: NotificationRequest): Promise<NotificationMutationContext> => {
      // Cancel outgoing queries to prevent race conditions (following cart pattern)
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists(user.id) });
      
      // Snapshot previous values for rollback (following cart pattern)
      const previousHistory = queryClient.getQueryData<NotificationHistory[]>(notificationKeys.lists(user.id));
      
      // Optimistically add notification to cache (following cart pattern)
      const optimisticNotification: NotificationHistory = {
        id: `temp-${Date.now()}`,
        type: request.type,
        userId: request.userId || user.id,
        customerName: request.customerName,
        status: 'pending',
        createdAt: new Date().toISOString(),
        message: (request as any).message || `${request.type} notification`
      };
      
      queryClient.setQueryData(notificationKeys.lists(user.id), (old: NotificationHistory[] | undefined) => 
        old ? [optimisticNotification, ...old] : [optimisticNotification]
      );
      
      return { 
        previousHistory, 
        operationType: 'send-notification',
        metadata: { request }
      };
    },
    
    onError: (error: any, request: NotificationRequest, context?: NotificationMutationContext) => {
      // Enhanced error logging (following cart pattern)
      console.error('❌ Failed to send notification:', {
        error: error.message,
        userMessage: (error as NotificationError).userMessage,
        type: request.type,
        userId: request.userId
      });
      
      // Rollback optimistic updates (following cart pattern)
      if (context?.previousHistory) {
        queryClient.setQueryData(notificationKeys.lists(user.id), context.previousHistory);
      }
    },
    
    onSuccess: async (result: NotificationOperationResult<NotificationResult>, request: NotificationRequest) => {
      if (result.success && result.data) {
        console.log('✅ Notification sent successfully:', {
          success: result.success,
          type: request.type,
          userId: request.userId
        });
        
        // Smart invalidation strategy (following cart pattern)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: notificationKeys.lists(user.id) }),
          queryClient.invalidateQueries({ queryKey: notificationKeys.byType(user.id, request.type) })
        ]);
        
        // Broadcast notification event for real-time sync (following cart pattern)
        await notificationBroadcast.send('notification-sent', {
          userId: request.userId,
          type: request.type,
          timestamp: new Date().toISOString()
        });
      }
    },
    
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, error: any) => {
      // Don't retry on validation errors, rate limiting, or unauthorized
      if ((error as NotificationError).code === 'INVALID_REQUEST' || 
          (error as NotificationError).code === 'RATE_LIMITED' ||
          (error as NotificationError).code === 'UNAUTHORIZED') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
    // ✅ NO onSettled - invalidation happens in onSuccess only (following cart pattern)
  });

  // Enhanced update preferences mutation (following cart pattern)
  const updatePreferencesMutation = useMutation<NotificationOperationResult<NotificationPreferences>, Error, Partial<NotificationPreferences>, NotificationMutationContext>({
    mutationFn: async (preferences: Partial<NotificationPreferences>): Promise<NotificationOperationResult<NotificationPreferences>> => {
      try {
        // TODO: Implement updatePreferences in NotificationService
        // const result = await NotificationService.updatePreferences(user.id, preferences);
        const updatedPreferences = { 
          ...preferences, 
          userId: user.id, 
          updatedAt: new Date().toISOString() 
        } as NotificationPreferences;
        return { success: true, data: updatedPreferences };
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('invalid') || error.message?.includes('validation')) {
          throw createNotificationError(
            'INVALID_REQUEST',
            error.message,
            'Invalid preferences data. Please check your settings.',
            { preferences }
          );
        }
        if (error.message?.includes('unauthorized')) {
          throw createNotificationError(
            'UNAUTHORIZED',
            error.message,
            'Your session has expired. Please sign in again.',
            { preferences }
          );
        }
        if (error.message?.includes('network')) {
          throw createNotificationError(
            'NETWORK_ERROR',
            error.message,
            'Unable to update preferences. Please check your connection.',
            { preferences }
          );
        }
        throw createNotificationError(
          'UNKNOWN_ERROR',
          error.message || 'Update preferences failed',
          'Unable to update preferences. Please try again.',
          { preferences }
        );
      }
    },
    
    onMutate: async (newPreferences: Partial<NotificationPreferences>): Promise<NotificationMutationContext> => {
      // Cancel outgoing queries to prevent race conditions (following cart pattern)
      await queryClient.cancelQueries({ queryKey: notificationKeys.preferences(user.id) });
      
      // Snapshot previous values for rollback (following cart pattern)
      const previousPreferences = queryClient.getQueryData<NotificationPreferences | null>([...notificationKeys.details(user.id), 'preferences']);
      
      // Optimistically update preferences (following cart pattern)
      queryClient.setQueryData([...notificationKeys.details(user.id), 'preferences'], (old: NotificationPreferences | null) => 
        old ? { ...old, ...newPreferences, updatedAt: new Date().toISOString() } : null
      );
      
      return { 
        previousPreferences, 
        operationType: 'update-preferences',
        metadata: { preferences: newPreferences }
      };
    },
    
    onError: (error: any, preferences: Partial<NotificationPreferences>, context?: NotificationMutationContext) => {
      // Enhanced error logging (following cart pattern)
      console.error('❌ Failed to update preferences:', {
        error: error.message,
        userMessage: (error as NotificationError).userMessage,
        userId: user.id,
        preferences
      });
      
      // Rollback optimistic updates (following cart pattern)
      if (context?.previousPreferences !== undefined) {
        queryClient.setQueryData([...notificationKeys.details(user.id), 'preferences'], context.previousPreferences);
      }
    },
    
    onSuccess: async (result: NotificationOperationResult<NotificationPreferences>, preferences: Partial<NotificationPreferences>) => {
      if (result.success && result.data) {
        console.log('✅ Notification preferences updated:', {
          userId: result.data.userId,
          updatedFields: Object.keys(preferences)
        });
        
        // Smart invalidation strategy (following cart pattern)
        await queryClient.invalidateQueries({ queryKey: notificationKeys.preferences(user.id) });
        
        // Broadcast preferences update (following cart pattern)
        await notificationBroadcast.send('preferences-updated', {
          userId: user.id,
          preferences: Object.keys(preferences),
          timestamp: new Date().toISOString()
        });
      }
    },
    
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, error: any) => {
      // Don't retry on validation errors or unauthorized
      if ((error as NotificationError).code === 'INVALID_REQUEST' || 
          (error as NotificationError).code === 'UNAUTHORIZED') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
    // ✅ NO onSettled - invalidation happens in onSuccess only (following cart pattern)
  });

  // Enhanced useCallback functions for stable references (following cart pattern)
  const getNotificationQueryKey = useCallback((userId: string) => notificationKeys.lists(userId), []);
  const getPreferencesQueryKey = useCallback((userId: string) => [...notificationKeys.details(userId), 'preferences'], []);
  
  // Wrapped mutation functions with useCallback for stable references (following cart pattern)
  const sendNotification = useCallback(
    (request: NotificationRequest) => sendNotificationMutation.mutate(request),
    [sendNotificationMutation.mutate]
  );
  
  const sendNotificationAsync = useCallback(
    (request: NotificationRequest) => sendNotificationMutation.mutateAsync(request),
    [sendNotificationMutation.mutateAsync]
  );
  
  const updatePreferences = useCallback(
    (preferences: Partial<NotificationPreferences>) => updatePreferencesMutation.mutate(preferences),
    [updatePreferencesMutation.mutate]
  );
  
  const updatePreferencesAsync = useCallback(
    (preferences: Partial<NotificationPreferences>) => updatePreferencesMutation.mutateAsync(preferences),
    [updatePreferencesMutation.mutateAsync]
  );

  return {
    // Enhanced mutation states (following cart pattern)
    isSending: sendNotificationMutation.isPending,
    sendError: sendNotificationMutation.error,
    isUpdatingPreferences: updatePreferencesMutation.isPending,
    preferencesError: updatePreferencesMutation.error,
    
    // Enhanced query data with proper fallbacks (following cart pattern)
    notificationHistory: notificationHistoryQuery.data || [],
    preferences: preferencesQuery.data || null,
    isLoadingHistory: notificationHistoryQuery.isLoading,
    isLoadingPreferences: preferencesQuery.isLoading,
    historyError: notificationHistoryQuery.error,
    preferencesQueryError: preferencesQuery.error,
    
    // Enhanced mutation functions with stable references (following cart pattern)
    sendNotification,
    sendNotificationAsync,
    updatePreferences,
    updatePreferencesAsync,
    
    // Enhanced query keys for external use (following cart pattern)
    getNotificationQueryKey,
    getPreferencesQueryKey,
    
    // Enhanced query utilities (following cart pattern)
    refetchHistory: notificationHistoryQuery.refetch,
    refetchPreferences: preferencesQuery.refetch,
  };
};

export { 
  notificationKeys, 
  type NotificationHistory, 
  type NotificationPreferences,
  type NotificationError,
  type NotificationOperationResult,
  type NotificationMutationContext
};
