/**
 * Direct Data Pipeline Test
 * Uses the project's existing configuration and simulates the data pipeline
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Use environment variables directly
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function testDataPipelineDirectly() {
  console.log('🔬 Direct Data Pipeline Test');
  console.log('============================');

  // Check configuration
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Missing Supabase configuration');
    console.log('   SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('   SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
    return;
  }

  console.log('✅ Supabase configuration loaded');
  console.log(`📡 URL: ${supabaseUrl.substring(0, 30)}...`);

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client created');

    // Test 1: Simple query to check connectivity
    console.log('\n1. 🔍 Testing basic connectivity...');

    try {
      // Try a simple query first
      const { data, error } = await supabase
        .from('orders')
        .select('count', { count: 'exact', head: true });

      if (error) {
        console.log('❌ Database query error:', error.message);
        console.log('   Code:', error.code);
        console.log('   Details:', error.details);
        return;
      }

      console.log('✅ Database connection successful');
      console.log(`📊 Orders table accessible with ${data?.length || 0} records`);

    } catch (queryError) {
      console.log('❌ Query failed:', queryError.message);
      return;
    }

    // Test 2: Check if business_metrics table exists
    console.log('\n2. 📊 Checking business_metrics table...');

    try {
      const { data: metricsData, error: metricsError } = await supabase
        .from('business_metrics')
        .select('count', { count: 'exact', head: true });

      if (metricsError) {
        if (metricsError.message.includes('does not exist')) {
          console.log('⚠️  business_metrics table does not exist');
          console.log('💡 You need to create the table first with the SQL schema');
          return;
        } else {
          console.log('❌ business_metrics table error:', metricsError.message);
          return;
        }
      }

      console.log('✅ business_metrics table exists');

    } catch (metricsError) {
      console.log('❌ business_metrics check failed:', metricsError.message);
      return;
    }

    // Test 3: Simulate business metrics calculation
    console.log('\n3. 🧮 Simulating business metrics calculation...');

    // Get sample order data
    const { data: sampleOrders, error: orderError } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at, user_id as customer_id')
      .limit(10);

    if (orderError) {
      console.log('❌ Failed to fetch sample orders:', orderError.message);
      return;
    }

    if (!sampleOrders || sampleOrders.length === 0) {
      console.log('⚠️  No orders found in database');
      console.log('💡 Add some sample orders to test the pipeline');
      return;
    }

    console.log(`✅ Retrieved ${sampleOrders.length} sample orders`);

    // Calculate sample metrics
    const totalRevenue = sampleOrders.reduce((sum, order) => {
      const amount = parseFloat(order.total_amount) || 0;
      return sum + amount;
    }, 0);

    const uniqueCustomers = new Set(sampleOrders.map(o => o.customer_id).filter(Boolean)).size;

    const statusBreakdown = sampleOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    console.log('📈 Sample metrics calculated:');
    console.log(`   Total Orders: ${sampleOrders.length}`);
    console.log(`   Total Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`   Unique Customers: ${uniqueCustomers}`);
    console.log(`   Status Breakdown:`, statusBreakdown);

    // Test 4: Create sample business metric
    console.log('\n4. ✍️  Testing business metric creation...');

    const sampleMetric = {
      metric_date: new Date().toISOString().split('T')[0],
      metric_category: 'orders',
      metric_name: 'total_orders',
      metric_value: sampleOrders.length,
      metric_unit: 'count',
      aggregation_level: 'daily',
      source_data_type: 'orders',
      correlation_factors: {
        total_revenue: totalRevenue,
        unique_customers: uniqueCustomers,
        status_breakdown: statusBreakdown
      },
      created_at: new Date().toISOString()
    };

    const { data: insertedMetric, error: insertError } = await supabase
      .from('business_metrics')
      .insert([sampleMetric])
      .select()
      .single();

    if (insertError) {
      console.log('❌ Failed to insert business metric:', insertError.message);
      console.log('   Code:', insertError.code);
      return;
    }

    console.log('✅ Successfully created business metric');
    console.log(`📊 Metric ID: ${insertedMetric.id}`);

    // Clean up
    await supabase
      .from('business_metrics')
      .delete()
      .eq('id', insertedMetric.id);
    console.log('🧹 Cleaned up test metric');

    // Success summary
    console.log('\n🎉 Data Pipeline Test Results:');
    console.log('==============================');
    console.log('✅ Supabase connectivity: WORKING');
    console.log('✅ Orders table access: WORKING');
    console.log('✅ business_metrics table: WORKING');
    console.log('✅ Metric calculation: WORKING');
    console.log('✅ Metric insertion: WORKING');
    console.log('\n🚀 The data pipeline is ready for full initialization!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('\n🔧 Troubleshooting suggestions:');
    console.log('1. Check internet connectivity');
    console.log('2. Verify Supabase project is active');
    console.log('3. Check database permissions');
    console.log('4. Ensure business_metrics table exists');
  }
}

// Run the test
if (require.main === module) {
  testDataPipelineDirectly()
    .then(() => {
      console.log('\n✅ Direct pipeline test completed');
    })
    .catch((error) => {
      console.error('\n❌ Test script failed:', error);
    });
}

module.exports = { testDataPipelineDirectly };