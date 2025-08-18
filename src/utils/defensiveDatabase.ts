/**
 * Defensive Database Access Utility
 * 
 * Provides validated database access patterns that gracefully handle invalid records.
 * Prevents invalid database records from causing complete service failures.
 * 
 * Risk Level: MEDIUM - Changes data access patterns but fails gracefully
 * Strategy: Start with read-only operations, gradual migration
 */

import { z } from 'zod';
import { ValidationMonitor } from './validationMonitor';

export interface DefensiveDatabaseOptions {
  /**
   * Maximum number of validation errors to allow before treating as critical failure
   * Default: 50% of total records
   */
  maxErrorThreshold?: number;
  
  /**
   * Whether to throw on critical validation failure thresholds
   * Default: false (log and return valid records only)
   */
  throwOnCriticalFailure?: boolean;
  
  /**
   * Whether to include detailed error information in logs
   * Default: true
   */
  includeDetailedErrors?: boolean;
  
  /**
   * Timeout for database operations (milliseconds)
   * Default: 30000 (30 seconds)
   */
  timeout?: number;
}

export interface DefensiveDatabaseResult<T> {
  /**
   * Successfully validated records
   */
  validRecords: T[];
  
  /**
   * Summary of the operation
   */
  summary: {
    totalFetched: number;
    validCount: number;
    invalidCount: number;
    errorRate: number;
    isHealthy: boolean;
  };
  
  /**
   * Invalid records with error details (if enabled)
   */
  invalidRecords?: Array<{
    index: number;
    data: unknown;
    error: string;
  }>;
}

/**
 * Defensive Database Service
 * 
 * Wraps database queries with validation and graceful error handling
 */
export class DefensiveDatabase {
  private static readonly DEFAULT_OPTIONS: Required<DefensiveDatabaseOptions> = {
    maxErrorThreshold: 0.5, // 50% error rate threshold
    throwOnCriticalFailure: false,
    includeDetailedErrors: true,
    timeout: 30000
  };

  /**
   * Fetch and validate data from database with graceful error handling
   * 
   * @param query - Function that performs the database query
   * @param schema - Zod schema for validation
   * @param context - Context string for logging and monitoring
   * @param options - Configuration options
   * @returns Defensive database result with valid records and summary
   */
  static async fetchWithValidation<T>(
    query: () => Promise<any>,
    schema: z.ZodSchema<T>,
    context: string,
    options: DefensiveDatabaseOptions = {}
  ): Promise<DefensiveDatabaseResult<T>> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    
    try {
      // Execute query with timeout
      const rawData = await Promise.race([
        query(),
        this.createTimeoutPromise(opts.timeout, context)
      ]);
      
      return await this.validateAndProcessRecords(
        rawData,
        schema,
        context,
        opts,
        startTime
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log database operation failure
      ValidationMonitor.recordValidationError({
        context: `DefensiveDatabase.${context}`,
        errorMessage: error instanceof Error ? error.message : 'Database query failed',
        errorCode: 'DATABASE_QUERY_FAILED'
      });
      
      console.error(`Database query failed for ${context}:`, {
        error: error instanceof Error ? error.message : String(error),
        duration,
        timestamp: new Date().toISOString()
      });
      
      // Return empty result instead of throwing
      return {
        validRecords: [],
        summary: {
          totalFetched: 0,
          validCount: 0,
          invalidCount: 0,
          errorRate: 1.0,
          isHealthy: false
        }
      };
    }
  }

  /**
   * Fetch single record with validation
   */
  static async fetchSingleWithValidation<T>(
    query: () => Promise<any>,
    schema: z.ZodSchema<T>,
    context: string,
    options: DefensiveDatabaseOptions = {}
  ): Promise<T | null> {
    const result = await this.fetchWithValidation(query, schema, context, options);
    
    if (result.validRecords.length === 0) {
      return null;
    }
    
    if (result.validRecords.length > 1) {
      console.warn(`Expected single record for ${context}, got ${result.validRecords.length}. Using first record.`);
    }
    
    return result.validRecords[0];
  }

  /**
   * Process and validate records from raw database response
   */
  private static async validateAndProcessRecords<T>(
    rawData: any,
    schema: z.ZodSchema<T>,
    context: string,
    options: Required<DefensiveDatabaseOptions>,
    startTime: number
  ): Promise<DefensiveDatabaseResult<T>> {
    // Handle different response formats
    const records = this.extractRecordsFromResponse(rawData);
    const totalFetched = records.length;
    
    if (totalFetched === 0) {
      return {
        validRecords: [],
        summary: {
          totalFetched: 0,
          validCount: 0,
          invalidCount: 0,
          errorRate: 0,
          isHealthy: true
        }
      };
    }
    
    const validRecords: T[] = [];
    const invalidRecords: Array<{ index: number; data: unknown; error: string }> = [];
    
    // Validate each record
    for (let index = 0; index < records.length; index++) {
      const record = records[index];
      
      try {
        const validatedRecord = schema.parse(record);
        validRecords.push(validatedRecord);
      } catch (error) {
        const errorMessage = error instanceof z.ZodError 
          ? this.formatZodError(error)
          : error instanceof Error 
            ? error.message 
            : 'Unknown validation error';
        
        // Record validation error for monitoring
        ValidationMonitor.recordValidationError({
          context: `${context}[${index}]`,
          errorMessage,
          errorCode: 'RECORD_VALIDATION_FAILED'
        });
        
        // Store invalid record details if enabled
        if (options.includeDetailedErrors) {
          invalidRecords.push({
            index,
            data: record,
            error: errorMessage
          });
        }
        
        // Log invalid record (with data sampling for large datasets)
        if (invalidRecords.length <= 10 || index % Math.ceil(totalFetched / 10) === 0) {
          console.warn(`Invalid record in ${context}[${index}]:`, {
            error: errorMessage,
            recordId: this.extractRecordId(record),
            sampleData: this.sanitizeForLogging(record)
          });
        }
      }
    }
    
    const invalidCount = invalidRecords.length;
    const validCount = validRecords.length;
    const errorRate = totalFetched > 0 ? invalidCount / totalFetched : 0;
    const isHealthy = errorRate <= options.maxErrorThreshold;
    const duration = Date.now() - startTime;
    
    // Log operation summary
    const summary = {
      totalFetched,
      validCount,
      invalidCount,
      errorRate,
      isHealthy
    };
    
    console.info(`Defensive database operation completed for ${context}:`, {
      ...summary,
      duration,
      timestamp: new Date().toISOString()
    });
    
    // Handle critical failure scenarios
    if (!isHealthy) {
      const criticalMessage = `High validation error rate in ${context}: ${(errorRate * 100).toFixed(1)}% (${invalidCount}/${totalFetched})`;
      
      ValidationMonitor.recordDataQualityIssue({
        type: 'inconsistent_data',
        description: criticalMessage,
        severity: 'critical',
        affectedEntity: context
      });
      
      if (options.throwOnCriticalFailure) {
        throw new Error(criticalMessage);
      } else {
        console.error(criticalMessage);
      }
    }
    
    const result: DefensiveDatabaseResult<T> = {
      validRecords,
      summary
    };
    
    if (options.includeDetailedErrors && invalidRecords.length > 0) {
      result.invalidRecords = invalidRecords;
    }
    
    return result;
  }

