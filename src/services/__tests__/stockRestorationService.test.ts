/**
 * StockRestorationService Test - REFACTORED
 * Testing stock restoration functionality with simplified mocks and factories
 */

import { StockRestorationService } from '../stockRestorationService';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { createOrder, createProduct, createOrderItem, resetAllFactories } from '../../test/factories';

// Replace complex mock setup with simple data-driven mock
jest.mock('../../config/supabase', () => ({
  supabase: null // Will be set in beforeEach
}));

// Mock broadcast utilities
jest.mock('../../utils/broadcastFactory', () => ({
  sendOrderBroadcast: jest.fn(),
  sendProductBroadcast: jest.fn()
}));

describe('StockRestorationService', () => {
  let supabaseMock: any;
  let testOrder: any;
  let testProducts: any[];
  let testOrderItems: any[];
  let mockBroadcast: any;
  
  beforeEach(() => {
    // Reset factory counter for consistent IDs
    resetAllFactories();
    
    // Create test data using factories
    testProducts = [
      createProduct({
        id: 'product-1',
        name: 'Apple',
        stock_quantity: 10,
        price: 1.50
      }),
      createProduct({
        id: 'product-2', 
        name: 'Banana',
        stock_quantity: 5,
        price: 0.99
      })
    ];
    
    testOrderItems = [
      createOrderItem({
        id: 'item-1',
        product_id: 'product-1',
        quantity: 3,
        unit_price: 1.50
      }),
      createOrderItem({
        id: 'item-2',
        product_id: 'product-2',
        quantity: 2,
        unit_price: 0.99
      })
    ];
    
    testOrder = createOrder({
      id: 'order-123456',
      user_id: 'user-789',
      status: 'cancelled',
      total_amount: 6.48,
      items: testOrderItems
    });
    
    // Create mock with initial data
    supabaseMock = createSupabaseMock({
      orders: [testOrder],
      products: testProducts,
      order_items: testOrderItems,
      stock_restoration_logs: []
    });
    
    // Mock broadcast functions
    mockBroadcast = require('../../utils/broadcastFactory');
    mockBroadcast.sendOrderBroadcast.mockResolvedValue({ success: true });
    mockBroadcast.sendProductBroadcast.mockResolvedValue({ success: true });
    
    // Inject mock
    require('../../config/supabase').supabase = supabaseMock;
  });

  describe('restoreOrderStock', () => {
    it('should successfully restore stock for cancelled order', async () => {
      const result = await StockRestorationService.restoreOrderStock('order-123456');

      expect(result.success).toBe(true);
      expect(result.restoredItems).toHaveLength(2);
      expect(result.totalQuantityRestored).toBe(5); // 3 + 2
      
      // Check stock was actually restored
      const products = supabaseMock.getTableData('products');
      const apple = products.find(p => p.id === 'product-1');
      const banana = products.find(p => p.id === 'product-2');
      expect(apple.stock_quantity).toBe(13); // 10 + 3
      expect(banana.stock_quantity).toBe(7); // 5 + 2
    });

    it('should handle order with no items', async () => {
      const emptyOrder = createOrder({
        id: 'order-empty',
        items: []
      });
      
      supabaseMock.setTableData('orders', [testOrder, emptyOrder]);

      const result = await StockRestorationService.restoreOrderStock('order-empty');

      expect(result.success).toBe(true);
      expect(result.restoredItems).toEqual([]);
      expect(result.totalQuantityRestored).toBe(0);
    });

    it('should handle invalid order ID', async () => {
      const result = await StockRestorationService.restoreOrderStock('invalid-order');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Order not found');
    });

    it('should prevent restoration of non-cancelled orders', async () => {
      const activeOrder = createOrder({
        ...testOrder,
        status: 'pending'
      });
      
      supabaseMock.setTableData('orders', [activeOrder]);

      const result = await StockRestorationService.restoreOrderStock('order-123456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Order is not eligible for stock restoration');
    });

    it('should prevent duplicate restoration', async () => {
      // First restoration
      const firstResult = await StockRestorationService.restoreOrderStock('order-123456');
      expect(firstResult.success).toBe(true);

      // Second restoration attempt
      const secondResult = await StockRestorationService.restoreOrderStock('order-123456');
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toContain('Stock already restored');
    });
  });

  describe('restoreProductStock', () => {
    it('should restore stock for specific product and quantity', async () => {
      const result = await StockRestorationService.restoreProductStock(
        'product-1',
        5,
        'order-123456'
      );

      expect(result.success).toBe(true);
      expect(result.previousStock).toBe(10);
      expect(result.newStock).toBe(15);
      expect(result.quantityRestored).toBe(5);
    });

    it('should handle invalid product ID', async () => {
      const result = await StockRestorationService.restoreProductStock(
        'invalid-product',
        5,
        'order-123456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Product not found');
    });

    it('should validate restoration quantity', async () => {
      const result = await StockRestorationService.restoreProductStock(
        'product-1',
        -5, // Negative quantity
        'order-123456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid restoration quantity');
    });

    it('should handle database update errors', async () => {
      supabaseMock.queueError(new Error('Stock update failed'));

      const result = await StockRestorationService.restoreProductStock(
        'product-1',
        5,
        'order-123456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to restore stock');
    });
  });

  describe('verifyRestorationNeeded', () => {
    it('should identify orders needing restoration', async () => {
      const result = await StockRestorationService.verifyRestorationNeeded('order-123456');

      expect(result.success).toBe(true);
      expect(result.needsRestoration).toBe(true);
      expect(result.reason).toContain('Order is cancelled');
    });

    it('should identify already restored orders', async () => {
      // Create restoration log
      const restorationLog = {
        order_id: 'order-123456',
        restored_at: new Date().toISOString(),
        status: 'completed'
      };
      
      supabaseMock.setTableData('stock_restoration_logs', [restorationLog]);

      const result = await StockRestorationService.verifyRestorationNeeded('order-123456');

      expect(result.success).toBe(true);
      expect(result.needsRestoration).toBe(false);
      expect(result.reason).toContain('already restored');
    });

    it('should handle pending orders', async () => {
      const pendingOrder = createOrder({
        ...testOrder,
        status: 'pending'
      });
      
      supabaseMock.setTableData('orders', [pendingOrder]);

      const result = await StockRestorationService.verifyRestorationNeeded('order-123456');

      expect(result.success).toBe(true);
      expect(result.needsRestoration).toBe(false);
      expect(result.reason).toContain('Order status does not require restoration');
    });
  });

  describe('emergencyStockRestoration', () => {
    it('should perform emergency restoration with admin override', async () => {
      const result = await StockRestorationService.emergencyStockRestoration(
        'product-1',
        10,
        'emergency-restore',
        'Stock discrepancy found'
      );

      expect(result.success).toBe(true);
      expect(result.type).toBe('emergency');
      expect(result.quantityRestored).toBe(10);
      
      // Check stock was updated
      const products = supabaseMock.getTableData('products');
      const product = products.find(p => p.id === 'product-1');
      expect(product.stock_quantity).toBe(20); // 10 + 10
    });

    it('should require valid reason for emergency restoration', async () => {
      const result = await StockRestorationService.emergencyStockRestoration(
        'product-1',
        10,
        'emergency-restore',
        '' // Empty reason
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Reason is required');
    });

    it('should log emergency restorations', async () => {
      await StockRestorationService.emergencyStockRestoration(
        'product-1',
        10,
        'emergency-restore',
        'Stock audit correction'
      );

      const logs = supabaseMock.getTableData('stock_restoration_logs');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        product_id: 'product-1',
        quantity_restored: 10,
        restoration_type: 'emergency',
        reason: 'Stock audit correction',
        restored_by: 'emergency-restore'
      });
    });
  });

  describe('getRestorationHistory', () => {
    it('should return restoration history for an order', async () => {
      // Create some restoration logs
      const logs = [
        {
          order_id: 'order-123456',
          product_id: 'product-1',
          quantity_restored: 3,
          restored_at: new Date().toISOString(),
          status: 'completed'
        },
        {
          order_id: 'order-123456',
          product_id: 'product-2',
          quantity_restored: 2,
          restored_at: new Date().toISOString(),
          status: 'completed'
        }
      ];
      
      supabaseMock.setTableData('stock_restoration_logs', logs);

      const result = await StockRestorationService.getRestorationHistory('order-123456');

      expect(result.success).toBe(true);
      expect(result.history).toHaveLength(2);
      expect(result.totalQuantityRestored).toBe(5);
    });

    it('should return empty history for orders with no restorations', async () => {
      const result = await StockRestorationService.getRestorationHistory('order-new');

      expect(result.success).toBe(true);
      expect(result.history).toEqual([]);
      expect(result.totalQuantityRestored).toBe(0);
    });

    it('should handle database errors', async () => {
      supabaseMock.queueError(new Error('Database query failed'));

      const result = await StockRestorationService.getRestorationHistory('order-123456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch restoration history');
    });
  });

  describe('Batch Operations', () => {
    it('should handle batch stock restoration', async () => {
      const additionalOrders = [
        createOrder({ id: 'order-batch-1', status: 'cancelled', items: [testOrderItems[0]] }),
        createOrder({ id: 'order-batch-2', status: 'cancelled', items: [testOrderItems[1]] })
      ];
      
      supabaseMock.setTableData('orders', [testOrder, ...additionalOrders]);

      const orderIds = ['order-123456', 'order-batch-1', 'order-batch-2'];
      const results = await StockRestorationService.restoreBatchOrderStock(orderIds);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(results.reduce((sum, r) => sum + r.totalQuantityRestored, 0)).toBeGreaterThan(0);
    });

    it('should handle partial failures in batch operations', async () => {
      const orderIds = ['order-123456', 'invalid-order'];
      const results = await StockRestorationService.restoreBatchOrderStock(orderIds);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('Atomic Operations', () => {
    it('should perform atomic stock restoration', async () => {
      const restorationItems = [
        { productId: 'product-1', quantity: 3 },
        { productId: 'product-2', quantity: 2 }
      ];

      const result = await StockRestorationService.performAtomicRestoration(
        'order-123456',
        restorationItems
      );

      expect(result.success).toBe(true);
      expect(result.restoredItems).toHaveLength(2);
    });

    it('should rollback on atomic operation failure', async () => {
      // Mock one product to fail
      const originalProducts = supabaseMock.getTableData('products');
      let updateCount = 0;
      
      const originalUpdate = supabaseMock.from().update;
      supabaseMock.from().update = jest.fn().mockImplementation((data) => {
        updateCount++;
        if (updateCount === 2) {
          throw new Error('Second update failed');
        }
        return originalUpdate(data);
      });

      const restorationItems = [
        { productId: 'product-1', quantity: 3 },
        { productId: 'product-2', quantity: 2 }
      ];

      const result = await StockRestorationService.performAtomicRestoration(
        'order-123456',
        restorationItems
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Atomic restoration failed');
      
      // Verify no partial updates occurred
      const finalProducts = supabaseMock.getTableData('products');
      expect(finalProducts).toEqual(originalProducts);
    });
  });

  describe('Integration with Broadcasting', () => {
    it('should broadcast stock updates after restoration', async () => {
      await StockRestorationService.restoreOrderStock('order-123456');

      expect(mockBroadcast.sendProductBroadcast).toHaveBeenCalledWith({
        type: 'stock_restored',
        productId: 'product-1',
        newStock: 13,
        orderId: 'order-123456'
      });
      
      expect(mockBroadcast.sendProductBroadcast).toHaveBeenCalledWith({
        type: 'stock_restored',
        productId: 'product-2',
        newStock: 7,
        orderId: 'order-123456'
      });
    });

    it('should handle broadcast errors gracefully', async () => {
      mockBroadcast.sendProductBroadcast.mockRejectedValue(new Error('Broadcast failed'));

      // Should still succeed even if broadcast fails
      const result = await StockRestorationService.restoreOrderStock('order-123456');

      expect(result.success).toBe(true);
    });
  });

  describe('Audit and Logging', () => {
    it('should create detailed audit logs', async () => {
      await StockRestorationService.restoreOrderStock('order-123456');

      const logs = supabaseMock.getTableData('stock_restoration_logs');
      expect(logs).toHaveLength(2); // One for each product
      
      expect(logs[0]).toMatchObject({
        order_id: 'order-123456',
        product_id: 'product-1',
        quantity_restored: 3,
        previous_stock: 10,
        new_stock: 13,
        restoration_type: 'order_cancellation',
        status: 'completed'
      });
    });

    it('should handle audit logging failures gracefully', async () => {
      supabaseMock.queueError(new Error('Logging failed'));

      // Should still complete restoration even if logging fails
      const result = await StockRestorationService.restoreOrderStock('order-123456');

      expect(result.success).toBe(true);
    });
  });

  describe('Configuration and Validation', () => {
    it('should validate restoration configuration', async () => {
      const config = {
        enableAtomicOperations: true,
        enableBroadcasting: true,
        maxBatchSize: 100
      };

      const result = await StockRestorationService.restoreOrderStock(
        'order-123456',
        config
      );

      expect(result.success).toBe(true);
      expect(result.config).toMatchObject(config);
    });

    it('should use default configuration when none provided', async () => {
      const result = await StockRestorationService.restoreOrderStock('order-123456');

      expect(result.success).toBe(true);
      expect(result.config).toMatchObject({
        enableAtomicOperations: true,
        enableBroadcasting: true,
        maxBatchSize: 50
      });
    });
  });
});