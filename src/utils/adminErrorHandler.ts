/**
 * Admin Error Handler
 * 
 * Centralized error handling for admin operations with user-friendly messages.
 * 
 * Pattern: Graceful degradation with comprehensive error recovery
 * - Never breaks user workflows
 * - Provides actionable error messages
 * - Includes recovery suggestions
 * - Tracks error patterns for monitoring
 */

import { Alert } from 'react-native';
import { ValidationMonitor } from './validationMonitor';

// Error type definitions
export interface AdminErrorContext {
  operation: 'create' | 'update' | 'delete' | 'fetch' | 'bulk' | 'validate';
  entity: 'product' | 'category' | 'stock' | 'order' | 'customer';
  details?: Record<string, any>;
}

export interface UserFriendlyError {
  title: string;
  message: string;
  actions?: ErrorAction[];
  recoverable: boolean;
  context?: AdminErrorContext;
}

export interface ErrorAction {
  label: string;
  action: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Admin Error Handler
 * Provides user-friendly error messages and recovery actions
 */
export class AdminErrorHandler {
  /**
   * Map technical errors to user-friendly messages
   */
  private static errorMappings: Record<string, (error: any) => UserFriendlyError> = {
    // Network errors
    'NetworkError': () => ({
      title: 'Connection Issue',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      recoverable: true,
      actions: [
        { label: 'Retry', action: () => {}, style: 'default' },
        { label: 'Work Offline', action: () => {}, style: 'default' }
      ]
    }),

    // Validation errors
    'ValidationError': (error) => ({
      title: 'Invalid Input',
      message: error.message || 'Please check your input and ensure all required fields are filled correctly.',
      recoverable: true,
      actions: [
        { label: 'Review Input', action: () => {}, style: 'default' }
      ]
    }),

    // Permission errors
    'PermissionError': () => ({
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action. Please contact your administrator.',
      recoverable: false,
      actions: [
        { label: 'Go Back', action: () => {}, style: 'default' }
      ]
    }),

    // Conflict errors
    'ConflictError': () => ({
      title: 'Update Conflict',
      message: 'This item has been modified by another user. Please refresh and try again.',
      recoverable: true,
      actions: [
        { label: 'Refresh', action: () => {}, style: 'default' }
      ]
    }),

    // Stock errors
    'InsufficientStockError': (error) => ({
      title: 'Stock Issue',
      message: `Insufficient stock available. Current stock: ${error.currentStock || 'unknown'}`,
      recoverable: true,
      actions: [
        { label: 'Adjust Quantity', action: () => {}, style: 'default' }
      ]
    }),

    // Database errors
    'DatabaseError': () => ({
      title: 'System Error',
      message: 'A system error occurred. Our team has been notified. Please try again later.',
      recoverable: true,
      actions: [
        { label: 'Try Again', action: () => {}, style: 'default' }
      ]
    })
  };

  /**
   * Handle error with user-friendly message
   */
  static handle(
    error: any,
    context: AdminErrorContext,
    customActions?: ErrorAction[]
  ): UserFriendlyError {
    // Log error for monitoring
    ValidationMonitor.recordValidationError({
      service: 'adminErrorHandler',
      operation: context.operation,
      error: error.message || 'Unknown error',
      details: {
        entity: context.entity,
        errorType: error.name || error.constructor?.name || 'UnknownError',
        ...context.details
      }
    });

    // Determine error type
    const errorType = this.getErrorType(error);
    const errorMapper = this.errorMappings[errorType] || this.defaultErrorMapper;
    
    // Get user-friendly error
    const userError = errorMapper(error);
    userError.context = context;
    
    // Add custom actions if provided
    if (customActions) {
      userError.actions = [...(userError.actions || []), ...customActions];
    }

    return userError;
  }

  /**
   * Show error alert to user
   */
  static showAlert(error: UserFriendlyError): void {
    const buttons = error.actions?.map(action => ({
      text: action.label,
      style: action.style,
      onPress: action.action
    })) || [{ text: 'OK', style: 'default' as const }];

    Alert.alert(error.title, error.message, buttons);
  }

  /**
   * Handle and show error in one call
   */
  static handleAndShow(
    error: any,
    context: AdminErrorContext,
    customActions?: ErrorAction[]
  ): void {
    const userError = this.handle(error, context, customActions);
    this.showAlert(userError);
  }

