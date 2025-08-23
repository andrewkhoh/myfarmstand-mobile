/**
 * ProductService Test - REFACTORED EXAMPLE
 * 
 * This demonstrates the new testing pattern:
 * - Schema-validated test data via factories
 * - Simplified mocking without chains
 * - Contract validation on outputs
 * - Clear, maintainable test structure
 */

import { productService } from '../productService';
import { ProductFactory } from '../../test/factories/product.factory';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { ProductSchema, ProductListSchema } from '../../schemas/product.schema';
import { validateServiceOutput } from '../../test/contracts/service.contracts';

// Replace complex mock setup with simple data-driven mock
jest.mock('../../config/supabase', () => ({
  supabase: null // Will be set in beforeEach
}));

describe('ProductService - Refactored Pattern', () => {
  let supabaseMock: any;
  
  beforeEach(() => {
    // Reset factory counter for consistent IDs
    ProductFactory.reset();
    
    // Create mock with initial data
    supabaseMock = createSupabaseMock({
      products: ProductFactory.createMany(3),
      categories: [
        { id: 'cat-1', name: 'Fruits', is_available: true },
        { id: 'cat-2', name: 'Vegetables', is_available: true }
      ]
    });
    
    // Inject mock
    require('../../config/supabase').supabase = supabaseMock;
  });

  describe('getProducts', () => {
    it('should return schema-valid products', async () => {
      // Test data is already schema-validated by factory
      const mockProducts = ProductFactory.createMany(3);
      
      // Update mock data
      supabaseMock = createSupabaseMock({
        products: mockProducts
      });
      require('../../config/supabase').supabase = supabaseMock;
      
      // Call service
      const result = await productService.getProducts();
      
      // Validate output matches schema contract
      const validated = ProductListSchema.parse(result);
      expect(validated).toHaveLength(3);
      expect(validated[0].name).toBe('Test Product 1');
    });

    it('should filter by category', async () => {
      // Create products with specific categories
      const fruits = ProductFactory.createMany(2, { category_id: 'cat-1' });
      const vegetables = ProductFactory.createMany(3, { category_id: 'cat-2' });
      
      supabaseMock = createSupabaseMock({
        products: [...fruits, ...vegetables]
      });
      require('../../config/supabase').supabase = supabaseMock;
      
      // Test category filter
      const result = await productService.getProducts({ 
        categoryId: 'cat-1' 
      });
      
      // Contract validation
      const validated = ProductListSchema.parse(result);
      expect(validated).toHaveLength(2);
      validated.forEach(product => {
        expect(product.category_id).toBe('cat-1');
      });
    });

    it('should handle out-of-stock products', async () => {
      // Use specialized factory methods
      const inStock = ProductFactory.create({ stock_quantity: 10 });
      const outOfStock = ProductFactory.createOutOfStock();
      const preOrder = ProductFactory.createPreOrder();
      
      supabaseMock = createSupabaseMock({
        products: [inStock, outOfStock, preOrder]
      });
      require('../../config/supabase').supabase = supabaseMock;
      
      const result = await productService.getAvailableProducts();
      
      // Validate business logic
      const validated = ProductListSchema.parse(result);
      expect(validated).toHaveLength(2); // In-stock and pre-order
      expect(validated.find(p => p.id === outOfStock.id)).toBeUndefined();
    });
  });

  describe('getProductById', () => {
    it('should return single schema-valid product', async () => {
      const product = ProductFactory.create({ 
        id: 'specific-id',
        name: 'Specific Product' 
      });
      
      supabaseMock = createSupabaseMock({
        products: [product]
      });
      require('../../config/supabase').supabase = supabaseMock;
      
      const result = await productService.getProductById('specific-id');
      
      // Contract validation for single product
      const validated = ProductSchema.parse(result);
      expect(validated.id).toBe('specific-id');
      expect(validated.name).toBe('Specific Product');
    });

    it('should handle product not found', async () => {
      supabaseMock = createSupabaseMock({
        products: []
      });
      require('../../config/supabase').supabase = supabaseMock;
      
      await expect(
        productService.getProductById('non-existent')
      ).rejects.toThrow('Product not found');
    });
  });

  describe('createProduct', () => {
    it('should create product with schema validation', async () => {
      const newProduct = {
        name: 'New Product',
        price: 15.99,
        stock_quantity: 50,
        category_id: 'cat-1'
      };
      
      supabaseMock = createSupabaseMock();
      require('../../config/supabase').supabase = supabaseMock;
      
      const result = await productService.createProduct(newProduct);
      
      // Validate created product matches schema
      const validated = ProductSchema.parse(result);
      expect(validated.name).toBe('New Product');
      expect(validated.price).toBe(15.99);
    });

    it('should reject invalid product data', async () => {
      const invalidProduct = {
        name: '', // Empty name should fail validation
        price: -10, // Negative price should fail
        stock_quantity: 'not a number' // Wrong type
      };
      
      await expect(
        productService.createProduct(invalidProduct as any)
      ).rejects.toThrow();
    });
  });

  describe('updateProduct', () => {
    it('should update product maintaining schema validity', async () => {
      const original = ProductFactory.create({ 
        id: 'update-test',
        price: 10.00 
      });
      
      supabaseMock = createSupabaseMock({
        products: [original]
      });
      require('../../config/supabase').supabase = supabaseMock;
      
      const updates = { price: 12.99 };
      const result = await productService.updateProduct('update-test', updates);
      
      // Validate updated product
      const validated = ProductSchema.parse(result);
      expect(validated.price).toBe(12.99);
      expect(validated.id).toBe('update-test');
    });
  });

  describe('Contract Validation', () => {
    it('should ensure all service methods return schema-valid data', async () => {
      // This is a meta-test to ensure contract compliance
      const methods = [
        { name: 'getProducts', args: [], schema: ProductListSchema },
        { name: 'getProductById', args: ['product-1'], schema: ProductSchema }
      ];
      
      for (const method of methods) {
        const result = await (productService as any)[method.name](...method.args);
        
        // Should not throw
        expect(() => validateServiceOutput(result, method.schema)).not.toThrow();
      }
    });
  });
});

/**
 * Benefits of this refactored approach:
 * 
 * 1. **Simpler Mocks**: No complex chain mocking
 * 2. **Schema Validation**: All test data is validated
 * 3. **Readable Tests**: Clear intent and structure
 * 4. **Maintainable**: Easy to update when schemas change
 * 5. **Reusable**: Factories can be shared across tests
 * 6. **Contract Testing**: Service outputs are validated
 */