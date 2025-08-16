import { supabase } from '../config/supabase';
import { Order } from '../types';

// Notification types and interfaces
export type NotificationType = 'order_ready' | 'order_confirmed' | 'order_cancelled' | 'payment_reminder';
export type NotificationChannel = 'push' | 'sms' | 'email';

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface NotificationRequest {
  userId?: string;
  customerEmail: string;
  customerPhone: string;
  customerName: string;
  type: NotificationType;
  channels: NotificationChannel[];
  order: Order;
  customMessage?: string;
}

export interface NotificationResult {
  success: boolean;
  sentChannels: NotificationChannel[];
  failedChannels: NotificationChannel[];
  message?: string;
  error?: string;
}

/**
 * Notification Service for Customer Pickup Alerts
 * Supports push notifications, SMS, and email
 */
export class NotificationService {
  
  /**
   * Send pickup ready notification to customer
   * Primary method for order ready alerts
   */
  static async sendPickupReadyNotification(order: Order): Promise<NotificationResult> {
    try {
      console.log('📱 Sending pickup ready notification for order:', order.id);
      
      const notificationRequest: NotificationRequest = {
        userId: order.customerId,
        customerEmail: order.customer_email || '',
        customerPhone: order.customer_phone || '',
        customerName: order.customer_name || '',
        type: 'order_ready',
        channels: ['push', 'sms'], // Default channels for pickup ready
        order
      };
      
      return await this.sendNotification(notificationRequest);
    } catch (error) {
      console.error('Error sending pickup ready notification:', error);
      return {
        success: false,
        sentChannels: [],
        failedChannels: ['push', 'sms'],
        error: `Failed to send pickup notification: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Send order confirmation notification
   */
  static async sendOrderConfirmationNotification(order: Order): Promise<NotificationResult> {
    try {
      console.log('📧 Sending order confirmation notification for order:', order.id);
      
      const notificationRequest: NotificationRequest = {
        userId: order.customerId,
        customerEmail: order.customerInfo?.email || order.customer_email || '',
        customerPhone: order.customerInfo?.phone || order.customer_phone || '',
        customerName: order.customerInfo?.name || order.customer_name || '',
        type: 'order_confirmed',
        channels: ['push', 'email'], // Confirmation via push and email
        order
      };
      
      return await NotificationService.sendNotification(notificationRequest);
    } catch (error) {
      console.error('Error sending order confirmation notification:', error);
      return {
        success: false,
        sentChannels: [],
        failedChannels: ['push', 'email'],
        error: `Failed to send confirmation notification: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Core notification sending method
   * Handles multiple channels and templates
   */
  public static async sendNotification(request: NotificationRequest): Promise<NotificationResult> {
    const sentChannels: NotificationChannel[] = [];
    const failedChannels: NotificationChannel[] = [];
    
    // Generate notification template based on type
    const template = NotificationService.getNotificationTemplate(request.type, request.order);
    
    // Send via each requested channel
    for (const channel of request.channels) {
      try {
        let success = false;
        
        switch (channel) {
          case 'push':
            success = await NotificationService.sendPushNotification(request, template);
            break;
          case 'sms':
            success = await NotificationService.sendSMSNotification(request, template);
            break;
          case 'email':
            success = await NotificationService.sendEmailNotification(request, template);
            break;
        }
        
        if (success) {
          sentChannels.push(channel);
        } else {
          failedChannels.push(channel);
        }
      } catch (error) {
        console.error(`Failed to send ${channel} notification:`, error);
        failedChannels.push(channel);
      }
    }
    
    // Log notification attempt
    await NotificationService.logNotification(request, template, sentChannels, failedChannels);
    
    return {
      success: sentChannels.length > 0,
      sentChannels,
      failedChannels,
      message: sentChannels.length > 0 
        ? `Notification sent via: ${sentChannels.join(', ')}`
        : 'Failed to send notification via any channel'
    };
  }
  
  /**
   * Send push notification via Expo Push Notifications
   */
  private static async sendPushNotification(
    request: NotificationRequest, 
    template: NotificationTemplate
  ): Promise<boolean> {
    try {
      // TODO: Implement Expo Push Notifications
      // For now, simulate successful push notification
      console.log('📱 Push notification sent:', {
        to: request.userId,
        title: template.title,
        body: template.body,
        data: template.data
      });
      
      // In production, this would use Expo's push notification service:
      // const message = {
      //   to: pushToken,
      //   sound: 'default',
      //   title: template.title,
      //   body: template.body,
      //   data: template.data,
      // };
      // await fetch('https://exp.host/--/api/v2/push/send', { ... });
      
      return true;
    } catch (error) {
      console.error('Push notification failed:', error);
      return false;
    }
  }
  
  /**
   * Send SMS notification via Twilio or similar service
   */
  private static async sendSMSNotification(
    request: NotificationRequest, 
    template: NotificationTemplate
  ): Promise<boolean> {
    try {
      // TODO: Implement SMS service (Twilio, AWS SNS, etc.)
      // For now, simulate successful SMS
      console.log('📱 SMS notification sent:', {
        to: request.customerPhone,
        message: `${template.title}\n\n${template.body}`
      });
      
      // In production, this would integrate with SMS service:
      // await twilioClient.messages.create({
      //   body: `${template.title}\n\n${template.body}`,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: request.customerPhone
      // });
      
      return true;
    } catch (error) {
      console.error('SMS notification failed:', error);
      return false;
    }
  }
  
  /**
   * Send email notification via SendGrid, AWS SES, etc.
   */
  private static async sendEmailNotification(
    request: NotificationRequest, 
    template: NotificationTemplate
  ): Promise<boolean> {
    try {
      // TODO: Implement email service
      // For now, simulate successful email
      console.log('📧 Email notification sent:', {
        to: request.customerEmail,
        subject: template.title,
        body: template.body
      });
      
      // In production, this would integrate with email service:
      // await emailService.send({
      //   to: request.customerEmail,
      //   subject: template.title,
      //   html: this.generateEmailHTML(template, request.order)
      // });
      
      return true;
    } catch (error) {
      console.error('Email notification failed:', error);
      return false;
    }
  }
  
  /**
   * Generate notification templates based on type and order data
   */
  private static getNotificationTemplate(type: NotificationType, order: Order): NotificationTemplate {
    const farmStandName = "My Farm Stand"; // TODO: Make configurable
    const pickupLocation = "123 Farm Road"; // TODO: Make configurable
    
    switch (type) {
      case 'order_ready':
        return {
          type,
          title: '🎉 Your order is ready for pickup!',
          body: `Hi ${order.customer_name}! Your order #${order.id.slice(-6)} is ready for pickup at ${farmStandName}. ${order.payment_method === 'cash_on_pickup' ? 'Please bring cash for payment. ' : ''}Pickup location: ${pickupLocation}`,
          data: {
            orderId: order.id,
            pickupLocation,
            paymentMethod: order.paymentMethod,
            total: order.total
          }
        };
        
      case 'order_confirmed':
        return {
          type,
          title: '✅ Order confirmed!',
          body: `Thank you ${order.customer_name}! Your order #${order.id.slice(-6)} has been confirmed. We'll notify you when it's ready for pickup. ${order.pickup_date ? `Pickup date: ${order.pickup_date}` : ''}`,
          data: {
            orderId: order.id,
            pickupDate: order.pickupDate,
            pickupTime: order.pickupTime,
            total: order.total
          }
        };
        
      case 'order_cancelled':
        return {
          type,
          title: '❌ Order cancelled',
          body: `Your order #${order.id.slice(-6)} has been cancelled. ${order.paymentMethod === 'online' ? 'Your payment will be refunded within 3-5 business days.' : ''}`,
          data: {
            orderId: order.id,
            paymentMethod: order.paymentMethod
          }
        };
        
      case 'payment_reminder':
        return {
          type,
          title: '💳 Payment reminder',
          body: `Hi ${order.customer_name}! Don't forget to bring cash ($${order.total_amount.toFixed(2)}) for your order #${order.id.slice(-6)} pickup.`,
          data: {
            orderId: order.id,
            total: order.total
          }
        };
        
      default:
        return {
          type,
          title: 'Farm Stand Notification',
          body: `Update for your order #${order.id.slice(-6)}`,
          data: { orderId: order.id }
        };
    }
  }
  
  /**
   * Log notification attempts for audit and debugging
   */
  private static async logNotification(
    request: NotificationRequest,
    template: NotificationTemplate,
    sentChannels: NotificationChannel[],
    failedChannels: NotificationChannel[]
  ): Promise<void> {
    try {
      // Log to Supabase for audit trail
      const { error } = await supabase
        .from('notification_logs')
        .insert({
          order_id: request.order.id,
          customer_email: request.customerEmail,
          notification_type: request.type,
          channels_attempted: request.channels,
          channels_sent: sentChannels,
          channels_failed: failedChannels,
          template_title: template.title,
          template_body: template.body,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.warn('Failed to log notification:', error);
      }
    } catch (error) {
      console.warn('Failed to log notification:', error);
    }
  }
}

// Export convenience functions
export const sendPickupReadyNotification = NotificationService.sendPickupReadyNotification;
export const sendOrderConfirmationNotification = NotificationService.sendOrderConfirmationNotification;
