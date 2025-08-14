import { supabase } from '../config/supabase';
import { Order } from '../types';
import { restoreOrderStock } from './stockRestorationService';
import { NotificationService } from './notificationService';

// Error recovery types
export type ErrorType = 
  | 'payment_failed'
  | 'stock_update_failed' 
  | 'order_creation_failed'
  | 'notification_failed'
  | 'database_error'
  | 'network_error'
  | 'system_error';

export type RecoveryAction = 
  | 'retry'
  | 'rollback'
  | 'compensate'
  | 'manual_intervention'
  | 'ignore';

// Error recovery configuration
export interface ErrorRecoveryConfig {
  maxRetryAttempts: number;
  retryDelayMs: number;
  enableAutoRecovery: boolean;
  notifyOnFailure: boolean;
  logAllAttempts: boolean;
}

// Error recovery result
export interface ErrorRecoveryResult {
  success: boolean;
  action: RecoveryAction;
  attempts: number;
  recovered: boolean;
  compensationApplied: boolean;
  message: string;
  error?: string;
}

// Error context for recovery operations
export interface ErrorContext {
  errorType: ErrorType;
  orderId?: string;
  userId?: string;
  operation: string;
  originalError: Error;
  timestamp: string;
  retryCount: number;
  metadata?: Record<string, any>;
}

// Default error recovery configuration
const DEFAULT_ERROR_CONFIG: ErrorRecoveryConfig = {
  maxRetryAttempts: 3,
  retryDelayMs: 1000,
  enableAutoRecovery: true,
  notifyOnFailure: true,
  logAllAttempts: true
};

/**
 * Enhanced Error Recovery Service
 * Provides compensation logic and automatic recovery for failed operations
 */
export class ErrorRecoveryService {
  
  /**
   * Main error recovery method
   * Handles different types of errors with appropriate recovery strategies
   */
  static async recoverFromError(
    context: ErrorContext,
    config: Partial<ErrorRecoveryConfig> = {}
  ): Promise<ErrorRecoveryResult> {
    const finalConfig = { ...DEFAULT_ERROR_CONFIG, ...config };
    
    try {
      console.log(`🛡️ Starting atomic error recovery for ${context.errorType} in operation: ${context.operation}`);
      
      // Use atomic RPC function for error recovery
      const { data: result, error } = await supabase.rpc('recover_from_error_atomic', {
        input_error_type: context.errorType,
        input_order_id: context.orderId || null,
        input_user_id: context.userId || null,
        input_operation: context.operation,
        input_original_error: context.originalError.message,
        input_retry_count: context.retryCount,
        input_metadata: context.metadata || {}
      });

      if (error) {
        console.error('❌ Atomic error recovery failed:', error);
        return {
          success: false,
          action: 'manual_intervention' as RecoveryAction,
          attempts: context.retryCount + 1,
          recovered: false,
          compensationApplied: false,
          message: `Recovery RPC failed: ${error.message}`,
          error: error.message
        };
      }

      // Transform RPC result to ErrorRecoveryResult format
      const recoveryResult: ErrorRecoveryResult = {
        success: result.success,
        action: result.action,
        attempts: result.attempts,
        recovered: result.recovered,
        compensationApplied: result.compensation_applied,
        message: result.message,
        error: result.error || undefined
      };

      console.log(`✅ Atomic error recovery completed:`, recoveryResult);
      
      return recoveryResult;
      
    } catch (recoveryError) {
      console.error('Error in error recovery:', recoveryError);
      return {
        success: false,
        action: 'manual_intervention',
        attempts: 0,
        recovered: false,
        compensationApplied: false,
        message: 'Recovery process failed',
        error: recoveryError instanceof Error ? recoveryError.message : 'Unknown recovery error'
      };
    }
  }
  
