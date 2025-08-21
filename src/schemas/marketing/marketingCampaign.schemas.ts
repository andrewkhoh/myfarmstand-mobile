// Phase 3: Marketing Campaign Schemas Implementation (GREEN Phase)
// Following docs/architectural-patterns-and-best-practices.md
// Pattern: Database-first validation + transformation schemas + TypeScript return annotations

import { z } from 'zod';

// Import workflow constants from database mock types
import { 
  CAMPAIGN_TYPE_OPTIONS, 
  CAMPAIGN_STATUS_OPTIONS,
  VALID_CAMPAIGN_TRANSITIONS 
} from './__contracts__/database-mock.types';

// Phase 1: Database-First Validation
// Raw database schema validation - must match database structure exactly
export const MarketingCampaignDatabaseSchema = z.object({
  id: z.string(),
  campaign_name: z.string().min(1, 'Campaign name is required').max(255, 'Campaign name cannot exceed 255 characters'),
  campaign_type: z.enum(CAMPAIGN_TYPE_OPTIONS),
  description: z.string().nullable(),
  start_date: z.string().datetime('Start date must be a valid ISO datetime'),
  end_date: z.string().datetime('End date must be a valid ISO datetime'),
  discount_percentage: z.number().min(0, 'Discount percentage cannot be negative').max(100, 'Discount percentage cannot exceed 100').nullable(),
  target_audience: z.string().nullable(),
  campaign_status: z.enum(CAMPAIGN_STATUS_OPTIONS),
  created_by: z.string().nullable(),
  created_at: z.string().datetime().nullable().optional(),
  updated_at: z.string().datetime().nullable().optional()
}).strict().refine(
  (data) => {
    // Business rule: end_date must be after start_date
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    return endDate > startDate;
  },
  {
    message: 'End date must be after start date',
    path: ['end_date']
  }
).refine(
  (data) => {
    // Business rule: Active campaigns must have discount percentage if promotional
    if (data.campaign_status === 'active' && data.campaign_type === 'promotional') {
      return data.discount_percentage !== null && data.discount_percentage > 0;
    }
    return true;
  },
  {
    message: 'Active promotional campaigns must have a positive discount percentage',
    path: ['discount_percentage']
  }
).refine(
  (data) => {
    // Business rule: Clearance campaigns must have high discount (>= 25%)
    if (data.campaign_type === 'clearance' && data.discount_percentage !== null) {
      return data.discount_percentage >= 25;
    }
    return true;
  },
  {
    message: 'Clearance campaigns must have at least 25% discount',
    path: ['discount_percentage']
  }
);

// Export database contract type (compile-time enforcement)
export type MarketingCampaignDatabaseContract = z.infer<typeof MarketingCampaignDatabaseSchema>;

// Phase 2: Transformation Schema (Database → Application Format)
// TypeScript return annotation ensures complete field coverage
export const MarketingCampaignTransformSchema = MarketingCampaignDatabaseSchema.transform((data): MarketingCampaignTransform => ({
  id: data.id,
  campaignName: data.campaign_name,
  campaignType: data.campaign_type,
  description: data.description,
  startDate: data.start_date,
  endDate: data.end_date,
  discountPercentage: data.discount_percentage,
  targetAudience: data.target_audience,
  campaignStatus: data.campaign_status,
  createdBy: data.created_by,
  createdAt: data.created_at,
  updatedAt: data.updated_at
}));