  /**
   * Get error type from error object
   */
  private static getErrorType(error: any): string {
    // Check for specific error types
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network')) {
      return 'NetworkError';
    }
    if (error.code === 'VALIDATION_ERROR' || error.name === 'ZodError') {
      return 'ValidationError';
    }
    if (error.code === 'PERMISSION_DENIED' || error.code === '403') {
      return 'PermissionError';
    }
    if (error.code === 'CONFLICT' || error.code === '409') {
      return 'ConflictError';
    }
    if (error.code === 'INSUFFICIENT_STOCK') {
      return 'InsufficientStockError';
    }
    if (error.code?.startsWith('22') || error.code?.startsWith('23')) {
      return 'DatabaseError';
    }

    return 'UnknownError';
  }

  /**
   * Default error mapper for unknown errors
   */
  private static defaultErrorMapper = (error: any): UserFriendlyError => ({
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    recoverable: true,
    actions: [
      { label: 'Try Again', action: () => {}, style: 'default' }
    ]
  });

  /**
   * Create context-specific error messages
   */
  static createContextualMessage(
    context: AdminErrorContext,
    error: any
  ): string {
    const { operation, entity } = context;
    
    const messages: Record<string, Record<string, string>> = {
      create: {
        product: 'Unable to create product. Please check all required fields.',
        category: 'Unable to create category. The name may already exist.',
        stock: 'Unable to update stock. Please verify the quantity.',
        order: 'Unable to create order. Please review the order details.',
        customer: 'Unable to create customer. Please check the information.'
      },
      update: {
        product: 'Unable to update product. It may have been modified by another user.',
        category: 'Unable to update category. Please try again.',
        stock: 'Unable to update stock. Current stock may have changed.',
        order: 'Unable to update order. The order status may have changed.',
        customer: 'Unable to update customer information.'
      },
      delete: {
        product: 'Unable to delete product. It may be referenced by active orders.',
        category: 'Unable to delete category. It may contain products.',
        stock: 'Unable to adjust stock. Please verify the operation.',
        order: 'Unable to delete order. It may be in processing.',
        customer: 'Unable to delete customer. They may have active orders.'
      },
      fetch: {
        product: 'Unable to load products. Please check your connection.',
        category: 'Unable to load categories. Please try again.',
        stock: 'Unable to load stock information. Please refresh.',
        order: 'Unable to load orders. Please check your connection.',
        customer: 'Unable to load customer information.'
      },
      bulk: {
        product: 'Some products could not be updated. See details below.',
        category: 'Some categories could not be processed.',
        stock: 'Some stock updates failed. Review the results.',
        order: 'Some orders could not be processed.',
        customer: 'Some customer updates failed.'
      },
      validate: {
        product: 'Product validation failed. Please check all fields.',
        category: 'Category validation failed. Check the name.',
        stock: 'Stock validation failed. Quantity must be positive.',
        order: 'Order validation failed. Review order items.',
        customer: 'Customer validation failed. Check required fields.'
      }
    };

    return messages[operation]?.[entity] || 'An error occurred. Please try again.';
  }

  /**
   * Format bulk operation results
   */
  static formatBulkResults(results: {
    successful: any[];
    failed: Array<{ item: any; error: string }>;
    total: number;
  }): string {
    const successCount = results.successful.length;
    const failedCount = results.failed.length;
    
    let message = `Processed ${results.total} items:\n`;
    message += `✅ Successful: ${successCount}\n`;
    
    if (failedCount > 0) {
      message += `❌ Failed: ${failedCount}\n\n`;
      message += 'Failed items:\n';
      results.failed.slice(0, 5).forEach(failure => {
        message += `• ${failure.item.name || failure.item.id}: ${failure.error}\n`;
      });
      if (failedCount > 5) {
        message += `... and ${failedCount - 5} more`;
      }
    }
    
    return message;
  }

  /**
   * Get recovery suggestions based on error type
   */
  static getRecoverySuggestions(error: any, context: AdminErrorContext): string[] {
    const suggestions: string[] = [];
    
    // Network errors
    if (error.code === 'NETWORK_ERROR') {
      suggestions.push('Check your internet connection');
      suggestions.push('Try again in a few moments');
      suggestions.push('Contact support if the problem persists');
    }
    
    // Validation errors
    if (error.name === 'ZodError' || error.code === 'VALIDATION_ERROR') {
      suggestions.push('Review all required fields');
      suggestions.push('Check for invalid characters');
      suggestions.push('Ensure numeric fields contain valid numbers');
    }
    
    // Stock errors
    if (context.entity === 'stock') {
      suggestions.push('Verify current stock levels');
      suggestions.push('Check for pending stock updates');
      suggestions.push('Review stock history for recent changes');
    }
    
    // Permission errors
    if (error.code === 'PERMISSION_DENIED') {
      suggestions.push('Contact your administrator');
      suggestions.push('Verify your account permissions');
      suggestions.push('Try logging out and back in');
    }
    
    return suggestions;
  }
}

export default AdminErrorHandler;