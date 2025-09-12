import { useQuery } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { InventoryService } from '../../services/inventory/inventoryService';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import type { InventoryDashboard } from '../../types/inventory';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || 'https://example.supabase.co',
  process.env.REACT_APP_SUPABASE_ANON_KEY || 'example-key'
);

export function useInventoryDashboard() {
  return useQuery({
    queryKey: ['inventory', 'dashboard'],
    queryFn: async (): Promise<InventoryDashboard> => {
      const service = new InventoryService(supabase);
      
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'test-user-id';
      
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
        (sum, item) => sum + (item.currentStock * item.unitPrice),
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
    },
    staleTime: 60 * 1000, // 1 minute
  });
}