// Export transformation contract type (compile-time enforcement)
export interface MarketingCampaignTransform {
  id: string;
  campaignName: string;
  campaignType: 'seasonal' | 'promotional' | 'new_product' | 'clearance';
  description: string | null;
  startDate: string;
  endDate: string;
  discountPercentage: number | null;
  targetAudience: string | null;
  campaignStatus: 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// Phase 3: Create Schema (Application → Database Format)
// For new campaign creation operations
export const CreateMarketingCampaignSchema = z.object({
  campaignName: z.string().min(1, 'Campaign name is required').max(255, 'Campaign name cannot exceed 255 characters'),
  campaignType: z.enum(CAMPAIGN_TYPE_OPTIONS),
  description: z.string().optional(),
  startDate: z.string().datetime('Start date must be a valid ISO datetime'),
  endDate: z.string().datetime('End date must be a valid ISO datetime'),
  discountPercentage: z.number().min(0, 'Discount percentage cannot be negative').max(100, 'Discount percentage cannot exceed 100').optional(),
  targetAudience: z.string().optional(),
  campaignStatus: z.enum(CAMPAIGN_STATUS_OPTIONS).default('planned')
}).strict().refine(
  (data) => {
    // Business rule: end_date must be after start_date
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    return endDate > startDate;
  },
  {
    message: 'End date must be after start date',
    path: ['endDate']
  }
).refine(
  (data) => {
    // Business rule: Promotional campaigns should have discount percentage
    if (data.campaignType === 'promotional') {
      return data.discountPercentage !== undefined && data.discountPercentage > 0;
    }
    return true;
  },
  {
    message: 'Promotional campaigns must have a positive discount percentage',
    path: ['discountPercentage']
  }
).refine(
  (data) => {
    // Business rule: Clearance campaigns must have high discount (>= 25%)
    if (data.campaignType === 'clearance' && data.discountPercentage !== undefined) {
      return data.discountPercentage >= 25;
    }
    return true;
  },
  {
    message: 'Clearance campaigns must have at least 25% discount',
    path: ['discountPercentage']
  }
).refine(
  (data) => {
    // Business rule: Campaign dates must be in the future for new campaigns
    const startDate = new Date(data.startDate);
    const now = new Date();
    // Allow some grace period for immediate campaigns (5 minutes)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    return startDate >= fiveMinutesAgo;
  },
  {
    message: 'Campaign start date must not be in the past',
    path: ['startDate']
  }
);

// Phase 4: Update Schema (Partial Application → Database Format)
// For campaign update operations - all fields optional
export const UpdateMarketingCampaignSchema = z.object({
  campaignName: z.string().min(1, 'Campaign name is required').max(255, 'Campaign name cannot exceed 255 characters').optional(),
  campaignType: z.enum(CAMPAIGN_TYPE_OPTIONS).optional(),
  description: z.string().optional(),
  startDate: z.string().datetime('Start date must be a valid ISO datetime').optional(),
  endDate: z.string().datetime('End date must be a valid ISO datetime').optional(),
  discountPercentage: z.number().min(0, 'Discount percentage cannot be negative').max(100, 'Discount percentage cannot exceed 100').optional(),
  targetAudience: z.string().optional(),
  campaignStatus: z.enum(CAMPAIGN_STATUS_OPTIONS).optional()
}).strict().refine(
  (data) => {
    // Business rule: If both dates provided, end_date must be after start_date
    if (data.startDate && data.endDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      return endDate > startDate;
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['endDate']
  }
).refine(
  (data) => {
    // Business rule: If changing to promotional, must have discount
    if (data.campaignType === 'promotional') {
      return data.discountPercentage !== undefined && data.discountPercentage > 0;
    }
    return true;
  },
  {
    message: 'Promotional campaigns must have a positive discount percentage',
    path: ['discountPercentage']
  }
);

// Campaign Lifecycle State Machine Helpers
export const CampaignLifecycleHelpers = {
  /**
   * Validates if a campaign status transition is allowed
   */
  canTransitionTo(fromStatus: string, toStatus: string): boolean {
    const validTransitions = VALID_CAMPAIGN_TRANSITIONS[fromStatus];
    return validTransitions ? validTransitions.includes(toStatus) : false;
  },

  /**
   * Gets all valid transitions from a given status
   */
  getValidTransitions(fromStatus: string): string[] {
    return VALID_CAMPAIGN_TRANSITIONS[fromStatus] || [];
  },

  /**
   * Validates if campaign can be activated
   */
  canActivate(campaign: Partial<MarketingCampaignTransform>): boolean {
    if (!campaign.campaignStatus || campaign.campaignStatus !== 'planned') {
      return false;
    }
    
    // Must have valid dates
    if (!campaign.startDate || !campaign.endDate) {
      return false;
    }
    
    const startDate = new Date(campaign.startDate);
    const endDate = new Date(campaign.endDate);
    const now = new Date();
    
    // Start date must be within reasonable range (not too far past)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return startDate >= oneDayAgo && endDate > now;
  },

  /**
   * Validates if campaign is currently active based on dates
   */
  isCurrentlyActive(campaign: Partial<MarketingCampaignTransform>): boolean {
    if (campaign.campaignStatus !== 'active') {
      return false;
    }
    
    if (!campaign.startDate || !campaign.endDate) {
      return false;
    }
    
    const startDate = new Date(campaign.startDate);
    const endDate = new Date(campaign.endDate);
    const now = new Date();
    
    return now >= startDate && now <= endDate;
  },

  /**
   * Validates campaign status against business rules
   */
  validateCampaignStatus(status: string): boolean {
    return CAMPAIGN_STATUS_OPTIONS.includes(status as any);
  },

  /**
   * Checks if campaign has expired based on end date
   */
  hasExpired(campaign: Partial<MarketingCampaignTransform>): boolean {
    if (!campaign.endDate) {
      return false;
    }
    
    const endDate = new Date(campaign.endDate);
    const now = new Date();
    
    return now > endDate;
  }
};

// Performance Metrics Integration Helper
export const CampaignMetricsHelpers = {
  /**
   * Calculates campaign duration in days
   */
  getDurationInDays(campaign: Partial<MarketingCampaignTransform>): number {
    if (!campaign.startDate || !campaign.endDate) {
      return 0;
    }
    
    const startDate = new Date(campaign.startDate);
    const endDate = new Date(campaign.endDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Validates if campaign is eligible for metrics collection
   */
  isEligibleForMetrics(campaign: Partial<MarketingCampaignTransform>): boolean {
    return campaign.campaignStatus === 'active' || campaign.campaignStatus === 'completed';
  },

  /**
   * Gets expected metrics types for campaign type
   */
  getExpectedMetrics(campaignType: string): string[] {
    switch (campaignType) {
      case 'promotional':
      case 'clearance':
        return ['views', 'clicks', 'conversions', 'revenue'];
      case 'seasonal':
        return ['views', 'clicks', 'conversions', 'revenue'];
      case 'new_product':
        return ['views', 'clicks', 'conversions'];
      default:
        return ['views', 'clicks'];
    }
  }
};

// Export helper types for service and hook layers
export type CreateMarketingCampaignInput = z.infer<typeof CreateMarketingCampaignSchema>;
export type UpdateMarketingCampaignInput = z.infer<typeof UpdateMarketingCampaignSchema>;

// Campaign status type constants for type safety
export const CampaignStatus = {
  PLANNED: 'planned' as const,
  ACTIVE: 'active' as const,
  PAUSED: 'paused' as const,
  COMPLETED: 'completed' as const,
  CANCELLED: 'cancelled' as const
} as const;

export type CampaignStatusType = typeof CampaignStatus[keyof typeof CampaignStatus];

// Campaign type constants for type safety
export const CampaignType = {
  SEASONAL: 'seasonal' as const,
  PROMOTIONAL: 'promotional' as const,
  NEW_PRODUCT: 'new_product' as const,
  CLEARANCE: 'clearance' as const
} as const;

export type CampaignTypeType = typeof CampaignType[keyof typeof CampaignType];