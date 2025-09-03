import { z } from 'zod';
import { MarketingCampaign, CampaignStatus, ValidationResult } from '../../types/marketing.types';

export const campaignStatusSchema = z.enum(['planning', 'active', 'paused', 'completed', 'cancelled']);

export const targetAudienceSchema = z.enum(['b2b', 'b2c', 'enterprise', 'smb', 'consumer']);

export const campaignGoalSchema = z.object({
  type: z.enum(['impressions', 'clicks', 'conversions', 'revenue', 'engagement']),
  target: z.number().positive(),
  current: z.number().min(0),
  unit: z.string().min(1)
});

export const campaignMetricsSchema = z.object({
  impressions: z.number().min(0),
  clicks: z.number().min(0),
  conversions: z.number().min(0),
  revenue: z.number().min(0),
  roi: z.number(),
  ctr: z.number().min(0).max(1),
  conversionRate: z.number().min(0).max(1),
  avgOrderValue: z.number().min(0).optional()
});

export const marketingCampaignSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  status: campaignStatusSchema,
  startDate: z.date(),
  endDate: z.date().optional(),
  budget: z.number().min(0),
  spentBudget: z.number().min(0),
  targetAudience: z.array(targetAudienceSchema),
  channels: z.array(z.string()),
  goals: z.array(campaignGoalSchema),
  productIds: z.array(z.string()),
  contentIds: z.array(z.string()),
  metrics: campaignMetricsSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().min(1),
  tags: z.array(z.string())
}).refine((data) => data.spentBudget <= data.budget, {
  message: 'Spent budget cannot exceed total budget',
  path: ['spentBudget']
}).refine((data) => !data.endDate || data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate']
});

export const marketingCampaignTransform = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  status: campaignStatusSchema,
  startDate: z.union([z.date(), z.string()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  endDate: z.union([z.date(), z.string(), z.null()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ).optional().nullable(),
  budget: z.number().min(0),
  spentBudget: z.number().min(0),
  targetAudience: z.union([z.array(targetAudienceSchema), z.null()]).transform(val => val || []),
  channels: z.union([z.array(z.string()), z.null()]).transform(val => val || []),
  goals: z.union([z.array(campaignGoalSchema), z.null()]).transform(val => val || []),
  productIds: z.union([z.array(z.string()), z.null()]).transform(val => val || []),
  contentIds: z.union([z.array(z.string()), z.null()]).transform(val => val || []),
  metrics: campaignMetricsSchema,
  createdAt: z.union([z.date(), z.string()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  updatedAt: z.union([z.date(), z.string()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  createdBy: z.string().min(1),
  tags: z.union([z.array(z.string()), z.null()]).transform(val => val || [])
}).transform((data) => ({
  ...data,
  endDate: data.endDate || undefined
})).refine((data) => data.spentBudget <= data.budget, {
  message: 'Spent budget cannot exceed total budget',
  path: ['spentBudget']
}).refine((data) => !data.endDate || data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate']
});

export const campaignLifecycleTransitions: Record<CampaignStatus, CampaignStatus[]> = {
  planning: ['active'],
  active: ['paused', 'completed', 'cancelled'],
  paused: ['active', 'completed', 'cancelled'],
  completed: [],
  cancelled: []
};

export function validateCampaignLifecycle(
  campaign: MarketingCampaign,
  targetStatus: CampaignStatus
): ValidationResult {
  const allowedTransitions = campaignLifecycleTransitions[campaign.status];
  
  if (!allowedTransitions.includes(targetStatus)) {
    return {
      valid: false,
      error: `Cannot transition from ${campaign.status} to ${targetStatus}. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
    };
  }
  
  return { valid: true };
}