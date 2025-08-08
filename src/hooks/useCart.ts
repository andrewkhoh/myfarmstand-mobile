import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { cartService } from '../services/cartService';
import type { Product, CartState, CartItem } from '../types';

export const CART_QUERY_KEY = ['cart'];

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
    staleTime: 2 * 60 * 1000, // 2 minutes (like orders - cart changes frequently)
    gcTime: 5 * 60 * 1000,    // 5 minutes (standard across app)
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Add item mutation - Complete Pattern B with optimistic updates
  const addItemMutation = useMutation({
    mutationFn: ({ product, quantity = 1 }: { product: Product; quantity?: number }) =>
      cartService.addItem(product, quantity),
    onMutate: async ({ product, quantity = 1 }) => {
      // 1. Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      
      // 2. Snapshot previous value for rollback
      const previousCart = queryClient.getQueryData<CartState>(CART_QUERY_KEY) || { items: [], total: 0 };
      
      // 3. Optimistic update - add item immediately for instant UI feedback
      const existingItem = previousCart.items.find(item => item.product.id === product.id);
      let optimisticItems: CartItem[];
      
      if (existingItem) {
        // Update existing item quantity
        const newQuantity = existingItem.quantity + quantity;
        optimisticItems = previousCart.items.map(item =>
          item.product.id === product.id 
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        // Add new item
        optimisticItems = [...previousCart.items, { product, quantity }];
      }
      
      const optimisticTotal = optimisticItems.reduce((sum: number, item: CartItem) => sum + (item.product.price * item.quantity), 0);
      const optimisticCart = { items: optimisticItems, total: optimisticTotal };
      
      queryClient.setQueryData(CART_QUERY_KEY, optimisticCart);
      
      return { previousCart };
    },
    onSuccess: () => {
      // 4. Invalidate for server sync
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
    onError: (error, variables, context) => {
      console.error('❌ ADD ITEM ERROR - Rolling back:', error);
      // 5. Roll back (restore previous state)
      if (context?.previousCart) {
        queryClient.setQueryData(CART_QUERY_KEY, context.previousCart);
      }
    },
  });
  // Remove item mutation - Complete Pattern B with optimistic updates
  const removeItemMutation = useMutation({
    mutationFn: (productId: string) => cartService.removeItem(productId),
    onMutate: async (productId) => {
      // 1. Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      
      // 2. Snapshot previous value for rollback
      const previousCart = queryClient.getQueryData<CartState>(CART_QUERY_KEY) || { items: [], total: 0 };
      
      // 3. Optimistic update - remove item immediately for instant UI feedback
      const optimisticItems = previousCart.items.filter(item => item.product.id !== productId);
      const optimisticTotal = optimisticItems.reduce((sum: number, item: CartItem) => sum + (item.product.price * item.quantity), 0);
      const optimisticCart = { items: optimisticItems, total: optimisticTotal };
      
      queryClient.setQueryData(CART_QUERY_KEY, optimisticCart);
      
      return { previousCart };
    },
    onSuccess: () => {
      // 4. Invalidate for server sync
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
    onError: (error, variables, context) => {
      console.error('❌ REMOVE ITEM ERROR - Rolling back:', error);
      // 5. Roll back (restore previous state)
      if (context?.previousCart) {
        queryClient.setQueryData(CART_QUERY_KEY, context.previousCart);
      }
    },
  });
  // Update quantity mutation - Complete Pattern B with optimistic updates
  const updateQuantityMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartService.updateQuantity(productId, quantity),
    onMutate: async ({ productId, quantity }) => {
      // 1. Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      
      // 2. Snapshot previous value for rollback
      const previousCart = queryClient.getQueryData<CartState>(CART_QUERY_KEY) || { items: [], total: 0 };
      
      // 3. Optimistic update - update quantity immediately for instant UI feedback
      const optimisticItems = previousCart.items.map(item => {
        if (item.product.id === productId) {
          return { ...item, quantity };
        }
        return item;
      }).filter(item => item.quantity > 0);
      const optimisticTotal = optimisticItems.reduce((sum: number, item: CartItem) => sum + (item.product.price * item.quantity), 0);
      const optimisticCart = { items: optimisticItems, total: optimisticTotal };
      
      queryClient.setQueryData(CART_QUERY_KEY, optimisticCart);
      
      return { previousCart };
    },
    onSuccess: () => {
      // 4. Invalidate for server sync
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
    onError: (error, variables, context) => {
      console.error('❌ UPDATE QUANTITY ERROR - Rolling back:', error);
      // 5. Roll back (restore previous state)
      if (context?.previousCart) {
        queryClient.setQueryData(CART_QUERY_KEY, context.previousCart);
      }
    },
  });


  // Clear cart mutation with optimistic updates
  const clearCartMutation = useMutation({
    mutationFn: cartService.clearCart,
    onMutate: async () => {
      // 1. Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      
      // 2. Snapshot previous cart for rollback
      const previousCart = queryClient.getQueryData<CartState>(CART_QUERY_KEY);
      
      // 3. Optimistically update to empty cart immediately
      const emptyCart = { items: [], total: 0 };
      queryClient.setQueryData(CART_QUERY_KEY, emptyCart);
      
      return { previousCart };
    },
    onSuccess: () => {
      // Get fresh server data to confirm empty state
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
    onError: (error: any, variables: any, context: any) => {
      console.error('❌ CLEAR CART ERROR - Rolling back:', error);
      // Rollback to previous cart state on error
      if (context?.previousCart) {
        queryClient.setQueryData(CART_QUERY_KEY, context.previousCart);
      }
    },
  });

  // Centralized getCartQuantity function - single source of truth
  // Removed useCallback to prevent stale closures during optimistic updates
  const getCartQuantity = (productId: string): number => {
    if (!cart.items) return 0;
    const cartItem = cart.items.find(item => item.product.id === productId);
    return cartItem?.quantity || 0;
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
    
    // Direct mutations (standard React Query pattern)
    addItem: addItemMutation.mutate,
    removeItem: removeItemMutation.mutate,
    updateQuantity: updateQuantityMutation.mutate,
    clearCart: clearCartMutation.mutate,
    
    // Async mutations for when Promise return is needed
    addItemAsync: addItemMutation.mutateAsync,
    removeItemAsync: removeItemMutation.mutateAsync,
    updateQuantityAsync: updateQuantityMutation.mutateAsync,
    clearCartAsync: clearCartMutation.mutateAsync,
    
    // Centralized quantity getter
    getCartQuantity,
    
    // Manual refetch
    refetch
  };
};
