// Phase 3: Product Bundle Schemas Implementation (GREEN Phase)
// Following docs/architectural-patterns-and-best-practices.md
// Pattern: Database-first validation + transformation schemas + TypeScript return annotations

import { z } from 'zod';

// Phase 1: Database-First Validation - Product Bundles
// Raw database schema validation - must match database structure exactly
export const ProductBundleDatabaseSchema = z.object({
  id: z.string(),
  bundle_name: z.string().min(1, 'Bundle name is required').max(255, 'Bundle name cannot exceed 255 characters'),
  bundle_description: z.string().nullable(),
  bundle_price: z.number().positive('Bundle price must be positive'),
  bundle_discount_amount: z.number().min(0, 'Discount amount cannot be negative').nullable(),
  is_active: z.boolean().nullable().default(true),
  is_featured: z.boolean().nullable().default(false),
  display_order: z.number().int().min(1, 'Display order must be positive').nullable().default(100),
  campaign_id: z.string().nullable(),
  created_by: z.string().nullable(),
  created_at: z.string().datetime().nullable().optional(),
  updated_at: z.string().datetime().nullable().optional()
}).strict().refine(
  (data) => {
    // Business rule: discount_amount cannot exceed bundle_price
    if (data.bundle_discount_amount !== null && data.bundle_discount_amount > data.bundle_price) {
      return false;
    }
    return true;
  },
  {
    message: 'Discount amount cannot exceed bundle price',
    path: ['bundle_discount_amount']
  }
).refine(
  (data) => {
    // Business rule: Featured bundles should have reasonable pricing (> $10)
    if (data.is_featured === true && data.bundle_price < 10) {
      return false;
    }
    return true;
  },
  {
    message: 'Featured bundles should have a minimum price of $10',
    path: ['bundle_price']
  }
);

// Database-First Validation - Bundle Products Association
export const BundleProductDatabaseSchema = z.object({
  id: z.string(),
  bundle_id: z.string(),
  product_id: z.string(),
  quantity: z.number().int().positive('Quantity must be positive'),
  display_order: z.number().int().min(1, 'Display order must be positive').nullable().default(100),
  created_at: z.string().datetime().nullable().optional()
}).strict();

// Export database contract types (compile-time enforcement)
export type ProductBundleDatabaseContract = z.infer<typeof ProductBundleDatabaseSchema>;
export type BundleProductDatabaseContract = z.infer<typeof BundleProductDatabaseSchema>;

// Phase 2: Transformation Schemas (Database → Application Format)
// TypeScript return annotation ensures complete field coverage
export const ProductBundleTransformSchema = ProductBundleDatabaseSchema.transform((data): ProductBundleTransform => ({
  id: data.id,
  bundleName: data.bundle_name,
  bundleDescription: data.bundle_description,
  bundlePrice: data.bundle_price,
  bundleDiscountAmount: data.bundle_discount_amount,
  isActive: data.is_active,
  isFeatured: data.is_featured,
  displayOrder: data.display_order,
  campaignId: data.campaign_id,
  createdBy: data.created_by,
  createdAt: data.created_at,
  updatedAt: data.updated_at
}));

export const BundleProductTransformSchema = BundleProductDatabaseSchema.transform((data): BundleProductTransform => ({
  id: data.id,
  bundleId: data.bundle_id,
  productId: data.product_id,
  quantity: data.quantity,
  displayOrder: data.display_order,
  createdAt: data.created_at
}));

// Export transformation contract types (compile-time enforcement)
export interface ProductBundleTransform {
  id: string;
  bundleName: string;
  bundleDescription: string | null;
  bundlePrice: number;
  bundleDiscountAmount: number | null;
  isActive: boolean | null;
  isFeatured: boolean | null;
  displayOrder: number | null;
  campaignId: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BundleProductTransform {
  id: string;
  bundleId: string;
  productId: string;
  quantity: number;
  displayOrder: number | null;
  createdAt: string | null;
}

// Bundle Product Input Schema for create operations
export const BundleProductInputSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive('Quantity must be positive'),
  displayOrder: z.number().int().min(1, 'Display order must be positive').optional()
}).strict();

