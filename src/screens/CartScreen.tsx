import React from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, Alert, Text as RNText } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Card, Button } from '../components';
import { useCart } from '../hooks/useCart';
import { spacing, colors, borderRadius } from '../utils/theme';
import { CartItem, Product, RootStackParamList } from '../types';

type CartScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Checkout'>;

export const CartScreen: React.FC = () => {
  const { items, total, updateQuantity, removeItem, clearCart, addItem } = useCart();
  const navigation = useNavigation<CartScreenNavigationProp>();

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    try {
      if (newQuantity === 0) {
        // Decrement to zero = remove item (no confirmation)
        await removeItem(productId);
      } else {
        // Update quantity
        await updateQuantity({ productId, quantity: newQuantity });
      }
    } catch (error) {
      console.error('❌ CART SCREEN - handleQuantityChange error:', error);
    }
  };

  // New atomic increment handler - uses same approach as ProductDetailScreen/ShopScreen
  const handleAtomicIncrement = async (product: Product) => {
    try {
      // Use atomic addItem(product, 1) - same as working screens
      await addItem({ product, quantity: 1 });
    } catch (error) {
      console.error('❌ CART SCREEN - handleAtomicIncrement error:', error);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    try {
      await removeItem(productId);
    } catch (error) {
      console.error('❌ CART SCREEN - handleRemoveItem error:', error);
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCart(undefined);
    } catch (error) {
      console.error('❌ CART SCREEN - handleClearCart error:', error);
    }
  };

  const handleDisabledIncrementTap = (item: CartItem) => {
    const availableStock = Math.max(0, item.product.stock - item.quantity);
    
    if (availableStock === 0 && item.product.stock > 0) {
      // All stock is in the cart
      Alert.alert(
        'Maximum Quantity Reached',
        `You have all available stock for ${item.product.name} in your cart.\n\nTotal stock: ${item.product.stock}\nIn your cart: ${item.quantity}`,
        [{ text: 'OK' }]
      );
    } else if (item.quantity >= 999) {
      // Hit the system limit of 999
      Alert.alert(
        'Quantity Limit',
        `Maximum quantity per item is 999.`,
        [{ text: 'OK' }]
      );
    }
  };

  const renderCartItem = ({ item }: { item: CartItem }) => {
    const itemTotal = item.product.price * item.quantity;
    const isOutOfStock = item.product.stock === 0;
    
    // Calculate AVAILABLE stock (total stock - current cart quantity)
    const availableStock = Math.max(0, item.product.stock - item.quantity);
    const maxQuantity = Math.min(item.product.stock, 999); // Max possible quantity for this item
    const canIncrease = item.quantity < maxQuantity && availableStock > 0;

    return (
      <Card variant="elevated" style={styles.itemCard}>
        <View style={styles.itemContainer}>
          <Image
            source={{ 
              uri: item.product.imageUrl || 'https://via.placeholder.com/80x80?text=No+Image' 
            }}
            style={styles.itemImage}
            resizeMode="cover"
          />
          
          <View style={styles.itemDetails}>
            <RNText 
              style={[
                styles.itemNameText,
                item.product.name.length > 25 && styles.itemNameTextSmall
              ]}
              numberOfLines={2}
            >
              {item.product.name}
            </RNText>
            <Text variant="body" color="secondary" style={styles.itemPrice}>
              ${item.product.price.toFixed(2)} each
            </Text>
            {Boolean(item.product.unit) && (
              <Text variant="caption" color="tertiary">
                per {item.product.unit}
              </Text>
            )}
            <View style={styles.stockInfo}>
              <Text variant="caption" color="tertiary">
                Stock: {Math.max(0, item.product.stock - item.quantity) > 0 
                  ? `${Math.max(0, item.product.stock - item.quantity)} available` 
                  : 'Out of stock'
                } ({item.quantity} in cart)
              </Text>
              {Boolean(item.quantity >= item.product.stock && item.product.stock > 0 ) && (
                <Text variant="caption" style={styles.stockLimitText}>
                  ⚠️ All available stock in cart
                </Text>
              )}
            </View>
          </View>

          <View style={styles.quantityControls}>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  item.quantity <= 1 && styles.quantityButtonDisabled
                ]}
                onPress={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
              >
                <Ionicons 
                  name="remove" 
                  size={16} 
                  color={item.quantity <= 1 ? colors.text.tertiary : colors.primary[600]} 
                />
              </TouchableOpacity>
              
              <Text variant="body" style={styles.quantityText}>
                {item.quantity}
              </Text>
              
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  !canIncrease && styles.quantityButtonDisabled
                ]}
                onPress={() => {
                  if (canIncrease) {
                    // Use atomic addItem approach - same as ProductDetailScreen/ShopScreen
                    handleAtomicIncrement(item.product);
                  } else {
                    handleDisabledIncrementTap(item);
                  }
                }}
              >
                <Ionicons 
                  name="add" 
                  size={16} 
                  color={!canIncrease ? colors.text.tertiary : colors.primary[600]} 
                />
              </TouchableOpacity>
            </View>
            
            <Text variant="heading3" style={styles.itemTotal}>
              ${itemTotal.toFixed(2)}
            </Text>
            
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveItem(item.product.id)}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text variant="caption" style={styles.removeText}>
                Remove
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text variant="heading2">Shopping Cart</Text>
        <Text variant="body" color="secondary">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </Text>
      </View>
      {Boolean(items.length > 0) && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearCart}
        >
          <Ionicons name="trash-outline" size={16} color={colors.error} />
          <Text variant="caption" style={styles.clearText}>
            Clear Cart
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFooter = () => (
    <Card variant="elevated" style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <Text variant="body">Subtotal ({items.length} items):</Text>
        <Text variant="heading3">${total.toFixed(2)}</Text>
      </View>
      
      <Button
        title="Proceed to Checkout"
        onPress={() => navigation.navigate('Checkout')}
        style={styles.checkoutButton}
        disabled={items.length === 0}
      />
    </Card>
  );

  if (items.length === 0) {
    return (
      <Screen>
        <View style={styles.emptyContainer}>
          <Text variant="heading3" align="center">
            🛒 Your cart is empty
          </Text>
          <Text variant="body" color="secondary" align="center" style={styles.emptyText}>
            Add some fresh produce to get started!
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={items}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.product.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  clearText: {
    marginLeft: spacing.xs,
    color: colors.error,
  },
  itemCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
  },
  itemDetails: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemName: {
    marginBottom: spacing.xs,
  },
  itemNameText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: spacing.xs,
    flexShrink: 1,
    width: '100%',
    lineHeight: 22,
  },
  itemNameTextSmall: {
    fontSize: 16,
    lineHeight: 20,
  },
  itemPrice: {
    marginBottom: spacing.xs,
  },
  outOfStockText: {
    color: colors.warning,
    fontWeight: '600',
  },
  stockInfo: {
    marginTop: spacing.xs,
  },
  stockLimitText: {
    color: colors.warning,
    fontWeight: '500',
    marginTop: spacing.xs / 2,
  },
  // Compact layout styles
  compactControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    maxWidth: 140,
  },
  compactPrice: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1F2937',
    marginRight: spacing.sm,
  },
  compactQuantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  compactQuantityButton: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactQuantityText: {
    marginHorizontal: spacing.xs,
    minWidth: 20,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 14,
  },
  compactRemoveButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  // Legacy styles (kept for compatibility)
  quantityControls: {
    alignItems: 'center',
    minWidth: 80,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    borderColor: colors.border.light,
    backgroundColor: colors.background,
  },
  quantityText: {
    marginHorizontal: spacing.sm,
    minWidth: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  itemTotal: {
    marginBottom: spacing.xs,
    textAlign: 'center',
    fontSize: 16,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
  },
  removeText: {
    marginLeft: spacing.xs,
    color: colors.error,
  },
  summaryCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  checkoutButton: {
    marginTop: spacing.sm,
  },
});

export default CartScreen;
