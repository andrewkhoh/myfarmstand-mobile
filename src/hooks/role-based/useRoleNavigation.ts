/**
 * useRoleNavigation Hook
 * Provides role-based navigation functionality
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RoleNavigationService } from '../../services/role-based/roleNavigationService';
import { useUserRole } from './useUserRole';
import { NavigationMenuItem, NavigationState, UserRole } from '../../types';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { navigationKeys } from '../../utils/queryKeyFactory';

interface UseRoleNavigationOptions {
  enableCaching?: boolean;
  cacheDuration?: number;
  refetchOnRoleChange?: boolean;
}

export const useRoleNavigation = (options: UseRoleNavigationOptions = {}) => {
  const {
    enableCaching = true,
    cacheDuration = 5 * 60 * 1000, // 5 minutes
    refetchOnRoleChange = true,
  } = options;

  const queryClient = useQueryClient();
  const { data: userRole, isLoading: isRoleLoading } = useUserRole();
  
  const [navigationState, setNavigationState] = useState<NavigationState | null>(null);
  const [currentScreen, setCurrentScreen] = useState<string>('HomeScreen');

  // Generate menu items query
  const {
    data: menuItems,
    isLoading: isMenuLoading,
    error: menuError,
    refetch: refetchMenu,
  } = useQuery({
    queryKey: navigationKeys.menu(userRole?.role || 'customer', userRole?.userId),
    queryFn: async () => {
      if (!userRole?.role) {
        throw new Error('User role not available');
      }
      return RoleNavigationService.generateMenuItems(userRole.role);
    },
    enabled: !!userRole?.role,
    staleTime: enableCaching ? cacheDuration : 0,
    gcTime: enableCaching ? cacheDuration : 0,
    retry: (failureCount, error) => {
      // Retry network errors, not permission errors
      if (error?.message?.includes('permission')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Navigation state query
  const {
    data: persistedState,
    isLoading: isStateLoading,
  } = useQuery({
    queryKey: navigationKeys.userState(userRole?.userId || ''),
    queryFn: async () => {
      if (!userRole?.userId) {
        throw new Error('User ID not available');
      }
      return RoleNavigationService.getNavigationState(userRole.userId);
    },
    enabled: !!userRole?.userId,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Navigation history query
  const {
    data: navigationHistory,
    isLoading: isHistoryLoading,
  } = useQuery({
    queryKey: navigationKeys.userHistory(userRole?.userId || ''),
    queryFn: async () => {
      if (!userRole?.userId) return [];
      return RoleNavigationService.getNavigationHistory(userRole.userId);
    },
    enabled: !!userRole?.userId,
    staleTime: 60 * 1000, // 1 minute
  });

  // Persist navigation state mutation
  const persistStateMutation = useMutation({
    mutationFn: async (state: NavigationState) => {
      await RoleNavigationService.persistNavigationState(state);
    },
    onSuccess: () => {
      ValidationMonitor.recordPatternSuccess({
        service: 'roleNavigationService' as const,
        pattern: 'direct_supabase_query' as const,
        operation: 'persistNavigationState' as const
      });
    },
    onError: (error) => {
      ValidationMonitor.recordValidationError({
        context: 'useRoleNavigation.persistNavigationState',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'STATE_PERSISTENCE_FAILED',
        validationPattern: 'transformation_schema'
      });
    },
  });

  // Track navigation mutation
  const trackNavigationMutation = useMutation({
    mutationFn: async (event: {
      from?: string;
      to: string;
      gesture?: string;
    }) => {
      if (!userRole?.role || !userRole?.userId) return;
      
      await RoleNavigationService.trackNavigation({
        ...event,
        role: userRole.role,
        userId: userRole.userId,
      });
    },
    onSuccess: () => {
      // Invalidate history to refresh
      queryClient.invalidateQueries({ queryKey: navigationKeys.userHistory(userRole?.userId || '') });
    },
  });

  // Check permission function
  const checkPermission = useCallback(
    async (screen: string): Promise<boolean> => {
      if (!userRole?.role) return false;
      
      try {
        return await RoleNavigationService.canNavigateTo(userRole.role, screen);
      } catch (error) {
        ValidationMonitor.recordValidationError({
          context: 'useRoleNavigation.checkPermission',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'PERMISSION_CHECK_FAILED',
          validationPattern: 'simple_validation'
        });
        return false;
      }
    },
    [userRole?.role]
  );

  // Navigate function with permission checking
  const navigateTo = useCallback(
    async (screen: string, params?: any, gesture?: string) => {
      if (!userRole?.role) {
        throw new Error('User role not available for navigation');
      }

      const canAccess = await checkPermission(screen);
      
      if (!canAccess) {
        const denied = await RoleNavigationService.handlePermissionDenied(
          userRole.role,
          screen
        );
        throw new Error(denied.message);
      }

      // Track navigation
      trackNavigationMutation.mutate({
        from: currentScreen,
        to: screen,
        gesture,
      });

      setCurrentScreen(screen);
      
      return {
        screen,
        params,
        allowed: true,
      };
    },
    [userRole?.role, currentScreen, checkPermission, trackNavigationMutation]
  );

  // Get default screen for role
  const getDefaultScreen = useCallback(async (): Promise<string> => {
    if (!userRole?.role) return 'HomeScreen';
    
    try {
      return await RoleNavigationService.getDefaultScreen(userRole.role);
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'useRoleNavigation.getDefaultScreen',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'DEFAULT_SCREEN_FAILED',
        validationPattern: 'simple_validation'
      });
      return 'HomeScreen';
    }
  }, [userRole?.role]);

  // Handle permission denied
  const handlePermissionDenied = useCallback(
    async (screen: string) => {
      if (!userRole?.role) {
        return {
          fallbackScreen: 'LoginScreen',
          message: 'Please login to access this feature',
        };
      }

      return RoleNavigationService.handlePermissionDenied(userRole.role, screen);
    },
    [userRole?.role]
  );

  // Persist current state
  const persistCurrentState = useCallback(async () => {
    if (!userRole?.userId) return;

    const state: NavigationState = {
      currentScreen,
      history: navigationHistory || [],
      timestamp: new Date().toISOString(),
      userId: userRole.userId,
    };

    persistStateMutation.mutate(state);
  }, [userRole?.userId, currentScreen, navigationHistory, persistStateMutation]);

  // Clear menu cache
  const clearMenuCache = useCallback(() => {
    if (userRole?.role) {
      RoleNavigationService.clearMenuCache(userRole.role);
      queryClient.invalidateQueries({ queryKey: navigationKeys.menu(userRole.role, userRole.userId) });
    }
  }, [userRole?.role, queryClient]);

  // Validate deep link
  const validateDeepLink = useCallback(
    async (link: string) => {
      if (!userRole?.role) {
        return {
          isValid: false,
          error: 'User role not available',
        };
      }

      try {
        return await RoleNavigationService.validateDeepLink(link, userRole.role);
      } catch (error) {
        ValidationMonitor.recordValidationError({
          context: 'useRoleNavigation.validateDeepLink',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'DEEPLINK_VALIDATION_FAILED',
          validationPattern: 'transformation_schema'
        });
        return {
          isValid: false,
          error: 'Deep link validation failed',
        };
      }
    },
    [userRole?.role]
  );

  // Refetch menu when role changes
  useEffect(() => {
    if (refetchOnRoleChange && userRole?.role) {
      refetchMenu();
    }
  }, [userRole?.role, refetchOnRoleChange, refetchMenu]);

  // Update navigation state when persisted state loads
  useEffect(() => {
    if (persistedState) {
      setNavigationState(persistedState);
      setCurrentScreen(persistedState.currentScreen);
    }
  }, [persistedState]);

  // Auto-persist state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (userRole?.userId) {
        persistCurrentState();
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [userRole?.userId, persistCurrentState]);

  // Computed values
  const isLoading = isRoleLoading || isMenuLoading || isStateLoading;
  const hasMenuItems = !!(menuItems && menuItems.length > 0);
  const canAccessScreen = useCallback(
    (screen: string) => {
      if (!userRole?.role) return false;
      return checkPermission(screen);
    },
    [userRole?.role, checkPermission]
  );

  return {
    // Data
    menuItems: menuItems || [],
    navigationHistory: navigationHistory || [],
    navigationState,
    currentScreen,
    userRole: userRole?.role,
    
    // Loading states
    isLoading,
    isMenuLoading,
    isStateLoading,
    isHistoryLoading,
    
    // Actions
    navigateTo,
    checkPermission,
    canAccessScreen,
    getDefaultScreen,
    handlePermissionDenied,
    validateDeepLink,
    persistCurrentState,
    clearMenuCache,
    refetchMenu,
    
    // State setters
    setCurrentScreen,
    
    // Utilities
    hasMenuItems,
    menuError,
    
    // Mutations
    isTrackingNavigation: trackNavigationMutation.isPending,
    isPersistingState: persistStateMutation.isPending,
  };
};