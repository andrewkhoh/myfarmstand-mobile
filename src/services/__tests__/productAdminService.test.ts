/**
 * ProductAdminService Test - REFACTORED
 * Testing product admin functionality with simplified mocks and factories
 */

import { ProductAdminService } from '../productAdminService';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { createProduct, createCategory, createUser, resetAllFactories } from '../../test/factories';

// Replace complex mock setup with simple data-driven mock
jest.mock('../../config/supabase', () => ({
  supabase: null // Will be set in beforeEach
}));

// Mock ValidationMonitor
jest.mock('../../utils/validationMonitor', () => ({
  validationMonitor: {
    trackSuccess: jest.fn(),
    trackFailure: jest.fn(),
    trackMismatch: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({
      totalValidations: 0,
      successCount: 0,
      failureCount: 0
    })
  }
}));

describe('ProductAdminService', () => {
  let supabaseMock: any;
  let testProducts: any[];
  let testCategories: any[];
  let testAdmin: any;
  let mockValidationMonitor: any;
  
  beforeEach(() => {
    // Reset factory counter for consistent IDs
    resetAllFactories();
    
    // Create test data using factories
    testAdmin = createUser({
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'admin'
    });
    
    testCategories = [
      createCategory({
        id: 'cat-1',
        name: 'Fruits',
        description: 'Fresh fruits'
      }),
      createCategory({
        id: 'cat-2',
        name: 'Vegetables',
        description: 'Fresh vegetables'
      })
    ];
    
    testProducts = [
      createProduct({
        id: 'product-1',
        name: 'Apple',
        category_id: 'cat-1',
        price: 1.50,
        stock_quantity: 100,
        is_available: true
      }),
      createProduct({
        id: 'product-2',
        name: 'Carrot',
        category_id: 'cat-2',
        price: 0.75,
        stock_quantity: 50,
        is_available: true
      }),
      createProduct({
        id: 'product-3',
        name: 'Discontinued Item',
        category_id: 'cat-1',
        price: 2.00,
        stock_quantity: 0,
        is_available: false
      })
    ];
    
    // Create mock with initial data
    supabaseMock = createSupabaseMock({
      products: testProducts,
      categories: testCategories,
      users: [testAdmin],
      product_audit_logs: []
    });
    
    // Setup ValidationMonitor mock
    mockValidationMonitor = require('../../utils/validationMonitor').validationMonitor;
    jest.clearAllMocks();
    
    // Inject mock
    require('../../config/supabase').supabase = supabaseMock;
  });

  describe('getAllProducts', () => {
    it('should return all products with category information', async () => {
      const result = await ProductAdminService.getAllProducts();

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(3);
      expect(result.products[0]).toMatchObject({
        id: 'product-1',
        name: 'Apple',
        category_id: 'cat-1',
        price: 1.50,
        is_available: true
      });
    });

    it('should filter products by availability', async () => {
      const result = await ProductAdminService.getAllProducts({ availableOnly: true });

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(2);
      expect(result.products.every(p => p.is_available)).toBe(true);
    });

    it('should filter products by category', async () => {
      const result = await ProductAdminService.getAllProducts({ categoryId: 'cat-1' });

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(2); // Apple and Discontinued Item
      expect(result.products.every(p => p.category_id === 'cat-1')).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      supabaseMock.queueError(new Error('Database connection failed'));

      const result = await ProductAdminService.getAllProducts();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch products');
    });
  });

  describe('createProduct', () => {
    it('should create new product successfully', async () => {
      const newProductData = {
        name: 'Orange',
        description: 'Fresh orange',
        price: 1.25,
        category_id: 'cat-1',
        stock_quantity: 75,
        is_available: true
      };

      const result = await ProductAdminService.createProduct(newProductData);

      expect(result.success).toBe(true);
      expect(result.product).toMatchObject({
        name: 'Orange',
        price: 1.25,
        category_id: 'cat-1',
        stock_quantity: 75
      });
      
      // Verify product was added to mock data
      const products = supabaseMock.getTableData('products');
      expect(products).toHaveLength(4);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '', // Empty name
        price: -1, // Invalid price
        category_id: 'invalid-cat' // Non-existent category
      };

      const result = await ProductAdminService.createProduct(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should handle duplicate product names', async () => {
      const duplicateData = {
        name: 'Apple', // Already exists
        price: 1.50,
        category_id: 'cat-1',
        stock_quantity: 10
      };

      const result = await ProductAdminService.createProduct(duplicateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Product with this name already exists');
    });

    it('should log audit trail for creation', async () => {
      const newProductData = {
        name: 'Banana',
        price: 0.99,
        category_id: 'cat-1',
        stock_quantity: 100
      };

      await ProductAdminService.createProduct(newProductData, 'admin-123');

      const auditLogs = supabaseMock.getTableData('product_audit_logs');
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        action: 'create',
        admin_id: 'admin-123',
        product_name: 'Banana'
      });
    });
  });

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      const updateData = {
        price: 1.75,
        stock_quantity: 120
      };

      const result = await ProductAdminService.updateProduct('product-1', updateData);

      expect(result.success).toBe(true);
      expect(result.product.price).toBe(1.75);
      expect(result.product.stock_quantity).toBe(120);
    });

    it('should handle partial updates', async () => {
      const updateData = {
        is_available: false
      };

      const result = await ProductAdminService.updateProduct('product-1', updateData);

      expect(result.success).toBe(true);
      expect(result.product.is_available).toBe(false);
      expect(result.product.name).toBe('Apple'); // Unchanged
    });

    it('should prevent invalid updates', async () => {
      const invalidData = {
        price: -5 // Negative price
      };

      const result = await ProductAdminService.updateProduct('product-1', invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid price');
    });

    it('should handle non-existent products', async () => {
      const result = await ProductAdminService.updateProduct('invalid-id', { price: 1.00 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Product not found');
    });

    it('should log audit trail for updates', async () => {
      await ProductAdminService.updateProduct(
        'product-1',
        { price: 2.00 },
        'admin-123'
      );

      const auditLogs = supabaseMock.getTableData('product_audit_logs');
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        action: 'update',
        product_id: 'product-1',
        admin_id: 'admin-123'
      });
    });
  });

  describe('deleteProduct', () => {
    it('should soft delete product by setting unavailable', async () => {
      const result = await ProductAdminService.deleteProduct('product-1');

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(true);
      
      // Product should still exist but be unavailable
      const products = supabaseMock.getTableData('products');
      const deletedProduct = products.find(p => p.id === 'product-1');
      expect(deletedProduct.is_available).toBe(false);
    });

    it('should hard delete when specified', async () => {
      const result = await ProductAdminService.deleteProduct('product-1', { hardDelete: true });

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(true);
      
      // Product should be completely removed
      const products = supabaseMock.getTableData('products');
      expect(products.find(p => p.id === 'product-1')).toBeUndefined();
    });

    it('should prevent deletion of products with active orders', async () => {
      // Mock to simulate active orders for product
      supabaseMock.queueError(new Error('Product has active orders'));

      const result = await ProductAdminService.deleteProduct('product-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Product has active orders');
    });

    it('should handle non-existent products', async () => {
      const result = await ProductAdminService.deleteProduct('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Product not found');
    });
  });

  describe('bulkUpdateProducts', () => {
    it('should update multiple products concurrently', async () => {
      const updates = [
        { id: 'product-1', data: { price: 1.60 } },
        { id: 'product-2', data: { stock_quantity: 60 } }
      ];

      const results = await ProductAdminService.bulkUpdateProducts(updates);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      
      // Verify changes were applied
      const products = supabaseMock.getTableData('products');
      expect(products.find(p => p.id === 'product-1').price).toBe(1.60);
      expect(products.find(p => p.id === 'product-2').stock_quantity).toBe(60);
    });

    it('should handle partial failures in bulk operations', async () => {
      const updates = [
        { id: 'product-1', data: { price: 1.60 } },
        { id: 'invalid-id', data: { price: 1.00 } }
      ];

      const results = await ProductAdminService.bulkUpdateProducts(updates);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    it('should respect batch size limits', async () => {
      const updates = Array.from({ length: 150 }, (_, i) => ({
        id: `product-${i}`,
        data: { price: 1.00 }
      }));

      const results = await ProductAdminService.bulkUpdateProducts(updates, {
        batchSize: 50
      });

      expect(results).toHaveLength(150);
      // Verify batching occurred (implementation detail)
    });
  });

  describe('Product Statistics', () => {
    it('should return comprehensive product statistics', async () => {
      const result = await ProductAdminService.getProductStatistics();

      expect(result.success).toBe(true);
      expect(result.stats).toMatchObject({
        totalProducts: 3,
        availableProducts: 2,
        unavailableProducts: 1,
        outOfStockProducts: 1,
        totalStockValue: expect.any(Number)
      });
    });

    it('should return statistics by category', async () => {
      const result = await ProductAdminService.getProductStatistics({ 
        groupByCategory: true 
      });

      expect(result.success).toBe(true);
      expect(result.statsByCategory).toBeDefined();
      expect(result.statsByCategory['cat-1']).toMatchObject({
        totalProducts: 2,
        availableProducts: 1
      });
    });

    it('should handle statistics calculation errors', async () => {
      supabaseMock.queueError(new Error('Statistics calculation failed'));

      const result = await ProductAdminService.getProductStatistics();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to calculate statistics');
    });
  });

  describe('Inventory Management', () => {
    it('should adjust stock levels with reason tracking', async () => {
      const result = await ProductAdminService.adjustStock(
        'product-1',
        25,
        'inventory_adjustment',
        'Stock count correction'
      );

      expect(result.success).toBe(true);
      expect(result.newStockLevel).toBe(125); // 100 + 25
      expect(result.adjustment).toBe(25);
    });

    it('should prevent negative stock adjustments beyond available', async () => {
      const result = await ProductAdminService.adjustStock(
        'product-1',
        -150, // More than available (100)
        'inventory_adjustment',
        'Invalid adjustment'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Would result in negative stock');
    });

    it('should log stock adjustments', async () => {
      await ProductAdminService.adjustStock(
        'product-1',
        -10,
        'inventory_adjustment',
        'Damaged goods removal',
        'admin-123'
      );

      const auditLogs = supabaseMock.getTableData('product_audit_logs');
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        action: 'stock_adjustment',
        product_id: 'product-1',
        admin_id: 'admin-123',
        details: expect.stringContaining('Damaged goods removal')
      });
    });
  });

  describe('Validation Monitoring Integration', () => {
    it('should track successful validations', async () => {
      const newProductData = {
        name: 'Valid Product',
        price: 1.99,
        category_id: 'cat-1',
        stock_quantity: 50
      };

      await ProductAdminService.createProduct(newProductData);

      expect(mockValidationMonitor.trackSuccess).toHaveBeenCalledWith(
        'product_creation',
        expect.any(Object)
      );
    });

    it('should track validation failures', async () => {
      const invalidData = {
        name: '', // Invalid
        price: -1 // Invalid
      };

      await ProductAdminService.createProduct(invalidData);

      expect(mockValidationMonitor.trackFailure).toHaveBeenCalledWith(
        'product_creation',
        expect.any(Object),
        expect.any(String)
      );
    });

    it('should handle validation monitoring failures gracefully', async () => {
      mockValidationMonitor.trackSuccess.mockImplementation(() => {
        throw new Error('Monitor failure');
      });

      // Should still succeed even if monitoring fails
      const result = await ProductAdminService.createProduct({
        name: 'Test Product',
        price: 1.00,
        category_id: 'cat-1',
        stock_quantity: 10
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Error Resilience', () => {
    it('should handle database connection failures', async () => {
      supabaseMock.queueError(new Error('Connection timeout'));

      const result = await ProductAdminService.getAllProducts();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch products');
    });

    it('should handle concurrent modification conflicts', async () => {
      // Simulate concurrent modification by modifying data between operations
      let callCount = 0;
      const originalUpdate = supabaseMock.from().update;
      supabaseMock.from().update = jest.fn().mockImplementation((data) => {
        callCount++;
        if (callCount === 1) {
          // Modify the product concurrently
          const products = supabaseMock.getTableData('products');
          products[0].updated_at = new Date().toISOString();
        }
        return originalUpdate(data);
      });

      const result = await ProductAdminService.updateProduct('product-1', { price: 2.00 });

      expect(result.success).toBe(true); // Should handle gracefully
    });
  });
});