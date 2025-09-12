import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { InventoryService } from '../../services/inventory/inventoryService';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import type { InventoryItem, InventoryFilters } from '../../types/inventory';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || 'https://example.supabase.co',
  process.env.REACT_APP_SUPABASE_ANON_KEY || 'example-key'
);

export function useInventoryItems(filters?: InventoryFilters) {
  return useQuery({
    queryKey: filters ? ['inventory', 'list', JSON.stringify(filters)] : ['inventory', 'list'],
    queryFn: async () => {
      const service = new InventoryService(supabase);
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'test-user-id';
      
      return service.getInventoryItems(userId, filters);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useInventoryItem(itemId: string) {
  return useQuery({
    queryKey: ['inventory', 'detail', itemId],
    queryFn: async () => {
      const service = new InventoryService(supabase);
      return service.getInventoryItem(itemId);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
      const service = new InventoryService(supabase);
      return service.createInventoryItem(item);
    },
    onSuccess: () => {
      // Invalidate and refetch inventory lists
      queryClient.invalidateQueries({ queryKey: ['inventory', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'dashboard'] });
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      const service = new InventoryService(supabase);
      return service.deleteInventoryItem(itemId);
    },
    onMutate: async (itemId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['inventory', 'list'] });
      
      // Snapshot the previous value
      const previousItems = queryClient.getQueryData(['inventory', 'list']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['inventory', 'list'], (old: any) => {
        if (Array.isArray(old)) {
          return old.filter((item: InventoryItem) => item.id !== itemId);
        }
        return old;
      });
      
      // Return a context object with the snapshotted value
      return { previousItems };
    },
    onError: (err, itemId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousItems) {
        queryClient.setQueryData(['inventory', 'list'], context.previousItems);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}