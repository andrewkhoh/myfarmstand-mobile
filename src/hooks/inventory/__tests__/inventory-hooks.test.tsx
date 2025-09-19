import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper, createTestQueryClient } from '../../test/test-wrapper';
import { useInventoryItems } from '../useInventoryItems';
import { useInventoryDashboard } from '../useInventoryDashboard';
import { useStockOperations } from '../useStockOperations';
import { useBulkOperations } from '../useBulkOperations';

describe('Inventory Hooks', () => {
  const queryClient = createTestQueryClient();
  const wrapper = createWrapper(queryClient);

  beforeEach(() => {
    queryClient.clear();
  });

  describe('useInventoryItems', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useInventoryItems(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should fetch inventory items', async () => {
      const { result } = renderHook(() => useInventoryItems(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeUndefined();
    });
  });

  describe('useInventoryDashboard', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useInventoryDashboard(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should fetch dashboard data', async () => {
      const { result } = renderHook(() => useInventoryDashboard(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeUndefined();
    });
  });

  describe('useStockOperations', () => {
    it('should provide stock operation mutations', () => {
      const { result } = renderHook(() => useStockOperations(), { wrapper });

      expect(result.current.updateStock).toBeDefined();
      expect(result.current.adjustStock).toBeDefined();
      expect(result.current.transferStock).toBeDefined();
      expect(result.current.recordMovement).toBeDefined();
    });

    it('should handle update stock mutation', async () => {
      const { result } = renderHook(() => useStockOperations(), { wrapper });

      expect(result.current.updateStock.isPending).toBe(false);

      // Mutation can be tested with proper mocking
      // For now, just verify the hook initializes correctly
      expect(result.current.updateStock.mutateAsync).toBeDefined();
    });
  });

  describe('useBulkOperations', () => {
    it('should provide bulk operation mutations', () => {
      const { result } = renderHook(() => useBulkOperations(), { wrapper });

      expect(result.current.bulkUpdate).toBeDefined();
      expect(result.current.bulkAdjust).toBeDefined();
      expect(result.current.importItems).toBeDefined();
    });

    it('should initialize with idle state', () => {
      const { result } = renderHook(() => useBulkOperations(), { wrapper });

      expect(result.current.bulkUpdate.isIdle).toBe(true);
      expect(result.current.bulkAdjust.isIdle).toBe(true);
      expect(result.current.importItems.isIdle).toBe(true);
    });
  });
});