// Phase 3: Product Content Schemas Implementation (GREEN Phase)
// Following docs/architectural-patterns-and-best-practices.md
// Pattern: Database-first validation + transformation schemas + TypeScript return annotations

import { z } from 'zod';

// Import workflow constants from database mock types
import { 
  CONTENT_STATUS_OPTIONS, 
  VALID_CONTENT_TRANSITIONS 
} from './__contracts__/database-mock.types';

// Phase 1: Database-First Validation
// Raw database schema validation - must match database structure exactly
export const ProductContentDatabaseSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  marketing_title: z.string().max(255, 'Marketing title cannot exceed 255 characters').nullable(),
  marketing_description: z.string().nullable(),
  marketing_highlights: z.array(z.string()).nullable(),
  seo_keywords: z.array(z.string()).nullable(),
  featured_image_url: z.string().max(500, 'Image URL cannot exceed 500 characters').url('Must be a valid URL').nullable(),
  gallery_urls: z.array(z.string().url('Must be a valid URL')).nullable(),
  content_status: z.enum(CONTENT_STATUS_OPTIONS),
  content_priority: z.number().int().min(1, 'Priority must be between 1 and 5').max(5, 'Priority must be between 1 and 5').nullable().default(1),
  last_updated_by: z.string().nullable(),
  created_at: z.string().datetime().nullable().optional(),
  updated_at: z.string().datetime().nullable().optional()
}).strict().refine(
  (data) => {
    // Business rule: Featured image URL must be HTTPS for security
    if (data.featured_image_url && !data.featured_image_url.startsWith('https://')) {
      return false;
    }
    return true;
  },
  {
    message: 'Featured image URL must use HTTPS for security',
    path: ['featured_image_url']
  }
).refine(
  (data) => {
    // Business rule: Gallery URLs must all be HTTPS
    if (data.gallery_urls) {
      return data.gallery_urls.every(url => url.startsWith('https://'));
    }
    return true;
  },
  {
    message: 'All gallery URLs must use HTTPS for security',
    path: ['gallery_urls']
  }
).refine(
  (data) => {
    // Business rule: Published content must have marketing title
    if (data.content_status === 'published' && !data.marketing_title) {
      return false;
    }
    return true;
  },
  {
    message: 'Published content must have a marketing title',
    path: ['marketing_title']
  }
);

// Export database contract type (compile-time enforcement)
export type ProductContentDatabaseContract = z.infer<typeof ProductContentDatabaseSchema>;

// Phase 2: Transformation Schema (Database → Application Format)
// TypeScript return annotation ensures complete field coverage
export const ProductContentTransformSchema = ProductContentDatabaseSchema.transform((data): ProductContentTransform => ({
  id: data.id,
  productId: data.product_id,
  marketingTitle: data.marketing_title,
  marketingDescription: data.marketing_description,
  marketingHighlights: data.marketing_highlights,
  seoKeywords: data.seo_keywords,
  featuredImageUrl: data.featured_image_url,
  galleryUrls: data.gallery_urls,
  contentStatus: data.content_status,
  contentPriority: data.content_priority,
  lastUpdatedBy: data.last_updated_by,
  createdAt: data.created_at,
  updatedAt: data.updated_at
}));

