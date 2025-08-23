import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Real Supabase configuration for testing
import { supabase } from '../../../config/supabase';

// Mock ValidationMonitor (following architectural pattern)
jest.mock('../../../utils/validationMonitor');

import { StockMovementService } from '../stockMovementService';
import { ValidationMonitor } from '../../../utils/validationMonitor';
import type { 
  StockMovementTransform,
  CreateStockMovementInput,
  BatchStockMovementInput,
  MovementFilterInput,
  MovementHistoryInput
} from '../../../schemas/inventory';

// Real database testing against test tables
describe('StockMovementService - Phase 2.2 (Real Database)', () => {
  
  // Test data cleanup IDs
  const testMovementIds = new Set<string>();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset Supabase mocks to prevent state contamination
    if (global.resetSupabaseMocks) {
      global.resetSupabaseMocks();
    }
    testMovementIds.clear();
  });

  afterEach(async () => {
    // Clean up test data from real database
    try {
      if (testMovementIds.size > 0) {
        await supabase
          .from('test_stock_movements')
          .delete()
          .in('id', Array.from(testMovementIds));
      }
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });

  describe('recordMovement', () => {
    it('should record stock movement with complete audit trail (real database)', async () => {
      const testInventoryId = '11111111-1111-1111-1111-111111111111'; // From test schema
      
      const movementInput: CreateStockMovementInput = {
        inventoryItemId: testInventoryId,
        movementType: 'adjustment',
        quantityChange: -5,
        previousStock: 100,
        newStock: 95,
        reason: 'Test inventory adjustment',
        performedBy: '11111111-1111-1111-1111-111111111111' // inventory_staff from test data
      };
      
      // Step 1: Call service (this will FAIL initially - RED phase)
      const result = await StockMovementService.recordMovement(movementInput);
      
      // Step 2: Verify transformation occurred (snake_case → camelCase)
      expect(result).toBeDefined();
      expect(result?.inventoryItemId).toBe(testInventoryId);     // inventory_item_id → inventoryItemId
      expect(result?.movementType).toBe('adjustment');           // movement_type → movementType
      expect(result?.quantityChange).toBe(-5);                   // quantity_change → quantityChange
      expect(result?.previousStock).toBe(100);                   // previous_stock → previousStock
      expect(result?.newStock).toBe(95);                         // new_stock → newStock
      expect(result?.performedBy).toBe(movementInput.performedBy); // performed_by → performedBy
      expect(result?.reason).toBe('Test inventory adjustment');
      
      // Step 3: Verify stock calculation consistency
      expect(result?.newStock).toBe(result?.previousStock + result?.quantityChange);
      
      // Step 4: Track for cleanup
      if (result?.id) {
        testMovementIds.add(result.id);
      }
      
      // Step 5: Verify ValidationMonitor was called (architectural pattern)
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'stockMovementService',
        pattern: 'transformation_schema',
        operation: 'recordMovement'
      });
    });

    it('should validate movement type constraints (real database)', async () => {
      const testInventoryId = '33333333-3333-3333-3333-333333333333';
      
      // Test all valid movement types
      const validMovements = [
        { type: 'restock', change: 10, prev: 5, new: 15 },
        { type: 'sale', change: -3, prev: 15, new: 12 },
        { type: 'adjustment', change: -2, prev: 12, new: 10 },
        { type: 'reservation', change: -5, prev: 10, new: 5 },
        { type: 'release', change: 5, prev: 5, new: 10 }
      ] as const;
      
      for (const movement of validMovements) {
        const movementInput: CreateStockMovementInput = {
          inventoryItemId: testInventoryId,
          movementType: movement.type,
          quantityChange: movement.change,
          previousStock: movement.prev,
          newStock: movement.new,
          reason: `Test ${movement.type} movement`
        };
        
        const result = await StockMovementService.recordMovement(movementInput);
        
        expect(result).toBeDefined();
        expect(result?.movementType).toBe(movement.type);
        
        if (result?.id) {
          testMovementIds.add(result.id);
        }
      }
    });

    it('should handle movement recording errors gracefully', async () => {
      const invalidMovement = {
        inventoryItemId: 'invalid-uuid',
        movementType: 'invalid_type',
        quantityChange: 0, // Invalid - cannot be zero
        previousStock: -5, // Invalid - cannot be negative
        newStock: 10
      } as CreateStockMovementInput;
      
      const result = await StockMovementService.recordMovement(invalidMovement);
      
      expect(result).toBeNull();
      
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'StockMovementService.recordMovement',
          errorCode: 'MOVEMENT_RECORDING_FAILED',
          validationPattern: 'transformation_schema'
        })
      );
    });
  });

  describe('getMovementHistory', () => {
    it('should get movement history with pagination and filtering (real database)', async () => {
      const testInventoryId = '11111111-1111-1111-1111-111111111111'; // Has existing movements
      
      const historyInput: MovementHistoryInput = {
        inventoryItemId: testInventoryId,
        limit: 10,
        offset: 0,
        includeSystemMovements: true
      };
      
      const result = await StockMovementService.getMovementHistory(historyInput);
      
      expect(Array.isArray(result.success)).toBe(true);
      expect(result.totalProcessed).toBeGreaterThanOrEqual(0);
      
      // Verify movements are for the correct inventory item
      result.success.forEach(movement => {
        expect(movement.inventoryItemId).toBe(testInventoryId);
        expect(movement.movementType).toMatch(/^(restock|sale|adjustment|reservation|release)$/);
      });
      
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'stockMovementService',
        pattern: 'transformation_schema',
        operation: 'getMovementHistory'
      });
    });

    it('should handle pagination correctly', async () => {
      const testInventoryId = '11111111-1111-1111-1111-111111111111';
      
      // Test with limit
      const limitedResult = await StockMovementService.getMovementHistory({
        inventoryItemId: testInventoryId,
        limit: 2,
        offset: 0
      });
      
      expect(limitedResult.success.length).toBeLessThanOrEqual(2);
      
      // Test with offset
      const offsetResult = await StockMovementService.getMovementHistory({
        inventoryItemId: testInventoryId,
        limit: 10,
        offset: 1
      });
      
      expect(Array.isArray(offsetResult.success)).toBe(true);
    });
  });

  describe('getMovementsByFilter', () => {
    it('should filter movements by type and date range (real database)', async () => {
      const filterInput: MovementFilterInput = {
        movementType: 'restock',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        limit: 50
      };
      
      const result = await StockMovementService.getMovementsByFilter(filterInput);
      
      expect(Array.isArray(result.success)).toBe(true);
      
      // Verify all results match the filter
      result.success.forEach(movement => {
        expect(movement.movementType).toBe('restock');
        expect(new Date(movement.performedAt).getTime()).toBeGreaterThanOrEqual(
          new Date(filterInput.startDate!).getTime()
        );
        expect(new Date(movement.performedAt).getTime()).toBeLessThanOrEqual(
          new Date(filterInput.endDate!).getTime()
        );
      });
      
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'stockMovementService',
        pattern: 'transformation_schema',
        operation: 'getMovementsByFilter'
      });
    });

    it('should filter movements by user (real database)', async () => {
      const testUserId = '11111111-1111-1111-1111-111111111111'; // From test data
      
      const filterInput: MovementFilterInput = {
        performedBy: testUserId,
        limit: 20
      };
      
      const result = await StockMovementService.getMovementsByFilter(filterInput);
      
      expect(Array.isArray(result.success)).toBe(true);
      
      // Verify all results are by the specified user
      result.success.forEach(movement => {
        expect(movement.performedBy).toBe(testUserId);
      });
    });
  });

  describe('getBatchMovements', () => {
    it('should get movements by batch ID for bulk operation tracking (real database)', async () => {
      const testBatchId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; // From test schema
      
      const result = await StockMovementService.getBatchMovements(testBatchId);
      
      expect(Array.isArray(result.success)).toBe(true);
      expect(result.success.length).toBeGreaterThan(0);
      
      // Verify all movements have the same batch ID
      result.success.forEach(movement => {
        expect(movement.batchId).toBe(testBatchId);
      });
      
      // Verify movements are ordered by performed_at
      for (let i = 1; i < result.success.length; i++) {
        const prev = new Date(result.success[i - 1].performedAt);
        const curr = new Date(result.success[i].performedAt);
        expect(prev.getTime()).toBeLessThanOrEqual(curr.getTime());
      }
      
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'stockMovementService',
        pattern: 'transformation_schema',
        operation: 'getBatchMovements'
      });
    });
  });

  describe('recordBatchMovements', () => {
    it('should record batch movements with resilient processing (real database)', async () => {
      const batchInput: BatchStockMovementInput = {
        movements: [
          {
            inventoryItemId: '77777777-7777-7777-7777-777777777777',
            movementType: 'restock',
            quantityChange: 100,
            previousStock: 1000,
            newStock: 1100,
            reason: 'Batch restock test 1'
          },
          {
            inventoryItemId: '99999999-9999-9999-9999-999999999999',
            movementType: 'restock',
            quantityChange: 10,
            previousStock: 25,
            newStock: 35,
            reason: 'Batch restock test 2'
          }
        ],
        reason: 'Test batch operation',
        performedBy: '11111111-1111-1111-1111-111111111111'
      };
      
      const result = await StockMovementService.recordBatchMovements(batchInput);
      
      expect(result.success.length).toBeGreaterThanOrEqual(1);
      expect(result.totalProcessed).toBeGreaterThanOrEqual(1);
      expect(result.batchId).toBeDefined();
      
      // All successful movements should have the same batch ID
      const batchId = result.batchId;
      result.success.forEach(movement => {
        expect(movement.batchId).toBe(batchId);
        expect(movement.performedBy).toBe(batchInput.performedBy);
        
        // Track for cleanup
        testMovementIds.add(movement.id);
      });
      
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'stockMovementService',
        pattern: 'transformation_schema',
        operation: 'recordBatchMovements'
      });
    });

    it('should handle partial failures in batch processing (resilient pattern)', async () => {
      const batchWithInvalid: BatchStockMovementInput = {
        movements: [
          {
            inventoryItemId: 'invalid-uuid', // Should fail
            movementType: 'restock',
            quantityChange: 50,
            previousStock: 100,
            newStock: 150,
            reason: 'Should fail'
          },
          {
            inventoryItemId: '77777777-7777-7777-7777-777777777777', // Should succeed
            movementType: 'adjustment',
            quantityChange: -10,
            previousStock: 1000,
            newStock: 990,
            reason: 'Should succeed'
          }
        ],
        reason: 'Mixed batch test',
        performedBy: '11111111-1111-1111-1111-111111111111'
      };
      
      const result = await StockMovementService.recordBatchMovements(batchWithInvalid);
      
      // Should process valid items and skip invalid ones
      expect(result.success.length).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.totalProcessed).toBe(1); // Only valid items count
      
      // Valid movement should be recorded
      expect(result.success[0].quantityChange).toBe(-10);
      expect(result.success[0].reason).toBe('Should succeed');
      
      if (result.success[0]) {
        testMovementIds.add(result.success[0].id);
      }
    });
  });

  describe('getMovementAnalytics', () => {
    it('should provide movement analytics with aggregations (real database)', async () => {
      const analyticsInput = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        groupBy: 'day' as const
      };
      
      const result = await StockMovementService.getMovementAnalytics(analyticsInput);
      
      expect(Array.isArray(result.success)).toBe(true);
      
      // Verify analytics structure
      result.success.forEach(analytic => {
        expect(analytic).toEqual(
          expect.objectContaining({
            movementType: expect.any(String),
            totalQuantity: expect.any(Number),
            movementCount: expect.any(Number),
            averageQuantity: expect.any(Number),
            impact: expect.stringMatching(/^(positive|negative|neutral)$/)
          })
        );
      });
      
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'stockMovementService',
        pattern: 'transformation_schema',
        operation: 'getMovementAnalytics'
      });
    });
  });

  describe('integration with inventory service', () => {
    it('should integrate with inventory updates for atomic operations', async () => {
      // This test verifies the integration between stock movements and inventory updates
      const testInventoryId = '33333333-3333-3333-3333-333333333333';
      
      // Record a movement that should update inventory
      const movementInput: CreateStockMovementInput = {
        inventoryItemId: testInventoryId,
        movementType: 'sale',
        quantityChange: -1,
        previousStock: 5,
        newStock: 4,
        reason: 'Integration test sale',
        performedBy: '11111111-1111-1111-1111-111111111111'
      };
      
      const result = await StockMovementService.recordMovementWithInventoryUpdate(movementInput);
      
      expect(result).toBeDefined();
      expect(result?.movementRecord).toBeDefined();
      expect(result?.updatedInventory).toBeDefined();
      
      // Verify inventory was updated
      expect(result?.updatedInventory.currentStock).toBe(4);
      expect(result?.updatedInventory.availableStock).toBe(2); // 4 - 2 (reserved)
      
      if (result?.movementRecord.id) {
        testMovementIds.add(result.movementRecord.id);
      }
      
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'stockMovementService',
        pattern: 'transformation_schema',
        operation: 'recordMovementWithInventoryUpdate'
      });
    });
  });

  describe('role-based access control', () => {
    it('should respect role-based permissions for audit trail access', async () => {
      const testUserId = '22222222-2222-2222-2222-222222222222'; // marketing_staff from test data
      
      // Test that marketing staff can read movements but not create them
      const canRead = await StockMovementService.checkMovementPermission(
        testUserId,
        'read_movements'
      );
      
      const canWrite = await StockMovementService.checkMovementPermission(
        testUserId,
        'record_movements'
      );
      
      expect(canRead).toBe(true);  // Marketing staff can read for analytics
      expect(canWrite).toBe(false); // But cannot record movements
      
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'stockMovementService',
        pattern: 'simple_input_validation',
        operation: 'checkMovementPermission'
      });
    });
  });
});