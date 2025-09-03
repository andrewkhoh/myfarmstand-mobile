import { z } from 'zod';

// Define the proper productBundleSchema that matches test expectations
export const productBundleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  bundle_type: z.enum(['fixed', 'dynamic', 'customizable']),
  status: z.enum(['draft', 'active', 'inactive', 'archived']),
  product_items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().positive(),
    discount_percentage: z.number().min(0).max(100).optional(),
    is_required: z.boolean()
  })).min(1), // Must have at least one product
  pricing: z.object({
    bundle_price: z.number().positive(),
    original_price: z.number().positive(),
    savings_amount: z.number().nonnegative().optional(),
    savings_percentage: z.number().min(0).max(100).optional()
  }),
  inventory: z.object({
    available_quantity: z.number().int().nonnegative(),
    reserved_quantity: z.number().int().nonnegative(),
    low_stock_threshold: z.number().int().nonnegative()
  }).optional(),
  valid_from: z.string().datetime().transform(str => new Date(str)).optional(),
  valid_until: z.string().datetime().transform(str => new Date(str)).optional(),
  max_purchases_per_customer: z.number().int().positive().optional(),
  campaign_ids: z.array(z.string().uuid()).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.any().optional(),
  created_by: z.string(),
  updated_by: z.string().optional(),
  created_at: z.string().datetime().transform(str => new Date(str)),
  updated_at: z.string().datetime().transform(str => new Date(str)).optional()
}).transform(data => {
  // Trim whitespace from name
  const transformed: any = {
    ...data,
    name: data.name.trim()
  };
  
  // Calculate savings if not provided
  if (data.pricing && !data.pricing.savings_amount) {
    transformed.pricing = {
      ...data.pricing,
      savings_amount: Math.round((data.pricing.original_price - data.pricing.bundle_price) * 100) / 100,
      savings_percentage: Math.round(((data.pricing.original_price - data.pricing.bundle_price) / data.pricing.original_price) * 10000) / 100
    };
  }
  
  // Round prices to 2 decimal places
  if (data.pricing) {
    transformed.pricing = {
      ...transformed.pricing,
      bundle_price: Math.round(data.pricing.bundle_price * 100) / 100,
      original_price: Math.round(data.pricing.original_price * 100) / 100
    };
  }
  
  return transformed;
}).refine(
  data => {
    // Bundle price must be less than or equal to original price
    if (data.pricing.bundle_price > data.pricing.original_price) {
      return false;
    }
    return true;
  },
  {
    message: 'Bundle price cannot exceed original price',
    path: ['pricing', 'bundle_price']
  }
).refine(
  data => {
    // If valid dates are provided, valid_until must be after valid_from
    if (data.valid_from && data.valid_until) {
      return data.valid_until > data.valid_from;
    }
    return true;
  },
  {
    message: 'Valid until date must be after valid from date',
    path: ['valid_until']
  }
).refine(
  data => {
    // Reserved quantity cannot exceed available quantity
    if (data.inventory && data.inventory.reserved_quantity > data.inventory.available_quantity) {
      return false;
    }
    return true;
  },
  {
    message: 'Reserved quantity cannot exceed available quantity',
    path: ['inventory', 'reserved_quantity']
  }
);

// Legacy schemas for backward compatibility
export const PricingStrategy = z.enum([
  'fixed',
  'percentage',
  'tiered'
]);

export type PricingStrategyType = z.infer<typeof PricingStrategy>;

export const BundleAvailability = z.enum([
  'in_stock',
  'limited',
  'out_of_stock'
]);

export type BundleAvailabilityType = z.infer<typeof BundleAvailability>;

export const BundleProductSchema = z.object({
  productId: z.string().uuid({ message: 'Product ID must be a valid UUID' }),
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(50),
  quantity: z.number()
    .int({ message: 'Quantity must be an integer' })
    .positive({ message: 'Quantity must be positive' }),
  originalPrice: z.number()
    .positive({ message: 'Original price must be positive' }),
  price: z.number()
    .positive({ message: 'Price must be positive' }),
  discount: z.number()
    .min(0, { message: 'Discount cannot be negative' })
    .max(100, { message: 'Discount cannot exceed 100%' })
    .optional(),
  isRequired: z.boolean().default(true),
  inventory: z.number()
    .int()
    .nonnegative()
    .optional()
});

export type BundleProduct = z.infer<typeof BundleProductSchema>;

