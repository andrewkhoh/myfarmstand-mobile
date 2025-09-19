import { SupabaseClient } from '@supabase/supabase-js';
import { ValidationMonitor } from '../../utils/validationMonitorAdapter';
import type { MarketingCampaign } from '../../types/marketing.types';
import type { InventoryItem } from '../../schemas/inventory';

export interface InventoryAvailability {
  productId: string;
  productName: string;
  availableStock: number;
  projectedStock: number;
  warehouseId: string;
  isAvailable: boolean;
  warnings: string[];
}

export interface CampaignValidationResult {
  isValid: boolean;
  conflicts: CampaignConflict[];
  inventoryIssues: InventoryIssue[];
  warnings: string[];
}

export interface CampaignConflict {
  campaignId: string;
  campaignName: string;
  conflictType: 'overlap' | 'inventory' | 'audience';
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface InventoryIssue {
  productId: string;
  productName: string;
  issue: 'out_of_stock' | 'low_stock' | 'reserved';
  currentStock: number;
  requiredStock: number;
  shortfall: number;
}

export class InventoryMarketingBridge {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Validate campaign scheduling against inventory availability
   */
  async validateCampaignInventory(
    campaignId: string,
    productIds: string[],
    startDate: Date,
    endDate: Date,
    expectedDemandMultiplier: number = 1.5
  ): Promise<CampaignValidationResult> {
    try {
      const inventoryIssues: InventoryIssue[] = [];
      const warnings: string[] = [];

      // Get inventory data for products
      const { data: inventoryItems, error: inventoryError } = await this.supabase
        .from('inventory_items')
        .select('*, products!inner(id, name)')
        .in('product_id', productIds)
        .eq('is_active', true);

      if (inventoryError) {
        ValidationMonitor.recordValidationError('campaign-inventory-check', inventoryError);
        throw inventoryError;
      }

      // Check each product's availability
      for (const productId of productIds) {
        const productInventory = inventoryItems?.filter(item => item.product_id === productId) || [];

        if (productInventory.length === 0) {
          inventoryIssues.push({
            productId,
            productName: 'Unknown Product',
            issue: 'out_of_stock',
            currentStock: 0,
            requiredStock: 1,
            shortfall: 1
          });
          continue;
        }

        // Calculate total available stock across all warehouses
        const totalAvailable = productInventory.reduce((sum, item) =>
          sum + (item.current_stock - item.reserved_stock), 0
        );

        // Get average daily sales for demand projection
        const dailySalesAvg = await this.getAverageDailySales(productId, 30);
        const campaignDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const projectedDemand = dailySalesAvg * campaignDays * expectedDemandMultiplier;

        // Check if we have enough stock
        if (totalAvailable < projectedDemand) {
          const productName = productInventory[0]?.products?.name || 'Unknown Product';

          if (totalAvailable === 0) {
            inventoryIssues.push({
              productId,
              productName,
              issue: 'out_of_stock',
              currentStock: totalAvailable,
              requiredStock: Math.ceil(projectedDemand),
              shortfall: Math.ceil(projectedDemand)
            });
          } else if (totalAvailable < projectedDemand * 0.5) {
            inventoryIssues.push({
              productId,
              productName,
              issue: 'low_stock',
              currentStock: totalAvailable,
              requiredStock: Math.ceil(projectedDemand),
              shortfall: Math.ceil(projectedDemand - totalAvailable)
            });
          } else {
            warnings.push(`Product ${productName} has marginal stock for campaign demand`);
          }
        }

        // Check for reserved stock conflicts
        const totalReserved = productInventory.reduce((sum, item) => sum + item.reserved_stock, 0);
        if (totalReserved > totalAvailable * 0.3) {
          warnings.push(`Product ${productInventory[0]?.products?.name} has high reserved stock (${totalReserved} units)`);
        }
      }

      // Check for conflicting campaigns
      const conflicts = await this.checkCampaignConflicts(campaignId, productIds, startDate, endDate);

      ValidationMonitor.recordPatternSuccess('campaign-inventory-validation');

      return {
        isValid: inventoryIssues.length === 0 && conflicts.filter(c => c.severity === 'high').length === 0,
        conflicts,
        inventoryIssues,
        warnings
      };
    } catch (error) {
      ValidationMonitor.recordValidationError('campaign-inventory-validation', error);
      throw error;
    }
  }

