import { supabase } from '../config/supabase';

/**
 * Broadcast Helper Utility
 * Centralized helper for sending broadcast events across the app
 * Uses direct Supabase channels for reliable event delivery
 */
export class BroadcastHelper {
  /**
   * Send order update broadcast
   */
  static async sendOrderUpdate(event: string, payload: any) {
    try {
      const channel = supabase.channel('order-updates');
      const result = await channel.send({
        type: 'broadcast',
        event,
        payload
      });
      console.log(`📤 Order broadcast sent: ${event}`, { result, payload });
      return result;
    } catch (error) {
      console.error(`❌ Failed to send order broadcast: ${event}`, error);
      throw error;
    }
  }

  /**
   * Send cart update broadcast
   */
  static async sendCartUpdate(event: string, payload: any) {
    try {
      const channel = supabase.channel('cart-updates');
      const result = await channel.send({
        type: 'broadcast',
        event,
        payload
      });
      console.log(`📤 Cart broadcast sent: ${event}`, { result, payload });
      return result;
    } catch (error) {
      console.error(`❌ Failed to send cart broadcast: ${event}`, error);
      throw error;
    }
  }

  /**
   * Send product update broadcast
   */
  static async sendProductUpdate(event: string, payload: any) {
    try {
      const channel = supabase.channel('product-updates');
      const result = await channel.send({
        type: 'broadcast',
        event,
        payload
      });
      console.log(`📤 Product broadcast sent: ${event}`, { result, payload });
      return result;
    } catch (error) {
      console.error(`❌ Failed to send product broadcast: ${event}`, error);
      throw error;
    }
  }
}
