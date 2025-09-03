import { z } from 'zod';

// Date validation utilities
export const DateRangeSchema = z.object({
  startDate: z.string().datetime({ message: 'Start date must be in ISO datetime format' }),
  endDate: z.string().datetime({ message: 'End date must be in ISO datetime format' })
}).refine(
  data => new Date(data.endDate) > new Date(data.startDate),
  {
    message: 'End date must be after start date',
    path: ['endDate']
  }
);

export type DateRange = z.infer<typeof DateRangeSchema>;

// Discount validation
export const DiscountSchema = z.object({
  type: z.enum(['percentage', 'fixed', 'bogo', 'buyXgetY']),
  value: z.number().positive(),
  minPurchase: z.number().positive().optional(),
  maxDiscount: z.number().positive().optional(),
  code: z.string().optional()
}).refine(
  data => {
    if (data.type === 'percentage' && data.value > 100) {
      return false;
    }
    return true;
  },
  {
    message: 'Percentage discount cannot exceed 100%',
    path: ['value']
  }
);

export type Discount = z.infer<typeof DiscountSchema>;

// Price validation
export const PriceSchema = z.object({
  amount: z.number().positive({ message: 'Price must be positive' }),
  currency: z.string().length(3, { message: 'Currency must be 3-letter ISO code' }).default('USD'),
  displayPrice: z.string().optional()
});

export type Price = z.infer<typeof PriceSchema>;

// Pagination
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  total: z.number().int().nonnegative().optional(),
  hasNext: z.boolean().optional(),
  hasPrevious: z.boolean().optional()
});

export type Pagination = z.infer<typeof PaginationSchema>;

// Sort options
export const SortSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']).default('asc')
});

export type Sort = z.infer<typeof SortSchema>;

// Address schema
export const AddressSchema = z.object({
  street: z.string().min(1).max(255),
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(50),
  postalCode: z.string().min(3).max(20),
  country: z.string().length(2, { message: 'Country must be 2-letter ISO code' })
});

export type Address = z.infer<typeof AddressSchema>;

// Contact information
export const ContactSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number' }).optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100)
});

export type Contact = z.infer<typeof ContactSchema>;

// SEO metadata
export const SEOMetadataSchema = z.object({
  title: z.string().min(1).max(60, { message: 'SEO title should be under 60 characters' }),
  description: z.string().min(1).max(160, { message: 'SEO description should be under 160 characters' }),
  keywords: z.array(z.string()).max(10).default([]),
  ogTitle: z.string().max(60).optional(),
  ogDescription: z.string().max(160).optional(),
  ogImage: z.string().url().optional(),
  canonicalUrl: z.string().url().optional()
});

export type SEOMetadata = z.infer<typeof SEOMetadataSchema>;

// Status tracking
export const StatusHistorySchema = z.object({
  status: z.string(),
  changedAt: z.string().datetime(),
  changedBy: z.string().uuid(),
  reason: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export type StatusHistory = z.infer<typeof StatusHistorySchema>;

// Audit fields
export const AuditFieldsSchema = z.object({
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedBy: z.string().uuid().optional(),
  updatedAt: z.string().datetime(),
  deletedBy: z.string().uuid().optional(),
  deletedAt: z.string().datetime().optional()
});

export type AuditFields = z.infer<typeof AuditFieldsSchema>;

// UUID validation helper
export const UUIDSchema = z.string().uuid({ message: 'Invalid UUID format' });

// URL validation with HTTPS requirement
export const SecureURLSchema = z.string()
  .url({ message: 'Invalid URL format' })
  .refine(
    url => url.startsWith('https://'),
    { message: 'URL must use HTTPS protocol' }
  );

// Email list validation
export const EmailListSchema = z.array(
  z.string().email({ message: 'Invalid email in list' })
).min(1, { message: 'At least one email is required' });

// Slug validation
export const SlugSchema = z.string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens'
  })
  .min(1)
  .max(100);

// Version validation
export const VersionSchema = z.object({
  major: z.number().int().nonnegative(),
  minor: z.number().int().nonnegative(),
  patch: z.number().int().nonnegative(),
  prerelease: z.string().optional(),
  build: z.string().optional()
});

export type Version = z.infer<typeof VersionSchema>;

// Coordinate validation
export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export type Coordinates = z.infer<typeof CoordinatesSchema>;

// Time zone validation
export const TimeZoneSchema = z.string().refine(
  tz => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid time zone' }
);

// Color validation (hex)
export const ColorSchema = z.string().regex(
  /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  { message: 'Invalid hex color format' }
);

// File size validation helper
export function createFileSizeSchema(maxSizeMB: number) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return z.number()
    .int()
    .positive()
    .max(maxSizeBytes, { message: `File size must not exceed ${maxSizeMB}MB` });
}

// Date range validation helper
export function createDateRangeSchema(minDays?: number, maxDays?: number) {
  return DateRangeSchema.refine(
    data => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      if (minDays && diffDays < minDays) return false;
      if (maxDays && diffDays > maxDays) return false;
      return true;
    },
    {
      message: minDays && maxDays 
        ? `Date range must be between ${minDays} and ${maxDays} days`
        : minDays 
        ? `Date range must be at least ${minDays} days`
        : `Date range must not exceed ${maxDays} days`
    }
  );
}