import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Product, Category } from '../types';
import { 
  getProducts, 
  getProductById, 
  getProductsByCategory,
  getCategories,
  searchProducts
} from '../services/productService';
import { useCurrentUser } from './useAuth';
import { productKeys } from '../utils/queryKeyFactory';
import { productBroadcast } from '../utils/broadcastFactory';

// Enhanced interfaces following cart pattern
interface ProductError {
  code: 'AUTHENTICATION_REQUIRED' | 'NETWORK_ERROR' | 'PRODUCT_NOT_FOUND' | 'CATEGORY_NOT_FOUND' | 'SEARCH_FAILED' | 'UNKNOWN_ERROR';
  message: string;
  userMessage: string;
  productId?: string;
  categoryId?: string;
  searchQuery?: string;
}

interface ProductOperationResult<T = any> {
  success: boolean;
  message?: string;
  error?: ProductError;
  data?: T;
}

interface ProductMutationContext {
  previousData?: any;
  operationType: 'refresh' | 'search' | 'fetch';
  metadata?: Record<string, any>;
}

// Enhanced error handling utility (following cart pattern)
const createProductError = (
  code: ProductError['code'],
  message: string,
  userMessage: string,
  metadata?: { productId?: string; categoryId?: string; searchQuery?: string }
): ProductError => ({
  code,
  message,
  userMessage,
  ...metadata,
});

// Enhanced typed query functions (following cart pattern)
type ProductsQueryFn = () => Promise<Product[]>;
type ProductQueryFn = (productId: string) => Promise<Product | null>;
type CategoriesQueryFn = () => Promise<Category[]>;
type ProductSearchQueryFn = (query: string) => Promise<Product[]>;
type ProductsByCategoryQueryFn = (categoryId: string) => Promise<Product[]>;

// Enhanced typed mutation functions (following cart pattern)
type RefreshProductsMutationFn = () => Promise<ProductOperationResult<Product[]>>;
type RefreshCategoriesMutationFn = () => Promise<ProductOperationResult<Category[]>>;

// ✅ PHASE 1.1: Eliminated local productQueryKeys - using centralized productKeys factory

