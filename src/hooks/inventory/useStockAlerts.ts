import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { InventoryService } from '../../services/inventory/inventoryService';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import { useCurrentUser } from '../useAuth';
import { supabase } from '../../config/supabase';
import type { StockAlert, InventoryError } from '../../types/inventory';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { errorCoordinator } from '../../services/cross-workflow/errorCoordinator';
import { z } from 'zod';

// Stock alert validation schema
const StockAlertSchema = z.object({
  id: z.string().uuid(),
  inventoryItemId: z.string().uuid(),
  alertType: z.enum(['low_stock', 'out_of_stock', 'expiring_soon', 'overstock']),
  severity: z.enum(['critical', 'warning', 'info']),
  message: z.string(),
  acknowledged: z.boolean(),
  acknowledgedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime()
});

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


interface GroupedAlerts {
  critical: StockAlert[];
  warning: StockAlert[];
  info: StockAlert[]; // Changed from 'low' to 'info' to match screen
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
      data: {
        critical: [],
        warning: [],
        info: []
      } as GroupedAlerts,
      isLoading: false,
      isError: true,
      error: authError,
      refetch: () => Promise.resolve({ data: { critical: [], warning: [], info: [] } } as any),
    };
  }

  return useQuery({
    queryKey: inventoryKeys.alerts(userId),
    queryFn: async (): Promise<GroupedAlerts> => {
      try {
        const service = new InventoryService(supabase);
        const alerts = await service.getAlerts(userId);

        console.log('[useStockAlerts] Raw alerts from service:', alerts);

        // Validate each alert
        const validatedAlerts: StockAlert[] = [];
        for (const alert of alerts) {
          try {
            const validated = StockAlertSchema.parse(alert);
            validatedAlerts.push(validated as StockAlert);
          } catch (validationError) {
            ValidationMonitor.recordValidationError({
              context: 'stock-alert-validation',
              errorMessage: validationError instanceof Error ? validationError.message : 'Alert validation failed',
              validationPattern: 'direct_schema'
            });
            // Skip invalid alerts but continue processing others
            continue;
          }
        }

        // Group alerts by severity
        const grouped: GroupedAlerts = {
          critical: [],
          warning: [],
          info: []
        };

        for (const alert of validatedAlerts) {
          if (alert.severity === 'critical') {
            grouped.critical.push(alert);
          } else if (alert.severity === 'warning') {
            grouped.warning.push(alert);
          } else {
            grouped.info.push(alert); // Changed from 'low' to 'info'
          }
        }

        console.log('[useStockAlerts] Grouped alerts:', grouped);

        ValidationMonitor.recordPatternSuccess({
          pattern: 'direct_supabase_query',
          context: 'stock-alerts'
        });

        return grouped;
      } catch (error) {
        console.error('Failed to load stock alerts:', error);

        // Log error through error coordinator
        await errorCoordinator.handleError({
          workflow: 'inventory',
          operation: 'fetchAlerts',
          errorType: error instanceof Error && error.message.includes('validation') ? 'validation' : 'network',
          severity: 'medium',
          message: error instanceof Error ? error.message : 'Failed to load stock alerts',
          context: { userId },
          timestamp: new Date()
        });

        ValidationMonitor.recordValidationError({
          context: 'stock-alerts',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          validationPattern: 'direct_supabase_query'
        });

        // Return empty grouped structure instead of crashing UI
        return {
          critical: [],
          warning: [],
          info: []
        };
      }
    },
    staleTime: 30 * 1000, // 30 seconds for alerts
    refetchInterval: 60 * 1000, // Refetch every minute to get new alerts
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
        // Validate alert ID format
        if (!z.string().uuid().safeParse(alertId).success) {
          throw new Error('Invalid alert ID format');
        }

        const service = new InventoryService(supabase);
        const result = await service.acknowledgeAlert(alertId, userId);

        ValidationMonitor.recordPatternSuccess({
          pattern: 'atomic_operation',
          context: 'stock-alerts'
        });

        return result;
      } catch (error) {
        // Log error through error coordinator
        await errorCoordinator.handleError({
          workflow: 'inventory',
          operation: 'acknowledgeAlert',
          errorType: 'business',
          severity: 'low',
          message: error instanceof Error ? error.message : 'Failed to acknowledge alert',
          context: { alertId, userId },
          timestamp: new Date()
        });

        ValidationMonitor.recordValidationError({
          context: 'alert-acknowledge',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          validationPattern: 'atomic_operation'
        });

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

      // Optimistically mark alert as acknowledged
      queryClient.setQueryData(
        inventoryKeys.alerts(userId),
        (old: any) => {
          if (old && typeof old === 'object') {
            const newData = { ...old };
            // Update all severity groups
            ['critical', 'warning', 'info'].forEach(severity => {
              if (Array.isArray(newData[severity])) {
                newData[severity] = newData[severity].filter(
                  (alert: StockAlert) => alert.id !== alertId
                );
              }
            });
            return newData;
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
    onSuccess: () => {
      if (userId) {
        // Smart invalidation - only affected queries
        queryClient.invalidateQueries({ queryKey: inventoryKeys.alerts(userId) });
        queryClient.invalidateQueries({ queryKey: inventoryKeys.dashboard(userId) });
      }
    },
  });
}