  /**
   * Check for conflicting campaigns in the same period
   */
  async checkCampaignConflicts(
    campaignId: string,
    productIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<CampaignConflict[]> {
    try {
      const conflicts: CampaignConflict[] = [];

      // Get overlapping campaigns
      const { data: overlappingCampaigns, error } = await this.supabase
        .from('marketing_campaigns')
        .select('id, campaign_name, start_date, end_date, campaign_status')
        .neq('id', campaignId)
        .in('campaign_status', ['active', 'scheduled'])
        .or(`start_date.lte.${endDate.toISOString()},end_date.gte.${startDate.toISOString()}`);

      if (error) {
        ValidationMonitor.recordValidationError('campaign-conflict-check', error);
        throw error;
      }

      // Check each overlapping campaign for product conflicts
      for (const campaign of overlappingCampaigns || []) {
        // Get products for overlapping campaign
        const { data: campaignProducts } = await this.supabase
          .from('campaign_products')
          .select('product_id')
          .eq('campaign_id', campaign.id);

        const overlappingProducts = campaignProducts?.filter(cp =>
          productIds.includes(cp.product_id)
        ) || [];

        if (overlappingProducts.length > 0) {
          conflicts.push({
            campaignId: campaign.id,
            campaignName: campaign.campaign_name,
            conflictType: 'overlap',
            description: `Campaign overlaps with ${overlappingProducts.length} products`,
            severity: campaign.campaign_status === 'active' ? 'high' : 'medium'
          });
        }
      }

      return conflicts;
    } catch (error) {
      ValidationMonitor.recordValidationError('campaign-conflict-check', error);
      throw error;
    }
  }

  /**
   * Reserve inventory for a campaign
   */
  async reserveInventoryForCampaign(
    campaignId: string,
    productReservations: Array<{ productId: string; quantity: number }>
  ): Promise<boolean> {
    try {
      const reservationResults = [];

      for (const reservation of productReservations) {
        // Get available inventory
        const { data: inventoryItems, error } = await this.supabase
          .from('inventory_items')
          .select('*')
          .eq('product_id', reservation.productId)
          .eq('is_active', true)
          .order('current_stock', { ascending: false });

        if (error) {
          ValidationMonitor.recordValidationError('inventory-reservation', error);
          continue;
        }

        let remainingToReserve = reservation.quantity;

        // Reserve from warehouses with most stock first
        for (const item of inventoryItems || []) {
          if (remainingToReserve <= 0) break;

          const availableToReserve = Math.min(
            item.current_stock - item.reserved_stock,
            remainingToReserve
          );

          if (availableToReserve > 0) {
            const { error: updateError } = await this.supabase
              .from('inventory_items')
              .update({
                reserved_stock: item.reserved_stock + availableToReserve
              })
              .eq('id', item.id);

            if (!updateError) {
              remainingToReserve -= availableToReserve;

              // Create reservation record
              await this.supabase
                .from('inventory_reservations')
                .insert({
                  inventory_item_id: item.id,
                  campaign_id: campaignId,
                  quantity: availableToReserve,
                  reserved_at: new Date().toISOString()
                });
            }
          }
        }

        reservationResults.push({
          productId: reservation.productId,
          requested: reservation.quantity,
          reserved: reservation.quantity - remainingToReserve
        });
      }

      ValidationMonitor.recordPatternSuccess('inventory-reservation');
      return reservationResults.every(r => r.reserved === r.requested);
    } catch (error) {
      ValidationMonitor.recordValidationError('inventory-reservation', error);
      throw error;
    }
  }

  /**
   * Release inventory reservations for a campaign
   */
  async releaseInventoryForCampaign(campaignId: string): Promise<void> {
    try {
      // Get all reservations for the campaign
      const { data: reservations, error } = await this.supabase
        .from('inventory_reservations')
        .select('*')
        .eq('campaign_id', campaignId);

      if (error) {
        ValidationMonitor.recordValidationError('inventory-release', error);
        throw error;
      }

      // Release each reservation
      for (const reservation of reservations || []) {
        // Update inventory item
        const { data: item } = await this.supabase
          .from('inventory_items')
          .select('reserved_stock')
          .eq('id', reservation.inventory_item_id)
          .single();

        if (item) {
          await this.supabase
            .from('inventory_items')
            .update({
              reserved_stock: Math.max(0, item.reserved_stock - reservation.quantity)
            })
            .eq('id', reservation.inventory_item_id);
        }

        // Delete reservation record
        await this.supabase
          .from('inventory_reservations')
          .delete()
          .eq('id', reservation.id);
      }

      ValidationMonitor.recordPatternSuccess('inventory-release');
    } catch (error) {
      ValidationMonitor.recordValidationError('inventory-release', error);
      throw error;
    }
  }

  /**
   * Get average daily sales for demand projection
   */
  private async getAverageDailySales(productId: string, days: number): Promise<number> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get stock movements for the product
      const { data: movements, error } = await this.supabase
        .from('stock_movements')
        .select('quantity')
        .eq('movement_type', 'sale')
        .gte('performed_at', startDate.toISOString())
        .in('inventory_item_id',
          this.supabase
            .from('inventory_items')
            .select('id')
            .eq('product_id', productId)
        );

      if (error || !movements) {
        return 10; // Default estimate if no data
      }

      const totalSales = movements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
      return totalSales / days;
    } catch (error) {
      return 10; // Default estimate on error
    }
  }

