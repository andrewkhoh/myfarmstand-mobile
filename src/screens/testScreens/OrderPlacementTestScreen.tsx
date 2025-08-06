import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useCart } from '../../hooks/useCart';
import { submitOrder, clearMockOrders } from '../../services/orderService';
import { CreateOrderRequest, CustomerInfo, FulfillmentType, OrderItem } from '../../types';

export const OrderPlacementTestScreen: React.FC = () => {
  const { items, addItem, clearCart } = useCart();
  const [testResults, setTestResults] = useState<string[]>([]);
  const itemsRef = useRef(items);
  
  // Keep ref updated with current items
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Test data
  const testCustomerInfo: CustomerInfo = {
    name: 'John Test',
    email: 'john.test@example.com',
    phone: '555-0123',
    address: '123 Test Street, Test City, TC 12345',
  };

  const testProducts = [
    {
      id: '1',
      name: 'Test Apples',
      description: 'Fresh test apples',
      price: 3.99,
      stock: 10,
      categoryId: '1',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Test Bananas',
      description: 'Ripe test bananas',
      price: 2.49,
      stock: 15,
      categoryId: '1',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Order submission mutation
  const orderMutation = useMutation({
    mutationFn: submitOrder,
    onSuccess: (result) => {
      if (result.success && result.order) {
        addTestResult(`✅ Order submitted successfully: ${result.order.id}`);
        addTestResult(`   Total: $${result.order.total.toFixed(2)}`);
        addTestResult(`   Status: ${result.order.status}`);
        addTestResult(`   Items: ${result.order.items.length}`);
      } else {
        addTestResult(`❌ Order submission failed: ${result.error}`);
      }
    },
    onError: (error) => {
      addTestResult(`❌ Order submission error: ${error.message}`);
    },
  });

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, result]);
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  // Convert cart items to order items (using ref for current state)
  const convertCartToOrderItems = (): OrderItem[] => {
    return itemsRef.current.map(cartItem => ({
      productId: cartItem.product.id,
      productName: cartItem.product.name,
      price: cartItem.product.price,
      quantity: cartItem.quantity,
      subtotal: cartItem.product.price * cartItem.quantity,
    }));
  };

  // Test 1: Basic Order Submission (Pickup)
  const testBasicPickupOrder = async () => {
    try {
      addTestResult('=== Test 1: Basic Pickup Order ===');
      
      // Clear cart and add test items
      await clearCart();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      await addItem(testProducts[0], 2);
      await new Promise(resolve => setTimeout(resolve, 200));
      await addItem(testProducts[1], 1);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      addTestResult(`Cart setup: ${itemsRef.current.length} items`);
      
      if (itemsRef.current.length === 0) {
        addTestResult('❌ Cart is still empty after adding items');
        return;
      }
      
      const orderRequest: CreateOrderRequest = {
        customerInfo: testCustomerInfo,
        items: convertCartToOrderItems(),
        fulfillmentType: 'pickup',
        notes: 'Test pickup order',
      };
      
      addTestResult(`Order items: ${orderRequest.items.length}`);
      orderMutation.mutate(orderRequest);
      
    } catch (error) {
      addTestResult(`❌ Test 1 Error: ${error}`);
    }
  };

  // Test 2: Delivery Order
  const testDeliveryOrder = async () => {
    try {
      addTestResult('=== Test 2: Delivery Order ===');
      
      // Clear cart and add test items
      await clearCart();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      await addItem(testProducts[0], 1);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      addTestResult(`Cart setup: ${itemsRef.current.length} items`);
      
      if (itemsRef.current.length === 0) {
        addTestResult('❌ Cart is still empty after adding items');
        return;
      }
      
      const orderRequest: CreateOrderRequest = {
        customerInfo: testCustomerInfo,
        items: convertCartToOrderItems(),
        fulfillmentType: 'delivery',
        deliveryAddress: '456 Delivery Lane, Delivery City, DC 67890',
        notes: 'Test delivery order - leave at door',
      };
      
      orderMutation.mutate(orderRequest);
      
    } catch (error) {
      addTestResult(`❌ Test 2 Error: ${error}`);
    }
  };

  // Test 3: Validation - Empty Cart
  const testEmptyCartValidation = async () => {
    try {
      addTestResult('=== Test 3: Empty Cart Validation ===');
      
      // Clear cart
      await clearCart();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const orderRequest: CreateOrderRequest = {
        customerInfo: testCustomerInfo,
        items: [], // Empty items array
        fulfillmentType: 'pickup',
      };
      
      orderMutation.mutate(orderRequest);
      
    } catch (error) {
      addTestResult(`❌ Test 3 Error: ${error}`);
    }
  };

  // Test 4: Validation - Missing Customer Info
  const testMissingCustomerInfo = async () => {
    try {
      addTestResult('=== Test 4: Missing Customer Info Validation ===');
      
      // Setup cart
      await clearCart();
      await new Promise(resolve => setTimeout(resolve, 200));
      await addItem(testProducts[0], 1);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      addTestResult(`Cart setup: ${itemsRef.current.length} items`);
      
      const incompleteCustomerInfo: CustomerInfo = {
        name: '', // Missing name
        email: testCustomerInfo.email,
        phone: testCustomerInfo.phone,
      };
      
      const orderRequest: CreateOrderRequest = {
        customerInfo: incompleteCustomerInfo,
        items: convertCartToOrderItems(),
        fulfillmentType: 'pickup',
      };
      
      orderMutation.mutate(orderRequest);
      
    } catch (error) {
      addTestResult(`❌ Test 4 Error: ${error}`);
    }
  };

  // Test 5: Validation - Delivery Without Address
  const testDeliveryWithoutAddress = async () => {
    try {
      addTestResult('=== Test 5: Delivery Without Address Validation ===');
      
      // Setup cart
      await clearCart();
      await new Promise(resolve => setTimeout(resolve, 200));
      await addItem(testProducts[0], 1);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      addTestResult(`Cart setup: ${itemsRef.current.length} items`);
      
      const orderRequest: CreateOrderRequest = {
        customerInfo: testCustomerInfo,
        items: convertCartToOrderItems(),
        fulfillmentType: 'delivery',
        // Missing deliveryAddress
      };
      
      orderMutation.mutate(orderRequest);
      
    } catch (error) {
      addTestResult(`❌ Test 5 Error: ${error}`);
    }
  };

  // Test 6: Tax Calculation Verification
  const testTaxCalculation = async () => {
    try {
      addTestResult('=== Test 6: Tax Calculation Verification ===');
      
      // Setup cart with known values
      await clearCart();
      await new Promise(resolve => setTimeout(resolve, 200));
      await addItem(testProducts[0], 1); // $3.99
      await new Promise(resolve => setTimeout(resolve, 200));
      
      addTestResult(`Cart setup: ${itemsRef.current.length} items`);
      
      if (itemsRef.current.length === 0) {
        addTestResult('❌ Cart is still empty after adding items');
        return;
      }
      
      const orderRequest: CreateOrderRequest = {
        customerInfo: testCustomerInfo,
        items: convertCartToOrderItems(),
        fulfillmentType: 'pickup',
      };
      
      // Calculate expected values
      const expectedSubtotal = 3.99;
      const expectedTax = Math.round(expectedSubtotal * 0.085 * 100) / 100;
      const expectedTotal = expectedSubtotal + expectedTax;
      
      addTestResult(`Expected: Subtotal=$${expectedSubtotal}, Tax=$${expectedTax}, Total=$${expectedTotal}`);
      
      orderMutation.mutate(orderRequest);
      
    } catch (error) {
      addTestResult(`❌ Test 6 Error: ${error}`);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    clearTestResults();
    clearMockOrders();
    
    addTestResult('🧪 Starting Order Placement Tests...');
    addTestResult('');
    
    // Run tests sequentially with delays
    await testBasicPickupOrder();
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await testDeliveryOrder();
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await testEmptyCartValidation();
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await testMissingCustomerInfo();
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await testDeliveryWithoutAddress();
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await testTaxCalculation();
    
    addTestResult('');
    addTestResult('=== All Tests Completed ===');
  };

  const setupTestData = async () => {
    await clearCart();
    clearMockOrders();
    addTestResult('Test environment reset');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Order Placement Test Screen</Text>
      <Text style={styles.subtitle}>
        Test order submission, validation, and React Query integration
      </Text>

      {/* Test Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Controls</Text>
        
        <TouchableOpacity style={styles.button} onPress={setupTestData}>
          <Text style={styles.buttonText}>🔄 Reset Test Environment</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={runAllTests}>
          <Text style={styles.buttonText}>🧪 Run All Tests</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.clearButton} onPress={clearTestResults}>
          <Text style={styles.clearButtonText}>🗑️ Clear Results</Text>
        </TouchableOpacity>
      </View>

      {/* Individual Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Individual Tests</Text>
        
        <TouchableOpacity style={styles.testButton} onPress={testBasicPickupOrder}>
          <Text style={styles.testButtonText}>Test 1: Basic Pickup Order</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={testDeliveryOrder}>
          <Text style={styles.testButtonText}>Test 2: Delivery Order</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={testEmptyCartValidation}>
          <Text style={styles.testButtonText}>Test 3: Empty Cart Validation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={testMissingCustomerInfo}>
          <Text style={styles.testButtonText}>Test 4: Missing Customer Info</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={testDeliveryWithoutAddress}>
          <Text style={styles.testButtonText}>Test 5: Delivery Without Address</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={testTaxCalculation}>
          <Text style={styles.testButtonText}>Test 6: Tax Calculation</Text>
        </TouchableOpacity>
      </View>

      {/* Current Cart Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Cart Status</Text>
        <Text style={styles.statusText}>Items: {items.length}</Text>
        <Text style={styles.statusText}>
          Total: ${items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0).toFixed(2)}
        </Text>
        {orderMutation.isPending && (
          <Text style={styles.statusText}>🔄 Order submission in progress...</Text>
        )}
      </View>

      {/* Test Results */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Results</Text>
        <View style={styles.resultsContainer}>
          {testResults.map((result, index) => (
            <Text key={index} style={styles.resultText}>
              {result}
            </Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    padding: 20,
    paddingBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
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
    color: '#333',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#2e7d32',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#d32f2f',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#1976d2',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  resultsContainer: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 6,
    minHeight: 100,
  },
  resultText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});
