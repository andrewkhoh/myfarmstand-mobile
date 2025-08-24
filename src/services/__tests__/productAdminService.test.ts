/**
 * ProductAdminService Test - Using REFACTORED Infrastructure
 * Following the service-test-pattern reference
 */

// Setup all mocks BEFORE any imports
jest.mock('../../config/supabase', () => {
  const mockFrom = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    delete: jest.fn().mockResolvedValue({ data: null, error: null }),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn().mockResolvedValue({ data: null, error: null }),
    upsert: jest.fn().mockResolvedValue({ data: null, error: null })
  }));

  return {
    supabase: {
      from: mockFrom,
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null })
      }
    },
    TABLES: {
      USERS: 'users',
      PRODUCTS: 'products',
      CATEGORIES: 'categories',
      ORDERS: 'orders',
      ORDER_ITEMS: 'order_items',
      CART: 'cart',
    }
  };
});

// Mock BroadcastHelper
jest.mock('../../utils/broadcastHelper', () => ({
  BroadcastHelper: {
    productUpdated: jest.fn(),
    productDeleted: jest.fn(),
    categoryUpdated: jest.fn(),
    stockUpdated: jest.fn()
  }
}));

// Mock ValidationMonitor
jest.mock('../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordPatternSuccess: jest.fn(),
  }
}));

// Import AFTER mocks are setup
import productAdminService from '../productAdminService';
import { supabase } from '../../config/supabase';
import { BroadcastHelper } from '../../utils/broadcastHelper';
import { createProduct, createCategory, createUser, resetAllFactories } from '../../test/factories';

// Get mock references
const mockSupabaseFrom = supabase.from as jest.Mock;

