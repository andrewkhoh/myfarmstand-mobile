/**
 * Validation Monitoring Enhancements Test (Phase 3)
 * Verifies the enhanced ValidationMonitor capabilities for tracking
 * validation patterns and compliance across services.
 */

import { describe, it, beforeEach } from '@jest/globals';
import { ValidationMonitor } from '../validationMonitor';

describe('Validation Monitoring Enhancements (Phase 3)', () => {
  beforeEach(() => {
    // Reset metrics before each test
    ValidationMonitor.resetMetrics();
  });

  describe('Enhanced ValidationErrorDetails', () => {
    it('should support new validationPattern field', () => {
      ValidationMonitor.recordValidationError({
        context: 'TestService.testMethod',
        errorMessage: 'Test validation error',
        errorCode: 'TEST_VALIDATION_FAILED',
        validationPattern: 'transformation_schema'
      });

      const metrics = ValidationMonitor.getMetrics();
      expect(metrics.validationErrors).toBe(1);
    });

    it('should work with different validation patterns', () => {
      const patterns: Array<'direct_schema' | 'simple_validation' | 'transformation_schema'> = [
        'direct_schema',
        'simple_validation', 
        'transformation_schema'
      ];

      patterns.forEach((pattern, index) => {
        ValidationMonitor.recordValidationError({
          context: `TestService.testMethod${index}`,
          errorMessage: `Test error for ${pattern}`,
          errorCode: 'TEST_ERROR',
          validationPattern: pattern
        });
      });

      const metrics = ValidationMonitor.getMetrics();
      expect(metrics.validationErrors).toBe(3);
    });
  });

  describe('Pattern Compliance Monitoring', () => {
    it('should record pattern compliance issues', () => {
      ValidationMonitor.recordPatternComplianceIssue({
        service: 'TestService',
        pattern: 'cartService',
        issue: 'Using DatabaseHelpers instead of direct Supabase',
        severity: 'warning',
        recommendation: 'Switch to direct Supabase queries'
      });

      const metrics = ValidationMonitor.getMetrics();
      expect(metrics.dataQualityIssues).toBe(1);
    });

    it('should support different severity levels for compliance issues', () => {
      const severityLevels: Array<'info' | 'warning' | 'error'> = ['info', 'warning', 'error'];

      severityLevels.forEach((severity, index) => {
        ValidationMonitor.recordPatternComplianceIssue({
          service: `TestService${index}`,
          pattern: 'direct_supabase',
          issue: `Test compliance issue with ${severity} severity`,
          severity
        });
      });

      const metrics = ValidationMonitor.getMetrics();
      expect(metrics.dataQualityIssues).toBe(3);
    });

    it('should support different validation patterns for compliance', () => {
      const patterns: Array<'cartService' | 'direct_supabase' | 'simple_validation' | 'transformation_schema'> = [
        'cartService',
        'direct_supabase',
        'simple_validation',
        'transformation_schema'
      ];

      patterns.forEach((pattern, index) => {
        ValidationMonitor.recordPatternComplianceIssue({
          service: `TestService${index}`,
          pattern,
          issue: `Testing ${pattern} compliance`,
          severity: 'info'
        });
      });

      const metrics = ValidationMonitor.getMetrics();
      expect(metrics.dataQualityIssues).toBe(4);
    });
  });

  describe('Pattern Success Monitoring (Positive Tracking)', () => {
    it('should record successful pattern usage without incrementing error counters', () => {
      ValidationMonitor.recordPatternSuccess({
        service: 'CartService',
        pattern: 'direct_supabase_query',
        operation: 'getCart'
      });

      const metrics = ValidationMonitor.getMetrics();
      // Should NOT increment error counters for success events
      expect(metrics.validationErrors).toBe(0);
      expect(metrics.calculationMismatches).toBe(0);
      expect(metrics.dataQualityIssues).toBe(0);
    });

    it('should support different success patterns', () => {
      const successPatterns: Array<'direct_schema_validation' | 'transformation_schema' | 'simple_input_validation' | 'direct_supabase_query'> = [
        'direct_schema_validation',
        'transformation_schema',
        'simple_input_validation',
        'direct_supabase_query'
      ];

      successPatterns.forEach((pattern, index) => {
        ValidationMonitor.recordPatternSuccess({
          service: `TestService${index}`,
          pattern,
          operation: `testOperation${index}`,
          performanceMs: 100 + index * 50
        });
      });

      // Success events should not increment any error metrics
      const metrics = ValidationMonitor.getMetrics();
      expect(metrics.validationErrors).toBe(0);
      expect(metrics.calculationMismatches).toBe(0);
      expect(metrics.dataQualityIssues).toBe(0);
    });

    it('should track performance metrics when provided', () => {
      ValidationMonitor.recordPatternSuccess({
        service: 'CartService',
        pattern: 'direct_supabase_query',
        operation: 'getCart',
        performanceMs: 250
      });

      // Should complete without error (performance tracking is logged)
      const metrics = ValidationMonitor.getMetrics();
      expect(metrics.validationErrors).toBe(0);
    });
  });

  describe('Integration with Existing Monitoring', () => {
    it('should work alongside existing calculation mismatch monitoring', () => {
      // Record a calculation mismatch (existing feature)
      ValidationMonitor.recordCalculationMismatch({
        type: 'cart_total',
        expected: 100,
        actual: 99.95,
        difference: 0.05,
        tolerance: 0.01,
        cartId: 'test-cart'
      });

      // Record a pattern compliance issue (new feature)
      ValidationMonitor.recordPatternComplianceIssue({
        service: 'CartService',
        pattern: 'transformation_schema',
        issue: 'Schema validation successful',
        severity: 'info'
      });

      // Record a pattern success (new feature)
      ValidationMonitor.recordPatternSuccess({
        service: 'CartService',
        pattern: 'direct_supabase_query',
        operation: 'getCart'
      });

      const metrics = ValidationMonitor.getMetrics();
      expect(metrics.calculationMismatches).toBe(1); // From existing feature
      expect(metrics.dataQualityIssues).toBe(1); // From new compliance monitoring
      expect(metrics.validationErrors).toBe(0); // Success events don't increment errors
    });

    it('should work alongside existing validation error monitoring', () => {
      // Record an enhanced validation error (with new validationPattern field)
      ValidationMonitor.recordValidationError({
        context: 'CartService.getCart',
        errorMessage: 'Schema validation failed',
        errorCode: 'SCHEMA_VALIDATION_FAILED',
        validationPattern: 'transformation_schema' // New field
      });

      // Record a legacy validation error (without new field)
      ValidationMonitor.recordValidationError({
        context: 'OrderService.submitOrder',
        errorMessage: 'Order validation failed',
        errorCode: 'ORDER_VALIDATION_FAILED'
        // No validationPattern field (backward compatible)
      });

      const metrics = ValidationMonitor.getMetrics();
      expect(metrics.validationErrors).toBe(2);
    });
  });

  describe('Health Status with Enhanced Monitoring', () => {
    it('should maintain existing health status functionality', () => {
      // Record various types of issues
      ValidationMonitor.recordValidationError({
        context: 'TestService',
        errorMessage: 'Test error',
        errorCode: 'TEST_ERROR'
      });

      ValidationMonitor.recordPatternComplianceIssue({
        service: 'TestService',
        pattern: 'cartService',
        issue: 'Minor compliance issue',
        severity: 'info'
      });

      const healthStatus = ValidationMonitor.getHealthStatus();
      
      expect(healthStatus.status).toBe('healthy'); // Low numbers should be healthy
      expect(healthStatus.metrics.validationErrors).toBe(1);
      expect(healthStatus.metrics.dataQualityIssues).toBe(1);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain full backward compatibility with existing monitoring calls', () => {
      // All existing monitoring calls should work without changes
      
      ValidationMonitor.recordValidationError({
        context: 'LegacyService.legacyMethod',
        errorMessage: 'Legacy validation error',
        errorCode: 'LEGACY_ERROR'
        // No validationPattern field - should still work
      });

      ValidationMonitor.recordCalculationMismatch({
        type: 'cart_total',
        expected: 50,
        actual: 49.99,
        difference: 0.01,
        tolerance: 0.01
      });

      ValidationMonitor.recordDataQualityIssue({
        type: 'missing_field',
        description: 'Legacy data quality issue',
        severity: 'medium',
        affectedEntity: 'LegacyEntity'
      });

      const metrics = ValidationMonitor.getMetrics();
      expect(metrics.validationErrors).toBe(1);
      expect(metrics.calculationMismatches).toBe(1);
      expect(metrics.dataQualityIssues).toBe(1);
    });
  });
});