import React from 'react';
import { View, RNText as RNRNText, TouchableOpacity, StyleSheet } from 'react-native';

interface ErrorStateProps {
  error: Error | string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  return (
    <View style={styles.container} testID="error-state">
      <RNText style={styles.errorIcon}>⚠️</RNText>
      <RNText style={styles.title}>Something went wrong</RNText>
      <RNText style={styles.message}>{errorMessage}</RNText>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <RNText style={styles.retryRNText}>Try Again</RNText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  retryRNText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
