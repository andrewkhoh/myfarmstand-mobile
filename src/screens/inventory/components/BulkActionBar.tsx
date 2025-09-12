import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface BulkActionBarProps {
  testID?: string;
  count: number;
  onUpdate: () => void;
  onClear: () => void;
}

export function BulkActionBar({ testID, count, onUpdate, onClear }: BulkActionBarProps) {
  return (
    <View testID={testID} style={styles.container}>
      <Text style={styles.countText}>{count} items selected</Text>
      
      <View style={styles.actions}>
        <TouchableOpacity
          testID="bulk-update-button"
          style={styles.updateButton}
          onPress={onUpdate}
          accessibilityLabel={`Update ${count} selected items`}
        >
          <Text style={styles.updateText}>Update All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          testID="clear-selection-button"
          style={styles.clearButton}
          onPress={onClear}
          accessibilityLabel="Clear selection"
        >
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2196f3',
    padding: 12,
    marginBottom: 8,
  },
  countText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
  },
  updateButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  updateText: {
    color: '#2196f3',
    fontSize: 14,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'white',
  },
  clearText: {
    color: 'white',
    fontSize: 14,
  },
});