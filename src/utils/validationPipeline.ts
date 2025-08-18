/**
 * Enhanced Data Validation Pipeline
 * 
 * Provides comprehensive validation at service entry points to prevent 
 * invalid data from propagating through the system.
 * 
 * Risk Level: MEDIUM - More strict validation could reject edge cases
 * Strategy: Gradual rollout with configurable strictness levels
 */

import { z } from 'zod';
import { ValidationMonitor } from './validationMonitor';

export interface ValidationPipelineOptions {
  /**
   * Validation strictness level
   * - strict: Reject any validation failure
   * - moderate: Allow minor issues, reject major ones
   * - lenient: Log issues but allow most data through
   */
  strictness?: 'strict' | 'moderate' | 'lenient';
  
  /**
   * Whether to sanitize input data before validation
   */
  sanitizeInput?: boolean;
  
  /**
   * Whether to transform data during validation
   */
  enableTransformation?: boolean;
  
  /**
   * Context for error reporting and monitoring
   */
  context: string;
  
  /**
   * Custom error messages for specific fields
   */
  customErrorMessages?: Record<string, string>;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
  warnings?: string[];
  sanitized?: boolean;
  transformed?: boolean;
}

/**
 * Enhanced validation pipeline with configurable strictness and data transformation
 */
export class ValidationPipeline {
  private static readonly DEFAULT_OPTIONS: Required<Omit<ValidationPipelineOptions, 'context' | 'customErrorMessages'>> = {
    strictness: 'moderate',
    sanitizeInput: true,
    enableTransformation: true
  };

