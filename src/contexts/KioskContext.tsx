import React, { createContext, useContext, useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKioskAuth, useKioskSession } from '../hooks/useKiosk';
import { ValidationMonitor } from '../utils/validationMonitor';
import { kioskKeys } from '../utils/queryKeyFactory';
import { useCurrentUser } from '../hooks/useAuth';
import type { KioskSession } from '../schemas/kiosk.schema';

// ✅ PATTERN: Using centralized query key factory

// Storage functions following ValidationMonitor pattern
const kioskSessionStorage = {
  get: async (): Promise<{ sessionId: string; staffId: string; staffName: string } | null> => {
    try {
      const stored = await AsyncStorage.getItem('@kiosk_session');
      const data = stored ? JSON.parse(stored) : null;
      
      if (data) {
        ValidationMonitor.recordPatternSuccess({
          service: 'KioskContext',
          pattern: 'session_persistence',
          operation: 'getPersistedSession'
        });
      }
      
      return data;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'KioskContext.storage.get',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'STORAGE_READ_FAILED',
        validationPattern: 'simple_validation'
      });
      return null;
    }
  },
  
  set: async (sessionData: { sessionId: string; staffId: string; staffName: string }) => {
    try {
      await AsyncStorage.setItem('@kiosk_session', JSON.stringify(sessionData));
      
      ValidationMonitor.recordPatternSuccess({
        service: 'KioskContext',
        pattern: 'session_persistence',
        operation: 'persistSession',
        performanceMs: Date.now()
      });
      
      return sessionData;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'KioskContext.storage.set',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'STORAGE_WRITE_FAILED',
        validationPattern: 'simple_validation'
      });
      throw error;
    }
  },
  
  remove: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem('@kiosk_session');
      
      ValidationMonitor.recordPatternSuccess({
        service: 'KioskContext',
        pattern: 'session_persistence',
        operation: 'clearPersistedSession'
      });
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'KioskContext.storage.remove',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'STORAGE_DELETE_FAILED',
        validationPattern: 'simple_validation'
      });
    }
  },
};

// ✅ PATTERN: Auth state monitoring - we'll use auth query changes instead of broadcasts

// Context value interface
interface KioskContextValue {
  // React Query managed state
  isKioskMode: boolean;
  sessionId: string | null;
  staffId: string | null;
  staffName: string | null;
  sessionData: KioskSession | null;
  isLoading: boolean;
  error: string | null;
  
  // Local UI state
  isAuthenticationVisible: boolean;
  
  // Actions
  startAuthentication: () => void;
  hideAuthentication: () => void;
  authenticateStaff: (pin: string) => Promise<boolean>;
  endSession: () => Promise<boolean>;
  
  // Utilities
  getSessionInfo: () => {
    isActive: boolean;
    sessionId: string | null;
    staffName: string | null;
    totalSales: number;
    transactionCount: number;
  };
}

const KioskContext = createContext<KioskContextValue | null>(null);

