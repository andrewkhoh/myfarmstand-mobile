import { Product, PaginatedResponse, Category } from '../types';
import { supabase, TABLES } from '../config/supabase';
import { BroadcastHelper } from '../utils/broadcastHelper';
// typeMappers import removed - schemas handle field mapping now
import { ProductSchema, transformProduct, CategorySchema } from '../schemas/product.schema';

// Custom API response types for ProductService
interface ProductApiResponse<T> {
  success: boolean;
  error?: string;
  products?: T extends Product[] ? Product[] : never;
  product?: T extends Product ? Product : never;
  categories?: T extends Category[] ? Category[] : never;
  category?: T extends Category ? Category : never;
  paginatedProducts?: T extends PaginatedResponse<Product> ? PaginatedResponse<Product> : never;
}

// Individual validation helper functions removed - schemas handle validation and transformation now

// validateAndMapProducts function removed - schema transforms handle this now

// validateAndMapCategories function removed - CategorySchema transforms handle this now

// Product Service Class - Following CartService pattern
class ProductService {
  // Get all categories from Supabase
  async getCategories(): Promise<ProductApiResponse<Category[]>> {
    try {
      const { data: categoriesData, error } = await supabase
        .from(TABLES.CATEGORIES)
        .select('*')
        .eq('is_available', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
        return {
          success: false,
          error: `Failed to fetch categories: ${error.message}`,
          categories: []
        };
      }

      // Individual validation with skip-on-error (Pattern 3: Resilient Item Processing)
      const categories: Category[] = [];
      for (const rawCategory of categoriesData || []) {
        try {
          const category = CategorySchema.parse(rawCategory);
          categories.push(category);
        } catch (validationError) {
          console.error('Invalid category data, skipping:', {
            categoryId: rawCategory?.id,
            name: rawCategory?.name,
            error: validationError instanceof Error ? validationError.message : 'Unknown validation error'
          });
          // Continue with other categories even if one is invalid
        }
      }

      return {
        success: true,
        categories
      };
    } catch (error) {
      console.error('Error in getCategories:', error);
      return {
        success: false,
        error: 'Failed to fetch categories',
        categories: []
      };
    }
  }

  // Get category by ID
  async getCategoryById(id: string): Promise<ProductApiResponse<Category>> {
    try {
      const { data: categoryData, error } = await supabase
        .from(TABLES.CATEGORIES)
        .select('*')
        .eq('id', id)
        .eq('is_available', true)
        .single();

      if (error || !categoryData) {
        console.error('Error fetching category:', error);
        return {
          success: false,
          error: error?.code === 'PGRST116' ? 'Category not found' : `Failed to fetch category: ${error?.message}`,
          category: null as any
        };
      }

      // Convert database format to app format with validation
      // Category schema now handles validation and field mapping
      let category: Category;
      try {
        category = CategorySchema.parse(categoryData);
      } catch (validationError) {
        console.error('Invalid category data from database:', validationError);
        return {
          success: false,
          error: 'Invalid category data received from server',
          category: null as any
        };
      }

      return {
        success: true,
        category
      };
    } catch (error) {
      console.error('Error in getCategoryById:', error);
      return {
        success: false,
        error: 'Failed to fetch category',
        category: null as any
      };
    }
  }

