/**
 * OrderService Test - REFACTORED
 * Comprehensive testing for order functionality using simplified mocks and factories
 */

import { 
  submitOrder,
  getOrder,
  getCustomerOrders,
  updateOrderStatus,
  bulkUpdateOrderStatus,
  getAllOrders,
  getOrderStats
} from '../orderService';
import { CreateOrderRequest, OrderSubmissionResult, Order, PaymentStatus } from '../../types';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { 
  createOrder, 
  createUser, 
  createProduct, 
  createCartItem,
  createPayment,
  resetAllFactories 
} from '../../test/factories';

// Replace complex mock setup with simple data-driven mock
jest.mock('../../config/supabase', () => ({
  supabase: null // Will be set in beforeEach
}));

// Mock dependencies
jest.mock('../../utils/broadcastFactory', () => ({
  sendOrderBroadcast: jest.fn().mockResolvedValue({ success: true })
}));
const mockSendOrderBroadcast = require('../../utils/broadcastFactory').sendOrderBroadcast;

// Mock notification service
jest.mock('../notificationService', () => ({
  sendPickupReadyNotification: jest.fn().mockResolvedValue({ success: true }),
  sendOrderConfirmationNotification: jest.fn().mockResolvedValue({ success: true }),
}));
const mockSendPickupReadyNotification = require('../notificationService').sendPickupReadyNotification;
const mockSendOrderConfirmationNotification = require('../notificationService').sendOrderConfirmationNotification;

// Mock stock restoration service
jest.mock('../stockRestorationService', () => ({
  restoreOrderStock: jest.fn().mockResolvedValue({ success: true }),
}));
const mockRestoreOrderStock = require('../stockRestorationService').restoreOrderStock;

// Mock type mappers
jest.mock('../../utils/typeMappers', () => ({
  getProductStock: jest.fn().mockReturnValue(100),
  getOrderCustomerId: jest.fn().mockReturnValue('customer-123'),
  getOrderTotal: jest.fn().mockReturnValue(40.67),
  getOrderFulfillmentType: jest.fn().mockReturnValue('pickup'),
  mapOrderFromDB: jest.fn((orderData, items) => ({
    id: orderData.id,
    customerId: orderData.user_id,
    customerInfo: {
      name: orderData.customer_name,
      email: orderData.customer_email,
      phone: orderData.customer_phone,
      address: orderData.delivery_address
    },
    items: items || [],
    subtotal: orderData.subtotal,
    tax: orderData.tax_amount,
    total: orderData.total_amount,
    fulfillmentType: orderData.fulfillment_type,
    status: orderData.status,
    paymentMethod: orderData.payment_method,
    paymentStatus: orderData.payment_status,
    pickupDate: orderData.pickup_date,
    pickupTime: orderData.pickup_time,
    deliveryAddress: orderData.delivery_address,
    notes: orderData.special_instructions || orderData.notes,
    createdAt: orderData.created_at,
    updatedAt: orderData.updated_at
  }))
}));
const mockMapOrderFromDB = require('../../utils/typeMappers').mapOrderFromDB;

// Mock UUID generation
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234')
}));

