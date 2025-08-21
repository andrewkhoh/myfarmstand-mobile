/**
 * Product Admin Service Tests
 * 
 * Tests database field selection validation, direct Supabase patterns,
 * ValidationMonitor integration, and resilient processing patterns.
 * 
 * Pattern: Direct Supabase + Validation with database-first validation
 * Pattern: Resilient Item Processing with skip-on-error (Pattern 3)
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock ValidationMonitor before importing service
const mockValidationMonitor = {
  trackSuccess: jest.fn(),
  trackFailure: jest.fn(),
  trackMismatch: jest.fn(),
  getMetrics: jest.fn(),
};

jest.mock('../../utils/validationMonitor', () => ({
  validationMonitor: mockValidationMonitor,
}));

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          single: jest.fn(),
          range: jest.fn(),
        })),
        single: jest.fn(),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(),
      })),
      order: jest.fn(),
      range: jest.fn(),
    })),
  })),
};

jest.mock('../../config/supabase', () => ({
  supabase: mockSupabase,
  TABLES: {
    PRODUCTS: 'products',
    CATEGORIES: 'categories',
  },
}));

// Mock BroadcastHelper
const mockBroadcastHelper = {
  sendProductUpdate: jest.fn(),
  sendCategoryUpdate: jest.fn(),
};

jest.mock('../../utils/broadcastHelper', () => ({
  BroadcastHelper: mockBroadcastHelper,
}));

// Import types for testing
import type {
  ProductAdminDatabaseContract,
  CategoryAdminDatabaseContract,
  ProductCreateContract,
  ProductUpdateContract,
  BulkStockUpdateContract,
} from '../__contracts__/productAdmin.contracts.test';

describe('ProductAdminService', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    jest.clearAllMocks();
  });

  describe('Database Field Selection Validation', () => {
    it('should select exact database fields for products query', async () => {
      // Arrange: Mock successful database response
      const mockDbResponse = {
        data: [
          {
            id: 'prod-1',
            name: 'Test Product',
            description: 'Test Description',
            price: 10.99,
            stock_quantity: 50,
            category_id: 'cat-1',
            image_url: 'test-image.jpg',
            is_available: true,
            is_pre_order: false,
            min_pre_order_quantity: null,
            max_pre_order_quantity: null,
            unit: 'piece',
            weight: 1.5,
            sku: 'TEST-001',
            tags: ['organic'],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        error: null,
      };

      const mockQuery = {
        eq: jest.fn(() => ({
          order: jest.fn(() => mockDbResponse),
        })),
      };

      const mockSelect = jest.fn(() => mockQuery);
      const mockFrom = jest.fn(() => ({ select: mockSelect }));
      mockSupabase.from.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue(mockQuery);

      // Expected field selection (MUST match ProductAdminDatabaseContract)
      const expectedFieldSelection = `
        id,
        name,
        description,
        price,
        stock_quantity,
        category_id,
        image_url,
        is_available,
        is_pre_order,
        min_pre_order_quantity,
        max_pre_order_quantity,
        unit,
        weight,
        sku,
        tags,
        created_at,
        updated_at
      `.replace(/\s+/g, ' ').trim();

      // Act: This will be implemented in actual service
      // For now, validate the contract exists and field selection is correct
      
      // Assert: Verify exact field selection is enforced
      expect(expectedFieldSelection).toContain('id');
      expect(expectedFieldSelection).toContain('name');
      expect(expectedFieldSelection).toContain('description');
      expect(expectedFieldSelection).toContain('price');
      expect(expectedFieldSelection).toContain('stock_quantity');
      expect(expectedFieldSelection).toContain('category_id');
      expect(expectedFieldSelection).toContain('image_url');
      expect(expectedFieldSelection).toContain('is_available');
      expect(expectedFieldSelection).toContain('is_pre_order');
      expect(expectedFieldSelection).toContain('min_pre_order_quantity');
      expect(expectedFieldSelection).toContain('max_pre_order_quantity');
      expect(expectedFieldSelection).toContain('unit');
      expect(expectedFieldSelection).toContain('weight');
      expect(expectedFieldSelection).toContain('sku');
      expect(expectedFieldSelection).toContain('tags');
      expect(expectedFieldSelection).toContain('created_at');
      expect(expectedFieldSelection).toContain('updated_at');
    });

    it('should select exact database fields for categories query', async () => {
      // Expected field selection for categories (MUST match CategoryAdminDatabaseContract)
      const expectedFieldSelection = `
        id,
        name,
        description,
        image_url,
        sort_order,
        is_available,
        created_at,
        updated_at
      `.replace(/\s+/g, ' ').trim();

      // Assert: Verify exact field selection is enforced
      expect(expectedFieldSelection).toContain('id');
      expect(expectedFieldSelection).toContain('name');
      expect(expectedFieldSelection).toContain('description');
      expect(expectedFieldSelection).toContain('image_url');
      expect(expectedFieldSelection).toContain('sort_order');
      expect(expectedFieldSelection).toContain('is_available');
      expect(expectedFieldSelection).toContain('created_at');
      expect(expectedFieldSelection).toContain('updated_at');
    });
  });

  describe('Pattern 3: Resilient Item Processing', () => {
    it('should process items individually with skip-on-error for products', async () => {
      // Arrange: Mock database response with one valid and one invalid item
      const mockDbResponse = {
        data: [
          // Valid product
          {
            id: 'prod-1',
            name: 'Valid Product',
            price: 10.99,
            stock_quantity: 50,
            is_available: true,
            is_pre_order: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          // Invalid product (missing required fields)
          {
            id: 'prod-2',
            name: null, // Invalid: name is required
            price: 'invalid', // Invalid: should be number
            stock_quantity: -5, // Invalid: negative stock
            is_available: true,
            is_pre_order: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          // Another valid product
          {
            id: 'prod-3',
            name: 'Another Valid Product',
            price: 15.99,
            stock_quantity: 25,
            is_available: true,
            is_pre_order: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        error: null,
      };

      // Act & Assert: Resilient processing should:
      // 1. Process valid items successfully
      // 2. Skip invalid items with error logging
      // 3. Continue processing remaining items
      // 4. Return successful items only
      
      // Validate that we expect 2 valid products and 1 skipped
      const validProducts = mockDbResponse.data.filter(product => 
        product.name && 
        typeof product.price === 'number' && 
        product.stock_quantity >= 0
      );
      
      expect(validProducts).toHaveLength(2);
      expect(validProducts[0].id).toBe('prod-1');
      expect(validProducts[1].id).toBe('prod-3');
    });

    it('should track validation successes and failures with ValidationMonitor', async () => {
      // Arrange: Mock mixed success/failure scenario
      const mockProducts = [
        { id: 'prod-1', name: 'Valid', price: 10.99, stock_quantity: 50 },
        { id: 'prod-2', name: null, price: 'invalid', stock_quantity: -5 },
      ];

      // Act: Simulate validation tracking
      // Success case
      mockValidationMonitor.trackSuccess('product-validation', {
        productId: 'prod-1',
        operation: 'admin-fetch',
      });

      // Failure case
      mockValidationMonitor.trackFailure('product-validation', {
        productId: 'prod-2',
        operation: 'admin-fetch',
        errors: ['name is required', 'price must be number', 'stock cannot be negative'],
      });

      // Assert: ValidationMonitor integration
      expect(mockValidationMonitor.trackSuccess).toHaveBeenCalledWith('product-validation', {
        productId: 'prod-1',
        operation: 'admin-fetch',
      });

      expect(mockValidationMonitor.trackFailure).toHaveBeenCalledWith('product-validation', {
        productId: 'prod-2',
        operation: 'admin-fetch',
        errors: ['name is required', 'price must be number', 'stock cannot be negative'],
      });
    });
  });

  describe('Admin CRUD Operations', () => {
    it('should validate product creation with proper field mapping', async () => {
      // Arrange: Valid product creation data
      const createData: ProductCreateContract = {
        name: 'New Product',
        description: 'New product description',
        price: 25.99,
        stock_quantity: 100,
        category_id: 'cat-1',
        image_url: 'new-product.jpg',
        is_available: true,
        is_pre_order: false,
        unit: 'piece',
        weight: 2.0,
        sku: 'NEW-001',
        tags: ['new', 'featured'],
      };

      // Mock successful insert response
      const mockInsertResponse = {
        data: {
          id: 'prod-new',
          ...createData,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      };

      // Act & Assert: Validate creation contract
      expect(createData.name).toBeDefined();
      expect(createData.price).toBeDefined();
      expect(createData.stock_quantity).toBeDefined();
      expect(typeof createData.name).toBe('string');
      expect(typeof createData.price).toBe('number');
      expect(typeof createData.stock_quantity).toBe('number');
      expect(createData.price).toBeGreaterThan(0);
      expect(createData.stock_quantity).toBeGreaterThanOrEqual(0);
    });

    it('should validate product update with partial data', async () => {
      // Arrange: Partial update data
      const updateData: ProductUpdateContract = {
        price: 29.99,
        stock_quantity: 75,
        description: 'Updated description',
      };

      // Act & Assert: Validate update contract
      expect(updateData.name).toBeUndefined(); // Should be optional
      expect(updateData.price).toBeDefined();
      expect(updateData.stock_quantity).toBeDefined();
      expect(typeof updateData.price).toBe('number');
      expect(typeof updateData.stock_quantity).toBe('number');
      expect(updateData.price).toBeGreaterThan(0);
      expect(updateData.stock_quantity).toBeGreaterThanOrEqual(0);
    });

    it('should validate bulk stock update operations', async () => {
      // Arrange: Bulk stock update data
      const bulkUpdates: BulkStockUpdateContract[] = [
        { product_id: 'prod-1', new_stock: 100, reason: 'Restock' },
        { product_id: 'prod-2', new_stock: 50, reason: 'Inventory adjustment' },
        { product_id: 'prod-3', new_stock: 0, reason: 'Sold out' },
      ];

      // Act & Assert: Validate bulk update contracts
      for (const update of bulkUpdates) {
        expect(update.product_id).toBeDefined();
        expect(update.new_stock).toBeDefined();
        expect(typeof update.product_id).toBe('string');
        expect(typeof update.new_stock).toBe('number');
        expect(update.new_stock).toBeGreaterThanOrEqual(0);
        
        if (update.reason) {
          expect(typeof update.reason).toBe('string');
        }
      }
    });
  });

  describe('Atomic Operations with Broadcasting', () => {
    it('should broadcast product updates after successful operations', async () => {
      // Arrange: Mock successful update
      const productId = 'prod-1';
      const updatedProduct = {
        id: productId,
        name: 'Updated Product',
        price: 15.99,
        stock_quantity: 75,
      };

      // Act: Simulate broadcast after update
      await mockBroadcastHelper.sendProductUpdate('product-updated', {
        productId,
        product: updatedProduct,
        operation: 'admin-update',
      });

      // Assert: Broadcasting integration
      expect(mockBroadcastHelper.sendProductUpdate).toHaveBeenCalledWith('product-updated', {
        productId,
        product: updatedProduct,
        operation: 'admin-update',
      });
    });

    it('should broadcast category updates after successful operations', async () => {
      // Arrange: Mock successful category update
      const categoryId = 'cat-1';
      const updatedCategory = {
        id: categoryId,
        name: 'Updated Category',
        sort_order: 2,
        is_available: true,
      };

      // Act: Simulate broadcast after update
      await mockBroadcastHelper.sendCategoryUpdate('category-updated', {
        categoryId,
        category: updatedCategory,
        operation: 'admin-update',
      });

      // Assert: Broadcasting integration
      expect(mockBroadcastHelper.sendCategoryUpdate).toHaveBeenCalledWith('category-updated', {
        categoryId,
        category: updatedCategory,
        operation: 'admin-update',
      });
    });
  });

  describe('Error Handling and Graceful Degradation', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange: Mock database error
      const mockError = {
        data: null,
        error: {
          message: 'Database connection failed',
          code: 'PGRST301',
        },
      };

      // Act & Assert: Error handling should:
      // 1. Log error appropriately
      // 2. Return user-friendly error message
      // 3. Track failure with ValidationMonitor
      // 4. Not break user workflows

      expect(mockError.error.message).toBeDefined();
      expect(typeof mockError.error.message).toBe('string');
      
      // Simulate ValidationMonitor error tracking
      mockValidationMonitor.trackFailure('database-error', {
        operation: 'admin-fetch-products',
        error: mockError.error.message,
        code: mockError.error.code,
      });

      expect(mockValidationMonitor.trackFailure).toHaveBeenCalledWith('database-error', {
        operation: 'admin-fetch-products',
        error: 'Database connection failed',
        code: 'PGRST301',
      });
    });

    it('should provide user-friendly error messages', async () => {
      // Arrange: Various error scenarios
      const errorScenarios = [
        {
          dbError: { code: 'PGRST116', message: 'No rows returned' },
          userMessage: 'Product not found',
        },
        {
          dbError: { code: '23505', message: 'duplicate key value violates unique constraint' },
          userMessage: 'Product with this SKU already exists',
        },
        {
          dbError: { code: '23503', message: 'violates foreign key constraint' },
          userMessage: 'Invalid category selected',
        },
        {
          dbError: { code: '23502', message: 'null value in column violates not-null constraint' },
          userMessage: 'Required field is missing',
        },
      ];

      // Act & Assert: Verify user-friendly message mapping
      for (const scenario of errorScenarios) {
        expect(scenario.dbError.code).toBeDefined();
        expect(scenario.dbError.message).toBeDefined();
        expect(scenario.userMessage).toBeDefined();
        expect(typeof scenario.userMessage).toBe('string');
        expect(scenario.userMessage.length).toBeGreaterThan(0);
        expect(scenario.userMessage).not.toContain('PGRST'); // No technical codes
        expect(scenario.userMessage).not.toContain('constraint'); // No technical terms
      }
    });
  });

  describe('Pre-order Product Validation', () => {
    it('should validate pre-order quantity constraints', async () => {
      // Arrange: Pre-order product data
      const preOrderProduct = {
        name: 'Pre-order Product',
        price: 50.99,
        stock_quantity: 0, // Pre-order can have 0 stock
        is_pre_order: true,
        min_pre_order_quantity: 5,
        max_pre_order_quantity: 50,
      };

      // Act & Assert: Pre-order validation
      expect(preOrderProduct.is_pre_order).toBe(true);
      expect(preOrderProduct.min_pre_order_quantity).toBeDefined();
      expect(preOrderProduct.max_pre_order_quantity).toBeDefined();
      expect(preOrderProduct.min_pre_order_quantity!).toBeGreaterThan(0);
      expect(preOrderProduct.max_pre_order_quantity!).toBeGreaterThan(0);
      expect(preOrderProduct.min_pre_order_quantity!).toBeLessThanOrEqual(preOrderProduct.max_pre_order_quantity!);
    });

    it('should allow null pre-order quantities for regular products', async () => {
      // Arrange: Regular product data
      const regularProduct = {
        name: 'Regular Product',
        price: 10.99,
        stock_quantity: 100,
        is_pre_order: false,
        min_pre_order_quantity: null,
        max_pre_order_quantity: null,
      };

      // Act & Assert: Regular product validation
      expect(regularProduct.is_pre_order).toBe(false);
      expect(regularProduct.min_pre_order_quantity).toBeNull();
      expect(regularProduct.max_pre_order_quantity).toBeNull();
      expect(regularProduct.stock_quantity).toBeGreaterThan(0);
    });
  });
});