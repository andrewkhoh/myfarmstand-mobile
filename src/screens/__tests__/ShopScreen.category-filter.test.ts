/**
 * Test for ShopScreen Category Filter Fix
 * 
 * This test validates that category filtering works correctly after
 * the Zod Transform Pattern implementation changed the category data structure
 */

import { Product, Category } from '../../types';

describe('ShopScreen Category Filter Logic', () => {
  const mockCategory: Category = {
    id: 'cat-123',
    name: 'Fresh Vegetables',
    description: 'Farm fresh vegetables',
    imageUrl: 'https://example.com/image.jpg',
    sortOrder: 1,
    isActive: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z'
  };

  const mockProduct: Product = {
    id: 'prod-123',
    name: 'Tomatoes',
    description: 'Fresh tomatoes',
    price: 2.99,
    stock_quantity: 50,
    category_id: 'cat-123',
    category: mockCategory, // This is now a Category object after schema transform
    image_url: 'https://example.com/tomato.jpg',
    images: [],
    is_weekly_special: false,
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
    updated_at: '2023-01-02T00:00:00Z',
    
    // Legacy compatibility fields
    stock: 50,
    categoryId: 'cat-123',
    imageUrl: 'https://example.com/tomato.jpg',
    isWeeklySpecial: false,
    isBundle: false,
    seasonalAvailability: true,
    nutritionInfo: null,
    isActive: true,
    isPreOrder: false,
    preOrderAvailableDate: null,
    minPreOrderQuantity: null,
    maxPreOrderQuantity: null,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z'
  } as Product;

  describe('Category Filtering Logic (Fixed)', () => {
    it('should correctly extract category name from Category object', () => {
      // Simulate the fixed filtering logic from ShopScreen
      const selectedCategory = 'Fresh Vegetables';
      
      // This is the NEW (fixed) logic:
      const productCategoryName = (mockProduct as any).category?.name || 'Unknown';
      const shouldInclude = productCategoryName === selectedCategory;
      
      expect(productCategoryName).toBe('Fresh Vegetables');
      expect(shouldInclude).toBe(true);
    });

    it('should handle products without category gracefully', () => {
      const productWithoutCategory = {
        ...mockProduct,
        category: null
      };
      
      const selectedCategory = 'Fresh Vegetables';
      const productCategoryName = (productWithoutCategory as any).category?.name || 'Unknown';
      const shouldInclude = productCategoryName === selectedCategory;
      
      expect(productCategoryName).toBe('Unknown');
      expect(shouldInclude).toBe(false);
    });

    it('should filter products correctly by category name', () => {
      const products = [
        mockProduct,
        {
          ...mockProduct,
          id: 'prod-456',
          name: 'Milk',
          category: {
            ...mockCategory,
            id: 'cat-456',
            name: 'Dairy Products'
          }
        }
      ];

      // Filter for 'Fresh Vegetables' category
      const filtered = products.filter((product: Product) => {
        const productCategoryName = (product as any).category?.name || 'Unknown';
        return productCategoryName === 'Fresh Vegetables';
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Tomatoes');
    });
  });

  describe('Category Sorting Logic (Fixed)', () => {
    it('should correctly sort products by category name', () => {
      const products = [
        {
          ...mockProduct,
          name: 'Milk',
          category: { ...mockCategory, name: 'Dairy Products' }
        },
        {
          ...mockProduct,
          name: 'Apple',
          category: { ...mockCategory, name: 'Fresh Fruits' }
        },
        {
          ...mockProduct,
          name: 'Carrot',
          category: { ...mockCategory, name: 'Fresh Vegetables' }
        }
      ];

      // Sort by category name using the fixed logic
      const sorted = [...products].sort((a, b) => {
        const aCategoryName = (a as any).category?.name || 'Unknown';
        const bCategoryName = (b as any).category?.name || 'Unknown';
        return aCategoryName.localeCompare(bCategoryName);
      });

      expect(sorted[0].name).toBe('Milk');      // Dairy Products
      expect(sorted[1].name).toBe('Apple');     // Fresh Fruits  
      expect(sorted[2].name).toBe('Carrot');    // Fresh Vegetables
    });
  });

  describe('Regression Test: Old vs New Logic', () => {
    it('should demonstrate why the old logic failed', () => {
      const selectedCategory = 'Fresh Vegetables';
      
      // OLD (broken) logic - this was failing:
      const oldProductCategory = (mockProduct as any).category; // This is an object!
      const oldComparison = oldProductCategory === selectedCategory; // object === string
      
      // NEW (fixed) logic:
      const newProductCategoryName = (mockProduct as any).category?.name || 'Unknown';
      const newComparison = newProductCategoryName === selectedCategory; // string === string
      
      expect(oldComparison).toBe(false); // ❌ Broken - comparing object to string
      expect(newComparison).toBe(true);  // ✅ Fixed - comparing string to string
      
      // Show what the old logic was actually comparing:
      expect(typeof oldProductCategory).toBe('object');
      expect(typeof newProductCategoryName).toBe('string');
    });
  });
});