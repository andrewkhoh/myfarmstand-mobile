import { supabase } from '../config/supabase';
import { queryClient } from '../config/queryClient';
import { cartKeys, productKeys, orderKeys } from '../utils/queryKeyFactory';
import { SecureChannelNameGenerator, createBroadcastHelper } from '../utils/broadcastFactory';

/**
 * SECURITY HARDENED: Broadcast-based Real-time Service
 * Uses cryptographically secure channel names to prevent enumeration attacks
 * All channel names are HMAC-SHA256 encrypted with user/role-based access control
 */
export class RealtimeService {
  private static subscriptions: Map<string, any> = new Map();
  private static isInitialized = false;
  private static currentUserId: string | null = null;
  private static currentUserRole: string | null = null;

  /**
   * SECURITY HARDENED: Set up encrypted broadcast subscriptions for order updates
   * Uses cryptographically secure channel names based on user role and authorization
   */
  static async subscribeToOrderUpdates() {
    // Get current user context for secure channel generation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('🔐 Cannot subscribe to order updates: No authenticated user');
      return;
    }

    this.currentUserId = user.id;
    // Get user role from user metadata or profile
    this.currentUserRole = user.user_metadata?.role || 'customer';

    console.log('🚀 Setting up SECURE order updates broadcast subscriptions...');

    // SECURITY: Subscribe to user-specific encrypted order channel
    await this.subscribeToUserOrderChannel(user.id);

