import { supabase } from '../config/supabase';
import { broadcastFactory } from './broadcastFactory';

/**
 * Broadcast Helper Utility
 * SECURITY: Now uses cryptographically secure broadcastFactory for all channel operations
 * Prevents enumeration attacks with HMAC-SHA256 encrypted channel names
 */
export class BroadcastHelper {
  /**
   * Send order update broadcast
   * SECURITY: Uses cryptographically secure channel names
   */
  static async sendOrderUpdate(event: string, payload: any) {
    try {
      // SECURITY: Use broadcastFactory for encrypted channel names
      const results = await broadcastFactory.sendOrderBroadcast(event, payload);
      
      // Handle array of results (user-specific + admin channels)
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      console.log(`📤 Order broadcast sent (secure): ${event}`, { 
        successCount,
        totalCount,
        allSuccessful: successCount === totalCount,
        payloadSize: JSON.stringify(payload).length 
      });
      
      // Return summary result
      return {
        success: successCount > 0, // Success if at least one channel worked
        results,
        successCount,
        totalCount
      };
    } catch (error) {
      console.error(`❌ Failed to send order broadcast: ${event}`, error);
      throw error;
    }
  }

  /**
   * Send cart update broadcast
   * SECURITY: Uses cryptographically secure user-specific channels
   */
  static async sendCartUpdate(event: string, payload: any) {
    try {
      // Ensure userId is included in payload
      if (!payload.userId) {
        console.error('❌ Cart broadcast missing userId - cannot send to user-specific channel');
        return;
      }
      
      // SECURITY: Use broadcastFactory for encrypted user-specific channels
      const result = await broadcastFactory.sendCartBroadcast(event, payload, payload.userId);
      console.log(`📤 Cart broadcast sent (secure): ${event}`, { 
        success: result.success, 
        channelName: result.channelName,
        userId: payload.userId,
        payloadSize: JSON.stringify(payload).length 
      });
      return result;
    } catch (error) {
      console.error(`❌ Failed to send cart broadcast: ${event}`, error);
      throw error;
    }
  }

  /**
   * Send product update broadcast
   * SECURITY: Uses cryptographically secure global channel
   */
  static async sendProductUpdate(event: string, payload: any) {
    try {
      // SECURITY: Use broadcastFactory for encrypted channel names
      const result = await broadcastFactory.sendProductBroadcast(event, payload);
      console.log(`📤 Product broadcast sent (secure): ${event}`, { 
        success: result.success, 
        channelName: result.channelName,
        payloadSize: JSON.stringify(payload).length 
      });
      return result;
    } catch (error) {
      console.error(`❌ Failed to send product broadcast: ${event}`, error);
      throw error;
    }
  }
}
