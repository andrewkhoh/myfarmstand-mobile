import { supabase } from '../config/supabase';
import { Order } from '../types';
import { getOrder, updateOrderStatus } from './orderService';
import { sendOrderBroadcast } from '../utils/broadcastFactory';
import { NotificationService } from './notificationService';
import { 
  getOrderCustomerId, 
  getOrderCustomerInfo, 
  getOrderFulfillmentType 
} from '../utils/typeMappers';

// Rescheduling request interface
export interface RescheduleRequest {
  orderId: string;
  newPickupDate: string; // ISO date string (YYYY-MM-DD)
  newPickupTime: string; // Time string (HH:MM)
  reason?: string;
  requestedBy: 'customer' | 'staff' | 'admin';
  requestedByUserId?: string;
  customerNotification?: boolean;
}

// Rescheduling result
export interface RescheduleResult {
  success: boolean;
  order?: Order;
  previousPickupDate?: string;
  previousPickupTime?: string;
  newPickupDate?: string;
  newPickupTime?: string;
  message: string;
  error?: string;
  notificationSent?: boolean;
}

// Rescheduling validation result
export interface RescheduleValidation {
  isValid: boolean;
  canReschedule: boolean;
  reason?: string;
  suggestedTimes?: string[];
}

/**
 * Pickup Rescheduling Service
 * Handles customer requests to change pickup times and prevents false no-shows
 */
export class PickupReschedulingService {
  
