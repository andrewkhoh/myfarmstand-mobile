/**
 * RoleNavigationService
 * Following docs/architectural-patterns-and-best-practices.md
 * Pattern: Direct Supabase + ValidationMonitor + Resilient Processing
 */

import { supabase } from '../../config/supabase';
import { ValidationMonitor } from '../../utils/validationMonitor';
import {
  NavigationStateTransformSchema,
  NavigationEventTransformSchema,
  CreateNavigationEventSchema,
  CreateNavigationStateSchema,
  MenuItemSchema,
  PermissionResultSchema,
  DeepLinkResultSchema,
  ROLE_PERMISSIONS,
  DEFAULT_SCREENS,
  type NavigationStateTransform,
  type NavigationEventTransform,
  type CreateNavigationEventInput,
  type CreateNavigationStateInput,
  type MenuItemValidated,
  type PermissionResult,
  type DeepLinkResult,
} from '../../schemas/role-based/navigationSchemas';
import { UserRole, NavigationMenuItem, NavigationState } from '../../types';

// Following Phase 1 patterns: Direct service class with static methods
export class RoleNavigationService {
  private static supabase = supabase;
  private static menuCache = new Map<UserRole, NavigationMenuItem[]>();
  private static navigationHistory = new Map<string, string[]>();
  private static readonly MAX_HISTORY_SIZE = 10;

  /**
   * Generate menu items based on user role
   * Pattern 1: Direct Supabase with ValidationMonitor
   */
  static async generateMenuItems(role: UserRole): Promise<NavigationMenuItem[]> {
    try {
      // Check cache first (performance optimization)
      const cached = this.menuCache.get(role);
      if (cached) {
        return cached;
      }

      // Generate menu items based on role (business logic)
      const menuItems = await this.buildMenuForRole(role);
      
      // Validate each menu item (Pattern 1: Single validation pass)
      const validatedItems = menuItems.map(item => MenuItemSchema.parse(item)) as NavigationMenuItem[];
      
      // Cache the results
      this.menuCache.set(role, validatedItems);
      
      // Monitor success (MANDATORY Pattern)
      ValidationMonitor.recordPatternSuccess({
        service: 'roleNavigationService' as const,
        pattern: 'transformation_schema' as const,
        operation: 'generateMenuItems' as const
      });
      
      return validatedItems as NavigationMenuItem[];
      
    } catch (error) {
      // Monitor failure with graceful degradation
      ValidationMonitor.recordValidationError({
        context: 'RoleNavigationService.generateMenuItems',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'MENU_GENERATION_FAILED',
        validationPattern: 'transformation_schema' as const
      });
      
      // Graceful degradation - return empty menu rather than crash
      return [];
    }
  }

