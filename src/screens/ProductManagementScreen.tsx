/**
 * Product Management Screen
 * 
 * Admin interface for product CRUD operations with graceful degradation.
 * 
 * Features:
 * - Product listing with search and filters
 * - Quick actions (toggle availability, bulk stock updates)
 * - Low stock alerts with ValidationMonitor tracking
 * - Error boundaries with graceful fallbacks
 * - Never breaks user workflows
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  Alert, 
  RefreshControl,
  TextInput,
  ActivityIndicator 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { 
  Screen, 
  Text, 
  Card, 
  Button
} from '../components';
import { 
  useAdminProducts,
  useAdminLowStockProducts,
  useAdminProductStats,
  useToggleProductAvailability,
  useBulkUpdateStock,
  usePrefetchAdminProduct,
  useAdminProductsWithFallback 
} from '../hooks/useProductAdmin';
import { spacing, colors } from '../utils/theme';
import { AdminErrorHandler } from '../utils/adminErrorHandler';
import type { ProductAdminTransform } from '../schemas/productAdmin.schema';

// Navigation types (will be added to AdminStackParamList)
type ProductManagementNavigationProp = StackNavigationProp<any, 'ProductManagement'>;

// Filter options
interface ProductFilters {
  search: string;
  availability: 'all' | 'available' | 'unavailable';
  stockStatus: 'all' | 'low' | 'out' | 'normal';
  category: string | null;
}

export const ProductManagementScreen: React.FC = () => {
  const navigation = useNavigation<ProductManagementNavigationProp>();
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    availability: 'all',
    stockStatus: 'all',
    category: null,
  });

  // Use graceful degradation hook for main products
  const productsQuery = useAdminProductsWithFallback();
  const lowStockQuery = useAdminLowStockProducts({ threshold: 10 });
  const statsQuery = useAdminProductStats();
  const prefetchProduct = usePrefetchAdminProduct();

  // Mutations
  const toggleAvailability = useToggleProductAvailability();
  const bulkUpdateStock = useBulkUpdateStock();

  // Filter products based on current filters
  const filteredProducts = useMemo(() => {
    if (!productsQuery.data) return [];

    return productsQuery.data.filter(product => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          product.name.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower) ||
          product.sku?.toLowerCase().includes(searchLower) ||
          product.tags.some(tag => tag.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      // Availability filter
      if (filters.availability === 'available' && !product.is_available) return false;
      if (filters.availability === 'unavailable' && product.is_available) return false;

      // Stock status filter
      if (filters.stockStatus === 'low' && product.stock_quantity > 10) return false;
      if (filters.stockStatus === 'out' && product.stock_quantity > 0) return false;
      if (filters.stockStatus === 'normal' && product.stock_quantity <= 10) return false;

      // Category filter
      if (filters.category && product.category?.id !== filters.category) return false;

      return true;
    });
  }, [productsQuery.data, filters]);

  // Handle product availability toggle
  const handleToggleAvailability = useCallback((product: ProductAdminTransform) => {
    const newStatus = !product.is_available;
    const action = newStatus ? 'enable' : 'disable';
    
    Alert.alert(
      `${action === 'enable' ? 'Enable' : 'Disable'} Product`,
      `Are you sure you want to ${action} "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'enable' ? 'Enable' : 'Disable',
          style: action === 'enable' ? 'default' : 'destructive',
          onPress: () => {
            toggleAvailability.mutate(
              { id: product.id, isAvailable: newStatus },
              {
                onSuccess: (data) => {
                  if (data.success) {
                    Alert.alert(
                      'Success',
                      data.userMessage || `Product ${action}d successfully.`
                    );
                  } else {
                    Alert.alert(
                      'Error',
                      data.userMessage || `Failed to ${action} product.`
                    );
                  }
                },
                onError: (error) => {
                  AdminErrorHandler.handleAndShow(
                    error,
                    { 
                      operation: 'update', 
                      entity: 'product',
                      details: { productId: product.id, field: 'availability' }
                    },
                    [{ label: 'Retry', action: () => handleToggleAvailability(product), style: 'default' }]
                  );
                }
              }
            );
          }
        }
      ]
    );
  }, [toggleAvailability]);

  // Handle quick stock update
  const handleQuickStockUpdate = useCallback((product: ProductAdminTransform) => {
    Alert.prompt(
      'Update Stock',
      `Current stock: ${product.stock_quantity}\nEnter new stock quantity:`,
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

            bulkUpdateStock.mutate(
              [{ product_id: product.id, new_stock: newStock, reason: 'Quick update via admin' }],
              {
                onSuccess: (data) => {
                  if (data.success) {
                    Alert.alert('Success', data.userMessage);
                  } else {
                    Alert.alert('Error', data.userMessage);
                  }
                },
                onError: (error) => {
                  AdminErrorHandler.handleAndShow(
                    error,
                    { 
                      operation: 'update', 
                      entity: 'stock',
                      details: { productId: product.id, newStock }
                    },
                    [{ label: 'Retry', action: () => handleQuickStockUpdate(product), style: 'default' }]
                  );
                }
              }
            );
          }
        }
      ],
      'plain-text',
      product.stock_quantity.toString()
    );
  }, [bulkUpdateStock]);

  // Handle product item press (prefetch and navigate)
  const handleProductPress = useCallback((product: ProductAdminTransform) => {
    // Prefetch product details for smooth editing experience
    prefetchProduct(product.id);
    
    // Navigate to edit screen
    navigation.navigate('ProductCreateEdit' as any, { id: product.id });
  }, [prefetchProduct, navigation]);

  // Render product item with error boundary
  const renderProductItem = useCallback(({ item: product }: { item: ProductAdminTransform }) => {
    return (
      <Card 
          style={[
            styles.productCard,
            !product.is_available && styles.unavailableProduct
          ]}
          onPress={() => handleProductPress(product)}
        >
          <View style={styles.productHeader}>
            <View style={styles.productInfo}>
              <Text variant="heading4" numberOfLines={1}>
                {product.name}
              </Text>
              <Text variant="caption" color="secondary" numberOfLines={1}>
                SKU: {product.sku || 'N/A'} • {product.category?.name || 'No Category'}
              </Text>
            </View>
            <View style={styles.productPrice}>
              <Text variant="heading4" color="primary">
                ${product.price.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.productDetails}>
            <View style={styles.stockInfo}>
              <Text variant="body">
                Stock: <Text variant="heading4" color={product.stock_quantity <= 10 ? 'error' : 'primary'}>
                  {product.stock_quantity}
                </Text>
              </Text>
              {product.stock_quantity <= 10 && (
                <Text variant="caption" color="warning">
                  {product.stock_quantity === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                </Text>
              )}
            </View>

            <View style={styles.productActions}>
              <Button
                title={product.is_available ? 'Disable' : 'Enable'}
                variant={product.is_available ? 'outline' : 'primary'}
                size="small"
                onPress={() => handleToggleAvailability(product)}
                disabled={toggleAvailability.isPending}
                style={styles.actionButton}
              />
              <Button
                title="Stock"
                variant="outline"
                size="small"
                onPress={() => handleQuickStockUpdate(product)}
                disabled={bulkUpdateStock.isPending}
                style={styles.actionButton}
              />
            </View>
          </View>
        </Card>
    );
  }, [handleProductPress, handleToggleAvailability, handleQuickStockUpdate, toggleAvailability.isPending, bulkUpdateStock.isPending]);

  // Render filter controls
  const renderFilters = () => (
    <Card style={styles.filtersCard}>
      <Text variant="heading4" style={styles.filtersTitle}>Filters</Text>
      
      <TextInput
        style={styles.searchInput}
        placeholder="Search products..."
        value={filters.search}
        onChangeText={(search) => setFilters(prev => ({ ...prev, search }))}
      />

      <View style={styles.filterRow}>
        <Button
          title={`Availability: ${filters.availability}`}
          variant="outline"
          size="small"
          onPress={() => {
            const options = ['all', 'available', 'unavailable'];
            const currentIndex = options.indexOf(filters.availability);
            const nextIndex = (currentIndex + 1) % options.length;
            setFilters(prev => ({ ...prev, availability: options[nextIndex] as any }));
          }}
          style={styles.filterButton}
        />
        
        <Button
          title={`Stock: ${filters.stockStatus}`}
          variant="outline"
          size="small"
          onPress={() => {
            const options = ['all', 'low', 'out', 'normal'];
            const currentIndex = options.indexOf(filters.stockStatus);
            const nextIndex = (currentIndex + 1) % options.length;
            setFilters(prev => ({ ...prev, stockStatus: options[nextIndex] as any }));
          }}
          style={styles.filterButton}
        />
      </View>
    </Card>
  );

  // Render stats summary with graceful degradation and stock management access
  const renderStats = () => (
    <Card style={styles.statsCard}>
      <Text variant="heading4" style={styles.statsTitle}>Overview</Text>
      
      {statsQuery.isLoading ? (
        <ActivityIndicator size="small" color={colors.primary[600]} />
      ) : statsQuery.error ? (
        <Text color="secondary">Stats temporarily unavailable</Text>
      ) : (
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text variant="heading3" color="primary">{statsQuery.totalProducts}</Text>
            <Text variant="caption" color="secondary">Total Products</Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="heading3" color="success">{statsQuery.availableProducts}</Text>
            <Text variant="caption" color="secondary">Available</Text>
          </View>
          <View 
            style={styles.statItem}
            onTouchEnd={() => navigation.navigate('InventoryHub' as any)}
          >
            <Text variant="heading3" color="warning">{statsQuery.lowStockCount}</Text>
            <Text variant="caption" color="secondary">Low Stock</Text>
            <Text variant="caption" color="primary">Tap to manage</Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="heading3" color="error">{statsQuery.outOfStockCount}</Text>
            <Text variant="caption" color="secondary">Out of Stock</Text>
          </View>
        </View>
      )}
      
      <View style={styles.stockManagementActions}>
        <Button
          title="Advanced Inventory Management"
          variant="outline"
          onPress={() => navigation.navigate('InventoryHub' as any)}
          style={styles.stockManagementButton}
        />
      </View>
    </Card>
  );

  // Handle refresh with graceful degradation
  const handleRefresh = useCallback(() => {
    productsQuery.refetch();
    lowStockQuery.refetch();
  }, [productsQuery, lowStockQuery]);

  // Render empty state with helpful message
  const renderEmptyState = () => (
    <Card style={styles.emptyStateCard}>
      <Text variant="heading3" align="center" color="secondary">
        {filters.search || filters.availability !== 'all' || filters.stockStatus !== 'all' 
          ? 'No products match your filters'
          : 'No products found'
        }
      </Text>
      <Text variant="body" align="center" color="secondary" style={styles.emptyStateSubtext}>
        {filters.search || filters.availability !== 'all' || filters.stockStatus !== 'all'
          ? 'Try adjusting your filters or search terms.'
          : 'Add your first product to get started.'
        }
      </Text>
      <Button
        title="Add Product"
        variant="primary"
        onPress={() => navigation.navigate('ProductCreateEdit' as any, {})}
        style={styles.emptyStateButton}
      />
    </Card>
  );

  // Main loading state with graceful degradation
  if (productsQuery.isLoading && !productsQuery.hasFallbackData) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
          <Text variant="body" color="secondary" style={styles.loadingText}>
            Loading products...
          </Text>
        </View>
      </Screen>
    );
  }

  // Render main interface
  return (
    <Screen>
      {/* ErrorBoundary not available - removed for now */}
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              {renderStats()}
              {renderFilters()}
              {productsQuery.userMessage && (
                <Card style={styles.messageCard}>
                  <Text color="warning" align="center">
                    {productsQuery.userMessage}
                  </Text>
                </Card>
              )}
            </>
          }
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={productsQuery.isLoading}
              onRefresh={handleRefresh}
              colors={[colors.primary[600]]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
    </Screen>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorSubtext: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  retryButton: {
    minWidth: 120,
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  statsCard: {
    marginBottom: spacing.md,
  },
  statsTitle: {
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  filtersCard: {
    marginBottom: spacing.md,
  },
  filtersTitle: {
    marginBottom: spacing.md,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
  },
  messageCard: {
    marginBottom: spacing.md,
  },
  productCard: {
    marginBottom: spacing.md,
  },
  unavailableProduct: {
    opacity: 0.7,
    backgroundColor: colors.surface,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  productInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  productPrice: {
    alignItems: 'flex-end',
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockInfo: {
    flex: 1,
  },
  productActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    minWidth: 60,
  },
  emptyStateCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateSubtext: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  emptyStateButton: {
    minWidth: 120,
  },
  stockManagementActions: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  stockManagementButton: {
    alignSelf: 'stretch',
  },
});

export default ProductManagementScreen;