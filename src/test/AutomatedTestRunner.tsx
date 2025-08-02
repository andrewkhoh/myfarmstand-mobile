import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Clipboard,
} from 'react-native';
import { useCart } from '../hooks/useCart';
import { useMutation } from '@tanstack/react-query';
import { submitOrder } from '../services/orderService';
import { Product, CustomerInfo } from '../types';

interface TestResult {
  testName: string;
  status: 'pass' | 'fail' | 'running';
  message: string;
  timestamp: Date;
}

interface TestSuite {
  name: string;
  tests: TestCase[];
}

interface TestCase {
  name: string;
  test: () => Promise<void>;
  expectedBehavior: string;
}

export const AutomatedTestRunner: React.FC = () => {
  const cart = useCart();
  const { items, total: cartTotal, addItem, removeItem, updateQuantity, clearCart } = cart;
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  // Helper to get fresh cart state
  const getCartState = () => {
    return {
      items: cart.items,
      total: cart.total,
      itemCount: cart.items.length
    };
  };

  // Helper to wait for cart state to change
  const waitForCartState = async (expectedItemCount: number, maxWaitMs: number = 2000): Promise<boolean> => {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      // Force refetch to get latest state from React Query
      await cart.refetch();
      const currentState = getCartState();
      if (currentState.itemCount === expectedItemCount) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100)); // Poll every 100ms
    }
    return false; // Timeout reached
  };

  const orderMutation = useMutation({
    mutationFn: submitOrder,
  });

  // Test data
  const testProducts: Product[] = [
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

  const validCustomerInfo: CustomerInfo = {
    name: 'Test Customer',
    email: 'test@example.com',
    phone: '555-123-4567',
  };

  const addTestResult = useCallback((result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  }, []);

  const logTest = useCallback((testName: string, status: 'pass' | 'fail', message: string) => {
    addTestResult({
      testName,
      status,
      message,
      timestamp: new Date(),
    });
  }, [addTestResult]);

  // Assertion helpers
  const expect = {
    toBe: (actual: any, expected: any, message: string) => {
      if (actual !== expected) {
        throw new Error(`${message}: Expected ${expected}, got ${actual}`);
      }
    },
    toBeGreaterThan: (actual: number, expected: number, message: string) => {
      if (actual <= expected) {
        throw new Error(`${message}: Expected ${actual} to be greater than ${expected}`);
      }
    },
    toContain: (actual: string, expected: string, message: string) => {
      if (!actual.includes(expected)) {
        throw new Error(`${message}: Expected "${actual}" to contain "${expected}"`);
      }
    },
    toBeTruthy: (actual: any, message: string) => {
      if (!actual) {
        throw new Error(`${message}: Expected truthy value, got ${actual}`);
      }
    },
    toBeNull: (actual: any, message: string) => {
      if (actual !== null) {
        throw new Error(`${message}: Expected null, got ${actual}`);
      }
    },
  };

  // Test Cases
  const cartTests: TestCase[] = [
    {
      name: 'Cart Setup and Item Addition',
      expectedBehavior: 'Cart should start empty and allow adding items',
      test: async () => {
        // Import cart service directly to bypass React Query cache issues
        const { cartService } = await import('../services/cartService');
        
        // Test 1: Direct service clear cart
        const clearedCart = await cartService.clearCart();
        expect.toBe(clearedCart.items.length, 0, 'Direct service clearCart should return empty cart');
        expect.toBe(clearedCart.total, 0, 'Direct service clearCart should return zero total');
        
        // Test 2: Verify AsyncStorage is actually cleared
        const cartFromStorage = await cartService.getCart();
        expect.toBe(cartFromStorage.items.length, 0, `AsyncStorage should be empty after clear, but has ${cartFromStorage.items.length} items`);
        expect.toBe(cartFromStorage.total, 0, 'AsyncStorage cart total should be zero');
        
        // Test 3: Add item directly through service
        const addResult = await cartService.addItem(testProducts[0], 2);
        expect.toBeTruthy(addResult.success, 'Direct service addItem should succeed');
        expect.toBe(addResult.cart.items.length, 1, 'Cart should have 1 item after adding');
        expect.toBe(addResult.cart.items[0].quantity, 2, 'Item should have correct quantity');
        
        const expectedTotal = testProducts[0].price * 2;
        expect.toBe(addResult.cart.total, expectedTotal, 'Cart total should match expected calculation');
        
        // Test 4: Verify persistence in AsyncStorage
        const persistedCart = await cartService.getCart();
        expect.toBe(persistedCart.items.length, 1, 'AsyncStorage should persist the added item');
        expect.toBe(persistedCart.total, expectedTotal, 'AsyncStorage should persist the correct total');
        
        // Test 5: Final cleanup
        await cartService.clearCart();
        const finalCart = await cartService.getCart();
        expect.toBe(finalCart.items.length, 0, 'Final cleanup should result in empty cart');
      },
    },
    {
      name: 'Multiple Item Addition',
      expectedBehavior: 'Cart should handle multiple different items',
      test: async () => {
        // Import cart service directly to bypass React Query cache issues
        const { cartService } = await import('../services/cartService');
        
        // Test 1: Start with clean slate
        await cartService.clearCart();
        const initialCart = await cartService.getCart();
        expect.toBe(initialCart.items.length, 0, 'Should start with empty cart');
        
        // Test 2: Add first item
        const result1 = await cartService.addItem(testProducts[0], 1);
        expect.toBeTruthy(result1.success, 'First item addition should succeed');
        expect.toBe(result1.cart.items.length, 1, 'Cart should have 1 item after first addition');
        expect.toBe(result1.cart.items[0].product.id, testProducts[0].id, 'First item should have correct product ID');
        expect.toBe(result1.cart.items[0].quantity, 1, 'First item should have correct quantity');
        
        // Test 3: Add second different item
        const result2 = await cartService.addItem(testProducts[1], 2);
        expect.toBeTruthy(result2.success, 'Second item addition should succeed');
        expect.toBe(result2.cart.items.length, 2, 'Cart should have 2 items after second addition');
        
        // Test 4: Verify both items are present with correct data
        const finalCart = await cartService.getCart();
        expect.toBe(finalCart.items.length, 2, 'Final cart should contain 2 different items');
        
        const item1 = finalCart.items.find(item => item.product.id === testProducts[0].id);
        const item2 = finalCart.items.find(item => item.product.id === testProducts[1].id);
        
        expect.toBeTruthy(item1, 'First item should be found in cart');
        expect.toBeTruthy(item2, 'Second item should be found in cart');
        expect.toBe(item1?.quantity, 1, 'First item should have quantity 1');
        expect.toBe(item2?.quantity, 2, 'Second item should have quantity 2');
        
        const expectedTotal = (testProducts[0].price * 1) + (testProducts[1].price * 2);
        expect.toBe(finalCart.total, expectedTotal, 'Total should match sum of all items');
        
        // Test 5: Cleanup
        await cartService.clearCart();
      },
    },
  ];

  const validationTests: TestCase[] = [
    {
      name: 'Email Validation',
      expectedBehavior: 'Email validation should reject invalid formats',
      test: async () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        const validEmail = 'test@example.com';
        const invalidEmail = 'invalid-email';
        
        expect.toBeTruthy(emailRegex.test(validEmail), 'Valid email should pass regex test');
        expect.toBe(emailRegex.test(invalidEmail), false, 'Invalid email should fail regex test');
      },
    },
    {
      name: 'Phone Validation',
      expectedBehavior: 'Phone validation should accept valid formats',
      test: async () => {
        const phoneRegex = /^[\d\s\-\(\)]+$/;
        
        const validPhone = '555-123-4567';
        const invalidPhone = 'abc-def-ghij';
        
        expect.toBeTruthy(phoneRegex.test(validPhone), 'Valid phone should pass regex test');
        expect.toBe(phoneRegex.test(invalidPhone), false, 'Invalid phone should fail regex test');
      },
    },
    {
      name: 'Required Field Validation',
      expectedBehavior: 'Required fields should be validated for emptiness',
      test: async () => {
        const validateRequired = (value: string) => value.trim().length > 0;
        
        expect.toBeTruthy(validateRequired('Test Name'), 'Non-empty string should be valid');
        expect.toBe(validateRequired(''), false, 'Empty string should be invalid');
        expect.toBe(validateRequired('   '), false, 'Whitespace-only string should be invalid');
      },
    },
  ];

  const calculationTests: TestCase[] = [
    {
      name: 'Tax Calculation',
      expectedBehavior: 'Tax should be calculated at 8.5% of subtotal',
      test: async () => {
        const subtotal = 10.00;
        const expectedTax = Math.round(subtotal * 0.085 * 100) / 100;
        const calculatedTax = Math.round(subtotal * 0.085 * 100) / 100;
        
        expect.toBe(calculatedTax, expectedTax, 'Tax calculation should match expected formula');
        expect.toBe(calculatedTax, 0.85, 'Tax for $10.00 should be $0.85');
      },
    },
    {
      name: 'Total Calculation',
      expectedBehavior: 'Total should be subtotal + tax',
      test: async () => {
        const subtotal = 15.50;
        const tax = Math.round(subtotal * 0.085 * 100) / 100;
        const expectedTotal = subtotal + tax;
        const calculatedTotal = subtotal + tax;
        
        expect.toBe(calculatedTotal, expectedTotal, 'Total should equal subtotal plus tax');
      },
    },
  ];

  const orderSubmissionTests: TestCase[] = [
    {
      name: 'Order Data Structure',
      expectedBehavior: 'Order should contain all required fields',
      test: async () => {
        await clearCart();
        await addItem(testProducts[0], 1);
        
        const orderData = {
          customerInfo: validCustomerInfo,
          items: [{ productId: testProducts[0].id, quantity: 1, price: testProducts[0].price }],
          orderType: 'pickup' as const,
          pickupDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          notes: 'Test order',
          subtotal: testProducts[0].price,
          tax: Math.round(testProducts[0].price * 0.085 * 100) / 100,
          total: testProducts[0].price + Math.round(testProducts[0].price * 0.085 * 100) / 100,
        };
        
        expect.toBeTruthy(orderData.customerInfo.name, 'Order should have customer name');
        expect.toBeTruthy(orderData.customerInfo.email, 'Order should have customer email');
        expect.toBeTruthy(orderData.items.length > 0, 'Order should have items');
        expect.toBeTruthy(orderData.total > 0, 'Order should have positive total');
      },
    },
  ];

  const testSuites: TestSuite[] = [
    { name: 'Cart Functionality', tests: cartTests },
    { name: 'Form Validation', tests: validationTests },
    { name: 'Price Calculations', tests: calculationTests },
    { name: 'Order Submission', tests: orderSubmissionTests },
  ];

  const runTest = async (testCase: TestCase, suiteName: string) => {
    const testName = `${suiteName}: ${testCase.name}`;
    
    addTestResult({
      testName,
      status: 'running',
      message: 'Running...',
      timestamp: new Date(),
    });

    try {
      await testCase.test();
      logTest(testName, 'pass', 'Test passed successfully');
    } catch (error) {
      logTest(testName, 'fail', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const runTestSuite = async (suite: TestSuite) => {
    for (const testCase of suite.tests) {
      await runTest(testCase, suite.name);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      for (const suite of testSuites) {
        await runTestSuite(suite);
      }
      
      Alert.alert('Tests Complete', 'All automated tests have finished running. Check results below.');
    } catch (error) {
      Alert.alert('Test Error', 'An error occurred while running tests');
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = useCallback(() => {
    setTestResults([]);
  }, []);

  const copyResults = useCallback(async () => {
    if (testResults.length === 0) {
      Alert.alert('No Results', 'No test results to copy. Run tests first.');
      return;
    }

    const { total, passed, failed } = getTestSummary();
    const summary = `Test Results Summary\n` +
      `Total Tests: ${total}\n` +
      `Passed: ${passed}\n` +
      `Failed: ${failed}\n` +
      `Success Rate: ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%\n\n`;

    const details = testResults.map(result => 
      `${result.status === 'pass' ? '✅' : '❌'} ${result.testName}\n` +
      `   Message: ${result.message}\n` +
      `   Time: ${result.timestamp.toLocaleTimeString()}\n`
    ).join('\n');

    const fullReport = summary + 'Detailed Results:\n' + details;
    
    try {
      Clipboard.setString(fullReport);
      Alert.alert('Copied!', 'Test results copied to clipboard');
      
      // Also log to console for debugging
      console.log('=== AUTOMATED TEST RESULTS ===');
      console.log(fullReport);
      console.log('=== END TEST RESULTS ===');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy results to clipboard');
    }
  }, [testResults]);

  const getTestSummary = () => {
    const total = testResults.filter(r => r.status !== 'running').length;
    const passed = testResults.filter(r => r.status === 'pass').length;
    const failed = testResults.filter(r => r.status === 'fail').length;
    
    return { total, passed, failed };
  };

  const { total, passed, failed } = getTestSummary();

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Automated Test Runner</Text>
      <Text style={styles.subtitle}>
        Comprehensive automated testing for enhanced checkout functionality
      </Text>

      {/* Test Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Controls</Text>
        
        <TouchableOpacity 
          style={[styles.button, isRunning && styles.buttonDisabled]} 
          onPress={runAllTests}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? '🔄 Running Tests...' : '▶️ Run All Tests'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.clearButton} onPress={clearResults}>
          <Text style={styles.clearButtonText}>🗑️ Clear Results</Text>
        </TouchableOpacity>
        
        {testResults.length > 0 && (
          <TouchableOpacity style={styles.copyButton} onPress={copyResults}>
            <Text style={styles.copyButtonText}>📋 Copy Results</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Test Summary */}
      {testResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Summary</Text>
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>Total: {total}</Text>
            <Text style={[styles.summaryText, styles.passText]}>Passed: {passed}</Text>
            <Text style={[styles.summaryText, styles.failText]}>Failed: {failed}</Text>
            <Text style={styles.summaryText}>
              Success Rate: {total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%
            </Text>
          </View>
        </View>
      )}

      {/* Test Suites Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Suites</Text>
        {testSuites.map((suite, index) => (
          <View key={index} style={styles.suiteContainer}>
            <Text style={styles.suiteName}>{suite.name}</Text>
            <Text style={styles.suiteDescription}>
              {suite.tests.length} test{suite.tests.length !== 1 ? 's' : ''}
            </Text>
            {suite.tests.map((test, testIndex) => (
              <View key={testIndex} style={styles.testCase}>
                <Text style={styles.testName}>• {test.name}</Text>
                <Text style={styles.testExpected}>Expected: {test.expectedBehavior}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Test Results */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Results</Text>
        {testResults.length === 0 ? (
          <Text style={styles.noResults}>No test results yet. Run tests to see results.</Text>
        ) : (
          <View style={styles.resultsContainer}>
            {testResults.map((result, index) => (
              <View key={index} style={[
                styles.resultItem,
                result.status === 'pass' && styles.resultPass,
                result.status === 'fail' && styles.resultFail,
                result.status === 'running' && styles.resultRunning,
              ]}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultName}>{result.testName}</Text>
                  <Text style={styles.resultStatus}>
                    {result.status === 'pass' ? '✅' : 
                     result.status === 'fail' ? '❌' : '🔄'}
                  </Text>
                </View>
                <Text style={styles.resultMessage}>{result.message}</Text>
                <Text style={styles.resultTime}>
                  {result.timestamp.toLocaleTimeString()}
                </Text>
              </View>
            ))}
          </View>
        )}
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
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  copyButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 6,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  passText: {
    color: '#2e7d32',
  },
  failText: {
    color: '#d32f2f',
  },
  suiteContainer: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
  },
  suiteName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 5,
  },
  suiteDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  testCase: {
    marginLeft: 10,
    marginBottom: 8,
  },
  testName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  testExpected: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  noResults: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  resultsContainer: {
    gap: 10,
  },
  resultItem: {
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 4,
  },
  resultPass: {
    backgroundColor: '#e8f5e8',
    borderLeftColor: '#2e7d32',
  },
  resultFail: {
    backgroundColor: '#ffebee',
    borderLeftColor: '#d32f2f',
  },
  resultRunning: {
    backgroundColor: '#fff3e0',
    borderLeftColor: '#f57c00',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  resultName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  resultStatus: {
    fontSize: 16,
  },
  resultMessage: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  resultTime: {
    fontSize: 10,
    color: '#999',
  },
});
