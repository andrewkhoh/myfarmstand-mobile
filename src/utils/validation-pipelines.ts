/**
 * Validation Pipelines
 * 
 * Comprehensive validation pipelines for data flow throughout the application.
 * Implements MyFarmstand Mobile architectural patterns:
 * - Single validation pass with transformation
 * - Graceful degradation on errors
 * - Individual item processing with skip-on-error
 * - User-isolated operations
 */

import { z } from 'zod';
import type { ValidationMonitor } from './ValidationMonitor';

// ================================
// Core Pipeline Types
// ================================

export interface ValidationPipelineOptions {
  /**
   * Continue processing even if some items fail validation
   */
  skipOnError?: boolean;
  
  /**
   * Transform data during validation
   */
  transform?: boolean;
  
  /**
   * Log validation errors
   */
  logErrors?: boolean;
  
  /**
   * Strict mode - throw on any validation failure
   */
  strict?: boolean;
  
  /**
   * Monitor to track validation metrics
   */
  monitor?: ValidationMonitor;
  
  /**
   * User ID for isolation
   */
  userId?: string;
  
  /**
   * Custom error handler
   */
  onError?: (error: ValidationPipelineError) => void;
  
  /**
   * Custom success handler
   */
  onSuccess?: (result: ValidationPipelineResult) => void;
}

export interface ValidationPipelineResult<T = any> {
  success: boolean;
  data?: T;
  errors: ValidationPipelineError[];
  warnings: string[];
  metadata: {
    totalItems: number;
    validItems: number;
    invalidItems: number;
    skippedItems: number;
    duration: number;
    timestamp: string;
    pipelineName: string;
  };
}

export interface ValidationPipelineError {
  item?: any;
  index?: number;
  field?: string;
  message: string;
  code?: string;
  severity: 'error' | 'warning';
}

// ================================
// Core Pipeline Class
// ================================

export class ValidationPipeline<TInput = any, TOutput = any> {
  private name: string;
  private schema: z.ZodSchema<TOutput>;
  private options: ValidationPipelineOptions;
  private stages: Array<(data: any) => any> = [];

  constructor(
    name: string,
    schema: z.ZodSchema<TOutput>,
    options: ValidationPipelineOptions = {}
  ) {
    this.name = name;
    this.schema = schema;
    this.options = {
      skipOnError: true, // Default to resilient mode
      logErrors: true,
      transform: true,
      ...options
    };
  }

  /**
   * Add a preprocessing stage
   */
  addPreprocessor(fn: (data: any) => any): this {
    this.stages.push(fn);
    return this;
  }

  /**
   * Process a single item through the pipeline
   */
  async processItem(item: TInput): Promise<ValidationPipelineResult<TOutput>> {
    const startTime = Date.now();
    const errors: ValidationPipelineError[] = [];
    const warnings: string[] = [];
    
    try {
      // Run through preprocessing stages
      let processedItem = item;
      for (const stage of this.stages) {
        try {
          processedItem = await stage(processedItem);
        } catch (error) {
          if (!this.options.skipOnError) {
            throw error;
          }
          errors.push({
            item: processedItem,
            message: error instanceof Error ? error.message : 'Processing stage failed',
            severity: 'error'
          });
          
          // Skip this item
          return this.createResult(false, undefined, errors, warnings, 1, 0, 1, Date.now() - startTime);
        }
      }
      
      // Validate with schema
      const result = this.schema.safeParse(processedItem);
      
      if (!result.success) {
        const validationErrors = result.error.errors.map(e => ({
          item: processedItem,
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
          severity: 'error' as const
        }));
        
        errors.push(...validationErrors);
        
        if (this.options.logErrors) {
          console.error(`Validation failed in pipeline ${this.name}:`, validationErrors);
        }
        
        if (this.options.monitor) {
          this.options.ValidationMonitor.recordValidation(false, this.name, validationErrors);
        }
        
        if (this.options.strict) {
          throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
        }
        
        return this.createResult(false, undefined, errors, warnings, 1, 0, 1, Date.now() - startTime);
      }
      
      // Success
      if (this.options.monitor) {
        this.options.ValidationMonitor.recordValidation(true, this.name);
      }
      
      const finalResult = this.createResult(
        true, 
        result.data, 
        errors, 
        warnings, 
        1, 
        1, 
        0, 
        Date.now() - startTime
      );
      
      if (this.options.onSuccess) {
        this.options.onSuccess(finalResult);
      }
      
      return finalResult;
      
    } catch (error) {
      const errorObj: ValidationPipelineError = {
        item,
        message: error instanceof Error ? error.message : 'Unknown error',
        severity: 'error'
      };
      
      errors.push(errorObj);
      
      if (this.options.onError) {
        this.options.onError(errorObj);
      }
      
      return this.createResult(false, undefined, errors, warnings, 1, 0, 1, Date.now() - startTime);
    }
  }

