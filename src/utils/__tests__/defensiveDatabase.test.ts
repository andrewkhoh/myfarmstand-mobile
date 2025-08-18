/**
 * Defensive Database Test Suite
 * 
 * Tests the defensive database access utility to ensure it properly
 * validates data at database boundaries and handles invalid records gracefully.
 */

import { z } from 'zod';
import { DefensiveDatabase, DatabaseHelpers } from '../defensiveDatabase';
import { ValidationMonitor } from '../validationMonitor';

// Mock ValidationMonitor to track calls
jest.mock('../validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordDataQualityIssue: jest.fn()
  }
}));

const mockValidationMonitor = ValidationMonitor as jest.Mocked<typeof ValidationMonitor>;

describe('DefensiveDatabase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.info = jest.fn();
  });

  describe('fetchWithValidation', () => {
    const TestSchema = z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().min(0).max(150)
    });

    it('should handle valid data successfully', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'John Doe', email: 'john@example.com', age: 30 },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com', age: 25 }
        ]
      });

      const result = await DefensiveDatabase.fetchWithValidation(
        mockQuery,
        TestSchema,
        'test-context'
      );

      expect(result.validRecords).toHaveLength(2);
      expect(result.summary.validCount).toBe(2);
      expect(result.summary.invalidCount).toBe(0);
      expect(result.summary.isHealthy).toBe(true);
      expect(mockValidationMonitor.recordValidationError).not.toHaveBeenCalled();
    });

    it('should handle mixed valid and invalid data gracefully', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'John Doe', email: 'john@example.com', age: 30 }, // Valid
          { id: '2', name: '', email: 'invalid-email', age: -5 }, // Invalid
          { id: '3', name: 'Jane Smith', email: 'jane@example.com', age: 25 }, // Valid
          { id: '', name: 'Bob', email: 'bob@example.com', age: 999 } // Invalid
        ]
      });

      const result = await DefensiveDatabase.fetchWithValidation(
        mockQuery,
        TestSchema,
        'test-context',
        {
          maxErrorThreshold: 0.6, // Allow up to 60% errors
          includeDetailedErrors: true
        }
      );

      expect(result.validRecords).toHaveLength(2);
      expect(result.summary.validCount).toBe(2);
      expect(result.summary.invalidCount).toBe(2);
      expect(result.summary.errorRate).toBe(0.5);
      expect(result.summary.isHealthy).toBe(true); // Within threshold
      expect(result.invalidRecords).toHaveLength(2);
      
      // Should record validation errors for monitoring
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledTimes(2);
    });

    it('should handle high error rates correctly', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'John Doe', email: 'john@example.com', age: 30 }, // Valid
          { id: '', name: '', email: 'invalid', age: -1 }, // Invalid
          { id: '', name: '', email: 'invalid', age: -2 }, // Invalid
          { id: '', name: '', email: 'invalid', age: -3 }, // Invalid
          { id: '', name: '', email: 'invalid', age: -4 }  // Invalid
        ]
      });

      const result = await DefensiveDatabase.fetchWithValidation(
        mockQuery,
        TestSchema,
        'test-context',
        {
          maxErrorThreshold: 0.5, // 50% threshold
          throwOnCriticalFailure: false
        }
      );

      expect(result.validRecords).toHaveLength(1);
      expect(result.summary.validCount).toBe(1);
      expect(result.summary.invalidCount).toBe(4);
      expect(result.summary.errorRate).toBe(0.8);
      expect(result.summary.isHealthy).toBe(false); // Above threshold
      
      // Should record data quality issue for high error rate
      expect(mockValidationMonitor.recordDataQualityIssue).toHaveBeenCalledWith({
        type: 'inconsistent_data',
        description: expect.stringContaining('High validation error rate'),
        severity: 'critical',
        affectedEntity: 'test-context'
      });
    });

    it('should handle database query failures gracefully', async () => {
      const mockQuery = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const result = await DefensiveDatabase.fetchWithValidation(
        mockQuery,
        TestSchema,
        'test-context'
      );

      expect(result.validRecords).toHaveLength(0);
      expect(result.summary.validCount).toBe(0);
      expect(result.summary.invalidCount).toBe(0);
      expect(result.summary.errorRate).toBe(1.0);
      expect(result.summary.isHealthy).toBe(false);
      
      // Should record database error
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'DefensiveDatabase.test-context',
        errorMessage: 'Database connection failed',
        errorCode: 'DATABASE_QUERY_FAILED'
      });
    });

    it('should handle different response formats', async () => {
      // Test direct array response
      const mockQuery1 = jest.fn().mockResolvedValue([
        { id: '1', name: 'John', email: 'john@example.com', age: 30 }
      ]);

      const result1 = await DefensiveDatabase.fetchWithValidation(
        mockQuery1,
        TestSchema,
        'test-array'
      );

      expect(result1.validRecords).toHaveLength(1);

      // Test single object response
      const mockQuery2 = jest.fn().mockResolvedValue(
        { id: '1', name: 'John', email: 'john@example.com', age: 30 }
      );

      const result2 = await DefensiveDatabase.fetchWithValidation(
        mockQuery2,
        TestSchema,
        'test-single'
      );

      expect(result2.validRecords).toHaveLength(1);
    });

    it('should handle timeout scenarios', async () => {
      const mockQuery = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 2000))
      );

      const result = await DefensiveDatabase.fetchWithValidation(
        mockQuery,
        TestSchema,
        'test-timeout',
        { timeout: 100 } // 100ms timeout
      );

      expect(result.validRecords).toHaveLength(0);
      expect(result.summary.isHealthy).toBe(false);
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: expect.stringContaining('timed out')
        })
      );
    });
  });

  describe('fetchSingleWithValidation', () => {
    const TestSchema = z.object({
      id: z.string().min(1),
      name: z.string().min(1)
    });

    it('should return single valid record', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        data: [{ id: '1', name: 'John' }]
      });

      const result = await DefensiveDatabase.fetchSingleWithValidation(
        mockQuery,
        TestSchema,
        'test-single'
      );

      expect(result).toEqual({ id: '1', name: 'John' });
    });

    it('should return null for no records', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ data: [] });

      const result = await DefensiveDatabase.fetchSingleWithValidation(
        mockQuery,
        TestSchema,
        'test-empty'
      );

      expect(result).toBeNull();
    });

    it('should warn when multiple records returned', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'John' },
          { id: '2', name: 'Jane' }
        ]
      });

      const result = await DefensiveDatabase.fetchSingleWithValidation(
        mockQuery,
        TestSchema,
        'test-multiple'
      );

      expect(result).toEqual({ id: '1', name: 'John' }); // Returns first
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Expected single record for test-multiple, got 2')
      );
    });
  });

  describe('DatabaseHelpers', () => {
    const TestSchema = z.object({
      id: z.string().min(1),
      name: z.string().min(1)
    });

    it('should provide convenient fetchAll method', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'John' },
          { id: '2', name: 'Jane' }
        ]
      });

      const result = await DatabaseHelpers.fetchAll(
        'users',
        TestSchema,
        mockQuery
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: '1', name: 'John' });
    });

    it('should provide convenient fetchById method', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        data: [{ id: '1', name: 'John' }]
      });

      const result = await DatabaseHelpers.fetchById(
        'users',
        '1',
        TestSchema,
        mockQuery
      );

      expect(result).toEqual({ id: '1', name: 'John' });
    });

    it('should provide convenient fetchFiltered method', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        data: [{ id: '1', name: 'John' }]
      });

      const result = await DatabaseHelpers.fetchFiltered(
        'users',
        'active-users',
        TestSchema,
        mockQuery
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: '1', name: 'John' });
    });
  });
});