import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal
} from 'react-native';
import { useNotifications } from '../../hooks/notifications/useNotifications';
import { NotificationCenter } from './NotificationCenter';

interface NotificationBellProps {
  size?: 'small' | 'medium' | 'large';
  showBadge?: boolean;
  onPress?: () => void;
  style?: any;
}

export function NotificationBell({
  size = 'medium',
  showBadge = true,
  onPress,
  style
}: NotificationBellProps) {
  const { unreadCount, refetchUnreadCount } = useNotifications();
  const [showCenter, setShowCenter] = useState(false);
  const [shakeAnimation] = useState(new Animated.Value(0));

  // Shake animation for new notifications
  useEffect(() => {
    if (unreadCount > 0) {
      const shake = () => {
        Animated.sequence([
          Animated.timing(shakeAnimation, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true
          }),
          Animated.timing(shakeAnimation, {
            toValue: -10,
            duration: 100,
            useNativeDriver: true
          }),
          Animated.timing(shakeAnimation, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true
          }),
          Animated.timing(shakeAnimation, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true
          })
        ]).start();
      };

      // Shake when first mounted with unread notifications
      shake();

      // Set up periodic refresh
      const interval = setInterval(() => {
        refetchUnreadCount();
      }, 30000); // Check every 30 seconds

      return () => clearInterval(interval);
    }
  }, [unreadCount, shakeAnimation, refetchUnreadCount]);

  const getBellSize = () => {
    switch (size) {
      case 'small': return 20;
      case 'medium': return 24;
      case 'large': return 28;
      default: return 24;
    }
  };

  const getBadgeSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'medium': return 18;
      case 'large': return 20;
      default: return 18;
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      setShowCenter(true);
    }
  };

  const bellSize = getBellSize();
  const badgeSize = getBadgeSize();

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          { transform: [{ translateX: shakeAnimation }] },
          style
        ]}
      >
        <TouchableOpacity
          style={[styles.button, { width: bellSize + 8, height: bellSize + 8 }]}
          onPress={handlePress}
          accessibilityLabel={`Notifications, ${unreadCount} unread`}
          accessibilityRole="button"
        >
          {/* Bell Icon */}
          <View style={[styles.bellIcon, { width: bellSize, height: bellSize }]}>
            <Text style={[styles.bellText, { fontSize: bellSize * 0.8 }]}>🔔</Text>
          </View>

          {/* Unread Badge */}
          {showBadge && unreadCount > 0 && (
            <View
              style={[
                styles.badge,
                {
                  width: badgeSize,
                  height: badgeSize,
                  borderRadius: badgeSize / 2,
                  top: -2,
                  right: -2
                }
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { fontSize: Math.max(badgeSize * 0.6, 10) }
                ]}
                numberOfLines={1}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Notification Center Modal */}
      <NotificationCenter
        visible={showCenter}
        onClose={() => setShowCenter(false)}
      />
    </>
  );
}

// Compact notification indicator for status bars
export function NotificationIndicator({ style }: { style?: any }) {
  const { unreadCount } = useNotifications();

  if (unreadCount === 0) return null;

  return (
    <View style={[styles.indicator, style]}>
      <View style={styles.indicatorDot} />
      <Text style={styles.indicatorText}>{unreadCount}</Text>
    </View>
  );
}

// Floating notification bell for overlays
export function FloatingNotificationBell({
  position = 'top-right',
  style
}: {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  style?: any;
}) {
  const getPositionStyle = () => {
    const base = { position: 'absolute' as const, zIndex: 1000 };

    switch (position) {
      case 'top-left':
        return { ...base, top: 50, left: 20 };
      case 'top-right':
        return { ...base, top: 50, right: 20 };
      case 'bottom-left':
        return { ...base, bottom: 50, left: 20 };
      case 'bottom-right':
        return { ...base, bottom: 50, right: 20 };
      default:
        return { ...base, top: 50, right: 20 };
    }
  };

  return (
    <View style={[getPositionStyle(), style]}>
      <NotificationBell size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'transparent'
  },
  bellIcon: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  bellText: {
    color: '#6c757d'
  },
  badge: {
    position: 'absolute',
    backgroundColor: '#dc3545',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dc3545',
    marginRight: 4
  },
  indicatorText: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '600'
  }
});