  /**
   * Process multiple items through the pipeline
   */
  async processArray(items: TInput[]): Promise<ValidationPipelineResult<TOutput[]>> {
    const startTime = Date.now();
    const validItems: TOutput[] = [];
    const allErrors: ValidationPipelineError[] = [];
    const allWarnings: string[] = [];
    let skippedCount = 0;
    
    for (let i = 0; i < items.length; i++) {
      const result = await this.processItem(items[i]);
      
      if (result.success && result.data) {
        validItems.push(result.data);
      } else {
        if (this.options.skipOnError) {
          skippedCount++;
          // Add index to errors for context
          result.errors.forEach(e => {
            e.index = i;
          });
          allErrors.push(...result.errors);
        } else if (this.options.strict) {
          // In strict mode, fail the entire batch
          return this.createResult(
            false,
            [],
            result.errors,
            result.warnings,
            items.length,
            validItems.length,
            items.length - validItems.length,
            Date.now() - startTime
          );
        }
      }
      
      allWarnings.push(...result.warnings);
    }
    
    const finalResult = this.createResult(
      allErrors.length === 0 || (this.options.skipOnError && validItems.length > 0),
      validItems,
      allErrors,
      allWarnings,
      items.length,
      validItems.length,
      skippedCount,
      Date.now() - startTime
    );
    
    if (finalResult.success && this.options.onSuccess) {
      this.options.onSuccess(finalResult);
    } else if (!finalResult.success && this.options.onError) {
      allErrors.forEach(e => this.options.onError?.(e));
    }
    
    return finalResult;
  }

  /**
   * Create a validation result object
   */
  private createResult<T>(
    success: boolean,
    data: T | undefined,
    errors: ValidationPipelineError[],
    warnings: string[],
    totalItems: number,
    validItems: number,
    skippedItems: number,
    duration: number
  ): ValidationPipelineResult<T> {
    return {
      success,
      data,
      errors,
      warnings,
      metadata: {
        totalItems,
        validItems,
        invalidItems: totalItems - validItems,
        skippedItems,
        duration,
        timestamp: new Date().toISOString(),
        pipelineName: this.name
      }
    };
  }
}

// ================================
// Pre-built Pipelines
// ================================

/**
 * Database to Application pipeline
 * Validates and transforms database records to application format
 */
export function createDbToAppPipeline<TDb, TApp>(
  name: string,
  dbSchema: z.ZodSchema<TDb>,
  appSchema: z.ZodSchema<TApp>,
  transformer: (dbRecord: TDb) => TApp,
  options?: ValidationPipelineOptions
): ValidationPipeline<TDb, TApp> {
  const pipeline = new ValidationPipeline(name, appSchema, options);
  
  // Add database validation as preprocessing
  pipeline.addPreprocessor((data) => {
    const result = dbSchema.safeParse(data);
    if (!result.success) {
      throw new Error(`Database validation failed: ${result.error.message}`);
    }
    return result.data;
  });
  
  // Add transformation
  pipeline.addPreprocessor(transformer);
  
  return pipeline;
}

/**
 * Application to Database pipeline
 * Validates and transforms application data for database storage
 */
export function createAppToDbPipeline<TApp, TDb>(
  name: string,
  appSchema: z.ZodSchema<TApp>,
  dbSchema: z.ZodSchema<TDb>,
  transformer: (appData: TApp) => TDb,
  options?: ValidationPipelineOptions
): ValidationPipeline<TApp, TDb> {
  const pipeline = new ValidationPipeline(name, dbSchema, options);
  
  // Add application validation as preprocessing
  pipeline.addPreprocessor((data) => {
    const result = appSchema.safeParse(data);
    if (!result.success) {
      throw new Error(`Application validation failed: ${result.error.message}`);
    }
    return result.data;
  });
  
  // Add transformation
  pipeline.addPreprocessor(transformer);
  
  return pipeline;
}

