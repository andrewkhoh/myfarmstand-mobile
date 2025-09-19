import React from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { InventoryErrorBoundary } from './InventoryErrorBoundary';
import { queryClient } from '../../config/queryClient';
import { inventoryKeys } from '../../utils/queryKeyFactory';

interface Props {
  children: React.ReactNode;
  itemId?: string;
  warehouseId?: string;
  onStockError?: (error: Error) => void;
}

export const StockOperationErrorBoundary: React.FC<Props> = ({
  children,
  itemId,
  warehouseId,
  onStockError,
}) => {
  const handleStockError = async (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Stock operation error:', error);

    // Check for specific stock-related errors
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('out of stock') || errorMessage.includes('insufficient stock')) {
      // Show user-friendly alert for out of stock
      Alert.alert(
        'Insufficient Stock',
        'This operation cannot be completed due to insufficient stock. Please check inventory levels.',
        [
          {
            text: 'View Inventory',
            onPress: () => {
              // Invalidate inventory queries to refresh data
              queryClient.invalidateQueries({
                queryKey: inventoryKeys.all(),
              });
            },
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } else if (errorMessage.includes('concurrent') || errorMessage.includes('conflict')) {
      // Handle concurrent update conflicts
      Alert.alert(
        'Update Conflict',
        'Another user may have modified this item. The data will be refreshed.',
        [
          {
            text: 'Refresh',
            onPress: async () => {
              // Refresh specific item if ID provided
              if (itemId) {
                await queryClient.invalidateQueries({
                  queryKey: inventoryKeys.detail(itemId),
                });
              }
              // Refresh warehouse data if warehouse ID provided
              if (warehouseId) {
                await queryClient.invalidateQueries({
                  queryKey: inventoryKeys.warehouseItems(warehouseId),
                });
              }
            },
          },
        ]
      );
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      // Handle network errors
      Alert.alert(
        'Connection Error',
        'Unable to connect to the server. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    }

    // Call custom error handler if provided
    if (onStockError) {
      onStockError(error);
    }
  };

  const stockErrorFallback = (
    <View style={styles.fallbackContainer}>
      <View style={styles.errorCard}>
        <Text style={styles.errorIcon}>📦</Text>
        <Text style={styles.errorTitle}>Stock Operation Failed</Text>
        <Text style={styles.errorDescription}>
          We encountered an issue with this stock operation. Please try again or contact support if the problem persists.
        </Text>
      </View>
    </View>
  );

  return (
    <InventoryErrorBoundary
      operation="stock-operation"
      onError={handleStockError}
      fallback={stockErrorFallback}
    >
      {children}
    </InventoryErrorBoundary>
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    maxWidth: 350,
    width: '100%',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});