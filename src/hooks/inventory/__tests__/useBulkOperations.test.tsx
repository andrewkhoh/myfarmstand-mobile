/**
 * Test: Bulk Operations Hook
 * Testing bulk stock updates, CSV import/export, and templates
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useBulkStockUpdate,
  useCSVImport,
  useInventoryExport,
  useBulkOperationTemplates
} from '../useBulkOperations';
import { InventoryService } from '../../../services/inventory/inventoryService';
import { useAuth } from '../../useAuth';

// Mock services
jest.mock('../../../services/inventory/inventoryService');
jest.mock('../../useAuth');

const mockInventoryService = InventoryService as jest.Mocked<typeof InventoryService>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('Bulk Operations Hooks', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockUseAuth.mockReturnValue({
      user: { id: 'test-user-1' },
      isAuthenticated: true,
    } as any);

    jest.clearAllMocks();
  });

  describe('useBulkStockUpdate', () => {
    const mockBulkUpdates = [
      {
        inventoryItemId: 'inv-1',
        currentStock: 50,
        reason: 'Bulk restock',
        performedBy: 'test-user-1'
      },
      {
        inventoryItemId: 'inv-2',
        currentStock: 25,
        reason: 'Bulk adjustment',
        performedBy: 'test-user-1'
      }
    ];

    const mockBulkResult = {
      success: [
        {
          id: 'inv-1',
          productId: 'prod-1',
          currentStock: 50,
          productName: 'Product 1'
        },
        {
          id: 'inv-2',
          productId: 'prod-2',
          currentStock: 25,
          productName: 'Product 2'
        }
      ],
      failures: []
    };

    beforeEach(() => {
      mockInventoryService.batchUpdateStock.mockResolvedValue(mockBulkResult as any);
    });

    it('should execute bulk stock update successfully', async () => {
      const { result } = renderHook(() => useBulkStockUpdate(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(mockBulkUpdates);
      });

      expect(mockInventoryService.batchUpdateStock).toHaveBeenCalledWith(mockBulkUpdates);
      expect(result.current.data).toEqual(mockBulkResult);
    });

    it('should invalidate affected queries on success', async () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData');

      const { result } = renderHook(() => useBulkStockUpdate(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(mockBulkUpdates);
      });

      // Should set updated items in cache
      expect(setQueryDataSpy).toHaveBeenCalledTimes(2); // One for each success item

      // Should invalidate dashboard, alerts, and low stock queries
      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });

    it('should handle bulk operation failures gracefully', async () => {
      const failureResult = {
        success: [mockBulkResult.success[0]], // Only first succeeds
        failures: [
          {
            inventoryItemId: 'inv-2',
            error: 'Stock validation failed'
          }
        ]
      };

      mockInventoryService.batchUpdateStock.mockResolvedValue(failureResult as any);

      const { result } = renderHook(() => useBulkStockUpdate(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(mockBulkUpdates);
      });

      expect(result.current.data).toEqual(failureResult);
      // Should still invalidate queries for successful items
    });

    it('should invalidate all queries on complete failure', async () => {
      mockInventoryService.batchUpdateStock.mockRejectedValue(new Error('Service failure'));
      
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useBulkStockUpdate(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync(mockBulkUpdates);
        } catch (error) {
          // Expected to fail
        }
      });

      // Should invalidate all inventory queries for consistency
      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });
  });

  describe('useCSVImport', () => {
    const mockCSVData = [
      {
        productId: 'prod-1',
        currentStock: 30,
        reason: 'CSV Import'
      },
      {
        productId: 'prod-2',
        currentStock: 15,
        reason: 'CSV Import'
      },
      {
        productId: 'invalid-prod',
        currentStock: -5, // Invalid stock
        reason: 'CSV Import'
      }
    ];

    const mockInventoryItems = [
      {
        id: 'inv-1',
        productId: 'prod-1',
        productName: 'Product 1'
      },
      {
        id: 'inv-2',
        productId: 'prod-2',
        productName: 'Product 2'
      }
    ];

    beforeEach(() => {
      // Mock getInventoryByProduct for valid products
      mockInventoryService.getInventoryByProduct
        .mockImplementation((productId: string) => {
          const item = mockInventoryItems.find(item => item.productId === productId);
          return Promise.resolve(item as any || null);
        });

      mockInventoryService.batchUpdateStock.mockResolvedValue({
        success: mockInventoryItems,
        failures: []
      } as any);
    });

    it('should process valid CSV data successfully', async () => {
      const { result } = renderHook(() => useCSVImport(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(mockCSVData);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.validRows).toBe(2); // Only 2 valid rows
      expect(result.current.data?.processedRows).toBe(3); // All 3 rows processed
      expect(result.current.data?.validationErrors).toHaveLength(1); // One invalid row
    });

    it('should validate CSV data and collect errors', async () => {
      const { result } = renderHook(() => useCSVImport(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(mockCSVData);
      });

      const validationErrors = result.current.data?.validationErrors;
      expect(validationErrors).toHaveLength(1);
      expect(validationErrors?.[0].row).toBe(3); // Third row (0-indexed + 1)
      expect(validationErrors?.[0].error).toContain('Invalid product ID or stock value');
    });

    it('should handle product lookup failures', async () => {
      mockInventoryService.getInventoryByProduct.mockRejectedValue(new Error('Lookup failed'));

      const { result } = renderHook(() => useCSVImport(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync(mockCSVData);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    it('should throw error when no valid updates found', async () => {
      const invalidCSVData = [
        {
          productId: '', // Invalid
          currentStock: -1, // Invalid
          reason: 'Test'
        }
      ];

      const { result } = renderHook(() => useCSVImport(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync(invalidCSVData);
          fail('Should have thrown error');
        } catch (error) {
          expect((error as Error).message).toContain('No valid updates found');
        }
      });
    });
  });

  describe('useInventoryExport', () => {
    const mockInventoryItems = [
      {
        id: 'inv-1',
        productId: 'prod-1',
        productName: 'Product 1',
        currentStock: 10,
        reservedStock: 2,
        minimumThreshold: 5,
        maximumThreshold: 100,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T00:00:00Z'
      },
      {
        id: 'inv-2',
        productId: 'prod-2',
        productName: 'Product 2',
        currentStock: 0,
        reservedStock: 0,
        minimumThreshold: 10,
        maximumThreshold: 50,
        isActive: false,
        isVisibleToCustomers: false,
        lastStockUpdate: '2024-01-02T00:00:00Z'
      }
    ];

    beforeEach(() => {
      mockInventoryService.getAllInventoryItems.mockResolvedValue(mockInventoryItems as any);
    });

    it('should export inventory data as CSV by default', async () => {
      const { result } = renderHook(() => useInventoryExport(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync();
      });

      const exportData = result.current.data!;

      expect(exportData.mimeType).toBe('text/csv');
      expect(exportData.filename).toMatch(/inventory_export_\d{4}-\d{2}-\d{2}\.csv/);
      expect(exportData.data).toContain('Product ID,Product Name');
      expect(exportData.data).toContain('"prod-1","Product 1"');
    });

    it('should export inventory data as JSON when requested', async () => {
      const { result } = renderHook(() => useInventoryExport(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ format: 'json' });
      });

      const exportData = result.current.data!;

      expect(exportData.mimeType).toBe('application/json');
      expect(exportData.filename).toMatch(/inventory_export_\d{4}-\d{2}-\d{2}\.json/);
      
      const parsedData = JSON.parse(exportData.data);
      expect(parsedData).toHaveLength(2);
      expect(parsedData[0].productId).toBe('prod-1');
    });

    it('should filter inactive items by default', async () => {
      const { result } = renderHook(() => useInventoryExport(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync();
      });

      const csvData = result.current.data!.data;
      const lines = csvData.split('\n');
      
      // Should only have header + 1 active item
      expect(lines.length).toBe(3); // Header + 1 data row + empty line at end
    });

    it('should include inactive items when requested', async () => {
      const { result } = renderHook(() => useInventoryExport(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ includeInactive: true });
      });

      const csvData = result.current.data!.data;
      const lines = csvData.split('\n').filter(line => line.trim());
      
      // Should have header + 2 data rows
      expect(lines.length).toBe(3); // Header + 2 data rows
    });

    it('should include hidden items when requested', async () => {
      const { result } = renderHook(() => useInventoryExport(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ 
          includeInactive: true,
          includeHidden: true 
        });
      });

      const csvData = result.current.data!.data;
      const lines = csvData.split('\n').filter(line => line.trim());
      
      // Should have header + both items
      expect(lines.length).toBe(3); // Header + 2 data rows
      expect(csvData).toContain('prod-2'); // Hidden item should be included
    });

    it('should calculate available stock correctly in CSV', async () => {
      const { result } = renderHook(() => useInventoryExport(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ includeInactive: true });
      });

      const csvData = result.current.data!.data;
      
      // First item: current 10 - reserved 2 = available 8
      expect(csvData).toContain('"10","2","8"');
      
      // Second item: current 0 - reserved 0 = available 0
      expect(csvData).toContain('"0","0","0"');
    });
  });

  describe('useBulkOperationTemplates', () => {
    const mockTemplateItems = [
      {
        id: 'inv-1',
        productId: 'prod-1',
        productName: 'Product 1',
        currentStock: 15,
        minimumThreshold: 10,
        maximumThreshold: 100,
        isActive: true,
        isVisibleToCustomers: true
      },
      {
        id: 'inv-2',
        productId: 'prod-2',
        productName: 'Product 2',
        currentStock: 5,
        minimumThreshold: 5,
        maximumThreshold: 50,
        isActive: false,
        isVisibleToCustomers: false
      }
    ];

    beforeEach(() => {
      mockInventoryService.getAllInventoryItems.mockResolvedValue(mockTemplateItems as any);
    });

    it('should generate stock update template', async () => {
      const { result } = renderHook(() => useBulkOperationTemplates(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('stock_update');
      });

      const template = result.current.data!;

      expect(template.filename).toBe('stock_update_template.csv');
      expect(template.mimeType).toBe('text/csv');
      expect(template.data).toContain('Product ID,Product Name,Current Stock,Reason');
      expect(template.data).toContain('"prod-1","Product 1","15","Bulk Update"');
    });

    it('should generate visibility update template', async () => {
      const { result } = renderHook(() => useBulkOperationTemplates(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('visibility_update');
      });

      const template = result.current.data!;

      expect(template.filename).toBe('visibility_update_template.csv');
      expect(template.data).toContain('Product ID,Product Name,Visible to Customers,Is Active');
      expect(template.data).toContain('"prod-1","Product 1","Yes","Yes"');
      expect(template.data).toContain('"prod-2","Product 2","No","No"');
    });

    it('should generate full inventory template', async () => {
      const { result } = renderHook(() => useBulkOperationTemplates(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('full_inventory');
      });

      const template = result.current.data!;

      expect(template.filename).toBe('full_inventory_template.csv');
      expect(template.data).toContain('Product ID,Product Name,Current Stock,Minimum Threshold');
      expect(template.data).toContain('"prod-1","Product 1","15","10"');
    });

    it('should throw error for unknown template type', async () => {
      const { result } = renderHook(() => useBulkOperationTemplates(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync('unknown_template' as any);
          fail('Should have thrown error');
        } catch (error) {
          expect((error as Error).message).toContain('Unknown template type');
        }
      });
    });

    it('should handle empty inventory for templates', async () => {
      mockInventoryService.getAllInventoryItems.mockResolvedValue([]);

      const { result } = renderHook(() => useBulkOperationTemplates(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('stock_update');
      });

      const template = result.current.data!;

      // Should still have headers
      expect(template.data).toContain('Product ID,Product Name,Current Stock,Reason');
      
      // Should not have data rows
      const lines = template.data.split('\n').filter(line => line.trim());
      expect(lines.length).toBe(1); // Only header
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service errors in bulk operations', async () => {
      mockInventoryService.batchUpdateStock.mockRejectedValue(new Error('Service unavailable'));

      const { result } = renderHook(() => useBulkStockUpdate(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync([{
            inventoryItemId: 'inv-1',
            currentStock: 10,
            reason: 'Test'
          }]);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.error).toBeDefined();
    });

    it('should handle empty bulk update arrays', async () => {
      const { result } = renderHook(() => useBulkStockUpdate(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync([]);
      });

      expect(mockInventoryService.batchUpdateStock).toHaveBeenCalledWith([]);
    });
  });
});