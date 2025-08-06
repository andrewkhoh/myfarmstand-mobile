import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Product, Category } from '../types';
import { ProductService } from '../services/productService';
import { supabase } from '../config/supabase';

// Query keys for React Query
export const productQueryKeys = {
  all: ['products'] as const,
  lists: () => [...productQueryKeys.all, 'list'] as const,
  list: (filters: string) => [...productQueryKeys.lists(), { filters }] as const,
  details: () => [...productQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...productQueryKeys.details(), id] as const,
  categories: ['categories'] as const,
  search: (query: string) => ['products', 'search', query] as const,
  byCategory: (categoryId: string | null) => ['products', 'category', categoryId] as const,
};

// Hook for fetching all products with real-time updates
export const useProducts = () => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: productQueryKeys.lists(),
    queryFn: async () => {
      const response = await ProductService.getProducts();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch products');
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Set up real-time subscription for products
  useEffect(() => {
    const subscription = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          console.log('Products table changed:', payload);
          // Invalidate and refetch products when data changes
          queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() });
          queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return query;
};

// Hook for fetching single product
export const useProduct = (productId: string) => {
  return useQuery({
    queryKey: productQueryKeys.detail(productId),
    queryFn: async () => {
      const response = await ProductService.getProductById(productId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch product');
      }
      return response.data;
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Hook for searching products
export const useProductSearch = (query: string) => {
  return useQuery({
    queryKey: productQueryKeys.search(query),
    queryFn: async () => {
      const response = await ProductService.searchProducts(query);
      if (!response.success) {
        throw new Error(response.error || 'Failed to search products');
      }
      return response.data;
    },
    enabled: !!query && query.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
    gcTime: 5 * 60 * 1000,
  });
};

// Hook for fetching a single product by ID
export const useProductById = (productId: string) => {
  return useQuery({
    queryKey: productQueryKeys.detail(productId),
    queryFn: async () => {
      const response = await ProductService.getProductById(productId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch product');
      }
      return response.data;
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
};

// Hook for fetching categories with real-time updates
export const useCategories = () => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: productQueryKeys.categories,
    queryFn: async () => {
      const response = await ProductService.getCategories();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch categories');
      }
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (categories change less frequently)
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Set up real-time subscription for categories
  useEffect(() => {
    const subscription = supabase
      .channel('categories-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'categories'
        },
        (payload) => {
          console.log('Categories table changed:', payload);
          // Invalidate and refetch categories when data changes
          queryClient.invalidateQueries({ queryKey: productQueryKeys.categories });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return query;
};

// Hook for fetching products by category
export const useProductsByCategory = (categoryId: string | null) => {
  return useQuery({
    queryKey: productQueryKeys.byCategory(categoryId),
    queryFn: async () => {
      if (!categoryId) {
        throw new Error('Category ID is required');
      }
      const response = await ProductService.getProductsByCategory(categoryId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch products by category');
      }
      return response.data;
    },
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Note: Mutation hooks for product management (create/update/delete) can be added
// when admin features are implemented in the ProductService
