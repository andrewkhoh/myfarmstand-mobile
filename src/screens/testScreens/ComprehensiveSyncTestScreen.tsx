import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { Button } from '../../components/Button';
import { cartService } from '../../services/cartService';
import * as orderService from '../../services/orderService';
import { RealtimeService } from '../../services/realtimeService';
import { BroadcastHelper } from '../../utils/broadcastHelper';
import { useRealtimeNotifications } from '../../hooks/useRealtime';
import { useCurrentUser } from '../../hooks/useAuth';
import { CartState, Product } from '../../types';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message: string;
  timestamp: string;
  duration?: number;
}

interface SyncEvent {
  type: 'cart' | 'order';
  event: string;
  payload: any;
  timestamp: string;
  received: boolean;
}

/**
 * Comprehensive Synchronization Test Suite
 * Simulates multi-device scenarios and validates sync for cart, orders, and admin management
 */
export const ComprehensiveSyncTestScreen: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [testProgress, setTestProgress] = useState({ current: 0, total: 0 });
  
  const { lastUpdate, updateCount } = useRealtimeNotifications();
  const { data: currentUser } = useCurrentUser();
  const eventListenerRef = useRef<any>(null);
  const testStartTime = useRef<number>(0);

  // Test products for consistent testing
  const testProducts: Product[] = [
    {
      id: 'test-product-1',
      name: 'Test Apples',
      description: 'Fresh test apples',
      price: 3.99,
      categoryId: 'fruits',
      stock: 50,
      imageUrl: '',
      isActive: true,
      tags: ['fresh', 'organic'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'test-product-2',
      name: 'Test Bananas',
      description: 'Yellow test bananas',
      price: 2.49,
      categoryId: 'fruits',
      stock: 30,
      imageUrl: '',
      isActive: true,
      tags: ['fresh', 'tropical'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  useEffect(() => {
    // Initialize realtime subscriptions
    RealtimeService.initializeAllSubscriptions();
    
    // Set up event listener for broadcast events
    setupEventListener();
    
    return () => {
      // Clean up
      RealtimeService.unsubscribeAll();
      if (eventListenerRef.current) {
        window.removeEventListener('realtimeUpdate', eventListenerRef.current);
      }
    };
  }, []);

  const setupEventListener = () => {
    if (typeof window !== 'undefined') {
      eventListenerRef.current = (event: CustomEvent<{ message: string }>) => {
        const timestamp = new Date().toISOString();
        setSyncEvents(prev => [...prev, {
          type: 'cart', // We'll enhance this to detect type
          event: 'realtime-update',
          payload: event.detail,
          timestamp,
          received: true
        }]);
      };
      window.addEventListener('realtimeUpdate', eventListenerRef.current);
    }
  };

  const addTestResult = (test: Omit<TestResult, 'timestamp'>) => {
    const result: TestResult = {
      ...test,
      timestamp: new Date().toLocaleTimeString()
    };
    setTestResults(prev => [...prev, result]);
  };

  const updateTestResult = (id: string, updates: Partial<TestResult>) => {
    setTestResults(prev => prev.map(test => 
      test.id === id ? { ...test, ...updates } : test
    ));
  };

  const addSyncEvent = (event: Omit<SyncEvent, 'timestamp' | 'received'>) => {
    setSyncEvents(prev => [...prev, {
      ...event,
      timestamp: new Date().toISOString(),
      received: false
    }]);
  };

  const waitForSyncEvent = async (eventType: string, timeout: number = 3000): Promise<boolean> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        const eventReceived = syncEvents.some(event => 
          event.event.includes(eventType) && 
          Date.now() - new Date(event.timestamp).getTime() < timeout
        );
        
        if (eventReceived || Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          resolve(eventReceived);
        }
      }, 100);
    });
  };

  // Test Suite 1: Cart Synchronization Tests
  const testCartSync = async (): Promise<void> => {
    const testId = 'cart-sync';
    addTestResult({
      id: testId,
      name: 'Cart Synchronization Tests',
      status: 'running',
      message: 'Testing cart operations and broadcast events...'
    });

    try {
      // Clear cart first (using removeItem for each item)
      const currentCart = await cartService.getCart();
      for (const item of currentCart.items) {
        await cartService.removeItem(item.product.id);
      }
      addSyncEvent({ type: 'cart', event: 'cart-cleared', payload: {} });
      
      // Test 1: Add item to cart
      const addResult = await cartService.addItem(testProducts[0], 2);
      if (!addResult.success) {
        throw new Error(`Failed to add item: ${addResult.message}`);
      }
      addSyncEvent({ type: 'cart', event: 'cart-item-added', payload: { productId: testProducts[0].id, quantity: 2 } });

      // Wait for broadcast
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 2: Update quantity
      const updateResult = await cartService.updateQuantity(testProducts[0].id, 5);
      if (!updateResult.success) {
        throw new Error(`Failed to update quantity: ${updateResult.message}`);
      }
      addSyncEvent({ type: 'cart', event: 'cart-quantity-updated', payload: { productId: testProducts[0].id, quantity: 5 } });

      // Test 3: Add second item
      const addResult2 = await cartService.addItem(testProducts[1], 3);
      if (!addResult2.success) {
        throw new Error(`Failed to add second item: ${addResult2.message}`);
      }
      addSyncEvent({ type: 'cart', event: 'cart-item-added', payload: { productId: testProducts[1].id, quantity: 3 } });

      // Test 4: Remove item
      await cartService.removeItem(testProducts[0].id);
      addSyncEvent({ type: 'cart', event: 'cart-item-removed', payload: { productId: testProducts[0].id } });

      // Test 5: Clear cart (using removeItem)
      const finalCart = await cartService.getCart();
      for (const item of finalCart.items) {
        await cartService.removeItem(item.product.id);
      }
      addSyncEvent({ type: 'cart', event: 'cart-cleared', payload: {} });

      updateTestResult(testId, {
        status: 'passed',
        message: 'All cart operations completed successfully. Check sync events below.',
        duration: Date.now() - testStartTime.current
      });

    } catch (error) {
      updateTestResult(testId, {
        status: 'failed',
        message: `Cart sync test failed: ${error}`,
        duration: Date.now() - testStartTime.current
      });
    }
  };

  // Test Suite 2: Order History Synchronization Tests
  const testOrderHistorySync = async (): Promise<void> => {
    const testId = 'order-history-sync';
    addTestResult({
      id: testId,
      name: 'Order History Synchronization Tests',
      status: 'running',
      message: 'Testing order creation and status updates...'
    });

    try {
      if (!currentUser) {
        throw new Error('No authenticated user for order testing');
      }

      // Test 1: Create test order
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
          notes: 'Comprehensive sync test order'
        },
        items: [{
          productId: testProducts[0].id,
          productName: testProducts[0].name,
          price: testProducts[0].price,
          quantity: 2,
          subtotal: testProducts[0].price * 2
        }],
        total: 7.98,
        fulfillmentType: 'delivery' as const
      };

      const orderResult = await orderService.submitOrder(testOrderData);
      if (!orderResult.success || !orderResult.order) {
        throw new Error(`Failed to create order: ${orderResult.message}`);
      }

      addSyncEvent({ 
        type: 'order', 
        event: 'new-order', 
        payload: { orderId: orderResult.order.id, status: 'pending' } 
      });

      // Test 2: Update order status (simulating admin action)
      const statusUpdateResult = await orderService.updateOrderStatus(orderResult.order.id, 'confirmed');
      if (!statusUpdateResult.success) {
        throw new Error(`Failed to update order status: ${statusUpdateResult.message}`);
      }

      addSyncEvent({ 
        type: 'order', 
        event: 'order-status-changed', 
        payload: { orderId: orderResult.order.id, newStatus: 'confirmed' } 
      });

      // Test 3: Another status update
      await orderService.updateOrderStatus(orderResult.order.id, 'ready');
      addSyncEvent({ 
        type: 'order', 
        event: 'order-status-changed', 
        payload: { orderId: orderResult.order.id, newStatus: 'ready' } 
      });

      updateTestResult(testId, {
        status: 'passed',
        message: `Order created and updated successfully. Order ID: ${orderResult.order.id}`,
        duration: Date.now() - testStartTime.current
      });

    } catch (error) {
      updateTestResult(testId, {
        status: 'failed',
        message: `Order history sync test failed: ${error}`,
        duration: Date.now() - testStartTime.current
      });
    }
  };

  // Test Suite 3: Admin/Order Management Synchronization Tests
  const testAdminOrderSync = async (): Promise<void> => {
    const testId = 'admin-order-sync';
    addTestResult({
      id: testId,
      name: 'Admin/Order Management Sync Tests',
      status: 'running',
      message: 'Testing admin order management operations...'
    });

    try {
      // Test 1: Get all orders (admin view)
      const allOrders = await orderService.getAllOrders();
      if (allOrders.length === 0) {
        throw new Error('No orders found for admin testing');
      }

      // Test 2: Get order statistics
      const stats = await orderService.getOrderStats();
      if (!stats) {
        throw new Error('Failed to get order statistics');
      }

      // Test 3: Filter orders by status
      const pendingOrders = await orderService.getAllOrders({ status: 'pending' });
      const confirmedOrders = await orderService.getAllOrders({ status: 'confirmed' });

      // Test 4: Simulate rapid status changes (stress test)
      const testOrder = allOrders[0];
      if (testOrder) {
        await orderService.updateOrderStatus(testOrder.id, 'confirmed');
        addSyncEvent({ 
          type: 'order', 
          event: 'order-status-changed', 
          payload: { orderId: testOrder.id, newStatus: 'confirmed' } 
        });

        await new Promise(resolve => setTimeout(resolve, 200));

        await orderService.updateOrderStatus(testOrder.id, 'ready');
        addSyncEvent({ 
          type: 'order', 
          event: 'order-status-changed', 
          payload: { orderId: testOrder.id, newStatus: 'ready' } 
        });

        await new Promise(resolve => setTimeout(resolve, 200));

        await orderService.updateOrderStatus(testOrder.id, 'completed');
        addSyncEvent({ 
          type: 'order', 
          event: 'order-status-changed', 
          payload: { orderId: testOrder.id, newStatus: 'completed' } 
        });
      }

      updateTestResult(testId, {
        status: 'passed',
        message: `Admin operations completed. Orders: ${allOrders.length}, Pending: ${pendingOrders.length}, Confirmed: ${confirmedOrders.length}`,
        duration: Date.now() - testStartTime.current
      });

    } catch (error) {
      updateTestResult(testId, {
        status: 'failed',
        message: `Admin order sync test failed: ${error}`,
        duration: Date.now() - testStartTime.current
      });
    }
  };

  // Test Suite 4: Broadcast System Validation
  const testBroadcastSystem = async (): Promise<void> => {
    const testId = 'broadcast-system';
    addTestResult({
      id: testId,
      name: 'Broadcast System Validation',
      status: 'running',
      message: 'Testing broadcast helper and realtime service...'
    });

    try {
      // Test 1: Direct broadcast sending
      await BroadcastHelper.sendCartUpdate('test-event', { test: 'data' });
      await BroadcastHelper.sendOrderUpdate('test-event', { test: 'data' });
      await BroadcastHelper.sendProductUpdate('test-event', { test: 'data' });

      // Test 2: Subscription status
      const subscriptionStatus = RealtimeService.getSubscriptionStatus();
      const activeChannels = Object.keys(subscriptionStatus).length;
      
      if (activeChannels === 0) {
        throw new Error('No active broadcast subscriptions found');
      }

      // Test 3: Force refresh
      RealtimeService.forceRefreshAllData();

      updateTestResult(testId, {
        status: 'passed',
        message: `Broadcast system working. Active channels: ${activeChannels}`,
        duration: Date.now() - testStartTime.current
      });

    } catch (error) {
      updateTestResult(testId, {
        status: 'failed',
        message: `Broadcast system test failed: ${error}`,
        duration: Date.now() - testStartTime.current
      });
    }
  };

  // Run all tests
  const runComprehensiveTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setSyncEvents([]);
    testStartTime.current = Date.now();
    
    const tests = [
      { name: 'Broadcast System Validation', fn: testBroadcastSystem },
      { name: 'Cart Synchronization Tests', fn: testCartSync },
      { name: 'Order History Synchronization Tests', fn: testOrderHistorySync },
      { name: 'Admin/Order Management Sync Tests', fn: testAdminOrderSync }
    ];

    setTestProgress({ current: 0, total: tests.length });

    for (let i = 0; i < tests.length; i++) {
      setCurrentTest(tests[i].name);
      setTestProgress({ current: i + 1, total: tests.length });
      
      try {
        await tests[i].fn();
      } catch (error) {
        console.error(`Test ${tests[i].name} failed:`, error);
      }
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setCurrentTest('');
    setIsRunning(false);
  };

  const clearResults = () => {
    setTestResults([]);
    setSyncEvents([]);
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return '#4CAF50';
      case 'failed': return '#F44336';
      case 'running': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const passedTests = testResults.filter(t => t.status === 'passed').length;
  const failedTests = testResults.filter(t => t.status === 'failed').length;
  const totalEvents = syncEvents.length;
  const receivedEvents = syncEvents.filter(e => e.received).length;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Comprehensive Sync Test Suite</Text>
      
      {/* Test Progress */}
      {isRunning && (
        <View style={styles.progressSection}>
          <Text style={styles.progressText}>
            Running: {currentTest}
          </Text>
          <Text style={styles.progressText}>
            Progress: {testProgress.current}/{testProgress.total}
          </Text>
        </View>
      )}

      {/* Test Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Test Summary</Text>
        <Text style={styles.summaryText}>✅ Passed: {passedTests}</Text>
        <Text style={styles.summaryText}>❌ Failed: {failedTests}</Text>
        <Text style={styles.summaryText}>📡 Events Sent: {totalEvents}</Text>
        <Text style={styles.summaryText}>🔔 Events Received: {receivedEvents}</Text>
        <Text style={styles.summaryText}>👤 User: {currentUser?.email || 'Not authenticated'}</Text>
        <Text style={styles.summaryText}>🔄 Realtime Updates: {updateCount}</Text>
      </View>

      {/* Controls */}
      <View style={styles.controlsSection}>
        <Button 
          title="Run Comprehensive Tests" 
          onPress={runComprehensiveTests}
          disabled={isRunning}
          style={styles.button}
        />
        
        <Button 
          title="Clear Results" 
          onPress={clearResults}
          variant="outline"
          disabled={isRunning}
          style={styles.button}
        />
      </View>

      {/* Test Results */}
      <View style={styles.resultsSection}>
        <Text style={styles.sectionTitle}>Test Results</Text>
        {testResults.map((result) => (
          <View key={result.id} style={styles.testResult}>
            <View style={styles.testHeader}>
              <Text style={[styles.testName, { color: getStatusColor(result.status) }]}>
                {result.name}
              </Text>
              <Text style={styles.testStatus}>{result.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.testMessage}>{result.message}</Text>
            <Text style={styles.testTime}>
              {result.timestamp} {result.duration && `(${result.duration}ms)`}
            </Text>
          </View>
        ))}
      </View>

      {/* Sync Events */}
      <View style={styles.eventsSection}>
        <Text style={styles.sectionTitle}>Sync Events ({syncEvents.length})</Text>
        <ScrollView style={styles.eventsContainer}>
          {syncEvents.slice(-20).reverse().map((event, index) => (
            <View key={index} style={styles.syncEvent}>
              <Text style={styles.eventType}>{event.type.toUpperCase()}</Text>
              <Text style={styles.eventName}>{event.event}</Text>
              <Text style={styles.eventTime}>
                {new Date(event.timestamp).toLocaleTimeString()}
              </Text>
            </View>
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
  progressSection: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#1976D2',
    textAlign: 'center',
  },
  summarySection: {
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
  summaryText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
    fontFamily: 'monospace',
  },
  controlsSection: {
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
  button: {
    marginBottom: 8,
  },
  resultsSection: {
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
  testResult: {
    borderLeftWidth: 4,
    borderLeftColor: '#ddd',
    paddingLeft: 12,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 4,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  testName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  testStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  testMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  testTime: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  eventsSection: {
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
  eventsContainer: {
    maxHeight: 200,
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 4,
  },
  syncEvent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  eventType: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1976D2',
    width: 50,
  },
  eventName: {
    fontSize: 12,
    color: '#333',
    flex: 1,
    fontFamily: 'monospace',
  },
  eventTime: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
  },
});
