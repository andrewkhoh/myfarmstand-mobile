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
   * Adapts error recording to production API
   * Handles both:
   * - Gold standard: recordValidationError(context: string, error: any)
   * - Modern: recordValidationError(details: object)
   * Production expects: recordValidationError(details: ValidationErrorDetails)
   */
  static recordValidationError(contextOrDetails: string | any, error?: any): void {
    let details: ValidationErrorDetails;

    // If first parameter is an object, it's the new format
    if (typeof contextOrDetails === 'object' && contextOrDetails !== null) {
      details = {
        context: contextOrDetails.context || 'unknown',
        errorMessage: contextOrDetails.errorMessage || 'Unknown error',
        errorCode: contextOrDetails.errorCode || 'UNKNOWN_ERROR',
        validationPattern: contextOrDetails.validationPattern || 'transformation_schema'
      };
    } else {
      // Old format: (context: string, error: any)
      details = {
        context: contextOrDetails,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: error?.code || 'UNKNOWN_ERROR',
        validationPattern: 'transformation_schema'
      };
    }

    ProductionMonitor.recordValidationError(details);
  }
  
  /**
   * Adapts success recording to production API
   * Handles both:
   * - Gold standard: recordPatternSuccess(pattern: string)
   * - Modern: recordPatternSuccess(details: object)
   * Production expects: recordPatternSuccess(details: { ... })
   */
  static recordPatternSuccess(patternOrDetails: string | any): void {
    // If it's already an object, pass it through
    if (typeof patternOrDetails === 'object' && patternOrDetails !== null) {
      ProductionMonitor.recordPatternSuccess(patternOrDetails);
      return;
    }

    // If it's a string, parse it to create the expected object format
    const pattern = String(patternOrDetails);
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