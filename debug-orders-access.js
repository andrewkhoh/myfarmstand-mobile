/**
 * Debug Orders Access
 * Check what's blocking access to the orders table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function debugOrdersAccess() {
  console.log('🔍 Debugging Orders Table Access');
  console.log('================================');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('🔑 Available credentials:');
  console.log(`   SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`   ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   SERVICE_KEY: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`);

  // Test 1: With anon key
  console.log('\n1. 🔐 Testing with ANON key...');
  try {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error, count } = await anonClient
      .from('orders')
      .select('*', { count: 'exact' })
      .limit(1);

    if (error) {
      console.log('❌ Anon key error:', error.message);
      console.log('   Code:', error.code);
      console.log('   Details:', error.details);
    } else {
      console.log(`✅ Anon key success: ${count} total orders, retrieved ${data?.length || 0} records`);
      if (data && data.length > 0) {
        console.log('📊 Sample order structure:', Object.keys(data[0]));
      }
    }
  } catch (err) {
    console.log('❌ Anon key exception:', err.message);
  }

  // Test 2: With service key (if available)
  if (supabaseServiceKey) {
    console.log('\n2. 🔐 Testing with SERVICE key...');
    try {
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

      const { data, error, count } = await serviceClient
        .from('orders')
        .select('*', { count: 'exact' })
        .limit(5);

      if (error) {
        console.log('❌ Service key error:', error.message);
        console.log('   Code:', error.code);
        console.log('   Details:', error.details);
      } else {
        console.log(`✅ Service key success: ${count} total orders, retrieved ${data?.length || 0} records`);
        if (data && data.length > 0) {
          console.log('📊 Sample orders:');
          data.forEach((order, i) => {
            console.log(`   ${i + 1}. ID: ${order.id?.substring(0, 8)}..., Amount: $${order.total_amount}, Status: ${order.status}, Date: ${order.created_at?.split('T')[0]}`);
          });
        }
      }
    } catch (err) {
      console.log('❌ Service key exception:', err.message);
    }
  } else {
    console.log('\n2. ⚠️  No SERVICE key available - add SUPABASE_SERVICE_ROLE_KEY to .env for full access');
  }

  // Test 3: Check RLS policies
  console.log('\n3. 🛡️  Checking RLS status...');
  try {
    const client = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

    const { data: rlsData, error: rlsError } = await client
      .rpc('check_table_rls', { table_name: 'orders' })
      .single();

    if (rlsError) {
      console.log('❌ RLS check failed:', rlsError.message);
      console.log('💡 This is normal - the function might not exist');
    } else {
      console.log('✅ RLS status:', rlsData);
    }
  } catch (err) {
    console.log('⚠️  RLS check not available (this is normal)');
  }

  // Test 4: Try different query approaches
  console.log('\n4. 🔄 Trying different query approaches...');

  const client = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

  const queries = [
    {
      name: 'Simple count',
      query: () => client.from('orders').select('*', { count: 'exact', head: true })
    },
    {
      name: 'Basic select',
      query: () => client.from('orders').select('id').limit(1)
    },
    {
      name: 'Count only',
      query: () => client.from('orders').select('id', { count: 'exact', head: true })
    },
    {
      name: 'With specific columns',
      query: () => client.from('orders').select('id, total_amount, status, created_at').limit(1)
    }
  ];

  for (const test of queries) {
    try {
      const { data, error, count } = await test.query();
      if (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
      } else {
        console.log(`✅ ${test.name}: Success (count: ${count}, data: ${data?.length || 0})`);
      }
    } catch (err) {
      console.log(`❌ ${test.name}: Exception - ${err.message}`);
    }
  }

  console.log('\n📋 Summary:');
  console.log('If you see "RLS policy" errors, you need to either:');
  console.log('1. Add SUPABASE_SERVICE_ROLE_KEY to your .env file');
  console.log('2. Temporarily disable RLS on orders table');
  console.log('3. Add a policy that allows reading orders');
  console.log('4. Run this from within your authenticated app');
}

if (require.main === module) {
  debugOrdersAccess()
    .then(() => {
      console.log('\n✅ Debug completed');
    })
    .catch((error) => {
      console.error('\n❌ Debug failed:', error);
    });
}

module.exports = { debugOrdersAccess };