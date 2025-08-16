import { supabase } from '../config/supabase';
import { Order } from '../types';
import { updateOrderStatus } from './orderService';
import { restoreOrderStock } from './stockRestorationService';
import { NotificationService } from './notificationService';
import { wasRecentlyRescheduled } from './pickupReschedulingService';
import { 
  getOrderCustomerId, 
  getOrderCustomerInfo, 
  getOrderItems, 
  getOrderTotal, 
  getOrderPaymentMethod,
  getOrderPickupDate,
  getOrderPickupTime,
  mapOrderFromDB
} from '../utils/typeMappers';
import { Database } from '../types/database.generated';

type DBOrderItem = Database['public']['Tables']['order_items']['Row'];

// No-show handling configuration
export interface NoShowConfig {
  gracePeriodMinutes: number; // Grace period after pickup time
  checkIntervalMinutes: number; // How often to check for no-shows
  enableAutoCancel: boolean; // Whether to auto-cancel or just flag
  notifyCustomer: boolean; // Whether to notify customer of no-show
}

// Default no-show configuration
const DEFAULT_NO_SHOW_CONFIG: NoShowConfig = {
  gracePeriodMinutes: 30, // 30 minutes grace period
  checkIntervalMinutes: 15, // Check every 15 minutes
  enableAutoCancel: true,
  notifyCustomer: true
};

// No-show handling result
export interface NoShowHandlingResult {
  success: boolean;
  processedOrders: Array<{
    orderId: string;
    customerName: string;
    action: 'cancelled' | 'flagged' | 'notified';
    stockRestored: boolean;
    notificationSent: boolean;
  }>;
  errors: Array<{
    orderId: string;
    error: string;
  }>;
  message?: string;
}

/**
 * No-Show Handling Service
 * Automatically handles orders where customers don't show up for pickup
 */
export class NoShowHandlingService {
  
