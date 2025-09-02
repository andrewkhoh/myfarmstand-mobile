export * from './product-content.schema';
export * from './marketing-campaign.schema';
export * from './product-bundle.schema';
export * from './file-upload.schema';
export * from './permissions.schema';
export * from './common.schema';

import { ProductContentSchema } from './product-content.schema';
import { MarketingCampaignSchema } from './marketing-campaign.schema';
import { ProductBundleSchema } from './product-bundle.schema';
import { FileUploadSchema } from './file-upload.schema';
import { UserPermissionsSchema } from './permissions.schema';

export const MarketingSchemas = {
  ProductContent: ProductContentSchema,
  MarketingCampaign: MarketingCampaignSchema,
  ProductBundle: ProductBundleSchema,
  FileUpload: FileUploadSchema,
  UserPermissions: UserPermissionsSchema
} as const;

export type MarketingSchemaTypes = {
  ProductContent: typeof ProductContentSchema;
  MarketingCampaign: typeof MarketingCampaignSchema;
  ProductBundle: typeof ProductBundleSchema;
  FileUpload: typeof FileUploadSchema;
  UserPermissions: typeof UserPermissionsSchema;
};