import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kioskService } from '../services/kioskService';
import { ValidationMonitor } from '../utils/validationMonitor';
import type { 
  KioskSession, 
  KioskAuthResponse, 
  KioskSessionResponse, 
  KioskTransaction,
  KioskSessionsListResponse,
  KioskTransactionResponse,
  KioskTransactionsListResponse
} from '../schemas/kiosk.schema.AlignedPattern';

// ✅ PATTERN: Query Key Factory with User Isolation and Fallback
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
        ValidationMonitor.recordValidationError({
          context: `QueryKeyFactory.${config.entity}`,
          errorMessage: 'Falling back to global query key due to missing userId',
          errorCode: 'MISSING_USER_ID_FALLBACK',
          validationPattern: 'simple_validation'
        });
        return [...base, 'global-fallback'] as const;
      }
      
      return base;
    }
  };
};

// ✅ PATTERN: Kiosk query keys (device-specific, not user-specific)
// Kiosk sessions are tied to physical devices, not individual users
export const kioskKeys = createQueryKeyFactory({ 
  entity: 'kiosk', 
  isolation: 'global' // Device-specific kiosk sessions
});

// Extended key factory for kiosk-specific operations
export const kioskKeyFactory = {
  all: kioskKeys.all(),
  sessions: () => [...kioskKeys.all(), 'sessions'] as const,
  session: (sessionId: string) => [...kioskKeys.all(), 'sessions', sessionId] as const,
  sessionTransactions: (sessionId: string) => [...kioskKeys.all(), 'sessions', sessionId, 'transactions'] as const,
  auth: () => [...kioskKeys.all(), 'auth'] as const,
  transaction: (transactionId: string) => [...kioskKeys.all(), 'transaction', transactionId] as const,
  
  // Staff-specific keys (user-isolated)
  staffSessions: (staffId: string) => [...kioskKeys.all(), 'staff', staffId, 'sessions'] as const,
  staffPins: (staffId: string) => [...kioskKeys.all(), 'staff', staffId, 'pins'] as const,
};

// ✅ PATTERN: Comprehensive error handling with graceful degradation
const createKioskError = (
  code: string,
  technicalMessage: string,
  userMessage: string,
  metadata?: Record<string, unknown>
) => ({
  code,
  message: technicalMessage,      // For developers/logs
  userMessage,                    // For users
  ...metadata,
});

// ✅ PATTERN: Kiosk Authentication Hook with ValidationMonitor
export const useKioskAuth = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (pin: string): Promise<KioskAuthResponse> => {
      try {
        // ✅ PATTERN: Input validation first
        if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
          ValidationMonitor.recordValidationError({
            context: 'useKioskAuth.mutationFn',
            errorMessage: 'Invalid PIN format provided',
            errorCode: 'INVALID_PIN_FORMAT',
            validationPattern: 'simple_validation'
          });
          
          return {
            success: false,
            message: 'Valid 4-digit PIN required'
          };
        }

        const result = await kioskService.authenticateStaff(pin);
        
        if (result.success) {
          ValidationMonitor.recordPatternSuccess({
            service: 'useKioskAuth',
            pattern: 'authentication_mutation',
            operation: 'authenticateStaff'
          });
        }
        
        return result;
      } catch (error) {
        ValidationMonitor.recordValidationError({
          context: 'useKioskAuth.mutationFn',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'AUTHENTICATION_MUTATION_FAILED',
          validationPattern: 'transformation_schema'
        });
        
        return {
          success: false,
          message: 'Authentication failed. Please try again.'
        };
      }
    },
    onSuccess: (data: KioskAuthResponse) => {
      if (data.success && data.sessionId) {
        // ✅ PATTERN: Smart invalidation (targeted, not over-invalidating)
        queryClient.invalidateQueries({ queryKey: kioskKeyFactory.sessions(), exact: false });
        queryClient.invalidateQueries({ queryKey: kioskKeyFactory.auth(), exact: false });
        
        // Don't invalidate all queries - be specific
        ValidationMonitor.recordPatternSuccess({
          service: 'useKioskAuth',
          pattern: 'smart_query_invalidation',
          operation: 'onSuccessInvalidation'
        });
      }
    },
    onError: (error) => {
      ValidationMonitor.recordValidationError({
        context: 'useKioskAuth.onError',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'AUTHENTICATION_HOOK_ERROR',
        validationPattern: 'transformation_schema'
      });
    }
  });
};

