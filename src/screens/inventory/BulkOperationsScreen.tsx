/**
 * Bulk Operations Screen
 * CSV import/export and batch operations for inventory management
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert as RNAlert,
  Platform,
  ProgressBarAndroid,
  ProgressViewIOS
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';

import { 
  useBulkStockUpdate,
  useCSVImport,
  useInventoryExport,
  useBulkOperationTemplates 
} from '../../hooks/inventory/useBulkOperations';
import { useUserRole } from '../../hooks/role-based/useUserRole';

type NavigationProp = StackNavigationProp<any>;

interface OperationCardProps {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

const OperationCard: React.FC<OperationCardProps> = ({
  title,
  description,
  icon,
  onPress,
  disabled = false,
  color = 'primary'
}) => {
  const colorStyles = {
    primary: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
    success: { backgroundColor: '#34C759', borderColor: '#34C759' },
    warning: { backgroundColor: '#FF9500', borderColor: '#FF9500' },
    danger: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.operationCard, 
        disabled && styles.operationCardDisabled,
        { borderColor: colorStyles[color].borderColor }
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.operationIcon}>{icon}</Text>
      <View style={styles.operationContent}>
        <Text style={[styles.operationTitle, disabled && styles.disabledText]}>
          {title}
        </Text>
        <Text style={[styles.operationDescription, disabled && styles.disabledText]}>
          {description}
        </Text>
      </View>
      <View style={[styles.operationArrow, { backgroundColor: colorStyles[color].backgroundColor }]}>
        <Text style={styles.arrowText}>→</Text>
      </View>
    </TouchableOpacity>
  );
};

interface ImportProgressModalProps {
  visible: boolean;
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
    isComplete: boolean;
  };
  onClose: () => void;
}

const ImportProgressModal: React.FC<ImportProgressModalProps> = ({
  visible,
  progress,
  onClose
}) => {
  const progressPercent = progress.total > 0 ? (progress.processed / progress.total) : 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Import Progress</Text>
          {progress.isComplete && (
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {progress.processed} of {progress.total} items processed
          </Text>
          
          {Platform.OS === 'ios' ? (
            <ProgressViewIOS progress={progressPercent} style={styles.progressBar} />
          ) : (
            <ProgressBarAndroid 
              styleAttr="Horizontal" 
              progress={progressPercent}
              style={styles.progressBar}
            />
          )}
          
          <View style={styles.progressStats}>
            <View style={styles.progressStat}>
              <Text style={[styles.statNumber, { color: '#34C759' }]}>
                {progress.successful}
              </Text>
              <Text style={styles.statLabel}>Successful</Text>
            </View>
            
            <View style={styles.progressStat}>
              <Text style={[styles.statNumber, { color: '#FF3B30' }]}>
                {progress.failed}
              </Text>
              <Text style={styles.statLabel}>Failed</Text>
            </View>
          </View>
        </View>

        {progress.errors.length > 0 && (
          <View style={styles.errorsContainer}>
            <Text style={styles.errorsTitle}>Import Errors:</Text>
            <ScrollView style={styles.errorsList}>
              {progress.errors.map((error, index) => (
                <View key={index} style={styles.errorItem}>
                  <Text style={styles.errorRowNumber}>Row {error.row}:</Text>
                  <Text style={styles.errorMessage}>{error.error}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {!progress.isComplete && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.processingText}>Processing import...</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default function BulkOperationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { userRole, hasPermission } = useUserRole();
  const fileInputRef = useRef<any>(null);

  const [showImportProgress, setShowImportProgress] = useState(false);
  const [importProgress, setImportProgress] = useState({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [] as Array<{ row: number; error: string }>,
    isComplete: false
  });

  // Hook mutations
  const bulkUpdateMutation = useBulkStockUpdate();
  const csvImportMutation = useCSVImport();
  const exportMutation = useInventoryExport();
  const templateMutation = useBulkOperationTemplates();

  const canBulkUpdate = hasPermission(['inventory:write', 'inventory:bulk']);
  const canImportExport = hasPermission(['inventory:manage', 'inventory:import_export']);
  const canExport = hasPermission(['inventory:read', 'inventory:export']);

  const handleCSVImport = useCallback(() => {
    if (!canImportExport) {
      RNAlert.alert('Permission Denied', 'You do not have permission to import inventory data');
      return;
    }

    // Simulate file picker - in real implementation would use document picker
    RNAlert.alert(
      'CSV Import',
      'Please select a CSV file to import. The file should contain columns: Product ID, Current Stock, Reason.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Select File', 
          onPress: () => simulateCSVImport() 
        }
      ]
    );
  }, [canImportExport]);

  const simulateCSVImport = async () => {
    // Simulate CSV data for demo
    const mockCSVData = [
      { productId: 'prod-1', currentStock: 100, reason: 'Monthly restock' },
      { productId: 'prod-2', currentStock: 50, reason: 'Adjustment' },
      { productId: 'invalid-prod', currentStock: -5, reason: 'Invalid data' }, // This will fail
    ];

    setImportProgress({
      total: mockCSVData.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      isComplete: false
    });
    setShowImportProgress(true);

    try {
      const result = await csvImportMutation.mutateAsync(mockCSVData);
      
      setImportProgress({
        total: result.processedRows,
        processed: result.processedRows,
        successful: result.success.length,
        failed: result.failures?.length || 0,
        errors: result.validationErrors || [],
        isComplete: true
      });

      if (result.success.length > 0) {
        RNAlert.alert(
          'Import Complete',
          `Successfully imported ${result.success.length} items. ${result.failures?.length || 0} failed.`
        );
      }
    } catch (error) {
      setImportProgress(prev => ({ ...prev, isComplete: true }));
      RNAlert.alert(
        'Import Failed',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  };

  const handleExport = useCallback(async (format: 'csv' | 'json' = 'csv') => {
    if (!canExport) {
      RNAlert.alert('Permission Denied', 'You do not have permission to export inventory data');
      return;
    }

    try {
      const result = await exportMutation.mutateAsync({ format });
      
      // In real implementation, would trigger download
      RNAlert.alert(
        'Export Ready',
        `Inventory data exported as ${format.toUpperCase()}. File: ${result.filename}`,
        [
          { text: 'OK' },
          { 
            text: 'Preview', 
            onPress: () => console.log('Export data:', result.data) 
          }
        ]
      );
    } catch (error) {
      RNAlert.alert(
        'Export Failed',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }, [canExport, exportMutation]);

  const handleGenerateTemplate = useCallback(async (templateType: 'stock_update' | 'visibility_update' | 'full_inventory') => {
    try {
      const result = await templateMutation.mutateAsync(templateType);
      
      RNAlert.alert(
        'Template Generated',
        `Template file ready: ${result.filename}`,
        [
          { text: 'OK' },
          { 
            text: 'Preview', 
            onPress: () => console.log('Template data:', result.data) 
          }
        ]
      );
    } catch (error) {
      RNAlert.alert(
        'Template Generation Failed',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }, [templateMutation]);

  const handleBatchOperation = useCallback(() => {
    navigation.navigate('StockManagement', { mode: 'batch_select' });
  }, [navigation]);

  return (
    <Screen>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Bulk Operations</Text>
          <Text style={styles.subtitle}>Import, export, and batch update inventory data</Text>
        </View>

        {/* Import Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Import Operations</Text>
          
          <OperationCard
            title="CSV Import"
            description="Import stock updates from CSV file"
            icon="📁"
            onPress={handleCSVImport}
            disabled={!canImportExport}
            color="primary"
          />

          <OperationCard
            title="Batch Stock Update"
            description="Select multiple items for bulk stock updates"
            icon="📦"
            onPress={handleBatchOperation}
            disabled={!canBulkUpdate}
            color="success"
          />
        </View>

        {/* Export Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Operations</Text>
          
          <OperationCard
            title="Export to CSV"
            description="Download current inventory as CSV file"
            icon="📊"
            onPress={() => handleExport('csv')}
            disabled={!canExport}
            color="primary"
          />

          <OperationCard
            title="Export to JSON"
            description="Download inventory data as JSON file"
            icon="📄"
            onPress={() => handleExport('json')}
            disabled={!canExport}
            color="primary"
          />
        </View>

        {/* Template Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Template Generation</Text>
          
          <OperationCard
            title="Stock Update Template"
            description="Generate CSV template for stock updates"
            icon="📝"
            onPress={() => handleGenerateTemplate('stock_update')}
            color="warning"
          />

          <OperationCard
            title="Visibility Template"
            description="Generate template for product visibility updates"
            icon="👁️"
            onPress={() => handleGenerateTemplate('visibility_update')}
            color="warning"
          />

          <OperationCard
            title="Full Inventory Template"
            description="Generate comprehensive inventory template"
            icon="📋"
            onPress={() => handleGenerateTemplate('full_inventory')}
            color="warning"
          />
        </View>

        {/* Instructions Section */}
        <Card style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Usage Instructions</Text>
          
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>1.</Text>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>Generate Template</Text>
              <Text style={styles.instructionText}>
                Download a template file that matches your data format requirements
              </Text>
            </View>
          </View>

          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>2.</Text>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>Fill Data</Text>
              <Text style={styles.instructionText}>
                Fill in your inventory data using the template format
              </Text>
            </View>
          </View>

          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>3.</Text>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>Import</Text>
              <Text style={styles.instructionText}>
                Upload your completed file for batch processing
              </Text>
            </View>
          </View>

          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              Always backup your data before performing bulk operations. 
              Invalid data will be skipped and reported in the import results.
            </Text>
          </View>
        </Card>

        {/* Recent Operations */}
        <Card style={styles.recentCard}>
          <Text style={styles.recentTitle}>Recent Operations</Text>
          <Text style={styles.recentEmpty}>No recent bulk operations</Text>
        </Card>
      </ScrollView>

      {/* Import Progress Modal */}
      <ImportProgressModal
        visible={showImportProgress}
        progress={importProgress}
        onClose={() => setShowImportProgress(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  operationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  operationCardDisabled: {
    opacity: 0.5,
  },
  operationIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  operationContent: {
    flex: 1,
  },
  operationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  operationDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  operationArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  disabledText: {
    color: '#C7C7CC',
  },
  instructionsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  instructionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    width: 24,
  },
  instructionContent: {
    flex: 1,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 2,
  },
  instructionText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEAA7',
    marginTop: 8,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    flex: 1,
    lineHeight: 20,
  },
  recentCard: {
    marginHorizontal: 16,
    marginBottom: 32,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  recentEmpty: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 16,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  progressContainer: {
    padding: 24,
  },
  progressText: {
    fontSize: 16,
    color: '#1D1D1F',
    textAlign: 'center',
    marginBottom: 16,
  },
  progressBar: {
    marginBottom: 24,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressStat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  errorsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  errorsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 12,
  },
  errorsList: {
    flex: 1,
  },
  errorItem: {
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorRowNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: '#1D1D1F',
  },
  processingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  processingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
});