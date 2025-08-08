import { supabase } from '../config/supabase';
import { queryClient } from '../config/queryClient';
import { CART_QUERY_KEY } from '../hooks/useCart';

/**
 * Broadcast-based Real-time Service
 * Uses Supabase broadcast channels for immediate, reliable real-time updates
 * No database replication required - works immediately
 */
export class RealtimeService {
  private static subscriptions: Map<string, any> = new Map();
  private static isInitialized = false;

  /**
   * Set up broadcast subscription for order updates
   * Listens for order status changes, new orders, etc.
   */
  static subscribeToOrderUpdates() {
    const channelName = 'order-updates';
    
    if (this.subscriptions.has(channelName)) {
      console.log('Order updates subscription already exists');
      return;
    }

    console.log('🚀 Setting up order updates broadcast subscription...');
    
    const subscription = supabase
      .channel(channelName)
      .on(
        'broadcast',
        { event: 'order-status-changed' },
        (payload) => {
          console.log('🔄 Order status changed (broadcast):', payload);
          
          // Invalidate ALL order-related queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['orders'] }); // Admin orders
          queryClient.invalidateQueries({ queryKey: ['userOrders'] }); // ProfileScreen format
          queryClient.invalidateQueries({ queryKey: ['orders', 'user'] }); // useOrders format
          
          this.notifyDataUpdate(`Order ${payload.payload.orderId} status updated to ${payload.payload.newStatus}`);
        }
      )
      .on(
        'broadcast',
        { event: 'new-order' },
        (payload) => {
          console.log('🔄 New order received (broadcast):', payload);
          
          // Invalidate ALL order-related queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['orders'] }); // Admin orders
          queryClient.invalidateQueries({ queryKey: ['userOrders'] }); // ProfileScreen format
          queryClient.invalidateQueries({ queryKey: ['orders', 'user'] }); // useOrders format
          
          this.notifyDataUpdate('New order received!');
        }
      )
      .subscribe((status) => {
        console.log(`📡 Order updates subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Order updates broadcast subscription ACTIVE');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Order updates subscription failed with CHANNEL_ERROR');
        }
      });

    this.subscriptions.set(channelName, subscription);
    console.log('✅ Order updates broadcast subscription ACTIVE');
  }

  /**
   * Set up broadcast subscription for product updates
   * Listens for product changes, stock updates, etc.
   */
  static subscribeToProductUpdates() {
    const channelName = 'product-updates';
    
    if (this.subscriptions.has(channelName)) {
      console.log('Product updates subscription already exists');
      return;
    }

    console.log('🚀 Setting up product updates broadcast subscription...');
    
    const subscription = supabase
      .channel(channelName)
      .on(
        'broadcast',
        { event: 'product-updated' },
        (payload) => {
          console.log('🔄 Product updated (broadcast):', payload);
          
          // Invalidate product queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['products', 'detail', payload.payload.productId] });
          
          this.notifyDataUpdate(`Product ${payload.payload.productName} updated`);
        }
      )
      .on(
        'broadcast',
        { event: 'stock-updated' },
        (payload) => {
          console.log('🔄 Stock updated (broadcast):', payload);
          
          // Invalidate product queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['products', 'detail', payload.payload.productId] });
          
          this.notifyDataUpdate(`Stock updated for ${payload.payload.productName}`);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Product updates subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Product updates broadcast subscription ACTIVE');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Product updates subscription failed with CHANNEL_ERROR');
        }
      });

    this.subscriptions.set(channelName, subscription);
  }

  /**
   * Set up broadcast subscription for cart updates
   * Listens for cart changes, item additions/removals, etc.
   */
  static subscribeToCartUpdates() {
    const channelName = 'cart-updates';
    
    if (this.subscriptions.has(channelName)) {
      console.log('Cart updates subscription already exists');
    }

    console.log('🚀 Setting up cart updates broadcast subscription...');
    
    const subscription = supabase
      .channel(channelName)
      .on(
        'broadcast',
        { event: 'cart-item-added' },
        (payload: any) => {
          console.log('🔄 Cart item added (broadcast):', payload);
          queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
          this.notifyDataUpdate(`Added ${payload.payload?.productName || 'item'} to cart`);
        }
      )
      .on(
        'broadcast',
        { event: 'cart-item-removed' },
        (payload: any) => {
          console.log('🔄 Cart item removed (broadcast):', payload);
          queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
          this.notifyDataUpdate(`Removed ${payload.payload?.productName || 'item'} from cart`);
        }
      )
      .on(
        'broadcast',
        { event: 'cart-quantity-updated' },
        (payload: any) => {
          console.log('🔄 Cart quantity updated (broadcast):', payload);
          queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
          this.notifyDataUpdate(`Updated ${payload.payload?.productName || 'item'} quantity`);
        }
      )
      .on(
        'broadcast',
        { event: 'cart-cleared' },
        (payload: any) => {
          console.log('🔄 Cart cleared (broadcast):', payload);
          queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
          this.notifyDataUpdate('Cart cleared');
        }
      )
      .subscribe((status) => {
        console.log(`📡 Cart updates subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Cart updates broadcast subscription ACTIVE');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Cart updates subscription failed with CHANNEL_ERROR');
        }
      });

    this.subscriptions.set(channelName, subscription);
  }

  /**
   * Initialize all real-time subscriptions
   * Call this when the app starts or user logs in
   */
  static initializeAllSubscriptions() {
    console.log('🚀 Initializing all broadcast subscriptions...');
    
    this.subscribeToOrderUpdates();
    this.subscribeToProductUpdates();
    // this.subscribeToCartUpdates(); -
    
    this.isInitialized = true;
    console.log('✅ All broadcast subscriptions initialized');
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
    
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['userOrders'] }); // ProfileScreen format
    queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY }); 
    
    console.log('✅ All cached data refreshed');
  }
}
