import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
// import { useInventoryItems } from 'hooks/inventory/useInventoryItems';
// import { useUpdateStock } from 'hooks/inventory/useStockOperations';
// TODO: Fix missing hook files
const useInventoryItems = () => ({ data: [], isLoading: false, refetch: () => {} });
const useUpdateStock = () => ({ mutate: () => {}, isLoading: false });
import { StockItemCard } from './components/StockItemCard';
import { BulkActionBar } from './components/BulkActionBar';
import { InventoryItem } from 'types/inventory';

interface StockManagementScreenProps {
  navigation?: any;
}

export function StockManagementScreen({ navigation }: StockManagementScreenProps) {
  const { data: items, isLoading, refetch } = useInventoryItems();
  const updateStock = useUpdateStock();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  
  const handleQuickAdjust = useCallback((item: InventoryItem, adjustment: number) => {
    updateStock.mutate({
      id: item.id,
      newStock: item.currentStock + adjustment,
    });
  }, [updateStock]);
  
  const handleBulkUpdate = useCallback(() => {
    navigation?.navigate('BulkOperations', { 
      items: selectedItems,
    });
  }, [selectedItems, navigation]);
  
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
      onQuickAdjust={handleQuickAdjust}
    />
  ), [selectedItems, toggleSelection, handleQuickAdjust]);
  
  return (
    <View style={styles.container}>
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
        data={items || []}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No inventory items found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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