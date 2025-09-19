/**
 * Generate test data for inventory alerts and stock movements
 */

import { supabase } from '../config/supabase';

export async function generateInventoryTestData(userId: string) {
  try {
    console.log('Starting to generate inventory test data...');

    // Step 1: Get inventory items for the user
    const { data: inventoryItems, error: itemsError } = await supabase
      .from('inventory_items')
      .select('id, product_id, warehouse_id, current_stock, minimum_stock, maximum_stock')
      .eq('user_id', userId)
      .limit(5);

    if (itemsError) {
      console.error('Error fetching inventory items:', itemsError);
      return { success: false, error: itemsError };
    }

    if (!inventoryItems || inventoryItems.length === 0) {
      console.log('No inventory items found for user. Creating sample items...');

      // Create sample inventory items first
      const sampleItems = [
        {
          user_id: userId,
          product_id: 'sample-product-1',
          warehouse_id: 'warehouse-1',
          current_stock: 5,
          reserved_stock: 0,
          minimum_stock: 10,
          maximum_stock: 100,
          reorder_point: 15,
          reorder_quantity: 50,
          unit_cost: 10.00,
          is_active: true
        },
        {
          user_id: userId,
          product_id: 'sample-product-2',
          warehouse_id: 'warehouse-1',
          current_stock: 150,
          reserved_stock: 20,
          minimum_stock: 50,
          maximum_stock: 200,
          reorder_point: 75,
          reorder_quantity: 100,
          unit_cost: 25.00,
          is_active: true
        },
        {
          user_id: userId,
          product_id: 'sample-product-3',
          warehouse_id: 'warehouse-2',
          current_stock: 0,
          reserved_stock: 0,
          minimum_stock: 20,
          maximum_stock: 150,
          reorder_point: 30,
          reorder_quantity: 75,
          unit_cost: 15.00,
          is_active: true
        }
      ];

      const { data: createdItems, error: createError } = await supabase
        .from('inventory_items')
        .insert(sampleItems)
        .select();

      if (createError) {
        console.error('Error creating sample inventory items:', createError);
        return { success: false, error: createError };
      }

      inventoryItems.push(...(createdItems || []));
    }

    // Step 2: Generate alerts for low stock and out of stock items
    const alerts = [];
    const now = new Date().toISOString();

    for (const item of inventoryItems) {
      if (item.current_stock === 0) {
        // Out of stock alert
        alerts.push({
          inventory_item_id: item.id,
          alert_type: 'out_of_stock',
          severity: 'critical',
          message: `Product ${item.product_id} is out of stock`,
          threshold_value: item.minimum_stock,
          current_value: item.current_stock,
          acknowledged: false,
          created_at: now,
          user_id: userId
        });
      } else if (item.current_stock <= item.minimum_stock) {
        // Low stock alert
        alerts.push({
          inventory_item_id: item.id,
          alert_type: 'low_stock',
          severity: 'warning',
          message: `Product ${item.product_id} is running low (${item.current_stock} units remaining)`,
          threshold_value: item.minimum_stock,
          current_value: item.current_stock,
          acknowledged: false,
          created_at: now,
          user_id: userId
        });
      } else if (item.current_stock >= item.maximum_stock * 0.9) {
        // Overstock warning
        alerts.push({
          inventory_item_id: item.id,
          alert_type: 'overstock',
          severity: 'info',
          message: `Product ${item.product_id} is near maximum capacity`,
          threshold_value: item.maximum_stock,
          current_value: item.current_stock,
          acknowledged: false,
          created_at: now,
          user_id: userId
        });
      }
    }

    if (alerts.length > 0) {
      const { error: alertError } = await supabase
        .from('inventory_alerts')
        .insert(alerts);

      if (alertError) {
        console.error('Error creating alerts:', alertError);
      } else {
        console.log(`Created ${alerts.length} inventory alerts`);
      }
    }

    // Step 3: Generate stock movement history
    const movements = [];
    const movementTypes = ['restock', 'sale', 'adjustment', 'reservation', 'release'];
    const reasons = [
      'Customer purchase',
      'Supplier delivery',
      'Inventory count adjustment',
      'Reserved for order',
      'Released from reservation',
      'Damaged goods',
      'Return to supplier'
    ];

    for (const item of inventoryItems.slice(0, 3)) {
      // Generate 5 random movements per item
      let currentStock = item.current_stock;

      for (let i = 0; i < 5; i++) {
        const movementType = movementTypes[Math.floor(Math.random() * movementTypes.length)];
        const isIncrease = movementType === 'restock' || movementType === 'release';
        const quantityChange = isIncrease
          ? Math.floor(Math.random() * 50) + 10
          : -Math.floor(Math.random() * 20) - 1;

        const previousStock = currentStock;
        currentStock = Math.max(0, currentStock + quantityChange);

        movements.push({
          inventory_item_id: item.id,
          movement_type: movementType,
          quantity: quantityChange, // Changed from quantity_change
          stock_before: previousStock, // Changed from previous_stock
          stock_after: currentStock, // Changed from new_stock
          reason: reasons[Math.floor(Math.random() * reasons.length)],
          performed_by: userId,
          created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Random time in last 7 days
          user_id: userId
        });
      }
    }

    if (movements.length > 0) {
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert(movements);

      if (movementError) {
        console.error('Error creating stock movements:', movementError);
      } else {
        console.log(`Created ${movements.length} stock movements`);
      }
    }

    return {
      success: true,
      data: {
        alertsCreated: alerts.length,
        movementsCreated: movements.length,
        itemsCreated: inventoryItems.length
      }
    };

  } catch (error) {
    console.error('Error generating test data:', error);
    return { success: false, error };
  }
}

// Export a function to run from console or a button
export async function runInventoryTestDataGeneration() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('No authenticated user found');
    return;
  }

  const result = await generateInventoryTestData(user.id);
  console.log('Test data generation result:', result);
  return result;
}