// Phase 3: Create Schema (Application → Database Format)
// For new bundle creation operations
export const CreateProductBundleSchema = z.object({
  bundleName: z.string().min(1, 'Bundle name is required').max(255, 'Bundle name cannot exceed 255 characters'),
  bundleDescription: z.string().optional(),
  bundlePrice: z.number().positive('Bundle price must be positive'),
  bundleDiscountAmount: z.number().min(0, 'Discount amount cannot be negative').optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  displayOrder: z.number().int().min(1, 'Display order must be positive').default(100),
  campaignId: z.string().optional(),
  products: z.array(BundleProductInputSchema).min(1, 'Bundle must contain at least one product')
}).strict().refine(
  (data) => {
    // Business rule: discount_amount cannot exceed bundle_price
    if (data.bundleDiscountAmount !== undefined && data.bundleDiscountAmount > data.bundlePrice) {
      return false;
    }
    return true;
  },
  {
    message: 'Discount amount cannot exceed bundle price',
    path: ['bundleDiscountAmount']
  }
).refine(
  (data) => {
    // Business rule: Featured bundles should have reasonable pricing (> $10)
    if (data.isFeatured === true && data.bundlePrice < 10) {
      return false;
    }
    return true;
  },
  {
    message: 'Featured bundles should have a minimum price of $10',
    path: ['bundlePrice']
  }
).refine(
  (data) => {
    // Business rule: Products in bundle must have unique IDs
    const productIds = data.products.map(p => p.productId);
    const uniqueProductIds = new Set(productIds);
    return productIds.length === uniqueProductIds.size;
  },
  {
    message: 'Bundle cannot contain duplicate products',
    path: ['products']
  }
).refine(
  (data) => {
    // Business rule: Bundle should not have too many products (max 10 for UX)
    return data.products.length <= 10;
  },
  {
    message: 'Bundle cannot contain more than 10 products',
    path: ['products']
  }
);

// Phase 4: Update Schema (Partial Application → Database Format)
// For bundle update operations - all fields optional
export const UpdateProductBundleSchema = z.object({
  bundleName: z.string().min(1, 'Bundle name is required').max(255, 'Bundle name cannot exceed 255 characters').optional(),
  bundleDescription: z.string().optional(),
  bundlePrice: z.number().positive('Bundle price must be positive').optional(),
  bundleDiscountAmount: z.number().min(0, 'Discount amount cannot be negative').optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  displayOrder: z.number().int().min(1, 'Display order must be positive').optional(),
  campaignId: z.string().optional()
}).strict().refine(
  (data) => {
    // Business rule: discount_amount cannot exceed bundle_price
    if (data.bundleDiscountAmount !== undefined && data.bundlePrice !== undefined && 
        data.bundleDiscountAmount > data.bundlePrice) {
      return false;
    }
    return true;
  },
  {
    message: 'Discount amount cannot exceed bundle price',
    path: ['bundleDiscountAmount']
  }
).refine(
  (data) => {
    // Business rule: Featured bundles should have reasonable pricing (> $10)
    if (data.isFeatured === true && data.bundlePrice !== undefined && data.bundlePrice < 10) {
      return false;
    }
    return true;
  },
  {
    message: 'Featured bundles should have a minimum price of $10',
    path: ['bundlePrice']
  }
);

// Bundle Product Update Schema
export const UpdateBundleProductsSchema = z.object({
  products: z.array(BundleProductInputSchema).min(1, 'Bundle must contain at least one product')
}).strict().refine(
  (data) => {
    // Business rule: Products in bundle must have unique IDs
    const productIds = data.products.map(p => p.productId);
    const uniqueProductIds = new Set(productIds);
    return productIds.length === uniqueProductIds.size;
  },
  {
    message: 'Bundle cannot contain duplicate products',
    path: ['products']
  }
).refine(
  (data) => {
    // Business rule: Bundle should not have too many products (max 10 for UX)
    return data.products.length <= 10;
  },
  {
    message: 'Bundle cannot contain more than 10 products',
    path: ['products']
  }
);

// Bundle Management Helpers
export const BundleManagementHelpers = {
  /**
   * Calculates the total individual product price for comparison
   */
  calculateIndividualTotal(products: Array<{ price: number; quantity: number }>): number {
    return products.reduce((total, product) => total + (product.price * product.quantity), 0);
  },

  /**
   * Calculates the savings amount from bundle pricing
   */
  calculateSavings(bundlePrice: number, individualTotal: number, bundleDiscountAmount?: number | null): number {
    const baseSavings = Math.max(0, individualTotal - bundlePrice);
    const additionalDiscount = bundleDiscountAmount || 0;
    return baseSavings + additionalDiscount;
  },

  /**
   * Calculates the final price after all discounts
   */
  calculateFinalPrice(bundlePrice: number, bundleDiscountAmount?: number | null): number {
    const discount = bundleDiscountAmount || 0;
    return Math.max(0, bundlePrice - discount);
  },

  /**
   * Calculates the savings percentage
   */
  calculateSavingsPercentage(bundlePrice: number, individualTotal: number, bundleDiscountAmount?: number | null): number {
    if (individualTotal <= 0) return 0;
    
    const finalPrice = this.calculateFinalPrice(bundlePrice, bundleDiscountAmount);
    const savings = Math.max(0, individualTotal - finalPrice);
    return (savings / individualTotal) * 100;
  },

  /**
   * Validates if bundle provides meaningful savings (at least 5%)
   */
  hasMeaningfulSavings(bundlePrice: number, individualTotal: number, bundleDiscountAmount?: number | null): boolean {
    const savingsPercentage = this.calculateSavingsPercentage(bundlePrice, individualTotal, bundleDiscountAmount);
    return savingsPercentage >= 5; // Minimum 5% savings
  },

  /**
   * Sorts products by display order
   */
  sortProductsByDisplayOrder(products: Array<{ displayOrder?: number | null; [key: string]: any }>): Array<{ displayOrder?: number | null; [key: string]: any }> {
    return [...products].sort((a, b) => {
      const orderA = a.displayOrder || 999;
      const orderB = b.displayOrder || 999;
      return orderA - orderB;
    });
  },

  /**
   * Validates bundle is eligible for featuring
   */
  isEligibleForFeaturing(bundle: Partial<ProductBundleTransform>, minPrice: number = 10): boolean {
    return Boolean(
      bundle.isActive !== false &&
      bundle.bundlePrice && bundle.bundlePrice >= minPrice &&
      bundle.bundleName && bundle.bundleName.trim().length > 0
    );
  }
};

