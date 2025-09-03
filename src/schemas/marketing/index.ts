// Export all schemas and types from marketing module

// Product Content schemas
export {
  WorkflowState,
  UserRole,
  ProductContentSchema,
  ProductContentCreateSchema,
  ProductContentUpdateSchema,
  ProductContentTransitionSchema,
  validateWorkflowTransition,
  type WorkflowStateType,
  type UserRoleType,
  type ProductContent,
  type ProductContentCreate,
  type ProductContentUpdate,
  type ProductContentTransition
} from './productContent';

// Marketing Campaign schemas
export {
  CampaignType,
  CampaignStatus,
  DiscountType,
  TierSchema,
  CampaignRulesSchema,
  CampaignMetricsSchema,
  MarketingCampaignSchema,
  MarketingCampaignCreateSchema,
  MarketingCampaignUpdateSchema,
  CampaignPerformanceSchema,
  type CampaignTypeType,
  type CampaignStatusType,
  type DiscountTypeType,
  type Tier,
  type CampaignRules,
  type CampaignMetrics,
  type MarketingCampaign,
  type MarketingCampaignCreate,
  type MarketingCampaignUpdate,
  type CampaignPerformance
} from './marketingCampaign';

// Product Bundle schemas
export {
  PricingStrategy,
  BundleAvailability,
  BundleProductSchema,
  BundleTierSchema,
  ProductBundleSchema,
  ProductBundleCreateSchema,
  ProductBundleUpdateSchema,
  BundleInventoryImpactSchema,
  BundlePriceCalculationSchema,
  type PricingStrategyType,
  type BundleAvailabilityType,
  type BundleProduct,
  type BundleTier,
  type ProductBundle,
  type ProductBundleCreate,
  type ProductBundleUpdate,
  type BundleInventoryImpact,
  type BundlePriceCalculation
} from './productBundle';

// File Upload schemas
export {
  FileType,
  UploadStatus,
  FileMetadataSchema,
  FileUploadSchema,
  FileUploadCreateSchema,
  FileUploadUrlSchema,
  BatchFileUploadSchema,
  type FileTypeType,
  type UploadStatusType,
  type FileMetadata,
  type FileUpload,
  type FileUploadCreate,
  type FileUploadUrl,
  type BatchFileUpload
} from './fileUpload';

// Permissions schemas
export {
  Permission,
  Role,
  ResourceType,
  ActionType,
  RolePermissionsSchema,
  UserPermissionsSchema,
  PermissionCheckSchema,
  PermissionGrantSchema,
  hasPermission,
  canPerformAction,
  type PermissionType,
  type RoleType,
  type ResourceTypeType,
  type ActionTypeType,
  type RolePermissions,
  type UserPermissions,
  type PermissionCheck,
  type PermissionGrant
} from './permissions';

// Common schemas and utilities
export {
  DateRangeSchema,
  DiscountSchema,
  PriceSchema,
  PaginationSchema,
  SortSchema,
  AddressSchema,
  ContactSchema,
  SEOMetadataSchema,
  StatusHistorySchema,
  AuditFieldsSchema,
  UUIDSchema,
  SecureURLSchema,
  EmailListSchema,
  SlugSchema,
  VersionSchema,
  CoordinatesSchema,
  TimeZoneSchema,
  ColorSchema,
  createFileSizeSchema,
  createDateRangeSchema,
  type DateRange,
  type Discount,
  type Price,
  type Pagination,
  type Sort,
  type Address,
  type Contact,
  type SEOMetadata,
  type StatusHistory,
  type AuditFields,
  type Version,
  type Coordinates
} from './common';

// Additional type exports for compatibility
export type MarketingContent = ProductContent;
export type CampaignFilter = {
  status?: CampaignStatusType;
  type?: CampaignTypeType;
  dateRange?: DateRange;
};
export type Product = BundleProduct;
export type WorkflowConfig = {
  states: WorkflowStateType[];
  transitions: Array<{
    from: WorkflowStateType;
    to: WorkflowStateType;
    requiredRole: UserRoleType;
  }>;
};
export type WorkflowResult = {
  success: boolean;
  newState?: WorkflowStateType;
  error?: string;
};
export type WorkflowContext = {
  currentState: WorkflowStateType;
  user: UserRoleType;
  entityId: string;
};
export type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  type: 'campaign' | 'content' | 'bundle';
  campaignId?: string;
};

// Central schema registry
export const MarketingSchemas = {
  // Product Content
  ProductContent: ProductContentSchema,
  ProductContentCreate: ProductContentCreateSchema,
  ProductContentUpdate: ProductContentUpdateSchema,
  ProductContentTransition: ProductContentTransitionSchema,
  
  // Marketing Campaign
  MarketingCampaign: MarketingCampaignSchema,
  MarketingCampaignCreate: MarketingCampaignCreateSchema,
  MarketingCampaignUpdate: MarketingCampaignUpdateSchema,
  CampaignPerformance: CampaignPerformanceSchema,
  CampaignRules: CampaignRulesSchema,
  CampaignMetrics: CampaignMetricsSchema,
  
  // Product Bundle
  ProductBundle: ProductBundleSchema,
  ProductBundleCreate: ProductBundleCreateSchema,
  ProductBundleUpdate: ProductBundleUpdateSchema,
  BundleProduct: BundleProductSchema,
  BundleInventoryImpact: BundleInventoryImpactSchema,
  BundlePriceCalculation: BundlePriceCalculationSchema,
  
  // File Upload
  FileUpload: FileUploadSchema,
  FileUploadCreate: FileUploadCreateSchema,
  FileUploadUrl: FileUploadUrlSchema,
  BatchFileUpload: BatchFileUploadSchema,
  FileMetadata: FileMetadataSchema,
  
  // Permissions
  RolePermissions: RolePermissionsSchema,
  UserPermissions: UserPermissionsSchema,
  PermissionCheck: PermissionCheckSchema,
  PermissionGrant: PermissionGrantSchema,
  
  // Common
  DateRange: DateRangeSchema,
  Discount: DiscountSchema,
  Price: PriceSchema,
  Pagination: PaginationSchema,
  Sort: SortSchema,
  Address: AddressSchema,
  Contact: ContactSchema,
  SEOMetadata: SEOMetadataSchema,
  StatusHistory: StatusHistorySchema,
  AuditFields: AuditFieldsSchema
} as const;

// Type registry for easy access
export type MarketingSchemaTypes = {
  ProductContent: ProductContent;
  ProductContentCreate: ProductContentCreate;
  ProductContentUpdate: ProductContentUpdate;
  MarketingCampaign: MarketingCampaign;
  MarketingCampaignCreate: MarketingCampaignCreate;
  MarketingCampaignUpdate: MarketingCampaignUpdate;
  ProductBundle: ProductBundle;
  ProductBundleCreate: ProductBundleCreate;
  ProductBundleUpdate: ProductBundleUpdate;
  FileUpload: FileUpload;
  FileUploadCreate: FileUploadCreate;
  UserPermissions: UserPermissions;
  RolePermissions: RolePermissions;
};