  /**
   * Build menu items for specific role (internal method)
   * Pattern: Business logic separation
   */
  private static async buildMenuForRole(role: UserRole): Promise<NavigationMenuItem[]> {
    const menuItems: NavigationMenuItem[] = [];

    // Menu definitions based on role permissions
    switch (role) {
      case 'customer':
        menuItems.push(
          { name: 'Home', component: 'HomeScreen', icon: 'home', permissions: ['view:products'] },
          { name: 'Products', component: 'ProductsScreen', icon: 'shopping-bag', permissions: ['view:products'] },
          { name: 'Cart', component: 'CartScreen', icon: 'shopping-cart', permissions: ['manage:cart'] },
          { name: 'Orders', component: 'OrdersScreen', icon: 'receipt', permissions: ['view:orders'] },
          { name: 'Profile', component: 'ProfileScreen', icon: 'person', permissions: ['manage:profile'] }
        );
        break;

      case 'farmer':
        menuItems.push(
          { name: 'Dashboard', component: 'FarmerDashboard', icon: 'dashboard', permissions: ['view:dashboard'] },
          { name: 'Products', component: 'ProductManagementScreen', icon: 'inventory', permissions: ['manage:products'] },
          { name: 'Inventory', component: 'InventoryScreen', icon: 'warehouse', permissions: ['manage:inventory'] },
          { name: 'Orders', component: 'OrdersScreen', icon: 'receipt', permissions: ['view:orders'] },
          { name: 'Analytics', component: 'AnalyticsScreen', icon: 'analytics', permissions: ['view:analytics'] },
          { name: 'Profile', component: 'ProfileScreen', icon: 'person', permissions: ['manage:profile'] }
        );
        break;

      case 'admin':
        menuItems.push(
          { name: 'Admin Dashboard', component: 'AdminDashboard', icon: 'admin-panel', permissions: [] },
          { name: 'Users', component: 'UserManagementScreen', icon: 'people', permissions: ['manage:users'] },
          { name: 'Products', component: 'ProductManagementScreen', icon: 'inventory', permissions: ['manage:products'] },
          { name: 'Orders', component: 'OrdersScreen', icon: 'receipt', permissions: ['view:orders'] },
          { name: 'Analytics', component: 'AnalyticsScreen', icon: 'analytics', permissions: ['view:analytics'] },
          { name: 'Settings', component: 'SystemSettingsScreen', icon: 'settings', permissions: ['manage:system'] },
          { name: 'Permissions', component: 'PermissionManagementScreen', icon: 'security', permissions: ['manage:permissions'] },
          { name: 'Profile', component: 'ProfileScreen', icon: 'person', permissions: ['manage:profile'] }
        );
        break;

      case 'vendor':
        menuItems.push(
          { name: 'Dashboard', component: 'VendorDashboard', icon: 'dashboard', permissions: ['view:dashboard'] },
          { name: 'Products', component: 'ProductManagementScreen', icon: 'inventory', permissions: ['manage:products'] },
          { name: 'Inventory', component: 'InventoryScreen', icon: 'warehouse', permissions: ['manage:inventory'] },
          { name: 'Orders', component: 'OrdersScreen', icon: 'receipt', permissions: ['view:orders'] },
          { name: 'Analytics', component: 'AnalyticsScreen', icon: 'analytics', permissions: ['view:analytics'] },
          { name: 'Profile', component: 'ProfileScreen', icon: 'person', permissions: ['manage:profile'] }
        );
        break;

      case 'staff':
        menuItems.push(
          { name: 'Dashboard', component: 'StaffDashboard', icon: 'dashboard', permissions: ['view:dashboard'] },
          { name: 'Orders', component: 'OrdersScreen', icon: 'receipt', permissions: ['view:orders'] },
          { name: 'Inventory', component: 'InventoryScreen', icon: 'warehouse', permissions: ['view:inventory'] },
          { name: 'Profile', component: 'ProfileScreen', icon: 'person', permissions: ['manage:profile'] }
        );
        break;

      default:
        throw new Error(`Unknown role: ${role}`);
    }

    return menuItems;
  }

