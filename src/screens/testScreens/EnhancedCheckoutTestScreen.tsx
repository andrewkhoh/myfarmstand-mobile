import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCart } from '../../hooks/useCart';
import { RootStackParamList } from '../../types';

type EnhancedCheckoutTestNavigationProp = StackNavigationProp<RootStackParamList, 'Checkout'>;

export const EnhancedCheckoutTestScreen: React.FC = () => {
  const { items, addItem, clearCart } = useCart();
  const navigation = useNavigation<EnhancedCheckoutTestNavigationProp>();
  const [testResults, setTestResults] = useState<string[]>([]);

  // Test data
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

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, result]);
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  // Test 1: Form Validation Testing
  const testFormValidation = async () => {
    try {
      addTestResult('=== Test 1: Form Validation ===');
      addTestResult('');
      
      // Setup cart with items
      await clearCart();
      await new Promise(resolve => setTimeout(resolve, 200));
      await addItem(testProducts[0], 1);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      addTestResult('✅ Cart setup complete');
      addTestResult('');
      
      // Expected Behaviors
      addTestResult('📋 EXPECTED BEHAVIORS:');
      addTestResult('1. Empty Name Field:');
      addTestResult('   Expected: Red border + "Name is required" error');
      addTestResult('   When: Field is touched but left empty');
      addTestResult('');
      addTestResult('2. Invalid Email Format:');
      addTestResult('   Expected: Red border + "Please enter a valid email" error');
      addTestResult('   When: Email like "test@" or "invalid-email"');
      addTestResult('');
      addTestResult('3. Invalid Phone Format:');
      addTestResult('   Expected: Red border + "Please enter a valid phone" error');
      addTestResult('   When: Phone like "123" or "abc-def-ghij"');
      addTestResult('');
      addTestResult('4. Real-time Error Clearing:');
      addTestResult('   Expected: Error disappears when valid input entered');
      addTestResult('   When: User fixes invalid field');
      addTestResult('');
      addTestResult('5. Submit Button Disabled:');
      addTestResult('   Expected: Button disabled with validation errors');
      addTestResult('   When: Any required field has errors');
      addTestResult('');
      
      addTestResult('🧪 TEST INSTRUCTIONS:');
      addTestResult('1. Navigate to checkout (button will appear)');
      addTestResult('2. Try submitting empty form');
      addTestResult('3. Fill name, then clear it (test touch state)');
      addTestResult('4. Enter invalid email: "test@"');
      addTestResult('5. Enter invalid phone: "123"');
      addTestResult('6. Fix each field and verify errors clear');
      addTestResult('7. Verify submit button enables when all valid');
      addTestResult('');
      
      addTestResult('📝 RECORD RESULTS:');
      addTestResult('□ Empty name shows error after touch');
      addTestResult('□ Invalid email shows format error');
      addTestResult('□ Invalid phone shows format error');
      addTestResult('□ Errors clear when fields become valid');
      addTestResult('□ Submit button state changes correctly');
      addTestResult('');
      
      // Navigate to checkout
      navigation.navigate('Checkout');
      
    } catch (error) {
      addTestResult(`❌ Test 1 Error: ${error}`);
    }
  };

  // Test 2: Date/Time Picker Testing
  const testDateTimePicker = async () => {
    try {
      addTestResult('=== Test 2: Date/Time Picker ===');
      addTestResult('');
      
      // Setup cart with items
      await clearCart();
      await new Promise(resolve => setTimeout(resolve, 200));
      await addItem(testProducts[0], 2);
      await addItem(testProducts[1], 1);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const currentTime = new Date();
      const oneHourLater = new Date(currentTime.getTime() + 60 * 60 * 1000);
      
      addTestResult('✅ Cart setup complete');
      addTestResult(`🕰️ Current time: ${currentTime.toLocaleString()}`);
      addTestResult(`⏰ Minimum valid time: ${oneHourLater.toLocaleString()}`);
      addTestResult('');
      
      // Expected Behaviors
      addTestResult('📋 EXPECTED BEHAVIORS:');
      addTestResult('1. Pickup Option Selection:');
      addTestResult('   Expected: Date/time pickers appear when "Pickup" selected');
      addTestResult('   When: User selects pickup radio button');
      addTestResult('');
      addTestResult('2. Date Picker Interaction:');
      addTestResult('   Expected: Native date picker opens with calendar UI');
      addTestResult('   When: User taps date button (📅)');
      addTestResult('');
      addTestResult('3. Time Picker Interaction:');
      addTestResult('   Expected: Native time picker opens with time selection');
      addTestResult('   When: User taps time button (🕐)');
      addTestResult('');
      addTestResult('4. Past Date Validation:');
      addTestResult('   Expected: Error "Pickup time must be at least 1 hour from now"');
      addTestResult('   When: Selected time is less than 1 hour from current time');
      addTestResult('');
      addTestResult('5. Date/Time Display:');
      addTestResult('   Expected: Buttons show selected date/time in readable format');
      addTestResult('   When: User selects valid date and time');
      addTestResult('');
      
      addTestResult('🧪 TEST INSTRUCTIONS:');
      addTestResult('1. Navigate to checkout and select "Pickup"');
      addTestResult('2. Tap date picker button (📅)');
      addTestResult('3. Select today\'s date');
      addTestResult('4. Tap time picker button (🕐)');
      addTestResult('5. Select current time (should show validation error)');
      addTestResult('6. Select time 2 hours from now (should be valid)');
      addTestResult('7. Verify date/time display updates correctly');
      addTestResult('');
      
      addTestResult('📝 RECORD RESULTS:');
      addTestResult('□ Date/time pickers appear for pickup orders');
      addTestResult('□ Date picker opens native calendar interface');
      addTestResult('□ Time picker opens native time selection');
      addTestResult('□ Past time validation shows error message');
      addTestResult('□ Valid date/time displays correctly in buttons');
      addTestResult('□ Validation error clears with valid selection');
      addTestResult('');
      
      // Navigate to checkout
      navigation.navigate('Checkout');
      
    } catch (error) {
      addTestResult(`❌ Test 2 Error: ${error}`);
    }
  };

  // Test 3: Delivery Address Validation
  const testDeliveryValidation = async () => {
    try {
      addTestResult('=== Test 3: Delivery Address Validation ===');
      addTestResult('');
      
      // Setup cart with items
      await clearCart();
      await new Promise(resolve => setTimeout(resolve, 200));
      await addItem(testProducts[1], 3);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      addTestResult('✅ Cart setup complete');
      addTestResult('');
      
      // Expected Behaviors
      addTestResult('📋 EXPECTED BEHAVIORS:');
      addTestResult('1. Delivery Option Selection:');
      addTestResult('   Expected: Address input field appears when "Delivery" selected');
      addTestResult('   When: User selects delivery radio button');
      addTestResult('');
      addTestResult('2. Empty Address Validation:');
      addTestResult('   Expected: Red border + "Delivery address is required" error');
      addTestResult('   When: Address field is touched but left empty');
      addTestResult('');
      addTestResult('3. Short Address Validation:');
      addTestResult('   Expected: Red border + "Please enter a complete address" error');
      addTestResult('   When: Address is less than 10 characters');
      addTestResult('');
      addTestResult('4. Multiline Address Input:');
      addTestResult('   Expected: Text input accepts multiple lines and line breaks');
      addTestResult('   When: User enters address with street, city, state, zip');
      addTestResult('');
      addTestResult('5. Delivery Note Display:');
      addTestResult('   Expected: Helpful note about delivery area and timing');
      addTestResult('   When: Delivery option is selected');
      addTestResult('');
      addTestResult('6. Valid Address Acceptance:');
      addTestResult('   Expected: No errors, green border or normal styling');
      addTestResult('   When: Complete address (10+ characters) is entered');
      addTestResult('');
      
      addTestResult('🧪 TEST INSTRUCTIONS:');
      addTestResult('1. Navigate to checkout and select "Delivery"');
      addTestResult('2. Try submitting without entering address');
      addTestResult('3. Enter short address: "123 Main"');
      addTestResult('4. Enter complete address with multiple lines:');
      addTestResult('   "123 Main Street');
      addTestResult('   Anytown, CA 12345"');
      addTestResult('5. Verify delivery note is visible');
      addTestResult('6. Check address validation clears with valid input');
      addTestResult('');
      
      addTestResult('📝 RECORD RESULTS:');
      addTestResult('□ Address field appears for delivery orders');
      addTestResult('□ Empty address shows required error');
      addTestResult('□ Short address shows completeness error');
      addTestResult('□ Multiline input works correctly');
      addTestResult('□ Delivery note is displayed');
      addTestResult('□ Valid address clears validation errors');
      addTestResult('');
      
      // Navigate to checkout
      navigation.navigate('Checkout');
      
    } catch (error) {
      addTestResult(`❌ Test 3 Error: ${error}`);
    }
  };

  // Test 4: Order Confirmation Flow
  const testOrderConfirmation = async () => {
    try {
      addTestResult('=== Test 4: Order Confirmation Flow ===');
      addTestResult('');
      
      // Setup cart with items
      await clearCart();
      await new Promise(resolve => setTimeout(resolve, 200));
      await addItem(testProducts[0], 1);
      await addItem(testProducts[1], 2);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const cartTotal = (testProducts[0].price * 1) + (testProducts[1].price * 2);
      const tax = Math.round(cartTotal * 0.085 * 100) / 100;
      const total = cartTotal + tax;
      
      addTestResult('✅ Cart setup complete');
      addTestResult(`💰 Expected cart total: $${cartTotal.toFixed(2)}`);
      addTestResult(`💵 Expected tax (8.5%): $${tax.toFixed(2)}`);
      addTestResult(`💳 Expected final total: $${total.toFixed(2)}`);
      addTestResult('');
      
      // Expected Behaviors
      addTestResult('📋 EXPECTED BEHAVIORS:');
      addTestResult('1. Successful Order Submission:');
      addTestResult('   Expected: Navigation to OrderConfirmation screen');
      addTestResult('   When: Valid form submitted with all required fields');
      addTestResult('');
      addTestResult('2. Order Confirmation Display:');
      addTestResult('   Expected: Green checkmark + "Order Confirmed!" message');
      addTestResult('   When: Order submission succeeds');
      addTestResult('');
      addTestResult('3. Order Details Display:');
      addTestResult('   Expected: Customer info, items, quantities, prices, totals');
      addTestResult('   When: On confirmation screen');
      addTestResult('');
      addTestResult('4. Automatic Cart Clearing:');
      addTestResult('   Expected: Cart becomes empty (0 items)');
      addTestResult('   When: Order confirmation screen loads');
      addTestResult('');
      addTestResult('5. Continue Shopping Button:');
      addTestResult('   Expected: Navigation back to main app (Shop tab)');
      addTestResult('   When: "Continue Shopping" button pressed');
      addTestResult('');
      addTestResult('6. Order ID Generation:');
      addTestResult('   Expected: Unique order number displayed (e.g., "Order #12345")');
      addTestResult('   When: Order is successfully created');
      addTestResult('');
      
      addTestResult('🧪 TEST INSTRUCTIONS:');
      addTestResult('1. Navigate to checkout');
      addTestResult('2. Fill all required customer information:');
      addTestResult('   - Name: "Test Customer"');
      addTestResult('   - Email: "test@example.com"');
      addTestResult('   - Phone: "555-123-4567"');
      addTestResult('3. Select pickup with future date/time');
      addTestResult('4. Add order notes: "Test order"');
      addTestResult('5. Submit order and wait for confirmation');
      addTestResult('6. Verify all order details on confirmation screen');
      addTestResult('7. Check cart is empty (go to Cart tab)');
      addTestResult('8. Test "Continue Shopping" navigation');
      addTestResult('');
      
      addTestResult('📝 RECORD RESULTS:');
      addTestResult('□ Order submits successfully with valid data');
      addTestResult('□ Confirmation screen shows success message');
      addTestResult('□ Order details display correctly');
      addTestResult('□ Cart is automatically cleared');
      addTestResult('□ Order ID is generated and displayed');
      addTestResult('□ Continue Shopping navigates correctly');
      addTestResult('□ Tax calculation matches expected amount');
      addTestResult('');
      
      // Navigate to checkout
      navigation.navigate('Checkout');
      
    } catch (error) {
      addTestResult(`❌ Test 4 Error: ${error}`);
    }
  };

  // Test 5: Error Handling Flow
  const testErrorHandling = async () => {
    try {
      addTestResult('=== Test 5: Error Handling ===');
      addTestResult('');
      
      // Setup cart with items
      await clearCart();
      await new Promise(resolve => setTimeout(resolve, 200));
      await addItem(testProducts[0], 1);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      addTestResult('✅ Cart setup complete');
      addTestResult('🔄 Note: Network errors occur randomly (~5% chance)');
      addTestResult('');
      
      // Expected Behaviors
      addTestResult('📋 EXPECTED BEHAVIORS:');
      addTestResult('1. Validation Error Summary:');
      addTestResult('   Expected: Red error box with list of all validation issues');
      addTestResult('   When: Submit button pressed with invalid fields');
      addTestResult('');
      addTestResult('2. Field-Specific Error Messages:');
      addTestResult('   Expected: Individual error text below each invalid field');
      addTestResult('   When: Field validation fails');
      addTestResult('');
      addTestResult('3. Submit Button Disabled State:');
      addTestResult('   Expected: Button grayed out and unclickable');
      addTestResult('   When: Form has validation errors');
      addTestResult('');
      addTestResult('4. Error Clearing on Input:');
      addTestResult('   Expected: Errors disappear as user fixes each field');
      addTestResult('   When: Invalid field becomes valid');
      addTestResult('');
      addTestResult('5. Network Error Handling:');
      addTestResult('   Expected: Error alert + navigation to OrderConfirmation with error');
      addTestResult('   When: Server returns error (5% chance simulation)');
      addTestResult('');
      addTestResult('6. Retry Mechanism:');
      addTestResult('   Expected: "Try Again" button returns to checkout');
      addTestResult('   When: On error confirmation screen');
      addTestResult('');
      
      addTestResult('🧪 TEST INSTRUCTIONS:');
      addTestResult('1. Navigate to checkout');
      addTestResult('2. Try submitting completely empty form');
      addTestResult('3. Observe validation error summary');
      addTestResult('4. Fill name field, verify error clears');
      addTestResult('5. Enter invalid email, check field-specific error');
      addTestResult('6. Fix all validation errors');
      addTestResult('7. Submit multiple times to trigger network error');
      addTestResult('8. If error occurs, test "Try Again" button');
      addTestResult('');
      
      addTestResult('📝 RECORD RESULTS:');
      addTestResult('□ Validation error summary appears on submit');
      addTestResult('□ Field-specific errors show below inputs');
      addTestResult('□ Submit button disables with errors');
      addTestResult('□ Errors clear when fields become valid');
      addTestResult('□ Network errors show appropriate message');
      addTestResult('□ Retry mechanism works correctly');
      addTestResult('');
      
      // Navigate to checkout
      navigation.navigate('Checkout');
      
    } catch (error) {
      addTestResult(`❌ Test 5 Error: ${error}`);
    }
  };

  // Test 6: Complete User Journey
  const testCompleteJourney = async () => {
    try {
      addTestResult('=== Test 6: Complete User Journey ===');
      addTestResult('');
      
      // Setup cart with multiple items
      await clearCart();
      await new Promise(resolve => setTimeout(resolve, 200));
      await addItem(testProducts[0], 2);
      await addItem(testProducts[1], 1);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const cartTotal = (testProducts[0].price * 2) + (testProducts[1].price * 1);
      const tax = Math.round(cartTotal * 0.085 * 100) / 100;
      const total = cartTotal + tax;
      
      addTestResult('✅ Cart setup complete');
      addTestResult(`💰 Expected subtotal: $${cartTotal.toFixed(2)}`);
      addTestResult(`💵 Expected tax (8.5%): $${tax.toFixed(2)}`);
      addTestResult(`💳 Expected final total: $${total.toFixed(2)}`);
      addTestResult('');
      
      // Expected Behaviors for Complete Journey
      addTestResult('📋 EXPECTED BEHAVIORS - COMPLETE FLOW:');
      addTestResult('1. Checkout Navigation:');
      addTestResult('   Expected: Smooth transition from test to checkout screen');
      addTestResult('   When: Navigate button pressed');
      addTestResult('');
      addTestResult('2. Form Completion:');
      addTestResult('   Expected: All fields accept input without errors');
      addTestResult('   When: Valid customer information entered');
      addTestResult('');
      addTestResult('3. Delivery Option Selection:');
      addTestResult('   Expected: Address field appears, date/time pickers hidden');
      addTestResult('   When: "Delivery" radio button selected');
      addTestResult('');
      addTestResult('4. Order Summary Display:');
      addTestResult('   Expected: Correct item count, prices, tax, and total');
      addTestResult('   When: All form fields completed');
      addTestResult('');
      addTestResult('5. Order Submission Success:');
      addTestResult('   Expected: Loading state, then navigation to confirmation');
      addTestResult('   When: Submit button pressed with valid data');
      addTestResult('');
      addTestResult('6. Order Confirmation Details:');
      addTestResult('   Expected: All order info displayed accurately');
      addTestResult('   When: Confirmation screen loads');
      addTestResult('');
      addTestResult('7. Cart State After Order:');
      addTestResult('   Expected: Cart tab shows 0 items, empty state');
      addTestResult('   When: Order successfully confirmed');
      addTestResult('');
      addTestResult('8. Return Navigation:');
      addTestResult('   Expected: Clean navigation back to Shop tab');
      addTestResult('   When: "Continue Shopping" pressed');
      addTestResult('');
      
      addTestResult('🧪 COMPLETE TEST INSTRUCTIONS:');
      addTestResult('Follow this exact sequence:');
      addTestResult('');
      addTestResult('STEP 1: Navigate to Checkout');
      addTestResult('  • Press checkout button when it appears');
      addTestResult('');
      addTestResult('STEP 2: Fill Customer Information');
      addTestResult('  • Name: "Test User"');
      addTestResult('  • Email: "test@farmstand.com"');
      addTestResult('  • Phone: "555-987-6543"');
      addTestResult('');
      addTestResult('STEP 3: Select Delivery');
      addTestResult('  • Choose "Delivery" radio button');
      addTestResult('  • Address: "456 Oak Avenue\nFarmtown, CA 98765"');
      addTestResult('');
      addTestResult('STEP 4: Add Order Notes');
      addTestResult('  • Notes: "Complete journey test order"');
      addTestResult('');
      addTestResult('STEP 5: Verify Order Summary');
      addTestResult(`  • Check subtotal: $${cartTotal.toFixed(2)}`);
      addTestResult(`  • Check tax: $${tax.toFixed(2)}`);
      addTestResult(`  • Check total: $${total.toFixed(2)}`);
      addTestResult('');
      addTestResult('STEP 6: Submit Order');
      addTestResult('  • Press "Place Order" button');
      addTestResult('  • Wait for confirmation screen');
      addTestResult('');
      addTestResult('STEP 7: Verify Confirmation');
      addTestResult('  • Check order ID is displayed');
      addTestResult('  • Verify all order details match');
      addTestResult('');
      addTestResult('STEP 8: Check Cart Cleared');
      addTestResult('  • Navigate to Cart tab');
      addTestResult('  • Verify cart shows 0 items');
      addTestResult('');
      addTestResult('STEP 9: Return to Shopping');
      addTestResult('  • Go back to confirmation screen');
      addTestResult('  • Press "Continue Shopping"');
      addTestResult('  • Verify navigation to Shop tab');
      addTestResult('');
      
      addTestResult('📝 COMPREHENSIVE RESULTS CHECKLIST:');
      addTestResult('□ 1. Checkout navigation works smoothly');
      addTestResult('□ 2. All form fields accept valid input');
      addTestResult('□ 3. Delivery option shows address field');
      addTestResult('□ 4. Order summary calculations are correct');
      addTestResult('□ 5. Order submits successfully');
      addTestResult('□ 6. Confirmation screen shows all details');
      addTestResult('□ 7. Cart is automatically cleared');
      addTestResult('□ 8. Continue Shopping navigation works');
      addTestResult('□ 9. No errors or crashes during flow');
      addTestResult('□ 10. User experience feels smooth and intuitive');
      addTestResult('');
      
      // Navigate to checkout
      navigation.navigate('Checkout');
      
    } catch (error) {
      addTestResult(`❌ Test 6 Error: ${error}`);
    }
  };

  // Run all tests (navigation-based)
  const runAllTests = async () => {
    clearTestResults();
    
    addTestResult('🧪 Enhanced Checkout Testing Guide');
    addTestResult('');
    addTestResult('📝 This test provides guided scenarios');
    addTestResult('   for manual testing of enhanced features.');
    addTestResult('');
    addTestResult('🎯 Use individual test buttons below');
    addTestResult('   to set up specific test scenarios.');
    addTestResult('');
    addTestResult('✅ Each test will navigate to checkout');
    addTestResult('   with pre-configured cart items.');
    addTestResult('');
  };

  const setupTestData = async () => {
    await clearCart();
    addTestResult('Test environment reset - cart cleared');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Enhanced Checkout Test Screen</Text>
      <Text style={styles.subtitle}>
        Test advanced validation, date/time picker, and order confirmation
      </Text>

      {/* Test Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Controls</Text>
        
        <TouchableOpacity style={styles.button} onPress={setupTestData}>
          <Text style={styles.buttonText}>🔄 Reset Test Environment</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={runAllTests}>
          <Text style={styles.buttonText}>📋 Show Testing Guide</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.clearButton} onPress={clearTestResults}>
          <Text style={styles.clearButtonText}>🗑️ Clear Results</Text>
        </TouchableOpacity>
      </View>

      {/* Individual Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Guided Test Scenarios</Text>
        
        <TouchableOpacity style={styles.testButton} onPress={testFormValidation}>
          <Text style={styles.testButtonText}>Test 1: Form Validation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={testDateTimePicker}>
          <Text style={styles.testButtonText}>Test 2: Date/Time Picker</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={testDeliveryValidation}>
          <Text style={styles.testButtonText}>Test 3: Delivery Validation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={testOrderConfirmation}>
          <Text style={styles.testButtonText}>Test 4: Order Confirmation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={testErrorHandling}>
          <Text style={styles.testButtonText}>Test 5: Error Handling</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={testCompleteJourney}>
          <Text style={styles.testButtonText}>Test 6: Complete Journey</Text>
        </TouchableOpacity>
      </View>

      {/* Current Cart Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Cart Status</Text>
        <Text style={styles.statusText}>Items: {items.length}</Text>
        <Text style={styles.statusText}>
          Total: ${items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0).toFixed(2)}
        </Text>
        {items.length > 0 && (
          <View style={styles.cartItems}>
            {items.map((item, index) => (
              <Text key={index} style={styles.cartItem}>
                • {item.product.name} × {item.quantity}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Enhanced Features Guide */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Enhanced Features to Test</Text>
        
        <View style={styles.featureList}>
          <Text style={styles.featureTitle}>✅ Form Validation</Text>
          <Text style={styles.featureDesc}>• Real-time validation with error highlighting</Text>
          <Text style={styles.featureDesc}>• Email format validation</Text>
          <Text style={styles.featureDesc}>• Phone number validation</Text>
          <Text style={styles.featureDesc}>• Required field validation</Text>
        </View>
        
        <View style={styles.featureList}>
          <Text style={styles.featureTitle}>📅 Date/Time Picker</Text>
          <Text style={styles.featureDesc}>• Native date picker for pickup orders</Text>
          <Text style={styles.featureDesc}>• Time selection with proper formatting</Text>
          <Text style={styles.featureDesc}>• Past date validation</Text>
          <Text style={styles.featureDesc}>• Platform-specific UI (iOS/Android)</Text>
        </View>
        
        <View style={styles.featureList}>
          <Text style={styles.featureTitle}>🏠 Enhanced Address Input</Text>
          <Text style={styles.featureDesc}>• Multiline address input for delivery</Text>
          <Text style={styles.featureDesc}>• Address completeness validation</Text>
          <Text style={styles.featureDesc}>• Helpful delivery instructions</Text>
        </View>
        
        <View style={styles.featureList}>
          <Text style={styles.featureTitle}>✅ Order Confirmation</Text>
          <Text style={styles.featureDesc}>• Detailed order confirmation screen</Text>
          <Text style={styles.featureDesc}>• Success and error state handling</Text>
          <Text style={styles.featureDesc}>• Automatic cart clearing</Text>
          <Text style={styles.featureDesc}>• Navigation back to shopping</Text>
        </View>
      </View>

      {/* Test Results */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Instructions</Text>
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
  cartItems: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
  },
  cartItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  featureList: {
    marginBottom: 15,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5,
  },
  featureDesc: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
    marginBottom: 2,
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
