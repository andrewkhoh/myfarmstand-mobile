/**
 * ErrorRecoveryService Test - REFACTORED
 * Testing error recovery functionality with simplified mocks and factories
 */

import { ErrorRecoveryService } from '../errorRecoveryService';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { createOrder, createUser, createPayment, resetAllFactories } from '../../test/factories';

// Replace complex mock setup with simple data-driven mock
jest.mock('../../config/supabase', () => ({
  supabase: null // Will be set in beforeEach
}));

describe('ErrorRecoveryService', () => {
  let supabaseMock: any;
  let testOrder: any;
  let testUser: any;
  let testPayment: any;
  
  beforeEach(() => {
    // Reset factory counter for consistent IDs
    resetAllFactories();
    
    // Create test data using factories
    testUser = createUser({
      id: 'user-123',
      email: 'test@example.com'
    });
    
    testOrder = createOrder({
      id: 'order-456',
      user_id: 'user-123',
      status: 'payment_failed',
      payment_status: 'failed',
      total_amount: 25.99
    });
    
    testPayment = createPayment({
      id: 'payment-789',
      userId: 'user-123',
      orderId: 'order-456',
      amount: 25.99,
      status: 'failed'
    });
    
    // Create mock with initial data
    supabaseMock = createSupabaseMock({
      orders: [testOrder],
      users: [testUser],
      payments: [testPayment],
      error_recovery_logs: []
    });
    
    // Mock RPC functions
    supabaseMock.rpc = jest.fn().mockImplementation(async (functionName, params) => {
      switch (functionName) {
        case 'recover_from_payment_error':
          return { data: { success: true, recovered: true }, error: null };
        case 'recover_stock_error':
          return { data: { success: true, stockRestored: true }, error: null };
        case 'recover_network_error':
          return { data: { success: true, retrySucceeded: true }, error: null };
        default:
          return { data: null, error: { message: 'Unknown RPC function' } };
      }
    });
    
    // Inject mock
    require('../../config/supabase').supabase = supabaseMock;
  });

  describe('recoverFromError', () => {
    it('should successfully recover from error using atomic RPC', async () => {
      const errorContext = {
        errorType: 'payment_failed',
        orderId: 'order-456',
        userId: 'user-123',
        timestamp: new Date().toISOString(),
        errorDetails: { code: 'CARD_DECLINED', message: 'Payment failed' }
      };

      const result = await ErrorRecoveryService.recoverFromError(errorContext);

      expect(result.success).toBe(true);
      expect(result.recovered).toBe(true);
      expect(result.action).toBe('automatic');
      expect(result.recoveryMethod).toBe('payment_retry');
    });

    it('should handle RPC error and return manual intervention', async () => {
      // Mock RPC to fail
      supabaseMock.rpc.mockImplementation(async () => ({
        data: null,
        error: { message: 'RPC function failed' }
      }));

      const errorContext = {
        errorType: 'payment_failed',
        orderId: 'order-456',
        userId: 'user-123'
      };

      const result = await ErrorRecoveryService.recoverFromError(errorContext);

      expect(result.success).toBe(false);
      expect(result.action).toBe('manual_intervention');
      expect(result.error).toContain('RPC function failed');
    });

    it('should handle recovery process exception', async () => {
      // Mock RPC to throw exception
      supabaseMock.rpc.mockImplementation(async () => {
        throw new Error('Database connection lost');
      });

      const errorContext = {
        errorType: 'system_error',
        orderId: 'order-456'
      };

      const result = await ErrorRecoveryService.recoverFromError(errorContext);

      expect(result.success).toBe(false);
      expect(result.action).toBe('manual_intervention');
      expect(result.error).toContain('Recovery process failed');
    });

    it('should use custom error recovery config', async () => {
      const customConfig = {
        maxRetries: 5,
        retryDelay: 2000,
        escalationThreshold: 3
      };

      const errorContext = {
        errorType: 'network_error',
        orderId: 'order-456',
        config: customConfig
      };

      const result = await ErrorRecoveryService.recoverFromError(errorContext);

      expect(result.success).toBe(true);
      expect(result.config).toMatchObject(customConfig);
    });

    it('should handle missing order ID in context', async () => {
      const errorContext = {
        errorType: 'payment_failed',
        // Missing orderId
        userId: 'user-123'
      };

      const result = await ErrorRecoveryService.recoverFromError(errorContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Order ID is required');
    });
  });

  describe('Error Type Handling', () => {
    it('should handle payment_failed errors', async () => {
      const errorContext = {
        errorType: 'payment_failed',
        orderId: 'order-456',
        userId: 'user-123',
        errorDetails: { code: 'INSUFFICIENT_FUNDS' }
      };

      const result = await ErrorRecoveryService.recoverFromError(errorContext);

      expect(result.success).toBe(true);
      expect(result.recoveryMethod).toBe('payment_retry');
      expect(supabaseMock.rpc).toHaveBeenCalledWith(
        'recover_from_payment_error',
        expect.objectContaining({ orderId: 'order-456' })
      );
    });

    it('should handle stock_update_failed errors', async () => {
      const errorContext = {
        errorType: 'stock_update_failed',
        orderId: 'order-456',
        productId: 'product-123',
        quantityRequested: 5
      };

      const result = await ErrorRecoveryService.recoverFromError(errorContext);

      expect(result.success).toBe(true);
      expect(result.recoveryMethod).toBe('stock_restoration');
      expect(supabaseMock.rpc).toHaveBeenCalledWith(
        'recover_stock_error',
        expect.objectContaining({ 
          orderId: 'order-456',
          productId: 'product-123' 
        })
      );
    });

    it('should handle network_error with retry', async () => {
      const errorContext = {
        errorType: 'network_error',
        orderId: 'order-456',
        operation: 'place_order',
        retryCount: 1
      };

      const result = await ErrorRecoveryService.recoverFromError(errorContext);

      expect(result.success).toBe(true);
      expect(result.recoveryMethod).toBe('retry_operation');
      expect(supabaseMock.rpc).toHaveBeenCalledWith(
        'recover_network_error',
        expect.objectContaining({ 
          operation: 'place_order',
          retryCount: 1
        })
      );
    });

    it('should handle system_error requiring manual intervention', async () => {
      const errorContext = {
        errorType: 'system_error',
        orderId: 'order-456',
        severity: 'critical'
      };

      // Mock system error to require manual intervention
      supabaseMock.rpc.mockImplementation(async (functionName) => {
        if (functionName === 'recover_system_error') {
          return { 
            data: { 
              success: false, 
              requiresManualIntervention: true 
            }, 
            error: null 
          };
        }
        return { data: null, error: { message: 'Unknown function' } };
      });

      const result = await ErrorRecoveryService.recoverFromError(errorContext);

      expect(result.success).toBe(false);
      expect(result.action).toBe('manual_intervention');
      expect(result.severity).toBe('critical');
    });
  });

  describe('Recovery Configuration', () => {
    it('should use default configuration when none provided', async () => {
      const errorContext = {
        errorType: 'network_error',
        orderId: 'order-456'
      };

      const result = await ErrorRecoveryService.recoverFromError(errorContext);

      expect(result.success).toBe(true);
      expect(result.config).toMatchObject({
        maxRetries: 3,
        retryDelay: 1000,
        escalationThreshold: 2
      });
    });

    it('should merge custom config with defaults', async () => {
      const errorContext = {
        errorType: 'payment_failed',
        orderId: 'order-456',
        config: {
          maxRetries: 5,
          customSetting: true
        }
      };

      const result = await ErrorRecoveryService.recoverFromError(errorContext);

      expect(result.success).toBe(true);
      expect(result.config.maxRetries).toBe(5);
      expect(result.config.retryDelay).toBe(1000); // Default value
      expect(result.config.customSetting).toBe(true);
    });
  });

  describe('Recovery Logging', () => {
    it('should log recovery attempts', async () => {
      const errorContext = {
        errorType: 'payment_failed',
        orderId: 'order-456',
        userId: 'user-123'
      };

      await ErrorRecoveryService.recoverFromError(errorContext);

      // Check that recovery log was created
      const logs = supabaseMock.getTableData('error_recovery_logs');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        order_id: 'order-456',
        error_type: 'payment_failed',
        recovery_method: 'payment_retry',
        status: 'success'
      });
    });

    it('should log failed recovery attempts', async () => {
      supabaseMock.rpc.mockImplementation(async () => ({
        data: null,
        error: { message: 'Recovery failed' }
      }));

      const errorContext = {
        errorType: 'payment_failed',
        orderId: 'order-456'
      };

      await ErrorRecoveryService.recoverFromError(errorContext);

      const logs = supabaseMock.getTableData('error_recovery_logs');
      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe('failed');
      expect(logs[0].error_message).toContain('Recovery failed');
    });

    it('should handle logging errors gracefully', async () => {
      // Mock logging to fail
      supabaseMock.queueError(new Error('Database logging failed'));

      const errorContext = {
        errorType: 'network_error',
        orderId: 'order-456'
      };

      // Should still complete recovery even if logging fails
      const result = await ErrorRecoveryService.recoverFromError(errorContext);

      expect(result.success).toBe(true);
    });
  });

  describe('Batch Error Recovery', () => {
    it('should recover multiple errors concurrently', async () => {
      const errorContexts = [
        { errorType: 'payment_failed', orderId: 'order-1' },
        { errorType: 'stock_update_failed', orderId: 'order-2', productId: 'product-1' },
        { errorType: 'network_error', orderId: 'order-3' }
      ];

      const results = await ErrorRecoveryService.recoverMultipleErrors(errorContexts);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(supabaseMock.rpc).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in batch recovery', async () => {
      // Mock second RPC call to fail
      let callCount = 0;
      supabaseMock.rpc.mockImplementation(async (functionName) => {
        callCount++;
        if (callCount === 2) {
          return { data: null, error: { message: 'Second recovery failed' } };
        }
        return { data: { success: true }, error: null };
      });

      const errorContexts = [
        { errorType: 'payment_failed', orderId: 'order-1' },
        { errorType: 'stock_update_failed', orderId: 'order-2' },
        { errorType: 'network_error', orderId: 'order-3' }
      ];

      const results = await ErrorRecoveryService.recoverMultipleErrors(errorContexts);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe('Recovery Escalation', () => {
    it('should escalate after threshold failures', async () => {
      const errorContext = {
        errorType: 'payment_failed',
        orderId: 'order-456',
        previousAttempts: 3,
        config: { escalationThreshold: 2 }
      };

      const result = await ErrorRecoveryService.recoverFromError(errorContext);

      expect(result.escalated).toBe(true);
      expect(result.action).toBe('escalate_to_admin');
    });

    it('should send escalation notifications', async () => {
      const errorContext = {
        errorType: 'system_error',
        orderId: 'order-456',
        severity: 'critical',
        escalate: true
      };

      const result = await ErrorRecoveryService.recoverFromError(errorContext);

      expect(result.notificationSent).toBe(true);
      expect(result.escalated).toBe(true);
    });
  });
});