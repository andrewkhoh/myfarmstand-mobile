import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
// import { BarCodeScanner } from 'expo-barcode-scanner';
// import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentUser } from '../hooks/useAuth';
import { Screen, Button, Card } from '../components';
import { spacing, colors } from '../utils/theme';
import { updateOrderStatus } from '../services/orderService';

interface ScannedOrderData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pickupDate?: string;
  pickupTime?: string;
  total: number;
  status: string;
  timestamp: string;
}

export const StaffQRScannerScreen: React.FC = () => {
  const { data: user } = useCurrentUser();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedOrderData | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if user is staff/admin
  const isStaff = user?.role === 'admin' || user?.role === 'staff';

  useEffect(() => {
    // Mock permission granting for testing without native modules
    const mockPermissionRequest = async () => {
      // Simulate permission request delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHasPermission(true);
    };

    if (isStaff) {
      mockPermissionRequest();
    }
  }, [isStaff]);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    
    try {
      const orderData: ScannedOrderData = JSON.parse(data);
      
      // Validate the scanned data structure
      if (!orderData.orderId || !orderData.customerName || !orderData.total) {
        Alert.alert('Invalid QR Code', 'This QR code does not contain valid order information.');
        setScanned(false);
        return;
      }
      
      setScannedData(orderData);
      setShowOrderDetails(true);
    } catch (error) {
      Alert.alert('Invalid QR Code', 'Unable to read QR code data. Please try again.');
      setScanned(false);
    }
  };

  const markOrderAsPickedUp = async () => {
    if (!scannedData) return;
    
    setIsProcessing(true);
    
    try {
      // Update order status using the real service
      const result = await updateOrderStatus(scannedData.orderId, 'picked_up');
      
      if (result.success) {
        Alert.alert(
          'Order Completed',
          result.message || `Order ${scannedData.orderId} has been marked as picked up.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowOrderDetails(false);
                setScannedData(null);
                setScanned(false);
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to update order status. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setScannedData(null);
    setShowOrderDetails(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Not specified';
    return timeString;
  };

  // Access control - only staff can use this screen
  if (!isStaff) {
    return (
      <Screen padding>
        <View style={styles.accessDeniedContainer}>
          <Ionicons name="lock-closed" size={80} color={colors.error} />
          <Text style={styles.accessDeniedTitle}>Access Restricted</Text>
          <Text style={styles.accessDeniedMessage}>
            This feature is only available to staff members.
          </Text>
        </View>
      </Screen>
    );
  }

  if (hasPermission === null) {
    return (
      <Screen padding>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </Screen>
    );
  }

  if (hasPermission === false) {
    return (
      <Screen padding>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={80} color={colors.error} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Please enable camera access in your device settings to scan QR codes.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Staff QR Scanner</Text>
          <Text style={styles.headerSubtitle}>
            Scan customer QR codes to verify pickup orders
          </Text>
        </View>

        <View style={styles.scannerContainer}>
          {/* Mock Scanner View for Testing */}
          <View style={styles.mockScanner}>
            <Text style={styles.mockScannerText}>Mock QR Scanner</Text>
            <Text style={styles.mockScannerSubtext}>
              {scanned ? 'QR Code Scanned!' : 'Tap "Test Scan" to simulate scanning'}
            </Text>
          </View>
          
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
            <TouchableOpacity 
              style={styles.testScanButton}
              onPress={() => {
                if (!scanned) {
                  // Simulate scanning a test QR code
                  const mockQRData = {
                    orderId: 'ORD-TEST-001',
                    customerName: 'John Doe',
                    customerEmail: 'john@example.com',
                    customerPhone: '(555) 123-4567',
                    pickupDate: new Date().toISOString().split('T')[0],
                    pickupTime: '2:00 PM - 3:00 PM',
                    total: 45.99,
                    status: 'ready',
                    timestamp: new Date().toISOString()
                  };
                  handleBarCodeScanned({ type: 'QR', data: JSON.stringify(mockQRData) });
                }
              }}
            >
              <Text style={styles.testScanButtonText}>
                {scanned ? 'QR Scanned!' : 'Test Scan'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.controls}>
          {scanned && (
            <Button
              title="Scan Another Code"
              variant="outline"
              onPress={resetScanner}
              style={styles.resetButton}
            />
          )}
        </View>

        {/* Order Details Modal */}
        <Modal
          visible={showOrderDetails}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Verification</Text>
              <TouchableOpacity onPress={() => setShowOrderDetails(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {scannedData && (
                <>
                  <Card variant="outlined" style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <Text style={styles.orderId}>Order #{scannedData.orderId}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(scannedData.status) }]}>
                        <Text style={styles.statusText}>{scannedData.status.toUpperCase()}</Text>
                      </View>
                    </View>

                    <View style={styles.customerInfo}>
                      <Text style={styles.sectionTitle}>Customer Information</Text>
                      <Text style={styles.detailText}>Name: {scannedData.customerName}</Text>
                      <Text style={styles.detailText}>Email: {scannedData.customerEmail}</Text>
                      <Text style={styles.detailText}>Phone: {scannedData.customerPhone}</Text>
                    </View>

                    <View style={styles.pickupInfo}>
                      <Text style={styles.sectionTitle}>Pickup Details</Text>
                      <Text style={styles.detailText}>Date: {formatDate(scannedData.pickupDate)}</Text>
                      <Text style={styles.detailText}>Time: {formatTime(scannedData.pickupTime)}</Text>
                      <Text style={styles.totalText}>Total: ${scannedData.total.toFixed(2)}</Text>
                    </View>
                  </Card>

                  <View style={styles.actionButtons}>
                    <Button
                      title="Cancel"
                      variant="outline"
                      onPress={() => setShowOrderDetails(false)}
                      style={styles.actionButton}
                    />
                    <Button
                      title="Mark as Picked Up"
                      onPress={markOrderAsPickedUp}
                      loading={isProcessing}
                      style={styles.actionButton}
                    />
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </Modal>
      </View>
    </Screen>
  );
};

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'pending':
      return '#ff9800';
    case 'preparing':
      return '#2196f3';
    case 'ready':
      return '#4caf50';
    case 'completed':
      return '#2e7d32';
    case 'picked_up':
      return '#388e3c';
    default:
      return '#757575';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.primary[500],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.inverse,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.inverse,
    opacity: 0.9,
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  scanner: {
    flex: 1,
  },
  mockScanner: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockScannerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.inverse,
    marginBottom: spacing.sm,
  },
  mockScannerSubtext: {
    fontSize: 16,
    color: colors.text.inverse,
    textAlign: 'center',
    opacity: 0.8,
  },
  testScanButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginTop: spacing.lg,
  },
  testScanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: colors.primary[500],
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scannerInstructions: {
    marginTop: spacing.lg,
    fontSize: 16,
    color: colors.text.inverse,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  controls: {
    padding: spacing.lg,
  },
  resetButton: {
    marginBottom: spacing.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  orderCard: {
    marginBottom: spacing.lg,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  customerInfo: {
    marginBottom: spacing.md,
  },
  pickupInfo: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  detailText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary[600],
    marginTop: spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  accessDeniedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.error,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  accessDeniedMessage: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  permissionText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
