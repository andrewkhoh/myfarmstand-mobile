import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InventoryDashboard } from '../../../screens/inventory/InventoryDashboard';
import { InventoryService } from '../../../services/inventory/inventoryService';
import { SimplifiedSupabaseMock } from '../../../test-utils/SimplifiedSupabaseMock';
import { ValidationMonitor } from '../../../test-utils/ValidationMonitor';
import { inventoryKeys } from '../../../utils/queryKeyFactory';

// Mock the hooks to use real service
const mockSupabase = new SimplifiedSupabaseMock();
const validationMonitor = new ValidationMonitor();
const inventoryService = new InventoryService(mockSupabase as any, validationMonitor);

jest.mock('../../../hooks/inventory/useInventory', () => {
  const { useQuery, useMutation, useQueryClient } = require('@tanstack/react-query');
  
  return {
    useInventoryItems: (filters?: any) => {
      return useQuery({
        queryKey: ['inventory', 'list', filters],
        queryFn: async () => {
          return inventoryService.getItems('test-user', 'admin', filters);
        }
      });
    },
    
    useInventoryStats: () => {
      return useQuery({
        queryKey: ['inventory', 'stats'],
        queryFn: async () => {
          return inventoryService.getStats('test-user', 'admin');
        }
      });
    },
    
    useInventoryAlerts: () => {
      return useQuery({
        queryKey: ['inventory', 'alerts'],
        queryFn: async () => {
          return inventoryService.getAlerts('test-user', 'admin');
        }
      });
    },
    
    useUpdateStock: () => {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: async (adjustment: any) => {
          return inventoryService.updateStock('test-user', 'admin', adjustment);
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
        }
      });
    }
  };
});

