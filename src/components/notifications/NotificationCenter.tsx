import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNotifications, NotificationFilters } from '../../hooks/notifications/useNotifications';
import { Notification } from '../../services/notifications/notificationService';

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationCenter({ visible, onClose }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    isLoadingNotifications,
    filters,
    updateFilters,
    clearFilters,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    loadMore,
    hasMore,
    getCategoryIcon,
    getUrgencyColor,
    formatTimeAgo,
    refetch
  } = useNotifications();

  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    if (filters.category) {
      filtered = filtered.filter(n => n.category === filters.category);
    }

    if (filters.urgency) {
      filtered = filtered.filter(n => n.urgency === filters.urgency);
    }

    if (filters.unreadOnly) {
      filtered = filtered.filter(n => !n.isRead);
    }

    return filtered;
  }, [notifications, filters]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSelectNotification = (notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const handleMarkSelectedAsRead = async () => {
    if (selectedNotifications.size === 0) return;

    const selectedIds = Array.from(selectedNotifications);
    await markAsRead(selectedIds);
    setSelectedNotifications(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedNotifications.size === 0) return;

    Alert.alert(
      'Delete Notifications',
      `Are you sure you want to delete ${selectedNotifications.size} notification(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const selectedIds = Array.from(selectedNotifications);
            await deleteNotifications(selectedIds);
            setSelectedNotifications(new Set());
          }
        }
      ]
    );
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      await markAsRead([notification.id]);
    }

    // Handle action URL if present
    if (notification.actionUrl) {
      // Navigation logic would go here
      console.log('Navigate to:', notification.actionUrl);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Controls */}
        <View style={styles.filterControls}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterButton, !filters.category && styles.filterButtonActive]}
              onPress={() => updateFilters({ category: undefined })}
            >
              <Text style={[styles.filterButtonText, !filters.category && styles.filterButtonTextActive]}>
                All
              </Text>
            </TouchableOpacity>

            {['inventory', 'marketing', 'sales', 'system', 'security'].map(category => (
              <TouchableOpacity
                key={category}
                style={[styles.filterButton, filters.category === category && styles.filterButtonActive]}
                onPress={() => updateFilters({ category: category as any })}
              >
                <Text style={styles.filterEmoji}>{getCategoryIcon(category as any)}</Text>
                <Text style={[styles.filterButtonText, filters.category === category && styles.filterButtonTextActive]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.filterToggle, filters.unreadOnly && styles.filterToggleActive]}
            onPress={() => updateFilters({ unreadOnly: !filters.unreadOnly })}
          >
            <Text style={[styles.filterToggleText, filters.unreadOnly && styles.filterToggleTextActive]}>
              Unread Only
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Bar */}
        {selectedNotifications.size > 0 && (
          <View style={styles.actionBar}>
            <Text style={styles.actionBarText}>
              {selectedNotifications.size} selected
            </Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleMarkSelectedAsRead}
              >
                <Text style={styles.actionButtonText}>Mark Read</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDeleteSelected}
              >
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={markAllAsRead}
            >
              <Text style={styles.quickActionText}>Mark All Read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={clearFilters}
          >
            <Text style={styles.quickActionText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications List */}
        <ScrollView
          style={styles.notificationsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onMomentumScrollEnd={(event) => {
            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;

            if (isCloseToBottom && hasMore && !isLoadingNotifications) {
              loadMore();
            }
          }}
        >
          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {filters.unreadOnly ? 'No unread notifications' : 'No notifications'}
              </Text>
            </View>
          ) : (
            filteredNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                isSelected={selectedNotifications.has(notification.id)}
                onPress={() => handleNotificationPress(notification)}
                onLongPress={() => handleSelectNotification(notification.id)}
                onSelect={() => handleSelectNotification(notification.id)}
                getCategoryIcon={getCategoryIcon}
                getUrgencyColor={getUrgencyColor}
                formatTimeAgo={formatTimeAgo}
              />
            ))
          )}

          {isLoadingNotifications && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007bff" />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

interface NotificationItemProps {
  notification: Notification;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onSelect: () => void;
  getCategoryIcon: (category: Notification['category']) => string;
  getUrgencyColor: (urgency: Notification['urgency']) => string;
  formatTimeAgo: (date: Date) => string;
}

function NotificationItem({
  notification,
  isSelected,
  onPress,
  onLongPress,
  onSelect,
  getCategoryIcon,
  getUrgencyColor,
  formatTimeAgo
}: NotificationItemProps) {
  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.isRead && styles.unreadNotification,
        isSelected && styles.selectedNotification
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationHeaderLeft}>
          <Text style={styles.categoryIcon}>
            {getCategoryIcon(notification.category)}
          </Text>
          <View>
            <Text style={[styles.notificationTitle, !notification.isRead && styles.unreadTitle]}>
              {notification.title}
            </Text>
            <Text style={styles.notificationTime}>
              {formatTimeAgo(notification.createdAt)}
            </Text>
          </View>
        </View>

        <View style={styles.notificationHeaderRight}>
          {!notification.isRead && <View style={styles.unreadDot} />}
          <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(notification.urgency) }]}>
            <Text style={styles.urgencyText}>{notification.urgency}</Text>
          </View>
          {isSelected && (
            <TouchableOpacity onPress={onSelect} style={styles.selectButton}>
              <Text style={styles.selectButtonText}>✓</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.notificationMessage} numberOfLines={3}>
        {notification.message}
      </Text>

      {notification.actionRequired && (
        <View style={styles.actionRequiredBadge}>
          <Text style={styles.actionRequiredText}>Action Required</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529'
  },
  unreadBadge: {
    backgroundColor: '#dc3545',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 24,
    alignItems: 'center'
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6c757d'
  },
  filterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4'
  },
  filterScroll: {
    flex: 1,
    marginRight: 12
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8
  },
  filterButtonActive: {
    backgroundColor: '#007bff'
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6c757d',
    textTransform: 'capitalize'
  },
  filterButtonTextActive: {
    color: '#fff'
  },
  filterEmoji: {
    marginRight: 4
  },
  filterToggle: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  filterToggleActive: {
    backgroundColor: '#28a745'
  },
  filterToggleText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600'
  },
  filterToggleTextActive: {
    color: '#fff'
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#e9ecef'
  },
  actionBarText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '600'
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    backgroundColor: '#007bff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  deleteButton: {
    backgroundColor: '#dc3545'
  },
  deleteButtonText: {
    color: '#fff'
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 12
  },
  quickActionButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  quickActionText: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600'
  },
  notificationsList: {
    flex: 1
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center'
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6c757d'
  },
  notificationItem: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    padding: 16
  },
  unreadNotification: {
    backgroundColor: '#f8f9fa'
  },
  selectedNotification: {
    backgroundColor: '#e7f3ff'
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  notificationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 8,
    marginTop: 2
  },
  notificationTitle: {
    fontSize: 16,
    color: '#212529',
    fontWeight: '600',
    marginBottom: 2
  },
  unreadTitle: {
    fontWeight: 'bold'
  },
  notificationTime: {
    fontSize: 12,
    color: '#6c757d'
  },
  notificationHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007bff'
  },
  urgencyBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  urgencyText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  selectButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center'
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  notificationMessage: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    marginBottom: 8
  },
  actionRequiredBadge: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start'
  },
  actionRequiredText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '600'
  }
});