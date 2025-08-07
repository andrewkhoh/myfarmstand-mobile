import { CreateOrderRequest, Order, OrderSubmissionResult } from '../types';
import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';
import { BroadcastHelper } from '../utils/broadcastHelper';

// Mock API delay to simulate network requests (keeping for consistency)
const API_DELAY = 500;

// Mock order storage (keeping for fallback/testing)
let mockOrders: Order[] = [];
let orderIdCounter = 1;

// Calculate tax (8.5% for example)
const calculateTax = (subtotal: number): number => {
  return Math.round(subtotal * 0.085 * 100) / 100;
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
    
    // Validate delivery address if delivery is selected
    if (orderRequest.fulfillmentType === 'delivery' && !orderRequest.deliveryAddress) {
      return {
        success: false,
        error: 'Delivery address is required for delivery orders'
      };
    }
    
    // Calculate totals
    const subtotal = orderRequest.items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = calculateTax(subtotal);
    const total = subtotal + tax;
    
    // Get current user for order association
    const { data: { user } } = await supabase.auth.getUser();
    
    // Generate order ID and QR code data
    const orderId = uuidv4();
    const qrCodeData = JSON.stringify({
      orderId,
      customerEmail: orderRequest.customerInfo.email,
      total,
      timestamp: Date.now()
    });
    
    // Create order in database
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        user_id: user?.id || null,
        status: 'pending',
        total_amount: total,
        tax_amount: tax,
        subtotal: subtotal,
        customer_name: orderRequest.customerInfo.name,
        customer_email: orderRequest.customerInfo.email,
        customer_phone: orderRequest.customerInfo.phone,
        fulfillment_type: orderRequest.fulfillmentType,
        pickup_date: orderRequest.pickupDate || null,
        pickup_time: orderRequest.pickupTime || null,
        delivery_address: orderRequest.deliveryAddress || null,
        special_instructions: orderRequest.notes || null,
        qr_code_data: qrCodeData
      })
      .select()
      .single();
    
    if (orderError) {
      console.error('Error creating order:', orderError);
      return {
        success: false,
        error: 'Failed to create order. Please try again.'
      };
    }
    
    // Create order items in database
    const orderItems = orderRequest.items.map(item => ({
      order_id: orderId,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.subtotal
    }));
    
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);
    
    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Try to clean up the order if items failed
      await supabase.from('orders').delete().eq('id', orderId);
      return {
        success: false,
        error: 'Failed to create order items. Please try again.'
      };
    }
    
    // Convert database order back to app format
    const order: Order = {
      id: orderData.id,
      customerId: orderData.user_id,
      customerInfo: {
        name: orderData.customer_name,
        email: orderData.customer_email,
        phone: orderData.customer_phone,
        address: orderRequest.customerInfo.address
      },
      items: orderRequest.items,
      subtotal: orderData.subtotal,
      tax: orderData.tax_amount,
      total: orderData.total_amount,
      fulfillmentType: orderData.fulfillment_type as 'pickup' | 'delivery',
      status: orderData.status as 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled',
      notes: orderData.special_instructions,
      pickupDate: orderData.pickup_date,
      pickupTime: orderData.pickup_time,
      deliveryAddress: orderData.delivery_address,
      createdAt: orderData.created_at,
      updatedAt: orderData.updated_at
    };
    
    // Send broadcast event to notify all clients of the new order
    await BroadcastHelper.sendOrderUpdate('new-order', {
      orderId: order.id,
      order: order
    });
    
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

// Get order by ID (for future use)
export const getOrder = async (orderId: string): Promise<Order | null> => {
  await new Promise(resolve => setTimeout(resolve, API_DELAY / 2));
  return mockOrders.find(order => order.id === orderId) || null;
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
          unit_price,
          quantity,
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
        productId: item.product_id,
        productName: item.product_name,
        price: item.unit_price,
        quantity: item.quantity,
        subtotal: item.total_price
      })),
      subtotal: orderData.subtotal,
      tax: orderData.tax_amount,
      total: orderData.total_amount,
      fulfillmentType: orderData.fulfillment_type as 'pickup' | 'delivery',
      status: orderData.status as 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled',
      notes: orderData.special_instructions,
      pickupDate: orderData.pickup_date,
      pickupTime: orderData.pickup_time,
      deliveryAddress: orderData.delivery_address,
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
    const { data: orderData, error } = await supabase
      .from('orders')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
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
      .single();
    
    if (error) {
      console.error('Error updating order status:', error);
      return {
        success: false,
        message: error.code === 'PGRST116' ? 'Order not found' : 'Failed to update order status'
      };
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
        productId: item.product_id,
        productName: item.product_name,
        price: item.unit_price,
        quantity: item.quantity,
        subtotal: item.total_price
      })),
      subtotal: orderData.subtotal,
      tax: orderData.tax_amount,
      total: orderData.total_amount,
      fulfillmentType: orderData.fulfillment_type as 'pickup' | 'delivery',
      status: orderData.status as 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled',
      notes: orderData.special_instructions,
      pickupDate: orderData.pickup_date,
      pickupTime: orderData.pickup_time,
      deliveryAddress: orderData.delivery_address,
      createdAt: orderData.created_at,
      updatedAt: orderData.updated_at
    };
    
    // Send broadcast event to notify all clients of the status change
    await BroadcastHelper.sendOrderUpdate('order-status-changed', {
      orderId: orderId,
      newStatus: newStatus,
      order: order
    });
    
    return {
      success: true,
      message: `Order ${orderId} status updated to ${newStatus}`,
      order
    };
  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    return {
      success: false,
      message: 'Failed to update order status'
    };
  }
};

// Clear mock orders (for testing)
export const clearMockOrders = (): void => {
  mockOrders = [];
  orderIdCounter = 1;
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
        productId: item.product_id,
        productName: item.product_name,
        price: item.unit_price,
        quantity: item.quantity,
        subtotal: item.total_price
      })),
      subtotal: orderData.subtotal,
      tax: orderData.tax_amount,
      total: orderData.total_amount,
      fulfillmentType: orderData.fulfillment_type as 'pickup' | 'delivery',
      status: orderData.status as 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled',
      notes: orderData.special_instructions,
      pickupDate: orderData.pickup_date,
      pickupTime: orderData.pickup_time,
      deliveryAddress: orderData.delivery_address,
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

// Bulk update order status (admin only)
export const bulkUpdateOrderStatus = async (
  orderIds: string[], 
  newStatus: string
): Promise<{ success: boolean; message?: string; updatedOrders?: Order[] }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, API_DELAY));
  
  try {
    const updatedOrders: Order[] = [];
    
    for (const orderId of orderIds) {
      const orderIndex = mockOrders.findIndex(order => order.id === orderId);
      if (orderIndex !== -1) {
        mockOrders[orderIndex] = {
          ...mockOrders[orderIndex],
          status: newStatus as any,
          updatedAt: new Date().toISOString(),
        };
        updatedOrders.push(mockOrders[orderIndex]);
      }
    }
    
    return {
      success: true,
      message: `Successfully updated ${updatedOrders.length} orders to ${newStatus}`,
      updatedOrders,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to update orders',
    };
  }
};


