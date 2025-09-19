// Marketing services exports
export { CampaignService, campaignService } from './campaign.service';
export { ContentService, contentService } from './content.service';
export { BundleService, bundleService } from './bundle.service';
export { MarketingAnalyticsService, marketingAnalyticsService } from './analytics.service';
export { FileUploadService, fileUploadService } from './fileUpload.service';
export { MarketingRealtimeService, marketingRealtimeService as realtimeService } from './realtime.service';

// Re-export commonly used types
export type {
  MarketingCampaign,
  ProductContent,
  ProductBundle,
  CampaignStatus,
  WorkflowState,
  ContentType,
  TargetAudience,
  CampaignMetrics
} from '../../types/marketing.types';

// Re-export error types
export { ServiceError, ValidationError, NotFoundError, DatabaseError } from './errors/ServiceError';