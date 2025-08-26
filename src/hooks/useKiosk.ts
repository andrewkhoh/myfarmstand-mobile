import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kioskService } from '../services/kioskService';
import { ValidationMonitor } from '../utils/validationMonitor';
import { useCurrentUser } from './useAuth';
import { kioskKeys } from '../utils/queryKeyFactory';
import type { 
  KioskSession, 
  KioskAuthResponse, 
  KioskSessionResponse, 
  KioskTransaction,
  KioskSessionsListResponse,
  KioskTransactionResponse,
  KioskTransactionsListResponse
} from '../schemas/kiosk.schema';

// ✅ PATTERN: Using centralized query key factory

// ✅ REFACTORED: Use centralized kioskKeys directly (removed redundant factory)

// ✅ REFACTORED: Use centralized error patterns (simplified)

// ✅ PATTERN: Kiosk Authentication Hook with ValidationMonitor
export const useKioskAuth = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  
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
            pattern: 'direct_supabase_query',
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
        // ✅ PATTERN: Smart invalidation with user isolation
        queryClient.invalidateQueries({ queryKey: kioskKeys.sessions(user?.id), exact: false });
        queryClient.invalidateQueries({ queryKey: kioskKeys.authList(user?.id), exact: false });
        
        // Don't invalidate all queries - be specific
        ValidationMonitor.recordPatternSuccess({
          service: 'useKioskAuth',
          pattern: 'transformation_schema',
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
  const { data: user } = useCurrentUser();
  
  return useQuery({
    queryKey: kioskKeys.session(sessionId || '', user?.id),
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
            pattern: 'direct_supabase_query',
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
  const { data: user } = useCurrentUser();
  
  return useQuery({
    queryKey: kioskKeys.sessionsList(filters, user?.id),
    queryFn: async (): Promise<KioskSessionsListResponse> => {
      try {
        const result = await kioskService.getSessions(filters);
        
        if (result.success) {
          ValidationMonitor.recordPatternSuccess({
            service: 'useKioskSessions',
            pattern: 'direct_supabase_query',
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
  const { data: user } = useCurrentUser();

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
            pattern: 'direct_supabase_query',
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
      // ✅ PATTERN: Smart invalidation with user isolation
      queryClient.invalidateQueries({ queryKey: kioskKeys.session(sessionId, user?.id) });
      queryClient.invalidateQueries({ queryKey: kioskKeys.sessions(user?.id) });
      
      ValidationMonitor.recordPatternSuccess({
        service: 'useKioskSessionOperations',
        pattern: 'transformation_schema',
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
            pattern: 'direct_supabase_query',
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
          kioskKeys.session(sessionId, user?.id), 
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
  const { data: user } = useCurrentUser();
  
  return useQuery({
    queryKey: kioskKeys.transactions(sessionId || '', user?.id),
    queryFn: async (): Promise<KioskTransactionsListResponse | null> => {
      if (!sessionId) return null;

      try {
        const result = await kioskService.getSessionTransactions(sessionId);
        
        if (result.success) {
          ValidationMonitor.recordPatternSuccess({
            service: 'useKioskTransactions',
            pattern: 'direct_supabase_query',
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
// ✅ REFACTORED: Now using centralized kioskKeys directly