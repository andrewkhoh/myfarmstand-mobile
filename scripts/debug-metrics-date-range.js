/**
 * Debug the date range issue with business metrics
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

async function debugDateRange() {
  try {
    console.log('🔍 Debugging date range issues...\n');

    // 1. Check what dates we have orders for
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('created_at')
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError.message);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log('❌ No orders found in database');
      return;
    }

    const firstOrderDate = orders[0].created_at;
    const lastOrderDate = orders[orders.length - 1].created_at;

    console.log(`📦 Orders date range:`);
    console.log(`   First order: ${firstOrderDate}`);
    console.log(`   Last order:  ${lastOrderDate}`);
    console.log(`   Total orders: ${orders.length}\n`);

    // 2. Check what's in business_metrics table
    const { data: metrics, error: metricsError } = await supabase
      .from('business_metrics')
      .select('metric_date')
      .order('metric_date', { ascending: true });

    if (metricsError) {
      console.error('❌ Error fetching metrics:', metricsError.message);
      return;
    }

    if (!metrics || metrics.length === 0) {
      console.log('📊 Business metrics table is EMPTY\n');
    } else {
      const firstMetricDate = metrics[0].metric_date;
      const lastMetricDate = metrics[metrics.length - 1].metric_date;

      console.log(`📊 Business metrics date range:`);
      console.log(`   First metric: ${firstMetricDate}`);
      console.log(`   Last metric:  ${lastMetricDate}`);
      console.log(`   Total metrics: ${metrics.length}\n`);
    }

    // 3. Test what date range the app is trying to query
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log(`🎯 Default query range (last 30 days):`);
    console.log(`   Start: ${thirtyDaysAgo.toISOString().split('T')[0]}`);
    console.log(`   End:   ${today.toISOString().split('T')[0]}\n`);

    // 4. Check if there are orders in the last 30 days
    const { data: recentOrders, error: recentError } = await supabase
      .from('orders')
      .select('created_at, total_amount')
      .gte('created_at', thirtyDaysAgo.toISOString().split('T')[0])
      .lte('created_at', today.toISOString().split('T')[0] + ' 23:59:59');

    if (recentError) {
      console.error('❌ Error fetching recent orders:', recentError.message);
      return;
    }

    console.log(`📦 Orders in last 30 days: ${recentOrders?.length || 0}`);

    if (!recentOrders || recentOrders.length === 0) {
      console.log('⚠️  This is why the fallback is failing - no orders in the query range!\n');

      // Calculate how old the data is
      const lastOrderDateObj = new Date(lastOrderDate);
      const daysSinceLastOrder = Math.floor((today - lastOrderDateObj) / (1000 * 60 * 60 * 24));

      console.log(`📅 Your last order was ${daysSinceLastOrder} days ago`);
      console.log(`💡 The app is looking for recent data but your orders are older\n`);
    }

    // 5. Show what date range WOULD work
    console.log('✅ Suggested fix:');
    console.log(`   The app should query from ${firstOrderDate.split('T')[0]} to ${lastOrderDate.split('T')[0]}`);
    console.log(`   Or use "all time" option if available\n`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the debug
debugDateRange();