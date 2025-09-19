import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { cartService } from '../services/cartService';
import { useCurrentUser } from './useAuth';
import type { Product, CartState, CartItem } from '../types';
import { cartKeys, orderKeys } from '../utils/queryKeyFactory';
import { cartBroadcast } from '../utils/broadcastFactory';

// Enhanced TypeScript interfaces for cart operations
interface CartError {
  code: 'AUTHENTICATION_REQUIRED' | 'STOCK_INSUFFICIENT' | 'PRODUCT_NOT_FOUND' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  userMessage: string;
  productId?: string;
  requestedQuantity?: number;
  availableQuantity?: number;
}

interface CartOperationResult {
  success: boolean;
  message?: string;
  error?: CartError;
  data?: CartState;
}

interface AddItemParams {
  product: Product;
  quantity?: number;
}

interface UpdateQuantityParams {
  productId: string;
  quantity: number;
}

interface CartMutationContext {
  previousCart?: CartState;
  operationType: 'add' | 'remove' | 'update' | 'clear';
  metadata?: Record<string, any>;
}

// Typed query function
type CartQueryFn = () => Promise<CartState>;

// Typed mutation functions
type AddItemMutationFn = (params: AddItemParams) => Promise<CartOperationResult>;
type RemoveItemMutationFn = (productId: string) => Promise<CartOperationResult>;
type UpdateQuantityMutationFn = (params: UpdateQuantityParams) => Promise<CartOperationResult>;
type ClearCartMutationFn = () => Promise<CartOperationResult>;

// Enhanced error handling utility
const createCartError = (
  code: CartError['code'],
  message: string,
  userMessage: string,
  metadata?: Partial<CartError>
): CartError => ({
  code,
  message,
  userMessage,
  ...metadata,
});

// Enhanced invalidation strategy using centralized factories
const getRelatedQueryKeys = (userId: string) => [
  cartKeys.all(userId),
  stockKeys.all(userId), // Invalidate stock validation cache (not full products)
  orderKeys.all(userId), // Invalidate order history that might be affected
];

