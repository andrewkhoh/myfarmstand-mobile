import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Screen, Text, Card, Button } from '../../components';
import { spacing, colors } from '../../utils/theme';
import { RealtimeService } from '../../services/realtimeService';
import { BroadcastHelper } from '../../utils/broadcastHelper';
import { cartService } from '../../services/cartService';
import { Product } from '../../types';

// Test product for cart operations
const testProduct: Product = {
  id: 'test-product-1',
  name: 'Test Apple',
  description: 'Test product for cart sync',
  price: 2.50,
  category: 'fruits' as any, // Fix category type
  imageUrl: 'https://example.com/apple.jpg',
  stock: 100,
  unit: 'lb',
  tags: ['test', 'apple'],
  isPreOrder: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const CartSyncTestScreen: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [receivedEvents, setReceivedEvents] = useState<any[]>([]);

  useEffect(() => {
    // Initialize realtime subscriptions
    RealtimeService.initializeAllSubscriptions();
    
    // Set up event listener for cart updates
    const handleRealtimeUpdate = (event: CustomEvent<{ message: string }>) => {
      const timestamp = new Date().toLocaleTimeString();
      setReceivedEvents(prev => [...prev, {
        timestamp,
        message: event.detail.message,
        type: 'realtime-notification'
      }]);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('realtimeUpdate', handleRealtimeUpdate as EventListener);
      setIsListening(true);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('realtimeUpdate', handleRealtimeUpdate as EventListener);
      }
    };
  }, []);

  const addTestResult = (result: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, `[${timestamp}] ${result}`]);
  };

  const testDirectBroadcast = async () => {
    try {
      addTestResult('🧪 Testing direct cart broadcast...');
      
      const result = await BroadcastHelper.sendCartUpdate('cart-item-added', {
        productId: testProduct.id,
        quantity: 1,
        cartTotal: 2.50,
        itemCount: 1
      });
      
      addTestResult(`✅ Direct broadcast sent successfully: ${JSON.stringify(result)}`);
    } catch (error) {
      addTestResult(`❌ Direct broadcast failed: ${error}`);
    }
  };

  const testCartServiceBroadcast = async () => {
    try {
      addTestResult('🧪 Testing cart service broadcast...');
      
      const result = await cartService.addItem(testProduct, 1);
      
      // Check if result has success property (newer API) or is CartState directly
      if ('success' in result && result.success) {
        addTestResult(`✅ Cart service add item successful`);
        addTestResult(`📊 Cart total: ${result.cart.total}, Items: ${result.cart.items.length}`);
      } else if ('total' in result) {
        addTestResult(`✅ Cart service add item successful`);
        addTestResult(`📊 Cart total: ${result.total}, Items: ${result.items.length}`);
      } else {
        addTestResult(`❌ Unexpected cart service response format`);
      }
    } catch (error) {
      addTestResult(`❌ Cart service broadcast failed: ${error}`);
    }
  };

  const testCartServiceRemove = async () => {
    try {
      addTestResult('🧪 Testing cart service remove...');
      
      const result = await cartService.removeItem(testProduct.id);
      
      // Check if result has success property or is CartState directly
      if ('success' in result && result.success) {
        addTestResult(`✅ Cart service remove item successful`);
        addTestResult(`📊 Cart total: ${result.cart.total}, Items: ${result.cart.items.length}`);
      } else if ('total' in result) {
        addTestResult(`✅ Cart service remove item successful`);
        addTestResult(`📊 Cart total: ${result.total}, Items: ${result.items.length}`);
      } else {
        addTestResult(`❌ Unexpected cart service response format`);
      }
    } catch (error) {
      addTestResult(`❌ Cart service remove failed: ${error}`);
    }
  };

  const checkSubscriptionStatus = () => {
    const status = RealtimeService.getSubscriptionStatus();
    addTestResult(`📡 Subscription Status:`);
    addTestResult(`Total subscriptions: ${status.totalSubscriptions}`);
    addTestResult(`All connected: ${status.allConnected}`);
    
    status.subscriptions.forEach(sub => {
      addTestResult(`- ${sub.channel}: ${sub.state} (${sub.isConnected ? 'connected' : 'disconnected'})`);
    });
  };

  const clearResults = () => {
    setTestResults([]);
    setReceivedEvents([]);
  };

  return (
    <Screen>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Cart Sync Test</Text>
        <Text style={styles.subtitle}>Test cart broadcast and real-time synchronization</Text>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Test Controls</Text>
          
          <Button
            title="Check Subscription Status"
            onPress={checkSubscriptionStatus}
            style={styles.button}
          />
          
          <Button
            title="Test Direct Broadcast"
            onPress={testDirectBroadcast}
            style={styles.button}
          />
          
          <Button
            title="Test Cart Service Add"
            onPress={testCartServiceBroadcast}
            style={styles.button}
          />
          
          <Button
            title="Test Cart Service Remove"
            onPress={testCartServiceRemove}
            style={styles.button}
          />
          
          <Button
            title="Clear Results"
            onPress={clearResults}
            style={[styles.button, styles.clearButton]}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>
            Event Listener Status: {isListening ? '🟢 Active' : '🔴 Inactive'}
          </Text>
          <Text style={styles.subtitle}>
            Received Events: {receivedEvents.length}
          </Text>
          
          {receivedEvents.map((event, index) => (
            <View key={index} style={styles.eventItem}>
              <Text style={styles.eventTime}>{event.timestamp}</Text>
              <Text style={styles.eventMessage}>{event.message}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          
          {testResults.map((result, index) => (
            <Text key={index} style={styles.resultText}>
              {result}
            </Text>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.md,
    color: colors.text.primary,
  },
  button: {
    marginBottom: spacing.sm,
  },
  clearButton: {
    backgroundColor: '#ff4444', // Red color for clear button
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: spacing.xs,
    color: colors.text.primary,
  },
  eventItem: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    padding: spacing.xs,
    backgroundColor: '#f5f5f5', // Light gray background
    borderRadius: 4,
  },
  eventTime: {
    fontSize: 10,
    color: colors.text.secondary,
    marginRight: spacing.sm,
    minWidth: 60,
  },
  eventMessage: {
    fontSize: 12,
    color: colors.text.primary,
    flex: 1,
  },
});
