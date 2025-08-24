/**
 * Product Admin Service
 * 
 * Implements admin-specific CRUD operations for products and categories
 * following direct Supabase patterns with validation.
 * 
 * Pattern: Direct Supabase + Validation (Pattern 1)
 * Pattern: Resilient Item Processing with skip-on-error (Pattern 3)
 */

import { supabase, TABLES } from '../config/supabase';
import { BroadcastHelper } from '../utils/broadcastHelper';
import { ValidationMonitor } from '../utils/validationMonitor';
import {
  transformProductAdmin,
  transformCategoryAdmin,
  prepareProductForInsert,
  prepareProductForUpdate,
  prepareCategoryForInsert,
  prepareCategoryForUpdate,
  ProductAdminCreateSchema,
  ProductAdminUpdateSchema,
  CategoryAdminCreateSchema,
  CategoryAdminUpdateSchema,
  BulkStockUpdateSchema,
  LowStockQuerySchema,
  OutOfStockQuerySchema,
  type ProductAdminTransform,
  type CategoryAdminTransform,
  type ProductAdminCreate,
  type ProductAdminUpdate,
  type CategoryAdminCreate,
  type CategoryAdminUpdate,
  type BulkStockUpdate,
  type LowStockQuery,
  type OutOfStockQuery,
} from '../schemas/productAdmin.schema';

// Admin-specific API response types
interface ProductAdminApiResponse<T> {
  success: boolean;
  error?: string;
  userMessage?: string;
  products?: T extends ProductAdminTransform[] ? ProductAdminTransform[] : never;
  product?: T extends ProductAdminTransform ? ProductAdminTransform : never;
  categories?: T extends CategoryAdminTransform[] ? CategoryAdminTransform[] : never;
  category?: T extends CategoryAdminTransform ? CategoryAdminTransform : never;
  count?: number;
  totalProcessed?: number;
  errors?: Array<{ id: string; error: string }>;
}

// Bulk operation result types
interface BulkOperationResult {
  success: boolean;
  totalRequested: number;
  totalProcessed: number;
  successfulUpdates: Array<{ id: string; oldValue: number; newValue: number }>;
  failedUpdates: Array<{ id: string; error: string }>;
  userMessage: string;
}

class ProductAdminService {
  
