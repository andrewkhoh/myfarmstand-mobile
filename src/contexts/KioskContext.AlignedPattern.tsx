import React, { createContext, useContext, useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKioskAuth, useKioskSession } from '../hooks/useKiosk';
import { ValidationMonitor } from '../utils/validationMonitor';
import type { KioskSession } from '../schemas/kiosk.schema';

// ✅ PATTERN: Query Key Factory with User Isolation
interface QueryKeyConfig {
  entity: string;
  isolation: 'user-specific' | 'global';
}

interface QueryKeyOptions {
  fallbackToGlobal?: boolean;
}

export const createQueryKeyFactory = (config: QueryKeyConfig) => {
  return {
    all: (userId?: string, options?: QueryKeyOptions) => {
      const base = [config.entity] as const;
      
      if (config.isolation === 'user-specific' && userId) {
        return [...base, userId] as const;
      }
      
      if (config.isolation === 'user-specific' && !userId && options?.fallbackToGlobal) {
        console.warn(`⚠️ ${config.entity} falling back to global query key`);
        return [...base, 'global-fallback'] as const;
      }
      
      return base;
    }
  };
};

// ✅ PATTERN: User-isolated query keys
export const kioskPersistenceKeys = createQueryKeyFactory({ 
  entity: 'kiosk-persistence', 
  isolation: 'global' // Kiosk sessions are device-specific, not user-specific
});

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
  const [isAuthenticationVisible, setIsAuthenticationVisible] = useState(false);
  
  // ✅ PATTERN: React Query manages persistence (not direct AsyncStorage)
  const persistedSessionQuery = useQuery({
    queryKey: kioskPersistenceKeys.all(),
    queryFn: kioskSessionStorage.get,
    staleTime: Infinity, // Local storage doesn't go stale
    gcTime: Infinity,    // Keep in cache indefinitely
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Get current session data from server if we have a persisted session
  const sessionQuery = useKioskSession(persistedSessionQuery.data?.sessionId || null);
  
  // Hooks for kiosk operations
  const kioskAuth = useKioskAuth();

  // ✅ PATTERN: React Query mutations for state changes
  const persistSessionMutation = useMutation({
    mutationFn: kioskSessionStorage.set,
    onSuccess: (sessionData) => {
      // Update the persisted session query cache
      queryClient.setQueryData(kioskPersistenceKeys.all(), sessionData);
      
      // ✅ PATTERN: Smart invalidation (targeted, not over-invalidating)
      queryClient.invalidateQueries({ 
        queryKey: ['kiosk', 'sessions'],
        exact: false 
      });
      
      ValidationMonitor.recordPatternSuccess({
        service: 'KioskContext',
        pattern: 'react_query_mutation',
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
      queryClient.setQueryData(kioskPersistenceKeys.all(), null);
      
      // ✅ PATTERN: Smart invalidation
      queryClient.invalidateQueries({ 
        queryKey: ['kiosk'],
        exact: false 
      });
      
      ValidationMonitor.recordPatternSuccess({
        service: 'KioskContext',
        pattern: 'react_query_mutation',
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

  // ✅ PATTERN: Derived state from React Query (no local state management)
  const persistedSession = persistedSessionQuery.data;
  const isKioskMode = !!persistedSession?.sessionId;
  const sessionData = sessionQuery.data?.session || null;
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
      pattern: 'ui_state_management',
      operation: 'startAuthentication'
    });
  }, []);

  const hideAuthentication = useCallback(() => {
    setIsAuthenticationVisible(false);
    ValidationMonitor.recordPatternSuccess({
      service: 'KioskContext',
      pattern: 'ui_state_management',
      operation: 'hideAuthentication'
    });
  }, []);

  const authenticateStaff = useCallback(async (pin: string): Promise<boolean> => {
    try {
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
        
        console.info('🏪 Kiosk session started via React Query patterns:', {
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
  }, [kioskAuth, persistSessionMutation]);

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
      
      console.info('🏪 Kiosk session ended via React Query patterns:', {
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
      pattern: 'utility_function',
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