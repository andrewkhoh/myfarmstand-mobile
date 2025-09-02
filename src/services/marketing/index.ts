export { contentService } from './contentService';
export { campaignService } from './campaignService';
export { bundleService } from './bundleService';

export const marketingKeys = {
  content: ['content'] as const,
  campaigns: ['campaigns'] as const,
  bundles: ['bundles'] as const,
  all: ['marketing'] as const
};