// ✅ PATTERN: Kiosk Session Hook with optimized cache configuration
export const useKioskSession = (sessionId: string | null) => {
  return useQuery({
    queryKey: kioskKeyFactory.session(sessionId || ''),
    queryFn: async (): Promise<KioskSessionResponse | null> => {
      if (!sessionId) {
        ValidationMonitor.recordValidationError({
          context: 'useKioskSession.queryFn',
          errorMessage: 'No session ID provided',
          errorCode: 'MISSING_SESSION_ID',
          validationPattern: 'simple_validation'
        });
        return null;
      }

      try {
        const result = await kioskService.getSession(sessionId);
        
        if (result.success) {
          ValidationMonitor.recordPatternSuccess({
            service: 'useKioskSession',
            pattern: 'session_query',
            operation: 'getSession'
          });
        }
        
        return result;
      } catch (error) {
        ValidationMonitor.recordValidationError({
          context: 'useKioskSession.queryFn',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'SESSION_QUERY_FAILED',
          validationPattern: 'transformation_schema'
        });
        throw error;
      }
    },
    enabled: !!sessionId,
    // ✅ PATTERN: Context-appropriate cache settings
    staleTime: 30 * 1000,        // 30 seconds - sessions change moderately
    gcTime: 5 * 60 * 1000,       // 5 minutes - reasonable cleanup
    refetchInterval: 60 * 1000,   // 1 minute - keep session data fresh
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 2, // Retry failed queries
  });
};

// ✅ PATTERN: Sessions List Hook with user isolation
export const useKioskSessions = (
  filters?: { 
    staffId?: string; 
    isActive?: boolean; 
    dateRange?: { start: Date; end: Date } 
  }
) => {
  return useQuery({
    queryKey: [...kioskKeyFactory.sessions(), filters],
    queryFn: async (): Promise<KioskSessionsListResponse> => {
      try {
        const result = await kioskService.getSessions(filters);
        
        if (result.success) {
          ValidationMonitor.recordPatternSuccess({
            service: 'useKioskSessions',
            pattern: 'sessions_list_query',
            operation: 'getSessions'
          });
        }
        
        return result;
      } catch (error) {
        ValidationMonitor.recordValidationError({
          context: 'useKioskSessions.queryFn',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'SESSIONS_LIST_QUERY_FAILED',
          validationPattern: 'transformation_schema'
        });
        throw error;
      }
    },
    // ✅ PATTERN: Cache settings for list data
    staleTime: 2 * 60 * 1000,   // 2 minutes
    gcTime: 10 * 60 * 1000,     // 10 minutes - longer retention for lists
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};

// ✅ PATTERN: Session Operations Hook with comprehensive error handling
export const useKioskSessionOperations = () => {
  const queryClient = useQueryClient();

  const endSession = useMutation({
    mutationFn: async (sessionId: string) => {
      try {
        if (!sessionId) {
          ValidationMonitor.recordValidationError({
            context: 'useKioskSessionOperations.endSession',
            errorMessage: 'Session ID required',
            errorCode: 'MISSING_SESSION_ID',
            validationPattern: 'simple_validation'
          });
          
          return { success: false, message: 'Session ID required' };
        }

        const result = await kioskService.endSession(sessionId);
        
        if (result.success) {
          ValidationMonitor.recordPatternSuccess({
            service: 'useKioskSessionOperations',
            pattern: 'session_mutation',
            operation: 'endSession'
          });
        }
        
        return result;
      } catch (error) {
        ValidationMonitor.recordValidationError({
          context: 'useKioskSessionOperations.endSession',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'END_SESSION_FAILED',
          validationPattern: 'transformation_schema'
        });
        
        return { success: false, message: 'Failed to end session' };
      }
    },
    onSuccess: (_, sessionId) => {
      // ✅ PATTERN: Smart invalidation
      queryClient.invalidateQueries({ queryKey: kioskKeyFactory.session(sessionId) });
      queryClient.invalidateQueries({ queryKey: kioskKeyFactory.sessions() });
      
      ValidationMonitor.recordPatternSuccess({
        service: 'useKioskSessionOperations',
        pattern: 'smart_query_invalidation',
        operation: 'endSessionInvalidation'
      });
    }
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ sessionId, customerInfo }: { 
      sessionId: string; 
      customerInfo: { email?: string; phone?: string; name?: string } 
    }) => {
      try {
        if (!sessionId) {
          return { success: false, message: 'Session ID required' };
        }

        const result = await kioskService.updateSessionCustomer(sessionId, customerInfo);
        
        if (result.success) {
          ValidationMonitor.recordPatternSuccess({
            service: 'useKioskSessionOperations',
            pattern: 'session_mutation',
            operation: 'updateCustomer'
          });
        }
        
        return result;
      } catch (error) {
        ValidationMonitor.recordValidationError({
          context: 'useKioskSessionOperations.updateCustomer',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'UPDATE_CUSTOMER_FAILED',
          validationPattern: 'transformation_schema'
        });
        
        return { success: false, message: 'Failed to update customer info' };
      }
    },
    onSuccess: (data, { sessionId }) => {
      if (data.success) {
        // ✅ PATTERN: Optimistic update
        queryClient.setQueryData(
          kioskKeyFactory.session(sessionId), 
          (old: KioskSessionResponse | undefined) => {
            if (old && old.session) {
              return {
                ...old,
                session: {
                  ...old.session,
                  currentCustomer: data.session?.currentCustomer || null
                }
              };
            }
            return old;
          }
        );
      }
    }
  });

  return {
    endSession,
    updateCustomer,
  };
};

