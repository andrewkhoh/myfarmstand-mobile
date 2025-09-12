import { z } from 'zod';

export const workflowStateSchema = z.enum(['draft', 'review', 'approved', 'published']);

export const productContentSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000),
  shortDescription: z.string().max(500).optional(),
  features: z.array(z.string()).default([]),
  specifications: z.record(z.string(), z.any()).default({}),
  images: z.array(z.object({
    url: z.string().url(),
    alt: z.string(),
    isPrimary: z.boolean().default(false)
  })).default([]),
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional(),
  seoKeywords: z.array(z.string()).default([]),
  workflowState: workflowStateSchema,
  publishedAt: z.date().nullable().default(null),
  version: z.number().int().positive().default(1),
  history: z.array(z.object({
    from: workflowStateSchema,
    to: workflowStateSchema,
    timestamp: z.date(),
    userId: z.string().uuid().optional()
  })).default([]),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const productContentTransform = productContentSchema.transform((data) => {
  if (data.workflowState === 'published' && !data.publishedAt) {
    return { ...data, publishedAt: new Date() };
  }
  return data;
});

export type ProductContent = z.infer<typeof productContentSchema>;
export type ProductContentInput = z.input<typeof productContentSchema>;
export type WorkflowState = z.infer<typeof workflowStateSchema>;