describe('ProductAdminService - Refactored Infrastructure', () => {
  let testProducts: any[];
  let testCategories: any[];
  let testAdmin: any;

  beforeEach(() => {
    // Reset all factory counters for consistent test data
    resetAllFactories();
    
    // Create test data using factories
    testAdmin = createUser({
      id: 'admin-123',
      name: 'Admin User',
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
        category_id: testCategories[0].id,
        price: 1.50,
        stock_quantity: 100,
        status: 'active'
      }),
      createProduct({
        id: 'product-2',
        name: 'Banana',
        category_id: testCategories[0].id,
        price: 0.99,
        stock_quantity: 50,
        status: 'active'
      })
    ];
    
    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    it('should create new product successfully', async () => {
      const newProduct = {
        name: 'Orange',
        category_id: testCategories[0].id,
        price: 2.00,
        stock_quantity: 75,
        description: 'Fresh oranges'
      };

      const createdProduct = { ...newProduct, id: 'product-3', created_at: new Date().toISOString() };
      
      mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createdProduct,
          error: null
        })
      });

      const result = await productAdminService.createProduct(newProduct);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.product).toBeDefined();
      expect(mockSupabaseFrom).toHaveBeenCalledWith('products');
      expect(BroadcastHelper.productUpdated).toHaveBeenCalled();
    });

    it('should validate product data', async () => {
      const invalidProduct = {
        name: '', // Invalid: empty name
        category_id: testCategories[0].id,
        price: -1, // Invalid: negative price
        stock_quantity: 75
      };

      const result = await productAdminService.createProduct(invalidProduct);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle database errors', async () => {
      const newProduct = {
        name: 'Orange',
        category_id: testCategories[0].id,
        price: 2.00,
        stock_quantity: 75
      };

      mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      });

      const result = await productAdminService.createProduct(newProduct);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      const updates = {
        name: 'Updated Apple',
        price: 1.75
      };

      const updatedProduct = { ...testProducts[0], ...updates };
      
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: updatedProduct,
          error: null
        })
      });

      const result = await productAdminService.updateProduct(testProducts[0].id, updates);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.product).toBeDefined();
      expect(mockSupabaseFrom).toHaveBeenCalledWith('products');
      expect(BroadcastHelper.productUpdated).toHaveBeenCalled();
    });

    it('should handle invalid product ID', async () => {
      const updates = {
        name: 'Updated Product'
      };

      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Product not found' }
        })
      });

      const result = await productAdminService.updateProduct('invalid-id', updates);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate update data', async () => {
      const invalidUpdates = {
        price: -10 // Invalid: negative price
      };

      const result = await productAdminService.updateProduct(testProducts[0].id, invalidUpdates);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      // Check for existing orders
      mockSupabaseFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      });

      // Delete product
      mockSupabaseFrom.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      });

      const result = await productAdminService.deleteProduct(testProducts[0].id);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(BroadcastHelper.productDeleted).toHaveBeenCalled();
    });

    it('should handle non-existent product', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      });

      mockSupabaseFrom.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Product not found' }
        })
      });

      const result = await productAdminService.deleteProduct('non-existent-id');

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });

    it('should prevent deletion of products with existing orders', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ id: 'order-1' }], // Has orders
          error: null
        })
      });

      const result = await productAdminService.deleteProduct(testProducts[0].id);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toContain('existing orders');
    });
  });

  describe('getAllProducts', () => {
    it('should fetch all products successfully', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: testProducts,
          error: null
        })
      });

      const result = await productAdminService.getAllProducts();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(2);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('products');
    });

    it('should filter products by category', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [testProducts[0]],
          error: null
        })
      });

      const result = await productAdminService.getAllProducts({ category_id: testCategories[0].id });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(1);
    });

    it('should filter products by status', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: testProducts,
          error: null
        })
      });

      const result = await productAdminService.getAllProducts({ status: 'active' });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('bulkUpdateStock', () => {
    it('should update multiple product stocks', async () => {
      const stockUpdates = [
        { product_id: testProducts[0].id, stock_quantity: 150 },
        { product_id: testProducts[1].id, stock_quantity: 75 }
      ];

      // Mock each update
      stockUpdates.forEach((update, index) => {
        mockSupabaseFrom.mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...testProducts[index], stock_quantity: update.stock_quantity },
            error: null
          })
        });
      });

      const result = await productAdminService.bulkUpdateStock(stockUpdates);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(2);
      expect(BroadcastHelper.stockUpdated).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures', async () => {
      const stockUpdates = [
        { product_id: testProducts[0].id, stock_quantity: 150 },
        { product_id: 'invalid-id', stock_quantity: 75 }
      ];

      // First update succeeds
      mockSupabaseFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...testProducts[0], stock_quantity: 150 },
          error: null
        })
      });

      // Second update fails
      mockSupabaseFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Product not found' }
        })
      });

      const result = await productAdminService.bulkUpdateStock(stockUpdates);

      expect(result).toBeDefined();
      expect(result.success).toBe(true); // Partial success
      expect(result.totalProcessed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('getLowStockProducts', () => {
    it('should fetch low stock products', async () => {
      const lowStockProducts = [testProducts[1]]; // Banana with stock_quantity: 50

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: lowStockProducts,
          error: null
        })
      });

      const result = await productAdminService.getLowStockProducts({ threshold: 60 });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(1);
    });

    it('should use default threshold', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      });

      const result = await productAdminService.getLowStockProducts();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('getOutOfStockProducts', () => {
    it('should fetch out of stock products', async () => {
      const outOfStockProducts = [
        { ...testProducts[0], stock_quantity: 0 }
      ];

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: outOfStockProducts,
          error: null
        })
      });

      const result = await productAdminService.getOutOfStockProducts();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.products).toBeDefined();
    });

    it('should handle empty results', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      });

      const result = await productAdminService.getOutOfStockProducts();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.products).toEqual([]);
    });
  });

  describe('getAllCategories', () => {
    it('should fetch all categories', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: testCategories,
          error: null
        })
      });

      const result = await productAdminService.getAllCategories();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.categories).toHaveLength(2);
    });

    it('should handle database errors', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      });

      const result = await productAdminService.getAllCategories();

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockSupabaseFrom.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await productAdminService.getAllProducts();

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should provide meaningful error messages', async () => {
      const invalidProduct = {
        name: '',
        price: -1,
        stock_quantity: -10
      };

      const result = await productAdminService.createProduct(invalidProduct);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.userMessage).toBeDefined();
    });

    it('should handle validation failures', async () => {
      const invalidUpdates = {
        price: 'not-a-number', // Invalid type
        stock_quantity: -1 // Invalid value
      };

      const result = await productAdminService.updateProduct(testProducts[0].id, invalidUpdates);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});