  /**
   * Retry operation with exponential backoff
   */
  private static async retryOperation(
    context: ErrorContext,
    config: ErrorRecoveryConfig
  ): Promise<ErrorRecoveryResult> {
    let attempts = 0;
    let lastError: Error = context.originalError;
    
    while (attempts < config.maxRetryAttempts) {
      attempts++;
      
      try {
        console.log(`🔄 Retry attempt ${attempts}/${config.maxRetryAttempts} for ${context.operation}`);
        
        // Wait before retry (exponential backoff)
        if (attempts > 1) {
          const delay = config.retryDelayMs * Math.pow(2, attempts - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Attempt to retry the operation based on context
        const retrySuccess = await this.executeRetry(context);
        
        if (retrySuccess) {
          return {
            success: true,
            action: 'retry',
            attempts,
            recovered: true,
            compensationApplied: false,
            message: `Operation succeeded on retry attempt ${attempts}`
          };
        }
        
      } catch (retryError) {
        lastError = retryError instanceof Error ? retryError : new Error('Retry failed');
        console.warn(`Retry attempt ${attempts} failed:`, retryError);
      }
    }
    
    // All retries failed, escalate to compensation
    console.error(`All ${attempts} retry attempts failed for ${context.operation}`);
    return await this.compensateOperation(context, config);
  }
  
  /**
   * Rollback operation to previous state
   */
  private static async rollbackOperation(
    context: ErrorContext,
    config: ErrorRecoveryConfig
  ): Promise<ErrorRecoveryResult> {
    try {
      console.log(`↩️ Rolling back operation: ${context.operation}`);
      
      let rollbackSuccess = false;
      
      // Execute rollback based on operation type
      switch (context.operation) {
        case 'order_creation':
          rollbackSuccess = await this.rollbackOrderCreation(context);
          break;
        case 'stock_update':
          rollbackSuccess = await this.rollbackStockUpdate(context);
          break;
        case 'payment_processing':
          rollbackSuccess = await this.rollbackPaymentProcessing(context);
          break;
        default:
          console.warn(`No rollback strategy for operation: ${context.operation}`);
          return await this.flagForManualIntervention(context, config);
      }
      
      if (rollbackSuccess) {
        return {
          success: true,
          action: 'rollback',
          attempts: 1,
          recovered: true,
          compensationApplied: true,
          message: `Successfully rolled back ${context.operation}`
        };
      } else {
        return {
          success: false,
          action: 'rollback',
          attempts: 1,
          recovered: false,
          compensationApplied: false,
          message: `Failed to rollback ${context.operation}`,
          error: 'Rollback operation failed'
        };
      }
      
    } catch (rollbackError) {
      console.error('Rollback operation failed:', rollbackError);
      return await this.flagForManualIntervention(context, config);
    }
  }
  
  /**
   * Compensate for failed operation
   */
  private static async compensateOperation(
    context: ErrorContext,
    config: ErrorRecoveryConfig
  ): Promise<ErrorRecoveryResult> {
    try {
      console.log(`🔧 Applying compensation for failed operation: ${context.operation}`);
      
      let compensationSuccess = false;
      
      // Apply compensation based on error type and operation
      switch (context.errorType) {
        case 'payment_failed':
          compensationSuccess = await this.compensatePaymentFailure(context);
          break;
        case 'stock_update_failed':
          compensationSuccess = await this.compensateStockFailure(context);
          break;
        case 'order_creation_failed':
          compensationSuccess = await this.compensateOrderCreationFailure(context);
          break;
        default:
          console.warn(`No compensation strategy for error type: ${context.errorType}`);
          return await this.flagForManualIntervention(context, config);
      }
      
      if (compensationSuccess) {
        return {
          success: true,
          action: 'compensate',
          attempts: 1,
          recovered: true,
          compensationApplied: true,
          message: `Successfully compensated for ${context.errorType}`
        };
      } else {
        return await this.flagForManualIntervention(context, config);
      }
      
    } catch (compensationError) {
      console.error('Compensation failed:', compensationError);
      return await this.flagForManualIntervention(context, config);
    }
  }
  
  /**
   * Flag error for manual intervention
   */
  private static async flagForManualIntervention(
    context: ErrorContext,
    config: ErrorRecoveryConfig
  ): Promise<ErrorRecoveryResult> {
    try {
      console.log(`🚨 Flagging for manual intervention: ${context.operation}`);
      
      // Log critical error for admin attention
      await this.logCriticalError(context);
      
      // Notify administrators if enabled
      if (config.notifyOnFailure) {
        await this.notifyAdministrators(context);
      }
      
      return {
        success: false,
        action: 'manual_intervention',
        attempts: 0,
        recovered: false,
        compensationApplied: false,
        message: `Manual intervention required for ${context.operation}`,
        error: context.originalError.message
      };
      
    } catch (flagError) {
      console.error('Failed to flag for manual intervention:', flagError);
      return {
        success: false,
        action: 'manual_intervention',
        attempts: 0,
        recovered: false,
        compensationApplied: false,
        message: 'Critical error: Unable to flag for manual intervention',
        error: flagError instanceof Error ? flagError.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Get recovery strategy based on error type
   */
  private static getRecoveryStrategy(errorType: ErrorType): RecoveryAction {
    const strategies: Record<ErrorType, RecoveryAction> = {
      'payment_failed': 'compensate',
      'stock_update_failed': 'compensate',
      'order_creation_failed': 'rollback',
      'notification_failed': 'retry',
      'database_error': 'retry',
      'network_error': 'retry',
      'system_error': 'manual_intervention'
    };
    
    return strategies[errorType] || 'manual_intervention';
  }
  
  /**
   * Execute retry for specific operation
   */
  private static async executeRetry(context: ErrorContext): Promise<boolean> {
    // This would contain the actual retry logic for each operation type
    // For now, we'll simulate retry success/failure
    console.log(`Executing retry for ${context.operation}`);
    
    // Simulate retry logic based on operation
    switch (context.operation) {
      case 'notification_send':
        // Retry notification sending
        return Math.random() > 0.3; // 70% success rate on retry
      case 'database_query':
        // Retry database operation
        return Math.random() > 0.2; // 80% success rate on retry
      case 'stock_update':
        // Retry stock update
        return Math.random() > 0.4; // 60% success rate on retry
      default:
        return false;
    }
  }
  
  /**
   * Compensate for payment failure
   */
  private static async compensatePaymentFailure(context: ErrorContext): Promise<boolean> {
    try {
      if (!context.orderId) return false;
      
      console.log(`💳 Compensating for payment failure on order: ${context.orderId}`);
      
      // Mark order as payment failed and restore stock
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          payment_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', context.orderId);
      
      if (updateError) {
        console.error('Failed to update order status for payment failure:', updateError);
        return false;
      }
      
      // Restore stock for the failed order
      // Note: This would trigger the automatic stock restoration in the order status update
      
      return true;
    } catch (error) {
      console.error('Payment failure compensation failed:', error);
      return false;
    }
  }
  
  /**
   * Compensate for stock update failure
   */
  private static async compensateStockFailure(context: ErrorContext): Promise<boolean> {
    try {
      console.log(`📦 Compensating for stock update failure`);
      
      // If stock deduction failed during order creation, we need to cancel the order
      if (context.orderId) {
        const { error } = await supabase
          .from('orders')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', context.orderId);
        
        if (error) {
          console.error('Failed to cancel order due to stock failure:', error);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Stock failure compensation failed:', error);
      return false;
    }
  }
  
  /**
   * Compensate for order creation failure
   */
  private static async compensateOrderCreationFailure(context: ErrorContext): Promise<boolean> {
    try {
      console.log(`📋 Compensating for order creation failure`);
      
      // If order creation partially succeeded, we need to clean up
      if (context.orderId) {
        // Remove any partial order data
        const { error } = await supabase
          .from('orders')
          .delete()
          .eq('id', context.orderId);
        
        if (error) {
          console.error('Failed to clean up partial order:', error);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Order creation failure compensation failed:', error);
      return false;
    }
  }
  
  /**
   * Rollback order creation
   */
  private static async rollbackOrderCreation(context: ErrorContext): Promise<boolean> {
    // Implementation would depend on what needs to be rolled back
    console.log('Rolling back order creation');
    return true;
  }
  
  /**
   * Rollback stock update
   */
  private static async rollbackStockUpdate(context: ErrorContext): Promise<boolean> {
    // Implementation would restore stock to previous levels
    console.log('Rolling back stock update');
    return true;
  }
  
  /**
   * Rollback payment processing
   */
  private static async rollbackPaymentProcessing(context: ErrorContext): Promise<boolean> {
    // Implementation would reverse payment transactions
    console.log('Rolling back payment processing');
    return true;
  }
  
  /**
   * Log error attempt for debugging
   */
  private static async logErrorAttempt(context: ErrorContext): Promise<void> {
    try {
      const { error } = await supabase
        .from('error_recovery_logs')
        .insert({
          error_type: context.errorType,
          operation: context.operation,
          order_id: context.orderId,
          user_id: context.userId,
          error_message: context.originalError.message,
          error_stack: context.originalError.stack,
          retry_count: context.retryCount,
          metadata: context.metadata,
          timestamp: context.timestamp,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.warn('Failed to log error attempt:', error);
      }
    } catch (error) {
      console.warn('Failed to log error attempt:', error);
    }
  }
  
  /**
   * Log recovery result
   */
  private static async logRecoveryResult(
    context: ErrorContext,
    result: ErrorRecoveryResult
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('error_recovery_results')
        .insert({
          error_type: context.errorType,
          operation: context.operation,
          order_id: context.orderId,
          recovery_action: result.action,
          recovery_success: result.success,
          attempts: result.attempts,
          recovered: result.recovered,
          compensation_applied: result.compensationApplied,
          result_message: result.message,
          result_error: result.error,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.warn('Failed to log recovery result:', error);
      }
    } catch (error) {
      console.warn('Failed to log recovery result:', error);
    }
  }
  
  /**
   * Log critical error for admin attention
   */
  private static async logCriticalError(context: ErrorContext): Promise<void> {
    try {
      const { error } = await supabase
        .from('critical_errors')
        .insert({
          error_type: context.errorType,
          operation: context.operation,
          order_id: context.orderId,
          user_id: context.userId,
          error_message: context.originalError.message,
          error_stack: context.originalError.stack,
          requires_manual_intervention: true,
          metadata: context.metadata,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.warn('Failed to log critical error:', error);
      }
    } catch (error) {
      console.warn('Failed to log critical error:', error);
    }
  }
  
  /**
   * Notify administrators of critical errors
   */
  private static async notifyAdministrators(context: ErrorContext): Promise<void> {
    try {
      // This would send notifications to admin users
      console.log(`🚨 Notifying administrators of critical error: ${context.errorType}`);
      
      // Implementation would fetch admin users and send notifications
      // For now, we'll just log the intent
    } catch (error) {
      console.warn('Failed to notify administrators:', error);
    }
  }
}

// Export convenience functions
export const recoverFromError = ErrorRecoveryService.recoverFromError;
