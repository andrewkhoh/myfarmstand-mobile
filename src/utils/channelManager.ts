import { supabase } from '../config/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Shared Channel Manager
 * Manages shared Supabase channel instances for both sending and receiving broadcasts
 * This ensures that broadcast events work properly by using the same subscribed channels
 */
export class ChannelManager {
  private static channels: Map<string, RealtimeChannel> = new Map();
  private static isInitialized = false;

  /**
   * Get or create a shared channel instance
   */
  static getChannel(channelName: string): RealtimeChannel {
    if (!this.channels.has(channelName)) {
      console.log(`🔗 Creating shared channel: ${channelName}`);
      const channel = supabase.channel(channelName);
      this.channels.set(channelName, channel);
      
      // Subscribe to the channel to make it active for broadcasting
      channel.subscribe((status) => {
        console.log(`📡 Shared channel ${channelName} status: ${status}`);
      });
    }
    
    return this.channels.get(channelName)!;
  }

  /**
   * Send broadcast event through shared channel
   */
  static async sendBroadcast(channelName: string, event: string, payload: any) {
    try {
      const channel = this.getChannel(channelName);
      await channel.send({
        type: 'broadcast',
        event: event,
        payload: {
          ...payload,
          timestamp: new Date().toISOString()
        }
      });
      console.log(`📡 Broadcast sent on ${channelName}: ${event}`, payload);
    } catch (error) {
      console.warn(`Failed to send broadcast on ${channelName}:`, error);
    }
  }

  /**
   * Initialize all shared channels
   */
  static initialize() {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing shared channels...');
    
    // Pre-create and subscribe to all channels
    this.getChannel('order-updates');
    this.getChannel('cart-updates');
    this.getChannel('product-updates');
    
    this.isInitialized = true;
    console.log('✅ Shared channels initialized');
  }

  /**
   * Cleanup all channels
   */
  static cleanup() {
    console.log('🧹 Cleaning up shared channels...');
    
    this.channels.forEach((channel, name) => {
      channel.unsubscribe();
      console.log(`🧹 Unsubscribed from ${name}`);
    });
    
    this.channels.clear();
    this.isInitialized = false;
  }
}
