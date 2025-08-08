import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../config/supabase';
import { useCurrentUser } from './useAuth';
import { cartKeys, orderKeys, productKeys } from '../utils/queryKeyFactory';
import { cartBroadcast, orderBroadcast, productBroadcast } from '../utils/broadcastFactory';

// SECURITY-HARDENED: Centralized Realtime with Privacy Protection
export const useCentralizedRealtime = () => {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const subscriptionsRef = useRef<{ [key: string]: any }>({});

  useEffect(() => {
    // SECURITY: Only setup subscriptions for authenticated users
    if (!user?.id) {
      console.warn('⚠️ Realtime subscriptions blocked: User not authenticated');
      return;
    }

    // SECURITY: Validate user ID format to prevent injection
    if (!/^[a-zA-Z0-9\-_]+$/.test(user.id)) {
      console.error('❌ Invalid user ID format, blocking realtime subscriptions');
      return;
    }

    setupCartSubscriptions();
    setupOrderSubscriptions();
    setupProductSubscriptions();

    return () => {
      // Cleanup all subscriptions
      Object.values(subscriptionsRef.current).forEach((subscription) => {
        if (subscription?.unsubscribe) {
          subscription.unsubscribe();
        }
      });
      subscriptionsRef.current = {};
    };
  }, [user?.id, queryClient]);

  // SECURITY-HARDENED: Cart Subscriptions (User-Specific Only)
  const setupCartSubscriptions = () => {
    if (!user?.id) return;

    // SECURITY: Get authorized channel names only
    const authorizedChannels = cartBroadcast.getAuthorizedChannelNames(user.id, user.role);
    
    if (authorizedChannels.length === 0) {
      console.warn('⚠️ No authorized cart channels for user');
      return;
    }

    // SECURITY: Subscribe only to user's own cart channel
    const channelName = authorizedChannels[0]; // Primary user channel
    const cartChannel = supabase.channel(channelName);

    cartChannel
      .on('broadcast', { event: 'cart-item-added' }, (payload) => {
        // SECURITY: Validate payload and user authorization
        if (!payload.payload || payload.payload.userId !== user.id) {
          console.warn('⚠️ Unauthorized cart broadcast received, ignoring');
          return;
        }
        console.log('🛒 Authorized cart item added broadcast received');
        queryClient.invalidateQueries({ queryKey: cartKeys.all(user.id) });
      })
      .on('broadcast', { event: 'cart-item-removed' }, (payload) => {
        if (!payload.payload || payload.payload.userId !== user.id) {
          console.warn('⚠️ Unauthorized cart broadcast received, ignoring');
          return;
        }
        console.log('🛒 Authorized cart item removed broadcast received');
        queryClient.invalidateQueries({ queryKey: cartKeys.all(user.id) });
      })
      .on('broadcast', { event: 'cart-quantity-updated' }, (payload) => {
        if (!payload.payload || payload.payload.userId !== user.id) {
          console.warn('⚠️ Unauthorized cart broadcast received, ignoring');
          return;
        }
        console.log('🛒 Authorized cart quantity updated broadcast received');
        queryClient.invalidateQueries({ queryKey: cartKeys.all(user.id) });
      })
      .on('broadcast', { event: 'cart-cleared' }, (payload) => {
        if (!payload.payload || payload.payload.userId !== user.id) {
          console.warn('⚠️ Unauthorized cart broadcast received, ignoring');
          return;
        }
        console.log('🛒 Authorized cart cleared broadcast received');
        queryClient.invalidateQueries({ queryKey: cartKeys.all(user.id) });
      })
      .subscribe((status) => {
        console.log(`🛒 Cart subscription status: ${status} for channel: ${channelName}`);
      });

    subscriptionsRef.current.cart = cartChannel;
  };

  // SECURITY-HARDENED: Order Subscriptions (User-Specific + Admin with Role Verification)
  const setupOrderSubscriptions = () => {
    if (!user?.id) return;

    // User-specific order updates (always allowed for authenticated users)
    const userAuthorizedChannels = orderBroadcast.user.getAuthorizedChannelNames(user.id, user.role);
    
    if (userAuthorizedChannels.length > 0) {
      const userChannelName = userAuthorizedChannels[0];
      const userOrderChannel = supabase.channel(userChannelName);

      userOrderChannel
        .on('broadcast', { event: 'new-order' }, (payload) => {
          // SECURITY: Validate payload and user authorization
          if (!payload.payload || payload.payload.userId !== user.id) {
            console.warn('⚠️ Unauthorized order broadcast received, ignoring');
            return;
          }
          console.log('📦 Authorized new order broadcast received');
          queryClient.invalidateQueries({ queryKey: orderKeys.all(user.id) });
        })
        .on('broadcast', { event: 'order-status-updated' }, (payload) => {
          if (!payload.payload || payload.payload.userId !== user.id) {
            console.warn('⚠️ Unauthorized order broadcast received, ignoring');
            return;
          }
          console.log('📦 Authorized order status updated broadcast received');
          queryClient.invalidateQueries({ queryKey: orderKeys.all(user.id) });
        })
        .subscribe((status) => {
          console.log(`📦 User order subscription status: ${status} for channel: ${userChannelName}`);
        });

      subscriptionsRef.current.userOrders = userOrderChannel;
    }

    // SECURITY: Admin order updates (only for verified admin roles)
    // SERVER-SIDE VERIFICATION: This should be verified server-side in production
    const adminAuthorizedChannels = orderBroadcast.admin.getAuthorizedChannelNames(user.id, user.role);
    
    if (adminAuthorizedChannels.length > 0) {
      const adminChannelName = adminAuthorizedChannels[0];
      const adminOrderChannel = supabase.channel(adminChannelName);

      adminOrderChannel
        .on('broadcast', { event: 'new-order' }, (payload) => {
          // SECURITY: Admin can see all orders, but validate payload structure
          if (!payload.payload) {
            console.warn('⚠️ Invalid admin order broadcast received, ignoring');
            return;
          }
          console.log('📦 Admin new order broadcast received');
          // Invalidate all order queries for admin view
          queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        })
        .on('broadcast', { event: 'order-status-updated' }, (payload) => {
          if (!payload.payload) {
            console.warn('⚠️ Invalid admin order broadcast received, ignoring');
            return;
          }
          console.log('📦 Admin order status updated broadcast received');
          queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        })
        .subscribe((status) => {
          console.log(`📦 Admin order subscription status: ${status} for channel: ${adminChannelName}`);
        });

      subscriptionsRef.current.adminOrders = adminOrderChannel;
    }
  };

  // SECURITY-HARDENED: Product Subscriptions (Global - Safe for All Users)
  const setupProductSubscriptions = () => {
    // SECURITY: Products are global and safe for all users to receive
    const authorizedChannels = productBroadcast.getAuthorizedChannelNames(user?.id, user?.role);
    
    if (authorizedChannels.length === 0) {
      console.warn('⚠️ No authorized product channels');
      return;
    }

    const channelName = authorizedChannels[0];
    const productChannel = supabase.channel(channelName);

    productChannel
      .on('broadcast', { event: 'product-updated' }, (payload) => {
        // SECURITY: Products are global, but validate payload structure
        if (!payload.payload) {
          console.warn('⚠️ Invalid product broadcast received, ignoring');
          return;
        }
        console.log('🛍️ Product updated broadcast received');
        queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      })
      .on('broadcast', { event: 'product-stock-updated' }, (payload) => {
        if (!payload.payload) {
          console.warn('⚠️ Invalid product stock broadcast received, ignoring');
          return;
        }
        console.log('🛍️ Product stock updated broadcast received');
        queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      })
      .on('broadcast', { event: 'new-product' }, (payload) => {
        if (!payload.payload) {
          console.warn('⚠️ Invalid new product broadcast received, ignoring');
          return;
        }
        console.log('🛍️ New product broadcast received');
        queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      })
      .subscribe((status) => {
        console.log(`🛍️ Product subscription status: ${status} for channel: ${channelName}`);
      });

    subscriptionsRef.current.products = productChannel;
  };

  // SECURITY: Return only safe subscription status information
  return {
    isConnected: Object.keys(subscriptionsRef.current).length > 0,
    activeSubscriptions: Object.keys(subscriptionsRef.current),
    // SECURITY: Don't expose actual subscription objects or sensitive data
  };
};

// Hook to force refresh all user data (for testing/debugging)
export const useForceRefreshUserData = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  return () => {
    if (!user?.id) return;

    console.log('🔄 Force refreshing all user data');
    
    // Invalidate all user-specific queries
    queryClient.invalidateQueries({ queryKey: cartKeys.all(user.id) });
    queryClient.invalidateQueries({ queryKey: orderKeys.all(user.id) });
    
    // Invalidate global queries
    queryClient.invalidateQueries({ queryKey: productKeys.all() });
    
    console.log('✅ All user data refresh triggered');
  };
};
