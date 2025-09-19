import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { InventoryService } from '../../services/inventory/inventoryService';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import { useCurrentUser } from '../useAuth';
import { supabase } from '../../config/supabase';
import type { StockUpdate, StockMovement, StockAlert, InventoryItem, InventoryError } from '../../types/inventory';

// Helper function for user-friendly error creation
const createInventoryError = (
  code: string,
  technicalMessage: string,
  userMessage: string
): InventoryError => ({
  code,
  message: technicalMessage,
  userMessage,
});

export function useUpdateStock() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (update: StockUpdate) => {
      if (!userId) {
        const error = createInventoryError(
          'AUTHENTICATION_REQUIRED',
          'User not authenticated for stock update',
          'Please sign in to update inventory stock'
        );
        throw error;
      }

      try {
        const service = new InventoryService(supabase);
        return await service.updateStock(update);
      } catch (error) {
        // Convert technical errors to user-friendly ones
        if (error instanceof Error) {
          if (error.message.includes('insufficient stock')) {
            throw createInventoryError(
              'INSUFFICIENT_STOCK',
              error.message,
              'Not enough stock available for this operation'
            );
          }
          if (error.message.includes('not found')) {
            throw createInventoryError(
              'ITEM_NOT_FOUND',
              error.message,
              'Inventory item not found'
            );
          }
        }

        throw createInventoryError(
          'UPDATE_FAILED',
          error instanceof Error ? error.message : 'Unknown error',
          'Failed to update stock. Please try again.'
        );
      }
    },
    onMutate: async (update) => {
      if (!userId) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: inventoryKeys.item(update.inventoryItemId, userId)
      });

      // Snapshot the previous value
      const previous = queryClient.getQueryData(
        inventoryKeys.item(update.inventoryItemId, userId)
      );

      // Return a context object with the snapshotted value
      return { previous, userId };
    },
    onError: (err, update, context) => {
      console.error(`Failed to update stock for item ${update.inventoryItemId}:`, err);

      // If the mutation fails, use the context to roll back
      if (context?.previous && context?.userId) {
        queryClient.setQueryData(
          inventoryKeys.item(update.inventoryItemId, context.userId),
          context.previous
        );
      }
    },
    onSuccess: (data, update) => {
      if (userId) {
        // Update the cache with the successful response
        queryClient.setQueryData(
          inventoryKeys.item(update.inventoryItemId, userId),
          data
        );
      }
    },
    onSettled: () => {
      if (userId) {
        // Smart invalidation - only affected queries
        queryClient.invalidateQueries({ queryKey: inventoryKeys.lists(userId) });
        queryClient.invalidateQueries({ queryKey: inventoryKeys.dashboard(userId) });
      }
    }
  });
}

export function useStockMovements(limit: number = 20) {
  const { data: user } = useCurrentUser();
  const userId = user?.id;

  // Graceful degradation for unauthenticated users
  if (!userId) {
    const authError = createInventoryError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated',
      'Please sign in to view stock movements'
    );

    return {
      data: [],
      isLoading: false,
      isError: true,
      error: authError,
      refetch: () => Promise.resolve({ data: [] } as any),
    };
  }

  return useQuery({
    queryKey: inventoryKeys.movements(userId),
    queryFn: async (): Promise<StockMovement[]> => {
      try {
        const service = new InventoryService(supabase);
        return await service.getRecentMovements(userId, limit);
      } catch (error) {
        console.error('Failed to load stock movements:', error);
        // Return empty array instead of crashing UI
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

export function useLowStockItems() {
  const { data: user } = useCurrentUser();
  const userId = user?.id;

  // Graceful degradation for unauthenticated users
  if (!userId) {
    const authError = createInventoryError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated',
      'Please sign in to view low stock items'
    );

    return {
      data: [],
      isLoading: false,
      isError: true,
      error: authError,
      refetch: () => Promise.resolve({ data: [] } as any),
    };
  }

  return useQuery({
    queryKey: inventoryKeys.lowStock(userId),
    queryFn: async (): Promise<InventoryItem[]> => {
      try {
        const service = new InventoryService(supabase);
        return await service.getLowStockItems(userId);
      } catch (error) {
        console.error('Failed to load low stock items:', error);
        // Return empty array instead of crashing UI
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useStockAlerts() {
  const { data: user } = useCurrentUser();
  const userId = user?.id;

  // Graceful degradation for unauthenticated users
  if (!userId) {
    const authError = createInventoryError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated',
      'Please sign in to view stock alerts'
    );

    return {
      data: [],
      isLoading: false,
      isError: true,
      error: authError,
      refetch: () => Promise.resolve({ data: [] } as any),
    };
  }

  return useQuery({
    queryKey: inventoryKeys.alerts(userId),
    queryFn: async (): Promise<StockAlert[]> => {
      try {
        const service = new InventoryService(supabase);
        return await service.getAlerts(userId);
      } catch (error) {
        console.error('Failed to load stock alerts:', error);
        // Return empty array instead of crashing UI
        return [];
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Poll every 30 seconds for new alerts
    refetchOnWindowFocus: false,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (alertId: string) => {
      if (!userId) {
        const error = createInventoryError(
          'AUTHENTICATION_REQUIRED',
          'User not authenticated for alert acknowledgment',
          'Please sign in to acknowledge alerts'
        );
        throw error;
      }

      try {
        const service = new InventoryService(supabase);
        return await service.acknowledgeAlert(alertId, userId);
      } catch (error) {
        // Convert technical errors to user-friendly ones
        if (error instanceof Error) {
          if (error.message.includes('not found')) {
            throw createInventoryError(
              'ALERT_NOT_FOUND',
              error.message,
              'Alert not found or already acknowledged'
            );
          }
        }

        throw createInventoryError(
          'ACKNOWLEDGE_FAILED',
          error instanceof Error ? error.message : 'Unknown error',
          'Failed to acknowledge alert. Please try again.'
        );
      }
    },
    onMutate: async (alertId) => {
      if (!userId) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: inventoryKeys.alerts(userId)
      });

      // Snapshot the previous value
      const previousAlerts = queryClient.getQueryData(inventoryKeys.alerts(userId));

      // Optimistically remove the alert
      queryClient.setQueryData(
        inventoryKeys.alerts(userId),
        (old: any) => {
          if (Array.isArray(old)) {
            return old.filter((alert: StockAlert) => alert.id !== alertId);
          }
          return old;
        }
      );

      // Return a context with the previous alerts
      return { previousAlerts, userId };
    },
    onError: (err, alertId, context) => {
      console.error(`Failed to acknowledge alert ${alertId}:`, err);

      // If the mutation fails, use the context to roll back
      if (context?.previousAlerts && context?.userId) {
        queryClient.setQueryData(
          inventoryKeys.alerts(context.userId),
          context.previousAlerts
        );
      }
    },
    onSettled: () => {
      if (userId) {
        // Smart invalidation - only affected queries
        queryClient.invalidateQueries({ queryKey: inventoryKeys.alerts(userId) });
        queryClient.invalidateQueries({ queryKey: inventoryKeys.dashboard(userId) });
      }
    }
  });
}