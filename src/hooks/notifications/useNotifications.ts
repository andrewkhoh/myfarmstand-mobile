import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import {
  notificationService,
  Notification,
  NotificationPreferences,
  AlertRule
} from '../../services/notifications/notificationService';
import { useCurrentUser } from '../useAuth';
import { useUnifiedRealtime } from '../useUnifiedRealtime';
import { notificationKeys } from '../../utils/queryKeyFactory';

export interface NotificationFilters {
  category?: Notification['category'];
  urgency?: Notification['urgency'];
  unreadOnly?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export function useNotifications() {
  const { data: user } = useCurrentUser();
  const { refreshAll } = useUnifiedRealtime();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<NotificationFilters>({
    unreadOnly: false
  });

  const [page, setPage] = useState(0);
  const limit = 20;

  // Notifications query
  const notificationsQuery = useQuery({
    queryKey: notificationKeys.list(user?.id, filters, page),
    queryFn: async () => {
      if (!user?.id) throw new Error('Authentication required');

      return await notificationService.getNotifications(user.id, {
        limit,
        offset: page * limit,
        category: filters.category,
        unreadOnly: filters.unreadOnly
      });
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Unread count query
  const unreadCountQuery = useQuery({
    queryKey: ['notifications', 'unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Authentication required');
      return await notificationService.getUnreadCount(user.id);
    },
    enabled: !!user?.id,
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });

  // Preferences query
  const preferencesQuery = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Authentication required');
      return await notificationService.getPreferences(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => {
      return await notificationService.sendNotification(notification);
    },
    onSuccess: () => {
      // Refresh notifications and unread count
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refreshAll();
    },
    onError: (error) => {
      console.error('Failed to send notification:', error);
    }
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      await notificationService.markAsRead(notificationIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Failed to mark notifications as read:', error);
    }
  });

  // Delete notifications mutation
  const deleteNotificationsMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      await notificationService.deleteNotifications(notificationIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Failed to delete notifications:', error);
    }
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (preferences: NotificationPreferences) => {
      if (!user?.id) throw new Error('Authentication required');
      await notificationService.updatePreferences(user.id, preferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
    onError: (error) => {
      console.error('Failed to update preferences:', error);
    }
  });

  // Helper functions
  const markAllAsRead = useCallback(async () => {
    const notifications = notificationsQuery?.data?.notifications || [];
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);

    if (unreadIds.length > 0) {
      await markAsReadMutation.mutateAsync(unreadIds);
    }
  }, [notificationsQuery?.data?.notifications, markAsReadMutation]);

  const markAsRead = useCallback(async (notificationIds: string[]) => {
    await markAsReadMutation.mutateAsync(notificationIds);
  }, [markAsReadMutation]);

  const deleteNotifications = useCallback(async (notificationIds: string[]) => {
    await deleteNotificationsMutation.mutateAsync(notificationIds);
  }, [deleteNotificationsMutation]);

  const sendNotification = useCallback(async (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => {
    return await sendNotificationMutation.mutateAsync(notification);
  }, [sendNotificationMutation]);

  const updatePreferences = useCallback(async (preferences: NotificationPreferences) => {
    await updatePreferencesMutation.mutateAsync(preferences);
  }, [updatePreferencesMutation]);

  // Filter management
  const updateFilters = useCallback((newFilters: Partial<NotificationFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(0); // Reset to first page when filters change
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ unreadOnly: false });
    setPage(0);
  }, []);

  // Pagination
  const loadMore = useCallback(() => {
    if (notificationsQuery.data && notificationsQuery.data.notifications.length < notificationsQuery.data.total) {
      setPage(prev => prev + 1);
    }
  }, [notificationsQuery.data]);

  const hasMore = useCallback(() => {
    if (!notificationsQuery.data) return false;
    return (page + 1) * limit < notificationsQuery.data.total;
  }, [notificationsQuery.data, page]);

  // Real-time updates
  useEffect(() => {
    const handleRealtimeUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    // Listen for real-time updates
    refreshAll();

    return () => {
      // Cleanup if needed
    };
  }, [refreshAll, queryClient]);

