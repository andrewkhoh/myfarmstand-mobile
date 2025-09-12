import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { InventoryService } from '../../services/inventory/inventoryService';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import type { StockUpdate, StockMovement, StockAlert, InventoryItem } from '../../types/inventory';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || 'https://example.supabase.co',
  process.env.REACT_APP_SUPABASE_ANON_KEY || 'example-key'
);

export function useUpdateStock() {
  const queryClient = useQueryClient();
  const service = new InventoryService(supabase);
  
  return useMutation({
    mutationFn: (update: StockUpdate) => service.updateStock(update),
    onMutate: async (update) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: ['inventory', 'detail', update.id] 
      });
      
      // Snapshot the previous value
      const previous = queryClient.getQueryData(
        ['inventory', 'detail', update.id]
      );
      
      // Optimistically update to the new value
      queryClient.setQueryData(
        ['inventory', 'detail', update.id],
        (old: any) => {
          if (!old) {
            // If no previous data exists, keep cache unchanged
            return old;
          }
          return {
            ...old,
            currentStock: update.newStock
          };
        }
      );
      
      // Return a context object with the snapshotted value
      return { previous };
    },
    onError: (err, update, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previous) {
        queryClient.setQueryData(
          ['inventory', 'detail', update.id],
          context.previous
        );
      }
    },
    onSuccess: (data, update) => {
      // Update the cache with the successful response
      queryClient.setQueryData(
        ['inventory', 'detail', update.id],
        data
      );
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ 
        queryKey: ['inventory'] 
      });
    }
  });
}

export function useStockMovements(limit: number = 20) {
  return useQuery({
    queryKey: inventoryKeys.movements(),
    queryFn: async () => {
      const service = new InventoryService(supabase);
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'test-user-id';
      
      return service.getRecentMovements(userId, limit);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useLowStockItems() {
  return useQuery({
    queryKey: ['inventory', 'lowStock'],
    queryFn: async () => {
      const service = new InventoryService(supabase);
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'test-user-id';
      
      return service.getLowStockItems(userId);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useStockAlerts() {
  return useQuery({
    queryKey: ['inventory', 'alerts'],
    queryFn: async () => {
      const service = new InventoryService(supabase);
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'test-user-id';
      
      return service.getAlerts(userId);
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Poll every 30 seconds for new alerts
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  const service = new InventoryService(supabase);
  
  return useMutation({
    mutationFn: (alertId: string) => service.acknowledgeAlert(alertId),
    onMutate: async (alertId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: ['inventory', 'alerts'] 
      });
      
      // Snapshot the previous value
      const previousAlerts = queryClient.getQueryData(['inventory', 'alerts']);
      
      // Optimistically remove the alert
      queryClient.setQueryData(
        ['inventory', 'alerts'],
        (old: any) => {
          if (Array.isArray(old)) {
            return old.filter((alert: StockAlert) => alert.id !== alertId);
          }
          return old;
        }
      );
      
      // Return a context with the previous alerts
      return { previousAlerts };
    },
    onError: (err, alertId, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousAlerts) {
        queryClient.setQueryData(
          ['inventory', 'alerts'],
          context.previousAlerts
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ 
        queryKey: ['inventory', 'alerts'] 
      });
    }
  });
}