  /**
   * Reschedule an order's pickup time
   * Main method for changing pickup slots
   */
  static async reschedulePickup(request: RescheduleRequest): Promise<RescheduleResult> {
    try {
      console.log(`📅 Processing pickup reschedule request for order: ${request.orderId}`);
      
      // Step 1: Validate the reschedule request
      const validation = await PickupReschedulingService.validateRescheduleRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Reschedule validation failed: ${validation.reason}`,
          error: validation.reason
        };
      }
      
      // Step 2: Get current order details
      const currentOrder = await getOrder(request.orderId);
      if (!currentOrder) {
        return {
          success: false,
          message: 'Order not found',
          error: 'Order does not exist'
        };
      }
      
      // Step 3: Check if order can be rescheduled
      if (!validation.canReschedule) {
        return {
          success: false,
          message: `Order cannot be rescheduled: ${validation.reason}`,
          error: validation.reason
        };
      }
      
      // Step 4: Update pickup time in database
      const updateResult = await PickupReschedulingService.updatePickupTime(request, currentOrder);
      if (!updateResult.success) {
        return {
          success: false,
          message: 'Failed to update pickup time',
          error: updateResult.error
        };
      }
      
      // Step 5: Log the rescheduling event
      await PickupReschedulingService.logRescheduleEvent(request, currentOrder);
      
      // Step 6: Send notifications if requested
      let notificationSent = false;
      if (request.customerNotification !== false) { // Default to true
        try {
          await PickupReschedulingService.sendRescheduleNotification(updateResult.order!, request);
          notificationSent = true;
        } catch (notificationError) {
          console.warn('Failed to send reschedule notification:', notificationError);
        }
      }
      
      // Step 7: Broadcast the change for real-time updates
      await PickupReschedulingService.broadcastReschedule(updateResult.order!, request);
      
      console.log(`✅ Pickup rescheduled successfully for order: ${request.orderId}`);
      
      return {
        success: true,
        order: updateResult.order,
        previousPickupDate: currentOrder.pickupDate,
        previousPickupTime: currentOrder.pickupTime,
        newPickupDate: request.newPickupDate,
        newPickupTime: request.newPickupTime,
        message: `Pickup rescheduled from ${currentOrder.pickupDate} ${currentOrder.pickupTime} to ${request.newPickupDate} ${request.newPickupTime}`,
        notificationSent
      };
      
    } catch (error) {
      console.error('Error in pickup rescheduling:', error);
      return {
        success: false,
        message: 'Pickup rescheduling failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Check if an order has been rescheduled recently
   * Used by no-show handling to avoid false positives
   */
  static async wasRecentlyRescheduled(
    orderId: string,
    withinMinutes: number = 60
  ): Promise<{ wasRescheduled: boolean; lastRescheduleTime?: string }> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - withinMinutes);
      
      // TODO: Create pickup_reschedule_logs table in database
      // For now, using pickup_reschedule_log table that exists
      const { data: rescheduleLog, error } = await supabase
        .from('pickup_reschedule_log')  // Using existing table name
        .select('created_at')
        .eq('order_id', orderId)
        .gte('created_at', cutoffTime.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking reschedule history:', error);
        return { wasRescheduled: false };
      }
      
      if (rescheduleLog) {
        return {
          wasRescheduled: true,
          lastRescheduleTime: rescheduleLog.created_at
        };
      }
      
      return { wasRescheduled: false };
      
    } catch (error) {
      console.error('Error checking reschedule history:', error);
      return { wasRescheduled: false };
    }
  }
  
  /**
   * Validate if a reschedule request is valid and allowed
   */
  private static async validateRescheduleRequest(request: RescheduleRequest): Promise<RescheduleValidation> {
    try {
      // Basic validation
      if (!request.orderId || !request.newPickupDate || !request.newPickupTime) {
        return {
          isValid: false,
          canReschedule: false,
          reason: 'Missing required fields (orderId, newPickupDate, newPickupTime)'
        };
      }
      
      // Validate date format
      const newPickupDateTime = new Date(`${request.newPickupDate}T${request.newPickupTime}`);
      if (isNaN(newPickupDateTime.getTime())) {
        return {
          isValid: false,
          canReschedule: false,
          reason: 'Invalid date or time format'
        };
      }
      
      // Check if new pickup time is in the future
      const now = new Date();
      if (newPickupDateTime <= now) {
        return {
          isValid: false,
          canReschedule: false,
          reason: 'New pickup time must be in the future'
        };
      }
      
      // Get order details for further validation
      const order = await getOrder(request.orderId);
      if (!order) {
        return {
          isValid: false,
          canReschedule: false,
          reason: 'Order not found'
        };
      }
      
      // Check order status - only certain statuses can be rescheduled
      const reschedulableStatuses = ['confirmed', 'ready'];
      if (!reschedulableStatuses.includes(order.status)) {
        return {
          isValid: false,
          canReschedule: false,
          reason: `Order status '${order.status}' cannot be rescheduled. Only orders that are confirmed, preparing, or ready for pickup can be rescheduled.`
        };
      }
      
      // Check if order is for pickup (not delivery)
      if (getOrderFulfillmentType(order) !== 'pickup') {
        return {
          isValid: false,
          canReschedule: false,
          reason: 'Only pickup orders can be rescheduled'
        };
      }
      
      // All validations passed
      return {
        isValid: true,
        canReschedule: true,
        reason: 'Reschedule request is valid'
      };
      
    } catch (error) {
      console.error('Error validating reschedule request:', error);
      return {
        isValid: false,
        canReschedule: false,
        reason: 'Validation failed due to system error'
      };
    }
  }
  
  /**
   * Update pickup time in database
   */
  private static async updatePickupTime(
    request: RescheduleRequest,
    currentOrder: Order
  ): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      // Update the order with new pickup time
      const { data, error } = await supabase
        .from('orders')
        .update({
          pickup_date: request.newPickupDate,
          pickup_time: request.newPickupTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.orderId)
        .select()
        .single();
      
      if (error) {
        console.error('Database error updating pickup time:', error);
        return {
          success: false,
          error: `Database error: ${error.message}`
        };
      }
      
      // Fetch the updated order
      const updatedOrder = await getOrder(request.orderId);
      if (!updatedOrder) {
        return {
          success: false,
          error: 'Failed to fetch updated order'
        };
      }
      
      return {
        success: true,
        order: updatedOrder
      };
      
    } catch (error) {
      console.error('Error updating pickup time:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Log reschedule event for audit trail
   */
  private static async logRescheduleEvent(
    request: RescheduleRequest,
    currentOrder: Order
  ): Promise<void> {
    try {
      const customerInfo = getOrderCustomerInfo(currentOrder);
      // TODO: Create pickup_reschedule_logs table in database
      // For now, using pickup_reschedule_log table that exists
      const { error } = await supabase
        .from('pickup_reschedule_log')  // Using existing table name
        .insert({
          order_id: request.orderId,
          customer_email: customerInfo.email,
          customer_name: customerInfo.name,
          previous_pickup_date: currentOrder.pickup_date || currentOrder.pickupDate,
          previous_pickup_time: currentOrder.pickup_time || currentOrder.pickupTime,
          new_pickup_date: request.newPickupDate,
          new_pickup_time: request.newPickupTime,
          requested_by: request.requestedBy,
          requested_by_user_id: request.requestedByUserId,
          reason: request.reason,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.warn('Failed to log reschedule event:', error);
      }
    } catch (error) {
      console.warn('Failed to log reschedule event:', error);
    }
  }
  
  /**
   * Send reschedule notification to customer
   */
  private static async sendRescheduleNotification(
    order: Order,
    request: RescheduleRequest
  ): Promise<void> {
    try {
      const customerInfo = getOrderCustomerInfo(order);
      await NotificationService.sendNotification({
        userId: getOrderCustomerId(order),
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        customerName: customerInfo.name,
        type: 'pickup_rescheduled' as any,
        channels: ['push', 'sms'],
        order
      });
      
    } catch (error) {
      console.error('Failed to send reschedule notification:', error);
      throw error;
    }
  }
  
  /**
   * Broadcast reschedule for real-time updates
   */
  private static async broadcastReschedule(
    order: Order,
    request: RescheduleRequest
  ): Promise<void> {
    try {
      await sendOrderBroadcast('pickup-rescheduled', {
        userId: getOrderCustomerId(order),
        orderId: order.id,
        newPickupDate: request.newPickupDate,
        newPickupTime: request.newPickupTime,
        timestamp: new Date().toISOString(),
        action: 'pickup_rescheduled'
      });
    } catch (error) {
      console.warn('Failed to broadcast reschedule:', error);
      // Don't fail the reschedule if broadcast fails
    }
  }
}

// Export convenience functions
export const reschedulePickup = PickupReschedulingService.reschedulePickup;
export const wasRecentlyRescheduled = PickupReschedulingService.wasRecentlyRescheduled;