  /**
   * Validate input data with enhanced error handling and data transformation
   */
  static async validateInput<T>(
    data: unknown,
    schema: z.ZodSchema<T>,
    options: ValidationPipelineOptions
  ): Promise<ValidationResult<T>> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];
    let processedData = data;
    let sanitized = false;
    let transformed = false;

    try {
      // Step 1: Input sanitization
      if (opts.sanitizeInput) {
        const sanitizeResult = await this.sanitizeInput(processedData, opts.context);
        processedData = sanitizeResult.data;
        sanitized = sanitizeResult.sanitized;
        warnings.push(...sanitizeResult.warnings);
      }

      // Step 2: Schema validation with error handling
      const validationResult = await this.performValidation(
        processedData,
        schema,
        opts
      );

      if (!validationResult.success) {
        errors.push(...validationResult.errors);
        
        // Record validation error for monitoring
        ValidationMonitor.recordValidationError({
          context: `ValidationPipeline.${opts.context}`,
          errorMessage: validationResult.errors.join('; '),
          errorCode: 'INPUT_VALIDATION_FAILED'
        });

        // Handle based on strictness level
        if (opts.strictness === 'strict') {
          return {
            success: false,
            errors,
            warnings,
            sanitized,
            transformed
          };
        } else if (opts.strictness === 'moderate') {
          // Allow through if only minor validation issues
          const hasCriticalErrors = validationResult.errors.some(error =>
            this.isCriticalValidationError(error)
          );
          
          if (hasCriticalErrors) {
            return {
              success: false,
              errors,
              warnings,
              sanitized,
              transformed
            };
          } else {
            warnings.push(...errors);
            errors.length = 0; // Clear errors, treat as warnings
          }
        }
        // For lenient mode, continue processing with warnings
      }

      // Step 3: Data transformation (if enabled and validation passed)
      let finalData = validationResult.data || processedData;
      if (opts.enableTransformation && validationResult.success) {
        const transformResult = await this.transformData(finalData, opts.context);
        finalData = transformResult.data;
        transformed = transformResult.transformed;
        warnings.push(...transformResult.warnings);
      }

      return {
        success: true,
        data: finalData as T,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        sanitized,
        transformed
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      
      ValidationMonitor.recordValidationError({
        context: `ValidationPipeline.${opts.context}`,
        errorMessage,
        errorCode: 'VALIDATION_PIPELINE_ERROR'
      });

      return {
        success: false,
        errors: [errorMessage],
        warnings,
        sanitized,
        transformed
      };
    }
  }

  /**
   * Perform schema validation with enhanced error messages
   */
  private static async performValidation<T>(
    data: unknown,
    schema: z.ZodSchema<T>,
    options: Required<Omit<ValidationPipelineOptions, 'context' | 'customErrorMessages'>> & Pick<ValidationPipelineOptions, 'context' | 'customErrorMessages'>
  ): Promise<{ success: boolean; data?: T; errors: string[] }> {
    try {
      const validatedData = schema.parse(data);
      return {
        success: true,
        data: validatedData,
        errors: []
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map(issue => {
          const fieldPath = issue.path.join('.');
          
          // Use custom error message if provided
          if (options.customErrorMessages?.[fieldPath]) {
            return options.customErrorMessages[fieldPath];
          }
          
          // Create user-friendly error messages
          return this.createUserFriendlyErrorMessage(issue, fieldPath);
        });

        return {
          success: false,
          errors
        };
      }

      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Validation failed']
      };
    }
  }

  /**
   * Sanitize input data to prevent common security issues
   */
  private static async sanitizeInput(
    data: unknown,
    context: string
  ): Promise<{ data: unknown; sanitized: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    let sanitized = false;

    if (data === null || data === undefined) {
      return { data, sanitized, warnings };
    }

    if (typeof data === 'string') {
      // Remove potentially dangerous content
      let sanitizedString = data;
      
      // Remove script tags
      if (sanitizedString.includes('<script')) {
        sanitizedString = sanitizedString.replace(/<script[^>]*>.*?<\/script>/gi, '');
        sanitized = true;
        warnings.push('Removed script tags from input');
      }
      
      // Remove SQL injection patterns
      const sqlPatterns = [/union\s+select/gi, /drop\s+table/gi, /exec\s*\(/gi];
      for (const pattern of sqlPatterns) {
        if (pattern.test(sanitizedString)) {
          sanitizedString = sanitizedString.replace(pattern, '');
          sanitized = true;
          warnings.push('Removed potentially dangerous SQL patterns');
        }
      }
      
      // Trim whitespace
      const trimmed = sanitizedString.trim();
      if (trimmed !== sanitizedString) {
        sanitizedString = trimmed;
        sanitized = true;
      }

      return { data: sanitizedString, sanitized, warnings };
    }

    if (typeof data === 'object' && data !== null) {
      const sanitizedObject: any = Array.isArray(data) ? [] : {};
      
      for (const [key, value] of Object.entries(data)) {
        const sanitizeResult = await this.sanitizeInput(value, `${context}.${key}`);
        sanitizedObject[key] = sanitizeResult.data;
        
        if (sanitizeResult.sanitized) {
          sanitized = true;
        }
        warnings.push(...sanitizeResult.warnings);
      }

      return { data: sanitizedObject, sanitized, warnings };
    }

    return { data, sanitized, warnings };
  }

  /**
   * Transform data according to business rules
   */
  private static async transformData(
    data: unknown,
    context: string
  ): Promise<{ data: unknown; transformed: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    let transformed = false;

    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const transformedObject = { ...data } as any;

      // Common transformations
      
      // Normalize email addresses
      if (transformedObject.email && typeof transformedObject.email === 'string') {
        const normalizedEmail = transformedObject.email.toLowerCase().trim();
        if (normalizedEmail !== transformedObject.email) {
          transformedObject.email = normalizedEmail;
          transformed = true;
          warnings.push('Normalized email address');
        }
      }

      // Normalize phone numbers
      if (transformedObject.phone && typeof transformedObject.phone === 'string') {
        const normalizedPhone = transformedObject.phone.replace(/\D/g, '');
        if (normalizedPhone !== transformedObject.phone) {
          transformedObject.phone = normalizedPhone;
          transformed = true;
          warnings.push('Normalized phone number');
        }
      }

      // Convert string numbers to actual numbers where appropriate
      for (const [key, value] of Object.entries(transformedObject)) {
        if (typeof value === 'string' && /^-?\d+\.?\d*$/.test(value)) {
          const numValue = parseFloat(value);
          if (!isNaN(numValue) && key.includes('price') || key.includes('amount') || key.includes('quantity')) {
            transformedObject[key] = numValue;
            transformed = true;
            warnings.push(`Converted ${key} from string to number`);
          }
        }
      }

      return { data: transformedObject, transformed, warnings };
    }

    return { data, transformed, warnings };
  }

  /**
   * Create user-friendly error messages from Zod issues
   */
  private static createUserFriendlyErrorMessage(issue: z.ZodIssue, fieldPath: string): string {
    const fieldName = fieldPath || 'field';
    
    switch (issue.code) {
      case z.ZodIssueCode.invalid_type:
        return `${fieldName} must be a ${issue.expected}, but received ${issue.received}`;
      
      case z.ZodIssueCode.too_small:
        if (issue.type === 'string') {
          return `${fieldName} must be at least ${issue.minimum} characters long`;
        } else if (issue.type === 'number') {
          return `${fieldName} must be at least ${issue.minimum}`;
        } else if (issue.type === 'array') {
          return `${fieldName} must contain at least ${issue.minimum} items`;
        }
        return `${fieldName} is too small`;
      
      case z.ZodIssueCode.too_big:
        if (issue.type === 'string') {
          return `${fieldName} must be no more than ${issue.maximum} characters long`;
        } else if (issue.type === 'number') {
          return `${fieldName} must be no more than ${issue.maximum}`;
        } else if (issue.type === 'array') {
          return `${fieldName} must contain no more than ${issue.maximum} items`;
        }
        return `${fieldName} is too large`;
      
      case z.ZodIssueCode.invalid_string:
        if (issue.validation === 'email') {
          return `${fieldName} must be a valid email address`;
        } else if (issue.validation === 'url') {
          return `${fieldName} must be a valid URL`;
        } else if (issue.validation === 'uuid') {
          return `${fieldName} must be a valid UUID`;
        }
        return `${fieldName} format is invalid`;
      
      case z.ZodIssueCode.invalid_literal:
        return `${fieldName} must be exactly '${issue.expected}'`;
      
      case z.ZodIssueCode.unrecognized_keys:
        return `Unexpected fields: ${issue.keys.join(', ')}`;
      
      case z.ZodIssueCode.invalid_union:
        return `${fieldName} doesn't match any of the expected formats`;
      
      case z.ZodIssueCode.invalid_enum_value:
        return `${fieldName} must be one of: ${issue.options.join(', ')}`;
      
      case z.ZodIssueCode.invalid_date:
        return `${fieldName} must be a valid date`;
      
      case z.ZodIssueCode.custom:
        return issue.message || `${fieldName} is invalid`;
      
      default:
        return issue.message || `${fieldName} is invalid`;
    }
  }

  /**
   * Determine if a validation error is critical
   */
  private static isCriticalValidationError(error: string): boolean {
    const criticalPatterns = [
      /must be a valid email/i,
      /required/i,
      /must be a number/i,
      /security/i,
      /authentication/i,
      /authorization/i
    ];

    return criticalPatterns.some(pattern => pattern.test(error));
  }
}

