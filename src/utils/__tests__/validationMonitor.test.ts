/**
 * ValidationMonitor Test Suite
 * 
 * Tests the monitoring utility for validation errors and calculation mismatches
 */

import { ValidationMonitor } from '../validationMonitor';

describe('ValidationMonitor', () => {
  beforeEach(() => {
    // Reset metrics before each test
    ValidationMonitor.resetMetrics();
    
    // Mock console methods to avoid test output noise
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    // Restore console methods
    jest.restoreAllMocks();
  });

  describe('recordCalculationMismatch', () => {
    it('should record calculation mismatch and increment metrics', () => {
      const details = {
        type: 'cart_total' as const,
        expected: 25.98,
        actual: 25.00,
        difference: 0.98,
        tolerance: 0.01,
        cartId: 'cart-123'
      };

      ValidationMonitor.recordCalculationMismatch(details);

      const metrics = ValidationMonitor.getMetrics();
      expect(metrics.calculationMismatches).toBe(1);
      expect(metrics.validationErrors).toBe(0);
      expect(metrics.dataQualityIssues).toBe(0);
    });

    it('should log at different levels based on severity', () => {
      const consoleSpy = {
        error: jest.spyOn(console, 'error'),
        warn: jest.spyOn(console, 'warn'),
        info: jest.spyOn(console, 'info')
      };

      // Critical mismatch (difference > tolerance * 10)
      ValidationMonitor.recordCalculationMismatch({
        type: 'order_total',
        expected: 100.00,
        actual: 85.00,
        difference: 15.00,
        tolerance: 0.01
      });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL calculation mismatch'),
        expect.any(Object)
      );

      // Significant mismatch (difference > tolerance * 2)
      ValidationMonitor.recordCalculationMismatch({
        type: 'cart_total',
        expected: 10.00,
        actual: 9.95,
        difference: 0.05,
        tolerance: 0.01
      });

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Significant calculation mismatch'),
        expect.any(Object)
      );

      // Minor mismatch (within reasonable bounds)
      ValidationMonitor.recordCalculationMismatch({
        type: 'item_subtotal',
        expected: 5.00,
        actual: 5.01,
        difference: 0.01,
        tolerance: 0.01
      });

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('Minor calculation correction'),
        expect.any(Object)
      );
    });
  });

  describe('recordValidationError', () => {
    it('should record validation error and increment metrics', () => {
      const details = {
        context: 'CartService.addItem',
        errorMessage: 'Invalid product data',
        errorCode: 'VALIDATION_FAILED',
        fieldPath: 'product.price',
        expectedType: 'number'
      };

      ValidationMonitor.recordValidationError(details);

      const metrics = ValidationMonitor.getMetrics();
      expect(metrics.validationErrors).toBe(1);
      expect(metrics.calculationMismatches).toBe(0);
      expect(metrics.dataQualityIssues).toBe(0);
    });

    it('should log validation errors', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      
      ValidationMonitor.recordValidationError({
        context: 'OrderService.validateOrder',
        errorMessage: 'Missing required field'
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Validation error in OrderService.validateOrder'),
        expect.objectContaining({
          type: 'VALIDATION_ERROR',
          details: expect.objectContaining({
            context: 'OrderService.validateOrder',
            errorMessage: 'Missing required field'
          })
        })
      );
    });
  });

  describe('recordDataQualityIssue', () => {
    it('should record data quality issue and increment metrics', () => {
      const details = {
        type: 'missing_field' as const,
        description: 'Product missing description field',
        severity: 'medium' as const,
        affectedEntity: 'Product',
        entityId: 'product-123'
      };

      ValidationMonitor.recordDataQualityIssue(details);

      const metrics = ValidationMonitor.getMetrics();
      expect(metrics.dataQualityIssues).toBe(1);
      expect(metrics.validationErrors).toBe(0);
      expect(metrics.calculationMismatches).toBe(0);
    });

    it('should log at appropriate level based on severity', () => {
      const consoleSpy = {
        error: jest.spyOn(console, 'error'),
        warn: jest.spyOn(console, 'warn'),
        info: jest.spyOn(console, 'info')
      };

      // Critical severity
      ValidationMonitor.recordDataQualityIssue({
        type: 'inconsistent_data',
        description: 'Critical data corruption detected',
        severity: 'critical',
        affectedEntity: 'Order'
      });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL data quality issue'),
        expect.any(Object)
      );

      // Medium severity
      ValidationMonitor.recordDataQualityIssue({
        type: 'invalid_format',
        description: 'Email format validation failed',
        severity: 'medium',
        affectedEntity: 'User'
      });

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Data quality issue detected'),
        expect.any(Object)
      );

      // Low severity
      ValidationMonitor.recordDataQualityIssue({
        type: 'stale_data',
        description: 'Cache entry is slightly outdated',
        severity: 'low',
        affectedEntity: 'Product'
      });

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('Minor data quality issue'),
        expect.any(Object)
      );
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      // Record some events
      ValidationMonitor.recordCalculationMismatch({
        type: 'cart_total',
        expected: 10,
        actual: 9,
        difference: 1,
        tolerance: 0.01
      });

      ValidationMonitor.recordValidationError({
        context: 'test',
        errorMessage: 'test error'
      });

      ValidationMonitor.recordDataQualityIssue({
        type: 'missing_field',
        description: 'test issue',
        severity: 'low',
        affectedEntity: 'Test'
      });

      const metrics = ValidationMonitor.getMetrics();
      
      expect(metrics.calculationMismatches).toBe(1);
      expect(metrics.validationErrors).toBe(1);
      expect(metrics.dataQualityIssues).toBe(1);
      expect(metrics.lastUpdated).toBeDefined();
    });

    it('should return a copy of metrics (not reference)', () => {
      const metrics1 = ValidationMonitor.getMetrics();
      const metrics2 = ValidationMonitor.getMetrics();
      
      expect(metrics1).not.toBe(metrics2); // Different objects
      expect(metrics1).toEqual(metrics2); // Same values
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when metrics are low', () => {
      const health = ValidationMonitor.getHealthStatus();
      
      expect(health.status).toBe('healthy');
      expect(health.issues).toHaveLength(0);
      expect(health.metrics).toBeDefined();
    });

    it('should return warning status when metrics exceed warning thresholds', () => {
      // Add enough validation errors to trigger warning
      for (let i = 0; i < 12; i++) {
        ValidationMonitor.recordValidationError({
          context: `test-${i}`,
          errorMessage: 'test error'
        });
      }

      const health = ValidationMonitor.getHealthStatus();
      
      expect(health.status).toBe('warning');
      expect(health.issues.length).toBeGreaterThan(0);
      expect(health.issues[0]).toContain('Elevated validation errors');
    });

    it('should return critical status when metrics exceed critical thresholds', () => {
      // Add enough validation errors to trigger critical
      for (let i = 0; i < 30; i++) {
        ValidationMonitor.recordValidationError({
          context: `test-${i}`,
          errorMessage: 'test error'
        });
      }

      const health = ValidationMonitor.getHealthStatus();
      
      expect(health.status).toBe('critical');
      expect(health.issues.length).toBeGreaterThan(0);
      expect(health.issues[0]).toContain('Critical validation error rate');
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics to zero', () => {
      // Add some data
      ValidationMonitor.recordCalculationMismatch({
        type: 'cart_total',
        expected: 10,
        actual: 9,
        difference: 1,
        tolerance: 0.01
      });

      ValidationMonitor.recordValidationError({
        context: 'test',
        errorMessage: 'test'
      });

      // Verify metrics are not zero
      let metrics = ValidationMonitor.getMetrics();
      expect(metrics.calculationMismatches).toBeGreaterThan(0);
      expect(metrics.validationErrors).toBeGreaterThan(0);

      // Reset and verify
      ValidationMonitor.resetMetrics();
      metrics = ValidationMonitor.getMetrics();
      
      expect(metrics.calculationMismatches).toBe(0);
      expect(metrics.validationErrors).toBe(0);
      expect(metrics.dataQualityIssues).toBe(0);
      expect(metrics.lastUpdated).toBeDefined();
    });
  });
});