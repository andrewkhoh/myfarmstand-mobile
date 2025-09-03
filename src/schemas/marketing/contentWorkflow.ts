import { z } from 'zod';

// Define workflow states enum
const WorkflowStateEnum = z.enum(['draft', 'review', 'approved', 'published', 'archived']);

// Define content types enum
const ContentTypeEnum = z.enum(['product_content', 'marketing_campaign', 'product_bundle', 'landing_page', 'email_template']);

// Define the proper contentWorkflowSchema that matches test expectations
export const contentWorkflowSchema = z.object({
  id: z.string().uuid(),
  content_id: z.string().uuid(),
  content_type: ContentTypeEnum,
  current_state: WorkflowStateEnum,
  previous_state: WorkflowStateEnum.nullable().optional(),
  transitions: z.array(z.object({
    from_state: WorkflowStateEnum.nullable(),
    to_state: WorkflowStateEnum,
    timestamp: z.string().datetime(),
    user_id: z.string(),
    notes: z.string().optional()
  })),
  assigned_to: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  deadline: z.string().datetime().optional(),
  approval_chain: z.array(z.object({
    role: z.string(),
    user_id: z.string(),
    status: z.enum(['pending', 'approved', 'rejected']),
    timestamp: z.string().datetime().nullable().optional()
  })).optional(),
  metadata: z.any().optional(),
  created_by: z.string(),
  updated_by: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional()
});

// Export type
export type ContentWorkflow = z.infer<typeof contentWorkflowSchema>;