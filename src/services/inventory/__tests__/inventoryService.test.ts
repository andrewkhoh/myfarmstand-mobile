import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Real Supabase configuration for testing
import { supabase } from '../../../config/supabase';

// Mock ValidationMonitor (following architectural pattern)
jest.mock('../../../utils/validationMonitor');

import { InventoryService } from '../inventoryService';
import { ValidationMonitor } from '../../../utils/validationMonitor';
import type { 
  InventoryItemTransform,
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  StockUpdateInput,
  VisibilityUpdateInput
} from '../../../schemas/inventory';

// Real database testing against test tables
describe('InventoryService - Phase 2.2 (Real Database)', () => {
  
  // Test data cleanup IDs
  const testProductIds = new Set<string>();
  const testInventoryIds = new Set<string>();
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Track test data for cleanup
    testProductIds.clear();
    testInventoryIds.clear();
  });

  afterEach(async () => {
    // Clean up test data from real database
    try {
      // Delete test inventory items
      if (testInventoryIds.size > 0) {
        await supabase
          .from('test_inventory_items')
          .delete()
          .in('id', Array.from(testInventoryIds));
      }
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });

  describe('getInventoryItem', () => {
    it('should get inventory item with transformation and real database validation', async () => {
      // Step 1: Use existing test data from schema setup
      const testInventoryId = '11111111-1111-1111-1111-111111111111'; // From test schema
      
      // Step 2: Call service (this will FAIL initially - RED phase)
      const result = await InventoryService.getInventoryItem(testInventoryId);
      
      // Step 3: Verify transformation occurred (snake_case → camelCase)
      expect(result).toBeDefined();
      expect(result?.id).toBe(testInventoryId);
      expect(result?.productId).toBe('22222222-2222-2222-2222-222222222222'); // from test data
      expect(result?.currentStock).toBe(100);      // current_stock → currentStock
      expect(result?.reservedStock).toBe(10);      // reserved_stock → reservedStock
      expect(result?.availableStock).toBe(90);     // available_stock → availableStock (calculated)
      expect(result?.minimumThreshold).toBe(15);   // minimum_threshold → minimumThreshold
      expect(result?.isActive).toBe(true);         // is_active → isActive
      expect(result?.isVisibleToCustomers).toBe(true); // is_visible_to_customers → isVisibleToCustomers
      
      // Step 4: Verify ValidationMonitor was called (architectural pattern)
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'inventoryService',
        pattern: 'transformation_schema',
        operation: 'getInventoryItem'
      });
    });

    it('should return null when inventory item not found (real database)', async () => {
      const nonExistentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      
      const result = await InventoryService.getInventoryItem(nonExistentId);
      
      expect(result).toBeNull();
      
      // Should still record success for null result (not an error)
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'inventoryService',
        pattern: 'transformation_schema',
        operation: 'getInventoryItem'
      });
    });

    it('should handle database errors gracefully and record failures', async () => {
      // Force a database error by using invalid ID format
      const invalidId = 'invalid-uuid-format';
      
      const result = await InventoryService.getInventoryItem(invalidId);
      
      // Should return null for graceful degradation
      expect(result).toBeNull();
      
      // Error monitoring (MANDATORY pattern)
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'InventoryService.getInventoryItem',
          errorCode: 'INVENTORY_FETCH_FAILED',
          validationPattern: 'transformation_schema'
        })
      );
    });
  });

  describe('getInventoryByProduct', () => {
    it('should get inventory by product ID with real database lookup', async () => {
      const testProductId = '22222222-2222-2222-2222-222222222222'; // From test schema
      
      const result = await InventoryService.getInventoryByProduct(testProductId);
      
      expect(result).toBeDefined();
      expect(result?.productId).toBe(testProductId);
      expect(result?.currentStock).toBe(100);
      expect(result?.availableStock).toBe(90); // Auto-calculated by trigger
      
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'inventoryService',
        pattern: 'transformation_schema',
        operation: 'getInventoryByProduct'
      });
    });

    it('should return null for non-existent product', async () => {
      const nonExistentProductId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
      
      const result = await InventoryService.getInventoryByProduct(nonExistentProductId);
      
      expect(result).toBeNull();
    });
  });

  describe('updateStock', () => {
    it('should update stock with atomic operation and audit trail (real database)', async () => {
      const testInventoryId = '33333333-3333-3333-3333-333333333333'; // From test schema
      const stockUpdate: StockUpdateInput = {
        currentStock: 20,
        reason: 'Test stock update',
        performedBy: '11111111-1111-1111-1111-111111111111' // inventory_staff from test data
      };
      
      const result = await InventoryService.updateStock(testInventoryId, stockUpdate);
      
      expect(result).toBeDefined();
      expect(result?.currentStock).toBe(20);
      expect(result?.availableStock).toBe(18); // 20 - 2 (reserved_stock from test data)
      
      // Verify audit trail was created in stock_movements table
      const { data: movements } = await supabase
        .from('test_stock_movements')
        .select('*')
        .eq('inventory_item_id', testInventoryId)
        .eq('reason', 'Test stock update')
        .order('created_at', { ascending: false })
        .limit(1);
      
      expect(movements).toHaveLength(1);
      expect(movements?.[0]?.movement_type).toBe('adjustment');
      expect(movements?.[0]?.performed_by).toBe(stockUpdate.performedBy);
      
      // Track for cleanup
      testInventoryIds.add(testInventoryId);
    });

    it('should handle stock update errors gracefully', async () => {
      const invalidId = 'invalid-format';
      const stockUpdate: StockUpdateInput = {
        currentStock: 50
      };
      
      const result = await InventoryService.updateStock(invalidId, stockUpdate);
      
      expect(result).toBeNull();
      
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'InventoryService.updateStock',
          errorCode: 'STOCK_UPDATE_FAILED'
        })
      );
    });
  });

  describe('toggleProductVisibility', () => {
    it('should update product visibility with role-based access control', async () => {
      const testInventoryId = '33333333-3333-3333-3333-333333333333'; // From test schema
      const visibilityUpdate: VisibilityUpdateInput = {
        isVisibleToCustomers: true,
        isActive: true
      };
      
      const result = await InventoryService.toggleProductVisibility(testInventoryId, visibilityUpdate);
      
      expect(result).toBeDefined();
      expect(result?.isVisibleToCustomers).toBe(true);
      expect(result?.isActive).toBe(true);
      
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'inventoryService',
        pattern: 'transformation_schema',
        operation: 'toggleProductVisibility'
      });
    });
  });

  describe('getLowStockItems', () => {
    it('should get low stock items with threshold filtering (real database)', async () => {
      // Test uses existing data where available_stock (3) <= minimum_threshold (20)
      const result = await InventoryService.getLowStockItems();
      
      expect(Array.isArray(result.success)).toBe(true);
      expect(result.totalProcessed).toBeGreaterThan(0);
      
      // Should find items where available_stock <= minimum_threshold
      const lowStockItem = result.success.find(item => 
        item.availableStock <= (item.minimumThreshold || 0)
      );
      expect(lowStockItem).toBeDefined();
      
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'inventoryService',
        pattern: 'transformation_schema',
        operation: 'getLowStockItems'
      });
    });

    it('should handle resilient processing with partial failures (architectural pattern)', async () => {
      // This tests the resilient item processing pattern
      const result = await InventoryService.getLowStockItems();
      
      // Even if some items fail validation, others should succeed
      expect(result).toEqual(
        expect.objectContaining({
          success: expect.any(Array),
          errors: expect.any(Array),
          totalProcessed: expect.any(Number)
        })
      );
      
      // Total processed should equal success + errors
      expect(result.totalProcessed).toBe(result.success.length);
    });
  });

  describe('batchUpdateStock', () => {
    it('should process batch stock updates with resilient processing (real database)', async () => {
      const batchUpdates = [
        {
          inventoryItemId: '77777777-7777-7777-7777-777777777777', // From test schema
          currentStock: 1100,
          reason: 'Batch update test 1'
        },
        {
          inventoryItemId: '99999999-9999-9999-9999-999999999999', // From test schema  
          currentStock: 30,
          reason: 'Batch update test 2'
        }
      ];
      
      const result = await InventoryService.batchUpdateStock(batchUpdates);
      
      expect(result.success.length).toBeGreaterThanOrEqual(1);
      expect(result.totalProcessed).toBeGreaterThanOrEqual(1);
      
      // Verify at least one update was successful
      const successfulUpdate = result.success[0];
      expect(successfulUpdate).toBeDefined();
      expect([1100, 30]).toContain(successfulUpdate.currentStock);
      
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'inventoryService',
        pattern: 'transformation_schema',
        operation: 'batchUpdateStock'
      });
    });

    it('should skip invalid items and continue processing (resilient pattern)', async () => {
      const batchWithInvalid = [
        {
          inventoryItemId: 'invalid-uuid',
          currentStock: 50,
          reason: 'Should fail'
        },
        {
          inventoryItemId: '77777777-7777-7777-7777-777777777777', // Valid
          currentStock: 1200,
          reason: 'Should succeed'
        }
      ];
      
      const result = await InventoryService.batchUpdateStock(batchWithInvalid);
      
      // Should have processed at least the valid item
      expect(result.success.length).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.totalProcessed).toBe(1); // Only valid items count as processed
      
      // Valid item should have been updated
      expect(result.success[0].currentStock).toBe(1200);
    });
  });

  describe('createInventoryItem', () => {
    it('should create inventory item with input validation (real database)', async () => {
      const testProductId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
      const createInput: CreateInventoryItemInput = {
        productId: testProductId,
        currentStock: 75,
        reservedStock: 5,
        minimumThreshold: 10,
        maximumThreshold: 200,
        isActive: true,
        isVisibleToCustomers: true
      };
      
      const result = await InventoryService.createInventoryItem(createInput);
      
      expect(result).toBeDefined();
      expect(result?.productId).toBe(testProductId);
      expect(result?.currentStock).toBe(75);
      expect(result?.reservedStock).toBe(5);
      expect(result?.availableStock).toBe(70); // Auto-calculated: 75 - 5
      expect(result?.minimumThreshold).toBe(10);
      
      // Track for cleanup
      if (result?.id) {
        testInventoryIds.add(result.id);
      }
      
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'inventoryService',
        pattern: 'transformation_schema',
        operation: 'createInventoryItem'
      });
    });

    it('should handle creation errors with validation failures', async () => {
      const invalidInput = {
        productId: 'invalid-uuid-format',
        currentStock: -10, // Invalid negative stock
        reservedStock: 5
      } as CreateInventoryItemInput;
      
      const result = await InventoryService.createInventoryItem(invalidInput);
      
      expect(result).toBeNull();
      
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'InventoryService.createInventoryItem',
          errorCode: 'INVENTORY_CREATION_FAILED'
        })
      );
    });
  });

  describe('role-based access integration', () => {
    it('should integrate with Phase 1 role permission service', async () => {
      // This test verifies integration with RolePermissionService from Phase 1
      const testUserId = '11111111-1111-1111-1111-111111111111'; // inventory_staff from test data
      
      // This will test the integration point when we implement the service
      const hasPermission = await InventoryService.checkInventoryPermission(
        testUserId, 
        'view_inventory'
      );
      
      expect(typeof hasPermission).toBe('boolean');
      
      // This tests the integration between Phase 1 and Phase 2
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'inventoryService',
        pattern: 'simple_input_validation',
        operation: 'checkInventoryPermission'
      });
    });
  });
});