  /**
   * Check if role can navigate to specific screen
   * Pattern: Database-first validation with fail-closed security
   */
  static async canNavigateTo(role: UserRole | null, screen: string): Promise<boolean> {
    try {
      if (!role) {
        return false; // Fail closed for security
      }

      // Admin can navigate anywhere (business rule)
      if (role === 'admin') {
        ValidationMonitor.recordPatternSuccess({
          service: 'roleNavigationService' as const,
          pattern: 'simple_input_validation' as const,
          operation: 'canNavigateTo' as const
        });
        return true;
      }

      // Check static permissions first
      const allowedScreens = ROLE_PERMISSIONS[role] || [];
      const staticPermission = allowedScreens.includes(screen);
      
      if (staticPermission) {
        ValidationMonitor.recordPatternSuccess({
          service: 'roleNavigationService' as const,
          pattern: 'simple_input_validation' as const,
          operation: 'canNavigateTo' as const
        });
        return true;
      }

      // Check database permissions for dynamic screens not in static list
      const { data, error } = await this.supabase
        .from('role_permissions')
        .select('can_access')
        .eq('role_type', role)
        .eq('screen_name', screen)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error; // Will be caught by outer try-catch
      }

      const dynamicPermission = data?.can_access === true;

      ValidationMonitor.recordPatternSuccess({
        service: 'roleNavigationService' as const,
        pattern: 'simple_input_validation' as const,
        operation: 'canNavigateTo' as const
      });

      return dynamicPermission;
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RoleNavigationService.canNavigateTo',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'PERMISSION_CHECK_FAILED',
        validationPattern: 'transformation_schema' as const
      });
      
      return false; // Fail closed on error
    }
  }

  /**
   * Get default screen for role
   * Pattern: Simple business logic with monitoring
   */
  static async getDefaultScreen(role: UserRole): Promise<string> {
    try {
      const defaultScreen = DEFAULT_SCREENS[role];
      
      if (!defaultScreen) {
        ValidationMonitor.recordValidationError({
          context: 'RoleNavigationService.getDefaultScreen',
          errorMessage: `Unknown role: ${role}`,
          errorCode: 'UNKNOWN_ROLE',
          validationPattern: 'simple_validation' as const
        });
        return 'HomeScreen'; // Graceful fallback
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'roleNavigationService' as const,
        pattern: 'simple_input_validation' as const,
        operation: 'getDefaultScreen' as const
      });
      
      return defaultScreen;
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RoleNavigationService.getDefaultScreen',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'DEFAULT_SCREEN_FAILED',
        validationPattern: 'simple_validation' as const
      });
      
      return 'HomeScreen'; // Graceful fallback
    }
  }

  /**
   * Handle permission denied scenarios
   * Pattern: Business logic with user-friendly responses
   */
  static async handlePermissionDenied(role: UserRole | null, deniedScreen: string) {
    try {
      if (!role) {
        const response = {
          fallbackScreen: 'LoginScreen',
          message: 'Please login to access this feature',
          suggestedAction: 'login',
        };
        
        ValidationMonitor.recordPatternSuccess({
          service: 'roleNavigationService' as const,
          pattern: 'simple_input_validation' as const,
          operation: 'handlePermissionDenied' as const
        });
        
        return response;
      }

      // Default response for authenticated users
      const response = {
        fallbackScreen: 'PermissionDeniedScreen',
        message: 'You do not have permission to access this area',
        suggestedAction: role === 'customer' ? 'upgrade' : undefined,
        upgradeOptions: role === 'customer' ? ['farmer', 'vendor'] as UserRole[] : undefined,
      };
      
      ValidationMonitor.recordPatternSuccess({
        service: 'roleNavigationService' as const, 
        pattern: 'simple_input_validation' as const,
        operation: 'handlePermissionDenied' as const
      });
      
      return response;
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RoleNavigationService.handlePermissionDenied',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'PERMISSION_DENIED_HANDLER_FAILED',
        validationPattern: 'simple_validation' as const
      });
      
      return {
        fallbackScreen: 'HomeScreen',
        message: 'Access denied',
      };
    }
  }

  /**
   * Track navigation events
   * Pattern: Direct Supabase with validation + monitoring
   */
  static async trackNavigation(event: CreateNavigationEventInput): Promise<void> {
    try {
      // Step 1: Input validation (Pattern 2)
      const validatedInput = CreateNavigationEventSchema.parse(event);
      
      // Step 2: Add to in-memory history
      if (validatedInput.userId) {
        const history = this.navigationHistory.get(validatedInput.userId) || [];
        history.push(validatedInput.to);
        
        // Limit history size
        if (history.length > this.MAX_HISTORY_SIZE) {
          history.shift();
        }
        
        this.navigationHistory.set(validatedInput.userId, history);
      }

      // Step 3: Persist to database (atomic operation)
      await this.supabase.from('navigation_events').insert({
        user_id: validatedInput.userId,
        from_screen: validatedInput.from || null,
        to_screen: validatedInput.to,
        user_role: validatedInput.role,
        event_timestamp: new Date().toISOString(),
        gesture: validatedInput.gesture || null,
      });

      // Step 4: Monitor success
      ValidationMonitor.recordPatternSuccess({
        service: 'roleNavigationService' as const,
        pattern: 'direct_supabase_query' as const,
        operation: 'trackNavigation' as const
      });
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RoleNavigationService.trackNavigation',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'NAVIGATION_TRACKING_FAILED',
        validationPattern: 'transformation_schema' as const
      });
      // Don't throw - navigation tracking should not break user flow
    }
  }

  /**
   * Get navigation history for user
   * Pattern: Database query with fallback to memory
   */
  static async getNavigationHistory(userId: string): Promise<string[]> {
    try {
      // Return in-memory history if available
      const memoryHistory = this.navigationHistory.get(userId);
      if (memoryHistory) {
        return memoryHistory;
      }

      // Fallback to database
      const { data, error } = await this.supabase
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
      ValidationMonitor.recordValidationError({
        context: 'RoleNavigationService.getNavigationHistory',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'HISTORY_RETRIEVAL_FAILED',
        validationPattern: 'transformation_schema' as const
      });
      
      return []; // Graceful degradation
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
   * Validate deep link (enhanced implementation)
   * Pattern: Input validation + permission checking
   */
  static async validateDeepLink(deepLink: string, role: UserRole): Promise<DeepLinkResult> {
    try {
      // Basic deep link validation
      const url = new URL(deepLink);
      
      if (url.protocol !== 'myfarmstand:') {
        return DeepLinkResultSchema.parse({
          isValid: false,
          targetScreen: null,
          params: null,
          error: 'Invalid deep link format',
        });
      }

      const pathParts = url.pathname.split('/').filter(Boolean);
      
      if (pathParts.length === 0) {
        return DeepLinkResultSchema.parse({
          isValid: false,
          targetScreen: null,
          params: null,
          error: 'Invalid deep link path',
        });
      }

      // Enhanced screen mapping with parameter support
      const screenMappings: Record<string, { screen: string; paramMap?: Record<number, string> }> = {
        products: { 
          screen: pathParts.length > 1 ? 'ProductDetailScreen' : 'ProductsScreen',
          paramMap: { 1: 'productId' }
        },
        orders: { 
          screen: pathParts.length > 1 ? 'OrderDetailScreen' : 'OrdersScreen',
          paramMap: { 1: 'orderId' }
        },
        cart: { screen: 'CartScreen' },
        profile: { screen: 'ProfileScreen' },
        admin: { 
          screen: pathParts[1] === 'users' ? 'UserManagementScreen' : 'AdminDashboard'
        },
      };

      const mapping = screenMappings[pathParts[0]];
      if (!mapping) {
        return DeepLinkResultSchema.parse({
          isValid: false,
          targetScreen: null,
          params: null,
          error: 'Unknown deep link path',
        });
      }

      const targetScreen = mapping.screen;
      
      // Extract URL parameters and path parameters
      const params: Record<string, any> = {};
      
      // Add query parameters
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      
      // Add path parameters
      if (mapping.paramMap) {
        Object.entries(mapping.paramMap).forEach(([index, paramName]) => {
          const pathIndex = parseInt(index);
          if (pathParts[pathIndex]) {
            params[paramName] = pathParts[pathIndex];
          }
        });
      }

      // Check permissions
      const canAccess = await this.canNavigateTo(role, targetScreen);
      
      if (!canAccess) {
        return DeepLinkResultSchema.parse({
          isValid: false,
          targetScreen,
          params: Object.keys(params).length > 0 ? params : {},
          error: 'Permission denied for target screen',
        });
      }

      return DeepLinkResultSchema.parse({
        isValid: true,
        targetScreen,
        params: Object.keys(params).length > 0 ? params : {},
      });
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RoleNavigationService.validateDeepLink',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'DEEPLINK_VALIDATION_FAILED',
        validationPattern: 'transformation_schema' as const
      });
      
      return DeepLinkResultSchema.parse({
        isValid: false,
        targetScreen: null,
        params: null,
        error: 'Deep link validation failed',
      });
    }
  }

  /**
   * Get navigation state (simplified)
   */
  static async getNavigationState(userId: string): Promise<NavigationState> {
    try {
      const { data, error } = await this.supabase
        .from('navigation_state')
        .select('user_id, current_screen, history, updated_at')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        throw error;
      }

      if (data) {
        // Pattern 1: Single validation pass
        return NavigationStateTransformSchema.parse(data);
      }

      // Default state
      return {
        currentScreen: 'HomeScreen',
        history: [],
        timestamp: new Date().toISOString(),
        userId,
      };
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RoleNavigationService.getNavigationState',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'STATE_RETRIEVAL_FAILED',
        validationPattern: 'transformation_schema' as const
      });
      
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
   * Pattern: Input validation + atomic database operation
   */
  static async persistNavigationState(state: NavigationState): Promise<void> {
    try {
      // Step 1: Input validation
      const validatedState = CreateNavigationStateSchema.parse({
        userId: state.userId,
        currentScreen: state.currentScreen,
        history: state.history,
      });

      // Step 2: Atomic database operation
      await this.supabase.from('navigation_state').upsert({
        user_id: validatedState.userId,
        current_screen: validatedState.currentScreen,
        history: validatedState.history,
        updated_at: new Date().toISOString(),
      });

      // Step 3: Monitor success
      ValidationMonitor.recordPatternSuccess({
        service: 'roleNavigationService' as const,
        pattern: 'direct_supabase_query' as const,
        operation: 'persistNavigationState' as const
      });
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RoleNavigationService.persistNavigationState',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'STATE_PERSISTENCE_FAILED',
        validationPattern: 'transformation_schema' as const
      });
      // Don't throw - state persistence should not break user flow
    }
  }
}