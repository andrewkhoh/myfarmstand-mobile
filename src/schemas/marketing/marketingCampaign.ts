import { z } from 'zod';

// Define the proper marketingCampaignSchema that matches test expectations
export const marketingCampaignSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  campaign_type: z.enum(['seasonal_sale', 'flash_sale', 'promotional', 'clearance', 'bundle']),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']),
  budget: z.object({
    total: z.number().nonnegative(),
    spent: z.number().nonnegative(),
    currency: z.string().length(3)
  }).optional(),
  target_audience: z.object({
    segments: z.array(z.string()),
    age_range: z.object({
      min: z.number().int().min(0),
      max: z.number().int().max(120)
    }).optional(),
    locations: z.array(z.string()).optional()
  }).optional(),
  discount_rules: z.object({
    type: z.enum(['percentage', 'fixed', 'bogo', 'tiered']),
    value: z.number().positive(),
    min_purchase: z.number().nonnegative().optional(),
    max_discount: z.number().positive().optional(),
    tiers: z.array(z.object({
      min_quantity: z.number().int().positive(),
      max_quantity: z.number().int().positive().optional(),
      discount_value: z.number().positive()
    })).optional()
  }).optional(),
  product_ids: z.array(z.string()).default([]).optional(),
  bundle_ids: z.array(z.string()).default([]).optional(),
  performance_metrics: z.object({
    impressions: z.number().int().nonnegative(),
    clicks: z.number().int().nonnegative(),
    conversions: z.number().int().nonnegative(),
    revenue: z.number().nonnegative(),
    ctr: z.number().min(0).max(100).optional(),
    conversion_rate: z.number().min(0).max(100).optional(),
    roi: z.number().optional()
  }).optional(),
  created_by: z.string(),
  updated_by: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional()
}).refine(
  data => new Date(data.end_date) > new Date(data.start_date),
  { 
    message: 'End date must be after start date',
    path: ['end_date']
  }
).refine(
  data => {
    if (data.discount_rules?.type === 'percentage' && data.discount_rules.value > 100) {
      return false;
    }
    return true;
  },
  {
    message: 'Percentage discount cannot exceed 100%',
    path: ['discount_rules', 'value']
  }
).refine(
  data => {
    if (data.budget && data.budget.spent > data.budget.total) {
      return false;
    }
    return true;
  },
  {
    message: 'Spent budget cannot exceed total budget',
    path: ['budget', 'spent']
  }
).refine(
  data => {
    if (data.discount_rules?.type === 'tiered' && (!data.discount_rules.tiers || data.discount_rules.tiers.length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: 'Tiered discount requires at least one tier',
    path: ['discount_rules', 'tiers']
  }
);

// Legacy schemas for backward compatibility
export const CampaignType = z.enum([
  'seasonal',
  'promotional',
  'clearance',
  'bundle'
]);

export type CampaignTypeType = z.infer<typeof CampaignType>;

export const CampaignStatus = z.enum([
  'planned',
  'active',
  'paused',
  'completed',
  'cancelled'
]);

export type CampaignStatusType = z.infer<typeof CampaignStatus>;

export const DiscountType = z.enum([
  'percentage',
  'fixed',
  'bogo',
  'tiered'
]);

export type DiscountTypeType = z.infer<typeof DiscountType>;

export const TierSchema = z.object({
  minQuantity: z.number().int().positive(),
  maxQuantity: z.number().int().positive().optional(),
  discountValue: z.number().positive()
});

export type Tier = z.infer<typeof TierSchema>;

export const CampaignRulesSchema = z.object({
  minPurchaseAmount: z.number().nonnegative().optional(),
  maxDiscountAmount: z.number().positive().optional(),
  eligibleCategories: z.array(z.string()).default([]),
  eligibleBrands: z.array(z.string()).default([]),
  excludedProducts: z.array(z.string().uuid()).default([]),
  customerSegments: z.array(z.string()).default([]),
  usageLimit: z.number().int().positive().optional(),
  usageLimitPerCustomer: z.number().int().positive().optional(),
  requiresCouponCode: z.boolean().default(false),
  couponCode: z.string().optional(),
  tiers: z.array(TierSchema).optional()
}).refine(
  data => {
    if (data.requiresCouponCode && !data.couponCode) {
      return false;
    }
    return true;
  },
  {
    message: 'Coupon code is required when requiresCouponCode is true'
  }
);

export type CampaignRules = z.infer<typeof CampaignRulesSchema>;

export const CampaignMetricsSchema = z.object({
  impressions: z.number().int().nonnegative().default(0),
  clicks: z.number().int().nonnegative().default(0),
  conversions: z.number().int().nonnegative().default(0),
  revenue: z.number().nonnegative().default(0),
  averageOrderValue: z.number().nonnegative().default(0),
  conversionRate: z.number().min(0).max(100).default(0),
  roi: z.number().default(0),
  totalDiscount: z.number().nonnegative().default(0),
  uniqueCustomers: z.number().int().nonnegative().default(0)
});

export type CampaignMetrics = z.infer<typeof CampaignMetricsSchema>;

// Base schema without refinements
const MarketingCampaignBaseSchema = z.object({
  id: z.string().uuid({ message: 'Campaign ID must be a valid UUID' }),
  name: z.string()
    .min(1, { message: 'Campaign name is required' })
    .max(100, { message: 'Campaign name must not exceed 100 characters' }),
  type: CampaignType,
  status: CampaignStatus,
  description: z.string()
    .max(500, { message: 'Description must not exceed 500 characters' })
    .optional(),
  startDate: z.string().datetime({ message: 'Start date must be in ISO datetime format' }),
  endDate: z.string().datetime({ message: 'End date must be in ISO datetime format' }),
  discountType: DiscountType,
  discountValue: z.number().positive({ message: 'Discount value must be positive' }),
  targetProducts: z.array(z.string().uuid())
    .min(1, { message: 'At least one target product is required' })
    .default([]),
  rules: CampaignRulesSchema,
  metrics: CampaignMetricsSchema.default({}),
  budget: z.number().positive().optional(),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Apply refinements to the main schema
export const MarketingCampaignSchema = MarketingCampaignBaseSchema.refine(
  data => new Date(data.endDate) > new Date(data.startDate),
  {
    message: 'End date must be after start date',
    path: ['endDate']
  }
).refine(
  data => {
    if (data.discountType === 'percentage' && data.discountValue > 100) {
      return false;
    }
    return true;
  },
  {
    message: 'Percentage discount cannot exceed 100%',
    path: ['discountValue']
  }
).refine(
  data => {
    if (data.discountType === 'tiered' && (!data.rules.tiers || data.rules.tiers.length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: 'Tiered discount requires at least one tier',
    path: ['rules', 'tiers']
  }
);

export type MarketingCampaign = z.infer<typeof MarketingCampaignSchema>;

// Use base schema for create/update schemas
export const MarketingCampaignCreateSchema = MarketingCampaignBaseSchema.omit({
  id: true,
  metrics: true,
  createdAt: true,
  updatedAt: true
}).extend({
  status: CampaignStatus.default('planned')
});

export type MarketingCampaignCreate = z.infer<typeof MarketingCampaignCreateSchema>;

export const MarketingCampaignUpdateSchema = MarketingCampaignBaseSchema.partial().required({
  id: true
});

export type MarketingCampaignUpdate = z.infer<typeof MarketingCampaignUpdateSchema>;

export const CampaignPerformanceSchema = z.object({
  campaignId: z.string().uuid(),
  period: z.enum(['daily', 'weekly', 'monthly', 'total']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  metrics: CampaignMetricsSchema
});

export type CampaignPerformance = z.infer<typeof CampaignPerformanceSchema>;