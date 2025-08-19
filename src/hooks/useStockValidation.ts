import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '../config/supabase';
import { getProductStock, isProductPreOrder, getProductMinPreOrderQty, getProductMaxPreOrderQty } from '../utils/typeMappers';
import { Product } from '../types';
import { useCart } from './useCart';
import { useCurrentUser } from './useAuth';
import { Database } from '../types/database.generated';
import { createQueryKeyFactory } from '../utils/queryKeyFactory';
import { createBroadcastHelper } from '../utils/broadcastFactory';

type DBProduct = Database['public']['Tables']['products']['Row'];

// Enhanced interfaces following cart pattern
interface StockError {
  code: 'AUTHENTICATION_REQUIRED' | 'NETWORK_ERROR' | 'PRODUCT_NOT_FOUND' | 'UNKNOWN_ERROR';
  message: string;
  userMessage: string;
  productId?: string;
}

interface StockOperationResult<T = any> {
  success: boolean;
  message?: string;
  error?: StockError;
  data?: T;
}

interface StockMutationContext {
  previousStockData?: StockData[];
  operationType: 'refresh' | 'validate';
  metadata?: Record<string, any>;
}

// Real-time stock data interface
interface StockData {
  productId: string;
  availableStock: number;
  isPreOrder: boolean;
  minPreOrderQuantity?: number;
  maxPreOrderQuantity?: number;
}

// Stock validation result interface
export interface StockValidationResult {
  isValid: boolean;
  availableStock: number;
  currentCartQuantity: number;
  maxAllowedQuantity: number;
  message?: string;
  canAddMore: boolean;
  remainingStock: number;
}

// Enhanced error handling utility (following cart pattern)
const createStockError = (
  code: StockError['code'],
  message: string,
  userMessage: string,
  productId?: string
): StockError => ({
  code,
  message,
  userMessage,
  productId,
});

// Query key factory for stock operations (following cart pattern)
const stockKeys = createQueryKeyFactory({
  entity: 'stock', // Use separate entity to avoid conflicts with main products
  isolation: 'global'
});

// Broadcast helper for stock events (following cart pattern)
const stockBroadcast = createBroadcastHelper({
  entity: 'products',
  target: 'global'
});

// Enhanced typed query function (following cart pattern)
type StockDataQueryFn = () => Promise<StockData[]>;

// Enhanced typed mutation functions (following cart pattern)
type RefreshStockMutationFn = () => Promise<StockOperationResult<StockData[]>>;

