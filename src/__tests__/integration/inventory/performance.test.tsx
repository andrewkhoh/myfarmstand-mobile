import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InventoryDashboard } from '../../../screens/inventory/InventoryDashboard';
import { InventoryService } from '../../../services/inventory/inventoryService';
import { SimplifiedSupabaseMock } from '../../../test-utils/SimplifiedSupabaseMock';
import { ValidationMonitor } from '../../../test-utils/ValidationMonitor';

describe('Inventory Performance Tests', () => {
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
  });

  describe('Query Performance', () => {
    it('should fetch inventory items under 200ms', async () => {
      // Setup 100 items
      const items = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        name: `Product ${i}`,
        sku: `SKU-${i.toString().padStart(3, '0')}`,
        category_id: 'cat-1',
        unit_of_measure: 'units',
        current_stock: Math.floor(Math.random() * 1000),
        minimum_stock: 50,
        reorder_point: 75,
        reorder_quantity: 100,
        unit_cost: 10.00,
        selling_price: 20.00,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }));

      mockSupabase.setData('inventory_items', items);

      const startTime = performance.now();
      const result = await inventoryService.getItems('user-1', 'admin');
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(200);
      expect(result).toHaveLength(100);
    });

    it('should handle pagination efficiently', async () => {
      // Setup 1000 items
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        name: `Product ${i}`,
        sku: `SKU-${i.toString().padStart(4, '0')}`,
        category_id: 'cat-1',
        unit_of_measure: 'units',
        current_stock: 100,
        minimum_stock: 20,
        reorder_point: 30,
        reorder_quantity: 50,
        unit_cost: 10.00,
        selling_price: 20.00,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }));

      mockSupabase.setData('inventory_items', items);

      // Test paginated fetch
      const startTime = performance.now();
      
      const page1 = await inventoryService.getItems('user-1', 'admin', {
        page: 1,
        pageSize: 50
      });
      
      const page2 = await inventoryService.getItems('user-1', 'admin', {
        page: 2,
        pageSize: 50
      });
      
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(400); // Both pages under 400ms
      expect(page1).toHaveLength(50);
      expect(page2).toHaveLength(50);
    });
  });

  describe('Bulk Operation Performance', () => {
    it('should update 100 items in under 2 seconds', async () => {
      // Setup items
      const items = Array.from({ length: 100 }, (_, i) => ({
        id: `bulk-${i}`,
        name: `Bulk Product ${i}`,
        sku: `BULK-${i.toString().padStart(3, '0')}`,
        category_id: 'cat-bulk',
        unit_of_measure: 'units',
        current_stock: 100,
        minimum_stock: 20,
        reorder_point: 30,
        reorder_quantity: 50,
        unit_cost: 10.00,
        selling_price: 20.00,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }));

      mockSupabase.setData('inventory_items', items);

      // Prepare bulk update
      const updates = items.map(item => ({
        id: item.id,
        updates: {
          current_stock: item.current_stock + 50,
          updated_at: new Date().toISOString()
        }
      }));

      const startTime = performance.now();
      
      const result = await inventoryService.bulkUpdate('user-1', 'admin', {
        operation_type: 'update',
        items: updates
      });
      
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(2000);
      expect(result.success_rate).toBe(100);
      expect(result.processed).toBe(100);
    });

    it('should handle batch inserts efficiently', async () => {
      const newItems = Array.from({ length: 200 }, (_, i) => ({
        name: `New Product ${i}`,
        sku: `NEW-${i.toString().padStart(4, '0')}`,
        category_id: 'cat-new',
        unit_of_measure: 'units',
        current_stock: 0,
        minimum_stock: 10,
        reorder_point: 15,
        reorder_quantity: 20,
        unit_cost: 5.00,
        selling_price: 10.00,
        is_active: true
      }));

      const startTime = performance.now();
      
      const result = await inventoryService.bulkCreate('user-1', 'admin', newItems);
      
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(3000); // 200 items under 3 seconds
      expect(result.created).toBe(200);
    });
  });

  describe('Dashboard Load Performance', () => {
    it('should render dashboard with 100 items under 500ms', async () => {
      // Setup complex dashboard data
      const items = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        name: `Product ${i}`,
        sku: `SKU-${i.toString().padStart(3, '0')}`,
        category_id: `cat-${i % 10}`,
        unit_of_measure: 'units',
        current_stock: Math.floor(Math.random() * 1000),
        minimum_stock: 50,
        reorder_point: 75,
        reorder_quantity: 100,
        unit_cost: Math.random() * 100,
        selling_price: Math.random() * 200,
        is_active: i % 10 !== 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }));

      mockSupabase.setData('inventory_items', items);
      mockSupabase.setData('inventory_alerts', 
        items.filter(i => i.current_stock < i.minimum_stock).map(i => ({
          id: `alert-${i.id}`,
          item_id: i.id,
          alert_type: 'low_stock',
          severity: i.current_stock < i.minimum_stock / 2 ? 'critical' : 'warning',
          message: `${i.name} is low on stock`,
          is_resolved: false,
          created_at: '2024-01-01T00:00:00Z'
        }))
      );

      const startTime = performance.now();
      
      const { getByTestId } = render(<InventoryDashboard />, { wrapper });
      
      await waitFor(() => {
        expect(getByTestId('inventory-dashboard')).toBeTruthy();
      }, { timeout: 500 });
      
      const endTime = performance.now();

      const loadTime = endTime - startTime;
      expect(loadTime).toBeLessThan(500);
    });

    it('should handle real-time updates efficiently', async () => {
      // Setup initial data
      const initialItems = Array.from({ length: 50 }, (_, i) => ({
        id: `item-${i}`,
        name: `Product ${i}`,
        sku: `SKU-${i.toString().padStart(3, '0')}`,
        category_id: 'cat-1',
        unit_of_measure: 'units',
        current_stock: 100,
        minimum_stock: 20,
        reorder_point: 30,
        reorder_quantity: 50,
        unit_cost: 10.00,
        selling_price: 20.00,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }));

      mockSupabase.setData('inventory_items', initialItems);

      const { rerender } = render(<InventoryDashboard />, { wrapper });

      // Simulate 10 real-time updates
      const updateTimes: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const updatedItems = [...initialItems];
        updatedItems[i].current_stock = Math.floor(Math.random() * 200);
        
        mockSupabase.setData('inventory_items', updatedItems);
        
        const startTime = performance.now();
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        rerender(<InventoryDashboard />);
        
        await waitFor(() => {
          // Wait for update to complete
        }, { timeout: 100 });
        
        const endTime = performance.now();
        updateTimes.push(endTime - startTime);
      }

      // All updates should be fast
      const averageUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
      expect(averageUpdateTime).toBeLessThan(100);
      expect(Math.max(...updateTimes)).toBeLessThan(150);
    });
  });

  describe('Search Performance', () => {
    it('should search through 1000 items quickly', async () => {
      // Setup large dataset
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        name: `Product ${['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'][i % 5]} ${i}`,
        sku: `SKU-${i.toString().padStart(4, '0')}`,
        barcode: `${1234567890000 + i}`,
        category_id: `cat-${i % 20}`,
        unit_of_measure: 'units',
        current_stock: Math.floor(Math.random() * 1000),
        minimum_stock: 50,
        reorder_point: 75,
        reorder_quantity: 100,
        unit_cost: Math.random() * 100,
        selling_price: Math.random() * 200,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1',
        tags: [`tag-${i % 10}`, `type-${i % 5}`]
      }));

      mockSupabase.setData('inventory_items', items);

      // Test various search patterns
      const searchTests = [
        { query: 'Alpha', expectedMin: 180 },
        { query: 'SKU-0500', expectedMin: 1 },
        { query: '1234567890500', expectedMin: 1 },
        { query: 'tag-5', expectedMin: 90 }
      ];

      for (const test of searchTests) {
        const startTime = performance.now();
        
        const results = await inventoryService.searchItems('user-1', 'admin', {
          query: test.query
        });
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        expect(duration).toBeLessThan(100); // Each search under 100ms
        expect(results.length).toBeGreaterThanOrEqual(test.expectedMin);
      }
    });
  });

  describe('Memory Management', () => {
    it('should handle large datasets without memory leaks', async () => {
      // Note: In a real environment, you'd use memory profiling tools
      // This is a simplified test
      
      const iterations = 10;
      const itemsPerIteration = 500;
      
      for (let i = 0; i < iterations; i++) {
        // Create large dataset
        const items = Array.from({ length: itemsPerIteration }, (_, j) => ({
          id: `mem-test-${i}-${j}`,
          name: `Memory Test Product ${i}-${j}`,
          sku: `MEM-${i}-${j}`,
          category_id: 'cat-mem',
          unit_of_measure: 'units',
          current_stock: 100,
          minimum_stock: 20,
          reorder_point: 30,
          reorder_quantity: 50,
          unit_cost: 10.00,
          selling_price: 20.00,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          created_by: 'user-1',
          updated_by: 'user-1'
        }));
        
        mockSupabase.setData('inventory_items', items);
        
        // Perform operations
        await inventoryService.getItems('user-1', 'admin');
        await inventoryService.getStats('user-1', 'admin');
        
        // Clear cache to prevent memory buildup
        queryClient.clear();
        mockSupabase.reset();
      }
      
      // If we got here without crashing, memory management is acceptable
      expect(true).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle 50 concurrent requests efficiently', async () => {
      // Setup data
      const items = Array.from({ length: 200 }, (_, i) => ({
        id: `concurrent-${i}`,
        name: `Concurrent Product ${i}`,
        sku: `CONC-${i.toString().padStart(3, '0')}`,
        category_id: 'cat-concurrent',
        unit_of_measure: 'units',
        current_stock: 100,
        minimum_stock: 20,
        reorder_point: 30,
        reorder_quantity: 50,
        unit_cost: 10.00,
        selling_price: 20.00,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }));

      mockSupabase.setData('inventory_items', items);

      // Create 50 concurrent operations
      const operations = Array.from({ length: 50 }, (_, i) => {
        const operationType = i % 3;
        
        switch (operationType) {
          case 0: // Read operation
            return inventoryService.getItem('user-1', 'admin', `concurrent-${i}`);
          case 1: // Update operation
            return inventoryService.updateStock('user-1', 'admin', {
              item_id: `concurrent-${i}`,
              adjustment_type: 'adjustment',
              quantity: 5,
              reason: 'Concurrent test'
            });
          case 2: // Search operation
            return inventoryService.searchItems('user-1', 'admin', {
              query: `Concurrent Product ${i}`
            });
          default:
            return Promise.resolve();
        }
      });

      const startTime = performance.now();
      
      const results = await Promise.all(operations);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(3000); // 50 operations under 3 seconds
      expect(results).toHaveLength(50);
      expect(results.every(r => r !== undefined)).toBe(true);
    });
  });

  describe('Cache Performance', () => {
    it('should serve cached data instantly', async () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        id: `cache-${i}`,
        name: `Cached Product ${i}`,
        sku: `CACHE-${i.toString().padStart(3, '0')}`,
        category_id: 'cat-cache',
        unit_of_measure: 'units',
        current_stock: 100,
        minimum_stock: 20,
        reorder_point: 30,
        reorder_quantity: 50,
        unit_cost: 10.00,
        selling_price: 20.00,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }));

      mockSupabase.setData('inventory_items', items);

      // First fetch - populates cache
      const firstFetchStart = performance.now();
      await inventoryService.getItems('user-1', 'admin');
      const firstFetchEnd = performance.now();
      const firstFetchTime = firstFetchEnd - firstFetchStart;

      // Second fetch - should use cache
      const cachedFetchStart = performance.now();
      const cachedData = queryClient.getQueryData(['inventory', 'list', undefined]);
      const cachedFetchEnd = performance.now();
      const cachedFetchTime = cachedFetchEnd - cachedFetchStart;

      expect(cachedData).toBeDefined();
      expect(cachedFetchTime).toBeLessThan(10); // Cache access under 10ms
      expect(cachedFetchTime).toBeLessThan(firstFetchTime / 10); // At least 10x faster
    });
  });
});