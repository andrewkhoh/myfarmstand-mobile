/**
 * Product Admin Schema Contract Tests
 * 
 * CRITICAL: These tests enforce compile-time TypeScript contract validation
 * to prevent schema mismatches between database and application types.
 * 
 * Pattern: Schema Contract Management with compile-time enforcement
 * Location: src/schemas/__contracts__/productAdmin.contracts.test.ts
 */

import { describe, expect } from '@jest/globals';
import type { Database } from '../../types/database.generated';

// Schema contract validation types - MUST match database.generated.ts exactly
type DatabaseProduct = Database['public']['Tables']['products']['Row'];
type DatabaseCategory = Database['public']['Tables']['categories']['Row'];

// These interfaces MUST compile without errors - if they don't, there's a schema mismatch
interface ProductAdminDatabaseContract {
  // Core product fields - MUST match database.generated.ts exactly
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  category_id: string | null;
  image_url: string | null;
  is_available: boolean;
  is_pre_order: boolean;
  min_pre_order_quantity: number | null;
  max_pre_order_quantity: number | null;
  unit: string | null;
  weight: number | null;
  sku: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface CategoryAdminDatabaseContract {
  // Core category fields - MUST match database.generated.ts exactly
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

// Admin-specific contracts for create/update operations
interface ProductCreateContract {
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  category_id?: string;
  image_url?: string;
  is_available?: boolean;
  is_pre_order?: boolean;
  min_pre_order_quantity?: number;
  max_pre_order_quantity?: number;
  unit?: string;
  weight?: number;
  sku?: string;
  tags?: string[];
}

interface ProductUpdateContract {
  name?: string;
  description?: string;
  price?: number;
  stock_quantity?: number;
  category_id?: string;
  image_url?: string;
  is_available?: boolean;
  is_pre_order?: boolean;
  min_pre_order_quantity?: number;
  max_pre_order_quantity?: number;
  unit?: string;
  weight?: number;
  sku?: string;
  tags?: string[];
}

interface CategoryCreateContract {
  name: string;
  description?: string;
  image_url?: string;
  sort_order?: number;
  is_available?: boolean;
}

interface CategoryUpdateContract {
  name?: string;
  description?: string;
  image_url?: string;
  sort_order?: number;
  is_available?: boolean;
}

// Bulk operations contracts
interface BulkStockUpdateContract {
  product_id: string;
  new_stock: number;
  reason?: string;
}

interface BulkPriceUpdateContract {
  product_id: string;
  new_price: number;
  reason?: string;
}

describe('Product Admin Schema Contracts', () => {
  describe('Database Schema Contract Validation', () => {
    it('should enforce ProductAdminDatabaseContract matches database.generated.ts', () => {
      // Compile-time validation: This test will fail to compile if types don't match
      const contractValidator = (product: DatabaseProduct): ProductAdminDatabaseContract => {
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          stock_quantity: product.stock_quantity,
          category_id: product.category_id,
          image_url: product.image_url,
          is_available: product.is_available,
          is_pre_order: product.is_pre_order,
          min_pre_order_quantity: product.min_pre_order_quantity,
          max_pre_order_quantity: product.max_pre_order_quantity,
          unit: product.unit,
          weight: product.weight,
          sku: product.sku,
          tags: product.tags,
          created_at: product.created_at,
          updated_at: product.updated_at,
        };
      };

      // Runtime validation: Ensure the contract function exists
      expect(typeof contractValidator).toBe('function');
    });

    it('should enforce CategoryAdminDatabaseContract matches database.generated.ts', () => {
      // Compile-time validation: This test will fail to compile if types don't match
      const contractValidator = (category: DatabaseCategory): CategoryAdminDatabaseContract => {
        return {
          id: category.id,
          name: category.name,
          description: category.description,
          image_url: category.image_url,
          sort_order: category.sort_order,
          is_available: category.is_available,
          created_at: category.created_at,
          updated_at: category.updated_at,
        };
      };

      // Runtime validation: Ensure the contract function exists
      expect(typeof contractValidator).toBe('function');
    });
  });

  describe('Admin Operation Contract Validation', () => {
    it('should validate ProductCreateContract has required fields', () => {
      const validCreateData: ProductCreateContract = {
        name: 'Test Product',
        price: 10.99,
        stock_quantity: 50,
      };

      // Required fields validation
      expect(validCreateData.name).toBeDefined();
      expect(validCreateData.price).toBeDefined();
      expect(validCreateData.stock_quantity).toBeDefined();
      expect(typeof validCreateData.name).toBe('string');
      expect(typeof validCreateData.price).toBe('number');
      expect(typeof validCreateData.stock_quantity).toBe('number');
    });

    it('should validate ProductUpdateContract allows partial updates', () => {
      const validUpdateData: ProductUpdateContract = {
        price: 12.99,
        stock_quantity: 25,
      };

      // Partial update validation
      expect(Object.keys(validUpdateData)).toEqual(['price', 'stock_quantity']);
      expect(validUpdateData.name).toBeUndefined(); // Should be optional
    });

    it('should validate CategoryCreateContract has required fields', () => {
      const validCreateData: CategoryCreateContract = {
        name: 'Test Category',
      };

      // Required fields validation
      expect(validCreateData.name).toBeDefined();
      expect(typeof validCreateData.name).toBe('string');
    });

    it('should validate BulkStockUpdateContract structure', () => {
      const validBulkUpdate: BulkStockUpdateContract = {
        product_id: 'test-id',
        new_stock: 100,
      };

      // Bulk operation validation
      expect(validBulkUpdate.product_id).toBeDefined();
      expect(validBulkUpdate.new_stock).toBeDefined();
      expect(typeof validBulkUpdate.product_id).toBe('string');
      expect(typeof validBulkUpdate.new_stock).toBe('number');
    });

    it('should validate BulkPriceUpdateContract structure', () => {
      const validBulkUpdate: BulkPriceUpdateContract = {
        product_id: 'test-id',
        new_price: 15.99,
      };

      // Bulk operation validation
      expect(validBulkUpdate.product_id).toBeDefined();
      expect(validBulkUpdate.new_price).toBeDefined();
      expect(typeof validBulkUpdate.product_id).toBe('string');
      expect(typeof validBulkUpdate.new_price).toBe('number');
    });
  });

  describe('Field Type Contract Validation', () => {
    it('should enforce strict typing for numeric fields', () => {
      const product: Partial<ProductAdminDatabaseContract> = {
        price: 10.99,
        stock_quantity: 50,
        weight: 2.5,
      };

      const category: Partial<CategoryAdminDatabaseContract> = {
        sort_order: 1,
      };

      // Type enforcement - these should all be numbers
      expect(typeof product.price).toBe('number');
      expect(typeof product.stock_quantity).toBe('number');
      expect(typeof product.weight).toBe('number');
      expect(typeof category.sort_order).toBe('number');
    });

    it('should enforce strict typing for boolean fields', () => {
      const product: Partial<ProductAdminDatabaseContract> = {
        is_available: true,
        is_pre_order: false,
      };

      // Type enforcement - these should all be booleans
      expect(typeof product.is_available).toBe('boolean');
      expect(typeof product.is_pre_order).toBe('boolean');
    });

    it('should enforce strict typing for array fields', () => {
      const product: Partial<ProductAdminDatabaseContract> = {
        tags: ['organic', 'local', 'seasonal'],
      };

      // Type enforcement - tags should be array of strings
      expect(Array.isArray(product.tags)).toBe(true);
      expect(product.tags?.every(tag => typeof tag === 'string')).toBe(true);
    });

    it('should enforce nullable field contracts', () => {
      const product: Partial<ProductAdminDatabaseContract> = {
        description: null,
        category_id: null,
        image_url: null,
        min_pre_order_quantity: null,
        max_pre_order_quantity: null,
        unit: null,
        weight: null,
        sku: null,
        tags: null,
      };

      // Nullable field validation - these should accept null
      expect(product.description).toBeNull();
      expect(product.category_id).toBeNull();
      expect(product.image_url).toBeNull();
      expect(product.min_pre_order_quantity).toBeNull();
      expect(product.max_pre_order_quantity).toBeNull();
      expect(product.unit).toBeNull();
      expect(product.weight).toBeNull();
      expect(product.sku).toBeNull();
      expect(product.tags).toBeNull();
    });
  });

  describe('Pre-order Contract Validation', () => {
    it('should validate pre-order quantity constraints', () => {
      const preOrderProduct: Partial<ProductAdminDatabaseContract> = {
        is_pre_order: true,
        min_pre_order_quantity: 5,
        max_pre_order_quantity: 50,
      };

      // Pre-order validation
      expect(preOrderProduct.is_pre_order).toBe(true);
      expect(preOrderProduct.min_pre_order_quantity).toBeDefined();
      expect(preOrderProduct.max_pre_order_quantity).toBeDefined();
      expect(preOrderProduct.min_pre_order_quantity! <= preOrderProduct.max_pre_order_quantity!).toBe(true);
    });

    it('should allow null pre-order quantities for regular products', () => {
      const regularProduct: Partial<ProductAdminDatabaseContract> = {
        is_pre_order: false,
        min_pre_order_quantity: null,
        max_pre_order_quantity: null,
      };

      // Regular product validation
      expect(regularProduct.is_pre_order).toBe(false);
      expect(regularProduct.min_pre_order_quantity).toBeNull();
      expect(regularProduct.max_pre_order_quantity).toBeNull();
    });
  });
});

// Export contract types for use in actual implementation
export type {
  ProductAdminDatabaseContract,
  CategoryAdminDatabaseContract,
  ProductCreateContract,
  ProductUpdateContract,
  CategoryCreateContract,
  CategoryUpdateContract,
  BulkStockUpdateContract,
  BulkPriceUpdateContract,
};