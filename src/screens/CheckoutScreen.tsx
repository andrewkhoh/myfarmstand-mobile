import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useMutation } from '@tanstack/react-query';
import { useCart } from '../hooks/useCart';
import { submitOrder } from '../services/orderService';
import { CreateOrderRequest, CustomerInfo, FulfillmentType, OrderItem, RootStackParamList } from '../types';

type CheckoutScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OrderConfirmation'>;

export const CheckoutScreen: React.FC = () => {
  const { items, total, clearCart } = useCart();
  const navigation = useNavigation<CheckoutScreenNavigationProp>();
  
  // Form state
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('pickup');
  const [notes, setNotes] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  
  // Date/Time picker state for pickup with smart default (tomorrow 10AM)
  const getDefaultPickupDateTime = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const defaultTime = new Date();
    defaultTime.setHours(10, 0, 0, 0); // 10:00 AM
    
    return { date: tomorrow, time: defaultTime };
  };
  
  const defaultDateTime = getDefaultPickupDateTime();
  const [pickupDate, setPickupDate] = useState<Date>(defaultDateTime.date);
  const [pickupTime, setPickupTime] = useState<Date>(defaultDateTime.time);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Form validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper functions for pickup date/time
  const setPickupToPreset = (day: 'today' | 'tomorrow', time: string) => {
    const now = new Date();
    const targetDate = new Date();
    
    if (day === 'tomorrow') {
      targetDate.setDate(now.getDate() + 1);
    }
    
    const [hours, minutes] = time.split(':').map(Number);
    const targetTime = new Date();
    targetTime.setHours(hours, minutes, 0, 0);
    
    setPickupDate(targetDate);
    setPickupTime(targetTime);
    clearError('pickupDate');
  };

  const formatPickupDateTime = (date: Date, time: Date): string => {
    const dateStr = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
    const timeStr = time.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    return `${dateStr} at ${timeStr}`;
  };

  const getRelativeDateText = (date: Date): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const dateStr = date.toDateString();
    const todayStr = today.toDateString();
    const tomorrowStr = tomorrow.toDateString();
    
    if (dateStr === todayStr) return 'Today';
    if (dateStr === tomorrowStr) return 'Tomorrow';
    
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 2) return 'Day after tomorrow';
    if (diffDays <= 7) return `In ${diffDays} days`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // React Query mutation for order submission
  const orderMutation = useMutation({
    mutationFn: submitOrder,
    onSuccess: async (result) => {
      if (result.success && result.order) {
        // Clear cart first
        await clearCart();
        
        // Navigate to order confirmation screen
        navigation.navigate('OrderConfirmation', {
          order: result.order,
          success: true,
        });
      } else {
        // Navigate to order confirmation with error
        navigation.navigate('OrderConfirmation', {
          success: false,
          error: result.error || 'Failed to submit order',
        });
      }
    },
    onError: (error) => {
      // Navigate to order confirmation with error
      navigation.navigate('OrderConfirmation', {
        success: false,
        error: `Error: ${error.message}`,
      });
    },
  });

  // Convert cart items to order items
  const convertCartToOrderItems = (): OrderItem[] => {
    return items.map(cartItem => ({
      productId: cartItem.product.id,
      productName: cartItem.product.name,
      price: cartItem.product.price,
      quantity: cartItem.quantity,
      subtotal: cartItem.product.price * cartItem.quantity,
    }));
  };

  // Calculate tax and total
  const subtotal = total;
  const tax = Math.round(subtotal * 0.085 * 100) / 100; // 8.5% tax
  const orderTotal = subtotal + tax;

  // Advanced form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Name validation
    if (!customerInfo.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (customerInfo.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    // Email validation
    if (!customerInfo.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerInfo.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }
    
    // Phone validation
    if (!customerInfo.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      const cleanPhone = customerInfo.phone.replace(/[\s\-\(\)]/g, '');
      if (!phoneRegex.test(cleanPhone) || cleanPhone.length < 10) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }
    
    // Delivery address validation
    if (fulfillmentType === 'delivery') {
      if (!deliveryAddress.trim()) {
        newErrors.deliveryAddress = 'Delivery address is required';
      } else if (deliveryAddress.trim().length < 10) {
        newErrors.deliveryAddress = 'Please enter a complete address';
      }
    }
    
    // Pickup date validation
    if (fulfillmentType === 'pickup') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(pickupDate);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.pickupDate = 'Pickup date cannot be in the past';
      }
    }
    
    // Cart validation
    if (items.length === 0) {
      newErrors.cart = 'Please add items to your cart before checkout';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle order submission
  const handleSubmitOrder = () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors below and try again.');
      return;
    }

    // Create order request
    const orderRequest: CreateOrderRequest = {
      customerInfo: {
        ...customerInfo,
        address: fulfillmentType === 'delivery' ? deliveryAddress : customerInfo.address,
      },
      items: convertCartToOrderItems(),
      fulfillmentType,
      notes: notes.trim() || undefined,
      pickupDate: fulfillmentType === 'pickup' ? pickupDate.toISOString().split('T')[0] : undefined,
      pickupTime: fulfillmentType === 'pickup' ? pickupTime.toTimeString().split(' ')[0].substring(0, 5) : undefined,
      deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress : undefined,
    };

    // Submit order
    orderMutation.mutate(orderRequest);
  };
  
  // Date/Time picker handlers with sequential flow for both platforms
  const handleDateChange = (event: any, selectedDate?: Date) => {
    // Close date picker
    setShowDatePicker(false);
    
    if (selectedDate) {
      setPickupDate(selectedDate);
      setErrors(prev => ({ ...prev, pickupDate: '' }));
      
      // Automatically show time picker after date selection (both platforms)
      setTimeout(() => {
        setShowTimePicker(true);
      }, Platform.OS === 'ios' ? 300 : 100);
    }
  };
  
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    // Close time picker
    setShowTimePicker(false);
    
    if (selectedTime) {
      setPickupTime(selectedTime);
    }
  };
  
  // Clear specific error when user starts typing
  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <Text style={styles.emptySubtext}>Add some items to proceed with checkout</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Checkout</Text>
      
      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        {items.map((item, index) => (
          <View key={index} style={styles.orderItem}>
            <Text style={styles.itemName}>{item.product.name}</Text>
            <Text style={styles.itemDetails}>
              {item.quantity} × ${item.product.price.toFixed(2)} = ${(item.quantity * item.product.price).toFixed(2)}
            </Text>
          </View>
        ))}
        
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax (8.5%):</Text>
            <Text style={styles.totalValue}>${tax.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.finalTotal]}>
            <Text style={styles.finalTotalLabel}>Total:</Text>
            <Text style={styles.finalTotalValue}>${orderTotal.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Customer Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Information</Text>
        
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          placeholder="Full Name *"
          value={customerInfo.name}
          onChangeText={(text) => {
            setCustomerInfo(prev => ({ ...prev, name: text }));
            clearError('name');
          }}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="Email Address *"
          value={customerInfo.email}
          onChangeText={(text) => {
            setCustomerInfo(prev => ({ ...prev, email: text }));
            clearError('email');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        
        <TextInput
          style={[styles.input, errors.phone && styles.inputError]}
          placeholder="Phone Number *"
          value={customerInfo.phone}
          onChangeText={(text) => {
            setCustomerInfo(prev => ({ ...prev, phone: text }));
            clearError('phone');
          }}
          keyboardType="phone-pad"
        />
        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
      </View>

      {/* Fulfillment Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fulfillment Method</Text>
        
        <View style={styles.fulfillmentContainer}>
          <TouchableOpacity
            style={[
              styles.fulfillmentOption,
              fulfillmentType === 'pickup' && styles.fulfillmentSelected
            ]}
            onPress={() => setFulfillmentType('pickup')}
          >
            <Text style={[
              styles.fulfillmentText,
              fulfillmentType === 'pickup' && styles.fulfillmentTextSelected
            ]}>
              🏪 Pickup
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.fulfillmentOption,
              fulfillmentType === 'delivery' && styles.fulfillmentSelected
            ]}
            onPress={() => setFulfillmentType('delivery')}
          >
            <Text style={[
              styles.fulfillmentText,
              fulfillmentType === 'delivery' && styles.fulfillmentTextSelected
            ]}>
              🚚 Delivery
            </Text>
          </TouchableOpacity>
        </View>
        
        {fulfillmentType === 'pickup' && (
          <View>
            <Text style={styles.subSectionTitle}>When would you like to pick up your order?</Text>
            
            {/* Quick Preset Options */}
            <View style={styles.presetContainer}>
              <Text style={styles.presetLabel}>Quick Options:</Text>
              <View style={styles.presetButtonsRow}>
                <TouchableOpacity
                  style={styles.presetButton}
                  onPress={() => setPickupToPreset('today', '17:00')}
                >
                  <Text style={styles.presetButtonText}>Today 5PM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.presetButton, styles.presetButtonDefault]}
                  onPress={() => setPickupToPreset('tomorrow', '10:00')}
                >
                  <Text style={[styles.presetButtonText, styles.presetButtonTextDefault]}>Tomorrow 10AM ⭐</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetButton}
                  onPress={() => setPickupToPreset('tomorrow', '17:00')}
                >
                  <Text style={styles.presetButtonText}>Tomorrow 5PM</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Combined Date/Time Display */}
            <View style={styles.dateTimeContainer}>
              <Text style={styles.selectedDateTimeLabel}>Selected Pickup Time:</Text>
              <TouchableOpacity
                style={[styles.combinedDateTimeButton, errors.pickupDate && styles.inputError]}
                activeOpacity={0.7}
                onPress={() => {
                  console.log('📅 Edit button pressed - opening date picker');
                  setShowDatePicker(true);
                  clearError('pickupDate');
                }}
              >
                <View style={styles.dateTimeDisplay}>
                  <Text style={styles.dateTimeMainText}>
                    {formatPickupDateTime(pickupDate, pickupTime)}
                  </Text>
                  <Text style={styles.dateTimeSubText}>
                    {getRelativeDateText(pickupDate)}
                  </Text>
                </View>
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
              {errors.pickupDate && <Text style={styles.errorText}>{errors.pickupDate}</Text>}
            </View>
            
            {/* Store Hours Info */}
            <View style={styles.storeHoursInfo}>
              <Text style={styles.storeHoursText}>
                🕒 Store Hours: Mon-Sat 9AM-7PM, Sun 10AM-5PM
              </Text>
            </View>
            
            {showDatePicker && (
              <DateTimePicker
                value={pickupDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                minimumDate={new Date()}
                onChange={handleDateChange}
              />
            )}
            
            {showTimePicker && (
              <DateTimePicker
                value={pickupTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={handleTimeChange}
              />
            )}
          </View>
        )}
        
        {fulfillmentType === 'delivery' && (
          <View>
            <Text style={styles.subSectionTitle}>Delivery Address</Text>
            <TextInput
              style={[styles.input, styles.addressInput, errors.deliveryAddress && styles.inputError]}
              placeholder="Street Address *"
              value={deliveryAddress}
              onChangeText={(text) => {
                setDeliveryAddress(text);
                clearError('deliveryAddress');
              }}
              multiline
              numberOfLines={3}
            />
            {errors.deliveryAddress && <Text style={styles.errorText}>{errors.deliveryAddress}</Text>}
            
            <Text style={styles.deliveryNote}>
              💡 Please include apartment/unit number, special delivery instructions, etc.
            </Text>
          </View>
        )}
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Special instructions, dietary restrictions, preferred contact method, etc."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>
      
      {/* General Errors */}
      {(errors.cart || Object.keys(errors).length > 0) && (
        <View style={styles.section}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>⚠️ Please fix the following issues:</Text>
            {errors.cart && <Text style={styles.errorText}>• {errors.cart}</Text>}
            {Object.entries(errors)
              .filter(([key]) => key !== 'cart')
              .map(([key, message]) => (
                <Text key={key} style={styles.errorText}>• {message}</Text>
              ))
            }
          </View>
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, orderMutation.isPending && styles.submitButtonDisabled]}
        onPress={handleSubmitOrder}
        disabled={orderMutation.isPending}
      >
        {orderMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>
            Submit Order - ${orderTotal.toFixed(2)}
          </Text>
        )}
      </TouchableOpacity>
      
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    padding: 20,
    paddingBottom: 10,
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
  orderItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  totalsContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    color: '#333',
  },
  finalTotal: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 8,
    marginTop: 8,
  },
  finalTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  finalTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  fulfillmentContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  fulfillmentOption: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  fulfillmentSelected: {
    borderColor: '#2e7d32',
    backgroundColor: '#e8f5e8',
  },
  fulfillmentText: {
    fontSize: 16,
    color: '#666',
  },
  fulfillmentTextSelected: {
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#2e7d32',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 20,
  },
  // Enhanced validation styles
  inputError: {
    borderColor: '#d32f2f',
    borderWidth: 2,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
  },
  errorTitle: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  // Date/Time picker styles
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    marginTop: 5,
  },
  presetContainer: {
    marginBottom: 20,
  },
  presetLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  presetButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  presetButtonText: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '600',
  },
  dateTimeContainer: {
    marginBottom: 15,
  },
  selectedDateTimeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  combinedDateTimeButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2e7d32',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
  },
  dateTimeDisplay: {
    flex: 1,
  },
  dateTimeMainText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginBottom: 2,
  },
  dateTimeSubText: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '500',
  },
  editIcon: {
    fontSize: 18,
    color: '#2e7d32',
    marginLeft: 10,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  storeHoursInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
  },
  storeHoursText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  // iOS picker modal styles
  iosPickerModal: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    margin: 20,
  },
  // Default preset button styles
  presetButtonDefault: {
    backgroundColor: '#e8f5e8',
    borderColor: '#2e7d32',
    borderWidth: 2,
  },
  presetButtonTextDefault: {
    color: '#1b5e20',
    fontWeight: 'bold',
  },
  // Legacy date/time button styles (kept for compatibility)
  dateTimeButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#333',
  },
  // Address input styles
  addressInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  deliveryNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 16,
  },
});
