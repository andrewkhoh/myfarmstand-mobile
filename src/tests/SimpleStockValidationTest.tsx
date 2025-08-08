import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useStockValidation } from '../hooks/useStockValidation';
import { useCart } from '../hooks/useCart';
import { useProducts } from '../hooks/useProducts';

interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  details?: any;
  duration?: number;
}

export const SimpleStockValidationTest: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  const { validateStock, canAddMore, getRemainingStock, getStockStatusMessage, refetchStock } = useStockValidation();
  const { addItemAsync, clearCartAsync, items: cartItems } = useCart();
  const { data: products } = useProducts();

  const addTestResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setResults([]);
  };

  // Test 1: Real-time stock validation accuracy
  const testStockValidationAccuracy = async () => {
    const startTime = Date.now();
    
    try {
      if (!products || products.length === 0) {
        addTestResult({
          testName: 'Stock Validation Accuracy',
          success: false,
          message: 'No products available for testing',
          duration: Date.now() - startTime
        });
        return;
      }

      const testProduct = products[0];
      
      // Refresh stock data to ensure accuracy
      await refetchStock();
      
      // Test validation without adding to cart
      const validation = validateStock(testProduct, 1);
      
      addTestResult({
        testName: 'Stock Validation Accuracy',
        success: true,
        message: `Validation successful: ${validation.isValid ? 'Can add' : 'Cannot add'} - ${validation.message || 'No issues'}`,
        details: {
          productId: testProduct.id,
          productName: testProduct.name,
          availableStock: validation.availableStock,
          currentCartQuantity: validation.currentCartQuantity,
          remainingStock: validation.remainingStock,
          canAddMore: validation.canAddMore
        },
        duration: Date.now() - startTime
      });
    } catch (error) {
      addTestResult({
        testName: 'Stock Validation Accuracy',
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      });
    }
  };

  // Test 2: Real-time stock validation during cart operations
  const testRealTimeValidation = async () => {
    const startTime = Date.now();
    
    try {
      if (!products || products.length === 0) {
        addTestResult({
          testName: 'Real-Time Validation',
          success: false,
          message: 'No products available for testing',
          duration: Date.now() - startTime
        });
        return;
      }

      const testProduct = products[0];
      
      // Clear cart first
      await clearCartAsync(undefined);
      
      // Get initial stock status
      const initialValidation = validateStock(testProduct, 1);
      
      // Try to add item with validation
      const addItemResult = await addItemAsync({ product: testProduct, quantity: 1 });
      
      // Get updated stock status
      const updatedValidation = validateStock(testProduct, 1);
      
      addTestResult({
        testName: 'Real-Time Validation',
        success: addItemResult.success,
        message: addItemResult.success 
          ? `Item added successfully. Stock updated in real-time.`
          : `Add failed as expected: ${addItemResult.message}`,
        details: {
          productName: testProduct.name,
          initialStock: initialValidation.remainingStock,
          updatedStock: updatedValidation.remainingStock,
          cartQuantityBefore: initialValidation.currentCartQuantity,
          cartQuantityAfter: updatedValidation.currentCartQuantity
        },
        duration: Date.now() - startTime
      });
    } catch (error) {
      addTestResult({
        testName: 'Real-Time Validation',
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      });
    }
  };

  // Test 3: Stock status messages
  const testStockStatusMessages = async () => {
    const startTime = Date.now();
    
    try {
      if (!products || products.length === 0) {
        addTestResult({
          testName: 'Stock Status Messages',
          success: false,
          message: 'No products available for testing',
          duration: Date.now() - startTime
        });
        return;
      }

      const testProduct = products[0];
      
      // Test various stock status messages
      const statusMessage = getStockStatusMessage(testProduct);
      const canAdd = canAddMore(testProduct.id);
      const remaining = getRemainingStock(testProduct.id);
      
      addTestResult({
        testName: 'Stock Status Messages',
        success: true,
        message: `Status messages generated successfully`,
        details: {
          productName: testProduct.name,
          statusMessage,
          canAddMore: canAdd,
          remainingStock: remaining
        },
        duration: Date.now() - startTime
      });
    } catch (error) {
      addTestResult({
        testName: 'Stock Status Messages',
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      });
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    clearResults();

    const tests = [
      { name: 'Stock Validation Accuracy', fn: testStockValidationAccuracy },
      { name: 'Real-Time Validation', fn: testRealTimeValidation },
      { name: 'Stock Status Messages', fn: testStockStatusMessages },
    ];

    for (const test of tests) {
      setCurrentTest(test.name);
      await test.fn();
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setCurrentTest('');
    setIsRunning(false);
  };

  const getResultIcon = (success: boolean) => success ? '✅' : '❌';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Simple Stock Validation Test</Text>
        <Text style={styles.subtitle}>
          Tests real-time stock validation during cart building
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={runAllTests}
          disabled={isRunning}
        >
          {isRunning ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Run All Tests</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={clearResults}
          disabled={isRunning}
        >
          <Text style={[styles.buttonText, { color: '#000000' }]}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      {isRunning && currentTest && (
        <View style={styles.currentTest}>
          <Text style={styles.currentTestText}>Running: {currentTest}</Text>
        </View>
      )}

      <View style={styles.cartStatus}>
        <Text style={styles.sectionTitle}>Current Cart Status</Text>
        <Text style={styles.cartInfo}>
          Items in cart: {cartItems.length}
        </Text>
        {cartItems.map((item, index) => (
          <Text key={index} style={styles.cartItem}>
            • {item.product.name}: {item.quantity}
          </Text>
        ))}
      </View>

      <View style={styles.results}>
        <Text style={styles.sectionTitle}>Test Results ({results.length})</Text>
        {results.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultIcon}>{getResultIcon(result.success)}</Text>
              <Text style={styles.resultName}>{result.testName}</Text>
              {result.duration && (
                <Text style={styles.resultDuration}>{result.duration}ms</Text>
              )}
            </View>
            <Text style={[styles.resultMessage, { color: result.success ? '#22c55e' : '#ef4444' }]}>
              {result.message}
            </Text>
            {result.details && (
              <View style={styles.resultDetails}>
                <Text style={styles.detailsTitle}>Details:</Text>
                <Text style={styles.detailsText}>
                  {JSON.stringify(result.details, null, 2)}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  controls: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  currentTest: {
    padding: 12,
    backgroundColor: '#dbeafe',
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  currentTestText: {
    fontSize: 16,
    color: '#3b82f6',
    textAlign: 'center',
  },
  cartStatus: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  cartInfo: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  cartItem: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
  },
  results: {
    padding: 16,
  },
  resultItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  resultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  resultDuration: {
    fontSize: 12,
    color: '#6b7280',
  },
  resultMessage: {
    fontSize: 16,
    marginBottom: 8,
  },
  resultDetails: {
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 4,
  },
  detailsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  detailsText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
});

export default SimpleStockValidationTest;
