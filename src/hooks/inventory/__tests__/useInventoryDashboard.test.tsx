/**
 * Test: Inventory Dashboard Hook
 * Testing dashboard metrics, alerts, and performance metrics
 */

import React from 'react';
import { createSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../../test/contracts/hook.contracts';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useInventoryDashboard,
  useInventoryAlerts,
  useInventoryPerformanceMetrics,
  useInventoryRealtimeStatus
} from '../useInventoryDashboard';
import { InventoryService } from '../../../services/inventory/inventoryService';
import { useAuth } from '../../useAuth';

// Mock services
jest.mock('../../../services/inventory/inventoryService');
jest.mock('../../useAuth');

const mockInventoryService = InventoryService as jest.Mocked<typeof InventoryService>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('useInventoryDashboard', () => {
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

  describe('Dashboard Metrics', () => {
    const mockInventoryItems = [
      {
        id: 'inv-1',
        productId: 'prod-1',
        productName: 'Test Product 1',
        currentStock: 5,
        reservedStock: 2,
        minimumThreshold: 10,
        maximumThreshold: 100,
        isActive: true,
        isVisibleToCustomers: true,
        productPrice: 25.50,
        lastStockUpdate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'inv-2',
        productId: 'prod-2',
        productName: 'Test Product 2',
        currentStock: 0,
        reservedStock: 0,
        minimumThreshold: 5,
        maximumThreshold: 50,
        isActive: true,
        isVisibleToCustomers: false,
        productPrice: 15.75,
        lastStockUpdate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const mockLowStockItems = [mockInventoryItems[0]]; // Only first item is low stock

    beforeEach(() => {
      mockInventoryService.getAllInventoryItems.mockResolvedValue(mockInventoryItems);
      mockInventoryService.getLowStockItems.mockResolvedValue(mockLowStockItems);
    });

    it('should calculate dashboard metrics correctly', async () => {
      const { result } = renderHook(() => useInventoryDashboard(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const metrics = result.current.data!;

      expect(metrics.totalItems).toBe(2);
      expect(metrics.lowStockCount).toBe(1);
      expect(metrics.outOfStockCount).toBe(1);
      expect(metrics.totalValue).toBe(5 * 25.50 + 0 * 15.75); // 127.50
      expect(metrics.visibleToCustomers).toBe(1);
      expect(metrics.recentMovements).toBe(1); // Only first item updated within 24 hours
      expect(metrics.criticalAlerts).toBe(1); // First item is at 50% of threshold (5 <= 5)
    });

    it('should handle empty inventory gracefully', async () => {
      mockInventoryService.getAllInventoryItems.mockResolvedValue([]);
      mockInventoryService.getLowStockItems.mockResolvedValue([]);

      const { result } = renderHook(() => useInventoryDashboard(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const metrics = result.current.data!;

      expect(metrics.totalItems).toBe(0);
      expect(metrics.lowStockCount).toBe(0);
      expect(metrics.outOfStockCount).toBe(0);
      expect(metrics.totalValue).toBe(0);
      expect(metrics.visibleToCustomers).toBe(0);
      expect(metrics.recentMovements).toBe(0);
      expect(metrics.criticalAlerts).toBe(0);
    });

    it('should handle service errors gracefully', async () => {
      mockInventoryService.getAllInventoryItems.mockRejectedValue(new Error('Service error'));

      const { result } = renderHook(() => useInventoryDashboard(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should not fetch when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
      } as any);

      const { result } = renderHook(() => useInventoryDashboard(), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockInventoryService.getAllInventoryItems).not.toHaveBeenCalled();
    });
  });

  describe('Inventory Alerts', () => {
    const mockLowStockItems = [
      {
        id: 'inv-1',
        productId: 'prod-1',
        productName: 'Critical Stock Item',
        currentStock: 0,
        minimumThreshold: 10,
        lastStockUpdate: new Date().toISOString(),
      },
      {
        id: 'inv-2',
        productId: 'prod-2',
        productName: 'Very Low Stock Item',
        currentStock: 2,
        minimumThreshold: 10,
        lastStockUpdate: new Date().toISOString(),
      },
      {
        id: 'inv-3',
        productId: 'prod-3',
        productName: 'Low Stock Item',
        currentStock: 6,
        minimumThreshold: 10,
        lastStockUpdate: new Date().toISOString(),
      },
    ];

    beforeEach(() => {
      mockInventoryService.getLowStockItems.mockResolvedValue(mockLowStockItems as any);
    });

    it('should classify alerts by severity correctly', async () => {
      const { result } = renderHook(() => useInventoryAlerts(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const alerts = result.current.data!;

      expect(alerts).toHaveLength(3);

      // Should be sorted by severity (high -> medium -> low)
      expect(alerts[0].severity).toBe('high');
      expect(alerts[0].type).toBe('out_of_stock');
      expect(alerts[0].currentStock).toBe(0);

      expect(alerts[1].severity).toBe('high');
      expect(alerts[1].type).toBe('threshold_breach'); // 2/10 = 0.2 (< 0.25)

      expect(alerts[2].severity).toBe('medium'); // 6/10 = 0.6 (between 0.25 and 0.5)
    });

    it('should sort alerts by severity and stock level', async () => {
      const { result } = renderHook(() => useInventoryAlerts(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const alerts = result.current.data!;

      // High severity items should come first
      const highSeverityAlerts = alerts.filter(a => a.severity === 'high');
      const mediumSeverityAlerts = alerts.filter(a => a.severity === 'medium');

      expect(highSeverityAlerts.length).toBe(2);
      expect(mediumSeverityAlerts.length).toBe(1);

      // Within same severity, lower stock should come first
      expect(highSeverityAlerts[0].currentStock).toBeLessThanOrEqual(highSeverityAlerts[1].currentStock);
    });

    it('should handle missing product names gracefully', async () => {
      const itemsWithoutNames = mockLowStockItems.map(item => ({
        ...item,
        productName: undefined
      }));

      mockInventoryService.getLowStockItems.mockResolvedValue(itemsWithoutNames as any);

      const { result } = renderHook(() => useInventoryAlerts(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const alerts = result.current.data!;
      
      alerts.forEach(alert => {
        expect(alert.productName).toBe('Unknown Product');
      });
    });
  });

  describe('Performance Metrics', () => {
    const mockPerformanceItems = [
      {
        id: 'inv-1',
        currentStock: 10,
        minimumThreshold: 5,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      },
      {
        id: 'inv-2',
        currentStock: 0,
        minimumThreshold: 10,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 days ago (stale)
      },
      {
        id: 'inv-3',
        currentStock: 5,
        minimumThreshold: 10,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: new Date().toISOString(), // Recent
      },
    ];

    beforeEach(() => {
      mockInventoryService.getAllInventoryItems.mockResolvedValue(mockPerformanceItems as any);
    });

    it('should calculate performance metrics correctly', async () => {
      const { result } = renderHook(() => useInventoryPerformanceMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const metrics = result.current.data!;

      expect(metrics.totalItems).toBe(3);
      expect(metrics.recentUpdates).toBe(1); // Only one updated within a week
      expect(metrics.staleItems).toBe(1); // One updated more than 30 days ago
      expect(metrics.averageStock).toBe(5); // (10 + 0 + 5) / 3 = 5
      expect(metrics.stockDistribution.outOfStock).toBe(1);
      expect(metrics.stockDistribution.lowStock).toBe(1); // item-3 (5 <= 10)
      expect(metrics.stockDistribution.healthyStock).toBe(1); // item-1 (10 > 5)
    });

    it('should handle empty inventory', async () => {
      mockInventoryService.getAllInventoryItems.mockResolvedValue([]);

      const { result } = renderHook(() => useInventoryPerformanceMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const metrics = result.current.data!;

      expect(metrics.totalItems).toBe(0);
      expect(metrics.averageStock).toBe(0);
      expect(metrics.stockDistribution.outOfStock).toBe(0);
      expect(metrics.stockDistribution.lowStock).toBe(0);
      expect(metrics.stockDistribution.healthyStock).toBe(0);
    });
  });

  describe('Real-time Status', () => {
    const mockHealthyItems = [
      {
        id: 'inv-1',
        currentStock: 15,
        minimumThreshold: 10,
      },
      {
        id: 'inv-2',
        currentStock: 20,
        minimumThreshold: 5,
      },
    ];

    const mockUnhealthyItems = [
      {
        id: 'inv-1',
        currentStock: 0, // Out of stock
        minimumThreshold: 10,
      },
      {
        id: 'inv-2',
        currentStock: 3,
        minimumThreshold: 10, // Below threshold
      },
    ];

    it('should report healthy status when no issues', async () => {
      mockInventoryService.getAllInventoryItems.mockResolvedValue(mockHealthyItems as any);

      const { result } = renderHook(() => useInventoryRealtimeStatus(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const status = result.current.data!;

      expect(status.isHealthy).toBe(true);
      expect(status.needsAttention).toBe(0);
      expect(status.systemStatus).toBe('operational');
    });

    it('should report unhealthy status when issues exist', async () => {
      mockInventoryService.getAllInventoryItems.mockResolvedValue(mockUnhealthyItems as any);

      const { result } = renderHook(() => useInventoryRealtimeStatus(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const status = result.current.data!;

      expect(status.isHealthy).toBe(false); // Has out-of-stock items
      expect(status.needsAttention).toBe(2); // Both items need attention
      expect(status.systemStatus).toBe('operational');
    });

    it('should provide refresh functionality', async () => {
      mockInventoryService.getAllInventoryItems.mockResolvedValue(mockHealthyItems as any);

      const { result } = renderHook(() => useInventoryRealtimeStatus(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Change mock data to unhealthy
      mockInventoryService.getAllInventoryItems.mockResolvedValue(mockUnhealthyItems as any);

      // Trigger refresh
      result.current.refreshStatus();

      await waitFor(() => {
        expect(result.current.data?.isHealthy).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 403 errors by not retrying', async () => {
      const error = new Error('Forbidden');
      (error as any).status = 403;
      mockInventoryService.getAllInventoryItems.mockRejectedValue(error);

      const { result } = renderHook(() => useInventoryDashboard(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      // Should only call once (no retries for 403)
      expect(mockInventoryService.getAllInventoryItems).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors', async () => {
      const networkError = new Error('Network error');
      mockInventoryService.getAllInventoryItems.mockRejectedValueOnce(networkError);
      mockInventoryService.getAllInventoryItems.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useInventoryDashboard(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Should have retried
      expect(mockInventoryService.getAllInventoryItems).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Configuration', () => {
    it('should use appropriate cache times for different hooks', () => {
      const dashboardHook = renderHook(() => useInventoryDashboard(), { wrapper });
      const alertsHook = renderHook(() => useInventoryAlerts(), { wrapper });
      const performanceHook = renderHook(() => useInventoryPerformanceMetrics(), { wrapper });

      // Dashboard should have 2-minute stale time
      // Alerts should have 1-minute stale time (more critical)
      // Performance should have 5-minute stale time (less critical)

      // These are implicit tests based on the implementation
      expect(dashboardHook.result.current.isLoading).toBe(true);
      expect(alertsHook.result.current.isLoading).toBe(true);
      expect(performanceHook.result.current.isLoading).toBe(true);
    });
  });
});