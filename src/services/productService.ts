import { Product, Category, ApiResponse, PaginatedResponse } from '../types';
import { supabase, TABLES } from '../config/supabase';
import { BroadcastHelper } from '../utils/broadcastHelper';
import { mapProductFromDB } from '../utils/typeMappers';
import { ProductSchema, CategorySchema, ProductArraySchema, CategoryArraySchema } from '../schemas/product.schema';
import type { Database } from '../config/supabase';
import { ZodError, z } from 'zod';
import { ValidationMonitor } from '../utils/validationMonitor';
import { DefensiveDatabase, DatabaseHelpers } from '../utils/defensiveDatabase';

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

// Validation helper functions with backward-compatible error handling
const validateProduct = (productData: any): Product => {
  try {
    return ProductSchema.parse(productData);
  } catch (error) {
    // Add production validation monitoring
    ValidationMonitor.recordValidationError({
      context: 'ProductService.validateProduct',
      errorMessage: error instanceof Error ? error.message : 'Unknown validation error',
      errorCode: 'PRODUCT_VALIDATION_FAILED'
    });
    
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      throw new Error(`Invalid product data: ${firstIssue.message}`);
    }
    throw new Error('Invalid product data provided');
  }
};

const validateCategory = (categoryData: any): Category => {
  try {
    return CategorySchema.parse(categoryData);
  } catch (error) {
    // Add production validation monitoring
    ValidationMonitor.recordValidationError({
      context: 'ProductService.validateCategory',
      errorMessage: error instanceof Error ? error.message : 'Unknown validation error',
      errorCode: 'CATEGORY_VALIDATION_FAILED'
    });
    
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      throw new Error(`Invalid category data: ${firstIssue.message}`);
    }
    throw new Error('Invalid category data provided');
  }
};

const validateAndMapProducts = (productsData: any[]): Product[] => {
  const validProducts: Product[] = [];
  
  for (const prod of productsData) {
    try {
      const mappedProduct = mapProductFromDB(prod);
      const validatedProduct = validateProduct(mappedProduct);
      validProducts.push(validatedProduct);
    } catch (error) {
      console.warn(`Invalid product data, skipping product:`, {
        productId: prod?.id,
        error: error instanceof Error ? error.message : 'Unknown validation error',
        invalidData: prod
      });
    }
  }
  
  return validProducts;
};

const validateAndMapCategories = (categoriesData: any[]): Category[] => {
  const validCategories: Category[] = [];
  
  for (const cat of categoriesData) {
    try {
      const mappedCategory = {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        imageUrl: cat.image_url,
        sortOrder: cat.sort_order,
        isActive: cat.is_available,
        createdAt: cat.created_at,
        updatedAt: cat.updated_at
      };
      const validatedCategory = validateCategory(mappedCategory);
      validCategories.push(validatedCategory);
    } catch (error) {
      console.warn(`Invalid category data, skipping category:`, {
        categoryId: cat?.id,
        error: error instanceof Error ? error.message : 'Unknown validation error',
        invalidData: cat
      });
    }
  }
  
  return validCategories;
};

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

      // Convert database format to app format with validation
      const categories = validateAndMapCategories(categoriesData || []);

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
      const mappedCategory = {
        id: categoryData.id,
        name: categoryData.name,
        description: categoryData.description,
        imageUrl: categoryData.image_url,
        sortOrder: categoryData.sort_order,
        isActive: categoryData.is_available,
        createdAt: categoryData.created_at,
        updatedAt: categoryData.updated_at
      };
      
      let category: Category;
      try {
        category = validateCategory(mappedCategory);
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
      // Create schema for products with categories using defensive database access
      const ProductWithCategorySchema = z.object({
        ...ProductSchema.shape,
        categories: CategorySchema.nullable().optional()
      });
      
      const productsData = await DatabaseHelpers.fetchFiltered(
        'products',
        'all-available-with-categories',
        ProductWithCategorySchema,
        async () => supabase
          .from(TABLES.PRODUCTS)
          .select(`
            *,
            categories!inner (
              id,
              name,
              description,
              image_url,
              sort_order,
              is_available,
              created_at,
              updated_at
            )
          `)
          .eq('is_available', true)
          .eq('categories.is_available', true)
          .order('name', { ascending: true }),
        {
          maxErrorThreshold: 0.05, // Allow up to 5% invalid products
          includeDetailedErrors: false,
          throwOnCriticalFailure: false
        }
      );

      // Convert database format to app format with validation
      const products = validateAndMapProducts(productsData || []);

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

      // Get paginated products
      const { data: productsData, error } = await supabase
        .from(TABLES.PRODUCTS)
        .select(`
          *,
          categories!inner (
            id,
            name,
            description,
            image_url,
            sort_order,
            is_available,
            created_at,
            updated_at
          )
        `)
        .eq('is_available', true)
        .eq('categories.is_available', true)
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching paginated products:', error);
        return {
          success: false,
          error: `Failed to fetch products: ${error.message}`,
          paginatedProducts: null as any
        };
      }

      // Convert database format to app format with validation
      const products = validateAndMapProducts(productsData || []);

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
      // Create schema for product with category
      const ProductWithCategorySchema = z.object({
        ...ProductSchema.shape,
        categories: CategorySchema.nullable().optional()
      });
      
      const productData = await DefensiveDatabase.fetchSingleWithValidation(
        async () => supabase
          .from(TABLES.PRODUCTS)
          .select(`
            *,
            categories!inner (
              id,
              name,
              description,
              image_url,
              sort_order,
              is_available,
              created_at,
              updated_at
            )
          `)
          .eq('id', id)
          .eq('is_available', true)
          .eq('categories.is_available', true)
          .single(),
        ProductWithCategorySchema,
        `getProductById-${id}`,
        {
          throwOnCriticalFailure: false,
          includeDetailedErrors: false
        }
      );

      if (!productData) {
        return {
          success: false,
          error: 'Product not found',
          product: null as any
        };
      }

      // Convert database format to app format with validation
      let product: Product;
      try {
        const mappedProduct = mapProductFromDB(productData);
        product = validateProduct(mappedProduct);
      } catch (validationError) {
        console.error('Invalid product data from database:', validationError);
        return {
          success: false,
          error: 'Invalid product data received from server',
          product: null as any
        };
      }

      return {
        success: true,
        product
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
      const { data: productsData, error } = await supabase
        .from(TABLES.PRODUCTS)
        .select(`
          *,
          categories!inner (
            id,
            name,
            description,
            image_url,
            sort_order,
            is_available,
            created_at,
            updated_at
          )
        `)
        .eq('is_available', true)
        .eq('categories.is_available', true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error searching products:', error);
        return {
          success: false,
          error: `Failed to search products: ${error.message}`,
          products: []
        };
      }

      // Convert database format to app format with validation
      const products = validateAndMapProducts(productsData || []);

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

  // Get products by category
  async getProductsByCategory(categoryId: string): Promise<ProductApiResponse<Product[]>> {
    try {
      const { data: productsData, error } = await supabase
        .from(TABLES.PRODUCTS)
        .select(`
          *,
          categories!inner (
            id,
            name,
            description,
            image_url,
            sort_order,
            is_available,
            created_at,
            updated_at
          )
        `)
        .eq('category_id', categoryId)
        .eq('is_available', true)
        .eq('categories.is_available', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching products by category:', error);
        return {
          success: false,
          error: `Failed to fetch products by category: ${error.message}`,
          products: []
        };
      }

      // Convert database format to app format with validation
      const products = validateAndMapProducts(productsData || []);

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