export const BundleTierSchema = z.object({
  minQuantity: z.number().int().positive(),
  maxQuantity: z.number().int().positive().optional(),
  discount: z.number().min(0).max(100),
  fixedPrice: z.number().positive().optional()
});

export type BundleTier = z.infer<typeof BundleTierSchema>;

// Base schema without refinements
const ProductBundleBaseSchema = z.object({
  id: z.string().uuid({ message: 'Bundle ID must be a valid UUID' }),
  name: z.string()
    .min(1, { message: 'Bundle name is required' })
    .max(100, { message: 'Bundle name must not exceed 100 characters' }),
  description: z.string()
    .max(500, { message: 'Description must not exceed 500 characters' })
    .optional(),
  products: z.array(BundleProductSchema)
    .min(2, { message: 'Bundle must contain at least 2 products' })
    .max(10, { message: 'Bundle cannot contain more than 10 products' }),
  pricingStrategy: PricingStrategy,
  bundlePrice: z.number()
    .positive({ message: 'Bundle price must be positive' }),
  originalPrice: z.number()
    .positive({ message: 'Original price must be positive' })
    .optional(),
  savings: z.number()
    .nonnegative({ message: 'Savings cannot be negative' })
    .default(0),
  savingsPercentage: z.number()
    .min(0)
    .max(100)
    .optional(),
  availability: BundleAvailability,
  validFrom: z.string().datetime({ message: 'Valid from date must be in ISO datetime format' }),
  validUntil: z.string().datetime({ message: 'Valid until date must be in ISO datetime format' }),
  maxQuantityPerOrder: z.number()
    .int()
    .positive()
    .optional(),
  tiers: z.array(BundleTierSchema).optional(),
  tags: z.array(z.string()).default([]),
  imageUrl: z.string().url().optional(),
  featured: z.boolean().default(false),
  priority: z.number().int().nonnegative().default(0),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Apply refinements to the main schema
export const ProductBundleSchema = ProductBundleBaseSchema.refine(
  data => {
    const totalOriginalPrice = data.products.reduce(
      (sum, product) => sum + (product.originalPrice * product.quantity),
      0
    );
    return data.bundlePrice < totalOriginalPrice;
  },
  {
    message: 'Bundle price must be less than sum of individual product prices',
    path: ['bundlePrice']
  }
).refine(
  data => new Date(data.validUntil) > new Date(data.validFrom),
  {
    message: 'Valid until date must be after valid from date',
    path: ['validUntil']
  }
).refine(
  data => {
    if (data.pricingStrategy === 'tiered' && (!data.tiers || data.tiers.length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: 'Tiered pricing strategy requires at least one tier',
    path: ['tiers']
  }
).refine(
  data => {
    if (data.originalPrice && data.originalPrice <= data.bundlePrice) {
      return false;
    }
    return true;
  },
  {
    message: 'Original price must be greater than bundle price',
    path: ['originalPrice']
  }
);

export type ProductBundle = z.infer<typeof ProductBundleSchema>;

// Use base schema for create/update schemas
export const ProductBundleCreateSchema = ProductBundleBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  availability: BundleAvailability.default('in_stock')
});

export type ProductBundleCreate = z.infer<typeof ProductBundleCreateSchema>;

export const ProductBundleUpdateSchema = ProductBundleBaseSchema.partial().required({
  id: true
});

export type ProductBundleUpdate = z.infer<typeof ProductBundleUpdateSchema>;

export const BundleInventoryImpactSchema = z.object({
  bundleId: z.string().uuid(),
  quantity: z.number().int().positive(),
  products: z.array(z.object({
    productId: z.string().uuid(),
    requiredQuantity: z.number().int().positive(),
    availableQuantity: z.number().int().nonnegative(),
    sufficient: z.boolean()
  })),
  canFulfill: z.boolean(),
  maxFulfillableQuantity: z.number().int().nonnegative()
});

export type BundleInventoryImpact = z.infer<typeof BundleInventoryImpactSchema>;

export const BundlePriceCalculationSchema = z.object({
  bundleId: z.string().uuid(),
  quantity: z.number().int().positive(),
  originalPrice: z.number().positive(),
  bundlePrice: z.number().positive(),
  savings: z.number().nonnegative(),
  savingsPercentage: z.number().min(0).max(100),
  appliedTier: BundleTierSchema.optional(),
  finalPrice: z.number().positive()
});

export type BundlePriceCalculation = z.infer<typeof BundlePriceCalculationSchema>;