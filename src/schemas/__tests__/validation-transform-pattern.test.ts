/**
 * Tests for Zod Transform Pattern Validation Flow
 * 
 * This test suite validates that our schemas follow the correct pattern:
 * DB Data (snake_case) → Schema Validation → Transform → App Data (camelCase)
 */

import { CategorySchema, DbProductSchema, ProductSchema, transformProductWithCategory } from '../product.schema';

describe('Validation Transform Pattern', () => {
  describe('CategorySchema Transform Pattern', () => {
    const rawDbCategoryData = {
      id: 'cat-123',
      name: 'Fresh Vegetables',
      description: 'Farm fresh vegetables',
      image_url: 'https://example.com/image.jpg',
      sort_order: 1,
      is_available: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-02T00:00:00Z'
    };

    it('should validate and transform DB format to app format', () => {
      const result = CategorySchema.parse(rawDbCategoryData);
      
      // Should transform snake_case to camelCase
      expect(result).toEqual({
        id: 'cat-123',
        name: 'Fresh Vegetables',
        description: 'Farm fresh vegetables',
        imageUrl: 'https://example.com/image.jpg',
        sortOrder: 1,
        isActive: true,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z'
      });
    });

    it('should handle nullable fields correctly', () => {
      const dataWithNulls = {
        ...rawDbCategoryData,
        description: null,
        image_url: null,
        sort_order: null
      };

      const result = CategorySchema.parse(dataWithNulls);
      
      expect(result.description).toBeUndefined();
      expect(result.imageUrl).toBeUndefined();
      expect(result.sortOrder).toBeUndefined();
    });

    it('should fail validation for missing required fields', () => {
      const invalidData = {
        id: 'cat-123',
        // missing name, is_available, created_at, updated_at
      };

      expect(() => CategorySchema.parse(invalidData)).toThrow();
    });

    it('should fail validation for invalid field types', () => {
      const invalidData = {
        ...rawDbCategoryData,
        is_available: 'not a boolean' // should be boolean
      };

      expect(() => CategorySchema.parse(invalidData)).toThrow();
    });
  });

  describe('ProductSchema Transform Pattern', () => {
    const rawDbProductData = {
      id: 'prod-123',
      name: '  Fresh Tomatoes  ', // test name trimming
      description: 'Organic tomatoes',
      price: 2.99,
      stock_quantity: 50,
      category_id: 'cat-123',
      categories: {
        id: 'cat-123',
        name: 'Vegetables',
        description: 'Fresh vegetables',
        image_url: 'https://example.com/cat.jpg',
        sort_order: 1,
        is_available: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      },
      image_url: 'https://example.com/tomato.jpg',
      images: null,
      is_weekly_special: true,
      is_bundle: false,
      seasonal_availability: true,
      unit: 'lb',
      weight: 1.0,
      sku: 'TOM-001',
      tags: ['organic', 'local'],
      nutrition_info: null,
      is_available: true,
      is_pre_order: false,
      pre_order_available_date: null,
      min_pre_order_quantity: null,
      max_pre_order_quantity: null,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-02T00:00:00Z'
    };

    it('should validate and transform DB format to app format', () => {
      // Extract categories data for separate transformation
      const { categories, ...productData } = rawDbProductData;
      const result = transformProductWithCategory(productData, [categories]);
      
      // Should trim name
      expect(result.name).toBe('Fresh Tomatoes');
      
      // Should transform categories -> category
      expect(result.category).toEqual({
        id: 'cat-123',
        name: 'Vegetables',
        description: 'Fresh vegetables',
        imageUrl: 'https://example.com/cat.jpg',
        sortOrder: 1,
        isActive: true,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z'
      });
      
      // Should have both snake_case and camelCase fields for compatibility
      expect(result.stock_quantity).toBe(50);
      expect(result.stock).toBe(50);
      expect(result.category_id).toBe('cat-123');
      expect(result.categoryId).toBe('cat-123');
      expect(result.is_available).toBe(true);
      expect(result.isActive).toBe(true);
    });

    it('should handle empty product name', () => {
      const invalidData = {
        ...rawDbProductData,
        name: '   ' // empty after trimming
      };

      // Remove categories for this test
      const { categories, ...productData } = invalidData;
      expect(() => transformProductWithCategory(productData, categories ? [categories] : [])).toThrow();
    });

    it('should handle missing category data', () => {
      const dataWithoutCategory = {
        ...rawDbProductData,
        categories: null
      };

      const result = ProductSchema.parse(dataWithoutCategory);
      expect(result.category).toBeUndefined();
    });
  });

  describe('DbProductSchema (Raw Validation)', () => {
    it('should validate raw DB format without transformation', () => {
      const rawData = {
        id: 'prod-123',
        name: 'Tomatoes',
        description: 'Fresh tomatoes',
        price: 2.99,
        stock_quantity: 50,
        category_id: 'cat-123',
        image_url: 'https://example.com/image.jpg',
        images: null,
        is_weekly_special: true,
        is_bundle: false,
        seasonal_availability: true,
        unit: 'lb',
        weight: 1.0,
        sku: 'TOM-001',
        tags: ['organic'],
        nutrition_info: null,
        is_available: true,
        is_pre_order: false,
        pre_order_available_date: null,
        min_pre_order_quantity: null,
        max_pre_order_quantity: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      };

      // Should validate without transformation
      const result = DbProductSchema.parse(rawData);
      expect(result).toEqual(rawData);
    });
  });

  describe('Validation Flow Pattern Compliance', () => {
    it('should follow the correct validation flow: DB → Validate → Transform → App', () => {
      // Simulate the flow from database query to app usage
      
      // 1. Raw DB data (what Supabase returns)
      const dbResponse = {
        id: 'prod-123',
        name: '  Test Product  ',
        description: 'Test description',
        price: 10.00,
        stock_quantity: 100,
        category_id: 'cat-123',
        image_url: 'https://example.com/test.jpg',
        images: null,
        is_weekly_special: false,
        is_bundle: false,
        seasonal_availability: false,
        unit: null,
        weight: null,
        sku: null,
        tags: null,
        nutrition_info: null,
        is_available: true,
        is_pre_order: false,
        pre_order_available_date: null,
        min_pre_order_quantity: null,
        max_pre_order_quantity: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      };
      
      // 2. Validate raw format (should succeed)
      expect(() => DbProductSchema.parse(dbResponse)).not.toThrow();
      
      // 3. Transform to app format (should validate + transform)
      const appData = ProductSchema.parse(dbResponse);
      
      // 4. Verify transformation worked correctly
      expect(appData.name).toBe('Test Product'); // trimmed
      expect(appData.stock_quantity).toBe(100); // snake_case preserved
      expect(appData.stock).toBe(100); // camelCase added
      expect(appData.isActive).toBe(true); // transformed field
      expect(appData.createdAt).toBe('2023-01-01T00:00:00Z'); // camelCase added
    });

    it('should provide clear error messages for invalid data', () => {
      const invalidData = {
        id: 'prod-123',
        name: 123, // should be string
        description: 'Test',
        price: 'not a number', // should be number
        stock_quantity: 50,
        category_id: 'cat-123',
        is_available: 'yes', // should be boolean
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      };

      expect(() => ProductSchema.parse(invalidData)).toThrow();
    });
  });
});