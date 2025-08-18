import { CreateOrderRequest, Order, OrderSubmissionResult, PaymentStatus } from '../types';
import { supabase } from '../config/supabase';
import { sendOrderBroadcast } from '../utils/broadcastFactory';
import { sendPickupReadyNotification, sendOrderConfirmationNotification } from './notificationService';
import { restoreOrderStock } from './stockRestorationService';
import { v4 as uuidv4 } from 'uuid';
import { 
  getProductStock,
  getOrderCustomerId, 
  getOrderTotal, 
  getOrderFulfillmentType,
  mapOrderFromDB
} from '../utils/typeMappers';
import { Database } from '../types/database.generated';
import {
  OrderSchema,
  OrderSubmissionResultSchema,
  CreateOrderRequestSchema,
  OrderArraySchema,
} from '../schemas/order.schema';
import { ZodError, z } from 'zod';
import { ValidationMonitor } from '../utils/validationMonitor';
import { DefensiveDatabase, DatabaseHelpers } from '../utils/defensiveDatabase';
import { ServiceValidator, ValidationUtils } from '../utils/validationPipeline';

type DBOrderItem = Database['public']['Tables']['order_items']['Row'];
type DBOrder = Database['public']['Tables']['orders']['Row'];

// Database schemas for defensive database access
const DbOrderItemSchema = z.object({
  id: z.string().min(1),
  order_id: z.string().min(1),
  product_id: z.string().min(1),
  product_name: z.string().min(1),
  unit_price: z.number().min(0),
  quantity: z.number().min(1).max(1000),
  total_price: z.number().min(0),
  created_at: z.string().nullable()
});

const DbOrderSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().nullable(),
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  customer_phone: z.string().min(1),
  subtotal: z.number().min(0),
  tax_amount: z.number().min(0),
  total_amount: z.number().min(0),
  fulfillment_type: z.string().min(1),
  status: z.string().min(1),
  payment_method: z.string().nullable(),
  payment_status: z.string().min(1),
  notes: z.string().nullable(),
  pickup_date: z.string().nullable(),
  pickup_time: z.string().nullable(),
  delivery_address: z.string().nullable(),
  special_instructions: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

// Validation helper functions with backward-compatible error handling
const validateOrder = (orderData: any): Order => {
  try {
    return OrderSchema.parse(orderData);
  } catch (error) {
    // Add production validation monitoring
    ValidationMonitor.recordValidationError({
      context: 'OrderService.validateOrder',
      errorMessage: error instanceof Error ? error.message : 'Unknown validation error',
      errorCode: 'ORDER_VALIDATION_FAILED'
    });
    
    console.warn('Invalid order data received:', {
      error: error instanceof Error ? error.message : 'Unknown validation error',
      invalidData: orderData
    });
    throw new Error('Invalid order data received from server');
  }
};

const validateCreateOrderRequest = (requestData: any): CreateOrderRequest => {
  try {
    return CreateOrderRequestSchema.parse(requestData);
  } catch (error) {
    // Add production validation monitoring
    ValidationMonitor.recordValidationError({
      context: 'OrderService.validateCreateOrderRequest',
      errorMessage: error instanceof Error ? error.message : 'Unknown validation error',
      errorCode: 'CREATE_ORDER_REQUEST_VALIDATION_FAILED'
    });
    
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      throw new Error(`Invalid order request: ${firstIssue.message}`);
    }
    console.warn('Invalid create order request:', {
      error: error instanceof Error ? error.message : 'Unknown validation error',
      invalidData: requestData
    });
    throw new Error('Invalid order request data');
  }
};

const validateAndMapOrders = (ordersData: any[]): Order[] => {
  const validOrders: Order[] = [];
  
  for (const orderData of ordersData) {
    try {
      // Validate database order structure before any transformation
      const validatedOrderData = validateOrder(orderData);
      
      const orderItems = validatedOrderData.order_items?.map((item: DBOrderItem) => ({
        productId: item.product_id,
        productName: item.product_name || '',
        price: item.unit_price || 0,
        quantity: item.quantity,
        subtotal: item.total_price || 0,
        product: undefined
      })) || [];
      
      const mappedOrder = mapOrderFromDB(validatedOrderData, orderItems);
      
      // Add production calculation validation
      const validatedMappedOrder = validateOrderCalculations(mappedOrder);
      
      validOrders.push(validatedMappedOrder);
    } catch (error) {
      console.warn('Invalid order data, skipping order:', {
        orderId: orderData?.id,
        error: error instanceof Error ? error.message : 'Unknown validation error',
        invalidData: orderData
      });
    }
  }
  
  return validOrders;
};

