import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { InventoryErrorBoundary } from './InventoryErrorBoundary';
import { useQueryClient } from '@tanstack/react-query';
import { inventoryKeys } from '../../utils/queryKeyFactory';
import { errorCoordinator } from '../../services/cross-workflow/errorCoordinator';
import { useCurrentUser } from '../../hooks/useAuth';

interface Props {
  children: React.ReactNode;
  showErrorHistory?: boolean;
  enableAutoRecovery?: boolean;
  maxAutoRetries?: number;
}

export const InventoryWorkflowErrorBoundary: React.FC<Props> = ({
  children,
  showErrorHistory = false,
  enableAutoRecovery = true,
  maxAutoRetries = 3,
}) => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const [errorHistory, setErrorHistory] = useState<Array<{ time: Date; message: string }>>([]);
  const [autoRetryCount, setAutoRetryCount] = useState(0);

  const handleWorkflowError = useCallback(
    async (error: Error, errorInfo: React.ErrorInfo) => {
      // Add to local error history
      setErrorHistory((prev) => [
        ...prev.slice(-4), // Keep last 5 errors
        { time: new Date(), message: error.message },
      ]);

      // Auto-recovery logic
      if (enableAutoRecovery && autoRetryCount < maxAutoRetries) {
        const errorMessage = error.message.toLowerCase();

        // Different recovery strategies based on error type
        if (errorMessage.includes('stale') || errorMessage.includes('cache')) {
          // Invalidate all inventory caches for stale data errors
          await queryClient.invalidateQueries({
            queryKey: inventoryKeys.all(),
          });
          setAutoRetryCount((prev) => prev + 1);
        } else if (errorMessage.includes('permission')) {
          // Refetch user permissions
          await queryClient.invalidateQueries({
            queryKey: ['roles'],
          });
        } else if (errorMessage.includes('sync') || errorMessage.includes('conflict')) {
          // Refresh inventory data for sync issues
          await queryClient.refetchQueries({
            queryKey: inventoryKeys.lists(user?.id),
          });
          setAutoRetryCount((prev) => prev + 1);
        }
      }

      // Log error statistics
      const stats = errorCoordinator.getErrorStatistics();
      console.log('Inventory workflow error statistics:', stats);
    },
    [queryClient, enableAutoRecovery, autoRetryCount, maxAutoRetries]
  );

  const clearErrorHistory = () => {
    setErrorHistory([]);
    setAutoRetryCount(0);
    errorCoordinator.clearErrorHistory();
  };

  const fallbackComponent = (
    <ScrollView style={styles.container}>
      <View style={styles.errorContainer}>
        <Text style={styles.title}>Inventory System Error</Text>
        <Text style={styles.subtitle}>
          The inventory system encountered an issue. Our team has been notified.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What you can do:</Text>
          <Text style={styles.infoText}>• Check your internet connection</Text>
          <Text style={styles.infoText}>• Try refreshing the page</Text>
          <Text style={styles.infoText}>• Contact support if the issue persists</Text>
        </View>

        {enableAutoRecovery && autoRetryCount > 0 && (
          <View style={styles.retryInfo}>
            <Text style={styles.retryText}>
              Auto-recovery attempts: {autoRetryCount} / {maxAutoRetries}
            </Text>
          </View>
        )}

        {showErrorHistory && errorHistory.length > 0 && (
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Recent Errors</Text>
              <TouchableOpacity onPress={clearErrorHistory}>
                <Text style={styles.clearButton}>Clear</Text>
              </TouchableOpacity>
            </View>
            {errorHistory.map((error, index) => (
              <View key={index} style={styles.historyItem}>
                <Text style={styles.historyTime}>
                  {error.time.toLocaleTimeString()}
                </Text>
                <Text style={styles.historyMessage} numberOfLines={2}>
                  {error.message}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              // Force refresh all inventory data
              queryClient.invalidateQueries({ queryKey: inventoryKeys.all() });
              clearErrorHistory();
            }}
          >
            <Text style={styles.primaryButtonText}>Refresh Inventory</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              // Navigate to dashboard or home
              clearErrorHistory();
            }}
          >
            <Text style={styles.secondaryButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <InventoryErrorBoundary
      operation="inventory-workflow"
      onError={handleWorkflowError}
      fallback={fallbackComponent}
    >
      {children}
    </InventoryErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#495057',
    marginBottom: 8,
    paddingLeft: 8,
  },
  retryInfo: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    width: '100%',
    maxWidth: 400,
  },
  retryText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
  },
  historyContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 400,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343a40',
  },
  clearButton: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
  },
  historyItem: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 8,
    marginTop: 8,
  },
  historyTime: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  historyMessage: {
    fontSize: 14,
    color: '#495057',
  },
  actionButtons: {
    width: '100%',
    maxWidth: 400,
  },
  primaryButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#495057',
    fontSize: 16,
    fontWeight: '500',
  },
});