/**
 * Product Admin Hooks
 * 
 * React Query hooks for admin product management using centralized query key factory.
 * 
 * Pattern: React Query Pattern 1 - User-isolated keys (no dual systems)
 * Pattern: React Query Pattern 3 - Smart invalidation (targeted, not global)
 * CRITICAL: Uses existing centralized productKeys factory - NO local duplicates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productKeys } from '../utils/queryKeyFactory';
import productAdminService from '../services/productAdminService';
import type {
  ProductAdminTransform,
  CategoryAdminTransform,
  ProductAdminCreate,
  ProductAdminUpdate,
  BulkStockUpdate,
  LowStockQuery,
  OutOfStockQuery,
} from '../schemas/productAdmin.schema';

// Admin-specific query key extensions (builds on centralized factory)
export const adminProductKeys = {
  // Extend centralized factory with admin namespace
  admin: {
    all: () => [...productKeys.all(), 'admin'] as const,
    lists: () => [...adminProductKeys.admin.all(), 'list'] as const,
    list: (filters?: any) => [...adminProductKeys.admin.lists(), filters] as const,
    details: () => [...adminProductKeys.admin.all(), 'detail'] as const,
    detail: (id: string) => [...adminProductKeys.admin.details(), id] as const,
    
    // Admin-specific operations
    categories: {
      all: () => [...adminProductKeys.admin.all(), 'categories'] as const,
      list: (filters?: any) => [...adminProductKeys.admin.categories.all(), 'list', filters] as const,
      detail: (id: string) => [...adminProductKeys.admin.categories.all(), 'detail', id] as const,
    },
    
    // Stock management
    stock: {
      all: () => [...adminProductKeys.admin.all(), 'stock'] as const,
      lowStock: (threshold: number = 10) => [...adminProductKeys.admin.stock.all(), 'low', threshold] as const,
      outOfStock: () => [...adminProductKeys.admin.stock.all(), 'out'] as const,
    },
    
    // Bulk operations
    bulk: {
      all: () => [...adminProductKeys.admin.all(), 'bulk'] as const,
      stockUpdate: (productIds: string[]) => [...adminProductKeys.admin.bulk.all(), 'stock', productIds] as const,
    },
  },
};

// ========================================
// ADMIN PRODUCT QUERIES
// ========================================

/**
 * Get all products for admin (includes unavailable products)
 */
export function useAdminProducts(filters?: any) {
  return useQuery({
    queryKey: adminProductKeys.admin.list(filters),
    queryFn: () => productAdminService.getAllProducts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    select: (data) => {
      if (!data.success) {
        throw new Error(data.userMessage || data.error || 'Failed to fetch products');
      }
      return data.products || [];
    },
  });
}

/**
 * Get single product for admin editing
 */
export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: adminProductKeys.admin.detail(id),
    queryFn: () => productAdminService.getProductById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => {
      if (!data.success) {
        throw new Error(data.userMessage || data.error || 'Failed to fetch product');
      }
      return data.product;
    },
  });
}

/**
 * Get low stock products
 */
export function useAdminLowStockProducts(queryParams: LowStockQuery = {}) {
  const threshold = queryParams.threshold || 10;
  
  return useQuery({
    queryKey: adminProductKeys.admin.stock.lowStock(threshold),
    queryFn: () => productAdminService.getLowStockProducts(queryParams),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => {
      if (!data.success) {
        throw new Error(data.userMessage || data.error || 'Failed to fetch low stock products');
      }
      return data.products || [];
    },
  });
}

/**
 * Get out of stock products
 */
export function useAdminOutOfStockProducts(queryParams: OutOfStockQuery = {}) {
  return useQuery({
    queryKey: adminProductKeys.admin.stock.outOfStock(),
    queryFn: () => productAdminService.getOutOfStockProducts(queryParams),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => {
      if (!data.success) {
        throw new Error(data.userMessage || data.error || 'Failed to fetch out of stock products');
      }
      return data.products || [];
    },
  });
}

// ========================================
// ADMIN CATEGORY QUERIES
// ========================================

/**
 * Get all categories for admin (includes unavailable categories)
 */
export function useAdminCategories(filters?: any) {
  return useQuery({
    queryKey: adminProductKeys.admin.categories.list(filters),
    queryFn: () => productAdminService.getAllCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    select: (data) => {
      if (!data.success) {
        throw new Error(data.userMessage || data.error || 'Failed to fetch categories');
      }
      return data.categories || [];
    },
  });
}

// ========================================
// ADMIN PRODUCT MUTATIONS
// ========================================

