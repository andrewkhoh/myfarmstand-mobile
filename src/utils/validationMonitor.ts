/**
 * Production Validation Monitoring Utility
 * 
 * Provides centralized logging and monitoring for validation errors,
 * calculation mismatches, and data quality issues in production.
 * 
 * Risk Level: VERY LOW - Only adds logging, no behavioral changes
 */

export interface ValidationMetrics {
  validationErrors: number;
  calculationMismatches: number;
  dataQualityIssues: number;
  lastUpdated: string;
}

export interface CalculationMismatchDetails {
  type: 'cart_total' | 'order_subtotal' | 'order_total' | 'item_subtotal';
  expected: number;
  actual: number;
  difference: number;
  tolerance: number;
  itemId?: string;
  orderId?: string;
  cartId?: string;
}

export interface ValidationErrorDetails {
  context: string;
  errorMessage: string;
  errorCode?: string;
  fieldPath?: string;
  receivedValue?: unknown;
  expectedType?: string;
  validationPattern?: 'direct_schema' | 'simple_validation' | 'transformation_schema' | 'direct_supabase_query' | 'statistical_calculation' | 'database_schema' | 'atomic_operation' | 'resilient_processing' | 'generate_business_insights' | 'get_insights_by_impact' | 'correlate_business_data' | 'update_insight_status' | 'get_insight_recommendations' | 'detect_anomalies' | 'get_metrics_by_category' | 'generate_correlation_analysis' | 'update_metric_values' | 'batch_process_metrics';
}

export interface DataQualityIssueDetails {
  type: 'missing_field' | 'invalid_format' | 'inconsistent_data' | 'stale_data';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedEntity: string;
  entityId?: string;
}

export class ValidationMonitor {
  private static metrics: ValidationMetrics = {
    validationErrors: 0,
    calculationMismatches: 0,
    dataQualityIssues: 0,
    lastUpdated: new Date().toISOString()
  };

  private static readonly LOG_PREFIX = '[VALIDATION_MONITOR]';

  /**
   * Record calculation mismatches (e.g., cart totals, order subtotals)
   * These are auto-corrected but logged for monitoring
   */
  static recordCalculationMismatch(details: CalculationMismatchDetails): void {
    this.metrics.calculationMismatches++;
    this.updateTimestamp();

    const logData = {
      timestamp: new Date().toISOString(),
      type: 'CALCULATION_MISMATCH',
      details: {
        ...details,
        corrected: true, // Indicates we auto-corrected the value
        withinTolerance: details.difference <= details.tolerance
      }
    };

    // Use appropriate log level based on severity
    if (details.difference > details.tolerance * 10) {
      console.error(`${this.LOG_PREFIX} CRITICAL calculation mismatch detected`, logData);
    } else if (details.difference > details.tolerance * 2) {
      console.warn(`${this.LOG_PREFIX} Significant calculation mismatch`, logData);
    } else {
      console.info(`${this.LOG_PREFIX} Minor calculation correction applied`, logData);
    }

    // Future: Could send to external monitoring service
    // this.sendToMonitoringService('calculation_mismatch', logData);
  }

  /**
   * Record validation errors (e.g., ZOD schema validation failures)
   * These indicate data quality issues that need attention
   */
  static recordValidationError(details: ValidationErrorDetails): void {
    this.metrics.validationErrors++;
    this.updateTimestamp();

    const logData = {
      timestamp: new Date().toISOString(),
      type: 'VALIDATION_ERROR',
      details: {
        ...details,
        impact: 'data_rejected' // Indicates invalid data was rejected
      }
    };

    console.error(`${this.LOG_PREFIX} Validation error in ${details.context}`, logData);

    // Future: Could trigger alerts for critical validation failures
    // if (this.metrics.validationErrors > CRITICAL_THRESHOLD) {
    //   this.sendAlert('HIGH_VALIDATION_ERROR_RATE', this.metrics);
    // }
  }

  /**
   * Record general data quality issues
   * These are broader issues that might not cause immediate failures
   */
  static recordDataQualityIssue(details: DataQualityIssueDetails): void {
    this.metrics.dataQualityIssues++;
    this.updateTimestamp();

    const logData = {
      timestamp: new Date().toISOString(),
      type: 'DATA_QUALITY_ISSUE',
      details
    };

    // Log at appropriate level based on severity
    switch (details.severity) {
      case 'critical':
        console.error(`${this.LOG_PREFIX} CRITICAL data quality issue`, logData);
        break;
      case 'high':
        console.error(`${this.LOG_PREFIX} High-priority data quality issue`, logData);
        break;
      case 'medium':
        console.warn(`${this.LOG_PREFIX} Data quality issue detected`, logData);
        break;
      case 'low':
        console.info(`${this.LOG_PREFIX} Minor data quality issue`, logData);
        break;
    }
  }

  /**
   * Record validation pattern compliance issues
   * Helps monitor adherence to established validation patterns (Phase 3 enhancement)
   */
  static recordPatternComplianceIssue(details: {
    service: string;
    pattern: 'cartService' | 'direct_supabase' | 'simple_validation' | 'transformation_schema' | 'direct_supabase_query' | 'statistical_calculation' | 'database_schema' | 'atomic_operation' | 'resilient_processing' | 'generate_business_insights' | 'get_insights_by_impact' | 'correlate_business_data' | 'update_insight_status' | 'get_insight_recommendations' | 'detect_anomalies' | 'get_metrics_by_category' | 'generate_correlation_analysis' | 'update_metric_values' | 'batch_process_metrics';
    issue: string;
    severity: 'info' | 'warning' | 'error';
    recommendation?: string;
  }): void {
    this.metrics.dataQualityIssues++;
    this.updateTimestamp();

    const logData = {
      timestamp: new Date().toISOString(),
      type: 'PATTERN_COMPLIANCE_ISSUE',
      details: {
        ...details,
        category: 'validation_pattern_adherence'
      }
    };

    switch (details.severity) {
      case 'error':
        console.error(`${this.LOG_PREFIX} Pattern compliance error in ${details.service}`, logData);
        break;
      case 'warning':
        console.warn(`${this.LOG_PREFIX} Pattern compliance warning in ${details.service}`, logData);
        break;
      case 'info':
        console.info(`${this.LOG_PREFIX} Pattern compliance info for ${details.service}`, logData);
        break;
    }
  }

