import { z } from 'zod';

/**
 * Campaign Metrics Schema - Marketing campaign performance tracking
 * Following docs/architectural-patterns-and-best-practices.md
 * Pattern 2: Database-first validation + Pattern 4: Transformation with return types
 */

// Database schema (matches database.generated.ts)
const RawCampaignMetricsSchema = z.object({
  id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  metric_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  impressions: z.number().int().min(0).nullable(),
  clicks: z.number().int().min(0).nullable(),
  conversions: z.number().int().min(0).nullable(),
  revenue: z.number().min(0).nullable(),
  cost: z.number().min(0).nullable(),
  engagement_rate: z.number().min(0).max(100).nullable(), // Percentage
  click_through_rate: z.number().min(0).max(100).nullable(), // Percentage
  conversion_rate: z.number().min(0).max(100).nullable(), // Percentage
  return_on_ad_spend: z.number().min(0).nullable(), // ROAS
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Interface for transformed campaign metrics
export interface CampaignMetrics {
  id: string;
  campaignId: string;
  metricDate: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  engagementRate: number | null;
  clickThroughRate: number | null;
  conversionRate: number | null;
  returnOnAdSpend: number | null;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  costPerClick: number | null;
  costPerConversion: number | null;
  revenuePerConversion: number | null;
}

// Transform schema (snake_case → camelCase)
export const CampaignMetricsSchema = RawCampaignMetricsSchema.transform((data): CampaignMetrics => {
  const impressions = data.impressions || 0;
  const clicks = data.clicks || 0;
  const conversions = data.conversions || 0;
  const revenue = data.revenue || 0;
  const cost = data.cost || 0;

  // Calculate computed metrics
  const costPerClick = clicks > 0 ? cost / clicks : null;
  const costPerConversion = conversions > 0 ? cost / conversions : null;
  const revenuePerConversion = conversions > 0 ? revenue / conversions : null;

  return {
    id: data.id,
    campaignId: data.campaign_id,
    metricDate: data.metric_date,
    impressions,
    clicks,
    conversions,
    revenue,
    cost,
    engagementRate: data.engagement_rate,
    clickThroughRate: data.click_through_rate,
    conversionRate: data.conversion_rate,
    returnOnAdSpend: data.return_on_ad_spend,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    costPerClick,
    costPerConversion,
    revenuePerConversion,
  };
});

// Input schema for creating campaign metrics
export const CreateCampaignMetricsSchema = z.object({
  campaignId: z.string().uuid(),
  metricDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  impressions: z.number().int().min(0).default(0),
  clicks: z.number().int().min(0).default(0),
  conversions: z.number().int().min(0).default(0),
  revenue: z.number().min(0).default(0),
  cost: z.number().min(0).default(0),
  engagementRate: z.number().min(0).max(100).optional(),
  clickThroughRate: z.number().min(0).max(100).optional(),
  conversionRate: z.number().min(0).max(100).optional(),
  returnOnAdSpend: z.number().min(0).optional(),
});

// Input schema for updating campaign metrics
export const UpdateCampaignMetricsSchema = z.object({
  impressions: z.number().int().min(0).optional(),
  clicks: z.number().int().min(0).optional(),
  conversions: z.number().int().min(0).optional(),
  revenue: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  engagementRate: z.number().min(0).max(100).optional(),
  clickThroughRate: z.number().min(0).max(100).optional(),
  conversionRate: z.number().min(0).max(100).optional(),
  returnOnAdSpend: z.number().min(0).optional(),
});

export type CreateCampaignMetricsInput = z.infer<typeof CreateCampaignMetricsSchema>;
export type UpdateCampaignMetricsInput = z.infer<typeof UpdateCampaignMetricsSchema>;