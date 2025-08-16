/**
 * StockRestorationService Test
 * Comprehensive testing for stock restoration functionality including
 * order cancellation recovery, no-show handling, atomic stock operations,
 * broadcast updates, audit logging, and emergency restoration procedures
 */

import { 
  StockRestorationService,
  restoreOrderStock,
  verifyRestorationNeeded,
  emergencyStockRestoration 
} from '../stockRestorationService';
import { Order } from '../../types';

// Mock the supabase module
const mockSupabase = require('../../config/supabase').supabase;

// Mock broadcast utilities
const mockSendOrderBroadcast = require('../../utils/broadcastFactory').sendOrderBroadcast;

// Mock type mappers
const mockGetOrderItems = require('../../utils/typeMappers').getOrderItems;
const mockGetOrderCustomerInfo = require('../../utils/typeMappers').getOrderCustomerInfo;

describe('StockRestorationService', () => {
  // Test data
  const mockOrder: Order = {
    id: 'order-123456',
    customerId: 'user-789',
    customer_name: 'John Doe',
    customer_email: 'john.doe@example.com',
    customer_phone: '+1234567890',
    status: 'cancelled',
    fulfillmentType: 'pickup',
    payment_method: 'cash_on_pickup',
    paymentMethod: 'cash_on_pickup',
    payment_status: 'pending',
    total: 45.67,
    total_amount: 45.67,
    pickup_date: '2024-03-20',
    pickup_time: '14:00',
    pickupDate: '2024-03-20',
    pickupTime: '14:00',
    items: [],
    customerInfo: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockOrderItems = [
    {
      productId: 'product-1',
      productName: 'Organic Apples',
      quantity: 5,
      price: 3.99,
      subtotal: 19.95
    },
    {
      productId: 'product-2',
      productName: 'Fresh Carrots',
      quantity: 3,
      price: 2.50,
      subtotal: 7.50
    }
  ];

  const mockNoShowOrder: Order = {
    ...mockOrder,
    id: 'order-789012',
    status: 'no_show'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default Supabase mocks
    mockSupabase.rpc.mockResolvedValue({
      data: { 
        success: true, 
        new_stock_level: 50,
        error: null 
      },
      error: null
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { status: 'cancelled', created_at: new Date().toISOString() },
            error: null
          })
        })
      }),
      insert: jest.fn().mockResolvedValue({ error: null })
    });

    // Setup broadcast mock
    mockSendOrderBroadcast.mockResolvedValue({ success: true });

    // Setup type mapper mocks
    mockGetOrderItems.mockReturnValue(mockOrderItems);
    mockGetOrderCustomerInfo.mockReturnValue({ email: 'john.doe@example.com' });

    // Console spies
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('restoreOrderStock', () => {
    it('should restore stock for all items in a cancelled order', async () => {
      const result = await StockRestorationService.restoreOrderStock(mockOrder, 'order_cancelled');

      expect(result.success).toBe(true);
      expect(result.restoredItems).toHaveLength(2);
      expect(result.failedItems).toHaveLength(0);
      expect(result.restoredItems[0]).toEqual({
        productId: 'product-1',
        productName: 'Organic Apples',
        quantityRestored: 5,
        newStockLevel: 50
      });
      expect(result.restoredItems[1]).toEqual({
        productId: 'product-2',
        productName: 'Fresh Carrots',
        quantityRestored: 3,
        newStockLevel: 50
      });
      expect(result.message).toContain('Stock restored for 2 items');
    });

    it('should handle no-show order restoration', async () => {
      const result = await StockRestorationService.restoreOrderStock(mockNoShowOrder, 'no_show_timeout');

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_product_stock', {
        product_id: 'product-1',
        quantity_to_add: 5,
        order_id: 'order-789012',
        restoration_reason: 'no_show_timeout'
      });
      expect(console.log).toHaveBeenCalledWith(
        '🔄 Starting stock restoration for order order-789012, reason: no_show_timeout'
      );
    });

    it('should handle partial restoration failures gracefully', async () => {
      // Mock first product success, second product failure
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: { success: true, new_stock_level: 50 },
          error: null
        })
        .mockResolvedValueOnce({
          data: { success: false, error: 'Insufficient stock' },
          error: null
        });

      const result = await StockRestorationService.restoreOrderStock(mockOrder, 'order_cancelled');

      expect(result.success).toBe(true); // Still successful because one item restored
      expect(result.restoredItems).toHaveLength(1);
      expect(result.failedItems).toHaveLength(1);
      expect(result.failedItems[0]).toEqual({
        productId: 'product-2',
        productName: 'Fresh Carrots',
        quantity: 3,
        error: 'Insufficient stock'
      });
    });

    it('should handle database errors during restoration', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const result = await StockRestorationService.restoreOrderStock(mockOrder, 'order_cancelled');

      expect(result.success).toBe(false);
      expect(result.restoredItems).toHaveLength(0);
      expect(result.failedItems).toHaveLength(2);
      expect(result.failedItems[0].error).toBe('Database error: Database connection failed');
    });

    it('should broadcast stock updates for restored items', async () => {
      await StockRestorationService.restoreOrderStock(mockOrder, 'order_cancelled');

      expect(mockSendOrderBroadcast).toHaveBeenCalledTimes(2);
      expect(mockSendOrderBroadcast).toHaveBeenCalledWith('stock-restored', {
        productId: 'product-1',
        quantityRestored: 5,
        newStockLevel: 50,
        timestamp: expect.any(String),
        action: 'stock_restoration'
      });
      expect(mockSendOrderBroadcast).toHaveBeenCalledWith('stock-restored', {
        productId: 'product-2',
        quantityRestored: 3,
        newStockLevel: 50,
        timestamp: expect.any(String),
        action: 'stock_restoration'
      });
    });

    it('should handle broadcast failures gracefully', async () => {
      mockSendOrderBroadcast.mockRejectedValue(new Error('Broadcast service down'));

      const result = await StockRestorationService.restoreOrderStock(mockOrder, 'order_cancelled');

      expect(result.success).toBe(true); // Restoration should still succeed
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to broadcast stock updates:',
        expect.any(Error)
      );
    });

    it('should log restoration events for audit trail', async () => {
      await StockRestorationService.restoreOrderStock(mockOrder, 'order_cancelled');

      expect(console.log).toHaveBeenCalledWith(
        'Stock restoration event:',
        expect.objectContaining({
          order_id: 'order-123456',
          customer_email: 'john.doe@example.com',
          restoration_reason: 'order_cancelled',
          items_restored: 2,
          items_failed: 0,
          total_quantity_restored: 8
        })
      );
    });

    it('should handle orders with no items', async () => {
      mockGetOrderItems.mockReturnValue([]);

      const result = await StockRestorationService.restoreOrderStock(mockOrder, 'order_cancelled');

      expect(result.success).toBe(false);
      expect(result.restoredItems).toHaveLength(0);
      expect(result.failedItems).toHaveLength(0);
      expect(result.message).toContain('Failed to restore stock');
    });

    it('should handle complete restoration failure', async () => {
      // Mock getOrderItems to throw an error during the catch block
      const originalGetOrderItems = mockGetOrderItems;
      mockGetOrderItems.mockImplementationOnce(() => {
        throw new Error('Failed to get order items');
      }).mockImplementationOnce(() => {
        // Second call in catch block should work
        return mockOrderItems;
      });

      const result = await StockRestorationService.restoreOrderStock(mockOrder, 'order_cancelled');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get order items');
      expect(console.error).toHaveBeenCalledWith(
        'Error in stock restoration:',
        expect.any(Error)
      );
      
      // Restore original mock
      mockGetOrderItems.mockImplementation(originalGetOrderItems);
    });
  });

  describe('verifyRestorationNeeded', () => {
    it('should verify restoration is needed for cancelled orders', async () => {
      const result = await StockRestorationService.verifyRestorationNeeded('order-123456');

      expect(result.needed).toBe(true);
      expect(result.reason).toBe('Order status: cancelled');
      expect(result.alreadyRestored).toBeUndefined();
    });

    it('should verify restoration is needed for no-show orders', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { status: 'no_show', created_at: new Date().toISOString() },
        error: null
      });

      const result = await StockRestorationService.verifyRestorationNeeded('order-789012');

      expect(result.needed).toBe(true);
      expect(result.reason).toBe('Order status: no_show');
    });

    it('should verify restoration is not needed for completed orders', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { status: 'completed', created_at: new Date().toISOString() },
        error: null
      });

      const result = await StockRestorationService.verifyRestorationNeeded('order-completed');

      expect(result.needed).toBe(false);
      expect(result.reason).toBe('Order not cancelled');
    });

    it('should handle database errors when checking order status', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Order not found' }
      });

      const result = await StockRestorationService.verifyRestorationNeeded('invalid-order');

      expect(result.needed).toBe(false);
      expect(result.reason).toBe('Unable to fetch order');
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching order:',
        expect.objectContaining({ message: 'Order not found' })
      );
    });

    it('should handle network errors during verification', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Network connection failed');
      });

      const result = await StockRestorationService.verifyRestorationNeeded('order-123456');

      expect(result.needed).toBe(false);
      expect(result.reason).toBe('Verification failed');
      expect(console.error).toHaveBeenCalledWith(
        'Error verifying restoration need:',
        expect.any(Error)
      );
    });
  });

  describe('emergencyStockRestoration', () => {
    it('should perform emergency stock restoration successfully', async () => {
      const result = await StockRestorationService.emergencyStockRestoration(
        'product-emergency',
        10,
        'System error correction'
      );

      expect(result.success).toBe(true);
      expect(result.restoredItems).toHaveLength(1);
      expect(result.restoredItems[0]).toEqual({
        productId: 'product-emergency',
        productName: 'Product product-emergency',
        quantityRestored: 10,
        newStockLevel: 50
      });
      expect(result.failedItems).toHaveLength(0);
      expect(result.message).toBe('Emergency restoration completed: 10 units restored');
      expect(console.log).toHaveBeenCalledWith(
        '🚨 Emergency stock restoration: 10 units for product product-emergency'
      );
    });

    it('should handle emergency restoration failures', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { success: false, error: 'Product not found' },
        error: null
      });

      const result = await StockRestorationService.emergencyStockRestoration(
        'invalid-product',
        5,
        'Emergency fix'
      );

      expect(result.success).toBe(false);
      expect(result.restoredItems).toHaveLength(0);
      expect(result.failedItems).toHaveLength(1);
      expect(result.failedItems[0]).toEqual({
        productId: 'invalid-product',
        productName: 'Product invalid-product',
        quantity: 5,
        error: 'Product not found'
      });
      expect(result.error).toBe('Product not found');
    });

    it('should handle database errors during emergency restoration', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database unreachable' }
      });

      const result = await StockRestorationService.emergencyStockRestoration(
        'product-db-error',
        3,
        'Database recovery'
      );

      expect(result.success).toBe(false);
      expect(result.failedItems[0].error).toBe('Database error: Database unreachable');
    });

    it('should handle unexpected errors during emergency restoration', async () => {
      mockSupabase.rpc.mockImplementation(() => {
        throw new Error('Unexpected system error');
      });

      const result = await StockRestorationService.emergencyStockRestoration(
        'product-error',
        2,
        'Error recovery'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unexpected system error');
      // The error is logged from restoreProductStock, not emergency function
      expect(console.error).toHaveBeenCalledWith(
        'Error restoring stock for product product-error:',
        expect.any(Error)
      );
    });
  });

  describe('Convenience functions', () => {
    it('should export restoreOrderStock function', async () => {
      const result = await restoreOrderStock(mockOrder, 'order_cancelled');

      expect(result.success).toBe(true);
      expect(result.restoredItems).toHaveLength(2);
      expect(console.log).toHaveBeenCalledWith(
        '🔄 Starting stock restoration for order order-123456, reason: order_cancelled'
      );
    });

    it('should export verifyRestorationNeeded function', async () => {
      const result = await verifyRestorationNeeded('order-123456');

      expect(result.needed).toBe(true);
      expect(result.reason).toBe('Order status: cancelled');
    });

    it('should export emergencyStockRestoration function', async () => {
      const result = await emergencyStockRestoration(
        'emergency-product',
        7,
        'Manual intervention'
      );

      expect(result.success).toBe(true);
      expect(result.restoredItems[0].quantityRestored).toBe(7);
      expect(console.log).toHaveBeenCalledWith(
        '🚨 Emergency stock restoration: 7 units for product emergency-product'
      );
    });
  });

  describe('Integration and edge cases', () => {
    it('should handle atomic stock operations correctly', async () => {
      await StockRestorationService.restoreOrderStock(mockOrder, 'order_cancelled');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_product_stock', {
        product_id: 'product-1',
        quantity_to_add: 5,
        order_id: 'order-123456',
        restoration_reason: 'order_cancelled'
      });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_product_stock', {
        product_id: 'product-2',
        quantity_to_add: 3,
        order_id: 'order-123456',
        restoration_reason: 'order_cancelled'
      });
    });

    it('should handle different restoration reasons', async () => {
      const reasons = ['order_cancelled', 'no_show_timeout', 'payment_failed', 'inventory_adjustment', 'system_error_recovery'];

      for (const reason of reasons) {
        await StockRestorationService.restoreOrderStock(mockOrder, reason as any);
        expect(console.log).toHaveBeenCalledWith(
          `🔄 Starting stock restoration for order order-123456, reason: ${reason}`
        );
      }
    });

    it('should handle concurrent restoration attempts', async () => {
      const promises = [
        StockRestorationService.restoreOrderStock(mockOrder, 'order_cancelled'),
        StockRestorationService.restoreOrderStock(mockNoShowOrder, 'no_show_timeout'),
        StockRestorationService.emergencyStockRestoration('emergency-1', 5, 'Emergency')
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results.every(result => result.success)).toBe(true);
    });

    it('should handle orders with missing customer information', async () => {
      mockGetOrderCustomerInfo.mockReturnValue({ email: '' });

      const result = await StockRestorationService.restoreOrderStock(mockOrder, 'order_cancelled');

      expect(result.success).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        'Stock restoration event:',
        expect.objectContaining({
          customer_email: ''
        })
      );
    });

    it('should handle very large quantity restorations', async () => {
      const largeQuantityItems = [{
        productId: 'bulk-product',
        productName: 'Bulk Item',
        quantity: 1000,
        price: 1.00,
        subtotal: 1000.00
      }];

      mockGetOrderItems.mockReturnValue(largeQuantityItems);

      const result = await StockRestorationService.restoreOrderStock(mockOrder, 'inventory_adjustment');

      expect(result.success).toBe(true);
      expect(result.restoredItems[0].quantityRestored).toBe(1000);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_product_stock', {
        product_id: 'bulk-product',
        quantity_to_add: 1000,
        order_id: 'order-123456',
        restoration_reason: 'inventory_adjustment'
      });
    });

    it('should handle malformed order data gracefully', async () => {
      const malformedOrder = {
        ...mockOrder,
        id: '',
        customer_email: null
      } as any;

      mockGetOrderCustomerInfo.mockReturnValue({ email: null });

      const result = await StockRestorationService.restoreOrderStock(malformedOrder, 'order_cancelled');

      expect(result.success).toBe(true); // Should still process items
      expect(console.log).toHaveBeenCalledWith(
        'Stock restoration event:',
        expect.objectContaining({
          order_id: '',
          customer_email: null
        })
      );
    });
  });
});