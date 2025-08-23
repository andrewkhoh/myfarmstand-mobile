/**
 * Category Factory - Schema-Validated Test Data
 * 
 * Creates valid category test data that always passes schema validation.
 * Handles product categorization and hierarchy.
 */

import { z } from 'zod';
import { SchemaFactory } from './base.factory';
import { CategorySchema, DbCategorySchema } from '../../schemas/product.schema';
import type { Category } from '../../types';

export class CategoryFactory extends SchemaFactory<Category, any> {
  constructor() {
    super('category');
  }

  protected getSchema(): z.ZodSchema<Category> {
    return CategorySchema as z.ZodSchema<Category>;
  }

  protected getDbSchema(): z.ZodSchema<any> {
    return DbCategorySchema;
  }

  protected getDefaults(): Category {
    const now = new Date().toISOString();
    return {
      id: this.getNextId(),
      name: 'Test Category',
      description: 'A test category for products',
      imageUrl: 'https://example.com/category.jpg',
      sortOrder: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
  }

  protected getMinimalDefaults(): Partial<Category> {
    const now = new Date().toISOString();
    return {
      id: this.getNextId(),
      name: 'Minimal Category',
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
  }

  protected transformToDb(category: Category): any {
    return {
      id: category.id,
      name: category.name,
      description: category.description || null,
      image_url: category.imageUrl || null,
      sort_order: category.sortOrder || null,
      is_available: category.isActive,
      created_at: category.createdAt,
      updated_at: category.updatedAt
    };
  }

  /**
   * Create produce category
   */
  createProduce(overrides: Partial<Category> = {}): Category {
    return this.create({
      name: 'Produce',
      description: 'Fresh fruits and vegetables',
      imageUrl: 'https://example.com/produce.jpg',
      sortOrder: 1,
      ...overrides
    });
  }

  /**
   * Create dairy category
   */
  createDairy(overrides: Partial<Category> = {}): Category {
    return this.create({
      name: 'Dairy',
      description: 'Milk, cheese, eggs, and dairy products',
      imageUrl: 'https://example.com/dairy.jpg',
      sortOrder: 2,
      ...overrides
    });
  }

  /**
   * Create meat category
   */
  createMeat(overrides: Partial<Category> = {}): Category {
    return this.create({
      name: 'Meat & Poultry',
      description: 'Fresh meat and poultry products',
      imageUrl: 'https://example.com/meat.jpg',
      sortOrder: 3,
      ...overrides
    });
  }

  /**
   * Create bakery category
   */
  createBakery(overrides: Partial<Category> = {}): Category {
    return this.create({
      name: 'Bakery',
      description: 'Fresh baked goods and breads',
      imageUrl: 'https://example.com/bakery.jpg',
      sortOrder: 4,
      ...overrides
    });
  }

  /**
   * Create an inactive category
   */
  createInactive(overrides: Partial<Category> = {}): Category {
    return this.create({
      isActive: false,
      name: 'Inactive Category',
      ...overrides
    });
  }

  /**
   * Create a category without optional fields
   */
  createWithoutOptionalFields(overrides: Partial<Category> = {}): Category {
    const now = new Date().toISOString();
    return this.create({
      id: this.getNextId(),
      name: 'Basic Category',
      description: undefined,
      imageUrl: undefined,
      sortOrder: undefined,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      ...overrides
    });
  }

  /**
   * Create a complete set of farm categories
   */
  createFarmCategories(): Category[] {
    return [
      this.createProduce({ id: 'cat-produce' }),
      this.createDairy({ id: 'cat-dairy' }),
      this.createMeat({ id: 'cat-meat' }),
      this.createBakery({ id: 'cat-bakery' }),
      this.create({
        id: 'cat-pantry',
        name: 'Pantry',
        description: 'Canned goods, preserves, and dry goods',
        sortOrder: 5
      }),
      this.create({
        id: 'cat-beverages',
        name: 'Beverages',
        description: 'Juices, sodas, and other drinks',
        sortOrder: 6
      })
    ];
  }

  /**
   * Create categories with hierarchical sort order
   */
  createSorted(count: number = 5): Category[] {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        name: `Category ${i + 1}`,
        sortOrder: i + 1
      })
    );
  }

  /**
   * Create a seasonal category
   */
  createSeasonal(season: 'spring' | 'summer' | 'fall' | 'winter', overrides: Partial<Category> = {}): Category {
    const seasonalData = {
      spring: {
        name: 'Spring Specials',
        description: 'Fresh spring produce and seasonal items',
        imageUrl: 'https://example.com/spring.jpg'
      },
      summer: {
        name: 'Summer Harvest',
        description: 'Summer fruits and vegetables',
        imageUrl: 'https://example.com/summer.jpg'
      },
      fall: {
        name: 'Fall Favorites',
        description: 'Autumn harvest and seasonal produce',
        imageUrl: 'https://example.com/fall.jpg'
      },
      winter: {
        name: 'Winter Selection',
        description: 'Winter vegetables and preserved goods',
        imageUrl: 'https://example.com/winter.jpg'
      }
    };

    return this.create({
      ...seasonalData[season],
      sortOrder: 100, // Lower priority than main categories
      ...overrides
    });
  }

  /**
   * Create a featured category
   */
  createFeatured(overrides: Partial<Category> = {}): Category {
    return this.create({
      name: 'Featured Items',
      description: 'This week\'s featured products',
      imageUrl: 'https://example.com/featured.jpg',
      sortOrder: 0, // Highest priority
      ...overrides
    });
  }

  /**
   * Create categories for testing filtering
   */
  createForFiltering(): { active: Category[]; inactive: Category[] } {
    return {
      active: [
        this.create({ name: 'Active 1', isActive: true }),
        this.create({ name: 'Active 2', isActive: true }),
        this.create({ name: 'Active 3', isActive: true })
      ],
      inactive: [
        this.create({ name: 'Inactive 1', isActive: false }),
        this.create({ name: 'Inactive 2', isActive: false })
      ]
    };
  }
}

// Export singleton instance for convenience
export const categoryFactory = new CategoryFactory();

// Export helper functions for quick creation
export const createCategory = (overrides?: Partial<Category>) => categoryFactory.create(overrides);
export const createDbCategory = (overrides?: any) => categoryFactory.createDb(overrides);
export const createCategories = (count: number, overrides?: Partial<Category>) => 
  categoryFactory.createMany(count, overrides);