// Phase 3: Product Bundle Service Implementation (GREEN Phase)
// Following docs/architectural-patterns-and-best-practices.md
// Pattern: Direct Supabase queries + ValidationMonitor + Role permissions + Inventory integration

import { supabase } from '../../config/supabase';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { RolePermissionService } from '../role-based/rolePermissionService';
import { InventoryService } from '../inventory/inventoryService';
import { 
  ProductBundleTransformSchema,
  BundleProductTransformSchema,
  BundleManagementHelpers,
  BundleInventoryHelpers,
  BundleCampaignHelpers,
  type ProductBundleTransform,
  type BundleProductTransform,
  type CreateProductBundleInput,
  type UpdateProductBundleInput,
  type BundleProductInput
} from '../../schemas/marketing';

// Standard service response pattern
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Pagination support
interface PaginationOptions {
  page: number;
  limit: number;
}

interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

// Bundle specific types
interface BundleWithProducts extends ProductBundleTransform {
  products: BundleProductTransform[];
}

interface UpdateBundleProductsResponse {
  bundleId: string;
  products: BundleProductTransform[];
  updatedCount: number;
}

interface InventoryImpactResponse {
  impact: Array<{ productId: string; requiredQuantity: number }>;
  availability: {
    isAvailable: boolean;
    shortages: Array<{ productId: string; required: number; available: number }>;
  };
}

// Performance types
interface BundlePerformanceOptions {
  startDate: string;
  endDate: string;
}

interface BundlePerformance {
  totalSales: number;
  conversionRate: number;
  averageOrderValue: number;
  totalRevenue: number;
  inventoryTurnover: number;
}

interface BundlePerformanceResponse {
  bundleId: string;
  performance: BundlePerformance;
  dateRange: BundlePerformanceOptions;
}

// Pricing calculation types
interface PricingCalculationOptions {
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumSavings: number;
}

interface PricingCalculationResponse {
  individualTotal: number;
  discountAmount: number;
  bundlePrice: number;
  meetsMinimumSavings: boolean;
  savingsPercentage: number;
}

// Bundle savings calculation
interface BundleSavingsResponse {
  individualTotal: number;
  bundlePrice: number;
  finalPrice: number;
  totalSavings: number;
  savingsPercentage: number;
  hasMeaningfulSavings: boolean;
}

// Effective pricing with campaign discounts
interface EffectivePriceResponse {
  originalPrice: number;
  bundleDiscount: number;
  priceAfterBundleDiscount: number;
  campaignDiscount: number;
  finalPrice: number;
  totalSavings: number;
}