// Enhanced Hook for fetching all products with real-time updates (following cart pattern)
export const useProducts = () => {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  
  const productsQueryKey = productKeys.lists();
  
  // ✅ ARCHITECTURAL PATTERN: Use React Query's enabled guard instead of manual auth guard
  const query = useQuery({
    queryKey: productsQueryKey,
    queryFn: async (): Promise<Product[]> => {
      try {
        console.log('🔍 useProducts - Starting fetch...');
        const response = await getProducts();
        console.log('🔍 useProducts - Service response:', {
          success: response.success,
          productCount: response.products?.length,
          error: response.error
        });
        
        if (!response.success) {
          throw createProductError(
            'NETWORK_ERROR',
            response.error || 'Failed to fetch products',
            'Unable to load products. Please try again.'
          );
        }
        
        const products = response.products || [];
        console.log('🔍 useProducts - Final products for React Query:', {
          count: products.length,
          productsWithoutNames: products.filter(p => !p.name).length,
          sampleProduct: products[0] ? {
            id: products[0].id,
            name: products[0].name,
            nameType: typeof products[0].name
          } : null
        });
        
        return products;
      } catch (error: any) {
        console.error('❌ useProducts - Query function error:', error);
        if (error.code) {
          throw error; // Re-throw ProductError
        }
        throw createProductError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to fetch products',
          'Unable to load products. Please try again.'
        );
      }
    },
    // ✅ ARCHITECTURAL PATTERN: Context-appropriate cache settings for products (less volatile than cart)
    staleTime: 3 * 60 * 1000, // 3 minutes - products change less frequently than cart
    gcTime: 15 * 60 * 1000, // 15 minutes - longer cache retention for products
    refetchOnMount: true, // (following cart pattern)
    refetchOnWindowFocus: false, // (following cart pattern)
    refetchOnReconnect: true, // (following cart pattern)
    enabled: !!user?.id, // ✅ ARCHITECTURAL PATTERN: React Query handles conditional execution
    retry: (failureCount, error) => {
      // Smart retry logic (following cart pattern)
      if (failureCount < 2) return true;
      // Don't retry on authentication errors
      if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff (following cart pattern)
  });
  
  // Enhanced refresh products mutation (following cart pattern)
  const refreshProductsMutation = useMutation<ProductOperationResult<Product[]>, Error, void, ProductMutationContext>({
    mutationFn: async (): Promise<ProductOperationResult<Product[]>> => {
      try {
        await query.refetch();
        const newProducts = queryClient.getQueryData<Product[]>(productsQueryKey) || [];
        return { success: true, data: newProducts };
      } catch (error: any) {
        throw createProductError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to refresh products',
          'Unable to refresh products. Please try again.'
        );
      }
    },
    onMutate: async (): Promise<ProductMutationContext> => {
      // Cancel outgoing refetches (following cart pattern)
      await queryClient.cancelQueries({ queryKey: productsQueryKey });
      
      // Snapshot previous value (following cart pattern)
      const previousData = queryClient.getQueryData<Product[]>(productsQueryKey);
      
      return { 
        previousData, 
        operationType: 'refresh',
        metadata: { userId: user?.id }
      };
    },
    onError: (error: any, _variables: void, context?: ProductMutationContext) => {
      // Rollback on error (following cart pattern)
      if (context?.previousData) {
        queryClient.setQueryData(productsQueryKey, context.previousData);
      }
      
      // Enhanced error logging (following cart pattern)
      console.error('❌ Refresh products failed:', {
        error: error.message,
        userMessage: (error as ProductError).userMessage,
        userId: user?.id
      });
    },
    onSuccess: async (_result: ProductOperationResult<Product[]>) => {
      // Smart invalidation strategy (following cart pattern)
      await queryClient.invalidateQueries({ queryKey: productsQueryKey });
      
      // Broadcast success (following cart pattern)
      await productBroadcast.send('products-refreshed', {
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
    },
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, _error: any) => {
      return failureCount < 2;
    },
    retryDelay: 1000,
  });
  
  // Enhanced utility functions with useCallback (following cart pattern)
  const getProductsQueryKey = useCallback(() => productsQueryKey, [user?.id]);

  // ✅ ARCHITECTURAL PATTERN: Simple conditional return based on auth state
  if (!user?.id) {
    return {
      ...query,
      data: [],
      error: createProductError(
        'AUTHENTICATION_REQUIRED',
        'User not authenticated',
        'Please sign in to view products'
      ),
      isError: true,
      isRefreshing: false,
      refreshProducts: () => console.warn('⚠️ Authentication required'),
      refreshProductsAsync: async () => ({ 
        success: false, 
        error: createProductError('AUTHENTICATION_REQUIRED', 'Not authenticated', 'Please sign in') 
      }),
      getProductsQueryKey: () => ['products', 'unauthenticated'],
    };
  }

  return {
    ...query,
    
    // Enhanced mutation states (following cart pattern)
    isRefreshing: refreshProductsMutation.isPending,
    
    // Direct mutation functions (following cart pattern - single source of truth)
    refreshProducts: refreshProductsMutation.mutate,
    
    // Async mutation functions (following cart pattern)
    refreshProductsAsync: refreshProductsMutation.mutateAsync,
    
    // Query keys for external use (following cart pattern)
    getProductsQueryKey,
  };
};

