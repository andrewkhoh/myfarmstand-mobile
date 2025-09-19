import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { InventoryService } from '../../services/inventory/inventoryService';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import { useCurrentUser } from '../useAuth';
import { supabase } from '../../config/supabase'; // Centralized client
import type { InventoryItem, InventoryFilters, InventoryError, CreateInventoryItem } from '../../types/inventory';

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

export function useInventoryItems(filters?: InventoryFilters) {
  const { data: user } = useCurrentUser();
  const userId = user?.id;

  // Graceful degradation for unauthenticated users
  if (!userId) {
    const authError = createInventoryError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated',
      'Please sign in to view your inventory'
    );

    return {
      data: [], // Empty array instead of throwing error
      isLoading: false,
      isError: true,
      error: authError,
      refetch: () => Promise.resolve({ data: [] } as any),
    };
  }

  return useQuery({
    queryKey: inventoryKeys.list(userId, filters),
    queryFn: async (): Promise<InventoryItem[]> => {
      try {
        const service = new InventoryService(supabase);
        return await service.getInventoryItems(userId, filters);
      } catch (error) {
        console.error('Failed to load inventory items:', error);

        // Return empty array instead of crashing UI
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

export function useInventoryItem(itemId: string) {
  const { data: user } = useCurrentUser();
  const userId = user?.id;

  // Graceful degradation for unauthenticated users
  if (!userId) {
    const authError = createInventoryError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated',
      'Please sign in to view inventory details'
    );

    return {
      data: undefined,
      isLoading: false,
      isError: true,
      error: authError,
      refetch: () => Promise.resolve({ data: undefined } as any),
    };
  }

  return useQuery({
    queryKey: inventoryKeys.item(itemId, userId),
    queryFn: async (): Promise<InventoryItem | null> => {
      try {
        const service = new InventoryService(supabase);
        return await service.getInventoryItem(itemId, userId);
      } catch (error) {
        console.error(`Failed to load inventory item ${itemId}:`, error);

        // Return null instead of throwing - UI can handle gracefully
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (item: CreateInventoryItem) => {
      if (!userId) {
        const error = createInventoryError(
          'AUTHENTICATION_REQUIRED',
          'User not authenticated for item creation',
          'Please sign in to create inventory items'
        );
        throw error;
      }

      try {
        const service = new InventoryService(supabase);
        return await service.createInventoryItem(item, userId);
      } catch (error) {
        // Convert technical errors to user-friendly ones
        if (error instanceof Error) {
          if (error.message.includes('duplicate')) {
            throw createInventoryError(
              'DUPLICATE_ITEM',
              error.message,
              'An item with these details already exists'
            );
          }
          if (error.message.includes('foreign key')) {
            throw createInventoryError(
              'INVALID_REFERENCE',
              error.message,
              'Invalid product or warehouse reference'
            );
          }
        }

        throw createInventoryError(
          'CREATE_FAILED',
          error instanceof Error ? error.message : 'Unknown error',
          'Failed to create inventory item. Please try again.'
        );
      }
    },
    onSuccess: () => {
      if (userId) {
        // Smart invalidation - only affected queries
        queryClient.invalidateQueries({ queryKey: inventoryKeys.lists(userId) });
        queryClient.invalidateQueries({ queryKey: inventoryKeys.dashboard(userId) });
      }
    },
    onError: (error) => {
      console.error('Inventory item creation failed:', error);
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (itemId: string) => {
      if (!userId) {
        const error = createInventoryError(
          'AUTHENTICATION_REQUIRED',
          'User not authenticated for item deletion',
          'Please sign in to delete inventory items'
        );
        throw error;
      }

      try {
        const service = new InventoryService(supabase);
        return await service.deleteInventoryItem(itemId, userId);
      } catch (error) {
        // Convert technical errors to user-friendly ones
        if (error instanceof Error) {
          if (error.message.includes('foreign key')) {
            throw createInventoryError(
              'ITEM_IN_USE',
              error.message,
              'Cannot delete item - it may be referenced in orders or movements'
            );
          }
          if (error.message.includes('not found')) {
            throw createInventoryError(
              'ITEM_NOT_FOUND',
              error.message,
              'Item not found or already deleted'
            );
          }
        }

        throw createInventoryError(
          'DELETE_FAILED',
          error instanceof Error ? error.message : 'Unknown error',
          'Failed to delete inventory item. Please try again.'
        );
      }
    },
    onMutate: async (itemId) => {
      if (!userId) return;

      // Cancel any outgoing refetches for optimistic updates
      await queryClient.cancelQueries({ queryKey: inventoryKeys.lists(userId) });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData(inventoryKeys.lists(userId));

      // Optimistically update - remove item from UI immediately
      queryClient.setQueryData(inventoryKeys.lists(userId), (old: any) => {
        if (Array.isArray(old)) {
          return old.filter((item: InventoryItem) => item.id !== itemId);
        }
        return old;
      });

      // Return context for rollback if needed
      return { previousItems };
    },
    onError: (error, itemId, context) => {
      console.error(`Failed to delete inventory item ${itemId}:`, error);

      if (!userId || !context?.previousItems) return;

      // Rollback optimistic update on error
      queryClient.setQueryData(inventoryKeys.lists(userId), context.previousItems);
    },
    onSettled: () => {
      if (userId) {
        // Refresh data after success or error to ensure consistency
        queryClient.invalidateQueries({ queryKey: inventoryKeys.all(userId) });
      }
    },
  });
}