// ✅ PATTERN: Transaction Hooks following same patterns
export const useKioskTransactions = (sessionId: string | null) => {
  return useQuery({
    queryKey: kioskKeyFactory.sessionTransactions(sessionId || ''),
    queryFn: async (): Promise<KioskTransactionsListResponse | null> => {
      if (!sessionId) return null;

      try {
        const result = await kioskService.getSessionTransactions(sessionId);
        
        if (result.success) {
          ValidationMonitor.recordPatternSuccess({
            service: 'useKioskTransactions',
            pattern: 'transaction_list_query',
            operation: 'getSessionTransactions'
          });
        }
        
        return result;
      } catch (error) {
        ValidationMonitor.recordValidationError({
          context: 'useKioskTransactions.queryFn',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'TRANSACTIONS_QUERY_FAILED',
          validationPattern: 'transformation_schema'
        });
        throw error;
      }
    },
    enabled: !!sessionId,
    staleTime: 30 * 1000,        // 30 seconds
    gcTime: 5 * 60 * 1000,       // 5 minutes
    refetchInterval: 2 * 60 * 1000, // 2 minutes
  });
};

// ✅ PATTERN: Combined Kiosk Hook - Main hook for kiosk components
export const useKiosk = (sessionId: string | null) => {
  const { data: sessionResponse, isLoading: isLoadingSession, error: sessionError } = useKioskSession(sessionId);
  const { data: transactionsResponse, isLoading: isLoadingTransactions } = useKioskTransactions(sessionId);
  
  const auth = useKioskAuth();
  const sessionOps = useKioskSessionOperations();

  // ✅ PATTERN: Graceful degradation - provide meaningful defaults
  const session = sessionResponse?.session || null;
  const transactions = transactionsResponse?.transactions || [];

  return {
    // Session data with graceful degradation
    session,
    isSessionActive: session?.isActive || false,
    
    // Transactions data
    transactions,
    
    // Loading states
    isLoading: isLoadingSession || isLoadingTransactions,
    isLoadingSession,
    isLoadingTransactions,
    
    // Errors (with user-friendly messages)
    error: sessionError,
    
    // Operations
    authenticate: auth.mutateAsync,
    isAuthenticating: auth.isPending,
    authError: auth.error,
    
    endSession: sessionOps.endSession.mutateAsync,
    updateCustomer: sessionOps.updateCustomer.mutateAsync,
    
    // Mutation states
    isEndingSession: sessionOps.endSession.isPending,
    isUpdatingCustomer: sessionOps.updateCustomer.isPending,
  };
};

// Export key factory for use in other modules
export { kioskKeyFactory };