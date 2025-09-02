import { z } from 'zod';

export const CampaignType = z.enum(['seasonal', 'promotional', 'clearance', 'bundle']);
export const CampaignStatus = z.enum(['planned', 'active', 'paused', 'completed', 'cancelled']);
export const DiscountType = z.enum(['percentage', 'fixed', 'bogo', 'tiered']);

export type CampaignTypeEnum = z.infer<typeof CampaignType>;
export type CampaignStatusEnum = z.infer<typeof CampaignStatus>;
export type DiscountTypeEnum = z.infer<typeof DiscountType>;

export const CampaignRulesSchema = z.object({
  minimumPurchase: z.number().nonnegative().optional(),
  maximumDiscount: z.number().positive().optional(),
  customerSegments: z.array(z.string()).optional(),
  excludedProducts: z.array(z.string().uuid()).optional(),
  stackable: z.boolean().default(false),
  usageLimit: z.number().int().positive().optional(),
  perCustomerLimit: z.number().int().positive().optional()
});

export type CampaignRules = z.infer<typeof CampaignRulesSchema>;

export const CampaignMetricsSchema = z.object({
  views: z.number().int().nonnegative().default(0),
  clicks: z.number().int().nonnegative().default(0),
  conversions: z.number().int().nonnegative().default(0),
  revenue: z.number().nonnegative().default(0),
  averageOrderValue: z.number().nonnegative().default(0),
  returnOnInvestment: z.number().default(0)
});

export type CampaignMetrics = z.infer<typeof CampaignMetricsSchema>;

export const TieredDiscountSchema = z.object({
  threshold: z.number().positive(),
  discount: z.number().positive()
});

export type TieredDiscount = z.infer<typeof TieredDiscountSchema>;

const MarketingCampaignBaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: CampaignType,
  status: CampaignStatus,
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  discountType: DiscountType,
  discountValue: z.number().positive(),
  tieredDiscounts: z.array(TieredDiscountSchema).optional(),
  targetProducts: z.array(z.string().uuid()),
  rules: CampaignRulesSchema,
  metrics: CampaignMetricsSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().uuid()
});

export const MarketingCampaignSchema = MarketingCampaignBaseSchema.refine(
  data => new Date(data.endDate) > new Date(data.startDate),
  { 
    message: "End date must be after start date",
    path: ['endDate']
  }
).refine(
  data => data.discountType === 'percentage' ? data.discountValue <= 100 : true,
  { 
    message: "Percentage discount cannot exceed 100%",
    path: ['discountValue']
  }
).refine(
  data => {
    if (data.discountType === 'tiered' && (!data.tieredDiscounts || data.tieredDiscounts.length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: "Tiered discount type requires at least one tier",
    path: ['tieredDiscounts']
  }
);

export type MarketingCampaign = z.infer<typeof MarketingCampaignSchema>;

export const MarketingCampaignCreateSchema = MarketingCampaignBaseSchema.omit({
  id: true,
  metrics: true,
  createdAt: true,
  updatedAt: true
}).extend({
  status: z.literal('planned')
}).refine(
  data => new Date(data.endDate) > new Date(data.startDate),
  { 
    message: "End date must be after start date",
    path: ['endDate']
  }
).refine(
  data => data.discountType === 'percentage' ? data.discountValue <= 100 : true,
  { 
    message: "Percentage discount cannot exceed 100%",
    path: ['discountValue']
  }
);

export type MarketingCampaignCreate = z.infer<typeof MarketingCampaignCreateSchema>;

export const MarketingCampaignUpdateSchema = MarketingCampaignBaseSchema.partial().required({
  id: true
});

export type MarketingCampaignUpdate = z.infer<typeof MarketingCampaignUpdateSchema>;

const campaignStatusTransitions: Record<CampaignStatusEnum, CampaignStatusEnum[]> = {
  planned: ['active', 'cancelled'],
  active: ['paused', 'completed', 'cancelled'],
  paused: ['active', 'cancelled'],
  completed: [],
  cancelled: []
};

export const validateCampaignStatusTransition = (
  currentStatus: CampaignStatusEnum,
  nextStatus: CampaignStatusEnum
): boolean => {
  return campaignStatusTransitions[currentStatus]?.includes(nextStatus) ?? false;
};

export const CampaignStatusTransitionSchema = z.object({
  campaignId: z.string().uuid(),
  currentStatus: CampaignStatus,
  nextStatus: CampaignStatus,
  reason: z.string().optional()
}).refine(
  data => validateCampaignStatusTransition(data.currentStatus, data.nextStatus),
  {
    message: "Invalid campaign status transition",
    path: ['nextStatus']
  }
);