  /**
   * Get all products for admin (includes unavailable products)
   * Following Pattern 1: Direct Supabase with validation
   */
  async getAllProducts(): Promise<ProductAdminApiResponse<ProductAdminTransform[]>> {
    try {
      // Step 1: Get products with exact field selection (MUST match database.generated.ts)
      const { data: rawProductsData, error } = await supabase
        .from(TABLES.PRODUCTS)
        .select(`
          id,
          name,
          description,
          price,
          category_id,
          image_url,
          is_available,
          is_bundle,
          is_pre_order,
          is_weekly_special,
          max_pre_order_quantity,
          min_pre_order_quantity,
          nutrition_info,
          pre_order_available_date,
          seasonal_availability,
          sku,
          stock_quantity,
          tags,
          unit,
          weight,
          created_at,
          updated_at
        `)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching admin products:', error);
        return {
          success: false,
          error: `Database error: ${error.message}`,
          userMessage: 'Failed to load products. Please try again.',
          products: []
        };
      }

      // Step 2: Fetch categories separately for resilience (Pattern 1)
      const uniqueCategoryIds = Array.from(new Set(rawProductsData?.map(product => product.category_id)))
        .filter(id => id && typeof id === 'string');
      
      let rawCategoriesData: any[] = [];
      if (uniqueCategoryIds.length > 0) {
        const { data, error: categoryError } = await supabase
          .from(TABLES.CATEGORIES)
          .select('id, name, description, image_url, sort_order, is_available, created_at, updated_at')
          .in('id', uniqueCategoryIds);
        
        if (categoryError) {
          console.error('Category fetch error, continuing without categories:', categoryError);
          rawCategoriesData = [];
        } else {
          rawCategoriesData = data || [];
        }
      }

      // Step 3: Individual validation with skip-on-error (Pattern 3: Resilient Item Processing)
      const startTime = Date.now();
      const products: ProductAdminTransform[] = [];
      const errors: Array<{ id: string; error: string }> = [];
      
      for (const rawProduct of rawProductsData || []) {
        try {
          const product = transformProductAdmin(rawProduct, rawCategoriesData);
          products.push(product);
          
          // Track successful validation
          ValidationMonitor.recordPatternSuccess({
            service: 'productAdminService',
            pattern: 'transformation_schema',
            operation: 'getAllProducts',
            performanceMs: Date.now() - startTime
          });
        } catch (validationError) {
          const errorMessage = validationError instanceof Error ? validationError.message : 'Unknown validation error';
          
          // Track validation failure
          ValidationMonitor.recordValidationError({
            context: `getAllProducts - productId: ${rawProduct?.id}, name: ${rawProduct?.name}`,
            errorMessage: errorMessage
          });
          
          console.error('Invalid product data, skipping:', {
            productId: rawProduct?.id,
            name: rawProduct?.name,
            error: errorMessage
          });
          
          errors.push({
            id: rawProduct?.id || 'unknown',
            error: errorMessage
          });
        }
      }

      return {
        success: true,
        products,
        count: products.length,
        totalProcessed: rawProductsData?.length || 0,
        errors: errors.length > 0 ? errors : undefined,
      };
      
    } catch (error) {
      console.error('Error in getAllProducts:', error);
      return {
        success: false,
        error: 'Unexpected error occurred',
        userMessage: 'Something went wrong. Please try again.',
        products: []
      };
    }
  }

  /**
   * Get product by ID for admin editing
   */
  async getProductById(id: string): Promise<ProductAdminApiResponse<ProductAdminTransform>> {
    try {
      // Get product with exact field selection
      const { data: rawProduct, error } = await supabase
        .from(TABLES.PRODUCTS)
        .select(`
          id, name, description, price, category_id, image_url,
          is_available, is_bundle, is_pre_order, is_weekly_special,
          max_pre_order_quantity, min_pre_order_quantity, nutrition_info,
          pre_order_available_date, seasonal_availability, sku, stock_quantity,
          tags, unit, weight, created_at, updated_at
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching admin product:', error);
        const userMessage = error.code === 'PGRST116' ? 'Product not found' : 'Failed to load product';
        return {
          success: false,
          error: error.message,
          userMessage,
          product: null as any
        };
      }

      // Get category separately for resilience
      let rawCategoriesData: any[] = [];
      if (rawProduct.category_id) {
        const { data: categoryData, error: categoryError } = await supabase
          .from(TABLES.CATEGORIES)
          .select('id, name, description, image_url, sort_order, is_available, created_at, updated_at')
          .eq('id', rawProduct.category_id)
          .single();
        
        if (categoryError) {
          console.warn('Category fetch failed for product, continuing without category:', categoryError);
        } else if (categoryData) {
          rawCategoriesData = [categoryData];
        }
      }

      // Transform product data
      try {
        const product = transformProductAdmin(rawProduct, rawCategoriesData);
        return {
          success: true,
          product
        };
      } catch (validationError) {
        console.error('Product validation failed:', validationError);
        return {
          success: false,
          error: 'Invalid product data',
          userMessage: 'Product data is corrupted. Please contact support.',
          product: null as any
        };
      }
      
    } catch (error) {
      console.error('Error in getProductById:', error);
      return {
        success: false,
        error: 'Unexpected error occurred',
        userMessage: 'Something went wrong. Please try again.',
        product: null as any
      };
    }
  }

  /**
   * Create new product
   */
  async createProduct(productData: ProductAdminCreate): Promise<ProductAdminApiResponse<ProductAdminTransform>> {
    try {
      // Step 1: Validate input data
      const validatedData = ProductAdminCreateSchema.parse(productData);
      
      // Track validation success
      ValidationMonitor.recordPatternSuccess({
        service: 'productAdminService',
        pattern: 'transformation_schema',
        operation: 'createProduct'
      });
      
      // Step 2: Prepare for database insert
      const insertData = prepareProductForInsert(validatedData);
      
      // Step 3: Insert into database
      const { data: createdProduct, error } = await supabase
        .from(TABLES.PRODUCTS)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating product:', error);
        
        // User-friendly error messages
        let userMessage = 'Failed to create product. Please try again.';
        if (error.code === '23505') {
          userMessage = 'A product with this SKU already exists.';
        } else if (error.code === '23503') {
          userMessage = 'Invalid category selected.';
        }
        
        return {
          success: false,
          error: error.message,
          userMessage,
          product: null as any
        };
      }

      // Step 4: Fetch complete product data for response
      const productResponse = await this.getProductById(createdProduct.id);
      if (!productResponse.success || !productResponse.product) {
        return {
          success: false,
          error: 'Product created but failed to retrieve data',
          userMessage: 'Product created successfully.',
          product: null as any
        };
      }

      // Step 5: Broadcast creation event (atomic operation)
      try {
        await BroadcastHelper.sendProductUpdate('product-created', {
          productId: createdProduct.id,
          product: productResponse.product,
          operation: 'admin-create',
        });
      } catch (broadcastError) {
        console.warn('Failed to broadcast product creation:', broadcastError);
        // Creation still succeeds even if broadcast fails
      }

      return {
        success: true,
        product: productResponse.product,
        userMessage: 'Product created successfully.'
      };
      
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        console.error('Product creation validation failed:', error);
        return {
          success: false,
          error: 'Invalid product data',
          userMessage: 'Please check your input and try again.',
          product: null as any
        };
      }
      
      console.error('Error in createProduct:', error);
      return {
        success: false,
        error: 'Unexpected error occurred',
        userMessage: 'Something went wrong. Please try again.',
        product: null as any
      };
    }
  }

  /**
   * Update existing product
   */
  async updateProduct(id: string, updateData: ProductAdminUpdate): Promise<ProductAdminApiResponse<ProductAdminTransform>> {
    try {
      // Step 1: Validate input data
      const validatedData = ProductAdminUpdateSchema.parse(updateData);
      
      // Step 2: Prepare for database update
      const updatePayload = prepareProductForUpdate(validatedData);
      
      // Step 3: Update in database
      const { data, error } = await supabase
        .from(TABLES.PRODUCTS)
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating product:', error);
        
        // User-friendly error messages
        let userMessage = 'Failed to update product. Please try again.';
        if (error.code === 'PGRST116') {
          userMessage = 'Product not found.';
        } else if (error.code === '23505') {
          userMessage = 'A product with this SKU already exists.';
        } else if (error.code === '23503') {
          userMessage = 'Invalid category selected.';
        }
        
        return {
          success: false,
          error: error.message,
          userMessage,
          product: null as any
        };
      }

      // Step 4: Fetch complete updated product data
      const productResponse = await this.getProductById(id);
      if (!productResponse.success || !productResponse.product) {
        return {
          success: false,
          error: 'Product updated but failed to retrieve data',
          userMessage: 'Product updated successfully.',
          product: null as any
        };
      }

      // Step 5: Broadcast update event (atomic operation)
      try {
        await BroadcastHelper.sendProductUpdate('product-updated', {
          productId: id,
          product: productResponse.product,
          operation: 'admin-update',
          changes: validatedData,
        });
      } catch (broadcastError) {
        console.warn('Failed to broadcast product update:', broadcastError);
        // Update still succeeds even if broadcast fails
      }

      return {
        success: true,
        product: productResponse.product,
        userMessage: 'Product updated successfully.'
      };
      
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        console.error('Product update validation failed:', error);
        return {
          success: false,
          error: 'Invalid product data',
          userMessage: 'Please check your input and try again.',
          product: null as any
        };
      }
      
      console.error('Error in updateProduct:', error);
      return {
        success: false,
        error: 'Unexpected error occurred',
        userMessage: 'Something went wrong. Please try again.',
        product: null as any
      };
    }
  }

  /**
   * Delete product (soft delete by setting is_available = false)
   */
  async deleteProduct(id: string): Promise<ProductAdminApiResponse<ProductAdminTransform>> {
    try {
      // Soft delete by updating is_available
      const { data, error } = await supabase
        .from(TABLES.PRODUCTS)
        .update({ 
          is_available: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error deleting product:', error);
        const userMessage = error.code === 'PGRST116' ? 'Product not found' : 'Failed to delete product';
        return {
          success: false,
          error: error.message,
          userMessage,
          product: null as any
        };
      }

      // Broadcast deletion event
      try {
        await BroadcastHelper.sendProductUpdate('product-deleted', {
          productId: id,
          operation: 'admin-delete',
        });
      } catch (broadcastError) {
        console.warn('Failed to broadcast product deletion:', broadcastError);
        // Deletion still succeeds even if broadcast fails
      }

      return {
        success: true,
        userMessage: 'Product deleted successfully.',
        product: null as any
      };
      
    } catch (error) {
      console.error('Error in deleteProduct:', error);
      return {
        success: false,
        error: 'Unexpected error occurred',
        userMessage: 'Something went wrong. Please try again.',
        product: null as any
      };
    }
  }

  /**
   * Bulk update stock quantities
   * Following Pattern 3: Resilient Item Processing
   */
  async bulkUpdateStock(updates: BulkStockUpdate[]): Promise<BulkOperationResult> {
    const results: BulkOperationResult = {
      success: false,
      totalRequested: updates.length,
      totalProcessed: 0,
      successfulUpdates: [],
      failedUpdates: [],
      userMessage: ''
    };

    try {
      // Validate all updates first
      const validatedUpdates = updates.map((update, index) => {
        try {
          return BulkStockUpdateSchema.parse(update);
        } catch (validationError) {
          results.failedUpdates.push({
            id: update.product_id || `item-${index}`,
            error: validationError instanceof Error ? validationError.message : 'Validation failed'
          });
          return null;
        }
      }).filter(Boolean);

      // Process each update individually (Pattern 3: skip-on-error)
      for (const update of validatedUpdates) {
        if (!update) continue; // Skip null/undefined entries
        
        try {
          const { data, error } = await supabase
            .from(TABLES.PRODUCTS)
            .update({ 
              stock_quantity: update.new_stock,
              updated_at: new Date().toISOString()
            })
            .eq('id', update.product_id)
            .select('id, stock_quantity')
            .single();

          if (error) {
            results.failedUpdates.push({
              id: update.product_id,
              error: error.message
            });
            
            // Track failed bulk operation
            ValidationMonitor.recordValidationError({
              context: `bulkUpdateStock - productId: ${update?.product_id}`,
              errorMessage: error.message
            });
          } else {
            results.successfulUpdates.push({
              id: update.product_id,
              oldValue: 0, // We don't fetch old value for performance
              newValue: update.new_stock
            });
            results.totalProcessed++;
            
            // Track successful bulk operation
            ValidationMonitor.recordPatternSuccess({
              service: 'productAdminService',
              pattern: 'direct_supabase_query',
              operation: 'bulkUpdateStock'
            });

            // Broadcast individual update
            try {
              await BroadcastHelper.sendProductUpdate('stock-updated', {
                productId: update.product_id,
                newStock: update.new_stock,
                operation: 'admin-bulk-update',
                reason: update.reason,
              });
            } catch (broadcastError) {
              console.warn('Failed to broadcast stock update:', broadcastError);
            }
          }
        } catch (error) {
          results.failedUpdates.push({
            id: update.product_id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Determine overall success
      results.success = results.totalProcessed > 0;

      // Generate user message
      if (results.totalProcessed === results.totalRequested) {
        results.userMessage = `Successfully updated stock for ${results.totalProcessed} products.`;
      } else if (results.totalProcessed > 0) {
        results.userMessage = `Updated stock for ${results.totalProcessed} of ${results.totalRequested} products. ${results.failedUpdates.length} failed.`;
      } else {
        results.userMessage = 'Failed to update any products. Please check your data and try again.';
      }

      return results;
      
    } catch (error) {
      console.error('Error in bulkUpdateStock:', error);
      return {
        ...results,
        success: false,
        userMessage: 'Bulk update failed. Please try again.'
      };
    }
  }

  /**
   * Get products with low stock
   */
  async getLowStockProducts(queryParams: LowStockQuery = { threshold: 20, include_unavailable: false }): Promise<ProductAdminApiResponse<ProductAdminTransform[]>> {
    try {
      const validatedParams = LowStockQuerySchema.parse(queryParams);
      
      // Get all products and filter for low stock
      const allProductsResponse = await this.getAllProducts();
      if (!allProductsResponse.success) {
        return allProductsResponse;
      }

      const lowStockProducts = allProductsResponse.products?.filter(product => {
        // Base condition: stock quantity is at or below threshold
        let isLowStock = product.stock_quantity <= validatedParams.threshold;
        
        // Include/exclude unavailable products
        if (!validatedParams.include_unavailable && !product.is_available) {
          return false;
        }
        
        // Category filter
        if (validatedParams.category_filter && product.category?.id !== validatedParams.category_filter) {
          return false;
        }
        
        return isLowStock;
      }) || [];

      return {
        success: true,
        products: lowStockProducts,
        count: lowStockProducts.length
      };
      
    } catch (error) {
      console.error('Error in getLowStockProducts:', error);
      return {
        success: false,
        error: 'Unexpected error occurred',
        userMessage: 'Something went wrong. Please try again.',
        products: []
      };
    }
  }

  /**
   * Get out of stock products
   */
  async getOutOfStockProducts(queryParams: OutOfStockQuery = { include_unavailable: false, include_pre_order: false }): Promise<ProductAdminApiResponse<ProductAdminTransform[]>> {
    try {
      const validatedParams = OutOfStockQuerySchema.parse(queryParams);
      
      const allProductsResponse = await this.getAllProducts();
      if (!allProductsResponse.success) {
        return allProductsResponse;
      }

      let outOfStockProducts = allProductsResponse.products?.filter(product => {
        // Base condition: stock quantity is 0
        let isOutOfStock = product.stock_quantity === 0;
        
        // Include/exclude unavailable products
        if (!validatedParams.include_unavailable && !product.is_available) {
          return false;
        }
        
        // Include/exclude pre-order products
        if (!validatedParams.include_pre_order && product.is_pre_order) {
          return false;
        }
        
        // Category filter
        if (validatedParams.category_filter && product.category?.id !== validatedParams.category_filter) {
          return false;
        }
        
        return isOutOfStock;
      }) || [];

      return {
        success: true,
        products: outOfStockProducts,
        count: outOfStockProducts.length
      };
      
    } catch (error) {
      console.error('Error in getOutOfStockProducts:', error);
      return {
        success: false,
        error: 'Unexpected error occurred',
        userMessage: 'Something went wrong. Please try again.',
        products: []
      };
    }
  }

  /**
   * Get all categories for admin (includes unavailable categories)
   */
  async getAllCategories(): Promise<ProductAdminApiResponse<CategoryAdminTransform[]>> {
    try {
      const { data: rawCategories, error } = await supabase
        .from(TABLES.CATEGORIES)
        .select('id, name, description, image_url, sort_order, is_available, created_at, updated_at')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching admin categories:', error);
        return {
          success: false,
          error: error.message,
          userMessage: 'Failed to load categories.',
          categories: []
        };
      }

      // Transform categories with individual validation (Pattern 3)
      const categories: CategoryAdminTransform[] = [];
      const errors: Array<{ id: string; error: string }> = [];
      
      for (const rawCategory of rawCategories || []) {
        try {
          const category = transformCategoryAdmin(rawCategory);
          categories.push(category);
        } catch (validationError) {
          const errorMessage = validationError instanceof Error ? validationError.message : 'Unknown validation error';
          console.error('Invalid category data, skipping:', {
            categoryId: rawCategory?.id,
            name: rawCategory?.name,
            error: errorMessage
          });
          
          errors.push({
            id: rawCategory?.id || 'unknown',
            error: errorMessage
          });
        }
      }

      return {
        success: true,
        categories,
        count: categories.length,
        totalProcessed: rawCategories?.length || 0,
        errors: errors.length > 0 ? errors : undefined,
      };
      
    } catch (error) {
      console.error('Error in getAllCategories:', error);
      return {
        success: false,
        error: 'Unexpected error occurred',
        userMessage: 'Something went wrong. Please try again.',
        categories: []
      };
    }
  }
}

// Create and export singleton instance
const productAdminService = new ProductAdminService();
export default productAdminService;

// Export individual methods for testing and direct usage
export const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUpdateStock,
  getLowStockProducts,
  getOutOfStockProducts,
  getAllCategories,
} = productAdminService;