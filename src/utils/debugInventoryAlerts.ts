/**
 * Debug script to check inventory items and potential alerts
 */

import { supabase } from '../config/supabase';

export async function debugInventoryAlerts() {
  try {
    console.log('=== DEBUG: Inventory Alerts ===');

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user');
      return;
    }

    console.log('User ID:', user.id);

    // Check inventory items
    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching inventory items:', error);
      return;
    }

    console.log(`Found ${items?.length || 0} inventory items`);

    if (!items || items.length === 0) {
      console.log('No inventory items found. Need to find existing products first...');

      // First, get some existing products from the database
      const { data: products, error: productError } = await supabase
        .from('products')
        .select('id, name')
        .limit(4);

      if (productError || !products || products.length === 0) {
        console.error('No products found. Creating test products first...');

        // Create test products if none exist
        const testProducts = [
          { name: 'Test Product 1', description: 'Out of stock test', price: 10.00, category: 'test', user_id: user.id },
          { name: 'Test Product 2', description: 'Low stock test', price: 25.00, category: 'test', user_id: user.id },
          { name: 'Test Product 3', description: 'Overstock test', price: 15.00, category: 'test', user_id: user.id },
          { name: 'Test Product 4', description: 'Normal stock test', price: 20.00, category: 'test', user_id: user.id }
        ];

        const { data: createdProducts, error: createProductError } = await supabase
          .from('products')
          .insert(testProducts)
          .select('id, name');

        if (createProductError) {
          console.error('Error creating products:', createProductError);
          return;
        }

        products.push(...(createdProducts || []));
      }

      console.log(`Found/created ${products.length} products to use for inventory items`);

      // Generate UUID-like warehouse IDs
      const generateId = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const warehouseId1 = generateId();
      const warehouseId2 = generateId();

      console.log('Generated warehouse IDs:', { warehouseId1, warehouseId2 });

      // Create sample inventory items with different stock levels using actual product IDs
      const sampleItems = [
        {
          user_id: user.id,
          product_id: products[0]?.id,
          warehouse_id: warehouseId1,
          current_stock: 0,  // Out of stock - should trigger critical alert
          reserved_stock: 0,
          minimum_stock: 10,
          maximum_stock: 100,
          reorder_point: 15,
          reorder_quantity: 50,
          unit_cost: 10.00,
          is_active: true
        },
        {
          user_id: user.id,
          product_id: products[1]?.id,
          warehouse_id: warehouseId1,
          current_stock: 5,  // Below minimum - should trigger warning alert
          reserved_stock: 0,
          minimum_stock: 20,
          maximum_stock: 200,
          reorder_point: 30,
          reorder_quantity: 100,
          unit_cost: 25.00,
          is_active: true
        },
        {
          user_id: user.id,
          product_id: products[2]?.id,
          warehouse_id: warehouseId1,
          current_stock: 180,  // Near maximum - should trigger info alert
          reserved_stock: 0,
          minimum_stock: 20,
          maximum_stock: 200,
          reorder_point: 30,
          reorder_quantity: 100,
          unit_cost: 15.00,
          is_active: true
        },
        {
          user_id: user.id,
          product_id: products[3]?.id,
          warehouse_id: warehouseId2,
          current_stock: 50,  // Normal stock level
          reserved_stock: 5,
          minimum_stock: 10,
          maximum_stock: 100,
          reorder_point: 20,
          reorder_quantity: 40,
          unit_cost: 20.00,
          is_active: true
        }
      ].filter(item => item.product_id); // Only include items with valid product IDs

      console.log('Sample items to insert:', sampleItems.length);
      console.log('First item example:', JSON.stringify(sampleItems[0], null, 2));

      const { data: created, error: createError } = await supabase
        .from('inventory_items')
        .insert(sampleItems)
        .select();

      if (createError) {
        console.error('Error creating sample items:', createError);
        return;
      }

      console.log(`Created ${created?.length || 0} sample inventory items`);

      // Create stock movements for the new items
      if (created && created.length > 0) {
        const movements = [];
        const movementTypes = ['restock', 'sale', 'adjustment', 'transfer'];
        const reasons = [
          'Initial stock',
          'Customer purchase',
          'Supplier delivery',
          'Inventory count adjustment',
          'Transfer between warehouses'
        ];

        for (const item of created) {
          // Create 3 movements per item
          let currentStock = item.current_stock;

          for (let i = 0; i < 3; i++) {
            const movementType = movementTypes[Math.floor(Math.random() * movementTypes.length)];
            const isIncrease = movementType === 'restock';
            const quantityChange = isIncrease
              ? Math.floor(Math.random() * 20) + 5
              : -Math.floor(Math.random() * 10) - 1;

            const stockBefore = currentStock;
            const stockAfter = Math.max(0, currentStock + quantityChange);

            movements.push({
              inventory_item_id: item.id,
              movement_type: movementType,
              quantity: Math.abs(quantityChange),
              stock_before: stockBefore,
              stock_after: stockAfter,
              reason: reasons[Math.floor(Math.random() * reasons.length)],
              performed_by: user.id,
              created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
              user_id: user.id
            });

            currentStock = stockAfter;
          }
        }

        console.log(`Creating ${movements.length} stock movements...`);
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert(movements);

        if (movementError) {
          console.error('Error creating stock movements:', movementError);
        } else {
          console.log(`Created ${movements.length} stock movements`);
        }
      }

      items.push(...(created || []));
    }

    // Analyze items for potential alerts
    console.log('\n=== Analyzing Items for Alerts ===');
    for (const item of items) {
      console.log(`\nItem: ${item.product_id} (${item.warehouse_id})`);
      console.log(`  Current Stock: ${item.current_stock}`);
      console.log(`  Minimum Stock: ${item.minimum_stock}`);
      console.log(`  Maximum Stock: ${item.maximum_stock}`);
      console.log(`  Reorder Point: ${item.reorder_point}`);
      console.log(`  Is Active: ${item.is_active}`);

      // Check alert conditions
      if (item.is_active) {
        if (item.current_stock === 0) {
          console.log('  ⚠️ CRITICAL: Out of stock!');
        } else if (item.current_stock <= item.minimum_stock) {
          console.log('  ⚠️ WARNING: Low stock!');
        } else if (item.reorder_point && item.current_stock <= item.reorder_point) {
          console.log('  ℹ️ INFO: At reorder point');
        } else if (item.maximum_stock && item.current_stock >= item.maximum_stock * 0.9) {
          console.log('  ℹ️ INFO: Near maximum capacity');
        } else {
          console.log('  ✅ Stock level OK');
        }
      } else {
        console.log('  ⏸️ Item is inactive');
      }
    }

    return items;
  } catch (error) {
    console.error('Debug error:', error);
  }
}

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).debugInventoryAlerts = debugInventoryAlerts;
}