import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InventoryService } from '../../services/inventory/inventoryService';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import { useCurrentUser } from '../useAuth';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { supabase } from '../../config/supabase';
import type { InventoryError } from '../../types/inventory';
import { errorCoordinator } from '../../services/cross-workflow/errorCoordinator';
import { z } from 'zod';
import { StockUpdateSchema } from '../../schemas/inventory';

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

// Input validation schema for bulk updates
const BulkStockUpdateSchema = z.object({
  id: z.string().uuid(),
  operation: z.enum(['add', 'subtract', 'set']),
  quantity: z.number().int().min(0),
  reason: z.string().optional()
});

type BulkStockUpdate = z.infer<typeof BulkStockUpdateSchema>;

interface BulkUpdateResult {
  successful: number;
  failed: number;
  errors: Array<{
    itemId: string;
    error: string;
  }>;
}

export function useBulkUpdateStock() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (updates: BulkStockUpdate[]): Promise<BulkUpdateResult> => {
      if (!userId) {
        const error = createInventoryError(
          'AUTHENTICATION_REQUIRED',
          'User not authenticated for bulk stock update',
          'Please sign in to perform bulk stock updates'
        );
        throw error;
      }

      try {
        // Validate all updates first
        const validatedUpdates: BulkStockUpdate[] = [];
        const validationErrors: Array<{ itemId: string; error: string }> = [];

        for (const update of updates) {
          try {
            const validated = BulkStockUpdateSchema.parse(update);
            validatedUpdates.push(validated);
          } catch (validationError) {
            validationErrors.push({
              itemId: update.id || 'unknown',
              error: validationError instanceof Error ? validationError.message : 'Validation failed'
            });

            ValidationMonitor.recordValidationError({
              context: 'bulk-update-validation',
              errorMessage: validationError instanceof Error ? validationError.message : 'Validation failed',
              validationPattern: 'direct_schema'
            });
          }
        }

        // If there are validation errors, return early
        if (validationErrors.length > 0) {
          await errorCoordinator.handleError({
            workflow: 'inventory',
            operation: 'bulkUpdateStock',
            errorType: 'validation',
            severity: 'low',
            message: `Validation failed for ${validationErrors.length} items`,
            context: { validationErrors, userId },
            timestamp: new Date()
          });

          return {
            successful: 0,
            failed: validationErrors.length,
            errors: validationErrors
          };
        }

        const service = new InventoryService(supabase);
        const result: BulkUpdateResult = {
          successful: 0,
          failed: 0,
          errors: []
        };

        // Transform validated updates to service format using StockUpdateSchema
        const stockUpdates = validatedUpdates.map(update => {
          const stockUpdate = StockUpdateSchema.parse({
            inventoryItemId: update.id,
            operation: update.operation,
            quantity: update.quantity,
            reason: update.reason || 'Bulk stock update'
          });
          return stockUpdate;
        });

        // Execute batch update
        const batchResults = await service.batchUpdateStock(stockUpdates, userId, userId);

        // Process results
        for (let i = 0; i < batchResults.length; i++) {
          const batchResult = batchResults[i];
          const update = validatedUpdates[i];

          if (batchResult.success) {
            result.successful++;
            ValidationMonitor.recordPatternSuccess({
              pattern: 'atomic_operation',
              context: 'inventory-bulk-update'
            });
          } else {
            result.failed++;
            result.errors.push({
              itemId: update.id,
              error: batchResult.error?.message || 'Unknown error'
            });
            ValidationMonitor.recordValidationError({
              context: 'bulk-stock-update',
              errorMessage: batchResult.error?.message || 'Unknown error',
              validationPattern: 'atomic_operation'
            });
          }
        }

        // Log successful completion
        if (result.successful > 0) {
          ValidationMonitor.recordPatternSuccess({
            pattern: 'atomic_operation',
            context: 'inventory-bulk-update'
          });
        }

        return result;
      } catch (error) {
        // Log error through error coordinator
        await errorCoordinator.handleError({
          workflow: 'inventory',
          operation: 'bulkUpdateStock',
          errorType: 'business',
          severity: 'high',
          message: error instanceof Error ? error.message : 'Bulk stock update failed',
          context: { userId, updateCount: updates.length },
          timestamp: new Date()
        });

        ValidationMonitor.recordValidationError({
          context: 'bulk-stock-update',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          validationPattern: 'atomic_operation'
        });
        // Convert technical errors to user-friendly ones
        if (error instanceof Error) {
          if (error.message.includes('foreign key')) {
            throw createInventoryError(
              'INVALID_REFERENCE',
              error.message,
              'One or more items have invalid references'
            );
          }
          if (error.message.includes('permission')) {
            throw createInventoryError(
              'PERMISSION_DENIED',
              error.message,
              'You do not have permission to update these items'
            );
          }
        }

        throw createInventoryError(
          'BULK_UPDATE_FAILED',
          error instanceof Error ? error.message : 'Unknown error',
          'Failed to perform bulk stock update. Please try again.'
        );
      }
    },
    onSuccess: (result) => {
      if (userId) {
        // Invalidate inventory queries to refresh data
        queryClient.invalidateQueries({ queryKey: inventoryKeys.lists(userId) });
        queryClient.invalidateQueries({ queryKey: inventoryKeys.dashboard(userId) });
        queryClient.invalidateQueries({ queryKey: inventoryKeys.movements(userId) });

        // If there were low stock items, refresh alerts
        queryClient.invalidateQueries({ queryKey: inventoryKeys.alerts(userId) });
        queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock(undefined, userId) });
      }

      // Log success metrics
      console.log(`Bulk update completed: ${result.successful} successful, ${result.failed} failed`);
    },
    onError: async (error) => {
      console.error('Bulk stock update failed:', error);

      // Log error through error coordinator
      await errorCoordinator.handleError({
        workflow: 'inventory',
        operation: 'bulkUpdateStockMutation',
        errorType: 'system',
        severity: 'high',
        message: error instanceof Error ? error.message : 'Bulk update mutation failed',
        context: { userId },
        timestamp: new Date()
      });

      ValidationMonitor.recordValidationError({
        context: 'bulk-update-mutation',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        validationPattern: 'atomic_operation'
      });
    }
  });
}