  /**
   * Extract records array from various database response formats
   */
  private static extractRecordsFromResponse(rawData: any): unknown[] {
    // Handle Supabase response format
    if (rawData && typeof rawData === 'object') {
      if (Array.isArray(rawData.data)) {
        return rawData.data;
      }
      if (Array.isArray(rawData)) {
        return rawData;
      }
      if (rawData.data && typeof rawData.data === 'object') {
        return [rawData.data];
      }
    }
    
    // Handle direct array responses
    if (Array.isArray(rawData)) {
      return rawData;
    }
    
    // Handle single object responses
    if (rawData && typeof rawData === 'object') {
      return [rawData];
    }
    
    console.warn('Unexpected database response format:', typeof rawData);
    return [];
  }

  /**
   * Format Zod validation errors for human readable logging
   */
  private static formatZodError(error: z.ZodError): string {
    const issues = error.issues.slice(0, 3); // Limit to first 3 issues
    const formattedIssues = issues.map(issue => 
      `${issue.path.join('.')}: ${issue.message}`
    );
    
    const summary = formattedIssues.join('; ');
    const remaining = error.issues.length - issues.length;
    
    return remaining > 0 
      ? `${summary} (and ${remaining} more issues)`
      : summary;
  }

  /**
   * Extract a record identifier for logging purposes
   */
  private static extractRecordId(record: any): string {
    if (!record || typeof record !== 'object') {
      return 'unknown';
    }
    
    // Try common ID field names
    const idFields = ['id', 'uuid', 'primary_key', 'pk', 'key'];
    for (const field of idFields) {
      if (record[field]) {
        return String(record[field]);
      }
    }
    
    // Try name fields as fallback
    const nameFields = ['name', 'title', 'email', 'username'];
    for (const field of nameFields) {
      if (record[field]) {
        return String(record[field]);
      }
    }
    
    return 'no-id';
  }

  /**
   * Sanitize record data for safe logging (remove sensitive fields)
   */
  private static sanitizeForLogging(record: any): any {
    if (!record || typeof record !== 'object') {
      return record;
    }
    
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'auth', 'private',
      'email', 'phone', 'address', 'ssn', 'credit_card'
    ];
    
    const sanitized: any = {};
    const keys = Object.keys(record).slice(0, 5); // Limit fields in logs
    
    for (const key of keys) {
      const isSensitive = sensitiveFields.some(field => 
        key.toLowerCase().includes(field)
      );
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = record[key];
      }
    }
    
    return sanitized;
  }

  /**
   * Create timeout promise for database operations
   */
  private static createTimeoutPromise(timeoutMs: number, context: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Database operation ${context} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }
}

/**
 * Convenience wrapper for common database operations
 */
export const DatabaseHelpers = {
  /**
   * Fetch all records with validation (commonly used pattern)
   */
  async fetchAll<T>(
    tableName: string,
    schema: z.ZodSchema<T>,
    query: () => Promise<any>,
    options?: DefensiveDatabaseOptions
  ): Promise<T[]> {
    const result = await DefensiveDatabase.fetchWithValidation(
      query,
      schema,
      `fetchAll.${tableName}`,
      options
    );
    
    return result.validRecords;
  },

  /**
   * Fetch single record by ID with validation
   */
  async fetchById<T>(
    tableName: string,
    id: string,
    schema: z.ZodSchema<T>,
    query: () => Promise<any>,
    options?: DefensiveDatabaseOptions
  ): Promise<T | null> {
    return await DefensiveDatabase.fetchSingleWithValidation(
      query,
      schema,
      `fetchById.${tableName}.${id}`,
      options
    );
  },

  /**
   * Fetch with filtering and validation
   */
  async fetchFiltered<T>(
    tableName: string,
    filterDescription: string,
    schema: z.ZodSchema<T>,
    query: () => Promise<any>,
    options?: DefensiveDatabaseOptions
  ): Promise<T[]> {
    const result = await DefensiveDatabase.fetchWithValidation(
      query,
      schema,
      `fetchFiltered.${tableName}.${filterDescription}`,
      options
    );
    
    return result.validRecords;
  }
};