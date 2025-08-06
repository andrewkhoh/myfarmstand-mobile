import { supabase } from '../config/supabase';
import { QueryClient } from '@tanstack/react-query';

// Import queryClient from the correct location
let queryClient: QueryClient;
try {
  const { queryClient: qc } = require('../config/queryClient');
  queryClient = qc;
} catch {
  // Fallback if import fails
  queryClient = new QueryClient();
  console.warn('Using fallback QueryClient for real-time service');
}

export class RealtimeService {
  private static subscriptions: Map<string, any> = new Map();

  /**
   * Set up real-time subscription for products
   * Invalidates React Query cache when products change
   */
  static subscribeToProducts() {
    const channelName = 'products-changes';
    
    if (this.subscriptions.has(channelName)) {
      console.log('Products subscription already exists');
      return;
    }

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          console.log('🔄 Products real-time update:', payload);
          
          // Invalidate products queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['product'] });
          
          // Show user feedback for real-time updates
          this.notifyDataUpdate('Products updated in real-time');
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, subscription);
    console.log('✅ Products real-time subscription established');
  }

  /**
   * Set up real-time subscription for categories
   * Invalidates React Query cache when categories change
   */
  static subscribeToCategories() {
    const channelName = 'categories-changes';
    
    if (this.subscriptions.has(channelName)) {
      console.log('Categories subscription already exists');
      return;
    }

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories'
        },
        (payload) => {
          console.log('🔄 Categories real-time update:', payload);
          
          // Invalidate categories queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['categories'] });
          
          this.notifyDataUpdate('Categories updated in real-time');
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, subscription);
    console.log('✅ Categories real-time subscription established');
  }

  /**
   * Set up real-time subscription for orders
   * Invalidates React Query cache when orders change
   */
  static subscribeToOrders() {
    const channelName = 'orders-changes';
    
    if (this.subscriptions.has(channelName)) {
      console.log('Orders subscription already exists');
      return;
    }

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('🔄 Orders real-time update:', payload);
          
          // Invalidate orders queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['order-stats'] });
          queryClient.invalidateQueries({ queryKey: ['user-orders'] });
          
          this.notifyDataUpdate('Orders updated in real-time');
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, subscription);
    console.log('✅ Orders real-time subscription established');
  }

  /**
   * Set up real-time subscription for order items
   * Invalidates React Query cache when order items change
   */
  static subscribeToOrderItems() {
    const channelName = 'order-items-changes';
    
    if (this.subscriptions.has(channelName)) {
      console.log('Order items subscription already exists');
      return;
    }

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items'
        },
        (payload) => {
          console.log('🔄 Order items real-time update:', payload);
          
          // Invalidate related queries
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['order-stats'] });
          
          this.notifyDataUpdate('Order details updated in real-time');
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, subscription);
    console.log('✅ Order items real-time subscription established');
  }

  /**
   * Initialize all real-time subscriptions
   * Call this when the app starts or user logs in
   */
  static initializeAllSubscriptions() {
    console.log('🚀 Initializing all real-time subscriptions...');
    
    this.subscribeToProducts();
    this.subscribeToCategories();
    this.subscribeToOrders();
    this.subscribeToOrderItems();
    
    console.log('✅ All real-time subscriptions initialized');
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
   * Notify user of real-time data updates
   * This could be enhanced with toast notifications or other UI feedback
   */
  private static notifyDataUpdate(message: string) {
    // For now, just console log
    // In the future, this could trigger toast notifications or other UI feedback
    console.log(`📱 ${message}`);
    
    // Could dispatch a custom event that UI components can listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('realtimeUpdate', { 
        detail: { message } 
      }));
    }
  }

  /**
   * Force refresh all cached data
   * Useful for manual refresh or when reconnecting
   */
  static forceRefreshAllData() {
    console.log('🔄 Force refreshing all cached data...');
    
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['product'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['order-stats'] });
    queryClient.invalidateQueries({ queryKey: ['user-orders'] });
    
    console.log('✅ All cached data refreshed');
  }
}
