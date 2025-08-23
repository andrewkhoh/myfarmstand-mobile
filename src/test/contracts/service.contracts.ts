/**
 * Service Contract Validators
 * 
 * Ensures service layer outputs match schema contracts.
 * This creates a safety net between services and consumers.
 */

import { z } from 'zod';

export interface ContractValidationResult {
  valid: boolean;
  data?: any;
  errors?: string[];
  warnings?: string[];
}

/**
 * Validate service output against schema contract
 */
export function validateServiceOutput<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  options: { strict?: boolean } = {}
): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map(e => 
      `${e.path.join('.')}: ${e.message}`
    );
    
    if (options.strict !== false) {
      throw new Error(
        `Service contract violation:\n${errors.join('\n')}`
      );
    }
    
    console.warn('Contract validation warning:', errors);
  }
  
  return result.data as T;
}

/**
 * Batch validate multiple outputs
 */
export function validateBatch(
  items: Array<{ data: unknown; schema: z.ZodSchema; name: string }>
): ContractValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (const item of items) {
    const result = item.schema.safeParse(item.data);
    
    if (!result.success) {
      const itemErrors = result.error.errors.map(e => 
        `${item.name}.${e.path.join('.')}: ${e.message}`
      );
      errors.push(...itemErrors);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Create a contract test suite for a service
 */
export function createServiceContractTests<T>(
  serviceName: string,
  service: T,
  contracts: Array<{
    method: keyof T;
    schema: z.ZodSchema;
    args?: any[];
    description?: string;
  }>
) {
  describe(`${serviceName} Contract Validation`, () => {
    contracts.forEach(({ method, schema, args = [], description }) => {
      const testName = description || `${String(method)} should return schema-valid data`;
      
      it(testName, async () => {
        // Call the service method
        const serviceMethod = service[method] as any;
        const result = await serviceMethod(...args);
        
        // Validate against schema
        const validation = schema.safeParse(result);
        
        if (!validation.success) {
          const errors = validation.error.errors.map(e => 
            `${e.path.join('.')}: ${e.message}`
          );
          
          fail(`Contract violation in ${serviceName}.${String(method)}:\n${errors.join('\n')}`);
        }
        
        expect(validation.success).toBe(true);
      });
    });
  });
}

/**
 * Middleware for automatic contract validation
 */
export function withContractValidation<T extends (...args: any[]) => any>(
  fn: T,
  schema: z.ZodSchema,
  options: { validateInput?: z.ZodSchema; logErrors?: boolean } = {}
): T {
  return (async (...args: Parameters<T>) => {
    // Validate input if schema provided
    if (options.validateInput) {
      const inputResult = options.validateInput.safeParse(args[0]);
      if (!inputResult.success && options.logErrors) {
        console.error('Input validation failed:', inputResult.error);
      }
    }
    
    // Call original function
    const result = await fn(...args);
    
    // Validate output
    const outputResult = schema.safeParse(result);
    if (!outputResult.success) {
      if (options.logErrors) {
        console.error('Output validation failed:', outputResult.error);
      }
      throw new Error(`Contract violation: ${outputResult.error.message}`);
    }
    
    return result;
  }) as T;
}

/**
 * Test helper to ensure a value matches schema
 */
export function expectSchemaMatch<T>(
  value: unknown,
  schema: z.ZodSchema<T>,
  message?: string
): void {
  const result = schema.safeParse(value);
  
  if (!result.success) {
    const errors = result.error.errors.map(e => 
      `  - ${e.path.join('.')}: ${e.message}`
    ).join('\n');
    
    const errorMessage = message 
      ? `${message}\nSchema validation errors:\n${errors}`
      : `Schema validation failed:\n${errors}`;
    
    throw new Error(errorMessage);
  }
}

/**
 * Create a mock that validates its return values
 */
export function createValidatedMock<T>(
  schema: z.ZodSchema<T>,
  defaultValue: T
): jest.Mock {
  return jest.fn().mockImplementation((...args) => {
    const result = typeof defaultValue === 'function' 
      ? defaultValue(...args)
      : defaultValue;
    
    // Validate the mock return value
    const validation = schema.safeParse(result);
    if (!validation.success) {
      throw new Error(
        `Mock returned invalid data: ${validation.error.message}`
      );
    }
    
    return result;
  });
}