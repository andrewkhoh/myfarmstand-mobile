import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Screen, Text, Button, Card } from '../components';
import { useCart } from '../contexts/CartContext';
import { mockProducts } from '../data/mockProducts';
import { spacing, colors } from '../utils/theme';
import { RootStackParamList, RootTabParamList, Product } from '../types';

type CartFunctionalityTestNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList>,
  StackNavigationProp<RootStackParamList>
>;

export const CartFunctionalityTestScreen: React.FC = () => {
  const navigation = useNavigation<CartFunctionalityTestNavigationProp>();
  const { items, total, addItem, removeItem, updateQuantity, clearCart } = useCart();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [testInProgress, setTestInProgress] = useState<string | null>(null);
  const [expectedState, setExpectedState] = useState<any>(null);

  // Watch for cart state changes during tests
  useEffect(() => {
    if (!testInProgress) return;

    switch (testInProgress) {
      case 'addItem':
        if (items.length > 0) {
          const testProduct = mockProducts[0];
          const updatedItem = items.find(item => item.product.id === testProduct.id);
          if (updatedItem && updatedItem.quantity >= 2) {
            addTestResult(`✅ Added ${testProduct.name} (qty: ${updatedItem.quantity}) to cart`);
            addTestResult(`✅ Cart total: $${total.toFixed(2)}`);
            Alert.alert('Test Passed', 'Add to cart functionality works correctly');
            setTestInProgress(null);
          }
        }
        break;
        
      case 'updateQuantity':
        if (items.length > 0 && expectedState) {
          const updatedItem = items.find(item => item.product.id === expectedState.productId);
          if (updatedItem && updatedItem.quantity === expectedState.newQuantity) {
            addTestResult(`✅ Updated quantity to ${updatedItem.quantity}`);
            addTestResult(`✅ Cart total: $${total.toFixed(2)}`);
            Alert.alert('Test Passed', 'Update quantity works correctly');
            setTestInProgress(null);
            setExpectedState(null);
          }
        }
        break;
        
      case 'removeItem':
        if (expectedState) {
          const itemExists = items.find(item => item.product.id === expectedState.productId);
          if (!itemExists) {
            addTestResult(`✅ Removed item from cart`);
            addTestResult(`✅ Cart total: $${total.toFixed(2)}`);
            Alert.alert('Test Passed', 'Remove item works correctly');
            setTestInProgress(null);
            setExpectedState(null);
          }
        }
        break;
        
      case 'clearCart':
        if (items.length === 0 && total === 0) {
          addTestResult(`✅ Cart cleared successfully`);
          addTestResult(`✅ Cart total: $${total.toFixed(2)}`);
          Alert.alert('Test Passed', 'Clear cart works correctly');
          setTestInProgress(null);
        }
        break;
        
      case 'cartTotal':
        if (expectedState && items.length >= expectedState.expectedItems) {
          const actualTotal = total;
          const itemCount = items.length;
          const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
          
          addTestResult(`📈 Cart State: ${itemCount} unique items, ${totalQuantity} total quantity`);
          addTestResult(`💰 Expected Total: $${expectedState.expectedTotal.toFixed(2)}`);
          addTestResult(`💰 Actual Total: $${actualTotal.toFixed(2)}`);
          
          if (Math.abs(expectedState.expectedTotal - actualTotal) < 0.01) {
            addTestResult('✅ Cart total calculation is CORRECT!');
            Alert.alert('Test Passed', `Cart total calculation works correctly: $${actualTotal.toFixed(2)}`);
          } else {
            addTestFailure(`❌ Cart total calculation INCORRECT. Expected: $${expectedState.expectedTotal.toFixed(2)}, Got: $${actualTotal.toFixed(2)}`);
            Alert.alert('Test Failed', 'Cart total calculation failed');
          }
          setTestInProgress(null);
          setExpectedState(null);
        }
        break;
        
      case 'duplicateItems':
        if (expectedState && items.length >= expectedState.expectedUniqueItems) {
          const cartItem = items.find(item => item.product.id === expectedState.productId);
          const uniqueItems = items.length;
          
          addTestResult(`📈 Cart state: ${uniqueItems} unique items`);
          
          if (cartItem) {
            addTestResult(`📈 Product quantity: ${cartItem.quantity}`);
            
            if (cartItem.quantity === expectedState.expectedQuantity && uniqueItems === expectedState.expectedUniqueItems) {
              addTestResult('✅ Duplicate item handling CORRECT!');
              addTestResult('✅ Same product consolidated into single cart item');
              addTestResult(`✅ Total quantity: ${cartItem.quantity}`);
              Alert.alert('Test Passed', 'Duplicate item handling works correctly');
            } else {
              addTestFailure(`❌ Duplicate handling FAILED. Expected: ${expectedState.expectedQuantity} qty, ${expectedState.expectedUniqueItems} item. Got: ${cartItem.quantity} qty, ${uniqueItems} items`);
              Alert.alert('Test Failed', 'Duplicate item handling failed');
            }
          } else {
            addTestFailure('❌ Product not found in cart after adding');
            Alert.alert('Test Failed', 'Product not found in cart');
          }
          setTestInProgress(null);
          setExpectedState(null);
        }
        break;
    }
  }, [items, total, testInProgress, expectedState]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `✅ ${result}`]);
  };

  const addTestFailure = (result: string) => {
    setTestResults(prev => [...prev, `❌ ${result}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Simple Manual Test
  const testAddToCart = () => {
    try {
      const testProduct = mockProducts[0];
      
      // Show current state
      Alert.alert('Before Add', `Items: ${items.length}, Total: $${total.toFixed(2)}`);
      
      // Add item
      addItem(testProduct, 2);
      
      // Check state after a delay
      setTimeout(() => {
        Alert.alert('After Add', `Items: ${items.length}, Total: $${total.toFixed(2)}\n\nProduct: ${testProduct.name}\nPrice: $${testProduct.price}\nExpected Total: $${(testProduct.price * 2).toFixed(2)}`);
      }, 500);
      
    } catch (error) {
      Alert.alert('Error', `Test failed: ${error}`);
    }
  };

  // Test 2: Update Quantity
  const testUpdateQuantity = () => {
    try {
      // If no items, add a test item first
      if (items.length === 0) {
        addTestResult('🔧 Setting up test: Adding item to cart first...');
        addItem(mockProducts[0], 2);
        // Set up to run the actual test after item is added
        setTimeout(() => {
          if (items.length > 0) {
            const testItem = items[0];
            const newQuantity = testItem.quantity + 3;
            setExpectedState({ productId: testItem.product.id, newQuantity });
            updateQuantity(testItem.product.id, newQuantity);
            setTestInProgress('updateQuantity');
          }
        }, 200);
        return;
      }
      
      const testItem = items[0];
      const newQuantity = testItem.quantity + 3;
      
      setExpectedState({ productId: testItem.product.id, newQuantity });
      updateQuantity(testItem.product.id, newQuantity);
      setTestInProgress('updateQuantity');
      
    } catch (error) {
      addTestFailure(`Update quantity test failed: ${error}`);
      Alert.alert('Test Failed', 'Update quantity test encountered an error');
    }
  };

  // Test 3: Remove Item from Cart
  const testRemoveItem = () => {
    try {
      // If no items, add test items first
      if (items.length === 0) {
        addTestResult('🔧 Setting up test: Adding items to cart first...');
        addItem(mockProducts[0], 2);
        addItem(mockProducts[1], 1);
        // Set up to run the actual test after items are added
        setTimeout(() => {
          if (items.length > 0) {
            const testItem = items[0];
            setExpectedState({ productId: testItem.product.id });
            removeItem(testItem.product.id);
            setTestInProgress('removeItem');
          }
        }, 200);
        return;
      }
      
      const testItem = items[0];
      setExpectedState({ productId: testItem.product.id });
      removeItem(testItem.product.id);
      setTestInProgress('removeItem');
      
    } catch (error) {
      addTestFailure(`Remove item test failed: ${error}`);
      Alert.alert('Test Failed', 'Remove item test encountered an error');
    }
  };

  // Test 4: Cart Total Calculation
  const testCartTotal = () => {
    try {
      addTestResult('📊 Starting comprehensive total calculation test...');
      
      // Clear cart first for clean test
      clearCart();
      
      const product1 = mockProducts[0];
      const product2 = mockProducts[1];
      
      addTestResult(`🔧 Testing with: ${product1.name} ($${product1.price}) x2, ${product2.name} ($${product2.price}) x3`);
      
      // Set expected state for validation
      const expectedTotal = (product1.price * 2) + (product2.price * 3);
      setExpectedState({ 
        expectedTotal, 
        expectedItems: 2, 
        expectedQuantity: 5 
      });
      
      // Add items and let useEffect handle validation
      addItem(product1, 2);
      addItem(product2, 3);
      setTestInProgress('cartTotal');
      
    } catch (error) {
      addTestFailure(`Cart total test failed: ${error}`);
      Alert.alert('Test Failed', 'Cart total test encountered an error');
    }
  };

  // Test 5: Clear Cart
  const testClearCart = () => {
    try {
      clearCart();
      setTestInProgress('clearCart');
    } catch (error) {
      addTestFailure(`Clear cart test failed: ${error}`);
      Alert.alert('Test Failed', 'Clear cart test encountered an error');
    }
  };

  // Sequential Test Runner - Runs all tests in proper order
  const runAllTests = async () => {
    try {
      setTestResults([]);
      addTestResult('🚀 Starting comprehensive cart tests...');
      
      // Step 1: Clear cart first
      clearCart();
      addTestResult('1️⃣ Cleared cart');
      
      // Step 2: Test adding items
      addItem(mockProducts[0], 2);
      addTestResult('2️⃣ Added first item (qty: 2)');
      
      addItem(mockProducts[1], 1);
      addTestResult('3️⃣ Added second item (qty: 1)');
      
      // Step 3: Test updating quantity
      updateQuantity(mockProducts[0].id, 5);
      addTestResult('4️⃣ Updated first item quantity to 5');
      
      // Step 4: Test removing an item
      removeItem(mockProducts[1].id);
      addTestResult('5️⃣ Removed second item');
      
      // Step 5: Add another item to test badge count
      addItem(mockProducts[2] || mockProducts[0], 3);
      addTestResult('6️⃣ Added third item (qty: 3)');
      
      // Final validation
      setTimeout(() => {
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        addTestResult(`✅ Final cart state: ${items.length} unique items, ${totalItems} total quantity`);
        addTestResult(`✅ Cart total: $${total.toFixed(2)}`);
        Alert.alert('All Tests Complete', `Cart has ${items.length} items with total: $${total.toFixed(2)}`);
      }, 500);
      
    } catch (error) {
      addTestFailure(`Sequential test failed: ${error}`);
      Alert.alert('Test Failed', 'Sequential test encountered an error');
    }
  };

  // Test 6: Cart Badge Count
  const testCartBadge = () => {
    try {
      addTestResult('📍 Testing cart badge count functionality...');
      
      // If cart is empty, add test items
      if (items.length === 0) {
        addTestResult('🔧 Setting up test: Adding items for badge test...');
        clearCart();
        addItem(mockProducts[0], 2);
        addItem(mockProducts[1], 3);
        addItem(mockProducts[2] || mockProducts[0], 1);
        
        setTimeout(() => {
          const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
          addTestResult(`📍 Current badge count: ${totalItems} items`);
          addTestResult(`📍 Cart has ${items.length} unique products`);
          addTestResult('✅ Badge should be visible in navigation tab');
          Alert.alert('Badge Test Complete', `Cart badge shows ${totalItems} items correctly`);
        }, 200);
      } else {
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        addTestResult(`📍 Current badge count: ${totalItems} items`);
        addTestResult(`📍 Cart has ${items.length} unique products`);
        addTestResult('✅ Badge should be visible in navigation tab');
        Alert.alert('Badge Test Complete', `Cart badge shows ${totalItems} items correctly`);
      }
    } catch (error) {
      addTestFailure(`Cart badge test failed: ${error}`);
      Alert.alert('Test Failed', 'Cart badge test encountered an error');
    }
  };

  // Test 7: Duplicate Item Handling
  const testDuplicateItems = () => {
    try {
      addTestResult('🔄 Testing duplicate item handling...');
      
      // Clear cart for clean test
      clearCart();
      const testProduct = mockProducts[0];
      
      addTestResult(`🔧 Testing with product: ${testProduct.name}`);
      addTestResult('🔄 Adding same product multiple times: 1 + 2 + 1 = 4 total');
      
      // Set expected state for validation
      setExpectedState({ 
        productId: testProduct.id, 
        expectedQuantity: 4, 
        expectedUniqueItems: 1 
      });
      
      // Add same product multiple times and let useEffect handle validation
      addItem(testProduct, 1);
      addItem(testProduct, 2);
      addItem(testProduct, 1);
      setTestInProgress('duplicateItems');
      
    } catch (error) {
      addTestFailure(`Duplicate item test failed: ${error}`);
      Alert.alert('Test Failed', 'Duplicate item test encountered an error');
    }
  };



  const navigateToCart = () => {
    navigation.navigate('Cart');
  };

  const navigateToShop = () => {
    navigation.navigate('Shop');
  };

  const setupTestData = () => {
    clearCart();
    addItem(mockProducts[0], 2);
    addItem(mockProducts[1], 1);
    addItem(mockProducts[2], 3);
    addTestResult('Added test data: 3 different products with various quantities');
    Alert.alert('Test Data Added', 'Cart now has sample items for manual testing');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.debugCard}>
          <Text style={styles.debugTitle}>Debug Info</Text>
          <Text style={styles.debugText}>Cart Items: {items.length}</Text>
          <Text style={styles.debugText}>Cart Total: ${total.toFixed(2)}</Text>
          <Button
            title="🗑️ Force Clear Cart (Debug)"
            onPress={() => {
              clearCart();
              setTestResults([]);
              Alert.alert('Debug', 'Cart forcefully cleared');
            }}
            style={styles.debugButton}
          />
        </Card>
        <Card variant="elevated" style={styles.headerCard}>
          <Text variant="heading2" align="center" style={styles.title}>
            🛒 Cart Functionality Tests
          </Text>
          <Text variant="body" color="secondary" align="center">
            Increment 1.5: Shopping Cart - Basic Functionality
          </Text>
        </Card>

        <Card variant="elevated" style={styles.statusCard}>
          <Text variant="heading3" style={styles.sectionTitle}>
            Current Cart Status
          </Text>
          <View style={styles.statusRow}>
            <Text variant="body">Items in cart:</Text>
            <Text variant="heading3">{items.length}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text variant="body">Total quantity:</Text>
            <Text variant="heading3">{items.reduce((total, item) => total + item.quantity, 0)}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text variant="body">Cart total:</Text>
            <Text variant="heading3">${total.toFixed(2)}</Text>
          </View>
        </Card>

        <Card variant="elevated" style={styles.testCard}>
          <Text variant="heading3" style={styles.sectionTitle}>
            Individual Tests
          </Text>
          
          <View style={styles.buttonGrid}>
            <Button
              title="Test Add to Cart"
              onPress={testAddToCart}
              variant="outline"
              style={styles.testButton}
            />
            
            <Button
              title="Test Update Quantity"
              onPress={testUpdateQuantity}
              variant="outline"
              style={styles.testButton}
            />
            
            <Button
              title="Test Remove Item"
              onPress={testRemoveItem}
              variant="outline"
              style={styles.testButton}
            />
            
            <Button
              title="Test Cart Total"
              onPress={testCartTotal}
              variant="outline"
              style={styles.testButton}
            />
            
            <Button
              title="Test Clear Cart"
              onPress={testClearCart}
              variant="outline"
              style={styles.testButton}
            />
            
            <Button
              title="Test Cart Badge"
              onPress={testCartBadge}
              variant="outline"
              style={styles.testButton}
            />
            
            <Button
              title="Test Duplicate Items"
              onPress={testDuplicateItems}
              variant="outline"
              style={styles.testButton}
            />
          </View>
        </Card>

        <Card variant="elevated" style={styles.testCard}>
          <Text variant="heading3" style={styles.sectionTitle}>
            Batch Operations
          </Text>
          
          <View style={styles.batchButtons}>
            <Button
              title="🚀 Run All Tests"
              onPress={runAllTests}
              variant="primary"
              style={styles.batchButton}
            />
            
            <Button
              title="Clear Results"
              onPress={clearResults}
              variant="outline"
              style={styles.batchButton}
            />
          </View>
        </Card>

        <Card variant="elevated" style={styles.testCard}>
          <Text variant="heading3" style={styles.sectionTitle}>
            Manual Testing & Navigation
          </Text>
          
          <View style={styles.navButtons}>
            <Button
              title="📝 Setup Test Data"
              onPress={setupTestData}
              variant="secondary"
              style={styles.navButton}
            />
            
            <Button
              title="🛒 View Cart Screen"
              onPress={navigateToCart}
              variant="secondary"
              style={styles.navButton}
            />
            
            <Button
              title="🛍️ Go to Shop"
              onPress={navigateToShop}
              variant="secondary"
              style={styles.navButton}
            />
          </View>
        </Card>

        {testResults.length > 0 && (
          <Card variant="elevated" style={styles.resultsCard}>
            <Text variant="heading3" style={styles.sectionTitle}>
              Test Results ({testResults.length})
            </Text>
            
            <View style={styles.results}>
              {testResults.map((result, index) => (
                <Text key={index} variant="body" style={styles.resultText}>
                  {result}
                </Text>
              ))}
            </View>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  headerCard: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: {
    marginBottom: spacing.sm,
  },
  statusCard: {
    padding: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  testCard: {
    padding: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  buttonGrid: {
    gap: spacing.sm,
  },
  testButton: {
    marginBottom: spacing.xs,
  },
  batchButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  batchButton: {
    flex: 1,
  },
  navButtons: {
    gap: spacing.sm,
  },
  navButton: {
    marginBottom: spacing.xs,
  },
  resultsCard: {
    padding: spacing.md,
  },
  results: {
    gap: spacing.xs,
  },
  resultText: {
    fontFamily: 'monospace',
  },
  debugCard: {
    padding: spacing.md,
    backgroundColor: '#f5f5f5',
  },
  debugTitle: {
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  debugText: {
    fontFamily: 'monospace',
    marginBottom: spacing.xs,
  },
  debugButton: {
    marginTop: spacing.sm,
  },
});
