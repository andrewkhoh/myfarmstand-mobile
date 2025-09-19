import { ValidationMonitor } from '../../utils/validationMonitorAdapter';
import { queryClient } from '../../config/queryClient';
import { inventoryKeys, executiveAnalyticsKeys } from '../../utils/queryKeyFactory';

export interface WorkflowError {
  workflow: 'inventory' | 'marketing' | 'executive' | 'role';
  operation: string;
  errorType: 'validation' | 'permission' | 'network' | 'business' | 'system';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  code?: string;
  context?: any;
  timestamp: Date;
  stackTrace?: string;
  relatedWorkflows?: string[];
}

export interface ErrorRecoveryStrategy {
  type: 'retry' | 'fallback' | 'alert' | 'cascade' | 'rollback';
  action: () => Promise<void>;
  maxRetries?: number;
  fallbackValue?: any;
}

export interface WorkflowErrorHandler {
  workflow: string;
  handler: (error: WorkflowError) => Promise<ErrorRecoveryStrategy | void>;
  priority: number;
}

export class ErrorCoordinator {
  private errorHandlers: Map<string, WorkflowErrorHandler[]> = new Map();
  private errorHistory: WorkflowError[] = [];
  private maxHistorySize = 100;
  private cascadeHandlers: Map<string, ((error: WorkflowError) => void)[]> = new Map();

  constructor() {
    this.initializeDefaultHandlers();
  }

  /**
   * Initialize default error handlers for each workflow
   */
  private initializeDefaultHandlers() {
    // Inventory workflow error handlers
    this.registerErrorHandler('inventory', async (error) => {
      if (error.errorType === 'business' && error.code === 'OUT_OF_STOCK') {
        // Cascade to marketing workflow
        await this.cascadeError({
          ...error,
          relatedWorkflows: ['marketing'],
          message: 'Inventory shortage detected - pausing affected campaigns'
        });

        return {
          type: 'cascade',
          action: async () => {
            // Notify marketing service to pause campaigns
            await this.notifyWorkflow('marketing', {
              type: 'inventory_shortage',
              productIds: error.context?.productIds || []
            });
          }
        };
      }

      if (error.errorType === 'validation') {
        return {
          type: 'retry',
          maxRetries: 3,
          action: async () => {
            // Invalidate and refetch inventory data
            await queryClient.invalidateQueries({
              queryKey: inventoryKeys.all()
            });
          }
        };
      }
    }, 10);

    // Marketing workflow error handlers
    this.registerErrorHandler('marketing', async (error) => {
      if (error.errorType === 'business' && error.code === 'CAMPAIGN_CONFLICT') {
        return {
          type: 'alert',
          action: async () => {
            // Create alert for campaign conflict
            await this.createAlert({
              workflow: 'marketing',
              message: error.message,
              severity: 'high',
              context: error.context
            });

            // Invalidate campaign queries to refresh UI
            await queryClient.invalidateQueries({
              queryKey: campaignKeys.all()
            });
          }
        };
      }

      if (error.errorType === 'permission') {
        return {
          type: 'fallback',
          fallbackValue: { campaigns: [], error: 'Insufficient permissions' },
          action: async () => {
            // Clear marketing cache for user
            await queryClient.invalidateQueries({
              queryKey: campaignKeys.all()
            });
          }
        };
      }
    }, 10);

    // Executive workflow error handlers
    this.registerErrorHandler('executive', async (error) => {
      if (error.errorType === 'network' && error.severity === 'critical') {
        return {
          type: 'fallback',
          fallbackValue: this.getExecutiveFallbackData(),
          action: async () => {
            // Use cached data if available
            const cachedData = queryClient.getQueryData(
              executiveAnalyticsKeys.metrics()
            );
            if (cachedData) {
              return;
            }

            // Otherwise, use stale data with warning
            await this.createAlert({
              workflow: 'executive',
              message: 'Using stale data due to network issues',
              severity: 'medium',
              context: { timestamp: new Date() }
            });
          }
        };
      }

      if (error.errorType === 'system' && error.code === 'CALCULATION_ERROR') {
        // Record calculation errors for audit
        ValidationMonitor.recordCalculationMismatch({
          service: 'ExecutiveService',
          operation: error.operation,
          expected: error.context?.expected,
          actual: error.context?.actual,
          context: error.context
        });

        return {
          type: 'rollback',
          action: async () => {
            // Rollback to previous metric calculation
            await this.rollbackMetrics(error.context?.metricId);
          }
        };
      }
    }, 5);

    // Role workflow error handlers
    this.registerErrorHandler('role', async (error) => {
      if (error.errorType === 'permission' && error.severity === 'critical') {
        // Security-critical permission errors
        return {
          type: 'alert',
          action: async () => {
            // Log security event
            await this.logSecurityEvent({
              type: 'permission_violation',
              userId: error.context?.userId,
              resource: error.context?.resource,
              action: error.context?.action,
              timestamp: new Date()
            });

            // Cascade to all workflows to re-validate permissions
            await this.cascadeError({
              ...error,
              relatedWorkflows: ['inventory', 'marketing', 'executive'],
              message: 'Permission violation detected - re-validating access'
            });
          }
        };
      }
    }, 1);

    // Cross-workflow cascade handlers
    this.registerCascadeHandler('inventory-marketing', (error) => {
      if (error.workflow === 'inventory' && error.relatedWorkflows?.includes('marketing')) {
        // Pause marketing campaigns for affected products
        this.pauseAffectedCampaigns(error.context?.productIds || []);
      }
    });

    this.registerCascadeHandler('marketing-executive', (error) => {
      if (error.workflow === 'marketing' && error.relatedWorkflows?.includes('executive')) {
        // Refresh executive metrics due to marketing changes
        queryClient.invalidateQueries({
          queryKey: executiveAnalyticsKeys.crossRole()
        });
      }
    });
  }