/**
 * API Response pipeline
 * Validates and transforms API responses
 */
export function createApiResponsePipeline<TRaw, TProcessed>(
  name: string,
  responseSchema: z.ZodSchema<TProcessed>,
  options?: ValidationPipelineOptions
): ValidationPipeline<TRaw, TProcessed> {
  const pipeline = new ValidationPipeline(name, responseSchema, {
    ...options,
    skipOnError: true, // Always skip errors for API responses
  });
  
  // Add error response handling
  pipeline.addPreprocessor((data: any) => {
    if (data?.error || data?.errors) {
      console.warn(`API error in ${name}:`, data.error || data.errors);
      // Return the error data as-is for downstream handling
      return data;
    }
    return data;
  });
  
  return pipeline;
}

/**
 * User Input pipeline
 * Validates and sanitizes user input
 */
export function createUserInputPipeline<T>(
  name: string,
  schema: z.ZodSchema<T>,
  sanitizers: Array<(data: any) => any> = [],
  options?: ValidationPipelineOptions
): ValidationPipeline<any, T> {
  const pipeline = new ValidationPipeline(name, schema, {
    ...options,
    strict: false, // Never throw on user input
    logErrors: false, // Don't log user input errors to console
  });
  
  // Add sanitizers
  sanitizers.forEach(sanitizer => {
    pipeline.addPreprocessor(sanitizer);
  });
  
  // Add common sanitization
  pipeline.addPreprocessor((data) => {
    if (typeof data === 'string') {
      return data.trim();
    }
    if (typeof data === 'object' && data !== null) {
      // Recursively trim string values
      const trimmed: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          trimmed[key] = value.trim();
        } else {
          trimmed[key] = value;
        }
      }
      return trimmed;
    }
    return data;
  });
  
  return pipeline;
}

// ================================
// Pipeline Composition
// ================================

/**
 * Compose multiple pipelines into a single pipeline
 */
export function composePipelines<T1, T2, T3>(
  pipeline1: ValidationPipeline<T1, T2>,
  pipeline2: ValidationPipeline<T2, T3>
): ValidationPipeline<T1, T3> {
  const composedPipeline = new ValidationPipeline<T1, T3>(
    `${pipeline1['name']} -> ${pipeline2['name']}`,
    pipeline2['schema'],
    { ...pipeline1['options'], ...pipeline2['options'] }
  );
  
  composedPipeline.addPreprocessor(async (data: T1) => {
    const result1 = await pipeline1.processItem(data);
    if (!result1.success || !result1.data) {
      throw new Error(`Pipeline 1 failed: ${result1.errors.map(e => e.message).join(', ')}`);
    }
    
    const result2 = await pipeline2.processItem(result1.data);
    if (!result2.success || !result2.data) {
      throw new Error(`Pipeline 2 failed: ${result2.errors.map(e => e.message).join(', ')}`);
    }
    
    return result2.data;
  });
  
  return composedPipeline;
}

// ================================
// Pipeline Registry
// ================================

class PipelineRegistry {
  private pipelines = new Map<string, ValidationPipeline>();
  
  register(name: string, pipeline: ValidationPipeline): void {
    this.pipelines.set(name, pipeline);
  }
  
  get(name: string): ValidationPipeline | undefined {
    return this.pipelines.get(name);
  }
  
  has(name: string): boolean {
    return this.pipelines.has(name);
  }
  
  list(): string[] {
    return Array.from(this.pipelines.keys());
  }
}

export const pipelineRegistry = new PipelineRegistry();

// ================================
// Export Pipeline Builders
// ================================

export const ValidationPipelines = {
  create: <TInput, TOutput>(
    name: string,
    schema: z.ZodSchema<TOutput>,
    options?: ValidationPipelineOptions
  ) => new ValidationPipeline<TInput, TOutput>(name, schema, options),
  
  dbToApp: createDbToAppPipeline,
  appToDb: createAppToDbPipeline,
  apiResponse: createApiResponsePipeline,
  userInput: createUserInputPipeline,
  compose: composePipelines,
  registry: pipelineRegistry
} as const;