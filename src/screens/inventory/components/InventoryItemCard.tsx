import React from 'react';
import { View, Text as RNText, StyleSheet, TouchableOpacity } from 'react-native';
import { InventoryItem } from 'types/inventory';

interface InventoryItemCardProps {
  item: InventoryItem;
  onPress: () => void;
  showActions?: boolean;
}

export function InventoryItemCard({ item, onPress, showActions = false }: InventoryItemCardProps) {
  const stockStatus = item.currentStock < item.minStock ? 'low' : 'normal';

  return (
    <TouchableOpacity
      testID={`item-card-${item.id}`}
      style={styles.container}
      onPress={onPress}
      accessibilityLabel={`${item.name}, ${item.currentStock} ${item.unit} in stock`}
    >
      <View style={styles.header}>
        <RNText style={styles.name}>{item.name}</RNText>
        <RNText style={styles.sku}>{item.sku}</RNText>
      </View>
      
      <View style={styles.details}>
        <View style={styles.stockInfo}>
          <RNText style={[styles.stock, stockStatus === 'low' && styles.lowStock]}>
            Stock: {item.currentStock} {item.unit}
          </RNText>
          <RNText style={styles.location}>Location: {item.location}</RNText>
        </View>
        
        {showActions && (
          <View style={styles.actions}>
            <TouchableOpacity
              testID={`adjust-stock-${item.id}`}
              style={styles.actionButton}
              accessibilityLabel="Adjust stock"
            >
              <RNText style={styles.actionText}>Adjust</RNText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sku: {
    fontSize: 14,
    color: '#666',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockInfo: {
    flex: 1,
  },
  stock: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  lowStock: {
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  location: {
    fontSize: 12,
    color: '#999',
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});