/**
 * Create new product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (productData: ProductAdminCreate) => 
      productAdminService.createProduct(productData),
    onSuccess: (data) => {
      if (data.success) {
        // Smart invalidation: target specific admin queries (Pattern 3)
        queryClient.invalidateQueries({ queryKey: adminProductKeys.admin.lists() });
        queryClient.invalidateQueries({ queryKey: adminProductKeys.admin.categories.all() });
        
        // Update specific product cache if we have the ID
        if (data.product) {
          queryClient.setQueryData(
            adminProductKeys.admin.detail(data.product.id),
            data
          );
        }
      }
    },
    onError: (error) => {
      console.error('Create product mutation failed:', error);
    },
  });
}

/**
 * Update existing product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductAdminUpdate }) => 
      productAdminService.updateProduct(id, data),
    onSuccess: (data, variables) => {
      if (data.success) {
        // Smart invalidation: target specific admin queries (Pattern 3)
        queryClient.invalidateQueries({ queryKey: adminProductKeys.admin.lists() });
        queryClient.invalidateQueries({ queryKey: adminProductKeys.admin.detail(variables.id) });
        
        // Also invalidate stock queries if stock was updated
        if (variables.data.stock_quantity !== undefined) {
          queryClient.invalidateQueries({ queryKey: adminProductKeys.admin.stock.all() });
        }
        
        // Update specific product cache
        if (data.product) {
          queryClient.setQueryData(
            adminProductKeys.admin.detail(variables.id),
            data
          );
        }
      }
    },
    onError: (error) => {
      console.error('Update product mutation failed:', error);
    },
  });
}

/**
 * Delete product (soft delete)
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => productAdminService.deleteProduct(id),
    onSuccess: (data, id) => {
      if (data.success) {
        // Smart invalidation: target specific admin queries (Pattern 3)
        queryClient.invalidateQueries({ queryKey: adminProductKeys.admin.lists() });
        queryClient.invalidateQueries({ queryKey: adminProductKeys.admin.stock.all() });
        
        // Remove specific product from cache
        queryClient.removeQueries({ queryKey: adminProductKeys.admin.detail(id) });
        
        // Also invalidate user-facing product queries since product is now unavailable
        queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      }
    },
    onError: (error) => {
      console.error('Delete product mutation failed:', error);
    },
  });
}

// ========================================
// BULK OPERATIONS
// ========================================

/**
 * Bulk update stock quantities
 */
export function useBulkUpdateStock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (updates: BulkStockUpdate[]) => 
      productAdminService.bulkUpdateStock(updates),
    onSuccess: (data) => {
      if (data.success && data.totalProcessed > 0) {
        // Smart invalidation for bulk operations (Pattern 3)
        queryClient.invalidateQueries({ queryKey: adminProductKeys.admin.lists() });
        queryClient.invalidateQueries({ queryKey: adminProductKeys.admin.stock.all() });
        
        // Invalidate specific product details for updated products
        data.successfulUpdates.forEach(update => {
          queryClient.invalidateQueries({ 
            queryKey: adminProductKeys.admin.detail(update.id) 
          });
        });
        
        // Also invalidate user-facing product queries since stock changed
        queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      }
    },
    onError: (error) => {
      console.error('Bulk stock update mutation failed:', error);
    },
  });
}

// ========================================
// UTILITY HOOKS
// ========================================

/**
 * Get product admin statistics
 */
export function useAdminProductStats() {
  const productsQuery = useAdminProducts();
  const lowStockQuery = useAdminLowStockProducts();
  const outOfStockQuery = useAdminOutOfStockProducts();
  
  return {
    totalProducts: productsQuery.data?.length || 0,
    lowStockCount: lowStockQuery.data?.length || 0,
    outOfStockCount: outOfStockQuery.data?.length || 0,
    availableProducts: productsQuery.data?.filter(p => p.is_available).length || 0,
    unavailableProducts: productsQuery.data?.filter(p => !p.is_available).length || 0,
    isLoading: productsQuery.isLoading || lowStockQuery.isLoading || outOfStockQuery.isLoading,
    error: productsQuery.error || lowStockQuery.error || outOfStockQuery.error,
  };
}

/**
 * Prefetch product for editing
 */
export function usePrefetchAdminProduct() {
  const queryClient = useQueryClient();
  
  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: adminProductKeys.admin.detail(id),
      queryFn: () => productAdminService.getProductById(id),
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };
}

/**
 * Optimistic update for product availability toggle
 */
export function useToggleProductAvailability() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) => 
      productAdminService.updateProduct(id, { is_available: isAvailable }),
    onMutate: async ({ id, isAvailable }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: adminProductKeys.admin.detail(id) });
      
      // Snapshot the previous value
      const previousProduct = queryClient.getQueryData(adminProductKeys.admin.detail(id));
      
      // Optimistically update
      queryClient.setQueryData(adminProductKeys.admin.detail(id), (old: any) => {
        if (old?.success && old?.product) {
          return {
            ...old,
            product: {
              ...old.product,
              is_available: isAvailable
            }
          };
        }
        return old;
      });
      
      return { previousProduct };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousProduct) {
        queryClient.setQueryData(
          adminProductKeys.admin.detail(variables.id), 
          context.previousProduct
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after success or error
      queryClient.invalidateQueries({ queryKey: adminProductKeys.admin.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: adminProductKeys.admin.lists() });
    },
  });
}

// ========================================
// GRACEFUL DEGRADATION UTILITIES
// ========================================

/**
 * Hook with fallback data for offline scenarios
 */
export function useAdminProductsWithFallback(filters?: any) {
  const query = useAdminProducts(filters);
  
  return {
    ...query,
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    // Graceful degradation flags
    isOnline: !query.isError || query.data !== undefined,
    hasFallbackData: query.data === undefined && !query.isLoading,
    userMessage: query.error ? 
      'Unable to load products. Please check your connection and try again.' : 
      undefined,
  };
}