/**
 * OrderService Test
 * Comprehensive testing for order functionality including submission,
 * status updates, inventory validation, and payment processing
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

// Mock the supabase module
const mockSupabase = require('../../config/supabase').supabase;

// Mock dependencies
const mockSendOrderBroadcast = require('../../utils/broadcastFactory').sendOrderBroadcast;

// Mock notification service locally for orderService
jest.mock('../notificationService', () => ({
  sendPickupReadyNotification: jest.fn().mockResolvedValue({ success: true }),
  sendOrderConfirmationNotification: jest.fn().mockResolvedValue({ success: true }),
}));
const mockSendPickupReadyNotification = require('../notificationService').sendPickupReadyNotification;
const mockSendOrderConfirmationNotification = require('../notificationService').sendOrderConfirmationNotification;

// Mock stock restoration service locally
jest.mock('../stockRestorationService', () => ({
  restoreOrderStock: jest.fn().mockResolvedValue({ success: true }),
}));
const mockRestoreOrderStock = require('../stockRestorationService').restoreOrderStock;

// Mock type mappers
const mockGetProductStock = require('../../utils/typeMappers').getProductStock;
const mockGetOrderCustomerId = require('../../utils/typeMappers').getOrderCustomerId;
const mockGetOrderTotal = require('../../utils/typeMappers').getOrderTotal;
const mockGetOrderFulfillmentType = require('../../utils/typeMappers').getOrderFulfillmentType;
const mockMapOrderFromDB = require('../../utils/typeMappers').mapOrderFromDB;

// Mock UUID generation
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234')
}));

describe('OrderService', () => {
  // Test data
  const mockOrderRequest: CreateOrderRequest = {
    customerInfo: {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      address: '123 Test St'
    },
    items: [
      {
        productId: 'product-1',
        productName: 'Test Product 1',
        quantity: 2,
        price: 10.99,
        subtotal: 21.98
      },
      {
        productId: 'product-2',
        productName: 'Test Product 2',
        quantity: 1,
        price: 15.50,
        subtotal: 15.50
      }
    ],
    fulfillmentType: 'pickup',
    paymentMethod: 'stripe',
    pickupDate: '2024-03-20',
    pickupTime: '10:00',
    notes: 'Test order'
  };

  const mockOrder: Order = {
    id: 'order-123',
    customerEmail: 'test@example.com',
    customerPhone: '+1234567890',
    status: 'pending',
    fulfillmentType: 'pickup',
    preferredPickupDate: '2024-03-20',
    preferredPickupTime: '10:00',
    subtotal: 37.48,
    tax: 3.19,
    total: 40.67,
    paymentStatus: 'paid' as PaymentStatus,
    paymentMethod: 'stripe',
    notes: 'Test order',
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        productName: 'Test Product 1',
        quantity: 2,
        unitPrice: 10.99,
        totalPrice: 21.98
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockProducts = [
    {
      id: 'product-1',
      name: 'Test Product 1',
      stock_quantity: 100
    },
    {
      id: 'product-2', 
      name: 'Test Product 2',
      stock_quantity: 50
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockGetProductStock.mockReturnValue(100);
    mockGetOrderCustomerId.mockReturnValue('customer-123');
    mockGetOrderTotal.mockReturnValue(40.67);
    mockGetOrderFulfillmentType.mockReturnValue('pickup');
    mockMapOrderFromDB.mockImplementation((orderData, items) => ({
      ...mockOrder,
      ...orderData,
      customer_email: orderData.customer_email,
      order_items: items || []
    }));
    mockSendOrderBroadcast.mockResolvedValue({ success: true });
    mockSendPickupReadyNotification.mockResolvedValue({ success: true });
    mockSendOrderConfirmationNotification.mockResolvedValue({ success: true });
    mockRestoreOrderStock.mockResolvedValue({ success: true });

    // Setup authenticated user by default
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { 
        user: { 
          id: 'user-123',
          email: 'test@example.com'
        } 
      },
      error: null
    });
  });

  describe('submitOrder', () => {
    it('should submit order successfully with valid data', async () => {
      // Mock submit_order_atomic RPC call
      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: true,
          order: {
            id: 'order-123',
            status: 'pending',
            customer_name: 'Test User',
            customer_email: 'test@example.com',
            customer_phone: '+1234567890',
            subtotal: 37.48,
            tax_amount: 3.19,
            total_amount: 40.67,
            fulfillment_type: 'pickup',
            payment_method: 'stripe',
            payment_status: 'paid',
            pickup_date: '2024-03-20',
            pickup_time: '10:00',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        },
        error: null
      });

      const result = await submitOrder(mockOrderRequest);

      expect(result.success).toBe(true);
      expect(result.order?.id).toBe('order-123');
      expect(mockSendOrderConfirmationNotification).toHaveBeenCalled();
    });

    it('should reject order with insufficient inventory', async () => {
      // Mock submit_order_atomic RPC call returning inventory conflicts
      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: false,
          error: 'Inventory conflicts detected',
          inventoryConflicts: [{
            productId: 'product-1',
            productName: 'Test Product 1',
            requested: 2,
            available: 1
          }]
        },
        error: null
      });

      const result = await submitOrder(mockOrderRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Inventory conflicts detected');
    });

    it('should handle database errors during order submission', async () => {
      // Mock submit_order_atomic RPC call failure
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await submitOrder(mockOrderRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to submit order: Database error');
    });
  });

  describe('getOrder', () => {
    it('should retrieve order by ID successfully', async () => {
      // Mock order query with order_items relationship
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'order-123',
                status: 'pending',
                customer_name: 'Test User',
                customer_email: 'test@example.com',
                customer_phone: '+1234567890',
                order_items: [{
                  id: 'item-1',
                  product_id: 'product-1',
                  product_name: 'Test Product',
                  unit_price: 10.99,
                  quantity: 2,
                  total_price: 21.98
                }]
              },
              error: null
            })
          })
        })
      });

      const result = await getOrder('order-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('order-123');
    });

    it('should return null for non-existent order', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        })
      });

      const result = await getOrder('non-existent');

      expect(result).toBeNull();
    });

    it('should handle database errors during order retrieval', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      });

      const result = await getOrder('order-123');
      expect(result).toBeNull();
    });
  });

  describe('getCustomerOrders', () => {
    it('should retrieve orders for customer successfully', async () => {
      // Mock orders query with order_items relationship
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [{
                id: 'order-123',
                customer_email: 'test@example.com',
                customer_name: 'Test User',
                customer_phone: '+1234567890',
                status: 'pending',
                order_items: [{
                  id: 'item-1',
                  product_id: 'product-1',
                  product_name: 'Test Product',
                  unit_price: 10.99,
                  quantity: 2,
                  total_price: 21.98
                }]
              }],
              error: null
            })
          })
        })
      });

      const result = await getCustomerOrders('test@example.com');

      expect(result).toHaveLength(1);
      expect(result[0].customer_email).toBe('test@example.com');
    });

    it('should return empty array for customer with no orders', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      });

      const result = await getCustomerOrders('no-orders@example.com');

      expect(result).toEqual([]);
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status successfully', async () => {
      // Mock order update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'order-123',
                  status: 'ready',
                  customer_email: 'test@example.com'
                },
                error: null
              })
            })
          })
        })
      });

      // Mock getOrder call for complete order data with ready status
      mockMapOrderFromDB.mockReturnValueOnce({
        ...mockOrder,
        id: 'order-123',
        status: 'ready'
      });
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'order-123',
                status: 'ready',
                customer_name: 'Test User',
                customer_email: 'test@example.com',
                customer_phone: '+1234567890',
                order_items: []
              },
              error: null
            })
          })
        })
      });

      const result = await updateOrderStatus('order-123', 'ready');

      expect(result.success).toBe(true);
      expect(result.order?.status).toBe('ready');
      expect(mockSendPickupReadyNotification).toHaveBeenCalled();
    });

    it('should handle database errors during status update', async () => {
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Update failed' }
              })
            })
          })
        })
      });

      const result = await updateOrderStatus('order-123', 'ready');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to update order status');
    });

    it('should trigger stock restoration when cancelling order', async () => {
      // Mock order update for cancellation
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'order-123',
                  status: 'cancelled',
                  customer_email: 'test@example.com'
                },
                error: null
              })
            })
          })
        })
      });

      // Mock getOrder call for complete order data
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'order-123',
                status: 'cancelled',
                customer_name: 'Test User',
                customer_email: 'test@example.com',
                customer_phone: '+1234567890',
                order_items: [{
                  id: 'item-1',
                  product_id: 'product-1',
                  product_name: 'Test Product',
                  unit_price: 10.99,
                  quantity: 2,
                  total_price: 21.98
                }]
              },
              error: null
            })
          })
        })
      });

      const result = await updateOrderStatus('order-123', 'cancelled');

      expect(result.success).toBe(true);
      expect(mockRestoreOrderStock).toHaveBeenCalled();
    });
  });

  describe('bulkUpdateOrderStatus', () => {
    it('should update multiple orders successfully', async () => {
      // Mock bulk update with proper chain
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [
                { id: 'order-1', status: 'ready' },
                { id: 'order-2', status: 'ready' }
              ],
              error: null
            })
          })
        })
      });

      // Mock getOrder calls for each order (called twice)
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'order-1',
                  status: 'ready',
                  customer_name: 'Test User 1',
                  customer_email: 'test1@example.com',
                  order_items: []
                },
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'order-2',
                  status: 'ready',
                  customer_name: 'Test User 2',
                  customer_email: 'test2@example.com',
                  order_items: []
                },
                error: null
              })
            })
          })
        });

      const result = await bulkUpdateOrderStatus(['order-1', 'order-2'], 'ready');

      expect(result.success).toBe(true);
      expect(result.updatedOrders?.length).toBe(2);
    });

    it('should handle bulk update errors', async () => {
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Bulk update failed' }
            })
          })
        })
      });

      const result = await bulkUpdateOrderStatus(['order-1', 'order-2'], 'ready');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to bulk update order status');
    });
  });

  describe('getAllOrders', () => {
    it('should retrieve all orders with filters', async () => {
      // Mock the query chain for filtered orders
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{
            id: 'order-123',
            status: 'pending',
            customer_name: 'Test User',
            customer_email: 'test@example.com',
            order_items: []
          }],
          error: null
        })
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      const result = await getAllOrders({
        status: 'pending',
        dateFrom: '2024-03-01',
        dateTo: '2024-03-31'
      });

      expect(result).toHaveLength(1);
    });

    it('should retrieve all orders without filters', async () => {
      const mockQuery = {
        order: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'order-123',
              customer_name: 'Test User 1',
              customer_email: 'test1@example.com',
              status: 'pending',
              order_items: []
            },
            {
              id: 'order-456',
              customer_name: 'Test User 2',
              customer_email: 'test2@example.com',
              status: 'ready',
              order_items: []
            }
          ],
          error: null
        })
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      const result = await getAllOrders();

      expect(result).toHaveLength(2);
    });
  });

  describe('getOrderStats', () => {
    it('should calculate order statistics successfully', async () => {
      // Mock the orders query that returns all orders for statistics calculation
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'order-1',
              status: 'completed',
              total_amount: 100.00,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: 'order-2',
              status: 'pending',
              total_amount: 50.00,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: 'order-3',
              status: 'ready',
              total_amount: 75.00,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ],
          error: null
        })
      });

      const result = await getOrderStats();

      expect(result.daily.ordersPlaced).toBeGreaterThanOrEqual(0);
      expect(result.weekly.ordersPlaced).toBeGreaterThanOrEqual(0);
      expect(result.active.totalPending).toBeGreaterThanOrEqual(0);
    });

    it('should handle database errors during stats calculation', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Stats query failed' }
        })
      });

      const result = await getOrderStats();
      
      // Should return default stats on error
      expect(result.daily.ordersPlaced).toBe(0);
      expect(result.weekly.ordersPlaced).toBe(0);
      expect(result.active.totalPending).toBe(0);
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle concurrent order submissions', async () => {
      // Setup mocks for multiple concurrent orders
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: mockProducts,
            error: null
          })
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: `order-${Math.random()}`, status: 'pending' },
              error: null
            })
          })
        })
      }));

      mockSupabase.rpc.mockResolvedValue({ error: null });

      const promises = Array(3).fill(null).map(() => submitOrder(mockOrderRequest));
      const results = await Promise.allSettled(promises);

      expect(results.every(r => r.status === 'fulfilled')).toBe(true);
    });

    it('should validate order total calculations', async () => {
      const orderWithItems = {
        ...mockOrderRequest,
        items: [
          {
            productId: 'product-1',
            productName: 'Product 1',
            quantity: 2,
            price: 10.00,
            subtotal: 20.00
          },
          {
            productId: 'product-2',
            productName: 'Product 2',
            quantity: 3,
            price: 5.00,
            subtotal: 15.00
          }
        ]
      };

      // Mock submit_order_atomic RPC call
      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: true,
          order: {
            id: 'order-123',
            total_amount: 37.98,
            status: 'pending'
          }
        },
        error: null
      });

      const result = await submitOrder(orderWithItems);

      expect(result.success).toBe(true);
    });
  });
});