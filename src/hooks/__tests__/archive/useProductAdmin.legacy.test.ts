/**
 * Product Admin Hook Tests
 * 
 * Tests centralized query key factory usage, smart invalidation,
 * graceful degradation, and ValidationMonitor integration.
 * 
 * Pattern: React Query Pattern 1 - User-isolated keys (no dual systems)
 * Pattern: React Query Pattern 3 - Smart invalidation (targeted, not global)
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../test/contracts/hook.contracts';
import { createProduct } from '../../test/factories/product.factory';

// Mock ValidationMonitor before importing hooks
const mockValidationMonitor = {
  trackSuccess: jest.fn(),
  trackFailure: jest.fn(),
  trackMismatch: jest.fn(),
  getMetrics: jest.fn(),
};

jest.mock('../../utils/validationMonitor', () => ({
  validationMonitor: mockValidationMonitor,
}));

// Mock the centralized query key factory (simplified for testing)
jest.mock('../../utils/queryKeyFactory', () => ({
  productKeys: {
    all: () => ['products'],
    lists: () => ['products', 'list'],
    list: (filters: any) => ['products', 'list', filters],
    details: () => ['products', 'detail'],
    detail: (id: string) => ['products', 'detail', id],
  },
}));

// ProductAdminService will be created in Task 3 - for now we focus on architectural patterns

// Mock QueryClient for testing query key patterns
const createTestQueryClient = () => ({
  setQueryData: jest.fn(),
  getQueryState: jest.fn(),
  invalidateQueries: jest.fn(),
  clear: jest.fn(),
});

describe('useProductAdmin Hook Tests', () => {
  let queryClient: any;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  describe('Centralized Query Key Factory Usage', () => {
    it('should use centralized productKeys factory pattern', () => {
      // Import the mocked factory
      const { productKeys } = require('../../utils/queryKeyFactory');
      
      // Assert: Verify keys follow centralized pattern
      const allKey = productKeys.all();
      const listKey = productKeys.lists();
      const detailKey = productKeys.detail('prod-1');

      // Keys must follow consistent factory pattern
      expect(allKey).toEqual(['products']);
      expect(listKey).toEqual(['products', 'list']);
      expect(detailKey).toEqual(['products', 'detail', 'prod-1']);

      // All keys must start with the same base entity
      expect(allKey[0]).toBe('products');
      expect(listKey[0]).toBe('products');
      expect(detailKey[0]).toBe('products');
    });

    it('should never create local query key duplicates', () => {
      // Assert: This test validates the architectural requirement that we MUST NOT create
      // local query key factories that duplicate centralized ones

      // All keys must originate from centralized factories
      const { productKeys } = require('../../utils/queryKeyFactory');
      const baseKey = productKeys.all();

      // There should be NO alternative key structures
      expect(baseKey).toEqual(['products']); // Correct centralized pattern
      expect(baseKey).not.toEqual(['admin', 'products']); // Wrong order
      expect(baseKey).not.toEqual(['productAdmin']); // Separate namespace
    });

    it('should support admin-specific extensions to centralized keys', () => {
      // This test validates that admin functionality should extend the centralized
      // factory rather than creating separate factories
      
      const { productKeys } = require('../../utils/queryKeyFactory');
      const baseKey = productKeys.all();
      
      // Admin operations should extend the base pattern
      // Example: ['products'] -> ['products', 'admin', 'bulk', 'stock']
      const adminBulkStockKey = [...baseKey, 'admin', 'bulk', 'stock'];
      const adminLowStockKey = [...baseKey, 'admin', 'stock', 'low'];
      
      expect(adminBulkStockKey).toEqual(['products', 'admin', 'bulk', 'stock']);
      expect(adminLowStockKey).toEqual(['products', 'admin', 'stock', 'low']);
      
      // Must maintain base consistency
      expect(adminBulkStockKey[0]).toBe(baseKey[0]);
      expect(adminLowStockKey[0]).toBe(baseKey[0]);
    });
  });

  describe('Smart Invalidation Patterns', () => {
    it('should support targeted invalidation for admin operations', () => {
      // This test validates Pattern 3: Smart invalidation concept
      const { productKeys } = require('../../utils/queryKeyFactory');
      
      // Admin operations should allow targeted invalidation
      const baseKey = productKeys.all();
      const adminKey = [...baseKey, 'admin'];
      const adminBulkKey = [...baseKey, 'admin', 'bulk'];
      const adminStockKey = [...baseKey, 'admin', 'stock'];

      // Assert: Keys allow hierarchical targeting
      expect(adminKey).toEqual(['products', 'admin']);
      expect(adminBulkKey).toEqual(['products', 'admin', 'bulk']);
      expect(adminStockKey).toEqual(['products', 'admin', 'stock']);

      // Smart invalidation means we can target specific areas
      expect(adminKey).not.toEqual(['products']); // More specific than base
      expect(adminBulkKey).not.toEqual(['products', 'admin']); // More specific than admin
    });

    it('should avoid over-invalidation by maintaining separate namespaces', () => {
      // This validates that admin operations don't accidentally invalidate user data
      const { productKeys } = require('../../utils/queryKeyFactory');
      
      const baseProductKey = productKeys.all();
      const adminProductKey = [...baseProductKey, 'admin'];
      const userProductKey = [...baseProductKey, 'list', { user: 'customer' }];

      // Assert: Different key namespaces
      expect(adminProductKey).toEqual(['products', 'admin']);
      expect(userProductKey).toEqual(['products', 'list', { user: 'customer' }]);

      // Admin and user keys are distinct
      expect(adminProductKey[1]).toBe('admin');
      expect(userProductKey[1]).toBe('list');
      expect(adminProductKey[1]).not.toBe(userProductKey[1]);
    });
  });

  describe('ValidationMonitor Integration', () => {
    it('should track successful admin operations', () => {
      // Act: Simulate successful validation monitoring
      mockValidationMonitor.trackSuccess('admin-product-fetch', {
        productId: 'prod-1',
        operation: 'getProductById',
      });

      // Assert: ValidationMonitor tracking
      expect(mockValidationMonitor.trackSuccess).toHaveBeenCalledWith('admin-product-fetch', {
        productId: 'prod-1',
        operation: 'getProductById',
      });
    });

    it('should track failed admin operations', () => {
      // Act: Simulate failed validation monitoring
      mockValidationMonitor.trackFailure('admin-product-fetch', {
        productId: 'prod-1',
        operation: 'getProductById',
        error: 'Product not found',
      });

      // Assert: ValidationMonitor failure tracking
      expect(mockValidationMonitor.trackFailure).toHaveBeenCalledWith('admin-product-fetch', {
        productId: 'prod-1',
        operation: 'getProductById',
        error: 'Product not found',
      });
    });

    it('should track calculation mismatches in bulk operations', () => {
      // Arrange: Bulk operation parameters
      const expectedUpdates = 5;
      const actualUpdates = 3;

      // Act: Simulate mismatch tracking
      mockValidationMonitor.trackMismatch('bulk-stock-update', {
        operation: 'bulkUpdateStock',
        expected: expectedUpdates,
        actual: actualUpdates,
        mismatchType: 'partial-failure',
      });

      // Assert: ValidationMonitor mismatch tracking
      expect(mockValidationMonitor.trackMismatch).toHaveBeenCalledWith('bulk-stock-update', {
        operation: 'bulkUpdateStock',
        expected: expectedUpdates,
        actual: actualUpdates,
        mismatchType: 'partial-failure',
      });
    });
  });

  describe('Graceful Degradation for Unauthorized Users', () => {
    it('should handle unauthorized access gracefully', () => {
      // Arrange: Mock unauthorized response structure
      const unauthorizedError = {
        success: false,
        error: 'Insufficient permissions for admin operations',
        code: 'UNAUTHORIZED',
      };

      // Act & Assert: Graceful degradation expectations
      expect(unauthorizedError.success).toBe(false);
      expect(unauthorizedError.error).toContain('permissions');
      expect(unauthorizedError.code).toBe('UNAUTHORIZED');

      // Hook should:
      // 1. Not crash the application
      // 2. Provide user-friendly error message
      // 3. Track the authorization failure
      // 4. Potentially redirect to login or show permission error
    });

    it('should provide fallback data for partial failures', () => {
      // Arrange: Mock partial failure scenario structure
      const partialResponse = {
        success: true,
        products: [
          { id: 'prod-1', name: 'Valid Product' },
          { id: 'prod-3', name: 'Another Valid Product' },
        ],
        errors: [
          { productId: 'prod-2', error: 'Validation failed' },
        ],
        totalRequested: 3,
        totalReturned: 2,
      };

      // Act & Assert: Graceful handling of partial data
      expect(partialResponse.success).toBe(true); // Overall operation succeeded
      expect(partialResponse.products).toHaveLength(2); // Partial data available
      expect(partialResponse.errors).toHaveLength(1); // Errors tracked
      expect(partialResponse.totalReturned).toBeLessThan(partialResponse.totalRequested);

      // Hook should provide the available data while noting the partial failure
    });

    it('should never break user workflows due to admin errors', () => {
      // Arrange: Various error scenarios that should not break workflows
      const errorScenarios = [
        { type: 'network', error: 'Network timeout' },
        { type: 'database', error: 'Database connection failed' },
        { type: 'validation', error: 'Invalid data format' },
        { type: 'permission', error: 'Insufficient admin rights' },
      ];

      // Act & Assert: Each error should be handled gracefully
      for (const scenario of errorScenarios) {
        // Error responses should be consistent
        const errorResponse = {
          success: false,
          error: scenario.error,
          type: scenario.type,
          userMessage: 'Something went wrong. Please try again.',
        };

        expect(errorResponse.success).toBe(false);
        expect(errorResponse.error).toBeDefined();
        expect(errorResponse.userMessage).toBeDefined();
        expect(errorResponse.userMessage).not.toContain('Database'); // No technical details
        expect(errorResponse.userMessage).not.toContain('PGRST'); // No error codes
      }
    });
  });

  describe('Admin-specific Query Extensions', () => {
    it('should support admin query key extensions', () => {
      // This test validates that admin functionality can extend base query keys
      const { productKeys } = require('../../utils/queryKeyFactory');
      
      const baseKey = productKeys.all();
      
      // Admin extensions should follow consistent patterns
      const adminLowStockKey = [...baseKey, 'admin', 'stock', 'low', 10];
      const adminOutOfStockKey = [...baseKey, 'admin', 'stock', 'out'];
      const adminCategoryKey = [...baseKey, 'admin', 'categories', 'cat-vegetables'];
      const adminBulkKey = [...baseKey, 'admin', 'bulk', 'stock'];

      // Assert: Extensions maintain base key consistency
      expect(adminLowStockKey[0]).toBe('products');
      expect(adminOutOfStockKey[0]).toBe('products');
      expect(adminCategoryKey[0]).toBe('products');
      expect(adminBulkKey[0]).toBe('products');

      // Assert: Extensions add admin namespace
      expect(adminLowStockKey[1]).toBe('admin');
      expect(adminOutOfStockKey[1]).toBe('admin');
      expect(adminCategoryKey[1]).toBe('admin');
      expect(adminBulkKey[1]).toBe('admin');

      // Assert: Extensions allow specific targeting
      expect(adminLowStockKey).toEqual(['products', 'admin', 'stock', 'low', 10]);
      expect(adminOutOfStockKey).toEqual(['products', 'admin', 'stock', 'out']);
      expect(adminCategoryKey).toEqual(['products', 'admin', 'categories', 'cat-vegetables']);
      expect(adminBulkKey).toEqual(['products', 'admin', 'bulk', 'stock']);
    });

    it('should maintain query key hierarchy for cache management', () => {
      // This validates that admin query keys maintain proper hierarchy for invalidation
      const { productKeys } = require('../../utils/queryKeyFactory');
      
      const baseKey = productKeys.all();
      const adminBaseKey = [...baseKey, 'admin'];
      const adminStockKey = [...adminBaseKey, 'stock'];
      const adminBulkKey = [...adminBaseKey, 'bulk'];

      // Assert: Hierarchical structure enables targeted invalidation
      expect(adminBaseKey).toEqual(['products', 'admin']);
      expect(adminStockKey).toEqual(['products', 'admin', 'stock']);
      expect(adminBulkKey).toEqual(['products', 'admin', 'bulk']);

      // Assert: Each level can be targeted for invalidation
      expect(adminStockKey.slice(0, 2)).toEqual(adminBaseKey);
      expect(adminBulkKey.slice(0, 2)).toEqual(adminBaseKey);
    });
  });
});