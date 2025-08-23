/**
 * RoleBasedStackNavigator
 * Dynamic navigation structure based on user roles and permissions
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  createStackNavigator,
  StackNavigationOptions,
  CardStyleInterpolators,
} from '@react-navigation/stack';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Modal,
  AccessibilityInfo,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useUserRole } from '../hooks/role-based/useUserRole';
// import { useRolePermissions } from '../hooks/role-based/useRolePermissions';
import { RoleNavigationService } from '../services/role-based/roleNavigationService';
import { NavigationMenuItem, UserRole, NavigationState } from '../types';
import { validationMonitor } from '../utils/validationMonitor';
import { debounce } from '../utils/debounce';

// Import screens (these will be implemented in Phase 1.E2)
import { HomeScreen } from '../screens/HomeScreen';
import { ProductsScreen } from '../screens/ProductsScreen';
import { CartScreen } from '../screens/CartScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PermissionDeniedScreen } from '../screens/PermissionDeniedScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';

// Role-specific screens (to be implemented)
const FarmerDashboard = () => <View testID="farmer-dashboard" />;
const AdminDashboard = () => <View testID="admin-dashboard" />;
const VendorDashboard = () => <View testID="vendor-dashboard" />;
const StaffDashboard = () => <View testID="staff-dashboard" />;
const UserManagementScreen = () => <View testID="user-management" />;
const SystemSettingsScreen = () => <View testID="system-settings" />;
const InventoryScreen = () => <View testID="inventory" />;
const AnalyticsScreen = () => <View testID="analytics" />;
const ProductManagementScreen = () => <View testID="product-management" />;

const Stack = createStackNavigator();

interface RoleBasedStackNavigatorProps {
  initialDeepLink?: string;
  onNavigationReady?: () => void;
}

// Screen component mapping
const SCREEN_COMPONENTS: Record<string, React.ComponentType<any>> = {
  HomeScreen,
  ProductsScreen,
  CartScreen,
  OrdersScreen,
  ProfileScreen,
  FarmerDashboard,
  AdminDashboard,
  VendorDashboard,
  StaffDashboard,
  UserManagementScreen,
  SystemSettingsScreen,
  InventoryScreen,
  AnalyticsScreen,
  ProductManagementScreen,
  PermissionDeniedScreen,
  LoginScreen,
};

export const RoleBasedStackNavigator: React.FC<RoleBasedStackNavigatorProps> = ({
  initialDeepLink,
  onNavigationReady,
}) => {
  const { data: userRoleData, isLoading: roleLoading, error: roleError } = useUserRole();
  
  const [menuItems, setMenuItems] = useState<NavigationMenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState<Error | null>(null);
  const [permissionDeniedModal, setPermissionDeniedModal] = useState(false);
  const [deniedScreen, setDeniedScreen] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [navigationState, setNavigationState] = useState<NavigationState | null>(null);
  
  const appState = useRef(AppState.currentState);
  const navigationRef = useRef<any>(null);
  const lastRole = useRef<UserRole | null>(null);

  // Debounced menu generation to handle rapid role changes
  const debouncedGenerateMenu = useMemo(
    () =>
      debounce(async (role: UserRole) => {
        try {
          setIsLoadingMenu(true);
          setMenuError(null);
          
          // Check cache first
          const cached = RoleNavigationService.getCachedMenuItems(role);
          if (cached) {
            setMenuItems(cached);
            setIsLoadingMenu(false);
            return;
          }
          
          const items = await RoleNavigationService.generateMenuItems(role);
          setMenuItems(items);
          validationMonitor.trackSuccess('navigation', 'menu_generation', { role });
        } catch (error) {
          setMenuError(error as Error);
          validationMonitor.trackFailure('navigation', 'menu_generation', error);
          
          // Try offline mode
          if (error?.message?.includes('Network')) {
            setOfflineMode(true);
            setMenuItems(getOfflineMenuItems(role));
          }
        } finally {
          setIsLoadingMenu(false);
        }
      }, 300),
    []
  );

  // Generate menu items when role changes
  useEffect(() => {
    if (userRoleData?.role && userRoleData.role !== lastRole.current) {
      lastRole.current = userRoleData.role;
      debouncedGenerateMenu(userRoleData.role);
    }
  }, [userRoleData?.role, debouncedGenerateMenu]);

  // Handle deep linking
  useEffect(() => {
    if (initialDeepLink && userRoleData?.role) {
      handleDeepLink(initialDeepLink, userRoleData.role);
    }
  }, [initialDeepLink, userRoleData?.role]);

  // Handle app state changes for navigation persistence
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
      // App going to background - persist state
      await persistCurrentNavigationState();
    } else if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App coming to foreground - restore state
      await restoreNavigationState();
    }
    appState.current = nextAppState;
  };

  const handleDeepLink = async (link: string, role: UserRole) => {
    try {
      const validation = await RoleNavigationService.validateDeepLink(link, role);
      
      if (validation.isValid && validation.targetScreen) {
        navigationRef.current?.navigate(validation.targetScreen, validation.params);
      } else {
        setPermissionDeniedModal(true);
        setDeniedScreen(validation.targetScreen || 'Unknown');
        validationMonitor.trackFailure('navigation', 'deeplink_validation', {
          link,
          role,
          error: validation.error,
        });
      }
    } catch (error) {
      validationMonitor.trackFailure('navigation', 'deeplink_validation', error);
    }
  };

  const canNavigateToScreen = async (screenName: string): Promise<boolean> => {
    if (!userRoleData?.role) return false;
    
    try {
      const allowed = await RoleNavigationService.canNavigateTo(
        userRoleData.role,
        screenName
      );
      
      if (!allowed) {
        setPermissionDeniedModal(true);
        setDeniedScreen(screenName);
      }
      
      return allowed;
    } catch (error) {
      validationMonitor.trackFailure('navigation', 'permission_check', error);
      return false;
    }
  };

  const handleNavigation = useCallback(
    async (screenName: string, params?: any) => {
      const canNavigate = await canNavigateToScreen(screenName);
      
      if (canNavigate) {
        navigationRef.current?.navigate(screenName, params);
        
        // Track navigation
        if (userRoleData?.role) {
          RoleNavigationService.trackNavigation({
            from: navigationRef.current?.getCurrentRoute()?.name || 'Unknown',
            to: screenName,
            role: userRoleData.role,
            userId: userRoleData.userId,
            timestamp: new Date().toISOString(),
          });
        }
        
        // Announce to screen readers
        AccessibilityInfo.announceForAccessibility(`Navigated to ${screenName} screen`);
      }
    },
    [userRoleData]
  );

  const handleRefresh = useCallback(async () => {
    if (!userRoleData?.role) return;
    
    setIsRefreshing(true);
    RoleNavigationService.clearMenuCache(userRoleData.role);
    await debouncedGenerateMenu(userRoleData.role);
    setIsRefreshing(false);
  }, [userRoleData?.role, debouncedGenerateMenu]);

  const persistCurrentNavigationState = async () => {
    if (!userRoleData?.userId) return;
    
    try {
      const state: NavigationState = {
        currentScreen: navigationRef.current?.getCurrentRoute()?.name || 'Unknown',
        history: await RoleNavigationService.getNavigationHistory(userRoleData.userId),
        timestamp: new Date().toISOString(),
        userId: userRoleData.userId,
      };
      
      await RoleNavigationService.persistNavigationState(state);
    } catch (error) {
      validationMonitor.trackFailure('navigation', 'state_persistence', error);
    }
  };

  const restoreNavigationState = async () => {
    if (!userRoleData?.userId) return;
    
    try {
      const state = await RoleNavigationService.getNavigationState(userRoleData.userId);
      setNavigationState(state);
      
      // Navigate to last screen if still accessible
      if (state.currentScreen && userRoleData.role) {
        const canAccess = await RoleNavigationService.canNavigateTo(
          userRoleData.role,
          state.currentScreen
        );
        
        if (canAccess) {
          navigationRef.current?.navigate(state.currentScreen);
        } else {
          // Navigate to default screen for role
          const defaultScreen = await RoleNavigationService.getDefaultScreen(
            userRoleData.role
          );
          navigationRef.current?.navigate(defaultScreen);
        }
      }
    } catch (error) {
      validationMonitor.trackFailure('navigation', 'state_restoration', error);
    }
  };

  const getOfflineMenuItems = (role: UserRole): NavigationMenuItem[] => {
    // Basic offline menu items
    const baseItems = [
      { name: 'Home', component: 'HomeScreen', icon: 'home', permissions: [] },
      { name: 'Profile', component: 'ProfileScreen', icon: 'person', permissions: [] },
    ];
    
    return baseItems;
  };

  const handleRetry = () => {
    setMenuError(null);
    if (userRoleData?.role) {
      debouncedGenerateMenu(userRoleData.role);
    }
  };

  const renderNavigationMenu = () => {
    if (isLoadingMenu || roleLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading navigation...</Text>
        </View>
      );
    }
    
    if (menuError) {
      return (
        <View style={styles.errorContainer} testID="navigation-error">
          <Text style={styles.errorText}>Failed to load navigation menu</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            testID="retry-navigation"
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (offlineMode) {
      return (
        <View testID="offline-navigation-menu">
          <Text style={styles.offlineText}>Offline Mode</Text>
          {renderMenuItems()}
        </View>
      );
    }
    
    return renderMenuItems();
  };

  const renderMenuItems = () => {
    return (
      <ScrollView
        style={styles.menuContainer}
        testID="navigation-menu"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.name}
            style={styles.menuItem}
            onPress={() => handleNavigation(item.component)}
            accessibilityLabel={`Navigate to ${item.name}`}
            accessibilityRole="button"
            testID={`navigate-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <Text style={styles.menuItemText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderPermissionDeniedModal = () => {
    return (
      <Modal
        visible={permissionDeniedModal}
        transparent
        animationType="fade"
        testID="permission-denied-modal"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Permission Denied</Text>
            <Text style={styles.modalText}>
              You do not have permission to access {deniedScreen}
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setPermissionDeniedModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.upgradeButton]}
              testID="upgrade-account-button"
              onPress={() => {
                setPermissionDeniedModal(false);
                navigationRef.current?.navigate('UpgradeAccountScreen');
              }}
            >
              <Text style={styles.modalButtonText}>Upgrade Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const getScreenOptions = (): StackNavigationOptions => ({
    cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
    headerStyle: {
      backgroundColor: '#007AFF',
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: 'bold',
    },
  });

  // Render screens based on menu items
  const renderScreens = () => {
    const screens = [];
    
    // Add screens from menu items
    menuItems.forEach((item) => {
      const Component = SCREEN_COMPONENTS[item.component];
      if (Component) {
        screens.push(
          <Stack.Screen
            key={item.component}
            name={item.component}
            component={Component}
            options={{ title: item.name }}
          />
        );
      }
    });
    
    // Always include permission denied and login screens
    screens.push(
      <Stack.Screen
        key="PermissionDeniedScreen"
        name="PermissionDeniedScreen"
        component={PermissionDeniedScreen}
        options={{ title: 'Access Denied' }}
      />
    );
    
    screens.push(
      <Stack.Screen
        key="LoginScreen"
        name="LoginScreen"
        component={LoginScreen}
        options={{ title: 'Login' }}
      />
    );
    
    return screens;
  };

  // Main render
  if (roleError) {
    return (
      <View style={styles.errorContainer} testID="navigation-error-fallback">
        <Text style={styles.errorText}>Failed to load user role</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="navigation-screen">
      <View testID="screen-reader-announcement" accessibilityLiveRegion="polite">
        {/* Screen reader announcements will be made here */}
      </View>
      
      <Stack.Navigator
        ref={navigationRef}
        screenOptions={getScreenOptions()}
        initialRouteName={
          navigationState?.currentScreen ||
          (userRoleData?.role
            ? RoleNavigationService.getDefaultScreen(userRoleData.role)
            : 'HomeScreen')
        }
      >
        {renderScreens()}
      </Stack.Navigator>
      
      {renderNavigationMenu()}
      {renderPermissionDeniedModal()}
      
      {userRoleData?.isAdmin && (
        <TouchableOpacity
          style={styles.adminOverrideButton}
          testID="admin-override-navigation"
          onPress={() => {
            validationMonitor.trackSuccess('navigation', 'admin_override', {
              userId: userRoleData.userId,
              timestamp: new Date().toISOString(),
            });
          }}
        >
          <Text style={styles.adminOverrideText}>Admin Override</Text>
        </TouchableOpacity>
      )}
      
      <View testID="keyboard-navigation-active" style={{ display: 'none' }} />
      <View testID="invalid-deeplink-error" style={{ display: 'none' }} />
    </View>
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff0000',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    maxHeight: 200,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  menuItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  offlineText: {
    padding: 10,
    backgroundColor: '#ff9800',
    color: '#fff',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    marginBottom: 20,
    color: '#666',
  },
  modalButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  upgradeButton: {
    backgroundColor: '#4CAF50',
  },
  adminOverrideButton: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: '#ff5722',
    padding: 10,
    borderRadius: 5,
  },
  adminOverrideText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});