// Calculate tax (8.5% for example)
const calculateTax = (subtotal: number): number => {
  return Math.round(subtotal * 0.085 * 100) / 100;
};

// Production order calculation validation helper
const validateOrderCalculations = (order: Order): Order => {
  if (!order.order_items?.length) {
    return order;
  }
  
  // Validate subtotal calculation using database structure
  const calculatedSubtotal = order.order_items.reduce((sum, item: any) => {
    // Handle both database and application field names
    const itemTotal = item.total_price || item.subtotal || 0;
    return sum + itemTotal;
  }, 0);
  
  const subtotalTolerance = 0.01;
  const subtotalDifference = Math.abs(order.subtotal - calculatedSubtotal);
  
  if (subtotalDifference > subtotalTolerance) {
    ValidationMonitor.recordCalculationMismatch({
      type: 'order_subtotal',
      expected: calculatedSubtotal,
      actual: order.subtotal,
      difference: subtotalDifference,
      tolerance: subtotalTolerance,
      orderId: order.id
    });
  }
  
  // Validate total calculation (subtotal + tax)
  const expectedTotal = order.subtotal + order.tax_amount;
  const totalTolerance = 0.01;
  const totalDifference = Math.abs(order.total_amount - expectedTotal);
  
  if (totalDifference > totalTolerance) {
    ValidationMonitor.recordCalculationMismatch({
      type: 'order_total',
      expected: expectedTotal,
      actual: order.total_amount,
      difference: totalDifference,
      tolerance: totalTolerance,
      orderId: order.id
    });
  }
  
  // Validate individual item calculations
  order.order_items.forEach((item: any, index) => {
    // Handle both database and application field names
    const unitPrice = item.unit_price || item.price || 0;
    const itemTotal = item.total_price || item.subtotal || 0;
    const expectedItemTotal = unitPrice * item.quantity;
    const itemTolerance = 0.01;
    const itemDifference = Math.abs(itemTotal - expectedItemTotal);
    
    if (itemDifference > itemTolerance) {
      ValidationMonitor.recordCalculationMismatch({
        type: 'item_subtotal',
        expected: expectedItemTotal,
        actual: itemTotal,
        difference: itemDifference,
        tolerance: itemTolerance,
        orderId: order.id,
        itemId: `${order.id}-item-${index}`
      });
    }
  });
  
  return order;
};

// Interface for inventory validation results
interface InventoryValidationResult {
  isValid: boolean;
  conflicts: Array<{
    productId: string;
    productName: string;
    requested: number;
    available: number;
  }>;
}

// Validate inventory availability at checkout time using defensive database access
const validateInventoryAvailability = async (orderItems: CreateOrderRequest['items']): Promise<InventoryValidationResult> => {
  const conflicts: InventoryValidationResult['conflicts'] = [];
  
  // Schema for product stock validation
  const ProductStockSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    stock_quantity: z.number().min(0)
  });
  
  // Get current stock levels for all products in the order using defensive database access
  const productIds = orderItems.map(item => item.productId);
  const products = await DatabaseHelpers.fetchFiltered(
    'products',
    `inventory-check-${productIds.length}`,
    ProductStockSchema,
    async () => supabase
      .from('products')
      .select('id, name, stock_quantity')
      .in('id', productIds),
    {
      maxErrorThreshold: 0.0, // Don't allow any invalid product data for inventory validation
      throwOnCriticalFailure: true // This is critical for order processing
    }
  );
  
  // Check each item against current stock
  for (const orderItem of orderItems) {
    const product = products?.find(p => p.id === orderItem.productId);
    
    if (!product) {
      conflicts.push({
        productId: orderItem.productId,
        productName: orderItem.productName,
        requested: orderItem.quantity,
        available: 0
      });
      continue;
    }
    
    const stock = getProductStock(product);
    if (stock < orderItem.quantity) {
      conflicts.push({
        productId: orderItem.productId,
        productName: orderItem.productName,
        requested: orderItem.quantity,
        available: stock
      });
    }
  }
  
  return {
    isValid: conflicts.length === 0,
    conflicts
  };
};

