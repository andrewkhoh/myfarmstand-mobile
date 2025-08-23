/**
 * Standardized Service Response Patterns
 * 
 * Provides consistent response types and utilities for service layer operations.
 * Designed for gradual adoption without breaking existing functionality.
 * 
 * Risk Level: VERY LOW - Only adds new patterns, doesn't change existing code
 */

// Core service result types
export type ServiceResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
};

// Extended result with metadata
export type ServiceResultWithMeta<T> = {
  success: true;
  data: T;
  meta?: {
    timestamp?: string;
    version?: string;
    cached?: boolean;
    source?: string;
  };
} | {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
  meta?: {
    timestamp?: string;
    context?: string;
    retryable?: boolean;
  };
};

// Pagination support
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export type PaginatedServiceResult<T> = {
  success: true;
  data: T[];
  pagination: PaginationMeta;
} | {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
};

// Common error codes for consistency
export const ServiceErrorCode = {
  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  SCHEMA_ERROR: 'SCHEMA_ERROR',
  
  // Authentication/Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Operation errors
  OPERATION_FAILED: 'OPERATION_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  
  // Business logic errors
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  ORDER_ALREADY_PROCESSED: 'ORDER_ALREADY_PROCESSED',
  
  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED'
} as const;

export type ServiceErrorCodeType = typeof ServiceErrorCode[keyof typeof ServiceErrorCode];

/**
 * Base service class providing consistent response handling
 * 
 * Usage:
 * class MyService extends BaseService {
 *   static async getData(): Promise<ServiceResult<MyData>> {
 *     return this.handleOperation(
 *       async () => {
 *         // Your existing business logic here
 *         return await fetchData();
 *       },
 *       'MyService.getData'
 *     );
 *   }
 * }
 */
export abstract class BaseService {
  /**
   * Wraps service operations with consistent error handling and response formatting
   */
  protected static async handleOperation<T>(
    operation: () => Promise<T>,
    context: string,
    options?: {
      timeout?: number;
      retryable?: boolean;
      includeMetadata?: boolean;
    }
  ): Promise<ServiceResult<T>> {
    const startTime = Date.now();
    
    try {
      // Execute the operation with optional timeout
      const result = options?.timeout 
        ? await Promise.race([
            operation(),
            this.createTimeoutPromise<T>(options.timeout, context)
          ])
        : await operation();
      
      // Return success result with optional metadata
      const response: ServiceResult<T> = { success: true, data: result };
      
      if (options?.includeMetadata) {
        (response as ServiceResultWithMeta<T>).meta = {
          timestamp: new Date().toISOString(),
          source: context
        };
      }
      
      return response;
    } catch (error) {
      // Log error for monitoring
      console.error(`${context} failed:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });
      
      // Convert error to standardized response
      return this.convertErrorToResponse(error, context, options);
    }
  }
  
  /**
   * Handles operations that return paginated results
   */
  protected static async handlePaginatedOperation<T>(
    operation: () => Promise<{ data: T[]; total: number }>,
    context: string,
    pagination: { page: number; limit: number }
  ): Promise<PaginatedServiceResult<T>> {
    try {
      const result = await operation();
      
      const totalPages = Math.ceil(result.total / pagination.limit);
      
      return {
        success: true,
        data: result.data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1
        }
      };
    } catch (error) {
      console.error(`${context} failed:`, error);
      return this.convertErrorToResponse(error, context) as PaginatedServiceResult<T>;
    }
  }
  
  /**
   * Converts various error types to standardized service responses
   */
  private static convertErrorToResponse(
    error: unknown, 
    context: string,
    options?: { retryable?: boolean }
  ): ServiceResult<never> {
    if (error instanceof Error) {
      // Map common error patterns to service error codes
      let code: ServiceErrorCodeType | undefined;
      
      if (error.message.includes('validation') || error.message.includes('Invalid')) {
        code = ServiceErrorCode.VALIDATION_FAILED;
      } else if (error.message.includes('not found') || error.message.includes('Not found')) {
        code = ServiceErrorCode.NOT_FOUND;
      } else if (error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
        code = ServiceErrorCode.UNAUTHORIZED;
      } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        code = ServiceErrorCode.TIMEOUT;
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        code = ServiceErrorCode.NETWORK_ERROR;
      } else {
        code = ServiceErrorCode.OPERATION_FAILED;
      }
      
      return {
        success: false,
        error: error.message,
        code,
        ...(options?.retryable !== undefined && {
          meta: { retryable: options.retryable, context }
        })
      };
    }
    
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: ServiceErrorCode.INTERNAL_ERROR
    };
  }
  
  /**
   * Creates a timeout promise for operation timeouts
   */
  private static createTimeoutPromise<T>(timeoutMs: number, context: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation ${context} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }
}

/**
 * Utility functions for working with service results
 */
export const ServiceResultUtils = {
  /**
   * Check if a service result is successful
   */
  isSuccess: <T>(result: ServiceResult<T>): result is { success: true; data: T } => {
    return result.success;
  },
  
  /**
   * Check if a service result is an error
   */
  isError: <T>(result: ServiceResult<T>): result is { success: false; error: string; code?: string; details?: unknown } => {
    return !result.success;
  },
  
  /**
   * Extract data from successful result or throw error
   */
  unwrap: <T>(result: ServiceResult<T>): T => {
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error);
  },
  
  /**
   * Extract data from successful result or return default value
   */
  unwrapOr: <T>(result: ServiceResult<T>, defaultValue: T): T => {
    return result.success ? result.data : defaultValue;
  },
  
  /**
   * Transform successful result data while preserving error state
   */
  map: <T, U>(result: ServiceResult<T>, transform: (data: T) => U): ServiceResult<U> => {
    if (result.success) {
      return { success: true, data: transform(result.data) };
    }
    return result;
  },
  
  /**
   * Chain operations on successful results
   */
  flatMap: <T, U>(result: ServiceResult<T>, operation: (data: T) => ServiceResult<U>): ServiceResult<U> => {
    if (result.success) {
      return operation(result.data);
    }
    return result;
  }
};

/**
 * Helper function to create success responses
 */
export const createSuccessResponse = <T>(data: T, meta?: any): ServiceResult<T> => ({
  success: true,
  data,
  ...(meta && { meta })
});

/**
 * Helper function to create error responses
 */
export const createErrorResponse = (
  error: string, 
  code?: ServiceErrorCodeType, 
  details?: unknown
): ServiceResult<never> => {
  const result: any = {
    success: false,
    error
  };
  if (code) result.code = code;
  if (details) result.details = details;
  return result;
};

/**
 * Legacy adapter to convert new ServiceResult to old response patterns
 * This allows gradual migration without breaking existing code
 */
export const LegacyAdapter = {
  /**
   * Convert ServiceResult to old success/message pattern
   */
  toSuccessMessage: <T>(result: ServiceResult<T>): { success: boolean; message?: string; data?: T } => {
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, message: result.error };
  },
  
  /**
   * Convert ServiceResult to throwing pattern (for compatibility)
   */
  toThrowingPattern: <T>(result: ServiceResult<T>): T => {
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error);
  },
  
  /**
   * Convert old success/message pattern to ServiceResult
   */
  fromSuccessMessage: <T>(response: { success: boolean; message?: string; data?: T }): ServiceResult<T> => {
    if (response.success && response.data !== undefined) {
      return { success: true, data: response.data };
    }
    return { 
      success: false, 
      error: response.message || 'Operation failed',
      code: ServiceErrorCode.OPERATION_FAILED
    };
  }
};