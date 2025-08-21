// Phase 4: Predictive Analytics Schemas Implementation (GREEN Phase)
// Following docs/architectural-patterns-and-best-practices.md
// Pattern: Database-first validation + transformation schemas + TypeScript return annotations

import { z } from 'zod';

// Predictive Analytics Constants
export const FORECAST_TYPES = ['demand', 'inventory', 'revenue', 'risk'] as const;
export const MODEL_TYPES = [
  'linear_regression',
  'seasonal_decomposition', 
  'trend_analysis',
  'arima',
  'neural_network',
  'random_forest',
  'ensemble',
  'monte_carlo_simulation'
] as const;

// Phase 1: Database-First Validation
// Raw database schema validation - must match database structure exactly
export const PredictiveAnalyticsDatabaseSchema = z.object({
  id: z.string(),
  forecast_type: z.enum(FORECAST_TYPES),
  forecast_target: z.string().min(1, 'Forecast target cannot be empty').max(255, 'Forecast target too long'),
  forecast_period: z.string().regex(
    /^\[.*\)$/,
    'Invalid forecast period format (must be PostgreSQL daterange)'
  ),
  model_type: z.string().min(1, 'Model type cannot be empty').max(100, 'Model type too long'),
  forecast_values: z.record(z.any()), // JSONB NOT NULL
  confidence_intervals: z.record(z.any()).nullable(), // JSONB nullable
  model_accuracy: z.number()
    .min(0, 'Model accuracy cannot be negative')
    .max(1, 'Model accuracy cannot exceed 1.0')
    .nullable(),
  input_features: z.array(z.string()).default([]),
  generated_at: z.string().datetime().nullable().optional(),
  expires_at: z.string().datetime().nullable(),
  created_at: z.string().datetime().nullable().optional()
}).strict().refine(
  (data) => {
    // Business rule: forecast_values must be valid JSON object
    try {
      return typeof data.forecast_values === 'object' && 
             !Array.isArray(data.forecast_values) && 
             data.forecast_values !== null;
    } catch {
      return false;
    }
  },
  {
    message: 'Forecast values must be a valid JSON object',
    path: ['forecast_values']
  }
).refine(
  (data) => {
    // Business rule: confidence_intervals must be valid JSON object when present
    if (data.confidence_intervals !== null) {
      try {
        return typeof data.confidence_intervals === 'object' && 
               !Array.isArray(data.confidence_intervals);
      } catch {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Confidence intervals must be a valid JSON object',
    path: ['confidence_intervals']
  }
).refine(
  (data) => {
    // Business rule: high accuracy models should have confidence intervals
    if (data.model_accuracy && data.model_accuracy > 0.8 && !data.confidence_intervals) {
      return false;
    }
    return true;
  },
  {
    message: 'High accuracy models should include confidence intervals',
    path: ['confidence_intervals']
  }
).refine(
  (data) => {
    // Business rule: expires_at should be after generated_at
    if (data.generated_at && data.expires_at) {
      return new Date(data.expires_at) > new Date(data.generated_at);
    }
    return true;
  },
  {
    message: 'Expiration date must be after generation date',
    path: ['expires_at']
  }
).refine(
  (data) => {
    // Business rule: input_features should not be empty for complex models
    const complexModels = ['neural_network', 'random_forest', 'ensemble'];
    if (complexModels.includes(data.model_type) && data.input_features.length === 0) {
      return false;
    }
    return true;
  },
  {
    message: 'Complex models require input features',
    path: ['input_features']
  }
);

// Phase 2: Transformation Interface (explicit definition to avoid circular references)
// Following Phase 1, 2, 3 architectural pattern
export interface PredictiveAnalyticsTransform {
  id: string;
  forecastType: typeof FORECAST_TYPES[number];
  forecastTarget: string;
  forecastPeriod: string;
  modelType: string;
  forecastValues: Record<string, any>;
  confidenceIntervals: Record<string, any> | null;
  modelAccuracy: number | null;
  inputFeatures: string[];
  generatedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

// Phase 2: Transformation Schema (snake_case → camelCase)
// Following architectural pattern: transformation with null-safe defaults
export const PredictiveAnalyticsTransformSchema = PredictiveAnalyticsDatabaseSchema.transform((data): PredictiveAnalyticsTransform => {
  return {
    id: data.id,
    forecastType: data.forecast_type,                                 // Snake → camel
    forecastTarget: data.forecast_target,                             // Snake → camel
    forecastPeriod: data.forecast_period,                             // Snake → camel
    modelType: data.model_type,                                       // Snake → camel
    forecastValues: data.forecast_values,                             // Snake → camel
    confidenceIntervals: data.confidence_intervals,                   // Snake → camel, preserve null
    modelAccuracy: data.model_accuracy,                               // Snake → camel, preserve null
    inputFeatures: data.input_features,                               // Snake → camel
    generatedAt: data.generated_at,                                   // Snake → camel, preserve null
    expiresAt: data.expires_at,                                       // Snake → camel, preserve null
    createdAt: data.created_at || new Date().toISOString()           // Snake → camel, with default
  };
});

// Phase 3: Creation Schema
// For creating new predictive analytics forecasts (excludes generated/managed fields)
export const CreatePredictiveAnalyticsSchema = z.object({
  forecast_type: z.enum(FORECAST_TYPES),
  forecast_target: z.string().min(1, 'Forecast target required').max(255, 'Forecast target too long'),
  forecast_period: z.string().regex(
    /^\[.*\)$/,
    'Invalid forecast period format (must be PostgreSQL daterange)'
  ),
  model_type: z.string().min(1, 'Model type required').max(100, 'Model type too long'),
  forecast_values: z.record(z.any()), // JSONB configuration
  confidence_intervals: z.record(z.any()).nullable().optional(),
  model_accuracy: z.number()
    .min(0, 'Model accuracy cannot be negative')
    .max(1, 'Model accuracy cannot exceed 1.0')
    .nullable()
    .optional(),
  input_features: z.array(z.string()).default([]).optional(),
  expires_at: z.string().datetime().nullable().optional()
}).strict().refine(
  (data) => {
    // Same validation rules as database schema
    if (data.model_accuracy && data.model_accuracy > 0.8 && !data.confidence_intervals) {
      return false;
    }
    return true;
  },
  {
    message: 'High accuracy models should include confidence intervals',
    path: ['confidence_intervals']
  }
).refine(
  (data) => {
    const complexModels = ['neural_network', 'random_forest', 'ensemble'];
    if (complexModels.includes(data.model_type) && (!data.input_features || data.input_features.length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: 'Complex models require input features',
    path: ['input_features']
  }
);

// Phase 4: Update Schema
// For updating existing predictive analytics forecasts (all fields optional except validation constraints)
export const UpdatePredictiveAnalyticsSchema = z.object({
  forecast_type: z.enum(FORECAST_TYPES).optional(),
  forecast_target: z.string().min(1, 'Forecast target cannot be empty').max(255, 'Forecast target too long').optional(),
  forecast_period: z.string().regex(
    /^\[.*\)$/,
    'Invalid forecast period format (must be PostgreSQL daterange)'
  ).optional(),
  model_type: z.string().min(1, 'Model type cannot be empty').max(100, 'Model type too long').optional(),
  forecast_values: z.record(z.any()).optional(),
  confidence_intervals: z.record(z.any()).nullable().optional(),
  model_accuracy: z.number()
    .min(0, 'Model accuracy cannot be negative')
    .max(1, 'Model accuracy cannot exceed 1.0')
    .nullable()
    .optional(),
  input_features: z.array(z.string()).optional(),
  generated_at: z.string().datetime().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional()
}).strict().refine(
  (data) => {
    // Same validation rules as database schema, but only when fields are present
    if (data.model_accuracy && data.model_accuracy > 0.8 && data.confidence_intervals === null) {
      return false;
    }
    return true;
  },
  {
    message: 'High accuracy models should include confidence intervals',
    path: ['confidence_intervals']
  }
).refine(
  (data) => {
    if (data.generated_at && data.expires_at) {
      return new Date(data.expires_at) > new Date(data.generated_at);
    }
    return true;
  },
  {
    message: 'Expiration date must be after generation date',
    path: ['expires_at']
  }
);

// Type Exports
export type PredictiveAnalyticsDatabaseContract = z.infer<typeof PredictiveAnalyticsDatabaseSchema>;
export type CreatePredictiveAnalyticsContract = z.infer<typeof CreatePredictiveAnalyticsSchema>;
export type UpdatePredictiveAnalyticsContract = z.infer<typeof UpdatePredictiveAnalyticsSchema>;

// Constants Export
export const PREDICTIVE_ANALYTICS_CONSTANTS = {
  FORECAST_TYPES,
  MODEL_TYPES,
  MIN_ACCURACY: 0,
  MAX_ACCURACY: 1,
  HIGH_ACCURACY_THRESHOLD: 0.8,
  CONFIDENCE_LEVELS: [0.80, 0.90, 0.95, 0.99] as const,
  DEFAULT_EXPIRY_DAYS: {
    demand: 30,
    inventory: 14,
    revenue: 90,
    risk: 7
  } as const,
  STATISTICAL_METRICS: [
    'r_squared',
    'rmse',
    'mae',
    'mape',
    'aic',
    'bic',
    'log_likelihood'
  ] as const
} as const;