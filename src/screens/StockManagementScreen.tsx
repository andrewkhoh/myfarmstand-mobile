/**
 * Stock Management Screen
 * 
 * Advanced stock operations with atomic transactions and real-time validation.
 * 
 * Features:
 * - Bulk stock updates with atomic operations
 * - Real-time validation and error handling
 * - Low stock alerts and automatic restocking suggestions
 * - Stock history and audit trails
 * - Resilient processing with skip-on-error (Pattern 3)
 * - Broadcasting for real-time updates
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  Alert, 
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { 
  Screen, 
  Text, 
  Card, 
  Button, 
  ErrorBoundary 
} from '../components';
import { 
  useAdminProducts,
  useAdminLowStockProducts,
  useBulkUpdateStock,
  useAdminProductsWithFallback 
} from '../hooks/useProductAdmin';
import { spacing, colors } from '../utils/theme';
import type { ProductAdminTransform, BulkStockUpdate } from '../schemas/productAdmin.schema';

// Navigation types
type StockManagementNavigationProp = StackNavigationProp<any, 'StockManagement'>;

// Stock operation types
interface StockUpdateItem {
  product: ProductAdminTransform;
  newStock: number;
  reason: string;
  originalStock: number;
}

interface StockBatchOperation {
  items: StockUpdateItem[];
  batchReason: string;
  isProcessing: boolean;
}

// Filter options for stock management
interface StockFilters {
  search: string;
  stockStatus: 'all' | 'low' | 'out' | 'normal' | 'overstocked';
  sortBy: 'name' | 'stock' | 'lastUpdated';
  sortOrder: 'asc' | 'desc';
}

export const StockManagementScreen: React.FC = () => {
  const navigation = useNavigation<StockManagementNavigationProp>();
  
  // State management
  const [filters, setFilters] = useState<StockFilters>({
    search: '',
    stockStatus: 'all',
    sortBy: 'stock',
    sortOrder: 'asc',
  });
  
  const [batchOperation, setBatchOperation] = useState<StockBatchOperation>({
    items: [],
    batchReason: '',
    isProcessing: false,
  });
  
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Hooks with graceful degradation
  const productsQuery = useAdminProductsWithFallback();
  const lowStockQuery = useAdminLowStockProducts({ threshold: 10 });
  const bulkUpdateStock = useBulkUpdateStock();

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    if (!productsQuery.data) return [];

    let filtered = productsQuery.data.filter(product => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          product.name.toLowerCase().includes(searchLower) ||
          product.sku?.toLowerCase().includes(searchLower) ||
          product.category?.name?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Stock status filter
      switch (filters.stockStatus) {
        case 'low':
          return product.stock_quantity > 0 && product.stock_quantity <= 10;
        case 'out':
          return product.stock_quantity === 0;
        case 'normal':
          return product.stock_quantity > 10 && product.stock_quantity <= 100;
        case 'overstocked':
          return product.stock_quantity > 100;
        default:
          return true;
      }
    });

    // Sort products
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'stock':
          comparison = a.stock_quantity - b.stock_quantity;
          break;
        case 'lastUpdated':
          comparison = new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime();
          break;
        default:
          comparison = 0;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [productsQuery.data, filters]);

  // Handle individual stock update
  const handleIndividualStockUpdate = useCallback((product: ProductAdminTransform) => {
    Alert.prompt(
      'Update Stock',
      `Product: ${product.name}\nCurrent stock: ${product.stock_quantity}\nEnter new stock quantity and reason:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: (value) => {
            const newStock = parseInt(value || '0', 10);
            if (isNaN(newStock) || newStock < 0) {
              Alert.alert('Error', 'Please enter a valid positive number.');
              return;
            }

            // Prompt for reason
            Alert.prompt(
              'Update Reason',
              'Please provide a reason for this stock update:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Update',
                  onPress: (reason) => {
                    if (!reason?.trim()) {
                      Alert.alert('Error', 'Please provide a reason for the stock update.');
                      return;
                    }

                    // Perform atomic update
                    const updateData: BulkStockUpdate = {
                      product_id: product.id,
                      new_stock: newStock,
                      reason: reason.trim(),
                    };

                    bulkUpdateStock.mutate(
                      [updateData],
                      {
                        onSuccess: (data) => {
                          if (data.success) {
                            Alert.alert('Success', data.userMessage || 'Stock updated successfully.');
                          } else {
                            Alert.alert('Error', data.userMessage || 'Failed to update stock.');
                          }
                        },
                        onError: () => {
                          Alert.alert('Error', 'Failed to update stock. Please try again.');
                        }
                      }
                    );
                  }
                }
              ],
              'plain-text',
              'Manual stock adjustment'
            );
          }
        }
      ],
      'plain-text',
      product.stock_quantity.toString()
    );
  }, [bulkUpdateStock]);

  // Handle batch operation setup
  const handleAddToBatch = useCallback((product: ProductAdminTransform) => {
    Alert.prompt(
      'Add to Batch',
      `Product: ${product.name}\nCurrent stock: ${product.stock_quantity}\nEnter new stock quantity:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (value) => {
            const newStock = parseInt(value || '0', 10);
            if (isNaN(newStock) || newStock < 0) {
              Alert.alert('Error', 'Please enter a valid positive number.');
              return;
            }

            const stockItem: StockUpdateItem = {
              product,
              newStock,
              reason: 'Batch update',
              originalStock: product.stock_quantity,
            };

            setBatchOperation(prev => ({
              ...prev,
              items: [...prev.items.filter(item => item.product.id !== product.id), stockItem],
            }));

            Alert.alert('Added', `${product.name} added to batch operation.`);
          }
        }
      ],
      'plain-text',
      product.stock_quantity.toString()
    );
  }, []);

  // Handle batch operation execution
  const handleExecuteBatchOperation = useCallback(() => {
    if (batchOperation.items.length === 0) {
      Alert.alert('Error', 'No items in batch operation.');
      return;
    }

    if (!batchOperation.batchReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for this batch operation.');
      return;
    }

    Alert.alert(
      'Execute Batch Operation',
      `Update stock for ${batchOperation.items.length} products?\n\nThis operation cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Execute',
          style: 'destructive',
          onPress: () => {
            setBatchOperation(prev => ({ ...prev, isProcessing: true }));

            const bulkUpdates: BulkStockUpdate[] = batchOperation.items.map(item => ({
              product_id: item.product.id,
              new_stock: item.newStock,
              reason: `${batchOperation.batchReason} - ${item.reason}`,
            }));

            bulkUpdateStock.mutate(
              bulkUpdates,
              {
                onSuccess: (data) => {
                  setBatchOperation(prev => ({ ...prev, isProcessing: false }));
                  
                  if (data.success) {
                    const message = `Batch operation completed.\n\nProcessed: ${data.totalProcessed}\nSuccessful: ${data.successfulUpdates.length}\nFailed: ${data.failedUpdates?.length || 0}`;
                    
                    Alert.alert('Batch Complete', message, [
                      {
                        text: 'View Details',
                        onPress: () => {
                          // Show detailed results
                          const details = data.successfulUpdates.map(update => 
                            `✅ ${update.name}: ${update.old_stock} → ${update.new_stock}`
                          ).join('\n');
                          
                          const failedDetails = data.failedUpdates?.map(failure => 
                            `❌ ${failure.productName}: ${failure.error}`
                          ).join('\n') || '';
                          
                          Alert.alert(
                            'Operation Details', 
                            `${details}${failedDetails ? '\n\nFailed:\n' + failedDetails : ''}`
                          );
                        }
                      },
                      { text: 'OK' }
                    ]);

                    // Clear batch operation
                    setBatchOperation({
                      items: [],
                      batchReason: '',
                      isProcessing: false,
                    });
                    setShowBatchModal(false);
                  } else {
                    Alert.alert('Error', data.userMessage || 'Batch operation failed.');
                  }
                },
                onError: () => {
                  setBatchOperation(prev => ({ ...prev, isProcessing: false }));
                  Alert.alert('Error', 'Batch operation failed. Please try again.');
                }
              }
            );
          }
        }
      ]
    );
  }, [batchOperation, bulkUpdateStock]);

  // Handle product selection toggle
  const handleToggleSelection = useCallback((productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }, []);

  // Handle bulk selection actions
  const handleBulkSelectAll = useCallback(() => {
    const allIds = new Set(filteredAndSortedProducts.map(p => p.id));
    setSelectedProducts(allIds);
  }, [filteredAndSortedProducts]);

  const handleBulkClearSelection = useCallback(() => {
    setSelectedProducts(new Set());
  }, []);

  // Render product item
  const renderProductItem = useCallback(({ item: product }: { item: ProductAdminTransform }) => {
    const isSelected = selectedProducts.has(product.id);
    const isLowStock = product.stock_quantity <= 10;
    const isOutOfStock = product.stock_quantity === 0;

    return (
      <ErrorBoundary
        fallback={
          <Card style={styles.productCard}>
            <Text color="error">Failed to render product. Skipping...</Text>
          </Card>
        }
      >
        <Card 
          style={[
            styles.productCard,
            isSelected && styles.selectedProductCard,
            isOutOfStock && styles.outOfStockCard,
            isLowStock && !isOutOfStock && styles.lowStockCard
          ]}
        >
          <View style={styles.productHeader}>
            <View style={styles.productInfo}>
              <View style={styles.productNameRow}>
                <Switch
                  value={isSelected}
                  onValueChange={() => handleToggleSelection(product.id)}
                  style={styles.selectionSwitch}
                />
                <View style={styles.productDetails}>
                  <Text variant="heading4" numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text variant="caption" color="secondary" numberOfLines={1}>
                    SKU: {product.sku || 'N/A'} • {product.category?.name || 'No Category'}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.stockInfo}>
              <Text variant="heading3" color={isOutOfStock ? 'error' : isLowStock ? 'warning' : 'primary'}>
                {product.stock_quantity}
              </Text>
              <Text variant="caption" color="secondary">
                {isOutOfStock ? 'OUT' : isLowStock ? 'LOW' : 'OK'}
              </Text>
            </View>
          </View>

          <View style={styles.productActions}>
            <Button
              title="Update"
              variant="outline"
              size="small"
              onPress={() => handleIndividualStockUpdate(product)}
              disabled={bulkUpdateStock.isPending}
              style={styles.actionButton}
            />
            <Button
              title="Add to Batch"
              variant="secondary"
              size="small"
              onPress={() => handleAddToBatch(product)}
              disabled={bulkUpdateStock.isPending}
              style={styles.actionButton}
            />
          </View>
        </Card>
      </ErrorBoundary>
    );
  }, [selectedProducts, handleToggleSelection, handleIndividualStockUpdate, handleAddToBatch, bulkUpdateStock.isPending]);

  // Render filter controls
  const renderFilters = () => (
    <Card style={styles.filtersCard}>
      <Text variant="heading4" style={styles.filtersTitle}>Stock Filters</Text>
      
      <TextInput
        style={styles.searchInput}
        placeholder="Search products..."
        value={filters.search}
        onChangeText={(search) => setFilters(prev => ({ ...prev, search }))}
      />

      <View style={styles.filterRow}>
        <Button
          title={`Status: ${filters.stockStatus}`}
          variant="outline"
          size="small"
          onPress={() => {
            const options = ['all', 'low', 'out', 'normal', 'overstocked'];
            const currentIndex = options.indexOf(filters.stockStatus);
            const nextIndex = (currentIndex + 1) % options.length;
            setFilters(prev => ({ ...prev, stockStatus: options[nextIndex] as any }));
          }}
          style={styles.filterButton}
        />
        
        <Button
          title={`Sort: ${filters.sortBy}`}
          variant="outline"
          size="small"
          onPress={() => {
            const options = ['name', 'stock', 'lastUpdated'];
            const currentIndex = options.indexOf(filters.sortBy);
            const nextIndex = (currentIndex + 1) % options.length;
            setFilters(prev => ({ ...prev, sortBy: options[nextIndex] as any }));
          }}
          style={styles.filterButton}
        />
      </View>
    </Card>
  );

  // Render batch operation controls
  const renderBatchControls = () => (
    <Card style={styles.batchCard}>
      <View style={styles.batchHeader}>
        <Text variant="heading4">Batch Operations</Text>
        <Text variant="caption" color="secondary">
          {batchOperation.items.length} items • {selectedProducts.size} selected
        </Text>
      </View>
      
      <View style={styles.batchActions}>
        <Button
          title="Select All"
          variant="outline"
          size="small"
          onPress={handleBulkSelectAll}
          style={styles.batchButton}
        />
        <Button
          title="Clear"
          variant="outline"
          size="small"
          onPress={handleBulkClearSelection}
          style={styles.batchButton}
        />
        <Button
          title={`Review (${batchOperation.items.length})`}
          variant="primary"
          size="small"
          onPress={() => setShowBatchModal(true)}
          disabled={batchOperation.items.length === 0}
          style={styles.batchButton}
        />
      </View>
    </Card>
  );

  // Render batch operation modal
  const renderBatchModal = () => (
    <Modal
      visible={showBatchModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowBatchModal(false)}
    >
      <Screen>
        <ScrollView style={styles.modalContainer}>
          <Card style={styles.modalCard}>
            <Text variant="heading3" style={styles.modalTitle}>Batch Operation Review</Text>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter batch operation reason..."
              value={batchOperation.batchReason}
              onChangeText={(reason) => setBatchOperation(prev => ({ ...prev, batchReason: reason }))}
              multiline
            />

            <Text variant="heading4" style={styles.itemsTitle}>
              Items ({batchOperation.items.length})
            </Text>

            {batchOperation.items.map((item, index) => (
              <Card key={item.product.id} style={styles.batchItem}>
                <View style={styles.batchItemContent}>
                  <View style={styles.batchItemInfo}>
                    <Text variant="body" numberOfLines={1}>{item.product.name}</Text>
                    <Text variant="caption" color="secondary">
                      {item.originalStock} → {item.newStock} ({item.newStock - item.originalStock >= 0 ? '+' : ''}{item.newStock - item.originalStock})
                    </Text>
                  </View>
                  <Button
                    title="Remove"
                    variant="outline"
                    size="small"
                    onPress={() => {
                      setBatchOperation(prev => ({
                        ...prev,
                        items: prev.items.filter(i => i.product.id !== item.product.id)
                      }));
                    }}
                  />
                </View>
              </Card>
            ))}

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowBatchModal(false)}
                style={styles.modalButton}
              />
              <Button
                title={batchOperation.isProcessing ? 'Processing...' : 'Execute'}
                variant="primary"
                onPress={handleExecuteBatchOperation}
                disabled={batchOperation.isProcessing || batchOperation.items.length === 0}
                style={styles.modalButton}
              />
            </View>
          </Card>
        </ScrollView>
      </Screen>
    </Modal>
  );

  // Handle refresh
  const handleRefresh = useCallback(() => {
    productsQuery.refetch();
    lowStockQuery.refetch();
  }, [productsQuery, lowStockQuery]);

  // Main loading state
  if (productsQuery.isLoading && !productsQuery.hasFallbackData) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="body" color="secondary" style={styles.loadingText}>
            Loading stock data...
          </Text>
        </View>
      </Screen>
    );
  }

  // Render main interface
  return (
    <Screen>
      <ErrorBoundary
        fallback={
          <View style={styles.errorContainer}>
            <Text variant="heading3" color="error" align="center">
              Something went wrong
            </Text>
            <Text variant="body" color="secondary" align="center" style={styles.errorSubtext}>
              We're having trouble loading the stock management interface.
            </Text>
            <Button
              title="Try Again"
              variant="primary"
              onPress={() => handleRefresh()}
              style={styles.retryButton}
            />
          </View>
        }
      >
        <FlatList
          data={filteredAndSortedProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              {renderFilters()}
              {renderBatchControls()}
              {productsQuery.userMessage && (
                <Card style={styles.messageCard}>
                  <Text color="warning" align="center">
                    {productsQuery.userMessage}
                  </Text>
                </Card>
              )}
            </>
          }
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={productsQuery.isLoading}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
        
        {renderBatchModal()}
      </ErrorBoundary>
    </Screen>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.large,
  },
  loadingText: {
    marginTop: spacing.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.large,
  },
  errorSubtext: {
    marginTop: spacing.small,
    marginBottom: spacing.large,
  },
  retryButton: {
    minWidth: 120,
  },
  listContainer: {
    padding: spacing.medium,
    paddingBottom: spacing.large,
  },
  filtersCard: {
    marginBottom: spacing.medium,
  },
  filtersTitle: {
    marginBottom: spacing.medium,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.medium,
    marginBottom: spacing.medium,
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.small,
  },
  filterButton: {
    flex: 1,
  },
  batchCard: {
    marginBottom: spacing.medium,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.medium,
  },
  batchActions: {
    flexDirection: 'row',
    gap: spacing.small,
  },
  batchButton: {
    flex: 1,
  },
  messageCard: {
    marginBottom: spacing.medium,
  },
  productCard: {
    marginBottom: spacing.medium,
  },
  selectedProductCard: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primaryLight,
  },
  lowStockCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  outOfStockCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.small,
  },
  productInfo: {
    flex: 1,
    marginRight: spacing.medium,
  },
  productNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionSwitch: {
    marginRight: spacing.small,
  },
  productDetails: {
    flex: 1,
  },
  stockInfo: {
    alignItems: 'center',
    minWidth: 60,
  },
  productActions: {
    flexDirection: 'row',
    gap: spacing.small,
  },
  actionButton: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  modalCard: {
    margin: spacing.medium,
    padding: spacing.large,
  },
  modalTitle: {
    marginBottom: spacing.large,
    textAlign: 'center',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.medium,
    marginBottom: spacing.large,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  itemsTitle: {
    marginBottom: spacing.medium,
  },
  batchItem: {
    marginBottom: spacing.small,
  },
  batchItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchItemInfo: {
    flex: 1,
    marginRight: spacing.medium,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.medium,
    marginTop: spacing.large,
  },
  modalButton: {
    flex: 1,
  },
});

export default StockManagementScreen;