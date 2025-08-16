import { supabase } from '../config/supabase';
import { Order, OrderItem } from '../types';
import { sendOrderBroadcast } from '../utils/broadcastFactory';
import { 
  getOrderItems,
  getOrderCustomerInfo 
} from '../utils/typeMappers';

// Stock restoration result interface
export interface StockRestorationResult {
  success: boolean;
  restoredItems: Array<{
    productId: string;
    productName: string;
    quantityRestored: number;
    newStockLevel?: number;
  }>;
  failedItems: Array<{
    productId: string;
    productName: string;
    quantity: number;
    error: string;
  }>;
  message?: string;
  error?: string;
}

// Stock restoration reasons for audit trail
export type StockRestorationReason = 
  | 'order_cancelled' 
  | 'no_show_timeout' 
  | 'payment_failed' 
  | 'inventory_adjustment' 
  | 'system_error_recovery';

/**
 * Stock Restoration Service
 * Handles returning inventory when orders are cancelled, no-shows occur, or errors happen
 */
export class StockRestorationService {
  
  /**
   * Restore stock for a cancelled or no-show order
   * Primary method for returning inventory to available stock
   */
  static async restoreOrderStock(
    order: Order, 
    reason: StockRestorationReason = 'order_cancelled'
  ): Promise<StockRestorationResult> {
    try {
      console.log(`🔄 Starting stock restoration for order ${order.id}, reason: ${reason}`);
      
      const restoredItems: StockRestorationResult['restoredItems'] = [];
      const failedItems: StockRestorationResult['failedItems'] = [];
      
      // Restore stock for each order item
      const orderItems = getOrderItems(order);
      for (const item of orderItems) {
        try {
          const restorationResult = await StockRestorationService.restoreProductStock(
            item.productId,
            item.quantity,
            order.id,
            reason
          );
          
          if (restorationResult.success) {
            restoredItems.push({
              productId: item.productId,
              productName: item.productName,
              quantityRestored: item.quantity,
              newStockLevel: restorationResult.newStockLevel
            });
          } else {
            failedItems.push({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              error: restorationResult.error || 'Unknown error'
            });
          }
        } catch (error) {
          console.error(`Failed to restore stock for product ${item.productId}:`, error);
          failedItems.push({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      // Log stock restoration for audit trail
      await StockRestorationService.logStockRestoration(order, reason, restoredItems, failedItems);
      
      // Broadcast stock updates for real-time inventory sync
      if (restoredItems.length > 0) {
        await StockRestorationService.broadcastStockUpdates(restoredItems);
      }
      
      const success = restoredItems.length > 0;
      const message = success 
        ? `Stock restored for ${restoredItems.length} items from order ${order.id}`
        : `Failed to restore stock for order ${order.id}`;
      
      console.log(`✅ Stock restoration completed: ${message}`);
      
      return {
        success,
        restoredItems,
        failedItems,
        message
      };
      
    } catch (error) {
      console.error('Error in stock restoration:', error);
      return {
        success: false,
        restoredItems: [],
        failedItems: getOrderItems(order).map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          error: error instanceof Error ? error.message : 'Unknown error'
        })),
        error: `Stock restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Restore stock for a single product
   * Uses atomic RPC function to prevent race conditions
   */
  private static async restoreProductStock(
    productId: string,
    quantity: number,
    orderId: string,
    reason: StockRestorationReason
  ): Promise<{ success: boolean; newStockLevel?: number; error?: string }> {
    try {
      // Use Supabase RPC for atomic stock restoration
      const { data: result, error } = await supabase.rpc('increment_product_stock', {
        product_id: productId,
        quantity_to_add: quantity,
        order_id: orderId,
        restoration_reason: reason
      });
      
      if (error) {
        console.error(`Failed to restore stock for product ${productId}:`, error);
        return {
          success: false,
          error: `Database error: ${error.message}`
        };
      }
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Stock restoration failed'
        };
      }
      
      return {
        success: true,
        newStockLevel: result.new_stock_level
      };
      
    } catch (error) {
      console.error(`Error restoring stock for product ${productId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Verify if stock restoration is needed for an order
   * Checks if stock was already deducted and not yet restored
   */
  static async verifyRestorationNeeded(orderId: string): Promise<{
    needed: boolean;
    reason?: string;
    alreadyRestored?: boolean;
  }> {
    try {
      // TODO: Create stock_restoration_logs table in database
      // For now, skip the check and assume restoration is always needed
      // const { data: restorationLog, error } = await supabase
      //   .from('stock_restoration_logs')
      //   .select('*')
      //   .eq('order_id', orderId)
      //   .single();
      const restorationLog = null;
      const error = null;
      
      // Skip error check since we're not using the table yet
      // if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      //   console.error('Error checking restoration log:', error);
      //   return { needed: false, reason: 'Unable to verify restoration status' };
      // }
      
      if (restorationLog) {
        return { 
          needed: false, 
          alreadyRestored: true,
          reason: 'Stock already restored'
        };
      }
      
      // Check order status to determine if restoration is needed
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('status, created_at')
        .eq('id', orderId)
        .single();
      
      if (orderError) {
        console.error('Error fetching order:', orderError);
        return { needed: false, reason: 'Unable to fetch order' };
      }
      
      // Stock restoration needed for cancelled orders or orders that were confirmed but not completed
      const needsRestoration = ['cancelled', 'no_show'].includes(order.status);
      
      return {
        needed: needsRestoration,
        reason: needsRestoration ? `Order status: ${order.status}` : 'Order not cancelled'
      };
      
    } catch (error) {
      console.error('Error verifying restoration need:', error);
      return { needed: false, reason: 'Verification failed' };
    }
  }
  
  /**
   * Log stock restoration for audit trail and debugging
   */
  private static async logStockRestoration(
    order: Order,
    reason: StockRestorationReason,
    restoredItems: StockRestorationResult['restoredItems'],
    failedItems: StockRestorationResult['failedItems']
  ): Promise<void> {
    try {
      // TODO: Create stock_restoration_logs table in database
      // const { error } = await supabase
      //   .from('stock_restoration_logs')
      //   .insert({
      const customerInfo = getOrderCustomerInfo(order);
      const logData = {
          order_id: order.id,
          customer_email: customerInfo.email,
          restoration_reason: reason,
          items_restored: restoredItems.length,
          items_failed: failedItems.length,
          restored_items_data: restoredItems,
          failed_items_data: failedItems,
          total_quantity_restored: restoredItems.reduce((sum, item) => sum + item.quantityRestored, 0),
          created_at: new Date().toISOString()
      }; // });
      
      // Log to console for now until table is created
      console.log('Stock restoration event:', logData);
      const error = null;
      
      if (error) {
        console.warn('Failed to log stock restoration:', error);
      }
    } catch (error) {
      console.warn('Failed to log stock restoration:', error);
    }
  }
  
  /**
   * Broadcast stock updates for real-time inventory synchronization
   */
  private static async broadcastStockUpdates(
    restoredItems: StockRestorationResult['restoredItems']
  ): Promise<void> {
    try {
      for (const item of restoredItems) {
        await sendOrderBroadcast('stock-restored', {
          productId: item.productId,
          quantityRestored: item.quantityRestored,
          newStockLevel: item.newStockLevel,
          timestamp: new Date().toISOString(),
          action: 'stock_restoration'
        });
      }
    } catch (error) {
      console.warn('Failed to broadcast stock updates:', error);
      // Don't fail the restoration if broadcast fails
    }
  }
  
  /**
   * Emergency stock restoration for system recovery
   * Used when manual intervention is needed
   */
  static async emergencyStockRestoration(
    productId: string,
    quantity: number,
    reason: string
  ): Promise<StockRestorationResult> {
    try {
      console.log(`🚨 Emergency stock restoration: ${quantity} units for product ${productId}`);
      
      const restorationResult = await StockRestorationService.restoreProductStock(
        productId,
        quantity,
        'emergency-restoration',
        'system_error_recovery'
      );
      
      if (restorationResult.success) {
        return {
          success: true,
          restoredItems: [{
            productId,
            productName: `Product ${productId}`,
            quantityRestored: quantity,
            newStockLevel: restorationResult.newStockLevel
          }],
          failedItems: [],
          message: `Emergency restoration completed: ${quantity} units restored`
        };
      } else {
        return {
          success: false,
          restoredItems: [],
          failedItems: [{
            productId,
            productName: `Product ${productId}`,
            quantity,
            error: restorationResult.error || 'Emergency restoration failed'
          }],
          error: restorationResult.error
        };
      }
    } catch (error) {
      console.error('Emergency stock restoration failed:', error);
      return {
        success: false,
        restoredItems: [],
        failedItems: [{
          productId,
          productName: `Product ${productId}`,
          quantity,
          error: error instanceof Error ? error.message : 'Unknown error'
        }],
        error: `Emergency restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Export convenience functions
export const restoreOrderStock = StockRestorationService.restoreOrderStock;
export const verifyRestorationNeeded = StockRestorationService.verifyRestorationNeeded;
export const emergencyStockRestoration = StockRestorationService.emergencyStockRestoration;