// Enhanced Real-time stock validation hook following useCart.ts golden standard
export const useStockValidation = () => {
  const { data: user } = useCurrentUser();
  const { getCartQuantity } = useCart();
  const queryClient = useQueryClient();
  
  // Use separate query key to avoid conflicts with main products cache
  const stockQueryKey = ['products', 'stock', user?.id || 'anonymous'];
  
  // ✅ ARCHITECTURAL PATTERN: Use React Query's enabled guard
  const {
    data: stockData = [],
    isLoading,
    error: queryError,
    refetch: refetchStock
  } = useQuery({
    queryKey: stockQueryKey,
    queryFn: async (): Promise<StockData[]> => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, stock_quantity, is_pre_order, min_pre_order_quantity, max_pre_order_quantity')
          .eq('is_available', true);

        if (error) {
          throw createStockError(
            'NETWORK_ERROR',
            error.message,
            'Failed to load stock data'
          );
        }

        return data.map((item: any) => ({
          productId: item.id,
          availableStock: getProductStock(item),
          isPreOrder: isProductPreOrder(item),
          minPreOrderQuantity: getProductMinPreOrderQty(item),
          maxPreOrderQuantity: getProductMaxPreOrderQty(item)
        }));
      } catch (error: any) {
        if (error.code) {
          throw error; // Re-throw StockError
        }
        throw createStockError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to fetch stock data',
          'Unable to load stock information. Please try again.'
        );
      }
    },
    // ✅ ARCHITECTURAL PATTERN: Context-appropriate cache for stock (most volatile data)
    staleTime: 15 * 1000, // 15 seconds - stock changes very frequently
    gcTime: 1 * 60 * 1000, // 1 minute - shortest retention for real-time data
    refetchOnMount: true, // (following cart pattern)
    refetchOnWindowFocus: true, // Important for stock - refresh when user returns
    refetchOnReconnect: true, // (following cart pattern)
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds for real-time validation
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
  
  // Enhanced error processing (following cart pattern)
  const error = queryError ? createStockError(
    'NETWORK_ERROR',
    queryError.message || 'Failed to load stock data',
    'Unable to load stock information. Please try again.',
  ) : null;

  // Core validation function - kept for flexibility
  const validateStock = (
    product: Product, 
    requestedQuantity: number = 1
  ): StockValidationResult => {
    const stockInfo = stockData.find(s => s.productId === product.id);
    const currentCartQuantity = getCartQuantity(product.id);
    
    // Default values if stock data not available
    const availableStock = stockInfo?.availableStock ?? getProductStock(product);
    const isPreOrder = stockInfo?.isPreOrder ?? isProductPreOrder(product);
    
    // Calculate totals
    const totalRequestedQuantity = currentCartQuantity + requestedQuantity;
    
    // Pre-order validation
    if (isPreOrder) {
      const minPreOrder = stockInfo?.minPreOrderQuantity ?? getProductMinPreOrderQty(product) ?? 1;
      const maxPreOrder = stockInfo?.maxPreOrderQuantity ?? getProductMaxPreOrderQty(product) ?? 999;
      
      if (totalRequestedQuantity < minPreOrder) {
        return {
          isValid: false,
          availableStock,
          currentCartQuantity,
          maxAllowedQuantity: maxPreOrder,
          message: `Minimum pre-order quantity is ${minPreOrder}`,
          canAddMore: true,
          remainingStock: maxPreOrder - currentCartQuantity
        };
      }
      
      if (totalRequestedQuantity > maxPreOrder) {
        return {
          isValid: false,
          availableStock,
          currentCartQuantity,
          maxAllowedQuantity: maxPreOrder,
          message: `Maximum pre-order quantity is ${maxPreOrder}`,
          canAddMore: currentCartQuantity < maxPreOrder,
          remainingStock: Math.max(0, maxPreOrder - currentCartQuantity)
        };
      }
      
      return {
        isValid: true,
        availableStock,
        currentCartQuantity,
        maxAllowedQuantity: maxPreOrder,
        canAddMore: currentCartQuantity < maxPreOrder,
        remainingStock: maxPreOrder - currentCartQuantity
      };
    }
    
    // Regular stock validation
    if (totalRequestedQuantity > availableStock) {
      return {
        isValid: false,
        availableStock,
        currentCartQuantity,
        maxAllowedQuantity: availableStock,
        message: `Only ${availableStock} items available in stock`,
        canAddMore: currentCartQuantity < availableStock,
        remainingStock: Math.max(0, availableStock - currentCartQuantity)
      };
    }
    
    return {
      isValid: true,
      availableStock,
      currentCartQuantity,
      maxAllowedQuantity: availableStock,
      canAddMore: currentCartQuantity < availableStock,
      remainingStock: availableStock - currentCartQuantity
    };
  };

  // Intent-specific functions with clear names
  
  // STATE INQUIRY: Get current stock information without hypothetical additions
  const getStockInfo = (product: Product) => {
    const stockInfo = stockData.find(s => s.productId === product.id);
    const currentCartQuantity = getCartQuantity(product.id);
    const availableStock = stockInfo?.availableStock ?? getProductStock(product);
    const isPreOrder = stockInfo?.isPreOrder ?? isProductPreOrder(product);
    
    return {
      availableStock,
      currentCartQuantity,
      remainingStock: Math.max(0, availableStock - currentCartQuantity),
      isPreOrder
    };
  };

  // ACTION VALIDATION: Can user add one more item?
  const canAddOneMore = (productId: string): boolean => {
    const product = { id: productId } as Product;
    const validation = validateStock(product, 1);
    return validation.canAddMore;
  };

  // ACTION VALIDATION: Can user add specific quantity?
  const canAddQuantity = (product: Product, quantity: number): boolean => {
    const validation = validateStock(product, quantity);
    return validation.isValid;
  };

  // STATE INQUIRY: Get remaining stock (current state)
  const getRemainingStock = (productId: string): number => {
    const product = { id: productId } as Product;
    const stockInfo = getStockInfo(product);
    return stockInfo.remainingStock;
  };

  // DISPLAY: Get user-friendly stock status message
  const getStockStatusMessage = (product: Product): string => {
    const stockInfo = getStockInfo(product);
    const { availableStock, currentCartQuantity, remainingStock, isPreOrder } = stockInfo;
    
    if (isPreOrder) {
      if (currentCartQuantity > 0) {
        return `Pre-order (${currentCartQuantity} in cart)`;
      }
      return 'Available for pre-order';
    }
    
    if (remainingStock <= 0) {
      if (currentCartQuantity > 0) {
        return `Out of stock (${currentCartQuantity} in cart)`;
      }
      return 'Out of stock';
    }
    
    if (currentCartQuantity > 0) {
      return `${remainingStock} available (${currentCartQuantity} in cart)`;
    }
    
    return `${availableStock} available`;
  };

  // Enhanced refresh stock mutation (following cart pattern)
  const refreshStockMutation = useMutation<StockOperationResult<StockData[]>, Error, void, StockMutationContext>({
    mutationFn: async (): Promise<StockOperationResult<StockData[]>> => {
      try {
        await refetchStock();
        const newStockData = queryClient.getQueryData<StockData[]>(stockQueryKey) || [];
        return { success: true, data: newStockData };
      } catch (error: any) {
        throw createStockError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to refresh stock data',
          'Unable to refresh stock information. Please try again.'
        );
      }
    },
    onMutate: async (): Promise<StockMutationContext> => {
      // Cancel outgoing refetches (following cart pattern)
      await queryClient.cancelQueries({ queryKey: stockQueryKey });
      
      // Snapshot previous value (following cart pattern)
      const previousStockData = queryClient.getQueryData<StockData[]>(stockQueryKey);
      
      return { 
        previousStockData, 
        operationType: 'refresh',
        metadata: { userId: user.id }
      };
    },
    onError: (error: any, _variables: void, context?: StockMutationContext) => {
      // Rollback on error (following cart pattern)
      if (context?.previousStockData) {
        queryClient.setQueryData(stockQueryKey, context.previousStockData);
      }
      
      // Enhanced error logging (following cart pattern)
      console.error('❌ Refresh stock failed:', {
        error: error.message,
        userMessage: (error as StockError).userMessage,
        userId: user.id
      });
    },
    onSuccess: async (_result: StockOperationResult<StockData[]>) => {
      // Smart invalidation strategy (following cart pattern)
      await queryClient.invalidateQueries({ queryKey: stockQueryKey });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      
      // Broadcast success (following cart pattern)
      await stockBroadcast.send('stock-refreshed', {
        userId: user.id,
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
  const getStockQueryKey = useCallback(() => stockQueryKey, [user?.id]);
  
  // DEPRECATED: Keep for backward compatibility but mark as deprecated
  const canAddMore = (productId: string): boolean => {
    console.warn('canAddMore is deprecated, use canAddOneMore instead');
    return canAddOneMore(productId);
  };

  // ✅ ARCHITECTURAL PATTERN: Simple conditional return based on auth state
  if (!user?.id) {
    const authError = createStockError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated',
      'Please sign in to access stock validation'
    );
    
    return {
      stockData: [],
      isLoading: false,
      error: authError,
      isRefreshing: false,
      
      // Safe no-op functions
      validateStock: () => ({
        isValid: false,
        availableStock: 0,
        currentCartQuantity: 0,
        maxAllowedQuantity: 0,
        message: 'Please sign in to validate stock',
        canAddMore: false,
        remainingStock: 0
      } as StockValidationResult),
      getStockInfo: () => ({ availableStock: 0, currentCartQuantity: 0, remainingStock: 0, isPreOrder: false }),
      canAddOneMore: () => false,
      canAddQuantity: () => false,
      getRemainingStock: () => 0,
      getStockStatusMessage: () => 'Please sign in',
      canAddMore: () => false,
      refetchStock: () => Promise.resolve(),
      refreshStockAsync: async (): Promise<StockOperationResult<StockData[]>> => ({ 
        success: false, 
        error: authError 
      }),
      getStockQueryKey: () => ['stock-validation', 'unauthenticated'],
      getCartQuantity: () => 0,
    };
  }

  return {
    stockData,
    isLoading,
    error,
    
    // Mutation states (following cart pattern)
    isRefreshing: refreshStockMutation.isPending,
    
    // Core validation (for advanced use cases)
    validateStock,
    // Intent-specific functions (recommended)
    getStockInfo,
    canAddOneMore,
    canAddQuantity,
    getRemainingStock,
    getStockStatusMessage,
    
    // Direct mutation functions (following cart pattern - single source of truth)
    refetchStock,
    
    // Async mutation functions (following cart pattern)
    refreshStockAsync: refreshStockMutation.mutateAsync,
    
    // Query keys for external use (following cart pattern)
    getStockQueryKey,
    
    // Backward compatibility
    canAddMore,
    getCartQuantity
  };
};
