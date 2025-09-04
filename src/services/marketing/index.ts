// Service exports
export { ContentWorkflowService } from './contentWorkflow.service';
export { ProductBundleService } from './productBundle.service';
export { MarketingCampaignService } from './marketingCampaign.service';
export { MarketingAnalyticsService } from './marketingAnalytics.service';

// Type exports
export type { User, TransitionOptions } from './contentWorkflow.service';
export type { BundleFilters, PricingCalculation } from './productBundle.service';
export type { 
  CampaignFilters, 
  CampaignMetricsUpdate, 
  CampaignPerformance 
} from './marketingCampaign.service';
export type {
  AnalyticsTimeRange,
  CampaignAnalytics,
  BundleAnalytics,
  ContentAnalytics,
  RevenueMetrics,
  ChannelPerformance
} from './marketingAnalytics.service';

// Error exports
export {
  ServiceError,
  DatabaseError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError
} from './errors/ServiceError';