// Phase 4: Strategic Reporting Schemas Implementation (GREEN Phase)
// Following docs/architectural-patterns-and-best-practices.md
// Pattern: Database-first validation + transformation schemas + TypeScript return annotations

import { z } from 'zod';

// Strategic Reporting Constants
export const REPORT_TYPES = ['performance', 'forecast', 'correlation', 'strategic'] as const;
export const REPORT_FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly', 'on_demand'] as const;

// Phase 1: Database-First Validation
// Raw database schema validation - must match database structure exactly
export const StrategicReportingDatabaseSchema = z.object({
  id: z.string(),
  report_name: z.string().min(1, 'Report name cannot be empty').max(255, 'Report name too long'),
  report_type: z.enum(REPORT_TYPES),
  report_frequency: z.enum(REPORT_FREQUENCIES),
  report_config: z.record(z.any()), // JSONB NOT NULL
  last_generated_at: z.string().datetime().nullable(),
  next_generation_at: z.string().datetime().nullable(),
  is_automated: z.boolean().nullable().default(false),
  created_by: z.string().nullable(), // UUID reference to auth.users
  created_at: z.string().datetime().nullable().optional(),
  updated_at: z.string().datetime().nullable().optional()
}).strict().refine(
  (data) => {
    // Business rule: report_config must be valid JSON object
    try {
      // Ensure it's a proper object (not array or primitive)
      return typeof data.report_config === 'object' && 
             !Array.isArray(data.report_config) && 
             data.report_config !== null;
    } catch {
      return false;
    }
  },
  {
    message: 'Report config must be a valid JSON object',
    path: ['report_config']
  }
).refine(
  (data) => {
    // Business rule: automated reports must have scheduling information
    if (data.is_automated && !data.next_generation_at) {
      return false;
    }
    return true;
  },
  {
    message: 'Automated reports must have next generation date',
    path: ['next_generation_at']
  }
).refine(
  (data) => {
    // Business rule: on_demand reports should not be automated
    if (data.report_frequency === 'on_demand' && data.is_automated) {
      return false;
    }
    return true;
  },
  {
    message: 'On-demand reports cannot be automated',
    path: ['is_automated']
  }
).refine(
  (data) => {
    // Business rule: next_generation_at should be after last_generated_at
    if (data.last_generated_at && data.next_generation_at) {
      return new Date(data.next_generation_at) > new Date(data.last_generated_at);
    }
    return true;
  },
  {
    message: 'Next generation date must be after last generation date',
    path: ['next_generation_at']
  }
);

// Phase 2: Transformation Interface (explicit definition to avoid circular references)
// Following Phase 1, 2, 3 architectural pattern
export interface StrategicReportingTransform {
  id: string;
  reportName: string;
  reportType: typeof REPORT_TYPES[number];
  reportFrequency: typeof REPORT_FREQUENCIES[number];
  reportConfig: Record<string, any>;
  lastGeneratedAt: string | null;
  nextGenerationAt: string | null;
  isAutomated: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// Phase 2: Transformation Schema (snake_case → camelCase)
// Following architectural pattern: transformation with null-safe defaults
export const StrategicReportingTransformSchema = StrategicReportingDatabaseSchema.transform((data): StrategicReportingTransform => {
  return {
    id: data.id,
    reportName: data.report_name,                                     // Snake → camel
    reportType: data.report_type,                                     // Snake → camel
    reportFrequency: data.report_frequency,                           // Snake → camel
    reportConfig: {
      ...data.report_config,                                         // Preserve all existing config
      classification: data.report_config?.access_control?.classification // Flatten classification field
    },
    lastGeneratedAt: data.last_generated_at,                          // Snake → camel, preserve null
    nextGenerationAt: data.next_generation_at,                        // Snake → camel, preserve null
    isAutomated: data.is_automated || false,                          // Snake → camel, with default
    createdBy: data.created_by,                                       // Snake → camel, preserve null
    createdAt: data.created_at || new Date().toISOString(),          // Snake → camel, with default
    updatedAt: data.updated_at || new Date().toISOString()           // Snake → camel, with default
  };
});

// Phase 3: Creation Schema
// For creating new strategic reports (excludes generated/managed fields)
export const CreateStrategicReportingSchema = z.object({
  report_name: z.string().min(1, 'Report name required').max(255, 'Report name too long'),
  report_type: z.enum(REPORT_TYPES),
  report_frequency: z.enum(REPORT_FREQUENCIES),
  report_config: z.record(z.any()), // JSONB configuration
  next_generation_at: z.string().datetime().nullable().optional(),
  is_automated: z.boolean().default(false).optional(),
  created_by: z.string().nullable().optional()
}).strict().refine(
  (data) => {
    // Same validation rules as database schema
    if (data.is_automated && !data.next_generation_at) {
      return false;
    }
    return true;
  },
  {
    message: 'Automated reports must have next generation date',
    path: ['next_generation_at']
  }
).refine(
  (data) => {
    if (data.report_frequency === 'on_demand' && data.is_automated) {
      return false;
    }
    return true;
  },
  {
    message: 'On-demand reports cannot be automated',
    path: ['is_automated']
  }
);

// Phase 4: Update Schema
// For updating existing strategic reports (all fields optional except validation constraints)
export const UpdateStrategicReportingSchema = z.object({
  report_name: z.string().min(1, 'Report name cannot be empty').max(255, 'Report name too long').optional(),
  report_type: z.enum(REPORT_TYPES).optional(),
  report_frequency: z.enum(REPORT_FREQUENCIES).optional(),
  report_config: z.record(z.any()).optional(),
  last_generated_at: z.string().datetime().nullable().optional(),
  next_generation_at: z.string().datetime().nullable().optional(),
  is_automated: z.boolean().optional(),
  created_by: z.string().nullable().optional()
}).strict().refine(
  (data) => {
    // Same validation rules as database schema, but only when fields are present
    if (data.is_automated && data.next_generation_at === undefined) {
      return false;
    }
    return true;
  },
  {
    message: 'Automated reports must have next generation date',
    path: ['next_generation_at']
  }
).refine(
  (data) => {
    if (data.report_frequency === 'on_demand' && data.is_automated) {
      return false;
    }
    return true;
  },
  {
    message: 'On-demand reports cannot be automated',
    path: ['is_automated']
  }
).refine(
  (data) => {
    if (data.last_generated_at && data.next_generation_at) {
      return new Date(data.next_generation_at) > new Date(data.last_generated_at);
    }
    return true;
  },
  {
    message: 'Next generation date must be after last generation date',
    path: ['next_generation_at']
  }
);

// Type Exports
export type StrategicReportingDatabaseContract = z.infer<typeof StrategicReportingDatabaseSchema>;
export type CreateStrategicReportingContract = z.infer<typeof CreateStrategicReportingSchema>;
export type UpdateStrategicReportingContract = z.infer<typeof UpdateStrategicReportingSchema>;

// Constants Export
export const STRATEGIC_REPORTING_CONSTANTS = {
  REPORT_TYPES,
  REPORT_FREQUENCIES,
  MAX_REPORT_NAME_LENGTH: 255,
  DEFAULT_AUTOMATION: false,
  EXPORT_FORMATS: ['pdf', 'excel', 'csv', 'json'] as const,
  CHART_TYPES: [
    'line_chart',
    'bar_chart', 
    'pie_chart',
    'scatter_plot',
    'heatmap',
    'correlation_matrix',
    'trend_analysis',
    'forecast_chart'
  ] as const
} as const;