/**
 * Check and populate business metrics if needed
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAndPopulate() {
  try {
    console.log('🔍 Checking current database state...\n');

    // 1. Check orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, created_at, total_amount, status, user_id')
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError.message);
      return;
    }

    console.log(`📦 Found ${orders?.length || 0} recent orders`);
    if (orders && orders.length > 0) {
      console.log('Latest order:', orders[0].created_at);
      console.log('Oldest (in this batch):', orders[orders.length - 1].created_at);

      // Get date range of all orders
      const { data: dateRange, error: rangeError } = await supabase
        .from('orders')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1);

      if (!rangeError && dateRange && dateRange.length > 0) {
        console.log(`Date range: ${dateRange[0].created_at} to ${orders[0].created_at}\n`);
      }
    }

    // 2. Check business_metrics
    const { count: metricsCount, error: metricsCountError } = await supabase
      .from('business_metrics')
      .select('*', { count: 'exact', head: true });

    if (metricsCountError) {
      console.error('❌ Error counting metrics:', metricsCountError.message);
      return;
    }

    console.log(`📊 Found ${metricsCount || 0} business metrics\n`);

    // 3. If no metrics but orders exist, populate
    if (metricsCount === 0 && orders && orders.length > 0) {
      console.log('🚀 No metrics found, starting population...\n');

      // Get ALL orders for processing
      const { data: allOrders, error: allOrdersError } = await supabase
        .from('orders')
        .select('id, created_at, total_amount, status, user_id')
        .order('created_at', { ascending: true });

      if (allOrdersError) {
        console.error('❌ Error fetching all orders:', allOrdersError.message);
        return;
      }

      console.log(`Processing ${allOrders.length} total orders...\n`);

      // Group orders by date
      const ordersByDate = {};
      allOrders.forEach(order => {
        const date = order.created_at.split('T')[0];
        if (!ordersByDate[date]) {
          ordersByDate[date] = [];
        }
        ordersByDate[date].push(order);
      });

      const metricsToInsert = [];

      // Generate daily metrics
      for (const [date, dayOrders] of Object.entries(ordersByDate)) {
        const totalRevenue = dayOrders.reduce((sum, order) =>
          sum + (parseFloat(order.total_amount) || 0), 0
        );

        const uniqueCustomers = new Set(
          dayOrders.map(o => o.user_id).filter(Boolean)
        ).size;

        // Revenue metric
        metricsToInsert.push({
          metric_date: date,
          metric_category: 'sales',
          metric_name: 'revenue',
          metric_value: totalRevenue,
          metric_unit: 'currency',
          aggregation_level: 'daily',
          source_data_type: 'orders',
          created_at: new Date().toISOString()
        });

        // Orders metric
        metricsToInsert.push({
          metric_date: date,
          metric_category: 'orders',
          metric_name: 'orders',
          metric_value: dayOrders.length,
          metric_unit: 'count',
          aggregation_level: 'daily',
          source_data_type: 'orders',
          created_at: new Date().toISOString()
        });

        // Customers metric
        metricsToInsert.push({
          metric_date: date,
          metric_category: 'customers',
          metric_name: 'customers',
          metric_value: uniqueCustomers,
          metric_unit: 'count',
          aggregation_level: 'daily',
          source_data_type: 'orders',
          created_at: new Date().toISOString()
        });
      }

      console.log(`📈 Inserting ${metricsToInsert.length} metrics...\n`);

      // Insert in batches
      const batchSize = 50;
      let inserted = 0;

      for (let i = 0; i < metricsToInsert.length; i += batchSize) {
        const batch = metricsToInsert.slice(i, i + batchSize);

        const { data, error } = await supabase
          .from('business_metrics')
          .insert(batch)
          .select();

        if (error) {
          console.error(`❌ Error inserting batch: ${error.message}`);
        } else {
          inserted += data.length;
          console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}: ${data.length} metrics`);
        }
      }

      console.log(`\n🎉 Successfully populated ${inserted} business metrics!`);

    } else if (metricsCount > 0) {
      console.log('✅ Business metrics already populated');

      // Show sample metrics
      const { data: sampleMetrics, error: sampleError } = await supabase
        .from('business_metrics')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(5);

      if (!sampleError && sampleMetrics) {
        console.log('\n📊 Sample metrics (latest 5):');
        sampleMetrics.forEach(m => {
          console.log(`  ${m.metric_date}: ${m.metric_name} = ${m.metric_value} (${m.metric_category})`);
        });
      }
    } else {
      console.log('⚠️ No orders found in database to create metrics from');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the check
checkAndPopulate();