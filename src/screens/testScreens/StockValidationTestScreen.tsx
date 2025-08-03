import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../contexts/CartContext';
import { Product } from '../../types';

export const StockValidationTestScreen: React.FC = () => {
  const { addItem, updateQuantity, clearCart, items, total } = useCart();
  const [testResults, setTestResults] = useState<string[]>([]);

  // Test products with different stock scenarios
  const testProducts: Product[] = [
    {
      id: 'stock-test-1',
      name: 'Limited Stock Apples',
      description: 'Only 3 in stock',
      price: 2.99,
      stock: 3,
      categoryId: 'fruits',
      isActive: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'stock-test-2',
      name: 'Out of Stock Bananas',
      description: 'No stock available',
      price: 1.99,
      stock: 0,
      categoryId: 'fruits',
      isActive: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'preorder-test-1',
      name: 'Pre-order Strawberries',
      description: 'Available for pre-order',
      price: 4.99,
      stock: 0,
      categoryId: 'fruits',
      isActive: true,
      isPreOrder: true,
      preOrderAvailableDate: '2024-03-01',
      minPreOrderQuantity: 2,
      maxPreOrderQuantity: 10,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'preorder-test-2',
      name: 'Pre-order Seasonal Box',
      description: 'Seasonal produce box',
      price: 29.99,
      stock: 0,
      categoryId: 'bundles',
      isActive: true,
      isPreOrder: true,
      preOrderAvailableDate: '2024-04-01',
      minPreOrderQuantity: 1,
      maxPreOrderQuantity: 5,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  // Test 1: Stock Validation - Normal Stock
  const testNormalStock = async () => {
    try {
      // Clear cart first to ensure clean state
      await clearCart();
      await new Promise(resolve => setTimeout(resolve, 100)); // Allow state to update
      
      const product = testProducts[0]; // Limited Stock Apples (3 in stock)
      
      // Try to add 2 items (should succeed)
      const result1 = await addItem(product, 2);
      addTestResult(`Add 2 ${product.name}: ${result1.success ? 'SUCCESS' : `FAILED - ${result1.message}`}`);
      
      // Wait for state update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try to add 2 more items (should fail - would exceed stock of 3)
      const result2 = await addItem(product, 2);
      addTestResult(`Add 2 more ${product.name}: ${result2.success ? 'UNEXPECTED SUCCESS' : `CORRECTLY FAILED - ${result2.message}`}`);
      
    } catch (error) {
      addTestResult(`Normal Stock Test Error: ${error}`);
    }
  };

  // Test 2: Out of Stock Validation
  const testOutOfStock = async () => {
    try {
      // Clear cart first
      clearCart();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const product = testProducts[1]; // Out of Stock Bananas
      
      const result = await addItem(product, 1);
      addTestResult(`Add out of stock ${product.name}: ${result.success ? 'UNEXPECTED SUCCESS' : `CORRECTLY FAILED - ${result.message}`}`);
      
    } catch (error) {
      addTestResult(`Out of Stock Test Error: ${error}`);
    }
  };

  // Test 3: Pre-order Minimum Quantity
  const testPreOrderMinimum = async () => {
    try {
      // Clear cart first
      clearCart();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const product = testProducts[2]; // Pre-order Strawberries (min: 2)
      
      // Try to add 1 item (should fail - below minimum)
      const result1 = await addItem(product, 1);
      addTestResult(`Add 1 ${product.name} (min 2): ${result1.success ? 'UNEXPECTED SUCCESS' : `CORRECTLY FAILED - ${result1.message}`}`);
      
      // Try to add 2 items (should succeed)
      const result2 = await addItem(product, 2);
      addTestResult(`Add 2 ${product.name} (min 2): ${result2.success ? 'SUCCESS' : `FAILED - ${result2.message}`}`);
      
    } catch (error) {
      addTestResult(`Pre-order Minimum Test Error: ${error}`);
    }
  };

  // Test 4: Pre-order Maximum Quantity
  const testPreOrderMaximum = async () => {
    try {
      const product = testProducts[2]; // Pre-order Strawberries (max: 10)
      
      // Clear cart first
      clearCart();
      
      // Try to add 12 items (should fail - exceeds maximum)
      const result1 = await addItem(product, 12);
      addTestResult(`Add 12 ${product.name} (max 10): ${result1.success ? 'UNEXPECTED SUCCESS' : `CORRECTLY FAILED - ${result1.message}`}`);
      
      // Try to add 5 items (should succeed)
      const result2 = await addItem(product, 5);
      addTestResult(`Add 5 ${product.name} (max 10): ${result2.success ? 'SUCCESS' : `FAILED - ${result2.message}`}`);
      
    } catch (error) {
      addTestResult(`Pre-order Maximum Test Error: ${error}`);
    }
  };

  // Test 5: Quantity Update Validation
  const testQuantityUpdate = async () => {
    try {
      const product = testProducts[0]; // Limited Stock Apples (3 in stock)
      
      // Clear cart and add 1 item
      await clearCart();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const addResult = await addItem(product, 1);
      addTestResult(`Setup: Add 1 ${product.name}: ${addResult.success ? 'SUCCESS' : `FAILED - ${addResult.message}`}`);
      
      // Wait for state update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try to update to 5 (should fail - exceeds stock)
      const result1 = await updateQuantity(product.id, 5);
      addTestResult(`Update ${product.name} to 5 (stock: 3): ${result1.success ? 'UNEXPECTED SUCCESS' : `CORRECTLY FAILED - ${result1.message}`}`);
      
      // Try to update to 3 (should succeed)
      const result2 = await updateQuantity(product.id, 3);
      addTestResult(`Update ${product.name} to 3 (stock: 3): ${result2.success ? 'SUCCESS' : `FAILED - ${result2.message}`}`);
      
    } catch (error) {
      addTestResult(`Quantity Update Test Error: ${error}`);
    }
  };

  // Test 6: Combined Stock and Pre-order Validation
  const testCombinedValidation = async () => {
    try {
      // Properly clear cart and wait for state update
      await clearCart();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Add regular stock item
      const stockProduct = testProducts[0];
      const result1 = await addItem(stockProduct, 2);
      addTestResult(`Add regular stock item: ${result1.success ? 'SUCCESS' : `FAILED - ${result1.message}`}`);
      
      // Wait for state update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Add pre-order item
      const preOrderProduct = testProducts[3];
      const result2 = await addItem(preOrderProduct, 1);
      addTestResult(`Add pre-order item: ${result2.success ? 'SUCCESS' : `FAILED - ${result2.message}`}`);
      
      addTestResult(`Cart total: $${total.toFixed(2)} with ${items.length} different products`);
      
    } catch (error) {
      addTestResult(`Combined Validation Test Error: ${error}`);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    clearTestResults();
    addTestResult('=== Starting Stock Validation Tests ===');
    
    await testNormalStock();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testOutOfStock();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testPreOrderMinimum();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testPreOrderMaximum();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testQuantityUpdate();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testCombinedValidation();
    
    addTestResult('=== All Tests Completed ===');
  };

  const setupTestData = async () => {
    await clearCart();
    addTestResult('Cart cleared and ready for testing');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Stock Validation & Pre-order Tests</Text>
        <Text style={styles.subtitle}>
          Tests stock validation, pre-order limits, and cart persistence
        </Text>

        {/* Cart Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Cart Status</Text>
          <Text style={styles.statusText}>Items: {items.length}</Text>
          <Text style={styles.statusText}>Total: ${total.toFixed(2)}</Text>
        </View>

        {/* Test Products Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Products</Text>
          {testProducts.map((product, index) => (
            <View key={product.id} style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productDetails}>
                Stock: {product.stock} | Price: ${product.price}
                {product.isPreOrder && ` | Pre-order (${product.minPreOrderQuantity}-${product.maxPreOrderQuantity})`}
              </Text>
            </View>
          ))}
        </View>

        {/* Individual Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Individual Tests</Text>
          
          <TouchableOpacity style={styles.testButton} onPress={testNormalStock}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.testButtonText}>Test Normal Stock Validation</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.testButton} onPress={testOutOfStock}>
            <Ionicons name="close-circle" size={20} color="#F44336" />
            <Text style={styles.testButtonText}>Test Out of Stock</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.testButton} onPress={testPreOrderMinimum}>
            <Ionicons name="arrow-up-circle" size={20} color="#FF9800" />
            <Text style={styles.testButtonText}>Test Pre-order Minimum</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.testButton} onPress={testPreOrderMaximum}>
            <Ionicons name="arrow-down-circle" size={20} color="#FF9800" />
            <Text style={styles.testButtonText}>Test Pre-order Maximum</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.testButton} onPress={testQuantityUpdate}>
            <Ionicons name="refresh-circle" size={20} color="#2196F3" />
            <Text style={styles.testButtonText}>Test Quantity Update</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.testButton} onPress={testCombinedValidation}>
            <Ionicons name="layers" size={20} color="#9C27B0" />
            <Text style={styles.testButtonText}>Test Combined Validation</Text>
          </TouchableOpacity>
        </View>

        {/* Batch Operations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Batch Operations</Text>
          
          <TouchableOpacity style={styles.batchButton} onPress={runAllTests}>
            <Ionicons name="play-circle" size={24} color="#4CAF50" />
            <Text style={styles.batchButtonText}>Run All Tests</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.utilityButton} onPress={setupTestData}>
            <Ionicons name="refresh" size={20} color="#2196F3" />
            <Text style={styles.utilityButtonText}>Setup Test Data</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.utilityButton} onPress={clearTestResults}>
            <Ionicons name="trash" size={20} color="#F44336" />
            <Text style={styles.utilityButtonText}>Clear Results</Text>
          </TouchableOpacity>
        </View>

        {/* Test Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          <View style={styles.resultsContainer}>
            {testResults.length === 0 ? (
              <Text style={styles.noResults}>No test results yet</Text>
            ) : (
              testResults.map((result, index) => (
                <Text key={index} style={styles.resultText}>
                  {result}
                </Text>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  productInfo: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productDetails: {
    fontSize: 14,
    color: '#666',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  testButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  batchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  batchButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  utilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  utilityButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  resultsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    minHeight: 200,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noResults: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
});


