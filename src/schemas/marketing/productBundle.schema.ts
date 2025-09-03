import { z } from 'zod';
import { BundlePricing } from '../../types/marketing.types';

export const workflowStateSchema = z.enum(['draft', 'review', 'approved', 'published', 'archived']);

export const targetAudienceSchema = z.enum(['b2b', 'b2c', 'enterprise', 'smb', 'consumer']);

export const bundlePricingSchema = z.object({
  basePrice: z.number().min(0),
  discountType: z.enum(['percentage', 'fixed', 'tiered']),
  discountValue: z.number().min(0),
  finalPrice: z.number().min(0),
  savingsAmount: z.number().min(0),
  savingsPercentage: z.number().min(0).max(100),
  currency: z.string().min(1),
  validFrom: z.date().optional(),
  validUntil: z.date().optional(),
  minQuantity: z.number().int().positive().optional(),
  maxQuantity: z.number().int().positive().optional()
}).refine((data) => {
  if (data.discountType === 'percentage') {
    return data.discountValue >= 0 && data.discountValue <= 100;
  }
  return true;
}, {
  message: 'Percentage discount must be between 0 and 100',
  path: ['discountValue']
}).refine((data) => {
  if (data.minQuantity !== undefined && data.maxQuantity !== undefined) {
    return data.maxQuantity >= data.minQuantity;
  }
  return true;
}, {
  message: 'Max quantity must be greater than or equal to min quantity',
  path: ['maxQuantity']
});

export const bundleAvailabilitySchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  quantity: z.number().int().positive().optional(),
  isActive: z.boolean()
});

export const marketingContentSchema = z.object({
  headline: z.string().min(1).max(100),
  features: z.array(z.string()),
  benefits: z.array(z.string()),
  targetAudience: targetAudienceSchema
});

export const productBundleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  productIds: z.array(z.string()).min(2),
  pricing: bundlePricingSchema,
  availability: bundleAvailabilitySchema,
  marketingContent: marketingContentSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  workflowState: workflowStateSchema
}).refine((data) => {
  if (data.availability.startDate && data.availability.endDate) {
    return data.availability.endDate > data.availability.startDate;
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['availability', 'endDate']
});

export const productBundleTransform = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  productIds: z.union([z.array(z.string()), z.null()]).transform(val => val || []),
  pricing: z.object({
    basePrice: z.number().min(0),
    discountType: z.enum(['percentage', 'fixed', 'tiered']),
    discountValue: z.number().min(0),
    finalPrice: z.number().min(0),
    savingsAmount: z.number().min(0),
    savingsPercentage: z.number().min(0).max(100),
    currency: z.string().min(1),
    validFrom: z.union([z.date(), z.string(), z.null()]).transform(val => 
      typeof val === 'string' ? new Date(val) : val
    ).optional().nullable(),
    validUntil: z.union([z.date(), z.string(), z.null()]).transform(val => 
      typeof val === 'string' ? new Date(val) : val
    ).optional().nullable(),
    minQuantity: z.number().int().positive().optional().nullable(),
    maxQuantity: z.number().int().positive().optional().nullable()
  }).transform((data) => ({
    ...data,
    validFrom: data.validFrom || undefined,
    validUntil: data.validUntil || undefined,
    minQuantity: data.minQuantity || undefined,
    maxQuantity: data.maxQuantity || undefined
  })),
  availability: z.object({
    startDate: z.union([z.date(), z.string(), z.null()]).transform(val => 
      typeof val === 'string' ? new Date(val) : val
    ).optional().nullable(),
    endDate: z.union([z.date(), z.string(), z.null()]).transform(val => 
      typeof val === 'string' ? new Date(val) : val
    ).optional().nullable(),
    quantity: z.number().int().positive().optional().nullable(),
    isActive: z.boolean()
  }).transform((data) => ({
    ...data,
    startDate: data.startDate || undefined,
    endDate: data.endDate || undefined,
    quantity: data.quantity || undefined
  })),
  marketingContent: z.object({
    headline: z.string().min(1).max(100),
    features: z.union([z.array(z.string()), z.null()]).transform(val => val || []),
    benefits: z.union([z.array(z.string()), z.null()]).transform(val => val || []),
    targetAudience: targetAudienceSchema
  }),
  createdAt: z.union([z.date(), z.string()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  updatedAt: z.union([z.date(), z.string()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  workflowState: workflowStateSchema
}).refine((data) => {
  if (data.pricing.discountType === 'percentage') {
    return data.pricing.discountValue >= 0 && data.pricing.discountValue <= 100;
  }
  return true;
}, {
  message: 'Percentage discount must be between 0 and 100',
  path: ['pricing', 'discountValue']
}).refine((data) => {
  const pricing = data.pricing;
  if (pricing.minQuantity !== undefined && pricing.maxQuantity !== undefined) {
    return pricing.maxQuantity >= pricing.minQuantity;
  }
  return true;
}, {
  message: 'Max quantity must be greater than or equal to min quantity',
  path: ['pricing', 'maxQuantity']
}).refine((data) => {
  if (data.availability.startDate && data.availability.endDate) {
    return data.availability.endDate > data.availability.startDate;
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['availability', 'endDate']
});

export function calculateBundlePricing(
  basePrice: number,
  discountType: 'percentage' | 'fixed' | 'tiered',
  discountValue: number,
  quantity?: number
): Omit<BundlePricing, 'currency' | 'validFrom' | 'validUntil' | 'minQuantity' | 'maxQuantity'> {
  if (basePrice === 0) {
    return {
      basePrice: 0,
      discountType,
      discountValue: 0,
      finalPrice: 0,
      savingsAmount: 0,
      savingsPercentage: 0
    };
  }

  let savingsAmount: number;
  let finalPrice: number;

  switch (discountType) {
    case 'percentage':
      savingsAmount = basePrice * (discountValue / 100);
      finalPrice = basePrice - savingsAmount;
      break;
    
    case 'fixed':
      savingsAmount = Math.min(discountValue, basePrice);
      finalPrice = Math.max(0, basePrice - discountValue);
      break;
    
    case 'tiered':
      if (quantity !== undefined && quantity >= 3) {
        savingsAmount = basePrice * (discountValue / 100);
        finalPrice = basePrice - savingsAmount;
      } else {
        savingsAmount = 0;
        finalPrice = basePrice;
      }
      break;
    
    default:
      savingsAmount = 0;
      finalPrice = basePrice;
  }

  const savingsPercentage = basePrice > 0 ? (savingsAmount / basePrice) * 100 : 0;

  return {
    basePrice,
    discountType,
    discountValue,
    finalPrice: Math.max(0, finalPrice),
    savingsAmount: Math.min(savingsAmount, basePrice),
    savingsPercentage: Math.min(100, savingsPercentage)
  };
}