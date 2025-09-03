export type WorkflowState = 'draft' | 'review' | 'approved' | 'published' | 'archived';

export type CampaignStatus = 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';

export type ContentType = 'article' | 'video' | 'infographic' | 'social' | 'email' | 'landing_page';

export type TargetAudience = 'b2b' | 'b2c' | 'enterprise' | 'smb' | 'consumer';

export interface ProductContent {
  id: string;
  productId: string;
  title: string;
  description: string;
  shortDescription?: string;
  contentType: ContentType;
  workflowState: WorkflowState;
  imageUrls: string[];
  videoUrls?: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
  targetAudience: TargetAudience;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  lastModified: Date;
  createdBy: string;
  approvedBy?: string;
  version: number;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  description: string;
  status: CampaignStatus;
  startDate: Date;
  endDate?: Date;
  budget: number;
  spentBudget: number;
  targetAudience: TargetAudience[];
  channels: string[];
  goals: CampaignGoal[];
  productIds: string[];
  contentIds: string[];
  metrics: CampaignMetrics;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags: string[];
}

export interface CampaignGoal {
  type: 'impressions' | 'clicks' | 'conversions' | 'revenue' | 'engagement';
  target: number;
  current: number;
  unit: string;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roi: number;
  ctr: number;
  conversionRate: number;
  avgOrderValue?: number;
}

export interface ProductBundle {
  id: string;
  name: string;
  description: string;
  productIds: string[];
  pricing: BundlePricing;
  availability: {
    startDate?: Date;
    endDate?: Date;
    quantity?: number;
    isActive: boolean;
  };
  marketingContent: {
    headline: string;
    features: string[];
    benefits: string[];
    targetAudience: TargetAudience;
  };
  createdAt: Date;
  updatedAt: Date;
  workflowState: WorkflowState;
}

export interface BundlePricing {
  basePrice: number;
  discountType: 'percentage' | 'fixed' | 'tiered';
  discountValue: number;
  finalPrice: number;
  savingsAmount: number;
  savingsPercentage: number;
  currency: string;
  validFrom?: Date;
  validUntil?: Date;
  minQuantity?: number;
  maxQuantity?: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: Record<string, any>;
}

export interface WorkflowTransition {
  from: WorkflowState;
  to: WorkflowState;
  allowedRoles?: string[];
  requiresApproval?: boolean;
}