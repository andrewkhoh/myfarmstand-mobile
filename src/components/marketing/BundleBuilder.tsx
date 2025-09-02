import React, { memo, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Product, ProductBundle } from '@/types/marketing';

interface BundleBuilderProps {
  products: Product[];
  bundle?: ProductBundle;
  onSave: (bundle: ProductBundle) => void;
  pricingStrategy: 'fixed' | 'percentage' | 'tiered';
}

export const BundleBuilder = memo<BundleBuilderProps>(({
  products,
  bundle,
  onSave,
  pricingStrategy,
}) => {
  const theme = useTheme();
  const [bundleName, setBundleName] = useState(bundle?.name || '');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>(bundle?.products || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [discountValue, setDiscountValue] = useState(
    bundle?.pricing.value?.toString() || '10'
  );
  const [draggedProduct, setDraggedProduct] = useState<Product | null>(null);
  const [tiers, setTiers] = useState(
    bundle?.pricing.tiers || [
      { quantity: 2, discount: 5 },
      { quantity: 3, discount: 10 },
      { quantity: 5, discount: 15 },
    ]
  );

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      p => 
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const calculateBundlePrice = useCallback(() => {
    const basePrice = selectedProducts.reduce((sum, p) => sum + p.price, 0);
    
    if (pricingStrategy === 'fixed') {
      return parseFloat(discountValue) || 0;
    } else if (pricingStrategy === 'percentage') {
      const discount = parseFloat(discountValue) || 0;
      return basePrice * (1 - discount / 100);
    } else if (pricingStrategy === 'tiered') {
      const quantity = selectedProducts.length;
      const applicableTier = tiers
        .filter(t => quantity >= t.quantity)
        .sort((a, b) => b.quantity - a.quantity)[0];
      
      if (applicableTier) {
        return basePrice * (1 - applicableTier.discount / 100);
      }
      return basePrice;
    }
    
    return basePrice;
  }, [selectedProducts, pricingStrategy, discountValue, tiers]);

  const calculateSavings = useCallback(() => {
    const basePrice = selectedProducts.reduce((sum, p) => sum + p.price, 0);
    const bundlePrice = calculateBundlePrice();
    return basePrice - bundlePrice;
  }, [selectedProducts, calculateBundlePrice]);

  const handleAddProduct = useCallback((product: Product) => {
    if (selectedProducts.find(p => p.id === product.id)) {
      Alert.alert('Product Already Added', 'This product is already in the bundle.');
      return;
    }

    const availableInventory = product.inventory;
    if (availableInventory <= 0) {
      Alert.alert('Out of Stock', 'This product is currently out of stock.');
      return;
    }

    setSelectedProducts(prev => [...prev, product]);
  }, [selectedProducts]);

  const handleRemoveProduct = useCallback((productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  }, []);

  const handleDragStart = useCallback((product: Product) => {
    setDraggedProduct(product);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedProduct(null);
  }, []);

  const handleDrop = useCallback((targetProduct: Product) => {
    if (!draggedProduct || draggedProduct.id === targetProduct.id) return;

    setSelectedProducts(prev => {
      const draggedIndex = prev.findIndex(p => p.id === draggedProduct.id);
      const targetIndex = prev.findIndex(p => p.id === targetProduct.id);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const newProducts = [...prev];
      const [removed] = newProducts.splice(draggedIndex, 1);
      newProducts.splice(targetIndex, 0, removed);
      
      return newProducts;
    });

    handleDragEnd();
  }, [draggedProduct, handleDragEnd]);

  const validateBundle = useCallback(() => {
    if (!bundleName.trim()) {
      Alert.alert('Validation Error', 'Please enter a bundle name.');
      return false;
    }

    if (selectedProducts.length < 2) {
      Alert.alert('Validation Error', 'A bundle must contain at least 2 products.');
      return false;
    }

    for (const product of selectedProducts) {
      if (product.inventory <= 0) {
        Alert.alert(
          'Inventory Error',
          `${product.name} is out of stock. Please remove it from the bundle.`
        );
        return false;
      }
    }

    return true;
  }, [bundleName, selectedProducts]);

  const handleSave = useCallback(() => {
    if (!validateBundle()) return;

    const newBundle: ProductBundle = {
      id: bundle?.id || Date.now().toString(),
      name: bundleName,
      products: selectedProducts,
      pricing: {
        strategy: pricingStrategy,
        value: parseFloat(discountValue) || 0,
        tiers: pricingStrategy === 'tiered' ? tiers : undefined,
      },
      active: true,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    onSave(newBundle);
    Alert.alert('Success', 'Bundle saved successfully!');
  }, [bundle, bundleName, selectedProducts, pricingStrategy, discountValue, tiers, validateBundle, onSave]);

  const handleUpdateTier = useCallback((index: number, field: 'quantity' | 'discount', value: string) => {
    setTiers(prev => {
      const newTiers = [...prev];
      newTiers[index] = {
        ...newTiers[index],
        [field]: parseInt(value) || 0,
      };
      return newTiers;
    });
  }, []);

  return (
    <ScrollView style={styles.container} testID="bundle-builder">
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Bundle Builder</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Bundle Details</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          value={bundleName}
          onChangeText={setBundleName}
          placeholder="Enter bundle name"
          placeholderTextColor={theme.colors.textSecondary}
          testID="bundle-name-input"
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Selected Products</Text>
        {selectedProducts.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No products selected. Search and add products below.
          </Text>
        ) : (
          <View style={styles.selectedProductsList}>
            {selectedProducts.map((product, index) => (
              <TouchableOpacity
                key={product.id}
                style={[
                  styles.selectedProduct,
                  { backgroundColor: theme.colors.surface },
                  draggedProduct?.id === product.id && styles.dragging,
                ]}
                onLongPress={() => handleDragStart(product)}
                onPress={() => handleDrop(product)}
                testID={`selected-product-${product.id}`}
              >
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: theme.colors.text }]}>
                    {index + 1}. {product.name}
                  </Text>
                  <Text style={[styles.productSku, { color: theme.colors.textSecondary }]}>
                    SKU: {product.sku} | ${product.price.toFixed(2)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.removeButton, { backgroundColor: theme.colors.error }]}
                  onPress={() => handleRemoveProduct(product.id)}
                  testID={`remove-${product.id}`}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Add Products</Text>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search products by name, SKU, or category"
          placeholderTextColor={theme.colors.textSecondary}
          testID="product-search"
        />
        
        <ScrollView style={styles.productList} nestedScrollEnabled>
          {filteredProducts.slice(0, 10).map(product => (
            <TouchableOpacity
              key={product.id}
              style={[styles.productItem, { backgroundColor: theme.colors.surface }]}
              onPress={() => handleAddProduct(product)}
              testID={`product-${product.id}`}
            >
              <View style={styles.productItemInfo}>
                <Text style={[styles.productItemName, { color: theme.colors.text }]}>
                  {product.name}
                </Text>
                <Text style={[styles.productItemDetails, { color: theme.colors.textSecondary }]}>
                  ${product.price.toFixed(2)} | Stock: {product.inventory}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => handleAddProduct(product)}
              >
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pricing Strategy</Text>
        <View style={[styles.strategyCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.strategyLabel, { color: theme.colors.text }]}>
            Strategy: {pricingStrategy.charAt(0).toUpperCase() + pricingStrategy.slice(1)}
          </Text>
          
          {pricingStrategy === 'fixed' && (
            <View style={styles.strategyInput}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Fixed Price:
              </Text>
              <TextInput
                style={[
                  styles.valueInput,
                  {
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={discountValue}
                onChangeText={setDiscountValue}
                keyboardType="numeric"
                placeholder="0.00"
                testID="fixed-price-input"
              />
            </View>
          )}
          
          {pricingStrategy === 'percentage' && (
            <View style={styles.strategyInput}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Discount %:
              </Text>
              <TextInput
                style={[
                  styles.valueInput,
                  {
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={discountValue}
                onChangeText={setDiscountValue}
                keyboardType="numeric"
                placeholder="10"
                testID="percentage-input"
              />
            </View>
          )}
          
          {pricingStrategy === 'tiered' && (
            <View style={styles.tiersContainer}>
              {tiers.map((tier, index) => (
                <View key={index} style={styles.tierRow}>
                  <Text style={[styles.tierLabel, { color: theme.colors.textSecondary }]}>
                    Tier {index + 1}:
                  </Text>
                  <TextInput
                    style={[
                      styles.tierInput,
                      {
                        backgroundColor: theme.colors.background,
                        color: theme.colors.text,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    value={tier.quantity.toString()}
                    onChangeText={(value) => handleUpdateTier(index, 'quantity', value)}
                    keyboardType="numeric"
                    placeholder="Qty"
                    testID={`tier-${index}-quantity`}
                  />
                  <Text style={[styles.tierSeparator, { color: theme.colors.textSecondary }]}>
                    items =
                  </Text>
                  <TextInput
                    style={[
                      styles.tierInput,
                      {
                        backgroundColor: theme.colors.background,
                        color: theme.colors.text,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    value={tier.discount.toString()}
                    onChangeText={(value) => handleUpdateTier(index, 'discount', value)}
                    keyboardType="numeric"
                    placeholder="%"
                    testID={`tier-${index}-discount`}
                  />
                  <Text style={[styles.tierSeparator, { color: theme.colors.textSecondary }]}>
                    % off
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Price Preview</Text>
        <View style={[styles.pricePreview, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>
              Original Price:
            </Text>
            <Text style={[styles.priceValue, { color: theme.colors.text }]}>
              ${selectedProducts.reduce((sum, p) => sum + p.price, 0).toFixed(2)}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>
              Bundle Price:
            </Text>
            <Text style={[styles.priceValue, { color: theme.colors.primary }]}>
              ${calculateBundlePrice().toFixed(2)}
            </Text>
          </View>
          <View style={[styles.priceRow, styles.savingsRow]}>
            <Text style={[styles.priceLabel, { color: theme.colors.success }]}>
              Customer Saves:
            </Text>
            <Text style={[styles.priceValue, { color: theme.colors.success }]}>
              ${calculateSavings().toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleSave}
        testID="save-bundle"
      >
        <Text style={styles.saveButtonText}>Save Bundle</Text>
      </TouchableOpacity>
    </ScrollView>
  );
});

BundleBuilder.displayName = 'BundleBuilder';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  selectedProductsList: {
    gap: 8,
  },
  selectedProduct: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  dragging: {
    opacity: 0.5,
    transform: [{ scale: 0.95 }],
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 14,
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  productList: {
    maxHeight: 200,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  productItemInfo: {
    flex: 1,
  },
  productItemName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  productItemDetails: {
    fontSize: 12,
  },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '400',
  },
  strategyCard: {
    padding: 16,
    borderRadius: 8,
  },
  strategyLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  strategyInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  valueInput: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    width: 80,
    fontSize: 14,
  },
  tiersContainer: {
    gap: 8,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierLabel: {
    fontSize: 14,
    marginRight: 8,
    width: 50,
  },
  tierInput: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 6,
    width: 50,
    fontSize: 14,
    marginHorizontal: 4,
  },
  tierSeparator: {
    fontSize: 14,
    marginHorizontal: 4,
  },
  pricePreview: {
    padding: 16,
    borderRadius: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  savingsRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});