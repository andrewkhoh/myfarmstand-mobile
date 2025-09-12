import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { InventoryService } from '../../services/inventory/inventoryService';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import type { StockUpdate, InventoryItem } from '../../types/inventory';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || 'https://example.supabase.co',
  process.env.REACT_APP_SUPABASE_ANON_KEY || 'example-key'
);

interface BulkOperationProgress {
  completed: number;
  total: number;
}

type ProgressCallback = (progress: BulkOperationProgress) => void;

export function useBulkUpdateStock(onProgress?: ProgressCallback) {
  const queryClient = useQueryClient();
  const service = new InventoryService(supabase);
  
  return useMutation({
    mutationFn: async (updates: StockUpdate[]) => {
      const results = await service.batchUpdateStock(updates);
      return results;
    },
    onSuccess: (results) => {
      // Track successful updates
      const successIds = results
        .filter(r => r.success)
        .map(r => r.data?.id)
        .filter(Boolean);
      
      // Invalidate affected items
      successIds.forEach(id => {
        queryClient.invalidateQueries({
          queryKey: ['inventory', 'detail', id as string]
        });
      });
      
      // Invalidate list views
      queryClient.invalidateQueries({
        queryKey: ['inventory', 'list']
      });
    }
  });
}

export function useBulkCreateItems() {
  const queryClient = useQueryClient();
  const service = new InventoryService(supabase);
  
  return useMutation({
    mutationFn: async (items: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>[]) => {
      const results = await Promise.allSettled(
        items.map(item => service.createInventoryItem(item))
      );
      
      return results.map(result => {
        if (result.status === 'fulfilled') {
          return { success: true, data: result.value };
        } else {
          return { success: false, error: result.reason };
        }
      });
    },
    onSuccess: () => {
      // Invalidate lists and dashboard
      queryClient.invalidateQueries({
        queryKey: ['inventory', 'list']
      });
      queryClient.invalidateQueries({
        queryKey: ['inventory', 'dashboard']
      });
    }
  });
}

export function useBulkDeleteItems() {
  const queryClient = useQueryClient();
  const service = new InventoryService(supabase);
  
  return useMutation({
    mutationFn: async (itemIds: string[]) => {
      const results = await Promise.allSettled(
        itemIds.map(id => service.deleteInventoryItem(id))
      );
      
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return { success: true, id: itemIds[index] };
        } else {
          return { success: false, id: itemIds[index], error: result.reason };
        }
      });
    },
    onMutate: async (itemIds) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['inventory', 'list'] });
      
      // Snapshot the previous value
      const previousItems = queryClient.getQueryData(['inventory', 'list']);
      
      // Optimistically remove items
      queryClient.setQueryData(['inventory', 'list'], (old: any) => {
        if (Array.isArray(old)) {
          return old.filter((item: InventoryItem) => !itemIds.includes(item.id));
        }
        return old;
      });
      
      // Return a context with the previous items
      return { previousItems };
    },
    onError: (err, itemIds, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousItems) {
        queryClient.setQueryData(['inventory', 'list'], context.previousItems);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });
}

export function useBulkOperationProgress() {
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null);
  
  const startOperation = (total: number) => {
    setProgress({ completed: 0, total });
  };
  
  const updateProgress = (completed: number) => {
    setProgress(prev => prev ? { ...prev, completed } : null);
  };
  
  const completeOperation = () => {
    setProgress(null);
  };
  
  const percentage = progress 
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;
  
  return {
    progress,
    percentage,
    isOperationInProgress: progress !== null,
    startOperation,
    updateProgress,
    completeOperation
  };
}