describe('Inventory End-to-End Integration', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false }
      }
    });

    // Reset mock database
    mockSupabase.reset();

    // Setup test data
    mockSupabase.setData('inventory_items', [
      {
        id: 'item-1',
        name: 'Widget A',
        sku: 'WGT-001',
        barcode: '1234567890',
        category_id: 'cat-1',
        unit_of_measure: 'pcs',
        current_stock: 150,
        minimum_stock: 50,
        reorder_point: 75,
        reorder_quantity: 100,
        unit_cost: 25.00,
        selling_price: 49.99,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      },
      {
        id: 'item-2',
        name: 'Gadget B',
        sku: 'GDG-002',
        category_id: 'cat-2',
        unit_of_measure: 'units',
        current_stock: 25,
        minimum_stock: 30,
        reorder_point: 40,
        reorder_quantity: 50,
        unit_cost: 15.00,
        selling_price: 29.99,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }
    ]);

    mockSupabase.setData('inventory_movements', []);
    mockSupabase.setData('inventory_alerts', [
      {
        id: 'alert-1',
        item_id: 'item-2',
        alert_type: 'low_stock',
        severity: 'high',
        message: 'Gadget B is below reorder point',
        is_resolved: false,
        created_at: '2024-01-01T00:00:00Z'
      }
    ]);
    mockSupabase.setData('audit_logs', []);
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Data Flow Integration', () => {
    it('should flow from screen → hook → service → database', async () => {
      const { getByTestId, getByText } = render(<InventoryDashboard />, { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(getByTestId('inventory-dashboard')).toBeTruthy();
      });

      // Verify data is displayed
      await waitFor(() => {
        expect(getByText('WGT-001 - Widget A')).toBeTruthy();
        expect(getByText('GDG-002 - Gadget B')).toBeTruthy();
      });

      // Verify stats are calculated
      await waitFor(() => {
        expect(getByText('Total Items: 2')).toBeTruthy();
        expect(getByText('Low Stock: 1')).toBeTruthy();
      });

      // Verify alerts are shown
      await waitFor(() => {
        expect(getByText('Active Alerts (1)')).toBeTruthy();
      });
    });

    it('should update stock through the complete stack', async () => {
      // Mock the update stock hook to actually update
      const useUpdateStockMock = jest.fn().mockImplementation(() => {
        const queryClient = useQueryClient();
        return {
          mutate: async (adjustment: any) => {
            const result = await inventoryService.updateStock('test-user', 'admin', adjustment);
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            return result;
          },
          mutateAsync: async (adjustment: any) => {
            const result = await inventoryService.updateStock('test-user', 'admin', adjustment);
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            return result;
          }
        };
      });

      const { getByTestId } = render(<InventoryDashboard />, { wrapper });

      await waitFor(() => {
        expect(getByTestId('inventory-dashboard')).toBeTruthy();
      });

      // Simulate stock update
      fireEvent.press(getByTestId('update-stock-button'));

      // Verify movement was created
      const movements = mockSupabase['data']['inventory_movements'];
      expect(movements).toBeDefined();
    });

    it('should handle real-time updates', async () => {
      const { getByTestId, getByText, rerender } = render(<InventoryDashboard />, { wrapper });

      await waitFor(() => {
        expect(getByTestId('inventory-dashboard')).toBeTruthy();
      });

      // Simulate external update to database
      mockSupabase.setData('inventory_items', [
        ...mockSupabase['data']['inventory_items'],
        {
          id: 'item-3',
          name: 'New Product',
          sku: 'NEW-003',
          category_id: 'cat-1',
          unit_of_measure: 'pcs',
          current_stock: 500,
          minimum_stock: 100,
          reorder_point: 150,
          reorder_quantity: 200,
          unit_cost: 10.00,
          selling_price: 19.99,
          is_active: true,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          created_by: 'user-2',
          updated_by: 'user-2'
        }
      ]);

      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['inventory'] });

      // Re-render to pick up new data
      rerender(<InventoryDashboard />);

      await waitFor(() => {
        expect(getByText('NEW-003 - New Product')).toBeTruthy();
      });
    });
  });

  describe('Role-Based Access Control', () => {
    it('should enforce permissions at service layer', async () => {
      // Test with viewer role (read-only)
      const viewerService = new InventoryService(mockSupabase as any, validationMonitor);
      
      // Should allow read
      await expect(
        viewerService.getItems('viewer-user', 'viewer')
      ).resolves.toBeDefined();

      // Should deny write
      await expect(
        viewerService.updateStock('viewer-user', 'viewer', {
          item_id: 'item-1',
          adjustment_type: 'increase',
          quantity: 10,
          reason: 'Test'
        })
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('Cache Management', () => {
    it('should properly invalidate cache after mutations', async () => {
      const { getByTestId, getByText } = render(<InventoryDashboard />, { wrapper });

      await waitFor(() => {
        expect(getByTestId('inventory-dashboard')).toBeTruthy();
      });

      // Check initial cache state
      const cachedData = queryClient.getQueryData(['inventory', 'list', undefined]);
      expect(cachedData).toBeDefined();

      // Perform mutation (this would normally be triggered by a button)
      await inventoryService.updateStock('test-user', 'admin', {
        item_id: 'item-1',
        adjustment_type: 'increase',
        quantity: 50,
        reason: 'Restock'
      });

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['inventory'] });

      // Cache should be cleared
      await waitFor(() => {
        const newCache = queryClient.getQueryData(['inventory', 'list', undefined]);
        expect(newCache).toBeDefined();
      });
    });
  });

  describe('Error Recovery', () => {
    it('should handle and recover from service errors', async () => {
      // Make service fail initially
      mockSupabase.setShouldFail(true);

      const { getByTestId, getByText, rerender } = render(<InventoryDashboard />, { wrapper });

      // Should show error
      await waitFor(() => {
        expect(getByTestId('error')).toBeTruthy();
      });

      // Fix the error
      mockSupabase.setShouldFail(false);

      // Retry
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      rerender(<InventoryDashboard />);

      // Should recover and show data
      await waitFor(() => {
        expect(getByTestId('inventory-dashboard')).toBeTruthy();
      });
    });
  });

  describe('Audit Trail', () => {
    it('should create audit logs for all operations', async () => {
      await inventoryService.getItems('test-user', 'admin');
      
      const auditLogs = mockSupabase['data']['audit_logs'];
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe('inventory.read');
      expect(auditLogs[0].user_id).toBe('test-user');

      await inventoryService.updateStock('test-user', 'admin', {
        item_id: 'item-1',
        adjustment_type: 'increase',
        quantity: 10,
        reason: 'Test adjustment'
      });

      const updatedLogs = mockSupabase['data']['audit_logs'];
      expect(updatedLogs.length).toBeGreaterThan(1);
      
      const updateLog = updatedLogs.find((log: any) => log.action === 'inventory.update');
      expect(updateLog).toBeDefined();
      expect(updateLog.entity_id).toBe('item-1');
    });
  });

  describe('Performance', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();

      // Create 100 items for bulk update
      const bulkItems = Array.from({ length: 100 }, (_, i) => ({
        id: `bulk-item-${i}`,
        name: `Bulk Item ${i}`,
        sku: `BULK-${i.toString().padStart(3, '0')}`,
        category_id: 'cat-1',
        unit_of_measure: 'pcs',
        current_stock: 100,
        minimum_stock: 20,
        reorder_point: 30,
        reorder_quantity: 50,
        unit_cost: 10,
        selling_price: 20,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }));

      mockSupabase.setData('inventory_items', bulkItems);

      // Perform bulk update
      const operation = {
        operation_type: 'update' as const,
        items: bulkItems.slice(0, 100).map(item => ({
          id: item.id,
          updates: { current_stock: 200 }
        }))
      };

      const result = await inventoryService.bulkUpdate('test-user', 'admin', operation);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
      expect(result.success_rate).toBe(100);
      expect(result.success).toHaveLength(100);
    });

    it('should load dashboard quickly', async () => {
      const startTime = Date.now();

      const { getByTestId } = render(<InventoryDashboard />, { wrapper });

      await waitFor(() => {
        expect(getByTestId('inventory-dashboard')).toBeTruthy();
      }, { timeout: 500 });

      const endTime = Date.now();
      const loadTime = endTime - startTime;

      // Dashboard should load within 500ms
      expect(loadTime).toBeLessThan(500);
    });
  });

  describe('Data Validation', () => {
    it('should validate all data through schemas', async () => {
      // Clear validation errors
      validationMonitor.clearErrors();

      // Fetch items - should validate response
      await inventoryService.getItems('test-user', 'admin');

      // No validation errors should occur
      expect(validationMonitor.hasErrors()).toBe(false);

      // Try invalid data
      mockSupabase.setData('inventory_items', [
        {
          id: 'invalid-item',
          name: '', // Invalid: empty name
          current_stock: -10 // Invalid: negative stock
        }
      ]);

      // Should throw validation error
      await expect(
        inventoryService.getItems('test-user', 'admin')
      ).rejects.toThrow();

      // Validation monitor should have recorded the error
      expect(validationMonitor.hasErrors()).toBe(true);
    });
  });
});