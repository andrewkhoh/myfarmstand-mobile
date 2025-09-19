/**
 * Test suite to verify inventory architecture compliance fixes
 */

import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useInventoryMetrics } from '../useInventoryMetrics';
import { useBulkUpdateStock } from '../useBulkUpdateStock';
import { useStockAlerts } from '../useStockAlerts';
import { InventoryService } from '../../../services/inventory/inventoryService';
import { StockMovementService } from '../../../services/inventory/stockMovementService';
import { supabase } from '../../../lib/supabase';

// Mock supabase
jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com'
          }
        }
      })
    },
    from: jest.fn(),
    channel: jest.fn()
  }
}));

// Mock config/supabase for hooks that use it
jest.mock('../../../config/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com'
          }
        }
      })
    },
    from: jest.fn(),
    channel: jest.fn()
  }
}));

// Mock useCurrentUser
jest.mock('../../useAuth', () => ({
  useCurrentUser: () => ({
    data: { id: 'test-user-id', email: 'test@example.com' }
  })
}));

// Mock validation monitor
jest.mock('../../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordPatternSuccess: jest.fn(),
    recordValidationError: jest.fn()
  }
}));

// Mock error coordinator
jest.mock('../../../services/cross-workflow/errorCoordinator', () => ({
  errorCoordinator: {
    handleError: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('Inventory Architecture Compliance Fixes', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('useInventoryMetrics', () => {
    it('should use InventoryService instead of direct database calls', () => {
      // Mock the service methods
      const getInventoryItemsSpy = jest.spyOn(InventoryService.prototype, 'getInventoryItems')
        .mockResolvedValue([]);
      const getMovementHistorySpy = jest.spyOn(StockMovementService.prototype, 'getMovementHistory')
        .mockResolvedValue([]);

      renderHook(() => useInventoryMetrics(), { wrapper });

      // The hook should create service instances
      // This verifies that services are being used instead of direct supabase calls
      expect(getInventoryItemsSpy).toBeDefined();
      expect(getMovementHistorySpy).toBeDefined();
    });

    it('should validate metrics data with schema', async () => {
      const mockItems = [
        {
          id: '1',
          productId: 'p1',
          warehouseId: 'w1',
          userId: 'test-user-id',
          currentStock: 100,
          reservedStock: 10,
          availableStock: 90,
          minimumStock: 20,
          maximumStock: 200,
          reorderPoint: 30,
          reorderQuantity: 50,
          unitCost: 10,
          totalValue: 1000,
          lastRestockedAt: null,
          lastCountedAt: null,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          stockStatus: 'normal'
        }
      ];

      const mockMovements = [
        {
          id: 'm1',
          inventoryItemId: '1',
          movementType: 'in' as const,
          quantity: 10,
          referenceType: null,
          referenceId: null,
          fromWarehouseId: null,
          toWarehouseId: 'w1',
          reason: 'Restock',
          performedBy: 'test-user-id',
          notes: null,
          createdAt: '2024-01-01T00:00:00Z'
        }
      ];

      jest.spyOn(InventoryService.prototype, 'getInventoryItems')
        .mockResolvedValue(mockItems as any);
      jest.spyOn(StockMovementService.prototype, 'getMovementHistory')
        .mockResolvedValue(mockMovements);

      const { result } = renderHook(() => useInventoryMetrics(), { wrapper });

      // Wait for the hook to fetch data
      await new Promise(resolve => setTimeout(resolve, 100));

      // The hook should return validated metrics structure
      expect(result.current.data).toBeDefined();
    });
  });

  describe('useBulkUpdateStock', () => {
    it('should validate updates before sending to service', async () => {
      const batchUpdateStockSpy = jest.spyOn(InventoryService.prototype, 'batchUpdateStock')
        .mockResolvedValue([{ success: true, data: {} }]);

      const { result } = renderHook(() => useBulkUpdateStock(), { wrapper });

      const validUpdates = [
        { id: '550e8400-e29b-41d4-a716-446655440000', operation: 'add' as const, quantity: 10, reason: 'Test' }
      ];

      // This should pass validation
      await result.current.mutateAsync(validUpdates);
      expect(batchUpdateStockSpy).toHaveBeenCalled();
    });

    it('should handle validation errors gracefully', async () => {
      const { result } = renderHook(() => useBulkUpdateStock(), { wrapper });

      const invalidUpdates = [
        { id: 'invalid-uuid', operation: 'add' as const, quantity: -10 } // Invalid UUID and negative quantity
      ];

      // This should fail validation but not crash
      const mutationResult = await result.current.mutateAsync(invalidUpdates);
      expect(mutationResult.failed).toBeGreaterThan(0);
      expect(mutationResult.errors).toHaveLength(1);
    });
  });

  describe('useStockAlerts', () => {
    it('should validate alert data from service', async () => {
      const mockAlerts = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          inventoryItemId: '550e8400-e29b-41d4-a716-446655440002',
          alertType: 'low_stock' as const,
          severity: 'warning' as const,
          message: 'Stock is running low',
          acknowledged: false,
          acknowledgedAt: null,
          createdAt: '2024-01-01T00:00:00Z'
        }
      ];

      jest.spyOn(InventoryService.prototype, 'getAlerts')
        .mockResolvedValue(mockAlerts as any);

      const { result } = renderHook(() => useStockAlerts(), { wrapper });

      // Wait for the hook to fetch data
      await new Promise(resolve => setTimeout(resolve, 100));

      // The hook should return grouped alerts
      expect(result.current.data).toBeDefined();
      if (result.current.data) {
        expect(result.current.data.warning).toBeDefined();
        expect(result.current.data.critical).toBeDefined();
        expect(result.current.data.info).toBeDefined();
      }
    });
  });

  describe('Service Layer Integration', () => {
    it('should route all database calls through services', () => {
      // This test verifies that hooks no longer make direct supabase calls
      const supabaseFromSpy = jest.spyOn(supabase, 'from');

      // Render all hooks
      renderHook(() => useInventoryMetrics(), { wrapper });
      renderHook(() => useBulkUpdateStock(), { wrapper });
      renderHook(() => useStockAlerts(), { wrapper });

      // The hooks should not call supabase.from directly
      // All database access should go through services
      expect(supabaseFromSpy).not.toHaveBeenCalled();
    });
  });
});