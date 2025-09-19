/**
 * Warehouse constants for single-location farm stand operation
 *
 * This provides a default warehouse ID that's automatically used
 * throughout the inventory system, eliminating the need for
 * warehouse management UI while maintaining the underlying
 * multi-warehouse architecture.
 */

export const STOCK_ROOM_ID = '00000000-0000-0000-0000-000000000001';
export const FARMSTAND_ID = '00000000-0000-0000-0000-000000000002';

export const WAREHOUSE_CONFIG = {
  // Two-location mode: Stock Room (default) and Farmstand
  STOCK_ROOM: {
    id: STOCK_ROOM_ID,
    name: 'Stock Room',
    description: 'Back storage area for produce inventory'
  },
  FARMSTAND: {
    id: FARMSTAND_ID,
    name: 'Farmstand',
    description: 'Customer-facing display area for produce sales'
  }
};

/**
 * Get the warehouse ID to use for inventory operations
 * Defaults to Stock Room if no warehouse specified
 */
export function getWarehouseId(providedWarehouseId?: string): string {
  return providedWarehouseId || STOCK_ROOM_ID;
}

/**
 * Get warehouse info by ID
 */
export function getWarehouseInfo(warehouseId: string) {
  if (warehouseId === STOCK_ROOM_ID) return WAREHOUSE_CONFIG.STOCK_ROOM;
  if (warehouseId === FARMSTAND_ID) return WAREHOUSE_CONFIG.FARMSTAND;
  return null;
}

/**
 * Transfer produce from stock room to farmstand
 */
export function getTransferRoute() {
  return {
    from: WAREHOUSE_CONFIG.STOCK_ROOM,
    to: WAREHOUSE_CONFIG.FARMSTAND
  };
}