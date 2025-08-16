/**
 * ErrorRecoveryService Test
 * Comprehensive testing for error recovery functionality including
 * retry operations, compensation logic, rollback procedures, and manual intervention
 */

import { 
  ErrorRecoveryService,
  recoverFromError,
  ErrorType,
  RecoveryAction,
  ErrorContext,
  ErrorRecoveryConfig,
  ErrorRecoveryResult
} from '../errorRecoveryService';

// Mock the supabase module
const mockSupabase = require('../../config/supabase').supabase;

// Mock notification service
const mockNotificationService = require('../notificationService').NotificationService;

// Mock stock restoration service
const mockRestoreOrderStock = require('../stockRestorationService').restoreOrderStock;

describe('ErrorRecoveryService', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset console methods to avoid test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('recoverFromError', () => {
    const mockErrorContext: ErrorContext = {
      errorType: 'payment_failed',
      orderId: 'order-123',
      userId: 'user-456',
      operation: 'payment_processing',
      originalError: new Error('Payment gateway timeout'),
      timestamp: '2024-03-20T12:00:00Z',
      retryCount: 0,
      metadata: { amount: 50.00, gateway: 'stripe' }
    };

    it('should successfully recover from error using atomic RPC', async () => {
      // Mock successful RPC call
      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: true,
          action: 'compensate',
          attempts: 1,
          recovered: true,
          compensation_applied: true,
          message: 'Successfully compensated for payment failure',
          error: null
        },
        error: null
      });

      const result = await ErrorRecoveryService.recoverFromError(mockErrorContext);

      expect(result).toEqual({
        success: true,
        action: 'compensate',
        attempts: 1,
        recovered: true,
        compensationApplied: true,
        message: 'Successfully compensated for payment failure'
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('recover_from_error_atomic', {
        input_error_type: 'payment_failed',
        input_order_id: 'order-123',
        input_user_id: 'user-456',
        input_operation: 'payment_processing',
        input_original_error: 'Payment gateway timeout',
        input_retry_count: 0,
        input_metadata: { amount: 50.00, gateway: 'stripe' }
      });
    });

    it('should handle RPC error and return manual intervention', async () => {
      // Mock RPC error
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const result = await ErrorRecoveryService.recoverFromError(mockErrorContext);

      expect(result).toEqual({
        success: false,
        action: 'manual_intervention',
        attempts: 1,
        recovered: false,
        compensationApplied: false,
        message: 'Recovery RPC failed: Database connection failed',
        error: 'Database connection failed'
      });
    });

    it('should handle recovery process exception', async () => {
      // Mock RPC throwing exception
      mockSupabase.rpc.mockRejectedValue(new Error('Network error'));

      const result = await ErrorRecoveryService.recoverFromError(mockErrorContext);

      expect(result).toEqual({
        success: false,
        action: 'manual_intervention',
        attempts: 0,
        recovered: false,
        compensationApplied: false,
        message: 'Recovery process failed',
        error: 'Network error'
      });
    });

    it('should use custom error recovery config', async () => {
      const customConfig: Partial<ErrorRecoveryConfig> = {
        maxRetryAttempts: 5,
        retryDelayMs: 2000,
        enableAutoRecovery: false
      };

      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: true,
          action: 'retry',
          attempts: 2,
          recovered: true,
          compensation_applied: false,
          message: 'Recovered after retry',
          error: null
        },
        error: null
      });

      const result = await ErrorRecoveryService.recoverFromError(mockErrorContext, customConfig);

      expect(result.success).toBe(true);
      expect(result.action).toBe('retry');
    });

    it('should handle missing order ID in context', async () => {
      const contextWithoutOrder = {
        ...mockErrorContext,
        orderId: undefined
      };

      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: false,
          action: 'manual_intervention',
          attempts: 1,
          recovered: false,
          compensation_applied: false,
          message: 'Cannot recover without order ID',
          error: 'Missing order ID'
        },
        error: null
      });

      const result = await ErrorRecoveryService.recoverFromError(contextWithoutOrder);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('recover_from_error_atomic', {
        input_error_type: 'payment_failed',
        input_order_id: null,
        input_user_id: 'user-456',
        input_operation: 'payment_processing',
        input_original_error: 'Payment gateway timeout',
        input_retry_count: 0,
        input_metadata: { amount: 50.00, gateway: 'stripe' }
      });
    });
  });

  describe('Error Type Handling', () => {
    it('should handle payment_failed errors', async () => {
      const paymentContext: ErrorContext = {
        errorType: 'payment_failed',
        orderId: 'order-payment-fail',
        operation: 'payment_processing',
        originalError: new Error('Card declined'),
        timestamp: '2024-03-20T12:00:00Z',
        retryCount: 0
      };

      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: true,
          action: 'compensate',
          attempts: 1,
          recovered: true,
          compensation_applied: true,
          message: 'Payment failure compensated',
          error: null
        },
        error: null
      });

      const result = await recoverFromError(paymentContext);

      expect(result.action).toBe('compensate');
      expect(result.compensationApplied).toBe(true);
    });

    it('should handle stock_update_failed errors', async () => {
      const stockContext: ErrorContext = {
        errorType: 'stock_update_failed',
        orderId: 'order-stock-fail',
        operation: 'stock_deduction',
        originalError: new Error('Insufficient stock'),
        timestamp: '2024-03-20T12:00:00Z',
        retryCount: 1
      };

      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: true,
          action: 'compensate',
          attempts: 2,
          recovered: true,
          compensation_applied: true,
          message: 'Stock failure compensated',
          error: null
        },
        error: null
      });

      const result = await recoverFromError(stockContext);

      expect(result.action).toBe('compensate');
      expect(result.attempts).toBe(2);
    });

    it('should handle network_error with retry', async () => {
      const networkContext: ErrorContext = {
        errorType: 'network_error',
        operation: 'api_call',
        originalError: new Error('Connection timeout'),
        timestamp: '2024-03-20T12:00:00Z',
        retryCount: 0
      };

      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: true,
          action: 'retry',
          attempts: 3,
          recovered: true,
          compensation_applied: false,
          message: 'Network error resolved after retry',
          error: null
        },
        error: null
      });

      const result = await recoverFromError(networkContext);

      expect(result.action).toBe('retry');
      expect(result.compensationApplied).toBe(false);
    });

    it('should handle system_error requiring manual intervention', async () => {
      const systemContext: ErrorContext = {
        errorType: 'system_error',
        operation: 'critical_system_operation',
        originalError: new Error('System corruption detected'),
        timestamp: '2024-03-20T12:00:00Z',
        retryCount: 0
      };

      mockSupabase.rpc.mockResolvedValue({
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

      const result = await recoverFromError(systemContext);

      expect(result.action).toBe('manual_intervention');
      expect(result.recovered).toBe(false);
    });
  });

  describe('Recovery Configuration', () => {
    it('should use default configuration when none provided', async () => {
      const context: ErrorContext = {
        errorType: 'notification_failed',
        operation: 'send_notification',
        originalError: new Error('Email service unavailable'),
        timestamp: '2024-03-20T12:00:00Z',
        retryCount: 0
      };

      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: true,
          action: 'retry',
          attempts: 1,
          recovered: true,
          compensation_applied: false,
          message: 'Notification sent after retry',
          error: null
        },
        error: null
      });

      const result = await recoverFromError(context);

      expect(result.success).toBe(true);
      // Default config should be applied internally
      expect(mockSupabase.rpc).toHaveBeenCalled();
    });

    it('should merge custom config with defaults', async () => {
      const context: ErrorContext = {
        errorType: 'database_error',
        operation: 'query_execution',
        originalError: new Error('Query timeout'),
        timestamp: '2024-03-20T12:00:00Z',
        retryCount: 2
      };

      const customConfig: Partial<ErrorRecoveryConfig> = {
        maxRetryAttempts: 10,
        notifyOnFailure: false
      };

      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: true,
          action: 'retry',
          attempts: 3,
          recovered: true,
          compensation_applied: false,
          message: 'Database query succeeded after retry',
          error: null
        },
        error: null
      });

      const result = await recoverFromError(context, customConfig);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
    });
  });

  describe('Error Context Validation', () => {
    it('should handle context with minimal information', async () => {
      const minimalContext: ErrorContext = {
        errorType: 'notification_failed',
        operation: 'email_send',
        originalError: new Error('SMTP error'),
        timestamp: '2024-03-20T12:00:00Z',
        retryCount: 0
      };

      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: true,
          action: 'retry',
          attempts: 1,
          recovered: true,
          compensation_applied: false,
          message: 'Notification recovered',
          error: null
        },
        error: null
      });

      const result = await recoverFromError(minimalContext);

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('recover_from_error_atomic', {
        input_error_type: 'notification_failed',
        input_order_id: null,
        input_user_id: null,
        input_operation: 'email_send',
        input_original_error: 'SMTP error',
        input_retry_count: 0,
        input_metadata: {}
      });
    });

    it('should handle context with complex metadata', async () => {
      const complexContext: ErrorContext = {
        errorType: 'order_creation_failed',
        orderId: 'order-complex',
        userId: 'user-complex',
        operation: 'order_processing',
        originalError: new Error('Validation failed'),
        timestamp: '2024-03-20T12:00:00Z',
        retryCount: 1,
        metadata: {
          step: 'inventory_check',
          products: ['prod-1', 'prod-2'],
          payment_amount: 125.50,
          customer_tier: 'premium',
          complex_object: {
            nested: {
              value: 'test'
            }
          }
        }
      };

      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: true,
          action: 'rollback',
          attempts: 2,
          recovered: true,
          compensation_applied: true,
          message: 'Order creation rolled back successfully',
          error: null
        },
        error: null
      });

      const result = await recoverFromError(complexContext);

      expect(result.success).toBe(true);
      expect(result.action).toBe('rollback');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('recover_from_error_atomic', {
        input_error_type: 'order_creation_failed',
        input_order_id: 'order-complex',
        input_user_id: 'user-complex',
        input_operation: 'order_processing',
        input_original_error: 'Validation failed',
        input_retry_count: 1,
        input_metadata: complexContext.metadata
      });
    });
  });

  describe('Recovery Result Transformation', () => {
    it('should correctly transform RPC result to ErrorRecoveryResult', async () => {
      const context: ErrorContext = {
        errorType: 'payment_failed',
        operation: 'charge_card',
        originalError: new Error('Card expired'),
        timestamp: '2024-03-20T12:00:00Z',
        retryCount: 0
      };

      // Mock RPC returning snake_case result
      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: true,
          action: 'compensate',
          attempts: 1,
          recovered: true,
          compensation_applied: true,
          message: 'Payment compensated successfully',
          error: null
        },
        error: null
      });

      const result = await recoverFromError(context);

      // Should transform to camelCase
      expect(result).toEqual({
        success: true,
        action: 'compensate',
        attempts: 1,
        recovered: true,
        compensationApplied: true,
        message: 'Payment compensated successfully'
      });
    });

    it('should handle RPC result with error field', async () => {
      const context: ErrorContext = {
        errorType: 'stock_update_failed',
        operation: 'stock_deduction',
        originalError: new Error('Stock not found'),
        timestamp: '2024-03-20T12:00:00Z',
        retryCount: 2
      };

      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: false,
          action: 'manual_intervention',
          attempts: 3,
          recovered: false,
          compensation_applied: false,
          message: 'All recovery attempts failed',
          error: 'Product no longer exists'
        },
        error: null
      });

      const result = await recoverFromError(context);

      expect(result).toEqual({
        success: false,
        action: 'manual_intervention',
        attempts: 3,
        recovered: false,
        compensationApplied: false,
        message: 'All recovery attempts failed',
        error: 'Product no longer exists'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-Error originalError objects', async () => {
      const context = {
        errorType: 'system_error' as ErrorType,
        operation: 'unknown_operation',
        originalError: { message: 'Not a real Error object' } as Error,
        timestamp: '2024-03-20T12:00:00Z',
        retryCount: 0
      };

      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: false,
          action: 'manual_intervention',
          attempts: 0,
          recovered: false,
          compensation_applied: false,
          message: 'Invalid error object',
          error: 'Cannot process recovery'
        },
        error: null
      });

      const result = await recoverFromError(context);

      expect(result.success).toBe(false);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('recover_from_error_atomic', {
        input_error_type: 'system_error',
        input_order_id: null,
        input_user_id: null,
        input_operation: 'unknown_operation',
        input_original_error: 'Not a real Error object',
        input_retry_count: 0,
        input_metadata: {}
      });
    });

    it('should handle very high retry counts', async () => {
      const context: ErrorContext = {
        errorType: 'network_error',
        operation: 'api_retry_test',
        originalError: new Error('Still failing'),
        timestamp: '2024-03-20T12:00:00Z',
        retryCount: 99
      };

      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: false,
          action: 'manual_intervention',
          attempts: 100,
          recovered: false,
          compensation_applied: false,
          message: 'Exceeded maximum retry attempts',
          error: 'Too many retries'
        },
        error: null
      });

      const result = await recoverFromError(context);

      expect(result.attempts).toBe(100);
      expect(result.action).toBe('manual_intervention');
    });

    it('should handle empty metadata', async () => {
      const context: ErrorContext = {
        errorType: 'notification_failed',
        operation: 'push_notification',
        originalError: new Error('Device token invalid'),
        timestamp: '2024-03-20T12:00:00Z',
        retryCount: 0,
        metadata: {}
      };

      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: true,
          action: 'ignore',
          attempts: 0,
          recovered: false,
          compensation_applied: false,
          message: 'Notification failure ignored',
          error: null
        },
        error: null
      });

      const result = await recoverFromError(context);

      expect(result.action).toBe('ignore');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('recover_from_error_atomic', 
        expect.objectContaining({
          input_metadata: {}
        })
      );
    });
  });
});