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
import { supabase } from '../config/supabase';
import { spacing, colors, typography } from '../utils/theme';

interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  details?: any;
  duration?: number;
}

export const AtomicOrderTest: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setResults([]);
  };

  // Helper function to ensure test products exist
  const ensureTestProducts = async () => {
    // Check if we have products with stock
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id, name, price, stock_quantity')
      .gt('stock_quantity', 0)
      .limit(1);

    if (existingProducts && existingProducts.length > 0) {
      // Map to expected format for consistency
      return existingProducts.map(p => ({
        ...p,
        stock: p.stock_quantity
      }));
    }

    // Create test products if none exist
    const testProducts = [
      {
        name: 'Test Product - Atomic Order',
        description: 'Test product for atomic order submission testing',
        price: 10.00,
        stock_quantity: 50,
        unit: 'each',
        is_available: true,
        is_pre_order: false,
        seasonal_availability: false,
        is_weekly_special: false,
        is_bundle: false
      }
    ];

    const { data: createdProducts, error: createError } = await supabase
      .from('products')
      .insert(testProducts)
      .select('id, name, price, stock_quantity');

    if (createError) {
      throw new Error(`Failed to create test products: ${createError.message}`);
    }

    // Map to expected format for consistency
    return (createdProducts || []).map(p => ({
      ...p,
      stock: p.stock_quantity
    }));
  };

  // Test 1: Basic atomic order submission with sufficient stock
  const testBasicOrderSubmission = async () => {
    const startTime = Date.now();
    setCurrentTest('Basic Order Submission');

    try {
      // Ensure we have test products
      const products = await ensureTestProducts();

      if (!products || products.length === 0) {
        throw new Error('Failed to create or find test products');
      }

      const product = products[0];
      const testOrderItems = [{
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        quantity: 1,
        total_price: product.price
      }];

      // Call atomic order submission
      const { data: result, error } = await supabase.rpc('submit_order_atomic', {
        p_order_id: crypto.randomUUID(),
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_customer_name: 'Test Customer',
        p_customer_email: 'test@example.com',
        p_customer_phone: '555-0123',
        p_subtotal: product.price,
        p_tax_amount: Math.round(product.price * 0.085 * 100) / 100,
        p_total_amount: product.price + Math.round(product.price * 0.085 * 100) / 100,
        p_fulfillment_type: 'pickup',
        p_order_items: testOrderItems,
        p_delivery_address: null,
        p_pickup_date: '2025-08-09',
        p_pickup_time: '10:00 AM',
        p_special_instructions: 'Test order - atomic submission',
        p_status: 'pending'
      });

      const duration = Date.now() - startTime;

      if (error) {
        throw new Error(`RPC Error: ${error.message}`);
      }

      if (result.success) {
        addResult({
          testName: 'Basic Order Submission',
          success: true,
          message: `✅ Order created successfully in ${duration}ms`,
          details: {
            orderId: result.order.id,
            productUsed: product.name,
            stockBefore: product.stock,
            duration: `${duration}ms`
          },
          duration
        });
      } else {
        addResult({
          testName: 'Basic Order Submission',
          success: false,
          message: `❌ Order creation failed: ${result.error}`,
          details: result,
          duration
        });
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      addResult({
        testName: 'Basic Order Submission',
        success: false,
        message: `❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      });
    }
  };

  // Test 2: Inventory conflict detection (insufficient stock)
  const testInventoryConflict = async () => {
    const startTime = Date.now();
    setCurrentTest('Inventory Conflict Detection');

    try {
      // Ensure we have test products
      const products = await ensureTestProducts();

      if (!products || products.length === 0) {
        throw new Error('Failed to create or find test products');
      }

      const product = products[0];
      const excessiveQuantity = product.stock + 5; // Request more than available

      const testOrderItems = [{
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        quantity: excessiveQuantity,
        total_price: product.price * excessiveQuantity
      }];

      // Call atomic order submission with excessive quantity
      const { data: result, error } = await supabase.rpc('submit_order_atomic', {
        p_order_id: crypto.randomUUID(),
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_customer_name: 'Test Customer',
        p_customer_email: 'test@example.com',
        p_customer_phone: '555-0123',
        p_subtotal: product.price * excessiveQuantity,
        p_tax_amount: Math.round(product.price * excessiveQuantity * 0.085 * 100) / 100,
        p_total_amount: (product.price * excessiveQuantity) + Math.round(product.price * excessiveQuantity * 0.085 * 100) / 100,
        p_fulfillment_type: 'pickup',
        p_order_items: testOrderItems,
        p_delivery_address: null,
        p_pickup_date: '2025-08-09',
        p_pickup_time: '10:00 AM',
        p_special_instructions: 'Test order - inventory conflict',
        p_status: 'pending'
      });

      const duration = Date.now() - startTime;

      if (error) {
        throw new Error(`RPC Error: ${error.message}`);
      }

      // Should fail with inventory conflicts
      if (!result.success && result.inventoryConflicts) {
        addResult({
          testName: 'Inventory Conflict Detection',
          success: true,
          message: `✅ Inventory conflict properly detected in ${duration}ms`,
          details: {
            productUsed: product.name,
            availableStock: product.stock,
            requestedQuantity: excessiveQuantity,
            conflicts: result.inventoryConflicts,
            duration: `${duration}ms`
          },
          duration
        });
      } else {
        addResult({
          testName: 'Inventory Conflict Detection',
          success: false,
          message: `❌ Expected inventory conflict but order succeeded`,
          details: result,
          duration
        });
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      addResult({
        testName: 'Inventory Conflict Detection',
        success: false,
        message: `❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      });
    }
  };

  // Test 3: Concurrent order submission (race condition test)
  const testConcurrentOrders = async () => {
    const startTime = Date.now();
    setCurrentTest('Concurrent Order Submission');

    try {
      // Ensure we have test products
      const products = await ensureTestProducts();

      if (!products || products.length === 0) {
        throw new Error('Failed to create or find test products');
      }

      const product = products[0];

      // Create two identical orders simultaneously
      const createOrder = async (orderNum: number) => {
        const testOrderItems = [{
          product_id: product.id,
          product_name: product.name,
          unit_price: product.price,
          quantity: 1,
          total_price: product.price
        }];

        return supabase.rpc('submit_order_atomic', {
          p_order_id: crypto.randomUUID(),
          p_user_id: (await supabase.auth.getUser()).data.user?.id,
          p_customer_name: `Test Customer ${orderNum}`,
          p_customer_email: `test${orderNum}@example.com`,
          p_customer_phone: '555-0123',
          p_subtotal: product.price,
          p_tax_amount: Math.round(product.price * 0.085 * 100) / 100,
          p_total_amount: product.price + Math.round(product.price * 0.085 * 100) / 100,
          p_fulfillment_type: 'pickup',
          p_order_items: testOrderItems,
          p_delivery_address: null,
          p_pickup_date: '2025-08-09',
          p_pickup_time: '10:00 AM',
          p_special_instructions: `Concurrent test order ${orderNum}`,
          p_status: 'pending'
        });
      };

      // Execute both orders simultaneously
      const [result1, result2] = await Promise.all([
        createOrder(1),
        createOrder(2)
      ]);

      const duration = Date.now() - startTime;

      const success1 = result1.data?.success && !result1.error;
      const success2 = result2.data?.success && !result2.error;

      // Both should succeed if there's enough stock, or one should fail with proper conflict detection
      if (success1 && success2) {
        addResult({
          testName: 'Concurrent Order Submission',
          success: true,
          message: `✅ Both concurrent orders succeeded in ${duration}ms`,
          details: {
            productUsed: product.name,
            initialStock: product.stock,
            order1Success: success1,
            order2Success: success2,
            duration: `${duration}ms`
          },
          duration
        });
      } else if ((success1 && !success2) || (!success1 && success2)) {
        addResult({
          testName: 'Concurrent Order Submission',
          success: true,
          message: `✅ One order succeeded, one failed properly in ${duration}ms`,
          details: {
            productUsed: product.name,
            initialStock: product.stock,
            order1Success: success1,
            order2Success: success2,
            failedOrderError: !success1 ? result1.data?.error : result2.data?.error,
            duration: `${duration}ms`
          },
          duration
        });
      } else {
        addResult({
          testName: 'Concurrent Order Submission',
          success: false,
          message: `❌ Both orders failed unexpectedly`,
          details: {
            result1: result1.data,
            result2: result2.data,
            duration: `${duration}ms`
          },
          duration
        });
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      addResult({
        testName: 'Concurrent Order Submission',
        success: false,
        message: `❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      });
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    clearResults();

    try {
      await testBasicOrderSubmission();
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause between tests

      await testInventoryConflict();
      await new Promise(resolve => setTimeout(resolve, 500));

      await testConcurrentOrders();

      Alert.alert('Tests Complete', 'All atomic order submission tests have been completed. Check results below.');
    } catch (error) {
      Alert.alert('Test Error', `Failed to complete tests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const renderResult = (result: TestResult, index: number) => (
    <View key={index} style={[styles.resultCard, result.success ? styles.successCard : styles.errorCard]}>
      <Text style={styles.testName}>{result.testName}</Text>
      <Text style={[styles.message, result.success ? styles.successText : styles.errorText]}>
        {result.message}
      </Text>
      {result.details && (
        <Text style={styles.details}>
          {JSON.stringify(result.details, null, 2)}
        </Text>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Atomic Order Submission Test</Text>
      <Text style={styles.subtitle}>
        Tests the submit_order_atomic RPC function for race condition elimination
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={runAllTests}
          disabled={isRunning}
        >
          {isRunning ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Run All Tests</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={clearResults}
          disabled={isRunning}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      {currentTest && (
        <View style={styles.currentTestContainer}>
          <Text style={styles.currentTestText}>Running: {currentTest}</Text>
          <ActivityIndicator color={colors.primary[600]} />
        </View>
      )}

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results ({results.length})</Text>
        {results.map(renderResult)}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: colors.primary[600],
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary[600],
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  secondaryButtonText: {
    color: colors.primary[600],
  },
  currentTestContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  currentTestText: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
  },
  resultsContainer: {
    marginTop: spacing.lg,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  resultCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  successCard: {
    backgroundColor: colors.success[50],
    borderColor: colors.success[200],
  },
  errorCard: {
    backgroundColor: colors.error[50],
    borderColor: colors.error[200],
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  successText: {
    color: colors.success,
  },
  errorText: {
    color: colors.error,
  },
  details: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'monospace',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: 4,
  },
});

export default AtomicOrderTest;
