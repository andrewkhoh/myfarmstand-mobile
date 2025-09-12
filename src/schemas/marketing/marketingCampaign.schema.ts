import { z } from 'zod';

export const campaignTypeSchema = z.enum(['promotion', 'seasonal', 'clearance', 'new_arrival', 'loyalty']);
export const campaignStatusSchema = z.enum(['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled']);

export const marketingCampaignSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  type: campaignTypeSchema,
  status: campaignStatusSchema,
  startDate: z.date(),
  endDate: z.date(),
  budget: z.number().positive().nullable().default(null),
  targetAudience: z.object({
    segments: z.array(z.string()).default([]),
    filters: z.record(z.string(), z.any()).default({})
  }).default({}),
  channels: z.array(z.enum(['email', 'sms', 'push', 'social', 'web'])).default([]),
  content: z.object({
    headline: z.string().max(100),
    body: z.string().max(5000),
    cta: z.string().max(50).optional(),
    images: z.array(z.string().url()).default([])
  }),
  metrics: z.object({
    impressions: z.number().int().nonnegative().default(0),
    clicks: z.number().int().nonnegative().default(0),
    conversions: z.number().int().nonnegative().default(0),
    revenue: z.number().nonnegative().default(0)
  }).default({}),
  discount: z.number().min(0).max(100).nullable().default(null),
  productIds: z.array(z.string().uuid()).default([]),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const marketingCampaignTransform = marketingCampaignSchema.transform((data) => {
  if (data.discount && data.discount > 50) {
    throw new Error('Discount cannot exceed 50%');
  }
  
  if (data.endDate <= data.startDate) {
    throw new Error('End date must be after start date');
  }
  
  return data;
});

export type MarketingCampaign = z.infer<typeof marketingCampaignSchema>;
export type MarketingCampaignInput = z.input<typeof marketingCampaignSchema>;
export type CampaignType = z.infer<typeof campaignTypeSchema>;
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;