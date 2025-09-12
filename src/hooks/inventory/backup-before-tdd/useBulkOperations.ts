/**
 * Bulk Inventory Operations Hook
 * Provides comprehensive bulk operation capabilities with progress tracking
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InventoryService } from '../../services/inventory/inventoryService';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import { useCurrentUser } from '../useAuth';
import type { StockUpdateInput } from '../../schemas/inventory';

export interface BulkOperationProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
  errors: Array<{ itemId: string; error: string }>;
  successItems: Array<{ itemId: string; newStock: number }>;
}

export interface BulkStockUpdate {
  inventoryItemId: string;
  currentStock: number;
  reason?: string;
  performedBy?: string;
}

export interface CSVImportData {
  productId: string;
  currentStock: number;
  reason: string;
}

/**
 * Bulk stock update with progress tracking and resilient processing
 */
export function useBulkStockUpdate() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  return useMutation({
    mutationFn: async (updates: BulkStockUpdate[]) => {
      const result = await InventoryService.batchUpdateStock(updates);
      return result;
    },

    onSuccess: (result) => {
      // Invalidate all affected queries
      if (result.success && result.success.length > 0) {
        result.success.forEach(item => {
          queryClient.setQueryData(inventoryKeys.item(item.id, user?.id), item);
          queryClient.invalidateQueries({ queryKey: inventoryKeys.itemByProduct(item.productId, user?.id) });
        });

        // Invalidate dashboard and alerts
        queryClient.invalidateQueries({ queryKey: inventoryKeys.dashboard(user?.id) });
        queryClient.invalidateQueries({ queryKey: inventoryKeys.alerts(user?.id) });
        queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock(undefined, user?.id) });
      }
    },

    onError: () => {
      // On complete failure, invalidate all inventory queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all(user?.id) });
    },
  });
}

/**
 * CSV import with validation and progress tracking
 */
