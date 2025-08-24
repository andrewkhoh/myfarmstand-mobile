/**
 * Product Admin Schema Tests
 * Following MyFarmstand Mobile Architectural Patterns
 */

import { z } from 'zod';
import {
  ProductAdminDatabaseSchema,
  CategoryAdminDatabaseSchema,
  ProductAdminTransformSchema,
  CategoryAdminTransformSchema,
  ProductAdminCreateSchema,
  ProductAdminUpdateSchema,
  CategoryAdminCreateSchema,
  CategoryAdminUpdateSchema,
  BulkStockUpdateSchema,
  BulkPriceUpdateSchema,
  BulkOperationSchema,
  LowStockQuerySchema,
  OutOfStockQuerySchema,
  transformProductAdmin,
  transformCategoryAdmin,
  prepareProductForInsert,
  prepareProductForUpdate,
  prepareCategoryForInsert,
  prepareCategoryForUpdate
} from '../productAdmin.schema';

describe('Product Admin Schema Tests', () => {
  // 1️⃣ Database-First Validation Tests
  describe('Database Schema Validation', () => {
    it('should handle database nulls gracefully', () => {
      const dbData = {
        id: 'prod-123',
        name: 'Test Product',
        description: 'Test Description',
        price: 9.99,
        category: 'Vegetables',
        category_id: 'cat-456',
        image_url: null,
        is_available: null,
        is_bundle: null,
        is_pre_order: null,
        is_weekly_special: null,
        max_pre_order_quantity: null,
        min_pre_order_quantity: null,
        nutrition_info: null,
        pre_order_available_date: null,
        seasonal_availability: null,
        sku: null,
        stock_quantity: null,
        tags: null,
        unit: null,
        weight: null,
        created_at: null,
        updated_at: null
      };

      const result = ProductAdminDatabaseSchema.parse(dbData);
      
      // All nullable fields should preserve null
      expect(result.image_url).toBeNull();
      expect(result.is_available).toBeNull();
      expect(result.stock_quantity).toBeNull();
      expect(result.tags).toBeNull();
      expect(result.created_at).toBeNull();
    });

    it('should validate required fields from database', () => {
      const invalidData = {
        // Missing required fields
        name: 'Test Product',
        description: 'Test',
        price: 9.99
      };

      expect(() => ProductAdminDatabaseSchema.parse(invalidData)).toThrow();
    });

    it('should handle complete product data', () => {
      const completeData = {
        id: 'prod-123',
        name: 'Complete Product',
        description: 'Full description',
        price: 19.99,
        category: 'Fruits',
        category_id: 'cat-123',
        image_url: 'https://example.com/image.jpg',
        is_available: true,
        is_bundle: false,
        is_pre_order: true,
        is_weekly_special: true,
        max_pre_order_quantity: 100,
        min_pre_order_quantity: 10,
        nutrition_info: { calories: 100, protein: 5 },
        pre_order_available_date: '2025-02-01',
        seasonal_availability: true,
        sku: 'SKU123',
        stock_quantity: 50,
        tags: ['organic', 'local'],
        unit: 'lb',
        weight: 2.5,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const result = ProductAdminDatabaseSchema.parse(completeData);
      
      expect(result.id).toBe('prod-123');
      expect(result.price).toBe(19.99);
      expect(result.is_pre_order).toBe(true);
      expect(result.tags).toEqual(['organic', 'local']);
    });
  });

  // 2️⃣ Transformation Tests
  describe('Schema Transformation', () => {
    it('should transform product with defaults', () => {
      const dbData = {
        id: 'prod-123',
        name: 'Test Product',
        description: 'Test Description',
        price: 9.99,
        category: 'Vegetables',
        category_id: 'cat-456',
        image_url: null,
        is_available: null,
        is_bundle: null,
        is_pre_order: null,
        is_weekly_special: null,
        max_pre_order_quantity: null,
        min_pre_order_quantity: null,
        nutrition_info: null,
        pre_order_available_date: null,
        seasonal_availability: null,
        sku: null,
        stock_quantity: null,
        tags: null,
        unit: null,
        weight: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const result = transformProductAdmin(dbData);
      
      // Check defaults are applied
      expect(result.is_available).toBe(true);
      expect(result.is_bundle).toBe(false);
      expect(result.is_pre_order).toBe(false);
      expect(result.is_weekly_special).toBe(false);
      expect(result.seasonal_availability).toBe(true);
      expect(result.stock_quantity).toBe(0);
      expect(result.tags).toEqual([]);
    });

    it('should populate category when provided', () => {
      const product = {
        id: 'prod-123',
        name: 'Test Product',
        description: 'Test',
        price: 9.99,
        category: 'Vegetables',
        category_id: 'cat-456',
        image_url: null,
        is_available: true,
        is_bundle: false,
        is_pre_order: false,
        is_weekly_special: false,
        max_pre_order_quantity: null,
        min_pre_order_quantity: null,
        nutrition_info: null,
        pre_order_available_date: null,
        seasonal_availability: true,
        sku: null,
        stock_quantity: 10,
        tags: [],
        unit: null,
        weight: null,
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

      const result = transformProductAdmin(product, categories);
      
      expect(result.category).toBeDefined();
      expect(result.category?.id).toBe('cat-456');
      expect(result.category?.name).toBe('Vegetables');
      expect(result.category?.image_url).toBe('https://example.com/veg.jpg');
    });

    it('should handle missing category gracefully', () => {
      const product = {
        id: 'prod-123',
        name: 'Test Product',
        description: 'Test',
        price: 9.99,
        category: 'Unknown',
        category_id: 'cat-999',
        image_url: null,
        is_available: true,
        is_bundle: false,
        is_pre_order: false,
        is_weekly_special: false,
        max_pre_order_quantity: null,
        min_pre_order_quantity: null,
        nutrition_info: null,
        pre_order_available_date: null,
        seasonal_availability: true,
        sku: null,
        stock_quantity: 10,
        tags: [],
        unit: null,
        weight: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const categories = [{
        id: 'cat-456',
        name: 'Vegetables'
      }];

      const result = transformProductAdmin(product, categories);
      
      expect(result.category).toBeNull();
    });
  });

  // 3️⃣ Create/Update Schema Tests
  describe('Create/Update Schemas', () => {
    it('should validate product creation data', () => {
      const createData = {
        name: 'New Product',
        description: 'Product description',
        price: 29.99,
        category: 'Fruits',
        category_id: 'cat-123',
        image_url: 'https://example.com/product.jpg',
        is_available: true,
        stock_quantity: 100,
        tags: ['fresh', 'organic'],
        unit: 'kg',
        weight: 1.5
      };

      const result = ProductAdminCreateSchema.parse(createData);
      
      expect(result.name).toBe('New Product');
      expect(result.price).toBe(29.99);
      expect(result.stock_quantity).toBe(100);
    });

    it('should validate pre-order constraints', () => {
      const invalidPreOrder = {
        name: 'Pre-order Product',
        description: 'Test',
        price: 19.99,
        category: 'Fruits',
        category_id: 'cat-123',
        is_pre_order: true,
        min_pre_order_quantity: 20,
        max_pre_order_quantity: 10 // Max less than min
      };

      expect(() => ProductAdminCreateSchema.parse(invalidPreOrder))
        .toThrow('Pre-order products must have valid min/max quantities');
    });

    it('should validate partial update data', () => {
      const updateData = {
        price: 39.99,
        stock_quantity: 200
      };

      const result = ProductAdminUpdateSchema.parse(updateData);
      
      expect(result.price).toBe(39.99);
      expect(result.stock_quantity).toBe(200);
      expect(result.name).toBeUndefined();
    });

    it('should validate constraints in update', () => {
      const invalidUpdate = {
        price: -10, // Negative price
        stock_quantity: -5 // Negative stock
      };

      expect(() => ProductAdminUpdateSchema.parse(invalidUpdate))
        .toThrow(/Price must be greater than 0|Stock cannot be negative/);
    });
  });

  // 4️⃣ Category Schema Tests
  describe('Category Admin Schemas', () => {
    it('should validate category database schema', () => {
      const categoryData = {
        id: 'cat-123',
        name: 'Vegetables',
        description: null,
        image_url: null,
        sort_order: null,
        is_available: null,
        created_at: null,
        updated_at: null
      };

      const result = CategoryAdminDatabaseSchema.parse(categoryData);
      
      expect(result.id).toBe('cat-123');
      expect(result.name).toBe('Vegetables');
      expect(result.description).toBeNull();
    });

    it('should transform category with defaults', () => {
      const categoryData = {
        id: 'cat-123',
        name: 'Fruits',
        description: 'Fresh fruits',
        image_url: 'https://example.com/fruits.jpg',
        sort_order: null,
        is_available: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const result = transformCategoryAdmin(categoryData);
      
      expect(result.sort_order).toBe(0); // Default
      expect(result.is_available).toBe(true); // Default
      expect(result.description).toBe('Fresh fruits');
    });

    it('should validate category creation', () => {
      const createData = {
        name: 'New Category',
        description: 'Category description',
        image_url: 'https://example.com/cat.jpg',
        sort_order: 5,
        is_available: true
      };

      const result = CategoryAdminCreateSchema.parse(createData);
      
      expect(result.name).toBe('New Category');
      expect(result.sort_order).toBe(5);
    });

    it('should validate category update', () => {
      const updateData = {
        name: 'Updated Category',
        sort_order: 10
      };

      const result = CategoryAdminUpdateSchema.parse(updateData);
      
      expect(result.name).toBe('Updated Category');
      expect(result.description).toBeUndefined();
    });
  });

  // 5️⃣ Bulk Operations Tests
  describe('Bulk Operations', () => {
    it('should validate bulk stock update', () => {
      const stockUpdate = {
        product_id: 'prod-123',
        new_stock: 150,
        reason: 'Restocking'
      };

      const result = BulkStockUpdateSchema.parse(stockUpdate);
      
      expect(result.product_id).toBe('prod-123');
      expect(result.new_stock).toBe(150);
      expect(result.reason).toBe('Restocking');
    });

    it('should validate bulk price update', () => {
      const priceUpdate = {
        product_id: 'prod-456',
        new_price: 24.99,
        reason: 'Sale'
      };

      const result = BulkPriceUpdateSchema.parse(priceUpdate);
      
      expect(result.product_id).toBe('prod-456');
      expect(result.new_price).toBe(24.99);
    });

    it('should validate bulk operation with multiple updates', () => {
      const bulkOp = {
        operations: [
          { product_id: 'prod-1', new_stock: 100 },
          { product_id: 'prod-2', new_price: 19.99 }
        ],
        apply_immediately: true,
        dry_run: false
      };

      const result = BulkOperationSchema.parse(bulkOp);
      
      expect(result.operations).toHaveLength(2);
      expect(result.apply_immediately).toBe(true);
    });

    it('should reject empty operations', () => {
      const emptyOp = {
        operations: [],
        apply_immediately: true
      };

      expect(() => BulkOperationSchema.parse(emptyOp))
        .toThrow('At least one operation required');
    });
  });

  // 6️⃣ Query Schema Tests
  describe('Query Schemas', () => {
    it('should validate low stock query', () => {
      const query = {
        threshold: 20,
        include_unavailable: true,
        category_filter: 'cat-123'
      };

      const result = LowStockQuerySchema.parse(query);
      
      expect(result.threshold).toBe(20);
      expect(result.include_unavailable).toBe(true);
      expect(result.category_filter).toBe('cat-123');
    });

    it('should use default threshold', () => {
      const query = {
        include_unavailable: false
      };

      const result = LowStockQuerySchema.parse(query);
      
      expect(result.threshold).toBe(10); // Default
    });

    it('should validate out of stock query', () => {
      const query = {
        include_unavailable: true,
        category_filter: 'cat-456',
        include_pre_order: false
      };

      const result = OutOfStockQuerySchema.parse(query);
      
      expect(result.include_unavailable).toBe(true);
      expect(result.include_pre_order).toBe(false);
    });
  });

  // 7️⃣ Database Preparation Functions
  describe('Database Preparation Functions', () => {
    it('should prepare product for insert', () => {
      const createData = {
        name: 'New Product',
        description: 'Description',
        price: 29.99,
        category: 'Fruits',
        category_id: 'cat-123',
        is_available: true,
        stock_quantity: 50,
        tags: ['organic']
      };

      const validated = ProductAdminCreateSchema.parse(createData);
      const result = prepareProductForInsert(validated);
      
      expect(result.name).toBe('New Product');
      expect(result.price).toBe(29.99);
      expect(result.image_url).toBeNull();
      expect(result.tags).toEqual(['organic']);
    });

    it('should prepare product for update', () => {
      const updateData = {
        price: 39.99,
        stock_quantity: 100,
        is_available: false
      };

      const validated = ProductAdminUpdateSchema.parse(updateData);
      const result = prepareProductForUpdate(validated);
      
      expect(result.price).toBe(39.99);
      expect(result.stock_quantity).toBe(100);
      expect(result.is_available).toBe(false);
      expect(result.updated_at).toBeDefined();
      expect(result.name).toBeUndefined();
    });

    it('should prepare category for insert', () => {
      const createData = {
        name: 'New Category',
        description: 'Category description',
        sort_order: 5
      };

      const validated = CategoryAdminCreateSchema.parse(createData);
      const result = prepareCategoryForInsert(validated);
      
      expect(result.name).toBe('New Category');
      expect(result.description).toBe('Category description');
      expect(result.sort_order).toBe(5);
    });

    it('should prepare category for update', () => {
      const updateData = {
        name: 'Updated Name',
        is_available: false
      };

      const validated = CategoryAdminUpdateSchema.parse(updateData);
      const result = prepareCategoryForUpdate(validated);
      
      expect(result.name).toBe('Updated Name');
      expect(result.is_available).toBe(false);
      expect(result.updated_at).toBeDefined();
      expect(result.description).toBeUndefined();
    });
  });

  // 8️⃣ Edge Cases
  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      const createData = {
        name: '', // Should fail
        description: 'Test',
        price: 10,
        category: 'Test',
        category_id: 'cat-1'
      };

      expect(() => ProductAdminCreateSchema.parse(createData))
        .toThrow('Product name is required');
    });

    it('should handle extreme values', () => {
      const createData = {
        name: 'Test',
        description: 'Test',
        price: 999999.99,
        category: 'Test',
        category_id: 'cat-1',
        stock_quantity: 999999,
        weight: 9999.99
      };

      const result = ProductAdminCreateSchema.parse(createData);
      
      expect(result.price).toBe(999999.99);
      expect(result.stock_quantity).toBe(999999);
    });

    it('should validate string lengths', () => {
      const longString = 'a'.repeat(300);
      const createData = {
        name: longString, // Too long
        description: 'Test',
        price: 10,
        category: 'Test',
        category_id: 'cat-1'
      };

      expect(() => ProductAdminCreateSchema.parse(createData))
        .toThrow('Product name too long');
    });

    it('should validate URL formats', () => {
      const invalidUrl = {
        name: 'Test',
        description: 'Test',
        price: 10,
        category: 'Test',
        category_id: 'cat-1',
        image_url: 'not-a-url'
      };

      expect(() => ProductAdminCreateSchema.parse(invalidUrl))
        .toThrow('Invalid image URL');
    });
  });
});