  /**
   * Record successful pattern usage (positive monitoring)
   * Helps track adoption of best practices
   */
  static recordPatternSuccess(details: {
    service?: string;
    pattern: 'direct_schema_validation' | 'transformation_schema' | 'simple_input_validation' | 'direct_supabase_query' | 'statistical_calculation' | 'database_schema' | 'atomic_operation' | 'resilient_processing' | 'generate_business_insights' | 'get_insights_by_impact' | 'correlate_business_data' | 'update_insight_status' | 'get_insight_recommendations' | 'detect_anomalies' | 'get_metrics_by_category' | 'generate_correlation_analysis' | 'update_metric_values' | 'batch_process_metrics' | 'generate_strategic_report' | 'schedule_strategic_report' | 'get_report_data' | 'export_report_data' | 'update_report_config' | 'generate_predictive_forecast' | 'validate_model_accuracy' | 'update_forecast_data' | 'get_forecast_by_type' | 'calculate_confidence_intervals';
    operation?: string;
    context?: string;
    description?: string;
    performanceMs?: number;
  }): void {
    // Don't increment error counters for success events
    this.updateTimestamp();

    const logData = {
      timestamp: new Date().toISOString(),
      type: 'PATTERN_SUCCESS',
      details: {
        ...details,
        category: 'validation_pattern_success'
      }
    };

    // Handle both old context format and new service.operation format
    const operationDescription = details.context || `${details.service}.${details.operation}`;
    console.info(`${this.LOG_PREFIX} Successful pattern usage in ${operationDescription}`, logData);
  }

  /**
   * Record general validation event (for validation pipelines)
   * Generic method for recording validation attempts
   */
  static recordValidation(details: {
    isValid: boolean;
    context?: string;
    message?: string;
    validationType?: string;
  }): void {
    this.updateTimestamp();

    const logData = {
      timestamp: new Date().toISOString(),
      type: 'VALIDATION_EVENT',
      isValid: details.isValid,
      context: details.context,
      message: details.message,
      validationType: details.validationType
    };

    if (details.isValid) {
      console.debug(`${this.LOG_PREFIX} Validation successful: ${details.context}`, logData);
    } else {
      this.metrics.validationErrors++;
      console.warn(`${this.LOG_PREFIX} Validation failed: ${details.context}`, logData);
    }
  }

  /**
   * Get current validation metrics
   * Useful for health checks and monitoring dashboards
   */
  static getMetrics(): ValidationMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  static resetMetrics(): void {
    this.metrics = {
      validationErrors: 0,
      calculationMismatches: 0,
      dataQualityIssues: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get health status based on current metrics
   */
  static getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    metrics: ValidationMetrics;
  } {
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Define thresholds (these could be configurable)
    const WARNING_THRESHOLDS = {
      validationErrors: 10,
      calculationMismatches: 20,
      dataQualityIssues: 15
    };

    const CRITICAL_THRESHOLDS = {
      validationErrors: 25,
      calculationMismatches: 50,
      dataQualityIssues: 30
    };

    // Check for critical issues
    if (this.metrics.validationErrors >= CRITICAL_THRESHOLDS.validationErrors) {
      status = 'critical';
      issues.push(`Critical validation error rate: ${this.metrics.validationErrors}`);
    }
    if (this.metrics.calculationMismatches >= CRITICAL_THRESHOLDS.calculationMismatches) {
      status = 'critical';
      issues.push(`Critical calculation mismatch rate: ${this.metrics.calculationMismatches}`);
    }
    if (this.metrics.dataQualityIssues >= CRITICAL_THRESHOLDS.dataQualityIssues) {
      status = 'critical';
      issues.push(`Critical data quality issue rate: ${this.metrics.dataQualityIssues}`);
    }

    // Check for warning issues (only if not already critical)
    if (status === 'healthy') {
      if (this.metrics.validationErrors >= WARNING_THRESHOLDS.validationErrors) {
        status = 'warning';
        issues.push(`Elevated validation errors: ${this.metrics.validationErrors}`);
      }
      if (this.metrics.calculationMismatches >= WARNING_THRESHOLDS.calculationMismatches) {
        status = 'warning';
        issues.push(`Elevated calculation mismatches: ${this.metrics.calculationMismatches}`);
      }
      if (this.metrics.dataQualityIssues >= WARNING_THRESHOLDS.dataQualityIssues) {
        status = 'warning';
        issues.push(`Elevated data quality issues: ${this.metrics.dataQualityIssues}`);
      }
    }

    return {
      status,
      issues,
      metrics: this.getMetrics()
    };
  }

  private static updateTimestamp(): void {
    this.metrics.lastUpdated = new Date().toISOString();
  }

  // Future: Methods for external integrations
  /*
  private static async sendToMonitoringService(eventType: string, data: any): Promise<void> {
    // Integration with monitoring services like DataDog, New Relic, etc.
    // await monitoringService.send(eventType, data);
  }

  private static async sendAlert(alertType: string, data: any): Promise<void> {
    // Integration with alerting services like PagerDuty, Slack, etc.
    // await alertingService.send(alertType, data);
  }
  */
}