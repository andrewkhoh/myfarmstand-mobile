/**
 * RoleNavigationService Tests
 * Tests for role-based navigation service functionality
 */

import { RoleNavigationService } from '../roleNavigationService';
import { supabase } from '../../../config/supabase';
import { ValidationMonitor } from '../../../utils/validationMonitor';
import { UserRole, NavigationMenuItem, NavigationState } from '../../../types';

// Mock dependencies
jest.mock('../../../config/supabase');
jest.mock('../../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordPatternSuccess: jest.fn(),
    recordValidationError: jest.fn(),
    getMetrics: jest.fn(() => ({
      validationErrors: 0,
      calculationMismatches: 0,
      dataQualityIssues: 0,
      lastUpdated: new Date().toISOString()
    })),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockValidationMonitor = ValidationMonitor as jest.Mocked<typeof ValidationMonitor>;

describe('RoleNavigationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any caches
    RoleNavigationService.clearMenuCache();
  });

  describe('generateMenuItems', () => {
    it('should generate menu items for customer role', async () => {
      const customerRole: UserRole = 'customer';
      
      const result = await RoleNavigationService.generateMenuItems(customerRole);
      
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: 'Home',
          component: 'HomeScreen',
          icon: 'home',
          permissions: ['view:products'],
        }),
        expect.objectContaining({
          name: 'Products',
          component: 'ProductsScreen',
          icon: 'shopping-bag',
          permissions: ['view:products'],
        }),
        expect.objectContaining({
          name: 'Cart',
          component: 'CartScreen',
          icon: 'shopping-cart',
          permissions: ['manage:cart'],
        }),
        expect.objectContaining({
          name: 'Orders',
          component: 'OrdersScreen',
          icon: 'receipt',
          permissions: ['view:orders'],
        }),
        expect.objectContaining({
          name: 'Profile',
          component: 'ProfileScreen',
          icon: 'person',
          permissions: ['manage:profile'],
        }),
      ]));
      
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
        'navigation',
        'menu_generation',
        expect.objectContaining({ role: customerRole })
      );
    });

    it('should generate menu items for farmer role', async () => {
      const farmerRole: UserRole = 'farmer';
      
      const result = await RoleNavigationService.generateMenuItems(farmerRole);
      
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: 'Dashboard',
          component: 'FarmerDashboard',
          icon: 'dashboard',
          permissions: ['view:dashboard'],
        }),
        expect.objectContaining({
          name: 'Products',
          component: 'ProductManagementScreen',
          icon: 'inventory',
          permissions: ['manage:products'],
        }),
        expect.objectContaining({
          name: 'Inventory',
          component: 'InventoryScreen',
          icon: 'warehouse',
          permissions: ['manage:inventory'],
        }),
        expect.objectContaining({
          name: 'Analytics',
          component: 'AnalyticsScreen',
          icon: 'analytics',
          permissions: ['view:analytics'],
        }),
      ]));
    });

    it('should generate menu items for admin role', async () => {
      const adminRole: UserRole = 'admin';
      
      const result = await RoleNavigationService.generateMenuItems(adminRole);
      
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: 'Admin Dashboard',
          component: 'AdminDashboard',
          icon: 'admin-panel',
        }),
        expect.objectContaining({
          name: 'Users',
          component: 'UserManagementScreen',
          icon: 'people',
          permissions: ['manage:users'],
        }),
        expect.objectContaining({
          name: 'Settings',
          component: 'SystemSettingsScreen',
          icon: 'settings',
          permissions: ['manage:system'],
        }),
      ]));
      
      // Admin should have access to all screens
      expect(result.length).toBeGreaterThan(7);
    });

    it('should cache menu items for performance', async () => {
      const role: UserRole = 'vendor';
      
      // First call - generates menu
      const result1 = await RoleNavigationService.generateMenuItems(role);
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledTimes(1);
      
      // Second call - should use cache
      const result2 = await RoleNavigationService.generateMenuItems(role);
      expect(result1).toEqual(result2);
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should handle menu generation errors', async () => {
      const role: UserRole = 'customer';
      
      // Mock an internal error
      jest.spyOn(RoleNavigationService as any, 'buildMenuForRole').mockRejectedValue(
        new Error('Menu build failed')
      );
      
      await expect(RoleNavigationService.generateMenuItems(role)).rejects.toThrow(
        'Menu build failed'
      );
      
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        'navigation',
        'menu_generation',
        expect.any(Error)
      );
    });
  });

  describe('canNavigateTo', () => {
    it('should allow navigation to permitted screens', async () => {
      const role: UserRole = 'customer';
      const screen = 'ProductsScreen';
      
      const result = await RoleNavigationService.canNavigateTo(role, screen);
      
      expect(result).toBe(true);
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
        'navigation',
        'permission_check',
        expect.objectContaining({ role, screen, allowed: true })
      );
    });

    it('should deny navigation to restricted screens', async () => {
      const role: UserRole = 'customer';
      const screen = 'AdminDashboard';
      
      const result = await RoleNavigationService.canNavigateTo(role, screen);
      
      expect(result).toBe(false);
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
        'navigation',
        'permission_check',
        expect.objectContaining({ role, screen, allowed: false })
      );
    });

    it('should allow admin to navigate anywhere', async () => {
      const role: UserRole = 'admin';
      const screens = ['ProductsScreen', 'UserManagementScreen', 'SystemSettingsScreen'];
      
      for (const screen of screens) {
        const result = await RoleNavigationService.canNavigateTo(role, screen);
        expect(result).toBe(true);
      }
    });

    it('should check database permissions for dynamic screens', async () => {
      const role: UserRole = 'vendor';
      const screen = 'CustomVendorScreen';
      
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { can_access: true },
                error: null,
              }),
            }),
          }),
        }),
      });
      
      const result = await RoleNavigationService.canNavigateTo(role, screen);
      
      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('role_permissions');
    });

    it('should handle permission check errors gracefully', async () => {
      const role: UserRole = 'staff';
      const screen = 'StaffScreen';
      
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockRejectedValue(new Error('Database error')),
            }),
          }),
        }),
      });
      
      const result = await RoleNavigationService.canNavigateTo(role, screen);
      
      expect(result).toBe(false); // Fail closed on error
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('getDefaultScreen', () => {
    it('should return correct default screen for each role', async () => {
      const roleDefaults = {
        customer: 'HomeScreen',
        farmer: 'FarmerDashboard',
        admin: 'AdminDashboard',
        vendor: 'VendorDashboard',
        staff: 'StaffDashboard',
      };
      
      for (const [role, expectedScreen] of Object.entries(roleDefaults)) {
        const result = await RoleNavigationService.getDefaultScreen(role as UserRole);
        expect(result).toBe(expectedScreen);
      }
    });

    it('should fallback to HomeScreen for unknown roles', async () => {
      const result = await RoleNavigationService.getDefaultScreen('unknown' as UserRole);
      expect(result).toBe('HomeScreen');
      
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        'navigation',
        'default_screen',
        expect.objectContaining({ message: expect.stringContaining('unknown') })
      );
    });

    it('should track default screen retrieval', async () => {
      const role: UserRole = 'customer';
      
      await RoleNavigationService.getDefaultScreen(role);
      
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
        'navigation',
        'default_screen',
        expect.objectContaining({ role, screen: 'HomeScreen' })
      );
    });
  });

  describe('handlePermissionDenied', () => {
    it('should return appropriate fallback for permission denied', async () => {
      const role: UserRole = 'customer';
      const deniedScreen = 'AdminScreen';
      
      const result = await RoleNavigationService.handlePermissionDenied(role, deniedScreen);
      
      expect(result).toEqual({
        fallbackScreen: 'PermissionDeniedScreen',
        message: 'You do not have permission to access this area',
        suggestedAction: 'upgrade',
        upgradeOptions: ['farmer', 'vendor'],
      });
    });

    it('should suggest login for unauthenticated users', async () => {
      const result = await RoleNavigationService.handlePermissionDenied(null, 'ProtectedScreen');
      
      expect(result).toEqual({
        fallbackScreen: 'LoginScreen',
        message: 'Please login to access this feature',
        suggestedAction: 'login',
      });
    });

    it('should track permission denied events', async () => {
      const role: UserRole = 'staff';
      const deniedScreen = 'FinanceScreen';
      
      await RoleNavigationService.handlePermissionDenied(role, deniedScreen);
      
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
        'navigation',
        'permission_denied',
        expect.objectContaining({ role, deniedScreen })
      );
    });

    it('should provide contextual upgrade suggestions', async () => {
      const role: UserRole = 'customer';
      const deniedScreen = 'InventoryScreen';
      
      const result = await RoleNavigationService.handlePermissionDenied(role, deniedScreen);
      
      expect(result.upgradeOptions).toContain('farmer');
      expect(result.upgradeOptions).toContain('vendor');
      expect(result.message).toContain('upgrade');
    });
  });

  describe('Navigation Caching', () => {
    it('should cache menu items by role', async () => {
      const role: UserRole = 'vendor';
      
      await RoleNavigationService.generateMenuItems(role);
      const cached = RoleNavigationService.getCachedMenuItems(role);
      
      expect(cached).toBeDefined();
      expect(cached).toBeInstanceOf(Array);
    });

    it('should clear cache when requested', async () => {
      const role: UserRole = 'farmer';
      
      await RoleNavigationService.generateMenuItems(role);
      expect(RoleNavigationService.getCachedMenuItems(role)).toBeDefined();
      
      RoleNavigationService.clearMenuCache();
      expect(RoleNavigationService.getCachedMenuItems(role)).toBeUndefined();
    });

    it('should clear cache for specific role', async () => {
      const role1: UserRole = 'customer';
      const role2: UserRole = 'vendor';
      
      await RoleNavigationService.generateMenuItems(role1);
      await RoleNavigationService.generateMenuItems(role2);
      
      RoleNavigationService.clearMenuCache(role1);
      
      expect(RoleNavigationService.getCachedMenuItems(role1)).toBeUndefined();
      expect(RoleNavigationService.getCachedMenuItems(role2)).toBeDefined();
    });
  });

  describe('Navigation Analytics', () => {
    it('should track navigation events', async () => {
      const navigationEvent = {
        from: 'HomeScreen',
        to: 'ProductsScreen',
        role: 'customer' as UserRole,
        timestamp: new Date().toISOString(),
      };
      
      await RoleNavigationService.trackNavigation(navigationEvent);
      
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
        'navigation',
        'navigation_event',
        navigationEvent
      );
    });

    it('should maintain navigation history', async () => {
      const userId = 'user-123';
      
      // Track some navigation
      await RoleNavigationService.trackNavigation({
        from: 'HomeScreen',
        to: 'ProductsScreen',
        role: 'customer',
        userId,
      });
      
      const history = await RoleNavigationService.getNavigationHistory(userId);
      
      expect(history).toContain('HomeScreen');
      expect(history).toContain('ProductsScreen');
    });

    it('should limit navigation history size', async () => {
      const userId = 'user-123';
      
      // Track many navigation events
      for (let i = 0; i < 20; i++) {
        await RoleNavigationService.trackNavigation({
          from: `Screen${i}`,
          to: `Screen${i + 1}`,
          role: 'customer',
          userId,
        });
      }
      
      const history = await RoleNavigationService.getNavigationHistory(userId);
      
      expect(history.length).toBeLessThanOrEqual(10); // Max history size
    });
  });

  describe('Deep Link Validation', () => {
    it('should validate valid deep links', async () => {
      const deepLink = 'myfarmstand://products/123';
      const role: UserRole = 'customer';
      
      const result = await RoleNavigationService.validateDeepLink(deepLink, role);
      
      expect(result).toEqual({
        isValid: true,
        targetScreen: 'ProductDetailScreen',
        params: { productId: '123' },
      });
    });

    it('should reject invalid deep link format', async () => {
      const deepLink = 'invalid://link';
      const role: UserRole = 'customer';
      
      const result = await RoleNavigationService.validateDeepLink(deepLink, role);
      
      expect(result).toEqual({
        isValid: false,
        targetScreen: null,
        params: null,
        error: 'Invalid deep link format',
      });
    });

    it('should check permissions for deep link targets', async () => {
      const deepLink = 'myfarmstand://admin/users';
      const role: UserRole = 'customer';
      
      const result = await RoleNavigationService.validateDeepLink(deepLink, role);
      
      expect(result).toEqual({
        isValid: false,
        targetScreen: 'UserManagementScreen',
        params: {},
        error: 'Permission denied for target screen',
      });
    });

    it('should parse deep link parameters', async () => {
      const deepLink = 'myfarmstand://orders/456?status=pending&filter=recent';
      const role: UserRole = 'vendor';
      
      const result = await RoleNavigationService.validateDeepLink(deepLink, role);
      
      expect(result).toEqual({
        isValid: true,
        targetScreen: 'OrderDetailScreen',
        params: {
          orderId: '456',
          status: 'pending',
          filter: 'recent',
        },
      });
    });
  });

  describe('Navigation State Management', () => {
    it('should get current navigation state', async () => {
      const userId = 'user-123';
      
      const state = await RoleNavigationService.getNavigationState(userId);
      
      expect(state).toHaveProperty('currentScreen');
      expect(state).toHaveProperty('history');
      expect(state).toHaveProperty('timestamp');
    });

    it('should persist navigation state', async () => {
      const state: NavigationState = {
        currentScreen: 'ProductsScreen',
        history: ['HomeScreen', 'ProductsScreen'],
        timestamp: new Date().toISOString(),
        userId: 'user-123',
      };
      
      await RoleNavigationService.persistNavigationState(state);
      
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
        'navigation',
        'state_persisted',
        state
      );
    });

    it('should restore navigation state after app restart', async () => {
      const userId = 'user-123';
      const persistedState: NavigationState = {
        currentScreen: 'CartScreen',
        history: ['HomeScreen', 'ProductsScreen', 'CartScreen'],
        timestamp: new Date().toISOString(),
        userId,
      };
      
      // Mock persisted state retrieval
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: persistedState,
              error: null,
            }),
          }),
        }),
      });
      
      const state = await RoleNavigationService.getNavigationState(userId);
      
      expect(state).toEqual(persistedState);
    });

    it('should handle state retrieval errors', async () => {
      const userId = 'user-123';
      
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('State retrieval failed')),
          }),
        }),
      });
      
      const state = await RoleNavigationService.getNavigationState(userId);
      
      expect(state).toEqual({
        currentScreen: 'HomeScreen',
        history: [],
        timestamp: expect.any(String),
        userId,
      });
      
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });
});