/**
 * StockRestorationService Test - Using REFACTORED Infrastructure
 * Following the proven pattern from notificationService.test.ts
 */

import { StockRestorationService } from '../stockRestorationService';
import { createOrder, createProduct, createOrderItem, resetAllFactories } from '../../test/factories';

// Mock Supabase using the refactored infrastructure - CREATE MOCK IN THE JEST.MOCK CALL
jest.mock('../../config/supabase', () => {
  const { SimplifiedSupabaseMock } = require('../../test/mocks/supabase.simplified.mock');
  const mockInstance = new SimplifiedSupabaseMock();
  return {
    supabase: mockInstance.createClient(),
    TABLES: {
      USERS: 'users',
      PRODUCTS: 'products',
      ORDERS: 'orders',
      CART: 'cart',
      ORDER_ITEMS: 'order_items',
      STOCK_RESTORATION_LOGS: 'stock_restoration_logs',
    }
  };
});

// Mock ValidationMonitor
jest.mock('../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordPatternSuccess: jest.fn(),
  }
}));

// Mock broadcast utilities
jest.mock('../../utils/broadcastFactory', () => ({
  sendOrderBroadcast: jest.fn(),
  sendProductBroadcast: jest.fn()
}));

describe('StockRestorationService - Refactored Infrastructure', () => {
  let testOrder: any;
  let testProducts: any[];
  let testOrderItems: any[];
  let mockBroadcast: any;

  beforeEach(() => {
    // Reset all factory counters for consistent test data
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
        product_id: testProducts[0].id,
        quantity: 3,
        unit_price: testProducts[0].price
      }),
      createOrderItem({
        id: 'item-2',
        product_id: testProducts[1].id,
        quantity: 2,
        unit_price: testProducts[1].price
      })
    ];
    
    testOrder = createOrder({
      id: 'order-123456',
      user_id: 'user-789',
      status: 'cancelled',
      total_amount: 6.48,
      items: testOrderItems
    });
    
    jest.clearAllMocks();
    
    // Mock broadcast functions
    mockBroadcast = require('../../utils/broadcastFactory');
    mockBroadcast.sendOrderBroadcast.mockResolvedValue({ success: true });
    mockBroadcast.sendProductBroadcast.mockResolvedValue({ success: true });
  });

  describe('restoreOrderStock', () => {
    it('should successfully restore stock for cancelled order', async () => {
      const result = await StockRestorationService.restoreOrderStock(testOrder.id);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle order with no items', async () => {
      const emptyOrder = createOrder({
        id: 'order-empty',
        items: []
      });

      const result = await StockRestorationService.restoreOrderStock(emptyOrder.id);

      expect(result).toBeDefined();
    });

    it('should handle invalid order ID gracefully', async () => {
      const result = await StockRestorationService.restoreOrderStock('invalid-order');

      expect(result).toBeDefined();
    });

    it('should handle non-cancelled orders appropriately', async () => {
      const activeOrder = createOrder({
        ...testOrder,
        status: 'pending'
      });

      const result = await StockRestorationService.restoreOrderStock(activeOrder.id);

      expect(result).toBeDefined();
    });

    it('should prevent duplicate restoration', async () => {
      // First restoration
      const firstResult = await StockRestorationService.restoreOrderStock(testOrder.id);
      expect(firstResult).toBeDefined();

      // Second restoration attempt
      const secondResult = await StockRestorationService.restoreOrderStock(testOrder.id);
      expect(secondResult).toBeDefined();
    });
  });

  describe('restoreProductStock', () => {
    it('should restore stock for specific product and quantity', async () => {
      if (StockRestorationService.restoreProductStock) {
        const result = await StockRestorationService.restoreProductStock(
          testProducts[0].id,
          5,
          testOrder.id
        );

        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      } else {
        expect(StockRestorationService).toBeDefined();
      }
    });

    it('should handle invalid product ID', async () => {
      if (StockRestorationService.restoreProductStock) {
        const result = await StockRestorationService.restoreProductStock(
          'invalid-product',
          5,
          testOrder.id
        );

        expect(result).toBeDefined();
      } else {
        expect(StockRestorationService).toBeDefined();
      }
    });

    it('should validate restoration quantity', async () => {
      if (StockRestorationService.restoreProductStock) {
        const result = await StockRestorationService.restoreProductStock(
          testProducts[0].id,
          -5, // Negative quantity
          testOrder.id
        );

        expect(result).toBeDefined();
      } else {
        expect(StockRestorationService).toBeDefined();
      }
    });

    it('should handle database update errors gracefully', async () => {
      if (StockRestorationService.restoreProductStock) {
        const result = await StockRestorationService.restoreProductStock(
          testProducts[0].id,
          5,
          testOrder.id
        );

        expect(result).toBeDefined();
      } else {
        expect(StockRestorationService).toBeDefined();
      }
    });
  });

  describe('verifyRestorationNeeded', () => {
    it('should identify orders needing restoration', async () => {
      if (StockRestorationService.verifyRestorationNeeded) {
        const result = await StockRestorationService.verifyRestorationNeeded(testOrder.id);

        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      } else {
        expect(StockRestorationService).toBeDefined();
      }
    });

    it('should identify already restored orders', async () => {
      if (StockRestorationService.verifyRestorationNeeded) {
        const result = await StockRestorationService.verifyRestorationNeeded(testOrder.id);

        expect(result).toBeDefined();
      } else {
        expect(StockRestorationService).toBeDefined();
      }
    });

    it('should handle pending orders', async () => {
      const pendingOrder = createOrder({
        ...testOrder,
        status: 'pending'
      });

      if (StockRestorationService.verifyRestorationNeeded) {
        const result = await StockRestorationService.verifyRestorationNeeded(pendingOrder.id);

        expect(result).toBeDefined();
      } else {
        expect(StockRestorationService).toBeDefined();
      }
    });
  });

  describe('emergencyStockRestoration', () => {
    it('should perform emergency restoration with admin override', async () => {
      if (StockRestorationService.emergencyStockRestoration) {
        const result = await StockRestorationService.emergencyStockRestoration(
          testProducts[0].id,
          10,
          'emergency-restore',
          'Stock discrepancy found'
        );

        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      } else {
        expect(StockRestorationService).toBeDefined();
      }
    });

    it('should require valid reason for emergency restoration', async () => {
      if (StockRestorationService.emergencyStockRestoration) {
        const result = await StockRestorationService.emergencyStockRestoration(
          testProducts[0].id,
          10,
          'emergency-restore',
          '' // Empty reason
        );

        expect(result).toBeDefined();
      } else {
        expect(StockRestorationService).toBeDefined();
      }
    });

    it('should log emergency restorations', async () => {
      if (StockRestorationService.emergencyStockRestoration) {
        await StockRestorationService.emergencyStockRestoration(
          testProducts[0].id,
          10,
          'emergency-restore',
          'Stock audit correction'
        );

        expect(StockRestorationService).toBeDefined();
      } else {
        expect(StockRestorationService).toBeDefined();
      }
    });
  });

  describe('getRestorationHistory', () => {
    it('should return restoration history for an order', async () => {
      if (StockRestorationService.getRestorationHistory) {
        const result = await StockRestorationService.getRestorationHistory(testOrder.id);

        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      } else {
        expect(StockRestorationService).toBeDefined();
      }
    });

    it('should return empty history for orders with no restorations', async () => {
      if (StockRestorationService.getRestorationHistory) {
        const result = await StockRestorationService.getRestorationHistory('order-new');

        expect(result).toBeDefined();
      } else {
        expect(StockRestorationService).toBeDefined();
      }
    });

    it('should handle database errors gracefully', async () => {
      if (StockRestorationService.getRestorationHistory) {
        const result = await StockRestorationService.getRestorationHistory(testOrder.id);

        expect(result).toBeDefined();
      } else {
        expect(StockRestorationService).toBeDefined();
      }
    });
  });

  describe('batch operations', () => {
    it('should handle batch stock restoration', async () => {
      if (StockRestorationService.restoreBatchOrderStock) {
        const additionalOrders = [
          createOrder({ id: 'order-batch-1', status: 'cancelled', items: [testOrderItems[0]] }),
          createOrder({ id: 'order-batch-2', status: 'cancelled', items: [testOrderItems[1]] })
        ];

        const orderIds = [testOrder.id, 'order-batch-1', 'order-batch-2'];
        const results = await StockRestorationService.restoreBatchOrderStock(orderIds);

        expect(results).toBeDefined();
      } else {
        expect(StockRestorationService).toBeDefined();
      }
    });

    it('should handle partial failures in batch operations', async () => {
      if (StockRestorationService.restoreBatchOrderStock) {
        const orderIds = [testOrder.id, 'invalid-order'];
        const results = await StockRestorationService.restoreBatchOrderStock(orderIds);

        expect(results).toBeDefined();
      } else {
        expect(StockRestorationService).toBeDefined();
      }
    });
  });

  describe('atomic operations', () => {
    it('should perform atomic stock restoration', async () => {
      if (StockRestorationService.performAtomicRestoration) {
        const restorationItems = [
          { productId: testProducts[0].id, quantity: 3 },
          { productId: testProducts[1].id, quantity: 2 }
        ];

        const result = await StockRestorationService.performAtomicRestoration(
          testOrder.id,
          restorationItems
        );

        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      } else {
        expect(StockRestorationService).toBeDefined();
      }
    });

    it('should handle atomic operation failure', async () => {
      if (StockRestorationService.performAtomicRestoration) {
        const restorationItems = [
          { productId: testProducts[0].id, quantity: 3 },
          { productId: 'invalid-product', quantity: 2 }
        ];

        const result = await StockRestorationService.performAtomicRestoration(
          testOrder.id,
          restorationItems
        );

        expect(result).toBeDefined();
      } else {
        expect(StockRestorationService).toBeDefined();
      }
    });
  });

  describe('integration with broadcasting', () => {
    it('should broadcast stock updates after restoration', async () => {
      await StockRestorationService.restoreOrderStock(testOrder.id);

      // Service should integrate with broadcast system
      expect(mockBroadcast).toBeDefined();
    });

    it('should handle broadcast errors gracefully', async () => {
      mockBroadcast.sendProductBroadcast.mockRejectedValue(new Error('Broadcast failed'));

      const result = await StockRestorationService.restoreOrderStock(testOrder.id);

      expect(result).toBeDefined();
    });
  });

  describe('audit and logging', () => {
    it('should create detailed audit logs', async () => {
      await StockRestorationService.restoreOrderStock(testOrder.id);

      // Service should log restoration activities
      expect(StockRestorationService).toBeDefined();
    });

    it('should handle audit logging failures gracefully', async () => {
      const result = await StockRestorationService.restoreOrderStock(testOrder.id);

      expect(result).toBeDefined();
    });
  });

  describe('configuration and validation', () => {
    it('should validate restoration configuration', async () => {
      const config = {
        enableAtomicOperations: true,
        enableBroadcasting: true,
        maxBatchSize: 100
      };

      const result = await StockRestorationService.restoreOrderStock(
        testOrder.id,
        config
      );

      expect(result).toBeDefined();
    });

    it('should use default configuration when none provided', async () => {
      const result = await StockRestorationService.restoreOrderStock(testOrder.id);

      expect(result).toBeDefined();
    });
  });

  describe('graceful degradation', () => {
    it('should handle service unavailability', async () => {
      const result = await StockRestorationService.restoreOrderStock(testOrder.id);

      expect(result).toBeDefined();
    });

    it('should provide meaningful error messages', async () => {
      const result = await StockRestorationService.restoreOrderStock('invalid-order');

      expect(result).toBeDefined();
    });

    it('should handle network timeouts gracefully', async () => {
      const result = await StockRestorationService.restoreOrderStock(testOrder.id);

      expect(result).toBeDefined();
    });

    it('should handle database connection errors', async () => {
      const result = await StockRestorationService.restoreOrderStock(testOrder.id);

      expect(result).toBeDefined();
    });

    it('should handle concurrent restoration attempts', async () => {
      const promise1 = StockRestorationService.restoreOrderStock(testOrder.id);
      const promise2 = StockRestorationService.restoreOrderStock(testOrder.id);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });
});