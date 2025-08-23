/**
 * Base Schema Factory - Foundation for all test data factories
 * 
 * Provides common functionality for creating schema-validated test data.
 * All entity factories should extend this base class to ensure consistent
 * validation and data generation patterns.
 */

import { z } from 'zod';

export abstract class SchemaFactory<T, DbT = T> {
  protected static globalIdCounter = 1;
  protected idCounter = 1;
  protected entityName: string;

  constructor(entityName: string) {
    this.entityName = entityName;
  }

  /**
   * Get the next ID for this entity type
   */
  protected getNextId(): string {
    return `${this.entityName}-${this.idCounter++}`;
  }

  /**
   * Get the next global ID (shared across all factories)
   */
  protected static getNextGlobalId(): string {
    return `global-${this.globalIdCounter++}`;
  }

  /**
   * Reset the ID counter for this factory
   */
  reset(): void {
    this.idCounter = 1;
  }

  /**
   * Reset all ID counters globally
   */
  static resetAll(): void {
    this.globalIdCounter = 1;
  }

  /**
   * Abstract method to get the schema for validation
   */
  protected abstract getSchema(): z.ZodSchema<T>;

  /**
   * Abstract method to get the database schema for validation
   */
  protected abstract getDbSchema(): z.ZodSchema<DbT>;

  /**
   * Abstract method to get default values for the entity
   */
  protected abstract getDefaults(): T;

  /**
   * Create a valid entity that passes schema validation
   */
  create(overrides: Partial<T> = {}): T {
    const defaults = this.getDefaults();
    const entity = { ...defaults, ...overrides } as T;
    
    // Validate against schema to ensure test data is valid
    const schema = this.getSchema();
    return schema.parse(entity);
  }

  /**
   * Create a valid database entity (often with snake_case fields)
   */
  createDb(overrides: Partial<DbT> = {}): DbT {
    const entity = this.create(overrides as Partial<T>);
    const dbEntity = this.transformToDb(entity);
    
    // Apply any database-specific overrides
    const finalEntity = { ...dbEntity, ...overrides } as DbT;
    
    // Validate against database schema
    const dbSchema = this.getDbSchema();
    return dbSchema.parse(finalEntity);
  }

  /**
   * Transform entity from application format to database format
   * Override this in subclasses if transformation is needed
   */
  protected transformToDb(entity: T): DbT {
    // Default implementation assumes no transformation needed
    return entity as unknown as DbT;
  }

  /**
   * Create multiple entities
   */
  createMany(count: number, overrides: Partial<T> = {}): T[] {
    return Array.from({ length: count }, (_, i) => {
      const indexedOverrides = this.applyIndexToOverrides(overrides, i);
      return this.create(indexedOverrides);
    });
  }

  /**
   * Create multiple database entities
   */
  createManyDb(count: number, overrides: Partial<DbT> = {}): DbT[] {
    return Array.from({ length: count }, (_, i) => {
      const indexedOverrides = this.applyIndexToOverrides(overrides as Partial<T>, i);
      return this.createDb(indexedOverrides as Partial<DbT>);
    });
  }

  /**
   * Apply index to certain fields when creating multiple entities
   * Override this to customize how indices are applied
   */
  protected applyIndexToOverrides(overrides: Partial<T>, index: number): Partial<T> {
    const result = { ...overrides };
    
    // If there's a name field, append the index
    if ('name' in result && typeof result['name'] === 'string') {
      (result as any).name = `${result['name']} ${index + 1}`;
    }
    
    return result;
  }

  /**
   * Create an entity with specific validation errors for testing
   * This intentionally creates invalid data for error handling tests
   */
  createInvalid(invalidFields: Partial<T>): { data: any; errors: z.ZodError | null } {
    const defaults = this.getDefaults();
    const entity = { ...defaults, ...invalidFields };
    
    try {
      const schema = this.getSchema();
      schema.parse(entity);
      return { data: entity, errors: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { data: entity, errors: error };
      }
      throw error;
    }
  }

  /**
   * Create a minimal valid entity with only required fields
   */
  createMinimal(overrides: Partial<T> = {}): T {
    const minimalDefaults = this.getMinimalDefaults();
    return this.create({ ...minimalDefaults, ...overrides });
  }

  /**
   * Get minimal default values (only required fields)
   * Override this in subclasses to provide minimal defaults
   */
  protected getMinimalDefaults(): Partial<T> {
    // Default implementation returns empty object
    // Subclasses should override to provide minimal required fields
    return {};
  }

  /**
   * Batch create entities with different variations
   */
  createVariations(variations: Partial<T>[]): T[] {
    return variations.map(variation => this.create(variation));
  }

  /**
   * Create entity with timestamp fields set to specific values
   */
  createWithTimestamps(
    overrides: Partial<T> = {},
    timestamps?: { created?: Date | string; updated?: Date | string }
  ): T {
    const timestampOverrides: any = {};
    
    if (timestamps?.created) {
      const createdStr = typeof timestamps.created === 'string' 
        ? timestamps.created 
        : timestamps.created.toISOString();
      
      // Try both camelCase and snake_case
      if ('createdAt' in this.getDefaults()) {
        timestampOverrides.createdAt = createdStr;
      }
      if ('created_at' in this.getDefaults()) {
        timestampOverrides.created_at = createdStr;
      }
    }
    
    if (timestamps?.updated) {
      const updatedStr = typeof timestamps.updated === 'string'
        ? timestamps.updated
        : timestamps.updated.toISOString();
      
      // Try both camelCase and snake_case
      if ('updatedAt' in this.getDefaults()) {
        timestampOverrides.updatedAt = updatedStr;
      }
      if ('updated_at' in this.getDefaults()) {
        timestampOverrides.updated_at = updatedStr;
      }
    }
    
    return this.create({ ...overrides, ...timestampOverrides });
  }

  /**
   * Create a deep copy of an entity
   */
  clone(entity: T, overrides: Partial<T> = {}): T {
    const cloned = JSON.parse(JSON.stringify(entity));
    return this.create({ ...cloned, ...overrides });
  }

  /**
   * Validate an existing entity against the schema
   */
  validate(entity: T): { valid: boolean; errors?: z.ZodError } {
    try {
      const schema = this.getSchema();
      schema.parse(entity);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { valid: false, errors: error };
      }
      throw error;
    }
  }

  /**
   * Validate a database entity against the database schema
   */
  validateDb(entity: DbT): { valid: boolean; errors?: z.ZodError } {
    try {
      const schema = this.getDbSchema();
      schema.parse(entity);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { valid: false, errors: error };
      }
      throw error;
    }
  }
}

/**
 * Utility type for extracting the entity type from a factory
 */
export type FactoryEntity<F> = F extends SchemaFactory<infer T, any> ? T : never;

/**
 * Utility type for extracting the database entity type from a factory
 */
export type FactoryDbEntity<F> = F extends SchemaFactory<any, infer DbT> ? DbT : never;