// Enhanced Hook for fetching single product (following cart pattern)
export const useProduct = (productId: string) => {
  const { data: user } = useCurrentUser();
  
  const query = useQuery({
    queryKey: productKeys.detail(productId),
    queryFn: async (): Promise<Product | null> => {
      try {
        const response = await getProductById(productId);
        if (!response.success) {
          throw createProductError(
            'PRODUCT_NOT_FOUND',
            response.error || 'Failed to fetch product',
            'Product not found or no longer available.',
            { productId }
          );
        }
        return response.product || null;
      } catch (error: any) {
        if (error.code) {
          throw error; // Re-throw ProductError
        }
        throw createProductError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to fetch product',
          'Unable to load product details. Please try again.',
          { productId }
        );
      }
    },
    // ✅ ARCHITECTURAL PATTERN: Combined enabled guard for product ID and user auth
    enabled: !!productId && !!user?.id,
    // ✅ ARCHITECTURAL PATTERN: Context-appropriate cache for individual products
    staleTime: 5 * 60 * 1000, // 5 minutes - individual products may change
    gcTime: 15 * 60 * 1000, // 15 minutes - longer retention for product details
    refetchOnMount: true, // (following cart pattern)
    refetchOnWindowFocus: false, // (following cart pattern)
    refetchOnReconnect: true, // (following cart pattern)
    retry: (failureCount, error) => {
      // Smart retry logic (following cart pattern)
      if (failureCount < 2) return true;
      // Don't retry on product not found
      if (error.message?.includes('not found')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff (following cart pattern)
  });

  // ✅ ARCHITECTURAL PATTERN: Simple conditional return for auth state
  if (!user?.id) {
    return {
      ...query,
      data: null,
      error: createProductError(
        'AUTHENTICATION_REQUIRED',
        'User not authenticated',
        'Please sign in to view product details'
      ),
      isError: true,
    };
  }

  return query;
};

// Enhanced Hook for searching products (following cart pattern)
export const useProductSearch = (searchQuery: string) => {
  const { data: user } = useCurrentUser();
  
  const query = useQuery({
    queryKey: productKeys.search(searchQuery),
    queryFn: async (): Promise<Product[]> => {
      try {
        const response = await searchProducts(searchQuery);
        if (!response.success) {
          throw createProductError(
            'SEARCH_FAILED',
            response.error || 'Failed to search products',
            'Search failed. Please try again.',
            { searchQuery }
          );
        }
        return response.products || [];
      } catch (error: any) {
        if (error.code) {
          throw error; // Re-throw ProductError
        }
        throw createProductError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to search products',
          'Unable to search products. Please try again.',
          { searchQuery }
        );
      }
    },
    // ✅ ARCHITECTURAL PATTERN: Combined enabled guard for query and user auth
    enabled: !!searchQuery && searchQuery.length > 0 && !!user?.id,
    // ✅ ARCHITECTURAL PATTERN: Context-appropriate cache for search results (more volatile)
    staleTime: 1 * 60 * 1000, // 1 minute - search results change more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes - shorter retention for search
    refetchOnMount: true, // (following cart pattern)
    refetchOnWindowFocus: false, // (following cart pattern)
    refetchOnReconnect: true, // (following cart pattern)
    retry: (failureCount, error) => {
      // Smart retry logic (following cart pattern)
      if (failureCount < 2) return true;
      // Don't retry on search failures
      if (error.message?.includes('search')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff (following cart pattern)
  });

  // ✅ ARCHITECTURAL PATTERN: Simple conditional return for auth state
  if (!user?.id) {
    return {
      ...query,
      data: [],
      error: createProductError(
        'AUTHENTICATION_REQUIRED',
        'User not authenticated',
        'Please sign in to search products'
      ),
      isError: true,
    };
  }

  return query;
};

// Enhanced Hook for fetching a single product by ID (following cart pattern)
export const useProductById = (productId: string) => {
  const { data: user } = useCurrentUser();
  
  // Enhanced authentication guard (following cart pattern)
  if (!user?.id) {
    const authError = createProductError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated',
      'Please sign in to view product details'
    );
    
    return {
      data: null,
      isLoading: false,
      error: authError,
      isError: true,
      isSuccess: false,
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      status: 'error' as const,
      fetchStatus: 'idle' as const,
      refetch: () => Promise.resolve({ data: null, isLoading: false, error: authError } as any),
    } as any;
  }
  
  return useQuery({
    queryKey: productKeys.detail(productId),
    queryFn: async (): Promise<Product | null> => {
      try {
        const response = await getProductById(productId);
        if (!response.success) {
          throw createProductError(
            'PRODUCT_NOT_FOUND',
            response.error || 'Failed to fetch product',
            'Product not found or no longer available.',
            { productId }
          );
        }
        return response.product || null;
      } catch (error: any) {
        if (error.code) {
          throw error; // Re-throw ProductError
        }
        throw createProductError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to fetch product',
          'Unable to load product details. Please try again.',
          { productId }
        );
      }
    },
    enabled: !!productId && !!user?.id, // Enhanced enabled guard (following cart pattern)
    staleTime: 5 * 60 * 1000, // 5 minutes (following cart pattern)
    gcTime: 10 * 60 * 1000, // (following cart pattern)
    refetchOnMount: true, // (following cart pattern)
    refetchOnWindowFocus: false, // (following cart pattern)
    refetchOnReconnect: true, // (following cart pattern)
    retry: (failureCount, error) => {
      // Smart retry logic (following cart pattern)
      if (failureCount < 2) return true;
      // Don't retry on product not found
      if (error.message?.includes('not found')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff (following cart pattern)
  });
};

// Enhanced Hook for fetching categories with real-time updates (following cart pattern)
export const useCategories = () => {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  
  // ✅ ARCHITECTURAL PATTERN: Use React Query's enabled guard
  const query = useQuery({
    queryKey: productKeys.categories(),
    queryFn: async (): Promise<Category[]> => {
      try {
        const response = await getCategories();
        if (!response.success) {
          throw createProductError(
            'NETWORK_ERROR',
            response.error || 'Failed to fetch categories',
            'Unable to load categories. Please try again.'
          );
        }
        return response.categories || [];
      } catch (error: any) {
        if (error.code) {
          throw error; // Re-throw ProductError
        }
        throw createProductError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to fetch categories',
          'Unable to load categories. Please try again.'
        );
      }
    },
    // ✅ ARCHITECTURAL PATTERN: Context-appropriate cache for categories (most stable data)
    staleTime: 10 * 60 * 1000, // 10 minutes - categories change infrequently
    gcTime: 30 * 60 * 1000, // 30 minutes - longest cache retention
    refetchOnMount: true, // (following cart pattern)
    refetchOnWindowFocus: false, // (following cart pattern)
    refetchOnReconnect: true, // (following cart pattern)
    enabled: !!user?.id, // ✅ ARCHITECTURAL PATTERN: React Query handles conditional execution
    retry: (failureCount, error) => {
      // Smart retry logic (following cart pattern)
      if (failureCount < 2) return true;
      // Don't retry on authentication errors
      if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff (following cart pattern)
  });
  
  // Enhanced refresh categories mutation (following cart pattern)
  const refreshCategoriesMutation = useMutation<ProductOperationResult<Category[]>, Error, void, ProductMutationContext>({
    mutationFn: async (): Promise<ProductOperationResult<Category[]>> => {
      try {
        await query.refetch();
        const newCategories = queryClient.getQueryData<Category[]>(categoriesQueryKey) || [];
        return { success: true, data: newCategories };
      } catch (error: any) {
        throw createProductError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to refresh categories',
          'Unable to refresh categories. Please try again.'
        );
      }
    },
    onMutate: async (): Promise<ProductMutationContext> => {
      // Cancel outgoing refetches (following cart pattern)
      await queryClient.cancelQueries({ queryKey: categoriesQueryKey });
      
      // Snapshot previous value (following cart pattern)
      const previousData = queryClient.getQueryData<Category[]>(categoriesQueryKey);
      
      return { 
        previousData, 
        operationType: 'refresh',
        metadata: { userId: user?.id }
      };
    },
    onError: (error: any, _variables: void, context?: ProductMutationContext) => {
      // Rollback on error (following cart pattern)
      if (context?.previousData) {
        queryClient.setQueryData(categoriesQueryKey, context.previousData);
      }
      
      // Enhanced error logging (following cart pattern)
      console.error('❌ Refresh categories failed:', {
        error: error.message,
        userMessage: (error as ProductError).userMessage,
        userId: user?.id
      });
    },
    onSuccess: async (_result: ProductOperationResult<Category[]>) => {
      // Smart invalidation strategy (following cart pattern)
      await queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
      
      // Broadcast success (following cart pattern)
      await productBroadcast.send('categories-refreshed', {
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
    },
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, _error: any) => {
      return failureCount < 2;
    },
    retryDelay: 1000,
  });
  
  // Enhanced utility functions with useCallback (following cart pattern)
  const getCategoriesQueryKey = useCallback(() => categoriesQueryKey, [user?.id]);

  // ✅ ARCHITECTURAL PATTERN: Simple conditional return based on auth state
  if (!user?.id) {
    return {
      ...query,
      data: [],
      error: createProductError(
        'AUTHENTICATION_REQUIRED',
        'User not authenticated',
        'Please sign in to view categories'
      ),
      isError: true,
      isRefreshing: false,
      refreshCategories: () => console.warn('⚠️ Authentication required'),
      refreshCategoriesAsync: async () => ({ 
        success: false, 
        error: createProductError('AUTHENTICATION_REQUIRED', 'Not authenticated', 'Please sign in') 
      }),
      getCategoriesQueryKey: () => ['categories', 'unauthenticated'],
    };
  }

  return {
    ...query,
    
    // Enhanced mutation states (following cart pattern)
    isRefreshing: refreshCategoriesMutation.isPending,
    
    // Direct mutation functions (following cart pattern - single source of truth)
    refreshCategories: refreshCategoriesMutation.mutate,
    
    // Async mutation functions (following cart pattern)
    refreshCategoriesAsync: refreshCategoriesMutation.mutateAsync,
    
    // Query keys for external use (following cart pattern)
    getCategoriesQueryKey,
  };
};

// Enhanced Hook for fetching products by category (following cart pattern)
export const useProductsByCategory = (categoryId: string | null) => {
  const { data: user } = useCurrentUser();
  
  const query = useQuery({
    queryKey: productKeys.byCategory(categoryId),
    queryFn: async (): Promise<Product[]> => {
      try {
        if (!categoryId) {
          throw createProductError(
            'CATEGORY_NOT_FOUND',
            'Category ID is required',
            'Invalid category selected.',
            { categoryId: categoryId || 'null' }
          );
        }
        const response = await getProductsByCategory(categoryId);
        if (!response.success) {
          throw createProductError(
            'CATEGORY_NOT_FOUND',
            response.error || 'Failed to fetch products by category',
            'Unable to load products for this category. Please try again.',
            { categoryId }
          );
        }
        return response.products || [];
      } catch (error: any) {
        if (error.code) {
          throw error; // Re-throw ProductError
        }
        throw createProductError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to fetch products by category',
          'Unable to load products for this category. Please try again.',
          { categoryId: categoryId || 'null' }
        );
      }
    },
    // ✅ ARCHITECTURAL PATTERN: Combined enabled guard for category and user auth
    enabled: !!categoryId && !!user?.id,
    // ✅ ARCHITECTURAL PATTERN: Context-appropriate cache for category filtering
    staleTime: 4 * 60 * 1000, // 4 minutes - category products change moderately
    gcTime: 12 * 60 * 1000, // 12 minutes - moderate retention
    refetchOnMount: true, // (following cart pattern)
    refetchOnWindowFocus: false, // (following cart pattern)
    refetchOnReconnect: true, // (following cart pattern)
    retry: (failureCount, error) => {
      // Smart retry logic (following cart pattern)
      if (failureCount < 2) return true;
      // Don't retry on category not found
      if (error.message?.includes('category') || error.message?.includes('not found')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff (following cart pattern)
  });

  // ✅ ARCHITECTURAL PATTERN: Simple conditional return for auth state
  if (!user?.id) {
    return {
      ...query,
      data: [],
      error: createProductError(
        'AUTHENTICATION_REQUIRED',
        'User not authenticated',
        'Please sign in to view products by category'
      ),
      isError: true,
    };
  }

  return query;
};

// Note: Enhanced mutation hooks for product management (create/update/delete) can be added
// when admin features are implemented in the ProductService following cart pattern standards
