import { z } from 'zod';

export const PricingStrategy = z.enum(['fixed', 'percentage', 'tiered']);
export const BundleAvailability = z.enum(['in_stock', 'limited', 'out_of_stock']);

export type PricingStrategyType = z.infer<typeof PricingStrategy>;
export type BundleAvailabilityType = z.infer<typeof BundleAvailability>;

export const BundleProductSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(50),
  isRequired: z.boolean().default(true)
});

export type BundleProduct = z.infer<typeof BundleProductSchema>;

export const InventoryImpactSchema = z.object({
  productId: z.string().uuid(),
  quantityReserved: z.number().int().nonnegative(),
  quantityAvailable: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative()
});

export type InventoryImpact = z.infer<typeof InventoryImpactSchema>;

const ProductBundleBaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  products: z.array(BundleProductSchema).min(2),
  pricingStrategy: PricingStrategy,
  bundlePrice: z.number().positive(),
  savings: z.number().nonnegative(),
  availability: BundleAvailability,
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  maxQuantity: z.number().int().positive().optional(),
  minQuantity: z.number().int().positive().default(1),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string()).max(10).optional(),
  inventoryImpact: z.array(InventoryImpactSchema).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().uuid()
});

export const ProductBundleSchema = ProductBundleBaseSchema.refine(
  data => {
    const totalPrice = data.products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    return data.bundlePrice < totalPrice;
  },
  { 
    message: "Bundle price must be less than sum of individual prices",
    path: ['bundlePrice']
  }
).refine(
  data => new Date(data.validUntil) > new Date(data.validFrom),
  { 
    message: "Valid until date must be after valid from date",
    path: ['validUntil']
  }
).refine(
  data => {
    if (data.pricingStrategy === 'percentage') {
      const totalPrice = data.products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
      const discountPercentage = ((totalPrice - data.bundlePrice) / totalPrice) * 100;
      return discountPercentage > 0 && discountPercentage <= 100;
    }
    return true;
  },
  {
    message: "Invalid percentage discount for bundle",
    path: ['bundlePrice']
  }
).refine(
  data => data.minQuantity <= (data.maxQuantity ?? Infinity),
  {
    message: "Minimum quantity must be less than or equal to maximum quantity",
    path: ['minQuantity']
  }
);

export type ProductBundle = z.infer<typeof ProductBundleSchema>;

export const ProductBundleCreateSchema = ProductBundleBaseSchema.omit({
  id: true,
  savings: true,
  inventoryImpact: true,
  createdAt: true,
  updatedAt: true
}).transform((data) => {
  const totalPrice = data.products.reduce((sum: number, p: BundleProduct) => sum + (p.price * p.quantity), 0);
  const savings = totalPrice - data.bundlePrice;
  return {
    ...data,
    savings
  };
});

export type ProductBundleCreate = z.infer<typeof ProductBundleCreateSchema>;

export const ProductBundleUpdateSchema = ProductBundleBaseSchema.partial().required({
  id: true
});

export type ProductBundleUpdate = z.infer<typeof ProductBundleUpdateSchema>;

export const calculateBundleSavings = (products: BundleProduct[], bundlePrice: number): number => {
  const totalPrice = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  return Math.max(0, totalPrice - bundlePrice);
};

export const calculateBundleDiscountPercentage = (products: BundleProduct[], bundlePrice: number): number => {
  const totalPrice = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  if (totalPrice === 0) return 0;
  return Math.round(((totalPrice - bundlePrice) / totalPrice) * 100);
};

export const BundlePriceCalculationSchema = z.object({
  products: z.array(BundleProductSchema).min(2),
  pricingStrategy: PricingStrategy,
  discountValue: z.number().positive()
}).transform(data => {
  const totalPrice = data.products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  let bundlePrice: number;
  
  switch (data.pricingStrategy) {
    case 'fixed':
      bundlePrice = Math.max(0.01, totalPrice - data.discountValue);
      break;
    case 'percentage':
      bundlePrice = totalPrice * (1 - data.discountValue / 100);
      break;
    case 'tiered':
      bundlePrice = totalPrice - data.discountValue;
      break;
    default:
      bundlePrice = totalPrice;
  }
  
  return {
    totalPrice,
    bundlePrice: Math.round(bundlePrice * 100) / 100,
    savings: Math.round((totalPrice - bundlePrice) * 100) / 100,
    discountPercentage: Math.round(((totalPrice - bundlePrice) / totalPrice) * 100)
  };
});

export type BundlePriceCalculation = z.infer<typeof BundlePriceCalculationSchema>;