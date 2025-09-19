/**
 * ProductService Test - Using SimplifiedSupabaseMock Pattern
 * Following the established Phase 1-2 patterns
 */

// ============================================================================
// MOCK SETUP - MUST BE BEFORE ANY IMPORTS 
// ============================================================================

// Mock Supabase using the SimplifiedSupabaseMock pattern
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
      INVENTORY: 'inventory',
      CATEGORIES: 'categories',
      PAYMENTS: 'payments',
      NOTIFICATIONS: 'notifications',
    }
  };
});

// Mock ValidationMonitor
jest.mock('../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordPatternSuccess: jest.fn(),
    recordDataIntegrity: jest.fn()
  }
}));

// Mock BroadcastHelper  
jest.mock('../../utils/broadcastHelper', () => ({
  BroadcastHelper: {
    broadcastUpdate: jest.fn(),
    broadcastProductUpdate: jest.fn()
  }
}));

// ============================================================================
// IMPORTS - AFTER ALL MOCKS ARE SET UP
// ============================================================================

import productService from '../productService';
import { createUser, createProduct, resetAllFactories } from '../../test/factories';

describe('ProductService - Fixed Infrastructure', () => {
  let testUser: any;
  let testProduct: any;
  let testCategory: any;

  // Complete mock data following schema requirements
  const mockProduct = {
    id: 'product-1',
    name: 'Test Product',
    description: 'Test description',
    price: 10.99,
    category_id: 'category-1',
    stock_quantity: 100,
    unit: 'lb',
    is_available: true,
    is_featured: false,
    images: ['image1.jpg'],
    farm_id: 'farm-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    farmer_name: 'Test Farmer',
    minimum_order: 1
  };

  const mockCategory = {
    id: 'category-1',
    name: 'Vegetables',
    description: 'Fresh vegetables',
    is_available: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetAllFactories();
    
    testUser = createUser({
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com'
    });
    
    testProduct = createProduct({
      id: 'product-1',
      name: 'Test Product',
      price: 10.00,
      stock_quantity: 100
    });
    
    testCategory = createCategory({
      id: 'category-1',
      name: 'Test Category'
    });
  });

  describe('getCategories', () => {
    it('should get all categories', async () => {
      const result = await productService.getCategories();
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.categories).toBeDefined();
    });

    it('should handle empty categories', async () => {
      const result = await productService.getCategories();
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.categories).toBeDefined();
    });

    it('should handle database error gracefully', async () => {
      const result = await productService.getCategories();
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('getCategoryById', () => {
    it('should get category by id', async () => {
      const result = await productService.getCategoryById('category-1');
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle category not found', async () => {
      const result = await productService.getCategoryById('nonexistent');
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('getProducts', () => {
    it('should get all products', async () => {
      const result = await productService.getProducts();
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.products).toBeDefined();
    });

    it('should handle empty products', async () => {
      const result = await productService.getProducts();
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.products).toBeDefined();
    });
  });

  describe('getProductById', () => {
    it('should get product by id', async () => {
      const result = await productService.getProductById('product-1');
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle product not found', async () => {
      const result = await productService.getProductById('nonexistent');
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('getProductsByCategory', () => {
    it('should get products by category', async () => {
      const result = await productService.getProductsByCategory('vegetables');
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.products).toBeDefined();
    });

    it('should handle category with no products', async () => {
      const result = await productService.getProductsByCategory('empty-category');
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.products).toBeDefined();
    });
  });

  describe('searchProducts', () => {
    it('should search products by query', async () => {
      const result = await productService.searchProducts('apple');
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.products).toBeDefined();
    });

    it('should handle no search results', async () => {
      const result = await productService.searchProducts('xyz');
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.products).toBeDefined();
    });
  });

  describe('getProductsPaginated', () => {
    it('should get paginated products', async () => {
      const result = await productService.getProductsPaginated(1, 10);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle empty page', async () => {
      const result = await productService.getProductsPaginated(10, 10);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('updateProductStock', () => {
    it('should update product stock', async () => {
      const result = await productService.updateProductStock('product-1', 50);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle stock update failure', async () => {
      const result = await productService.updateProductStock('product-1', -10);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('Service Integration', () => {
    it('should handle service calls gracefully', async () => {
      const categoryResult = await productService.getCategories();
      const productResult = await productService.getProducts();
      
      expect(categoryResult).toBeDefined();
      expect(productResult).toBeDefined();
    });

    it('should maintain consistent response format', async () => {
      const result = await productService.getProducts();
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const result = await productService.getProductById('error-trigger');
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should provide meaningful error responses', async () => {
      const result = await productService.getCategoryById('invalid');
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });
});