  return {
    // Data
    notifications: notificationsQuery?.data?.notifications || [],
    totalNotifications: notificationsQuery?.data?.total || 0,
    unreadCount: unreadCountQuery.data || 0,
    preferences: preferencesQuery.data,

    // Loading states
    isLoadingNotifications: notificationsQuery.isLoading,
    isLoadingUnreadCount: unreadCountQuery.isLoading,
    isLoadingPreferences: preferencesQuery.isLoading,

    // Mutation states
    isSendingNotification: sendNotificationMutation.isPending,
    isMarkingAsRead: markAsReadMutation.isPending,
    isDeleting: deleteNotificationsMutation.isPending,
    isUpdatingPreferences: updatePreferencesMutation.isPending,

    // Error states
    notificationsError: notificationsQuery.error,
    unreadCountError: unreadCountQuery.error,
    preferencesError: preferencesQuery.error,

    // Actions
    sendNotification,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    updatePreferences,

    // Filters and pagination
    filters,
    updateFilters,
    clearFilters,
    page,
    loadMore,
    hasMore: hasMore(),

    // Utilities
    refetch: notificationsQuery.refetch,
    refetchUnreadCount: unreadCountQuery.refetch,
    refetchPreferences: preferencesQuery.refetch,

    // Categories and urgency levels
    categories: ['inventory', 'marketing', 'sales', 'system', 'security'] as const,
    urgencyLevels: ['low', 'medium', 'high', 'critical'] as const,

    // Helper utilities
    getCategoryIcon: (category: Notification['category']) => {
      switch (category) {
        case 'inventory': return '📦';
        case 'marketing': return '📈';
        case 'sales': return '💰';
        case 'system': return '⚙️';
        case 'security': return '🔒';
        default: return '📋';
      }
    },

    getUrgencyColor: (urgency: Notification['urgency']) => {
      switch (urgency) {
        case 'low': return '#28a745';
        case 'medium': return '#ffc107';
        case 'high': return '#fd7e14';
        case 'critical': return '#dc3545';
        default: return '#6c757d';
      }
    },

    formatTimeAgo: (date: Date) => {
      const now = new Date();
      const diff = now.getTime() - date.getTime();

      if (diff < 60 * 1000) return 'just now';
      if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
      if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
      if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`;
      return date.toLocaleDateString();
    }
  };
}

// Hook for notification preferences management
export function useNotificationPreferences() {
  const { preferences, updatePreferences, isLoadingPreferences, isUpdatingPreferences } = useNotifications();

  const toggleCategory = useCallback((category: keyof NotificationPreferences['categories']) => {
    if (!preferences) return;

    const newPreferences = {
      ...preferences,
      categories: {
        ...preferences.categories,
        [category]: !preferences.categories[category]
      }
    };

    updatePreferences(newPreferences);
  }, [preferences, updatePreferences]);

  const toggleUrgencyLevel = useCallback((level: keyof NotificationPreferences['urgencyLevels']) => {
    if (!preferences) return;

    const newPreferences = {
      ...preferences,
      urgencyLevels: {
        ...preferences.urgencyLevels,
        [level]: !preferences.urgencyLevels[level]
      }
    };

    updatePreferences(newPreferences);
  }, [preferences, updatePreferences]);

  const toggleQuietHours = useCallback(() => {
    if (!preferences) return;

    const newPreferences = {
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        enabled: !preferences.quietHours.enabled
      }
    };

    updatePreferences(newPreferences);
  }, [preferences, updatePreferences]);

  const updateQuietHoursTime = useCallback((start?: string, end?: string) => {
    if (!preferences) return;

    const newPreferences = {
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        ...(start && { start }),
        ...(end && { end })
      }
    };

    updatePreferences(newPreferences);
  }, [preferences, updatePreferences]);

  return {
    preferences,
    isLoading: isLoadingPreferences,
    isUpdating: isUpdatingPreferences,
    updatePreferences,
    toggleCategory,
    toggleUrgencyLevel,
    toggleQuietHours,
    updateQuietHoursTime
  };
}

// Hook for alert rules management
export function useAlertRules() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  // Alert rules query
  const alertRulesQuery = useQuery({
    queryKey: ['alert-rules', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Authentication required');
      // This would be implemented in the notification service
      return [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Create alert rule mutation
  const createAlertRuleMutation = useMutation({
    mutationFn: async (rule: Omit<AlertRule, 'id'>) => {
      return await notificationService.createAlertRule(rule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    }
  });

  // Update alert rule mutation
  const updateAlertRuleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AlertRule> }) => {
      await notificationService.updateAlertRule(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    }
  });

  // Delete alert rule mutation
  const deleteAlertRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      await notificationService.deleteAlertRule(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    }
  });

  return {
    alertRules: alertRulesQuery.data || [],
    isLoading: alertRulesQuery.isLoading,
    error: alertRulesQuery.error,

    createAlertRule: createAlertRuleMutation.mutate,
    updateAlertRule: updateAlertRuleMutation.mutate,
    deleteAlertRule: deleteAlertRuleMutation.mutate,

    isCreating: createAlertRuleMutation.isPending,
    isUpdating: updateAlertRuleMutation.isPending,
    isDeleting: deleteAlertRuleMutation.isPending,

    refetch: alertRulesQuery.refetch
  };
}