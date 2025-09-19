import { useEffect, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useInventoryRealtime } from './inventory/useInventoryRealtime';
import { useMarketingRealtime } from './marketing/useMarketingRealtime';
import { useRealtime } from './useRealtime';
import { useCurrentUser } from './useAuth';
import { supabase } from '../config/supabase';
import { ValidationMonitor } from '../utils/validationMonitor';

export interface RealtimeStatus {
  inventory: boolean;
  marketing: boolean;
  orders: boolean;
  general: boolean;
  overall: boolean;
}

export interface OrderMetricsRealtime {
  totalOrders: number;
  totalRevenue: number;
  ordersToday: number;
  revenueToday: number;
  averageOrderValue: number;
  pendingOrders: number;
  processingOrders: number;
  readyOrders: number;
  completedToday: number;
  lastOrderTime?: Date;
  lastRefresh?: Date;
}

export interface RealtimeMetrics {
  connectedSince?: Date;
  messagesReceived: number;
  lastActivity?: Date;
  subscriptions: string[];
  orderMetrics?: OrderMetricsRealtime;
}

/**
 * Unified real-time coordinator that manages all real-time subscriptions
 * across inventory, marketing, and general features
 */
export function useUnifiedRealtime() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    messagesReceived: 0,
    subscriptions: [],
  });
  const [orderMetricsEnabled, setOrderMetricsEnabled] = useState(false);

  // Individual real-time hooks
  const inventoryRealtime = useInventoryRealtime();
  const { isEnabled: marketingEnabled } = useMarketingRealtime();
  const { isEnabled: generalEnabled } = useRealtime();

  // Compute overall status
  const status: RealtimeStatus = {
    inventory: inventoryRealtime.isEnabled,
    marketing: marketingEnabled,
    orders: orderMetricsEnabled,
    general: generalEnabled,
    overall: inventoryRealtime.isEnabled || marketingEnabled || generalEnabled || orderMetricsEnabled,
  };

  // Auto-enable order metrics for authorized users
  useEffect(() => {
    if (user?.id) {
      setOrderMetricsEnabled(true);
    } else {
      setOrderMetricsEnabled(false);
    }
  }, [user?.id]);

  // Fetch order metrics following monitoring patterns
  const fetchOrderMetrics = useCallback(async (): Promise<OrderMetricsRealtime | null> => {
    if (!user?.id) return null;

    try {
      const startTime = Date.now();
      const today = new Date().toISOString().split('T')[0];

      // Get all orders with resilient processing
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'useUnifiedRealtime.fetchOrderMetrics',
          errorCode: 'ORDER_METRICS_FETCH_FAILED',
          validationPattern: 'direct_supabase_query',
          errorMessage: error.message
        });
        return null;
      }

      // Calculate metrics with null-safe processing
      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      const todayOrders = orders?.filter(order =>
        order.created_at?.startsWith(today)
      ) || [];

      const ordersToday = todayOrders.length;
      const revenueToday = todayOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Status-based counts
      const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
      const processingOrders = orders?.filter(o => o.status === 'processing').length || 0;
      const readyOrders = orders?.filter(o => o.status === 'ready').length || 0;
      const completedToday = todayOrders.filter(o => o.status === 'completed').length;

      // Find most recent order
      const lastOrderTime = orders && orders.length > 0
        ? new Date(orders[0].created_at)
        : undefined;

      ValidationMonitor.recordPatternSuccess({
        service: 'useUnifiedRealtime',
        pattern: 'direct_supabase_query',
        operation: 'fetchOrderMetrics',
        performanceMs: Date.now() - startTime
      });

      return {
        totalOrders,
        totalRevenue,
        ordersToday,
        revenueToday,
        averageOrderValue,
        pendingOrders,
        processingOrders,
        readyOrders,
        completedToday,
        lastOrderTime,
        lastRefresh: new Date()
      };

    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'useUnifiedRealtime.fetchOrderMetrics',
        errorCode: 'ORDER_METRICS_PROCESSING_FAILED',
        validationPattern: 'resilient_processing',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }, [user?.id]);

  // Initial order metrics fetch and periodic updates
  useEffect(() => {
    if (!orderMetricsEnabled) return;

    let isMounted = true;

    const updateOrderMetrics = async () => {
      const orderMetrics = await fetchOrderMetrics();
      if (isMounted && orderMetrics) {
        setMetrics(prev => ({
          ...prev,
          orderMetrics
        }));
      }
    };

    // Initial fetch
    updateOrderMetrics();

    // Set up periodic updates every 30 seconds
    const interval = setInterval(updateOrderMetrics, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [orderMetricsEnabled, fetchOrderMetrics]);

  // Set up real-time subscription for order changes
  useEffect(() => {
    if (!orderMetricsEnabled || !user?.id) return;

    const channel = supabase
      .channel('order_metrics_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          console.log('📊 Order metrics change detected:', payload);

          // Refresh order metrics when orders change
          const orderMetrics = await fetchOrderMetrics();
          if (orderMetrics) {
            setMetrics(prev => ({
              ...prev,
              orderMetrics,
              messagesReceived: prev.messagesReceived + 1,
              lastActivity: new Date()
            }));
          }

          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['business-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['order-analytics'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderMetricsEnabled, user?.id, fetchOrderMetrics, queryClient]);

  // Track connection metrics
  useEffect(() => {
    if (status.overall && !metrics.connectedSince) {
      setMetrics(prev => ({
        ...prev,
        connectedSince: new Date(),
        subscriptions: [
          ...(status.inventory ? ['inventory'] : []),
          ...(status.marketing ? ['marketing'] : []),
          ...(status.orders ? ['orders'] : []),
          ...(status.general ? ['general'] : []),
        ],
      }));
    } else if (!status.overall && metrics.connectedSince) {
      setMetrics(prev => ({
        ...prev,
        connectedSince: undefined,
        subscriptions: [],
      }));
    }
  }, [status.overall, metrics.connectedSince]);

  // Unified refresh function that invalidates all relevant queries
  const refreshAllData = useCallback(async () => {
    if (!user?.id) return;

    console.log('🔄 Unified real-time refresh triggered');

    const promises = [];

    // Inventory queries
    if (status.inventory) {
      promises.push(
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['stock'] }),
        queryClient.invalidateQueries({ queryKey: ['alerts'] })
      );
    }

    // Marketing queries
    if (status.marketing) {
      promises.push(
        queryClient.invalidateQueries({ queryKey: ['marketing'] }),
        queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
        queryClient.invalidateQueries({ queryKey: ['content'] })
      );
    }

    // Order analytics queries
    if (status.orders) {
      promises.push(
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['business-metrics'] }),
        queryClient.invalidateQueries({ queryKey: ['order-analytics'] }),
        queryClient.invalidateQueries({ queryKey: ['marketing-analytics'] })
      );

      // Also refresh order metrics
      const orderMetrics = await fetchOrderMetrics();
      if (orderMetrics) {
        setMetrics(prev => ({
          ...prev,
          orderMetrics
        }));
      }
    }

    // General queries
    if (status.general) {
      promises.push(
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      );
    }

    await Promise.all(promises);

    setMetrics(prev => ({
      ...prev,
      lastActivity: new Date(),
      messagesReceived: prev.messagesReceived + 1,
    }));

    console.log('✅ Unified real-time refresh completed');
  }, [user?.id, status, queryClient, fetchOrderMetrics]);

  // Connection health check
  const isHealthy = useCallback(() => {
    if (!status.overall) return true; // Not connected is considered "healthy"

    const timeSinceLastActivity = metrics.lastActivity
      ? Date.now() - metrics.lastActivity.getTime()
      : Infinity;

    // Consider unhealthy if no activity for 5 minutes
    return timeSinceLastActivity < 5 * 60 * 1000;
  }, [status.overall, metrics.lastActivity]);

  // Manual reconnection
  const reconnect = useCallback(() => {
    console.log('🔌 Manual real-time reconnection triggered');
    // Force refresh all subscriptions by invalidating everything
    queryClient.invalidateQueries();
    refreshAllData();
  }, [queryClient, refreshAllData]);

  // Get connection quality indicator
  const getConnectionQuality = useCallback(() => {
    if (!status.overall) return 'disconnected';
    if (!isHealthy()) return 'poor';
    if (metrics.messagesReceived > 10) return 'excellent';
    if (metrics.messagesReceived > 5) return 'good';
    return 'fair';
  }, [status.overall, isHealthy, metrics.messagesReceived]);

  return {
    // Status information
    status,
    isConnected: status.overall,
    isHealthy: isHealthy(),
    quality: getConnectionQuality(),

    // Metrics
    metrics,

    // Individual system status
    inventory: {
      enabled: status.inventory,
      userId: inventoryRealtime.userId,
    },
    marketing: {
      enabled: status.marketing,
    },
    orders: {
      enabled: status.orders,
      metrics: metrics.orderMetrics,
      lastRefresh: metrics.orderMetrics?.lastRefresh,
    },
    general: {
      enabled: status.general,
    },

    // Control functions
    refreshAll: refreshAllData,
    refreshOrderMetrics: fetchOrderMetrics,
    reconnect,

    // User info
    userId: user?.id,
  };
}

/**
 * Hook for displaying real-time status in UI components
 */
export function useRealtimeStatusDisplay() {
  const realtime = useUnifiedRealtime();

  const getStatusColor = useCallback(() => {
    if (!realtime.isConnected) return '#9E9E9E'; // Gray
    if (!realtime.isHealthy) return '#FF9800'; // Orange
    return '#4CAF50'; // Green
  }, [realtime.isConnected, realtime.isHealthy]);

  const getStatusText = useCallback(() => {
    if (!realtime.isConnected) return 'Disconnected';
    if (!realtime.isHealthy) return 'Connection Issues';
    return `Connected (${realtime.quality})`;
  }, [realtime.isConnected, realtime.isHealthy, realtime.quality]);

  const getDetailedStatus = useCallback(() => {
    const parts = [];
    if (realtime.status.inventory) parts.push('Inventory');
    if (realtime.status.marketing) parts.push('Marketing');
    if (realtime.status.orders) parts.push('Order Analytics');
    if (realtime.status.general) parts.push('General');

    if (parts.length === 0) return 'No real-time features active';
    return `Active: ${parts.join(', ')}`;
  }, [realtime.status]);

  return {
    color: getStatusColor(),
    text: getStatusText(),
    details: getDetailedStatus(),
    isConnected: realtime.isConnected,
    quality: realtime.quality,
    metrics: realtime.metrics,
    reconnect: realtime.reconnect,
  };
}