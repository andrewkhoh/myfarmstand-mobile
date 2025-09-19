/**
 * Verify what's in business_metrics table and what the app is querying
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

async function verifyMetricsData() {
  try {
    console.log('🔍 Verifying business_metrics data...\n');

    // 1. Check what categories and aggregation levels we have
    const { data: metrics, error } = await supabase
      .from('business_metrics')
      .select('*')
      .order('metric_date', { ascending: false });

    if (error) {
      console.error('❌ Error fetching metrics:', error.message);
      return;
    }

    console.log(`📊 Found ${metrics?.length || 0} total records\n`);

    if (metrics && metrics.length > 0) {
      // Analyze the data
      const categories = new Set();
      const names = new Set();
      const levels = new Set();
      const dates = new Set();

      metrics.forEach(m => {
        categories.add(m.metric_category);
        names.add(m.metric_name);
        levels.add(m.aggregation_level);
        dates.add(m.metric_date);
      });

      console.log('📈 Data structure:');
      console.log('   Categories:', Array.from(categories).join(', '));
      console.log('   Metric names:', Array.from(names).join(', '));
      console.log('   Aggregation levels:', Array.from(levels).join(', '));
      console.log('   Date range:', Math.min(...Array.from(dates)), 'to', Math.max(...Array.from(dates)));
      console.log('');

      // 2. Test the exact query the app would make
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const startDate = thirtyDaysAgo.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      console.log('🎯 Testing app query:');
      console.log(`   Categories: ['sales', 'orders', 'customers']`);
      console.log(`   Level: 'daily'`);
      console.log(`   Date range: ${startDate} to ${endDate}\n`);

      const { data: testQuery, error: testError } = await supabase
        .from('business_metrics')
        .select('*')
        .in('metric_category', ['sales', 'orders', 'customers'])
        .eq('aggregation_level', 'daily')
        .gte('metric_date', startDate)
        .lte('metric_date', endDate);

      if (testError) {
        console.error('❌ Query error:', testError.message);
      } else {
        console.log(`✅ Query would return ${testQuery?.length || 0} records`);

        if (testQuery && testQuery.length === 0) {
          // No data in the date range - check why
          console.log('\n⚠️  No data found in the last 30 days!');

          // Try without date filter
          const { data: noDateFilter } = await supabase
            .from('business_metrics')
            .select('*')
            .in('metric_category', ['sales', 'orders', 'customers'])
            .eq('aggregation_level', 'daily');

          console.log(`   Without date filter: ${noDateFilter?.length || 0} records`);

          if (noDateFilter && noDateFilter.length > 0) {
            console.log('   💡 Your data is outside the 30-day window');
            console.log('   💡 The metrics exist but are for older dates');
          }
        } else {
          // Show sample of what would be returned
          console.log('\n📋 Sample records that would be returned:');
          testQuery.slice(0, 3).forEach(m => {
            console.log(`   ${m.metric_date} | ${m.metric_category} | ${m.metric_name} = ${m.metric_value}`);
          });
        }
      }

      // 3. Show all unique dates
      console.log('\n📅 All dates in the table:');
      const sortedDates = Array.from(dates).sort();
      sortedDates.forEach(date => {
        const metricsForDate = metrics.filter(m => m.metric_date === date);
        console.log(`   ${date}: ${metricsForDate.length} metrics`);
      });

    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run verification
verifyMetricsData();