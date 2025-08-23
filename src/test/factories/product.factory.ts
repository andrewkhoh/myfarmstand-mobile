/**
 * Product Factory - Schema-Validated Test Data
 * 
 * Creates valid product test data that always passes schema validation.
 * This ensures our tests use the same validation as production code.
 */

import { z } from 'zod';
import { ProductSchema, DbProductSchema } from '../../schemas/product.schema';
import type { Product } from '../../types';

export class ProductFactory {
  private static idCounter = 1;

  /**
   * Create a valid Product that passes schema validation
   */
  static create(overrides: Partial<Product> = {}): Product {
    const defaultProduct = {
      id: `product-${this.idCounter++}`,
      name: 'Test Product',
      description: 'A test product for unit testing',
      price: 9.99,
      stock_quantity: 100,
      category_id: 'cat-1',
      image_url: 'https://example.com/product.jpg',
      is_available: true,
      is_pre_order: false,
      min_pre_order_quantity: 1,
      max_pre_order_quantity: 10,
      tags: ['test'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };

    // Validate against schema to ensure test data is valid
    const validated = ProductSchema.parse(defaultProduct);
    return validated;
  }

  /**
   * Create a valid database product (snake_case)
   */
  static createDb(overrides: Record<string, any> = {}): any {
    const product = this.create();
    
    // Convert to database format (snake_case)
    const dbProduct = {
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
      tags: product.tags,
      created_at: product.created_at,
      updated_at: product.updated_at,
      ...overrides
    };

    // Validate against DB schema
    return DbProductSchema.parse(dbProduct);
  }

  /**
   * Create multiple products
   */
  static createMany(count: number, overrides: Partial<Product> = {}): Product[] {
    return Array.from({ length: count }, (_, i) => 
      this.create({
        ...overrides,
        name: `${overrides.name || 'Test Product'} ${i + 1}`
      })
    );
  }

  /**
   * Create a pre-order product
   */
  static createPreOrder(overrides: Partial<Product> = {}): Product {
    return this.create({
      is_pre_order: true,
      stock_quantity: 0,
      min_pre_order_quantity: 5,
      max_pre_order_quantity: 20,
      ...overrides
    });
  }

  /**
   * Create an out-of-stock product
   */
  static createOutOfStock(overrides: Partial<Product> = {}): Product {
    return this.create({
      stock_quantity: 0,
      is_available: true,
      is_pre_order: false,
      ...overrides
    });
  }

  /**
   * Create an unavailable product
   */
  static createUnavailable(overrides: Partial<Product> = {}): Product {
    return this.create({
      is_available: false,
      ...overrides
    });
  }

  /**
   * Reset the ID counter (useful for test isolation)
   */
  static reset(): void {
    this.idCounter = 1;
  }
}

/**
 * Helper function for quick product creation in tests
 */
export const createProduct = (overrides?: Partial<Product>) => 
  ProductFactory.create(overrides);

export const createDbProduct = (overrides?: Record<string, any>) => 
  ProductFactory.createDb(overrides);

export const createProducts = (count: number, overrides?: Partial<Product>) => 
  ProductFactory.createMany(count, overrides);