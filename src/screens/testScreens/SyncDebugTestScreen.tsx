import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { Button } from '../../components/Button';
import { cartService } from '../../services/cartService';
import * as orderService from '../../services/orderService';
import { RealtimeService } from '../../services/realtimeService';
import { useRealtimeNotifications } from '../../hooks/useRealtime';
import { useCurrentUser } from '../../hooks/useAuth';
import { CartState } from '../../types';

/**
 * Comprehensive Synchronization Debug Test Screen
 * Tests cart sync, order sync, and broadcast events across devices
 */
export const SyncDebugTestScreen: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [cartState, setCartState] = useState<CartState>({ items: [], total: 0 });
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>({});
  const [isRunning, setIsRunning] = useState(false);
  
  const { lastUpdate, updateCount } = useRealtimeNotifications();
  const { data: currentUser } = useCurrentUser();

  useEffect(() => {
    // Initialize realtime subscriptions
    RealtimeService.initializeAllSubscriptions();
    
    // Get initial cart state
    loadCartState();
    
    // Check subscription status
    updateSubscriptionStatus();
    
    return () => {
      // Clean up on unmount
      RealtimeService.unsubscribeAll();
    };
  }, []);

  const addTestResult = (result: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, `[${timestamp}] ${result}`]);
  };

  const loadCartState = async () => {
    try {
      const cart = await cartService.getCart();
      setCartState(cart);
      addTestResult(`✅ Cart loaded: ${cart.items.length} items, total: $${cart.total.toFixed(2)}`);
    } catch (error) {
      addTestResult(`❌ Failed to load cart: ${error}`);
    }
  };

  const updateSubscriptionStatus = () => {
    const status = RealtimeService.getSubscriptionStatus();
    setSubscriptionStatus(status);
    addTestResult(`📡 Subscription status updated: ${Object.keys(status).length} channels`);
  };

  // Test 1: Cart Broadcast Events
  const testCartBroadcast = async () => {
    setIsRunning(true);
    addTestResult('🧪 Testing Cart Broadcast Events...');
    
    try {
      // Test product for cart operations
      const testProduct = {
        id: 'test-product-sync',
        name: 'Sync Test Product',
        description: 'Product for testing sync',
        price: 5.99,
        category: 'test',
        categoryId: 'test-category',
        stock: 10,
        imageUrl: '',
        isAvailable: true,
        isActive: true,
        tags: ['test'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Test adding item
      addTestResult('🔄 Testing cart add item...');
      const addResult = await cartService.addItem(testProduct, 2);
      if (addResult.success) {
        addTestResult('✅ Cart add item successful - broadcast should be sent');
        setCartState(addResult.cart);
      } else {
        addTestResult(`❌ Cart add item failed: ${addResult.message}`);
      }

      // Wait for broadcast
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test updating quantity
      addTestResult('🔄 Testing cart update quantity...');
      const updateResult = await cartService.updateQuantity(testProduct.id, 3);
      if (updateResult.success) {
        addTestResult('✅ Cart update quantity successful - broadcast should be sent');
        setCartState(updateResult.cart);
      } else {
        addTestResult(`❌ Cart update quantity failed: ${updateResult.message}`);
      }

      // Wait for broadcast
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test removing item
      addTestResult('🔄 Testing cart remove item...');
      const removeResult = await cartService.removeItem(testProduct.id);
      addTestResult('✅ Cart remove item successful - broadcast should be sent');
      setCartState(removeResult);

    } catch (error) {
      addTestResult(`❌ Cart broadcast test failed: ${error}`);
    }
    
    setIsRunning(false);
  };

  // Test 2: Order Broadcast Events
  const testOrderBroadcast = async () => {
    setIsRunning(true);
    addTestResult('🧪 Testing Order Broadcast Events...');
    
    try {
      if (!currentUser) {
        addTestResult('❌ No authenticated user - cannot test order broadcast');
        setIsRunning(false);
        return;
      }

      // Create a test order
      const testOrderData = {
        customerInfo: {
          name: 'Test User',
          email: currentUser.email || 'test@example.com',
          phone: '555-0123'
        },
        deliveryInfo: {
          address: '123 Test St, Test City, TC 12345',
          deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          deliveryTime: '10:00',
          notes: 'Test order for sync testing'
        },
        items: [{
          product: {
            id: 'test-sync-product',
            name: 'Sync Test Product',
            price: 9.99,
            description: 'Test product',
            category: 'test',
            categoryId: 'test-category',
            stock: 5,
            imageUrl: '',
            isAvailable: true,
            isActive: true,
            tags: ['test'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          quantity: 1
        }],
        total: 10.99
      };

      addTestResult('🔄 Submitting test order...');
      const orderResult = await orderService.submitOrder(testOrderData);
      
      if (orderResult.success && orderResult.order) {
        addTestResult(`✅ Order submitted successfully - broadcast should be sent (Order ID: ${orderResult.order.id})`);
        
        // Wait for broadcast
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test order status update
        addTestResult('🔄 Testing order status update...');
        const statusResult = await orderService.updateOrderStatus(orderResult.order.id, 'confirmed');
        
        if (statusResult.success) {
          addTestResult('✅ Order status updated - broadcast should be sent');
        } else {
          addTestResult(`❌ Order status update failed: ${statusResult.message}`);
        }
      } else {
        addTestResult(`❌ Order submission failed: ${orderResult.message}`);
      }

    } catch (error) {
      addTestResult(`❌ Order broadcast test failed: ${error}`);
    }
    
    setIsRunning(false);
  };

  // Test 3: Realtime Subscription Status
  const testRealtimeStatus = () => {
    addTestResult('🧪 Testing Realtime Subscription Status...');
    
    const status = RealtimeService.getSubscriptionStatus();
    addTestResult(`📊 Active subscriptions: ${Object.keys(status).length}`);
    
    Object.entries(status).forEach(([channel, channelStatus]) => {
      addTestResult(`📡 ${channel}: ${channelStatus}`);
    });
    
    if (lastUpdate) {
      addTestResult(`🔔 Last update: ${lastUpdate} (Count: ${updateCount})`);
    } else {
      addTestResult('🔕 No realtime updates received yet');
    }
  };

  // Test 4: Force Refresh All Data
  const testForceRefresh = async () => {
    addTestResult('🧪 Testing Force Refresh...');
    
    try {
      RealtimeService.forceRefreshAllData();
      addTestResult('✅ Force refresh triggered');
      
      // Reload cart state
      await loadCartState();
      
    } catch (error) {
      addTestResult(`❌ Force refresh failed: ${error}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runAllTests = async () => {
    clearResults();
    addTestResult('🚀 Starting comprehensive sync tests...');
    
    testRealtimeStatus();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testCartBroadcast();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testOrderBroadcast();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testForceRefresh();
    
    addTestResult('🏁 All tests completed!');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Synchronization Debug Test</Text>
      
      {/* Current Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Status</Text>
        <Text style={styles.info}>User: {currentUser?.email || 'Not authenticated'}</Text>
        <Text style={styles.info}>Cart Items: {cartState.items.length}</Text>
        <Text style={styles.info}>Cart Total: ${cartState.total.toFixed(2)}</Text>
        <Text style={styles.info}>Realtime Updates: {updateCount}</Text>
        <Text style={styles.info}>Last Update: {lastUpdate || 'None'}</Text>
      </View>

      {/* Subscription Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription Status</Text>
        {Object.entries(subscriptionStatus).map(([channel, status]) => (
          <Text key={channel} style={styles.info}>
            {channel}: {String(status)}
          </Text>
        ))}
      </View>

      {/* Test Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Controls</Text>
        
        <Button 
          title="Run All Tests" 
          onPress={runAllTests}
          disabled={isRunning}
          style={styles.button}
        />
        
        <Button 
          title="Test Cart Broadcast" 
          onPress={testCartBroadcast}
          disabled={isRunning}
          variant="outline"
          style={styles.button}
        />
        
        <Button 
          title="Test Order Broadcast" 
          onPress={testOrderBroadcast}
          disabled={isRunning}
          variant="outline"
          style={styles.button}
        />
        
        <Button 
          title="Test Realtime Status" 
          onPress={testRealtimeStatus}
          variant="outline"
          style={styles.button}
        />
        
        <Button 
          title="Force Refresh" 
          onPress={testForceRefresh}
          variant="outline"
          style={styles.button}
        />
        
        <Button 
          title="Update Status" 
          onPress={updateSubscriptionStatus}
          variant="ghost"
          style={styles.button}
        />
        
        <Button 
          title="Clear Results" 
          onPress={clearResults}
          variant="ghost"
          style={styles.button}
        />
      </View>

      {/* Test Results */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Results</Text>
        <ScrollView style={styles.resultsContainer}>
          {testResults.map((result, index) => (
            <Text key={index} style={styles.result}>
              {result}
            </Text>
          ))}
        </ScrollView>
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
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  info: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
    fontFamily: 'monospace',
  },
  button: {
    marginBottom: 8,
  },
  resultsContainer: {
    maxHeight: 300,
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  result: {
    fontSize: 12,
    marginBottom: 2,
    color: '#333',
    fontFamily: 'monospace',
  },
});