    // SECURITY: Subscribe to admin channels if user has admin privileges
    if (this.currentUserRole === 'admin' || this.currentUserRole === 'staff' || this.currentUserRole === 'manager') {
      await this.subscribeToAdminOrderChannel();
    }
  }

  /**
   * SECURITY: Subscribe to user-specific encrypted order channel
   */
  private static async subscribeToUserOrderChannel(userId: string) {
    try {
      // SECURITY: Generate encrypted user-specific channel name
      const channelName = SecureChannelNameGenerator.generateSecureChannelName('orders', 'user-specific', userId);
      const subscriptionKey = `orders-user-${userId}`;
      
      if (this.subscriptions.has(subscriptionKey)) {
        console.log('🔐 User-specific order subscription already exists');
        return;
      }

      console.log('🔐 Setting up encrypted user-specific order channel subscription...');
      
      const subscription = supabase
        .channel(channelName) // ENCRYPTED CHANNEL NAME
        .on(
          'broadcast',
          { event: 'order-status-changed' },
          (payload) => {
            // SECURITY: Validate payload is for current user
            if (payload.payload?.userId === userId) {
              console.log('🔄 Order status changed (secure user channel):', payload);
              
              // Invalidate user-specific order queries
              queryClient.invalidateQueries({ queryKey: orderKeys.all(userId) });
              queryClient.invalidateQueries({ queryKey: orderKeys.lists(userId) });
              
              this.notifyDataUpdate(`Your order ${payload.payload.orderId} status updated to ${payload.payload.newStatus}`);
            }
          }
        )
        .on(
          'broadcast',
          { event: 'new-order' },
          (payload) => {
            if (payload.payload?.userId === userId) {
              console.log('🔄 New order confirmation (secure user channel):', payload);
              
              queryClient.invalidateQueries({ queryKey: orderKeys.all(userId) });
              queryClient.invalidateQueries({ queryKey: orderKeys.lists(userId) });
              
              this.notifyDataUpdate('Order confirmation received!');
            }
          }
        )
        .subscribe((status) => {
          console.log(`🔐 Encrypted user order channel status: ${status}`);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Secure user order subscription ACTIVE');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Secure user order subscription failed');
          }
        });

      this.subscriptions.set(subscriptionKey, subscription);
    } catch (error) {
      console.error('❌ Failed to set up secure user order subscription:', error);
    }
  }

  /**
   * SECURITY: Subscribe to admin-only encrypted order channel
   */
  private static async subscribeToAdminOrderChannel() {
    try {
      // SECURITY: Generate encrypted admin-only channel name
      const channelName = SecureChannelNameGenerator.generateSecureChannelName('orders', 'admin-only');
      const subscriptionKey = 'orders-admin';
      
      if (this.subscriptions.has(subscriptionKey)) {
        console.log('🔐 Admin order subscription already exists');
        return;
      }

      console.log('🔐 Setting up encrypted admin order channel subscription...');
      
      const subscription = supabase
        .channel(channelName) // ENCRYPTED ADMIN CHANNEL NAME
        .on(
          'broadcast',
          { event: 'order-status-changed' },
          (payload) => {
            console.log('🔄 Order status changed (secure admin channel):', payload);
            
            // Invalidate admin order queries
            queryClient.invalidateQueries({ queryKey: orderKeys.all() }); // Admin orders list
            queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
            
            this.notifyDataUpdate(`Order ${payload.payload.orderId} status updated (Admin)`);
          }
        )
        .on(
          'broadcast',
          { event: 'new-order' },
          (payload) => {
            console.log('🔄 New order received (secure admin channel):', payload);
            
            queryClient.invalidateQueries({ queryKey: orderKeys.all() });
            queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
            
            this.notifyDataUpdate('New order received (Admin)!');
          }
        )
        .subscribe((status) => {
          console.log(`🔐 Encrypted admin order channel status: ${status}`);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Secure admin order subscription ACTIVE');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Secure admin order subscription failed');
          }
        });

      this.subscriptions.set(subscriptionKey, subscription);
    } catch (error) {
      console.error('❌ Failed to set up secure admin order subscription:', error);
    }
  }

  /**
   * SECURITY HARDENED: Set up encrypted broadcast subscription for product updates
   * Uses cryptographically secure global channel (products are not user-specific)
   */
  static async subscribeToProductUpdates() {
    try {
      // SECURITY: Generate encrypted global product channel name
      const channelName = SecureChannelNameGenerator.generateSecureChannelName('products', 'global');
      const subscriptionKey = 'products-global';
      
      if (this.subscriptions.has(subscriptionKey)) {
        console.log('🔐 Product updates subscription already exists');
        return;
      }

      console.log('🚀 Setting up SECURE product updates broadcast subscription...');
      
      const subscription = supabase
        .channel(channelName) // ENCRYPTED GLOBAL CHANNEL NAME
        .on(
          'broadcast',
          { event: 'product-updated' },
          (payload) => {
            console.log('🔄 Product updated (secure global channel):', payload);
            
            // Invalidate product queries to trigger refetch
            queryClient.invalidateQueries({ queryKey: productKeys.all() });
            queryClient.invalidateQueries({ queryKey: productKeys.detail(payload.payload.productId) });
            
            this.notifyDataUpdate(`Product ${payload.payload.productName} updated`);
          }
        )
        .on(
          'broadcast',
          { event: 'stock-updated' },
          (payload) => {
            console.log('🔄 Stock updated (secure global channel):', payload);
            
            // Invalidate product queries to trigger refetch
            queryClient.invalidateQueries({ queryKey: productKeys.all() });
            queryClient.invalidateQueries({ queryKey: productKeys.detail(payload.payload.productId) });
            
            this.notifyDataUpdate(`Stock updated for ${payload.payload.productName}`);
          }
        )
        .subscribe((status) => {
          console.log(`🔐 Encrypted product channel status: ${status}`);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Secure product subscription ACTIVE');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Secure product subscription failed');
          }
        });

      this.subscriptions.set(subscriptionKey, subscription);
    } catch (error) {
      console.error('❌ Failed to set up secure product subscription:', error);
    }
  }

  /**
   * SECURITY HARDENED: Set up encrypted broadcast subscription for cart updates
   * Uses cryptographically secure user-specific channel with HMAC-SHA256 encryption
   */
  static async subscribeToCartUpdates() {
    // Get current user for secure channel generation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('🔐 Cannot subscribe to cart updates: No authenticated user');
      return;
    }

    try {
      // SECURITY: Generate encrypted user-specific cart channel name
      const channelName = SecureChannelNameGenerator.generateSecureChannelName('cart', 'user-specific', user.id);
      const subscriptionKey = `cart-user-${user.id}`;
      
      if (this.subscriptions.has(subscriptionKey)) {
        console.log('🔐 Cart updates subscription already exists for user:', user.id);
        return;
      }

      console.log('🚀 Setting up SECURE user-specific cart updates broadcast subscription for user:', user.id);
      
      const subscription = supabase
        .channel(channelName) // ENCRYPTED USER-SPECIFIC CHANNEL NAME
        .on(
          'broadcast',
          { event: 'cart-item-added' },
          (payload: any) => {
            // SECURITY: Validate payload is for current user
            if (payload.payload?.userId === user.id) {
              console.log('🔄 Cart item added (secure user channel):', payload);
              queryClient.invalidateQueries({ queryKey: cartKeys.all(user.id) });
              this.notifyDataUpdate(`Added ${payload.payload?.productName || 'item'} to cart`);
            }
          }
        )
        .on(
          'broadcast',
          { event: 'cart-item-removed' },
          (payload: any) => {
            if (payload.payload?.userId === user.id) {
              console.log('🔄 Cart item removed (secure user channel):', payload);
              queryClient.invalidateQueries({ queryKey: cartKeys.all(user.id) });
              this.notifyDataUpdate(`Removed ${payload.payload?.productName || 'item'} from cart`);
            }
          }
        )
        .on(
          'broadcast',
          { event: 'cart-quantity-updated' },
          (payload: any) => {
            if (payload.payload?.userId === user.id) {
              console.log('🔄 Cart quantity updated (secure user channel):', payload);
              queryClient.invalidateQueries({ queryKey: cartKeys.all(user.id) });
              this.notifyDataUpdate(`Updated ${payload.payload?.productName || 'item'} quantity`);
            }
          }
        )
        .on(
          'broadcast',
          { event: 'cart-cleared' },
          (payload: any) => {
            if (payload.payload?.userId === user.id) {
              console.log('🔄 Cart cleared (secure user channel):', payload);
              queryClient.invalidateQueries({ queryKey: cartKeys.all(user.id) });
              this.notifyDataUpdate('Cart cleared');
            }
          }
        )
        .subscribe((status) => {
          console.log(`🔐 Encrypted cart channel status for user ${user.id}: ${status}`);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Secure cart subscription ACTIVE for user:', user.id);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Secure cart subscription failed for user:', user.id);
          }
        });

      this.subscriptions.set(subscriptionKey, subscription);
    } catch (error) {
      console.error('❌ Failed to set up secure cart subscription:', error);
    }
  }

  /**
   * SECURITY HARDENED: Initialize all encrypted real-time subscriptions
   * Call this when the app starts or user logs in
   */
  static async initializeAllSubscriptions() {
    console.log('🚀 Initializing all SECURE broadcast subscriptions...');
    
    try {
      // Initialize all secure subscriptions concurrently
      await Promise.all([
        this.subscribeToOrderUpdates(),
        this.subscribeToProductUpdates(),
        this.subscribeToCartUpdates()
      ]);
      
      this.isInitialized = true;
      console.log('✅ All SECURE broadcast subscriptions initialized');
    } catch (error) {
      console.error('❌ Failed to initialize secure subscriptions:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Clean up a specific subscription
   */
  static unsubscribe(channelName: string) {
    const subscription = this.subscriptions.get(channelName);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(channelName);
      console.log(`🧹 Unsubscribed from ${channelName}`);
    }
  }

  /**
   * Clean up all subscriptions
   * Call this when user logs out or app is closing
   */
  static unsubscribeAll() {
    console.log('🧹 Cleaning up all real-time subscriptions...');
    
    this.subscriptions.forEach((subscription, channelName) => {
      subscription.unsubscribe();
      console.log(`🧹 Unsubscribed from ${channelName}`);
    });
    
    this.subscriptions.clear();
    console.log('✅ All real-time subscriptions cleaned up');
  }

  /**
   * Get status of all subscriptions
   */
  static getSubscriptionStatus() {
    const status = Array.from(this.subscriptions.entries()).map(([channelName, subscription]) => ({
      channel: channelName,
      state: subscription.state,
      isConnected: subscription.state === 'joined'
    }));
    
    return {
      totalSubscriptions: this.subscriptions.size,
      subscriptions: status,
      allConnected: status.every(s => s.isConnected)
    };
  }

  /**
   * Notify UI components about data updates
   * @param message - Update message to display
   */
  static notifyDataUpdate(message: string) {
    console.log(`🔔 Data update notification: ${message}`);
    
    // Dispatch custom event for UI components to listen to
    // Use proper React Native compatible approach
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      try {
        const event = new (window as any).CustomEvent('realtimeUpdate', { 
          detail: { message } 
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.warn('Failed to dispatch CustomEvent:', error);
        // Fallback: just log the message
        console.log(`📱 UI Update: ${message}`);
      }
    } else {
      // React Native fallback - just log the message
      console.log(`📱 UI Update: ${message}`);
    }
  }

  /**
   * Force refresh all cached data
   * Useful for manual refresh or when reconnecting
   */
  static forceRefreshAllData() {
    console.log('🔄 Force refreshing all cached data...');
    
    queryClient.invalidateQueries({ queryKey: productKeys.all() });
    queryClient.invalidateQueries({ queryKey: [...productKeys.lists(), 'categories'] }); // Categories use product factory with composition
    queryClient.invalidateQueries({ queryKey: orderKeys.all() });
    queryClient.invalidateQueries({ queryKey: orderKeys.all(this.currentUserId || undefined) }); // User-specific orders
    queryClient.invalidateQueries({ queryKey: cartKeys.all(this.currentUserId || undefined) }); // User-specific cart 
    
    console.log('✅ All cached data refreshed');
  }
}
