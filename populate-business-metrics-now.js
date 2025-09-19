/**
 * Immediate Business Metrics Population Script
 * Run this to populate your business_metrics table with existing order data
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function populateBusinessMetricsNow() {
  console.log('🚀 Populating Business Metrics Table...');
  console.log('=====================================');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing Supabase configuration');
    console.log('   Add SUPABASE_SERVICE_ROLE_KEY to your .env file for full access');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Step 1: Check current state
    console.log('1. 📊 Checking current state...');

    const { count: existingMetrics } = await supabase
      .from('business_metrics')
      .select('*', { count: 'exact', head: true });

    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    console.log(`   Current metrics: ${existingMetrics || 0}`);
    console.log(`   Total orders: ${totalOrders || 0}`);

    if (totalOrders === 0) {
      console.log('⚠️  No orders found in database');
      console.log('💡 You need orders to generate business metrics');
      return;
    }

    if (existingMetrics > 0) {
      console.log('⚠️  Business metrics already exist');
      console.log('   This will add new metrics alongside existing ones');
    }

    // Step 2: Get order data for last 90 days
    console.log('\n2. 📦 Fetching order data (last 90 days)...');

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at, user_id')
      .gte('created_at', ninetyDaysAgo)
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.log('❌ Failed to fetch orders:', ordersError.message);
      return;
    }

    console.log(`✅ Retrieved ${orders.length} orders from last 90 days`);

    if (orders.length === 0) {
      console.log('⚠️  No orders in the last 90 days');
      console.log('💡 Extending search to all time...');

      const { data: allOrders, error: allOrdersError } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at, user_id')
        .order('created_at', { ascending: true });

      if (allOrdersError || !allOrders || allOrders.length === 0) {
        console.log('❌ No orders found in database');
        return;
      }

      orders.push(...allOrders);
      console.log(`✅ Using all ${orders.length} orders`);
    }

    // Step 3: Process orders into metrics
    console.log('\n3. 🧮 Processing orders into business metrics...');

    // Group orders by date
    const ordersByDate = orders.reduce((acc, order) => {
      const date = order.created_at.split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(order);
      return acc;
    }, {});

    console.log(`📅 Processing ${Object.keys(ordersByDate).length} unique dates`);

    // Generate metrics for each date
    const metricsToInsert = [];
    let processedDates = 0;

    for (const [date, dayOrders] of Object.entries(ordersByDate)) {
      processedDates++;
      console.log(`   Processing ${date} (${dayOrders.length} orders) [${processedDates}/${Object.keys(ordersByDate).length}]`);

      const dailyRevenue = dayOrders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);
      const uniqueCustomers = new Set(dayOrders.map(o => o.user_id).filter(Boolean)).size;

      // Status breakdown
      const statusCounts = dayOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      // Core daily metrics
      metricsToInsert.push(
        {
          metric_date: date,
          metric_category: 'orders',
          metric_name: 'total_orders',
          metric_value: dayOrders.length,
          metric_unit: 'count',
          aggregation_level: 'daily',
          source_data_type: 'orders',
          correlation_factors: { revenue: dailyRevenue, customers: uniqueCustomers },
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
          correlation_factors: { order_count: dayOrders.length, customers: uniqueCustomers },
          created_at: new Date().toISOString()
        },
        {
          metric_date: date,
          metric_category: 'customers',
          metric_name: 'unique_customers',
          metric_value: uniqueCustomers,
          metric_unit: 'count',
          aggregation_level: 'daily',
          source_data_type: 'orders',
          correlation_factors: { orders: dayOrders.length, revenue: dailyRevenue },
          created_at: new Date().toISOString()
        }
      );

      // Status metrics
      for (const [status, count] of Object.entries(statusCounts)) {
        metricsToInsert.push({
          metric_date: date,
          metric_category: 'operations',
          metric_name: `orders_${status}`,
          metric_value: count,
          metric_unit: 'count',
          aggregation_level: 'daily',
          source_data_type: 'orders',
          correlation_factors: { total_orders: dayOrders.length, percentage: (count / dayOrders.length) * 100 },
          created_at: new Date().toISOString()
        });
      }
    }

    console.log(`✅ Generated ${metricsToInsert.length} business metrics`);

    // Step 4: Insert metrics in batches
    console.log('\n4. 💾 Inserting business metrics...');

    const batchSize = 100;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < metricsToInsert.length; i += batchSize) {
      const batch = metricsToInsert.slice(i, i + batchSize);

      const { data, error } = await supabase
        .from('business_metrics')
        .insert(batch)
        .select('id');

      if (error) {
        console.log(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
        errors += batch.length;
      } else {
        inserted += data.length;
        console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}: ${data.length} metrics inserted`);
      }
    }

    // Step 5: Verify results
    console.log('\n5. ✅ Verifying results...');

    const { count: finalMetrics } = await supabase
      .from('business_metrics')
      .select('*', { count: 'exact', head: true });

    const { data: sampleMetrics } = await supabase
      .from('business_metrics')
      .select('metric_date, metric_category, metric_name, metric_value')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('\n🎉 BUSINESS METRICS POPULATION COMPLETE!');
    console.log('=======================================');
    console.log(`📊 Total metrics in database: ${finalMetrics}`);
    console.log(`✅ Successfully inserted: ${inserted}`);
    console.log(`❌ Failed to insert: ${errors}`);
    console.log(`📅 Date range: ${Object.keys(ordersByDate).sort()[0]} to ${Object.keys(ordersByDate).sort().slice(-1)[0]}`);

    if (sampleMetrics && sampleMetrics.length > 0) {
      console.log('\n📈 Sample recent metrics:');
      sampleMetrics.forEach((metric, i) => {
        console.log(`   ${i + 1}. ${metric.metric_category}.${metric.metric_name}: ${metric.metric_value} (${metric.metric_date})`);
      });
    }

    console.log('\n🚀 Your analytics dashboards should now show real data!');

  } catch (error) {
    console.error('❌ Population failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your .env file has correct Supabase credentials');
    console.log('2. Ensure you have service role key for full database access');
    console.log('3. Verify business_metrics table exists');
    console.log('4. Check database permissions');
  }
}

// Run the population
if (require.main === module) {
  populateBusinessMetricsNow()
    .then(() => {
      console.log('\n✅ Population script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Population script failed:', error);
      process.exit(1);
    });
}

module.exports = { populateBusinessMetricsNow };