/**
 * Service validator middleware pattern
 * Provides standardized input validation for service entry points
 */
export class ServiceValidator {
  /**
   * Validate and sanitize input data with moderate strictness
   */
  static async validateInput<T>(
    data: unknown,
    schema: z.ZodSchema<T>,
    context: string,
    customOptions?: Partial<ValidationPipelineOptions>
  ): Promise<T> {
    const result = await ValidationPipeline.validateInput(data, schema, {
      strictness: 'moderate',
      sanitizeInput: true,
      enableTransformation: true,
      context,
      ...customOptions
    });

    if (!result.success) {
      const errorMessage = result.errors?.join('; ') || 'Validation failed';
      throw new Error(errorMessage);
    }

    return result.data!;
  }

  /**
   * Validate input with strict mode (no tolerance for validation errors)
   */
  static async validateInputStrict<T>(
    data: unknown,
    schema: z.ZodSchema<T>,
    context: string,
    customOptions?: Partial<ValidationPipelineOptions>
  ): Promise<T> {
    const result = await ValidationPipeline.validateInput(data, schema, {
      strictness: 'strict',
      sanitizeInput: true,
      enableTransformation: false, // Don't transform in strict mode
      context,
      ...customOptions
    });

    if (!result.success) {
      const errorMessage = result.errors?.join('; ') || 'Validation failed';
      throw new Error(errorMessage);
    }

    return result.data!;
  }

  /**
   * Validate input with lenient mode (log issues but allow most data through)
   */
  static async validateInputLenient<T>(
    data: unknown,
    schema: z.ZodSchema<T>,
    context: string,
    customOptions?: Partial<ValidationPipelineOptions>
  ): Promise<T> {
    const result = await ValidationPipeline.validateInput(data, schema, {
      strictness: 'lenient',
      sanitizeInput: true,
      enableTransformation: true,
      context,
      ...customOptions
    });

    // In lenient mode, always try to return something useful
    if (!result.success) {
      console.warn(`Lenient validation failed for ${context}:`, result.errors);
      
      // Try to return the sanitized data even if validation failed
      if (result.sanitized) {
        return data as T;
      }
      
      // Last resort: throw error
      const errorMessage = result.errors?.join('; ') || 'Validation failed';
      throw new Error(errorMessage);
    }

    if (result.warnings && result.warnings.length > 0) {
      console.info(`Validation warnings for ${context}:`, result.warnings);
    }

    return result.data!;
  }
}

/**
 * Utility functions for common validation patterns
 */
export const ValidationUtils = {
  /**
   * Create email validation schema with common business rules
   */
  createEmailSchema: () => z.string()
    .email('Must be a valid email address')
    .min(5, 'Email must be at least 5 characters')
    .max(254, 'Email must be no more than 254 characters')
    .transform(email => email.toLowerCase().trim()),

  /**
   * Create phone validation schema
   */
  createPhoneSchema: () => z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be no more than 15 digits')
    .transform(phone => phone.replace(/\D/g, '')),

  /**
   * Create money amount validation schema
   */
  createMoneySchema: () => z.number()
    .min(0, 'Amount must be positive')
    .max(999999.99, 'Amount too large')
    .transform(amount => Math.round(amount * 100) / 100), // Round to 2 decimal places

  /**
   * Create product quantity validation schema
   */
  createQuantitySchema: () => z.number()
    .min(1, 'Quantity must be at least 1')
    .max(1000, 'Quantity cannot exceed 1000')
    .int('Quantity must be a whole number'),

  /**
   * Create safe string schema (prevents XSS)
   */
  createSafeStringSchema: (minLength = 1, maxLength = 1000) => z.string()
    .min(minLength, `Must be at least ${minLength} characters`)
    .max(maxLength, `Must be no more than ${maxLength} characters`)
    .transform(str => str.trim())
    .refine(str => !/<script/i.test(str), 'Contains potentially dangerous content')
};