import React from 'react';
import { View, RNText as RNRNText, StyleSheet, TouchableOpacity } from 'react-native';

interface BulkActionBarProps {
  testID?: string;
  count: number;
  onUpdate: () => void;
  onClear: () => void;
}

export function BulkActionBar({ testID, count, onUpdate, onClear }: BulkActionBarProps) {
  return (
    <View testID={testID} style={styles.container}>
      <RNText style={styles.countRNText}>{count} items selected</RNText>
      
      <View style={styles.actions}>
        <TouchableOpacity
          testID="bulk-update-button"
          style={styles.updateButton}
          onPress={onUpdate}
          accessibilityLabel={`Update ${count} selected items`}
        >
          <RNText style={styles.updateRNText}>Update All</RNText>
        </TouchableOpacity>
        
        <TouchableOpacity
          testID="clear-selection-button"
          style={styles.clearButton}
          onPress={onClear}
          accessibilityLabel="Clear selection"
        >
          <RNText style={styles.clearRNText}>Clear</RNText>
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
  countRNText: {
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
  updateRNText: {
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
  clearRNText: {
    color: 'white',
    fontSize: 14,
  },
});