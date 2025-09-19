import React, { useState } from 'react';
import { View, Text as RNText, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { supabase } from '../config/supabase';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  data?: any;
}

export default function CartRPCTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    clearResults();

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        addTestResult({
          test: 'Authentication Check',
          status: 'error',
          message: 'User not authenticated'
        });
        setIsRunning(false);
        return;
      }

      addTestResult({
        test: 'Authentication Check',
        status: 'success',
        message: `Authenticated as: ${user.email}`
      });

      // Get a real product ID from the database for testing
      const { data: products, error: productError } = await supabase
        .from('products')
        .select('id')
        .limit(1)
        .single();

      if (productError || !products) {
        addTestResult({
          test: 'Get Test Product',
          status: 'error',
          message: `No products found in database: ${productError?.message || 'No products available'}`
        });
        setIsRunning(false);
        return;
      }

      const testProductId = products.id;
      
      addTestResult({
        test: 'Get Test Product',
        status: 'success',
        message: `Using product ID: ${testProductId}`
      });

      // Clean up any existing test data first
      addTestResult({
        test: 'Cleanup Existing Data',
        status: 'pending',
        message: 'Removing any existing test cart items...'
      });

      const { error: cleanupError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', testProductId);

      if (cleanupError) {
        addTestResult({
          test: 'Cleanup Existing Data',
          status: 'error',
          message: `Cleanup failed: ${cleanupError.message}`
        });
      } else {
        addTestResult({
          test: 'Cleanup Existing Data',
          status: 'success',
          message: 'Test data cleaned up successfully'
        });
      }

      // Test 1: Insert new cart item (quantity = 3)
      addTestResult({
        test: 'Test 1: Insert New Item',
        status: 'pending',
        message: 'Testing RPC function with new cart item (quantity: 3)...'
      });

      const { data: insertData, error: insertError } = await supabase
        .rpc('upsert_cart_item', {
          input_user_id: user.id,
          input_product_id: testProductId,
          input_quantity_to_add: 3
        });

      if (insertError) {
        addTestResult({
          test: 'Test 1: Insert New Item',
          status: 'error',
          message: `RPC Error: ${insertError.message}`,
          data: insertError
        });
      } else {
        addTestResult({
          test: 'Test 1: Insert New Item',
          status: 'success',
          message: `New item created with quantity: ${insertData?.[0]?.quantity || 'unknown'}`,
          data: insertData
        });
      }

      // Test 2: Update existing cart item (add quantity = 2, should become 5)
      addTestResult({
        test: 'Test 2: Update Existing Item',
        status: 'pending',
        message: 'Testing RPC function with existing cart item (add quantity: 2)...'
      });

      const { data: updateData, error: updateError } = await supabase
        .rpc('upsert_cart_item', {
          input_user_id: user.id,
          input_product_id: testProductId,
          input_quantity_to_add: 2
        });

      if (updateError) {
        addTestResult({
          test: 'Test 2: Update Existing Item',
          status: 'error',
          message: `RPC Error: ${updateError.message}`,
          data: updateError
        });
      } else {
        const finalQuantity = updateData?.[0]?.quantity;
        const expectedQuantity = 5;
        const isCorrect = finalQuantity === expectedQuantity;
        
        addTestResult({
          test: 'Test 2: Update Existing Item',
          status: isCorrect ? 'success' : 'error',
          message: `Expected quantity: ${expectedQuantity}, Got: ${finalQuantity} ${isCorrect ? '✅' : '❌'}`,
          data: updateData
        });
      }

      // Test 3: Verify final state by direct query
      addTestResult({
        test: 'Test 3: Verify Final State',
        status: 'pending',
        message: 'Verifying cart state with direct database query...'
      });

      const { data: verifyData, error: verifyError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', testProductId)
        .single();

      if (verifyError) {
        addTestResult({
          test: 'Test 3: Verify Final State',
          status: 'error',
          message: `Query Error: ${verifyError.message}`
        });
      } else {
        addTestResult({
          test: 'Test 3: Verify Final State',
          status: 'success',
          message: `Final cart item: quantity=${verifyData.quantity}, created_at=${verifyData.created_at}`,
          data: verifyData
        });
      }

      // Test 4: Test rapid concurrent calls (simulate badge reversal scenario)
      addTestResult({
        test: 'Test 4: Rapid Concurrent Calls',
        status: 'pending',
        message: 'Testing 5 rapid concurrent RPC calls...'
      });

      const concurrentPromises = Array.from({ length: 5 }, () =>
        supabase.rpc('upsert_cart_item', {
          input_user_id: user.id,
          input_product_id: testProductId,
          input_quantity_to_add: 1
        })
      );

      try {
        const concurrentResults = await Promise.all(concurrentPromises);
        const hasErrors = concurrentResults.some(result => result.error);
        
        if (hasErrors) {
          const errors = concurrentResults.filter(r => r.error).map(r => r.error?.message);
          addTestResult({
            test: 'Test 4: Rapid Concurrent Calls',
            status: 'error',
            message: `Some concurrent calls failed: ${errors.join(', ')}`
          });
        } else {
          // Check final quantity after concurrent calls
          const { data: finalData } = await supabase
            .from('cart_items')
            .select('quantity')
            .eq('user_id', user.id)
            .eq('product_id', testProductId)
            .single();

          const expectedFinalQuantity = 10; // 5 (from previous tests) + 5 (from concurrent calls)
          const actualFinalQuantity = finalData?.quantity;
          const isCorrect = actualFinalQuantity === expectedFinalQuantity;

          addTestResult({
            test: 'Test 4: Rapid Concurrent Calls',
            status: isCorrect ? 'success' : 'error',
            message: `Expected final quantity: ${expectedFinalQuantity}, Got: ${actualFinalQuantity} ${isCorrect ? '✅' : '❌'}`
          });
        }
      } catch (error) {
        addTestResult({
          test: 'Test 4: Rapid Concurrent Calls',
          status: 'error',
          message: `Concurrent test failed: ${error}`
        });
      }

    } catch (error) {
      addTestResult({
        test: 'General Error',
        status: 'error',
        message: `Unexpected error: ${error}`
      });
    }

    setIsRunning(false);
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'pending': return '#FF9800';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏳';
      default: return '⚪';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <RNText style={styles.title}>Cart RPC Function Test</RNText>
      <RNText style={styles.subtitle}>Testing upsert_cart_item SQL function</RNText>

      <TouchableOpacity
        style={[styles.button, isRunning && styles.buttonDisabled]}
        onPress={runComprehensiveTest}
        disabled={isRunning}
      >
        <RNText style={styles.buttonRNText}>
          {isRunning ? 'Running Tests...' : 'Run Comprehensive Test'}
        </RNText>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.clearButton]}
        onPress={clearResults}
      >
        <RNText style={styles.buttonRNText}>Clear Results</RNText>
      </TouchableOpacity>

      <View style={styles.resultsContainer}>
        <RNText style={styles.resultsTitle}>Test Results:</RNText>
        {testResults.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <View style={styles.resultHeader}>
              <RNText style={styles.resultIcon}>{getStatusIcon(result.status)}</RNText>
              <RNText style={[styles.resultTest, { color: getStatusColor(result.status) }]}>
                {result.test}
              </RNText>
            </View>
            <RNText style={styles.resultMessage}>{result.message}</RNText>
            {result.data && (
              <RNText style={styles.resultData}>
                Data: {JSON.stringify(result.data, null, 2)}
              </RNText>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
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
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  clearButton: {
    backgroundColor: '#FF5722',
  },
  buttonRNText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsContainer: {
    marginTop: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultItem: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  resultIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  resultTest: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  resultMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  resultData: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
  },
});
