import { z } from 'zod';

// Generic API response schema
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => 
  z.object({
    data: dataSchema,
    success: z.boolean(),
    message: z.string().optional(),
    error: z.string().optional(),
  });

// Generic paginated response schema
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    hasMore: z.boolean(),
    totalPages: z.number().int().min(1),
  }).refine((data) => {
    // Validate pagination math
    const expectedTotalPages = Math.ceil(data.total / data.limit);
    return data.totalPages === expectedTotalPages;
  }, {
    message: "Total pages must equal ceil(total / limit)",
    path: ["totalPages"],
  }).refine((data) => {
    // Validate hasMore calculation
    const expectedHasMore = data.page < data.totalPages;
    return data.hasMore === expectedHasMore;
  }, {
    message: "hasMore must be true when page < totalPages",
    path: ["hasMore"],
  }).refine((data) => {
    // Validate data array length
    if (data.page < data.totalPages) {
      // Not the last page, should have exactly 'limit' items
      return data.data.length === data.limit;
    } else {
      // Last page, should have remaining items
      const remainingItems = data.total % data.limit;
      const expectedLength = remainingItems === 0 ? data.limit : remainingItems;
      return data.data.length === expectedLength;
    }
  }, {
    message: "Data array length must match expected items for current page",
    path: ["data"],
  });

// Data fetching state schema
export const DataStateSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema.nullable(),
    loading: z.boolean(),
    error: z.string().nullable(),
    lastFetch: z.date().optional(),
  });

// List data fetching state schema
export const ListDataStateSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    loading: z.boolean(),
    error: z.string().nullable(),
    lastFetch: z.date().optional(),
    hasMore: z.boolean().optional(),
    page: z.number().int().min(1).optional(),
  });

// Base error schema
export const BaseErrorSchema = z.object({
  message: z.string().min(1),
  userMessage: z.string().optional(),
  code: z.string().optional(),
});

// Authentication error schema
export const AuthErrorSchema = BaseErrorSchema.extend({
  type: z.enum(['authentication', 'authorization', 'validation']).optional(),
});

// Mutation error schema
export const MutationErrorSchema = BaseErrorSchema.extend({
  operationType: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Service operation result schema
export const ServiceOperationResultSchema = <T extends z.ZodTypeAny>(resultSchema: T) =>
  z.object({
    success: z.boolean(),
    data: resultSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    timestamp: z.string().optional(),
  });

// Validation error detail schema
export const ValidationErrorDetailSchema = z.object({
  field: z.string(),
  message: z.string(),
  value: z.unknown().optional(),
  code: z.string().optional(),
});

// Validation error response schema
export const ValidationErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  validationErrors: z.array(ValidationErrorDetailSchema).optional(),
  invalidData: z.unknown().optional(),
});

// Success response schema
export const SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: z.string().optional(),
  });

// Either success or error response
export const ServiceResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([
    SuccessResponseSchema(dataSchema),
    ValidationErrorResponseSchema,
  ]);

// Supabase RPC response schema
export const SupabaseRpcResponseSchema = <T extends z.ZodTypeAny>(resultSchema: T) =>
  z.object({
    data: resultSchema.nullable(),
    error: z.object({
      message: z.string(),
      details: z.string().optional(),
      hint: z.string().optional(),
      code: z.string().optional(),
    }).nullable(),
  });

// Database operation result schema
export const DbOperationResultSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema.nullable(),
    error: z.object({
      message: z.string(),
      code: z.string().optional(),
      details: z.string().optional(),
    }).nullable(),
    count: z.number().optional(),
  });

// Batch operation result schema
export const BatchOperationResultSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.boolean(),
    results: z.array(ServiceOperationResultSchema(itemSchema)),
    totalProcessed: z.number().int().min(0),
    successCount: z.number().int().min(0),
    errorCount: z.number().int().min(0),
    errors: z.array(z.string()).optional(),
  }).refine((data) => {
    // Validate counts
    return data.successCount + data.errorCount === data.totalProcessed;
  }, {
    message: "Success count + error count must equal total processed",
    path: ["totalProcessed"],
  }).refine((data) => {
    // Validate results array length
    return data.results.length === data.totalProcessed;
  }, {
    message: "Results array length must equal total processed",
    path: ["results"],
  });

// Health check response schema
export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy', 'degraded']),
  timestamp: z.string(),
  services: z.record(z.object({
    status: z.enum(['up', 'down', 'degraded']),
    responseTime: z.number().optional(),
    error: z.string().optional(),
  })),
  version: z.string().optional(),
  uptime: z.number().optional(),
});

// Cache response schema
export const CacheResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    cached: z.boolean(),
    cacheKey: z.string().optional(),
    expiresAt: z.string().optional(),
    lastModified: z.string().optional(),
  });

// Search response schema
export const SearchResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    results: z.array(itemSchema),
    query: z.string(),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    hasMore: z.boolean(),
    facets: z.record(z.array(z.object({
      value: z.string(),
      count: z.number().int().min(0),
    }))).optional(),
    searchTime: z.number().optional(),
  });

// File upload response schema
export const FileUploadResponseSchema = z.object({
  success: z.boolean(),
  file: z.object({
    id: z.string(),
    filename: z.string(),
    originalName: z.string(),
    mimeType: z.string(),
    size: z.number().int().min(0),
    url: z.string().url(),
    uploadedAt: z.string(),
  }).optional(),
  error: z.string().optional(),
});

// Export common type creators
export type ApiResponse<T> = {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
};

export type ServiceOperationResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
};

// Export types inferred from schemas
export type ValidatedBaseError = z.infer<typeof BaseErrorSchema>;
export type ValidatedAuthError = z.infer<typeof AuthErrorSchema>;
export type ValidatedMutationError = z.infer<typeof MutationErrorSchema>;
export type ValidatedValidationErrorDetail = z.infer<typeof ValidationErrorDetailSchema>;
export type ValidatedValidationErrorResponse = z.infer<typeof ValidationErrorResponseSchema>;
export type ValidatedHealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
export type ValidatedFileUploadResponse = z.infer<typeof FileUploadResponseSchema>;