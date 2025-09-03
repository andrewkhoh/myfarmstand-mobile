import { z } from 'zod';

export const WorkflowStateEnum = z.enum(['draft', 'review', 'approved', 'published', 'archived']);
export type WorkflowState = z.infer<typeof WorkflowStateEnum>;

// Define the proper productContentSchema that matches test expectations
export const productContentSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  short_description: z.string().optional(),
  workflow_state: z.enum(['draft', 'review', 'approved', 'published', 'archived']),
  media_urls: z.array(z.string().url()).optional(),
  video_urls: z.array(z.string().url()).optional(),
  thumbnail_url: z.string().url().optional(),
  seo_keywords: z.array(z.string()).optional(),
  seo_description: z.string().optional(),
  metadata: z.any().optional(),
  tags: z.array(z.string()).optional(),
  created_by: z.string(),
  updated_by: z.string().optional(),
  created_at: z.string().datetime().transform(str => new Date(str)),
  updated_at: z.string().datetime().transform(str => new Date(str)).optional(),
  published_at: z.string().datetime().nullable().optional().transform(val => val ? new Date(val) : null),
  archived_at: z.string().datetime().nullable().optional().transform(val => val ? new Date(val) : null)
}).transform(data => ({
  ...data,
  title: data.title.trim(),
  description: data.description.trim()
}));

// Legacy schemas for backward compatibility
export const SEOMetadataSchema = z.object({
  title: z.string().min(1).max(70),
  description: z.string().min(1).max(160),
  keywords: z.array(z.string()).max(10)
});

export const MarketingMaterialSchema = z.object({
  type: z.enum(['brochure', 'datasheet', 'video', 'infographic']),
  url: z.string().url(),
  title: z.string(),
  language: z.string().default('en')
});

export const ProductContentInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  features: z.array(z.string()).default([]),
  images: z.array(z.string().url()).default([]),
  productId: z.string(),
  createdBy: z.string(),
  seoMetadata: SEOMetadataSchema.optional(),
  marketingMaterials: z.array(MarketingMaterialSchema).default([])
});

export const ProductContentSchema = ProductContentInputSchema.extend({
  id: z.string(),
  workflowState: WorkflowStateEnum,
  createdAt: z.string(),
  updatedAt: z.string()
});

export type ProductContent = z.infer<typeof ProductContentSchema>;
export type ProductContentInput = z.infer<typeof ProductContentInputSchema>;
export type SEOMetadata = z.infer<typeof SEOMetadataSchema>;
export type MarketingMaterial = z.infer<typeof MarketingMaterialSchema>;

export function validateWorkflowTransition(
  currentState: WorkflowState,
  nextState: WorkflowState,
  userRole?: string
): boolean {
  const transitions: Record<WorkflowState, WorkflowState[]> = {
    draft: ['review', 'archived'],
    review: ['approved', 'draft', 'archived'],
    approved: ['published', 'review', 'archived'],
    published: ['archived', 'review'],
    archived: ['draft']
  };
  
  return transitions[currentState]?.includes(nextState) || false;
}