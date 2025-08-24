/**
 * ErrorRecoveryService Test - Using REFACTORED Infrastructure
 * Following the proven pattern from service test reference
 */

// Setup all mocks BEFORE any imports
// Mock Supabase using the refactored infrastructure - CREATE MOCK IN THE JEST.MOCK CALL
jest.mock('../../config/supabase', () => {
  const { SimplifiedSupabaseMock } = require('../../test/mocks/supabase.simplified.mock');
  const mockInstance = new SimplifiedSupabaseMock();
  return {
    supabase: mockInstance.createClient(),
    TABLES: {
      USERS: 'users',
      PRODUCTS: 'products', 
      ORDERS: 'orders',
      ERROR_LOGS: 'error_logs',
    }
  };
});

// Mock other service dependencies
jest.mock('../stockRestorationService', () => ({
  restoreOrderStock: jest.fn().mockResolvedValue(true),
}));

jest.mock('../notificationService', () => ({
  NotificationService: {
    sendNotification: jest.fn().mockResolvedValue({ success: true }),
    sendAdminNotification: jest.fn().mockResolvedValue({ success: true }),
  }
}));

jest.mock('../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidation: jest.fn(),
    recordValidationError: jest.fn(),
    getValidationStats: jest.fn().mockReturnValue({
      total: 0,
      passed: 0,
      failed: 0
    })
  }
}));

// Import AFTER mocks are setup
import { ErrorRecoveryService, ErrorContext, ErrorRecoveryConfig } from '../errorRecoveryService';
import { createUser, createOrder, resetAllFactories } from '../../test/factories';
import { supabase } from '../../config/supabase';

// Get mock references for use in tests
const mockSupabaseRpc = supabase.rpc as jest.Mock;

