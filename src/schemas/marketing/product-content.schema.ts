import { z } from 'zod';

export const WorkflowState = z.enum([
  'draft',
  'review',
  'approved',
  'published',
  'archived'
]);

export type WorkflowStateType = z.infer<typeof WorkflowState>;

export const ProductContentSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(10).max(5000),
  images: z.array(z.string().url()).max(10),
  seoKeywords: z.array(z.string()).max(20),
  workflowState: WorkflowState,
  createdBy: z.string().uuid(),
  approvedBy: z.string().uuid().optional(),
  publishedAt: z.string().datetime().optional(),
  version: z.number().int().positive()
});

export type ProductContent = z.infer<typeof ProductContentSchema>;

const workflowTransitions: Record<WorkflowStateType, WorkflowStateType[]> = {
  draft: ['review'],
  review: ['approved', 'draft'],
  approved: ['published'],
  published: ['archived'],
  archived: []
};

export const validateWorkflowTransition = (
  currentState: WorkflowStateType,
  nextState: WorkflowStateType
): boolean => {
  return workflowTransitions[currentState]?.includes(nextState) ?? false;
};

export const ProductContentTransitionSchema = z.object({
  contentId: z.string().uuid(),
  currentState: WorkflowState,
  nextState: WorkflowState,
  userId: z.string().uuid(),
  comment: z.string().optional()
}).refine(
  data => validateWorkflowTransition(data.currentState, data.nextState),
  {
    message: "Invalid workflow transition",
    path: ['nextState']
  }
);

export type ProductContentTransition = z.infer<typeof ProductContentTransitionSchema>;

export const ProductContentCreateSchema = ProductContentSchema.omit({
  id: true,
  approvedBy: true,
  publishedAt: true,
  version: true
}).extend({
  workflowState: z.literal('draft')
});

export type ProductContentCreate = z.infer<typeof ProductContentCreateSchema>;

export const ProductContentUpdateSchema = ProductContentSchema.partial().required({
  id: true
});

export type ProductContentUpdate = z.infer<typeof ProductContentUpdateSchema>;