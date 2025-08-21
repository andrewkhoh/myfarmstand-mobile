/**
 * Phase 2.3.1: Stock Movement Hooks Tests (RED Phase)
 * Testing audit trail, movement history, and batch tracking hooks
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Import hooks that don't exist yet (RED phase)
import {
  useStockMovements,
  useMovementHistory,
  useRecordMovement,
  useBatchMovements,
  useMovementAnalytics
} from '../useStockMovements';

// Mock services
import { StockMovementService } from '../../../services/inventory/stockMovementService';

jest.mock('../../../services/inventory/stockMovementService');

const mockStockMovementService = StockMovementService as jest.Mocked<typeof StockMovementService>;

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useStockMovements Hook Tests (RED Phase)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useMovementHistory', () => {
    it('should fetch movement history with pagination and filtering', async () => {
      const mockMovementHistory = {
        success: [
          {
            id: 'movement-1',
            inventoryItemId: '123',
            movementType: 'restock' as const,
            quantityChange: 50,
            previousStock: 100,
            newStock: 150,
            reason: 'Weekly restock',
            performedBy: 'staff-1',
            performedAt: '2024-01-01T12:00:00Z',
            referenceOrderId: null,
            batchId: null,
            createdAt: '2024-01-01T12:00:00Z'
          }
        ],
        totalProcessed: 1
      };

      mockStockMovementService.getMovementHistory.mockResolvedValue(mockMovementHistory);

      const { result } = renderHook(
        () => useMovementHistory('123', { limit: 10, offset: 0 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockMovementHistory);
      expect(mockStockMovementService.getMovementHistory).toHaveBeenCalledWith({
        inventoryItemId: '123',
        limit: 10,
        offset: 0
      });
    });

    it('should handle pagination correctly', async () => {
      const mockPage1 = {
        success: [
          {
            id: 'movement-1',
            inventoryItemId: '123',
            movementType: 'restock' as const,
            quantityChange: 50,
            previousStock: 50,
            newStock: 100,
            reason: 'First movement',
            performedBy: 'staff-1',
            performedAt: '2024-01-01T10:00:00Z',
            referenceOrderId: null,
            batchId: null,
            createdAt: '2024-01-01T10:00:00Z'
          }
        ],
        totalProcessed: 1
      };

      mockStockMovementService.getMovementHistory.mockResolvedValue(mockPage1);

      const { result } = renderHook(
        () => useMovementHistory('123', { limit: 1, offset: 0 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.success).toHaveLength(1);
      expect(mockStockMovementService.getMovementHistory).toHaveBeenCalledWith({
        inventoryItemId: '123',
        limit: 1,
        offset: 0
      });
    });

    it('should handle include system movements option', async () => {
      const mockSystemMovements = {
        success: [
          {
            id: 'movement-1',
            inventoryItemId: '123',
            movementType: 'adjustment' as const,
            quantityChange: -5,
            previousStock: 100,
            newStock: 95,
            reason: 'System adjustment',
            performedBy: null, // System movement
            performedAt: '2024-01-01T12:00:00Z',
            referenceOrderId: null,
            batchId: null,
            createdAt: '2024-01-01T12:00:00Z'
          }
        ],
        totalProcessed: 1
      };

      mockStockMovementService.getMovementHistory.mockResolvedValue(mockSystemMovements);

      const { result } = renderHook(
        () => useMovementHistory('123', { includeSystemMovements: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockSystemMovements);
    });

    it('should handle empty movement history', async () => {
      const mockEmptyHistory = {
        success: [],
        totalProcessed: 0
      };

      mockStockMovementService.getMovementHistory.mockResolvedValue(mockEmptyHistory);

      const { result } = renderHook(
        () => useMovementHistory('123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.success).toHaveLength(0);
    });
  });

  describe('useStockMovements (with filtering)', () => {
    it('should fetch movements with filter criteria', async () => {
      const mockFilteredMovements = {
        success: [
          {
            id: 'movement-1',
            inventoryItemId: '123',
            movementType: 'sale' as const,
            quantityChange: -10,
            previousStock: 100,
            newStock: 90,
            reason: 'Customer purchase',
            performedBy: 'staff-1',
            performedAt: '2024-01-01T14:00:00Z',
            referenceOrderId: 'order-123',
            batchId: null,
            createdAt: '2024-01-01T14:00:00Z'
          }
        ],
        totalProcessed: 1
      };

      mockStockMovementService.getMovementsByFilter.mockResolvedValue(mockFilteredMovements);

      const { result } = renderHook(
        () => useStockMovements({
          movementType: 'sale',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-02T00:00:00Z'
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockFilteredMovements);
      expect(mockStockMovementService.getMovementsByFilter).toHaveBeenCalledWith({
        movementType: 'sale',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-02T00:00:00Z'
      });
    });

    it('should filter movements by user', async () => {
      const mockUserMovements = {
        success: [
          {
            id: 'movement-1',
            inventoryItemId: '123',
            movementType: 'restock' as const,
            quantityChange: 25,
            previousStock: 75,
            newStock: 100,
            reason: 'Restock by user',
            performedBy: 'user-456',
            performedAt: '2024-01-01T10:00:00Z',
            referenceOrderId: null,
            batchId: null,
            createdAt: '2024-01-01T10:00:00Z'
          }
        ],
        totalProcessed: 1
      };

      mockStockMovementService.getMovementsByFilter.mockResolvedValue(mockUserMovements);

      const { result } = renderHook(
        () => useStockMovements({ performedBy: 'user-456' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockUserMovements);
    });

    it('should handle complex filtering combinations', async () => {
      const mockComplexFilter = {
        success: [
          {
            id: 'movement-1',
            inventoryItemId: '123',
            movementType: 'adjustment' as const,
            quantityChange: -3,
            previousStock: 103,
            newStock: 100,
            reason: 'Inventory count adjustment',
            performedBy: 'staff-789',
            performedAt: '2024-01-01T16:00:00Z',
            referenceOrderId: null,
            batchId: null,
            createdAt: '2024-01-01T16:00:00Z'
          }
        ],
        totalProcessed: 1
      };

      mockStockMovementService.getMovementsByFilter.mockResolvedValue(mockComplexFilter);

      const { result } = renderHook(
        () => useStockMovements({
          inventoryItemId: '123',
          movementType: 'adjustment',
          performedBy: 'staff-789',
          limit: 50
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockComplexFilter);
    });
  });

  describe('useRecordMovement', () => {
    it('should record stock movement with complete audit trail', async () => {
      const mockRecordedMovement = {
        id: 'movement-new',
        inventoryItemId: '123',
        movementType: 'sale' as const,
        quantityChange: -5,
        previousStock: 100,
        newStock: 95,
        reason: 'Customer order',
        performedBy: 'staff-1',
        performedAt: '2024-01-01T12:30:00Z',
        referenceOrderId: 'order-456',
        batchId: null,
        createdAt: '2024-01-01T12:30:00Z'
      };

      mockStockMovementService.recordMovement.mockResolvedValue(mockRecordedMovement);

      const { result } = renderHook(
        () => useRecordMovement(),
        { wrapper: createWrapper() }
      );

      const movementInput = {
        inventoryItemId: '123',
        movementType: 'sale' as const,
        quantityChange: -5,
        previousStock: 100,
        newStock: 95,
        reason: 'Customer order',
        performedBy: 'staff-1',
        referenceOrderId: 'order-456'
      };

      await act(async () => {
        await result.current.mutateAsync(movementInput);
      });

      expect(mockStockMovementService.recordMovement).toHaveBeenCalledWith(movementInput);
      expect(result.current.data).toEqual(mockRecordedMovement);
    });

    it('should handle movement recording errors', async () => {
      const mockError = new Error('Movement recording failed');
      mockStockMovementService.recordMovement.mockRejectedValue(mockError);

      const { result } = renderHook(
        () => useRecordMovement(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate({
          inventoryItemId: '123',
          movementType: 'restock',
          quantityChange: 50,
          previousStock: 100,
          newStock: 150,
          reason: 'Test restock'
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should validate movement calculations', async () => {
      const mockValidMovement = {
        id: 'movement-validated',
        inventoryItemId: '123',
        movementType: 'adjustment' as const,
        quantityChange: 10,
        previousStock: 90,
        newStock: 100,
        reason: 'Stock correction',
        performedBy: 'manager-1',
        performedAt: '2024-01-01T15:00:00Z',
        referenceOrderId: null,
        batchId: null,
        createdAt: '2024-01-01T15:00:00Z'
      };

      mockStockMovementService.recordMovement.mockResolvedValue(mockValidMovement);

      const { result } = renderHook(
        () => useRecordMovement(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate({
          inventoryItemId: '123',
          movementType: 'adjustment',
          quantityChange: 10,
          previousStock: 90,
          newStock: 100, // Should equal previousStock + quantityChange
          reason: 'Stock correction',
          performedBy: 'manager-1'
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockValidMovement);
    });
  });

  describe('useBatchMovements', () => {
    it('should fetch movements by batch ID for bulk operation tracking', async () => {
      const mockBatchMovements = {
        success: [
          {
            id: 'movement-1',
            inventoryItemId: '123',
            movementType: 'restock' as const,
            quantityChange: 100,
            previousStock: 50,
            newStock: 150,
            reason: 'Bulk restock operation',
            performedBy: 'staff-1',
            performedAt: '2024-01-01T09:00:00Z',
            referenceOrderId: null,
            batchId: 'batch-123',
            createdAt: '2024-01-01T09:00:00Z'
          },
          {
            id: 'movement-2',
            inventoryItemId: '456',
            movementType: 'restock' as const,
            quantityChange: 50,
            previousStock: 25,
            newStock: 75,
            reason: 'Bulk restock operation',
            performedBy: 'staff-1',
            performedAt: '2024-01-01T09:01:00Z',
            referenceOrderId: null,
            batchId: 'batch-123',
            createdAt: '2024-01-01T09:01:00Z'
          }
        ],
        totalProcessed: 2
      };

      mockStockMovementService.getBatchMovements.mockResolvedValue(mockBatchMovements);

      const { result } = renderHook(
        () => useBatchMovements('batch-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockBatchMovements);
      expect(mockStockMovementService.getBatchMovements).toHaveBeenCalledWith('batch-123');
    });

    it('should handle empty batch results', async () => {
      const mockEmptyBatch = {
        success: [],
        totalProcessed: 0
      };

      mockStockMovementService.getBatchMovements.mockResolvedValue(mockEmptyBatch);

      const { result } = renderHook(
        () => useBatchMovements('batch-nonexistent'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.success).toHaveLength(0);
    });

    it('should verify movements are ordered by performed_at', async () => {
      const mockOrderedBatch = {
        success: [
          {
            id: 'movement-1',
            inventoryItemId: '123',
            movementType: 'restock' as const,
            quantityChange: 50,
            previousStock: 100,
            newStock: 150,
            reason: 'First in batch',
            performedBy: 'staff-1',
            performedAt: '2024-01-01T09:00:00Z',
            referenceOrderId: null,
            batchId: 'batch-ordered',
            createdAt: '2024-01-01T09:00:00Z'
          },
          {
            id: 'movement-2',
            inventoryItemId: '456',
            movementType: 'restock' as const,
            quantityChange: 25,
            previousStock: 75,
            newStock: 100,
            reason: 'Second in batch',
            performedBy: 'staff-1',
            performedAt: '2024-01-01T09:05:00Z',
            referenceOrderId: null,
            batchId: 'batch-ordered',
            createdAt: '2024-01-01T09:05:00Z'
          }
        ],
        totalProcessed: 2
      };

      mockStockMovementService.getBatchMovements.mockResolvedValue(mockOrderedBatch);

      const { result } = renderHook(
        () => useBatchMovements('batch-ordered'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const movements = result.current.data?.success || [];
      expect(movements).toHaveLength(2);
      
      // Verify chronological order
      if (movements.length >= 2) {
        const first = new Date(movements[0].performedAt).getTime();
        const second = new Date(movements[1].performedAt).getTime();
        expect(first).toBeLessThanOrEqual(second);
      }
    });
  });

  describe('useMovementAnalytics', () => {
    it('should provide movement analytics with aggregations', async () => {
      const mockAnalytics = {
        success: [
          {
            movementType: 'restock',
            totalQuantity: 150,
            movementCount: 3,
            averageQuantity: 50,
            impact: 'positive'
          },
          {
            movementType: 'sale',
            totalQuantity: 75,
            movementCount: 5,
            averageQuantity: 15,
            impact: 'negative'
          }
        ],
        totalProcessed: 2
      };

      mockStockMovementService.getMovementAnalytics.mockResolvedValue(mockAnalytics);

      const { result } = renderHook(
        () => useMovementAnalytics({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
          groupBy: 'day'
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockAnalytics);
      expect(mockStockMovementService.getMovementAnalytics).toHaveBeenCalledWith({
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        groupBy: 'day'
      });
    });

    it('should handle different grouping options', async () => {
      const mockWeeklyAnalytics = {
        success: [
          {
            movementType: 'adjustment',
            totalQuantity: 25,
            movementCount: 2,
            averageQuantity: 12.5,
            impact: 'neutral'
          }
        ],
        totalProcessed: 1
      };

      mockStockMovementService.getMovementAnalytics.mockResolvedValue(mockWeeklyAnalytics);

      const { result } = renderHook(
        () => useMovementAnalytics({ groupBy: 'week' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockWeeklyAnalytics);
    });

    it('should validate analytics data structure', async () => {
      const mockAnalytics = {
        success: [
          {
            movementType: 'reservation',
            totalQuantity: 30,
            movementCount: 6,
            averageQuantity: 5,
            impact: 'negative'
          }
        ],
        totalProcessed: 1
      };

      mockStockMovementService.getMovementAnalytics.mockResolvedValue(mockAnalytics);

      const { result } = renderHook(
        () => useMovementAnalytics({}),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const analytics = result.current.data?.success[0];
      expect(analytics).toEqual(
        expect.objectContaining({
          movementType: expect.any(String),
          totalQuantity: expect.any(Number),
          movementCount: expect.any(Number),
          averageQuantity: expect.any(Number),
          impact: expect.stringMatching(/^(positive|negative|neutral)$/)
        })
      );
    });
  });

  describe('Real-time Integration', () => {
    it('should handle real-time movement updates', async () => {
      const mockInitialMovements = {
        success: [
          {
            id: 'movement-1',
            inventoryItemId: '123',
            movementType: 'restock' as const,
            quantityChange: 50,
            previousStock: 50,
            newStock: 100,
            reason: 'Initial restock',
            performedBy: 'staff-1',
            performedAt: '2024-01-01T10:00:00Z',
            referenceOrderId: null,
            batchId: null,
            createdAt: '2024-01-01T10:00:00Z'
          }
        ],
        totalProcessed: 1
      };

      mockStockMovementService.getMovementHistory.mockResolvedValue(mockInitialMovements);

      const { result } = renderHook(
        () => useMovementHistory('123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockInitialMovements);
      
      // Should provide refetch capability for real-time updates
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should handle cache invalidation for movement tracking', () => {
      const { result } = renderHook(
        () => useMovementHistory('123'),
        { wrapper: createWrapper() }
      );

      // Should have proper cache configuration for real-time updates
      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('refetch');
      expect(result.current).toHaveProperty('isLoading');
    });
  });

  describe('Performance Testing', () => {
    it('should handle large audit datasets efficiently', async () => {
      const mockLargeDataset = {
        success: Array.from({ length: 100 }, (_, i) => ({
          id: `movement-${i}`,
          inventoryItemId: '123',
          movementType: 'sale' as const,
          quantityChange: -1,
          previousStock: 200 - i,
          newStock: 199 - i,
          reason: `Sale ${i + 1}`,
          performedBy: 'staff-1',
          performedAt: `2024-01-01T${String(10 + Math.floor(i / 10)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`,
          referenceOrderId: `order-${i}`,
          batchId: null,
          createdAt: `2024-01-01T${String(10 + Math.floor(i / 10)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`
        })),
        totalProcessed: 100
      };

      mockStockMovementService.getMovementHistory.mockResolvedValue(mockLargeDataset);

      const { result } = renderHook(
        () => useMovementHistory('123', { limit: 100 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.success).toHaveLength(100);
      expect(result.current.data?.totalProcessed).toBe(100);
    });
  });
});