// Export all marketing schemas from a single location
export * from './campaign.schema';
export * from './content.schema';
export * from './bundle.schema';

// Keep legacy exports for backward compatibility (to be removed later)
export * from './productContent.schema';
export * from './marketingCampaign.schema';
export * from './productBundle.schema';

// Re-export types from marketing.types for convenience
export type {
  WorkflowState,
  CampaignStatus,
  ContentType,
  TargetAudience,
  ProductContent,
  MarketingCampaign,
  CampaignGoal,
  CampaignMetrics,
  ProductBundle,
  BundlePricing,
} from '../../types/marketing.types';