export const useCart = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  
  const cartQueryKey = cartKeys.all(user?.id || 'anonymous');

  // Enhanced query with proper enabled guard and error handling
  const {
    data: cart = { items: [], total: 0 },
    isLoading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: cartQueryKey,
    queryFn: cartService.getCart as CartQueryFn,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    enabled: !!user?.id, // Enhanced enabled guard
    retry: (failureCount, error) => {
      // Smart retry logic
      if (failureCount < 2) return true;
      // Don't retry on authentication errors
      if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Enhanced error processing
  const error = queryError ? createCartError(
    'NETWORK_ERROR',
    queryError.message || 'Failed to load cart',
    'Unable to load your cart. Please try again.',
  ) : null;

  // Enhanced add item mutation with comprehensive error handling
  const addItemMutation = useMutation<CartOperationResult, Error, AddItemParams, CartMutationContext>({
    mutationFn: async ({ product, quantity = 1 }): Promise<CartOperationResult> => {
      try {
        await cartService.addItem(product, quantity);
        // Return the current cart state after successful add
        const updatedCart = await cartService.getCart();
        return { success: true, data: updatedCart };
      } catch (error: any) {
        // Enhanced error classification
        if (error.message?.includes('stock')) {
          throw createCartError(
            'STOCK_INSUFFICIENT',
            error.message,
            'Not enough items in stock',
            { productId: product.id, requestedQuantity: quantity }
          );
        }
        if (error.message?.includes('not found')) {
          throw createCartError(
            'PRODUCT_NOT_FOUND',
            error.message,
            'This product is no longer available',
            { productId: product.id }
          );
        }
        throw createCartError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to add item',
          'Unable to add item to cart. Please try again.'
        );
      }
    },
    onMutate: async ({ product, quantity = 1 }): Promise<CartMutationContext> => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      
      // Snapshot previous value
      const previousCart = queryClient.getQueryData<CartState>(cartQueryKey) || { items: [], total: 0 };
      
      // Optimistically update cart
      const existingItem = previousCart.items.find(item => item.product.id === product.id);
      let optimisticItems: CartItem[];
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        optimisticItems = previousCart.items.map(item =>
          item.product.id === product.id 
            ? { ...item, quantity: newQuantity, total: item.product.price * newQuantity }
            : item
        );
      } else {
        optimisticItems = [...previousCart.items, { 
          product, 
          quantity
        }];
      }
      
      const optimisticTotal = optimisticItems.reduce((sum: number, item: CartItem) => 
        sum + (item.product.price * item.quantity), 0
      );
      const optimisticCart = { items: optimisticItems, total: optimisticTotal };
      
      // Apply optimistic update
      queryClient.setQueryData(cartQueryKey, optimisticCart);
      
      return { 
        previousCart, 
        operationType: 'add',
        metadata: { productId: product.id, quantity }
      };
    },
    onError: (error: Error, variables: AddItemParams, context?: CartMutationContext) => {
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(cartQueryKey, context.previousCart);
      }
      
      // Enhanced error logging
      console.error('❌ Add to cart failed:', {
        error: error.message,
        userMessage: (error as any).userMessage,
        product: variables.product.id,
        quantity: variables.quantity
      });
    },
    onSuccess: async (_result: CartOperationResult, variables: AddItemParams) => {
      // Smart invalidation strategy
      if (user?.id) {
        const relatedKeys = getRelatedQueryKeys(user.id);
        await Promise.all(
          relatedKeys.map(key => queryClient.invalidateQueries({ queryKey: key }))
        );
        
        // Broadcast success
        await cartBroadcast.send('cart-item-added', {
          userId: user.id,
          productId: variables.product.id,
          quantity: variables.quantity,
          timestamp: new Date().toISOString()
        });
      }
    },
    // Enhanced retry logic
    retry: (failureCount, error: any) => {
      // Don't retry on stock or product issues
      if ((error as any).code === 'STOCK_INSUFFICIENT' || (error as any).code === 'PRODUCT_NOT_FOUND') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  // Enhanced remove item mutation with comprehensive error handling
  const removeItemMutation = useMutation<CartOperationResult, Error, string, CartMutationContext>({
    mutationFn: async (productId: string): Promise<CartOperationResult> => {
      try {
        await cartService.removeItem(productId);
        // Return the current cart state after successful removal
        const updatedCart = await cartService.getCart();
        return { success: true, data: updatedCart };
      } catch (error: any) {
        // Enhanced error classification
        if (error.message?.includes('not found')) {
          throw createCartError(
            'PRODUCT_NOT_FOUND',
            error.message,
            'Item not found in cart',
            { productId }
          );
        }
        throw createCartError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to remove item',
          'Unable to remove item from cart. Please try again.'
        );
      }
    },
    onMutate: async (productId: string): Promise<CartMutationContext> => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      
      // Snapshot previous value
      const previousCart = queryClient.getQueryData<CartState>(cartQueryKey) || { items: [], total: 0 };
      
      // Optimistically remove item
      const optimisticItems = previousCart.items.filter(item => item.product.id !== productId);
      const optimisticTotal = optimisticItems.reduce((sum: number, item: CartItem) => 
        sum + (item.product.price * item.quantity), 0
      );
      const optimisticCart = { items: optimisticItems, total: optimisticTotal };
      
      // Apply optimistic update
      queryClient.setQueryData(cartQueryKey, optimisticCart);
      
      return { 
        previousCart, 
        operationType: 'remove',
        metadata: { productId }
      };
    },
    onError: (error: Error, _variables: string, context?: CartMutationContext) => {
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(cartQueryKey, context.previousCart);
      }
      
      // Enhanced error logging
      console.error('❌ Remove from cart failed:', {
        error: error.message,
        userMessage: (error as any).userMessage,
        productId: _variables
      });
    },
    onSuccess: async (_result: CartOperationResult, productId: string) => {
      // Smart invalidation strategy
      if (user?.id) {
        const relatedKeys = getRelatedQueryKeys(user.id);
        await Promise.all(
          relatedKeys.map(key => queryClient.invalidateQueries({ queryKey: key }))
        );
        
        // Broadcast success
        await cartBroadcast.send('cart-item-removed', {
          userId: user.id,
          productId,
          timestamp: new Date().toISOString()
        });
      }
    },
    // Enhanced retry logic
    retry: (failureCount, error: any) => {
      // Don't retry on product not found
      if ((error as any).code === 'PRODUCT_NOT_FOUND') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  // Enhanced update quantity mutation with comprehensive error handling
  const updateQuantityMutation = useMutation<CartOperationResult, Error, UpdateQuantityParams, CartMutationContext>({
    mutationFn: async ({ productId, quantity }: UpdateQuantityParams): Promise<CartOperationResult> => {
      try {
        await cartService.updateQuantity(productId, quantity);
        // Return the current cart state after successful update
        const updatedCart = await cartService.getCart();
        return { success: true, data: updatedCart };
      } catch (error: any) {
        // Enhanced error classification
        if (error.message?.includes('stock')) {
          throw createCartError(
            'STOCK_INSUFFICIENT',
            error.message,
            'Not enough items in stock',
            { productId, requestedQuantity: quantity }
          );
        }
        if (error.message?.includes('not found')) {
          throw createCartError(
            'PRODUCT_NOT_FOUND',
            error.message,
            'Item not found in cart',
            { productId }
          );
        }
        throw createCartError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to update quantity',
          'Unable to update item quantity. Please try again.'
        );
      }
    },
    onMutate: async ({ productId, quantity }: UpdateQuantityParams): Promise<CartMutationContext> => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      
      // Snapshot previous value
      const previousCart = queryClient.getQueryData<CartState>(cartQueryKey) || { items: [], total: 0 };
      
      // Optimistically update quantity or remove if quantity is 0
      const optimisticItems = previousCart.items.map(item => {
        if (item.product.id === productId) {
          return { 
            ...item, 
            quantity
          };
        }
        return item;
      }).filter(item => item.quantity > 0);
      
      const optimisticTotal = optimisticItems.reduce((sum: number, item: CartItem) => 
        sum + (item.product.price * item.quantity), 0
      );
      const optimisticCart = { items: optimisticItems, total: optimisticTotal };
      
      // Apply optimistic update
      queryClient.setQueryData(cartQueryKey, optimisticCart);
      
      return { 
        previousCart, 
        operationType: 'update',
        metadata: { productId, quantity }
      };
    },
    onError: (error: Error, variables: UpdateQuantityParams, context?: CartMutationContext) => {
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(cartQueryKey, context.previousCart);
      }
      
      // Enhanced error logging
      console.error('❌ Update cart quantity failed:', {
        error: error.message,
        userMessage: (error as any).userMessage,
        productId: variables.productId,
        quantity: variables.quantity
      });
    },
    onSuccess: async (_result: CartOperationResult, variables: UpdateQuantityParams) => {
      // Smart invalidation strategy
      if (user?.id) {
        const relatedKeys = getRelatedQueryKeys(user.id);
        await Promise.all(
          relatedKeys.map(key => queryClient.invalidateQueries({ queryKey: key }))
        );
        
        // Broadcast success
        await cartBroadcast.send('cart-quantity-updated', {
          userId: user.id,
          productId: variables.productId,
          quantity: variables.quantity,
          timestamp: new Date().toISOString()
        });
      }
    },
    // Enhanced retry logic
    retry: (failureCount, error: any) => {
      // Don't retry on stock or product issues
      if ((error as any).code === 'STOCK_INSUFFICIENT' || (error as any).code === 'PRODUCT_NOT_FOUND') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  // Enhanced clear cart mutation with comprehensive error handling
  const clearCartMutation = useMutation<CartOperationResult, Error, void, CartMutationContext>({
    mutationFn: async (): Promise<CartOperationResult> => {
      try {
        await cartService.clearCart();
        return { success: true, data: { items: [], total: 0 } };
      } catch (error: any) {
        throw createCartError(
          'UNKNOWN_ERROR',
          error.message || 'Failed to clear cart',
          'Unable to clear cart. Please try again.'
        );
      }
    },
    onMutate: async (): Promise<CartMutationContext> => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      
      // Snapshot previous value
      const previousCart = queryClient.getQueryData<CartState>(cartQueryKey) || { items: [], total: 0 };
      
      // Optimistically clear cart
      const emptyCart = { items: [], total: 0 };
      queryClient.setQueryData(cartQueryKey, emptyCart);
      
      return { 
        previousCart, 
        operationType: 'clear',
        metadata: { itemCount: previousCart.items.length }
      };
    },
    onError: (error: Error, _variables: void, context?: CartMutationContext) => {
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(cartQueryKey, context.previousCart);
      }
      
      // Enhanced error logging
      console.error('❌ Clear cart failed:', {
        error: error.message,
        userMessage: (error as any).userMessage,
        itemCount: context?.metadata?.itemCount
      });
    },
    onSuccess: async (_result: CartOperationResult) => {
      // Smart invalidation strategy
      if (user?.id) {
        const relatedKeys = getRelatedQueryKeys(user.id);
        await Promise.all(
          relatedKeys.map(key => queryClient.invalidateQueries({ queryKey: key }))
        );
        
        // Broadcast success
        await cartBroadcast.send('cart-cleared', {
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      }
    },
    // Enhanced retry logic
    retry: (failureCount, _error: any) => {
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  const getCartQuantity = (productId: string): number => {
    if (!cart.items) return 0;
    const cartItem = cart.items.find(item => item.product.id === productId);
    return cartItem?.quantity || 0;
  };

  const getCartQueryKey = useCallback(() => cartKeys.all(user?.id || 'anonymous'), [user?.id]);

  // 🔒 Authentication guard - applied after all hooks are called
  if (!user?.id) {
    const authError = createCartError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated',
      'Please sign in to use the cart',
    );
    
    return {
      items: [],
      total: 0,
      isLoading: false,
      error: authError,
      
      isAddingItem: false,
      isRemovingItem: false,
      isUpdatingQuantity: false,
      isClearingCart: false,
      
      addItem: () => console.warn('⚠️ Cart operation blocked: User not authenticated'),
      removeItem: () => console.warn('⚠️ Cart operation blocked: User not authenticated'),
      updateQuantity: () => console.warn('⚠️ Cart operation blocked: User not authenticated'),
      clearCart: () => console.warn('⚠️ Cart operation blocked: User not authenticated'),
      
      addItemAsync: async (): Promise<CartOperationResult> => ({ 
        success: false, 
        error: authError 
      }),
      removeItemAsync: async (): Promise<CartOperationResult> => ({ 
        success: false, 
        error: authError 
      }),
      updateQuantityAsync: async (): Promise<CartOperationResult> => ({ 
        success: false, 
        error: authError 
      }),
      clearCartAsync: async (): Promise<CartOperationResult> => ({ 
        success: false, 
        error: authError 
      }),
      
      getCartQuantity: () => 0,
      refetch: () => Promise.resolve(),
      getCartQueryKey: () => ['cart', 'unauthenticated'],
    };
  }

  return {
    items: cart.items,
    total: cart.total,
    
    isLoading,
    error,
    
    isAddingItem: addItemMutation.isPending,
    isRemovingItem: removeItemMutation.isPending,
    isUpdatingQuantity: updateQuantityMutation.isPending,
    isClearingCart: clearCartMutation.isPending,
    
    addItem: addItemMutation.mutate,
    removeItem: removeItemMutation.mutate,
    updateQuantity: updateQuantityMutation.mutate,
    clearCart: clearCartMutation.mutate,
    
    addItemAsync: addItemMutation.mutateAsync,
    removeItemAsync: removeItemMutation.mutateAsync,
    updateQuantityAsync: updateQuantityMutation.mutateAsync,
    clearCartAsync: clearCartMutation.mutateAsync,
    
    getCartQuantity,
    
    refetch,
    
    getCartQueryKey,
  };
};