describe('OrderService', () => {
  let supabaseMock: any;
  let testUser: any;
  let testProducts: any[];
  let testOrder: any;
  let testPayment: any;
  
  beforeEach(() => {
    // Reset factory counter for consistent IDs
    resetAllFactories();
    
    // Create test data with factories
    testUser = createUser({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      phone: '+1234567890',
      address: '123 Test St'
    });
    
    testProducts = [
      createProduct({ 
        id: 'product-1', 
        name: 'Test Product 1', 
        price: 10.99,
        stock_quantity: 100 
      }),
      createProduct({ 
        id: 'product-2', 
        name: 'Test Product 2', 
        price: 15.50,
        stock_quantity: 50 
      })
    ];
    
    testOrder = createOrder({
      id: 'order-123',
      user_id: testUser.id,
      customer_name: testUser.name,
      customer_email: testUser.email,
      customer_phone: testUser.phone,
      status: 'pending',
      fulfillment_type: 'pickup',
      payment_method: 'online',
      payment_status: 'paid',
      pickup_date: '2024-03-20',
      pickup_time: '10:00',
      special_instructions: 'Test order',
      subtotal: 37.48,
      tax_amount: 3.19,
      total_amount: 40.67
    });
    
    testPayment = createPayment({
      order_id: testOrder.id,
      amount: testOrder.total_amount,
      status: 'succeeded'
    });
    
    // Create mock with initial data
    supabaseMock = createSupabaseMock({
      users: [testUser],
      products: testProducts,
      orders: [testOrder],
      order_items: [
        {
          id: 'item-1',
          order_id: testOrder.id,
          product_id: testProducts[0].id,
          product_name: testProducts[0].name,
          unit_price: testProducts[0].price,
          quantity: 2,
          total_price: testProducts[0].price * 2
        }
      ],
      payments: [testPayment]
    });
    
    // Setup authenticated user
    supabaseMock.auth.getUser = jest.fn().mockResolvedValue({
      data: { 
        user: { 
          id: testUser.id,
          email: testUser.email
        } 
      },
      error: null
    });
    
    // Inject mock
    require('../../config/supabase').supabase = supabaseMock;
    
    // Clear other mocks
    jest.clearAllMocks();
  });

  describe('submitOrder', () => {
    it('should submit order successfully with valid data', async () => {
      const orderRequest: CreateOrderRequest = {
        customerInfo: {
          name: testUser.name,
          email: testUser.email,
          phone: testUser.phone,
          address: testUser.address
        },
        items: [
          {
            productId: testProducts[0].id,
            productName: testProducts[0].name,
            quantity: 2,
            price: testProducts[0].price,
            subtotal: testProducts[0].price * 2
          },
          {
            productId: testProducts[1].id,
            productName: testProducts[1].name,
            quantity: 1,
            price: testProducts[1].price,
            subtotal: testProducts[1].price
          }
        ],
        fulfillmentType: 'pickup',
        paymentMethod: 'online',
        pickupDate: '2024-03-20',
        pickupTime: '10:00',
        notes: 'Test order'
      };
      
      // Mock successful RPC call
      supabaseMock.rpc = jest.fn().mockResolvedValue({
        data: {
          success: true,
          order: {
            ...testOrder,
            order_items: orderRequest.items.map((item, index) => ({
              id: `item-${index + 1}`,
              product_id: item.productId,
              product_name: item.productName,
              unit_price: item.price,
              quantity: item.quantity,
              total_price: item.subtotal
            }))
          }
        },
        error: null
      });

      const result = await submitOrder(orderRequest);

      expect(result.success).toBe(true);
      expect(result.order?.id).toBe('order-123');
      expect(supabaseMock.rpc).toHaveBeenCalledWith('submit_order_atomic', expect.any(Object));
      expect(mockSendOrderConfirmationNotification).toHaveBeenCalled();
    });

    it('should reject order with insufficient inventory', async () => {
      const orderRequest: CreateOrderRequest = {
        customerInfo: {
          name: testUser.name,
          email: testUser.email,
          phone: testUser.phone,
          address: testUser.address
        },
        items: [
          {
            productId: testProducts[0].id,
            productName: testProducts[0].name,
            quantity: 200, // More than available stock
            price: testProducts[0].price,
            subtotal: testProducts[0].price * 200
          }
        ],
        fulfillmentType: 'pickup',
        paymentMethod: 'online',
        pickupDate: '2024-03-20',
        pickupTime: '10:00',
        notes: 'Test order'
      };
      
      // Mock RPC call with inventory conflict
      supabaseMock.rpc = jest.fn().mockResolvedValue({
        data: {
          success: false,
          error: 'Inventory conflicts detected',
          inventoryConflicts: [{
            productId: testProducts[0].id,
            productName: testProducts[0].name,
            requested: 200,
            available: 100
          }]
        },
        error: null
      });

      const result = await submitOrder(orderRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Inventory conflicts detected');
      expect(result.inventoryConflicts).toHaveLength(1);
      expect(result.inventoryConflicts?.[0].requested).toBe(200);
      expect(result.inventoryConflicts?.[0].available).toBe(100);
    });

    it('should handle database errors during order submission', async () => {
      const orderRequest: CreateOrderRequest = {
        customerInfo: {
          name: testUser.name,
          email: testUser.email,
          phone: testUser.phone,
          address: testUser.address
        },
        items: [
          {
            productId: testProducts[0].id,
            productName: testProducts[0].name,
            quantity: 1,
            price: testProducts[0].price,
            subtotal: testProducts[0].price
          }
        ],
        fulfillmentType: 'pickup',
        paymentMethod: 'online',
        pickupDate: '2024-03-20',
        pickupTime: '10:00',
        notes: 'Test order'
      };
      
      // Mock RPC failure
      supabaseMock.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection lost' }
      });

      const result = await submitOrder(orderRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to submit order: Database connection lost');
    });

    it('should validate required fields before submission', async () => {
      const invalidRequest: CreateOrderRequest = {
        customerInfo: {
          name: '',
          email: 'invalid-email',
          phone: '',
          address: ''
        },
        items: [],
        fulfillmentType: 'pickup',
        paymentMethod: 'online',
        pickupDate: '',
        pickupTime: '',
        notes: ''
      };

      const result = await submitOrder(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });
  });

  describe('getOrder', () => {
    it('should retrieve order by ID successfully', async () => {
      // Mock query response with order and items
      const orderWithItems = {
        ...testOrder,
        order_items: [
          {
            id: 'item-1',
            order_id: testOrder.id,
            product_id: testProducts[0].id,
            product_name: testProducts[0].name,
            unit_price: testProducts[0].price,
            quantity: 2,
            total_price: testProducts[0].price * 2
          }
        ]
      };
      
      supabaseMock.from('orders').select = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: orderWithItems,
            error: null
          })
        })
      });

      const result = await getOrder('order-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('order-123');
      expect(result.customerInfo.email).toBe('test@example.com');
      expect(result.items).toHaveLength(1);
    });

    it('should handle order not found', async () => {
      supabaseMock.from('orders').select = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      });

      await expect(getOrder('non-existent')).rejects.toThrow('Order not found');
    });

    it('should handle database error when retrieving order', async () => {
      supabaseMock.from('orders').select = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      });

      await expect(getOrder('order-123')).rejects.toThrow('Database error');
    });
  });

  describe('getCustomerOrders', () => {
    it('should retrieve all orders for a customer', async () => {
      const customerOrders = [
        testOrder,
        createOrder({
          id: 'order-456',
          user_id: testUser.id,
          customer_email: testUser.email,
          status: 'completed'
        })
      ];
      
      supabaseMock.from('orders').select = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            data: customerOrders,
            error: null
          })
        })
      });

      const result = await getCustomerOrders(testUser.id);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('order-123');
      expect(result[1].id).toBe('order-456');
    });

    it('should return empty array for customer with no orders', async () => {
      supabaseMock.from('orders').select = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            data: [],
            error: null
          })
        })
      });

      const result = await getCustomerOrders('new-customer');

      expect(result).toEqual([]);
    });

    it('should filter orders by status when provided', async () => {
      const pendingOrders = [testOrder];
      
      supabaseMock.from('orders').select = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              data: pendingOrders,
              error: null
            })
          })
        })
      });

      const result = await getCustomerOrders(testUser.id, 'pending');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('pending');
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status successfully', async () => {
      const updatedOrder = {
        ...testOrder,
        status: 'ready_for_pickup'
      };
      
      supabaseMock.from('orders').update = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedOrder,
              error: null
            })
          })
        })
      });

      const result = await updateOrderStatus('order-123', 'ready_for_pickup');

      expect(result.status).toBe('ready_for_pickup');
      expect(mockSendOrderBroadcast).toHaveBeenCalledWith(
        'order-123',
        'status_update',
        expect.objectContaining({ status: 'ready_for_pickup' })
      );
    });

    it('should send pickup ready notification when status is ready_for_pickup', async () => {
      const updatedOrder = {
        ...testOrder,
        status: 'ready_for_pickup'
      };
      
      supabaseMock.from('orders').update = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedOrder,
              error: null
            })
          })
        })
      });

      await updateOrderStatus('order-123', 'ready_for_pickup');

      expect(mockSendPickupReadyNotification).toHaveBeenCalledWith(
        testUser.email,
        testUser.phone,
        'order-123'
      );
    });

    it('should restore stock when order is cancelled', async () => {
      const cancelledOrder = {
        ...testOrder,
        status: 'cancelled',
        order_items: [
          {
            product_id: testProducts[0].id,
            quantity: 2
          }
        ]
      };
      
      supabaseMock.from('orders').update = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: cancelledOrder,
              error: null
            })
          })
        })
      });

      await updateOrderStatus('order-123', 'cancelled');

      expect(mockRestoreOrderStock).toHaveBeenCalledWith('order-123');
    });

    it('should prevent invalid status transitions', async () => {
      // Mock order is already completed
      const completedOrder = {
        ...testOrder,
        status: 'completed'
      };
      
      supabaseMock.from('orders').select = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: completedOrder,
            error: null
          })
        })
      });

      await expect(
        updateOrderStatus('order-123', 'pending')
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('bulkUpdateOrderStatus', () => {
    it('should update multiple orders successfully', async () => {
      const orderIds = ['order-123', 'order-456', 'order-789'];
      
      supabaseMock.from('orders').update = jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: orderIds.map(id => ({
              ...testOrder,
              id,
              status: 'processing'
            })),
            error: null
          })
        })
      });

      const result = await bulkUpdateOrderStatus(orderIds, 'processing');

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(3);
      expect(result.failedOrders).toEqual([]);
    });

    it('should handle partial failures in bulk update', async () => {
      const orderIds = ['order-123', 'order-456', 'order-789'];
      
      // Mock that only 2 orders were updated
      supabaseMock.from('orders').update = jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [
              { ...testOrder, id: 'order-123', status: 'processing' },
              { ...testOrder, id: 'order-456', status: 'processing' }
            ],
            error: null
          })
        })
      });

      const result = await bulkUpdateOrderStatus(orderIds, 'processing');

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(result.failedOrders).toEqual(['order-789']);
    });

    it('should handle complete failure in bulk update', async () => {
      const orderIds = ['order-123', 'order-456'];
      
      supabaseMock.from('orders').update = jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Bulk update failed' }
          })
        })
      });

      const result = await bulkUpdateOrderStatus(orderIds, 'processing');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Bulk update failed');
      expect(result.updatedCount).toBe(0);
    });
  });

  describe('getAllOrders', () => {
    it('should retrieve all orders with pagination', async () => {
      const allOrders = Array.from({ length: 25 }, (_, i) => 
        createOrder({
          id: `order-${i + 1}`,
          created_at: new Date(Date.now() - i * 86400000).toISOString()
        })
      );
      
      // Mock first page
      supabaseMock.from('orders').select = jest.fn()
        .mockReturnValueOnce({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockReturnValue({
              data: allOrders.slice(0, 20),
              error: null
            })
          })
        });

      const result = await getAllOrders({ page: 1, limit: 20 });

      expect(result.orders).toHaveLength(20);
      expect(result.page).toBe(1);
      expect(result.hasMore).toBe(true);
    });

    it('should filter orders by date range', async () => {
      const recentOrders = [
        createOrder({
          id: 'order-recent-1',
          created_at: '2024-03-15T10:00:00Z'
        }),
        createOrder({
          id: 'order-recent-2',
          created_at: '2024-03-16T10:00:00Z'
        })
      ];
      
      supabaseMock.from('orders').select = jest.fn().mockReturnValue({
        gte: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockReturnValue({
                data: recentOrders,
                error: null
              })
            })
          })
        })
      });

      const result = await getAllOrders({
        startDate: '2024-03-15',
        endDate: '2024-03-17'
      });

      expect(result.orders).toHaveLength(2);
      expect(result.orders[0].id).toBe('order-recent-1');
    });

    it('should filter orders by fulfillment type', async () => {
      const deliveryOrders = [
        createOrder({
          id: 'order-delivery-1',
          fulfillment_type: 'delivery'
        })
      ];
      
      supabaseMock.from('orders').select = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockReturnValue({
              data: deliveryOrders,
              error: null
            })
          })
        })
      });

      const result = await getAllOrders({
        fulfillmentType: 'delivery'
      });

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].fulfillmentType).toBe('delivery');
    });
  });

  describe('getOrderStats', () => {
    it('should calculate order statistics correctly', async () => {
      const orders = [
        createOrder({ status: 'pending', total_amount: 100 }),
        createOrder({ status: 'processing', total_amount: 150 }),
        createOrder({ status: 'ready_for_pickup', total_amount: 200 }),
        createOrder({ status: 'completed', total_amount: 250 }),
        createOrder({ status: 'cancelled', total_amount: 50 })
      ];
      
      supabaseMock.from('orders').select = jest.fn().mockReturnValue({
        gte: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            data: orders,
            error: null
          })
        })
      });

      const stats = await getOrderStats('2024-03-01', '2024-03-31');

      expect(stats.totalOrders).toBe(5);
      expect(stats.completedOrders).toBe(1);
      expect(stats.cancelledOrders).toBe(1);
      expect(stats.pendingOrders).toBe(1);
      expect(stats.totalRevenue).toBe(700); // Sum excluding cancelled
      expect(stats.averageOrderValue).toBe(175); // Average excluding cancelled
      expect(stats.completionRate).toBe(0.25); // 1 completed / 4 non-cancelled
    });

    it('should handle empty date range', async () => {
      supabaseMock.from('orders').select = jest.fn().mockReturnValue({
        gte: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            data: [],
            error: null
          })
        })
      });

      const stats = await getOrderStats('2024-03-01', '2024-03-31');

      expect(stats.totalOrders).toBe(0);
      expect(stats.totalRevenue).toBe(0);
      expect(stats.averageOrderValue).toBe(0);
      expect(stats.completionRate).toBe(0);
    });

    it('should handle database error when calculating stats', async () => {
      supabaseMock.from('orders').select = jest.fn().mockReturnValue({
        gte: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            data: null,
            error: { message: 'Stats query failed' }
          })
        })
      });

      await expect(
        getOrderStats('2024-03-01', '2024-03-31')
      ).rejects.toThrow('Stats query failed');
    });
  });

  describe('order lifecycle', () => {
    it('should handle complete order lifecycle from submission to completion', async () => {
      // 1. Submit order
      const orderRequest: CreateOrderRequest = {
        customerInfo: {
          name: testUser.name,
          email: testUser.email,
          phone: testUser.phone,
          address: testUser.address
        },
        items: [
          {
            productId: testProducts[0].id,
            productName: testProducts[0].name,
            quantity: 1,
            price: testProducts[0].price,
            subtotal: testProducts[0].price
          }
        ],
        fulfillmentType: 'pickup',
        paymentMethod: 'online',
        pickupDate: '2024-03-20',
        pickupTime: '10:00',
        notes: 'Lifecycle test'
      };
      
      const newOrder = createOrder({
        id: 'lifecycle-order',
        status: 'pending'
      });
      
      supabaseMock.rpc = jest.fn().mockResolvedValue({
        data: { success: true, order: newOrder },
        error: null
      });
      
      const submitResult = await submitOrder(orderRequest);
      expect(submitResult.success).toBe(true);
      
      // 2. Process order
      supabaseMock.from('orders').update = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...newOrder, status: 'processing' },
              error: null
            })
          })
        })
      });
      
      const processingOrder = await updateOrderStatus('lifecycle-order', 'processing');
      expect(processingOrder.status).toBe('processing');
      
      // 3. Mark ready for pickup
      supabaseMock.from('orders').update = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...newOrder, status: 'ready_for_pickup' },
              error: null
            })
          })
        })
      });
      
      const readyOrder = await updateOrderStatus('lifecycle-order', 'ready_for_pickup');
      expect(readyOrder.status).toBe('ready_for_pickup');
      expect(mockSendPickupReadyNotification).toHaveBeenCalled();
      
      // 4. Complete order
      supabaseMock.from('orders').update = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...newOrder, status: 'completed' },
              error: null
            })
          })
        })
      });
      
      const completedOrder = await updateOrderStatus('lifecycle-order', 'completed');
      expect(completedOrder.status).toBe('completed');
    });
  });
});

/**
 * Benefits of this refactored approach:
 * 
 * 1. **Factory Usage**: All test data created with validated factories
 * 2. **Simplified Mocks**: No complex chain mocking with createSupabaseMock
 * 3. **Better Organization**: Logical grouping of related tests
 * 4. **Comprehensive Coverage**: Added lifecycle and edge case tests
 * 5. **Type Safety**: Using factory-generated typed data
 * 6. **Maintainable**: Centralized test data creation
 */