// Atomically update stock levels for successful orders
const updateProductStock = async (orderItems: CreateOrderRequest['items']): Promise<void> => {
  // Use Supabase RPC for atomic stock updates
  for (const item of orderItems) {
    const { error } = await supabase.rpc('decrement_product_stock', {
      product_id: item.productId,
      quantity_to_subtract: item.quantity
    });
    
    if (error) {
      console.error(`Failed to update stock for product ${item.productId}:`, error);
      // In a production system, you'd want to implement compensation logic here
      throw new Error(`Failed to update inventory for ${item.productName}`);
    }
  }
};

// Real Supabase function to submit an order - ATOMIC VERSION
export const submitOrder = async (orderRequest: CreateOrderRequest): Promise<OrderSubmissionResult> => {
  try {
    // Enhanced input validation using validation pipeline
    const SubmitOrderInputSchema = z.object({
      customerInfo: z.object({
        name: ValidationUtils.createSafeStringSchema(2, 100),
        email: ValidationUtils.createEmailSchema(),
        phone: ValidationUtils.createPhoneSchema()
      }),
      items: z.array(z.object({
        productId: z.string().min(1),
        productName: ValidationUtils.createSafeStringSchema(1, 200),
        price: ValidationUtils.createMoneySchema(),
        quantity: ValidationUtils.createQuantitySchema(),
        subtotal: ValidationUtils.createMoneySchema()
      })).min(1, 'Order must contain at least one item'),
      fulfillmentType: z.enum(['pickup', 'delivery']),
      paymentMethod: z.enum(['online', 'cash_on_pickup']),
      specialInstructions: ValidationUtils.createSafeStringSchema(0, 500).optional(),
      pickupDate: z.string().optional(),
      pickupTime: z.string().optional(),
      deliveryAddress: ValidationUtils.createSafeStringSchema(10, 500).optional(),
      deliveryDate: z.string().optional(),
      deliveryTime: z.string().optional()
    });
    
    const validatedRequest = await ServiceValidator.validateInput(
      orderRequest,
      SubmitOrderInputSchema,
      'OrderService.submitOrder'
    );
    
    // Calculate totals
    const subtotal = orderRequest.items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = calculateTax(subtotal);
    const total = subtotal + tax;
    
    // Determine payment status based on payment method
    // Option A: Payment at checkout - online payments are processed immediately
    const paymentStatus: PaymentStatus = orderRequest.paymentMethod === 'online' ? 'paid' : 'pending';
    
    // Get current user for order association
    const { data: { user } } = await supabase.auth.getUser();
    
    // Prepare order items for RPC function
    const orderItemsData = orderRequest.items.map(item => ({
      product_id: item.productId,
      product_name: item.productName,
      unit_price: item.price,
      quantity: item.quantity,
      total_price: item.subtotal
    }));

    // Process online payment if selected (Option A: Payment at Checkout)
    if (orderRequest.paymentMethod === 'online') {
      // TODO: Integrate with payment processor (Stripe, Square, etc.)
      // For now, we'll simulate successful payment processing
      console.log('🔄 Processing online payment for order total:', total);
      // In production, this would call your payment processor API
      // const paymentResult = await processPayment({ amount: total, ... });
    }
    
    // ATOMIC ORDER SUBMISSION: Single RPC call eliminates race conditions
    const { data: result, error } = await supabase.rpc('submit_order_atomic', {
      p_order_id: uuidv4(),
      p_user_id: user?.id || null,
      p_customer_name: orderRequest.customerInfo.name,
      p_customer_email: orderRequest.customerInfo.email,
      p_customer_phone: orderRequest.customerInfo.phone,
      p_subtotal: subtotal,
      p_tax_amount: tax,
      p_total_amount: total,
      p_fulfillment_type: orderRequest.fulfillmentType,
      p_payment_method: orderRequest.paymentMethod,
      p_payment_status: paymentStatus,
      p_order_items: orderItemsData,
      p_delivery_address: orderRequest.fulfillmentType === 'delivery' ? orderRequest.deliveryAddress : null,
      p_pickup_date: orderRequest.fulfillmentType === 'delivery' ? orderRequest.deliveryDate : 
                     orderRequest.fulfillmentType === 'pickup' ? orderRequest.pickupDate : null,
      p_pickup_time: orderRequest.fulfillmentType === 'delivery' ? orderRequest.deliveryTime :
                     orderRequest.fulfillmentType === 'pickup' ? orderRequest.pickupTime : null,
      p_special_instructions: orderRequest.specialInstructions || null,
      p_status: 'pending'
    });

    if (error) {
      console.error('Error calling submit_order_atomic RPC:', error);
      return {
        success: false,
        error: `Failed to submit order: ${error.message}`
      };
    }

    // Handle RPC function response
    if (!result.success) {
      // RPC function detected inventory conflicts or other issues
      return {
        success: false,
        error: result.error,
        inventoryConflicts: result.inventoryConflicts || []
      };
    }

    // Success! Order created atomically
    const createdOrder = result.order;
    
    // Convert RPC format to application format and validate
    const orderObject = {
      // Primary database fields
      id: createdOrder.id,
      user_id: createdOrder.customerId || createdOrder.user_id,
      customer_name: createdOrder.customerInfo?.name || createdOrder.customer_name,
      customer_email: createdOrder.customerInfo?.email || createdOrder.customer_email,
      customer_phone: createdOrder.customerInfo?.phone || createdOrder.customer_phone,
      order_items: orderRequest.items,
      subtotal: createdOrder.subtotal,
      tax_amount: createdOrder.taxAmount || createdOrder.tax_amount,
      total_amount: createdOrder.totalAmount || createdOrder.total_amount,
      fulfillment_type: createdOrder.fulfillmentType || createdOrder.fulfillment_type,
      status: createdOrder.status,
      payment_method: createdOrder.paymentMethod || createdOrder.payment_method,
      payment_status: createdOrder.paymentStatus || createdOrder.payment_status,
      notes: createdOrder.notes,
      pickup_date: createdOrder.pickupDate || createdOrder.pickup_date,
      pickup_time: createdOrder.pickupTime || createdOrder.pickup_time,
      delivery_address: createdOrder.deliveryAddress || createdOrder.delivery_address,
      special_instructions: createdOrder.specialInstructions || createdOrder.special_instructions,
      created_at: createdOrder.createdAt || createdOrder.created_at,
      updated_at: createdOrder.updatedAt || createdOrder.updated_at,
      
      // Legacy field mappings
      customerId: createdOrder.customerId || createdOrder.user_id,
      customerInfo: createdOrder.customerInfo || {
        name: createdOrder.customer_name,
        email: createdOrder.customer_email,
        phone: createdOrder.customer_phone,
        address: createdOrder.delivery_address
      },
      items: orderRequest.items,
      tax: createdOrder.taxAmount || createdOrder.tax_amount,
      total: createdOrder.totalAmount || createdOrder.total_amount,
      fulfillmentType: createdOrder.fulfillmentType || createdOrder.fulfillment_type,
      paymentMethod: createdOrder.paymentMethod || createdOrder.payment_method,
      paymentStatus: createdOrder.paymentStatus || createdOrder.payment_status,
      pickupDate: createdOrder.pickupDate || createdOrder.pickup_date,
      pickupTime: createdOrder.pickupTime || createdOrder.pickup_time,
      deliveryAddress: createdOrder.deliveryAddress || createdOrder.delivery_address,
      delivery_date: createdOrder.deliveryDate || createdOrder.delivery_date,
      delivery_time: createdOrder.deliveryTime || createdOrder.delivery_time,
      specialInstructions: createdOrder.specialInstructions || createdOrder.special_instructions,
      createdAt: createdOrder.createdAt || createdOrder.created_at,
      updatedAt: createdOrder.updatedAt || createdOrder.updated_at
    };
    
    const order = validateOrder(orderObject);
    
    // Add production calculation validation
    const validatedOrder = validateOrderCalculations(order);

    // SECURITY-HARDENED: Broadcast order creation for real-time updates
    try {
      await sendOrderBroadcast('new-order', {
        userId: getOrderCustomerId(validatedOrder), // SECURITY: User-specific routing
        orderId: validatedOrder.id,
        status: validatedOrder.status,
        total: getOrderTotal(validatedOrder),
        fulfillmentType: getOrderFulfillmentType(validatedOrder),
        timestamp: new Date().toISOString(),
        action: 'order_created'
      });
    } catch (broadcastError) {
      console.warn('Failed to broadcast new order:', broadcastError);
      // Don't fail the order creation if broadcast fails
    }

    // Send order confirmation notification
    try {
      await sendOrderConfirmationNotification(validatedOrder);
      console.log('✅ Order confirmation notification sent for order:', validatedOrder.id);
    } catch (notificationError) {
      console.warn('Failed to send order confirmation notification:', notificationError);
      // Don't fail the order creation if notification fails
    }

    return {
      success: true,
      order: validatedOrder
    };

  } catch (error) {
    console.error('Unexpected error in submitOrder:', error);
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Get order by ID - Real Supabase implementation with defensive database access
export const getOrder = async (orderId: string): Promise<Order | null> => {
  try {
    // Create a combined schema for order with items
    const OrderWithItemsSchema = DbOrderSchema.extend({
      order_items: z.array(DbOrderItemSchema).optional().default([])
    });
    
    const orderData = await DefensiveDatabase.fetchSingleWithValidation(
      async () => supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            product_name,
            unit_price,
            quantity,
            total_price
          )
        `)
        .eq('id', orderId)
        .single(),
      OrderWithItemsSchema,
      `getOrder-${orderId}`,
      {
        throwOnCriticalFailure: false,
        includeDetailedErrors: false // Don't log order details for privacy
      }
    );

    if (!orderData) {
      console.error('Order not found or invalid:', orderId);
      return null;
    }

    // Convert database format to app format
    const orderItems = orderData.order_items?.map((item: DBOrderItem) => ({
      productId: item.product_id,
      productName: item.product_name || '',
      price: item.unit_price || 0,
      quantity: item.quantity,
      subtotal: item.total_price || 0,
      product: undefined
    })) || [];
    
    const order = mapOrderFromDB(orderData, orderItems);
    
    // Add production calculation validation
    const validatedOrder = validateOrderCalculations(order);

    return validatedOrder;
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
};

// Get orders for a customer - Real Supabase implementation with defensive database access
export const getCustomerOrders = async (customerEmail: string): Promise<Order[]> => {
  if (!customerEmail) {
    console.warn('getCustomerOrders: customerEmail is required');
    return [];
  }

  try {
    // Create a combined schema for orders with items
    const OrdersWithItemsSchema = z.array(DbOrderSchema.extend({
      order_items: z.array(DbOrderItemSchema).optional().default([])
    }));
    
    const ordersData = await DatabaseHelpers.fetchFiltered(
      'orders',
      `customer-${customerEmail.split('@')[0]}`, // Use email prefix for context
      OrdersWithItemsSchema,
      async () => supabase
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
        .eq('customer_email', customerEmail)
        .order('created_at', { ascending: false }),
      {
        maxErrorThreshold: 0.1, // Allow up to 10% invalid orders
        includeDetailedErrors: false, // Don't log order details for privacy
        throwOnCriticalFailure: false
      }
    );

    if (!ordersData || ordersData.length === 0) {
      return [];
    }

    // Convert database format to app format with validation
    const orders = validateAndMapOrders(ordersData);

    return orders;
  } catch (error) {
    console.error('Error in getCustomerOrders:', error);
    return [];
  }
};

// Update order status (for staff QR scanner) - Real Supabase implementation
export const updateOrderStatus = async (orderId: string, newStatus: string): Promise<{ success: boolean; message?: string; order?: Order }> => {
  try {
    // Update order status in database
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating order status:', error);
      return {
        success: false,
        message: `Failed to update order status: ${error.message}`
      };
    }

    if (!data) {
      return {
        success: false,
        message: 'Order not found'
      };
    }

    // Fetch complete order data for broadcast
    const updatedOrder = await getOrder(orderId);
    if (!updatedOrder) {
      return {
        success: false,
        message: 'Failed to fetch updated order data'
      };
    }

    // SECURITY-HARDENED: Broadcast event with robust error handling (CartService pattern)
    try {
      console.log('🔍 DEBUG: Broadcasting order update with userId:', updatedOrder.customerId, 'for order:', orderId);
      await sendOrderBroadcast('order-status-updated', {
        userId: updatedOrder.customerId, // SECURITY: User-specific routing
        orderId: orderId,
        status: newStatus,
        timestamp: new Date().toISOString(),
        action: 'status_updated'
      });
    } catch (error) {
      console.warn('Failed to broadcast order status update:', error);
      // Order update still succeeds even if broadcast fails
    }

    // Send pickup ready notification when order status changes to ready
    if (newStatus === 'ready') {
      try {
        await sendPickupReadyNotification(updatedOrder);
        console.log('📱 Pickup ready notification sent for order:', orderId);
      } catch (notificationError) {
        console.warn('Failed to send pickup ready notification:', notificationError);
        // Order update still succeeds even if notification fails
      }
    }

    // Handle stock restoration for cancelled orders
    if (newStatus === 'cancelled') {
      try {
        console.log('🔄 Order cancelled, initiating stock restoration for order:', orderId);
        const restorationResult = await restoreOrderStock(updatedOrder, 'order_cancelled');
        
        if (restorationResult.success) {
          console.log('✅ Stock restoration completed:', restorationResult.message);
        } else {
          console.error('❌ Stock restoration failed:', restorationResult.error);
          // Log the failure but don't fail the cancellation
        }
      } catch (restorationError) {
        console.error('Failed to restore stock for cancelled order:', restorationError);
        // Order cancellation still succeeds even if stock restoration fails
      }
    }

    return {
      success: true,
      message: `Order status updated to ${newStatus}`,
      order: updatedOrder
    };

  } catch (error) {
    console.error('Error updating order status:', error);
    return {
      success: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Bulk update order status (admin only) - Enhanced with robust error handling
export const bulkUpdateOrderStatus = async (
  orderIds: string[], 
  newStatus: string
): Promise<{ success: boolean; message?: string; updatedOrders?: Order[] }> => {
  try {
    // Update all orders in database
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .in('id', orderIds)
      .select();

    if (error) {
      console.error('Error bulk updating order status:', error);
      return {
        success: false,
        message: `Failed to bulk update order status: ${error.message}`
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        message: 'No orders found to update'
      };
    }

    // Fetch complete order data for each updated order
    const updatedOrders: Order[] = [];
    for (const orderId of orderIds) {
      const order = await getOrder(orderId);
      if (order) {
        updatedOrders.push(order);
      }
    }

    // Broadcast events for each updated order with robust error handling
    for (const order of updatedOrders) {
      try {
        await sendOrderBroadcast('order-status-updated', {
          userId: getOrderCustomerId(order), // SECURITY: User-specific routing
          orderId: order.id,
          status: newStatus,
          timestamp: new Date().toISOString(),
          action: 'bulk_status_updated'
        });
      } catch (error) {
        console.warn(`Failed to broadcast order status update for ${order.id}:`, error);
        // Continue with other orders even if one broadcast fails
      }
    }

    return {
      success: true,
      message: `Successfully updated ${updatedOrders.length} orders to ${newStatus}`,
      updatedOrders
    };

  } catch (error) {
    console.error('Error bulk updating order status:', error);
    return {
      success: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Admin order management functions
export interface OrderFilters {
  status?: string;
  fulfillmentType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// Get all orders with optional filtering (admin only) - Real Supabase implementation
export const getAllOrders = async (filters?: OrderFilters): Promise<Order[]> => {
  try {
    let query = supabase
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
      `);
    
    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters?.fulfillmentType) {
      query = query.eq('fulfillment_type', filters.fulfillmentType);
    }
    
    if (filters?.search) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      query = query.or(`customer_name.ilike.${searchTerm},customer_email.ilike.${searchTerm},id.ilike.${searchTerm}`);
    }
    
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }
    
    // Sort by creation date (newest first)
    query = query.order('created_at', { ascending: false });
    
    const { data: ordersData, error } = await query;
    
    if (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
    
    // Convert database format to app format with validation
    const orders = validateAndMapOrders(ordersData);
    
    return orders;
  } catch (error) {
    console.error('Error in getAllOrders:', error);
    return [];
  }
};

