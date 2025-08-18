/**
 * Validation Pipeline Test Suite
 * 
 * Tests the enhanced validation pipeline to ensure it properly validates,
 * sanitizes, and transforms input data at service entry points.
 */

import { z } from 'zod';
import { ValidationPipeline, ServiceValidator, ValidationUtils } from '../validationPipeline';
import { ValidationMonitor } from '../validationMonitor';

// Mock ValidationMonitor to track calls
jest.mock('../validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn()
  }
}));

const mockValidationMonitor = ValidationMonitor as jest.Mocked<typeof ValidationMonitor>;

describe('ValidationPipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.info = jest.fn();
  });

  describe('validateInput', () => {
    const TestSchema = z.object({
      email: z.string().email(),
      name: z.string().min(2),
      age: z.number().min(0)
    });

    it('should validate correct input successfully', async () => {
      const input = {
        email: 'test@example.com',
        name: 'John Doe',
        age: 30
      };

      const result = await ValidationPipeline.validateInput(
        input,
        TestSchema,
        { context: 'test' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(input);
      expect(result.errors).toBeUndefined();
    });

    it('should sanitize malicious input', async () => {
      const input = {
        email: '  test@example.com  ',
        name: 'John<script>alert("xss")</script>Doe',
        age: 30
      };

      const result = await ValidationPipeline.validateInput(
        input,
        TestSchema,
        { 
          context: 'test',
          sanitizeInput: true,
          strictness: 'lenient'
        }
      );

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe('test@example.com'); // Trimmed
      expect(result.data?.name).toBe('JohnDoe'); // Script tag removed
      expect(result.sanitized).toBe(true);
      expect(result.warnings).toContain('Removed script tags from input');
    });

    it('should transform data appropriately', async () => {
      const input = {
        email: 'TEST@EXAMPLE.COM',
        name: 'John Doe',
        age: 30
      };

      const result = await ValidationPipeline.validateInput(
        input,
        TestSchema,
        { 
          context: 'test',
          enableTransformation: true
        }
      );

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe('test@example.com'); // Normalized to lowercase
      expect(result.transformed).toBe(true);
    });

    it('should handle validation errors with different strictness levels', async () => {
      const invalidInput = {
        email: 'invalid-email',
        name: 'A', // Too short
        age: -5 // Negative
      };

      // Strict mode - should fail
      const strictResult = await ValidationPipeline.validateInput(
        invalidInput,
        TestSchema,
        { 
          context: 'test-strict',
          strictness: 'strict'
        }
      );

      expect(strictResult.success).toBe(false);
      expect(strictResult.errors).toBeDefined();
      expect(strictResult.errors!.length).toBeGreaterThan(0);

      // Lenient mode - should warn but potentially pass
      const lenientResult = await ValidationPipeline.validateInput(
        invalidInput,
        TestSchema,
        { 
          context: 'test-lenient',
          strictness: 'lenient'
        }
      );

      // In lenient mode, it will still fail for this many critical errors
      expect(lenientResult.success).toBe(false);
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalled();
    });

    it('should use custom error messages', async () => {
      const TestSchemaWithCustom = z.object({
        email: z.string().email()
      });

      const result = await ValidationPipeline.validateInput(
        { email: 'invalid' },
        TestSchemaWithCustom,
        {
          context: 'test',
          strictness: 'strict',
          customErrorMessages: {
            'email': 'Please provide a valid email address'
          }
        }
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Please provide a valid email address');
    });
  });

  describe('ServiceValidator', () => {
    const TestSchema = z.object({
      email: z.string().email(),
      name: z.string().min(2)
    });

    it('should validate input in moderate mode', async () => {
      const validInput = {
        email: 'test@example.com',
        name: 'John Doe'
      };

      const result = await ServiceValidator.validateInput(
        validInput,
        TestSchema,
        'test-service'
      );

      expect(result).toEqual(validInput);
    });

    it('should throw for invalid input in moderate mode', async () => {
      const invalidInput = {
        email: 'invalid-email',
        name: 'J'
      };

      await expect(
        ServiceValidator.validateInput(invalidInput, TestSchema, 'test-service')
      ).rejects.toThrow();
    });

    it('should validate input in strict mode', async () => {
      const validInput = {
        email: 'test@example.com',
        name: 'John Doe'
      };

      const result = await ServiceValidator.validateInputStrict(
        validInput,
        TestSchema,
        'test-service'
      );

      expect(result).toEqual(validInput);
    });

    it('should validate input in lenient mode', async () => {
      const validInput = {
        email: 'test@example.com',
        name: 'John Doe'
      };

      const result = await ServiceValidator.validateInputLenient(
        validInput,
        TestSchema,
        'test-service'
      );

      expect(result).toEqual(validInput);
    });
  });

  describe('ValidationUtils', () => {
    it('should create email schema that normalizes emails', () => {
      const emailSchema = ValidationUtils.createEmailSchema();
      
      const result = emailSchema.parse('  TEST@EXAMPLE.COM  ');
      expect(result).toBe('test@example.com');
    });

    it('should create phone schema that normalizes phone numbers', () => {
      const phoneSchema = ValidationUtils.createPhoneSchema();
      
      const result = phoneSchema.parse('(555) 123-4567');
      expect(result).toBe('5551234567');
    });

    it('should create money schema that rounds to 2 decimal places', () => {
      const moneySchema = ValidationUtils.createMoneySchema();
      
      const result = moneySchema.parse(19.999);
      expect(result).toBe(20.0);
    });

    it('should create quantity schema with proper validation', () => {
      const quantitySchema = ValidationUtils.createQuantitySchema();
      
      expect(quantitySchema.parse(5)).toBe(5);
      expect(() => quantitySchema.parse(0)).toThrow();
      expect(() => quantitySchema.parse(1001)).toThrow();
      expect(() => quantitySchema.parse(5.5)).toThrow();
    });

    it('should create safe string schema that prevents XSS', () => {
      const safeStringSchema = ValidationUtils.createSafeStringSchema();
      
      expect(safeStringSchema.parse('  Hello World  ')).toBe('Hello World');
      expect(() => safeStringSchema.parse('<script>alert("xss")</script>')).toThrow();
    });
  });

  describe('Error message formatting', () => {
    it('should create user-friendly error messages for common validation issues', async () => {
      const TestSchema = z.object({
        email: z.string().email(),
        age: z.number().min(18).max(100),
        name: z.string().min(2).max(50),
        status: z.enum(['active', 'inactive'])
      });

      const invalidInput = {
        email: 'not-an-email',
        age: 15,
        name: 'A',
        status: 'unknown'
      };

      const result = await ValidationPipeline.validateInput(
        invalidInput,
        TestSchema,
        { context: 'test', strictness: 'strict' }
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      
      const errors = result.errors!;
      expect(errors.some(e => e.includes('valid email'))).toBe(true);
      expect(errors.some(e => e.includes('at least 18'))).toBe(true);
      expect(errors.some(e => e.includes('at least 2 characters'))).toBe(true);
      expect(errors.some(e => e.includes('active, inactive'))).toBe(true);
    });
  });

  describe('Security features', () => {
    it('should sanitize SQL injection attempts', async () => {
      const input = {
        search: "'; DROP TABLE users; --"
      };

      const TestSchema = z.object({
        search: z.string()
      });

      const result = await ValidationPipeline.validateInput(
        input,
        TestSchema,
        { 
          context: 'test',
          sanitizeInput: true 
        }
      );

      expect(result.success).toBe(true);
      expect(result.data?.search).not.toContain('DROP TABLE');
      expect(result.sanitized).toBe(true);
    });

    it('should detect and prevent XSS attempts', async () => {
      const input = {
        comment: '<script>document.cookie="hacked"</script>Hello'
      };

      const TestSchema = z.object({
        comment: ValidationUtils.createSafeStringSchema()
      });

      await expect(
        ValidationPipeline.validateInput(
          input,
          TestSchema,
          { 
            context: 'test',
            strictness: 'strict'
          }
        )
      ).resolves.toMatchObject({
        success: false,
        errors: expect.arrayContaining([
          expect.stringContaining('dangerous content')
        ])
      });
    });
  });
});