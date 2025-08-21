// Phase 4: Business Metrics Schemas Implementation (GREEN Phase)
// Following docs/architectural-patterns-and-best-practices.md
// Pattern: Database-first validation + transformation schemas + TypeScript return annotations

import { z } from 'zod';

// Metric Category Constants
export const METRIC_CATEGORIES = ['inventory', 'marketing', 'sales', 'operational', 'strategic'] as const;
export const AGGREGATION_LEVELS = ['daily', 'weekly', 'monthly', 'quarterly'] as const;

// Phase 1: Database-First Validation
// Raw database schema validation - must match database structure exactly
export const BusinessMetricsDatabaseSchema = z.object({
  id: z.string(),
  metric_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  metric_category: z.enum(METRIC_CATEGORIES),
  metric_name: z.string().min(1, 'Metric name cannot be empty').max(255, 'Metric name too long'),
  metric_value: z.number().finite('Metric value must be a finite number'),
  metric_unit: z.string().max(50, 'Metric unit too long').nullable(),
  aggregation_level: z.enum(AGGREGATION_LEVELS),
  source_data_type: z.string().min(1, 'Source data type cannot be empty'),
  correlation_factors: z.record(z.any()).nullable(), // JSONB field
  created_at: z.string().datetime().nullable().optional(),
  updated_at: z.string().datetime().nullable().optional()
}).strict().refine(
  (data) => {
    // Business rule: correlation_factors must be valid JSON object when present
    if (data.correlation_factors !== null) {
      try {
        // Ensure it's a proper object (not array or primitive)
        return typeof data.correlation_factors === 'object' && !Array.isArray(data.correlation_factors);
      } catch {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Correlation factors must be a valid JSON object',
    path: ['correlation_factors']
  }
).refine(
  (data) => {
    // Business rule: metric_value constraints based on metric_unit
    if (data.metric_unit === 'percentage') {
      return data.metric_value >= 0 && data.metric_value <= 100;
    }
    if (data.metric_unit === 'ratio') {
      return data.metric_value >= 0;
    }
    if (data.metric_unit === 'currency') {
      return data.metric_value >= 0;
    }
    return true;
  },
  {
    message: 'Metric value out of valid range for specified unit',
    path: ['metric_value']
  }
);

// Phase 2: Transformation Interface (explicit definition to avoid circular references)
// Following Phase 1, 2, 3 architectural pattern
export interface BusinessMetricsTransform {
  id: string;
  metricDate: string;
  metricCategory: typeof METRIC_CATEGORIES[number];
  metricName: string;
  metricValue: number;
  metricUnit: string | null;
  aggregationLevel: typeof AGGREGATION_LEVELS[number];
  sourceDataType: string;
  correlationFactors: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

// Phase 2: Transformation Schema (snake_case → camelCase)
// Following architectural pattern: transformation with null-safe defaults
export const BusinessMetricsTransformSchema = BusinessMetricsDatabaseSchema.transform((data): BusinessMetricsTransform => {
  return {
    id: data.id,
    metricDate: data.metric_date,                                     // Snake → camel
    metricCategory: data.metric_category,                             // Snake → camel
    metricName: data.metric_name,                                     // Snake → camel
    metricValue: data.metric_value,                                   // Snake → camel
    metricUnit: data.metric_unit,                                     // Snake → camel, preserve null
    aggregationLevel: data.aggregation_level,                         // Snake → camel
    sourceDataType: data.source_data_type,                           // Snake → camel
    correlationFactors: data.correlation_factors,                     // Snake → camel, preserve null
    createdAt: data.created_at || new Date().toISOString(),          // Snake → camel, with default
    updatedAt: data.updated_at || new Date().toISOString()           // Snake → camel, with default
  };
});

// Phase 3: Creation Schema
// For creating new business metrics (excludes generated/managed fields)
export const CreateBusinessMetricsSchema = z.object({
  metric_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  metric_category: z.enum(METRIC_CATEGORIES),
  metric_name: z.string().min(1, 'Metric name required').max(255, 'Metric name too long'),
  metric_value: z.number().finite('Metric value must be finite'),
  metric_unit: z.string().max(50, 'Metric unit too long').nullable().optional(),
  aggregation_level: z.enum(AGGREGATION_LEVELS),
  source_data_type: z.string().min(1, 'Source data type required'),
  correlation_factors: z.record(z.any()).nullable().optional()
}).strict().refine(
  (data) => {
    // Same validation rules as database schema
    if (data.metric_unit === 'percentage') {
      return data.metric_value >= 0 && data.metric_value <= 100;
    }
    if (data.metric_unit === 'ratio') {
      return data.metric_value >= 0;
    }
    if (data.metric_unit === 'currency') {
      return data.metric_value >= 0;
    }
    return true;
  },
  {
    message: 'Metric value out of valid range for specified unit',
    path: ['metric_value']
  }
);

// Phase 4: Update Schema
// For updating existing business metrics (all fields optional except validation constraints)
export const UpdateBusinessMetricsSchema = z.object({
  metric_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  metric_category: z.enum(METRIC_CATEGORIES).optional(),
  metric_name: z.string().min(1, 'Metric name cannot be empty').max(255, 'Metric name too long').optional(),
  metric_value: z.number().finite('Metric value must be finite').optional(),
  metric_unit: z.string().max(50, 'Metric unit too long').nullable().optional(),
  aggregation_level: z.enum(AGGREGATION_LEVELS).optional(),
  source_data_type: z.string().min(1, 'Source data type cannot be empty').optional(),
  correlation_factors: z.record(z.any()).nullable().optional()
}).strict().refine(
  (data) => {
    // Same validation rules as database schema, but only when fields are present
    if (data.metric_unit === 'percentage' && data.metric_value !== undefined) {
      return data.metric_value >= 0 && data.metric_value <= 100;
    }
    if (data.metric_unit === 'ratio' && data.metric_value !== undefined) {
      return data.metric_value >= 0;
    }
    if (data.metric_unit === 'currency' && data.metric_value !== undefined) {
      return data.metric_value >= 0;
    }
    return true;
  },
  {
    message: 'Metric value out of valid range for specified unit',
    path: ['metric_value']
  }
);

// Type Exports
export type BusinessMetricsDatabaseContract = z.infer<typeof BusinessMetricsDatabaseSchema>;
export type CreateBusinessMetricsContract = z.infer<typeof CreateBusinessMetricsSchema>;
export type UpdateBusinessMetricsContract = z.infer<typeof UpdateBusinessMetricsSchema>;

// Constants Export
export const BUSINESS_METRICS_CONSTANTS = {
  CATEGORIES: METRIC_CATEGORIES,
  AGGREGATION_LEVELS,
  VALID_UNITS: ['currency', 'percentage', 'count', 'ratio'] as const
} as const;