import { z } from 'zod';

export const bundleTypeSchema = z.enum(['fixed', 'flexible', 'bogo', 'mix_match']);

export const productBundleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  type: bundleTypeSchema,
  products: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    isRequired: z.boolean().default(true)
  })).min(2),
  pricing: z.object({
    basePrice: z.number().positive(),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.number().positive(),
    finalPrice: z.number().positive()
  }),
  availability: z.object({
    startDate: z.date().nullable().default(null),
    endDate: z.date().nullable().default(null),
    stockQuantity: z.number().int().nonnegative().nullable().default(null),
    maxPerCustomer: z.number().int().positive().nullable().default(null)
  }).default({}),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const productBundleTransform = productBundleSchema.transform((data) => {
  const basePrice = data.pricing.basePrice;
  const discountType = data.pricing.discountType;
  const discountValue = data.pricing.discountValue;
  
  let finalPrice: number;
  if (discountType === 'percentage') {
    finalPrice = basePrice * (1 - discountValue / 100);
  } else {
    finalPrice = basePrice - discountValue;
  }
  
  // Round to 2 decimal places
  finalPrice = Math.round(finalPrice * 100) / 100;
  
  // Ensure minimum price of 0.01
  if (finalPrice <= 0) {
    finalPrice = 0.01;
  }
  
  return {
    ...data,
    pricing: {
      ...data.pricing,
      finalPrice
    }
  };
});

export type ProductBundle = z.infer<typeof productBundleSchema>;
export type ProductBundleInput = z.input<typeof productBundleSchema>;
export type BundleType = z.infer<typeof bundleTypeSchema>;