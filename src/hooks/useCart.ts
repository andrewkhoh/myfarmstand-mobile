import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartService } from '../services/cartService';
import type { Product, CartState, CartItem } from '../types';

const CART_QUERY_KEY = ['cart'];

export const useCart = () => {
  const queryClient = useQueryClient();

  // Get cart query
  const {
    data: cart = { items: [], total: 0 },
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: cartService.getCart,
    staleTime: 0, // Always refetch to ensure fresh data
    gcTime: 0, // Don't cache data - always fetch fresh
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Add item mutation with optimistic updates
  const addItemMutation = useMutation({
    mutationFn: ({ product, quantity = 1 }: { product: Product; quantity?: number }) =>
      cartService.addItem(product, quantity),
    onMutate: async ({ product, quantity = 1 }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      
      // Snapshot previous cart
      const previousCart = queryClient.getQueryData<CartState>(CART_QUERY_KEY) || { items: [], total: 0 };
      
      // Optimistically update cart
      const existingItemIndex = previousCart.items.findIndex((item: CartItem) => item.product.id === product.id);
      let newItems = [...previousCart.items];
      
      if (existingItemIndex >= 0) {
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: newItems[existingItemIndex].quantity + quantity
        };
      } else {
        newItems.push({ product, quantity });
      }
      
      const newTotal = newItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
      const optimisticCart = { items: newItems, total: newTotal };
      
      queryClient.setQueryData(CART_QUERY_KEY, optimisticCart);
      
      return { previousCart };
    },
    onError: (error, variables, context) => {
      console.error('Failed to add item to cart:', error);
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(CART_QUERY_KEY, context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: (productId: string) => cartService.removeItem(productId),
    onSuccess: (newCart) => {
      // Immediately update cache
      queryClient.setQueryData(CART_QUERY_KEY, newCart);
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
    onError: (error) => {
      console.error('Failed to remove item from cart:', error);
    },
  });

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartService.updateQuantity(productId, quantity),
    onSuccess: (data) => {
      // Immediately update cache
      queryClient.setQueryData(CART_QUERY_KEY, data.cart);
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
    onError: (error) => {
      console.error('Failed to update item quantity:', error);
    },
  });

  // Clear cart mutation with optimistic updates
  const clearCartMutation = useMutation({
    mutationFn: cartService.clearCart,
    onMutate: async () => {
      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      
      // Snapshot previous cart for rollback
      const previousCart = queryClient.getQueryData(CART_QUERY_KEY);
      
      // Optimistically update to empty cart immediately
      const emptyCart = { items: [], total: 0 };
      queryClient.setQueryData(CART_QUERY_KEY, emptyCart);
      
      return { previousCart };
    },
    onError: (error, variables, context) => {
      console.error('Failed to clear cart:', error);
      // Rollback to previous state on error
      if (context?.previousCart) {
        queryClient.setQueryData(CART_QUERY_KEY, context.previousCart);
      }
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });

  // Helper functions that return promises for better testing
  const addItem = async (product: Product, quantity: number = 1): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await addItemMutation.mutateAsync({ product, quantity });
      return { success: result.success, message: result.message };
    } catch (error) {
      return { success: false, message: 'Failed to add item to cart' };
    }
  };

  const removeItem = (productId: string): Promise<CartState> => {
    return removeItemMutation.mutateAsync(productId);
  };

  const updateQuantity = async (productId: string, quantity: number): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await updateQuantityMutation.mutateAsync({ productId, quantity });
      return { success: result.success, message: result.message };
    } catch (error) {
      return { success: false, message: 'Failed to update quantity' };
    }
  };

  const clearCart = (): Promise<CartState> => {
    return clearCartMutation.mutateAsync();
  };

  return {
    // Cart data
    items: cart.items,
    total: cart.total,
    
    // Loading states
    isLoading,
    error,
    
    // Mutation loading states
    isAddingItem: addItemMutation.isPending,
    isRemovingItem: removeItemMutation.isPending,
    isUpdatingQuantity: updateQuantityMutation.isPending,
    isClearingCart: clearCartMutation.isPending,
    
    // Actions
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    refetch,
    
    // Raw mutations for advanced usage
    addItemMutation,
    removeItemMutation,
    updateQuantityMutation,
    clearCartMutation,
  };
};
