import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InventoryDashboard } from '../../../screens/inventory/InventoryDashboard';
import { InventoryService } from '../../../services/inventory/inventoryService';
import { SimplifiedSupabaseMock } from '../../../test-utils/SimplifiedSupabaseMock';
import { ValidationMonitor } from '../../../test-utils/ValidationMonitor';
import { inventoryKeys } from '../../../services/queryKeys';

describe('Complete Inventory Flow Integration', () => {
  let queryClient: QueryClient;
  let mockSupabase: SimplifiedSupabaseMock;
  let validationMonitor: ValidationMonitor;
  let inventoryService: InventoryService;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  beforeEach(() => {
    mockSupabase = new SimplifiedSupabaseMock();
    validationMonitor = new ValidationMonitor();
    inventoryService = new InventoryService(mockSupabase as any, validationMonitor);

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false }
      }
    });

    // Setup comprehensive test data
    mockSupabase.setData('inventory_items', [
      {
        id: 'item-1',
        name: 'Critical Stock Item',
        sku: 'CSI-001',
        barcode: '1234567890',
        category_id: 'cat-critical',
        unit_of_measure: 'units',
        current_stock: 5,
        minimum_stock: 20,
        reorder_point: 30,
        reorder_quantity: 50,
        unit_cost: 100.00,
        selling_price: 199.99,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'admin-user',
        updated_by: 'admin-user'
      },
      {
        id: 'item-2',
        name: 'Healthy Stock Item',
        sku: 'HSI-002',
        barcode: '0987654321',
        category_id: 'cat-normal',
        unit_of_measure: 'boxes',
        current_stock: 500,
        minimum_stock: 100,
        reorder_point: 150,
        reorder_quantity: 200,
        unit_cost: 50.00,
        selling_price: 99.99,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'admin-user',
        updated_by: 'admin-user'
      }
    ]);

    mockSupabase.setData('inventory_movements', []);
    mockSupabase.setData('inventory_alerts', []);
    mockSupabase.setData('audit_logs', []);
  });

  describe('Critical Stock Management Flow', () => {
    it('should handle complete critical stock workflow', async () => {
      // Step 1: Initial dashboard load shows critical items
      const { getByTestId, getByText, queryByText } = render(<InventoryDashboard />, { wrapper });

      await waitFor(() => {
        expect(getByTestId('inventory-dashboard')).toBeTruthy();
      });

      // Step 2: Alert generation for critical stock
      const alerts = await inventoryService.getAlerts('admin-user', 'admin');
      expect(alerts.some(a => a.item_id === 'item-1' && a.alert_type === 'critical_stock')).toBe(true);

      // Step 3: Reorder process
      const reorderResult = await inventoryService.createReorder('admin-user', 'admin', {
        item_id: 'item-1',
        quantity: 50,
        supplier: 'Primary Supplier',
        expected_date: '2024-02-01'
      });
      expect(reorderResult).toBeDefined();

      // Step 4: Stock receipt
      const receiptResult = await inventoryService.updateStock('admin-user', 'admin', {
        item_id: 'item-1',
        adjustment_type: 'receipt',
        quantity: 50,
        reason: 'Purchase order received',
        reference_number: 'PO-001'
      });
      expect(receiptResult.new_stock).toBe(55);

      // Step 5: Alert resolution
      const updatedAlerts = await inventoryService.getAlerts('admin-user', 'admin');
      const criticalAlert = updatedAlerts.find(a => a.item_id === 'item-1' && a.alert_type === 'critical_stock');
      expect(criticalAlert?.is_resolved).toBe(true);

      // Step 6: Audit trail verification
      const auditLogs = mockSupabase['data']['audit_logs'];
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs.some((log: any) => log.action === 'inventory.reorder')).toBe(true);
      expect(auditLogs.some((log: any) => log.action === 'inventory.update')).toBe(true);
    });
  });

  describe('Bulk Operations Flow', () => {
    it('should handle bulk inventory adjustments efficiently', async () => {
      // Prepare 50 items for bulk testing
      const bulkItems = Array.from({ length: 50 }, (_, i) => ({
        id: `bulk-${i}`,
        name: `Bulk Product ${i}`,
        sku: `BLK-${i.toString().padStart(3, '0')}`,
        category_id: 'cat-bulk',
        unit_of_measure: 'units',
        current_stock: Math.floor(Math.random() * 1000),
        minimum_stock: 100,
        reorder_point: 150,
        reorder_quantity: 200,
        unit_cost: 25.00,
        selling_price: 49.99,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'admin-user',
        updated_by: 'admin-user'
      }));

      mockSupabase.setData('inventory_items', bulkItems);

      // Perform bulk stock take
      const stockTakeItems = bulkItems.map(item => ({
        id: item.id,
        counted_stock: item.current_stock + Math.floor(Math.random() * 20) - 10
      }));

      const startTime = Date.now();
      
      const stockTakeResult = await inventoryService.performStockTake('admin-user', 'admin', {
        location: 'Warehouse A',
        items: stockTakeItems,
        notes: 'Monthly stock take'
      });

      const duration = Date.now() - startTime;

      // Performance assertion
      expect(duration).toBeLessThan(1000); // Should complete under 1 second
      expect(stockTakeResult.processed).toBe(50);
      expect(stockTakeResult.discrepancies).toBeDefined();

      // Verify movements created
      const movements = mockSupabase['data']['inventory_movements'];
      const stockTakeMovements = movements.filter((m: any) => m.movement_type === 'stock_take');
      expect(stockTakeMovements.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-Module Integration', () => {
    it('should integrate with category management', async () => {
      // Setup categories
      mockSupabase.setData('inventory_categories', [
        { id: 'cat-1', name: 'Electronics', parent_id: null },
        { id: 'cat-2', name: 'Accessories', parent_id: 'cat-1' }
      ]);

      // Filter by category
      const categoryItems = await inventoryService.getItemsByCategory('admin-user', 'admin', 'cat-1');
      expect(categoryItems).toBeDefined();

      // Category stock summary
      const categorySummary = await inventoryService.getCategorySummary('admin-user', 'admin');
      expect(categorySummary).toBeDefined();
    });

    it('should integrate with supplier management', async () => {
      // Setup suppliers
      mockSupabase.setData('suppliers', [
        { id: 'sup-1', name: 'Primary Supplier', lead_time_days: 7 },
        { id: 'sup-2', name: 'Secondary Supplier', lead_time_days: 14 }
      ]);

      // Link items to suppliers
      mockSupabase.setData('item_suppliers', [
        { item_id: 'item-1', supplier_id: 'sup-1', is_primary: true },
        { item_id: 'item-1', supplier_id: 'sup-2', is_primary: false }
      ]);

      // Get supplier info for reorder
      const supplierInfo = await inventoryService.getItemSuppliers('admin-user', 'admin', 'item-1');
      expect(supplierInfo).toHaveLength(2);
      expect(supplierInfo[0].is_primary).toBe(true);
    });
  });

  describe('Real-time Synchronization', () => {
    it('should handle concurrent updates correctly', async () => {
      const item_id = 'item-1';
      
      // Simulate concurrent stock updates
      const updates = [
        inventoryService.updateStock('user-1', 'admin', {
          item_id,
          adjustment_type: 'sale',
          quantity: 2,
          reason: 'Customer sale'
        }),
        inventoryService.updateStock('user-2', 'admin', {
          item_id,
          adjustment_type: 'sale',
          quantity: 1,
          reason: 'Customer sale'
        }),
        inventoryService.updateStock('user-3', 'admin', {
          item_id,
          adjustment_type: 'receipt',
          quantity: 10,
          reason: 'Stock receipt'
        })
      ];

      const results = await Promise.all(updates);
      
      // All updates should succeed
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
      });

      // Final stock should reflect all changes
      const finalItem = await inventoryService.getItem('admin-user', 'admin', item_id);
      // Initial: 5, -2, -1, +10 = 12
      expect(finalItem.current_stock).toBe(12);

      // All movements should be recorded
      const movements = await inventoryService.getMovementHistory('admin-user', 'admin', item_id);
      expect(movements).toHaveLength(3);
    });
  });

  describe('Advanced Search and Filtering', () => {
    it('should support complex search queries', async () => {
      // Setup diverse test data
      const searchTestItems = [
        { id: 'search-1', name: 'Blue Widget', sku: 'BWG-001', tags: ['color:blue', 'type:widget'] },
        { id: 'search-2', name: 'Red Gadget', sku: 'RGD-002', tags: ['color:red', 'type:gadget'] },
        { id: 'search-3', name: 'Blue Gadget', sku: 'BGD-003', tags: ['color:blue', 'type:gadget'] }
      ].map(item => ({
        ...item,
        category_id: 'cat-1',
        unit_of_measure: 'units',
        current_stock: 100,
        minimum_stock: 20,
        reorder_point: 30,
        reorder_quantity: 50,
        unit_cost: 10,
        selling_price: 20,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'admin-user',
        updated_by: 'admin-user'
      }));

      mockSupabase.setData('inventory_items', searchTestItems);

      // Test various search combinations
      const blueItems = await inventoryService.searchItems('admin-user', 'admin', {
        query: 'blue',
        filters: { tags: ['color:blue'] }
      });
      expect(blueItems).toHaveLength(2);

      const widgets = await inventoryService.searchItems('admin-user', 'admin', {
        query: 'widget'
      });
      expect(widgets).toHaveLength(1);

      const skuSearch = await inventoryService.searchItems('admin-user', 'admin', {
        query: 'BGD'
      });
      expect(skuSearch).toHaveLength(1);
      expect(skuSearch[0].id).toBe('search-3');
    });
  });

  describe('Data Export and Reporting', () => {
    it('should generate comprehensive inventory reports', async () => {
      const report = await inventoryService.generateInventoryReport('admin-user', 'admin', {
        type: 'full',
        include_movements: true,
        include_alerts: true,
        date_range: {
          start: '2024-01-01',
          end: '2024-12-31'
        }
      });

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('items');
      expect(report).toHaveProperty('movements');
      expect(report).toHaveProperty('alerts');
      expect(report).toHaveProperty('statistics');
      
      expect(report.statistics).toMatchObject({
        total_items: expect.any(Number),
        total_value: expect.any(Number),
        low_stock_count: expect.any(Number),
        critical_stock_count: expect.any(Number),
        inactive_items: expect.any(Number)
      });
    });

    it('should export data in multiple formats', async () => {
      const csvExport = await inventoryService.exportInventory('admin-user', 'admin', 'csv');
      expect(csvExport).toContain('id,name,sku,current_stock');

      const jsonExport = await inventoryService.exportInventory('admin-user', 'admin', 'json');
      expect(() => JSON.parse(jsonExport)).not.toThrow();

      const xlsxExport = await inventoryService.exportInventory('admin-user', 'admin', 'xlsx');
      expect(xlsxExport).toBeDefined();
    });
  });

  describe('Predictive Analytics', () => {
    it('should provide stock predictions based on history', async () => {
      // Setup historical movement data
      const historicalMovements = Array.from({ length: 30 }, (_, i) => ({
        id: `movement-${i}`,
        item_id: 'item-1',
        movement_type: 'sale',
        quantity: Math.floor(Math.random() * 10) + 1,
        created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
      }));

      mockSupabase.setData('inventory_movements', historicalMovements);

      const predictions = await inventoryService.getStockPredictions('admin-user', 'admin', 'item-1');
      
      expect(predictions).toHaveProperty('average_daily_usage');
      expect(predictions).toHaveProperty('days_until_reorder');
      expect(predictions).toHaveProperty('recommended_reorder_date');
      expect(predictions).toHaveProperty('confidence_level');
    });
  });

  describe('Compliance and Regulatory', () => {
    it('should maintain complete audit trail for compliance', async () => {
      // Perform various operations
      await inventoryService.getItems('audit-user', 'admin');
      await inventoryService.updateStock('audit-user', 'admin', {
        item_id: 'item-1',
        adjustment_type: 'adjustment',
        quantity: 5,
        reason: 'Correction'
      });
      await inventoryService.deleteItem('audit-user', 'admin', 'item-2');

      const auditLogs = mockSupabase['data']['audit_logs'];
      
      // Verify comprehensive logging
      expect(auditLogs.some((log: any) => log.action === 'inventory.read')).toBe(true);
      expect(auditLogs.some((log: any) => log.action === 'inventory.update')).toBe(true);
      expect(auditLogs.some((log: any) => log.action === 'inventory.delete')).toBe(true);

      // Each log should have required fields
      auditLogs.forEach((log: any) => {
        expect(log).toHaveProperty('id');
        expect(log).toHaveProperty('timestamp');
        expect(log).toHaveProperty('user_id');
        expect(log).toHaveProperty('action');
        expect(log).toHaveProperty('ip_address');
        expect(log).toHaveProperty('user_agent');
      });
    });
  });
});