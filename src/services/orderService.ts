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

// Admin order management functions
export interface OrderFilters {
  status?: string;
  fulfillmentType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// Get all orders with optional filtering (admin only)
export const getAllOrders = async (filters?: OrderFilters): Promise<Order[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, API_DELAY));
  
  let filteredOrders = [...mockOrders];
  
  if (filters) {
    if (filters.status) {
      filteredOrders = filteredOrders.filter(order => order.status === filters.status);
    }
    
    if (filters.fulfillmentType) {
      filteredOrders = filteredOrders.filter(order => order.fulfillmentType === filters.fulfillmentType);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredOrders = filteredOrders.filter(order => 
        order.id.toLowerCase().includes(searchLower) ||
        order.customerInfo.name.toLowerCase().includes(searchLower) ||
        order.customerInfo.email.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.dateFrom) {
      filteredOrders = filteredOrders.filter(order => 
        new Date(order.createdAt) >= new Date(filters.dateFrom!)
      );
    }
    
    if (filters.dateTo) {
      filteredOrders = filteredOrders.filter(order => 
        new Date(order.createdAt) <= new Date(filters.dateTo!)
      );
    }
  }
  
  // Sort by creation date (newest first)
  return filteredOrders.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

// Get order statistics (admin only) - Clear daily and weekly metrics
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
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, API_DELAY));
  
  // Date calculations
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Start of this week (Sunday)
  weekStart.setHours(0, 0, 0, 0);
  
  // Filter orders by time periods
  const todayOrders = mockOrders.filter(order => 
    new Date(order.createdAt) >= todayStart
  );
  
  const weekOrders = mockOrders.filter(order => 
    new Date(order.createdAt) >= weekStart
  );
  
  // For completed orders, we care about when they were completed, not when they were placed
  const completedOrders = mockOrders.filter(order => order.status === 'completed');
  
  // Daily completed orders: completed today (regardless of when placed)
  const dailyCompleted = completedOrders.filter(order => {
    const completedDate = new Date(order.updatedAt); // updatedAt tracks when status was last changed
    return completedDate >= todayStart;
  });
  
  // Weekly completed orders: completed this week (regardless of when placed)
  const weeklyCompleted = completedOrders.filter(order => {
    const completedDate = new Date(order.updatedAt);
    return completedDate >= weekStart;
  });
  
  // For pending orders, we care about when they were placed (for workload planning)
  const dailyPending = todayOrders.filter(order => 
    ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)
  );
  
  const weeklyPending = weekOrders.filter(order => 
    ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)
  );
  
  // All active orders (regardless of when placed)
  const allPending = mockOrders.filter(order => 
    ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)
  );
  
  return {
    daily: {
      ordersPlaced: todayOrders.length,
      ordersCompleted: dailyCompleted.length,
      revenue: dailyCompleted.reduce((sum, order) => sum + order.total, 0),
      pendingFromToday: dailyPending.length,
    },
    weekly: {
      ordersPlaced: weekOrders.length,
      ordersCompleted: weeklyCompleted.length,
      revenue: weeklyCompleted.reduce((sum, order) => sum + order.total, 0),
      pendingFromWeek: weeklyPending.length,
    },
    active: {
      totalPending: allPending.length,
    },
  };
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

// Add some mock orders for testing (admin functionality)
export const addMockOrdersForTesting = (): void => {
  const mockOrdersData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      customerInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-0101',
        address: '123 Main St, City, State 12345'
      },
      items: [
        {
          productId: '1',
          productName: 'Fresh Tomatoes',
          price: 3.99,
          quantity: 2,
          subtotal: 7.98
        }
      ],
      subtotal: 7.98,
      tax: 0.68,
      total: 8.66,
      fulfillmentType: 'pickup',
      status: 'pending',
      pickupDate: '2025-08-06',
      pickupTime: '10:00 AM'
    },
    {
      customerInfo: {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '555-0102',
        address: '456 Oak Ave, City, State 12345'
      },
      items: [
        {
          productId: '2',
          productName: 'Organic Carrots',
          price: 2.49,
          quantity: 3,
          subtotal: 7.47
        },
        {
          productId: '3',
          productName: 'Fresh Lettuce',
          price: 1.99,
          quantity: 1,
          subtotal: 1.99
        }
      ],
      subtotal: 9.46,
      tax: 0.80,
      total: 10.26,
      fulfillmentType: 'delivery',
      status: 'confirmed',
      deliveryAddress: '456 Oak Ave, City, State 12345'
    },
    {
      customerInfo: {
        name: 'Bob Johnson',
        email: 'bob@example.com',
        phone: '555-0103'
      },
      items: [
        {
          productId: '1',
          productName: 'Fresh Tomatoes',
          price: 3.99,
          quantity: 1,
          subtotal: 3.99
        }
      ],
      subtotal: 3.99,
      tax: 0.34,
      total: 4.33,
      fulfillmentType: 'pickup',
      status: 'ready',
      pickupDate: '2025-08-05',
      pickupTime: '2:00 PM'
    }
  ];
  
  // Add mock orders if none exist
  if (mockOrders.length === 0) {
    mockOrdersData.forEach((orderData, index) => {
      let createdAt: string;
      
      // Ensure we have orders from different time periods for testing
      if (index === 0) {
        // First order: Today (for testing daily statistics)
        createdAt = new Date().toISOString();
      } else if (index === 1) {
        // Second order: Earlier today (for testing daily statistics)
        const todayEarlier = new Date();
        todayEarlier.setHours(todayEarlier.getHours() - 2);
        createdAt = todayEarlier.toISOString();
      } else {
        // Other orders: Random date within last week
        createdAt = new Date(Date.now() - Math.random() * 86400000 * 7).toISOString();
      }
      
      const order: Order = {
        ...orderData,
        id: generateOrderId(),
        createdAt,
        updatedAt: new Date().toISOString(),
      };
      mockOrders.push(order);
    });
  }
};