// Export transformation contract type (compile-time enforcement)
export interface ProductContentTransform {
  id: string;
  productId: string;
  marketingTitle: string | null;
  marketingDescription: string | null;
  marketingHighlights: string[] | null;
  seoKeywords: string[] | null;
  featuredImageUrl: string | null;
  galleryUrls: string[] | null;
  contentStatus: 'draft' | 'review' | 'approved' | 'published';
  contentPriority: number | null;
  lastUpdatedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// Phase 3: Create Schema (Application → Database Format)
// For new content creation operations
export const CreateProductContentSchema = z.object({
  productId: z.string(),
  marketingTitle: z.string().max(255, 'Marketing title cannot exceed 255 characters').optional(),
  marketingDescription: z.string().optional(),
  marketingHighlights: z.array(z.string()).optional(),
  seoKeywords: z.array(z.string()).optional(),
  featuredImageUrl: z.string().max(500, 'Image URL cannot exceed 500 characters').url('Must be a valid URL').optional(),
  galleryUrls: z.array(z.string().url('Must be a valid URL')).optional(),
  contentStatus: z.enum(CONTENT_STATUS_OPTIONS).default('draft'),
  contentPriority: z.number().int().min(1, 'Priority must be between 1 and 5').max(5, 'Priority must be between 1 and 5').default(1)
}).strict().refine(
  (data) => {
    // Business rule: Featured image URL must be HTTPS for security
    if (data.featuredImageUrl && !data.featuredImageUrl.startsWith('https://')) {
      return false;
    }
    return true;
  },
  {
    message: 'Featured image URL must use HTTPS for security',
    path: ['featuredImageUrl']
  }
).refine(
  (data) => {
    // Business rule: Gallery URLs must all be HTTPS
    if (data.galleryUrls) {
      return data.galleryUrls.every(url => url.startsWith('https://'));
    }
    return true;
  },
  {
    message: 'All gallery URLs must use HTTPS for security',
    path: ['galleryUrls']
  }
);

// Phase 4: Update Schema (Partial Application → Database Format)
// For content update operations - all fields optional
export const UpdateProductContentSchema = z.object({
  marketingTitle: z.string().max(255, 'Marketing title cannot exceed 255 characters').optional(),
  marketingDescription: z.string().optional(),
  marketingHighlights: z.array(z.string()).optional(),
  seoKeywords: z.array(z.string()).optional(),
  featuredImageUrl: z.string().max(500, 'Image URL cannot exceed 500 characters').url('Must be a valid URL').optional(),
  galleryUrls: z.array(z.string().url('Must be a valid URL')).optional(),
  contentStatus: z.enum(CONTENT_STATUS_OPTIONS).optional(),
  contentPriority: z.number().int().min(1, 'Priority must be between 1 and 5').max(5, 'Priority must be between 1 and 5').optional()
}).strict().refine(
  (data) => {
    // Business rule: Featured image URL must be HTTPS for security
    if (data.featuredImageUrl && !data.featuredImageUrl.startsWith('https://')) {
      return false;
    }
    return true;
  },
  {
    message: 'Featured image URL must use HTTPS for security',
    path: ['featuredImageUrl']
  }
).refine(
  (data) => {
    // Business rule: Gallery URLs must all be HTTPS
    if (data.galleryUrls) {
      return data.galleryUrls.every(url => url.startsWith('https://'));
    }
    return true;
  },
  {
    message: 'All gallery URLs must use HTTPS for security',
    path: ['galleryUrls']
  }
);

// Content Workflow State Machine Helpers
export const ContentWorkflowHelpers = {
  /**
   * Validates if a content status transition is allowed
   */
  canTransitionTo(fromStatus: string, toStatus: string): boolean {
    const validTransitions = VALID_CONTENT_TRANSITIONS[fromStatus];
    return validTransitions ? validTransitions.includes(toStatus) : false;
  },

  /**
   * Gets all valid transitions from a given status
   */
  getValidTransitions(fromStatus: string): string[] {
    return VALID_CONTENT_TRANSITIONS[fromStatus] || [];
  },

  /**
   * Validates if content is ready to be published
   */
  isPublishable(content: Partial<ProductContentTransform>): boolean {
    // Must have marketing title to be publishable
    return Boolean(content.marketingTitle && content.marketingTitle.trim().length > 0);
  },

  /**
   * Validates content status against business rules
   */
  validateContentStatus(status: string): boolean {
    return CONTENT_STATUS_OPTIONS.includes(status as any);
  }
};

// Export helper types for service and hook layers
export type CreateProductContentInput = z.infer<typeof CreateProductContentSchema>;
export type UpdateProductContentInput = z.infer<typeof UpdateProductContentSchema>;

// Content status type constants for type safety
export const ContentStatus = {
  DRAFT: 'draft' as const,
  REVIEW: 'review' as const,
  APPROVED: 'approved' as const,
  PUBLISHED: 'published' as const
} as const;

export type ContentStatusType = typeof ContentStatus[keyof typeof ContentStatus];