  // Get all products with populated categories from Supabase
  async getProducts(): Promise<ProductApiResponse<Product[]>> {
    try {
      // Use ProductSchema directly - it already expects 'categories' from DB and transforms to 'category'
      
      // Step 1: Get products with direct query (following Pattern 1: Direct Supabase with Validation)
      const { data: rawProductsData, error } = await supabase
        .from(TABLES.PRODUCTS)
        .select(`
          id,
          name,
          description,
          price,
          stock_quantity,
          category_id,
          image_url,
          is_available,
          is_pre_order,
          min_pre_order_quantity,
          max_pre_order_quantity,
          unit,
          weight,
          sku,
          tags,
          created_at,
          updated_at
        `)
        .eq('is_available', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching products:', error);
        return {
          success: false,
          error: `Failed to fetch products: ${error.message}`,
          products: []
        };
      }

      // Raw products data received from database

      // Step 2: Fetch related categories data (separate query for resilience)
      const uniqueCategoryIds = Array.from(new Set(rawProductsData?.map(product => product.category_id)))
        .filter(id => id && typeof id === 'string'); // Filter out null/undefined values
      
      let rawCategoriesData: any[] = [];
      if (uniqueCategoryIds.length > 0) {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, description, image_url, sort_order, is_available, created_at, updated_at')
          .in('id', uniqueCategoryIds);
        
        if (error) {
          console.error('Category fetch error, continuing without categories:', error);
          // Continue without categories rather than failing completely (Pattern 1: Resilience)
          rawCategoriesData = [];
        } else {
          // Filter for available categories after fetch
          rawCategoriesData = (data || []).filter(cat => cat.is_available === true);
        }
      }

      // Step 3: Individual validation with skip-on-error (following Pattern 3: Resilient Item Processing)
      const products: Product[] = [];
      for (const rawProduct of rawProductsData || []) {
        try {
          // ✅ COMPREHENSIVE FIX: Use enhanced transformation with categories (following Pattern 1)
          const product = transformProduct(rawProduct, rawCategoriesData || []);
          products.push(product);
        } catch (validationError) {
          console.error('Invalid product data, skipping:', {
            productId: rawProduct?.id,
            name: rawProduct?.name,
            error: validationError instanceof Error ? validationError.message : 'Unknown validation error'
          });
          // Continue with other products even if one is invalid
        }
      }

      return {
        success: true,
        products
      };
    } catch (error) {
      console.error('Error in getProducts:', error);
      return {
        success: false,
        error: 'Failed to fetch products',
        products: []
      };
    }
  }

