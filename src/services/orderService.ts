import { CreateOrderRequest, Order, OrderSubmissionResult } from '../types';

// Mock API delay to simulate network requests
const API_DELAY = 1000;

// Mock order storage (in real app, this would be a backend API)
let mockOrders: Order[] = [];
let orderIdCounter = 1;

// Calculate tax (8.5% for example)
const calculateTax = (subtotal: number): number => {
  return Math.round(subtotal * 0.085 * 100) / 100;
};

// Generate order ID
const generateOrderId = (): string => {
  return `ORD-${Date.now()}-${orderIdCounter++}`;
};

// Mock API function to submit an order
export const submitOrder = async (orderRequest: CreateOrderRequest): Promise<OrderSubmissionResult> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, API_DELAY));
  
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
    
    // Create order
    const order: Order = {
      id: generateOrderId(),
      customerInfo: orderRequest.customerInfo,
      items: orderRequest.items,
      subtotal,
      tax,
      total,
      fulfillmentType: orderRequest.fulfillmentType,
      status: 'pending',
      notes: orderRequest.notes,
      pickupDate: orderRequest.pickupDate,
      pickupTime: orderRequest.pickupTime,
      deliveryAddress: orderRequest.deliveryAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Store order (in real app, this would be saved to database)
    mockOrders.push(order);
    
    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      return {
        success: false,
        error: 'Server error: Unable to process order at this time'
      };
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

// Get order by ID (for future use)
export const getOrder = async (orderId: string): Promise<Order | null> => {
  await new Promise(resolve => setTimeout(resolve, API_DELAY / 2));
  return mockOrders.find(order => order.id === orderId) || null;
};

// Get orders for a customer (for future use)
export const getCustomerOrders = async (customerEmail: string): Promise<Order[]> => {
  await new Promise(resolve => setTimeout(resolve, API_DELAY / 2));
  return mockOrders.filter(order => order.customerInfo.email === customerEmail);
};

// Update order status (for staff QR scanner)
export const updateOrderStatus = async (orderId: string, newStatus: string): Promise<{ success: boolean; message?: string; order?: Order }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  try {
    const orderIndex = mockOrders.findIndex(order => order.id === orderId);
    
    if (orderIndex === -1) {
      return {
        success: false,
        message: 'Order not found'
      };
    }
    
    // Update the order status
    mockOrders[orderIndex] = {
      ...mockOrders[orderIndex],
      status: newStatus as any,
      updatedAt: new Date().toISOString()
    };
    
    return {
      success: true,
      message: `Order ${orderId} status updated to ${newStatus}`,
      order: mockOrders[orderIndex]
    };
  } catch (error) {
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
