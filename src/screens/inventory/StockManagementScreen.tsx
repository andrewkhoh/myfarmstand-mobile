import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useInventoryItems } from '../../hooks/inventory/useInventoryItems';
import { useUpdateStock } from '../../hooks/inventory/useUpdateStock';
import { useUnifiedRealtime } from '../../hooks/useUnifiedRealtime';
import { useStockAlerts } from '../../hooks/inventory/useStockAlerts';
import { useCurrentUserRole } from '../../hooks/role-based';
import { RoleBasedButton } from '../../components/role-based/RoleBasedButton';
import { RealtimeStatusIndicator } from '../../components/common/RealtimeStatusIndicator';
import { StockItemCard } from './components/StockItemCard';
import { BulkActionBar } from './components/BulkActionBar';
import { StockOperationErrorBoundary } from '../../components/error/StockOperationErrorBoundary';
import type { InventoryItem } from '../../types/inventory';
import type { StockUpdate } from '../../schemas/inventory';

interface StockManagementScreenProps {
  navigation?: any;
}

function StockManagementScreenContent({ navigation }: StockManagementScreenProps) {
  const { data: items, isLoading, refetch } = useInventoryItems();
  const updateStock = useUpdateStock();
  const { status: realtimeStatus, isConnected: realtimeEnabled } = useUnifiedRealtime();
  const { data: alerts, isLoading: alertsLoading } = useStockAlerts();
  const { hasPermission } = useCurrentUserRole();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filteredItems = items?.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(query) ||
      item.sku?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query)
    );
  }) || [];

  const handleQuickAdjust = useCallback((item: InventoryItem, adjustment: number) => {
    const stockUpdate: StockUpdate = {
      inventoryItemId: item.id,
      operation: adjustment > 0 ? 'add' : 'subtract',
      quantity: Math.abs(adjustment),
      reason: 'Quick adjustment from stock management',
    };

    updateStock.mutate(stockUpdate, {
      onSuccess: () => {
        Alert.alert('Success', 'Stock updated successfully');
      },
      onError: (error) => {
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update stock');
      },
    });
  }, [updateStock]);

  const handleBulkUpdate = useCallback(() => {
    if (!hasPermission('inventory.bulk_operations')) {
      Alert.alert('Permission Denied', 'You do not have permission to perform bulk operations');
      return;
    }
    if (selectedItems.length === 0) {
      Alert.alert('No Items Selected', 'Please select items to perform bulk operations');
      return;
    }
    navigation?.navigate('BulkOperations', {
      items: selectedItems,
    });
  }, [selectedItems, navigation, hasPermission]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const toggleSelection = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      }
      return [...prev, itemId];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);

  const renderItem = useCallback(({ item }: { item: InventoryItem }) => (
    <StockItemCard
      item={item}
      selected={selectedItems.includes(item.id)}
      onSelect={() => toggleSelection(item.id)}
      onQuickAdjust={(adjustment) => handleQuickAdjust(item, adjustment)}
    />
  ), [selectedItems, toggleSelection, handleQuickAdjust]);

  if (isLoading && !items) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, SKU, or category..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Real-time Status Bar */}
      <View style={styles.realtimeBar}>
        <RealtimeStatusIndicator
          showDetails={true}
          size="small"
        />
        {alerts && (alerts.critical.length + alerts.warning.length > 0) && (
          <RoleBasedButton
            requiredPermission="inventory:view"
            style={styles.alertsButton}
            onPress={() => navigation?.navigate('InventoryAlerts')}
            fallbackText="View Alerts"
          >
            <Text style={styles.alertsText}>
              {alerts.critical.length + alerts.warning.length} alerts
            </Text>
          </RoleBasedButton>
        )}
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total Items</Text>
          <Text style={styles.statValue}>{filteredItems.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Low Stock</Text>
          <Text style={[styles.statValue, styles.warningText]}>
            {filteredItems.filter(i => i.currentStock <= i.minimumStock).length}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Out of Stock</Text>
          <Text style={[styles.statValue, styles.errorText]}>
            {filteredItems.filter(i => i.currentStock === 0).length}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Critical Alerts</Text>
          <Text style={[styles.statValue, styles.errorText]}>
            {alerts?.critical?.length || 0}
          </Text>
        </View>
      </View>

      {selectedItems.length > 0 && (
        <BulkActionBar
          testID="bulk-action-bar"
          count={selectedItems.length}
          onUpdate={handleBulkUpdate}
          onClear={clearSelection}
        />
      )}

      <FlatList
        testID="stock-items-list"
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No items match your search' : 'No inventory items found'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  clearButton: {
    marginLeft: 8,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  clearButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  realtimeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  alertsButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alertsText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  warningText: {
    color: '#FF9800',
  },
  errorText: {
    color: '#F44336',
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

// Export wrapped with error boundary
export function StockManagementScreen(props: StockManagementScreenProps) {
  return (
    <StockOperationErrorBoundary
      onStockError={(error) => {
        console.error('Stock operation error in management screen:', error);
      }}
    >
      <StockManagementScreenContent {...props} />
    </StockOperationErrorBoundary>
  );
}