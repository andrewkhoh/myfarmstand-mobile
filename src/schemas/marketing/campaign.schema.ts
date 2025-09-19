import { z } from 'zod';
import type { MarketingCampaign, CampaignStatus, CampaignMetrics, CampaignGoal } from '../../types/marketing.types';
import { ValidationMonitor } from '../../utils/monitoring';

// Database schema - matches database.generated.ts exactly
const RawDatabaseCampaignSchema = z.object({
  id: z.string(),
  campaign_name: z.string(),
  campaign_status: z.string(),
  campaign_type: z.string(),
  description: z.string().nullable(),
  start_date: z.string(),
  end_date: z.string(),
  discount_percentage: z.number().nullable(),
  target_audience: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  created_by: z.string().nullable(),
});

// Transform database format to application format
export const CampaignSchema = RawDatabaseCampaignSchema.transform((data): MarketingCampaign => {
  // Parse target audience JSON
  let targetAudience: string[] = [];
  if (data.target_audience) {
    try {
      targetAudience = JSON.parse(data.target_audience);
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'CampaignSchema.transform',
        errorMessage: 'Failed to parse target_audience JSON',
        errorCode: 'TARGET_AUDIENCE_PARSE_ERROR'
      });
    }
  }

  return {
    id: data.id,
    name: data.campaign_name,
    description: data.description || '',
    status: (data.campaign_status as CampaignStatus) || 'planning',
    startDate: new Date(data.start_date),
    endDate: new Date(data.end_date),
    budget: 0, // Not yet in database, using default
    spentBudget: 0, // Not yet in database, using default
    targetAudience: targetAudience as string[],
    channels: [], // Not yet in database, using default
    goals: [], // Not yet in database, using default
    productIds: [], // Retrieved via separate query if needed
    contentIds: [], // Retrieved via separate query if needed
    metrics: {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      roi: 0,
      ctr: 0,
      conversionRate: 0,
    }, // Metrics calculated on-demand via getCampaignMetrics
    createdAt: new Date(data.created_at || new Date().toISOString()),
    updatedAt: new Date(data.updated_at || new Date().toISOString()),
    createdBy: data.created_by || '',
    tags: [], // Not yet in database, using default
  };
});

// Input schema for creating/updating campaigns
export const CampaignInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: z.enum(['planning', 'active', 'paused', 'completed', 'cancelled']).default('planning'),
  startDate: z.date(),
  endDate: z.date().optional(),
  budget: z.number().positive().optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  targetAudience: z.array(z.enum(['b2b', 'b2c', 'enterprise', 'smb', 'consumer'])).optional(),
  channels: z.array(z.string()).optional(),
  productIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
}).refine(
  (data) => !data.endDate || data.endDate > data.startDate,
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
);

// Contract validation
type CampaignContract = z.infer<typeof CampaignSchema>;
type InterfaceMatch = CampaignContract extends MarketingCampaign ? true : false;
const _typeCheck: InterfaceMatch = true; // Will cause TypeScript error if schemas don't match

export type Campaign = z.infer<typeof CampaignSchema>;
export type CampaignInput = z.infer<typeof CampaignInputSchema>;