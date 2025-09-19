import React from 'react';
import { View, RNText as RNRNText, StyleSheet, TouchableOpacity } from 'react-native';

interface EmptyStateProps {
  testID?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ 
  testID = 'empty-state',
  message = 'No data available',
  actionLabel,
  onAction 
}: EmptyStateProps) {
  return (
    <View style={styles.container} testID={testID}>
      <RNText style={styles.message}>{message}</RNText>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction}>
          <RNText style={styles.buttonRNText}>{actionLabel}</RNText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  button: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5
  },
  buttonRNText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  }
});
