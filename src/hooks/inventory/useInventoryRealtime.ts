import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import { useCurrentUser } from '../useAuth';
import { supabase } from '../../config/supabase';
import type { InventoryItem, StockMovement, StockAlert, InventoryError } from '../../types/inventory';
import {
  InventoryItemTransformSchema,
  StockMovementTransformSchema
} from '../../schemas/inventory';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { errorCoordinator } from '../../services/cross-workflow/errorCoordinator';

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

export function useInventoryRealtime() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      console.log('Real-time inventory updates disabled: user not authenticated');
      return;
    }

    console.log('🔄 Setting up real-time inventory subscriptions for user:', userId);

    // Subscribe to inventory_items changes
    const inventorySubscription = supabase
      .channel(`inventory_items_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('📦 Real-time inventory update:', payload);

          try {
            // Validate the incoming data before processing
            if (payload.new) {
              try {
                const validated = InventoryItemTransformSchema.parse(payload.new);
                ValidationMonitor.recordPatternSuccess({
                  pattern: 'direct_schema_validation',
                  context: 'inventory-item-update'
                });

                // Store validated data in cache if update or insert
                if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                  queryClient.setQueryData(
                    inventoryKeys.item(validated.id, userId),
                    validated
                  );
                }
              } catch (validationError) {
                ValidationMonitor.recordValidationError({
                  context: 'inventory-realtime',
                  errorMessage: validationError instanceof Error ? validationError.message : 'Validation failed',
                  validationPattern: 'direct_schema'
                });

                await errorCoordinator.handleError({
                  workflow: 'inventory',
                  operation: 'realtimeUpdate',
                  errorType: 'validation',
                  severity: 'low',
                  message: 'Invalid real-time inventory data received',
                  context: { eventType: payload.eventType, itemId: payload.new?.id },
                  timestamp: new Date()
                });
              }
            }

            // Invalidate inventory queries to refetch fresh data
            queryClient.invalidateQueries({ queryKey: inventoryKeys.lists(userId) });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.dashboard(userId) });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock(userId) });

            // Update specific item cache if we have the item ID
            if (payload.new && payload.new.id) {
              queryClient.invalidateQueries({
                queryKey: inventoryKeys.item(payload.new.id, userId)
              });
            }

            // Handle different event types
            switch (payload.eventType) {
              case 'INSERT':
                console.log('✅ New inventory item created:', payload.new?.id);
                break;
              case 'UPDATE':
                console.log('🔄 Inventory item updated:', payload.new?.id);
                break;
              case 'DELETE':
                console.log('🗑️ Inventory item deleted:', payload.old?.id);
                // Remove from cache
                if (payload.old?.id) {
                  queryClient.removeQueries({
                    queryKey: inventoryKeys.item(payload.old.id, userId)
                  });
                }
                break;
            }
          } catch (error) {
            console.error('Error handling inventory real-time update:', error);

            await errorCoordinator.handleError({
              workflow: 'inventory',
              operation: 'realtimeUpdate',
              errorType: 'system',
              severity: 'medium',
              message: error instanceof Error ? error.message : 'Failed to handle real-time update',
              context: { userId },
              timestamp: new Date()
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Inventory real-time subscription established');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Inventory real-time subscription error');
        }
      });

    // Subscribe to stock_movements changes
    const movementsSubscription = supabase
      .channel(`stock_movements_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stock_movements',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('📊 Real-time stock movement:', payload);

          try {
            // Validate the incoming stock movement data
            if (payload.new) {
              try {
                const validated = StockMovementTransformSchema.parse(payload.new);
                ValidationMonitor.recordPatternSuccess({
                  pattern: 'direct_schema_validation',
                  context: 'stock-movement-update'
                });
              } catch (validationError) {
                ValidationMonitor.recordValidationError({
                  context: 'stock-movement-realtime',
                  errorMessage: validationError instanceof Error ? validationError.message : 'Validation failed',
                  validationPattern: 'direct_schema'
                });

                await errorCoordinator.handleError({
                  workflow: 'inventory',
                  operation: 'realtimeMovement',
                  errorType: 'validation',
                  severity: 'low',
                  message: 'Invalid real-time stock movement data received',
                  context: { movementId: payload.new?.id },
                  timestamp: new Date()
                });
              }
            }

            // Invalidate movements and dashboard queries
            queryClient.invalidateQueries({ queryKey: inventoryKeys.movements(userId) });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.dashboard(userId) });

            // If movement affects an inventory item, update it too
            if (payload.new?.inventory_item_id) {
              queryClient.invalidateQueries({
                queryKey: inventoryKeys.item(payload.new.inventory_item_id, userId)
              });
            }

            console.log('🔄 Stock movement processed:', payload.new?.id);
          } catch (error) {
            console.error('Error handling stock movement real-time update:', error);

            await errorCoordinator.handleError({
              workflow: 'inventory',
              operation: 'realtimeMovement',
              errorType: 'system',
              severity: 'medium',
              message: error instanceof Error ? error.message : 'Failed to handle real-time movement update',
              context: { userId },
              timestamp: new Date()
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Stock movements real-time subscription established');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Stock movements real-time subscription error');
        }
      });

    // Subscribe to inventory_alerts changes
    const alertsSubscription = supabase
      .channel(`inventory_alerts_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_alerts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🚨 Real-time alert update:', payload);

          try {
            // Invalidate alerts and dashboard queries
            queryClient.invalidateQueries({ queryKey: inventoryKeys.alerts(userId) });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.dashboard(userId) });

            // Handle different alert events
            switch (payload.eventType) {
              case 'INSERT':
                console.log('🚨 New alert created:', payload.new?.alert_type);
                // Could trigger a notification here
                break;
              case 'UPDATE':
                if (payload.new?.acknowledged) {
                  console.log('✅ Alert acknowledged:', payload.new?.id);
                }
                break;
              case 'DELETE':
                console.log('🗑️ Alert deleted:', payload.old?.id);
                break;
            }
          } catch (error) {
            console.error('Error handling alert real-time update:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Alerts real-time subscription established');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Alerts real-time subscription error');
        }
      });

    // Cleanup function
    return () => {
      console.log('🔌 Cleaning up inventory real-time subscriptions');

      inventorySubscription.unsubscribe();
      movementsSubscription.unsubscribe();
      alertsSubscription.unsubscribe();
    };
  }, [userId, queryClient]);

  // Return subscription status for UI feedback
  return {
    isEnabled: !!userId,
    userId,
  };
}

// Optional: Hook for manual real-time data refresh
export function useRefreshInventoryData() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const userId = user?.id;

  const refreshAll = () => {
    if (!userId) {
      const error = createInventoryError(
        'AUTHENTICATION_REQUIRED',
        'User not authenticated for data refresh',
        'Please sign in to refresh inventory data'
      );
      console.error(error.userMessage);
      return Promise.reject(error);
    }

    console.log('🔄 Manual inventory data refresh triggered');

    // Invalidate all inventory-related queries
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists(userId) }),
      queryClient.invalidateQueries({ queryKey: inventoryKeys.dashboard(userId) }),
      queryClient.invalidateQueries({ queryKey: inventoryKeys.movements(userId) }),
      queryClient.invalidateQueries({ queryKey: inventoryKeys.alerts(userId) }),
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock(userId) }),
    ]);
  };

  return {
    refreshAll,
    isAvailable: !!userId,
  };
}