/**
 * Bulk Operations Modal Component
 * Handles bulk stock adjustments, price updates, and category changes
 * Implements all features tested in BulkOperationsModal.test.tsx
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { Text } from '../../../components/Text';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { useBulkOperations } from '../../../hooks/inventory/useStockOperations';

interface SelectedProduct {
  id: string;
  name: string;
  currentStock: number;
  price: number;
}

interface BulkOperationsModalProps {
  visible: boolean;
  selectedProducts: SelectedProduct[];
  onClose: () => void;
  onComplete: (result: {
    type: string;
    affectedCount: number;
    changes: any[];
  }) => void;
}

type OperationType = 'stock-adjustment' | 'price-update' | 'category-change' | 'add-tags';
type AdjustmentType = 'percentage' | 'absolute' | 'fixed';

const BulkOperationsModal: React.FC<BulkOperationsModalProps> = ({
  visible,
  selectedProducts,
  onClose,
  onComplete,
}) => {
  const [selectedOperation, setSelectedOperation] = useState<OperationType | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('percentage');
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [priceValue, setPriceValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [operationProgress, setOperationProgress] = useState(false);

  const { executeBulkUpdate, validateBulkOperation, isProcessing } = useBulkOperations();

  const resetForm = () => {
    setSelectedOperation(null);
    setAdjustmentType('percentage');
    setAdjustmentValue('');
    setPriceValue('');
    setSelectedCategory('');
    setTagsInput('');
    setShowConfirmation(false);
    setOperationProgress(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getPreviewText = () => {
    switch (selectedOperation) {
      case 'stock-adjustment':
        if (adjustmentType === 'percentage') {
          return `Preview: ${adjustmentValue ? '+' + adjustmentValue + '%' : ''} to all selected`;
        }
        if (adjustmentType === 'absolute') {
          return `Preview: ${adjustmentValue ? '+' + adjustmentValue + ' units' : ''} to all selected`;
        }
        return '';
      case 'price-update':
        if (adjustmentType === 'percentage') {
          return `Preview: ${adjustmentValue ? '+' + adjustmentValue + '%' : ''} to all prices`;
        }
        if (adjustmentType === 'fixed') {
          return `Set all to $${priceValue}`;
        }
        return '';
      default:
        return '';
    }
  };

  const getChangePreview = () => {
    if (selectedOperation === 'stock-adjustment' && adjustmentValue) {
      const value = parseFloat(adjustmentValue);
      return selectedProducts.map(product => {
        let newStock = product.currentStock;
        if (adjustmentType === 'percentage') {
          newStock = product.currentStock + (product.currentStock * value / 100);
        } else if (adjustmentType === 'absolute') {
          newStock = product.currentStock + value;
        }
        return `${product.name}: ${product.currentStock} → ${Math.round(newStock)}`;
      });
    }
    return [];
  };

  const validateOperation = () => {
    if (selectedOperation === 'price-update' && adjustmentType === 'fixed') {
      const price = parseFloat(priceValue);
      if (isNaN(price) || price <= 0) {
        Alert.alert('Invalid Price', 'Price must be greater than 0');
        return false;
      }
    }

    if (selectedOperation === 'stock-adjustment' && !adjustmentValue) {
      Alert.alert('Missing Value', 'Please enter an adjustment value');
      return false;
    }

    return true;
  };

  const handleApplyChanges = () => {
    if (!validateOperation()) return;
    setShowConfirmation(true);
  };

  const handleConfirmOperation = async () => {
    try {
      setOperationProgress(true);
      setShowConfirmation(false);

      const result = await executeBulkUpdate({
        type: selectedOperation!,
        items: selectedProducts.map(product => ({
          productId: product.id,
          newQuantity: selectedOperation === 'stock-adjustment' 
            ? calculateNewQuantity(product.currentStock) 
            : undefined,
        })),
        parameters: {
          adjustmentType,
          adjustmentValue,
          priceValue,
          selectedCategory,
          tags: tagsInput.split(',').map(t => t.trim()),
        },
      });

      onComplete({
        type: selectedOperation!,
        affectedCount: selectedProducts.length,
        changes: getChangePreview(),
      });

      Alert.alert('Success', `Bulk operation completed successfully for ${selectedProducts.length} products`);
      handleClose();
    } catch (error) {
      Alert.alert('Operation Failed', `An error occurred: ${error}`);
      setOperationProgress(false);
    }
  };

  const calculateNewQuantity = (currentStock: number) => {
    const value = parseFloat(adjustmentValue);
    if (adjustmentType === 'percentage') {
      return currentStock + (currentStock * value / 100);
    } else if (adjustmentType === 'absolute') {
      return currentStock + value;
    }
    return currentStock;
  };

  const renderOperationSelector = () => (
    <View style={styles.operationSelector}>
      <Text style={styles.sectionTitle}>Operation Type</Text>
      <View testID="operation-type-selector" style={styles.operationButtons}>
        <TouchableOpacity
          testID="operation-stock-adjustment"
          style={[styles.operationButton, selectedOperation === 'stock-adjustment' && styles.operationButtonActive]}
          onPress={() => setSelectedOperation('stock-adjustment')}
        >
          <Text style={styles.operationButtonText}>Stock Adjustment</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="operation-price-update"
          style={[styles.operationButton, selectedOperation === 'price-update' && styles.operationButtonActive]}
          onPress={() => setSelectedOperation('price-update')}
        >
          <Text style={styles.operationButtonText}>Price Update</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="operation-category-change"
          style={[styles.operationButton, selectedOperation === 'category-change' && styles.operationButtonActive]}
          onPress={() => setSelectedOperation('category-change')}
        >
          <Text style={styles.operationButtonText}>Category Change</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="operation-add-tags"
          style={[styles.operationButton, selectedOperation === 'add-tags' && styles.operationButtonActive]}
          onPress={() => setSelectedOperation('add-tags')}
        >
          <Text style={styles.operationButtonText}>Add Tags</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStockAdjustmentControls = () => (
    <View style={styles.controlsSection}>
      <Text style={styles.sectionTitle}>Stock Adjustment</Text>
      
      <View style={styles.adjustmentTypeButtons}>
        <TouchableOpacity
          style={[styles.typeButton, adjustmentType === 'percentage' && styles.typeButtonActive]}
          onPress={() => setAdjustmentType('percentage')}
        >
          <Text style={styles.typeButtonText}>Percentage</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, adjustmentType === 'absolute' && styles.typeButtonActive]}
          onPress={() => setAdjustmentType('absolute')}
        >
          <Text style={styles.typeButtonText}>Absolute</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        testID={adjustmentType === 'percentage' ? 'adjustment-percentage-input' : 'adjustment-absolute-input'}
        style={styles.input}
        value={adjustmentValue}
        onChangeText={setAdjustmentValue}
        keyboardType="numeric"
        placeholder={adjustmentType === 'percentage' ? 'Enter percentage' : 'Enter amount'}
      />

      <Text style={styles.previewText}>{getPreviewText()}</Text>

      {adjustmentValue && (
        <View style={styles.changePreview}>
          <Text style={styles.previewTitle}>Changes Preview:</Text>
          {getChangePreview().map((change, index) => (
            <Text key={index} style={styles.changeItem}>{change}</Text>
          ))}
        </View>
      )}
    </View>
  );

  const renderPriceUpdateControls = () => (
    <View style={styles.controlsSection}>
      <Text style={styles.sectionTitle}>Price Update</Text>
      
      <View style={styles.adjustmentTypeButtons}>
        <TouchableOpacity
          style={[styles.typeButton, adjustmentType === 'percentage' && styles.typeButtonActive]}
          onPress={() => setAdjustmentType('percentage')}
        >
          <Text style={styles.typeButtonText}>Percentage</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, adjustmentType === 'fixed' && styles.typeButtonActive]}
          onPress={() => setAdjustmentType('fixed')}
        >
          <Text style={styles.typeButtonText}>Fixed Price</Text>
        </TouchableOpacity>
      </View>

      {adjustmentType === 'percentage' ? (
        <TextInput
          testID="price-percentage-input"
          style={styles.input}
          value={adjustmentValue}
          onChangeText={setAdjustmentValue}
          keyboardType="numeric"
          placeholder="Enter percentage change"
        />
      ) : (
        <TextInput
          testID="fixed-price-input"
          style={styles.input}
          value={priceValue}
          onChangeText={setPriceValue}
          keyboardType="numeric"
          placeholder="Enter fixed price"
        />
      )}

      <Text style={styles.previewText}>{getPreviewText()}</Text>
    </View>
  );

  const renderCategoryControls = () => (
    <View style={styles.controlsSection}>
      <Text style={styles.sectionTitle}>Category Change</Text>
      <View testID="category-picker" style={styles.categoryPicker}>
        <TouchableOpacity
          style={[styles.categoryButton, selectedCategory === 'Vegetables' && styles.categoryButtonActive]}
          onPress={() => setSelectedCategory('Vegetables')}
        >
          <Text style={styles.categoryButtonText}>Vegetables</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.categoryButton, selectedCategory === 'Fruits' && styles.categoryButtonActive]}
          onPress={() => setSelectedCategory('Fruits')}
        >
          <Text style={styles.categoryButtonText}>Fruits</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTagsControls = () => (
    <View style={styles.controlsSection}>
      <Text style={styles.sectionTitle}>Add Tags</Text>
      <TextInput
        testID="tags-input"
        style={styles.input}
        value={tagsInput}
        onChangeText={setTagsInput}
        placeholder="Enter tags separated by commas"
      />
      {tagsInput && (
        <Text style={styles.previewText}>Add tags: {tagsInput}</Text>
      )}
    </View>
  );

  const renderConfirmationModal = () => (
    <Modal
      testID="confirmation-modal"
      visible={showConfirmation}
      transparent
      animationType="fade"
    >
      <View style={styles.confirmationOverlay}>
        <View style={styles.confirmationContainer}>
          <Text style={styles.confirmationTitle}>Confirm Bulk Update</Text>
          <Text style={styles.confirmationText}>
            Apply {selectedOperation?.replace('-', ' ')} to {selectedProducts.length} products?
          </Text>
          <View style={styles.confirmationButtons}>
            <Button
              title="Cancel"
              onPress={() => setShowConfirmation(false)}
              style={[styles.confirmationButton, styles.cancelButton]}
            />
            <Button
              title="Confirm"
              onPress={handleConfirmOperation}
              style={styles.confirmationButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderProgressIndicator = () => (
    <View testID="operation-progress" style={styles.progressContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.progressText}>Processing {selectedProducts.length} products...</Text>
    </View>
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Bulk Operations</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.selectedCount}>
              {selectedProducts.length} products selected
            </Text>

            <View style={styles.productList}>
              {selectedProducts.map(product => (
                <Text key={product.id} style={styles.productName}>
                  {product.name}
                </Text>
              ))}
            </View>

            {renderOperationSelector()}

            {selectedOperation === 'stock-adjustment' && renderStockAdjustmentControls()}
            {selectedOperation === 'price-update' && renderPriceUpdateControls()}
            {selectedOperation === 'category-change' && renderCategoryControls()}
            {selectedOperation === 'add-tags' && renderTagsControls()}

            {selectedOperation && !operationProgress && (
              <Button
                testID="apply-button"
                title="Apply Changes"
                onPress={handleApplyChanges}
                style={styles.applyButton}
              />
            )}

            {operationProgress && renderProgressIndicator()}
          </ScrollView>
        </View>
      </Modal>

      {renderConfirmationModal()}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  closeText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  selectedCount: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 16,
  },
  productList: {
    marginBottom: 20,
  },
  productName: {
    fontSize: 14,
    color: '#1D1D1F',
    marginBottom: 4,
  },
  operationSelector: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  operationButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  operationButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  operationButtonActive: {
    backgroundColor: '#007AFF',
  },
  operationButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  controlsSection: {
    marginBottom: 24,
  },
  adjustmentTypeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 12,
  },
  previewText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  changePreview: {
    marginTop: 12,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  changeItem: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  categoryPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  applyButton: {
    backgroundColor: '#34C759',
    marginTop: 20,
  },
  progressContainer: {
    alignItems: 'center',
    padding: 20,
  },
  progressText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  confirmationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 300,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmationText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmationButton: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
});

export default BulkOperationsModal;