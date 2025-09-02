import { z } from 'zod';

// Content Types and Statuses
export const ContentType = z.enum(['article', 'video', 'infographic', 'social', 'email']);
export type ContentType = z.infer<typeof ContentType>;

export const ContentStatus = z.enum(['draft', 'in_review', 'approved', 'scheduled', 'published', 'archived']);
export type ContentStatus = z.infer<typeof ContentStatus>;

// Campaign Types and Statuses
export const CampaignStatus = z.enum(['planned', 'active', 'paused', 'completed', 'archived']);
export type CampaignStatus = z.infer<typeof CampaignStatus>;

export const CampaignChannel = z.enum(['email', 'social', 'web', 'mobile', 'print', 'tv', 'radio']);
export type CampaignChannel = z.infer<typeof CampaignChannel>;

// Image Schema
export const imageSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  alt: z.string(),
  caption: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional()
});

// SEO Schema
export const seoSchema = z.object({
  metaTitle: z.string().max(60),
  metaDescription: z.string().max(160),
  keywords: z.array(z.string()).optional(),
  ogImage: z.string().url().optional(),
  canonicalUrl: z.string().url().optional()
});

// Content Metrics Schema
export const contentMetricsSchema = z.object({
  views: z.number().default(0),
  shares: z.number().default(0),
  conversions: z.number().default(0),
  engagementRate: z.number().optional(),
  avgTimeOnPage: z.number().optional()
});

// Content Schema
export const contentSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  type: ContentType,
  status: ContentStatus,
  body: z.string(),
  excerpt: z.string().max(500).optional(),
  author: z.string(),
  tags: z.array(z.string()).optional(),
  seo: seoSchema.optional(),
  images: z.array(imageSchema).optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
  campaigns: z.array(z.string()).optional(),
  metrics: contentMetricsSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type Content = z.infer<typeof contentSchema>;

// Target Audience Schema
export const targetAudienceSchema = z.object({
  segments: z.array(z.string()).optional(),
  demographics: z.object({
    ageRange: z.object({
      min: z.number().min(0).max(120),
      max: z.number().min(0).max(120)
    }).optional(),
    locations: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
    gender: z.array(z.enum(['male', 'female', 'other', 'prefer_not_to_say'])).optional()
  }).optional(),
  behaviors: z.object({
    purchaseHistory: z.array(z.string()).optional(),
    engagementLevel: z.enum(['low', 'medium', 'high']).optional(),
    preferredChannels: z.array(CampaignChannel).optional()
  }).optional()
});

// Campaign Metrics Schema
export const campaignMetricsSchema = z.object({
  impressions: z.number().default(0),
  clicks: z.number().default(0),
  conversions: z.number().default(0),
  revenue: z.number().default(0),
  roi: z.number().default(0),
  ctr: z.number().optional(),
  conversionRate: z.number().optional(),
  costPerAcquisition: z.number().optional()
});

// Campaign Schema
export const campaignSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  status: CampaignStatus,
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  budget: z.number().min(0).optional(),
  targetAudience: targetAudienceSchema.optional(),
  channels: z.array(CampaignChannel),
  content: z.array(z.string()).optional(),
  bundles: z.array(z.string()).optional(),
  metrics: campaignMetricsSchema.optional(),
  settings: z.object({
    autoOptimize: z.boolean().optional(),
    abTesting: z.boolean().optional(),
    frequencyCap: z.number().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional()
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
  message: "End date must be after start date",
  path: ["endDate"]
});

export type Campaign = z.infer<typeof campaignSchema>;

// Bundle Product Schema
export const bundleProductSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1),
  customization: z.object({
    color: z.string().optional(),
    size: z.string().optional(),
    variant: z.string().optional()
  }).optional()
});

// Bundle Pricing Schema
export const bundlePricingSchema = z.object({
  basePrice: z.number().min(0),
  discountPercentage: z.number().min(0).max(100).optional(),
  discountAmount: z.number().min(0).optional(),
  finalPrice: z.number().min(0),
  savings: z.number().min(0).optional(),
  currency: z.string().default('USD')
});

// Bundle Availability Schema
export const bundleAvailabilitySchema = z.object({
  inStock: z.boolean(),
  quantity: z.number().min(0),
  reservations: z.number().min(0).optional(),
  restockDate: z.string().datetime().optional(),
  maxPerCustomer: z.number().min(1).optional()
});

// Bundle Metrics Schema
export const bundleMetricsSchema = z.object({
  views: z.number().default(0),
  addedToCart: z.number().default(0),
  purchased: z.number().default(0),
  revenue: z.number().default(0),
  conversionRate: z.number().optional(),
  avgOrderValue: z.number().optional()
});

// Bundle Schema
export const bundleSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  products: z.array(bundleProductSchema).min(1),
  pricing: bundlePricingSchema,
  availability: bundleAvailabilitySchema.optional(),
  images: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
  campaigns: z.array(z.string()).optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  terms: z.string().optional(),
  metrics: bundleMetricsSchema.optional(),
  active: z.boolean(),
  featured: z.boolean().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type Bundle = z.infer<typeof bundleSchema>;

// Analytics Event Schema
export const analyticsEventSchema = z.object({
  id: z.string(),
  type: z.enum(['page_view', 'click', 'conversion', 'form_submit', 'video_play', 'download', 'share']),
  entityType: z.enum(['content', 'campaign', 'bundle']),
  entityId: z.string(),
  userId: z.string().optional(),
  sessionId: z.string(),
  properties: z.record(z.any()).optional(),
  timestamp: z.string().datetime(),
  source: z.object({
    referrer: z.string().optional(),
    utm: z.object({
      source: z.string().optional(),
      medium: z.string().optional(),
      campaign: z.string().optional(),
      term: z.string().optional(),
      content: z.string().optional()
    }).optional(),
    device: z.object({
      type: z.enum(['desktop', 'mobile', 'tablet']).optional(),
      browser: z.string().optional(),
      os: z.string().optional()
    }).optional()
  }).optional()
});

export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;

// Workflow Transition Schema
export const workflowTransitionSchema = z.object({
  from: ContentStatus,
  to: ContentStatus,
  triggeredBy: z.string(),
  reason: z.string().optional(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.any()).optional()
});

export type WorkflowTransition = z.infer<typeof workflowTransitionSchema>;

// Export all schemas
export default {
  contentSchema,
  campaignSchema,
  bundleSchema,
  imageSchema,
  seoSchema,
  contentMetricsSchema,
  targetAudienceSchema,
  campaignMetricsSchema,
  bundleProductSchema,
  bundlePricingSchema,
  bundleAvailabilitySchema,
  bundleMetricsSchema,
  analyticsEventSchema,
  workflowTransitionSchema
};