import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, Image, StyleSheet } from 'react-native';

interface Product {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  maxQuantity?: number;
  image?: string;
}

interface BundleBuilderProps {
  products: Product[];
  onAdd: (product: Product) => void;
  onRemove: (productId: string) => void;
  onReorder: (products: Product[]) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
  onPriceUpdate: (pricing: { total: number; subtotal: number; discount: number }) => void;
  maxItems?: number;
  minItems?: number;
  pricing?: {
    basePrice: number;
    discountPercentage: number;
  };
  confirmRemove?: boolean;
  showValidation?: boolean;
  testID?: string;
}

const BundleBuilder: React.FC<BundleBuilderProps> = ({
  products = [],
  onAdd,
  onRemove,
  onReorder,
  onQuantityChange,
  onPriceUpdate,
  maxItems = 10,
  minItems = 0,
  pricing = { basePrice: 0, discountPercentage: 0 },
  confirmRemove = false,
  showValidation = false,
  testID = 'bundle-builder',
}) => {
  const [showProductModal, setShowProductModal] = React.useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [quantityErrors, setQuantityErrors] = React.useState<Record<string, boolean>>({});

  const calculateTotal = React.useCallback(() => {
    const subtotal = products.reduce((sum, p) => sum + (p.price * (p.quantity || 1)), 0);
    const discount = subtotal * (pricing.discountPercentage / 100);
    const total = subtotal - discount;
    return { subtotal, discount, total };
  }, [products, pricing.discountPercentage]);

  React.useEffect(() => {
    const { subtotal, discount, total } = calculateTotal();
    onPriceUpdate({ total, subtotal, discount });
  }, [products, calculateTotal, onPriceUpdate]);

  const handleQuantityChange = (productId: string, value: string) => {
    const quantity = parseInt(value) || 1;
    const product = products.find(p => p.id === productId);
    
    if (product?.maxQuantity && quantity > product.maxQuantity) {
      setQuantityErrors(prev => ({ ...prev, [productId]: true }));
    } else {
      setQuantityErrors(prev => ({ ...prev, [productId]: false }));
      onQuantityChange(productId, quantity);
    }
  };

  const handleRemove = (productId: string) => {
    if (confirmRemove) {
      setShowRemoveConfirm(productId);
    } else {
      onRemove(productId);
    }
  };

  const confirmRemoval = () => {
    if (showRemoveConfirm) {
      onRemove(showRemoveConfirm);
      setShowRemoveConfirm(null);
    }
  };

  const { subtotal, discount, total } = calculateTotal();
  const isMaxReached = products.length >= maxItems;
  const isBelowMin = products.length < minItems;

  return (
    <View testID={testID} accessibilityLiveRegion="polite" style={styles.container}>
      {products.length === 0 ? (
        <Text>No products in bundle</Text>
      ) : (
        <ScrollView>
          {products.map((product) => (
            <View key={product.id} testID={`product-item-${product.id}`} style={styles.productItem}>
              {product.image && (
                <Image
                  testID={`product-image-${product.id}`}
                  source={{ uri: product.image }}
                  style={styles.productImage}
                />
              )}
              
              <View style={styles.productInfo}>
                <Text>{product.name}</Text>
                <Text>${product.price.toFixed(2)}</Text>
              </View>

              <TouchableOpacity
                testID={`drag-handle-${product.id}`}
                accessibilityHint="Long press and drag to reorder"
                onLongPress={() => setIsDragging(true)}
                onPressOut={() => {
                  if (isDragging) {
                    setIsDragging(false);
                    onReorder(products);
                  }
                }}
              >
                <Text>≡</Text>
              </TouchableOpacity>

              <View style={styles.quantityControls}>
                <TouchableOpacity
                  testID={`quantity-decrease-${product.id}`}
                  onPress={() => onQuantityChange(product.id, (product.quantity || 1) - 1)}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease quantity"
                >
                  <Text>-</Text>
                </TouchableOpacity>
                
                <TextInput
                  testID={`quantity-input-${product.id}`}
                  value={String(product.quantity || 1)}
                  onChangeText={(text) => handleQuantityChange(product.id, text)}
                  keyboardType="numeric"
                  style={styles.quantityInput}
                />
                
                <TouchableOpacity
                  testID={`quantity-increase-${product.id}`}
                  onPress={() => onQuantityChange(product.id, (product.quantity || 1) + 1)}
                  accessibilityRole="button"
                  accessibilityLabel="Increase quantity"
                >
                  <Text>+</Text>
                </TouchableOpacity>
              </View>

              {quantityErrors[product.id] && (
                <Text testID={`quantity-error-${product.id}`} style={styles.error}>
                  Max quantity exceeded
                </Text>
              )}

              <TouchableOpacity
                testID={`remove-product-${product.id}`}
                onPress={() => handleRemove(product.id)}
                accessibilityRole="button"
                accessibilityLabel="Remove product"
              >
                <Text>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {isDragging && <View testID="drop-zone-indicator" style={styles.dropZone} />}

      <View style={styles.summary}>
        <Text>{products.length} / {maxItems} items</Text>
        {isBelowMin && <Text style={styles.error}>Minimum {minItems} items required</Text>}
        
        <Text>Total: ${total.toFixed(2)}</Text>
        {pricing.discountPercentage > 0 && (
          <>
            <Text>Discount: {pricing.discountPercentage}%</Text>
            <Text>You save: ${discount.toFixed(2)}</Text>
          </>
        )}
      </View>

      {showValidation && isBelowMin && (
        <View testID="validation-summary" style={styles.validationSummary}>
          <Text>Please add at least {minItems} items to the bundle</Text>
        </View>
      )}

      <TouchableOpacity
        testID="add-product-button"
        onPress={() => setShowProductModal(true)}
        disabled={isMaxReached}
        accessibilityRole="button"
        accessibilityLabel="Add product to bundle"
        style={[styles.button, isMaxReached && styles.buttonDisabled]}
      >
        <Text>Add Product</Text>
      </TouchableOpacity>

      <Modal
        visible={showProductModal}
        testID="product-selector-modal"
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.modal}>
          <TouchableOpacity
            testID="select-product-1"
            onPress={() => {
              onAdd({ id: '1', name: 'Product 1', price: 10 });
              setShowProductModal(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="Select Product 1"
            accessibilityHint="Performs bundle operation"
          >
            <Text>Product 1</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {showRemoveConfirm && (
        <Modal visible={true}>
          <View style={styles.modal}>
            <Text>Remove this product?</Text>
            <TouchableOpacity 
              onPress={confirmRemoval}
              accessibilityRole="button"
              accessibilityLabel="Confirm removal"
            >
              <Text>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowRemoveConfirm(null)}
              accessibilityRole="button"
              accessibilityLabel="Cancel removal"
            >
              <Text>No</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  productImage: {
    width: 50,
    height: 50,
    marginRight: 8,
  },
  productInfo: {
    flex: 1,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 4,
    marginHorizontal: 8,
    width: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  summary: {
    padding: 16,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  error: {
    color: 'red',
    fontSize: 12,
  },
  modal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  validationSummary: {
    padding: 8,
    backgroundColor: '#ffeeee',
    borderColor: 'red',
    borderWidth: 1,
  },
});

export default BundleBuilder;