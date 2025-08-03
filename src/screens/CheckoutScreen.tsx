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
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../contexts/AuthContext';
import { submitOrder } from '../services/orderService';
import { CreateOrderRequest, CustomerInfo, FulfillmentType, OrderItem, RootStackParamList } from '../types';

type CheckoutScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OrderConfirmation'>;

export const CheckoutScreen: React.FC = () => {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigation = useNavigation<CheckoutScreenNavigationProp>();
  const queryClient = useQueryClient();
  
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('pickup');
  const [notes, setNotes] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  
  // Simplified separate date and time state with smart defaults
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
    const targetDate = new Date();
    
    if (day === 'tomorrow') {
      targetDate.setDate(targetDate.getDate() + 1);
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
    return '';
  };

  // React Query mutation for order submission
  const orderMutation = useMutation({
    mutationFn: submitOrder,
    onSuccess: async (result) => {
      if (result.success && result.order) {
        // Clear cart first
        await clearCart();
        
        // Invalidate order history cache so new order appears in profile
        queryClient.invalidateQueries({ queryKey: ['userOrders'] });
        
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

  // Form validation (customer info now comes from user profile)
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Check if user profile is complete (should always be true now)
    if (!user?.name || !user?.email || !user?.phone || !user?.address) {
      Alert.alert('Profile Incomplete', 'Please complete your profile before placing an order.');
      return false;
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
      // Create user-friendly error message
      const errorMessages = Object.values(errors).filter(msg => msg.length > 0);
      const errorText = errorMessages.length > 0 
        ? errorMessages.join('\n• ') 
        : 'Please check your information and try again.';
      
      Alert.alert(
        'Please Complete Required Fields',
        `• ${errorText}`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    // Create order request using user profile data
    const orderRequest: CreateOrderRequest = {
      customerInfo: {
        name: user!.name,
        email: user!.email,
        phone: user!.phone,
        address: fulfillmentType === 'delivery' ? deliveryAddress : (user!.address || ''),
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
  
  // Modal picker handlers
  const handleDateConfirm = (selectedDate: Date) => {
    setPickupDate(selectedDate);
    setErrors(prev => ({ ...prev, pickupDate: '' }));
    setShowDatePicker(false);
  };
  
  const handleTimeConfirm = (selectedTime: Date) => {
    setPickupTime(selectedTime);
    setShowTimePicker(false);
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
    <>
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
    >
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
            
            {/* Pickup Date Selection */}
            <View style={styles.dateSelectionContainer}>
              <Text style={styles.dateSelectionLabel}>Pickup Date:</Text>
              <TouchableOpacity
                style={[styles.dateButton, errors.pickupDate && styles.inputError]}
                activeOpacity={0.7}
                onPress={() => {
                  setShowDatePicker(true);
                  clearError('pickupDate');
                }}
              >
                <Text style={styles.dateButtonText}>
                  {pickupDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                  {getRelativeDateText(pickupDate) && (
                    <Text style={styles.relativeDateText}> ({getRelativeDateText(pickupDate)})</Text>
                  )}
                </Text>
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
              {errors.pickupDate && <Text style={styles.errorText}>{errors.pickupDate}</Text>}
            </View>
            
            {/* Pickup Time Selection */}
            <View style={styles.timeSelectionContainer}>
              <Text style={styles.timeSelectionLabel}>Pickup Time:</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => {
                  setShowTimePicker(true);
                }}
              >
                <Text style={styles.timeButtonText}>
                  {pickupTime.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </Text>
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
            </View>
            
            {/* Store Hours Info */}
            <View style={styles.storeHoursInfo}>
              <Text style={styles.storeHoursText}>
                🕒 Store Hours: Mon-Sat 9AM-7PM, Sun 10AM-5PM
              </Text>
            </View>
            
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
    
    {/* Modal Date/Time Pickers */}
    <DateTimePickerModal
      isVisible={showDatePicker}
      mode="date"
      date={pickupDate}
      minimumDate={new Date()}
      onConfirm={handleDateConfirm}
      onCancel={() => setShowDatePicker(false)}
      isDarkModeEnabled={false}
      textColor="#000000"
      accentColor="#2e7d32"
      buttonTextColorIOS="#2e7d32"
      modalPropsIOS={{
        supportedOrientations: ['portrait'],
      }}
      pickerContainerStyleIOS={{
        backgroundColor: '#ffffff',
      }}
    />
    
    <DateTimePickerModal
      isVisible={showTimePicker}
      mode="time"
      date={pickupTime}
      onConfirm={handleTimeConfirm}
      onCancel={() => setShowTimePicker(false)}
      isDarkModeEnabled={false}
      textColor="#000000"
      accentColor="#2e7d32"
      buttonTextColorIOS="#2e7d32"
      modalPropsIOS={{
        supportedOrientations: ['portrait'],
      }}
      pickerContainerStyleIOS={{
        backgroundColor: '#ffffff',
      }}
    />
  </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
  pickerHelperText: {
    fontSize: 12,
    color: '#2e7d32',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
    backgroundColor: '#f0f8f0',
    padding: 8,
    borderRadius: 4,
  },
  timeSelectionContainer: {
    marginBottom: 15,
  },
  timeSelectionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  timeButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dateSelectionContainer: {
    marginBottom: 15,
  },
  dateSelectionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  dateButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  relativeDateText: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '500',
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
