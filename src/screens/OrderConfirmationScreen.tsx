import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { RootStackParamList, Order } from '../types';

type OrderConfirmationRouteProp = RouteProp<RootStackParamList, 'OrderConfirmation'>;
type OrderConfirmationNavigationProp = StackNavigationProp<RootStackParamList, 'OrderConfirmation'>;

export const OrderConfirmationScreen: React.FC = () => {
  const route = useRoute<OrderConfirmationRouteProp>();
  const navigation = useNavigation<OrderConfirmationNavigationProp>();
  
  const { order, success, error } = route.params;

  const handleContinueShopping = () => {
    // Navigate back to the main shop screen
    navigation.navigate('Main');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Not specified';
    return timeString;
  };

  // Generate QR code data for pickup verification
  const generatePickupQRData = (order: Order): string => {
    const qrData = {
      orderId: order.id,
      customerName: order.customerInfo.name,
      customerEmail: order.customerInfo.email,
      customerPhone: order.customerInfo.phone,
      pickupDate: order.pickupDate,
      pickupTime: order.pickupTime,
      total: order.total,
      status: order.status,
      timestamp: new Date().toISOString()
    };
    return JSON.stringify(qrData);
  };

  if (!success && error) {
    // Error state
    return (
      <ScrollView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="close-circle" size={80} color="#d32f2f" />
          <Text style={styles.errorTitle}>Order Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.continueButton} onPress={handleContinueShopping}>
            <Text style={styles.continueButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (!order) {
    // No order data
    return (
      <ScrollView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={80} color="#ff9800" />
          <Text style={styles.errorTitle}>No Order Information</Text>
          <Text style={styles.errorMessage}>Unable to display order details</Text>
          
          <TouchableOpacity style={styles.continueButton} onPress={handleContinueShopping}>
            <Text style={styles.continueButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Success state
  return (
    <ScrollView style={styles.container}>
      <View style={styles.successContainer}>
        <Ionicons name="checkmark-circle" size={80} color="#2e7d32" />
        <Text style={styles.successTitle}>Order Confirmed!</Text>
        <Text style={styles.successMessage}>
          Thank you for your order. You will receive a confirmation email shortly.
        </Text>
      </View>

      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Order ID:</Text>
          <Text style={styles.detailValue}>{order.id}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status:</Text>
          <Text style={[styles.detailValue, styles.statusText]}>{order.status.toUpperCase()}</Text>
        </View>
        
        {/* Order Items */}
        <View style={styles.itemsContainer}>
          <Text style={styles.itemsSubtitle}>Items Ordered:</Text>
          {order.items.map((item, index) => (
            <View key={index} style={styles.orderItem}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Text style={styles.itemDetails}>
                {item.quantity} × ${item.price.toFixed(2)} = ${item.subtotal.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
        
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Order Total:</Text>
          <Text style={[styles.detailValue, styles.totalText]}>${order.total.toFixed(2)}</Text>
        </View>
      </View>

      {/* Customer Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Information</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Name:</Text>
          <Text style={styles.detailValue}>{order.customerInfo.name}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email:</Text>
          <Text style={styles.detailValue}>{order.customerInfo.email}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone:</Text>
          <Text style={styles.detailValue}>{order.customerInfo.phone}</Text>
        </View>
      </View>

      {/* Fulfillment Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fulfillment</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Method:</Text>
          <Text style={styles.detailValue}>
            {order.fulfillmentType === 'pickup' ? '🏪 Pickup' : '🚚 Delivery'}
          </Text>
        </View>
        
        {Boolean(order.fulfillmentType === 'pickup') && (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pickup Date:</Text>
              <Text style={styles.detailValue}>{formatDate(order.pickupDate)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pickup Time:</Text>
              <Text style={styles.detailValue}>{formatTime(order.pickupTime)}</Text>
            </View>
          </>
        )}
        
        {Boolean(order.fulfillmentType === 'delivery' && order.deliveryAddress) && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Delivery Address:</Text>
            <Text style={styles.detailValue}>{order.deliveryAddress}</Text>
          </View>
        )}
        
        {Boolean(order.notes) && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Notes:</Text>
            <Text style={styles.detailValue}>{order.notes}</Text>
          </View>
        )}
      </View>

      {/* QR Code for Pickup */}
      {order.fulfillmentType === 'pickup' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup QR Code</Text>
          <Text style={styles.qrInstructions}>
            Show this QR code at pickup for quick verification
          </Text>
          
          <View style={styles.qrContainer}>
            <QRCode
              value={generatePickupQRData(order)}
              size={200}
              color="#000000"
              backgroundColor="#ffffff"
              logo={require('../../assets/icon.png')}
              logoSize={30}
              logoBackgroundColor="transparent"
            />
          </View>
          
          {/* <View style={styles.qrDetails}>
            <Text style={styles.qrDetailLabel}>Order ID: {order.id}</Text>
            <Text style={styles.qrDetailLabel}>Customer: {order.customerInfo.name}</Text>
            <Text style={styles.qrDetailLabel}>Pickup: {formatDate(order.pickupDate)} at {formatTime(order.pickupTime)}</Text>
          </View> */}
        </View>
      )}



      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinueShopping}>
          <Text style={styles.continueButtonText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  successContainer: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginTop: 15,
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginTop: 15,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  statusText: {
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  totalText: {
    color: '#2e7d32',
    fontWeight: 'bold',
    fontSize: 16,
  },
  itemsContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  itemsSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: '#2e7d32',
    paddingTop: 12,
    marginTop: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
  qrInstructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrDetails: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2e7d32',
  },
  qrDetailLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontWeight: '500',
  },
  actionContainer: {
    padding: 20,
  },
  retryButton: {
    backgroundColor: '#d32f2f',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    minWidth: 200,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueButton: {
    backgroundColor: '#2e7d32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 200,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 20,
  },
});
