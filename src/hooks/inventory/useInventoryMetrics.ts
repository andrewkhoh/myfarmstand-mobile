import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import { useEffect, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { InventoryService } from '../../services/inventory/inventoryService';
import { StockMovementService } from '../../services/inventory/stockMovementService';
import {
  InventoryMetricsSchema,
  type InventoryMetrics
} from '../../utils/inventoryValidation';
import { errorCoordinator } from '../../services/cross-workflow/errorCoordinator';

export const useInventoryMetrics = () => {
  const [user, setUser] = useState<User | null>(null);

  // Initialize services
  const inventoryService = useMemo(() => new InventoryService(supabase), []);
  const stockMovementService = useMemo(() => new StockMovementService(supabase), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  return useQuery({
    queryKey: [...inventoryKeys.lists(user?.id || ''), 'metrics'],
    queryFn: async (): Promise<InventoryMetrics> => {
      try {
        // Fetch inventory items through service layer with validation
        const items = await inventoryService.getInventoryItems(user?.id);

        // Items are already validated by the service
        const totalItems = items.length;
        const totalValue = items.reduce((sum, item) =>
          sum + (item.currentStock * item.unitCost), 0);

        // Count low and out of stock using validated data
        const lowStockCount = items.filter(item =>
          item.currentStock <= item.minimumStock && item.currentStock > 0
        ).length;

        const outOfStockCount = items.filter(item =>
          item.currentStock === 0
        ).length;

        // Group by warehouse (mock data for now)
        const warehouseDistribution = [
          {
            warehouseId: 'wh1',
            warehouseName: 'Main Warehouse',
            itemCount: Math.floor(totalItems * 0.4),
            totalValue: totalValue * 0.4
          },
          {
            warehouseId: 'wh2',
            warehouseName: 'North Branch',
            itemCount: Math.floor(totalItems * 0.25),
            totalValue: totalValue * 0.25
          },
          {
            warehouseId: 'wh3',
            warehouseName: 'South Branch',
            itemCount: Math.floor(totalItems * 0.2),
            totalValue: totalValue * 0.2
          },
          {
            warehouseId: 'wh4',
            warehouseName: 'Distribution Center',
            itemCount: Math.floor(totalItems * 0.15),
            totalValue: totalValue * 0.15
          }
        ];

        // Category breakdown (mock data)
        const categoryBreakdown = [
          {
            category: 'Produce',
            itemCount: 45,
            currentStock: 450,
            minimumStock: 200,
            maximumStock: 800
          },
          {
            category: 'Dairy',
            itemCount: 30,
            currentStock: 120,
            minimumStock: 150,
            maximumStock: 500
          },
          {
            category: 'Meat & Poultry',
            itemCount: 25,
            currentStock: 280,
            minimumStock: 100,
            maximumStock: 400
          },
          {
            category: 'Bakery',
            itemCount: 20,
            currentStock: 75,
            minimumStock: 50,
            maximumStock: 200
          }
        ];

        // Fetch recent movements through service layer with validation
        const movements = await stockMovementService.getMovementHistory(10);

        // Transform validated movements
        const recentMovements = movements.map(movement => ({
          id: movement.id,
          itemName: `Item ${movement.inventoryItemId.substring(0, 8)}`,
          movementType: movement.movementType,
          quantity: movement.quantity,
          timestamp: movement.createdAt
        }));

        // Construct and validate the metrics object
        const metrics: InventoryMetrics = {
          totalItems,
          totalValue,
          lowStockCount,
          outOfStockCount,
          warehouseDistribution,
          categoryBreakdown,
          recentMovements
        };

        // Validate the final metrics object
        const validatedMetrics = InventoryMetricsSchema.parse(metrics);

        ValidationMonitor.recordPatternSuccess({
          pattern: 'statistical_calculation',
          context: 'inventory-metrics'
        });

        return validatedMetrics;
      } catch (error) {
        // Log error through error coordinator
        await errorCoordinator.handleError({
          workflow: 'inventory',
          operation: 'calculateMetrics',
          errorType: error instanceof Error && error.message.includes('validation') ? 'validation' : 'business',
          severity: 'medium',
          message: error instanceof Error ? error.message : 'Failed to calculate inventory metrics',
          context: { userId: user?.id },
          timestamp: new Date()
        });

        ValidationMonitor.recordValidationError({
          context: 'inventory-metrics',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          validationPattern: 'statistical_calculation'
        });

        // Return default metrics on error (already validated structure)
        return InventoryMetricsSchema.parse({
          totalItems: 0,
          totalValue: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
          warehouseDistribution: [],
          categoryBreakdown: [],
          recentMovements: []
        });
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!user?.id
  });
};