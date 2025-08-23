import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock ValidationMonitor before importing service (copying authService pattern)
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

// Mock the supabase module at the service level (copying authService exact pattern)
const mockSupabase = require('../../../config/supabase').supabase;

// Service testing with mocks (following successful patterns)
describe('StockMovementService - Phase 2.2 (Mocked)', () => {
  
  // Mock test data
  const testInventoryId = '11111111-1111-1111-1111-111111111111';
  const testUserId = '11111111-1111-1111-1111-111111111111';
  const testMovementId = '22222222-2222-2222-2222-222222222222';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordMovement', () => {
    const mockMovementInput: CreateStockMovementInput = {
      inventoryItemId: testInventoryId,
      movementType: 'adjustment',
      quantityChange: -5,
      previousStock: 100,
      newStock: 95,
      reason: 'Test inventory adjustment',
      performedBy: testUserId
    };

    const mockMovementData = {
      id: testMovementId,
      inventory_item_id: testInventoryId,
      movement_type: 'adjustment',
      quantity_change: -5,
      previous_stock: 100,
      new_stock: 95,
      reason: 'Test inventory adjustment',
      performed_by: testUserId,
      performed_at: '2025-08-23T01:00:00Z',
      created_at: '2025-08-23T01:00:00Z',
      reference_order_id: null,
      batch_id: null
    };

    it('should record stock movement with complete audit trail (mocked)', async () => {
      // Setup successful insert mock (authService exact pattern)
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMovementData,
              error: null
            })
          })
        })
      });

      const result = await StockMovementService.recordMovement(mockMovementInput);
      
      // Step 1: Verify successful response
      expect(result).toBeDefined();
      
      // Step 2: Verify transformation occurred (snake_case → camelCase)
      expect(result?.inventoryItemId).toBe(testInventoryId);
      expect(result?.movementType).toBe('adjustment');
      expect(result?.quantityChange).toBe(-5);
      expect(result?.previousStock).toBe(100);
      expect(result?.newStock).toBe(95);
      expect(result?.reason).toBe('Test inventory adjustment');
      expect(result?.performedBy).toBe(testUserId);
      
      // Step 3: Verify ValidationMonitor integration
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'stockMovementService',
        pattern: 'transformation_schema',
        operation: 'recordMovement'
      });
      
      // Step 4: Verify database operation was called correctly
      expect(mockSupabase.from).toHaveBeenCalledWith('test_stock_movements');
    });

    it('should validate movement type constraints (mocked)', async () => {
      const restockMovementData = {
        ...mockMovementData,
        movement_type: 'restock',
        quantity_change: 10,
        new_stock: 110
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: restockMovementData,
              error: null
            })
          })
        })
      });

      const movement = {
        inventoryItemId: testInventoryId,
        movementType: 'restock' as const,
        quantityChange: 10,
        previousStock: 100,
        newStock: 110,
        reason: 'Test restock movement'
      };

      const result = await StockMovementService.recordMovement(movement);
      
      expect(result).toBeDefined();
      expect(result?.movementType).toBe('restock');
    });

    it('should handle movement recording errors gracefully', async () => {
      // Setup database error mock
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed', code: 'PGRST000' }
            })
          })
        })
      });

      const result = await StockMovementService.recordMovement(mockMovementInput);
      
      expect(result).toBeNull();
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'StockMovementService.recordMovement',
        errorCode: 'MOVEMENT_RECORDING_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: 'Database connection failed'
      });
    });
  });

  describe('getMovementHistory', () => {
    const mockHistoryInput: MovementHistoryInput = {
      inventoryItemId: testInventoryId,
      limit: 10,
      offset: 0
    };

    const mockHistoryData = [
      {
        id: testMovementId,
        inventory_item_id: testInventoryId,
        movement_type: 'adjustment',
        quantity_change: -5,
        previous_stock: 100,
        new_stock: 95,
        reason: 'Historical movement',
        performed_by: testUserId,
        performed_at: '2025-08-23T01:00:00Z',
        created_at: '2025-08-23T01:00:00Z',
        reference_order_id: null,
        batch_id: null
      }
    ];

    it('should get movement history with pagination and filtering (mocked)', async () => {
      // Setup history query mock - correct chain for getMovementHistory
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: mockHistoryData,
                error: null
              })
            })
          })
        })
      });

      const result = await StockMovementService.getMovementHistory(mockHistoryInput);
      
      expect(result.success).toHaveLength(1);
      expect(result.totalProcessed).toBe(1);
      expect(result.success[0].inventoryItemId).toBe(testInventoryId);
      
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'stockMovementService',
        pattern: 'transformation_schema',
        operation: 'getMovementHistory'
      });
    });

    it('should handle pagination correctly', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      });

      const result = await StockMovementService.getMovementHistory({
        inventoryItemId: testInventoryId,
        limit: 5,
        offset: 10
      });
      
      expect(result.success).toEqual([]);
      expect(result.totalProcessed).toBe(0);
    });
  });

  describe('role-based access control', () => {
    it('should respect role-based permissions for audit trail access', async () => {
      const testUserId = '22222222-2222-2222-2222-222222222222'; // marketing_staff
      
      // Setup role data mock - marketing staff can read but not write
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [
                {
                  role_type: 'marketing_staff',
                  permissions: ['read_movements']
                }
              ],
              error: null
            })
          })
        })
      });
      
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
        pattern: 'transformation_schema',
        operation: 'checkMovementPermission'
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error', code: 'PGRST000' }
              })
            })
          })
        })
      });

      const result = await StockMovementService.getMovementHistory({
        inventoryItemId: testInventoryId,
        limit: 10
      });
      
      expect(result.success).toEqual([]);
      expect(result.totalProcessed).toBe(0);
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });
});