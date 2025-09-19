import React from 'react';
import { View, RNText as RNRNText, StyleSheet, TouchableOpacity } from 'react-native';
import { InventoryItem } from 'types/inventory';

interface StockItemCardProps {
  item: InventoryItem;
  selected: boolean;
  onSelect: () => void;
  onQuickAdjust: (item: InventoryItem, adjustment: number) => void;
}

export function StockItemCard({ item, selected, onSelect, onQuickAdjust }: StockItemCardProps) {
  return (
    <View style={[styles.container, selected && styles.selected]}>
      <TouchableOpacity
        testID={`select-${item.id}`}
        style={styles.selectArea}
        onPress={onSelect}
        accessibilityLabel={`Select ${item.name}`}
      >
        <View style={[styles.checkbox, selected && styles.checkboxSelected]} />
        <View style={styles.info}>
          <RNText style={styles.name}>{item.name}</RNText>
          <RNText style={styles.sku}>{item.sku}</RNText>
          <RNText style={styles.stock}>
            Current: {item.currentStock} {item.unit}
          </RNText>
        </View>
      </TouchableOpacity>

      <View style={styles.adjustControls}>
        <TouchableOpacity
          testID={`decrease-${item.id}`}
          style={styles.adjustButton}
          onPress={() => onQuickAdjust(item, -1)}
          accessibilityLabel="Decrease stock"
        >
          <RNText style={styles.adjustButtonRNText}>-</RNText>
        </TouchableOpacity>
        
        <RNText style={styles.stockValue}>{item.currentStock}</RNText>
        
        <TouchableOpacity
          testID={`increase-${item.id}`}
          style={styles.adjustButton}
          onPress={() => onQuickAdjust(item, 1)}
          accessibilityLabel="Increase stock"
        >
          <RNText style={styles.adjustButtonRNText}>+</RNText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
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
  selected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    borderWidth: 2,
  },
  selectArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
  },
  checkboxSelected: {
    backgroundColor: '#2196f3',
    borderColor: '#2196f3',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sku: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  stock: {
    fontSize: 14,
    color: '#333',
  },
  adjustControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustButtonRNText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  stockValue: {
    marginHorizontal: 12,
    fontSize: 18,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'center',
  },
});