// Inventory Impact Helpers for cross-service integration
export const BundleInventoryHelpers = {
  /**
   * Calculates total inventory impact for a bundle quantity
   */
  calculateInventoryImpact(bundleProducts: Array<{ productId: string; quantity: number }>, bundleQuantity: number): Array<{ productId: string; requiredQuantity: number }> {
    return bundleProducts.map(product => ({
      productId: product.productId,
      requiredQuantity: product.quantity * bundleQuantity
    }));
  },

  /**
   * Validates if sufficient inventory exists for bundle
   */
  validateInventoryAvailability(
    bundleProducts: Array<{ productId: string; quantity: number }>, 
    bundleQuantity: number,
    inventoryLevels: Record<string, number>
  ): { isAvailable: boolean; shortages: Array<{ productId: string; required: number; available: number }> } {
    const shortages: Array<{ productId: string; required: number; available: number }> = [];
    
    const impact = this.calculateInventoryImpact(bundleProducts, bundleQuantity);
    
    impact.forEach(({ productId, requiredQuantity }) => {
      const available = inventoryLevels[productId] || 0;
      if (available < requiredQuantity) {
        shortages.push({
          productId,
          required: requiredQuantity,
          available
        });
      }
    });
    
    return {
      isAvailable: shortages.length === 0,
      shortages
    };
  },

  /**
   * Gets maximum bundle quantity based on available inventory
   */
  getMaxBundleQuantity(
    bundleProducts: Array<{ productId: string; quantity: number }>,
    inventoryLevels: Record<string, number>
  ): number {
    if (bundleProducts.length === 0) return 0;
    
    return Math.min(
      ...bundleProducts.map(product => {
        const available = inventoryLevels[product.productId] || 0;
        return Math.floor(available / product.quantity);
      })
    );
  }
};

// Campaign Integration Helpers
export const BundleCampaignHelpers = {
  /**
   * Validates if bundle is eligible for a campaign
   */
  isEligibleForCampaign(bundle: Partial<ProductBundleTransform>, campaignType: string): boolean {
    if (!bundle.isActive) return false;
    
    switch (campaignType) {
      case 'clearance':
        // Clearance campaigns typically target lower-performing bundles
        return Boolean(bundle.bundlePrice && bundle.bundlePrice > 0);
      case 'promotional':
        // Promotional campaigns target active, well-configured bundles
        return Boolean(
          bundle.bundleName && 
          bundle.bundlePrice && 
          bundle.bundlePrice > 0 &&
          bundle.bundleDescription
        );
      case 'seasonal':
        // Seasonal campaigns can include any active bundle
        return true;
      default:
        return true;
    }
  },

  /**
   * Calculates campaign discount for bundle
   */
  calculateCampaignDiscount(bundlePrice: number, campaignDiscountPercentage: number): number {
    return bundlePrice * (campaignDiscountPercentage / 100);
  },

  /**
   * Gets effective bundle price with campaign discount
   */
  getEffectivePrice(bundle: Partial<ProductBundleTransform>, campaignDiscountPercentage?: number): number {
    if (!bundle.bundlePrice) return 0;
    
    let price = bundle.bundlePrice;
    
    // Apply bundle discount first
    if (bundle.bundleDiscountAmount) {
      price -= bundle.bundleDiscountAmount;
    }
    
    // Apply campaign discount
    if (campaignDiscountPercentage) {
      price -= this.calculateCampaignDiscount(price, campaignDiscountPercentage);
    }
    
    return Math.max(0, price);
  }
};

// Export helper types for service and hook layers
export type CreateProductBundleInput = z.infer<typeof CreateProductBundleSchema>;
export type UpdateProductBundleInput = z.infer<typeof UpdateProductBundleSchema>;
export type BundleProductInput = z.infer<typeof BundleProductInputSchema>;
export type UpdateBundleProductsInput = z.infer<typeof UpdateBundleProductsSchema>;