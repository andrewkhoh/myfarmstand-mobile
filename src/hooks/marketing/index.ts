// Marketing Hooks Export Index
// Clean exports for all marketing-related React Query hooks
// Following established organizational pattern

// Product Content Hooks
export {
  useProductContent,
  useContentPerformance,
  useCreateContent,
  useUpdateContent,
  useContentWorkflow,
  useContentAnalytics
} from './useProductContent';

// Marketing Campaign Hooks
export {
  useMarketingCampaigns,
  useCampaignPerformance,
  useCreateCampaign,
  useCampaignScheduling,
  useCampaignMetrics,
  useUpdateCampaignStatus
} from './useMarketingCampaigns';

// Product Bundle Hooks
export {
  useProductBundles,
  useBundlePerformance,
  useCreateBundle,
  useBundleInventoryImpact,
  useUpdateBundleProducts,
  useToggleBundleStatus,
  useBundleDiscountCalculation
} from './useProductBundles';

// Re-export centralized query key factories
export {
  contentKeys,
  campaignKeys,
  bundleKeys,
  marketingKeys
} from '../../utils/queryKeyFactory';