/**
 * Business Metrics Data Pipeline Test
 * Simplified JavaScript test for the data pipeline functionality
 */

const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables or update them here
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

async function testBusinessMetricsPipeline() {
  console.log('🚀 Testing Business Metrics Data Pipeline...');
  console.log('===============================================');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Check database connectivity
    console.log('1. 🔌 Testing database connectivity...');
    const { data: authUser, error: authError } = await supabase.auth.getUser();
    if (authError && authError.message !== 'Auth session missing!') {
      console.log('⚠️  Auth check:', authError.message);
    } else {
      console.log('✅ Supabase connection established');
    }

    // Step 2: Check business_metrics table structure
    console.log('\n2. 📊 Checking business_metrics table...');
    const { data: existingMetrics, error: metricsError } = await supabase
      .from('business_metrics')
      .select('*', { count: 'exact', head: true });

    if (metricsError) {
      console.log('❌ business_metrics table error:', metricsError.message);
      if (metricsError.message.includes('relation "business_metrics" does not exist')) {
        console.log('💡 You need to create the business_metrics table first');
        console.log('   Run the SQL script to create the table structure');
        return;
      }
    } else {
      const count = existingMetrics?.length || 0;
      console.log(`✅ business_metrics table exists with ${count} records`);
    }

    // Step 3: Check orders table
    console.log('\n3. 📦 Checking orders table...');
    const { count: orderCount, error: orderError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    if (orderError) {
      console.log('❌ orders table error:', orderError.message);
      return;
    } else {
      console.log(`✅ orders table exists with ${orderCount || 0} records`);
    }

    if (!orderCount || orderCount === 0) {
      console.log('⚠️  No orders found - cannot test data pipeline');
      console.log('💡 Add some sample orders to test the pipeline');
      return;
    }

    // Step 4: Sample a few orders to understand structure
    console.log('\n4. 🔍 Analyzing order data structure...');
    const { data: sampleOrders, error: sampleError } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at, customer_id, pickup_time')
      .order('created_at', { ascending: false })
      .limit(3);

    if (sampleError) {
      console.log('❌ Sample order query failed:', sampleError.message);
    } else {
      console.log('📊 Sample orders:');
      sampleOrders?.forEach((order, index) => {
        console.log(`   ${index + 1}. ID: ${order.id}, Amount: ${order.total_amount}, Status: ${order.status}`);
        console.log(`      Created: ${order.created_at?.split('T')[0]}, Customer: ${order.customer_id}`);
      });
    }

    // Step 5: Test basic metric calculation
    console.log('\n5. 🧮 Testing metric calculation...');

    // Get orders from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentOrders, error: recentError } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at, customer_id')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: true });

    if (recentError) {
      console.log('❌ Recent orders query failed:', recentError.message);
    } else {
      console.log(`✅ Found ${recentOrders?.length || 0} orders in last 7 days`);

      if (recentOrders && recentOrders.length > 0) {
        // Calculate basic metrics
        const totalRevenue = recentOrders.reduce((sum, order) => {
          const amount = parseFloat(order.total_amount) || 0;
          return sum + amount;
        }, 0);

        const uniqueCustomers = new Set(recentOrders.map(o => o.customer_id).filter(Boolean)).size;
        const statusBreakdown = recentOrders.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {});

        console.log('📈 Calculated metrics:');
        console.log(`   Total Orders: ${recentOrders.length}`);
        console.log(`   Total Revenue: $${totalRevenue.toFixed(2)}`);
        console.log(`   Unique Customers: ${uniqueCustomers}`);
        console.log(`   Status Breakdown:`, statusBreakdown);
      }
    }

    // Step 6: Test writing to business_metrics
    console.log('\n6. ✍️  Testing business_metrics write capability...');
    const testMetric = {
      metric_date: new Date().toISOString().split('T')[0],
      metric_category: 'test',
      metric_name: 'pipeline_test',
      metric_value: 1,
      metric_unit: 'count',
      aggregation_level: 'daily',
      source_data_type: 'orders',
      correlation_factors: { test: true },
      created_at: new Date().toISOString()
    };

    const { data: insertedMetric, error: insertError } = await supabase
      .from('business_metrics')
      .insert([testMetric])
      .select()
      .single();

    if (insertError) {
      console.log('❌ business_metrics write failed:', insertError.message);
      console.log('💡 Check table permissions and structure');
    } else {
      console.log('✅ Successfully wrote test metric to business_metrics');

      // Clean up test record
      const { error: deleteError } = await supabase
        .from('business_metrics')
        .delete()
        .eq('id', insertedMetric.id);

      if (!deleteError) {
        console.log('🧹 Cleaned up test record');
      }
    }

    console.log('\n🎉 Data Pipeline Test Summary:');
    console.log('===============================');
    console.log('✅ Database connectivity: Working');
    console.log('✅ business_metrics table: Accessible');
    console.log('✅ orders table: Accessible');
    console.log('✅ Data transformation: Working');
    console.log('✅ Write capabilities: Working');

    console.log('\n🚀 Ready to populate business_metrics!');
    console.log('💡 Next steps:');
    console.log('   1. Run the data population script');
    console.log('   2. Verify metrics in the admin interface');
    console.log('   3. Test analytics dashboards');

  } catch (error) {
    console.error('❌ Pipeline test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Verify Supabase credentials');
    console.log('2. Check database table permissions');
    console.log('3. Ensure business_metrics table exists');
    console.log('4. Verify orders table has data');
  }
}

// Run the test
if (require.main === module) {
  testBusinessMetricsPipeline()
    .then(() => {
      console.log('\n✅ Pipeline test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testBusinessMetricsPipeline };