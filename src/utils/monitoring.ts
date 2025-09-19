/**
 * Monitoring and validation utilities for architectural compliance
 */

interface ValidationError {
  context: string;
  errorMessage: string;
  errorCode: string;
  timestamp?: Date;
}

interface PatternSuccess {
  service: string;
  pattern: string;
  operation: string;
  performanceMs?: number;
  timestamp?: Date;
}

class ValidationMonitorClass {
  private errors: ValidationError[] = [];
  private successes: PatternSuccess[] = [];

  /**
   * Record a validation error for monitoring
   */
  recordValidationError(error: ValidationError): void {
    this.errors.push({
      ...error,
      timestamp: new Date(),
    });

    // In production, this would send to monitoring service
    if (__DEV__) {
      console.warn('[ValidationMonitor]', error);
    }
  }

  /**
   * Record a successful pattern application
   */
  recordPatternSuccess(success: PatternSuccess): void {
    this.successes.push({
      ...success,
      timestamp: new Date(),
    });

    // In production, this would send to monitoring service
    if (__DEV__) {
      console.log('[ValidationMonitor]', success);
    }
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(limit = 10): ValidationError[] {
    return this.errors.slice(-limit);
  }

  /**
   * Get recent successes for debugging
   */
  getRecentSuccesses(limit = 10): PatternSuccess[] {
    return this.successes.slice(-limit);
  }

  /**
   * Clear all recorded data
   */
  clear(): void {
    this.errors = [];
    this.successes = [];
  }
}

// Export singleton instance
export const ValidationMonitor = new ValidationMonitorClass();