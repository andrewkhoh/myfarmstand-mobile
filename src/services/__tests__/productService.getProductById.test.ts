/**
 * Test for ProductService.getProductById Schema Fix
 * 
 * This test validates that getProductById correctly handles the database
 * structure transformation after the schema validation fix
 */

import { getProductById } from '../productService';
import { supabase } from '../../config/supabase';

// Mock the supabase client
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      }))
    }))
  }
}));

// Mock DefensiveDatabase 
jest.mock('../../utils/defensiveDatabase', () => ({
  DefensiveDatabase: {
    fetchSingleWithValidation: jest.fn()
  }
}));

import { DefensiveDatabase } from '../../utils/defensiveDatabase';

describe('ProductService.getProductById Schema Fix', () => {
  const mockFetchSingleWithValidation = DefensiveDatabase.fetchSingleWithValidation as jest.MockedFunction<typeof DefensiveDatabase.fetchSingleWithValidation>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Structure Transformation', () => {
    it('should handle product with categories field from database', async () => {
      // Mock database response with categories field (not category)
      const mockDatabaseProduct = {
        id: 'prod-123',
        name: 'Test Product',
        description: 'Test description',
        price: 9.99,
        stock_quantity: 10,
        category_id: 'cat-123',
        image_url: 'https://example.com/image.jpg',
        is_weekly_special: false,
        is_bundle: false,
        seasonal_availability: true,
        unit: 'lb',
        weight: 1.0,
        sku: 'TEST-001',
        tags: ['test'],
        nutrition_info: null,
        is_available: true,
        is_pre_order: false,
        pre_order_available_date: null,
        min_pre_order_quantity: null,
        max_pre_order_quantity: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        categories: {  // Database returns 'categories' field
          id: 'cat-123',
          name: 'Test Category',
          description: 'Test category description',
          image_url: 'https://example.com/cat.jpg',
          sort_order: 1,
          is_available: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        }
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
      expect((result.product as any)?.category?.isActive).toBe(true); // Transformed from is_available
    });

    it('should handle product with null categories field', async () => {
      const mockDatabaseProduct = {
        id: 'prod-456',
        name: 'Product Without Category',
        description: 'Test description',
        price: 5.99,
        stock_quantity: 5,
        category_id: 'cat-456',
        image_url: 'https://example.com/image2.jpg',
        is_weekly_special: true,
        is_bundle: false,
        seasonal_availability: false,
        unit: 'each',
        weight: 0.5,
        sku: 'TEST-002',
        tags: [],
        nutrition_info: null,
        is_available: true,
        is_pre_order: false,
        pre_order_available_date: null,
        min_pre_order_quantity: null,
        max_pre_order_quantity: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        categories: null  // Database returns null for categories
      };

      mockFetchSingleWithValidation.mockResolvedValue(mockDatabaseProduct);

      const result = await getProductById('prod-456');

      expect(result.success).toBe(true);
      expect(result.product).toBeDefined();
      expect(result.product?.id).toBe('prod-456');
      // Note: null categories becomes undefined after transformation, which is correct
      expect((result.product as any)?.category).toBeUndefined();
    });

    it('should handle product with categories having nullable fields', async () => {
      const mockDatabaseProduct = {
        id: 'prod-789',
        name: 'Product With Nullable Category Fields',
        description: 'Test description',
        price: 15.99,
        stock_quantity: 20,
        category_id: 'cat-789',
        image_url: 'https://example.com/image3.jpg',
        is_weekly_special: false,
        is_bundle: true,
        seasonal_availability: true,
        unit: 'lb',
        weight: 2.0,
        sku: 'TEST-003',
        tags: ['organic', 'fresh'],
        nutrition_info: null,
        is_available: true,
        is_pre_order: false,
        pre_order_available_date: null,
        min_pre_order_quantity: null,
        max_pre_order_quantity: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        categories: {
          id: 'cat-789',
          name: 'Category With Nulls',
          description: null,           // Nullable
          image_url: null,            // Nullable
          sort_order: null,           // Nullable
          is_available: null,         // Nullable - should default to true
          created_at: null,           // Nullable - should default to ''
          updated_at: null            // Nullable - should default to ''
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
  });

  describe('Regression Test - The Exact Error Case', () => {
    it('should handle the exact scenario that caused undefined fields error', async () => {
      // This simulates the exact case where all fields were undefined
      const problematicProduct = {
        // All the fields that were showing as "undefined" in the error
        id: 'prod-problem',
        name: 'Problem Product',
        description: 'This product caused validation errors',
        price: 12.99,
        stock_quantity: 15,
        category_id: 'cat-problem',
        is_available: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        // Additional required fields
        image_url: 'https://example.com/problem.jpg',
        is_weekly_special: false,
        is_bundle: false,
        seasonal_availability: true,
        unit: 'each',
        weight: 1.0,
        sku: 'PROB-001',
        tags: [],
        nutrition_info: null,
        is_pre_order: false,
        pre_order_available_date: null,
        min_pre_order_quantity: null,
        max_pre_order_quantity: null,
        categories: {
          id: 'cat-problem',
          name: 'Problem Category',
          description: 'Category that caused issues',
          image_url: null,
          sort_order: 1,
          is_available: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        }
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
  });
});