// Get order statistics (admin only) - Real Supabase implementation
export const getOrderStats = async (): Promise<{
  // Daily Metrics (Today)
  daily: {
    ordersPlaced: number;      // Orders placed today
    ordersCompleted: number;   // Orders completed today
    revenue: number;           // Revenue from orders completed today
    pendingFromToday: number;  // Today's orders still pending
  };
  // Weekly Metrics (This Week)
  weekly: {
    ordersPlaced: number;      // Orders placed this week
    ordersCompleted: number;   // Orders completed this week
    revenue: number;           // Revenue from orders completed this week
    pendingFromWeek: number;   // This week's orders still pending
  };
  // Current Active Orders (All Time)
  active: {
    totalPending: number;      // All orders currently needing attention
  };
}> => {
  try {
    // Date calculations
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of this week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    
    // Get all orders for statistics
    const { data: allOrders, error } = await supabase
      .from('orders')
      .select('id, status, total_amount, created_at, updated_at');
    
    if (error) {
      console.error('Error fetching order stats:', error);
      return {
        daily: { ordersPlaced: 0, ordersCompleted: 0, revenue: 0, pendingFromToday: 0 },
        weekly: { ordersPlaced: 0, ordersCompleted: 0, revenue: 0, pendingFromWeek: 0 },
        active: { totalPending: 0 }
      };
    }
    
    // Filter orders by time periods
    const todayOrders = allOrders.filter(order => 
      new Date(order.created_at) >= todayStart
    );
    
    const weekOrders = allOrders.filter(order => 
      new Date(order.created_at) >= weekStart
    );
    
    // For completed orders, we care about when they were completed, not when they were placed
    const completedOrders = allOrders.filter(order => order.status === 'completed');
    
    // Daily completed orders: completed today (regardless of when placed)
    const dailyCompleted = completedOrders.filter(order => {
      const completedDate = new Date(order.updated_at); // updated_at tracks when status was last changed
      return completedDate >= todayStart;
    });
    
    // Weekly completed orders: completed this week (regardless of when placed)
    const weeklyCompleted = completedOrders.filter(order => {
      const completedDate = new Date(order.updated_at);
      return completedDate >= weekStart;
    });
    
    // For pending orders, we care about when they were placed (for workload planning)
    const dailyPending = todayOrders.filter(order => 
      order.status === 'pending' || order.status === 'confirmed' || order.status === 'ready'
    );
    
    const weeklyPending = weekOrders.filter(order => 
      order.status === 'pending' || order.status === 'confirmed' || order.status === 'ready'
    );
    
    // All pending orders (for current workload)
    const allPending = allOrders.filter(order => 
      order.status === 'pending' || order.status === 'confirmed' || order.status === 'ready'
    );
    
    return {
      daily: {
        ordersPlaced: todayOrders.length,
        ordersCompleted: dailyCompleted.length,
        revenue: dailyCompleted.reduce((sum, order) => sum + getOrderTotal(order), 0),
        pendingFromToday: dailyPending.length
      },
      weekly: {
        ordersPlaced: weekOrders.length,
        ordersCompleted: weeklyCompleted.length,
        revenue: weeklyCompleted.reduce((sum, order) => sum + getOrderTotal(order), 0),
        pendingFromWeek: weeklyPending.length
      },
      active: {
        totalPending: allPending.length
      }
    };
  } catch (error) {
    console.error('Error in getOrderStats:', error);
    return {
      daily: { ordersPlaced: 0, ordersCompleted: 0, revenue: 0, pendingFromToday: 0 },
      weekly: { ordersPlaced: 0, ordersCompleted: 0, revenue: 0, pendingFromWeek: 0 },
      active: { totalPending: 0 }
    };
  }
};
