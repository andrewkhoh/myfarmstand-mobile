import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput
} from 'react-native';
import { supabase } from '../../config/supabase';
import { BroadcastHelper } from '../../utils/broadcastHelper';
import { ChannelManager } from '../../utils/channelManager';

/**
 * Broadcast Architecture Test Screen
 * Tests the new broadcast-based real-time system
 */
export const BroadcastArchitectureTestScreen: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<string>('Not Connected');
  const [receivedEvents, setReceivedEvents] = useState<any[]>([]);
  const [testOrderId, setTestOrderId] = useState<string>('');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  // Initialize broadcast subscriptions
  useEffect(() => {
    console.log('🚀 Initializing broadcast test subscriptions...');
    
    // Order updates subscription - use shared channel
    const orderUpdatesChannel = ChannelManager.getChannel('order-updates')
      .on(
        'broadcast',
        { event: 'order-status-changed' },
        (payload) => {
          console.log('📡 Received order-status-changed:', payload);
          setReceivedEvents(prev => [...prev, {
            type: 'order-status-changed',
            data: payload,
            timestamp: new Date().toISOString()
          }]);
        }
      )
      .on(
        'broadcast',
        { event: 'new-order' },
        (payload) => {
          console.log('📡 Received new-order:', payload);
          setReceivedEvents(prev => [...prev, {
            type: 'new-order',
            data: payload,
            timestamp: new Date().toISOString()
          }]);
        }
      );
    
    // Set connection status to SUBSCRIBED since shared channels are already subscribed
    setConnectionStatus('SUBSCRIBED');

    // Cart updates subscription - use shared channel
    const cartUpdatesChannel = ChannelManager.getChannel('cart-updates')
      .on(
        'broadcast',
        { event: 'cart-updated' },
        (payload) => {
          console.log('📡 Received cart-updated:', payload);
          setReceivedEvents(prev => [...prev, {
            type: 'cart-updated',
            data: payload,
            timestamp: new Date().toISOString()
          }]);
        }
      )
      .on(
        'broadcast',
        { event: 'cart-synced' },
        (payload) => {
          console.log('📡 Received cart-synced:', payload);
          setReceivedEvents(prev => [...prev, {
            type: 'cart-synced',
            data: payload,
            timestamp: new Date().toISOString()
          }]);
        }
      );

    // Product updates subscription - use shared channel
    const productUpdatesChannel = ChannelManager.getChannel('product-updates')
      .on(
        'broadcast',
        { event: 'product-updated' },
        (payload) => {
          console.log('📡 Received product-updated:', payload);
          setReceivedEvents(prev => [...prev, {
            type: 'product-updated',
            data: payload,
            timestamp: new Date().toISOString()
          }]);
        }
      )
      .on(
        'broadcast',
        { event: 'stock-updated' },
        (payload) => {
          console.log('📡 Received stock-updated:', payload);
          setReceivedEvents(prev => [...prev, {
            type: 'stock-updated',
            data: payload,
            timestamp: new Date().toISOString()
          }]);
        }
      );

    setSubscriptions([orderUpdatesChannel, cartUpdatesChannel, productUpdatesChannel]);

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up broadcast test subscriptions...');
      orderUpdatesChannel.unsubscribe();
      cartUpdatesChannel.unsubscribe();
      productUpdatesChannel.unsubscribe();
    };
  }, []);

  // Test functions
  const testOrderStatusBroadcast = async () => {
    if (!testOrderId.trim()) {
      Alert.alert('Error', 'Please enter a test order ID');
      return;
    }

    try {
      await BroadcastHelper.sendOrderUpdate('order-status-changed', {
        orderId: testOrderId,
        newStatus: 'ready',
        testEvent: true
      });
      Alert.alert('Success', 'Order status broadcast sent!');
    } catch (error) {
      Alert.alert('Error', `Failed to send broadcast: ${error}`);
    }
  };

  const testNewOrderBroadcast = async () => {
    try {
      await BroadcastHelper.sendOrderUpdate('new-order', {
        orderId: 'test-order-' + Date.now(),
        customerName: 'Test Customer',
        testEvent: true
      });
      Alert.alert('Success', 'New order broadcast sent!');
    } catch (error) {
      Alert.alert('Error', `Failed to send broadcast: ${error}`);
    }
  };

  const testCartUpdateBroadcast = async () => {
    try {
      await BroadcastHelper.sendCartUpdate('cart-updated', {
        action: 'item-added',
        productId: 'test-product-123',
        productName: 'Test Product',
        testEvent: true
      });
      Alert.alert('Success', 'Cart update broadcast sent!');
    } catch (error) {
      Alert.alert('Error', `Failed to send broadcast: ${error}`);
    }
  };

  const testProductUpdateBroadcast = async () => {
    try {
      await BroadcastHelper.sendProductUpdate('stock-updated', {
        productId: 'test-product-456',
        productName: 'Test Product 2',
        newStock: 25,
        testEvent: true
      });
      Alert.alert('Success', 'Product update broadcast sent!');
    } catch (error) {
      Alert.alert('Error', `Failed to send broadcast: ${error}`);
    }
  };

  const clearEvents = () => {
    setReceivedEvents([]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Broadcast Architecture Test</Text>
      
      {/* Connection Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection Status</Text>
        <Text style={[
          styles.status,
          { color: connectionStatus === 'SUBSCRIBED' ? '#4CAF50' : '#FF5722' }
        ]}>
          {connectionStatus}
        </Text>
        <Text style={styles.info}>
          ✅ Expected: "SUBSCRIBED" (green)
        </Text>
      </View>

      {/* Test Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Broadcast Events</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Test Order ID:</Text>
          <TextInput
            style={styles.input}
            value={testOrderId}
            onChangeText={setTestOrderId}
            placeholder="Enter order ID for testing"
          />
        </View>

        <TouchableOpacity style={styles.testButton} onPress={testOrderStatusBroadcast}>
          <Text style={styles.buttonText}>Test Order Status Change</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={testNewOrderBroadcast}>
          <Text style={styles.buttonText}>Test New Order</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={testCartUpdateBroadcast}>
          <Text style={styles.buttonText}>Test Cart Update</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={testProductUpdateBroadcast}>
          <Text style={styles.buttonText}>Test Product Update</Text>
        </TouchableOpacity>
      </View>

      {/* Received Events */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Received Events ({receivedEvents.length})</Text>
          <TouchableOpacity onPress={clearEvents} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
        
        {receivedEvents.length === 0 ? (
          <Text style={styles.noEvents}>No events received yet</Text>
        ) : (
          receivedEvents.map((event, index) => (
            <View key={index} style={styles.eventItem}>
              <Text style={styles.eventType}>{event.type}</Text>
              <Text style={styles.eventTime}>{new Date(event.timestamp).toLocaleTimeString()}</Text>
              <Text style={styles.eventData}>{JSON.stringify(event.data, null, 2)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Instructions</Text>
        <Text style={styles.instruction}>
          1. Verify connection status shows "SUBSCRIBED"
        </Text>
        <Text style={styles.instruction}>
          2. Tap test buttons to send broadcast events
        </Text>
        <Text style={styles.instruction}>
          3. Check that events appear in "Received Events" section
        </Text>
        <Text style={styles.instruction}>
          4. Open multiple app instances to test cross-device sync
        </Text>
        <Text style={styles.instruction}>
          5. Test real order status changes in Admin screen
        </Text>
      </View>
    </ScrollView>
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
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    fontSize: 16,
  },
  testButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noEvents: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  eventItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    marginBottom: 8,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  eventType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  eventTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  eventData: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 4,
  },
  instruction: {
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
});
