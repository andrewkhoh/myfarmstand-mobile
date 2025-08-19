/**
 * Test for Category Schema Nullable Fields Fix
 * 
 * This test validates that the CategorySchema correctly handles nullable
 * database fields that caused validation errors in production
 */

import { CategorySchema } from '../product.schema';

describe('Category Schema Nullable Fields Fix', () => {
  describe('Database Reality - Nullable Fields', () => {
    it('should handle category with null is_available (database reality)', () => {
      const categoryWithNullIsAvailable = {
        id: 'cat-123',
        name: 'Test Category',
        description: 'Test description',
        image_url: 'https://example.com/image.jpg',
        sort_order: 1,
        is_available: null, // Database can return null
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      };

      expect(() => CategorySchema.parse(categoryWithNullIsAvailable)).not.toThrow();
      
      const result = CategorySchema.parse(categoryWithNullIsAvailable);
      expect(result.isActive).toBe(true); // Should default to true
    });

    it('should handle category with null created_at (database reality)', () => {
      const categoryWithNullCreatedAt = {
        id: 'cat-123',
        name: 'Test Category',
        description: 'Test description',
        image_url: 'https://example.com/image.jpg',
        sort_order: 1,
        is_available: true,
        created_at: null, // Database can return null
        updated_at: '2023-01-02T00:00:00Z'
      };

      expect(() => CategorySchema.parse(categoryWithNullCreatedAt)).not.toThrow();
      
      const result = CategorySchema.parse(categoryWithNullCreatedAt);
      expect(result.createdAt).toBe(''); // Should default to empty string
    });

    it('should handle category with null updated_at (database reality)', () => {
      const categoryWithNullUpdatedAt = {
        id: 'cat-123',
        name: 'Test Category',
        description: 'Test description',
        image_url: 'https://example.com/image.jpg',
        sort_order: 1,
        is_available: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: null // Database can return null
      };

      expect(() => CategorySchema.parse(categoryWithNullUpdatedAt)).not.toThrow();
      
      const result = CategorySchema.parse(categoryWithNullUpdatedAt);
      expect(result.updatedAt).toBe(''); // Should default to empty string
    });

    it('should handle category with all nullable fields as null', () => {
      const categoryWithAllNulls = {
        id: 'cat-123',
        name: 'Test Category',
        description: null,
        image_url: null,
        sort_order: null,
        is_available: null,
        created_at: null,
        updated_at: null
      };

      expect(() => CategorySchema.parse(categoryWithAllNulls)).not.toThrow();
      
      const result = CategorySchema.parse(categoryWithAllNulls);
      expect(result.id).toBe('cat-123');
      expect(result.name).toBe('Test Category');
      expect(result.description).toBeUndefined();
      expect(result.imageUrl).toBeUndefined();
      expect(result.sortOrder).toBeUndefined();
      expect(result.isActive).toBe(true);    // Default for null
      expect(result.createdAt).toBe('');     // Default for null
      expect(result.updatedAt).toBe('');     // Default for null
    });
  });

  describe('Regression Test - The Exact Error Case', () => {
    it('should handle the exact scenario that caused validation error', () => {
      // This simulates the exact data structure that caused the validation error
      const problematicCategory = {
        id: '650e8400-e29b-41d4-a716-446655440018', // The exact record ID from error
        name: 'Fresh Vegetables',
        description: 'Farm fresh vegetables',
        image_url: 'https://example.com/vegetables.jpg',
        sort_order: 1,
        // These fields were missing/null causing the validation error:
        is_available: null,
        created_at: null,
        updated_at: null
      };

      // This should NOT throw an error anymore
      expect(() => CategorySchema.parse(problematicCategory)).not.toThrow();
      
      const result = CategorySchema.parse(problematicCategory);
      
      // Verify the transformation works correctly
      expect(result.id).toBe('650e8400-e29b-41d4-a716-446655440018');
      expect(result.name).toBe('Fresh Vegetables');
      expect(result.isActive).toBe(true);    // Null → true (safe default)
      expect(result.createdAt).toBe('');     // Null → '' (safe default)
      expect(result.updatedAt).toBe('');     // Null → '' (safe default)
    });
  });

  describe('Default Value Logic', () => {
    it('should use correct defaults for nullable fields', () => {
      const categoryWithPartialNulls = {
        id: 'cat-456',
        name: 'Dairy Products',
        description: 'Fresh dairy',
        image_url: 'https://example.com/dairy.jpg',
        sort_order: 2,
        is_available: false, // Explicit false
        created_at: null,    // Null
        updated_at: '2023-01-01T00:00:00Z' // Valid string
      };

      const result = CategorySchema.parse(categoryWithPartialNulls);
      
      expect(result.isActive).toBe(false);                   // Explicit false preserved
      expect(result.createdAt).toBe('');                     // Null becomes empty string
      expect(result.updatedAt).toBe('2023-01-01T00:00:00Z'); // Valid string preserved
    });

    it('should handle boolean default correctly with nullish coalescing', () => {
      const testCases = [
        { is_available: true, expected: true },
        { is_available: false, expected: false },
        { is_available: null, expected: true },      // ?? operator: null → true
        { is_available: undefined, expected: true }, // ?? operator: undefined → true
      ];

      testCases.forEach(({ is_available, expected }, index) => {
        const category = {
          id: `cat-${index}`,
          name: 'Test Category',
          description: null,
          image_url: null,
          sort_order: null,
          is_available,
          created_at: null,
          updated_at: null
        };

        const result = CategorySchema.parse(category);
        expect(result.isActive).toBe(expected);
      });
    });
  });

  describe('Transform Validation', () => {
    it('should preserve non-null values during transformation', () => {
      const completeCategory = {
        id: 'cat-789',
        name: 'Complete Category',
        description: 'A category with all fields',
        image_url: 'https://example.com/complete.jpg',
        sort_order: 5,
        is_available: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      };

      const result = CategorySchema.parse(completeCategory);
      
      // All values should be preserved and transformed correctly
      expect(result.id).toBe('cat-789');
      expect(result.name).toBe('Complete Category');
      expect(result.description).toBe('A category with all fields');
      expect(result.imageUrl).toBe('https://example.com/complete.jpg');
      expect(result.sortOrder).toBe(5);
      expect(result.isActive).toBe(true);
      expect(result.createdAt).toBe('2023-01-01T00:00:00Z');
      expect(result.updatedAt).toBe('2023-01-02T00:00:00Z');
    });
  });
});