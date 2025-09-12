// Simple database connectivity test
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔗 Testing Supabase connection...');
console.log('URL:', supabaseUrl?.substring(0, 30) + '...');
console.log('Key:', supabaseKey?.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('\n📋 Testing basic connection...');
    const { data, error } = await supabase.from('test_inventory_items').select('count').limit(1);
    
    if (error) {
      console.error('❌ Connection error:', error);
      return;
    }
    
    console.log('✅ Basic connection works');
    
    console.log('\n📊 Testing test_inventory_items table...');
    const { data: items, error: itemsError } = await supabase
      .from('test_inventory_items')
      .select('*')
      .limit(3);
    
    if (itemsError) {
      console.error('❌ Table query error:', itemsError);
      return;
    }
    
    console.log('✅ Found', items?.length || 0, 'inventory items');
    console.log('📝 Sample data:', JSON.stringify(items?.[0], null, 2));
    
    console.log('\n🔍 Testing specific test ID...');
    const { data: specificItem, error: specificError } = await supabase
      .from('test_inventory_items')
      .select('*')
      .eq('id', '11111111-1111-1111-1111-111111111111')
      .single();
    
    if (specificError) {
      console.error('❌ Specific item error:', specificError);
      return;
    }
    
    console.log('✅ Found specific test item:', JSON.stringify(specificItem, null, 2));
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testConnection();