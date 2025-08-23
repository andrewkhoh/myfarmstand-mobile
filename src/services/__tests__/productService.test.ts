/**
 * ProductService Test - REFACTORED
 * Testing product management functionality with simplified mocks and factories
 */

import productService from '../productService';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { createProduct, createCategory, resetAllFactories } from '../../test/factories';

// Replace complex mock setup with simple data-driven mock
jest.mock('../../config/supabase', () => ({
  supabase: null // Will be set in beforeEach
}));

describe('ProductService', () => {
  let supabaseMock: any;
  let testProducts: any[];
  let testCategory: any;
  
  beforeEach(() => {
    // Reset factory counter for consistent IDs
    resetAllFactories();
    
    // Create test data using factories
    testCategory = createCategory({
      id: 'cat-1',
      name: 'Test Category',
      description: 'Test Description'
    });
    
    testProducts = [
      createProduct({ 
        id: 'product-1',
        name: 'Test Product 1',
        description: 'A test product for testing',
        price: 10.00,
        stock_quantity: 5,
        category_id: 'cat-1',
        is_available: true
      }),
      createProduct({ 
        id: 'product-2',
        name: 'Test Product 2',
        description: 'Another test product',
        price: 15.00,
        stock_quantity: 0,
        category_id: 'cat-1',
        is_available: false
      })
    ];
    
    // Create mock with initial data
    supabaseMock = createSupabaseMock({
      products: testProducts,
      categories: [testCategory]
    });
    
    // Inject mock
    require('../../config/supabase').supabase = supabaseMock;
  });

  describe('getProducts', () => {
    it('should get all available products successfully', async () => {
      const result = await productService.getProducts();
      
      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(1); // Only available products
      expect(result.products![0].name).toBe('Test Product 1');
      expect(result.products![0].is_available).toBe(true);
    });

    it('should handle database errors', async () => {
      supabaseMock = createSupabaseMock();
      supabaseMock.queueError(new Error('Database connection failed'));
      require('../../config/supabase').supabase = supabaseMock;

      const result = await productService.getProducts();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch products');
    });

    it('should return empty array when no products available', async () => {
      supabaseMock = createSupabaseMock({
        products: [] // No products
      });
      require('../../config/supabase').supabase = supabaseMock;

      const result = await productService.getProducts();
      
      expect(result.success).toBe(true);
      expect(result.products).toEqual([]);
    });
  });

  describe('getProductById', () => {
    it('should get product by ID successfully', async () => {
      const result = await productService.getProductById('product-1');
      
      expect(result.success).toBe(true);
      expect(result.product?.id).toBe('product-1');
      expect(result.product?.name).toBe('Test Product 1');
    });

    it('should handle product not found', async () => {
      const result = await productService.getProductById('invalid-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Product not found');
    });

    it('should handle database errors', async () => {
      supabaseMock.queueError(new Error('Database error'));

      const result = await productService.getProductById('product-1');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch product');
    });
  });

  describe('getProductsByCategory', () => {
    it('should get products by category', async () => {
      const result = await productService.getProductsByCategory('cat-1');
      
      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(1); // Only available products
      expect(result.products![0].category_id).toBe('cat-1');
    });

    it('should return empty array for non-existent category', async () => {
      const result = await productService.getProductsByCategory('invalid-cat');
      
      expect(result.success).toBe(true);
      expect(result.products).toEqual([]);
    });

    it('should handle database errors', async () => {
      supabaseMock.queueError(new Error('Database error'));

      const result = await productService.getProductsByCategory('cat-1');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch products');
    });
  });

  describe('searchProducts', () => {
    it('should search products by name', async () => {
      const result = await productService.searchProducts('Test Product 1');
      
      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(1);
      expect(result.products![0].name).toBe('Test Product 1');
    });

    it('should search products case insensitively', async () => {
      const result = await productService.searchProducts('test');
      
      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(1);
    });

    it('should return empty array for no matches', async () => {
      const result = await productService.searchProducts('nonexistent');
      
      expect(result.success).toBe(true);
      expect(result.products).toEqual([]);
    });

    it('should handle database errors', async () => {
      supabaseMock.queueError(new Error('Search failed'));

      const result = await productService.searchProducts('test');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to search products');
    });
  });

  describe('updateProductStock', () => {
    it('should update product stock successfully', async () => {
      const result = await productService.updateProductStock('product-1', 15);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Product stock updated to 15');
    });

    it('should handle invalid product ID', async () => {
      const result = await productService.updateProductStock('invalid-id', 10);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Product not found');
    });

    it('should validate stock quantity', async () => {
      const result = await productService.updateProductStock('product-1', -1);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Stock quantity must be non-negative');
    });

    it('should handle database errors', async () => {
      supabaseMock.queueError(new Error('Update failed'));

      const result = await productService.updateProductStock('product-1', 10);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to update product stock');
    });
  });
});