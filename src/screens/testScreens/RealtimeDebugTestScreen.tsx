import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { supabase } from '../../config/supabase';

export const RealtimeDebugTestScreen: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('Not started');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]); // Keep last 20 logs
  };

  const testBasicConnection = async () => {
    addLog('🔍 Testing basic Supabase connection...');
    try {
      const { data, error } = await supabase.from('products').select('count').limit(1);
      if (error) {
        addLog(`❌ Connection failed: ${error.message}`);
      } else {
        addLog('✅ Basic Supabase connection working');
      }
    } catch (err) {
      addLog(`❌ Connection error: ${err}`);
    }
  };

  const testRealtimeSubscription = () => {
    addLog('🚀 Setting up basic realtime subscription...');
    
    const channel = supabase
      .channel('debug-test-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          addLog(`🔄 REALTIME EVENT RECEIVED: ${JSON.stringify(payload, null, 2)}`);
        }
      )
      .subscribe((status) => {
        addLog(`📡 Subscription status: ${status}`);
        setSubscriptionStatus(status);
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
          addLog('✅ Successfully subscribed to realtime events');
        }
      });

    return channel;
  };

  const insertTestOrder = async () => {
    addLog('📝 Inserting test order to trigger realtime event...');
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000', // Test user ID
          customer_name: 'Test Customer',
          customer_email: 'test@example.com',
          customer_phone: '555-0123',
          fulfillment_type: 'pickup',
          status: 'pending',
          subtotal: 10.00,
          tax: 0.85,
          total: 10.85,
          pickup_date: new Date().toISOString(),
          pickup_time: '12:00',
        })
        .select();

      if (error) {
        addLog(`❌ Insert failed: ${error.message}`);
      } else {
        addLog(`✅ Test order inserted: ${data?.[0]?.id}`);
        addLog('🔍 Waiting for realtime event...');
      }
    } catch (err) {
      addLog(`❌ Insert error: ${err}`);
    }
  };

  const checkRealtimeStatus = async () => {
    addLog('🔍 Checking Supabase Realtime status...');
    try {
      // Check if realtime is enabled by trying to get channel info
      const channels = supabase.getChannels();
      addLog(`📊 Active channels: ${channels.length}`);
      
      channels.forEach((channel, index) => {
        addLog(`Channel ${index + 1}: ${channel.topic} - State: ${channel.state}`);
      });
    } catch (err) {
      addLog(`❌ Realtime status error: ${err}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Realtime Debug Test</Text>
      <Text style={styles.subtitle}>Subscription Status: {subscriptionStatus}</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testBasicConnection}>
          <Text style={styles.buttonText}>Test Connection</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testRealtimeSubscription}>
          <Text style={styles.buttonText}>Subscribe to Realtime</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={checkRealtimeStatus}>
          <Text style={styles.buttonText}>Check Realtime Status</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, !isSubscribed && styles.buttonDisabled]} 
          onPress={insertTestOrder}
          disabled={!isSubscribed}
        >
          <Text style={styles.buttonText}>Insert Test Order</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearLogs}>
          <Text style={styles.buttonText}>Clear Logs</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.logContainer}>
        <Text style={styles.logTitle}>Debug Logs:</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    color: '#666',
  },
  buttonContainer: {
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
  },
  logTitle: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logText: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 4,
  },
});