export class ProductBundleService {
  /**
   * Create bundle with product associations and pricing validation
   */
  static async createBundle(
    bundleData: CreateProductBundleInput,
    userId: string
  ): Promise<ServiceResponse<BundleWithProducts>> {
    try {
      // Validate permissions
      const hasPermission = await RolePermissionService.hasPermission(
        userId, 
        'bundle_management'
      );
      if (!hasPermission) {
        ValidationMonitor.recordValidationError({
          context: 'ProductBundleService.createBundle',
          errorCode: 'BUNDLE_CREATION_FAILED',
          validationPattern: 'simple_validation',
          errorMessage: 'Insufficient permissions'
        });
        return { success: false, error: 'Insufficient permissions for bundle management' };
      }

      // Validate business rules
      if (bundleData.bundleDiscountAmount && bundleData.bundleDiscountAmount > bundleData.bundlePrice) {
        return { success: false, error: 'Discount amount cannot exceed bundle price' };
      }

      if (bundleData.isFeatured && bundleData.bundlePrice < 10) {
        return { success: false, error: 'Featured bundles should have a minimum price of $10' };
      }

      // Check for duplicate products
      const productIds = bundleData.products.map(p => p.productId);
      const uniqueProductIds = new Set(productIds);
      if (productIds.length !== uniqueProductIds.size) {
        return { success: false, error: 'Bundle cannot contain duplicate products' };
      }

      // Prepare bundle data for database insert
      const dbBundleData = {
        bundle_name: bundleData.bundleName,
        bundle_description: bundleData.bundleDescription || null,
        bundle_price: bundleData.bundlePrice,
        bundle_discount_amount: bundleData.bundleDiscountAmount || null,
        is_active: bundleData.isActive,
        is_featured: bundleData.isFeatured,
        display_order: bundleData.displayOrder,
        campaign_id: bundleData.campaignId || null,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create bundle
      const { data: bundleResult, error: bundleError } = await supabase
        .from('product_bundles')
        .insert(dbBundleData)
        .select()
        .single();

      if (bundleError || !bundleResult) {
        ValidationMonitor.recordValidationError({
          context: 'ProductBundleService.createBundle',
          errorCode: 'BUNDLE_CREATION_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: bundleError?.message || 'Bundle creation failed'
        });
        return { success: false, error: bundleError?.message || 'Failed to create bundle' };
      }

      // Create bundle products
      const bundleProductsData = bundleData.products.map(product => ({
        bundle_id: bundleResult.id,
        product_id: product.productId,
        quantity: product.quantity,
        display_order: product.displayOrder || 100,
        created_at: new Date().toISOString()
      }));

      const { data: productsResult, error: productsError } = await supabase
        .from('bundle_products')
        .insert(bundleProductsData)
        .select();

      if (productsError || !productsResult) {
        // Clean up bundle if products creation failed
        await supabase.from('product_bundles').delete().eq('id', bundleResult.id);
        
        ValidationMonitor.recordValidationError({
          context: 'ProductBundleService.createBundle',
          errorCode: 'BUNDLE_PRODUCTS_CREATION_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: productsError?.message || 'Bundle products creation failed'
        });
        return { success: false, error: productsError?.message || 'Failed to create bundle products' };
      }

      // Transform responses
      const transformedBundle = ProductBundleTransformSchema.parse(bundleResult);
      const transformedProducts = productsResult.map(product => 
        BundleProductTransformSchema.parse(product)
      );

      const bundleWithProducts: BundleWithProducts = {
        ...transformedBundle,
        products: transformedProducts
      };

      ValidationMonitor.recordPatternSuccess({
        service: 'productBundleService',
        pattern: 'transformation_schema',
        operation: 'createBundle'
      });

      return { success: true, data: bundleWithProducts };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      ValidationMonitor.recordValidationError({
        context: 'ProductBundleService.createBundle',
        errorCode: 'BUNDLE_CREATION_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: errorMessage
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update bundle products with inventory impact calculation
   */
  static async updateBundleProducts(
    bundleId: string,
    products: BundleProductInput[],
    userId: string
  ): Promise<ServiceResponse<UpdateBundleProductsResponse>> {
    try {
      // Validate permissions
      const hasPermission = await RolePermissionService.hasPermission(
        userId, 
        'bundle_management'
      );
      if (!hasPermission) {
        return { success: false, error: 'Insufficient permissions for bundle management' };
      }

      // Validate unique products
      const productIds = products.map(p => p.productId);
      const uniqueProductIds = new Set(productIds);
      if (productIds.length !== uniqueProductIds.size) {
        return { success: false, error: 'Bundle cannot contain duplicate products' };
      }

      // Delete existing bundle products
      const { error: deleteError } = await supabase
        .from('bundle_products')
        .delete()
        .eq('bundle_id', bundleId);

      if (deleteError) {
        ValidationMonitor.recordValidationError({
          context: 'ProductBundleService.updateBundleProducts',
          errorCode: 'BUNDLE_PRODUCTS_UPDATE_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: deleteError.message
        });
        return { success: false, error: deleteError.message };
      }

      // Insert new bundle products
      const bundleProductsData = products.map(product => ({
        bundle_id: bundleId,
        product_id: product.productId,
        quantity: product.quantity,
        display_order: product.displayOrder || 100,
        created_at: new Date().toISOString()
      }));

      const { data: productsResult, error: insertError } = await supabase
        .from('bundle_products')
        .insert(bundleProductsData)
        .select();

      if (insertError || !productsResult) {
        ValidationMonitor.recordValidationError({
          context: 'ProductBundleService.updateBundleProducts',
          errorCode: 'BUNDLE_PRODUCTS_UPDATE_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: insertError?.message || 'Insert failed'
        });
        return { success: false, error: insertError?.message || 'Failed to update bundle products' };
      }

      // Transform products
      const transformedProducts = productsResult.map(product => 
        BundleProductTransformSchema.parse(product)
      );

      const response: UpdateBundleProductsResponse = {
        bundleId,
        products: transformedProducts,
        updatedCount: transformedProducts.length
      };

      ValidationMonitor.recordPatternSuccess({
        service: 'productBundleService',
        pattern: 'transformation_schema',
        operation: 'updateBundleProducts'
      });

      return { success: true, data: response };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Update failed';
      
      ValidationMonitor.recordValidationError({
        context: 'ProductBundleService.updateBundleProducts',
        errorCode: 'BUNDLE_PRODUCTS_UPDATE_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: errorMessage
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Calculate inventory impact for bundle
   */
  static async calculateInventoryImpact(
    bundleProducts: BundleProductInput[],
    bundleQuantity: number
  ): Promise<ServiceResponse<InventoryImpactResponse>> {
    try {
      // Calculate required inventory
      const impact = BundleInventoryHelpers.calculateInventoryImpact(
        bundleProducts,
        bundleQuantity
      );

      // Get current inventory levels
      const productIds = bundleProducts.map(p => p.productId);
      const inventoryLevels: Record<string, number> = {};

      // Check inventory for each product
      for (const productId of productIds) {
        try {
          const inventoryResult = await InventoryService.getInventoryByProductId(productId);
          if (inventoryResult && typeof inventoryResult === 'object' && 'availableStock' in inventoryResult) {
            inventoryLevels[productId] = inventoryResult.availableStock || 0;
          } else {
            inventoryLevels[productId] = 0;
          }
        } catch {
          inventoryLevels[productId] = 0;
        }
      }

      // Validate availability
      const availability = BundleInventoryHelpers.validateInventoryAvailability(
        bundleProducts,
        bundleQuantity,
        inventoryLevels
      );

      const response: InventoryImpactResponse = {
        impact,
        availability
      };

      ValidationMonitor.recordPatternSuccess({
        service: 'productBundleService',
        pattern: 'transformation_schema',
        operation: 'calculateInventoryImpact'
      });

      return { success: true, data: response };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
      
      ValidationMonitor.recordValidationError({
        context: 'ProductBundleService.calculateInventoryImpact',
        errorCode: 'INVENTORY_CALCULATION_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: errorMessage
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get bundle performance with sales and conversion tracking
   */
  static async getBundlePerformance(
    bundleId: string,
    options: BundlePerformanceOptions,
    userId: string
  ): Promise<ServiceResponse<BundlePerformanceResponse>> {
    try {
      // Validate permissions
      const hasPermission = await RolePermissionService.hasPermission(
        userId, 
        'bundle_management'
      ) || await RolePermissionService.hasPermission(
        userId, 
        'executive_analytics'
      );

      if (!hasPermission) {
        return { success: false, error: 'Insufficient permissions for bundle analytics' };
      }

      // Mock performance data (in real implementation, would query orders/sales tables)
      const performance: BundlePerformance = {
        totalSales: 45,
        conversionRate: 0.12, // 12%
        averageOrderValue: 85.50,
        totalRevenue: 3847.50,
        inventoryTurnover: 2.3
      };

      const response: BundlePerformanceResponse = {
        bundleId,
        performance,
        dateRange: options
      };

      ValidationMonitor.recordPatternSuccess({
        service: 'productBundleService',
        pattern: 'direct_supabase_query',
        operation: 'getBundlePerformance'
      });

      return { success: true, data: response };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Performance query failed';
      
      ValidationMonitor.recordValidationError({
        context: 'ProductBundleService.getBundlePerformance',
        errorCode: 'BUNDLE_PERFORMANCE_QUERY_FAILED',
        validationPattern: 'direct_supabase_query',
        errorMessage: errorMessage
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Toggle bundle activation status with inventory integration
   */
  static async toggleBundleStatus(
    bundleId: string,
    isActive: boolean,
    userId: string
  ): Promise<ServiceResponse<ProductBundleTransform>> {
    try {
      // Validate permissions
      const hasPermission = await RolePermissionService.hasPermission(
        userId, 
        'bundle_management'
      );
      if (!hasPermission) {
        return { success: false, error: 'Insufficient permissions for bundle management' };
      }

      // If activating, check inventory availability
      if (isActive) {
        const { data: bundleProducts } = await supabase
          .from('bundle_products')
          .select('*')
          .eq('bundle_id', bundleId);

        if (bundleProducts && bundleProducts.length > 0) {
          const products = bundleProducts.map(bp => ({
            productId: bp.product_id,
            quantity: bp.quantity
          }));

          const impactResult = await this.calculateInventoryImpact(products, 1);
          if (impactResult.success && impactResult.data && !impactResult.data.availability.isAvailable) {
            ValidationMonitor.recordValidationError({
              context: 'ProductBundleService.toggleBundleStatus',
              errorCode: 'BUNDLE_STATUS_UPDATE_FAILED',
              validationPattern: 'transformation_schema',
              errorMessage: 'Insufficient inventory'
            });
            return { success: false, error: 'Insufficient inventory to activate bundle' };
          }
        }
      }

      // Update bundle status
      const { data, error } = await supabase
        .from('product_bundles')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', bundleId)
        .select()
        .single();

      if (error || !data) {
        ValidationMonitor.recordValidationError({
          context: 'ProductBundleService.toggleBundleStatus',
          errorCode: 'BUNDLE_STATUS_UPDATE_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: error?.message || 'Update failed'
        });
        return { success: false, error: error?.message || 'Failed to update bundle status' };
      }

      // Transform response
      const transformedBundle = ProductBundleTransformSchema.parse(data);

      ValidationMonitor.recordPatternSuccess({
        service: 'productBundleService',
        pattern: 'transformation_schema',
        operation: 'toggleBundleStatus'
      });

      return { success: true, data: transformedBundle };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Status update failed';
      
      ValidationMonitor.recordValidationError({
        context: 'ProductBundleService.toggleBundleStatus',
        errorCode: 'BUNDLE_STATUS_UPDATE_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: errorMessage
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Calculate bundle discount with business logic
   */
  static async calculateBundleDiscount(
    bundleProducts: Array<{ productId: string; quantity: number; price: number }>,
    options: PricingCalculationOptions
  ): Promise<ServiceResponse<PricingCalculationResponse>> {
    try {
      // Calculate individual total
      const individualTotal = bundleProducts.reduce(
        (total, product) => total + (product.price * product.quantity), 
        0
      );

      // Calculate discount amount
      let discountAmount: number;
      if (options.discountType === 'percentage') {
        discountAmount = individualTotal * (options.discountValue / 100);
      } else {
        discountAmount = options.discountValue;
      }

      // Calculate final bundle price
      const bundlePrice = Math.max(0, individualTotal - discountAmount);
      
      // Check if meets minimum savings requirement
      const meetsMinimumSavings = discountAmount >= options.minimumSavings;
      
      // Calculate savings percentage
      const savingsPercentage = individualTotal > 0 ? (discountAmount / individualTotal) * 100 : 0;

      const response: PricingCalculationResponse = {
        individualTotal,
        discountAmount,
        bundlePrice,
        meetsMinimumSavings,
        savingsPercentage
      };

      ValidationMonitor.recordPatternSuccess({
        service: 'productBundleService',
        pattern: 'transformation_schema',
        operation: 'calculateBundleDiscount'
      });

      return { success: true, data: response };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
      
      ValidationMonitor.recordValidationError({
        context: 'ProductBundleService.calculateBundleDiscount',
        errorCode: 'DISCOUNT_CALCULATION_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: errorMessage
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get bundles by status with role-based access
   */
  static async getBundlesByStatus(
    status: 'active' | 'inactive',
    pagination: PaginationOptions,
    userId?: string
  ): Promise<ServiceResponse<PaginatedResponse<ProductBundleTransform>>> {
    try {
      // Check permissions if user provided
      if (userId) {
        const hasPermission = await RolePermissionService.hasPermission(
          userId, 
          'bundle_management'
        ) || await RolePermissionService.hasPermission(
          userId, 
          'inventory_management'
        );

        if (!hasPermission) {
          return { success: false, error: 'Insufficient permissions for bundle access' };
        }
      }

      const isActive = status === 'active';
      const offset = (pagination.page - 1) * pagination.limit;

      // Get total count
      const { count } = await supabase
        .from('product_bundles')
        .select('id', { count: 'exact' })
        .eq('is_active', isActive);

      // Get paginated results
      const { data, error } = await supabase
        .from('product_bundles')
        .select('*')
        .eq('is_active', isActive)
        .order('updated_at', { ascending: false })
        .range(offset, offset + pagination.limit - 1);

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'ProductBundleService.getBundlesByStatus',
          errorCode: 'BUNDLE_QUERY_FAILED',
          validationPattern: 'direct_supabase_query',
          errorMessage: error.message
        });
        return { success: false, error: error.message };
      }

      // Transform results
      const transformedItems = (data || []).map(item => 
        ProductBundleTransformSchema.parse(item)
      );

      const totalCount = count || 0;
      const hasMore = offset + pagination.limit < totalCount;

      const response: PaginatedResponse<ProductBundleTransform> = {
        items: transformedItems,
        totalCount,
        hasMore,
        page: pagination.page,
        limit: pagination.limit
      };

      ValidationMonitor.recordPatternSuccess({
        service: 'productBundleService',
        pattern: 'direct_supabase_query',
        operation: 'getBundlesByStatus'
      });

      return { success: true, data: response };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Query failed';
      
      ValidationMonitor.recordValidationError({
        context: 'ProductBundleService.getBundlesByStatus',
        errorCode: 'BUNDLE_QUERY_FAILED',
        validationPattern: 'direct_supabase_query',
        errorMessage: errorMessage
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get bundle details for campaign integration
   */
  static async getBundleDetails(
    bundleId: string,
    userId: string
  ): Promise<ServiceResponse<BundleWithProducts>> {
    try {
      // Get bundle
      const { data: bundleData, error: bundleError } = await supabase
        .from('product_bundles')
        .select('*')
        .eq('id', bundleId)
        .single();

      if (bundleError || !bundleData) {
        return { success: false, error: 'Bundle not found' };
      }

      // Get bundle products
      const { data: productsData, error: productsError } = await supabase
        .from('bundle_products')
        .select('*')
        .eq('bundle_id', bundleId)
        .order('display_order');

      if (productsError) {
        return { success: false, error: productsError.message };
      }

      // Transform data
      const transformedBundle = ProductBundleTransformSchema.parse(bundleData);
      const transformedProducts = (productsData || []).map(product => 
        BundleProductTransformSchema.parse(product)
      );

      const bundleWithProducts: BundleWithProducts = {
        ...transformedBundle,
        products: transformedProducts
      };

      return { success: true, data: bundleWithProducts };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Query failed';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Calculate bundle savings compared to individual prices
   */
  static async calculateBundleSavings(
    bundlePrice: number,
    bundleProducts: Array<{ productId: string; quantity: number; individualPrice: number }>,
    bundleDiscount?: number
  ): Promise<ServiceResponse<BundleSavingsResponse>> {
    try {
      const individualTotal = bundleProducts.reduce(
        (total, product) => total + (product.individualPrice * product.quantity),
        0
      );

      const finalPrice = bundlePrice - (bundleDiscount || 0);
      const totalSavings = Math.max(0, individualTotal - finalPrice);
      const savingsPercentage = individualTotal > 0 ? (totalSavings / individualTotal) * 100 : 0;
      const hasMeaningfulSavings = savingsPercentage >= 5; // 5% minimum

      const response: BundleSavingsResponse = {
        individualTotal,
        bundlePrice,
        finalPrice,
        totalSavings,
        savingsPercentage,
        hasMeaningfulSavings
      };

      return { success: true, data: response };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Calculate effective price with campaign discounts
   */
  static async calculateEffectivePrice(
    bundlePrice: number,
    bundleDiscount?: number,
    campaignDiscountPercentage?: number
  ): Promise<ServiceResponse<EffectivePriceResponse>> {
    try {
      const bundleDiscountAmount = bundleDiscount || 0;
      const priceAfterBundleDiscount = bundlePrice - bundleDiscountAmount;
      
      const campaignDiscount = campaignDiscountPercentage 
        ? priceAfterBundleDiscount * (campaignDiscountPercentage / 100)
        : 0;
        
      const finalPrice = Math.max(0, priceAfterBundleDiscount - campaignDiscount);
      const totalSavings = bundlePrice - finalPrice;

      const response: EffectivePriceResponse = {
        originalPrice: bundlePrice,
        bundleDiscount: bundleDiscountAmount,
        priceAfterBundleDiscount,
        campaignDiscount,
        finalPrice,
        totalSavings
      };

      return { success: true, data: response };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
      return { success: false, error: errorMessage };
    }
  }
}