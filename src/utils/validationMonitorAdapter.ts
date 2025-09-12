/**
 * ValidationMonitor Adapter for Gold Standard Services
 * 
 * This adapter bridges the gap between the gold standard TDD services
 * (which expect a simple API) and our production ValidationMonitor
 * (which has a more complex API).
 * 
 * This prevents breaking changes to the shared ValidationMonitor
 * while allowing the gold standard services to work unchanged.
 */

import { ValidationMonitor as ProductionMonitor, ValidationErrorDetails } from './validationMonitor';

export class ValidationMonitor {
  /**
   * Adapts gold standard error recording to production API
   * Gold standard expects: recordValidationError(context: string, error: any)
   * Production expects: recordValidationError(details: ValidationErrorDetails)
   */
  static recordValidationError(context: string, error: any): void {
    const details: ValidationErrorDetails = {
      context,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCode: error?.code || 'UNKNOWN_ERROR',
      validationPattern: 'transformation_schema'
    };
    
    ProductionMonitor.recordValidationError(details);
  }
  
  /**
   * Adapts gold standard success recording to production API
   * Gold standard expects: recordPatternSuccess(pattern: string)
   * Production expects: recordPatternSuccess(details: { ... })
   */
  static recordPatternSuccess(pattern: string): void {
    // Parse the pattern to extract service and operation if possible
    // Pattern might be like 'inventory-fetch' or just a simple string
    const parts = pattern.split('-');
    
    ProductionMonitor.recordPatternSuccess({
      service: parts[0] || 'inventory',
      pattern: 'transformation_schema',
      operation: parts[1] || pattern,
      context: `Gold standard service: ${pattern}`
    });
  }
  
  // Pass through other methods that might be needed
  static recordCalculationMismatch(data: any) {
    if (ProductionMonitor.recordCalculationMismatch) {
      return ProductionMonitor.recordCalculationMismatch(data);
    }
  }
  
  static recordDataQualityIssue(data: any) {
    if (ProductionMonitor.recordDataQualityIssue) {
      return ProductionMonitor.recordDataQualityIssue(data);
    }
  }
  
  static getMetrics() {
    if (ProductionMonitor.getMetrics) {
      return ProductionMonitor.getMetrics();
    }
    return {};
  }
  
  static reset() {
    // No reset method in production monitor, just return
    return;
  }
}