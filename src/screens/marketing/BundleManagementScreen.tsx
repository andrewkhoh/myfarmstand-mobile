import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  inventory: number;
}

interface Bundle {
  id: string;
  name: string;
  description: string;
  products: Product[];
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  finalPrice: number;
  status: 'active' | 'draft' | 'expired';
  validFrom: string;
  validUntil: string;
}

export default function BundleManagementScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Bundle data
  const [bundles, setBundles] = useState<Bundle[]>([
    {
      id: 'bundle-1',
      name: 'Summer Collection',
      description: 'Best of summer products',
      products: [
        { id: 'prod-1', name: 'Summer Shirt', price: 29.99, category: 'Clothing', inventory: 100 },
        { id: 'prod-2', name: 'Beach Shorts', price: 24.99, category: 'Clothing', inventory: 75 },
      ],
      discountType: 'percentage',
      discountValue: 20,
      finalPrice: 43.98,
      status: 'active',
      validFrom: '2025-06-01',
      validUntil: '2025-08-31',
    },
  ]);

  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([
    { id: 'prod-3', name: 'Sunglasses', price: 49.99, category: 'Accessories', inventory: 50 },
    { id: 'prod-4', name: 'Beach Hat', price: 19.99, category: 'Accessories', inventory: 30 },
    { id: 'prod-5', name: 'Sandals', price: 34.99, category: 'Footwear', inventory: 60 },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const calculateBundlePrice = (products: Product[], discountType: string, discountValue: number) => {
    const totalPrice = products.reduce((sum, product) => sum + product.price, 0);
    if (discountType === 'percentage') {
      return totalPrice * (1 - discountValue / 100);
    } else {
      return totalPrice - discountValue;
    }
  };

  const handleCreateBundle = () => {
    const newBundle: Bundle = {
      id: `bundle-${Date.now()}`,
      name: 'New Bundle',
      description: '',
      products: selectedProducts,
      discountType: 'percentage',
      discountValue: 10,
      finalPrice: calculateBundlePrice(selectedProducts, 'percentage', 10),
      status: 'draft',
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
    setBundles([...bundles, newBundle]);
    setSelectedBundle(newBundle);
    Alert.alert('Success', 'Bundle created successfully');
  };

  const handleSaveBundle = () => {
    if (selectedBundle) {
      setBundles(bundles.map(b => b.id === selectedBundle.id ? selectedBundle : b));
      Alert.alert('Success', 'Bundle saved successfully');
    }
  };

  const handlePublishBundle = () => {
    if (selectedBundle) {
      const updated = { ...selectedBundle, status: 'active' as const };
      setSelectedBundle(updated);
      setBundles(bundles.map(b => b.id === selectedBundle.id ? updated : b));
      Alert.alert('Success', 'Bundle published successfully');
    }
  };

  const toggleProductSelection = (product: Product) => {
    if (selectedProducts.find(p => p.id === product.id)) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  const filteredProducts = availableProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !refreshing) {
    return <LoadingState message="Loading bundles..." />;
  }

  if (error && !refreshing) {
    return <ErrorState error={error} onRetry={() => setError(null)} />;
  }

  if (bundles.length === 0 && !refreshing) {
    return (
      <EmptyState
        message="No bundles created yet"
        actionLabel="Create Bundle"
        onAction={handleCreateBundle}
      />
    );
  }

  return (
    <ScrollView
      testID="bundle-management-screen"
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Bundle List Section */}
      <View testID="bundle-list-section" style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Product Bundles</Text>
          <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="+ New Bundle"
            testID="create-bundle-button"
            style={styles.createButton}
            onPress={handleCreateBundle}
          >
            <Text style={styles.createButtonText}>+ New Bundle</Text>
          </TouchableOpacity>
        </View>
        
        {bundles.map((bundle, index) => (
          <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="{bundle.name}"
            key={bundle.id}
            testID={`bundle-card-${index}`}
            style={styles.bundleCard}
            onPress={() => setSelectedBundle(bundle)}
          >
            <View style={styles.bundleHeader}>
              <Text style={styles.bundleName}>{bundle.name}</Text>
              <View style={[styles.statusBadge, styles[bundle.status]]}>
                <Text style={styles.statusText}>{bundle.status}</Text>
              </View>
            </View>
            <Text style={styles.bundleDescription}>{bundle.description}</Text>
            <View style={styles.bundleInfo}>
              <Text style={styles.productCount}>{bundle.products.length} products</Text>
              <Text style={styles.bundlePrice}>${bundle.finalPrice.toFixed(2)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bundle Editor Section */}
      {selectedBundle && (
        <View testID="bundle-editor-section" style={styles.section}>
          <Text style={styles.sectionTitle}>Edit Bundle</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Bundle Name</Text>
            <TextInput
              testID="bundle-name-input"
              style={styles.input}
              value={selectedBundle.name}
              onChangeText={(text) => setSelectedBundle({ ...selectedBundle, name: text })}
              placeholder="Enter bundle name"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              testID="bundle-description-input"
              style={[styles.input, styles.textArea]}
              value={selectedBundle.description}
              onChangeText={(text) => setSelectedBundle({ ...selectedBundle, description: text })}
              placeholder="Enter bundle description"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Discount Settings */}
          <View testID="discount-settings" style={styles.discountSection}>
            <Text style={styles.label}>Discount Type</Text>
            <View style={styles.discountTypeRow}>
              <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Button"
                testID="discount-percentage-button"
                style={[
                  styles.discountTypeButton,
                  selectedBundle.discountType === 'percentage' && styles.activeDiscountType,
                ]}
                onPress={() => setSelectedBundle({ ...selectedBundle, discountType: 'percentage' })}
              >
                <Text
                  style={[
                    styles.discountTypeText,
                    selectedBundle.discountType === 'percentage' && styles.activeDiscountText,
                  ]}
                >
                  Percentage
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Button"
                testID="discount-fixed-button"
                style={[
                  styles.discountTypeButton,
                  selectedBundle.discountType === 'fixed' && styles.activeDiscountType,
                ]}
                onPress={() => setSelectedBundle({ ...selectedBundle, discountType: 'fixed' })}
              >
                <Text
                  style={[
                    styles.discountTypeText,
                    selectedBundle.discountType === 'fixed' && styles.activeDiscountText,
                  ]}
                >
                  Fixed Amount
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Discount Value {selectedBundle.discountType === 'percentage' ? '(%)' : '($)'}
              </Text>
              <TextInput
                testID="discount-value-input"
                style={styles.input}
                value={selectedBundle.discountValue.toString()}
                onChangeText={(text) => {
                  const value = parseInt(text) || 0;
                  setSelectedBundle({
                    ...selectedBundle,
                    discountValue: value,
                    finalPrice: calculateBundlePrice(
                      selectedBundle.products,
                      selectedBundle.discountType,
                      value
                    ),
                  });
                }}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Products in Bundle */}
          <View testID="bundle-products-section" style={styles.productsSection}>
            <Text style={styles.label}>Products in Bundle</Text>
            {selectedBundle.products.map((product, index) => (
              <View key={product.id} testID={`bundle-product-${index}`} style={styles.productItem}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
              </View>
            ))}
          </View>

          {/* Bundle Price Display */}
          <View testID="bundle-price-display" style={styles.priceDisplay}>
            <Text style={styles.priceLabel}>Bundle Price:</Text>
            <Text testID="final-price" style={styles.finalPrice}>
              ${selectedBundle.finalPrice.toFixed(2)}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Save Changes"
              testID="save-bundle-button"
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSaveBundle}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
            {selectedBundle.status === 'draft' && (
              <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Publish Bundle"
                testID="publish-bundle-button"
                style={[styles.actionButton, styles.publishButton]}
                onPress={handlePublishBundle}
              >
                <Text style={styles.publishButtonText}>Publish Bundle</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Product Selection Section */}
      <View testID="product-selection-section" style={styles.section}>
        <Text style={styles.sectionTitle}>Available Products</Text>
        
        <TextInput
          testID="product-search-input"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search products..."
        />

        <View testID="product-list" style={styles.productList}>
          {filteredProducts.map((product, index) => (
            <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Button"
              key={product.id}
              testID={`product-item-${index}`}
              style={[
                styles.productCard,
                selectedProducts.find(p => p.id === product.id) && styles.selectedProduct,
              ]}
              onPress={() => toggleProductSelection(product)}
            >
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productCategory}>{product.category}</Text>
              </View>
              <View style={styles.productMeta}>
                <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
                <Text testID={`product-inventory-${product.id}`} style={styles.productInventory}>
                  Stock: {product.inventory}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {selectedProducts.length > 0 && (
          <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Button"
            testID="add-to-bundle-button"
            style={styles.addToBundleButton}
            onPress={() => {
              if (selectedBundle) {
                setSelectedBundle({
                  ...selectedBundle,
                  products: [...selectedBundle.products, ...selectedProducts],
                  finalPrice: calculateBundlePrice(
                    [...selectedBundle.products, ...selectedProducts],
                    selectedBundle.discountType,
                    selectedBundle.discountValue
                  ),
                });
                setSelectedProducts([]);
                Alert.alert('Success', 'Products added to bundle');
              }
            }}
          >
            <Text style={styles.addToBundleText}>
              Add {selectedProducts.length} Products to Bundle
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Inventory Check */}
      <View testID="inventory-section" style={styles.section}>
        <Text style={styles.sectionTitle}>Inventory Status</Text>
        <View testID="inventory-check" style={styles.inventoryGrid}>
          {bundles.map((bundle) => {
            const minInventory = Math.min(...bundle.products.map(p => p.inventory));
            return (
              <View key={bundle.id} style={styles.inventoryItem}>
                <Text style={styles.inventoryBundleName}>{bundle.name}</Text>
                <Text
                  style={[
                    styles.inventoryStatus,
                    minInventory < 10 && styles.lowInventory,
                  ]}
                >
                  {minInventory} units available
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  bundleCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  bundleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bundleName: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  active: {
    backgroundColor: '#4CAF50',
  },
  draft: {
    backgroundColor: '#9E9E9E',
  },
  expired: {
    backgroundColor: '#f44336',
  },
  bundleDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bundleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productCount: {
    fontSize: 14,
    color: '#666',
  },
  bundlePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  discountSection: {
    marginBottom: 16,
  },
  discountTypeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  discountTypeButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 8,
  },
  activeDiscountType: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  discountTypeText: {
    fontSize: 14,
    color: '#333',
  },
  activeDiscountText: {
    color: '#fff',
  },
  productsSection: {
    marginBottom: 16,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
  },
  productPrice: {
    fontSize: 14,
    color: '#2196F3',
  },
  priceDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 16,
    color: '#666',
  },
  finalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  publishButton: {
    backgroundColor: '#2196F3',
  },
  publishButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  productList: {
    marginBottom: 16,
  },
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedProduct: {
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd',
  },
  productInfo: {
    flex: 1,
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  productMeta: {
    alignItems: 'flex-end',
  },
  productInventory: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  addToBundleButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addToBundleText: {
    color: '#fff',
    fontWeight: '600',
  },
  inventoryGrid: {
    marginTop: 8,
  },
  inventoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 8,
  },
  inventoryBundleName: {
    fontSize: 14,
    fontWeight: '500',
  },
  inventoryStatus: {
    fontSize: 14,
    color: '#4CAF50',
  },
  lowInventory: {
    color: '#f44336',
  },
});