describe('ErrorRecoveryService - Refactored Infrastructure', () => {
  let mockErrorContext: ErrorContext;
  let testUser: any;
  let testOrder: any;

  beforeEach(() => {
    // Reset all factory counters for consistent test data
    resetAllFactories();
    
    // Create test data using factories
    testUser = createUser({
      id: 'user-456',
      name: 'Test User',
      email: 'test@example.com'
    });
    
    testOrder = createOrder({
      id: 'order-123',
      user_id: testUser.id
    });
    
    jest.clearAllMocks();
    
    // Setup default error context
    mockErrorContext = {
      errorType: 'payment_failed',
      orderId: testOrder.id,
      userId: testUser.id,
      operation: 'payment_processing',
      originalError: new Error('Payment gateway timeout'),
      timestamp: new Date().toISOString(),
      retryCount: 0,
      metadata: { amount: 25.99, gateway: 'stripe' }
    };
  });

  describe('recoverFromError', () => {
    it('should successfully recover using atomic RPC function', async () => {
      // Setup mock RPC response for successful recovery
      mockSupabaseRpc.mockResolvedValue({
        data: {
          success: true,
          action: 'compensate',
          attempts: 1,
          recovered: true,
          compensation_applied: true,
          message: 'Payment failure compensated successfully',
          error: null
        },
        error: null
      });

      const result = await ErrorRecoveryService.recoverFromError(mockErrorContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.action).toBe('compensate');
      expect(result.recovered).toBe(true);
      expect(result.compensationApplied).toBe(true);
      expect(result.message).toContain('compensated successfully');

      // Verify RPC was called with correct parameters
      expect(mockSupabaseRpc).toHaveBeenCalledWith('recover_from_error_atomic', {
        input_error_type: 'payment_failed',
        input_order_id: testOrder.id,
        input_user_id: testUser.id,
        input_operation: 'payment_processing',
        input_original_error: 'Payment gateway timeout',
        input_retry_count: 0,
        input_metadata: { amount: 25.99, gateway: 'stripe' }
      });
    });

    it('should handle RPC function errors gracefully', async () => {
      // Setup mock RPC error
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC function not found' }
      });

      const result = await ErrorRecoveryService.recoverFromError(mockErrorContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.action).toBe('manual_intervention');
      expect(result.recovered).toBe(false);
      expect(result.message).toContain('Recovery RPC failed');
      expect(result.error).toBe('RPC function not found');
    });

    it('should handle exceptions during recovery process', async () => {
      // Setup mock to throw exception
      mockSupabaseRpc.mockRejectedValue(new Error('Database connection lost'));

      const result = await ErrorRecoveryService.recoverFromError(mockErrorContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.action).toBe('manual_intervention');
      expect(result.recovered).toBe(false);
      expect(result.message).toBe('Recovery process failed');
      expect(result.error).toBe('Database connection lost');
    });

    it('should use custom recovery configuration', async () => {
      // Setup mock RPC response
      mockSupabaseRpc.mockResolvedValue({
        data: {
          success: true,
          action: 'retry',
          attempts: 2,
          recovered: true,
          compensation_applied: false,
          message: 'Operation succeeded on retry',
          error: null
        },
        error: null
      });

      const customConfig: Partial<ErrorRecoveryConfig> = {
        maxRetryAttempts: 5,
        retryDelayMs: 2000,
        enableAutoRecovery: true,
        notifyOnFailure: false,
        logAllAttempts: true
      };

      const result = await ErrorRecoveryService.recoverFromError(mockErrorContext, customConfig);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.action).toBe('retry');
      expect(result.attempts).toBe(2);
      expect(mockSupabaseRpc).toHaveBeenCalled();
    });
  });

  describe('different error types', () => {
    it('should handle stock_update_failed errors', async () => {
      const stockErrorContext: ErrorContext = {
        ...mockErrorContext,
        errorType: 'stock_update_failed',
        operation: 'stock_update'
      };

      mockSupabaseRpc.mockResolvedValue({
        data: {
          success: true,
          action: 'compensate',
          attempts: 1,
          recovered: true,
          compensation_applied: true,
          message: 'Stock failure compensated',
          error: null
        },
        error: null
      });

      const result = await ErrorRecoveryService.recoverFromError(stockErrorContext);

      expect(result.success).toBe(true);
      expect(result.action).toBe('compensate');
      expect(mockSupabaseRpc).toHaveBeenCalledWith('recover_from_error_atomic', 
        expect.objectContaining({
          input_error_type: 'stock_update_failed',
          input_operation: 'stock_update'
        })
      );
    });

    it('should handle order_creation_failed errors', async () => {
      const orderErrorContext: ErrorContext = {
        ...mockErrorContext,
        errorType: 'order_creation_failed',
        operation: 'order_creation'
      };

      mockSupabaseRpc.mockResolvedValue({
        data: {
          success: true,
          action: 'rollback',
          attempts: 1,
          recovered: true,
          compensation_applied: true,
          message: 'Order creation rolled back',
          error: null
        },
        error: null
      });

      const result = await ErrorRecoveryService.recoverFromError(orderErrorContext);

      expect(result.success).toBe(true);
      expect(result.action).toBe('rollback');
      expect(mockSupabaseRpc).toHaveBeenCalledWith('recover_from_error_atomic',
        expect.objectContaining({
          input_error_type: 'order_creation_failed',
          input_operation: 'order_creation'
        })
      );
    });

    it('should handle notification_failed errors', async () => {
      const notificationErrorContext: ErrorContext = {
        ...mockErrorContext,
        errorType: 'notification_failed',
        operation: 'notification_send'
      };

      mockSupabaseRpc.mockResolvedValue({
        data: {
          success: true,
          action: 'retry',
          attempts: 2,
          recovered: true,
          compensation_applied: false,
          message: 'Notification sent on retry',
          error: null
        },
        error: null
      });

      const result = await ErrorRecoveryService.recoverFromError(notificationErrorContext);

      expect(result.success).toBe(true);
      expect(result.action).toBe('retry');
      expect(result.attempts).toBe(2);
    });

    it('should handle database_error with retry strategy', async () => {
      const dbErrorContext: ErrorContext = {
        ...mockErrorContext,
        errorType: 'database_error',
        operation: 'database_query'
      };

      mockSupabaseRpc.mockResolvedValue({
        data: {
          success: true,
          action: 'retry',
          attempts: 1,
          recovered: true,
          compensation_applied: false,
          message: 'Database operation succeeded on retry',
          error: null
        },
        error: null
      });

      const result = await ErrorRecoveryService.recoverFromError(dbErrorContext);

      expect(result.success).toBe(true);
      expect(result.action).toBe('retry');
    });

    it('should handle network_error with retry strategy', async () => {
      const networkErrorContext: ErrorContext = {
        ...mockErrorContext,
        errorType: 'network_error',
        operation: 'api_call'
      };

      mockSupabaseRpc.mockResolvedValue({
        data: {
          success: false,
          action: 'manual_intervention',
          attempts: 3,
          recovered: false,
          compensation_applied: false,
          message: 'All retry attempts failed',
          error: 'Network unreachable'
        },
        error: null
      });

      const result = await ErrorRecoveryService.recoverFromError(networkErrorContext);

      expect(result.success).toBe(false);
      expect(result.action).toBe('manual_intervention');
      expect(result.attempts).toBe(3);
    });

    it('should handle system_error requiring manual intervention', async () => {
      const systemErrorContext: ErrorContext = {
        ...mockErrorContext,
        errorType: 'system_error',
        operation: 'system_operation'
      };

      mockSupabaseRpc.mockResolvedValue({
        data: {
          success: false,
          action: 'manual_intervention',
          attempts: 0,
          recovered: false,
          compensation_applied: false,
          message: 'System error requires manual intervention',
          error: 'Critical system failure'
        },
        error: null
      });

      const result = await ErrorRecoveryService.recoverFromError(systemErrorContext);

      expect(result.success).toBe(false);
      expect(result.action).toBe('manual_intervention');
      expect(result.recovered).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle context without order ID', async () => {
      const contextWithoutOrder: ErrorContext = {
        ...mockErrorContext,
        orderId: undefined
      };

      mockSupabaseRpc.mockResolvedValue({
        data: {
          success: true,
          action: 'retry',
          attempts: 1,
          recovered: true,
          compensation_applied: false,
          message: 'Operation recovered without order context',
          error: null
        },
        error: null
      });

      const result = await ErrorRecoveryService.recoverFromError(contextWithoutOrder);

      expect(result.success).toBe(true);
      expect(mockSupabaseRpc).toHaveBeenCalledWith('recover_from_error_atomic',
        expect.objectContaining({
          input_order_id: null
        })
      );
    });

    it('should handle context without user ID', async () => {
      const contextWithoutUser: ErrorContext = {
        ...mockErrorContext,
        userId: undefined
      };

      mockSupabaseRpc.mockResolvedValue({
        data: {
          success: true,
          action: 'compensate',
          attempts: 1,
          recovered: true,
          compensation_applied: true,
          message: 'Recovery completed without user context',
          error: null
        },
        error: null
      });

      const result = await ErrorRecoveryService.recoverFromError(contextWithoutUser);

      expect(result.success).toBe(true);
      expect(mockSupabaseRpc).toHaveBeenCalledWith('recover_from_error_atomic',
        expect.objectContaining({
          input_user_id: null
        })
      );
    });

    it('should handle context without metadata', async () => {
      const contextWithoutMetadata: ErrorContext = {
        ...mockErrorContext,
        metadata: undefined
      };

      mockSupabaseRpc.mockResolvedValue({
        data: {
          success: true,
          action: 'retry',
          attempts: 1,
          recovered: true,
          compensation_applied: false,
          message: 'Recovery completed without metadata',
          error: null
        },
        error: null
      });

      const result = await ErrorRecoveryService.recoverFromError(contextWithoutMetadata);

      expect(result.success).toBe(true);
      expect(mockSupabaseRpc).toHaveBeenCalledWith('recover_from_error_atomic',
        expect.objectContaining({
          input_metadata: {}
        })
      );
    });

    it('should handle high retry count scenarios', async () => {
      const highRetryContext: ErrorContext = {
        ...mockErrorContext,
        retryCount: 5
      };

      mockSupabaseRpc.mockResolvedValue({
        data: {
          success: false,
          action: 'manual_intervention',
          attempts: 6,
          recovered: false,
          compensation_applied: false,
          message: 'Maximum retry attempts exceeded',
          error: 'Too many retry attempts'
        },
        error: null
      });

      const result = await ErrorRecoveryService.recoverFromError(highRetryContext);

      expect(result.success).toBe(false);
      expect(result.action).toBe('manual_intervention');
      expect(result.attempts).toBe(6);
      expect(mockSupabaseRpc).toHaveBeenCalledWith('recover_from_error_atomic',
        expect.objectContaining({
          input_retry_count: 5
        })
      );
    });
  });

  describe('recovery actions', () => {
    it('should handle successful compensation actions', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: {
          success: true,
          action: 'compensate',
          attempts: 1,
          recovered: true,
          compensation_applied: true,
          message: 'Compensation applied successfully',
          error: null
        },
        error: null
      });

      const result = await ErrorRecoveryService.recoverFromError(mockErrorContext);

      expect(result.action).toBe('compensate');
      expect(result.compensationApplied).toBe(true);
      expect(result.recovered).toBe(true);
    });

    it('should handle successful rollback actions', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: {
          success: true,
          action: 'rollback',
          attempts: 1,
          recovered: true,
          compensation_applied: true,
          message: 'Rollback completed successfully',
          error: null
        },
        error: null
      });

      const result = await ErrorRecoveryService.recoverFromError(mockErrorContext);

      expect(result.action).toBe('rollback');
      expect(result.compensationApplied).toBe(true);
      expect(result.recovered).toBe(true);
    });

    it('should handle successful retry actions', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: {
          success: true,
          action: 'retry',
          attempts: 3,
          recovered: true,
          compensation_applied: false,
          message: 'Operation succeeded on retry attempt 3',
          error: null
        },
        error: null
      });

      const result = await ErrorRecoveryService.recoverFromError(mockErrorContext);

      expect(result.action).toBe('retry');
      expect(result.attempts).toBe(3);
      expect(result.compensationApplied).toBe(false);
      expect(result.recovered).toBe(true);
    });

    it('should handle ignore actions', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: {
          success: true,
          action: 'ignore',
          attempts: 0,
          recovered: true,
          compensation_applied: false,
          message: 'Error was safely ignored',
          error: null
        },
        error: null
      });

      const result = await ErrorRecoveryService.recoverFromError(mockErrorContext);

      expect(result.action).toBe('ignore');
      expect(result.attempts).toBe(0);
      expect(result.recovered).toBe(true);
    });
  });
});