// Test data insertion and RLS policies
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDataOperations() {
  try {
    console.log('🔍 Testing data operations...\n');
    
    // Test 1: Check if tables exist and are accessible
    console.log('1️⃣ Testing table access...');
    const { data: userRoles, error: userRolesError } = await supabase
      .from('test_user_roles')
      .select('*');
    
    console.log(`test_user_roles: ${userRolesError ? 'Error - ' + userRolesError.message : 'OK - ' + (userRoles?.length || 0) + ' rows'}`);
    
    const { data: inventory, error: inventoryError } = await supabase
      .from('test_inventory_items')
      .select('*');
    
    console.log(`test_inventory_items: ${inventoryError ? 'Error - ' + inventoryError.message : 'OK - ' + (inventory?.length || 0) + ' rows'}`);
    
    const { data: movements, error: movementsError } = await supabase
      .from('test_stock_movements')
      .select('*');
    
    console.log(`test_stock_movements: ${movementsError ? 'Error - ' + movementsError.message : 'OK - ' + (movements?.length || 0) + ' rows'}`);
    
    // Test 2: Try inserting test data if tables are empty
    if (inventory?.length === 0) {
      console.log('\n2️⃣ Tables are empty, trying to insert test data...');
      
      // Insert a test inventory item
      const { data: insertResult, error: insertError } = await supabase
        .from('test_inventory_items')
        .insert({
          id: '11111111-1111-1111-1111-111111111111',
          product_id: '22222222-2222-2222-2222-222222222222',
          current_stock: 100,
          reserved_stock: 10,
          minimum_threshold: 15,
          maximum_threshold: 500,
          is_active: true,
          is_visible_to_customers: true
        })
        .select();
      
      if (insertError) {
        console.log('❌ Insert failed:', insertError.message);
        console.log('   Details:', insertError);
        
        // Check if it's an RLS issue
        if (insertError.message.includes('policy')) {
          console.log('🔒 This looks like a Row Level Security (RLS) policy issue');
          console.log('   The test tables have RLS enabled but we\'re not authenticated as a user with the right role');
        }
      } else {
        console.log('✅ Insert successful:', insertResult);
      }
    } else {
      console.log('\n2️⃣ Tables have data, showing sample:');
      console.log('First inventory item:', JSON.stringify(inventory[0], null, 2));
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testDataOperations();