/**
 * Inventory Dashboard Hook
 * Provides comprehensive dashboard metrics and alerts for inventory management
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { InventoryService } from '../../services/inventory/inventoryService';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import { useAuth } from '../useAuth';
import type { InventoryItemTransform } from '../../schemas/inventory';

export interface InventoryDashboardMetrics {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
  visibleToCustomers: number;
  recentMovements: number;
  criticalAlerts: number;
}

export interface DashboardAlert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'threshold_breach';
  productName: string;
  currentStock: number;
  threshold: number;
  severity: 'high' | 'medium' | 'low';
  createdAt: string;
}

/**
 * Main dashboard metrics aggregation
 */
export function useInventoryDashboard() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: inventoryKeys.dashboard(user?.id),
    queryFn: async () => {
      const [items, lowStockItems] = await Promise.all([
        InventoryService.getAllInventoryItems(),
        InventoryService.getLowStockItems()
      ]);

      const metrics: InventoryDashboardMetrics = {
        totalItems: items.length,
        lowStockCount: lowStockItems.length,
        outOfStockCount: items.filter(item => item.currentStock === 0).length,
        totalValue: items.reduce((sum, item) => sum + (item.currentStock * (item.productPrice || 0)), 0),
        visibleToCustomers: items.filter(item => item.isVisibleToCustomers).length,
        recentMovements: items.filter(item => {
          if (!item.lastStockUpdate) return false;
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return new Date(item.lastStockUpdate) > oneDayAgo;
        }).length,
        criticalAlerts: lowStockItems.filter(item => 
          item.currentStock <= (item.minimumThreshold || 10) * 0.5
        ).length
      };

      return metrics;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes - dashboard needs fresh data
    gcTime: 1000 * 60 * 10,   // 10 minutes
    enabled: !!user?.id,
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status === 403 || status === 401) return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

/**
 * Low stock alerts with severity classification
 */
export function useInventoryAlerts() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: inventoryKeys.alerts(user?.id),
    queryFn: async () => {
      const lowStockItems = await InventoryService.getLowStockItems();
      
      const alerts: DashboardAlert[] = lowStockItems.map(item => {
        const threshold = item.minimumThreshold || 10;
        const ratio = item.currentStock / threshold;
        
        let severity: 'high' | 'medium' | 'low' = 'low';
        let type: 'low_stock' | 'out_of_stock' | 'threshold_breach' = 'low_stock';
        
        if (item.currentStock === 0) {
          severity = 'high';
          type = 'out_of_stock';
        } else if (ratio <= 0.25) {
          severity = 'high';
          type = 'threshold_breach';
        } else if (ratio <= 0.5) {
          severity = 'medium';
        }

        return {
          id: item.id,
          type,
          productName: item.productName || 'Unknown Product',
          currentStock: item.currentStock,
          threshold,
          severity,
          createdAt: item.lastStockUpdate || new Date().toISOString()
        };
      });

      // Sort by severity and stock level
      return alerts.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        const aSeverity = severityOrder[a.severity];
        const bSeverity = severityOrder[b.severity];
        
        if (aSeverity !== bSeverity) return bSeverity - aSeverity;
        return a.currentStock - b.currentStock;
      });
    },
    staleTime: 1000 * 60 * 1, // 1 minute - alerts need to be very fresh
    gcTime: 1000 * 60 * 5,    // 5 minutes
    enabled: !!user?.id,
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status === 403 || status === 401) return false;
      }
      return failureCount < 3; // More retries for critical alerts
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 1.5 ** attemptIndex, 8000),
  });
}

/**
 * Performance metrics for inventory operations
 */
export function useInventoryPerformanceMetrics() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: inventoryKeys.performanceMetrics(user?.id),
    queryFn: async () => {
      // Get items and calculate performance metrics
      const items = await InventoryService.getAllInventoryItems();
      
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const recentUpdates = items.filter(item => 
        item.lastStockUpdate && new Date(item.lastStockUpdate) > oneWeekAgo
      ).length;
      
      const staleItems = items.filter(item => 
        !item.lastStockUpdate || new Date(item.lastStockUpdate) < oneMonthAgo
      ).length;

      const averageStock = items.length > 0 
        ? items.reduce((sum, item) => sum + item.currentStock, 0) / items.length 
        : 0;

      const stockDistribution = {
        outOfStock: items.filter(item => item.currentStock === 0).length,
        lowStock: items.filter(item => item.currentStock > 0 && item.currentStock <= (item.minimumThreshold || 10)).length,
        healthyStock: items.filter(item => item.currentStock > (item.minimumThreshold || 10)).length
      };

      return {
        totalItems: items.length,
        recentUpdates,
        staleItems,
        averageStock: Math.round(averageStock * 100) / 100,
        stockDistribution,
        lastUpdated: now.toISOString()
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - performance metrics don't change as rapidly
    gcTime: 1000 * 60 * 15,   // 15 minutes
    enabled: !!user?.id,
    retry: (failureCount) => failureCount < 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
  });
}

/**
 * Real-time inventory status for dashboard widgets
 */
export function useInventoryRealtimeStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: inventoryKeys.realtimeStatus(user?.id),
    queryFn: async () => {
      const items = await InventoryService.getAllInventoryItems();
      
      // Calculate real-time status indicators
      const status = {
        isHealthy: items.filter(item => item.currentStock === 0).length === 0,
        needsAttention: items.filter(item => 
          item.currentStock <= (item.minimumThreshold || 10)
        ).length,
        lastSync: new Date().toISOString(),
        systemStatus: 'operational' as const
      };

      return status;
    },
    staleTime: 1000 * 30, // 30 seconds - real-time needs frequent updates
    gcTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!user?.id,
    refetchInterval: 1000 * 60 * 2, // Auto-refresh every 2 minutes
    refetchIntervalInBackground: false,
  });

  // Provide manual refresh capability for real-time updates
  const refreshStatus = () => {
    queryClient.invalidateQueries({ queryKey: inventoryKeys.realtimeStatus(user?.id) });
    queryClient.invalidateQueries({ queryKey: inventoryKeys.dashboard(user?.id) });
    queryClient.invalidateQueries({ queryKey: inventoryKeys.alerts(user?.id) });
  };

  return {
    ...query,
    refreshStatus
  };
}