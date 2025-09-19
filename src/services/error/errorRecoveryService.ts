import { supabase } from '../../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ErrorContext {
  userId?: string;
  screen?: string;
  action?: string;
  feature?: string;
  timestamp: Date;
  sessionId: string;
  deviceInfo?: {
    platform: string;
    version: string;
    model?: string;
  };
}

export interface AppError {
  id: string;
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'authentication' | 'permission' | 'data' | 'ui' | 'system';
  context: ErrorContext;
  stack?: string;
  recoverable: boolean;
  retryCount: number;
  maxRetries: number;
}

export interface RecoveryStrategy {
  name: string;
  description: string;
  execute: (error: AppError) => Promise<boolean>;
  applicable: (error: AppError) => boolean;
  priority: number;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  recoverySuccessRate: number;
  avgRecoveryTime: number;
  topErrors: Array<{ code: string; count: number; message: string }>;
}

class ErrorRecoveryService {
  private errors: Map<string, AppError> = new Map();
  private recoveryStrategies: RecoveryStrategy[] = [];
  private sessionId: string;
  private isOnline: boolean = true;
  private retryQueue: Array<{ error: AppError; strategy: RecoveryStrategy }> = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeRecoveryStrategies();
    this.startPeriodicCleanup();
  }

  // Initialize built-in recovery strategies
  private initializeRecoveryStrategies() {
    this.recoveryStrategies = [
      {
        name: 'network_retry',
        description: 'Retry network requests with exponential backoff',
        execute: this.networkRetryStrategy.bind(this),
        applicable: (error) => error.category === 'network' && error.retryCount < error.maxRetries,
        priority: 1
      },
      {
        name: 'auth_refresh',
        description: 'Refresh authentication tokens',
        execute: this.authRefreshStrategy.bind(this),
        applicable: (error) => error.category === 'authentication' && error.code === 'TOKEN_EXPIRED',
        priority: 2
      },
      {
        name: 'cache_recovery',
        description: 'Recover from cache or offline storage',
        execute: this.cacheRecoveryStrategy.bind(this),
        applicable: (error) => error.category === 'network' && this.hasCachedData(error),
        priority: 3
      },
      {
        name: 'graceful_degradation',
        description: 'Provide limited functionality when features fail',
        execute: this.gracefulDegradationStrategy.bind(this),
        applicable: (error) => error.category === 'data' || error.category === 'permission',
        priority: 4
      },
      {
        name: 'user_fallback',
        description: 'Provide alternative user actions',
        execute: this.userFallbackStrategy.bind(this),
        applicable: (error) => error.severity !== 'critical' && error.recoverable,
        priority: 5
      }
    ];
  }

  // Main error handling entry point
  async handleError(error: Error | AppError, context: Partial<ErrorContext> = {}): Promise<AppError> {
    const appError = this.normalizeError(error, context);

    // Store error for analysis
    this.errors.set(appError.id, appError);

    // Log error for monitoring
    await this.logError(appError);

    // Attempt recovery
    const recovered = await this.attemptRecovery(appError);

    if (!recovered && appError.severity === 'critical') {
      await this.handleCriticalError(appError);
    }

    return appError;
  }

  // Normalize different error types into AppError format
  private normalizeError(error: Error | AppError, context: Partial<ErrorContext>): AppError {
    if (this.isAppError(error)) {
      return {
        ...error,
        context: { ...error.context, ...context }
      };
    }

    // Convert regular Error to AppError
    const errorCode = this.categorizeError(error);
    const severity = this.determineSeverity(error, errorCode.category);

    return {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      code: errorCode.code,
      message: error.message,
      userMessage: this.generateUserMessage(error, errorCode.category),
      severity,
      category: errorCode.category,
      context: {
        timestamp: new Date(),
        sessionId: this.sessionId,
        ...context
      },
      stack: error.stack,
      recoverable: this.isRecoverable(error, errorCode.category, severity),
      retryCount: 0,
      maxRetries: this.getMaxRetries(errorCode.category, severity)
    };
  }

  // Attempt to recover from error using available strategies
  private async attemptRecovery(error: AppError): Promise<boolean> {
    const applicableStrategies = this.recoveryStrategies
      .filter(strategy => strategy.applicable(error))
      .sort((a, b) => a.priority - b.priority);

    for (const strategy of applicableStrategies) {
      try {
        console.log(`Attempting recovery strategy: ${strategy.name}`);
        const recovered = await strategy.execute(error);

        if (recovered) {
          console.log(`Recovery successful with strategy: ${strategy.name}`);
          await this.recordRecoverySuccess(error, strategy);
          return true;
        }
      } catch (recoveryError) {
        console.error(`Recovery strategy ${strategy.name} failed:`, recoveryError);
        await this.recordRecoveryFailure(error, strategy, recoveryError);
      }
    }

    // If all strategies failed, add to retry queue if appropriate
    if (error.retryCount < error.maxRetries) {
      this.addToRetryQueue(error);
    }

    return false;
  }

  // Recovery strategy implementations
  private async networkRetryStrategy(error: AppError): Promise<boolean> {
    if (!this.isOnline) {
      return false;
    }

    const delay = Math.min(1000 * Math.pow(2, error.retryCount), 30000); // Exponential backoff, max 30s

    await new Promise(resolve => setTimeout(resolve, delay));

    // Update retry count
    error.retryCount += 1;
    this.errors.set(error.id, error);

    // Attempt to re-execute the original operation
    // This would need to be implemented based on the specific operation
    return true; // Simplified for example
  }

  private async authRefreshStrategy(error: AppError): Promise<boolean> {
    try {
      const { data, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return false;
      }

      console.log('Authentication tokens refreshed successfully');
      return true;
    } catch (refreshError) {
      console.error('Auth refresh strategy failed:', refreshError);
      return false;
    }
  }

  private async cacheRecoveryStrategy(error: AppError): Promise<boolean> {
    try {
      const cacheKey = this.generateCacheKey(error);
      const cachedData = await AsyncStorage.getItem(cacheKey);

      if (cachedData) {
        console.log('Recovered data from cache');
        // Emit cached data to relevant listeners
        this.emitCachedData(error, JSON.parse(cachedData));
        return true;
      }

      return false;
    } catch (cacheError) {
      console.error('Cache recovery failed:', cacheError);
      return false;
    }
  }

  private async gracefulDegradationStrategy(error: AppError): Promise<boolean> {
    // Provide limited functionality based on error type
    switch (error.category) {
      case 'permission':
        // Redirect to read-only mode or public data
        this.enableReadOnlyMode(error);
        return true;

      case 'data':
        // Show placeholder data or offline state
        this.showOfflineState(error);
        return true;

      default:
        return false;
    }
  }

  private async userFallbackStrategy(error: AppError): Promise<boolean> {
    // Provide user with alternative actions
    this.showUserFallbackOptions(error);
    return true;
  }

  // Critical error handling
  private async handleCriticalError(error: AppError): Promise<void> {
    console.error('Critical error detected:', error);

    // Save app state
    await this.saveAppState();

    // Notify monitoring services
    await this.notifyMonitoring(error);

    // Show critical error UI
    this.showCriticalErrorUI(error);
  }

  // Error metrics and monitoring
  async getErrorMetrics(timeframe: { start: Date; end: Date }): Promise<ErrorMetrics> {
    const relevantErrors = Array.from(this.errors.values())
      .filter(error =>
        error.context.timestamp >= timeframe.start &&
        error.context.timestamp <= timeframe.end
      );

    const totalErrors = relevantErrors.length;
    const errorsByCategory = this.groupBy(relevantErrors, 'category');
    const errorsBySeverity = this.groupBy(relevantErrors, 'severity');

    // Calculate recovery success rate
    const recoveredErrors = relevantErrors.filter(error =>
      error.retryCount > 0 && error.retryCount <= error.maxRetries
    );
    const recoverySuccessRate = totalErrors > 0 ? recoveredErrors.length / totalErrors : 1;

    // Top errors by frequency
    const errorCounts = new Map<string, { count: number; message: string }>();
    relevantErrors.forEach(error => {
      const existing = errorCounts.get(error.code) || { count: 0, message: error.message };
      errorCounts.set(error.code, {
        count: existing.count + 1,
        message: error.message
      });
    });

    const topErrors = Array.from(errorCounts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([code, data]) => ({ code, count: data.count, message: data.message }));

    return {
      totalErrors,
      errorsByCategory,
      errorsBySeverity,
      recoverySuccessRate,
      avgRecoveryTime: 0, // Would need to track timing data
      topErrors
    };
  }

  // Helper methods
  private isAppError(error: any): error is AppError {
    return error && typeof error === 'object' && 'id' in error && 'severity' in error;
  }

  private categorizeError(error: Error): { code: string; category: AppError['category'] } {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return { code: 'NETWORK_ERROR', category: 'network' };
    }

    if (message.includes('unauthorized') || message.includes('token') || message.includes('auth')) {
      return { code: 'AUTH_ERROR', category: 'authentication' };
    }

    if (message.includes('permission') || message.includes('forbidden')) {
      return { code: 'PERMISSION_ERROR', category: 'permission' };
    }

    if (message.includes('data') || message.includes('parse') || message.includes('validation')) {
      return { code: 'DATA_ERROR', category: 'data' };
    }

    if (message.includes('render') || message.includes('component')) {
      return { code: 'UI_ERROR', category: 'ui' };
    }

    return { code: 'SYSTEM_ERROR', category: 'system' };
  }

  private determineSeverity(error: Error, category: AppError['category']): AppError['severity'] {
    if (category === 'authentication' || category === 'system') {
      return 'high';
    }

    if (category === 'network' || category === 'data') {
      return 'medium';
    }

    return 'low';
  }

  private generateUserMessage(error: Error, category: AppError['category']): string {
    switch (category) {
      case 'network':
        return 'Connection issue detected. Please check your internet connection and try again.';
      case 'authentication':
        return 'Authentication required. Please sign in again.';
      case 'permission':
        return 'You don\'t have permission to perform this action.';
      case 'data':
        return 'Data loading failed. Please try refreshing the page.';
      case 'ui':
        return 'Display issue encountered. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again or contact support.';
    }
  }

  private isRecoverable(error: Error, category: AppError['category'], severity: AppError['severity']): boolean {
    return severity !== 'critical' && ['network', 'authentication', 'data'].includes(category);
  }

  private getMaxRetries(category: AppError['category'], severity: AppError['severity']): number {
    if (severity === 'critical') return 0;
    if (category === 'network') return 3;
    if (category === 'authentication') return 2;
    return 1;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async logError(error: AppError): Promise<void> {
    try {
      await supabase
        .from('error_logs')
        .insert({
          id: error.id,
          code: error.code,
          message: error.message,
          severity: error.severity,
          category: error.category,
          context: error.context,
          stack: error.stack,
          recoverable: error.recoverable,
          session_id: this.sessionId
        });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  private hasCachedData(error: AppError): boolean {
    // Implementation would check if relevant cached data exists
    return false;
  }

  private generateCacheKey(error: AppError): string {
    return `cache-${error.context.feature}-${error.context.screen}-${error.context.action}`;
  }

  private emitCachedData(error: AppError, data: any): void {
    // Implementation would emit cached data to relevant components
  }

  private enableReadOnlyMode(error: AppError): void {
    // Implementation would enable read-only mode for the affected feature
  }

  private showOfflineState(error: AppError): void {
    // Implementation would show offline state UI
  }

  private showUserFallbackOptions(error: AppError): void {
    // Implementation would show alternative actions to user
  }

  private async saveAppState(): Promise<void> {
    // Implementation would save current app state for recovery
  }

  private async notifyMonitoring(error: AppError): Promise<void> {
    // Implementation would notify external monitoring services
  }

  private showCriticalErrorUI(error: AppError): void {
    // Implementation would show critical error recovery UI
  }

  private addToRetryQueue(error: AppError): void {
    // Add error to retry queue for later processing
    const strategy = this.recoveryStrategies.find(s => s.applicable(error));
    if (strategy) {
      this.retryQueue.push({ error, strategy });
    }
  }

  private async recordRecoverySuccess(error: AppError, strategy: RecoveryStrategy): Promise<void> {
    // Record successful recovery for metrics
  }

  private async recordRecoveryFailure(error: AppError, strategy: RecoveryStrategy, recoveryError: any): Promise<void> {
    // Record failed recovery for metrics
  }

  private groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, number> {
    return array.reduce((result, item) => {
      const group = String(item[key]);
      result[group] = (result[group] || 0) + 1;
      return result;
    }, {} as Record<string, number>);
  }

  private startPeriodicCleanup(): void {
    // Clean up old errors every hour
    setInterval(() => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      for (const [id, error] of this.errors.entries()) {
        if (error.context.timestamp < cutoff) {
          this.errors.delete(id);
        }
      }
    }, 60 * 60 * 1000); // Every hour
  }
}

export const errorRecoveryService = new ErrorRecoveryService();