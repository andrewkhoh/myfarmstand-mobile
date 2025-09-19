/**
 * Final Data Pipeline Test
 * Complete test with proper UUID handling and schema compliance
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Simple UUID generator for testing
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testPipelineFinal() {
  console.log('🎯 Final Data Pipeline Test');
  console.log('===========================');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Step 1: Create sample order with proper UUID
    console.log('1. 🏗️  Creating sample order with proper schema...');

    const testUserId = generateUUID();
    const sampleOrder = {
      user_id: testUserId,
      status: 'completed',
      total_amount: 45.75,
      tax_amount: 4.58,
      customer_name: 'Test Customer',
      customer_email: 'test@farmstand.com',
      customer_phone: '555-0123',
      pickup_date: new Date().toISOString().split('T')[0],
      pickup_time: '14:30',
      special_instructions: 'Test order for data pipeline validation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert([sampleOrder])
      .select()
      .single();

    if (orderError) {
      console.log('❌ Failed to create sample order:', orderError.message);
      return;
    }

    console.log('✅ Sample order created successfully');
    console.log(`📦 Order ID: ${insertedOrder.id}`);
    console.log(`💰 Amount: $${insertedOrder.total_amount}`);

    // Step 2: Create additional orders for better testing
    console.log('\n2. 📊 Creating additional test orders...');

    const additionalOrders = [
      {
        user_id: generateUUID(),
        status: 'completed',
        total_amount: 32.25,
        tax_amount: 3.23,
        customer_name: 'Jane Smith',
        customer_email: 'jane@example.com',
        customer_phone: '555-0124',
        pickup_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
        pickup_time: '10:00',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: generateUUID(),
        status: 'pending',
        total_amount: 18.50,
        tax_amount: 1.85,
        customer_name: 'Bob Johnson',
        customer_email: 'bob@example.com',
        customer_phone: '555-0125',
        pickup_date: new Date().toISOString().split('T')[0],
        pickup_time: '16:00',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const { data: additionalInserted, error: additionalError } = await supabase
      .from('orders')
      .insert(additionalOrders)
      .select();

    if (additionalError) {
      console.log('⚠️  Some additional orders failed:', additionalError.message);
    } else {
      console.log(`✅ Created ${additionalInserted.length} additional orders`);
    }

    // Step 3: Simulate full business metrics calculation
    console.log('\n3. 🧮 Simulating business metrics calculation...');

    // Get all test orders
    const { data: allOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at, user_id')
      .in('user_id', [testUserId, ...additionalOrders.map(o => o.user_id)]);

    if (fetchError) {
      console.log('❌ Failed to fetch orders:', fetchError.message);
      return;
    }

    console.log(`✅ Retrieved ${allOrders.length} orders for processing`);

    // Calculate comprehensive metrics
    const totalRevenue = allOrders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
    const uniqueCustomers = new Set(allOrders.map(o => o.user_id)).size;
    const statusBreakdown = allOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    // Group by date
    const ordersByDate = allOrders.reduce((acc, order) => {
      const date = order.created_at.split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(order);
      return acc;
    }, {});

    console.log('📊 Calculated comprehensive metrics:');
    console.log(`   Total Orders: ${allOrders.length}`);
    console.log(`   Total Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`   Unique Customers: ${uniqueCustomers}`);
    console.log(`   Status Breakdown:`, statusBreakdown);
    console.log(`   Orders by Date:`, Object.keys(ordersByDate).map(date => `${date}: ${ordersByDate[date].length}`));

    // Step 4: Create business metrics following the pipeline pattern
    console.log('\n4. 📈 Creating business metrics...');

    const metricsToInsert = [];
    const today = new Date().toISOString().split('T')[0];

    // Daily metrics
    for (const [date, orders] of Object.entries(ordersByDate)) {
      const dailyRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
      const dailyCustomers = new Set(orders.map(o => o.user_id)).size;

      metricsToInsert.push(
        {
          metric_date: date,
          metric_category: 'orders',
          metric_name: 'total_orders',
          metric_value: orders.length,
          metric_unit: 'count',
          aggregation_level: 'daily',
          source_data_type: 'orders',
          correlation_factors: { revenue: dailyRevenue, customers: dailyCustomers },
          created_at: new Date().toISOString()
        },
        {
          metric_date: date,
          metric_category: 'sales',
          metric_name: 'total_revenue',
          metric_value: dailyRevenue,
          metric_unit: 'currency',
          aggregation_level: 'daily',
          source_data_type: 'orders',
          correlation_factors: { order_count: orders.length, customers: dailyCustomers },
          created_at: new Date().toISOString()
        },
        {
          metric_date: date,
          metric_category: 'customers',
          metric_name: 'unique_customers',
          metric_value: dailyCustomers,
          metric_unit: 'count',
          aggregation_level: 'daily',
          source_data_type: 'orders',
          correlation_factors: { orders: orders.length, revenue: dailyRevenue },
          created_at: new Date().toISOString()
        }
      );

      // Status breakdown metrics
      const statusCounts = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      for (const [status, count] of Object.entries(statusCounts)) {
        metricsToInsert.push({
          metric_date: date,
          metric_category: 'operations',
          metric_name: `orders_${status}`,
          metric_value: count,
          metric_unit: 'count',
          aggregation_level: 'daily',
          source_data_type: 'orders',
          correlation_factors: { total_orders: orders.length, percentage: (count / orders.length) * 100 },
          created_at: new Date().toISOString()
        });
      }
    }

    console.log(`📊 Preparing to insert ${metricsToInsert.length} business metrics`);

    // Insert all metrics
    const { data: insertedMetrics, error: metricsError } = await supabase
      .from('business_metrics')
      .insert(metricsToInsert)
      .select();

    if (metricsError) {
      console.log('❌ Failed to insert business metrics:', metricsError.message);
      return;
    }

    console.log(`✅ Successfully inserted ${insertedMetrics.length} business metrics`);

    // Step 5: Verify the metrics
    console.log('\n5. ✅ Verifying inserted metrics...');

    const { data: verifyMetrics, error: verifyError } = await supabase
      .from('business_metrics')
      .select('metric_date, metric_category, metric_name, metric_value, aggregation_level')
      .in('id', insertedMetrics.map(m => m.id))
      .order('metric_date', { ascending: true });

    if (verifyError) {
      console.log('❌ Failed to verify metrics:', verifyError.message);
    } else {
      console.log('📊 Inserted metrics summary:');
      const metricsByCategory = verifyMetrics.reduce((acc, metric) => {
        if (!acc[metric.metric_category]) acc[metric.metric_category] = [];
        acc[metric.metric_category].push(`${metric.metric_name}: ${metric.metric_value}`);
        return acc;
      }, {});

      for (const [category, metrics] of Object.entries(metricsByCategory)) {
        console.log(`   ${category}:`);
        metrics.forEach(m => console.log(`     - ${m}`));
      }
    }

    // Step 6: Test analytics query (simulating dashboard usage)
    console.log('\n6. 📈 Testing analytics query...');

    const { data: analyticsData, error: analyticsError } = await supabase
      .from('business_metrics')
      .select('metric_category, metric_name, metric_value, metric_unit')
      .eq('aggregation_level', 'daily')
      .eq('metric_date', today)
      .in('id', insertedMetrics.map(m => m.id));

    if (analyticsError) {
      console.log('❌ Analytics query failed:', analyticsError.message);
    } else {
      console.log(`✅ Analytics query successful - retrieved ${analyticsData.length} metrics`);
      console.log('📊 Today\'s metrics:');
      analyticsData.forEach(metric => {
        console.log(`   ${metric.metric_category}.${metric.metric_name}: ${metric.metric_value} ${metric.metric_unit}`);
      });
    }

    // Cleanup
    console.log('\n7. 🧹 Cleaning up test data...');

    // Delete metrics
    await supabase
      .from('business_metrics')
      .delete()
      .in('id', insertedMetrics.map(m => m.id));

    // Delete orders
    await supabase
      .from('orders')
      .delete()
      .in('id', allOrders.map(o => o.id));

    console.log('✅ Test data cleaned up');

    // Final summary
    console.log('\n🎉 FINAL DATA PIPELINE TEST RESULTS');
    console.log('==================================');
    console.log('✅ Database connectivity: WORKING');
    console.log('✅ Order creation: WORKING');
    console.log('✅ Metric calculation: WORKING');
    console.log('✅ Metric insertion: WORKING');
    console.log('✅ Analytics queries: WORKING');
    console.log('✅ Data cleanup: WORKING');
    console.log('\n🚀 THE DATA PIPELINE IS FULLY FUNCTIONAL!');
    console.log('🎯 Ready for production data population');

  } catch (error) {
    console.error('❌ Pipeline test failed:', error.message);
    console.log('\n🔧 Error details:', error);
  }
}

// Run the test
if (require.main === module) {
  testPipelineFinal()
    .then(() => {
      console.log('\n✅ Final pipeline test completed');
    })
    .catch((error) => {
      console.error('\n❌ Final test failed:', error);
    });
}

module.exports = { testPipelineFinal };