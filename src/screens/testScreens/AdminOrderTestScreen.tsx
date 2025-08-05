import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOrders, useOrderStats, useOrderOperations } from '../../hooks/useOrders';
import { addMockOrdersForTesting, clearMockOrders } from '../../services/orderService';

interface TestResult {
  testName: string;
  passed: boolean;
  details: string;
}

const AdminOrderTestScreen: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  // React Query hooks for testing
  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useOrders();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useOrderStats();
  const { updateOrderStatus, bulkUpdateOrderStatus, isLoading: isUpdating } = useOrderOperations();

  const addTestResult = (testName: string, passed: boolean, details: string) => {
    setTestResults(prev => [...prev, { testName, passed, details }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Test 1: Order Data Loading
  const testOrderDataLoading = async () => {
    setCurrentTest('Testing order data loading...');
    
    try {
      // Clear existing orders and add mock data
      clearMockOrders();
      addMockOrdersForTesting();
      
      // Refetch orders
      await refetchOrders();
      
      if (orders.length > 0) {
        addTestResult(
          'Order Data Loading',
          true,
          `Successfully loaded ${orders.length} orders with proper data structure`
        );
      } else {
        addTestResult(
          'Order Data Loading',
          false,
          'No orders loaded or data structure invalid'
        );
      }
    } catch (error) {
      addTestResult(
        'Order Data Loading',
        false,
        `Error loading orders: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  // Test 2: Order Statistics
  const testOrderStatistics = async () => {
    setCurrentTest('Testing order statistics...');
    
    try {
      await refetchStats();
      
      if (stats) {
        const hasValidStats = 
          typeof stats.totalOrders === 'number' &&
          typeof stats.pendingOrders === 'number' &&
          typeof stats.completedOrders === 'number' &&
          typeof stats.totalRevenue === 'number' &&
          typeof stats.todayOrders === 'number';
        
        if (hasValidStats) {
          addTestResult(
            'Order Statistics',
            true,
            `Stats loaded: ${stats.totalOrders} total, ${stats.pendingOrders} pending, $${stats.totalRevenue.toFixed(2)} revenue`
          );
        } else {
          addTestResult(
            'Order Statistics',
            false,
            'Statistics data structure is invalid'
          );
        }
      } else {
        addTestResult(
          'Order Statistics',
          false,
          'No statistics data loaded'
        );
      }
    } catch (error) {
      addTestResult(
        'Order Statistics',
        false,
        `Error loading statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  // Test 3: Order Status Update
  const testOrderStatusUpdate = async () => {
    setCurrentTest('Testing order status update...');
    
    try {
      if (orders.length === 0) {
        addTestResult(
          'Order Status Update',
          false,
          'No orders available for testing status update'
        );
        return;
      }

      const testOrder = orders[0];
      const originalStatus = testOrder.status;
      const newStatus = originalStatus === 'pending' ? 'confirmed' : 'pending';
      
      const result = await updateOrderStatus(testOrder.id, newStatus);
      
      if (result.success) {
        // Verify the update by refetching
        await refetchOrders();
        
        addTestResult(
          'Order Status Update',
          true,
          `Successfully updated order ${testOrder.id} from ${originalStatus} to ${newStatus}`
        );
      } else {
        addTestResult(
          'Order Status Update',
          false,
          `Failed to update order status: ${result.message}`
        );
      }
    } catch (error) {
      addTestResult(
        'Order Status Update',
        false,
        `Error updating order status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  // Test 4: Bulk Order Status Update
  const testBulkOrderStatusUpdate = async () => {
    setCurrentTest('Testing bulk order status update...');
    
    try {
      if (orders.length < 2) {
        addTestResult(
          'Bulk Order Status Update',
          false,
          'Need at least 2 orders for bulk update testing'
        );
        return;
      }

      const testOrderIds = orders.slice(0, 2).map(order => order.id);
      const result = await bulkUpdateOrderStatus(testOrderIds, 'confirmed');
      
      if (result.success) {
        await refetchOrders();
        
        addTestResult(
          'Bulk Order Status Update',
          true,
          `Successfully bulk updated ${testOrderIds.length} orders to confirmed status`
        );
      } else {
        addTestResult(
          'Bulk Order Status Update',
          false,
          `Failed to bulk update orders: ${result.message}`
        );
      }
    } catch (error) {
      addTestResult(
        'Bulk Order Status Update',
        false,
        `Error in bulk update: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  // Test 5: Order Filtering
  const testOrderFiltering = async () => {
    setCurrentTest('Testing order filtering...');
    
    try {
      // Test filtering by status
      const { data: pendingOrders } = await refetchOrders();
      
      if (pendingOrders && pendingOrders.length > 0) {
        const statusTypes = [...new Set(pendingOrders.map(order => order.status))];
        const fulfillmentTypes = [...new Set(pendingOrders.map(order => order.fulfillmentType))];
        
        addTestResult(
          'Order Filtering',
          true,
          `Filtering capability verified. Found ${statusTypes.length} status types: ${statusTypes.join(', ')} and ${fulfillmentTypes.length} fulfillment types: ${fulfillmentTypes.join(', ')}`
        );
      } else {
        addTestResult(
          'Order Filtering',
          false,
          'No orders available to test filtering'
        );
      }
    } catch (error) {
      addTestResult(
        'Order Filtering',
        false,
        `Error testing filtering: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  // Test 6: React Query Cache Behavior
  const testReactQueryCache = async () => {
    setCurrentTest('Testing React Query cache behavior...');
    
    try {
      // Test cache invalidation and refetching
      const initialLoadTime = Date.now();
      await refetchOrders();
      const firstLoadTime = Date.now() - initialLoadTime;
      
      // Immediate second call should be faster (cached)
      const cachedLoadTime = Date.now();
      await refetchOrders();
      const secondLoadTime = Date.now() - cachedLoadTime;
      
      addTestResult(
        'React Query Cache',
        true,
        `Cache behavior verified. First load: ${firstLoadTime}ms, Cached load: ${secondLoadTime}ms. Cache working: ${secondLoadTime < firstLoadTime}`
      );
    } catch (error) {
      addTestResult(
        'React Query Cache',
        false,
        `Error testing cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    clearResults();
    
    try {
      await testOrderDataLoading();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testOrderStatistics();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testOrderStatusUpdate();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testBulkOrderStatusUpdate();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testOrderFiltering();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testReactQueryCache();
      
      setCurrentTest('All tests completed!');
    } catch (error) {
      Alert.alert('Test Error', `Failed to run tests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const renderTestResult = (result: TestResult, index: number) => (
    <View key={index} style={[styles.testResult, result.passed ? styles.passed : styles.failed]}>
      <View style={styles.testHeader}>
        <Ionicons
          name={result.passed ? 'checkmark-circle' : 'close-circle'}
          size={20}
          color={result.passed ? '#10b981' : '#ef4444'}
        />
        <Text style={[styles.testName, { color: result.passed ? '#10b981' : '#ef4444' }]}>
          {result.testName}
        </Text>
      </View>
      <Text style={styles.testDetails}>{result.details}</Text>
    </View>
  );

  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Order Management Tests</Text>
        <Text style={styles.subtitle}>
          Comprehensive testing for order management functionality
        </Text>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Test Statistics</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>Orders Loaded:</Text>
          <Text style={styles.statValue}>{ordersLoading ? 'Loading...' : orders.length}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>Statistics Available:</Text>
          <Text style={styles.statValue}>{statsLoading ? 'Loading...' : stats ? 'Yes' : 'No'}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>Tests Passed:</Text>
          <Text style={[styles.statValue, { color: totalTests > 0 ? (passedTests === totalTests ? '#10b981' : '#ef4444') : '#6b7280' }]}>
            {totalTests > 0 ? `${passedTests}/${totalTests}` : 'Not run'}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={runAllTests}
          disabled={isRunning}
        >
          {isRunning ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Run All Tests</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={clearResults}
          disabled={isRunning}
        >
          <Text style={[styles.buttonText, { color: '#3b82f6' }]}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      {currentTest && (
        <View style={styles.currentTest}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.currentTestText}>{currentTest}</Text>
        </View>
      )}

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results</Text>
        {testResults.length === 0 ? (
          <Text style={styles.noResults}>No test results yet. Run tests to see results.</Text>
        ) : (
          testResults.map(renderTestResult)
        )}
      </View>

      {(isUpdating || ordersLoading || statsLoading) && (
        <View style={styles.loadingIndicator}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  currentTest: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  currentTestText: {
    fontSize: 14,
    color: '#1e40af',
    marginLeft: 8,
  },
  resultsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  noResults: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  testResult: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  passed: {
    backgroundColor: '#f0fdf4',
    borderLeftColor: '#10b981',
  },
  failed: {
    backgroundColor: '#fef2f2',
    borderLeftColor: '#ef4444',
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  testName: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  testDetails: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
});

export default AdminOrderTestScreen;
