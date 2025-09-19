/**
 * Working Data Population Component
 * Actually populates the business_metrics table with real data
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { supabase } from '../../config/supabase';

export const DataPopulationWorking: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('Checking status...');
  const [metrics, setMetrics] = useState({
    currentMetrics: 0,
    totalOrders: 0,
    lastUpdate: null as string | null
  });
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Check current status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      addLog('Checking current database status...');

      // Check business_metrics count
      const { count: metricsCount } = await supabase
        .from('business_metrics')
        .select('*', { count: 'exact', head: true });

      // Check orders count
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      // Get last metric date
      const { data: lastMetric } = await supabase
        .from('business_metrics')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setMetrics({
        currentMetrics: metricsCount || 0,
        totalOrders: ordersCount || 0,
        lastUpdate: lastMetric?.created_at || null
      });

      if (ordersCount === 0) {
        setStatus('❌ No orders found in database');
      } else if (metricsCount === 0) {
        setStatus('📊 Ready to populate metrics from orders');
      } else {
        setStatus(`✅ ${metricsCount} metrics exist (last update: ${lastMetric?.created_at?.split('T')[0] || 'unknown'})`);
      }

      addLog(`Found ${ordersCount} orders and ${metricsCount} existing metrics`);

    } catch (error: any) {
      setStatus('❌ Error checking status');
      addLog(`Error: ${error.message}`);
    }
  };

  const populateMetrics = async () => {
    setIsLoading(true);
    setLogs([]);
    addLog('Starting business metrics population...');

    try {
      // Step 1: Get all orders
      addLog('Fetching orders from database...');
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at, user_id')
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        addLog('❌ No orders found to process');
        Alert.alert('No Orders', 'No orders found in the database to create metrics from.');
        return;
      }

      addLog(`✅ Retrieved ${orders.length} orders`);

      // Step 2: Process orders into metrics
      addLog('Processing orders into business metrics...');
      const metricsToInsert: any[] = [];

      // Calculate aggregated metrics for ALL orders
      const totalRevenue = orders.reduce((sum: number, order: any) =>
        sum + (parseFloat(order.total_amount) || 0), 0
      );

      const uniqueCustomers = new Set(
        orders.map((o: any) => o.user_id).filter(Boolean)
      ).size;

      // Get today's date for the metric_date (when we're calculating/reporting the metrics)
      const today = new Date().toISOString().split('T')[0];

      addLog(`Calculating metrics for ${orders.length} total orders...`);
      addLog(`Setting metric_date to today: ${today}`);

      // Group orders by date to create daily metrics
      const ordersByDate: Record<string, any[]> = {};
      for (const order of orders) {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        if (!ordersByDate[orderDate]) {
          ordersByDate[orderDate] = [];
        }
        ordersByDate[orderDate].push(order);
      }

      // Process each day's orders
      for (const [date, dayOrders] of Object.entries(ordersByDate)) {
        const dailyRevenue = dayOrders.reduce((sum: number, order: any) =>
          sum + (parseFloat(order.total_amount) || 0), 0
        );

        const dailyCustomers = new Set(
          dayOrders.map((o: any) => o.user_id).filter(Boolean)
        ).size;

        // Total orders for the day (sales category)
        metricsToInsert.push({
          metric_date: date,
          metric_category: 'sales',
          metric_name: 'total_orders',
          metric_value: dayOrders.length,
          metric_unit: 'count',
          aggregation_level: 'daily',
          source_data_type: 'orders',
          correlation_factors: { revenue: dailyRevenue, customers: dailyCustomers },
          created_at: new Date().toISOString()
        });

        // Revenue for the day (sales category)
        metricsToInsert.push({
          metric_date: date,
          metric_category: 'sales',
          metric_name: 'total_revenue',
          metric_value: dailyRevenue,
          metric_unit: 'currency',
          aggregation_level: 'daily',
          source_data_type: 'orders',
          correlation_factors: { order_count: dayOrders.length },
          created_at: new Date().toISOString()
        });

        // Unique customers for the day (marketing category)
        metricsToInsert.push({
          metric_date: date,
          metric_category: 'marketing',
          metric_name: 'unique_customers',
          metric_value: dailyCustomers,
          metric_unit: 'count',
          aggregation_level: 'daily',
          source_data_type: 'orders',
          correlation_factors: { orders: dayOrders.length, revenue: dailyRevenue },
          created_at: new Date().toISOString()
        });

        // Status breakdown
        const statusCounts = dayOrders.reduce((acc: any, order: any) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {});

        for (const [status, count] of Object.entries(statusCounts) as any) {
          metricsToInsert.push({
            metric_date: date,
            metric_category: 'operational',
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

      // Also add strategic summary metrics for today (current state)
      metricsToInsert.push({
        metric_date: today,
        metric_category: 'strategic',
        metric_name: 'total_orders_all_time',
        metric_value: orders.length,
        metric_unit: 'count',
        aggregation_level: 'daily',
        source_data_type: 'orders',
        correlation_factors: { revenue: totalRevenue, customers: uniqueCustomers },
        created_at: new Date().toISOString()
      });

      metricsToInsert.push({
        metric_date: today,
        metric_category: 'strategic',
        metric_name: 'total_revenue_all_time',
        metric_value: totalRevenue,
        metric_unit: 'currency',
        aggregation_level: 'daily',
        source_data_type: 'orders',
        correlation_factors: { order_count: orders.length },
        created_at: new Date().toISOString()
      });

      addLog(`Generated ${metricsToInsert.length} metrics to insert`);

      // Step 3: Clear existing metrics (if force re-initialize)
      if (metrics.currentMetrics > 0) {
        addLog('Clearing existing metrics for re-initialization...');
        const { error: deleteError } = await supabase
          .from('business_metrics')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (deleteError) {
          addLog(`⚠️ Warning: Could not clear existing metrics: ${deleteError.message}`);
        } else {
          addLog('✅ Cleared existing metrics');
        }
      }

      // Step 4: Insert new metrics in batches
      addLog('Inserting new metrics...');
      const batchSize = 50;
      let inserted = 0;

      for (let i = 0; i < metricsToInsert.length; i += batchSize) {
        const batch = metricsToInsert.slice(i, i + batchSize);

        const { data, error } = await supabase
          .from('business_metrics')
          .insert(batch)
          .select();

        if (error) {
          addLog(`❌ Error inserting batch: ${error.message}`);
        } else {
          inserted += data.length;
          addLog(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}: ${data.length} metrics`);
        }
      }

      addLog(`🎉 Successfully inserted ${inserted} business metrics!`);

      // Step 5: Verify
      const { count: finalCount } = await supabase
        .from('business_metrics')
        .select('*', { count: 'exact', head: true });

      addLog(`📊 Total metrics in database: ${finalCount}`);

      setStatus(`✅ Successfully populated ${inserted} metrics`);
      Alert.alert(
        'Success!',
        `Successfully created ${inserted} business metrics from ${orders.length} orders. Your analytics dashboards should now show real data!`
      );

      // Refresh status
      checkStatus();

    } catch (error: any) {
      setStatus('❌ Population failed');
      addLog(`❌ Error: ${error.message}`);
      Alert.alert('Error', `Failed to populate metrics: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📊 Business Metrics Data Pipeline</Text>

      {/* Status Cards */}
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Current Status</Text>
        <Text style={styles.statusText}>{status}</Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{metrics.totalOrders}</Text>
          <Text style={styles.metricLabel}>Total Orders</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{metrics.currentMetrics}</Text>
          <Text style={styles.metricLabel}>Current Metrics</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={populateMetrics}
          disabled={isLoading || metrics.totalOrders === 0}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.buttonText}>
              {metrics.currentMetrics > 0 ? '🔄 Force Re-initialize' : '🚀 Initialize Business Metrics'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={checkStatus}
          disabled={isLoading}
        >
          <Text style={styles.secondaryButtonText}>🔍 Refresh Status</Text>
        </TouchableOpacity>
      </View>

      {/* Live Logs */}
      {logs.length > 0 && (
        <View style={styles.logsContainer}>
          <Text style={styles.logsTitle}>📋 Process Logs</Text>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logText}>{log}</Text>
          ))}
        </View>
      )}

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ What This Does</Text>
        <Text style={styles.infoText}>
          • Analyzes all orders in your database{'\n'}
          • Creates daily business metrics (revenue, counts, status){'\n'}
          • Populates the business_metrics table{'\n'}
          • Enables analytics dashboards with real data
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 600,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#2d3748',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3182ce',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#2d3748',
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3182ce',
  },
  metricLabel: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
  },
  buttonContainer: {
    gap: 8,
    marginBottom: 16,
  },
  button: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: '#3182ce',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3182ce',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#3182ce',
    fontSize: 16,
    fontWeight: '600',
  },
  logsContainer: {
    backgroundColor: '#1a202c',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    maxHeight: 200,
  },
  logsTitle: {
    color: '#90cdf4',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  logText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: '#e6fffa',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#38b2ac',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#234e52',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#2c7a7b',
    lineHeight: 16,
  },
});