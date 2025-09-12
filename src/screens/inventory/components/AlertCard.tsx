import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { InventoryAlert } from 'types/inventory';

interface AlertCardProps {
  alert: InventoryAlert;
  onDismiss: () => void;
  onAction: () => void;
}

export function AlertCard({ alert, onDismiss, onAction }: AlertCardProps) {
  const getAlertStyles = () => {
    switch (alert.type) {
      case 'critical':
        return styles.critical;
      case 'warning':
        return styles.warning;
      default:
        return styles.info;
    }
  };

  return (
    <View testID={`alert-${alert.id}`} style={[styles.container, getAlertStyles()]}>
      <View style={styles.content}>
        <Text style={styles.title}>{alert.title}</Text>
        <Text style={styles.message}>{alert.message}</Text>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity
          testID={`action-${alert.id}`}
          style={styles.actionButton}
          onPress={onAction}
          accessibilityLabel="Take action"
        >
          <Text style={styles.actionText}>Action</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          testID={`dismiss-${alert.id}`}
          style={styles.dismissButton}
          onPress={onDismiss}
          accessibilityLabel="Dismiss alert"
        >
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  critical: {
    borderLeftColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  warning: {
    borderLeftColor: '#ffc107',
    backgroundColor: '#fffdf5',
  },
  info: {
    borderLeftColor: '#17a2b8',
    backgroundColor: '#f5fdff',
  },
  content: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dismissButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  dismissText: {
    color: 'white',
    fontSize: 14,
  },
});