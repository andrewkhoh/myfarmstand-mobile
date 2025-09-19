/**
 * Role Dashboard Screen
 * Main entry point for role-based users with personalized content
 * Following docs/architectural-patterns-and-best-practices.md
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Text, Card, Loading } from '../../components';
import { useUserRole } from '../../hooks/role-based/useUserRole';
import { useRoleNavigation } from '../../hooks/role-based/useRoleNavigation';
import { useRoleMenu } from '../../hooks/role-based/useRoleMenu';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { UserRole, NavigationMenuItem } from '../../types';

interface DashboardWidget {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  permissions: string[];
  priority: number;
  visible: boolean;
}

interface RoleDashboardScreenProps {
  testID?: string;
}

export const RoleDashboardScreen: React.FC<RoleDashboardScreenProps> = ({
  testID = 'role-dashboard-screen'
}) => {
  const navigation = useNavigation();
  const { width: screenWidth } = Dimensions.get('window');
  const isTablet = screenWidth > 768;

  // Role-based hooks following architectural patterns
  const { 
    data: userRole, 
    isLoading: isRoleLoading, 
    error: roleError,
    refetch: refetchRole 
  } = useUserRole();

  const {
    menuItems,
    isMenuLoading,
    menuError,
    navigateTo,
    getDefaultScreen,
    refetchMenu,
    hasMenuItems
  } = useRoleNavigation();

  const {
    menuItems: roleMenuItems,
    isLoading: isMenuItemsLoading,
    refreshMenu
  } = useRoleMenu();

  // Dashboard state
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Role-specific dashboard configuration
  const dashboardConfig = useMemo(() => {
    if (!userRole?.role) return null;

    const configs = {
      customer: {
        title: 'Welcome to MyFarmstand',
        subtitle: 'Discover fresh, local produce',
        primaryColor: '#4CAF50',
        widgets: ['quick-order', 'recent-orders', 'favorites', 'recommendations']
      },
      farmer: {
        title: 'Farmer Dashboard',
        subtitle: 'Manage your products and orders',
        primaryColor: '#8BC34A',
        widgets: ['sales-overview', 'inventory-alerts', 'recent-orders', 'analytics']
      },
      vendor: {
        title: 'Vendor Portal',
        subtitle: 'Track your business performance',
        primaryColor: '#FF9800',
        widgets: ['revenue-summary', 'inventory-status', 'order-management', 'analytics']
      },
      admin: {
        title: 'Admin Dashboard',
        subtitle: 'System management and oversight',
        primaryColor: '#2196F3',
        widgets: ['system-health', 'user-management', 'analytics', 'reports']
      },
      staff: {
        title: 'Staff Dashboard', 
        subtitle: 'Order fulfillment and support',
        primaryColor: '#9C27B0',
        widgets: ['pending-orders', 'inventory-check', 'customer-support', 'tasks']
      }
    };

    return configs[userRole.role as UserRole];
  }, [userRole?.role]);

  // Quick actions based on role
  const quickActions = useMemo(() => {
    if (!userRole?.role || !hasMenuItems) return [];

    const actionMap: Record<UserRole, Array<{ 
      title: string; 
      screen: string; 
      icon: string; 
      color: string;
      permissions?: string[];
    }>> = {
      customer: [
        { title: 'Browse Products', screen: 'ProductsScreen', icon: '🛍️', color: '#4CAF50' },
        { title: 'View Cart', screen: 'CartScreen', icon: '🛒', color: '#FF9800' },
        { title: 'My Orders', screen: 'OrdersScreen', icon: '📦', color: '#2196F3' },
        { title: 'Profile', screen: 'ProfileScreen', icon: '👤', color: '#9C27B0' }
      ],
      farmer: [
        { title: 'Add Product', screen: 'ProductManagementScreen', icon: '➕', color: '#4CAF50' },
        { title: 'Inventory', screen: 'InventoryScreen', icon: '📦', color: '#FF9800' },
        { title: 'Orders', screen: 'OrdersScreen', icon: '📋', color: '#2196F3' },
        { title: 'Analytics', screen: 'AnalyticsScreen', icon: '📊', color: '#9C27B0' }
      ],
      vendor: [
        { title: 'Products', screen: 'ProductManagementScreen', icon: '🏪', color: '#4CAF50' },
        { title: 'Inventory', screen: 'InventoryScreen', icon: '📦', color: '#FF9800' },
        { title: 'Orders', screen: 'OrdersScreen', icon: '📋', color: '#2196F3' },
        { title: 'Analytics', screen: 'AnalyticsScreen', icon: '📊', color: '#9C27B0' }
      ],
      admin: [
        { title: 'Users', screen: 'UserManagementScreen', icon: '👥', color: '#4CAF50' },
        { title: 'Products', screen: 'ProductManagementScreen', icon: '🏪', color: '#FF9800' },
        { title: 'Analytics', screen: 'AnalyticsScreen', icon: '📊', color: '#2196F3' },
        { title: 'Settings', screen: 'SystemSettingsScreen', icon: '⚙️', color: '#9C27B0' }
      ],
      staff: [
        { title: 'Orders', screen: 'OrdersScreen', icon: '📋', color: '#4CAF50' },
        { title: 'Inventory', screen: 'InventoryScreen', icon: '📦', color: '#FF9800' },
        { title: 'Support', screen: 'CustomerSupportScreen', icon: '💬', color: '#2196F3' },
        { title: 'Tasks', screen: 'TasksScreen', icon: '✅', color: '#9C27B0' }
      ]
    };

    return actionMap[userRole.role as UserRole] || [];
  }, [userRole?.role, hasMenuItems]);

  // Handle navigation with permission checking
  const handleNavigation = useCallback(async (screenName: string) => {
    try {
      await navigateTo(screenName, undefined, 'quick-action-tap');
      
      ValidationMonitor.recordPatternSuccess({
        service: 'RoleDashboardScreen' as const,
        pattern: 'user_interaction' as const,
        operation: 'quickActionNavigation' as const
      });
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RoleDashboardScreen.handleNavigation',
        errorMessage: error instanceof Error ? error.message : 'Navigation failed',
        errorCode: 'DASHBOARD_NAVIGATION_FAILED'
      });

      Alert.alert(
        'Navigation Error',
        error instanceof Error ? error.message : 'Unable to navigate to this screen',
        [{ text: 'OK' }]
      );
    }
  }, [navigateTo]);

  // Handle pull to refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
      await Promise.all([
        refetchRole(),
        refetchMenu(),
        refreshMenu()
      ]);

      ValidationMonitor.recordPatternSuccess({
        service: 'RoleDashboardScreen' as const,
        pattern: 'data_refresh' as const,
        operation: 'pullToRefresh' as const
      });
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RoleDashboardScreen.handleRefresh',
        errorMessage: error instanceof Error ? error.message : 'Refresh failed',
        errorCode: 'DASHBOARD_REFRESH_FAILED'
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchRole, refetchMenu, refreshMenu]);

  // Track screen focus for analytics
  useFocusEffect(
    useCallback(() => {
      ValidationMonitor.recordPatternSuccess({
        service: 'RoleDashboardScreen' as const,
        pattern: 'screen_focus' as const,
        operation: 'dashboardView' as const
      });

      // Optional: Refresh data on focus if stale
      if (userRole?.role && !isMenuItemsLoading) {
        // Could add logic to refresh if data is stale
      }
    }, [userRole?.role, isMenuItemsLoading])
  );

  // Loading state
  if (isRoleLoading || isMenuLoading || isMenuItemsLoading) {
    return (
      <View style={styles.loadingContainer} testID={`${testID}-loading`}>
        <Loading size="large" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  // Error states with graceful degradation
  if (roleError || !userRole?.role) {
    return (
      <View style={styles.errorContainer} testID={`${testID}-error`}>
        <Text style={styles.errorTitle}>Unable to Load Dashboard</Text>
        <Text style={styles.errorMessage}>
          {roleError?.message || 'Please check your connection and try again'}
        </Text>
        <Button
          title="Retry"
          onPress={handleRefresh}
          style={styles.retryButton}
          testID={`${testID}-retry-button`}
        />
      </View>
    );
  }

  const config = dashboardConfig;
  if (!config) {
    return (
      <View style={styles.errorContainer} testID={`${testID}-config-error`}>
        <Text style={styles.errorTitle}>Dashboard Configuration Error</Text>
        <Text style={styles.errorMessage}>Unknown user role: {userRole.role}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: config.primaryColor + '10' }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={config.primaryColor}
          testID={`${testID}-refresh-control`}
        />
      }
      testID={testID}
    >
      {/* Header Section */}
      <View style={[styles.header, { backgroundColor: config.primaryColor }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{config.title}</Text>
          <Text style={styles.headerSubtitle}>{config.subtitle}</Text>
          
          {userRole.userId && (
            <Text style={styles.userInfo} testID={`${testID}-user-info`}>
              Welcome back, {userRole.role}
            </Text>
          )}
        </View>

        {/* Role Badge */}
        <View style={[styles.roleBadge, { borderColor: 'white' }]}>
          <Text style={styles.roleBadgeText}>{userRole.role.toUpperCase()}</Text>
        </View>
      </View>

      {/* Quick Actions Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <View style={[
          styles.quickActionsGrid,
          isTablet && styles.quickActionsGridTablet
        ]}>
          {quickActions.map((action, index) => (
            <Card
              key={action.screen}
              style={[
                styles.quickActionCard,
                isTablet && styles.quickActionCardTablet
              ]}
              onPress={() => handleNavigation(action.screen)}
              testID={`${testID}-quick-action-${action.screen}`}
            >
              <View style={styles.quickActionContent}>
                <Text style={styles.quickActionIcon}>{action.icon}</Text>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
              </View>
            </Card>
          ))}
        </View>
      </View>

      {/* Menu Items Section */}
      {hasMenuItems && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Features</Text>
          
          <View style={styles.menuItemsList}>
            {menuItems.slice(0, 6).map((item: NavigationMenuItem, index: number) => (
              <Card
                key={item.component}
                style={styles.menuItemCard}
                onPress={() => handleNavigation(item.component)}
                testID={`${testID}-menu-item-${item.component}`}
              >
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemIcon}>{item.icon}</Text>
                  <View style={styles.menuItemInfo}>
                    <Text style={styles.menuItemName}>{item.name}</Text>
                    {item.permissions && item.permissions.length > 0 && (
                      <Text style={styles.menuItemPermissions}>
                        {item.permissions.length} permission(s)
                      </Text>
                    )}
                  </View>
                  <Text style={styles.menuItemArrow}>→</Text>
                </View>
              </Card>
            ))}
          </View>
        </View>
      )}

      {/* Menu Error State */}
      {menuError && (
        <View style={styles.section}>
          <Card style={styles.errorCard}>
            <Text style={styles.errorCardTitle}>Menu Loading Error</Text>
            <Text style={styles.errorCardMessage}>
              Some features may not be available. Pull to refresh to try again.
            </Text>
          </Card>
        </View>
      )}

      {/* Footer spacing */}
      <View style={styles.footer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 32,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  userInfo: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  roleBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 24,
    right: 24,
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionsGridTablet: {
    justifyContent: 'flex-start',
  },
  quickActionCard: {
    width: '48%',
    marginBottom: 12,
    aspectRatio: 1,
  },
  quickActionCardTablet: {
    width: '23%',
    marginRight: '2%',
  },
  quickActionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  menuItemsList: {
    gap: 12,
  },
  menuItemCard: {
    backgroundColor: 'white',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuItemIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
    textAlign: 'center',
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  menuItemPermissions: {
    fontSize: 12,
    color: '#666',
  },
  menuItemArrow: {
    fontSize: 18,
    color: '#666',
  },
  errorCard: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
  },
  errorCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 4,
  },
  errorCardMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    height: 32,
  },
});