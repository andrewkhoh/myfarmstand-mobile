/**
 * ProductService.getProductById Test - REFACTORED  
 * Testing getProductById with schema fix and simplified mocks and factories
 */

import { getProductById } from '../productService';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { createProduct, createCategory, resetAllFactories } from '../../test/factories';

// Replace complex mock setup with simple data-driven mock
jest.mock('../../config/supabase', () => ({
  supabase: null // Will be set in beforeEach
}));

// Mock DefensiveDatabase 
jest.mock('../../utils/defensiveDatabase', () => ({
  DefensiveDatabase: {
    fetchSingleWithValidation: jest.fn()
  }
}));

import { DefensiveDatabase } from '../../utils/defensiveDatabase';

describe('ProductService.getProductById - REFACTORED', () => {
  let supabaseMock: any;
  let mockFetchSingleWithValidation: jest.MockedFunction<typeof DefensiveDatabase.fetchSingleWithValidation>;
  
  beforeEach(() => {
    // Reset factory counter for consistent IDs
    resetAllFactories();
    
    // Create mock with initial data
    supabaseMock = createSupabaseMock();
    
    // Inject mock
    require('../../config/supabase').supabase = supabaseMock;
    
    // Setup DefensiveDatabase mock
    mockFetchSingleWithValidation = DefensiveDatabase.fetchSingleWithValidation as jest.MockedFunction<typeof DefensiveDatabase.fetchSingleWithValidation>;
    jest.clearAllMocks();
  });

  describe('Database Structure Transformation', () => {
    it('should handle product with categories field from database', async () => {
      // Create test data using factories
      const testCategory = createCategory({
        id: 'cat-123',
        name: 'Test Category',
        description: 'Test category description'
      });
      
      const testProduct = createProduct({
        id: 'prod-123',
        name: 'Test Product',
        description: 'Test description',
        price: 9.99,
        stock_quantity: 10,
        category_id: 'cat-123',
        is_available: true
      });
      
      // Mock database response with categories field (not category)
      const mockDatabaseProduct = {
        ...testProduct,
        categories: testCategory // Database returns 'categories' field
      };

      mockFetchSingleWithValidation.mockResolvedValue(mockDatabaseProduct);

      const result = await getProductById('prod-123');

      expect(result.success).toBe(true);
      expect(result.product).toBeDefined();
      expect(result.product?.id).toBe('prod-123');
      expect(result.product?.name).toBe('Test Product');
      
      // Verify the category transformation worked
      expect((result.product as any)?.category).toBeDefined();
      expect((result.product as any)?.category?.name).toBe('Test Category');
      expect((result.product as any)?.category?.isActive).toBe(true);
    });

    it('should handle product with null categories field', async () => {
      const testProduct = createProduct({
        id: 'prod-456',
        name: 'Product Without Category',
        price: 5.99,
        stock_quantity: 5,
        category_id: 'cat-456',
        is_available: true
      });
      
      const mockDatabaseProduct = {
        ...testProduct,
        categories: null  // Database returns null for categories
      };

      mockFetchSingleWithValidation.mockResolvedValue(mockDatabaseProduct);

      const result = await getProductById('prod-456');

      expect(result.success).toBe(true);
      expect(result.product).toBeDefined();
      expect(result.product?.id).toBe('prod-456');
      // Note: null categories becomes undefined after transformation
      expect((result.product as any)?.category).toBeUndefined();
    });

    it('should handle product with categories having nullable fields', async () => {
      const testProduct = createProduct({
        id: 'prod-789',
        name: 'Product With Nullable Category Fields',
        price: 15.99,
        stock_quantity: 20,
        category_id: 'cat-789',
        is_available: true,
        is_bundle: true
      });
      
      const categoryWithNulls = createCategory({
        id: 'cat-789',
        name: 'Category With Nulls',
        description: null,
        image_url: null,
        sort_order: null,
        is_available: null
      });
      
      const mockDatabaseProduct = {
        ...testProduct,
        categories: {
          ...categoryWithNulls,
          created_at: null,
          updated_at: null
        }
      };

      mockFetchSingleWithValidation.mockResolvedValue(mockDatabaseProduct);

      const result = await getProductById('prod-789');

      expect(result.success).toBe(true);
      expect(result.product).toBeDefined();
      
      // Verify nullable field handling
      const category = (result.product as any)?.category;
      expect(category).toBeDefined();
      expect(category.name).toBe('Category With Nulls');
      expect(category.isActive).toBe(true);      // Default for null is_available
      expect(category.createdAt).toBe('');       // Default for null created_at
      expect(category.updatedAt).toBe('');       // Default for null updated_at
      expect(category.description).toBeUndefined(); // null becomes undefined
    });
  });

  describe('Error Handling', () => {
    it('should handle when DefensiveDatabase returns null', async () => {
      mockFetchSingleWithValidation.mockResolvedValue(null);

      const result = await getProductById('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Product not found');
      expect(result.product).toBeNull();
    });

    it('should handle validation errors gracefully', async () => {
      // Mock invalid data that will fail schema validation
      const invalidDatabaseProduct = {
        id: '', // Invalid - empty string
        name: '', // Invalid - empty string
        // Missing required fields
      };

      mockFetchSingleWithValidation.mockResolvedValue(invalidDatabaseProduct);

      const result = await getProductById('invalid-prod');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid product data received from server');
      expect(result.product).toBeNull();
    });

    it('should handle database connection errors', async () => {
      mockFetchSingleWithValidation.mockRejectedValue(new Error('Connection failed'));

      const result = await getProductById('prod-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch product');
      expect(result.product).toBeNull();
    });
  });

  describe('Regression Test - Schema Validation Fix', () => {
    it('should handle the exact scenario that caused undefined fields error', async () => {
      // Create a realistic product that previously caused validation errors
      const testCategory = createCategory({
        id: 'cat-problem',
        name: 'Problem Category',
        description: 'Category that caused issues'
      });
      
      const testProduct = createProduct({
        id: 'prod-problem',
        name: 'Problem Product',
        description: 'This product caused validation errors',
        price: 12.99,
        stock_quantity: 15,
        category_id: 'cat-problem',
        is_available: true,
        is_weekly_special: false,
        is_bundle: false
      });
      
      const problematicProduct = {
        ...testProduct,
        categories: testCategory
      };

      mockFetchSingleWithValidation.mockResolvedValue(problematicProduct);

      // This should NOT throw validation errors anymore
      const result = await getProductById('prod-problem');

      expect(result.success).toBe(true);
      expect(result.product).toBeDefined();
      expect(result.product?.id).toBe('prod-problem');
      expect(result.product?.name).toBe('Problem Product');
      expect((result.product as any)?.category?.name).toBe('Problem Category');
    });

    it('should validate all required product fields are present', async () => {
      const completeProduct = createProduct({
        id: 'prod-complete',
        name: 'Complete Product',
        description: 'Product with all fields',
        price: 19.99,
        stock_quantity: 25,
        category_id: 'cat-complete',
        is_available: true
      });
      
      const completeCategory = createCategory({
        id: 'cat-complete',
        name: 'Complete Category'
      });
      
      mockFetchSingleWithValidation.mockResolvedValue({
        ...completeProduct,
        categories: completeCategory
      });

      const result = await getProductById('prod-complete');

      expect(result.success).toBe(true);
      expect(result.product).toBeDefined();
      
      // Verify all key fields are properly transformed
      const product = result.product!;
      expect(product.id).toBe('prod-complete');
      expect(product.name).toBe('Complete Product');
      expect(product.price).toBe(19.99);
      expect(product.stock_quantity).toBe(25);
      expect(product.is_available).toBe(true);
    });
  });
});