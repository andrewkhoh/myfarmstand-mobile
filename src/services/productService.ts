import { Product, Category, ApiResponse, PaginatedResponse } from '../types';
import { supabase, TABLES } from '../config/supabase';
import type { Database } from '../config/supabase';

// Mock API delay to simulate network requests
const API_DELAY = 1000;

const mockDelay = (ms: number = API_DELAY) => 
  new Promise(resolve => setTimeout(resolve, ms));

// Mock categories data
const mockCategories: Category[] = [
  {
    id: '1',
    name: 'Vegetables',
    description: 'Fresh, locally grown vegetables',
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=400&fit=crop',
    sortOrder: 1,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Fruits',
    description: 'Sweet and fresh seasonal fruits',
    imageUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop',
    sortOrder: 2,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'Dairy & Eggs',
    description: 'Farm fresh dairy products and eggs',
    imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop',
    sortOrder: 3,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '4',
    name: 'Herbs',
    description: 'Fresh aromatic herbs',
    imageUrl: 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=400&h=400&fit=crop',
    sortOrder: 4,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '5',
    name: 'Bakery',
    description: 'Freshly baked goods',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
    sortOrder: 5,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '6',
    name: 'Pantry',
    description: 'Pantry staples and preserves',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop',
    sortOrder: 6,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// Enhanced mock products with proper category relationships
const mockProductsData: Product[] = [
  {
    id: '1',
    name: 'Organic Tomatoes',
    description: 'Fresh, locally grown organic tomatoes. Perfect for salads, cooking, or eating fresh. Grown without pesticides or chemicals.',
    price: 4.99,
    stock: 25,
    categoryId: '1',
    imageUrl: 'https://images.unsplash.com/photo-1546470427-e5ac89cd0b31?w=400&h=400&fit=crop',
    isWeeklySpecial: true,
    isBundle: false,
    seasonalAvailability: true,
    unit: 'lb',
    weight: 1,
    sku: 'VEG-TOM-001',
    tags: ['organic', 'local', 'fresh'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Fresh Spinach',
    description: 'Crisp, fresh spinach leaves. Rich in iron and vitamins. Great for salads, smoothies, or cooking.',
    price: 3.49,
    stock: 18,
    categoryId: '1',
    imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=400&fit=crop',
    isWeeklySpecial: false,
    isBundle: false,
    seasonalAvailability: true,
    unit: 'bunch',
    weight: 0.5,
    sku: 'VEG-SPI-001',
    tags: ['leafy', 'healthy', 'iron'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'Honeycrisp Apples',
    description: 'Sweet and crunchy Honeycrisp apples. Perfect for snacking or baking. Locally sourced when in season.',
    price: 5.99,
    stock: 32,
    categoryId: '2',
    imageUrl: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400&h=400&fit=crop',
    isWeeklySpecial: false,
    isBundle: false,
    seasonalAvailability: true,
    unit: 'lb',
    weight: 3,
    sku: 'FRU-APP-001',
    tags: ['sweet', 'crunchy', 'local'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '4',
    name: 'Farm Fresh Eggs',
    description: 'Free-range eggs from our local partner farms. Rich, golden yolks and excellent for all your cooking needs.',
    price: 6.99,
    stock: 15,
    categoryId: '3',
    imageUrl: 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?w=400&h=400&fit=crop',
    isWeeklySpecial: true,
    isBundle: false,
    seasonalAvailability: false,
    unit: 'dozen',
    weight: 1.5,
    sku: 'DAI-EGG-001',
    tags: ['free-range', 'local', 'protein'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '5',
    name: 'Organic Carrots',
    description: 'Sweet, crunchy organic carrots. Great for snacking, cooking, or juicing. Grown locally without chemicals.',
    price: 2.99,
    stock: 28,
    categoryId: '1',
    imageUrl: 'https://images.unsplash.com/photo-1445282768818-728615cc910a?w=400&h=400&fit=crop',
    isWeeklySpecial: false,
    isBundle: false,
    seasonalAvailability: true,
    unit: 'lb',
    weight: 2,
    sku: 'VEG-CAR-001',
    tags: ['organic', 'sweet', 'healthy'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// Product Service Class
export class ProductService {
  // Get all categories from Supabase
  static async getCategories(): Promise<ApiResponse<Category[]>> {
    try {
      const { data, error } = await supabase
        .from(TABLES.CATEGORIES)
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Failed to fetch categories:', error);
        return {
          data: [],
          success: false,
          error: 'Failed to fetch categories',
        };
      }

      // Convert database format to app format
      const categories: Category[] = (data || []).map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        imageUrl: cat.image_url,
        sortOrder: cat.sort_order,
        isActive: cat.is_active,
        createdAt: cat.created_at,
        updatedAt: cat.updated_at,
      }));

      return {
        data: categories,
        success: true,
        message: 'Categories fetched successfully',
      };
    } catch (error) {
      console.error('Categories fetch error:', error);
      return {
        data: [],
        success: false,
        error: 'Failed to fetch categories',
      };
    }
  }

  // Get category by ID
  static async getCategoryById(id: string): Promise<ApiResponse<Category>> {
    await mockDelay(500);
    
    try {
      const category = mockCategories.find(cat => cat.id === id && cat.isActive);
      
      if (!category) {
        return {
          data: {} as Category,
          success: false,
          error: 'Category not found',
        };
      }

      return {
        data: category,
        success: true,
        message: 'Category fetched successfully',
      };
    } catch (error) {
      return {
        data: {} as Category,
        success: false,
        error: 'Failed to fetch category',
      };
    }
  }

  // Get all products with populated categories from Supabase
  static async getProducts(): Promise<ApiResponse<Product[]>> {
    try {
      const { data, error } = await supabase
        .from(TABLES.PRODUCTS)
        .select('*')
        .eq('is_available', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Failed to fetch products:', error);
        return {
          data: [],
          success: false,
          error: 'Failed to fetch products',
        };
      }

      // Convert database format to app format
      const products: Product[] = (data || []).map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock_quantity,
        categoryId: product.category,
        imageUrl: product.image_url || '',
        isActive: product.is_available,
        isPreOrder: product.is_pre_order,
        preOrderAvailableDate: product.pre_order_available_date,
        minPreOrderQuantity: product.min_pre_order_quantity,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      }));

      return {
        data: products,
        success: true,
        message: 'Products fetched successfully',
      };
    } catch (error) {
      return {
        data: [],
        success: false,
        error: 'Failed to fetch products',
      };
    }
  }

  // Get products with pagination from Supabase
  static async getProductsPaginated(
    page: number = 1, 
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<Product>>> {
    try {
      const offset = (page - 1) * limit;
      
      // Get total count
      const { count, error: countError } = await supabase
        .from(TABLES.PRODUCTS)
        .select('*', { count: 'exact', head: true })
        .eq('is_available', true);

      if (countError) {
        console.error('Failed to get product count:', countError);
        return {
          data: { data: [], total: 0, page, limit, totalPages: 0, hasMore: false },
          success: false,
          error: 'Failed to get product count',
        };
      }

      // Get paginated products
      const { data, error } = await supabase
        .from(TABLES.PRODUCTS)
        .select('*')
        .eq('is_available', true)
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Failed to fetch paginated products:', error);
        return {
          data: { data: [], total: 0, page, limit, totalPages: 0, hasMore: false },
          success: false,
          error: 'Failed to fetch products',
        };
      }

      // Convert database format to app format
      const products: Product[] = (data || []).map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock_quantity,
        categoryId: product.category,
        imageUrl: product.image_url || '',
        isActive: product.is_available,
        isPreOrder: product.is_pre_order,
        preOrderAvailableDate: product.pre_order_available_date,
        minPreOrderQuantity: product.min_pre_order_quantity,
        unit: product.unit,
        weight: product.weight,
        sku: product.sku,
        tags: product.tags || [],
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      }));

      const totalPages = Math.ceil((count || 0) / limit);

      const hasMore = (page * limit) < (count || 0);

      return {
        data: {
          data: products,
          total: count || 0,
          page,
          limit,
          totalPages,
          hasMore,
        },
        success: true,
        message: 'Products fetched successfully',
      };
    } catch (error) {
      return {
        data: { data: [], total: 0, page, limit, totalPages: 0, hasMore: false },
        success: false,
        error: 'Failed to fetch products',
      };
    }
  }

  // Get product by ID
  static async getProductById(id: string): Promise<ApiResponse<Product>> {
    await mockDelay(500);
    
    try {
      const product = mockProductsData.find(p => p.id === id && p.isActive);
      
      if (!product) {
        return {
          data: {} as Product,
          success: false,
          error: 'Product not found',
        };
      }

      const productWithCategory = {
        ...product,
        category: mockCategories.find(cat => cat.id === product.categoryId),
      };

      return {
        data: productWithCategory,
        success: true,
        message: 'Product fetched successfully',
      };
    } catch (error) {
      return {
        data: {} as Product,
        success: false,
        error: 'Failed to fetch product',
      };
    }
  }

  // Search products
  static async searchProducts(query: string): Promise<ApiResponse<Product[]>> {
    await mockDelay(800);
    
    try {
      const searchQuery = query.toLowerCase();
      const filteredProducts = mockProductsData
        .filter(product => 
          product.isActive && (
            product.name.toLowerCase().includes(searchQuery) ||
            product.description.toLowerCase().includes(searchQuery) ||
            product.tags?.some(tag => tag.toLowerCase().includes(searchQuery))
          )
        )
        .map(product => ({
          ...product,
          category: mockCategories.find(cat => cat.id === product.categoryId),
        }));

      return {
        data: filteredProducts,
        success: true,
        message: `Found ${filteredProducts.length} products`,
      };
    } catch (error) {
      return {
        data: [],
        success: false,
        error: 'Search failed',
      };
    }
  }

  // Get products by category
  static async getProductsByCategory(categoryId: string): Promise<ApiResponse<Product[]>> {
    await mockDelay(600);
    
    try {
      const categoryProducts = mockProductsData
        .filter(product => product.categoryId === categoryId && product.isActive)
        .map(product => ({
          ...product,
          category: mockCategories.find(cat => cat.id === product.categoryId),
        }));

      return {
        data: categoryProducts,
        success: true,
        message: `Found ${categoryProducts.length} products in category`,
      };
    } catch (error) {
      return {
        data: [],
        success: false,
        error: 'Failed to fetch products by category',
      };
    }
  }
}

// Export mock data for backward compatibility
export { mockCategories, mockProductsData };
