/**
 * Production Cron Job for Business Metrics
 * This runs daily to update business metrics automatically
 */

require('dotenv').config();
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function runDailyMetricsUpdate() {
  console.log(`🔄 [${new Date().toISOString()}] Running daily metrics update...`);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get orders from last 3 days (to catch any late updates)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at, user_id')
      .gte('created_at', threeDaysAgo)
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.log('❌ Failed to fetch recent orders:', ordersError.message);
      return;
    }

    if (!recentOrders || recentOrders.length === 0) {
      console.log('ℹ️  No recent orders to process');
      return;
    }

    console.log(`📊 Processing ${recentOrders.length} recent orders`);

    // Group by date and process
    const ordersByDate = recentOrders.reduce((acc, order) => {
      const date = order.created_at.split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(order);
      return acc;
    }, {});

    // Generate metrics for each date
    const metricsToUpsert = [];

    for (const [date, dayOrders] of Object.entries(ordersByDate)) {
      const dailyRevenue = dayOrders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);
      const uniqueCustomers = new Set(dayOrders.map(o => o.user_id).filter(Boolean)).size;

      // Delete existing metrics for this date first (to handle updates)
      await supabase
        .from('business_metrics')
        .delete()
        .eq('metric_date', date)
        .eq('aggregation_level', 'daily');

      // Core metrics
      metricsToUpsert.push(
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
        }
      );

      // Status breakdown
      const statusCounts = dayOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      for (const [status, count] of Object.entries(statusCounts)) {
        metricsToUpsert.push({
          metric_date: date,
          metric_category: 'operations',
          metric_name: `orders_${status}`,
          metric_value: count,
          metric_unit: 'count',
          aggregation_level: 'daily',
          source_data_type: 'orders',
          correlation_factors: { total_orders: dayOrders.length },
          created_at: new Date().toISOString()
        });
      }
    }

    // Insert new metrics
    const { data: insertedMetrics, error: insertError } = await supabase
      .from('business_metrics')
      .insert(metricsToUpsert)
      .select('id');

    if (insertError) {
      console.log('❌ Failed to insert metrics:', insertError.message);
    } else {
      console.log(`✅ Updated ${insertedMetrics.length} business metrics`);
      console.log(`📅 Processed dates: ${Object.keys(ordersByDate).join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Daily metrics update failed:', error.message);

    // You could add alerting here:
    // await sendSlackAlert(`Daily metrics update failed: ${error.message}`);
    // await sendEmailAlert('admin@yourcompany.com', 'Metrics Update Failed', error.message);
  }
}

// Production cron job setup
function startProductionCron() {
  console.log('🚀 Starting production cron job for business metrics...');
  console.log('Schedule: Daily at 2:00 AM');

  // Run daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    await runDailyMetricsUpdate();
  }, {
    scheduled: true,
    timezone: "America/New_York" // Adjust to your timezone
  });

  // Optional: Also run every 6 hours for more frequent updates
  // cron.schedule('0 */6 * * *', async () => {
  //   await runDailyMetricsUpdate();
  // });

  // Run once immediately for testing
  console.log('🧪 Running initial update...');
  runDailyMetricsUpdate();

  console.log('✅ Cron job started successfully');
  console.log('📝 Logs will show daily at 2:00 AM');
}

// Manual run option
async function runOnce() {
  console.log('🔄 Running metrics update once...');
  await runDailyMetricsUpdate();
  process.exit(0);
}

// Command line usage
if (require.main === module) {
  const arg = process.argv[2];

  if (arg === 'once') {
    runOnce();
  } else {
    startProductionCron();
  }
}

module.exports = {
  runDailyMetricsUpdate,
  startProductionCron
};