  // Get products with pagination from Supabase
  async getProductsPaginated(page: number = 1, limit: number = 20): Promise<ProductApiResponse<PaginatedResponse<Product>>> {
    try {
      // Get total count first
      const { count, error: countError } = await supabase
        .from(TABLES.PRODUCTS)
        .select('*', { count: 'exact', head: true })
        .eq('is_available', true);

      if (countError) {
        console.error('Error getting product count:', countError);
        return {
          success: false,
          error: `Failed to get product count: ${countError.message}`,
          paginatedProducts: null as any
        };
      }

      const totalItems = count || 0;
      const totalPages = Math.ceil(totalItems / limit);
      const offset = (page - 1) * limit;

      // Get paginated products using simplified query
      const queryBuilder = supabase
        .from(TABLES.PRODUCTS)
        .select(`
          id, name, description, price, stock_quantity, 
          category_id, image_url, is_weekly_special, is_bundle,
          seasonal_availability, unit, weight, sku, tags, nutrition_info,
          is_available, is_pre_order, pre_order_available_date,
          min_pre_order_quantity, max_pre_order_quantity, created_at, updated_at
        `)
        .eq('is_available', true)
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1);

      const products = await this.executeSimplifiedProductQuery(queryBuilder);

      const paginatedResponse: PaginatedResponse<Product> = {
        data: products,
        total: totalItems,
        page: page,
        limit: limit,
        hasMore: page < totalPages,
        totalPages: totalPages
      };

      return {
        success: true,
        paginatedProducts: paginatedResponse
      };
    } catch (error) {
      console.error('Error in getProductsPaginated:', error);
      return {
        success: false,
        error: 'Failed to fetch paginated products',
        paginatedProducts: null as any
      };
    }
  }

  // Get product by ID using defensive database access
  async getProductById(id: string): Promise<ProductApiResponse<Product>> {
    try {
      // Get raw data using simplified query (same as other methods)
      const { data: rawData, error } = await supabase
        .from(TABLES.PRODUCTS)
        .select(`
          id, name, description, price, stock_quantity, 
          category_id, image_url, is_weekly_special, is_bundle,
          seasonal_availability, unit, weight, sku, tags, nutrition_info,
          is_available, is_pre_order, pre_order_available_date,
          min_pre_order_quantity, max_pre_order_quantity, created_at, updated_at
        `)
        .eq('id', id)
        .eq('is_available', true)
        .single();

      if (error || !rawData) {
        return {
          success: false,
          error: error?.message || 'Product not found',
          product: null as any
        };
      }

      // Transform product data following Pattern 1: separate category lookup for resilience
      let transformedProduct: Product;
      try {
        // Get categories separately for resilience (following architectural patterns)
        const uniqueCategoryIds = rawData.category_id ? [rawData.category_id] : [];
        let rawCategoriesData: any[] = [];
        
        if (uniqueCategoryIds.length > 0) {
          const { data: categoriesData, error: categoryError } = await supabase
            .from('categories')
            .select('id, name, description, image_url, sort_order, is_available, created_at, updated_at')
            .in('id', uniqueCategoryIds);
          
          if (categoryError) {
            console.error('Warning: Category fetch failed, continuing without categories:', categoryError);
            // Continue without categories rather than failing completely (Pattern 1: Resilience)
            rawCategoriesData = [];
          } else {
            // Filter for available categories after fetch
            rawCategoriesData = (categoriesData || []).filter(cat => cat.is_available === true);
          }
        }

        // Use enhanced transformation with category population
        transformedProduct = transformProduct(rawData, rawCategoriesData);
      } catch (transformationError) {
        console.error('Error transforming product data:', transformationError);
        return {
          success: false,
          error: 'Failed to process product data',
          product: null as any
        };
      }

      return {
        success: true,
        product: transformedProduct
      };
    } catch (error) {
      console.error('Error in getProductById:', error);
      return {
        success: false,
        error: 'Failed to fetch product',
        product: null as any
      };
    }
  }

  // Search products
  async searchProducts(query: string): Promise<ProductApiResponse<Product[]>> {
    try {
      const queryBuilder = supabase
        .from(TABLES.PRODUCTS)
        .select(`
          id, name, description, price, stock_quantity, 
          category_id, image_url, is_weekly_special, is_bundle,
          seasonal_availability, unit, weight, sku, tags, nutrition_info,
          is_available, is_pre_order, pre_order_available_date,
          min_pre_order_quantity, max_pre_order_quantity, created_at, updated_at
        `)
        .eq('is_available', true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
        .order('name', { ascending: true });

      const products = await this.executeSimplifiedProductQuery(queryBuilder);

      return {
        success: true,
        products
      };
    } catch (error) {
      console.error('Error in searchProducts:', error);
      return {
        success: false,
        error: 'Failed to search products',
        products: []
      };
    }
  }

  // Helper function to execute product query with proper transformation and category population
  // Following Pattern 1: Separate queries for resilience and Pattern 4: Transformation Schema Architecture
  private async executeSimplifiedProductQuery(queryBuilder: any): Promise<Product[]> {
    const { data: rawProductsData, error } = await queryBuilder;
    
    if (error) {
      throw error;
    }

    // Step 1: Get unique category IDs from products (Pattern 1: Separate queries)
    const uniqueCategoryIds = Array.from(new Set(rawProductsData?.map((product: any) => product.category_id)))
      .filter(id => id && typeof id === 'string');
    
    // Step 2: Fetch categories separately for resilience
    let rawCategoriesData: any[] = [];
    if (uniqueCategoryIds.length > 0) {
      const { data: categoriesData, error: categoryError } = await supabase
        .from('categories')
        .select('id, name, description, image_url, sort_order, is_available, created_at, updated_at')
        .in('id', uniqueCategoryIds);
      
      if (categoryError) {
        console.error('Warning: Category fetch failed, continuing without categories:', categoryError);
        // Continue without categories rather than failing completely (Pattern 1: Resilience)
        rawCategoriesData = [];
      } else {
        // Filter for available categories after fetch
        rawCategoriesData = (categoriesData || []).filter(cat => cat.is_available === true);
      }
    }

    // Step 3: Individual validation with skip-on-error (Pattern 3: Resilient Item Processing)
    const products: Product[] = [];
    for (const rawProduct of rawProductsData || []) {
      try {
        // Use enhanced transformation with category population (Pattern 4)
        const product = transformProduct(rawProduct, rawCategoriesData);
        products.push(product);
      } catch (validationError) {
        console.error('Invalid product data, skipping:', {
          productId: rawProduct?.id,
          name: rawProduct?.name,
          error: validationError instanceof Error ? validationError.message : 'Unknown validation error'
        });
        // Continue with other products even if one is invalid
      }
    }

    return products;
  }

  // Get products by category
  async getProductsByCategory(categoryId: string): Promise<ProductApiResponse<Product[]>> {
    try {
      const queryBuilder = supabase
        .from(TABLES.PRODUCTS)
        .select(`
          id, name, description, price, stock_quantity, 
          category_id, image_url, is_weekly_special, is_bundle,
          seasonal_availability, unit, weight, sku, tags, nutrition_info,
          is_available, is_pre_order, pre_order_available_date,
          min_pre_order_quantity, max_pre_order_quantity, created_at, updated_at
        `)
        .eq('category_id', categoryId)
        .eq('is_available', true)
        .order('name', { ascending: true });

      const products = await this.executeSimplifiedProductQuery(queryBuilder);

      return {
        success: true,
        products
      };
    } catch (error) {
      console.error('Error in getProductsByCategory:', error);
      return {
        success: false,
        error: 'Failed to fetch products by category',
        products: []
      };
    }
  }

  // Update product stock (with broadcast) - Following CartService pattern
  async updateProductStock(productId: string, newStock: number): Promise<{ success: boolean; message?: string; product?: Product }> {
    try {
      // Update stock in database
      const { data, error } = await supabase
        .from(TABLES.PRODUCTS)
        .update({ 
          stock_quantity: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)
        .select()
        .single();

      if (error) {
        console.error('Error updating product stock:', error);
        return {
          success: false,
          message: `Failed to update product stock: ${error.message}`
        };
      }

      if (!data) {
        return {
          success: false,
          message: 'Product not found'
        };
      }

      // Fetch complete product data for broadcast
      const productResponse = await this.getProductById(productId);
      if (!productResponse.success || !productResponse.product) {
        return {
          success: false,
          message: 'Failed to fetch updated product data'
        };
      }

      // Broadcast event with robust error handling (CartService pattern)
      try {
        await BroadcastHelper.sendProductUpdate('stock-updated', {
          productId: productId,
          newStock: newStock,
          product: productResponse.product
        });
      } catch (error) {
        console.warn('Failed to broadcast product stock update:', error);
        // Stock update still succeeds even if broadcast fails
      }

      return {
        success: true,
        message: `Product stock updated to ${newStock}`,
        product: productResponse.product
      };

    } catch (error) {
      console.error('Error updating product stock:', error);
      return {
        success: false,
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Create and export singleton instance
const productService = new ProductService();
export default productService;

// Export individual methods for backward compatibility
export const getCategories = () => productService.getCategories();
export const getCategoryById = (id: string) => productService.getCategoryById(id);
export const getProducts = () => productService.getProducts();
export const getProductsPaginated = (page?: number, limit?: number) => productService.getProductsPaginated(page, limit);
export const getProductById = (id: string) => productService.getProductById(id);
export const searchProducts = (query: string) => productService.searchProducts(query);
export const getProductsByCategory = (categoryId: string) => productService.getProductsByCategory(categoryId);
export const updateProductStock = (productId: string, newStock: number) => productService.updateProductStock(productId, newStock);