// ✅ PATTERN: React Query-based Provider (replaces AsyncStorage context)
export const KioskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const [isAuthenticationVisible, setIsAuthenticationVisible] = useState(false);
  
  // ✅ PATTERN: React Query manages persistence (not direct AsyncStorage)
  const persistedSessionQuery = useQuery({
    queryKey: kioskKeys.all(user?.id),
    queryFn: kioskSessionStorage.get,
    staleTime: Infinity, // Local storage doesn't go stale
    gcTime: Infinity,    // Keep in cache indefinitely
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Get current session data from server if we have a persisted session AND user has kiosk permissions
  const userRole = user?.raw_user_meta_data?.role;
  const hasKioskPermissions = userRole && ['staff', 'manager', 'admin'].includes(userRole);
  const shouldFetchSession = persistedSessionQuery.data?.sessionId && hasKioskPermissions;
  
  const sessionQuery = useKioskSession(shouldFetchSession ? persistedSessionQuery.data?.sessionId : null);
  
  // Hooks for kiosk operations
  const kioskAuth = useKioskAuth();

  // ✅ PATTERN: React Query mutations for state changes
  const persistSessionMutation = useMutation({
    mutationFn: kioskSessionStorage.set,
    onSuccess: (sessionData) => {
      // Update the persisted session query cache
      queryClient.setQueryData(kioskKeys.all(user?.id), sessionData);
      
      // ✅ PATTERN: Smart invalidation (targeted, not over-invalidating)
      queryClient.invalidateQueries({ 
        queryKey: ['kiosk', 'sessions'],
        exact: false 
      });
      
      ValidationMonitor.recordPatternSuccess({
        service: 'KioskContext',
        pattern: 'transformation_schema',
        operation: 'persistSession'
      });
    },
    onError: (error) => {
      ValidationMonitor.recordValidationError({
        context: 'KioskContext.persistSessionMutation',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'SESSION_PERSIST_FAILED',
        validationPattern: 'transformation_schema'
      });
    }
  });

  const clearSessionMutation = useMutation({
    mutationFn: kioskSessionStorage.remove,
    onSuccess: () => {
      // Clear the persisted session from cache
      queryClient.setQueryData(kioskKeys.all(user?.id), null);
      
      // ✅ PATTERN: Smart invalidation
      queryClient.invalidateQueries({ 
        queryKey: ['kiosk'],
        exact: false 
      });
      
      ValidationMonitor.recordPatternSuccess({
        service: 'KioskContext',
        pattern: 'transformation_schema',
        operation: 'clearSession'
      });
    },
    onError: (error) => {
      ValidationMonitor.recordValidationError({
        context: 'KioskContext.clearSessionMutation',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'SESSION_CLEAR_FAILED',
        validationPattern: 'transformation_schema'
      });
    }
  });

  // ✅ SECURITY: Clear stale kiosk data if user doesn't have permissions
  React.useEffect(() => {
    if (user && !hasKioskPermissions && persistedSessionQuery.data?.sessionId) {
      console.warn('🔒 User lacks kiosk permissions, clearing stale session data');
      clearSessionMutation.mutate();
    }
  }, [user?.id, hasKioskPermissions, persistedSessionQuery.data?.sessionId, clearSessionMutation]);

  // ✅ SECURITY: React Query will automatically invalidate kiosk sessions when auth state changes

  // ✅ PATTERN: Derived state from React Query (no local state management)
  const persistedSession = persistedSessionQuery.data;
  
  // ✅ SECURITY: Only consider kiosk mode active if session is both persisted AND server-validated
  // This prevents bypassing PIN authentication with stale/invalid sessions
  const sessionData = sessionQuery.data?.session || null;
  const isKioskMode = !!(
    hasKioskPermissions && 
    persistedSession?.sessionId && 
    sessionData?.isActive && 
    !sessionQuery.isError
  );
  const isLoading = persistedSessionQuery.isLoading || sessionQuery.isLoading || 
                   kioskAuth.isPending || persistSessionMutation.isPending || 
                   clearSessionMutation.isPending;

  const error = persistedSessionQuery.error?.message || 
                sessionQuery.error?.message || 
                kioskAuth.error?.message || 
                persistSessionMutation.error?.message ||
                clearSessionMutation.error?.message ||
                null;

  // Actions with ValidationMonitor integration
  const startAuthentication = useCallback(() => {
    setIsAuthenticationVisible(true);
    ValidationMonitor.recordPatternSuccess({
      service: 'KioskContext',
      pattern: 'simple_input_validation',
      operation: 'startAuthentication'
    });
  }, []);

  const hideAuthentication = useCallback(() => {
    setIsAuthenticationVisible(false);
    ValidationMonitor.recordPatternSuccess({
      service: 'KioskContext',
      pattern: 'simple_input_validation',
      operation: 'hideAuthentication'
    });
  }, []);

  const authenticateStaff = useCallback(async (pin: string): Promise<boolean> => {
    try {
      // ✅ SECURITY: Check user permissions first
      if (!hasKioskPermissions) {
        ValidationMonitor.recordValidationError({
          context: 'KioskContext.authenticateStaff',
          errorMessage: 'User lacks kiosk permissions',
          errorCode: 'INSUFFICIENT_PERMISSIONS',
          validationPattern: 'simple_validation'
        });
        return false;
      }

      // ✅ PATTERN: Input validation first
      if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        ValidationMonitor.recordValidationError({
          context: 'KioskContext.authenticateStaff',
          errorMessage: 'Invalid PIN format',
          errorCode: 'INVALID_PIN_FORMAT',
          validationPattern: 'simple_validation'
        });
        return false;
      }

      const result = await kioskAuth.mutateAsync(pin);
      
      if (result.success && result.sessionId && result.staffId && result.staffName) {
        const sessionData = {
          sessionId: result.sessionId,
          staffId: result.staffId,
          staffName: result.staffName,
        };
        
        // ✅ PATTERN: Use React Query mutation for state changes
        await persistSessionMutation.mutateAsync(sessionData);
        setIsAuthenticationVisible(false);
        
        console.info('🏦 Kiosk session started via React Query patterns:', {
          sessionId: result.sessionId,
          staffName: result.staffName,
          timestamp: new Date().toISOString(),
        });
        
        return true;
      } else {
        ValidationMonitor.recordValidationError({
          context: 'KioskContext.authenticateStaff',
          errorMessage: result.message || 'Authentication failed',
          errorCode: 'AUTHENTICATION_FAILED',
          validationPattern: 'transformation_schema'
        });
        return false;
      }
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'KioskContext.authenticateStaff',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'AUTHENTICATION_ERROR',
        validationPattern: 'transformation_schema'
      });
      return false;
    }
  }, [hasKioskPermissions, kioskAuth, persistSessionMutation]);

  const endSession = useCallback(async (): Promise<boolean> => {
    if (!persistedSession?.sessionId) {
      ValidationMonitor.recordValidationError({
        context: 'KioskContext.endSession',
        errorMessage: 'No active session to end',
        errorCode: 'NO_ACTIVE_SESSION',
        validationPattern: 'simple_validation'
      });
      return false;
    }

    try {
      // TODO: Call kioskService.endSession when implemented
      // await kioskService.endSession(persistedSession.sessionId);
      
      // ✅ PATTERN: Use React Query mutation for state changes
      await clearSessionMutation.mutateAsync();
      setIsAuthenticationVisible(false);
      
      console.info('🏦 Kiosk session ended via React Query patterns:', {
        sessionId: persistedSession.sessionId,
        staffName: persistedSession.staffName,
        timestamp: new Date().toISOString(),
      });
      
      return true;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'KioskContext.endSession',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'SESSION_END_FAILED',
        validationPattern: 'transformation_schema'
      });
      return false;
    }
  }, [persistedSession, clearSessionMutation]);

  // ✅ PATTERN: Utility functions with comprehensive data access
  const getSessionInfo = useCallback(() => {
    const result = {
      isActive: isKioskMode && !!persistedSession?.sessionId,
      sessionId: persistedSession?.sessionId || null,
      staffName: persistedSession?.staffName || null,
      totalSales: sessionData?.totalSales ?? 0,
      transactionCount: sessionData?.transactionCount ?? 0,
    };

    ValidationMonitor.recordPatternSuccess({
      service: 'KioskContext',
      pattern: 'transformation_schema',
      operation: 'getSessionInfo'
    });

    return result;
  }, [isKioskMode, persistedSession, sessionData]);

  // Context value
  const contextValue: KioskContextValue = {
    // React Query managed state
    isKioskMode,
    sessionId: persistedSession?.sessionId || null,
    staffId: persistedSession?.staffId || null,
    staffName: persistedSession?.staffName || null,
    sessionData,
    isLoading,
    error,
    
    // Local UI state
    isAuthenticationVisible,
    
    // Actions
    startAuthentication,
    hideAuthentication,
    authenticateStaff,
    endSession,
    getSessionInfo,
  };

  return (
    <KioskContext.Provider value={contextValue}>
      {children}
    </KioskContext.Provider>
  );
};

// Custom hooks (unchanged interface for backward compatibility)
export const useKioskContext = (): KioskContextValue => {
  const context = useContext(KioskContext);
  if (!context) {
    throw new Error('useKioskContext must be used within a KioskProvider');
  }
  return context;
};

export const useIsKioskMode = (): boolean => {
  const { isKioskMode } = useKioskContext();
  return isKioskMode;
};

export const useKioskSessionInfo = () => {
  const { getSessionInfo } = useKioskContext();
  return getSessionInfo();
};
