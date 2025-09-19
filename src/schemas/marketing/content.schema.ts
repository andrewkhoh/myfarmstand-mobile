import { z } from 'zod';
import type { ProductContent, WorkflowState, ContentType, TargetAudience } from '../../types/marketing.types';
import { ValidationMonitor } from '../../utils/monitoring';

// Database schema - for product_content table (matches database.generated.ts)
const RawDatabaseContentSchema = z.object({
  id: z.string(),
  product_id: z.string().nullable(),
  marketing_title: z.string().nullable(),
  marketing_description: z.string().nullable(),
  short_description: z.string().nullable(),
  content_type: z.string().nullable(),
  workflow_state: z.string().nullable(),
  featured_image_url: z.string().nullable(),
  gallery_urls: z.string().nullable(), // JSON array in database
  seo_title: z.string().nullable(),
  seo_description: z.string().nullable(),
  seo_keywords: z.string().nullable(), // JSON array in database
  target_audience: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  published_at: z.string().nullable(),
  created_by: z.string().nullable(),
  approved_by: z.string().nullable(),
  version: z.number().nullable(),
});

// Transform database format to application format
export const ContentSchema = RawDatabaseContentSchema.transform((data): ProductContent => {
  // Parse JSON fields
  let imageUrls: string[] = [];
  let videoUrls: string[] = [];
  let seoKeywords: string[] = [];

  // Handle featured image URL
  if (data.featured_image_url) {
    imageUrls = [data.featured_image_url];
  }

  if (data.gallery_urls) {
    try {
      const galleryUrls = JSON.parse(data.gallery_urls);
      imageUrls = [...imageUrls, ...galleryUrls];
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'ContentSchema.transform.galleryUrls',
        errorMessage: 'Failed to parse gallery_urls JSON',
        errorCode: 'GALLERY_URLS_PARSE_ERROR'
      });
    }
  }

  if (data.seo_keywords) {
    try {
      seoKeywords = JSON.parse(data.seo_keywords);
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'ContentSchema.transform.seoKeywords',
        errorMessage: 'Failed to parse seo_keywords JSON',
        errorCode: 'SEO_KEYWORDS_PARSE_ERROR'
      });
    }
  }

  const now = new Date();
  const createdAt = data.created_at ? new Date(data.created_at) : now;
  const updatedAt = data.updated_at ? new Date(data.updated_at) : now;

  return {
    id: data.id,
    productId: data.product_id || '',
    title: data.marketing_title || '',
    description: data.marketing_description || '',
    shortDescription: data.short_description || undefined,
    contentType: (data.content_type as ContentType) || 'article',
    workflowState: (data.workflow_state as WorkflowState) || 'draft',
    imageUrls,
    videoUrls: videoUrls.length > 0 ? videoUrls : undefined,
    seoTitle: data.seo_title || undefined,
    seoDescription: data.seo_description || undefined,
    seoKeywords,
    targetAudience: (data.target_audience as TargetAudience) || 'b2c',
    createdAt,
    updatedAt,
    publishedAt: data.published_at ? new Date(data.published_at) : undefined,
    lastModified: updatedAt, // Use updatedAt as lastModified
    createdBy: data.created_by || '',
    approvedBy: data.approved_by || undefined,
    version: data.version || 1,
  };
});

// Input schema for creating/updating content
export const ContentInputSchema = z.object({
  productId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000),
  shortDescription: z.string().max(500).optional(),
  contentType: z.enum(['article', 'video', 'infographic', 'social', 'email', 'landing_page']).default('article'),
  workflowState: z.enum(['draft', 'review', 'approved', 'published', 'archived']).default('draft'),
  imageUrls: z.array(z.string().url()).default([]),
  videoUrls: z.array(z.string().url()).optional(),
  seoTitle: z.string().max(100).optional(),
  seoDescription: z.string().max(160).optional(),
  seoKeywords: z.array(z.string()).default([]),
  targetAudience: z.enum(['b2b', 'b2c', 'enterprise', 'smb', 'consumer']).default('b2c'),
});

// Contract validation
type ContentContract = z.infer<typeof ContentSchema>;
type InterfaceMatch = ContentContract extends ProductContent ? true : false;
const _typeCheck: InterfaceMatch = true; // Will cause TypeScript error if schemas don't match

export type Content = z.infer<typeof ContentSchema>;
export type ContentInput = z.infer<typeof ContentInputSchema>;