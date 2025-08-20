import React, { createContext, useContext, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKioskAuth, useKioskSession } from '../hooks/useKiosk';
import type { KioskSession } from '../schemas/kiosk.schema';

// React Query Pattern: Kiosk Session Management
const KIOSK_STORAGE_KEY = '@kiosk_session';

// Kiosk Context State (simplified - React Query manages the data)
interface KioskState {
  isAuthenticationVisible: boolean;
}

// React Query keys for kiosk session persistence
export const kioskPersistenceKeys = {
  all: ['kiosk-persistence'] as const,
  session: () => [...kioskPersistenceKeys.all, 'session'] as const,
};

// Storage functions for React Query
const kioskSessionStorage = {
  get: async (): Promise<{ sessionId: string; staffId: string; staffName: string } | null> => {
    try {
      const stored = await AsyncStorage.getItem(KIOSK_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to get kiosk session from storage:', error);
      return null;
    }
  },
  
  set: async (sessionData: { sessionId: string; staffId: string; staffName: string }) => {
    try {
      await AsyncStorage.setItem(KIOSK_STORAGE_KEY, JSON.stringify(sessionData));
      return sessionData;
    } catch (error) {
      console.warn('Failed to persist kiosk session:', error);
      throw error;
    }
  },
  
  remove: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(KIOSK_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to remove kiosk session:', error);
    }
  },
};

// Context value interface
interface KioskContextValue {
  // State from React Query
  isKioskMode: boolean;
  sessionId: string | null;
  staffId: string | null;
  staffName: string | null;
  sessionData: KioskSession | null;
  isLoading: boolean;
  error: string | null;
  
  // UI state (local)
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

// Create context
const KioskContext = createContext<KioskContextValue | null>(null);

// React Query-based KioskProvider
export const KioskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [isAuthenticationVisible, setIsAuthenticationVisible] = React.useState(false);
  
  // React Query: Persistent session state
  const persistedSessionQuery = useQuery({
    queryKey: kioskPersistenceKeys.session(),
    queryFn: kioskSessionStorage.get,
    staleTime: Infinity, // Local storage doesn't go stale
    gcTime: Infinity,    // Keep in cache indefinitely
    retry: 1,
  });

  // Get current session data from server if we have a persisted session
  const sessionQuery = useKioskSession(persistedSessionQuery.data?.sessionId || null);
  
  // Hooks for kiosk operations
  const kioskAuth = useKioskAuth();

  // React Query: Session persistence mutations
  const persistSessionMutation = useMutation({
    mutationFn: kioskSessionStorage.set,
    onSuccess: (sessionData) => {
      // Update the persisted session query cache
      queryClient.setQueryData(kioskPersistenceKeys.session(), sessionData);
      
      // Invalidate all session-related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['kiosk', 'sessions'] });
    },
  });

  const clearSessionMutation = useMutation({
    mutationFn: kioskSessionStorage.remove,
    onSuccess: () => {
      // Clear the persisted session from cache
      queryClient.setQueryData(kioskPersistenceKeys.session(), null);
      
      // Invalidate all session-related queries
      queryClient.invalidateQueries({ queryKey: ['kiosk'] });
    },
  });

  // Derived state from React Query
  const persistedSession = persistedSessionQuery.data;
  const isKioskMode = !!persistedSession?.sessionId;
  const sessionData = sessionQuery.data?.session || null;
  const isLoading = persistedSessionQuery.isLoading || sessionQuery.isLoading || 
                   kioskAuth.isPending || persistSessionMutation.isPending || 
                   clearSessionMutation.isPending;

  // Actions
  const startAuthentication = useCallback(() => {
    setIsAuthenticationVisible(true);
  }, []);

  const hideAuthentication = useCallback(() => {
    setIsAuthenticationVisible(false);
  }, []);

  const authenticateStaff = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const result = await kioskAuth.mutateAsync(pin);
      
      if (result.success && result.sessionId && result.staffId && result.staffName) {
        const sessionData = {
          sessionId: result.sessionId,
          staffId: result.staffId,
          staffName: result.staffName,
        };
        
        // Persist via React Query mutation
        await persistSessionMutation.mutateAsync(sessionData);
        setIsAuthenticationVisible(false);
        
        console.info('🏪 Kiosk session started via React Query:', {
          sessionId: result.sessionId,
          staffName: result.staffName,
          timestamp: new Date().toISOString(),
        });
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Kiosk authentication failed:', error);
      return false;
    }
  }, [kioskAuth, persistSessionMutation]);

  const endSession = useCallback(async (): Promise<boolean> => {
    if (!persistedSession?.sessionId) {
      return false;
    }

    try {
      // End session via service (we could add this to kioskService)
      // await kioskService.endSession(persistedSession.sessionId);
      
      // Clear persisted session via React Query mutation
      await clearSessionMutation.mutateAsync();
      setIsAuthenticationVisible(false);
      
      console.info('🏪 Kiosk session ended via React Query:', {
        sessionId: persistedSession.sessionId,
        staffName: persistedSession.staffName,
        timestamp: new Date().toISOString(),
      });
      
      return true;
    } catch (error) {
      console.error('Failed to end kiosk session:', error);
      return false;
    }
  }, [persistedSession, clearSessionMutation]);

  // Utility function to get session info
  const getSessionInfo = useCallback(() => {
    return {
      isActive: isKioskMode && !!persistedSession?.sessionId,
      sessionId: persistedSession?.sessionId || null,
      staffName: persistedSession?.staffName || null,
      totalSales: sessionData?.totalSales ?? 0,
      transactionCount: sessionData?.transactionCount ?? 0,
    };
  }, [isKioskMode, persistedSession, sessionData]);

  // Context value
  const contextValue: KioskContextValue = {
    // React Query state
    isKioskMode,
    sessionId: persistedSession?.sessionId || null,
    staffId: persistedSession?.staffId || null,
    staffName: persistedSession?.staffName || null,
    sessionData,
    isLoading,
    error: persistedSessionQuery.error?.message || 
           sessionQuery.error?.message || 
           kioskAuth.error?.message || null,
    
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

// Custom hook to use kiosk context (same as before)
export const useKioskContext = (): KioskContextValue => {
  const context = useContext(KioskContext);
  if (!context) {
    throw new Error('useKioskContext must be used within a KioskProvider');
  }
  return context;
};

// Utility hooks (same as before)
export const useIsKioskMode = (): boolean => {
  const { isKioskMode } = useKioskContext();
  return isKioskMode;
};

export const useKioskSessionInfo = () => {
  const { getSessionInfo } = useKioskContext();
  return getSessionInfo();
};