  /**
   * Register an error handler for a workflow
   */
  registerErrorHandler(
    workflow: string,
    handler: (error: WorkflowError) => Promise<ErrorRecoveryStrategy | void>,
    priority: number = 10
  ) {
    const handlers = this.errorHandlers.get(workflow) || [];
    handlers.push({ workflow, handler, priority });
    handlers.sort((a, b) => a.priority - b.priority);
    this.errorHandlers.set(workflow, handlers);
  }

  /**
   * Handle a workflow error
   */
  async handleError(error: WorkflowError): Promise<ErrorRecoveryStrategy | void> {
    try {
      // Record error in history
      this.recordError(error);

      // Log error for monitoring
      ValidationMonitor.recordValidationError(`${error.workflow}-${error.operation}`, {
        message: error.message,
        code: error.code,
        context: error.context
      });

      // Get handlers for the workflow
      const handlers = this.errorHandlers.get(error.workflow) || [];

      // Try handlers in priority order
      for (const handler of handlers) {
        try {
          const strategy = await handler.handler(error);
          if (strategy) {
            // Execute recovery strategy
            await this.executeRecoveryStrategy(strategy, error);
            return strategy;
          }
        } catch (handlerError) {
          console.error(`Error handler failed for ${error.workflow}:`, handlerError);
        }
      }

      // If no handler succeeded, use default strategy
      return this.getDefaultStrategy(error);
    } catch (coordinatorError) {
      console.error('Error coordinator failed:', coordinatorError);
      return this.getFallbackStrategy();
    }
  }

  /**
   * Execute a recovery strategy
   */
  private async executeRecoveryStrategy(strategy: ErrorRecoveryStrategy, error: WorkflowError) {
    switch (strategy.type) {
      case 'retry':
        await this.executeRetry(strategy, error);
        break;

      case 'fallback':
        await strategy.action();
        break;

      case 'alert':
        await strategy.action();
        break;

      case 'cascade':
        await strategy.action();
        await this.triggerCascadeHandlers(error);
        break;

      case 'rollback':
        await strategy.action();
        break;
    }
  }

  /**
   * Execute retry strategy with exponential backoff
   */
  private async executeRetry(strategy: ErrorRecoveryStrategy, error: WorkflowError) {
    const maxRetries = strategy.maxRetries || 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        await strategy.action();
        return; // Success
      } catch (retryError) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new Error(`Max retries (${maxRetries}) exceeded for ${error.workflow}:${error.operation}`);
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Cascade error to related workflows
   */
  private async cascadeError(error: WorkflowError) {
    if (!error.relatedWorkflows || error.relatedWorkflows.length === 0) {
      return;
    }

    for (const workflow of error.relatedWorkflows) {
      const cascadedError: WorkflowError = {
        ...error,
        workflow: workflow as any,
        operation: `cascade-from-${error.workflow}`,
        timestamp: new Date()
      };

      // Handle cascaded error
      await this.handleError(cascadedError);
    }
  }

