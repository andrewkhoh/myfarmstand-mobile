import { supabase } from '../config/supabase';
import { ValidationMonitor } from '../utils/validationMonitor';
import { 
  KioskAuthRequestSchema,
  DbStaffPinTransformSchema,
  KioskAuthResponseSchema,
  DbKioskSessionTransformSchema,
  KioskSessionResponseSchema,
  KioskSessionsListResponseSchema,
  type KioskAuthResponse,
  type KioskSessionResponse,
  type KioskSessionsListResponse,
  type KioskSession
} from '../schemas/kiosk.schema.AlignedPattern';

// ✅ PATTERN: User-friendly error creation
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

// ✅ PATTERN: Resilient Item Processing with skip-on-error
const processKioskSessions = (rawSessions: unknown[]): KioskSession[] => {
  const validSessions: KioskSession[] = [];
  
  for (const rawSession of rawSessions) {
    try {
      // ✅ PATTERN: Individual validation with proper error context
      const sessionWithStaff = {
        ...rawSession,
        staff: (rawSession as any).users ? {
          name: (rawSession as any).users.name,
          role: (rawSession as any).users.raw_user_meta_data?.role || 'staff'
        } : null
      };
      
      const session = DbKioskSessionTransformSchema.parse(sessionWithStaff);
      validSessions.push(session);
      
      ValidationMonitor.recordPatternSuccess({
        service: 'KioskService',
        pattern: 'individual_session_validation',
        operation: 'processKioskSessions'
      });
    } catch (error) {
      // ✅ PATTERN: Log for monitoring but continue processing
      ValidationMonitor.recordValidationError({
        context: 'KioskService.processKioskSessions',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'SESSION_VALIDATION_FAILED',
        validationPattern: 'transformation_schema'
      });
      console.warn('Invalid kiosk session, skipping:', (rawSession as any)?.id);
      // Continue with other sessions - don't break the entire operation
    }
  }
  
  return validSessions;
};