export function useCSVImport() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  return useMutation({
    mutationFn: async (csvData: CSVImportData[]) => {
      // Convert CSV data to bulk update format
      const updates: BulkStockUpdate[] = [];
      const errors: Array<{ row: number; error: string }> = [];

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        
        // Validate each row
        if (!row.productId || typeof row.currentStock !== 'number' || row.currentStock < 0) {
          errors.push({
            row: i + 1,
            error: 'Invalid product ID or stock value'
          });
          continue;
        }

        // Find inventory item for this product
        try {
          const inventoryItem = await InventoryService.getInventoryByProduct(row.productId);
          if (!inventoryItem) {
            errors.push({
              row: i + 1,
              error: `No inventory item found for product ${row.productId}`
            });
            continue;
          }

          updates.push({
            inventoryItemId: inventoryItem.id,
            currentStock: row.currentStock,
            reason: row.reason || 'CSV Import',
            performedBy: user?.id
          });
        } catch (error) {
          errors.push({
            row: i + 1,
            error: `Failed to lookup product ${row.productId}: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }

      if (updates.length === 0) {
        throw new Error(`No valid updates found. ${errors.length} rows had errors.`);
      }

      // Execute bulk update
      const result = await InventoryService.batchUpdateStock(updates);
      
      return {
        ...result,
        validationErrors: errors,
        processedRows: csvData.length,
        validRows: updates.length
      };
    },

    onSuccess: (result) => {
      // Same invalidation as bulk update
      if (result.success && result.success.length > 0) {
        result.success.forEach(item => {
          queryClient.setQueryData(inventoryKeys.item(item.id, user?.id), item);
          queryClient.invalidateQueries({ queryKey: inventoryKeys.itemByProduct(item.productId, user?.id) });
        });

        queryClient.invalidateQueries({ queryKey: inventoryKeys.dashboard(user?.id) });
        queryClient.invalidateQueries({ queryKey: inventoryKeys.alerts(user?.id) });
        queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock(undefined, user?.id) });
      }
    },

    onError: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all(user?.id) });
    },
  });
}

/**
 * Export inventory data to CSV format
 */
export function useInventoryExport() {
  const { data: user } = useCurrentUser();

  return useMutation({
    mutationFn: async (options?: { 
      includeInactive?: boolean; 
      includeHidden?: boolean; 
      format?: 'csv' | 'json' 
    }) => {
      const items = await InventoryService.getAllInventoryItems();
      
      let filteredItems = items;
      
      if (!options?.includeInactive) {
        filteredItems = filteredItems.filter(item => item.isActive);
      }
      
      if (!options?.includeHidden) {
        filteredItems = filteredItems.filter(item => item.isVisibleToCustomers);
      }

      const format = options?.format || 'csv';

      if (format === 'json') {
        return {
          data: JSON.stringify(filteredItems, null, 2),
          filename: `inventory_export_${new Date().toISOString().split('T')[0]}.json`,
          mimeType: 'application/json'
        };
      }

      // CSV format
      const headers = [
        'Product ID',
        'Product Name', 
        'Current Stock',
        'Reserved Stock',
        'Available Stock',
        'Minimum Threshold',
        'Maximum Threshold',
        'Is Active',
        'Visible to Customers',
        'Last Updated'
      ];

      const csvRows = filteredItems.map(item => [
        item.productId,
        'Product Name', // TODO: Join with products table to get actual name
        item.currentStock,
        item.reservedStock || 0,
        (item.currentStock || 0) - (item.reservedStock || 0),
        item.minimumThreshold || 0,
        item.maximumThreshold || 0,
        item.isActive ? 'Yes' : 'No',
        item.isVisibleToCustomers ? 'Yes' : 'No',
        item.lastStockUpdate || ''
      ]);

      const csvContent = [headers, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      return {
        data: csvContent,
        filename: `inventory_export_${new Date().toISOString().split('T')[0]}.csv`,
        mimeType: 'text/csv'
      };
    },
  });
}

/**
 * Generate bulk operation templates for CSV import
 */
export function useBulkOperationTemplates() {
  return useMutation({
    mutationFn: async (templateType: 'stock_update' | 'visibility_update' | 'full_inventory') => {
      const items = await InventoryService.getAllInventoryItems();

      switch (templateType) {
        case 'stock_update':
          const stockHeaders = ['Product ID', 'Product Name', 'Current Stock', 'Reason'];
          const stockRows = items.map(item => [
            item.productId,
            'Product Name', // TODO: Join with products table to get actual name
            item.currentStock,
            'Bulk Update'
          ]);

          const stockCsv = [stockHeaders, ...stockRows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

          return {
            data: stockCsv,
            filename: 'stock_update_template.csv',
            mimeType: 'text/csv'
          };

        case 'visibility_update':
          const visibilityHeaders = ['Product ID', 'Product Name', 'Visible to Customers', 'Is Active'];
          const visibilityRows = items.map(item => [
            item.productId,
            'Product Name', // TODO: Join with products table to get actual name
            item.isVisibleToCustomers ? 'Yes' : 'No',
            item.isActive ? 'Yes' : 'No'
          ]);

          const visibilityCsv = [visibilityHeaders, ...visibilityRows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

          return {
            data: visibilityCsv,
            filename: 'visibility_update_template.csv',
            mimeType: 'text/csv'
          };

        case 'full_inventory':
          const fullHeaders = [
            'Product ID', 'Product Name', 'Current Stock', 'Minimum Threshold', 
            'Maximum Threshold', 'Visible to Customers', 'Is Active', 'Reason'
          ];
          const fullRows = items.map(item => [
            item.productId,
            'Product Name', // TODO: Join with products table to get actual name
            item.currentStock,
            item.minimumThreshold || 10,
            item.maximumThreshold || 1000,
            item.isVisibleToCustomers ? 'Yes' : 'No',
            item.isActive ? 'Yes' : 'No',
            'Template Generated'
          ]);

          const fullCsv = [fullHeaders, ...fullRows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

          return {
            data: fullCsv,
            filename: 'full_inventory_template.csv',
            mimeType: 'text/csv'
          };

        default:
          throw new Error(`Unknown template type: ${templateType}`);
      }
    },
  });
}