  /**
   * Sync inventory changes to marketing campaigns
   */
  async syncInventoryToMarketing(inventoryUpdate: {
    productId: string;
    warehouseId: string;
    newStock: number;
    changeType: 'increase' | 'decrease';
  }): Promise<void> {
    try {
      // Find affected active campaigns
      const { data: affectedCampaigns } = await this.supabase
        .from('campaign_products')
        .select('campaign_id, marketing_campaigns!inner(id, campaign_name, campaign_status)')
        .eq('product_id', inventoryUpdate.productId)
        .eq('marketing_campaigns.campaign_status', 'active');

      if (!affectedCampaigns || affectedCampaigns.length === 0) {
        return;
      }

      // Check if stock decrease affects campaigns
      if (inventoryUpdate.changeType === 'decrease' && inventoryUpdate.newStock < 10) {
        // Create alerts for affected campaigns
        for (const campaign of affectedCampaigns) {
          await this.supabase
            .from('campaign_alerts')
            .insert({
              campaign_id: campaign.campaign_id,
              alert_type: 'low_inventory',
              message: `Low inventory for product in campaign ${campaign.marketing_campaigns?.campaign_name}`,
              severity: inventoryUpdate.newStock === 0 ? 'critical' : 'warning',
              created_at: new Date().toISOString()
            });
        }
      }

      ValidationMonitor.recordPatternSuccess('inventory-marketing-sync');
    } catch (error) {
      ValidationMonitor.recordValidationError('inventory-marketing-sync', error);
      // Don't throw - this is a background sync
    }
  }

  /**
   * Get inventory status for campaign products
   */
  async getCampaignInventoryStatus(campaignId: string): Promise<InventoryAvailability[]> {
    try {
      // Get campaign products
      const { data: campaignProducts } = await this.supabase
        .from('campaign_products')
        .select('product_id')
        .eq('campaign_id', campaignId);

      if (!campaignProducts || campaignProducts.length === 0) {
        return [];
      }

      const productIds = campaignProducts.map(cp => cp.product_id);
      const availabilityStatus: InventoryAvailability[] = [];

      for (const productId of productIds) {
        // Get inventory for product
        const { data: inventory } = await this.supabase
          .from('inventory_items')
          .select('*, products!inner(name)')
          .eq('product_id', productId)
          .eq('is_active', true);

        if (!inventory || inventory.length === 0) {
          availabilityStatus.push({
            productId,
            productName: 'Unknown Product',
            availableStock: 0,
            projectedStock: 0,
            warehouseId: '',
            isAvailable: false,
            warnings: ['Product not found in inventory']
          });
          continue;
        }

        // Aggregate across warehouses
        const totalStock = inventory.reduce((sum, item) => sum + item.current_stock, 0);
        const totalReserved = inventory.reduce((sum, item) => sum + item.reserved_stock, 0);
        const availableStock = totalStock - totalReserved;

        const warnings: string[] = [];
        if (availableStock < 100) warnings.push('Low stock levels');
        if (totalReserved > totalStock * 0.5) warnings.push('High reservation ratio');

        availabilityStatus.push({
          productId,
          productName: inventory[0].products?.name || 'Unknown Product',
          availableStock,
          projectedStock: availableStock * 0.8, // Conservative projection
          warehouseId: inventory[0].warehouse_id,
          isAvailable: availableStock > 0,
          warnings
        });
      }

      return availabilityStatus;
    } catch (error) {
      ValidationMonitor.recordValidationError('campaign-inventory-status', error);
      throw error;
    }
  }
}

export const inventoryMarketingBridge = (supabase: SupabaseClient) =>
  new InventoryMarketingBridge(supabase);