import { CreateOrderRequest, Order, OrderSubmissionResult } from '../types';
import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';
import { BroadcastHelper } from '../utils/broadcastHelper';

// Calculate tax (8.5% for example)
const calculateTax = (subtotal: number): number => {
  return Math.round(subtotal * 0.085 * 100) / 100;
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

// Validate inventory availability at checkout time
const validateInventoryAvailability = async (orderItems: CreateOrderRequest['items']): Promise<InventoryValidationResult> => {
  const conflicts: InventoryValidationResult['conflicts'] = [];
  
  // Get current stock levels for all products in the order
  const productIds = orderItems.map(item => item.productId);
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, stock')
    .in('id', productIds);
    
  if (error) {
    console.error('Error fetching product stock:', error);
    throw new Error('Unable to validate inventory availability');
  }
  
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
    
    if (product.stock < orderItem.quantity) {
      conflicts.push({
        productId: orderItem.productId,
        productName: orderItem.productName,
        requested: orderItem.quantity,
        available: product.stock
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

// Real Supabase function to submit an order
export const submitOrder = async (orderRequest: CreateOrderRequest): Promise<OrderSubmissionResult> => {
  try {
    // Validate required fields
    if (!orderRequest.customerInfo.name || !orderRequest.customerInfo.email || !orderRequest.customerInfo.phone) {
      return {
        success: false,
        error: 'Missing required customer information'
      };
    }
    
    if (!orderRequest.items || orderRequest.items.length === 0) {
      return {
        success: false,
        error: 'Order must contain at least one item'
      };
    }
    
    // Validate fulfillment details
    if (orderRequest.fulfillmentType === 'delivery' && !orderRequest.deliveryAddress) {
      return {
        success: false,
        error: 'Delivery address is required for delivery orders'
      };
    } else if (orderRequest.fulfillmentType === 'pickup' && (!orderRequest.pickupDate || !orderRequest.pickupTime)) {
      return {
        success: false,
        error: 'Pickup date and time are required for pickup orders'
      };
    }
    
    // CRITICAL: Validate inventory availability at checkout time
    const inventoryValidation = await validateInventoryAvailability(orderRequest.items);
    
    if (!inventoryValidation.isValid) {
      // Format user-friendly error message for stock conflicts
      const conflictMessages = inventoryValidation.conflicts.map(conflict => {
        if (conflict.available === 0) {
          return `• ${conflict.productName} is out of stock`;
        } else {
          return `• ${conflict.productName}: only ${conflict.available} available (you requested ${conflict.requested})`;
        }
      });
      
      const errorMessage = `Some items in your cart are no longer available:\n\n${conflictMessages.join('\n')}\n\nPlease update your cart and try again.`;
      
      return {
        success: false,
        error: errorMessage,
        inventoryConflicts: inventoryValidation.conflicts
      };
    }
    
    // Calculate totals
    const subtotal = orderRequest.items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = calculateTax(subtotal);
    const total = subtotal + tax;
    
    // Get current user for order association
    const { data: { user } } = await supabase.auth.getUser();
    
    // Create order object with explicit field clearing based on fulfillment type
    const order: Order = {
      id: uuidv4(),
      customerId: user?.id || 'anonymous',
      customerInfo: orderRequest.customerInfo,
      items: orderRequest.items,
      subtotal,
      tax,
      total,
      fulfillmentType: orderRequest.fulfillmentType,
      // For delivery: set delivery fields, explicitly clear pickup fields
      deliveryAddress: orderRequest.fulfillmentType === 'delivery' ? orderRequest.deliveryAddress : undefined,
      deliveryDate: orderRequest.fulfillmentType === 'delivery' ? orderRequest.deliveryDate : undefined,
      deliveryTime: orderRequest.fulfillmentType === 'delivery' ? orderRequest.deliveryTime : undefined,
      // For pickup: set pickup fields, explicitly clear delivery fields
      pickupDate: orderRequest.fulfillmentType === 'pickup' ? orderRequest.pickupDate : undefined,
      pickupTime: orderRequest.fulfillmentType === 'pickup' ? orderRequest.pickupTime : undefined,
      specialInstructions: orderRequest.specialInstructions,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Insert order into database
    const { data, error } = await supabase
      .from('orders')
      .insert([{
        id: order.id,
        user_id: order.customerId,
        customer_name: order.customerInfo.name,
        customer_email: order.customerInfo.email,
        customer_phone: order.customerInfo.phone,
        delivery_address: order.deliveryAddress,
        delivery_date: order.deliveryDate,
        delivery_time: order.deliveryTime,
        pickup_date: order.pickupDate,
        pickup_time: order.pickupTime,
        special_instructions: order.specialInstructions,
        subtotal: order.subtotal,
        tax_amount: order.tax,
        total_amount: order.total,
        fulfillment_type: order.fulfillmentType,
        status: order.status,
        created_at: order.createdAt,
        updated_at: order.updatedAt
      }])
      .select()
      .single();

    if (error) {
      console.error('Error inserting order:', error);
      return {
        success: false,
        error: `Failed to create order: ${error.message}`
      };
    }

    // Insert order items
    const orderItemsData = order.items.map(item => ({
      id: uuidv4(),
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      unit_price: item.price,
      quantity: item.quantity,
      total_price: item.subtotal
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsData);

    if (itemsError) {
      console.error('Error inserting order items:', itemsError);
      // Clean up the order if items failed
      await supabase.from('orders').delete().eq('id', order.id);
      return {
        success: false,
        error: `Failed to create order items: ${itemsError.message}`
      };
    }

    // CRITICAL: Atomically update product stock levels
    try {
      await updateProductStock(orderRequest.items);
    } catch (stockError) {
      console.error('Error updating product stock:', stockError);
      // Clean up order and items if stock update fails
      await supabase.from('order_items').delete().eq('order_id', order.id);
      await supabase.from('orders').delete().eq('id', order.id);
      return {
        success: false,
        error: `Failed to update inventory: ${stockError instanceof Error ? stockError.message : 'Unknown error'}`
      };
    }

    // Broadcast event with robust error handling
    try {
      await BroadcastHelper.sendOrderUpdate('new-order', {
        orderId: order.id,
        order: order
      });
    } catch (error) {
      console.warn('Failed to broadcast order update:', error);
      // Order still succeeds even if broadcast fails
    }
    
    return {
      success: true,
      order,
      message: 'Order submitted successfully'
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Get order by ID - Real Supabase implementation (CartService pattern)
export const getOrder = async (orderId: string): Promise<Order | null> => {
  try {
    const { data: orderData, error } = await supabase
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
      .single();

    if (error || !orderData) {
      console.error('Error fetching order:', error);
      return null;
    }

    // Convert database format to app format
    const order: Order = {
      id: orderData.id,
      customerId: orderData.user_id,
      customerInfo: {
        name: orderData.customer_name,
        email: orderData.customer_email,
        phone: orderData.customer_phone,
        address: orderData.delivery_address || undefined
      },
      items: orderData.order_items.map((item: any) => ({
        product: {
          id: item.product_id,
          name: item.product_name,
          price: item.unit_price,
          // Note: Other product fields would need to be fetched separately if needed
        } as any,
        quantity: item.quantity,
        subtotal: item.total_price
      })),
      subtotal: orderData.subtotal,
      tax: orderData.tax_amount,
      total: orderData.total_amount,
      fulfillmentType: orderData.fulfillment_type,
      deliveryAddress: orderData.delivery_address,
      deliveryDate: orderData.delivery_date,
      deliveryTime: orderData.delivery_time,
      pickupDate: orderData.pickup_date,
      pickupTime: orderData.pickup_time,
      specialInstructions: orderData.special_instructions,
      status: orderData.status,
      createdAt: orderData.created_at,
      updatedAt: orderData.updated_at
    };

    return order;
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
};

// Get orders for a customer - Real Supabase implementation
export const getCustomerOrders = async (customerEmail: string): Promise<Order[]> => {
  if (!customerEmail) {
    console.warn('getCustomerOrders: customerEmail is required');
    return [];
  }

  try {
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
      .eq('customer_email', customerEmail)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer orders:', error);
      return [];
    }

    if (!ordersData || ordersData.length === 0) {
      return [];
    }

    // Convert database format to app format
    const orders: Order[] = ordersData.map((orderData: any) => ({
      id: orderData.id,
      customerId: orderData.user_id,
      customerInfo: {
        name: orderData.customer_name,
        email: orderData.customer_email,
        phone: orderData.customer_phone,
        address: orderData.delivery_address || undefined
      },
      items: orderData.order_items.map((item: any) => ({
        product: {
          id: item.product_id,
          name: item.product_name,
          price: item.unit_price,
          // Note: Other product fields would need to be fetched separately if needed
        } as any,
        quantity: item.quantity,
        subtotal: item.total_price
      })),
      subtotal: orderData.subtotal,
      tax: orderData.tax_amount,
      total: orderData.total_amount,
      fulfillmentType: orderData.fulfillment_type,
      deliveryAddress: orderData.delivery_address,
      deliveryDate: orderData.delivery_date,
      deliveryTime: orderData.delivery_time,
      pickupDate: orderData.pickup_date,
      pickupTime: orderData.pickup_time,
      specialInstructions: orderData.special_instructions,
      status: orderData.status,
      createdAt: orderData.created_at,
      updatedAt: orderData.updated_at
    }));

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

    // Broadcast event with robust error handling (CartService pattern)
    try {
      await BroadcastHelper.sendOrderUpdate('order-status-changed', {
        orderId: orderId,
        newStatus: newStatus,
        order: updatedOrder
      });
    } catch (error) {
      console.warn('Failed to broadcast order status update:', error);
      // Order update still succeeds even if broadcast fails
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
        await BroadcastHelper.sendOrderUpdate('order-status-changed', {
          orderId: order.id,
          newStatus: newStatus,
          order: order
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
    
    // Convert database format to app format
    const orders: Order[] = ordersData.map(orderData => ({
      id: orderData.id,
      customerId: orderData.user_id,
      customerInfo: {
        name: orderData.customer_name,
        email: orderData.customer_email,
        phone: orderData.customer_phone,
        address: orderData.delivery_address || undefined
      },
      items: orderData.order_items.map((item: any) => ({
        product: {
          id: item.product_id,
          name: item.product_name,
          price: item.unit_price,
          // Note: Other product fields would need to be fetched separately if needed
        } as any,
        quantity: item.quantity,
        subtotal: item.total_price
      })),
      subtotal: orderData.subtotal,
      tax: orderData.tax_amount,
      total: orderData.total_amount,
      fulfillmentType: orderData.fulfillment_type,
      deliveryAddress: orderData.delivery_address,
      deliveryDate: orderData.delivery_date,
      deliveryTime: orderData.delivery_time,
      pickupDate: orderData.pickup_date,
      pickupTime: orderData.pickup_time,
      specialInstructions: orderData.special_instructions,
      status: orderData.status,
      createdAt: orderData.created_at,
      updatedAt: orderData.updated_at
    }));
    
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
        revenue: dailyCompleted.reduce((sum, order) => sum + order.total_amount, 0),
        pendingFromToday: dailyPending.length
      },
      weekly: {
        ordersPlaced: weekOrders.length,
        ordersCompleted: weeklyCompleted.length,
        revenue: weeklyCompleted.reduce((sum, order) => sum + order.total_amount, 0),
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
