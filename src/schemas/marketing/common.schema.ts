import { z } from 'zod';

export const DateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime()
}).refine(
  data => new Date(data.endDate) > new Date(data.startDate),
  {
    message: "End date must be after start date",
    path: ['endDate']
  }
);

export type DateRange = z.infer<typeof DateRangeSchema>;

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

export type Pagination = z.infer<typeof PaginationSchema>;

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) => z.object({
  items: z.array(itemSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalItems: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean()
  })
});

export const PriceSchema = z.number().positive().refine(
  value => {
    const decimalPlaces = (value.toString().split('.')[1] || '').length;
    return decimalPlaces <= 2;
  },
  {
    message: "Price can have maximum 2 decimal places"
  }
);

export const DiscountSchema = z.object({
  type: z.enum(['percentage', 'fixed']),
  value: z.number().positive(),
  code: z.string().min(3).max(20).optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  usageLimit: z.number().int().positive().optional(),
  usageCount: z.number().int().nonnegative().default(0)
}).refine(
  data => {
    if (data.type === 'percentage') {
      return data.value <= 100;
    }
    return true;
  },
  {
    message: "Percentage discount cannot exceed 100%",
    path: ['value']
  }
).refine(
  data => new Date(data.validUntil) > new Date(data.validFrom),
  {
    message: "Valid until must be after valid from",
    path: ['validUntil']
  }
).refine(
  data => {
    if (data.usageLimit !== undefined) {
      return data.usageCount <= data.usageLimit;
    }
    return true;
  },
  {
    message: "Usage count cannot exceed usage limit",
    path: ['usageCount']
  }
);

export type Discount = z.infer<typeof DiscountSchema>;

export const MetadataSchema = z.record(
  z.string().min(1).max(50),
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);

export type Metadata = z.infer<typeof MetadataSchema>;

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  entityId: z.string().uuid(),
  entityType: z.string(),
  action: z.string(),
  userId: z.string().uuid(),
  timestamp: z.string().datetime(),
  changes: z.record(z.string(), z.object({
    old: z.any().optional(),
    new: z.any().optional()
  })).optional(),
  metadata: MetadataSchema.optional()
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.any()).optional(),
    timestamp: z.string().datetime()
  })
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const validateDateRange = (startDate: string, endDate: string, maxDays?: number): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (end <= start) return false;
  
  if (maxDays) {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= maxDays;
  }
  
  return true;
};

export const validateFutureDate = (date: string): boolean => {
  return new Date(date) > new Date();
};

export const validatePastDate = (date: string): boolean => {
  return new Date(date) < new Date();
};