import { z } from 'zod';
import { ProductContent, WorkflowState, ValidationResult } from '../../types/marketing.types';

export const workflowStateSchema = z.enum(['draft', 'review', 'approved', 'published', 'archived']);

export const contentTypeSchema = z.enum(['article', 'video', 'infographic', 'social', 'email', 'landing_page']);

export const targetAudienceSchema = z.enum(['b2b', 'b2c', 'enterprise', 'smb', 'consumer']);

export const productContentSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  shortDescription: z.string().optional(),
  contentType: contentTypeSchema,
  workflowState: workflowStateSchema,
  imageUrls: z.array(z.string()),
  videoUrls: z.array(z.string()).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.array(z.string()),
  targetAudience: targetAudienceSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  publishedAt: z.date().optional().nullable(),
  lastModified: z.date(),
  createdBy: z.string().min(1),
  approvedBy: z.string().optional().nullable(),
  version: z.number().int().positive()
});

export const productContentTransform = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  shortDescription: z.string().optional().nullable(),
  contentType: contentTypeSchema,
  workflowState: workflowStateSchema,
  imageUrls: z.union([z.array(z.string()), z.null()]).transform(val => val || []),
  videoUrls: z.union([z.array(z.string()), z.null()]).transform(val => val || []).optional(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  seoKeywords: z.union([z.array(z.string()), z.null()]).transform(val => val || []),
  targetAudience: targetAudienceSchema,
  createdAt: z.union([z.date(), z.string()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  updatedAt: z.union([z.date(), z.string()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  publishedAt: z.union([z.date(), z.string(), z.null()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ).optional().nullable(),
  lastModified: z.union([z.date(), z.string()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  createdBy: z.string().min(1),
  approvedBy: z.string().optional().nullable(),
  version: z.number().int().positive()
}).transform((data) => ({
  ...data,
  shortDescription: data.shortDescription || undefined,
  seoTitle: data.seoTitle || undefined,
  seoDescription: data.seoDescription || undefined,
  publishedAt: data.publishedAt || undefined,
  approvedBy: data.approvedBy || undefined,
  videoUrls: data.videoUrls || undefined
}));

export const workflowTransitions: Record<WorkflowState, WorkflowState[]> = {
  draft: ['review'],
  review: ['approved', 'draft'],
  approved: ['published', 'draft'],
  published: ['archived'],
  archived: []
};

export function validateWorkflowTransition(
  content: ProductContent,
  targetState: WorkflowState
): ValidationResult {
  const allowedTransitions = workflowTransitions[content.workflowState];
  
  if (!allowedTransitions.includes(targetState)) {
    return {
      valid: false,
      error: `Cannot transition from ${content.workflowState} to ${targetState}. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
    };
  }
  
  return { valid: true };
}