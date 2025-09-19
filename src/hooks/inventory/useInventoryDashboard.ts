import { useQuery } from '@tanstack/react-query';
import { InventoryService } from '../../services/inventory/inventoryService';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import { useCurrentUser } from '../useAuth';
import { supabase } from '../../config/supabase';
import type { InventoryDashboard, InventoryError } from '../../types/inventory';

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

export function useInventoryDashboard() {
  const { data: user } = useCurrentUser();
  const userId = user?.id;

  // Graceful degradation for unauthenticated users
  if (!userId) {
    const authError = createInventoryError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated',
      'Please sign in to view your inventory dashboard'
    );

    const emptyDashboard: InventoryDashboard = {
      totalItems: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      totalValue: 0,
      recentMovements: [],
      alerts: []
    };

    return {
      data: emptyDashboard,
      isLoading: false,
      isError: true,
      error: authError,
      refetch: () => Promise.resolve({ data: emptyDashboard } as any),
    };
  }

  return useQuery({
    queryKey: inventoryKeys.dashboard(userId),
    queryFn: async (): Promise<InventoryDashboard> => {
      try {
        const service = new InventoryService(supabase);

        // Fetch all required data in parallel
        const [items, lowStock, movements, alerts] = await Promise.all([
          service.getInventoryItems(userId),
          service.getLowStockItems(userId),
          service.getRecentMovements(userId),
          service.getAlerts(userId)
        ]);

        // Calculate metrics
        const totalItems = items.length;
        const lowStockCount = lowStock.length;
        const outOfStockCount = items.filter(item => item.currentStock === 0).length;
        const totalValue = items.reduce(
          (sum, item) => sum + (item.currentStock * item.unitCost),
          0
        );

        return {
          totalItems,
          lowStockCount,
          outOfStockCount,
          totalValue,
          recentMovements: movements,
          alerts
        };
      } catch (error) {
        console.error('Failed to load inventory dashboard:', error);
        // Return empty dashboard instead of crashing UI
        return {
          totalItems: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
          totalValue: 0,
          recentMovements: [],
          alerts: []
        };
      }
    },
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}