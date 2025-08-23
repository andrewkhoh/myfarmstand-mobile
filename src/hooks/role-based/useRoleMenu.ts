/**
 * useRoleMenu Hook
 * Provides role-based menu functionality with caching and optimization
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RoleNavigationService } from '../../services/role-based/roleNavigationService';
import { useUserRole } from './useUserRole';
import { useNavigationPermissions } from './useNavigationPermissions';
import { navigationKeys } from '../../utils/queryKeyFactory';
import { NavigationMenuItem, UserRole } from '../../types';
import { ValidationMonitor } from '../../utils/validationMonitor';

interface MenuSection {
  title: string;
  items: NavigationMenuItem[];
  priority: number;
}

interface MenuCustomization {
  hiddenItems?: string[];
  customOrder?: string[];
  sections?: MenuSection[];
}

interface UseRoleMenuOptions {
  enableCustomization?: boolean;
  enableSections?: boolean;
  filterByPermissions?: boolean;
  cacheTimeout?: number;
  refreshOnRoleChange?: boolean;
}

export const useRoleMenu = (options: UseRoleMenuOptions = {}) => {
  const {
    enableCustomization = true,
    enableSections = true,
    filterByPermissions = true,
    cacheTimeout = 5 * 60 * 1000, // 5 minutes
    refreshOnRoleChange = true,
  } = options;

  const queryClient = useQueryClient();
  const { data: userRole, isLoading: isRoleLoading } = useUserRole();
  const [customization, setCustomization] = useState<MenuCustomization>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get all menu items from navigation service
  const {
    data: rawMenuItems,
    isLoading: isMenuLoading,
    error: menuError,
    refetch: refetchMenu,
  } = useQuery({
    queryKey: [...navigationKeys.menu(userRole?.role || 'customer', userRole?.userId), refreshTrigger],
    queryFn: async () => {
      if (!userRole?.role) {
        throw new Error('User role not available');
      }
      
      const items = await RoleNavigationService.generateMenuItems(userRole.role);
      
      ValidationMonitor.recordPatternSuccess({
        service: 'roleNavigationService' as const,
        pattern: 'transformation_schema' as const,
        operation: 'menu_items_loaded' as const
      });
      
      return items;
    },
    enabled: !!userRole?.role,
    staleTime: cacheTimeout,
    gcTime: cacheTimeout * 2,
  });

  // Get permission information for menu items if filtering is enabled
  const menuScreens = useMemo(() => {
    return (rawMenuItems as NavigationMenuItem[] | undefined)?.map(item => item.component) || [];
  }, [rawMenuItems]);

  const {
    permissions,
    isLoading: isPermissionsLoading,
    checkPermissions,
  } = useNavigationPermissions({
    screens: filterByPermissions ? menuScreens : [],
    enableBatchCheck: filterByPermissions,
    cacheResults: true,
  });

  // Load user menu customization
  const {
    data: userCustomization,
    isLoading: isCustomizationLoading,
  } = useQuery({
    queryKey: ['menu-customization', userRole?.userId],
    queryFn: async () => {
      if (!userRole?.userId) return {};
      
      // Load from local storage or API
      try {
        const stored = localStorage.getItem(`menu-customization-${userRole.userId}`);
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    },
    enabled: enableCustomization && !!userRole?.userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Save menu customization mutation
  const saveCustomizationMutation = useMutation({
    mutationFn: async (newCustomization: MenuCustomization) => {
      if (!userRole?.userId) throw new Error('User ID not available');
      
      // Save to local storage
      localStorage.setItem(
        `menu-customization-${userRole.userId}`,
        JSON.stringify(newCustomization)
      );
      
      ValidationMonitor.recordPatternSuccess({
        service: 'roleNavigationService' as const,
        pattern: 'transformation_schema' as const,
        operation: 'menu_customization_saved' as const
      });
      
      return newCustomization;
    },
    onSuccess: (savedCustomization) => {
      setCustomization(savedCustomization);
      queryClient.invalidateQueries({ queryKey: ['menu-customization', userRole?.userId] });
    },
    onError: (error) => {
      ValidationMonitor.recordValidationError({
        context: 'useRoleMenu.saveCustomization',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'MENU_CUSTOMIZATION_SAVE_FAILED',
        validationPattern: 'simple_validation'
      });
    },
  });

  // Update customization when user customization loads
  useEffect(() => {
    if (userCustomization) {
      setCustomization(userCustomization);
    }
  }, [userCustomization]);

  // Filter menu items by permissions
  const filteredMenuItems = useMemo(() => {
    const items = rawMenuItems as NavigationMenuItem[] | undefined;
    if (!items) return [];
    
    if (!filterByPermissions) return items;
    
    return items.filter(item => {
      const permission = permissions.find(p => p.screen === item.component);
      return permission?.allowed !== false; // Allow if not explicitly denied
    });
  }, [rawMenuItems, permissions, filterByPermissions]);

  // Apply customization to menu items
  const customizedMenuItems = useMemo(() => {
    let items = [...filteredMenuItems];
    
    // Filter out hidden items
    if (customization.hiddenItems && customization.hiddenItems.length > 0) {
      items = items.filter(item => !customization.hiddenItems!.includes(item.component));
    }
    
    // Apply custom order
    if (customization.customOrder && customization.customOrder.length > 0) {
      const ordered: NavigationMenuItem[] = [];
      const orderMap = new Map(customization.customOrder.map((screen, index) => [screen, index]));
      
      items.sort((a, b) => {
        const aOrder = orderMap.get(a.component) ?? 999;
        const bOrder = orderMap.get(b.component) ?? 999;
        return aOrder - bOrder;
      });
    }
    
    return items;
  }, [filteredMenuItems, customization]);

  // Create menu sections
  const menuSections = useMemo((): MenuSection[] => {
    if (!enableSections || !customizedMenuItems.length) {
      return [{
        title: 'Menu',
        items: customizedMenuItems,
        priority: 0,
      }];
    }
    
    if (customization.sections && customization.sections.length > 0) {
      return customization.sections.map(section => ({
        ...section,
        items: section.items.filter(item => 
          customizedMenuItems.some(menuItem => menuItem.component === item.component)
        ),
      })).filter(section => section.items.length > 0);
    }
    
    // Default sections based on role
    return createDefaultSections(customizedMenuItems, userRole?.role || 'customer');
  }, [customizedMenuItems, customization.sections, enableSections, userRole?.role]);

  // Create default sections based on role
  const createDefaultSections = useCallback(
    (items: NavigationMenuItem[], role: UserRole): MenuSection[] => {
      const sections: MenuSection[] = [];
      
      // Core navigation (always first)
      const coreItems = items.filter(item => 
        ['HomeScreen', 'DashboardScreen', 'FarmerDashboard', 'AdminDashboard', 'VendorDashboard', 'StaffDashboard']
          .includes(item.component)
      );
      
      if (coreItems.length > 0) {
        sections.push({
          title: 'Dashboard',
          items: coreItems,
          priority: 0,
        });
      }
      
      // Commerce items
      const commerceItems = items.filter(item =>
        ['ProductsScreen', 'CartScreen', 'OrdersScreen', 'ProductManagementScreen']
          .includes(item.component)
      );
      
      if (commerceItems.length > 0) {
        sections.push({
          title: role === 'customer' ? 'Shopping' : 'Commerce',
          items: commerceItems,
          priority: 1,
        });
      }
      
      // Management items (for farmers, vendors, admin)
      if (['farmer', 'vendor', 'admin', 'staff'].includes(role)) {
        const managementItems = items.filter(item =>
          ['InventoryScreen', 'AnalyticsScreen', 'UserManagementScreen', 'SystemSettingsScreen']
            .includes(item.component)
        );
        
        if (managementItems.length > 0) {
          sections.push({
            title: 'Management',
            items: managementItems,
            priority: 2,
          });
        }
      }
      
      // Profile and settings (always last)
      const profileItems = items.filter(item =>
        ['ProfileScreen', 'SettingsScreen'].includes(item.component)
      );
      
      if (profileItems.length > 0) {
        sections.push({
          title: 'Account',
          items: profileItems,
          priority: 3,
        });
      }
      
      // Catch remaining items
      const categorizedComponents = sections.flatMap(s => s.items.map(i => i.component));
      const remainingItems = items.filter(item => !categorizedComponents.includes(item.component));
      
      if (remainingItems.length > 0) {
        sections.push({
          title: 'Other',
          items: remainingItems,
          priority: 4,
        });
      }
      
      return sections.sort((a, b) => a.priority - b.priority);
    },
    []
  );

  // Menu actions
  const hideMenuItem = useCallback((screen: string) => {
    const newCustomization = {
      ...customization,
      hiddenItems: [...(customization.hiddenItems || []), screen],
    };
    saveCustomizationMutation.mutate(newCustomization);
  }, [customization, saveCustomizationMutation]);

  const showMenuItem = useCallback((screen: string) => {
    const newCustomization = {
      ...customization,
      hiddenItems: (customization.hiddenItems || []).filter(item => item !== screen),
    };
    saveCustomizationMutation.mutate(newCustomization);
  }, [customization, saveCustomizationMutation]);

  const reorderMenuItems = useCallback((newOrder: string[]) => {
    const newCustomization = {
      ...customization,
      customOrder: newOrder,
    };
    saveCustomizationMutation.mutate(newCustomization);
  }, [customization, saveCustomizationMutation]);

  const updateMenuSections = useCallback((sections: MenuSection[]) => {
    const newCustomization = {
      ...customization,
      sections,
    };
    saveCustomizationMutation.mutate(newCustomization);
  }, [customization, saveCustomizationMutation]);

  const resetMenuCustomization = useCallback(() => {
    const newCustomization = {};
    saveCustomizationMutation.mutate(newCustomization);
  }, [saveCustomizationMutation]);

  // Refresh menu
  const refreshMenu = useCallback(() => {
    if (userRole?.role) {
      RoleNavigationService.clearMenuCache(userRole.role);
      setRefreshTrigger(prev => prev + 1);
      
      if (filterByPermissions) {
        queryClient.invalidateQueries({ queryKey: navigationKeys.permissions(userRole.userId) });
      }
    }
  }, [userRole?.role, filterByPermissions, queryClient]);

  // Auto-refresh on role change
  useEffect(() => {
    if (refreshOnRoleChange && userRole?.role) {
      refreshMenu();
    }
  }, [userRole?.role, refreshOnRoleChange, refreshMenu]);

  // Get menu item by screen
  const getMenuItem = useCallback((screen: string): NavigationMenuItem | null => {
    return customizedMenuItems.find(item => item.component === screen) || null;
  }, [customizedMenuItems]);

  // Get menu section by title
  const getMenuSection = useCallback((title: string): MenuSection | null => {
    return menuSections.find(section => section.title === title) || null;
  }, [menuSections]);

  const isLoading = isRoleLoading || isMenuLoading || 
    (filterByPermissions && isPermissionsLoading) || 
    (enableCustomization && isCustomizationLoading);

  return {
    // Menu data
    menuItems: customizedMenuItems,
    rawMenuItems: rawMenuItems || [],
    menuSections,
    customization,
    
    // Loading states
    isLoading,
    isMenuLoading,
    isPermissionsLoading,
    isCustomizationLoading,
    
    // Actions
    hideMenuItem,
    showMenuItem,
    reorderMenuItems,
    updateMenuSections,
    resetMenuCustomization,
    refreshMenu,
    refetchMenu,
    
    // Queries
    getMenuItem,
    getMenuSection,
    
    // Permissions integration
    permissions: filterByPermissions ? permissions : [],
    checkPermissions: filterByPermissions ? checkPermissions : undefined,
    
    // State
    hasCustomization: Object.keys(customization).length > 0,
    hasHiddenItems: !!(customization.hiddenItems && customization.hiddenItems.length > 0),
    hasCustomOrder: !!(customization.customOrder && customization.customOrder.length > 0),
    hasCustomSections: !!(customization.sections && customization.sections.length > 0),
    
    // Utilities
    menuItemCount: customizedMenuItems.length,
    sectionCount: menuSections.length,
    hiddenItemCount: customization.hiddenItems?.length || 0,
    
    // Errors
    menuError,
    hasError: !!menuError,
    
    // Mutations
    isSavingCustomization: saveCustomizationMutation.isPending,
    customizationSaveError: saveCustomizationMutation.error,
  };
};