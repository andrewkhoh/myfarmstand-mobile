/**
 * Product Schema Tests
 * Following MyFarmstand Mobile Architectural Patterns
 */

import { z } from 'zod';
import {
  ProductSchema,
  CategorySchema,
  NutritionInfoSchema,
  DbProductSchema,
  DbCategorySchema,
  transformProductWithCategory,
  transformProduct,
  ProductArraySchema,
  CategoryArraySchema
} from '../product.schema';

describe('Product Schema Tests', () => {
  // 1️⃣ Database-First Validation Tests
  describe('Database Schema Validation', () => {
    it('should handle database nulls gracefully', () => {
      const dbData = {
        id: 'prod-123',
        name: 'Test Product',
        description: 'Test Description',
        price: 9.99,
        stock_quantity: null,
        category_id: 'cat-456',
        image_url: null,
        images: null,
        is_weekly_special: null,
        is_bundle: null,
        seasonal_availability: null,
        unit: null,
        weight: null,
        sku: null,
        tags: null,
        nutrition_info: null,
        is_available: null,
        is_pre_order: null,
        pre_order_available_date: null,
        min_pre_order_quantity: null,
        max_pre_order_quantity: null,
        created_at: null,
        updated_at: null
      };

      const result = ProductSchema.parse(dbData);
      
      // Should transform nulls to appropriate defaults
      expect(result.stock_quantity).toBeNull();
      expect(result.isActive).toBe(true); // Default for null boolean
      expect(result.isWeeklySpecial).toBe(false);
      expect(result.isBundle).toBe(false);
      expect(result.seasonalAvailability).toBe(false);
      expect(result.isPreOrder).toBe(false);
      expect(result.createdAt).toBe('');
      expect(result.updatedAt).toBe('');
    });

    it('should validate required fields from database', () => {
      const invalidData = {
        // Missing required fields
        name: 'Test Product',
        description: 'Test',
        price: 9.99
      };

      expect(() => DbProductSchema.parse(invalidData)).toThrow();
    });

    it('should validate minimum constraints', () => {
      const invalidData = {
        id: '', // Empty string should fail min(1)
        name: 'Test',
        description: 'Test',
        price: -1, // Negative price should fail
        stock_quantity: 10,
        category_id: 'cat-1'
      };

      expect(() => DbProductSchema.parse(invalidData)).toThrow();
    });
  });

  // 2️⃣ Transformation Tests (snake_case → mixed format)
  describe('Schema Transformation', () => {
    it('should transform snake_case to mixed format in one pass', () => {
      const dbData = {
        id: 'prod-123',
        name: '  Test Product  ', // With whitespace
        description: 'Test Description',
        price: 19.99,
        stock_quantity: 50,
        category_id: 'cat-456',
        image_url: 'https://example.com/image.jpg',
        images: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
        is_weekly_special: true,
        is_bundle: false,
        seasonal_availability: true,
        unit: 'lb',
        weight: 2.5,
        sku: 'SKU123',
        tags: ['organic', 'local'],
        nutrition_info: {
          calories: 100,
          protein: 5
        },
        is_available: true,
        is_pre_order: false,
        pre_order_available_date: '2025-02-01',
        min_pre_order_quantity: 1,
        max_pre_order_quantity: 10,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const result = ProductSchema.parse(dbData);
      
      // Verify snake_case fields are preserved
      expect(result.stock_quantity).toBe(50);
      expect(result.category_id).toBe('cat-456');
      expect(result.image_url).toBe('https://example.com/image.jpg');
      expect(result.is_weekly_special).toBe(true);
      
      // Verify camelCase legacy mappings
      expect(result.name).toBe('Test Product'); // Trimmed
      expect(result.categoryId).toBe('cat-456');
      expect(result.imageUrl).toBe('https://example.com/image.jpg');
      expect(result.isWeeklySpecial).toBe(true);
      expect(result.isBundle).toBe(false);
      expect(result.seasonalAvailability).toBe(true);
      expect(result.stock).toBe(50);
      expect(result.createdAt).toBe('2025-01-01T00:00:00Z');
      expect(result.updatedAt).toBe('2025-01-01T00:00:00Z');
    });

    it('should handle category transformation with separate data', () => {
      const product = {
        id: 'prod-123',
        name: 'Test Product',
        description: 'Test',
        price: 9.99,
        stock_quantity: 10,
        category_id: 'cat-456',
        is_available: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const categories = [{
        id: 'cat-456',
        name: 'Vegetables',
        description: 'Fresh vegetables',
        image_url: 'https://example.com/veg.jpg',
        sort_order: 1,
        is_available: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      }];

      const result = transformProductWithCategory(product, categories);
      
      expect(result.category).toBeDefined();
      expect(result.category?.id).toBe('cat-456');
      expect(result.category?.name).toBe('Vegetables');
      expect(result.category?.imageUrl).toBe('https://example.com/veg.jpg');
      expect(result.category?.isActive).toBe(true);
    });

    it('should handle missing category gracefully', () => {
      const product = {
        id: 'prod-123',
        name: 'Test Product',
        description: 'Test',
        price: 9.99,
        stock_quantity: 10,
        category_id: 'cat-999', // Non-existent category
        is_available: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const categories = [{
        id: 'cat-456',
        name: 'Vegetables'
      }];

      const result = transformProductWithCategory(product, categories);
      
      expect(result.category).toBeUndefined();
      expect(result.category_id).toBe('cat-999'); // Still has the ID
    });
  });

  // 3️⃣ Business Logic Validation
  describe('Business Rules', () => {
    it('should validate price constraints', () => {
      const invalidData = {
        id: 'prod-123',
        name: 'Test',
        description: 'Test',
        price: -10.00, // Negative price
        stock_quantity: 10,
        category_id: 'cat-1',
        is_available: true,
        created_at: '2025-01-01',
        updated_at: '2025-01-01'
      };

      expect(() => DbProductSchema.parse(invalidData)).toThrow();
    });

    it('should validate URL formats', () => {
      const invalidData = {
        id: 'prod-123',
        name: 'Test',
        description: 'Test',
        price: 10.00,
        stock_quantity: 10,
        category_id: 'cat-1',
        image_url: 'not-a-url', // Invalid URL
        is_available: true,
        created_at: '2025-01-01',
        updated_at: '2025-01-01'
      };

      expect(() => DbProductSchema.parse(invalidData)).toThrow();
    });

    it('should detect category_id mapping bugs', () => {
      const buggyInput = {
        id: 'prod-123',
        name: 'Test',
        description: 'Test',
        price: 10.00,
        stock_quantity: 10,
        category_id: 'cat-1',
        category: 'Vegetables', // This shouldn't be used for category_id
        is_available: true,
        created_at: '2025-01-01',
        updated_at: '2025-01-01'
      };

      // Should catch the bug if category_id is incorrectly set to category name
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = transformProductWithCategory(buggyInput, []);
      
      expect(result.category_id).toBe('cat-1'); // Should use category_id, not category
      expect(result.categoryId).toBe('cat-1');
      
      consoleWarnSpy.mockRestore();
    });
  });

  // 4️⃣ Edge Cases & Error Handling
  describe('Edge Cases', () => {
    it('should handle empty strings and whitespace', () => {
      const data = {
        id: 'prod-123',
        name: '  Product with spaces  ',
        description: 'Test',
        price: 9.99,
        stock_quantity: 0,
        category_id: 'cat-1',
        unit: '',
        sku: '',
        is_available: true,
        created_at: '',
        updated_at: ''
      };

      const result = ProductSchema.parse(data);
      expect(result.name).toBe('Product with spaces'); // Trimmed
      expect(result.unit).toBe('');
      expect(result.sku).toBe('');
      expect(result.createdAt).toBe('');
      expect(result.updatedAt).toBe('');
    });

    it('should handle extreme values', () => {
      const largeData = {
        id: 'prod-123',
        name: 'Test',
        description: 'Test',
        price: 999999.99,
        stock_quantity: 999999,
        category_id: 'cat-1',
        weight: 9999.99,
        min_pre_order_quantity: 0,
        max_pre_order_quantity: 10000,
        is_available: true,
        created_at: '2025-01-01',
        updated_at: '2025-01-01'
      };

      const result = DbProductSchema.parse(largeData);
      expect(result.price).toBe(999999.99);
      expect(result.stock_quantity).toBe(999999);
      expect(result.weight).toBe(9999.99);
    });

    it('should provide clear error messages', () => {
      const invalidData = {
        id: 'prod-123',
        name: '', // Empty name
        description: '', // Empty description
        price: -1, // Negative price
        stock_quantity: 10,
        category_id: '', // Empty category
        is_available: true,
        created_at: '2025-01-01',
        updated_at: '2025-01-01'
      };

      expect(() => DbProductSchema.parse(invalidData))
        .toThrow(/min|String must contain at least 1 character/i);
    });
  });

  // 5️⃣ Array Processing
  describe('Array Operations', () => {
    it('should handle arrays with individual validation', () => {
      const dataArray = [
        {
          id: 'prod-1',
          name: 'Product 1',
          description: 'Test 1',
          price: 9.99,
          stock_quantity: 10,
          category_id: 'cat-1',
          is_available: true,
          created_at: '2025-01-01',
          updated_at: '2025-01-01'
        },
        {
          id: 'prod-2',
          name: 'Product 2',
          description: 'Test 2',
          price: 19.99,
          stock_quantity: 20,
          category_id: 'cat-2',
          is_available: false,
          created_at: '2025-01-01',
          updated_at: '2025-01-01'
        }
      ];

      const results = ProductArraySchema.parse(dataArray);
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('prod-1');
      expect(results[1].id).toBe('prod-2');
    });

    it('should handle skip-on-error pattern for arrays', () => {
      const mixedArray = [
        {
          id: 'prod-1',
          name: 'Valid Product',
          description: 'Test',
          price: 9.99,
          stock_quantity: 10,
          category_id: 'cat-1',
          is_available: true,
          created_at: '2025-01-01',
          updated_at: '2025-01-01'
        },
        {
          // Invalid - missing required fields
          name: 'Invalid Product'
        },
        {
          id: 'prod-3',
          name: 'Another Valid',
          description: 'Test',
          price: 29.99,
          stock_quantity: 30,
          category_id: 'cat-3',
          is_available: true,
          created_at: '2025-01-01',
          updated_at: '2025-01-01'
        }
      ];

      // Process with skip-on-error pattern
      const results = mixedArray.map(item => {
        try {
          return ProductSchema.parse(item);
        } catch (error) {
          console.warn(`Skipping invalid item: ${JSON.stringify(item)}`);
          return null;
        }
      }).filter(Boolean);

      expect(results).toHaveLength(2);
      expect(results[0]?.id).toBe('prod-1');
      expect(results[1]?.id).toBe('prod-3');
    });
  });

  // 6️⃣ Category Schema Tests
  describe('Category Schema', () => {
    it('should transform category with null handling', () => {
      const dbCategory = {
        id: 'cat-123',
        name: 'Vegetables',
        description: null,
        image_url: null,
        sort_order: null,
        is_available: null,
        created_at: null,
        updated_at: null
      };

      const result = CategorySchema.parse(dbCategory);
      
      expect(result.id).toBe('cat-123');
      expect(result.name).toBe('Vegetables');
      expect(result.description).toBeUndefined();
      expect(result.imageUrl).toBeUndefined();
      expect(result.sortOrder).toBeUndefined();
      expect(result.isActive).toBe(true); // Default for null
      expect(result.createdAt).toBe('');
      expect(result.updatedAt).toBe('');
    });

    it('should validate category arrays', () => {
      const categories = [
        {
          id: 'cat-1',
          name: 'Fruits',
          description: 'Fresh fruits',
          image_url: 'https://example.com/fruits.jpg',
          sort_order: 1,
          is_available: true,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'cat-2',
          name: 'Vegetables',
          description: null,
          image_url: null,
          sort_order: 2,
          is_available: true,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ];

      const results = CategoryArraySchema.parse(categories);
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Fruits');
      expect(results[0].imageUrl).toBe('https://example.com/fruits.jpg');
      expect(results[1].name).toBe('Vegetables');
      expect(results[1].imageUrl).toBeUndefined();
    });
  });

  // 7️⃣ Nutrition Info Schema Tests
  describe('Nutrition Info Schema', () => {
    it('should handle optional nutrition fields', () => {
      const nutritionData = {
        calories: 100,
        protein: 5
        // Other fields are optional
      };

      const result = NutritionInfoSchema.parse(nutritionData);
      
      expect(result.calories).toBe(100);
      expect(result.protein).toBe(5);
      expect(result.carbs).toBeUndefined();
      expect(result.fat).toBeUndefined();
    });

    it('should handle complete nutrition info', () => {
      const fullNutrition = {
        calories: 250,
        protein: 10,
        carbs: 30,
        fat: 12,
        fiber: 5,
        sugar: 8,
        sodium: 200
      };

      const result = NutritionInfoSchema.parse(fullNutrition);
      
      expect(result.calories).toBe(250);
      expect(result.protein).toBe(10);
      expect(result.carbs).toBe(30);
      expect(result.fat).toBe(12);
      expect(result.fiber).toBe(5);
      expect(result.sugar).toBe(8);
      expect(result.sodium).toBe(200);
    });
  });

  // 8️⃣ Integration with Service Layer
  describe('Service Integration', () => {
    it('should produce data compatible with service operations', () => {
      const dbData = {
        id: 'prod-123',
        name: 'Service Test Product',
        description: 'For service integration',
        price: 15.99,
        stock_quantity: 25,
        category_id: 'cat-service',
        is_available: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const transformed = ProductSchema.parse(dbData);
      
      // Verify the transformed data has all fields needed by service
      expect(transformed.id).toBeDefined();
      expect(transformed.name).toBeDefined();
      expect(transformed.price).toBeDefined();
      expect(transformed.category_id).toBeDefined();
      
      // Check both snake_case and camelCase are available
      expect(transformed).toHaveProperty('stock_quantity');
      expect(transformed).toHaveProperty('stock');
      expect(transformed).toHaveProperty('is_available');
      expect(transformed).toHaveProperty('isActive');
    });

    it('should work with transformProduct helper', () => {
      const product = {
        id: 'prod-helper',
        name: 'Helper Test',
        description: 'Test helper',
        price: 20.00,
        stock_quantity: 15,
        category_id: 'cat-help',
        is_available: true,
        created_at: '2025-01-01',
        updated_at: '2025-01-01'
      };

      const categories = [{
        id: 'cat-help',
        name: 'Test Category'
      }];

      const result = transformProduct(product, categories);
      
      expect(result.id).toBe('prod-helper');
      expect(result.category?.name).toBe('Test Category');
    });
  });
});