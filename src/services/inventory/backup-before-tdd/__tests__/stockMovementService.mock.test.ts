// Store mock instance globally for test access
let mockSupabaseInstance: any;

// Mock Supabase - SimplifiedSupabaseMock in jest.mock() call - MUST BE BEFORE IMPORTS
jest.mock("../../../config/supabase", () => {
  const { SimplifiedSupabaseMock } = require("../../../test/mocks/supabase.simplified.mock");
  mockSupabaseInstance = new SimplifiedSupabaseMock();
  return {
    supabase: mockSupabaseInstance.createClient(),
    TABLES: { 
      STOCK_MOVEMENTS: 'stock_movements',
      INVENTORY_ITEMS: 'inventory_items',
      USERS: 'users',
      PRODUCTS: 'products'
    }
  };
});

// Mock ValidationMonitor
jest.mock('../../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordPatternSuccess: jest.fn(), 
    recordDataIntegrity: jest.fn()
  }
}));

// NOW IMPORT EVERYTHING AFTER MOCKS ARE SET UP
// Service import
import { StockMovementService } from '../stockMovementService';

// Factory imports
import { 
  createUser, 
  resetAllFactories 
} from '../../../test/factories';

// Type imports
import type { 
  CreateStockMovementInput,
  MovementHistoryInput
} from '../../../schemas/inventory';

// Import ValidationMonitor after mocking
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Import supabase to get mocked functions
import { supabase } from '../../../config/supabase';

describe('StockMovementService - Mock Tests', () => {
  // Test constants - use valid UUIDs
  const testUser = createUser();
  const testUserId = testUser.id;
  const testInventoryId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID
  const testMovementId = '550e8400-e29b-41d4-a716-446655440001'; // Valid UUID

  beforeEach(() => {
    jest.clearAllMocks();
    resetAllFactories();
    // Clear mock data between tests
    if (mockSupabaseInstance) {
      mockSupabaseInstance.clearAllData();
    }
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

    // Mock data no longer needed - SimplifiedSupabaseMock handles this

    it('should record stock movement with complete audit trail (mocked)', async () => {
      // Don't pre-set data - let the mock handle the insert
      
      const result = await StockMovementService.recordMovement(mockMovementInput);
      
      // Graceful degradation testing
      expect(result).not.toBeNull();
      expect(result).toBeDefined();
      
      if (result) {
        // Verify transformation occurred (snake_case → camelCase)
        expect(result?.inventoryItemId).toBe(testInventoryId);
        expect(result?.movementType).toBe('adjustment');
        expect(result?.quantityChange).toBe(-5);
        expect(result?.previousStock).toBe(100);
        expect(result?.newStock).toBe(95);
        expect(result?.reason).toBe('Test inventory adjustment');
        expect(result?.performedBy).toBe(testUserId);
      }
      
      // Verify ValidationMonitor integration
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'stockMovementService',
        pattern: 'transformation_schema',
        operation: 'recordMovement'
      });
      
      // Verify database operation was called correctly
      expect(supabase.from).toHaveBeenCalledWith('test_stock_movements');
    });

    it('should validate movement type constraints (mocked)', async () => {
      // Don't pre-set data - let the mock handle the insert

      const movement = {
        inventoryItemId: testInventoryId,
        movementType: 'restock' as const,
        quantityChange: 10,
        previousStock: 100,
        newStock: 110,
        reason: 'Test restock movement',
        performedBy: testUserId
      };

      const result = await StockMovementService.recordMovement(movement);
      
      expect(result).toBeDefined();
      expect(result?.movementType).toBe('restock');
    });

    it('should handle movement recording errors gracefully', async () => {
      // Setup database error mock
      mockSupabaseInstance.queueError(new Error('Database connection failed'));

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
      offset: 0,
      includeSystemMovements: false
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
      // Setup history query mock
      mockSupabaseInstance.setTableData('test_stock_movements', mockHistoryData);

      const result = await StockMovementService.getMovementHistory(mockHistoryInput);
      
      expect(result).toBeDefined();
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
      // Setup empty data for pagination test
      mockSupabaseInstance.setTableData('test_stock_movements', []);

      const result = await StockMovementService.getMovementHistory({
        inventoryItemId: testInventoryId,
        limit: 5,
        offset: 10,
        includeSystemMovements: false
      });
      
      expect(result).toBeDefined();
      expect(result.success).toEqual([]);
      expect(result.totalProcessed).toBe(0);
    });
  });

  describe('role-based access control', () => {
    it('should respect role-based permissions for audit trail access', async () => {
      const marketingUserId = '22222222-2222-2222-2222-222222222222'; // marketing_staff
      
      // Setup role data mock - marketing staff can read but not write
      mockSupabaseInstance.setTableData('user_roles', [
        {
          user_id: marketingUserId,
          role_type: 'marketing_staff',
          permissions: ['read_movements']
        }
      ]);
      
      const canRead = await StockMovementService.checkMovementPermission(
        marketingUserId,
        'read_movements'
      );
      
      const canWrite = await StockMovementService.checkMovementPermission(
        marketingUserId,
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
      // Queue an error for the next operation
      mockSupabaseInstance.queueError(new Error('Database error'));

      const result = await StockMovementService.getMovementHistory({
        inventoryItemId: testInventoryId,
        limit: 10,
        offset: 0,
        includeSystemMovements: false
      });
      
      expect(result).toBeDefined();
      expect(result.success).toEqual([]);
      expect(result.totalProcessed).toBe(0);
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });
});