  /**
   * Register a cascade handler
   */
  registerCascadeHandler(name: string, handler: (error: WorkflowError) => void) {
    const handlers = this.cascadeHandlers.get(name) || [];
    handlers.push(handler);
    this.cascadeHandlers.set(name, handlers);
  }

  /**
   * Trigger cascade handlers
   */
  private async triggerCascadeHandlers(error: WorkflowError) {
    for (const [, handlers] of this.cascadeHandlers) {
      for (const handler of handlers) {
        try {
          handler(error);
        } catch (err) {
          console.error('Cascade handler failed:', err);
        }
      }
    }
  }

  /**
   * Create an alert
   */
  private async createAlert(alert: {
    workflow: string;
    message: string;
    severity: string;
    context?: any;
  }) {
    // Store alert in database or send to monitoring service
    console.warn(`[${alert.severity.toUpperCase()}] ${alert.workflow}: ${alert.message}`, alert.context);

    // Could integrate with external alerting service here
    ValidationMonitor.recordPatternSuccess(`alert-created-${alert.workflow}`);
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(event: any) {
    // Log to security audit trail
    console.error('[SECURITY]', event);

    // Could integrate with security monitoring service here
    ValidationMonitor.recordValidationError('security-event', event);
  }

  /**
   * Pause affected marketing campaigns
   */
  private async pauseAffectedCampaigns(productIds: string[]) {
    // This would integrate with the marketing service
    console.log('Pausing campaigns for products:', productIds);

    // Invalidate campaign queries to refresh UI
    await queryClient.invalidateQueries({
      queryKey: campaignKeys.all()
    });
  }

  /**
   * Rollback metrics calculation
   */
  private async rollbackMetrics(metricId?: string) {
    if (metricId) {
      // Restore previous metric calculation
      console.log('Rolling back metrics for:', metricId);

      // Invalidate metric queries
      await queryClient.invalidateQueries({
        queryKey: executiveAnalyticsKeys.metrics()
      });
    }
  }

  /**
   * Notify a workflow about an event
   */
  private async notifyWorkflow(workflow: string, notification: any) {
    console.log(`Notifying ${workflow}:`, notification);
    // Could use event emitter or message queue here
  }

  /**
   * Get fallback data for executive dashboard
   */
  private getExecutiveFallbackData() {
    return {
      metrics: {
        revenue: 0,
        inventory: 0,
        campaigns: 0,
        users: 0
      },
      isStale: true,
      error: 'Using fallback data'
    };
  }

  /**
   * Get default recovery strategy
   */
  private getDefaultStrategy(error: WorkflowError): ErrorRecoveryStrategy {
    if (error.severity === 'critical') {
      return {
        type: 'alert',
        action: async () => {
          await this.createAlert({
            workflow: error.workflow,
            message: `Unhandled critical error: ${error.message}`,
            severity: 'critical',
            context: error
          });
        }
      };
    }

    return {
      type: 'retry',
      maxRetries: 2,
      action: async () => {
        console.log('Retrying after error:', error);
      }
    };
  }

  /**
   * Get fallback strategy when coordinator fails
   */
  private getFallbackStrategy(): ErrorRecoveryStrategy {
    return {
      type: 'fallback',
      fallbackValue: null,
      action: async () => {
        console.error('Error coordinator failed - using fallback');
      }
    };
  }

  /**
   * Record error in history
   */
  private recordError(error: WorkflowError) {
    this.errorHistory.push(error);

    // Trim history if too large
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get error history
   */
  getErrorHistory(workflow?: string): WorkflowError[] {
    if (workflow) {
      return this.errorHistory.filter(e => e.workflow === workflow);
    }
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = [];
  }

  /**
   * Get error statistics
   */
  getErrorStatistics() {
    const stats: any = {
      total: this.errorHistory.length,
      byWorkflow: {},
      byType: {},
      bySeverity: {}
    };

    for (const error of this.errorHistory) {
      // By workflow
      stats.byWorkflow[error.workflow] = (stats.byWorkflow[error.workflow] || 0) + 1;

      // By type
      stats.byType[error.errorType] = (stats.byType[error.errorType] || 0) + 1;

      // By severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    }

    return stats;
  }
}

// Export singleton instance
export const errorCoordinator = new ErrorCoordinator();