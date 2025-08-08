import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { cartService } from '../services/cartService';
import { useCurrentUser } from './useAuth';
import type { Product, CartState, CartItem } from '../types';
import { cartKeys } from '../utils/queryKeyFactory';
import { cartBroadcast } from '../utils/broadcastFactory';

export const useCart = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  
  if (!user?.id) {
    return {
      items: [],
      total: 0,
      isLoading: false,
      error: null,
      
      isAddingItem: false,
      isRemovingItem: false,
      isUpdatingQuantity: false,
      isClearingCart: false,
      
      addItem: () => console.warn('⚠️ Cart operation blocked: User not authenticated'),
      removeItem: () => console.warn('⚠️ Cart operation blocked: User not authenticated'),
      updateQuantity: () => console.warn('⚠️ Cart operation blocked: User not authenticated'),
      clearCart: () => console.warn('⚠️ Cart operation blocked: User not authenticated'),
      
      addItemAsync: async () => ({ success: false, message: 'User not authenticated' }),
      removeItemAsync: async () => ({ success: false, message: 'User not authenticated' }),
      updateQuantityAsync: async () => ({ success: false, message: 'User not authenticated' }),
      clearCartAsync: async () => ({ success: false, message: 'User not authenticated' }),
      
      getCartQuantity: () => 0,
      refetch: () => Promise.resolve(),
      getCartQueryKey: () => ['cart', 'unauthenticated'],
    };
  }
  
  const cartQueryKey = cartKeys.all(user.id);

  const {
    data: cart = { items: [], total: 0 },
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: cartQueryKey,
    queryFn: cartService.getCart,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    enabled: true,
  });

  const addItemMutation = useMutation({
    mutationFn: ({ product, quantity = 1 }: { product: Product; quantity?: number }) =>
      cartService.addItem(product, quantity),
    onMutate: async ({ product, quantity = 1 }) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      
      const previousCart = queryClient.getQueryData<CartState>(cartQueryKey) || { items: [], total: 0 };
      
      const existingItem = previousCart.items.find(item => item.product.id === product.id);
      let optimisticItems: CartItem[];
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        optimisticItems = previousCart.items.map(item =>
          item.product.id === product.id 
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        optimisticItems = [...previousCart.items, { product, quantity }];
      }
      
      const optimisticTotal = optimisticItems.reduce((sum: number, item: CartItem) => sum + (item.product.price * item.quantity), 0);
      const optimisticCart = { items: optimisticItems, total: optimisticTotal };
      
      queryClient.setQueryData(cartQueryKey, optimisticCart);
      
      return { previousCart };
    },
    onError: (error, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartQueryKey, context.previousCart);
      }
      console.error('❌ Add to cart failed:', error);
    },
    onSuccess: async (result, variables) => {
      await cartBroadcast.send('cart-item-added', {
        userId: user.id,
        productId: variables.product.id,
        quantity: variables.quantity,
        timestamp: new Date().toISOString()
      });
      
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
    }
  });

  const removeItemMutation = useMutation({
    mutationFn: (productId: string) => cartService.removeItem(productId),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      
      const previousCart = queryClient.getQueryData<CartState>(cartQueryKey) || { items: [], total: 0 };
      
      const optimisticItems = previousCart.items.filter(item => item.product.id !== productId);
      const optimisticTotal = optimisticItems.reduce((sum: number, item: CartItem) => sum + (item.product.price * item.quantity), 0);
      const optimisticCart = { items: optimisticItems, total: optimisticTotal };
      
      queryClient.setQueryData(cartQueryKey, optimisticCart);
      
      return { previousCart };
    },
    onError: (error, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartQueryKey, context.previousCart);
      }
      console.error('❌ Remove from cart failed:', error);
    },
    onSuccess: async (result, productId) => {
      await cartBroadcast.send('cart-item-removed', {
        userId: user.id,
        productId,
        timestamp: new Date().toISOString()
      });
      
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
    }
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartService.updateQuantity(productId, quantity),
    onMutate: async ({ productId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      
      const previousCart = queryClient.getQueryData<CartState>(cartQueryKey) || { items: [], total: 0 };
      
      const optimisticItems = previousCart.items.map(item => {
        if (item.product.id === productId) {
          return { ...item, quantity };
        }
        return item;
      }).filter(item => item.quantity > 0);
      const optimisticTotal = optimisticItems.reduce((sum: number, item: CartItem) => sum + (item.product.price * item.quantity), 0);
      const optimisticCart = { items: optimisticItems, total: optimisticTotal };
      
      queryClient.setQueryData(cartQueryKey, optimisticCart);
      
      return { previousCart };
    },
    onError: (error, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartQueryKey, context.previousCart);
      }
      console.error('❌ Update cart quantity failed:', error);
    },
    onSuccess: async (result, variables) => {
      await cartBroadcast.send('cart-quantity-updated', {
        userId: user.id,
        productId: variables.productId,
        quantity: variables.quantity,
        timestamp: new Date().toISOString()
      });
      
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
    }
  });

  const clearCartMutation = useMutation({
    mutationFn: cartService.clearCart,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      
      const previousCart = queryClient.getQueryData<CartState>(cartQueryKey);
      
      const emptyCart = { items: [], total: 0 };
      queryClient.setQueryData(cartQueryKey, emptyCart);
      
      return { previousCart };
    },
    onError: (error: any, variables: any, context: any) => {
      console.error('❌ CLEAR CART ERROR - Rolling back:', error);
      if (context?.previousCart) {
        queryClient.setQueryData(cartQueryKey, context.previousCart);
      }
    },
    onSuccess: async () => {
      await cartBroadcast.send('cart-cleared', {
        userId: user.id,
        timestamp: new Date().toISOString()
      });
      
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
    }
  });

  const getCartQuantity = (productId: string): number => {
    if (!cart.items) return 0;
    const cartItem = cart.items.find(item => item.product.id === productId);
    return cartItem?.quantity || 0;
  };

  const getCartQueryKey = useCallback(() => cartKeys.all(user.id), [user.id]);

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
