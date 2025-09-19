import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useBulkUpdateStock } from '../../hooks/inventory/useBulkUpdateStock';

interface BulkOperationsScreenProps {
  route?: {
    params?: {
      items?: string[];
    };
  };
  navigation?: any;
}

export function BulkOperationsScreen({ route, navigation }: BulkOperationsScreenProps) {
  const items = route?.params?.items || [];
  const updateStock = useBulkUpdateStock();
  
  const [operation, setOperation] = useState<'adjust' | 'set'>('adjust');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  
  const handleApply = useCallback(() => {
    if (!value || items.length === 0) return;
    
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;
    
    // Create batch update for all items
    const updates = items.map(itemId => ({
      id: itemId,
      newStock: numValue,
      reason: reason || 'Bulk operation'
    }));
    
    updateStock.mutate(updates);
    navigation?.goBack();
  }, [value, items, reason, updateStock, navigation]);
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Bulk Stock Update</Text>
          <Text style={styles.subtitle}>{items.length} items selected</Text>
        </View>
        
        <View style={styles.operationSection}>
          <Text style={styles.label}>Operation Type</Text>
          <View style={styles.operationButtons}>
            <TouchableOpacity
              testID="operation-adjust"
              style={[
                styles.operationButton,
                operation === 'adjust' && styles.operationButtonActive,
              ]}
              onPress={() => setOperation('adjust')}
            >
              <Text
                style={[
                  styles.operationButtonText,
                  operation === 'adjust' && styles.operationButtonTextActive,
                ]}
              >
                Adjust Stock
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              testID="operation-set"
              style={[
                styles.operationButton,
                operation === 'set' && styles.operationButtonActive,
              ]}
              onPress={() => setOperation('set')}
            >
              <Text
                style={[
                  styles.operationButtonText,
                  operation === 'set' && styles.operationButtonTextActive,
                ]}
              >
                Set Stock
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.inputSection}>
          <Text style={styles.label}>
            {operation === 'adjust' ? 'Adjustment Amount' : 'New Stock Level'}
          </Text>
          <TextInput
            testID="value-input"
            style={styles.input}
            value={value}
            onChangeText={setValue}
            keyboardType="numeric"
            placeholder={operation === 'adjust' ? 'e.g., -10 or +20' : 'e.g., 50'}
          />
        </View>
        
        <View style={styles.inputSection}>
          <Text style={styles.label}>Reason</Text>
          <TextInput
            testID="reason-input"
            style={[styles.input, styles.textArea]}
            value={reason}
            onChangeText={setReason}
            placeholder="Enter reason for stock change"
            multiline
            numberOfLines={3}
          />
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity
            testID="cancel-button"
            style={styles.cancelButton}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            testID="apply-button"
            style={[styles.applyButton, !value && styles.applyButtonDisabled]}
            onPress={handleApply}
            disabled={!value}
          >
            <Text style={styles.applyButtonText}>Apply to All</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  operationSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  operationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  operationButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  operationButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  operationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  operationButtonTextActive: {
    color: 'white',
  },
  inputSection: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#666',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#007bff',
    alignItems: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: '#ccc',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});