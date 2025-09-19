import { z } from 'zod';
import type { ProductBundle, BundlePricing, WorkflowState, TargetAudience } from '../../types/marketing.types';
import { ValidationMonitor } from '../../utils/monitoring';

// Database schema - for product_bundles table (matches database.generated.ts)
const RawDatabaseBundleSchema = z.object({
  id: z.string(),
  bundle_name: z.string(),
  bundle_description: z.string().nullable(),
  product_ids: z.string().nullable(), // JSON array in database
  bundle_price: z.number(),
  discount_type: z.string().nullable(),
  discount_value: z.number().nullable(),
  final_price: z.number().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  quantity: z.number().nullable(),
  is_active: z.boolean().nullable(),
  headline: z.string().nullable(),
  features: z.string().nullable(), // JSON array in database
  benefits: z.string().nullable(), // JSON array in database
  target_audience: z.string().nullable(),
  workflow_state: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

// Transform database format to application format
export const BundleSchema = RawDatabaseBundleSchema.transform((data): ProductBundle => {
  // Parse JSON fields
  let productIds: string[] = [];
  let features: string[] = [];
  let benefits: string[] = [];

  if (data.product_ids) {
    try {
      productIds = JSON.parse(data.product_ids);
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'BundleSchema.transform.productIds',
        errorMessage: 'Failed to parse product_ids JSON',
        errorCode: 'PRODUCT_IDS_PARSE_ERROR'
      });
    }
  }

  if (data.features) {
    try {
      features = JSON.parse(data.features);
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'BundleSchema.transform.features',
        errorMessage: 'Failed to parse features JSON',
        errorCode: 'FEATURES_PARSE_ERROR'
      });
    }
  }

  if (data.benefits) {
    try {
      benefits = JSON.parse(data.benefits);
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'BundleSchema.transform.benefits',
        errorMessage: 'Failed to parse benefits JSON',
        errorCode: 'BENEFITS_PARSE_ERROR'
      });
    }
  }

  // Calculate pricing details
  const basePrice = data.bundle_price || 0;
  const discountValue = data.discount_value || 0;
  const finalPrice = data.final_price || basePrice;
  const savingsAmount = basePrice - finalPrice;
  const savingsPercentage = basePrice > 0 ? (savingsAmount / basePrice) * 100 : 0;

  const pricing: BundlePricing = {
    basePrice,
    discountType: (data.discount_type as 'percentage' | 'fixed' | 'tiered') || 'fixed',
    discountValue,
    finalPrice,
    savingsAmount,
    savingsPercentage,
    currency: 'USD', // Default currency
  };

  const now = new Date();

  return {
    id: data.id,
    name: data.bundle_name,
    description: data.bundle_description || '',
    productIds,
    pricing,
    availability: {
      startDate: data.start_date ? new Date(data.start_date) : undefined,
      endDate: data.end_date ? new Date(data.end_date) : undefined,
      quantity: data.quantity || undefined,
      isActive: data.is_active ?? true,
    },
    marketingContent: {
      headline: data.headline || '',
      features,
      benefits,
      targetAudience: (data.target_audience as TargetAudience) || 'b2c',
    },
    createdAt: data.created_at ? new Date(data.created_at) : now,
    updatedAt: data.updated_at ? new Date(data.updated_at) : now,
    workflowState: (data.workflow_state as WorkflowState) || 'draft',
  };
});

// Input schema for creating/updating bundles
export const BundleInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  productIds: z.array(z.string()).min(1),
  pricing: z.object({
    basePrice: z.number().positive(),
    discountType: z.enum(['percentage', 'fixed', 'tiered']).default('fixed'),
    discountValue: z.number().nonnegative(),
  }),
  availability: z.object({
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    quantity: z.number().positive().optional(),
    isActive: z.boolean().default(true),
  }).optional(),
  marketingContent: z.object({
    headline: z.string().max(200),
    features: z.array(z.string()).default([]),
    benefits: z.array(z.string()).default([]),
    targetAudience: z.enum(['b2b', 'b2c', 'enterprise', 'smb', 'consumer']).default('b2c'),
  }).optional(),
  workflowState: z.enum(['draft', 'review', 'approved', 'published', 'archived']).default('draft'),
}).refine(
  (data) => {
    if (data.pricing.discountType === 'percentage' && data.pricing.discountValue > 100) {
      return false;
    }
    return true;
  },
  {
    message: "Percentage discount cannot exceed 100%",
    path: ["pricing", "discountValue"],
  }
);

// Contract validation
type BundleContract = z.infer<typeof BundleSchema>;
type InterfaceMatch = BundleContract extends ProductBundle ? true : false;
const _typeCheck: InterfaceMatch = true; // Will cause TypeScript error if schemas don't match

export type Bundle = z.infer<typeof BundleSchema>;
export type BundleInput = z.infer<typeof BundleInputSchema>;