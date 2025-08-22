// Phase 3: Marketing Schemas Export Index
// Clean exports for all marketing schemas, types, and helpers
// Following established pattern from Phase 1 & 2

// Import constants from specific schema files for constants
import { ContentStatus } from './productContent.schemas';
import { CampaignStatus, CampaignType } from './marketingCampaign.schemas';
import { 
  CONTENT_STATUS_OPTIONS,
  CAMPAIGN_STATUS_OPTIONS,
  CAMPAIGN_TYPE_OPTIONS,
  VALID_CONTENT_TRANSITIONS,
  VALID_CAMPAIGN_TRANSITIONS
} from './__contracts__/database-mock.types';

// Product Content Schemas and Types
export {
  ProductContentDatabaseSchema,
  ProductContentTransformSchema,
  CreateProductContentSchema,
  UpdateProductContentSchema,
  ContentWorkflowHelpers,
  ContentStatus,
  type ProductContentDatabaseContract,
  type ProductContentTransform,
  type CreateProductContentInput,
  type UpdateProductContentInput,
  type ContentStatusType,
  type FileUpload,
  type UploadProgress
} from './productContent.schemas';

// Marketing Campaign Schemas and Types
export {
  MarketingCampaignDatabaseSchema,
  MarketingCampaignTransformSchema,
  CreateMarketingCampaignSchema,
  UpdateMarketingCampaignSchema,
  CampaignLifecycleHelpers,
  CampaignMetricsHelpers,
  CampaignStatus,
  CampaignType,
  type MarketingCampaignDatabaseContract,
  type MarketingCampaignTransform,
  type CreateMarketingCampaignInput,
  type UpdateMarketingCampaignInput,
  type CampaignStatusType,
  type CampaignTypeType
} from './marketingCampaign.schemas';

// Product Bundle Schemas and Types
export {
  ProductBundleDatabaseSchema,
  ProductBundleTransformSchema,
  BundleProductDatabaseSchema,
  BundleProductTransformSchema,
  CreateProductBundleSchema,
  UpdateProductBundleSchema,
  BundleProductInputSchema,
  UpdateBundleProductsSchema,
  BundleManagementHelpers,
  BundleInventoryHelpers,
  BundleCampaignHelpers,
  type ProductBundleDatabaseContract,
  type ProductBundleTransform,
  type BundleProductDatabaseContract,
  type BundleProductTransform,
  type CreateProductBundleInput,
  type UpdateProductBundleInput,
  type BundleProductInput,
  type UpdateBundleProductsInput
} from './productBundle.schemas';

// Database Mock Types for Testing
export {
  type MockDatabase,
  type ProductContentRow,
  type ProductContentInsert,
  type ProductContentUpdate,
  type MarketingCampaignRow,
  type MarketingCampaignInsert,
  type MarketingCampaignUpdate,
  type ProductBundleRow,
  type ProductBundleInsert,
  type ProductBundleUpdate,
  type BundleProductRow,
  type BundleProductInsert,
  type BundleProductUpdate,
  type CampaignMetricRow,
  type CampaignMetricInsert,
  type CampaignMetricUpdate,
  CONTENT_STATUS_OPTIONS,
  CAMPAIGN_TYPE_OPTIONS,
  CAMPAIGN_STATUS_OPTIONS,
  METRIC_TYPE_OPTIONS,
  VALID_CONTENT_TRANSITIONS,
  VALID_CAMPAIGN_TRANSITIONS
} from './__contracts__/database-mock.types';

// Re-export common validation patterns for service layer integration
export const MarketingSchemaHelpers = {
  /**
   * Content workflow validation
   */
  Content: {
    validateStatus: (status: string) => CONTENT_STATUS_OPTIONS.includes(status as any),
    canTransition: (from: string, to: string) => {
      const validTransitions = VALID_CONTENT_TRANSITIONS[from];
      return validTransitions ? validTransitions.includes(to) : false;
    },
    isPublishable: (title?: string | null) => Boolean(title && title.trim().length > 0)
  },

  /**
   * Campaign lifecycle validation
   */
  Campaign: {
    validateStatus: (status: string) => CAMPAIGN_STATUS_OPTIONS.includes(status as any),
    validateType: (type: string) => CAMPAIGN_TYPE_OPTIONS.includes(type as any),
    canTransition: (from: string, to: string) => {
      const validTransitions = VALID_CAMPAIGN_TRANSITIONS[from];
      return validTransitions ? validTransitions.includes(to) : false;
    },
    isActive: (status: string, startDate: string, endDate: string) => {
      if (status !== 'active') return false;
      const now = new Date();
      const start = new Date(startDate);
      const end = new Date(endDate);
      return now >= start && now <= end;
    }
  },

  /**
   * Bundle management validation
   */
  Bundle: {
    validateDiscountAmount: (price: number, discount: number) => discount >= 0 && discount <= price,
    calculateSavings: (bundlePrice: number, individualTotal: number, discount?: number) => {
      const baseSavings = Math.max(0, individualTotal - bundlePrice);
      const additionalDiscount = discount || 0;
      return baseSavings + additionalDiscount;
    },
    hasMeaningfulSavings: (bundlePrice: number, individualTotal: number, discount?: number) => {
      if (individualTotal <= 0) return false;
      const finalPrice = bundlePrice - (discount || 0);
      const savings = Math.max(0, individualTotal - finalPrice);
      return (savings / individualTotal) * 100 >= 5; // Minimum 5% savings
    }
  },

  /**
   * Cross-entity validation helpers
   */
  CrossEntity: {
    validateImageUrl: (url: string) => url.startsWith('https://'),
    validatePricing: (price: number) => price > 0,
    validateDates: (startDate: string, endDate: string) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return end > start;
    }
  }
};

// Marketing entity constants for consistent usage across layers
export const MarketingConstants = {
  Content: {
    STATUS: ContentStatus,
    MAX_TITLE_LENGTH: 255,
    MAX_URL_LENGTH: 500,
    MIN_PRIORITY: 1,
    MAX_PRIORITY: 5,
    DEFAULT_PRIORITY: 1
  },
  Campaign: {
    STATUS: CampaignStatus,
    TYPE: CampaignType,
    MAX_NAME_LENGTH: 255,
    MIN_DISCOUNT: 0,
    MAX_DISCOUNT: 100,
    MIN_CLEARANCE_DISCOUNT: 25
  },
  Bundle: {
    MIN_PRICE: 0.01,
    MIN_FEATURED_PRICE: 10,
    MAX_PRODUCTS: 10,
    MIN_PRODUCTS: 1,
    DEFAULT_DISPLAY_ORDER: 100,
    MIN_SAVINGS_PERCENTAGE: 5
  }
} as const;