// ✅ PATTERN: Direct Supabase with Validation - Following cartService gold standard
export const kioskService = {
  
  // ✅ PATTERN: Comprehensive authentication with validation pipeline
  authenticateStaff: async (pin: string): Promise<KioskAuthResponse> => {
    const startTime = Date.now();
    
    try {
      // ✅ PATTERN: Single validation pass at boundary
      const validatedInput = KioskAuthRequestSchema.parse({ pin });

      // ✅ PATTERN: Direct Supabase query (fast, indexed)
      const { data: staffPinData, error } = await supabase
        .from('staff_pins')
        .select(`
          id, user_id, pin, is_active, last_used, created_at, updated_at,
          users!staff_pins_user_id_fkey (id, name, email, raw_user_meta_data)
        `)
        .eq('pin', validatedInput.pin)
        .eq('is_active', true)
        .single();

      if (error || !staffPinData) {
        ValidationMonitor.recordValidationError({
          context: 'KioskService.authenticateStaff.pinValidation',
          errorMessage: 'Invalid PIN provided',
          errorCode: 'INVALID_STAFF_PIN',
          validationPattern: 'direct_supabase_query'
        });
        
        return {
          success: false,
          message: 'Invalid PIN'
        };
      }

      // ✅ PATTERN: Individual validation with error handling
      let transformedStaffData;
      try {
        transformedStaffData = DbStaffPinTransformSchema.parse(staffPinData);
      } catch (transformError) {
        ValidationMonitor.recordValidationError({
          context: 'KioskService.authenticateStaff.dataTransformation',
          errorMessage: transformError instanceof Error ? transformError.message : 'Unknown error',
          errorCode: 'STAFF_DATA_TRANSFORM_FAILED',
          validationPattern: 'transformation_schema'
        });
        
        return {
          success: false,
          message: 'Invalid staff data'
        };
      }

      // ✅ PATTERN: Proper user authentication and data validation
      const userRole = transformedStaffData.user?.role;
      if (!transformedStaffData.user || !userRole || !['staff', 'manager', 'admin'].includes(userRole)) {
        ValidationMonitor.recordValidationError({
          context: 'KioskService.authenticateStaff.roleValidation',
          errorMessage: `Insufficient permissions: ${userRole}`,
          errorCode: 'INSUFFICIENT_PERMISSIONS',
          validationPattern: 'simple_validation'
        });
        
        return {
          success: false,
          message: 'Insufficient permissions for kiosk access'
        };
      }

      // ✅ PATTERN: Atomic operation for session creation
      const sessionId = crypto.randomUUID();
      const { error: sessionError } = await supabase
        .from('kiosk_sessions')
        .insert({
          id: sessionId,
          staff_id: transformedStaffData.userId,
          session_start: new Date().toISOString(),
          is_active: true
        });

      if (sessionError) {
        ValidationMonitor.recordValidationError({
          context: 'KioskService.authenticateStaff.sessionCreation',
          errorMessage: sessionError.message,
          errorCode: 'SESSION_CREATION_FAILED',
          validationPattern: 'direct_supabase_query'
        });
        
        console.error('Failed to create kiosk session:', sessionError);
        return {
          success: false,
          message: 'Failed to start kiosk session'
        };
      }

      // ✅ PATTERN: Update last used timestamp (separate operation for resilience)
      try {
        await supabase
          .from('staff_pins')
          .update({ last_used: new Date().toISOString() })
          .eq('id', transformedStaffData.id);
      } catch (updateError) {
        // Don't fail the operation if timestamp update fails
        console.warn('Failed to update last_used timestamp:', updateError);
      }

      // ✅ PATTERN: Record successful pattern usage
      const performanceMs = Date.now() - startTime;
      ValidationMonitor.recordPatternSuccess({
        service: 'KioskService',
        pattern: 'direct_supabase_query_with_validation',
        operation: 'authenticateStaff',
        performanceMs
      });

      const response: KioskAuthResponse = {
        success: true,
        sessionId: sessionId,
        staffId: transformedStaffData.userId,
        staffName: transformedStaffData.user.name
      };

      return KioskAuthResponseSchema.parse(response);

    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'KioskService.authenticateStaff',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'AUTHENTICATION_SERVICE_ERROR',
        validationPattern: 'transformation_schema'
      });
      
      console.error('Error in kiosk authentication:', error);
      return {
        success: false,
        message: 'Authentication failed'
      };
    }
  },

  // ✅ PATTERN: Session retrieval with comprehensive error handling
  getSession: async (sessionId: string): Promise<KioskSessionResponse> => {
    const startTime = Date.now();
    
    try {
      // ✅ PATTERN: Input validation
      if (!sessionId || typeof sessionId !== 'string') {
        ValidationMonitor.recordValidationError({
          context: 'KioskService.getSession.inputValidation',
          errorMessage: 'Invalid session ID provided',
          errorCode: 'INVALID_SESSION_ID',
          validationPattern: 'simple_validation'
        });
        
        return {
          success: false,
          message: 'Session ID required'
        };
      }

      // ✅ PATTERN: Direct Supabase query with proper indexing
      const { data: sessionData, error } = await supabase
        .from('kiosk_sessions')
        .select(`
          id, staff_id, session_start, session_end, total_sales, 
          transaction_count, is_active, device_id, created_at, updated_at,
          users!kiosk_sessions_staff_id_fkey (name, raw_user_meta_data)
        `)
        .eq('id', sessionId)
        .single();

      if (error || !sessionData) {
        ValidationMonitor.recordValidationError({
          context: 'KioskService.getSession.databaseQuery',
          errorMessage: error?.message || 'Session not found',
          errorCode: 'SESSION_NOT_FOUND',
          validationPattern: 'direct_supabase_query'
        });
        
        return {
          success: false,
          message: 'Session not found'
        };
      }

      // ✅ PATTERN: Individual validation with proper error context
      let transformedSession: KioskSession;
      try {
        const dataForTransform = {
          ...sessionData,
          staff: sessionData.users ? {
            name: sessionData.users.name,
            role: sessionData.users.raw_user_meta_data?.role || 'staff'
          } : null
        };
        
        transformedSession = DbKioskSessionTransformSchema.parse(dataForTransform);
      } catch (transformError) {
        ValidationMonitor.recordValidationError({
          context: 'KioskService.getSession.dataTransformation',
          errorMessage: transformError instanceof Error ? transformError.message : 'Unknown error',
          errorCode: 'SESSION_DATA_TRANSFORM_FAILED',
          validationPattern: 'transformation_schema'
        });
        
        return {
          success: false,
          message: 'Invalid session data'
        };
      }

      // ✅ PATTERN: Record successful pattern usage
      const performanceMs = Date.now() - startTime;
      ValidationMonitor.recordPatternSuccess({
        service: 'KioskService', 
        pattern: 'direct_supabase_query_with_validation',
        operation: 'getSession',
        performanceMs
      });

      const response: KioskSessionResponse = {
        success: true,
        session: transformedSession
      };

      return KioskSessionResponseSchema.parse(response);

    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'KioskService.getSession',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'GET_SESSION_SERVICE_ERROR',
        validationPattern: 'transformation_schema'
      });
      
      console.error('Error getting kiosk session:', error);
      return {
        success: false,
        message: 'Failed to get session'
      };
    }
  },

  // ✅ PATTERN: Sessions list with resilient processing
  getSessions: async (filters?: { 
    staffId?: string; 
    isActive?: boolean; 
    dateRange?: { start: Date; end: Date } 
  }): Promise<KioskSessionsListResponse> => {
    const startTime = Date.now();
    
    try {
      let query = supabase
        .from('kiosk_sessions')
        .select(`
          id, staff_id, session_start, session_end, total_sales,
          transaction_count, is_active, device_id, created_at, updated_at,
          users!kiosk_sessions_staff_id_fkey (name, raw_user_meta_data)
        `)
        .order('session_start', { ascending: false });

      // ✅ PATTERN: Apply filters with validation
      if (filters?.staffId) {
        query = query.eq('staff_id', filters.staffId);
      }
      
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters?.dateRange) {
        query = query
          .gte('session_start', filters.dateRange.start.toISOString())
          .lte('session_start', filters.dateRange.end.toISOString());
      }

      const { data: sessionsData, error } = await query;

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'KioskService.getSessions.databaseQuery',
          errorMessage: error.message,
          errorCode: 'SESSIONS_QUERY_FAILED',
          validationPattern: 'direct_supabase_query'
        });
        
        console.error('Error fetching kiosk sessions:', error);
        return {
          success: false,
          sessions: [],
          message: 'Failed to fetch sessions'
        };
      }

      // ✅ PATTERN: Resilient item processing with skip-on-error
      const transformedSessions = processKioskSessions(sessionsData || []);

      // ✅ PATTERN: Record successful pattern usage
      const performanceMs = Date.now() - startTime;
      ValidationMonitor.recordPatternSuccess({
        service: 'KioskService',
        pattern: 'resilient_collection_processing',
        operation: 'getSessions',
        performanceMs
      });

      return {
        success: true,
        sessions: transformedSessions
      };

    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'KioskService.getSessions',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'GET_SESSIONS_SERVICE_ERROR',
        validationPattern: 'transformation_schema'
      });
      
      console.error('Error in getSessions:', error);
      return {
        success: false,
        sessions: [],
        message: 'Failed to get sessions'
      };
    }
  },

  // ✅ PATTERN: Atomic operation with proper validation
  endSession: async (sessionId: string) => {
    const startTime = Date.now();
    
    try {
      // ✅ PATTERN: Input validation
      if (!sessionId || typeof sessionId !== 'string') {
        ValidationMonitor.recordValidationError({
          context: 'KioskService.endSession.inputValidation',
          errorMessage: 'Invalid session ID provided',
          errorCode: 'INVALID_SESSION_ID',
          validationPattern: 'simple_validation'
        });
        
        return {
          success: false,
          message: 'Session ID required'
        };
      }

      // ✅ PATTERN: Atomic database operation
      const { error } = await supabase
        .from('kiosk_sessions')
        .update({
          session_end: new Date().toISOString(),
          is_active: false
        })
        .eq('id', sessionId)
        .eq('is_active', true); // Only end active sessions

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'KioskService.endSession.databaseUpdate',
          errorMessage: error.message,
          errorCode: 'SESSION_END_UPDATE_FAILED',
          validationPattern: 'direct_supabase_query'
        });
        
        console.error('Error ending kiosk session:', error);
        return {
          success: false,
          message: 'Failed to end session'
        };
      }

      // ✅ PATTERN: Record successful pattern usage
      const performanceMs = Date.now() - startTime;
      ValidationMonitor.recordPatternSuccess({
        service: 'KioskService',
        pattern: 'atomic_database_operation',
        operation: 'endSession',
        performanceMs
      });

      return {
        success: true,
        message: 'Session ended successfully'
      };

    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'KioskService.endSession',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'END_SESSION_SERVICE_ERROR',
        validationPattern: 'transformation_schema'
      });
      
      console.error('Error in endSession:', error);
      return {
        success: false,
        message: 'Failed to end session'
      };
    }
  },

  // ✅ PATTERN: Session update with validation
  updateSessionCustomer: async (sessionId: string, customerInfo: { 
    email?: string; 
    phone?: string; 
    name?: string 
  }) => {
    try {
      // ✅ PATTERN: Input validation
      if (!sessionId || typeof sessionId !== 'string') {
        return {
          success: false,
          message: 'Session ID required'
        };
      }

      // ✅ PATTERN: Get current session for validation
      const sessionResponse = await kioskService.getSession(sessionId);
      if (!sessionResponse.success || !sessionResponse.session) {
        return {
          success: false,
          message: 'Session not found'
        };
      }

      // ✅ PATTERN: Return updated session (customer info is runtime data, not persisted)
      const updatedSession: KioskSession = {
        ...sessionResponse.session,
        currentCustomer: customerInfo
      };

      ValidationMonitor.recordPatternSuccess({
        service: 'KioskService',
        pattern: 'runtime_data_update',
        operation: 'updateSessionCustomer'
      });

      return {
        success: true,
        session: updatedSession
      };

    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'KioskService.updateSessionCustomer',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UPDATE_CUSTOMER_SERVICE_ERROR',
        validationPattern: 'transformation_schema'
      });
      
      console.error('Error updating session customer:', error);
      return {
        success: false,
        message: 'Failed to update customer info'
      };
    }
  },

  // ✅ PATTERN: Statistics update with atomic operation
  updateSessionStats: async (sessionId: string, totalSales: number, transactionCount: number) => {
    const startTime = Date.now();
    
    try {
      // ✅ PATTERN: Input validation
      if (!sessionId || typeof sessionId !== 'string') {
        ValidationMonitor.recordValidationError({
          context: 'KioskService.updateSessionStats.inputValidation',
          errorMessage: 'Invalid session ID provided',
          errorCode: 'INVALID_SESSION_ID',
          validationPattern: 'simple_validation'
        });
        
        return {
          success: false,
          message: 'Session ID required'
        };
      }

      if (typeof totalSales !== 'number' || typeof transactionCount !== 'number') {
        ValidationMonitor.recordValidationError({
          context: 'KioskService.updateSessionStats.inputValidation',
          errorMessage: 'Invalid statistics values provided',
          errorCode: 'INVALID_STATS_VALUES',
          validationPattern: 'simple_validation'
        });
        
        return {
          success: false,
          message: 'Invalid statistics values'
        };
      }

      // ✅ PATTERN: Atomic database operation
      const { error } = await supabase
        .from('kiosk_sessions')
        .update({
          total_sales: totalSales,
          transaction_count: transactionCount
        })
        .eq('id', sessionId)
        .eq('is_active', true); // Only update active sessions

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'KioskService.updateSessionStats.databaseUpdate',
          errorMessage: error.message,
          errorCode: 'SESSION_STATS_UPDATE_FAILED',
          validationPattern: 'direct_supabase_query'
        });
        
        console.error('Error updating session stats:', error);
        return {
          success: false,
          message: 'Failed to update session stats'
        };
      }

      // ✅ PATTERN: Get updated session data
      const sessionResponse = await kioskService.getSession(sessionId);
      
      // ✅ PATTERN: Record successful pattern usage
      const performanceMs = Date.now() - startTime;
      ValidationMonitor.recordPatternSuccess({
        service: 'KioskService',
        pattern: 'atomic_database_operation',
        operation: 'updateSessionStats',
        performanceMs
      });

      return sessionResponse;

    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'KioskService.updateSessionStats',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UPDATE_STATS_SERVICE_ERROR',
        validationPattern: 'transformation_schema'
      });
      
      console.error('Error in updateSessionStats:', error);
      return {
        success: false,
        message: 'Failed to update session stats'
      };
    }
  },

  // ✅ PATTERN: Placeholder methods with proper error handling (will be implemented later)
  getSessionTransactions: async (sessionId: string) => {
    ValidationMonitor.recordValidationError({
      context: 'KioskService.getSessionTransactions',
      errorMessage: 'Method not yet implemented',
      errorCode: 'METHOD_NOT_IMPLEMENTED',
      validationPattern: 'simple_validation'
    });
    
    return { success: false, transactions: [], message: 'Not implemented' };
  },

  createTransaction: async (transactionData: any) => {
    ValidationMonitor.recordValidationError({
      context: 'KioskService.createTransaction',
      errorMessage: 'Method not yet implemented',
      errorCode: 'METHOD_NOT_IMPLEMENTED',
      validationPattern: 'simple_validation'
    });
    
    return { success: false, message: 'Not implemented' };
  },

  updateTransactionStatus: async (transactionId: string, status: string) => {
    ValidationMonitor.recordValidationError({
      context: 'KioskService.updateTransactionStatus',
      errorMessage: 'Method not yet implemented',
      errorCode: 'METHOD_NOT_IMPLEMENTED',
      validationPattern: 'simple_validation'
    });
    
    return { success: false, message: 'Not implemented' };
  },
};