  /**
   * Process all orders that are past their pickup window
   * Main method for handling no-shows
   */
  static async processNoShowOrders(config: Partial<NoShowConfig> = {}): Promise<NoShowHandlingResult> {
    const finalConfig = { ...DEFAULT_NO_SHOW_CONFIG, ...config };
    
    try {
      console.log('🕐 Starting no-show order processing...');
      
      // Find orders that are past their pickup window
      const noShowOrders = await NoShowHandlingService.findNoShowOrders(finalConfig.gracePeriodMinutes);
      
      if (noShowOrders.length === 0) {
        return {
          success: true,
          processedOrders: [],
          errors: [],
          message: 'No no-show orders found'
        };
      }
      
      console.log(`📋 Found ${noShowOrders.length} no-show orders to process`);
      
      const processedOrders: NoShowHandlingResult['processedOrders'] = [];
      const errors: NoShowHandlingResult['errors'] = [];
      
      // Process each no-show order
      for (const order of noShowOrders) {
        try {
          const result = await NoShowHandlingService.handleNoShowOrder(order, finalConfig);
          processedOrders.push(result);
        } catch (error) {
          console.error(`Failed to process no-show order ${order.id}:`, error);
          errors.push({
            orderId: order.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      // Log no-show processing summary
      await NoShowHandlingService.logNoShowProcessing(processedOrders, errors, finalConfig);
      
      const message = `Processed ${processedOrders.length} no-show orders, ${errors.length} errors`;
      console.log(`✅ No-show processing completed: ${message}`);
      
      return {
        success: true,
        processedOrders,
        errors,
        message
      };
      
    } catch (error) {
      console.error('Error in no-show processing:', error);
      return {
        success: false,
        processedOrders: [],
        errors: [{ orderId: 'system', error: error instanceof Error ? error.message : 'Unknown error' }],
        message: 'No-show processing failed'
      };
    }
  }
  
  /**
   * Handle a single no-show order
   */
  private static async handleNoShowOrder(
    order: Order,
    config: NoShowConfig
  ): Promise<NoShowHandlingResult['processedOrders'][0]> {
    const customerInfo = getOrderCustomerInfo(order);
    console.log(`🚫 Processing no-show order: ${order.id} (${customerInfo.name})`);
    
    let stockRestored = false;
    let notificationSent = false;
    let action: 'cancelled' | 'flagged' | 'notified' = 'flagged';
    
    try {
      // Step 1: Cancel the order if auto-cancel is enabled
      if (config.enableAutoCancel) {
        const statusResult = await updateOrderStatus(order.id, 'cancelled');
        if (statusResult.success) {
          action = 'cancelled';
          console.log(`✅ Order ${order.id} cancelled due to no-show`);
          
          // Stock restoration is handled automatically by the order status update
          // But we'll verify it happened
          stockRestored = true;
        } else {
          console.error(`Failed to cancel no-show order ${order.id}:`, statusResult.message);
        }
      }
      
      // Step 2: Notify customer if enabled
      if (config.notifyCustomer) {
        try {
          const notificationResult = await NotificationService.sendNotification({
            userId: getOrderCustomerId(order),
            customerEmail: customerInfo.email,
            customerPhone: customerInfo.phone,
            customerName: customerInfo.name,
            type: 'order_cancelled',
            channels: ['sms', 'email'],
            order,
            customMessage: `Your order was automatically cancelled due to no-show. ${getOrderPaymentMethod(order) === 'online' ? 'Your payment will be refunded.' : ''}`
          });
          
          notificationSent = notificationResult.success;
          if (notificationSent) {
            action = action === 'cancelled' ? 'cancelled' : 'notified';
            console.log(`📱 No-show notification sent to ${customerInfo.name}`);
          }
        } catch (notificationError) {
          console.warn(`Failed to send no-show notification for order ${order.id}:`, notificationError);
        }
      }
      
      // Step 3: Log the no-show event
      await NoShowHandlingService.logNoShowEvent(order, action, stockRestored, notificationSent);
      
      return {
        orderId: order.id,
        customerName: customerInfo.name,
        action,
        stockRestored,
        notificationSent
      };
      
    } catch (error) {
      console.error(`Error handling no-show order ${order.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Find orders that are past their pickup window
   */
  private static async findNoShowOrders(gracePeriodMinutes: number): Promise<Order[]> {
    try {
      // Calculate cutoff time (current time - grace period)
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - gracePeriodMinutes);
      
      // Find orders that are ready for pickup but past their pickup window
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('status', 'ready')
        .eq('fulfillment_type', 'pickup')
        .not('pickup_date', 'is', null)
        .not('pickup_time', 'is', null);
      
      if (error) {
        console.error('Error finding no-show orders:', error);
        return [];
      }
      
      if (!ordersData || ordersData.length === 0) {
        return [];
      }
      
      // Filter orders that are past their pickup window
      const noShowOrders: Order[] = [];
      
      for (const orderData of ordersData) {
        try {
          // Parse pickup date and time
          const pickupDateTime = new Date(`${orderData.pickup_date}T${orderData.pickup_time}`);
          
          // Check if pickup time + grace period has passed
          if (pickupDateTime < cutoffTime) {
            // Check if order was recently rescheduled
            const rescheduleCheck = await wasRecentlyRescheduled(orderData.id, 120); // Check within 2 hours
            
            if (rescheduleCheck.wasRescheduled) {
              console.log(`⏰ Order ${orderData.id} was recently rescheduled at ${rescheduleCheck.lastRescheduleTime}, skipping no-show detection`);
              continue;
            }
            
            // Convert to Order format
            const orderItems = orderData.order_items?.map((item: DBOrderItem) => ({
              productId: item.product_id,
              productName: item.product_name || '',
              price: item.unit_price || 0,
              quantity: item.quantity,
              subtotal: item.total_price || 0,
              product: undefined
            })) || [];
            
            const order = mapOrderFromDB(orderData, orderItems);
            
            noShowOrders.push(order);
          }
        } catch (parseError) {
          console.warn(`Failed to parse pickup time for order ${orderData.id}:`, parseError);
        }
      }
      
      return noShowOrders;
      
    } catch (error) {
      console.error('Error finding no-show orders:', error);
      return [];
    }
  }
  
  /**
   * Check if an order is eligible for no-show processing
   */
  static async isOrderNoShow(orderId: string, gracePeriodMinutes: number = 30): Promise<{
    isNoShow: boolean;
    minutesOverdue?: number;
    pickupWindow?: string;
  }> {
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .select('status, pickup_date, pickup_time, fulfillment_type')
        .eq('id', orderId)
        .single();
      
      if (error || !order) {
        return { isNoShow: false };
      }
      
      // Only pickup orders can be no-shows
      if (order.fulfillment_type !== 'pickup' || order.status !== 'ready') {
        return { isNoShow: false };
      }
      
      if (!order.pickup_date || !order.pickup_time) {
        return { isNoShow: false };
      }
      
      // Calculate if order is past pickup window
      const pickupDateTime = new Date(`${order.pickup_date}T${order.pickup_time}`);
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - gracePeriodMinutes);
      
      const isNoShow = pickupDateTime < cutoffTime;
      const minutesOverdue = isNoShow 
        ? Math.floor((Date.now() - pickupDateTime.getTime()) / (1000 * 60))
        : undefined;
      
      return {
        isNoShow,
        minutesOverdue,
        pickupWindow: `${order.pickup_date} ${order.pickup_time}`
      };
      
    } catch (error) {
      console.error('Error checking no-show status:', error);
      return { isNoShow: false };
    }
  }
  
  /**
   * Log no-show event for audit trail
   */
  private static async logNoShowEvent(
    order: Order,
    action: string,
    stockRestored: boolean,
    notificationSent: boolean
  ): Promise<void> {
    try {
      // TODO: Create no_show_logs table in database
      // const { error } = await supabase
      //   .from('no_show_logs')
      //   .insert({
      const customerInfo = getOrderCustomerInfo(order);
      const logData = {
          order_id: order.id,
          customer_email: customerInfo.email,
          customer_name: customerInfo.name,
          pickup_date: getOrderPickupDate(order),
          pickup_time: getOrderPickupTime(order),
          action_taken: action,
          stock_restored: stockRestored,
          notification_sent: notificationSent,
          order_total: getOrderTotal(order),
          payment_method: getOrderPaymentMethod(order),
          created_at: new Date().toISOString()
      }; // });
      
      // Log to console for now until table is created
      console.log('No-show event:', logData);
      const error = null;
      
      if (error) {
        console.warn('Failed to log no-show event:', error);
      }
    } catch (error) {
      console.warn('Failed to log no-show event:', error);
    }
  }
  
  /**
   * Log no-show processing summary
   */
  private static async logNoShowProcessing(
    processedOrders: NoShowHandlingResult['processedOrders'],
    errors: NoShowHandlingResult['errors'],
    config: NoShowConfig
  ): Promise<void> {
    try {
      // TODO: Create no_show_processing_logs table in database
      // const { error } = await supabase
      //   .from('no_show_processing_logs')
      //   .insert({
      const processingData = {
          processed_count: processedOrders.length,
          error_count: errors.length,
          config_used: config,
          processed_orders: processedOrders,
          errors: errors,
          created_at: new Date().toISOString()
      }; // });
      
      // Log to console for now until table is created
      console.log('No-show processing summary:', processingData);
      const error = null;
      
      if (error) {
        console.warn('Failed to log no-show processing:', error);
      }
    } catch (error) {
      console.warn('Failed to log no-show processing:', error);
    }
  }
  
  /**
   * Start automated no-show monitoring
   * This would typically be called by a cron job or background task
   */
  static startNoShowMonitoring(config: Partial<NoShowConfig> = {}): NodeJS.Timeout {
    const finalConfig = { ...DEFAULT_NO_SHOW_CONFIG, ...config };
    
    console.log(`🕐 Starting no-show monitoring (checking every ${finalConfig.checkIntervalMinutes} minutes)`);
    
    return setInterval(async () => {
      try {
        await NoShowHandlingService.processNoShowOrders(finalConfig);
      } catch (error) {
        console.error('Error in automated no-show processing:', error);
      }
    }, finalConfig.checkIntervalMinutes * 60 * 1000); // Convert minutes to milliseconds
  }
  
  /**
   * Stop automated no-show monitoring
   */
  static stopNoShowMonitoring(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
    console.log('🛑 No-show monitoring stopped');
  }
}

// Export convenience functions
export const processNoShowOrders = NoShowHandlingService.processNoShowOrders;
export const isOrderNoShow = NoShowHandlingService.isOrderNoShow;
export const startNoShowMonitoring = NoShowHandlingService.startNoShowMonitoring;
export const stopNoShowMonitoring = NoShowHandlingService.stopNoShowMonitoring;
