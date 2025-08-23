/**
 * RoleNavigationService
 * Service for managing role-based navigation permissions and menu generation
 */

import { supabase } from '../../config/supabase';
import { validationMonitor } from '../../utils/validationMonitor';
import { UserRole, NavigationMenuItem, NavigationState } from '../../types';

interface NavigationEvent {
  from?: string;
  to: string;
  role: UserRole;
  userId?: string;
  timestamp?: string;
  gesture?: string;
}

interface DeepLinkValidation {
  isValid: boolean;
  targetScreen: string | null;
  params: any;
  error?: string;
}

interface PermissionDeniedResponse {
  fallbackScreen: string;
  message: string;
  suggestedAction?: string;
  upgradeOptions?: UserRole[];
}

export class RoleNavigationService {
  private static menuCache = new Map<UserRole, NavigationMenuItem[]>();
  private static navigationHistory = new Map<string, string[]>();
  private static readonly MAX_HISTORY_SIZE = 10;

  // Navigation permissions mapping
  private static readonly ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    customer: [
      'HomeScreen',
      'ProductsScreen',
      'CartScreen', 
      'OrdersScreen',
      'ProfileScreen',
      'ProductDetailScreen',
      'OrderDetailScreen',
    ],
    farmer: [
      'HomeScreen',
      'FarmerDashboard',
      'ProductsScreen',
      'ProductManagementScreen',
      'InventoryScreen',
      'OrdersScreen',
      'AnalyticsScreen',
      'ProfileScreen',
      'ProductDetailScreen',
      'OrderDetailScreen',
    ],
    admin: [
      // Admin has access to all screens
      'HomeScreen',
      'AdminDashboard',
      'UserManagementScreen',
      'SystemSettingsScreen',
      'ProductsScreen',
      'ProductManagementScreen',
      'InventoryScreen',
      'OrdersScreen',
      'AnalyticsScreen',
      'ProfileScreen',
      'PermissionManagementScreen',
      'ProductDetailScreen',
      'OrderDetailScreen',
      'UserDetailScreen',
    ],
    vendor: [
      'HomeScreen',
      'VendorDashboard',
      'ProductsScreen',
      'ProductManagementScreen',
      'InventoryScreen',
      'OrdersScreen',
      'AnalyticsScreen',
      'ProfileScreen',
      'ProductDetailScreen',
      'OrderDetailScreen',
    ],
    staff: [
      'HomeScreen',
      'StaffDashboard',
      'OrdersScreen',
      'InventoryScreen',
      'ProfileScreen',
      'OrderDetailScreen',
    ],
  };

  // Default screen for each role
  private static readonly DEFAULT_SCREENS: Record<UserRole, string> = {
    customer: 'HomeScreen',
    farmer: 'FarmerDashboard',
    admin: 'AdminDashboard',
    vendor: 'VendorDashboard',
    staff: 'StaffDashboard',
  };

  /**
   * Generate menu items based on user role
   */
  static async generateMenuItems(role: UserRole): Promise<NavigationMenuItem[]> {
    try {
      // Check cache first
      const cached = this.menuCache.get(role);
      if (cached) {
        return cached;
      }

      const menuItems = await this.buildMenuForRole(role);
      
      // Cache the results
      this.menuCache.set(role, menuItems);
      
      validationMonitor.trackSuccess('navigation', 'menu_generation', { role });
      return menuItems;
    } catch (error) {
      validationMonitor.trackFailure('navigation', 'menu_generation', error);
      throw error;
    }
  }

  /**
   * Build menu items for specific role
   */
  private static async buildMenuForRole(role: UserRole): Promise<NavigationMenuItem[]> {
    const menuItems: NavigationMenuItem[] = [];

    switch (role) {
      case 'customer':
        menuItems.push(
          {
            name: 'Home',
            component: 'HomeScreen',
            icon: 'home',
            permissions: ['view:products'],
          },
          {
            name: 'Products',
            component: 'ProductsScreen',
            icon: 'shopping-bag',
            permissions: ['view:products'],
          },
          {
            name: 'Cart',
            component: 'CartScreen',
            icon: 'shopping-cart',
            permissions: ['manage:cart'],
          },
          {
            name: 'Orders',
            component: 'OrdersScreen',
            icon: 'receipt',
            permissions: ['view:orders'],
          },
          {
            name: 'Profile',
            component: 'ProfileScreen',
            icon: 'person',
            permissions: ['manage:profile'],
          }
        );
        break;

      case 'farmer':
        menuItems.push(
          {
            name: 'Dashboard',
            component: 'FarmerDashboard',
            icon: 'dashboard',
            permissions: ['view:dashboard'],
          },
          {
            name: 'Products',
            component: 'ProductManagementScreen',
            icon: 'inventory',
            permissions: ['manage:products'],
          },
          {
            name: 'Inventory',
            component: 'InventoryScreen',
            icon: 'warehouse',
            permissions: ['manage:inventory'],
          },
          {
            name: 'Orders',
            component: 'OrdersScreen',
            icon: 'receipt',
            permissions: ['view:orders'],
          },
          {
            name: 'Analytics',
            component: 'AnalyticsScreen',
            icon: 'analytics',
            permissions: ['view:analytics'],
          },
          {
            name: 'Profile',
            component: 'ProfileScreen',
            icon: 'person',
            permissions: ['manage:profile'],
          }
        );
        break;

      case 'admin':
        menuItems.push(
          {
            name: 'Admin Dashboard',
            component: 'AdminDashboard',
            icon: 'admin-panel',
            permissions: [],
          },
          {
            name: 'Users',
            component: 'UserManagementScreen',
            icon: 'people',
            permissions: ['manage:users'],
          },
          {
            name: 'Products',
            component: 'ProductManagementScreen',
            icon: 'inventory',
            permissions: ['manage:products'],
          },
          {
            name: 'Orders',
            component: 'OrdersScreen',
            icon: 'receipt',
            permissions: ['view:orders'],
          },
          {
            name: 'Analytics',
            component: 'AnalyticsScreen',
            icon: 'analytics',
            permissions: ['view:analytics'],
          },
          {
            name: 'Settings',
            component: 'SystemSettingsScreen',
            icon: 'settings',
            permissions: ['manage:system'],
          },
          {
            name: 'Profile',
            component: 'ProfileScreen',
            icon: 'person',
            permissions: ['manage:profile'],
          }
        );
        break;

      case 'vendor':
        menuItems.push(
          {
            name: 'Dashboard',
            component: 'VendorDashboard',
            icon: 'dashboard',
            permissions: ['view:dashboard'],
          },
          {
            name: 'Products',
            component: 'ProductManagementScreen',
            icon: 'inventory',
            permissions: ['manage:products'],
          },
          {
            name: 'Inventory',
            component: 'InventoryScreen',
            icon: 'warehouse',
            permissions: ['manage:inventory'],
          },
          {
            name: 'Orders',
            component: 'OrdersScreen',
            icon: 'receipt',
            permissions: ['view:orders'],
          },
          {
            name: 'Analytics',
            component: 'AnalyticsScreen',
            icon: 'analytics',
            permissions: ['view:analytics'],
          },
          {
            name: 'Profile',
            component: 'ProfileScreen',
            icon: 'person',
            permissions: ['manage:profile'],
          }
        );
        break;

      case 'staff':
        menuItems.push(
          {
            name: 'Dashboard',
            component: 'StaffDashboard',
            icon: 'dashboard',
            permissions: ['view:dashboard'],
          },
          {
            name: 'Orders',
            component: 'OrdersScreen',
            icon: 'receipt',
            permissions: ['view:orders'],
          },
          {
            name: 'Inventory',
            component: 'InventoryScreen',
            icon: 'warehouse',
            permissions: ['view:inventory'],
          },
          {
            name: 'Profile',
            component: 'ProfileScreen',
            icon: 'person',
            permissions: ['manage:profile'],
          }
        );
        break;

      default:
        throw new Error(`Unknown role: ${role}`);
    }

    return menuItems;
  }

  /**
   * Check if role can navigate to specific screen
   */
  static async canNavigateTo(role: UserRole | null, screen: string): Promise<boolean> {
    try {
      if (!role) {
        validationMonitor.trackSuccess('navigation', 'permission_check', {
          role: null,
          screen,
          allowed: false,
        });
        return false;
      }

      // Admin can navigate anywhere
      if (role === 'admin') {
        validationMonitor.trackSuccess('navigation', 'permission_check', {
          role,
          screen,
          allowed: true,
        });
        return true;
      }

      // Check static permissions first
      const allowedScreens = this.ROLE_PERMISSIONS[role] || [];
      if (allowedScreens.includes(screen)) {
        validationMonitor.trackSuccess('navigation', 'permission_check', {
          role,
          screen,
          allowed: true,
        });
        return true;
      }

      // Check database for dynamic permissions
      try {
        const { data, error } = await supabase
          .from('role_permissions')
          .select('can_access')
          .eq('role', role)
          .eq('screen_name', screen)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
          throw error;
        }

        const allowed = data?.can_access || false;
        validationMonitor.trackSuccess('navigation', 'permission_check', {
          role,
          screen,
          allowed,
        });
        
        return allowed;
      } catch (dbError) {
        // Fall back to deny access on database errors (fail closed)
        validationMonitor.trackFailure('navigation', 'permission_check', dbError);
        return false;
      }
    } catch (error) {
      validationMonitor.trackFailure('navigation', 'permission_check', error);
      return false;
    }
  }

  /**
   * Get default screen for role
   */
  static async getDefaultScreen(role: UserRole): Promise<string> {
    try {
      const defaultScreen = this.DEFAULT_SCREENS[role];
      
      if (!defaultScreen) {
        const fallback = 'HomeScreen';
        validationMonitor.trackFailure('navigation', 'default_screen', {
          message: `Unknown role: ${role}, falling back to ${fallback}`,
        });
        return fallback;
      }

      validationMonitor.trackSuccess('navigation', 'default_screen', {
        role,
        screen: defaultScreen,
      });
      
      return defaultScreen;
    } catch (error) {
      validationMonitor.trackFailure('navigation', 'default_screen', error);
      return 'HomeScreen';
    }
  }

  /**
   * Handle permission denied scenarios
   */
  static async handlePermissionDenied(
    role: UserRole | null,
    deniedScreen: string
  ): Promise<PermissionDeniedResponse> {
    try {
      if (!role) {
        const response = {
          fallbackScreen: 'LoginScreen',
          message: 'Please login to access this feature',
          suggestedAction: 'login',
        };
        
        validationMonitor.trackSuccess('navigation', 'permission_denied', {
          role: null,
          deniedScreen,
          response,
        });
        
        return response;
      }

      // Provide upgrade suggestions for customers
      if (role === 'customer') {
        const response = {
          fallbackScreen: 'PermissionDeniedScreen',
          message: 'You do not have permission to access this area',
          suggestedAction: 'upgrade',
          upgradeOptions: ['farmer', 'vendor'] as UserRole[],
        };
        
        validationMonitor.trackSuccess('navigation', 'permission_denied', {
          role,
          deniedScreen,
          response,
        });
        
        return response;
      }

      // Default response for other roles
      const response = {
        fallbackScreen: 'PermissionDeniedScreen',
        message: 'You do not have permission to access this area',
      };
      
      validationMonitor.trackSuccess('navigation', 'permission_denied', {
        role,
        deniedScreen,
        response,
      });
      
      return response;
    } catch (error) {
      validationMonitor.trackFailure('navigation', 'permission_denied', error);
      
      return {
        fallbackScreen: 'HomeScreen',
        message: 'Access denied',
      };
    }
  }

  /**
   * Get cached menu items
   */
  static getCachedMenuItems(role: UserRole): NavigationMenuItem[] | undefined {
    return this.menuCache.get(role);
  }

  /**
   * Clear menu cache
   */
  static clearMenuCache(role?: UserRole): void {
    if (role) {
      this.menuCache.delete(role);
    } else {
      this.menuCache.clear();
    }
  }

  /**
   * Track navigation events
   */
  static async trackNavigation(event: NavigationEvent): Promise<void> {
    try {
      // Add to in-memory history
      if (event.userId) {
        const history = this.navigationHistory.get(event.userId) || [];
        history.push(event.to);
        
        // Limit history size
        if (history.length > this.MAX_HISTORY_SIZE) {
          history.shift();
        }
        
        this.navigationHistory.set(event.userId, history);
      }

      // Track with validation monitor
      validationMonitor.trackSuccess('navigation', 'navigation_event', event);

      // Persist to database for analytics
      await supabase.from('navigation_events').insert({
        user_id: event.userId,
        from_screen: event.from,
        to_screen: event.to,
        user_role: event.role,
        event_timestamp: event.timestamp || new Date().toISOString(),
        gesture: event.gesture,
      });
    } catch (error) {
      validationMonitor.trackFailure('navigation', 'navigation_tracking', error);
    }
  }

  /**
   * Get navigation history for user
   */
  static async getNavigationHistory(userId: string): Promise<string[]> {
    try {
      // Return in-memory history if available
      const memoryHistory = this.navigationHistory.get(userId);
      if (memoryHistory) {
        return memoryHistory;
      }

      // Fallback to database
      const { data, error } = await supabase
        .from('navigation_events')
        .select('to_screen')
        .eq('user_id', userId)
        .order('event_timestamp', { ascending: false })
        .limit(this.MAX_HISTORY_SIZE);

      if (error) throw error;

      const history = data?.map((event) => event.to_screen) || [];
      this.navigationHistory.set(userId, history);
      
      return history;
    } catch (error) {
      validationMonitor.trackFailure('navigation', 'history_retrieval', error);
      return [];
    }
  }

  /**
   * Validate deep link
   */
  static async validateDeepLink(
    deepLink: string,
    role: UserRole
  ): Promise<DeepLinkValidation> {
    try {
      // Parse deep link
      const url = new URL(deepLink);
      
      if (url.protocol !== 'myfarmstand:') {
        return {
          isValid: false,
          targetScreen: null,
          params: null,
          error: 'Invalid deep link format',
        };
      }

      const pathParts = url.pathname.split('/').filter(Boolean);
      
      if (pathParts.length === 0) {
        return {
          isValid: false,
          targetScreen: null,
          params: null,
          error: 'Invalid deep link path',
        };
      }

      // Map deep link paths to screens
      const screenMap: Record<string, string> = {
        products: 'ProductsScreen',
        'products/{id}': 'ProductDetailScreen',
        orders: 'OrdersScreen',
        'orders/{id}': 'OrderDetailScreen',
        cart: 'CartScreen',
        profile: 'ProfileScreen',
        admin: 'AdminDashboard',
        'admin/users': 'UserManagementScreen',
        'admin/settings': 'SystemSettingsScreen',
      };

      // Determine target screen
      let targetScreen: string | null = null;
      const params: any = {};

      if (pathParts.length === 1) {
        targetScreen = screenMap[pathParts[0]];
      } else if (pathParts.length === 2) {
        const key = `${pathParts[0]}/{id}`;
        targetScreen = screenMap[key];
        
        if (targetScreen) {
          if (pathParts[0] === 'products') {
            params.productId = pathParts[1];
          } else if (pathParts[0] === 'orders') {
            params.orderId = pathParts[1];
          }
        }
      } else {
        const key = pathParts.join('/');
        targetScreen = screenMap[key];
      }

      if (!targetScreen) {
        return {
          isValid: false,
          targetScreen: null,
          params: null,
          error: 'Unknown deep link path',
        };
      }

      // Add query parameters
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      // Check permissions
      const canAccess = await this.canNavigateTo(role, targetScreen);
      
      if (!canAccess) {
        return {
          isValid: false,
          targetScreen,
          params,
          error: 'Permission denied for target screen',
        };
      }

      return {
        isValid: true,
        targetScreen,
        params,
      };
    } catch (error) {
      validationMonitor.trackFailure('navigation', 'deeplink_validation', error);
      
      return {
        isValid: false,
        targetScreen: null,
        params: null,
        error: 'Deep link validation failed',
      };
    }
  }

  /**
   * Get navigation state
   */
  static async getNavigationState(userId: string): Promise<NavigationState> {
    try {
      const { data, error } = await supabase
        .from('navigation_state')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        throw error;
      }

      if (data) {
        return {
          currentScreen: data.current_screen,
          history: data.history || [],
          timestamp: data.updated_at,
          userId,
        };
      }

      // Default state
      return {
        currentScreen: 'HomeScreen',
        history: [],
        timestamp: new Date().toISOString(),
        userId,
      };
    } catch (error) {
      validationMonitor.trackFailure('navigation', 'state_retrieval', error);
      
      return {
        currentScreen: 'HomeScreen',
        history: [],
        timestamp: new Date().toISOString(),
        userId,
      };
    }
  }

  /**
   * Persist navigation state
   */
  static async persistNavigationState(state: NavigationState): Promise<void> {
    try {
      await supabase.from('navigation_state').upsert({
        user_id: state.userId,
        current_screen: state.currentScreen,
        history: state.history,
        updated_at: state.timestamp,
      });

      validationMonitor.trackSuccess('navigation', 'state_persisted', state);
    } catch (error) {
      validationMonitor.trackFailure('navigation', 'state_persistence', error);
    }
  }
}