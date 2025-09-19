/**
 * Check why business_metrics queries are not finding data
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

async function checkMismatch() {
  try {
    console.log('🔍 Checking why business_metrics queries fail...\n');

    // 1. Check what's actually in the business_metrics table
    const { data: metrics, error: metricsError } = await supabase
      .from('business_metrics')
      .select('metric_category, metric_name, aggregation_level, metric_date')
      .limit(20);

    if (metricsError) {
      console.error('❌ Error fetching metrics:', metricsError.message);
      return;
    }

    if (!metrics || metrics.length === 0) {
      console.log('❌ Business metrics table is empty');
      return;
    }

    // Analyze what we have
    const categories = new Set();
    const names = new Set();
    const levels = new Set();
    let minDate = null;
    let maxDate = null;

    metrics.forEach(m => {
      categories.add(m.metric_category);
      names.add(m.metric_name);
      levels.add(m.aggregation_level);

      if (!minDate || m.metric_date < minDate) minDate = m.metric_date;
      if (!maxDate || m.metric_date > maxDate) maxDate = m.metric_date;
    });

    console.log('📊 What\'s in business_metrics table:');
    console.log('   Categories:', Array.from(categories).join(', '));
    console.log('   Names:', Array.from(names).join(', '));
    console.log('   Aggregation levels:', Array.from(levels).join(', '));
    console.log('   Date range:', minDate, 'to', maxDate);
    console.log('   Sample records:', metrics.length, '\n');

    // 2. Show sample records
    console.log('📋 Sample records:');
    metrics.slice(0, 5).forEach(m => {
      console.log(`   ${m.metric_date} | ${m.metric_category} | ${m.metric_name} | ${m.aggregation_level}`);
    });
    console.log('');

    // 3. Test what the app is trying to query
    console.log('🎯 Testing query combinations:\n');

    // Test 1: Query for 'sales' category with 'daily' aggregation
    const { data: test1, error: error1 } = await supabase
      .from('business_metrics')
      .select('*')
      .eq('metric_category', 'sales')
      .eq('aggregation_level', 'daily');

    console.log(`Test 1 - category='sales', level='daily': ${test1?.length || 0} records`);

    // Test 2: Query for 'orders' category
    const { data: test2, error: error2 } = await supabase
      .from('business_metrics')
      .select('*')
      .eq('metric_category', 'orders');

    console.log(`Test 2 - category='orders': ${test2?.length || 0} records`);

    // Test 3: Query for 'operations' category
    const { data: test3, error: error3 } = await supabase
      .from('business_metrics')
      .select('*')
      .eq('metric_category', 'operations');

    console.log(`Test 3 - category='operations': ${test3?.length || 0} records`);

    // Test 4: Query without any filters
    const { data: test4, error: error4 } = await supabase
      .from('business_metrics')
      .select('*');

    console.log(`Test 4 - no filters: ${test4?.length || 0} total records\n`);

    // 4. Check the likely issue
    console.log('💡 Likely issues:');

    if (!categories.has('revenue') && !categories.has('sales')) {
      console.log('   ❌ No "revenue" or "sales" category - the app might be looking for these');
    }

    if (!levels.has('daily')) {
      console.log('   ❌ No "daily" aggregation level - the app might default to this');
    }

    // 5. Test the exact query the app is using
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: appQuery, error: appError } = await supabase
      .from('business_metrics')
      .select('*')
      .in('metric_category', ['sales', 'orders', 'customers', 'revenue'])
      .eq('aggregation_level', 'daily')
      .gte('metric_date', thirtyDaysAgo.toISOString().split('T')[0])
      .lte('metric_date', today.toISOString().split('T')[0]);

    console.log(`\n📱 App's likely query (last 30 days, daily aggregation):`);
    console.log(`   Categories: ['sales', 'orders', 'customers', 'revenue']`);
    console.log(`   Level: 'daily'`);
    console.log(`   Date range: ${thirtyDaysAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`);
    console.log(`   Results: ${appQuery?.length || 0} records`);

    if (!appQuery || appQuery.length === 0) {
      console.log('\n⚠️  THIS is why the app is falling back to direct calculation!');
      console.log('   The query filters don\'t match the data in the table.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the check
checkMismatch();